import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { nombreProyecto, extraerUrls, elegirIp, motivoFallo } from '../scripts/deploy.mjs';
import { mensajeWhatsApp, duracionTexto } from '../scripts/publicar.mjs';
import { generarQR } from '../scripts/qr.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

test('nombreProyecto: minúsculas, sin acentos ni símbolos, con prefijo', () => {
  assert.equal(nombreProyecto('Veterinaria Ñandú!!'), 'trato-veterinaria-nandu');
  assert.equal(nombreProyecto('barberia-don-ramiro'), 'trato-barberia-don-ramiro');
  assert.ok(nombreProyecto('x'.repeat(200)).length <= 100);
});

test('extraerUrls: prefiere el alias de producción', () => {
  const stdout = 'https://trato-patitas-k2j3h4-rom4n10s-projects.vercel.app\n';
  const stderr = 'Vercel CLI 57.0.0\n🔍  Inspect: https://vercel.com/rom4n10s-projects/trato-patitas/abc [2s]\n✅  Production: https://trato-patitas-k2j3h4-rom4n10s-projects.vercel.app [12s]\n🔗  Aliased: https://trato-patitas.vercel.app [12s]\n';
  assert.deepEqual(extraerUrls(stdout, stderr), {
    deploy: 'https://trato-patitas-k2j3h4-rom4n10s-projects.vercel.app',
    alias: 'https://trato-patitas.vercel.app',
  });
  assert.deepEqual(extraerUrls(stdout, 'nada'), { deploy: 'https://trato-patitas-k2j3h4-rom4n10s-projects.vercel.app', alias: null });
});

test('motivoFallo traduce errores comunes', () => {
  assert.match(motivoFallo('Error: No existing credentials found. Please run `vercel login`'), /vercel login|VERCEL_TOKEN/);
  assert.match(motivoFallo('getaddrinfo ENOTFOUND api.vercel.com'), /internet/);
});

test('elegirIp prefiere la red local de casa', () => {
  const ifaces = {
    'vEthernet (WSL)': [{ family: 'IPv4', address: '172.28.0.1', internal: false }],
    'Ethernet 2': [{ family: 'IPv4', address: '192.168.56.1', internal: false }],
    'Wi-Fi': [{ family: 'IPv6', address: 'fe80::1', internal: false }, { family: 'IPv4', address: '192.168.0.15', internal: false }],
    lo: [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
  };
  assert.equal(elegirIp(ifaces), '192.168.0.15');
  assert.equal(elegirIp({ lo: ifaces.lo }), 'localhost');
});

test('mensajeWhatsApp incluye links y resumen', () => {
  const msg = mensajeWhatsApp({ nombre: 'Román Pérez' }, { proyecto: 'Patitas', resumen: 'Turnos online.' }, { prototipo: 'https://a.vercel.app/', propuesta: 'https://a.vercel.app/propuesta/' });
  assert.match(msg, /Román/);
  assert.match(msg, /https:\/\/a\.vercel\.app\/\n/);
  assert.match(msg, /https:\/\/a\.vercel\.app\/propuesta\//);
  assert.match(msg, /Turnos online/);
});

test('duracionTexto', () => {
  assert.equal(duracionTexto(127), '2 min 7 s');
  assert.equal(duracionTexto(45), '45 s');
  assert.equal(duracionTexto(180), '3 min 0 s');
});

test('doctor --inicio marca la hora y publicar informa el tiempo total real', () => {
  const home = mkdtempSync(join(tmpdir(), 'trato-h-'));
  const env = { ...process.env, TRATO_HOME: home, GROQ_API_KEY: 'gsk_x', TRATO_TARIFA_HORA: '20' };
  const d = spawnSync(process.execPath, [join(RAIZ, 'scripts/doctor.mjs'), '--quiet', '--inicio'], { encoding: 'utf8', env });
  assert.equal(d.status, 0, d.stdout + d.stderr);
  const marca = JSON.parse(readFileSync(join(home, 'inicio.json'), 'utf8'));
  assert.ok(Math.abs(marca.ts - Date.now()) < 5000);
  // Simula que la corrida empezó hace 65 s.
  writeFileSync(join(home, 'inicio.json'), JSON.stringify({ ts: Date.now() - 65_000 }));
  const dir = mkdtempSync(join(tmpdir(), 'trato-pub-'));
  writeFileSync(join(dir, 'app.json'), readFileSync(join(RAIZ, 'skills/crear/references/app-ejemplo.json')));
  writeFileSync(join(dir, 'cotizacion.json'), JSON.stringify({
    proyecto: 'P', resumen: 'R.', entendimos: ['a'], preguntas: ['¿a?', '¿b?', '¿c?'],
    funcionalidades: [{ id: 'a', nombre: 'A', tipo: 'pantalla', complejidad: 'media', opcion: 'esencial' }],
  }));
  const r = spawnSync(process.execPath, [join(RAIZ, 'scripts/publicar.mjs'), dir, '--sin-deploy'], { encoding: 'utf8', env, timeout: 20000 });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /Tiempo total: 1 min \d+ s/);
  const links = JSON.parse(readFileSync(join(dir, 'links.json'), 'utf8'));
  assert.ok(links.segundosTotales >= 65);
  process.kill(links.pidServidor);
});

test('generarQR: tamaño y patrones de posición', () => {
  const q = generarQR('https://trato-patitas.vercel.app/');
  assert.equal(q.tam, q.version * 4 + 17);
  const m = q.modulos;
  for (const [x, y] of [[0, 0], [q.tam - 7, 0], [0, q.tam - 7]]) {
    assert.equal(m[y][x], true);
    assert.equal(m[y + 1][x + 1], false);
    assert.equal(m[y + 3][x + 3], true);
  }
});

test('CLI publicar --sin-deploy: arma todo y deja links, mensaje y QR', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'trato-pub-'));
  writeFileSync(join(dir, 'app.json'), readFileSync(join(RAIZ, 'skills/crear/references/app-ejemplo.json')));
  writeFileSync(join(dir, 'cotizacion.json'), JSON.stringify({
    proyecto: 'Patitas', resumen: 'Turnos online.', entendimos: ['a'], preguntas: ['¿a?', '¿b?', '¿c?'],
    funcionalidades: [
      { id: 'a', nombre: 'Turnos', tipo: 'reservas', complejidad: 'media', opcion: 'esencial' },
      { id: 'b', nombre: 'Avisos', tipo: 'notificaciones', complejidad: 'media', opcion: 'recomendada' },
      { id: 'c', nombre: 'Pagos', tipo: 'pagos', complejidad: 'media', opcion: 'completa' },
    ],
  }));
  const env = { ...process.env, TRATO_HOME: mkdtempSync(join(tmpdir(), 'trato-h-')), TRATO_TARIFA_HORA: '20', TRATO_NOMBRE: 'Ana' };
  const r = spawnSync(process.execPath, [join(RAIZ, 'scripts/publicar.mjs'), dir, '--sin-deploy'], { encoding: 'utf8', env, timeout: 20000 });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const links = JSON.parse(readFileSync(join(dir, 'links.json'), 'utf8'));
  assert.equal(links.modo, 'local');
  assert.ok(links.propuesta.endsWith('/propuesta/'));
  assert.ok(existsSync(join(dir, 'site', 'index.html')));
  assert.ok(existsSync(join(dir, 'site', 'propuesta', 'index.html')));
  assert.ok(existsSync(join(dir, 'qr.svg')));
  assert.match(readFileSync(join(dir, 'mensaje-whatsapp.txt'), 'utf8'), /propuesta\//);
  const res = await fetch(links.local + 'propuesta/');
  assert.equal(res.status, 200);

  // Segunda corrida desde otra carpeta: reemplaza el servidor anterior y no deja tomada la carpeta del usuario.
  const carpetaUsuario = mkdtempSync(join(tmpdir(), 'trato-usuario-'));
  const r2 = spawnSync(process.execPath, [join(RAIZ, 'scripts/publicar.mjs'), dir, '--sin-deploy'], { encoding: 'utf8', env, timeout: 20000, cwd: carpetaUsuario });
  renameSync(carpetaUsuario, carpetaUsuario + '-movida');
  assert.equal(r2.status, 0, r2.stderr + r2.stdout);
  const links2 = JSON.parse(readFileSync(join(dir, 'links.json'), 'utf8'));
  assert.notEqual(links2.pidServidor, links.pidServidor);
  assert.throws(() => process.kill(links.pidServidor, 0), 'el servidor anterior sigue vivo');
  process.kill(links2.pidServidor);
});

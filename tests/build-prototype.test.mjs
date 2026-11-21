import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validarApp, construir } from '../scripts/build-prototype.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const EJEMPLO = JSON.parse(readFileSync(join(RAIZ, 'skills/crear/references/app-ejemplo.json'), 'utf8'));
const clon = () => JSON.parse(JSON.stringify(EJEMPLO));

test('el ejemplo de referencia es válido', () => {
  const { errores } = validarApp(clon());
  assert.deepEqual(errores, []);
});

test('detecta destinos y colecciones que no existen', () => {
  const app = clon();
  app.pantallas[0].bloques[0].accion.ir = 'pagos';
  app.pantallas[1].bloques[0].coleccion = 'citas';
  app.pantallas[1].bloques[0].tipo = 'carrusel';
  const { errores } = validarApp(app);
  assert.ok(errores.some((e) => /"pagos"/.test(e)), errores.join('\n'));
  assert.ok(errores.some((e) => /"carrusel"/.test(e)), errores.join('\n'));
});

test('detecta ids repetidos y demasiadas pestañas', () => {
  const app = clon();
  app.pantallas[1].id = 'inicio';
  for (let i = 0; i < 4; i++) app.pantallas.push({ id: `extra${i}`, titulo: 'X', nav: true, bloques: [] });
  const { errores } = validarApp(app);
  assert.ok(errores.some((e) => /repetid/.test(e)));
  assert.ok(errores.some((e) => /pestañas/.test(e)));
});

test('lista que abre un detalle de otra colección es error', () => {
  const app = clon();
  app.pantallas[1].bloques[0].ir = 'mascota'; // lista de turnos abriendo ficha de mascota
  const { errores } = validarApp(app);
  assert.ok(errores.some((e) => /mascota/.test(e) && /turnos/.test(e)), errores.join('\n'));
});

test('grilla con carrito exige pantallaCarrito', () => {
  const app = clon();
  app.colecciones.menu = [{ id: 'm1', nombre: 'Burger', precio: 10 }];
  app.pantallas[0].bloques.push({ tipo: 'grilla', coleccion: 'menu', carrito: true, item: { titulo: '{nombre}', precio: '{precio|moneda}' } });
  const { errores } = validarApp(app);
  assert.ok(errores.some((e) => /pantallaCarrito/.test(e)));
});

test('construir inyecta el JSON escapando </script>', () => {
  const app = clon();
  app.descripcion = 'malo </script><script>alert(1)</script>';
  const plantilla = readFileSync(join(RAIZ, 'skills/crear/templates/app-base.html'), 'utf8');
  const html = construir(app, plantilla);
  assert.ok(!html.includes('/*APP_JSON*/null'));
  assert.ok(!html.includes('</script><script>alert(1)'));
  assert.ok(html.includes('<title>Patitas</title>'));
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(html));
});

test('CLI: arma site/index.html y falla con errores legibles', () => {
  const dir = mkdtempSync(join(tmpdir(), 'trato-b-'));
  writeFileSync(join(dir, 'app.json'), JSON.stringify(EJEMPLO));
  const ok = spawnSync(process.execPath, [join(RAIZ, 'scripts/build-prototype.mjs'), dir], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.ok(existsSync(join(dir, 'site', 'index.html')));

  const dir2 = mkdtempSync(join(tmpdir(), 'trato-b-'));
  writeFileSync(join(dir2, 'app.json'), '{"nombre": "x", ');
  const mal = spawnSync(process.execPath, [join(RAIZ, 'scripts/build-prototype.mjs'), dir2], { encoding: 'utf8' });
  assert.notEqual(mal.status, 0);
  assert.match(mal.stderr, /app\.json/);
});

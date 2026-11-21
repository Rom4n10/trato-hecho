#!/usr/bin/env node
// Diagnóstico de Trato Hecho: imprime un checklist ✅/⚠️/❌ con cómo arreglar cada problema.
// Uso: node doctor.mjs [--quiet]   (--quiet: solo problemas críticos; rápido, para /trato:crear)
// Sale con código 1 si falta algo crítico.
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig, mask, configPath, configDir } from './config.mjs';

const WIN = process.platform === 'win32';

function correr(cmd, args, timeout = 20_000) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout, shell: WIN, windowsHide: true });
  return { ok: r.status === 0, salida: `${r.stdout || ''}${r.stderr || ''}`.trim(), stdout: (r.stdout || '').trim() };
}

export function revisar(cfg, { rapido = false } = {}) {
  const items = [];
  const add = (nivel, titulo, detalle = '', arreglo = '') => items.push({ nivel, titulo, detalle, arreglo });

  const mayor = Number(process.versions.node.split('.')[0]);
  if (mayor >= 20) add('ok', `Node ${process.versions.node}`);
  else add('error', `Node ${process.versions.node}`, 'Trato Hecho necesita Node 20 o más nuevo.', 'Instalá Node 20+ desde nodejs.org.');

  if (cfg.GROQ_API_KEY) add('ok', 'Transcripción: Groq', mask(cfg.GROQ_API_KEY) + (cfg.OPENAI_API_KEY ? ' · OpenAI de respaldo' : ''));
  else if (cfg.OPENAI_API_KEY) add('ok', 'Transcripción: OpenAI', mask(cfg.OPENAI_API_KEY));
  else add('error', 'Transcripción', 'Falta GROQ_API_KEY (u OPENAI_API_KEY).', 'Creá una clave gratis en console.groq.com → API Keys y corré /trato:setup. Mientras tanto podés pasar un .txt con lo que pidió el cliente.');

  if (cfg.tarifaHora) add('ok', `Tarifa: ${cfg.moneda} ${cfg.tarifaHora}/h`);
  else add('error', 'Tarifa por hora', 'Sin tarifa no se puede cotizar.', 'Corré /trato:setup o: node scripts/config.mjs set tarifaHora=30 moneda=USD');

  if (cfg.nombre) add('ok', `Firma: ${cfg.nombre}`);
  else add('aviso', 'Nombre', 'Las propuestas saldrán sin firma.', 'node scripts/config.mjs set nombre="Tu Nombre"');

  if (cfg.whatsapp) add('ok', `WhatsApp: +${cfg.whatsapp}`);
  else add('aviso', 'WhatsApp', 'El botón "Acepto" abrirá WhatsApp sin destinatario.', 'node scripts/config.mjs set whatsapp="+54 9 11 5555 1234"');

  if (rapido) return items;

  const ff = correr('ffmpeg', ['-version'], 10_000);
  if (ff.ok) add('ok', 'ffmpeg', ff.salida.split('\n')[0].split(' ').slice(0, 3).join(' '));
  else add('aviso', 'ffmpeg', 'Solo hace falta para audios .aac/.amr/.3gp o mayores a 24 MB.', WIN ? 'winget install ffmpeg' : 'brew install ffmpeg  ·  sudo apt install ffmpeg');

  if (cfg.VERCEL_TOKEN) {
    add('ok', 'Vercel: token', mask(cfg.VERCEL_TOKEN));
  } else {
    const who = correr('npx', ['--yes', 'vercel', 'whoami'], 60_000);
    const usuario = who.ok ? who.stdout.split('\n').map((l) => l.trim()).filter((l) => /^[\w.-]+$/.test(l)).pop() : '';
    if (who.ok && usuario) add('ok', `Vercel: sesión de ${usuario}`, 'Se usa el login del CLI de Vercel.');
    else add('aviso', 'Vercel', 'Sin token ni sesión: los links serán locales (preview en tu red).', 'Creá un token en vercel.com → Settings → Tokens y corré /trato:setup, o ejecutá: npx vercel login');
  }
  return items;
}

const ICONO = { ok: '✅', aviso: '⚠️ ', error: '❌' };

export function formatear(items, { rapido = false } = {}) {
  const errores = items.filter((i) => i.nivel === 'error');
  if (rapido) {
    if (!errores.length) return '✅ Config OK';
    return errores.map((i) => `❌ ${i.titulo}: ${i.detalle}\n   → ${i.arreglo}`).join('\n');
  }
  const lineas = ['Trato Hecho · diagnóstico', `Config: ${configPath()}`, ''];
  for (const i of items) {
    lineas.push(`${ICONO[i.nivel]} ${i.titulo}${i.detalle ? ` — ${i.detalle}` : ''}`);
    if (i.nivel !== 'ok' && i.arreglo) lineas.push(`   → ${i.arreglo}`);
  }
  lineas.push('');
  lineas.push(errores.length ? `Faltan ${errores.length} cosa(s) crítica(s). Corré /trato:setup.` : 'Todo listo. Probalo con /trato:crear <audio>.');
  return lineas.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rapido = process.argv.includes('--quiet');
  try {
    // --inicio: marca el comienzo de /trato:crear para que publicar.mjs informe el tiempo total real.
    if (process.argv.includes('--inicio')) {
      mkdirSync(configDir(), { recursive: true });
      writeFileSync(join(configDir(), 'inicio.json'), JSON.stringify({ ts: Date.now() }));
    }
    const items = revisar(loadConfig(), { rapido });
    console.log(formatear(items, { rapido }));
    process.exit(items.some((i) => i.nivel === 'error') ? 1 : 0);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { planDeSubida, pareceVacio, proveedores } from '../scripts/transcribe.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'transcribe.mjs');

function correr(args, env = {}) {
  const home = mkdtempSync(join(tmpdir(), 'vozapp-tr-'));
  const limpio = { ...process.env, VOZAPP_HOME: home, ...env };
  delete limpio.GROQ_API_KEY;
  delete limpio.OPENAI_API_KEY;
  Object.assign(limpio, env);
  return spawnSync(process.execPath, [SCRIPT, ...args], { env: limpio, encoding: 'utf8' });
}

test('planDeSubida: formatos aceptados van directo', () => {
  assert.deepEqual(planDeSubida('a/b/audio.ogg', 1000), { convertir: false, nombre: 'audio.ogg' });
  assert.deepEqual(planDeSubida('x.M4A', 1000), { convertir: false, nombre: 'x.M4A' });
});

test('planDeSubida: .opus se sube como .ogg sin convertir', () => {
  assert.deepEqual(planDeSubida('PTT-2026.opus', 1000), { convertir: false, nombre: 'PTT-2026.ogg' });
});

test('planDeSubida: formatos raros o archivos grandes se convierten', () => {
  assert.equal(planDeSubida('nota.aac', 1000).convertir, true);
  assert.equal(planDeSubida('nota.amr', 1000).convertir, true);
  assert.equal(planDeSubida('largo.mp3', 30 * 1024 * 1024).convertir, true);
});

test('pareceVacio detecta silencio y alucinaciones típicas', () => {
  assert.equal(pareceVacio(''), true);
  assert.equal(pareceVacio('  . '), true);
  assert.equal(pareceVacio('Gracias por ver el video.'), true);
  assert.equal(pareceVacio('Subtítulos realizados por la comunidad de Amara.org'), true);
  assert.equal(pareceVacio('Hola, necesito una app para mi veterinaria'), false);
});

test('proveedores: Groq primero, OpenAI de respaldo', () => {
  assert.deepEqual(proveedores({ GROQ_API_KEY: 'g', OPENAI_API_KEY: 'o' }).map((p) => p.id), ['groq', 'openai']);
  assert.deepEqual(proveedores({ OPENAI_API_KEY: 'o' }).map((p) => p.id), ['openai']);
  assert.deepEqual(proveedores({}), []);
});

test('CLI: archivo de texto pasa directo sin claves', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vozapp-txt-'));
  const f = join(dir, 'pedido.txt');
  writeFileSync(f, '  Hola, quiero una app para mi barbería.  \n');
  const r = correr([f]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'Hola, quiero una app para mi barbería.');
});

test('CLI: sin argumentos explica el uso', () => {
  const r = correr([]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Uso: node transcribe\.mjs/);
});

test('CLI: archivo inexistente da error claro', () => {
  const r = correr(['no-existe.ogg']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /No encuentro el archivo/);
});

test('CLI: audio sin claves pide setup', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vozapp-aud-'));
  const f = join(dir, 'a.ogg');
  writeFileSync(f, Buffer.from('OggS fake'));
  const r = correr([f]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /\/vozapp:setup/);
});

test('CLI: archivo vacío da error claro', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vozapp-vac-'));
  const f = join(dir, 'vacio.ogg');
  writeFileSync(f, '');
  const r = correr([f], { GROQ_API_KEY: 'x' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /está vacío/);
});

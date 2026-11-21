import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderPropuesta, linkWhatsApp, mezclarColor } from '../scripts/render-proposal.mjs';
import { calcular } from '../scripts/quote.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLANTILLA = readFileSync(join(RAIZ, 'skills/crear/templates/propuesta.html'), 'utf8');

function cot() {
  const c = {
    proyecto: 'Patitas <App>',
    cliente: 'Veterinaria "Patitas"',
    resumen: 'Turnos online & recordatorios.',
    entendimos: ['Hoy usan WhatsApp.', 'Se olvidan vacunas.'],
    preguntas: ['¿Cuántos veterinarios?', '¿Cobran seña?', '¿Tienen logo?'],
    duracionAudio: 36,
    funcionalidades: [
      { id: 'turnos', nombre: 'Turnos', tipo: 'reservas', complejidad: 'media', opcion: 'esencial' },
      { id: 'avisos', nombre: 'Recordatorios', descripcion: 'Por WhatsApp', tipo: 'notificaciones', complejidad: 'media', opcion: 'recomendada' },
      { id: 'pagos', nombre: 'Pagos', tipo: 'pagos', complejidad: 'media', opcion: 'completa' },
    ],
  };
  c.calculo = calcular(c, { tarifaHora: 30, moneda: 'USD' }).calculo;
  return c;
}

test('linkWhatsApp con y sin número', () => {
  assert.equal(linkWhatsApp('5491155551234', 'Hola & chau'), 'https://wa.me/5491155551234?text=Hola%20%26%20chau');
  assert.equal(linkWhatsApp('', 'Hola'), 'https://wa.me/?text=Hola');
});

test('mezclarColor', () => {
  assert.equal(mezclarColor('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(mezclarColor('#0E7C6B', '#ffffff', 0), '#0e7c6b');
});

test('renderPropuesta: escapa contenido, llena todo, destaca la recomendada', () => {
  const c = cot();
  const html = renderPropuesta({ cot: c, cfg: { nombre: 'Ana Dev', whatsapp: '5491155551234', moneda: 'USD' }, app: { nombre: 'Patitas', logo: '🐾', estilo: 'fresco' }, plantilla: PLANTILLA });
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(html), 'quedaron placeholders');
  assert.ok(html.includes('Patitas &lt;App&gt;'));
  assert.ok(!html.includes('<App>'));
  for (const o of c.calculo.opciones) assert.ok(html.includes(o.precioTexto), o.precioTexto);
  assert.equal((html.match(/class="opcion destacada"/g) || []).length, 1);
  assert.ok(html.includes('https://wa.me/5491155551234?text='));
  assert.ok(html.includes(encodeURIComponent('Recomendada')));
  assert.ok(html.includes('0:36'));
  assert.ok(html.includes('Ana Dev'));
  assert.ok(html.includes('Todo lo de Esencial, más:'));
});

test('renderPropuesta: sin nombre ni app funciona igual', () => {
  const html = renderPropuesta({ cot: cot(), cfg: { moneda: 'USD' }, app: null, plantilla: PLANTILLA });
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(html));
  assert.ok(html.includes('https://wa.me/?text='));
});

test('CLI: calcula si falta calculo y escribe site/propuesta/index.html', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vozapp-p-'));
  const c = cot();
  delete c.calculo;
  writeFileSync(join(dir, 'cotizacion.json'), JSON.stringify(c));
  const env = { ...process.env, VOZAPP_HOME: mkdtempSync(join(tmpdir(), 'vozapp-h-')), VOZAPP_TARIFA_HORA: '25' };
  const r = spawnSync(process.execPath, [join(RAIZ, 'scripts/render-proposal.mjs'), dir], { encoding: 'utf8', env });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(dir, 'site', 'propuesta', 'index.html')));
});

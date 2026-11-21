import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { horasDe, calcular, redondearPrecio, formatearMoneda, cargarTabla } from '../scripts/quote.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'quote.mjs');
const tabla = cargarTabla();

const base = () => ({
  proyecto: 'Patitas App',
  cliente: 'Veterinaria Patitas',
  resumen: 'App de turnos.',
  entendimos: ['a', 'b'],
  preguntas: ['¿uno?', '¿dos?', '¿tres?'],
  funcionalidades: [
    { id: 'alta', nombre: 'Alta de mascota', tipo: 'formulario', complejidad: 'media', opcion: 'esencial' },
    { id: 'lista', nombre: 'Listado de turnos', tipo: 'listado', complejidad: 'media', opcion: 'esencial' },
    { id: 'avisos', nombre: 'Recordatorios', tipo: 'notificaciones', complejidad: 'media', opcion: 'recomendada' },
    { id: 'pagos', nombre: 'Pagos', tipo: 'pagos', complejidad: 'alta', opcion: 'completa' },
  ],
});

test('horasDe: tabla × complejidad × cantidad, redondeo hacia arriba', () => {
  assert.equal(horasDe({ tipo: 'formulario', complejidad: 'media' }, tabla), 6);
  assert.equal(horasDe({ tipo: 'formulario', complejidad: 'alta' }, tabla), 9);
  assert.equal(horasDe({ tipo: 'listado', complejidad: 'baja' }, tabla), 6); // 5,6 → 6
  assert.equal(horasDe({ tipo: 'pantalla', complejidad: 'media', cantidad: 3 }, tabla), 12);
  assert.equal(horasDe({ tipo: 'pantalla', complejidad: 'media', horas: 20, motivo: 'animaciones' }, tabla), 20);
});

test('redondearPrecio: 3 cifras significativas', () => {
  assert.equal(redondearPrecio(810), 810);
  assert.equal(redondearPrecio(1144), 1140);
  assert.equal(redondearPrecio(45678), 45700);
  assert.equal(redondearPrecio(1234567), 1230000);
  assert.equal(redondearPrecio(0), 0);
});

test('calcular: opciones acumulativas con fijos y % de pruebas', () => {
  const { calculo } = calcular(base(), { tarifaHora: 30, moneda: 'USD' }, tabla, new Date('2026-11-21T12:00:00'));
  const [e, r, c] = calculo.opciones;
  assert.deepEqual([e.id, r.id, c.id], ['esencial', 'recomendada', 'completa']);
  // esencial: 6 + 8 = 14 · fijos 10 · qa ceil(2,1) = 3 → 27
  assert.equal(e.horasFuncionalidades, 14);
  assert.equal(e.horas, 27);
  assert.equal(e.precio, 810);
  assert.equal(e.semanas, 1);
  // recomendada: 14 + 10 = 24 · qa ceil(3,6) = 4 → 38 → 1140
  assert.equal(r.horas, 38);
  assert.equal(r.precio, 1140);
  assert.equal(r.semanas, 2);
  // completa: 24 + 24 = 48 · qa ceil(7,2) = 8 → 66 → 1980
  assert.equal(c.horas, 66);
  assert.equal(c.precio, 1980);
  assert.equal(c.semanas, 3);
  assert.deepEqual(r.incluye.map((f) => f.id), ['alta', 'lista', 'avisos']);
  assert.deepEqual(r.nuevas.map((f) => f.id), ['avisos']);
  assert.equal(calculo.validaHasta, '2026-11-28');
  assert.equal(calculo.recomendada, 'recomendada');
});

test('calcular: errores claros y juntos', () => {
  const malo = base();
  malo.funcionalidades[0].tipo = 'magia';
  malo.funcionalidades[1].opcion = 'premium';
  malo.funcionalidades[2].complejidad = 'extrema';
  malo.funcionalidades[3].horas = 5; // sin motivo
  assert.throws(
    () => calcular(malo, { tarifaHora: 30, moneda: 'USD' }, tabla),
    (e) => /magia/.test(e.message) && /premium/.test(e.message) && /extrema/.test(e.message) && /motivo/.test(e.message),
  );
});

test('calcular: exige esencial, tarifa y contenido de propuesta', () => {
  const sinEsencial = base();
  sinEsencial.funcionalidades.forEach((f) => (f.opcion = 'completa'));
  assert.throws(() => calcular(sinEsencial, { tarifaHora: 30, moneda: 'USD' }, tabla), /esencial/);
  assert.throws(() => calcular(base(), { moneda: 'USD' }, tabla), /tarifa/i);
  const sinResumen = base();
  delete sinResumen.resumen;
  assert.throws(() => calcular(sinResumen, { tarifaHora: 30, moneda: 'USD' }, tabla), /resumen/);
});

test('calcular: ids duplicados se rechazan', () => {
  const dup = base();
  dup.funcionalidades[1].id = 'alta';
  assert.throws(() => calcular(dup, { tarifaHora: 30, moneda: 'USD' }, tabla), /duplicad/);
});

test('formatearMoneda usa el formato local', () => {
  assert.equal(formatearMoneda(1230000, 'ARS').replace(/\s/g, ' '), '$ 1.230.000');
  assert.match(formatearMoneda(1140, 'USD'), /USD.?1,140/);
});

test('CLI: escribe calculo en cotizacion.json y es idempotente', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vozapp-q-'));
  writeFileSync(join(dir, 'cotizacion.json'), JSON.stringify(base()));
  const env = { ...process.env, VOZAPP_HOME: mkdtempSync(join(tmpdir(), 'vozapp-h-')) };
  const r1 = spawnSync(process.execPath, [SCRIPT, dir, '--tarifa', '30', '--moneda', 'USD'], { encoding: 'utf8', env });
  assert.equal(r1.status, 0, r1.stderr);
  assert.match(r1.stdout, /Recomendada/);
  const guardado = JSON.parse(readFileSync(join(dir, 'cotizacion.json'), 'utf8'));
  assert.equal(guardado.calculo.opciones[1].precio, 1140);
  const r2 = spawnSync(process.execPath, [SCRIPT, dir, '--tarifa', '30', '--moneda', 'USD'], { encoding: 'utf8', env });
  assert.equal(r2.status, 0, r2.stderr);
  assert.equal(JSON.parse(readFileSync(join(dir, 'cotizacion.json'), 'utf8')).calculo.opciones[1].precio, 1140);
});

test('CLI: sin tarifa configurada pide setup', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vozapp-q-'));
  writeFileSync(join(dir, 'cotizacion.json'), JSON.stringify(base()));
  const env = { ...process.env, VOZAPP_HOME: mkdtempSync(join(tmpdir(), 'vozapp-h-')) };
  delete env.VOZAPP_TARIFA_HORA;
  const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8', env });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /setup/);
});

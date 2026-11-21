import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, saveConfig, mask, configPath } from '../scripts/config.mjs';

function homeTmp() {
  return mkdtempSync(join(tmpdir(), 'vozapp-cfg-'));
}

test('sin archivo ni env: config vacía con moneda USD por defecto', () => {
  const env = { VOZAPP_HOME: homeTmp() };
  const cfg = loadConfig(env);
  assert.equal(cfg.moneda, 'USD');
  assert.equal(cfg.GROQ_API_KEY, undefined);
  assert.equal(cfg.tarifaHora, undefined);
});

test('lee archivo y la variable de entorno gana', () => {
  const home = homeTmp();
  writeFileSync(join(home, 'config.json'), JSON.stringify({ GROQ_API_KEY: 'gsk_archivo', tarifaHora: 25, moneda: 'ars', nombre: 'Ana' }));
  const cfg = loadConfig({ VOZAPP_HOME: home, GROQ_API_KEY: 'gsk_env', VOZAPP_TARIFA_HORA: '40' });
  assert.equal(cfg.GROQ_API_KEY, 'gsk_env');
  assert.equal(cfg.tarifaHora, 40);
  assert.equal(cfg.moneda, 'ARS');
  assert.equal(cfg.nombre, 'Ana');
  assert.equal(cfg._origen.GROQ_API_KEY, 'env');
  assert.equal(cfg._origen.nombre, 'archivo');
});

test('whatsapp se normaliza a solo dígitos', () => {
  const home = homeTmp();
  writeFileSync(join(home, 'config.json'), JSON.stringify({ whatsapp: '+54 9 11 5555-1234' }));
  assert.equal(loadConfig({ VOZAPP_HOME: home }).whatsapp, '5491155551234');
});

test('JSON roto da error claro en español', () => {
  const home = homeTmp();
  writeFileSync(join(home, 'config.json'), '{roto');
  assert.throws(() => loadConfig({ VOZAPP_HOME: home }), /config\.json.*no es JSON válido/);
});

test('saveConfig mezcla con lo existente y valida', () => {
  const home = homeTmp();
  const env = { VOZAPP_HOME: home };
  saveConfig({ nombre: 'Ana', tarifaHora: '30' }, env);
  saveConfig({ moneda: 'mxn' }, env);
  const raw = JSON.parse(readFileSync(configPath(env), 'utf8'));
  assert.deepEqual(raw, { nombre: 'Ana', tarifaHora: 30, moneda: 'MXN' });
  assert.throws(() => saveConfig({ tarifaHora: 'mucho' }, env), /tarifaHora/);
  assert.throws(() => saveConfig({ moneda: 'PESOS' }, env), /moneda/);
  assert.throws(() => saveConfig({ inventado: 'x' }, env), /no existe/);
});

test('mask muestra solo los últimos 4', () => {
  assert.equal(mask('gsk_1234567890abcd'), '••••abcd');
  assert.equal(mask(''), '(vacío)');
  assert.equal(mask(undefined), '(vacío)');
});

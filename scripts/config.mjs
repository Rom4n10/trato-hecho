#!/usr/bin/env node
// Configuración de Trato Hecho: ~/.trato/config.json + variables de entorno (env gana).
// Uso CLI:
//   node config.mjs                      → muestra la config (claves enmascaradas)
//   node config.mjs set clave=valor ...  → guarda en ~/.trato/config.json (permisos 600)
import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CAMPOS = ['GROQ_API_KEY', 'OPENAI_API_KEY', 'VERCEL_TOKEN', 'nombre', 'tarifaHora', 'moneda', 'whatsapp'];
export const SECRETOS = new Set(['GROQ_API_KEY', 'OPENAI_API_KEY', 'VERCEL_TOKEN']);
const ENV = {
  GROQ_API_KEY: 'GROQ_API_KEY',
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  VERCEL_TOKEN: 'VERCEL_TOKEN',
  nombre: 'TRATO_NOMBRE',
  tarifaHora: 'TRATO_TARIFA_HORA',
  moneda: 'TRATO_MONEDA',
  whatsapp: 'TRATO_WHATSAPP',
};

export function configDir(env = process.env) {
  return env.TRATO_HOME || join(homedir(), '.trato');
}

export function configPath(env = process.env) {
  return join(configDir(env), 'config.json');
}

function leerArchivo(env) {
  const ruta = configPath(env);
  if (!existsSync(ruta)) return {};
  const texto = readFileSync(ruta, 'utf8');
  if (!texto.trim()) return {};
  try {
    const datos = JSON.parse(texto);
    return datos && typeof datos === 'object' ? datos : {};
  } catch {
    throw new Error(`El archivo ${ruta} (config.json) no es JSON válido. Corregilo o borralo y corré /trato:setup de nuevo.`);
  }
}

function normalizar(clave, valor) {
  if (valor === undefined || valor === null || valor === '') return undefined;
  switch (clave) {
    case 'tarifaHora': {
      const n = Number(String(valor).replace(',', '.'));
      if (!Number.isFinite(n) || n <= 0) throw new Error(`tarifaHora debe ser un número mayor a 0 (recibí "${valor}").`);
      return n;
    }
    case 'moneda': {
      const m = String(valor).trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(m)) throw new Error(`moneda debe ser un código de 3 letras como USD, ARS, MXN, CRC o COP (recibí "${valor}").`);
      return m;
    }
    case 'whatsapp': {
      const d = String(valor).replace(/\D/g, '');
      if (d.length < 8) throw new Error(`whatsapp debe incluir código de país, ej. +54 9 11 5555 1234 (recibí "${valor}").`);
      return d;
    }
    default:
      return String(valor).trim();
  }
}

export function loadConfig(env = process.env) {
  const archivo = leerArchivo(env);
  const cfg = { _origen: {} };
  for (const clave of CAMPOS) {
    const deEnv = env[ENV[clave]];
    if (deEnv !== undefined && deEnv !== '') {
      cfg[clave] = normalizar(clave, deEnv);
      cfg._origen[clave] = 'env';
    } else if (archivo[clave] !== undefined && archivo[clave] !== '') {
      cfg[clave] = normalizar(clave, archivo[clave]);
      cfg._origen[clave] = 'archivo';
    }
  }
  if (!cfg.moneda) {
    cfg.moneda = 'USD';
    cfg._origen.moneda = 'por defecto';
  }
  return cfg;
}

export function saveConfig(cambios, env = process.env) {
  const actual = leerArchivo(env);
  for (const [clave, valor] of Object.entries(cambios)) {
    if (!CAMPOS.includes(clave)) throw new Error(`La clave "${clave}" no existe. Válidas: ${CAMPOS.join(', ')}.`);
    const v = normalizar(clave, valor);
    if (v === undefined) delete actual[clave];
    else actual[clave] = v;
  }
  mkdirSync(configDir(env), { recursive: true });
  const ruta = configPath(env);
  writeFileSync(ruta, JSON.stringify(actual, null, 2) + '\n', { mode: 0o600 });
  try { chmodSync(ruta, 0o600); } catch { /* Windows: no aplica */ }
  return ruta;
}

export function mask(valor) {
  if (!valor) return '(vacío)';
  const s = String(valor);
  return '••••' + s.slice(-4);
}

export function mostrar(cfg) {
  const lineas = [];
  for (const clave of CAMPOS) {
    const v = cfg[clave];
    const texto = v === undefined ? '(falta)' : SECRETOS.has(clave) ? mask(v) : String(v);
    const origen = cfg._origen[clave] ? `  [${cfg._origen[clave]}]` : '';
    lineas.push(`${clave.padEnd(15)} ${texto}${origen}`);
  }
  return lineas.join('\n');
}

function main(argv) {
  const [cmd, ...resto] = argv;
  if (!cmd || cmd === 'show') {
    console.log(`Config: ${configPath()}\n`);
    console.log(mostrar(loadConfig()));
    return;
  }
  if (cmd === 'set') {
    if (!resto.length) throw new Error('Uso: node config.mjs set clave=valor [clave=valor ...]');
    const cambios = {};
    for (const par of resto) {
      const i = par.indexOf('=');
      if (i < 1) throw new Error(`Formato inválido "${par}". Usá clave=valor.`);
      cambios[par.slice(0, i).trim()] = par.slice(i + 1);
    }
    const ruta = saveConfig(cambios);
    const guardadas = Object.keys(cambios).map((k) => (SECRETOS.has(k) ? `${k}=${mask(cambios[k])}` : `${k}=${cambios[k]}`));
    console.log(`Guardado en ${ruta}: ${guardadas.join(', ')}`);
    return;
  }
  throw new Error(`Comando desconocido "${cmd}". Usá: node config.mjs [show | set clave=valor ...]`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
}

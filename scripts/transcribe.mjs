#!/usr/bin/env node
// Transcribe el audio de un cliente. Escribe el texto en stdout; el detalle va a stderr.
// Uso: node transcribe.mjs <audio|texto.txt> [--json]
// Proveedores: Groq (whisper-large-v3-turbo) y, de respaldo, OpenAI (whisper-1).
import { readFileSync, statSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadConfig } from './config.mjs';

const ACEPTADOS = new Set(['.flac', '.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.ogg', '.wav', '.webm']);
const TEXTO = new Set(['.txt', '.md']);
const MAX_BYTES = 24 * 1024 * 1024;
const PROMPT = 'Audio de WhatsApp de un cliente que pide una aplicación, página web o sistema para su negocio. Español latinoamericano.';

const ALUCINACIONES = [
  /gracias por ver/i,
  /subt[ií]tulos (realizados|por)/i,
  /amara\.org/i,
  /suscr[ií]bete/i,
  /^\W*(m[uú]sica|aplausos|silencio)\W*$/i,
];

export function planDeSubida(ruta, bytes) {
  const ext = extname(ruta).toLowerCase();
  const nombre = basename(ruta);
  if (bytes > MAX_BYTES) return { convertir: true, nombre: nombre.replace(/\.[^.]+$/, '') + '.mp3' };
  if (ext === '.opus') return { convertir: false, nombre: nombre.slice(0, -ext.length) + '.ogg' };
  if (ACEPTADOS.has(ext)) return { convertir: false, nombre };
  return { convertir: true, nombre: nombre.replace(/\.[^.]+$/, '') + '.mp3' };
}

export function pareceVacio(texto) {
  const t = (texto || '').trim();
  if (!/[a-záéíóúñü]{2,}/i.test(t)) return true;
  if (t.length < 80 && ALUCINACIONES.some((re) => re.test(t))) return true;
  return false;
}

export function proveedores(cfg) {
  const lista = [];
  if (cfg.GROQ_API_KEY) {
    lista.push({
      id: 'groq',
      nombre: 'Groq',
      url: 'https://api.groq.com/openai/v1/audio/transcriptions',
      modelo: 'whisper-large-v3-turbo',
      clave: cfg.GROQ_API_KEY,
      variable: 'GROQ_API_KEY',
    });
  }
  if (cfg.OPENAI_API_KEY) {
    lista.push({
      id: 'openai',
      nombre: 'OpenAI',
      url: 'https://api.openai.com/v1/audio/transcriptions',
      modelo: 'whisper-1',
      clave: cfg.OPENAI_API_KEY,
      variable: 'OPENAI_API_KEY',
    });
  }
  return lista;
}

function convertirConFfmpeg(ruta) {
  const dir = mkdtempSync(join(tmpdir(), 'vozapp-audio-'));
  const salida = join(dir, 'audio.mp3');
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', ruta, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '32k', salida], { encoding: 'utf8' });
  if (r.error && r.error.code === 'ENOENT') {
    throw new Error('Este formato de audio necesita ffmpeg y no está instalado. Instalalo (Windows: winget install ffmpeg · macOS: brew install ffmpeg) o exportá el audio como .mp3/.ogg.');
  }
  if (r.status !== 0) throw new Error(`ffmpeg no pudo convertir el audio: ${(r.stderr || '').trim().split('\n').pop()}`);
  return { salida, limpiar: () => rmSync(dir, { recursive: true, force: true }) };
}

function mensajeHttp(prov, status, cuerpo) {
  if (status === 401 || status === 403) return `La clave de ${prov.nombre} (${prov.variable}) no es válida o venció. Generá una nueva y corré /vozapp:setup.`;
  if (status === 413) return `El audio es demasiado grande para ${prov.nombre}. Probá con un audio más corto.`;
  if (status === 429) return `${prov.nombre} está limitando pedidos (rate limit). Esperá un minuto y reintentá.`;
  if (status === 400 && /format|decode|invalid file/i.test(cuerpo)) return `${prov.nombre} no pudo leer el audio (formato no válido o archivo dañado).`;
  return `${prov.nombre} respondió ${status}: ${cuerpo.slice(0, 200)}`;
}

async function pedir(prov, bytes, nombre) {
  const form = new FormData();
  form.append('file', new Blob([bytes]), nombre);
  form.append('model', prov.modelo);
  form.append('response_format', 'verbose_json');
  form.append('prompt', PROMPT);
  form.append('temperature', '0');
  let res;
  try {
    res = await fetch(prov.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${prov.clave}` },
      body: form,
      signal: AbortSignal.timeout(90_000),
    });
  } catch (e) {
    const causa = e.name === 'TimeoutError' ? 'tardó más de 90 s' : e.cause?.code || e.message;
    throw new Error(`No pude conectar con ${prov.nombre} (${causa}). Revisá tu conexión a internet.`);
  }
  const cuerpo = await res.text();
  if (!res.ok) throw new Error(mensajeHttp(prov, res.status, cuerpo));
  let datos;
  try { datos = JSON.parse(cuerpo); } catch { datos = { text: cuerpo }; }
  return { texto: (datos.text || '').trim(), idioma: datos.language || '', duracion: datos.duration || null };
}

export async function transcribir(ruta, { env = process.env, log = () => {} } = {}) {
  if (!ruta) throw new Error('Uso: node transcribe.mjs <audio|texto.txt> [--json]');
  if (!existsSync(ruta)) throw new Error(`No encuentro el archivo: ${ruta}. Revisá la ruta (si tiene espacios, ponela entre comillas).`);
  const ext = extname(ruta).toLowerCase();
  const { size } = statSync(ruta);
  if (size === 0) throw new Error(`El archivo ${basename(ruta)} está vacío.`);

  if (TEXTO.has(ext)) {
    const texto = readFileSync(ruta, 'utf8').trim();
    if (!texto) throw new Error(`El archivo ${basename(ruta)} está vacío.`);
    return { texto, idioma: 'texto', duracion: null, proveedor: 'archivo de texto', segundos: 0 };
  }

  const lista = proveedores(loadConfig(env));
  if (!lista.length) {
    throw new Error('Falta una clave de transcripción. Corré /vozapp:setup o definí GROQ_API_KEY (gratis en console.groq.com → API Keys).');
  }

  const plan = planDeSubida(ruta, size);
  let archivo = ruta;
  let limpiar = () => {};
  if (plan.convertir) {
    log(`· Convirtiendo ${basename(ruta)} con ffmpeg…`);
    ({ salida: archivo, limpiar } = convertirConFfmpeg(ruta));
  }
  try {
    const bytes = readFileSync(archivo);
    const inicio = Date.now();
    let ultimoError;
    for (const prov of lista) {
      try {
        const r = await pedir(prov, bytes, plan.nombre);
        if (pareceVacio(r.texto)) {
          throw Object.assign(new Error('No se entendió nada en el audio: parece vacío, sin voz o con mucho ruido. Pedile al cliente que lo grabe de nuevo o pasá un .txt con lo que pidió.'), { definitivo: true });
        }
        return { ...r, proveedor: prov.nombre, segundos: (Date.now() - inicio) / 1000 };
      } catch (e) {
        if (e.definitivo) throw e;
        ultimoError = e;
        if (lista.length > 1 && prov !== lista[lista.length - 1]) log(`· ${e.message} Probando con el siguiente proveedor…`);
      }
    }
    throw ultimoError;
  } finally {
    limpiar();
  }
}

async function main(argv) {
  const json = argv.includes('--json');
  const ruta = argv.find((a) => !a.startsWith('--'));
  const r = await transcribir(ruta, { log: (m) => console.error(m) });
  if (json) {
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  console.log(r.texto);
  const partes = [`· Transcripto con ${r.proveedor}`];
  if (r.segundos) partes.push(`en ${r.segundos.toFixed(1)} s`);
  if (r.duracion) partes.push(`${Math.round(r.duracion)} s de audio`);
  if (r.idioma && r.idioma !== 'texto') partes.push(`idioma: ${r.idioma}`);
  console.error(partes.join(' · '));
  if (r.idioma && r.idioma !== 'texto' && !/^(es|spanish|español)$/i.test(r.idioma)) {
    console.error(`⚠️ El audio parece estar en "${r.idioma}". VozApp igual arma todo en español.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  });
}

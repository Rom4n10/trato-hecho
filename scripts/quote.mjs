#!/usr/bin/env node
// Calcula la cotización a partir de cotizacion.json. El modelo solo elige tipo/complejidad/opción;
// acá se hacen TODAS las cuentas (horas, precios, plazos) y se validan.
// Uso: node quote.mjs <carpeta|cotizacion.json> [--tarifa N] [--moneda XXX]
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from './config.mjs';

const TABLA_URL = new URL('../skills/crear/references/tabla-horas.json', import.meta.url);
export const OPCIONES = [
  { id: 'esencial', nombre: 'Esencial', descripcion: 'Lo justo para arrancar a usarla.' },
  { id: 'recomendada', nombre: 'Recomendada', descripcion: 'Todo lo que pediste, listo para tu negocio.' },
  { id: 'completa', nombre: 'Completa', descripcion: 'Lista para crecer: suma lo que te va a pedir el negocio.' },
];
const ORDEN = Object.fromEntries(OPCIONES.map((o, i) => [o.id, i]));
const LOCALES = { USD: 'es-419', ARS: 'es-AR', MXN: 'es-MX', CRC: 'es-CR', COP: 'es-CO', CLP: 'es-CL', PEN: 'es-PE', UYU: 'es-UY', BOB: 'es-BO', PYG: 'es-PY', GTQ: 'es-GT', DOP: 'es-DO', EUR: 'es-ES' };

export function cargarTabla() {
  return JSON.parse(readFileSync(TABLA_URL, 'utf8'));
}

const r2 = (x) => Math.round(x * 100) / 100;

export function horasDe(f, tabla) {
  if (f.horas !== undefined) return Number(f.horas);
  const base = tabla.tipos[f.tipo].horas;
  const mult = tabla.complejidad[f.complejidad || 'media'];
  const cantidad = f.cantidad === undefined ? 1 : Number(f.cantidad);
  return Math.ceil(r2(base * mult * cantidad));
}

export function redondearPrecio(v) {
  if (!(v > 0)) return 0;
  const paso = 10 ** Math.max(0, Math.floor(Math.log10(v)) - 2);
  return Math.round(v / paso) * paso;
}

export function formatearMoneda(v, moneda) {
  try {
    return new Intl.NumberFormat(LOCALES[moneda] || 'es-419', { style: 'currency', currency: moneda, maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(v);
  } catch {
    return `${moneda} ${Math.round(v).toLocaleString('es-419')}`;
  }
}

function fechaISO(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function validar(cot, cfg, tabla) {
  const errores = [];
  const tipos = Object.keys(tabla.tipos);
  const comps = Object.keys(tabla.complejidad);
  if (!(cfg.tarifaHora > 0)) errores.push('Falta la tarifa por hora. Corré /vozapp:setup o: node scripts/config.mjs set tarifaHora=30');
  if (!cot || typeof cot !== 'object') return ['cotizacion.json está vacío o no es un objeto.'];
  if (!cot.proyecto) errores.push('Falta "proyecto" (nombre tentativo).');
  if (!cot.resumen) errores.push('Falta "resumen" (1–2 frases de lo que entendimos).');
  if (!Array.isArray(cot.entendimos) || !cot.entendimos.length) errores.push('Falta "entendimos" (lista de 2–4 puntos).');
  if (!Array.isArray(cot.preguntas) || !cot.preguntas.length) errores.push('Falta "preguntas" (lista de 3–5 preguntas abiertas para el cliente).');
  const fs = cot.funcionalidades;
  if (!Array.isArray(fs) || !fs.length) {
    errores.push('Falta "funcionalidades" (lista).');
    return errores;
  }
  const vistos = new Set();
  fs.forEach((f, i) => {
    const q = `funcionalidades[${i}]${f && f.nombre ? ` "${f.nombre}"` : ''}`;
    if (!f || typeof f !== 'object') return errores.push(`${q}: no es un objeto.`);
    if (!f.id) errores.push(`${q}: falta "id".`);
    else if (vistos.has(f.id)) errores.push(`${q}: id "${f.id}" duplicado.`);
    else vistos.add(f.id);
    if (!f.nombre) errores.push(`${q}: falta "nombre".`);
    if (!tipos.includes(f.tipo)) errores.push(`${q}: tipo "${f.tipo}" no existe. Válidos: ${tipos.join(', ')}.`);
    if (f.complejidad !== undefined && !comps.includes(f.complejidad)) errores.push(`${q}: complejidad "${f.complejidad}" no existe. Válidas: ${comps.join(', ')}.`);
    if (!(f.opcion in ORDEN)) errores.push(`${q}: opcion "${f.opcion}" no existe. Válidas: ${Object.keys(ORDEN).join(', ')}.`);
    if (f.cantidad !== undefined && !(Number.isInteger(Number(f.cantidad)) && Number(f.cantidad) > 0)) errores.push(`${q}: cantidad debe ser un entero mayor a 0.`);
    if (f.horas !== undefined) {
      if (!(Number(f.horas) > 0)) errores.push(`${q}: horas debe ser un número mayor a 0.`);
      if (!f.motivo) errores.push(`${q}: si ponés "horas" a mano, agregá "motivo".`);
    }
  });
  if (!fs.some((f) => f && f.opcion === 'esencial')) errores.push('Ninguna funcionalidad está en la opción "esencial": tiene que haber al menos una.');
  return errores;
}

export function calcular(cot, cfg, tabla = cargarTabla(), hoy = new Date()) {
  const errores = validar(cot, cfg, tabla);
  if (errores.length) throw new Error(`La cotización tiene ${errores.length} problema(s):\n- ${errores.join('\n- ')}`);

  const avisos = [];
  if (cot.preguntas.length < 3) avisos.push('Hay menos de 3 preguntas abiertas para el cliente.');

  const funcs = cot.funcionalidades.map((f) => ({ id: f.id, nombre: f.nombre, descripcion: f.descripcion || '', opcion: f.opcion, horas: horasDe(f, tabla) }));
  const { tarifaHora, moneda } = cfg;
  const opciones = OPCIONES.map((o) => {
    const incluye = funcs.filter((f) => ORDEN[f.opcion] <= ORDEN[o.id]);
    const nuevas = funcs.filter((f) => f.opcion === o.id);
    const horasFuncionalidades = incluye.reduce((s, f) => s + f.horas, 0);
    const extras = [
      ...tabla.fijos.map((x) => ({ nombre: x.nombre, horas: x.horas })),
      ...tabla.porcentajes.map((x) => ({ nombre: x.nombre, horas: Math.ceil(r2((horasFuncionalidades * x.porcentaje) / 100)) })),
    ];
    const horas = horasFuncionalidades + extras.reduce((s, x) => s + x.horas, 0);
    const precio = redondearPrecio(r2(horas * tarifaHora));
    return {
      ...o,
      incluye: incluye.map(({ id, nombre, horas: h }) => ({ id, nombre, horas: h })),
      nuevas: nuevas.map(({ id, nombre, descripcion, horas: h }) => ({ id, nombre, descripcion, horas: h })),
      horasFuncionalidades,
      extras,
      horas,
      precio,
      precioTexto: formatearMoneda(precio, moneda),
      semanas: Math.max(1, Math.ceil(horas / tabla.horasSemana)),
    };
  });

  // Chequeos de consistencia: que los números cuadren.
  for (const o of opciones) {
    const suma = o.incluye.reduce((s, f) => s + f.horas, 0) + o.extras.reduce((s, x) => s + x.horas, 0);
    if (suma !== o.horas) throw new Error(`Inconsistencia interna en ${o.nombre}: ${suma} h ≠ ${o.horas} h.`);
  }
  for (let i = 1; i < opciones.length; i++) {
    if (opciones[i].horas < opciones[i - 1].horas) throw new Error(`Inconsistencia: ${opciones[i].nombre} tiene menos horas que ${opciones[i - 1].nombre}.`);
    if (opciones[i].horas === opciones[i - 1].horas) avisos.push(`${opciones[i].nombre} no agrega nada sobre ${opciones[i - 1].nombre}: sumale funcionalidades.`);
  }

  const vence = new Date(hoy);
  vence.setDate(vence.getDate() + 7);
  return {
    avisos,
    calculo: {
      calculadoPor: 'scripts/quote.mjs',
      fecha: fechaISO(hoy),
      validaHasta: fechaISO(vence),
      tarifaHora,
      moneda,
      horasSemana: tabla.horasSemana,
      recomendada: 'recomendada',
      funcionalidades: funcs,
      opciones,
    },
  };
}

export function rutaCotizacion(arg) {
  if (!arg) throw new Error('Uso: node quote.mjs <carpeta|cotizacion.json> [--tarifa N] [--moneda XXX]');
  const ruta = existsSync(arg) && statSync(arg).isDirectory() ? join(arg, 'cotizacion.json') : arg;
  if (!existsSync(ruta)) throw new Error(`No encuentro ${ruta}. Escribí primero cotizacion.json en la carpeta del proyecto.`);
  return ruta;
}

export function leerJSON(ruta) {
  try {
    return JSON.parse(readFileSync(ruta, 'utf8'));
  } catch (e) {
    throw new Error(`${ruta} no es JSON válido: ${e.message}`);
  }
}

function flag(argv, nombre) {
  const i = argv.indexOf(nombre);
  return i >= 0 ? argv[i + 1] : undefined;
}

function main(argv) {
  const ruta = rutaCotizacion(argv.find((a, i) => !a.startsWith('--') && !['--tarifa', '--moneda'].includes(argv[i - 1])));
  const cot = leerJSON(ruta);
  const cfg = loadConfig();
  const tarifa = flag(argv, '--tarifa');
  const moneda = flag(argv, '--moneda');
  if (tarifa) cfg.tarifaHora = Number(tarifa);
  if (moneda) cfg.moneda = moneda.toUpperCase();
  delete cot.calculo;
  const { calculo, avisos } = calcular(cot, cfg);
  cot.calculo = calculo;
  writeFileSync(ruta, JSON.stringify(cot, null, 2) + '\n');

  console.log(`Cotización · ${cot.proyecto} · ${formatearMoneda(cfg.tarifaHora, cfg.moneda)}/h`);
  for (const o of calculo.opciones) {
    const estrella = o.id === calculo.recomendada ? '  ★' : '';
    console.log(`  ${o.nombre.padEnd(12)} ${String(o.horas).padStart(4)} h   ${o.precioTexto.padEnd(14)} ${o.semanas} semana${o.semanas === 1 ? '' : 's'}${estrella}`);
  }
  for (const a of avisos) console.log(`⚠️ ${a}`);
  console.log(`Guardado en ${ruta}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
}

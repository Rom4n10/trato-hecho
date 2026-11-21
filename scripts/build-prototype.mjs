#!/usr/bin/env node
// Arma el prototipo: <carpeta>/app.json + templates/app-base.html → <carpeta>/site/index.html
// Valida referencias (pantallas, colecciones, tipos de bloque) y devuelve errores legibles para corregir rápido.
// Uso: node build-prototype.mjs <carpeta>
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from './config.mjs';

const PLANTILLA_URL = new URL('../skills/crear/templates/app-base.html', import.meta.url);
export const BLOQUES = ['hero', 'titulo', 'stats', 'accesos', 'lista', 'grilla', 'carrito', 'formulario', 'detalle', 'texto', 'aviso', 'mapa', 'barras', 'perfil', 'html'];
export const ESTILOS = ['fresco', 'clasico', 'calle', 'sereno', 'profesional'];
const CON_COLECCION = ['lista', 'grilla', 'formulario'];

const destino = (ir) => String(ir).split('/')[0];

export function validarApp(app) {
  const errores = [];
  const avisos = [];
  if (!app || typeof app !== 'object') return { errores: ['app.json está vacío o no es un objeto.'], avisos };
  if (!app.nombre) errores.push('Falta "nombre" (nombre de la app).');
  if (!Array.isArray(app.pantallas) || app.pantallas.length < 2) {
    errores.push('"pantallas" tiene que ser una lista con al menos 2 pantallas.');
    return { errores, avisos };
  }
  if (app.estilo && !ESTILOS.includes(app.estilo)) errores.push(`estilo "${app.estilo}" no existe. Válidos: ${ESTILOS.join(', ')}.`);
  const cols = app.colecciones && typeof app.colecciones === 'object' ? app.colecciones : {};
  for (const [k, v] of Object.entries(cols)) if (!Array.isArray(v)) errores.push(`colecciones.${k} tiene que ser una lista.`);

  const ids = new Map();
  app.pantallas.forEach((p, i) => {
    if (!p || !p.id) return errores.push(`pantallas[${i}]: falta "id".`);
    if (ids.has(p.id)) errores.push(`pantallas[${i}]: id "${p.id}" repetido.`);
    ids.set(p.id, p);
  });
  const existe = (ir) => ids.has(destino(ir));
  const revisarIr = (ir, donde) => {
    if (ir !== undefined && ir !== null && ir !== '' && !existe(ir)) errores.push(`${donde}: va a la pantalla "${destino(ir)}" que no existe. Pantallas: ${[...ids.keys()].join(', ')}.`);
  };

  const tabs = app.pantallas.filter((p) => p && p.nav);
  if (tabs.length > 5) errores.push(`Hay ${tabs.length} pestañas con "nav": true; el máximo es 5.`);
  if (tabs.length < 2) avisos.push('Hay menos de 2 pestañas con "nav": true; la navegación inferior no se va a mostrar.');
  revisarIr(app.inicio, 'inicio');
  revisarIr(app.pantallaCarrito, 'pantallaCarrito');

  app.pantallas.forEach((p, i) => {
    if (!p || !p.id) return;
    const q = `pantalla "${p.id}"`;
    if (!p.titulo) errores.push(`${q}: falta "titulo".`);
    if (p.de && !(p.de in cols)) errores.push(`${q}: "de" apunta a la colección "${p.de}" que no existe.`);
    if (p.fab) revisarIr(p.fab.ir, `${q} → fab`);
    if (!Array.isArray(p.bloques)) return errores.push(`${q}: "bloques" tiene que ser una lista.`);
    p.bloques.forEach((b, j) => {
      const qb = `${q} → bloque ${j + 1} (${b && b.tipo})`;
      if (!b || !BLOQUES.includes(b.tipo)) return errores.push(`${q} → bloque ${j + 1}: tipo "${b && b.tipo}" no existe. Válidos: ${BLOQUES.join(', ')}.`);
      if (CON_COLECCION.includes(b.tipo) || (b.tipo === 'barras' && b.coleccion)) {
        if (!b.coleccion) errores.push(`${qb}: falta "coleccion".`);
        else if (!(b.coleccion in cols) && b.tipo !== 'formulario') errores.push(`${qb}: la colección "${b.coleccion}" no existe. Colecciones: ${Object.keys(cols).join(', ') || '(ninguna)'}.`);
      }
      if (b.tipo === 'detalle' && !p.de) errores.push(`${qb}: un bloque detalle necesita que la pantalla tenga "de": "<coleccion>".`);
      if ((b.tipo === 'formulario' || b.tipo === 'carrito') && b.campos && !Array.isArray(b.campos)) errores.push(`${qb}: "campos" tiene que ser una lista.`);
      if (b.tipo === 'formulario' && (!Array.isArray(b.campos) || !b.campos.length)) errores.push(`${qb}: el formulario no tiene "campos".`);
      if (b.tipo === 'grilla' && b.carrito && !app.pantallaCarrito) errores.push(`${qb}: tiene carrito pero falta "pantallaCarrito" (id de la pantalla con el bloque carrito).`);
      for (const c of b.campos || []) {
        if (c && c.opcionesDe) {
          const [colName] = String(c.opcionesDe).split('.');
          if (!(colName in cols)) errores.push(`${qb}: campo "${c.nombre}" usa opcionesDe "${c.opcionesDe}" y esa colección no existe.`);
        }
      }
      if (b.accion) revisarIr(b.accion.ir, qb);
      for (const k of ['ir', 'verTodo', 'vacioIr', 'luego']) revisarIr(b[k], `${qb} → ${k}`);
      for (const it of b.items || []) if (it && it.ir) revisarIr(it.ir, qb);
      for (const a of b.acciones || []) if (a && a.ir) revisarIr(a.ir, qb);
      if ((b.tipo === 'lista' || b.tipo === 'grilla') && b.ir && existe(b.ir)) {
        const dest = ids.get(destino(b.ir));
        if (!dest.de) errores.push(`${qb}: abre "${dest.id}" pero esa pantalla no tiene "de": "${b.coleccion}" (no sabría qué elemento mostrar).`);
        else if (dest.de !== b.coleccion) errores.push(`${qb}: lista "${b.coleccion}" pero abre "${dest.id}", que muestra "${dest.de}". Usá una pantalla de detalle con "de": "${b.coleccion}".`);
      }
    });
  });
  return { errores, avisos };
}

function escaparHTML(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function construir(app, plantilla) {
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  const BS = String.fromCharCode(92);
  const json = JSON.stringify(app).replace(/</g, BS + "u003c").split(LS).join(BS + "u2028").split(PS).join(BS + "u2029");
  const color = { fresco: '#0E7C6B', clasico: '#7A1E2C', calle: '#E4572E', sereno: '#6B5CA5', profesional: '#24527A' }[app.estilo] || '#0E7C6B';
  return plantilla
    .replace('/*APP_JSON*/null', () => json)
    .replace('{{TITULO}}', () => escaparHTML(app.nombre))
    .replace('{{DESCRIPCION}}', () => escaparHTML(app.descripcion || `Prototipo de ${app.nombre}`))
    .replace('{{COLOR}}', () => escaparHTML((app.tema && app.tema.primario) || color));
}

export function construirCarpeta(dir) {
  const ruta = join(dir, 'app.json');
  if (!existsSync(ruta)) throw new Error(`No encuentro ${ruta}. Escribí primero app.json siguiendo references/design-rules.md.`);
  let app;
  try {
    app = JSON.parse(readFileSync(ruta, 'utf8'));
  } catch (e) {
    throw new Error(`app.json no es JSON válido: ${e.message}`);
  }
  if (!app.moneda) {
    try { app.moneda = loadConfig().moneda; } catch { app.moneda = 'USD'; }
  }
  const { errores, avisos } = validarApp(app);
  if (errores.length) throw new Error(`app.json tiene ${errores.length} problema(s):\n- ${errores.join('\n- ')}`);
  const html = construir(app, readFileSync(PLANTILLA_URL, 'utf8'));
  mkdirSync(join(dir, 'site'), { recursive: true });
  const salida = join(dir, 'site', 'index.html');
  writeFileSync(salida, html);
  return { salida, avisos, app };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const dir = process.argv[2];
    if (!dir) throw new Error('Uso: node build-prototype.mjs <carpeta>');
    const { salida, avisos, app } = construirCarpeta(dir);
    for (const a of avisos) console.log(`⚠️ ${a}`);
    console.log(`Prototipo: ${app.pantallas.length} pantallas → ${salida}`);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
}

#!/usr/bin/env node
// Herramienta de desarrollo (no la usa el plugin en runtime): baja íconos de Lucide (ISC)
// desde jsDelivr y los incrusta en templates/app-base.html entre /*ICONOS*/ y /*FIN_ICONOS*/.
// Uso: node scripts/dev/actualizar-iconos.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const VERSION = '1.77.0';
const PLANTILLA = new URL('../../skills/crear/templates/app-base.html', import.meta.url);

// clave en español → nombre(s) en Lucide (el primero que exista)
export const ICONOS = {
  inicio: ['house'], calendario: ['calendar'], agenda: ['calendar-check'], lista: ['list'], usuario: ['user'], usuarios: ['users'],
  bolsa: ['shopping-bag'], carrito: ['shopping-cart'], ubicacion: ['map-pin'], campana: ['bell'], mas: ['plus'], buscar: ['search'],
  derecha: ['chevron-right'], izquierda: ['chevron-left'], reloj: ['clock'], estrella: ['star'], corazon: ['heart'],
  grafico: ['chart-column', 'bar-chart-3'], ajustes: ['sliders-horizontal'], check: ['check'], telefono: ['phone'],
  mensaje: ['message-circle'], etiqueta: ['tag'], archivo: ['file-text'], dinero: ['banknote'], menu: ['menu'], tienda: ['store'],
  historial: ['history'], cerrar: ['x'], pata: ['paw-print'], perro: ['dog'], gato: ['cat'], tijera: ['scissors'],
  hamburguesa: ['hamburger', 'sandwich'], cafe: ['coffee'], pizza: ['pizza'], vacuna: ['syringe'], salud: ['stethoscope'],
  camion: ['truck'], pesas: ['dumbbell'], auto: ['car'], herramienta: ['wrench'], brillo: ['sparkles'], ropa: ['shirt'],
  pan: ['croissant'], torta: ['cake-slice'], cubiertos: ['utensils'], ensalada: ['salad'], edificio: ['building-2'],
  estudio: ['graduation-cap'], fiesta: ['party-popper'], hoja: ['leaf'], flor: ['flower-2'], tarjeta: ['credit-card'],
  paquete: ['package'], recibo: ['receipt'], camara: ['camera'], maletin: ['briefcase'], libro: ['book-open'], vino: ['wine'],
  bebida: ['cup-soda'], helado: ['ice-cream-cone'], bici: ['bike'], cama: ['bed-double'], ok: ['circle-check'],
  alerta: ['triangle-alert'], info: ['info'], fuego: ['flame'], regalo: ['gift'], escudo: ['shield-check'], casa: ['house'],
  llave: ['key-round'], mapa: ['map'], espera: ['hourglass'], navaja: ['scissors'], diente: ['smile'], bebe: ['baby'],
};

async function bajar(nombre) {
  const r = await fetch(`https://cdn.jsdelivr.net/npm/lucide-static@${VERSION}/icons/${nombre}.svg`);
  if (!r.ok) return null;
  const svg = await r.text();
  const interior = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '').replace(/\s*\n\s*/g, '').trim();
  if (/<script|on\w+=/i.test(interior)) throw new Error(`SVG sospechoso: ${nombre}`);
  return interior;
}

const salida = {};
for (const [clave, nombres] of Object.entries(ICONOS)) {
  let ok = null;
  for (const n of nombres) { ok = await bajar(n); if (ok) break; }
  if (!ok) { console.error(`✗ ${clave} (${nombres.join(', ')})`); continue; }
  salida[clave] = ok;
}
const bloque = `/*ICONOS*/${JSON.stringify(salida)}/*FIN_ICONOS*/`;
let html = readFileSync(PLANTILLA, 'utf8');
if (!/\/\*ICONOS\*\/[\s\S]*?\/\*FIN_ICONOS\*\//.test(html)) throw new Error('No encuentro los marcadores /*ICONOS*/ … /*FIN_ICONOS*/ en la plantilla.');
html = html.replace(/\/\*ICONOS\*\/[\s\S]*?\/\*FIN_ICONOS\*\//, () => bloque);
writeFileSync(PLANTILLA, html);
console.log(`${Object.keys(salida).length}/${Object.keys(ICONOS).length} íconos de Lucide ${VERSION} incrustados (${bloque.length} bytes).`);

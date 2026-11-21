#!/usr/bin/env node
// Llena templates/propuesta.html con cotizacion.json (+ app.json para el color de marca) y la config del freelancer.
// Uso: node render-proposal.mjs <carpeta>   → <carpeta>/site/propuesta/index.html
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from './config.mjs';
import { calcular, leerJSON, rutaCotizacion } from './quote.mjs';
import { resolverFotos } from './build-prototype.mjs';

const PLANTILLA_URL = new URL('../skills/crear/templates/propuesta.html', import.meta.url);
const COLORES = { fresco: '#0E7C6B', clasico: '#7A1E2C', calle: '#E4572E', sereno: '#6B5CA5', profesional: '#24527A' };
const ICONO_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5zm-1.3 13.2-3.6-3.6 1.4-1.4 2.2 2.2 5.1-5.1 1.4 1.4z"/></svg>';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function linkWhatsApp(numero, texto) {
  const n = String(numero || '').replace(/\D/g, '');
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

export function mezclarColor(a, b, t) {
  const rgb = (h) => {
    let x = String(h).replace('#', '');
    if (x.length === 3) x = x.replace(/./g, '$&$&');
    const n = parseInt(x, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [p, q] = [rgb(a), rgb(b)];
  return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function fechaLarga(iso, conAnio = true) {
  const [y, m, d] = iso.split('-').map(Number);
  const opts = conAnio ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' };
  return new Intl.DateTimeFormat('es-419', opts).format(new Date(y, m - 1, d));
}

function onda(semilla, barras = 40) {
  let h = 0;
  for (const ch of semilla) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = (h % 1000) / 160;
  const b = ((h >> 10) % 1000) / 230;
  let html = '';
  for (let i = 0; i < barras; i++) {
    const v = Math.abs(Math.sin(i * 0.73 + a) * Math.cos(i * 0.29 + b)) * 0.8 + Math.abs(Math.sin(i * 2.1 + b)) * 0.2;
    html += `<i style="height:${Math.round(18 + v * 82)}%"></i>`;
  }
  return html;
}

function iniciales(t) {
  const p = String(t || '').split(/\s+/).filter((w) => /[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(w));
  return ((p[0] || '?').charAt(0) + (p[1] ? p[1].charAt(0) : '')).toUpperCase();
}

// Primera foto de portada (hero) del prototipo, ya resuelta a URL.
export function fotoPortada(app) {
  if (!app || !Array.isArray(app.pantallas)) return '';
  for (const p of app.pantallas) for (const b of p.bloques || []) if (b && b.tipo === 'hero' && /^https:\/\//.test(b.foto || '')) return b.foto;
  return '';
}

function duracion(seg) {
  if (!(seg > 0)) return '';
  const s = Math.round(seg);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function textoAcepto(cfg, cot, o) {
  const saludo = cfg.nombre ? `¡Hola ${cfg.nombre.split(' ')[0]}!` : '¡Hola!';
  return `${saludo} Vi la propuesta de ${cot.proyecto} y quiero avanzar con la opción ${o.nombre} (${o.precioTexto}). ¿Cómo seguimos?`;
}

function tarjeta(o, i, opciones, cot, cfg, recomendada) {
  const destacada = o.id === recomendada;
  const previa = i > 0 ? opciones[i - 1] : null;
  const items = [];
  if (previa) items.push(`<li class="base">Todo lo de ${esc(previa.nombre)}, más:</li>`);
  for (const f of o.nuevas) items.push(`<li>${esc(f.nombre)}${f.descripcion ? `<small>${esc(f.descripcion)}</small>` : ''}</li>`);
  return `<article class="opcion${destacada ? ' destacada' : ''}">
        <header><h3>${esc(o.nombre)}</h3>${destacada ? '<span class="sello">La que te recomiendo</span>' : ''}</header>
        <p class="desc">${esc(o.descripcion)}</p>
        <p class="monto">${esc(o.precioTexto)}</p>
        <p class="plazo">Listo en ${o.semanas} semana${o.semanas === 1 ? '' : 's'}</p>
        <ul class="incluye">${items.join('')}</ul>
        <a class="acepto" href="${esc(linkWhatsApp(cfg.whatsapp, textoAcepto(cfg, cot, o)))}" target="_blank" rel="noopener">${ICONO_WA}Acepto la opción ${esc(o.nombre)}</a>
      </article>`;
}

export function renderPropuesta({ cot, cfg, app, plantilla }) {
  const calc = cot.calculo;
  if (!calc) throw new Error('cotizacion.json no tiene "calculo". Corré antes: node scripts/quote.mjs <carpeta>');
  const color = (app && app.tema && app.tema.primario) || (app && COLORES[app.estilo]) || COLORES.fresco;
  const recomendada = calc.recomendada || 'recomendada';
  const rec = calc.opciones.find((o) => o.id === recomendada) || calc.opciones[1];
  const encabezado = cfg.nombre && cot.cliente ? `Propuesta de ${cfg.nombre} para ${cot.cliente}`
    : cfg.nombre ? `Propuesta de ${cfg.nombre}`
    : cot.cliente ? `Propuesta para ${cot.cliente}` : 'Propuesta';
  const contacto = cfg.whatsapp ? ` · <a href="https://wa.me/${esc(cfg.whatsapp)}">+${esc(cfg.whatsapp)}</a>` : '';
  const valores = {
    PROYECTO: esc(cot.proyecto),
    RESUMEN: esc(cot.resumen),
    COLOR: esc(color),
    COLOR_OSCURO: esc(mezclarColor(color, '#000000', 0.3)),
    COLOR_CLARO: esc(mezclarColor(color, '#ffffff', 0.86)),
    ENCABEZADO: esc(encabezado),
    FECHA: esc(fechaLarga(calc.fecha)),
    VALIDA_HASTA: esc(fechaLarga(calc.validaHasta, false)),
    ONDA: onda(cot.resumen || cot.proyecto),
    DURACION: esc(duracion(cot.duracionAudio)),
    ENTENDIMOS: (cot.entendimos || []).map((x) => `<li>${esc(x)}</li>`).join(''),
    APP_LOGO: fotoPortada(app) ? '' : esc(iniciales((app && app.nombre) || cot.proyecto)),
    APP_FOTO: fotoPortada(app) ? ` style="background-image:url('${esc(fotoPortada(app))}')"` : '',
    APP_NOMBRE: esc((app && app.nombre) || cot.proyecto),
    MONEDA: esc(calc.moneda),
    OPCIONES: calc.opciones.map((o, i, arr) => tarjeta(o, i, arr, cot, cfg, recomendada)).join('\n      '),
    PREGUNTAS: (cot.preguntas || []).map((x) => `<li>${esc(x)}</li>`).join(''),
    FREELANCER: esc(cfg.nombre || 'Tu desarrollador'),
    CONTACTO: contacto,
    FIJA_NOMBRE: esc(rec.nombre),
    FIJA_PRECIO: esc(rec.precioTexto),
    FIJA_LINK: esc(linkWhatsApp(cfg.whatsapp, textoAcepto(cfg, cot, rec))),
    ICONO_WA,
  };
  const html = plantilla.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in valores ? valores[k] : m));
  const sobrantes = html.match(/\{\{[A-Z_]+\}\}/g);
  if (sobrantes) throw new Error(`La plantilla tiene marcadores sin completar: ${[...new Set(sobrantes)].join(', ')}`);
  return html;
}

export function renderCarpeta(dir, cfg = loadConfig()) {
  const ruta = rutaCotizacion(dir);
  const cot = leerJSON(ruta);
  if (!cot.calculo) {
    cot.calculo = calcular(cot, cfg).calculo;
    writeFileSync(ruta, JSON.stringify(cot, null, 2) + '\n');
  }
  const rutaApp = join(dir, 'app.json');
  let app = null;
  if (existsSync(rutaApp)) {
    try { app = JSON.parse(readFileSync(rutaApp, 'utf8')); resolverFotos(app); } catch { app = null; }
  }
  const html = renderPropuesta({ cot, cfg, app, plantilla: readFileSync(PLANTILLA_URL, 'utf8') });
  const salidaDir = join(dir, 'site', 'propuesta');
  mkdirSync(salidaDir, { recursive: true });
  const salida = join(salidaDir, 'index.html');
  writeFileSync(salida, html);
  return { salida, cot };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const dir = process.argv[2];
    if (!dir) throw new Error('Uso: node render-proposal.mjs <carpeta>');
    const { salida } = renderCarpeta(dir);
    console.log(`Propuesta → ${salida}`);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
}

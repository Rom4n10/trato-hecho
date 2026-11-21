#!/usr/bin/env node
// Paso final de /trato:crear: arma prototipo + propuesta, publica, genera QR y el mensaje de WhatsApp.
// Uso: node publicar.mjs <carpeta> [--sin-deploy]
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig, configDir } from './config.mjs';
import { construirCarpeta } from './build-prototype.mjs';
import { renderCarpeta } from './render-proposal.mjs';
import { deployVercel, previewLocal } from './deploy.mjs';
import { qrTerminal, qrSVG } from './qr.mjs';

export function mensajeWhatsApp(cfg, cot, links) {
  const nombre = cfg.nombre ? cfg.nombre.split(' ')[0] : '';
  const lineas = [
    `¡Hola! ${nombre ? `Soy ${nombre}. ` : ''}Escuché tu audio y ya te armé algo para que lo veas:`,
    '',
    `📱 Un prototipo para probar desde el celular:`,
    links.prototipo,
    '',
    `📄 La propuesta con 3 opciones y precios:`,
    links.propuesta,
    '',
    `En resumen: ${cot.resumen}`,
    '',
    'Miralo con calma y, si te cierra, tocá "Acepto" en la opción que prefieras. Cualquier duda, mandame un audio 🙂',
  ];
  return lineas.join('\n');
}

export function duracionTexto(seg) {
  const s = Math.round(seg);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}

// Segundos desde que /trato:crear arrancó (marca de doctor.mjs --inicio), si es de esta corrida.
function segundosDesdeInicio() {
  try {
    const { ts } = JSON.parse(readFileSync(join(configDir(), 'inicio.json'), 'utf8'));
    const seg = (Date.now() - ts) / 1000;
    return seg > 0 && seg < 30 * 60 ? seg : null;
  } catch {
    return null;
  }
}

// Si una corrida anterior dejó un preview local para esta carpeta, lo cierra antes de abrir otro.
function cerrarPreviewAnterior(dir) {
  const ruta = join(dir, 'links.json');
  if (!existsSync(ruta)) return;
  try {
    const { pidServidor } = JSON.parse(readFileSync(ruta, 'utf8'));
    if (pidServidor) process.kill(pidServidor);
  } catch { /* ya no corre o links.json inválido */ }
}

async function main(argv) {
  const dir = argv.find((a) => !a.startsWith('--'));
  if (!dir) throw new Error('Uso: node publicar.mjs <carpeta> [--sin-deploy]');
  const sinDeploy = argv.includes('--sin-deploy');
  const cfg = loadConfig();
  const t0 = Date.now();

  const proto = construirCarpeta(dir);
  for (const a of proto.avisos) console.log(`⚠️ ${a}`);
  const { cot } = renderCarpeta(dir, cfg);
  const siteDir = join(dir, 'site');

  let base, modo, extra = {};
  if (!sinDeploy) {
    try {
      const r = await deployVercel(siteDir, basename(resolve(dir)), cfg);
      base = r.url;
      modo = 'vercel';
      extra.proyectoVercel = r.proyecto;
      if (r.protegido) console.log('⚠️ Vercel pide login para ver el link. Desactivá la protección en vercel.com → tu proyecto → Settings → Deployment Protection → Vercel Authentication: Disabled.');
    } catch (e) {
      console.log(`⚠️ ${e.message}\n   Sigo con un preview local.`);
    }
  }
  if (!base) {
    cerrarPreviewAnterior(dir);
    const l = await previewLocal(siteDir);
    base = l.url;
    modo = 'local';
    extra = { local: l.local, pidServidor: l.pid };
  }

  const total = segundosDesdeInicio();
  const links = { prototipo: base, propuesta: base + 'propuesta/', modo, fecha: new Date().toISOString(), ...(total ? { segundosTotales: Math.round(total) } : {}), ...extra };
  writeFileSync(join(dir, 'links.json'), JSON.stringify(links, null, 2) + '\n');
  const mensaje = mensajeWhatsApp(cfg, cot, links);
  writeFileSync(join(dir, 'mensaje-whatsapp.txt'), mensaje + '\n');
  writeFileSync(join(dir, 'qr.svg'), qrSVG(links.prototipo));

  const rec = cot.calculo.opciones.find((o) => o.id === cot.calculo.recomendada);
  const seg = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(modo === 'vercel' ? `✅ Publicado en Vercel (${seg} s)` : `✅ Preview local listo (${seg} s) — tu celular tiene que estar en la misma red Wi-Fi.`);
  console.log(`Prototipo:  ${links.prototipo}`);
  console.log(`Propuesta:  ${links.propuesta}`);
  console.log(`Recomendada: ${rec.precioTexto} · ${rec.semanas} semana${rec.semanas === 1 ? '' : 's'}`);
  if (total) console.log(`⏱ Tiempo total: ${duracionTexto(total)} (desde el audio hasta los links)`);
  console.log('');
  console.log(qrTerminal(links.prototipo));
  console.log('');
  console.log(`--- mensaje-whatsapp.txt ---\n${mensaje}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  });
}

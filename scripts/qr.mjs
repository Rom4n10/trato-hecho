#!/usr/bin/env node
// Generador de códigos QR sin dependencias (modo byte, corrección M/L, versiones 1–40).
// Basado en el algoritmo de referencia de Project Nayuki (MIT).
// Uso: node qr.mjs "<texto>" [--svg salida.svg]
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ECC = {
  L: { bits: 1, porBloque: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], bloques: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25] },
  M: { bits: 0, porBloque: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28], bloques: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49] },
};

const bit = (x, i) => ((x >>> i) & 1) !== 0;

function modulosCrudos(ver) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
}
const codewordsDatos = (ver, e) => Math.floor(modulosCrudos(ver) / 8) - ECC[e].porBloque[ver] * ECC[e].bloques[ver];

function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}
function rsDivisor(grado) {
  const r = new Array(grado).fill(0);
  r[grado - 1] = 1;
  let raiz = 1;
  for (let i = 0; i < grado; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = gfMul(r[j], raiz);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    raiz = gfMul(raiz, 0x02);
  }
  return r;
}
function rsResto(datos, div) {
  const r = div.map(() => 0);
  for (const b of datos) {
    const f = b ^ r.shift();
    r.push(0);
    div.forEach((c, i) => (r[i] ^= gfMul(c, f)));
  }
  return r;
}

function posicionesAlineacion(ver, tam) {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2;
  const paso = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
  const r = [6];
  for (let p = tam - 7; r.length < n; p -= paso) r.splice(1, 0, p);
  return r;
}

export function generarQR(texto, nivel = 'M') {
  const bytes = [...new TextEncoder().encode(texto)];
  let ver, e = nivel;
  const usados = (v) => 4 + (v <= 9 ? 8 : 16) + bytes.length * 8;
  for (const cand of nivel === 'M' ? ['M', 'L'] : ['L']) {
    for (let v = 1; v <= 40; v++) {
      if (usados(v) <= codewordsDatos(v, cand) * 8) { ver = v; e = cand; break; }
    }
    if (ver) break;
  }
  if (!ver) throw new Error('El texto es demasiado largo para un QR.');

  // Bits de datos
  const bb = [];
  const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, ver <= 9 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  const cap = codewordsDatos(ver, e) * 8;
  push(0, Math.min(4, cap - bb.length));
  push(0, (8 - (bb.length % 8)) % 8);
  for (let p = 0xec; bb.length < cap; p ^= 0xec ^ 0x11) push(p, 8);
  const datos = [];
  for (let i = 0; i < bb.length; i += 8) datos.push(parseInt(bb.slice(i, i + 8).join(''), 2));

  // ECC + intercalado
  const nb = ECC[e].bloques[ver];
  const eccLen = ECC[e].porBloque[ver];
  const crudos = Math.floor(modulosCrudos(ver) / 8);
  const cortos = nb - (crudos % nb);
  const largoCorto = Math.floor(crudos / nb);
  const div = rsDivisor(eccLen);
  const bloques = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const d = datos.slice(k, k + largoCorto - eccLen + (i < cortos ? 0 : 1));
    k += d.length;
    const ecc = rsResto(d, div);
    if (i < cortos) d.push(0);
    bloques.push(d.concat(ecc));
  }
  const final = [];
  for (let i = 0; i < bloques[0].length; i++) {
    bloques.forEach((b, j) => { if (i !== largoCorto - eccLen || j >= cortos) final.push(b[i]); });
  }

  // Matriz
  const tam = ver * 4 + 17;
  const m = Array.from({ length: tam }, () => new Array(tam).fill(false));
  const fn = Array.from({ length: tam }, () => new Array(tam).fill(false));
  const set = (x, y, v) => { m[y][x] = v; fn[y][x] = true; };
  for (let i = 0; i < tam; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (x, y) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < tam && yy >= 0 && yy < tam) set(xx, yy, d !== 2 && d !== 4);
    }
  };
  finder(3, 3); finder(tam - 4, 3); finder(3, tam - 4);
  const al = posicionesAlineacion(ver, tam);
  for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const formato = (mask) => {
    const d = (ECC[e].bits << 3) | mask;
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const bits = ((d << 10) | r) ^ 0x5412;
    for (let i = 0; i <= 5; i++) set(8, i, bit(bits, i));
    set(8, 7, bit(bits, 6)); set(8, 8, bit(bits, 7)); set(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i++) set(tam - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) set(8, tam - 15 + i, bit(bits, i));
    set(8, tam - 8, true);
  };
  formato(0);
  if (ver >= 7) {
    let r = ver;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const bits = (ver << 12) | r;
    for (let i = 0; i < 18; i++) {
      const b = bit(bits, i), a = tam - 11 + (i % 3), c = Math.floor(i / 3);
      set(a, c, b); set(c, a, b);
    }
  }
  let i = 0;
  for (let der = tam - 1; der >= 1; der -= 2) {
    if (der === 6) der = 5;
    for (let v = 0; v < tam; v++) for (let j = 0; j < 2; j++) {
      const x = der - j;
      const arriba = ((der + 1) & 2) === 0;
      const y = arriba ? tam - 1 - v : v;
      if (!fn[y][x] && i < final.length * 8) { m[y][x] = bit(final[i >>> 3], 7 - (i & 7)); i++; }
    }
  }
  const invertir = (k, x, y) => [
    (x + y) % 2 === 0, y % 2 === 0, x % 3 === 0, (x + y) % 3 === 0,
    (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, ((x * y) % 2) + ((x * y) % 3) === 0,
    (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ][k];
  const aplicar = (k) => { for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) if (!fn[y][x] && invertir(k, x, y)) m[y][x] = !m[y][x]; };
  const penalidad = () => {
    let p = 0, oscuros = 0;
    const patron = [true, false, true, true, true, false, true];
    for (let a = 0; a < 2; a++) for (let y = 0; y < tam; y++) {
      let run = 1;
      const at = (x) => (a === 0 ? m[y][x] : m[x][y]);
      for (let x = 1; x <= tam; x++) {
        if (x < tam && at(x) === at(x - 1)) run++;
        else { if (run >= 5) p += 3 + run - 5; run = 1; }
      }
      for (let x = 0; x + 7 <= tam; x++) {
        if (patron.every((v, k) => at(x + k) === v)) {
          const antes = x >= 4 && [1, 2, 3, 4].every((k) => !at(x - k));
          const despues = x + 11 <= tam && [7, 8, 9, 10].every((k) => !at(x + k));
          if (antes || despues) p += 40;
        }
      }
    }
    for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
      if (m[y][x]) oscuros++;
      if (x < tam - 1 && y < tam - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
    }
    const total = tam * tam;
    p += (Math.ceil(Math.abs(oscuros * 20 - total * 10) / total) - 1) * 10;
    return p;
  };
  let mejor = 0, minimo = Infinity;
  for (let k = 0; k < 8; k++) {
    aplicar(k); formato(k);
    const pen = penalidad();
    if (pen < minimo) { minimo = pen; mejor = k; }
    aplicar(k);
  }
  aplicar(mejor); formato(mejor);
  return { tam, version: ver, nivel: e, mascara: mejor, modulos: m };
}

// Para terminales de fondo oscuro (la más común): los módulos claros se dibujan con bloques.
export function qrTerminal(texto, { margen = 2 } = {}) {
  const { tam, modulos } = generarQR(texto);
  const oscuro = (x, y) => x >= 0 && y >= 0 && x < tam && y < tam && modulos[y][x];
  const lineas = [];
  for (let y = -margen; y < tam + margen; y += 2) {
    let l = '';
    for (let x = -margen; x < tam + margen; x++) {
      const arriba = !oscuro(x, y), abajo = y + 1 < tam + margen ? !oscuro(x, y + 1) : false;
      l += arriba && abajo ? '█' : arriba ? '▀' : abajo ? '▄' : ' ';
    }
    lineas.push(l);
  }
  return lineas.join('\n');
}

export function qrSVG(texto, { margen = 4, modulo = 8, oscuro = '#000', claro = '#fff' } = {}) {
  const { tam, modulos } = generarQR(texto);
  const lado = (tam + margen * 2) * modulo;
  let d = '';
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) if (modulos[y][x]) d += `M${(x + margen) * modulo} ${(y + margen) * modulo}h${modulo}v${modulo}h-${modulo}z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" width="${lado}" height="${lado}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${claro}"/><path d="${d}" fill="${oscuro}"/></svg>`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const texto = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--svg');
  if (!texto) {
    console.error('❌ Uso: node qr.mjs "<texto>" [--svg salida.svg]');
    process.exit(1);
  }
  const iSvg = args.indexOf('--svg');
  if (iSvg >= 0) writeFileSync(args[iSvg + 1], qrSVG(texto));
  console.log(qrTerminal(texto));
}

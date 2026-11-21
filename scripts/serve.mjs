#!/usr/bin/env node
// Servidor estático mínimo para el preview local (sin dependencias).
// Uso: node serve.mjs <carpeta> [--port 4321] [--host 0.0.0.0]
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, normalize, extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

export function crearServidor(raiz) {
  const base = resolve(raiz);
  return createServer((req, res) => {
    let ruta;
    try {
      ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      res.writeHead(400).end('Pedido inválido');
      return;
    }
    let archivo = normalize(join(base, ruta));
    if (archivo !== base && !archivo.startsWith(base + sep)) {
      res.writeHead(403).end('Prohibido');
      return;
    }
    if (existsSync(archivo) && statSync(archivo).isDirectory()) {
      if (!ruta.endsWith('/')) {
        res.writeHead(301, { Location: ruta + '/' }).end();
        return;
      }
      archivo = join(archivo, 'index.html');
    }
    if (!existsSync(archivo)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
      return;
    }
    res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(archivo).pipe(res);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const dir = args.find((a, i) => !a.startsWith('--') && !['--port', '--host'].includes(args[i - 1]));
  const port = Number(args[args.indexOf('--port') + 1]) || Number(process.env.PORT) || 4321;
  const host = args.includes('--host') ? args[args.indexOf('--host') + 1] : '0.0.0.0';
  if (!dir || !existsSync(dir)) {
    console.error(`❌ Uso: node serve.mjs <carpeta> [--port 4321]. No encuentro "${dir || ''}".`);
    process.exit(1);
  }
  crearServidor(dir).listen(port, host, () => console.log(`Sirviendo ${resolve(dir)} en http://localhost:${port}/`));
}

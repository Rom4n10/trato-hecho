#!/usr/bin/env node
// Publica <carpeta>/site en Vercel (proyecto vozapp-<slug>) o, si no se puede, levanta un preview local en la red.
// Uso: node deploy.mjs <carpeta> [--sin-deploy]   (normalmente lo llama publicar.mjs)
import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir, networkInterfaces } from 'node:os';
import { join, basename, resolve } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';

const WIN = process.platform === 'win32';
const SERVE = fileURLToPath(new URL('./serve.mjs', import.meta.url));

export function nombreProyecto(slug) {
  const limpio = String(slug)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return ('vozapp-' + limpio.replace(/^vozapp-/, '')).slice(0, 100).replace(/-$/, '');
}

export function extraerUrls(stdout, stderr) {
  const enStdout = (stdout.match(/https:\/\/[^\s\]]+/g) || []);
  const deploy = enStdout.length ? enStdout[enStdout.length - 1] : null;
  const alias = (stderr.match(/Aliased:?\s+(https:\/\/[^\s\[\]]+)/) || [])[1] || null;
  return { deploy, alias };
}

export function motivoFallo(salida) {
  if (/credentials|vercel login|not logged|token.*(invalid|not valid)|Unauthorized|403/i.test(salida)) return 'No hay sesión de Vercel válida. Corré `npx vercel login` o configurá VERCEL_TOKEN con /vozapp:setup.';
  if (/ENOTFOUND|ECONNRESET|ETIMEDOUT|network|getaddrinfo/i.test(salida)) return 'No hay conexión a internet (o Vercel no responde).';
  if (/rate limit|too many/i.test(salida)) return 'Vercel está limitando deploys (rate limit). Probá en unos minutos.';
  const ultima = salida.trim().split('\n').filter(Boolean).pop() || 'sin detalle';
  return `Vercel falló: ${ultima.slice(0, 200)}`;
}

export function elegirIp(ifaces = networkInterfaces()) {
  const candidatas = [];
  for (const [nombre, lista] of Object.entries(ifaces)) {
    for (const i of lista || []) {
      if (i.family !== 'IPv4' && i.family !== 4) continue;
      if (i.internal) continue;
      let puntaje = 0;
      if (/^192\.168\./.test(i.address)) puntaje += 3;
      else if (/^10\./.test(i.address)) puntaje += 2;
      else if (/^172\.(1[6-9]|2\d|3[01])\./.test(i.address)) puntaje += 1;
      if (/v[Ee]thernet|virtual|vmware|vbox|docker|wsl|hyper-v/i.test(nombre)) puntaje -= 5;
      candidatas.push({ ip: i.address, puntaje });
    }
  }
  candidatas.sort((a, b) => b.puntaje - a.puntaje);
  return candidatas[0] ? candidatas[0].ip : 'localhost';
}

function correr(cmd, args, { cwd, timeout = 180_000 } = {}) {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd, shell: WIN, windowsHide: true, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } });
    let stdout = '', stderr = '';
    const t = setTimeout(() => { p.kill(); stderr += '\nTimeout: tardó más de 3 minutos.'; }, timeout);
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', (e) => { stderr += e.message; });
    p.on('close', (code) => { clearTimeout(t); res({ code, stdout, stderr }); });
  });
}

function prepararStage(siteDir, proyecto) {
  const stage = join(tmpdir(), 'vozapp-deploy', proyecto);
  mkdirSync(stage, { recursive: true });
  for (const f of readdirSync(stage)) if (f !== '.vercel') rmSync(join(stage, f), { recursive: true, force: true });
  cpSync(siteDir, stage, { recursive: true });
  return stage;
}

export async function deployVercel(siteDir, slug, cfg = {}) {
  const proyecto = nombreProyecto(slug);
  const stage = prepararStage(siteDir, proyecto);
  const args = ['--yes', 'vercel', 'deploy', '--prod', '--yes'];
  if (cfg.VERCEL_TOKEN) args.push('--token', cfg.VERCEL_TOKEN);
  const r = await correr('npx', args, { cwd: stage });
  const { deploy, alias } = extraerUrls(r.stdout, r.stderr);
  if (r.code !== 0 || !deploy) throw new Error(motivoFallo(`${r.stderr}\n${r.stdout}`));
  let url = alias;
  if (!url) {
    const i = await correr('npx', ['--yes', 'vercel', 'inspect', deploy, ...(cfg.VERCEL_TOKEN ? ['--token', cfg.VERCEL_TOKEN] : [])], { cwd: stage, timeout: 60_000 });
    const urls = `${i.stdout}\n${i.stderr}`.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/g) || [];
    url = urls.filter((u) => u !== deploy).sort((a, b) => a.length - b.length)[0] || deploy;
  }
  url = url.replace(/\/?$/, '/');
  let protegido = false;
  try {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    protegido = res.status === 401 || res.status === 403;
  } catch { /* si no responde todavía, igual devolvemos la URL */ }
  return { url, proyecto, protegido };
}

function puertoLibre(desde = 4321) {
  return new Promise((res, rej) => {
    const probar = (p) => {
      if (p > desde + 50) return rej(new Error('No encontré un puerto libre para el preview local.'));
      const s = createServer();
      s.once('error', () => probar(p + 1));
      s.once('listening', () => s.close(() => res(p)));
      s.listen(p, '0.0.0.0');
    };
    probar(desde);
  });
}

export async function previewLocal(siteDir) {
  const port = await puertoLibre();
  const hijo = spawn(process.execPath, [SERVE, resolve(siteDir), '--port', String(port)], { detached: true, stdio: 'ignore', windowsHide: true });
  hijo.unref();
  const local = `http://localhost:${port}/`;
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(local, { signal: AbortSignal.timeout(500) });
      if (r.ok) break;
    } catch { /* todavía arrancando */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  const ip = elegirIp();
  return { url: `http://${ip}:${port}/`, local, pid: hijo.pid };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2];
  const sinDeploy = process.argv.includes('--sin-deploy');
  (async () => {
    if (!dir || !existsSync(join(dir, 'site', 'index.html'))) throw new Error('Uso: node deploy.mjs <carpeta> (tiene que existir <carpeta>/site/index.html)');
    const { loadConfig } = await import('./config.mjs');
    if (!sinDeploy) {
      const r = await deployVercel(join(dir, 'site'), basename(resolve(dir)), loadConfig());
      console.log(r.url);
      return;
    }
    const l = await previewLocal(join(dir, 'site'));
    console.log(l.url);
  })().catch((e) => {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  });
}

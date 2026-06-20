// ─── Prism+ Studio — servidor local ───────────────────────────────────────────
// Panel visual para crear, editar, PROBAR (fetch real), firmar y publicar
// extensiones. Sin dependencias: solo módulos nativos de Node.
//
// Uso: npm run studio   → abre http://localhost:4173
// ---------------------------------------------------------------------------

import { createServer } from 'http';
import {
  readFileSync, writeFileSync, readdirSync, existsSync,
  mkdirSync, rmSync, statSync,
} from 'fs';
import { join, extname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawn } from 'child_process';
import { tmpdir } from 'os';

const ROOT     = fileURLToPath(new URL('..', import.meta.url));
const STUDIO   = join(ROOT, 'studio');
const PUBLIC   = join(STUDIO, 'public');
const EXT_DIR  = join(ROOT, 'extensions');
const DIST_DIR = join(ROOT, 'dist');
const INDEX    = join(ROOT, 'index.json');
const PRIV_KEY = join(ROOT, '.keys', 'private.pem');
const PORT     = 4173;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
  });
}

// Corre un comando y captura stdout/stderr.
function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd: ROOT, shell: true, ...opts });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => resolve({ code, output: out }));
  });
}

// ─── Catálogo: estado de cada extensión ────────────────────────────────────────

function catalogIndex() {
  if (!existsSync(INDEX)) return {};
  try {
    const idx = JSON.parse(readFileSync(INDEX, 'utf8'));
    const map = {};
    for (const e of idx.extensions || []) map[e.package] = e;
    return map;
  } catch { return {}; }
}

function listExtensions() {
  if (!existsSync(EXT_DIR)) return [];
  const idx = catalogIndex();
  return readdirSync(EXT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const name = d.name;
      const manifestPath = join(EXT_DIR, name, 'manifest.json');
      const indexPath = join(EXT_DIR, name, 'index.ts');
      let manifest = null;
      try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch {}
      const entry = manifest ? idx[manifest.package] : null;
      const distPath = join(DIST_DIR, `${name}.js`);
      return {
        name,
        title: manifest?.name ?? name,
        package: manifest?.package ?? '',
        version: manifest?.version ?? '',
        type: manifest?.type ?? '',
        icon: manifest?.icon ?? '',
        hasManifest: !!manifest,
        hasIndex: existsSync(indexPath),
        built: existsSync(distPath),
        signed: !!(entry && entry.signature),
        inCatalog: !!entry,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

// ─── Probar una extensión: corre latest/search/detail/watch de verdad ──────────

async function testExtension(name) {
  const distPath = join(DIST_DIR, `${name}.js`);
  if (!existsSync(distPath)) {
    return { ok: false, error: 'No compilada. Pulsá "Compilar" primero.' };
  }
  const bundle = readFileSync(distPath, 'utf8');
  // Bundle ESM `export default class extends Extension`. Le damos la clase base
  // como global y lo importamos desde un archivo temporal.
  const temp = join(tmpdir(), `prismtest_${name}_${Date.now()}.mjs`);
  const shim = `globalThis.Extension = globalThis.Extension || class {};\n`;
  writeFileSync(temp, shim + bundle, 'utf8');

  const result = { ok: true, steps: {} };
  let mod;
  try {
    mod = await import(pathToFileURL(temp).href + `?t=${Date.now()}`);
  } catch (e) {
    rmSync(temp, { force: true });
    return { ok: false, error: 'Error al cargar el bundle: ' + e.message };
  }

  const inst = new mod.default();
  const withTimeout = (p, ms = 20000) =>
    Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout ' + ms + 'ms')), ms))]);

  // latest
  let firstItemUrl = null;
  try {
    const latest = await withTimeout(inst.latest(1));
    const arr = Array.isArray(latest) ? latest : (latest?.items ?? []);
    firstItemUrl = arr[0]?.url ?? null;
    result.steps.latest = { ok: arr.length > 0, count: arr.length, sample: arr.slice(0, 6) };
  } catch (e) {
    result.steps.latest = { ok: false, error: e.message };
  }

  // search
  try {
    const search = await withTimeout(inst.search('a', 1));
    const arr = Array.isArray(search) ? search : (search?.items ?? []);
    if (!firstItemUrl) firstItemUrl = arr[0]?.url ?? null;
    result.steps.search = { ok: arr.length > 0, count: arr.length, sample: arr.slice(0, 6) };
  } catch (e) {
    result.steps.search = { ok: false, error: e.message };
  }

  // detail
  let firstEpisodeUrl = null;
  try {
    if (!firstItemUrl) throw new Error('sin item de latest/search para detail()');
    const detail = await withTimeout(inst.detail(firstItemUrl));
    const groups = detail?.episodes ?? [];
    const eps = Array.isArray(groups) && groups[0]?.urls ? groups[0].urls : groups;
    firstEpisodeUrl = eps?.[0]?.url ?? null;
    result.steps.detail = {
      ok: !!detail?.title,
      title: detail?.title, cover: detail?.cover,
      episodes: Array.isArray(eps) ? eps.length : 0,
      sample: (eps || []).slice(0, 4),
    };
  } catch (e) {
    result.steps.detail = { ok: false, error: e.message };
  }

  // watch
  try {
    if (!firstEpisodeUrl) throw new Error('sin episodio de detail() para watch()');
    const watch = await withTimeout(inst.watch(firstEpisodeUrl));
    const headers = watch?.headers ?? {};
    let servers = {};
    try { servers = JSON.parse(headers['X-Servers'] || '{}'); } catch {}
    result.steps.watch = {
      ok: !!watch?.url && !String(watch.url).startsWith('error://'),
      url: watch?.url,
      pageUrl: headers['X-Page-Url'] || (String(watch?.url).startsWith('page://') ? String(watch.url).slice(7) : ''),
      servers: Object.keys(servers),
      type: watch?.type,
    };
  } catch (e) {
    result.steps.watch = { ok: false, error: e.message };
  }

  rmSync(temp, { force: true });
  return result;
}

// ─── API ────────────────────────────────────────────────────────────────────

async function api(req, res, url) {
  const path = url.pathname.replace('/api/', '');

  if (path === 'extensions' && req.method === 'GET') {
    return send(res, 200, { extensions: listExtensions() });
  }

  if (path === 'extension' && req.method === 'GET') {
    const name = url.searchParams.get('name');
    const mPath = join(EXT_DIR, name, 'manifest.json');
    const iPath = join(EXT_DIR, name, 'index.ts');
    return send(res, 200, {
      manifest: existsSync(mPath) ? JSON.parse(readFileSync(mPath, 'utf8')) : null,
      source: existsSync(iPath) ? readFileSync(iPath, 'utf8') : '',
    });
  }

  if (path === 'extension' && req.method === 'POST') {
    const { name, manifest, source } = await readBody(req);
    if (!name || !/^[a-z0-9_-]+$/i.test(name)) return send(res, 400, { error: 'nombre inválido' });
    const dir = join(EXT_DIR, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    writeFileSync(join(dir, 'index.ts'), source ?? '');
    return send(res, 200, { ok: true });
  }

  if (path === 'extension' && req.method === 'DELETE') {
    const name = url.searchParams.get('name');
    const dir = join(EXT_DIR, name);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    return send(res, 200, { ok: true });
  }

  if (path === 'build' && req.method === 'POST') {
    const r = await run('npm', ['run', 'build']);
    return send(res, 200, { ok: r.code === 0, output: r.output });
  }

  if (path === 'test' && req.method === 'POST') {
    const { name } = await readBody(req);
    return send(res, 200, await testExtension(name));
  }

  if (path === 'keystatus' && req.method === 'GET') {
    const hasPrivate = existsSync(PRIV_KEY);
    const pubHexPath = join(ROOT, 'keys', 'public.hex');
    const publicHex = existsSync(pubHexPath) ? readFileSync(pubHexPath, 'utf8').trim() : '';
    return send(res, 200, { hasPrivate, publicHex });
  }

  if (path === 'keygen' && req.method === 'POST') {
    const r = await run('npm', ['run', 'keygen']);
    return send(res, 200, { ok: r.code === 0, output: r.output });
  }

  if (path === 'gitstatus' && req.method === 'GET') {
    const r = await run('git', ['status', '--short']);
    return send(res, 200, { output: r.output });
  }

  if (path === 'publish' && req.method === 'POST') {
    const { message } = await readBody(req);
    const msg = (message || 'chore: actualización de extensiones desde Studio').replace(/"/g, "'");
    const add = await run('git', ['add', '-A']);
    const commit = await run('git', ['commit', '--author=Soul_Of_The_sun <jk3002213@gmail.com>', '-m', `"${msg}"`]);
    const push = await run('git', ['push', 'origin', 'main']);
    return send(res, 200, {
      ok: push.code === 0,
      output: [add.output, commit.output, push.output].join('\n'),
    });
  }

  return send(res, 404, { error: 'not found' });
}

// ─── Estáticos ──────────────────────────────────────────────────────────────

function serveStatic(req, res, url) {
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  const full = join(PUBLIC, file);
  if (!full.startsWith(PUBLIC) || !existsSync(full) || statSync(full).isDirectory()) {
    return send(res, 404, 'Not found', 'text/plain');
  }
  send(res, 200, readFileSync(full), MIME[extname(full)] ?? 'application/octet-stream');
}

// ─── Server ───────────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    return serveStatic(req, res, url);
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  const link = `http://localhost:${PORT}`;
  console.log(`\n  ✨  Prism+ Studio corriendo en ${link}\n`);
  // Abrir el navegador automáticamente.
  const cmd = process.platform === 'win32' ? 'start'
    : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(cmd, [link], { shell: true, stdio: 'ignore', detached: true });
});

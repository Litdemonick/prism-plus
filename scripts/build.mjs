// ─── Prism+ Build Script ──────────────────────────────────────────────────────
// Compila todas las extensiones con esbuild (IIFE, bundle completo) y
// genera el index.json del catálogo con las URLs raw de GitHub.
//
// Variables de entorno:
//   REPO_OWNER  — propietario del fork (default: Litdemonick)
//   REPO_NAME   — nombre del repo (default: prism-plus)
//   BRANCH      — rama de producción (default: main)
//
// Uso: node scripts/build.mjs
// ---------------------------------------------------------------------------

import { build } from 'esbuild';
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
} from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// ─── Configuración ────────────────────────────────────────────────────────────

const ROOT       = fileURLToPath(new URL('..', import.meta.url));
const EXT_DIR    = join(ROOT, 'extensions');
const DIST_DIR   = join(ROOT, 'dist');
const VENDOR_DIR = join(ROOT, 'vendored');
const INDEX_PATH = join(ROOT, 'index.json');

const REPO_OWNER = process.env.REPO_OWNER ?? 'Litdemonick';
const REPO_NAME  = process.env.REPO_NAME  ?? 'prism-plus';
const BRANCH     = process.env.BRANCH     ?? 'main';

// ─── Sanitize footer ─────────────────────────────────────────────────────────
// Inyectado al final de cada bundle IIFE para garantizar que los retornos
// de detail/latest/search tengan siempre urls string no vacías.
// Esto es independiente del código de la extensión — cero cambios requeridos.

function makeSanitizeFooter(globalName) {
  return `;(function(){
  function _s(v){return v==null?'':String(v);}
  function _ep(ep){
    if(!ep||typeof ep!=='object')return null;
    var u=_s(ep.url);if(!u)return null;
    return{title:_s(ep.title)||u,url:u,thumbnail:ep.thumbnail!=null?_s(ep.thumbnail):void 0,
      duration:typeof ep.duration==='number'?ep.duration:void 0,
      airDate:ep.airDate!=null?_s(ep.airDate):void 0,
      number:typeof ep.number==='number'?ep.number:void 0};
  }
  function _detail(d){
    if(!d||typeof d!=='object')return{title:'',episodes:[]};
    var eps=(Array.isArray(d.episodes)?d.episodes:[]).map(_ep).filter(Boolean);
    return Object.assign({},d,{episodes:eps});
  }
  function _items(a){
    if(!Array.isArray(a))return[];
    return a.map(function(it){
      if(!it||typeof it!=='object')return null;
      var u=_s(it.url);if(!u)return null;
      return Object.assign({},it,{title:_s(it.title)||u,url:u});
    }).filter(Boolean);
  }
  var _m=typeof ${globalName}!=='undefined'?${globalName}:null;
  if(_m&&typeof _m==='object'){
    var _d=_m.detail,_l=_m.latest,_ss=_m.search;
    if(typeof _d==='function'||typeof _l==='function'||typeof _ss==='function'){
      // esbuild define exports como getters no-configurables (Object.defineProperty sin set).
      // En strict mode asignar directo falla. Copiamos LEYENDO los getters a un objeto plano.
      var _w={};
      for(var _k in _m){try{_w[_k]=_m[_k];}catch(_e){}}
      if(typeof _d==='function')_w.detail=async function(){return _detail(await _d.apply(_m,arguments));};
      if(typeof _l==='function')_w.latest=async function(){return _items(await _l.apply(_m,arguments));};
      if(typeof _ss==='function')_w.search=async function(){return _items(await _ss.apply(_m,arguments));};
      ${globalName}=_w;
    }
  }
})();`;
}

// ─── Formato PrismHub ─────────────────────────────────────────────────────────
// PrismHub carga las extensiones como `export default class extends Extension`
// con una cabecera de metadatos `==MiruExtension==`. Las extensiones de Prism+
// se escriben como funciones de módulo (latest/search/detail/watch) sobre el
// SDK (fetch); el build las envuelve en ese formato automáticamente.

// Mapea el tipo semántico del manifest al ExtensionType de PrismHub.
function mapType(t) {
  const s = String(t || '').toLowerCase();
  if (['manga', 'comic', 'manhwa', 'manhua'].includes(s)) return 'manga';
  if (['novel', 'fikushon', 'ln'].includes(s)) return 'fikushon';
  return 'bangumi'; // anime, movie, series, tv, live → video
}

// Cabecera ==PrismHubExtension== que PrismHub parsea para los metadatos.
// Mismo formato @clave valor que Miru (por compatibilidad del parser), pero
// con el marcador propio de PrismHub — estas extensiones son de PrismHub/Prism+,
// no de Miru.
function makeHeader(m) {
  return [
    '// ==PrismHubExtension==',
    `// @name         ${m.name}`,
    `// @version      ${m.version}`,
    `// @author       ${m.author}`,
    `// @lang         ${m.lang ?? 'all'}`,
    `// @license      ${m.license ?? 'MIT'}`,
    `// @icon         ${m.icon ?? ''}`,
    `// @package      ${m.package}`,
    `// @type         ${mapType(m.type)}`,
    `// @webSite      ${m.webSite ?? ''}`,
    `// @description  ${m.description ?? ''}`,
    '// ==/PrismHubExtension==',
    '',
  ].join('\n');
}

// Envoltorio: las funciones del bundle (latest/search/detail/watch) quedan como
// declaraciones top-level (esbuild ESM sin el export), igual que las extensiones
// hand-made compatibles con el QuickJS de PrismHub. La clase las llama directo.
// `typeof X === 'function'` es seguro aunque X no esté declarada (no lanza).
function makeClassWrapper() {
  return `
export default class extends Extension {
  async latest(page) { return latest(page); }
  async search(kw, page, filter) { return search(kw, page, filter); }
  async createFilter(filter) { return (typeof createFilter === 'function') ? createFilter(filter) : {}; }

  // Adapta el detail de Prism+ al de PrismHub: episodios planos [{title,url}] ->
  // grupos [{title, urls:[{name,url}]}], y description -> desc.
  async detail(url) {
    var d = await detail(url);
    if (!d || typeof d !== 'object') return d;
    var eps = Array.isArray(d.episodes) ? d.episodes : [];
    var grouped;
    if (eps.length && eps[0] && Array.isArray(eps[0].urls)) {
      grouped = eps.map(function (g) {
        return {
          title: g.title || 'Episodios',
          urls: (Array.isArray(g.urls) ? g.urls : []).filter(function (e) {
            return e && e.url;
          }).map(function (e) {
            return { name: e.name || e.title || e.url, url: e.url };
          })
        };
      });
    } else {
      grouped = [{
        title: 'Episodios',
        urls: eps.filter(function (e) { return e && e.url; }).map(function (e) {
          return { name: e.title || e.name || e.url, url: e.url };
        })
      }];
    }
    return {
      title: d.title || '',
      cover: d.cover,
      desc: d.desc || d.description || '',
      episodes: grouped,
      headers: d.headers
    };
  }
  async checkUpdate(url) { return (typeof checkUpdate === 'function') ? checkUpdate(url) : {}; }

  // Adapta el formato de Prism+ ({streams:[{url,quality,headers}]}) al contrato
  // de watch de PrismHub ({type,url,headers} + X-Servers para el selector de
  // servidores). Si llega una URL ya resuelta (cambio de servidor), se devuelve.
  async watch(url) {
    if (typeof url === 'string' && url.indexOf('http') === 0 &&
        (url.indexOf('.m3u8') !== -1 || url.indexOf('.mp4') !== -1)) {
      return { type: url.indexOf('.mp4') !== -1 ? 'mp4' : 'hls', url: url, headers: {} };
    }
    var r = await watch(url);
    if (!r || !Array.isArray(r.streams)) return r;
    var streams = r.streams.filter(function (s) { return s && s.url; });
    if (streams.length === 0) {
      return { type: 'hls', url: 'error://Sin servidores disponibles', headers: {} };
    }
    var servers = {}, referers = {};
    for (var i = 0; i < streams.length; i++) {
      var s = streams[i];
      var nm = s.quality || s.server || ('Servidor ' + (i + 1));
      servers[nm] = s.url;
      if (s.headers && s.headers.Referer) referers[nm] = s.headers.Referer;
    }
    var p = streams[0];
    return {
      type: p.url.indexOf('.mp4') !== -1 ? 'mp4' : 'hls',
      url: p.url,
      subtitles: r.subtitles || [],
      headers: Object.assign({}, p.headers || {}, {
        'X-Servers': JSON.stringify(servers),
        'X-Primary-Server': p.quality || p.server || 'Servidor 1',
        'X-Server-Referers': JSON.stringify(referers)
      })
    };
  }
}
`;
}

// ─── Build ────────────────────────────────────────────────────────────────────

if (!existsSync(DIST_DIR)) mkdirSync(DIST_DIR, { recursive: true });

const entries = readdirSync(EXT_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

if (entries.length === 0) {
  console.error('No se encontraron extensiones en extensions/');
  process.exit(1);
}

// ─── Prune: borrar bundles huérfanos en dist/ ─────────────────────────────────
// Si una extensión se elimina, su dist/<name>.js queda obsoleto y rompe los
// smoke tests (manifest no encontrado). Lo limpiamos automáticamente para que
// dist/ siempre refleje exactamente las extensiones presentes.

const vendoredNames = existsSync(VENDOR_DIR)
  ? readdirSync(VENDOR_DIR).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, ''))
  : [];
const validNames = new Set([...entries, ...vendoredNames]);
let pruned = 0;
for (const file of readdirSync(DIST_DIR).filter(f => f.endsWith('.js'))) {
  if (!validNames.has(file.replace(/\.js$/, ''))) {
    rmSync(join(DIST_DIR, file));
    console.log(`  🗑  ${file} — bundle huérfano eliminado`);
    pruned++;
  }
}
if (pruned > 0) console.log('');

console.log(`🔨  Compilando ${entries.length} extensión(es)...\n`);

const builtManifests = [];
const errors = [];

for (const name of entries) {
  const entryFile    = join(EXT_DIR, name, 'index.ts');
  const manifestFile = join(EXT_DIR, name, 'manifest.json');
  const outFile      = join(DIST_DIR, `${name}.js`);

  if (!existsSync(entryFile)) {
    console.warn(`  ⚠  ${name} — falta index.ts, omitido`);
    continue;
  }
  if (!existsSync(manifestFile)) {
    console.warn(`  ⚠  ${name} — falta manifest.json, omitido`);
    continue;
  }

  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  const globalName = manifest.package.replace(/[^a-zA-Z0-9_$]/g, '_');

  try {
    const result = await build({
      entryPoints: [entryFile],
      bundle: true,
      // ESM (no IIFE): el wrapping CommonJS de esbuild (__toCommonJS/__export)
      // rompía el QuickJS (viejo) de PrismHub. Con ESM quedan funciones
      // top-level; quitamos el `export` y PrismHub lo evalúa como script.
      format: 'esm',
      platform: 'neutral',
      // es2017 transpila optional chaining (?.) y nullish (??) que ese QuickJS
      // no parsea, manteniendo async/await.
      target: 'es2017',
      minify: false,
      write: false,
    });

    let body = result.outputFiles[0].text;
    // Quitar la sentencia `export { ... };` final (PrismHub no es módulo).
    body = body.replace(/\n?export\s*\{[\s\S]*?\};?\s*$/m, '\n');
    const finalJs = makeHeader(manifest) + body + makeClassWrapper();
    writeFileSync(outFile, finalJs, 'utf8');

    builtManifests.push({
      ...manifest,
      type: mapType(manifest.type),
      script: rawUrl(name),
    });
    console.log(`  ✓  ${name}.js  (${manifest.name}  v${manifest.version})`);
  } catch (err) {
    errors.push(name);
    console.error(`  ✗  ${name} — error de compilación:`, err.message);
  }
}

// ─── Vendored: extensiones ya pre-construidas (formato PrismHub) ───────────────
// Extensiones de terceros/comunidad ya en formato `==PrismHubExtension==` +
// `export default class extends Extension`. No pasan por el build TS: se copian
// tal cual a dist/ y se añaden al catálogo. Prism+ es la única fuente.

function parseHeaderMeta(js) {
  const meta = {};
  for (const line of js.split('\n').slice(0, 30)) {
    const m = /^\/\/\s*@(\w+)\s+(.*)$/.exec(line.trim());
    if (m) meta[m[1]] = m[2].trim();
  }
  return meta;
}

const nativePackages = new Set(builtManifests.map(m => m.package));

if (existsSync(VENDOR_DIR)) {
  const vendored = readdirSync(VENDOR_DIR).filter(f => f.endsWith('.js')).sort();
  let vok = 0;
  for (const file of vendored) {
    const js = readFileSync(join(VENDOR_DIR, file), 'utf8');
    const m = parseHeaderMeta(js);
    if (!m.package || !js.includes('export default class')) {
      console.warn(`  ⚠  vendored/${file} — sin formato válido, omitido`);
      continue;
    }
    // Dedup: nunca pisar una extensión nativa de prism+.
    if (nativePackages.has(m.package)) {
      console.warn(`  ⚠  vendored/${file} — duplica nativa ${m.package}, omitido`);
      continue;
    }
    nativePackages.add(m.package);
    copyFileSync(join(VENDOR_DIR, file), join(DIST_DIR, file));
    builtManifests.push({
      name: m.name ?? file.replace(/\.js$/, ''),
      package: m.package,
      version: (m.version ?? '1.0.0').replace(/^v/, ''),
      author: m.author ?? 'community',
      lang: m.lang ?? 'all',
      license: m.license ?? 'MIT',
      icon: m.icon ?? '',
      type: mapType(m.type),
      webSite: m.webSite ?? '',
      description: m.description ?? m.name ?? '',
      nsfw: m.nsfw === 'true',
      script: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/dist/${file}`,
    });
    vok++;
  }
  console.log(`\n📦  Vendored: ${vok} extensión(es) de la comunidad añadidas`);
}

// ─── Generar index.json ───────────────────────────────────────────────────────

const index = {
  name: 'Prism+',
  protocolVersion: '1',
  description: 'Repositorio oficial de extensiones para PrismHub y plataformas compatibles',
  version: '1.0.0',
  website: `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
  extensions: builtManifests,
};

writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n', 'utf8');

const ok = builtManifests.length;
const fail = errors.length;
if (fail > 0) {
  console.error(`\n⚠  index.json generado — ${ok} OK, ${fail} fallaron: ${errors.join(', ')}\n`);
  process.exit(1);
} else {
  console.log(`\n✅  index.json generado — ${ok} extensión(es)\n`);
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function rawUrl(name) {
  return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/dist/${name}.js`;
}

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

import { build, transform } from 'esbuild';
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
import { createPrivateKey, sign, createHash } from 'crypto';

// ─── Configuración ────────────────────────────────────────────────────────────

const ROOT       = fileURLToPath(new URL('..', import.meta.url));
const EXT_DIR    = join(ROOT, 'extensions');
const DIST_DIR   = join(ROOT, 'dist');
const VENDOR_DIR = join(ROOT, 'vendored');
const DISABLED_DIR = join(ROOT, 'disabled-extensions');
const INDEX_PATH = join(ROOT, 'index.json');
const PRIV_KEY_PATH = join(ROOT, '.keys', 'private.pem');

// ─── Firma de extensiones (Ed25519) ───────────────────────────────────────────
// Si existe la llave privada, cada bundle se firma. prism_hub verifica la firma
// con la llave pública embebida y rechaza cualquier extensión no firmada/alterada.
let signingKey = null;
if (existsSync(PRIV_KEY_PATH)) {
  try {
    signingKey = createPrivateKey(readFileSync(PRIV_KEY_PATH));
  } catch (e) {
    console.warn(`⚠  No se pudo leer .keys/private.pem: ${e.message}`);
  }
}

/** Devuelve { sha256, signature } del JS. signature=null si no hay llave. */
function signJs(js) {
  const sha256 = createHash('sha256').update(js, 'utf8').digest('hex');
  if (!signingKey) return { sha256, signature: null };
  const signature = sign(null, Buffer.from(js, 'utf8'), signingKey).toString('base64');
  return { sha256, signature };
}

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
  // mixed: extensión con manga Y anime reales en un mismo sitio (ej.
  // ShadeManga) — a diferencia de los demás casos, pasa literal en vez de
  // mapear a un tipo fijo. PrismHub decide lector-vs-reproductor por título
  // (ExtensionDetail.type), no por el tipo de la extensión — ver
  // ExtensionUtils.resolveType() del lado de la app.
  if (s === 'mixed') return 'mixed';
  // mixedReading: mismo criterio que mixed —pasa literal y el lector se decide
  // por titulo— pero para sitios que solo tienen lectura. Se compara en
  // minusculas porque mapType normaliza la entrada.
  if (s === 'mixedreading') return 'mixedReading';
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
    ...(m.icon ? [`// @icon         ${m.icon}`] : []),
    `// @package      ${m.package}`,
    `// @type         ${mapType(m.type)}`,
    // BUG encontrado en vivo: esta cabecera es lo único que
    // ExtensionUtils.parseExtension() lee para construir el Extension en
    // runtime del lado de la app — nsfw nunca se incluía acá (solo vivía en
    // manifest.json / index.json, que la app NUNCA ve para una extensión ya
    // instalada). Resultado: Extension.nsfw daba SIEMPRE false una vez
    // instalada, aunque el catálogo remoto mostrara el badge "18+"
    // correctamente — rompía por completo la Zona +18 (nunca preguntaba
    // nada, nunca separaba nada) para toda extensión ya instalada.
    `// @nsfw         ${m.nsfw === 'true' ? 'true' : 'false'}`,
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
// OJO: nunca usar url.indexOf('.mp4')/('.m3u8') suelto — algunos dominios de
// hosts (ej. "mp4upload.com") contienen esa subcadena en el propio nombre
// aunque la URL sea una página de embed, no un archivo directo (confirmado
// en vivo: rompía mp4upload por completo, ni siquiera llegaba a llamar
// watch() de la extensión). Exigir que la extensión esté al FINAL del path
// (antes de ?query o #fragment).
// Segundo caso confirmado en vivo (animeytx, host burstcloud.co): la
// extensión SÍ está al final del path ("/embed/<hash>/Nombre.mp4") pero es
// la página embed (HTML, jwplayer), no el archivo — el nombre real del
// archivo subido se refleja en la URL de la página. Un "/embed/" real no
// necesita servir el archivo así, así que cualquier URL con ese segmento se
// trata como página, no como media directa, dejando que la extensión (que
// sí sabe resolverla) se ocupe.
// Tercer caso confirmado en vivo (animejara, host streamtape.com): el mismo
// truco pero sin "/embed/" — streamtape sirve sus páginas como
// "/e/{id}/{nombre-original}.mp4" (content-type: text/html real, confirmado
// con curl). Cualquier host de esta lista (todos con resolver propio en el
// SDK, ver Fast-path 2 más abajo) NUNCA cuenta como media directa, sin
// importar cómo termine la URL — si sabemos resolverlo, que lo resuelva el
// SDK en vez de asumir que la extensión final "por casualidad" ya es el
// archivo real.
var _KNOWN_EMBED_HOSTS = {
  yourupload: 'YourUpload', yupload: 'YourUpload',
  'voe.sx': 'Voe', 'voe.': 'Voe',
  'hqq.': 'Netu', 'netu.': 'Netu',
  streamtape: 'Streamtape', stape: 'Streamtape',
  mixdrop: 'Mixdrop', mxdrop: 'Mixdrop',
  mp4upload: 'Mp4Upload',
  // La clave lleva "/file" a propósito: el enlace YA resuelto vive en
  // download####.mediafire.com y también contiene "mediafire", así que una
  // clave suelta lo haría pasar por página de embed y volvería a resolverse.
  'mediafire.com/file': 'Mediafire',
  doodstream: 'Doodstream', ds2play: 'Doodstream', ds2video: 'Doodstream',
  // dsvplay/playmogo faltaban acá: son la misma red de Doodstream (dsvplay
  // redirige a playmogo), y sin la clave el fast-path no los reconocía como
  // embed y nunca llegaban al resolver que sí sabe resolverlos.
  dsvplay: 'Doodstream', playmogo: 'Doodstream',
  hexload: 'Hexload',
  savefiles: 'Savefiles', streamhls: 'Savefiles',
  bysekoze: 'Byse',
  streamwish: 'Streamwish', wishfast: 'Streamwish',
  vidhide: 'Streamwish', filelions: 'Streamwish',
  filemoon: 'Filemoon', moonplayer: 'Filemoon',
  luluvdo: 'Luluvdo', bysekoze: 'Bysekoze',
  pixeldrain: 'Pixeldrain',
  sendvid: 'Sendvid', uqload: 'Uqload',
  upstream: 'Upstream',
};
// Solo la RUTA, sin lo que venga despues de ? o #.
//
// Mirar la direccion entera daba falsos positivos que terminaban en "Error de
// reproduccion": hay servidores que son una pagina normal y llevan el video de
// verdad DENTRO de un parametro, por ejemplo
//   https://un-blog.blogspot.com/?player=fluidplayer&link=https%3A%2F%2F...%2Fpeli.mp4
// Eso termina en ".mp4", asi que se daba por buena la pagina y se le mandaba al
// reproductor un HTML en vez de un video. Con la ruta sola, esa direccion ya no
// pasa por directa y sigue su camino normal hasta resolverse.
function _rutaDe(u) {
  var sinAncla = u.split('#')[0];
  return sinAncla.split('?')[0];
}
function _isDirectMediaUrl(u) {
  if (typeof u !== 'string') return false;
  if (/\\/embed\\//i.test(u)) return false;
  var lower = u.toLowerCase();
  for (var _k in _KNOWN_EMBED_HOSTS) {
    if (lower.indexOf(_k) !== -1) return false;
  }
  return /\\.(mp4|m3u8|mkv|webm)$/i.test(_rutaDe(u));
}
function _mediaType(u) {
  return /\\.mp4$/i.test(_rutaDe(u)) ? 'mp4' : 'hls';
}

export default class extends Extension {
  async latest(page) { return latest(page); }
  async search(kw, page, filter) { return search(kw, page, filter); }
  async createFilter(filter) { return (typeof createFilter === 'function') ? createFilter(filter) : {}; }
  async top(filter, page) { return (typeof top === 'function') ? top(filter, page) : []; }
  async createTopFilter() { return (typeof createTopFilter === 'function') ? createTopFilter() : {}; }

  // Adapta el detail de Prism+ al de PrismHub: episodios planos [{title,url}] ->
  // grupos [{title, urls:[{name,url}]}], y description -> desc.
  async detail(url) {
    var d = await detail(url);
    if (!d || typeof d !== 'object') return d;
    var eps = Array.isArray(d.episodes) ? d.episodes : [];
    var grouped;
    // Temporadas: el SDK las expone como d.seasons ([{title, episodes:[]}]),
    // y PrismHub ya sabe mostrar varios grupos (el selector "Episodios" del
    // detalle) — pero este adaptador las IGNORABA por completo, así que una
    // serie con temporadas separadas llegaba aplastada en un solo grupo
    // "Episodios" (confirmado con FuegoCine, que ya las armaba bien desde
    // hace rato). Si vienen temporadas, cada una es un grupo.
    var seasons = Array.isArray(d.seasons) ? d.seasons : [];
    if (seasons.length) {
      grouped = seasons.filter(function (s) {
        return s && Array.isArray(s.episodes) && s.episodes.length;
      }).map(function (s, i) {
        return {
          title: s.title || ('Temporada ' + (i + 1)),
          urls: s.episodes.filter(function (e) {
            return e && e.url;
          }).map(function (e) {
            return { name: e.title || e.name || e.url, url: e.url };
          })
        };
      });
    }
    // Si no hubo temporadas utilizables, seguir con el camino de siempre.
    if (grouped && !grouped.length) grouped = undefined;
    if (grouped) {
      // ya resuelto arriba
    } else if (eps.length && eps[0] && Array.isArray(eps[0].urls)) {
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
    // Object.assign(d, ...) primero — antes este wrapper reconstruía el
    // objeto a mano con solo estos 5 campos, así que TODO lo demás que la
    // extensión devuelve (genres, rating, status, extra y sobre todo type,
    // crítico para una extensión "mixed" como ShadeManga) se perdía en
    // silencio. Confirmado en vivo: un manga de ShadeManga abría el
    // reproductor de video en vez del lector porque type nunca llegaba a
    // PrismHub, cayendo al default de ExtensionUtils.resolveType.
    return Object.assign({}, d, {
      title: d.title || '',
      cover: d.cover,
      desc: d.desc || d.description || '',
      episodes: grouped,
      headers: d.headers
    });
  }
  async checkUpdate(url) { return (typeof checkUpdate === 'function') ? checkUpdate(url) : {}; }

  // Adapta el formato de Prism+ ({streams:[{url,quality,headers}]}) al contrato
  // de watch de PrismHub ({type,url,headers} + X-Servers para el selector de
  // servidores). Maneja 3 casos:
  //   1. URL directa (.m3u8/.mp4) → fast-path, devolver inmediatamente.
  //   2. URL de embed externo conocido (voe.sx, yourupload.com, netu, etc.) →
  //      resolveEmbed on-demand. Aplica a TODAS las extensiones.
  //   3. URL de episodio normal → llamar watch() de la extensión.
  async watch(url) {
    // Fast-path 1: URL ya resuelta (stream directo .m3u8 o .mp4).
    // El wrapper del build script la devuelve sin llamar a la extensión.
    if (typeof url === 'string' && url.indexOf('http') === 0 &&
        _isDirectMediaUrl(url)) {
      return { type: _mediaType(url), url: url, headers: {} };
    }

    // Fast-path 2: embed URL de host conocido — resolver on-demand con el SDK.
    // PrismHub llama runtime.watch(embedUrl) desde switchServer() cuando el usuario
    // elige un servidor cuya URL no es un stream directo. Aplica a todas las
    // extensiones que bundleen el SDK (resolveEmbed disponible como global).
    if (typeof url === 'string' && url.indexOf('http') === 0 &&
        typeof resolveEmbed === 'function') {
      var _lurl = url.toLowerCase();
      var _sname = null;
      for (var _k in _KNOWN_EMBED_HOSTS) {
        if (_lurl.indexOf(_k) !== -1) { _sname = _KNOWN_EMBED_HOSTS[_k]; break; }
      }
      if (_sname) {
        try {
          var _res = await resolveEmbed(_sname, url, '');
          if (_res && _res.url) {
            return {
              type: _mediaType(_res.url),
              url: _res.url,
              headers: _res.headers || {}
            };
          }
        } catch (_e) { /* resolveEmbed falló — continuar con la extensión */ }
      }
    }

    var r = await watch(url);
    if (!r || !Array.isArray(r.streams)) return r;
    var streams = r.streams.filter(function (s) { return s && s.url; });
    var pageUrl = r.pageUrl || '';
    if (streams.length === 0) {
      if (pageUrl) {
        return { type: 'hls', url: 'page://' + pageUrl,
          headers: { 'X-Page-Url': pageUrl } };
      }
      return { type: 'hls', url: 'error://Sin servidores disponibles', headers: {} };
    }
    var servers = {}, referers = {}, nativos = {}, hayNativos = false;
    for (var i = 0; i < streams.length; i++) {
      var s = streams[i];
      var nm = s.quality || s.server || ('Servidor ' + (i + 1));
      servers[nm] = s.url;
      if (s.headers && s.headers.Referer) referers[nm] = s.headers.Referer;
      // El rayo/mundo de la tira de servidores, cuando la extension lo sabe.
      // Solo viaja lo que la extension declara: si no dice nada, la app sigue
      // decidiendolo como venia haciendolo.
      if (typeof s.nativo === 'boolean') { nativos[nm] = s.nativo; hayNativos = true; }
    }
    var p = streams[0];
    var extra = {
      'X-Servers': JSON.stringify(servers),
      'X-Primary-Server': p.quality || p.server || 'Servidor 1',
      'X-Server-Referers': JSON.stringify(referers)
    };
    if (hayNativos) extra['X-Server-Native'] = JSON.stringify(nativos);
    if (pageUrl) extra['X-Page-Url'] = pageUrl;
    return {
      type: _mediaType(p.url),
      url: p.url,
      subtitles: r.subtitles || [],
      headers: Object.assign({}, p.headers || {}, extra)
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

    const { sha256, signature } = signJs(finalJs);
    builtManifests.push({
      ...manifest,
      type: mapType(manifest.type),
      script: rawUrl(name),
      sha256,
      signature,
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

// Transpila una vendored a es2017 (igual que las nativas): el QuickJS viejo de
// PrismHub NO parsea optional chaining (?.) ni nullish (??) — sin esto, ~50 de
// las 151 vendored fallaban al instalar con un error de sintaxis. Se preserva el
// header y el contrato `export default class extends Extension` que PrismHub
// transforma en runtime (esbuild renombra la clase y mueve el `export {…as
// default}` al final; lo revertimos para que el parser de PrismHub lo reconozca).
async function transpileVendored(src) {
  // Quitar BOM inicial: algunos QuickJS lo tratan como token inválido.
  src = src.replace(/^﻿/, '');
  const lines = src.split('\n');
  let i = 0;
  const header = [];
  while (i < lines.length &&
      (lines[i].trim().startsWith('//') || lines[i].trim() === '')) {
    header.push(lines[i]);
    i++;
  }
  const body = lines.slice(i).join('\n');
  const r = await transform(body, {
    loader: 'js',
    target: 'es2017',
    format: 'esm',
  });
  let code = r.code;
  // Quitar el bloque `export { X as default };` (multilínea) que añade esbuild.
  code = code.replace(/export\s*\{[\s\S]*?as\s+default[\s\S]*?\}\s*;?/, '');
  // Restaurar `export default class … extends Extension` sobre la clase top-level.
  code = code.replace(
    /\bclass\s+\w+(\s+extends\s+Extension\b)/,
    'export default class$1',
  );
  return `${header.join('\n')}\n${code.trim()}\n`;
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
    // Transpilar a es2017 (no copiar crudo) para que el QuickJS de PrismHub
    // pueda parsearlas. Si el transpilado fallara, se cae al copiado literal.
    try {
      writeFileSync(join(DIST_DIR, file), await transpileVendored(js), 'utf8');
    } catch (e) {
      console.warn(`  ⚠  vendored/${file} — transpilado falló (${e.message}), copiada cruda`);
      copyFileSync(join(VENDOR_DIR, file), join(DIST_DIR, file));
    }
    const { sha256: vsha, signature: vsig } =
        signJs(readFileSync(join(DIST_DIR, file), 'utf8'));
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
      sha256: vsha,
      signature: vsig,
    });
    vok++;
  }
  console.log(`\n📦  Vendored: ${vok} extensión(es) de la comunidad añadidas`);
}

// ─── Extensiones deshabilitadas: entradas "solo metadata" ─────────────────────
// Una extensión movida a disabled-extensions/ (código roto sin arreglar
// todavía, ej. LaMovie — freeze de GPU en Windows) sigue apareciendo en el
// catálogo para que el usuario sepa que existe, pero SIN bundle funcional:
// no se compila su index.ts ni se genera dist/<name>.js. Solo se leen los
// campos del manifest y se agrega `unstable: true`. PrismHub usa ese flag
// para bloquear instalarla de nuevo (ExtensionCard) y para forzar
// "actualización requerida" si alguien ya la tenía instalada
// (ExtensionUtils.hasExtensionUpdate) — sin necesitar un script real, porque
// ese flujo nunca llega a pedir/ejecutar el .js.
if (existsSync(DISABLED_DIR)) {
  const disabledNames = readdirSync(DISABLED_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();
  let dcount = 0;
  for (const name of disabledNames) {
    const manifestFile = join(DISABLED_DIR, name, 'manifest.json');
    if (!existsSync(manifestFile)) continue;
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    // Nunca pisar una extensión nativa activa con el mismo package.
    if (builtManifests.some(m => m.package === manifest.package)) {
      console.warn(`  ⚠  disabled-extensions/${name} — duplica una nativa activa, omitido`);
      continue;
    }
    builtManifests.push({
      ...manifest,
      type: mapType(manifest.type),
      unstable: true,
    });
    dcount++;
  }
  if (dcount > 0) {
    console.log(`⛔  Inestables: ${dcount} extensión(es) listada(s) sin instalador (disabled-extensions/)`);
  }
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

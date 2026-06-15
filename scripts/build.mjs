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
  existsSync,
  mkdirSync,
} from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// ─── Configuración ────────────────────────────────────────────────────────────

const ROOT       = fileURLToPath(new URL('..', import.meta.url));
const EXT_DIR    = join(ROOT, 'extensions');
const DIST_DIR   = join(ROOT, 'dist');
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

console.log(`\n🔨  Compilando ${entries.length} extensión(es)...\n`);

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
    await build({
      entryPoints: [entryFile],
      bundle: true,
      format: 'iife',
      outfile: outFile,
      platform: 'neutral',
      target: 'es2020',
      minify: false,
      globalName,
      footer: { js: makeSanitizeFooter(globalName) },
    });

    builtManifests.push({ ...manifest, script: rawUrl(name) });
    console.log(`  ✓  ${name}.js  (${manifest.name}  v${manifest.version})`);
  } catch (err) {
    errors.push(name);
    console.error(`  ✗  ${name} — error de compilación:`, err.message);
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

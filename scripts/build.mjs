// ─── Prism+ Build Script ──────────────────────────────────────────────────────
// Compila todas las extensiones con esbuild (IIFE, bundle completo) y
// genera el index.json del repositorio con las URLs raw de GitHub.
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

/** Cambia esto si forkeas el repo */
const REPO_OWNER = 'Litdemonick';
const REPO_NAME  = 'prism-plus';
const BRANCH     = 'main';

// ─── Build ────────────────────────────────────────────────────────────────────

if (!existsSync(DIST_DIR)) mkdirSync(DIST_DIR, { recursive: true });

const entries = readdirSync(EXT_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

if (entries.length === 0) {
  console.error('No se encontraron extensiones en extensions/');
  process.exit(1);
}

console.log(`\n🔨  Compilando ${entries.length} extensión(es)...\n`);

const builtManifests = [];

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

  await build({
    entryPoints: [entryFile],
    bundle: true,         // Inlinea SDK y dependencias
    format: 'iife',       // Compatible con QuickJS (sin import/export)
    outfile: outFile,
    platform: 'neutral',  // Sin globals de Node ni de browser
    target: 'es2020',
    minify: false,        // Legible para debugging; cambia a true en producción
    // Nombra el IIFE con el package para evitar colisiones si se concatenan
    globalName: manifest.package.replace(/[^a-zA-Z0-9_$]/g, '_'),
  });

  builtManifests.push({
    ...manifest,
    script: rawUrl(name),
  });

  console.log(`  ✓  ${name}.js  (${manifest.name}  v${manifest.version})`);
}

// ─── Generar index.json ───────────────────────────────────────────────────────

const index = {
  name: 'Prism+',
  description: 'Repositorio oficial de extensiones para PrismHub',
  version: '1.0.0',
  extensions: builtManifests,
};

writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n', 'utf8');
console.log(`\n✅  index.json generado — ${builtManifests.length} extensión(es)\n`);

// ─── Helper ───────────────────────────────────────────────────────────────────

function rawUrl(name) {
  return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/dist/${name}.js`;
}

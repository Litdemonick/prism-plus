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

  try {
    await build({
      entryPoints: [entryFile],
      bundle: true,
      format: 'iife',
      outfile: outFile,
      platform: 'neutral',
      target: 'es2020',
      minify: false,
      globalName: manifest.package.replace(/[^a-zA-Z0-9_$]/g, '_'),
    });

    builtManifests.push({
      ...manifest,
      script: rawUrl(name),
    });

    console.log(`  ✓  ${name}.js  (${manifest.name}  v${manifest.version})`);
  } catch (err) {
    errors.push(name);
    console.error(`  ✗  ${name} — error de compilación:`, err.message);
  }
}

// ─── Generar index.json ───────────────────────────────────────────────────────

const index = {
  name: 'Prism+',
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

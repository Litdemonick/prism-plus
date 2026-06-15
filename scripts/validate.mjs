// ─── Prism+ Validate Script ──────────────────────────────────────────────────
// Verifica que cada extensión tenga la estructura correcta ANTES de compilar.
// Corre en CI y localmente con: npm run validate
// ---------------------------------------------------------------------------

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const ROOT    = fileURLToPath(new URL('..', import.meta.url));
const EXT_DIR = join(ROOT, 'extensions');

const REQUIRED_MANIFEST = ['name', 'package', 'version', 'author', 'type', 'description'];
const VALID_TYPES = [
  'anime', 'manga', 'novel', 'movie', 'series',
  'documentary', 'live', 'video', 'music', 'podcast', 'other',
];
const REQUIRED_EXPORTS = ['latest', 'search', 'detail', 'watch'];

// ─── Scan ────────────────────────────────────────────────────────────────────

const entries = readdirSync(EXT_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

if (entries.length === 0) {
  console.error('❌  No se encontraron extensiones en extensions/');
  process.exit(1);
}

console.log(`\n🔍  Validando ${entries.length} extensión(es)...\n`);

let totalErrors = 0;

for (const name of entries) {
  const dir          = join(EXT_DIR, name);
  const manifestPath = join(dir, 'manifest.json');
  const indexPath    = join(dir, 'index.ts');
  const issues       = [];

  // ── manifest.json ─────────────────────────────────────────────────────────
  if (!existsSync(manifestPath)) {
    issues.push('falta manifest.json');
  } else {
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch {
      issues.push('manifest.json: JSON inválido');
      manifest = null;
    }

    if (manifest) {
      // Campos obligatorios
      for (const field of REQUIRED_MANIFEST) {
        if (!manifest[field]) issues.push(`manifest: campo '${field}' vacío o ausente`);
      }

      // Tipo válido
      if (manifest.type && !VALID_TYPES.includes(manifest.type)) {
        issues.push(
          `manifest: tipo '${manifest.type}' no válido — usa uno de: ${VALID_TYPES.join(', ')}`,
        );
      }

      // Formato de package
      if (manifest.package && !manifest.package.startsWith('io.prismhub.')) {
        issues.push(`manifest: 'package' debe empezar con 'io.prismhub.'`);
      }

      // Versión semver básica
      if (manifest.version && !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
        issues.push(`manifest: 'version' debe ser semver (ej: 1.0.0), recibido '${manifest.version}'`);
      }
    }
  }

  // ── index.ts ──────────────────────────────────────────────────────────────
  if (!existsSync(indexPath)) {
    issues.push('falta index.ts');
  } else {
    const src = readFileSync(indexPath, 'utf8');

    // Las 4 funciones obligatorias
    for (const fn of REQUIRED_EXPORTS) {
      if (!src.includes(`export async function ${fn}(`)) {
        issues.push(`index.ts: falta 'export async function ${fn}('`);
      }
    }

    // No debe importar módulos de Node.js
    const nodeImports = ["from 'fs'", "from 'path'", "from 'crypto'", "from 'http'", "from 'https'"];
    for (const imp of nodeImports) {
      if (src.includes(imp)) {
        issues.push(`index.ts: importa módulo de Node.js '${imp}' — no disponible en QuickJS`);
      }
    }

    // No debe usar window o document
    if (/\bwindow\b|\bdocument\b/.test(src)) {
      issues.push(`index.ts: usa 'window' o 'document' — no disponible en QuickJS`);
    }
  }

  // ── Resultado ─────────────────────────────────────────────────────────────
  if (issues.length > 0) {
    console.error(`  ✗  ${name}`);
    for (const issue of issues) console.error(`       ↳ ${issue}`);
    totalErrors += issues.length;
  } else {
    console.log(`  ✓  ${name}`);
  }
}

// ─── Resumen ─────────────────────────────────────────────────────────────────

if (totalErrors > 0) {
  console.error(`\n❌  ${totalErrors} problema(s) encontrado(s) — corrige antes de compilar\n`);
  process.exit(1);
} else {
  console.log(`\n✅  Todas las extensiones son válidas\n`);
}

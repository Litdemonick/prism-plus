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
  // Extensión con manga Y anime reales en un mismo sitio (ej. ShadeManga) —
  // PrismHub decide lector-vs-reproductor por título (ExtensionDetail.type),
  // no por el tipo fijo de la extensión. Ver mapType() en build.mjs.
  'mixed',
  // Varias clases de LECTURA en un mismo sitio y ningun video (ej. Ikigai:
  // comics y novelas ligeras). Igual que 'mixed', PrismHub decide el lector
  // por titulo (ExtensionDetail.type); a diferencia de 'mixed', NO aparece en
  // los filtros de video del app. Ver mapType() en build.mjs.
  'mixedReading',
];
const REQUIRED_EXPORTS = ['latest', 'search', 'detail', 'watch'];
// Qué clase de vídeo trae una extensión — ver el comentario largo en
// makeHeader() de build.mjs. Opcional: sin declararlo, la extensión sigue
// funcionando igual, solo queda "sin clasificar" en las zonas nuevas de la
// app (Anime/Series/Películas).
const VALID_CONTENT_KINDS = ['anime', 'accion-real', 'mixto'];

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

      // contentKind válido
      if (manifest.contentKind && !VALID_CONTENT_KINDS.includes(manifest.contentKind)) {
        issues.push(
          `manifest: contentKind '${manifest.contentKind}' no válido — usa uno de: ${VALID_CONTENT_KINDS.join(', ')}`,
        );
      }
      // Nunca junto con nsfw:true — una extensión +18 de punta a punta no
      // tiene que entrar a ninguna zona normal, jamás. build.mjs ya no lo
      // emitiría igual (ver makeHeader()), pero fallar acá avisa ANTES de
      // compilar, en vez de que el descarte pase desapercibido.
      if (manifest.contentKind && manifest.nsfw === 'true') {
        issues.push(
          `manifest: contentKind no puede declararse junto con nsfw:true (esta extensión no debe entrar a ninguna zona normal)`,
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

    // No debe usar window o document (solo acceso real a propiedades, no palabras en regex/strings)
    if (/\bwindow\s*[\.\[]|\bdocument\s*[\.\[]/.test(src)) {
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

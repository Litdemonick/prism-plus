// ─── Prism+ Smoke Tests ───────────────────────────────────────────────────────
// Verifica que cada bundle compilado tenga la estructura correcta.
// No hace requests HTTP reales — solo prueba la forma del bundle.
// Corre con: npm test
// ---------------------------------------------------------------------------

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join }                                  from 'path';
import { fileURLToPath }                         from 'url';
import { createRequire }                         from 'module';
import { runInNewContext }                       from 'vm';

const ROOT     = fileURLToPath(new URL('..', import.meta.url));
const DIST_DIR = join(ROOT, 'dist');
const EXT_DIR  = join(ROOT, 'extensions');

const REQUIRED_FNS = ['latest', 'search', 'detail', 'watch'];

// ─── Verificar que dist/ existe ───────────────────────────────────────────────

if (!existsSync(DIST_DIR)) {
  console.error('\n❌  dist/ no existe — ejecuta npm run build primero\n');
  process.exit(1);
}

const bundles = readdirSync(DIST_DIR).filter(f => f.endsWith('.js')).sort();
if (bundles.length === 0) {
  console.error('\n❌  No se encontraron bundles en dist/\n');
  process.exit(1);
}

console.log(`\n🧪  Smoke tests — ${bundles.length} bundle(s)\n`);

let passed = 0;
let failed = 0;

for (const file of bundles) {
  const name       = file.replace('.js', '');
  const bundlePath = join(DIST_DIR, file);
  const issues     = [];

  // ── Cargar manifest para obtener el package id ────────────────────────────
  const manifestPath = join(EXT_DIR, name, 'manifest.json');
  if (!existsSync(manifestPath)) {
    issues.push('manifest.json no encontrado — ¿la extensión fue eliminada?');
    report(name, issues);
    continue;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    issues.push('manifest.json: JSON inválido');
    report(name, issues);
    continue;
  }

  const globalName = manifest.package.replace(/[^a-zA-Z0-9_$]/g, '_');

  // ── Ejecutar el IIFE en un contexto aislado ───────────────────────────────
  const code    = readFileSync(bundlePath, 'utf8');
  const sandbox = {
    // Stub mínimo de fetch — nunca se llama en estos tests
    fetch: () => Promise.reject(new Error('fetch disabled in tests')),
    setTimeout: (fn, ms) => { /* no-op */ },
    clearTimeout: () => {},
    console,
  };

  try {
    runInNewContext(code, sandbox);
  } catch (err) {
    issues.push(`Error al evaluar el bundle: ${err.message}`);
    report(name, issues);
    continue;
  }

  // ── Verificar que el global existe ───────────────────────────────────────
  const ext = sandbox[globalName];
  if (!ext || typeof ext !== 'object') {
    issues.push(`Global '${globalName}' no encontrado en el bundle`);
    report(name, issues);
    continue;
  }

  // ── Verificar las 4 funciones exportadas ─────────────────────────────────
  for (const fn of REQUIRED_FNS) {
    if (typeof ext[fn] !== 'function') {
      issues.push(`'${fn}' no es una función (tipo: ${typeof ext[fn]})`);
    } else {
      // Verificar que devuelve una Promise (es async)
      const result = ext[fn].__proto__?.constructor?.name;
      // Una función async tiene un constructor llamado AsyncFunction
      const isAsync = ext[fn].constructor?.name === 'AsyncFunction' ||
                      // Fallback: llamarla con args inválidos y ver si devuelve Promise
                      ext[fn]('__test__', 1) instanceof Promise;
      if (!isAsync) {
        issues.push(`'${fn}' no es async`);
      } else {
        // Limpiar la Promise pendiente (no nos importa el resultado)
        ext[fn]('__test__', 1)?.catch?.(() => {});
      }
    }
  }

  report(name, issues);
}

// ─── Resultado final ──────────────────────────────────────────────────────────

if (failed > 0) {
  console.error(`\n❌  ${passed} OK, ${failed} fallaron\n`);
  process.exit(1);
} else {
  console.log(`\n✅  Todos los bundles pasaron los smoke tests (${passed}/${passed + failed})\n`);
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function report(name, issues) {
  if (issues.length > 0) {
    console.error(`  ✗  ${name}`);
    for (const i of issues) console.error(`       ↳ ${i}`);
    failed++;
  } else {
    console.log(`  ✓  ${name}`);
    passed++;
  }
}

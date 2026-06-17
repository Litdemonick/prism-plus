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

  // ── Validación estática del formato PrismHub ──────────────────────────────
  // Los bundles se publican como `export default class extends Extension` con
  // cabecera ==PrismHubExtension==. No se pueden evaluar como script plano (la
  // sintaxis `export` es de módulo), así que validamos su estructura de forma
  // estática. Cubre tanto las nativas (build TS) como las vendored (comunidad).
  const code = readFileSync(bundlePath, 'utf8');

  if (!code.includes('==PrismHubExtension==')) {
    issues.push('falta la cabecera ==PrismHubExtension==');
  }
  if (!/@package\s+\S+/.test(code)) {
    issues.push('falta @package en la cabecera');
  }
  // Acepta tanto la forma anónima como con nombre de clase:
  //   export default class extends Extension
  //   export default class Foo extends Extension
  if (!/export default class\s+(?:\w+\s+)?extends\s+Extension/.test(code)) {
    issues.push('falta `export default class extends Extension`');
  }
  for (const fn of REQUIRED_FNS) {
    if (!new RegExp(`\\b${fn}\\s*\\(`).test(code)) {
      issues.push(`no referencia el método '${fn}('`);
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

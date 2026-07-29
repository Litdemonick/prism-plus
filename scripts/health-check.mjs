// ─── Prism+ Health Check ─────────────────────────────────────────────────────
// Corre los live tests y, según el resultado, marca o desmarca `unstable` +
// `unstableReason` en index.json. Lo dispara .github/workflows/health.yml de
// forma programada.
//
// Para qué sirve: si un sitio se cae o "tumban" una extensión, PrismHub se
// entera SOLO — lee esos campos del índice y bloquea la extensión con un aviso
// (ver ExtensionUtils.hasExtensionUpdate / blockedByPendingUpdate en el app).
// No hace falta publicar una versión nueva del app ni de la extensión.
//
// Editar estos campos es seguro respecto de la firma: `signature`/`sha256` del
// índice son del BUNDLE (dist/<ext>.js), y acá no se toca ningún bundle — solo
// metadata. Por eso este script sí puede correr en CI, que no tiene la llave
// privada de firma.
//
// Uso:
//   node scripts/health-check.mjs             evalúa y escribe si hace falta
//   node scripts/health-check.mjs --dry-run   solo muestra qué haría
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const INDEX_FILE = join(ROOT, 'index.json');
const STATE_FILE = join(ROOT, '.health-state.json');
const REPORT_FILE = '.health-report.json';

const DRY_RUN = process.argv.includes('--dry-run');

// Cuántas corridas seguidas tiene que fallar una extensión antes de marcarla.
// A propósito > 1: marcar `unstable` BLOQUEA el contenido en el app, y no
// queremos bloquear una extensión sana porque el runner de CI tuvo un
// parpadeo de red. Se desmarca en cuanto vuelve a pasar (una sola corrida
// buena alcanza) — así, si el sitio vuelve, la extensión se reactiva sola.
const FAILURES_BEFORE_MARKING = 2;

if (!existsSync(INDEX_FILE)) {
  console.error('❌  index.json no existe — ejecutá npm run build primero');
  process.exit(1);
}

// ─── 1. Correr los live tests en modo reporte ───────────────────────────────

console.log('🌐  Corriendo live tests…\n');
const run = spawnSync(
  process.execPath,
  [join(ROOT, 'scripts', 'live-test.mjs'), '--report-only', `--json=${REPORT_FILE}`],
  { stdio: 'inherit', cwd: ROOT },
);

if (run.error) {
  console.error(`❌  No se pudo correr live-test: ${run.error.message}`);
  process.exit(1);
}

const reportPath = join(ROOT, REPORT_FILE);
if (!existsSync(reportPath)) {
  console.error('❌  live-test no dejó reporte — no se toca el índice');
  process.exit(1);
}
const report = JSON.parse(readFileSync(reportPath, 'utf8'));

// ─── 2. Actualizar el contador de fallos consecutivos ───────────────────────

const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {};
const nextState = {};

for (const r of report) {
  const prev = state[r.package]?.consecutiveFailures ?? 0;
  if (r.ok) {
    // Pasó: se limpia el contador (y más abajo se desmarca si estaba marcada).
    nextState[r.package] = { consecutiveFailures: 0, lastReason: null };
  } else {
    nextState[r.package] = {
      consecutiveFailures: prev + 1,
      lastReason: r.reason ?? 'broken',
    };
  }
}

// Extensiones que no aparecieron en este reporte (ej. se corrió con --only, o
// se quitó del repo): se conserva su estado tal cual, no se inventa nada.
for (const [pkg, value] of Object.entries(state)) {
  if (!(pkg in nextState)) nextState[pkg] = value;
}

// ─── 3. Aplicar al índice ───────────────────────────────────────────────────

const index = JSON.parse(readFileSync(INDEX_FILE, 'utf8'));
const changes = [];

for (const ext of index.extensions ?? []) {
  const st = nextState[ext.package];
  if (!st) continue;

  const shouldMark = st.consecutiveFailures >= FAILURES_BEFORE_MARKING;
  const wasMarked = ext.unstable === true || ext.unstable === 'true';

  if (shouldMark) {
    const reason = st.lastReason ?? 'broken';
    if (!wasMarked || ext.unstableReason !== reason) {
      ext.unstable = true;
      ext.unstableReason = reason;
      changes.push(
        `⛔  ${ext.name}: marcada inestable (${reason}, ${st.consecutiveFailures} corridas seguidas fallando)`,
      );
    }
  } else if (wasMarked && st.consecutiveFailures === 0) {
    // Volvió a andar. OJO: solo se desmarca lo que marcó ESTE chequeo — una
    // extensión de disabled-extensions/ la marca build.mjs a propósito (código
    // roto sin arreglar, sin bundle), y no le corresponde a este script
    // reactivarla. Se reconoce porque esas no tienen `script`.
    if (!ext.script) {
      continue;
    }
    delete ext.unstable;
    delete ext.unstableReason;
    changes.push(`✅  ${ext.name}: volvió a andar, se le quita el inestable`);
  } else if (st.consecutiveFailures > 0 && st.consecutiveFailures < FAILURES_BEFORE_MARKING) {
    console.log(
      `⚠️   ${ext.name}: falló ${st.consecutiveFailures} vez/veces (${st.lastReason}) — todavía no se marca, se espera otra corrida`,
    );
  }
}

// ─── 4. Escribir ────────────────────────────────────────────────────────────

console.log('');
if (changes.length === 0) {
  console.log('✅  Sin cambios en el índice');
} else {
  for (const c of changes) console.log(c);
}

if (DRY_RUN) {
  console.log('\n(--dry-run: no se escribió nada)\n');
  process.exit(0);
}

writeFileSync(STATE_FILE, JSON.stringify(nextState, null, 2) + '\n');
if (changes.length > 0) {
  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + '\n');
}

// Lo lee el workflow para decidir si commitea.
console.log(`\nhealth-changed=${changes.length > 0 ? 'true' : 'false'}`);

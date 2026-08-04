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
let report = JSON.parse(readFileSync(reportPath, 'utf8'));

// ─── 1b. Segunda oportunidad, una por una ───────────────────────────────────
//
// La corrida completa pide las 11 extensiones casi seguidas y varios sitios
// responden con límite de peticiones cuando los golpean así. Eso se contaba
// como "extensión rota" y, al repetirse todos los días, llegaba a las 2
// corridas fallidas seguidas y las marcaba inestables. Pasó en vivo con
// ShadeManga, TuMangaOnline y VeoHentai: las tres pasaban perfecto corriendo
// solas, pero el índice publicado las servía marcadas y en el app pedían
// "actualización requerida" para siempre.
//
// Así que antes de contar un fallo se reintenta ESA extensión sola. Si pasa,
// era la tanda y no la extensión. Solo se reintenta lo que ya falló, así que
// en una corrida sana no cuesta nada.
const fallidas = report.filter((r) => !r.ok);
if (fallidas.length > 0) {
  console.log(
    `\n🔁  ${fallidas.length} extensión(es) fallaron en la tanda — se reintentan una por una\n`,
  );
  for (const r of fallidas) {
    // Un respiro entre reintentos, por el mismo motivo que existe todo esto.
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const retryFile = `${REPORT_FILE}.retry.json`;
    const retry = spawnSync(
      process.execPath,
      [
        join(ROOT, 'scripts', 'live-test.mjs'),
        '--report-only',
        `--only=${r.package}`,
        `--json=${retryFile}`,
      ],
      { stdio: 'inherit', cwd: ROOT },
    );
    if (retry.error) continue;
    const retryPath = join(ROOT, retryFile);
    if (!existsSync(retryPath)) continue;
    const solo = JSON.parse(readFileSync(retryPath, 'utf8'));
    const suyo = solo.find((x) => x.package === r.package);
    if (suyo?.ok) {
      console.log(`  ✅  ${r.package}: pasa sola — era la tanda, no la extensión`);
      report = report.map((x) => (x.package === r.package ? suyo : x));
    }
  }
}

// ─── 2. Actualizar el contador de fallos consecutivos ───────────────────────

const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {};
const nextState = {};

// ─── Freno de emergencia ────────────────────────────────────────────────────
// Si en UNA corrida falla más de la mitad del catálogo, no se marca nada.
//
// Que se rompan a la vez ocho extensiones de sitios distintos, de un momento
// para el otro, no pasa: lo que pasa es que se cayó la red del robot, que
// GitHub cambió el rango de direcciones desde donde sale, o que algo del
// entorno se rompió. Marcar en ese momento deja al usuario sin contenido en
// media app por un problema que no es suyo ni de las extensiones.
//
// Es a propósito conservador: preferir no avisar de una rotura real —que en la
// corrida siguiente se va a volver a detectar— antes que bloquear medio
// catálogo por un fallo del entorno. El daño de equivocarse no es simétrico.
const totales = report.length;
const cuantasFallan = report.filter((r) => !r.ok).length;
const demasiadas = totales >= 4 && cuantasFallan > totales / 2;
if (demasiadas) {
  console.log(
    `\n🛑  ${cuantasFallan} de ${totales} extensiones fallaron en esta corrida.\n` +
      '    Eso no es que se hayan roto todas: es el entorno. No se marca ninguna.\n' +
      '    Si fuera real, la próxima corrida lo vuelve a ver.',
  );
}

for (const r of report) {
  const prev = state[r.package]?.consecutiveFailures ?? 0;
  if (demasiadas && !r.ok) {
    // Freno de emergencia (ver arriba): se deja el contador como estaba, sin
    // sumar ni restar. Esta corrida no cuenta para nadie.
    nextState[r.package] = {
      consecutiveFailures: prev,
      lastReason: state[r.package]?.lastReason ?? null,
    };
  } else if (r.ok) {
    // Pasó: se limpia el contador (y más abajo se desmarca si estaba marcada).
    nextState[r.package] = { consecutiveFailures: 0, lastReason: null };
  } else if (r.reason === 'protected') {
    // El sitio contestó con un desafío de Cloudflare: NO se pudo comprobar
    // nada, ni a favor ni en contra. Eso no es un fallo de la extensión y no
    // puede sumar al contador — el app pasa ese desafío por WebView y funciona
    // igual.
    //
    // Este era el motivo real de que ShadeManga, TuMangaOnline y VeoHentai
    // aparecieran inestables "de la nada" cada tanto: cuando Cloudflare subía
    // la protección, el chequeo las daba por rotas dos corridas seguidas y el
    // app les bloqueaba el contenido a todos los usuarios.
    //
    // Se conserva el contador anterior en vez de reiniciarlo: si venía
    // fallando de verdad, una corrida que no pudo verificar nada tampoco es
    // motivo para perdonarla.
    //
    // PERO con una excepción, y sin ella la extensión queda trabada para
    // siempre: si estaba marcada como "site-down", el desafío la desmarca.
    //
    // Porque un desafío de Cloudflare ES una respuesta del sitio. "site-down"
    // significa que la página no contesta, y acá contestó — está viva, solo
    // protegida. Sin esta salida, una extensión detrás de Cloudflare que se
    // marcó caída una vez ya no puede volver nunca: el chequeo no logra
    // verificarla, así que jamás le limpia el contador, y el app le sigue
    // bloqueando el contenido a todos los usuarios aunque ande perfecto.
    //
    // Pasó de verdad con ShadeManga: el sitio ya había vuelto, se comprobó a
    // mano que las doce pruebas pasaban, y el catálogo la seguía dando por
    // caída corrida tras corrida.
    //
    // Solo aplica a "site-down". Si estaba marcada "broken" —contesta pero
    // devuelve vacío— el desafío no dice nada de eso y se deja como estaba.
    const motivoPrevio = state[r.package]?.lastReason ?? null;
    const revive = motivoPrevio === 'site-down';
    nextState[r.package] = {
      consecutiveFailures: revive ? 0 : prev,
      lastReason: revive ? null : motivoPrevio,
    };
    console.log(
      revive
        ? `🛡️   ${r.name}: pide desafío de Cloudflare, o sea que el sitio SÍ responde — se levanta la marca de caída`
        : `🛡️   ${r.name}: el sitio pide desafío de Cloudflare — no se puede verificar desde acá, se deja como estaba`,
    );
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

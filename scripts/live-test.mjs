// ─── Prism+ Live Tests ───────────────────────────────────────────────────────
// Ejecuta cada bundle de dist/ CONTRA SU SITIO REAL, igual que lo haría
// PrismHub, y verifica que de verdad entregue contenido.
//
// Por qué existe: `npm run validate` chequea la forma del manifest y que
// existan los exports, y `npm test` valida la estructura del bundle. Ninguno
// de los dos toca la red, así que una extensión puede compilar perfecto,
// pasar ambos, y devolver CERO contenido porque el sitio cambió su HTML o su
// API. Esto es lo que cierra ese hueco antes de publicar.
//
// Uso:
//   npm run live-test                      todas las extensiones
//   npm run live-test -- --only=jkanime    una sola (nombre o package)
//   npm run live-test -- --report-only     nunca falla (exit 0), solo reporta
//   npm run live-test -- --json=out.json   además escribe el resultado crudo
// ---------------------------------------------------------------------------

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST_DIR = join(ROOT, 'dist');

const args = process.argv.slice(2);
const argOf = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const ONLY = argOf('only');
const JSON_OUT = argOf('json');
const REPORT_ONLY = args.includes('--report-only');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Palabras clave por extensión: algo que ESE catálogo sí tiene. Un término
// genérico como "one piece" en un sitio de películas daría 0 resultados y
// parecería un fallo cuando en realidad la extensión anda bien.
const KEYWORDS = {
  'io.prismhub.animefenix': 'one piece',
  'io.prismhub.jkanime': 'one piece',
  'io.prismhub.tioanime': 'one piece',
  'io.prismhub.fuegocine': 'batman',
  'io.prismhub.manhwaweb': 'solo leveling',
  'io.prismhub.olympus': 'solo leveling',
  'io.prismhub.shademanga': 'one piece',
  'io.prismhub.tumangaonline': 'one piece',
  // Sitios +18: su catálogo no tiene títulos mainstream, así que se busca algo
  // que esos catálogos SÍ contienen. Verificado a mano contra cada sitio.
  'io.prismhub.hentaila': 'kanan',
  'io.prismhub.veohentai': 'bishoujo',
  'io.prismhub.xvideos': 'cosplay',
};
const DEFAULT_KEYWORD = 'one piece';

// ─── Puente de red: mismo contrato que jsRequest de PrismHub ─────────────────
// (ver lib/data/services/extension_service.dart) — devuelve el body como
// string y NO tira por status != 2xx, porque varios sitios sirven HTML válido
// bajo 404.
//
// El cookie jar por host NO es opcional: PrismHub mantiene cookies con un
// PersistCookieJar aislado por extensión (lib/utils/request.dart), y sin eso
// acá salen falsos negativos — JKAnime usa CSRF de Laravel y su endpoint de
// episodios responde "Page Expired" si no le llega la cookie de sesión del
// GET anterior, así que `detail` parecía roto cuando en la app funciona.
const cookieJar = new Map();

function cookieHeaderFor(host) {
  const jar = cookieJar.get(host);
  if (!jar || jar.size === 0) return null;
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function storeCookiesFrom(host, res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  if (raw.length === 0) return;
  const jar = cookieJar.get(host) ?? new Map();
  for (const line of raw) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  cookieJar.set(host, jar);
}

// Marca si el último fallo fue de red (sitio caído/timeout) y no de parseo:
// el chequeo de salud lo usa para distinguir "está caída la página" de
// "la extensión está rota".
let sawNetworkError = false;

globalThis.sendMessage = async (channel, data) => {
  if (channel !== 'request') throw new Error(`canal no soportado: ${channel}`);
  const [url, opts = {}] = JSON.parse(data);
  const host = new URL(url).host;
  const headers = { 'User-Agent': UA, ...(opts.headers || {}) };
  const cookie = cookieHeaderFor(host);
  if (cookie) headers.Cookie = cookie;
  let res;
  try {
    res = await fetch(url, {
      method: (opts.method || 'get').toUpperCase(),
      headers,
      body: opts.data ?? undefined,
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });
  } catch (e) {
    sawNetworkError = true;
    throw e;
  }
  storeCookiesFrom(host, res);
  return await res.text();
};

// Los bundles se publican como `export default class extends Extension`.
globalThis.Extension = class {};

// ─── Helpers ────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: se agotó el tiempo (${ms}ms)`)), ms),
    ),
  ]);
}

// Reintento con backoff — un parpadeo de red no debería frenar una
// publicación ni marcar una extensión sana como caída.
async function retry(fn, { attempts = 3, baseDelay = 1500, label = '' } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await sleep(baseDelay * (i + 1));
    }
  }
  throw new Error(`${label ? label + ' — ' : ''}${lastError?.message ?? lastError}`);
}

const short = (e) => String(e?.message ?? e).split('\n')[0].slice(0, 160);

// ─── Chequeos por extensión ─────────────────────────────────────────────────

async function checkExtension(inst, pkg) {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });

  // 1. latest(1) — tiene que traer ítems bien formados.
  let firstPage = [];
  try {
    firstPage = await retry(() => withTimeout(inst.latest(1), 40000, 'latest(1)'), {
      label: 'latest(1)',
    });
    const malformed = (firstPage || []).filter((i) => !i || !i.title || !i.url);
    if (!Array.isArray(firstPage) || firstPage.length === 0) {
      add('latest', false, 'no devolvió ningún ítem');
    } else if (malformed.length > 0) {
      add('latest', false, `${malformed.length} ítem(s) sin título o sin url`);
    } else {
      add('latest', true, `${firstPage.length} ítems`);
    }
  } catch (e) {
    add('latest', false, short(e));
  }

  // 2. Paginación real: la página 2 tiene que traer algo NUEVO, no repetir la 1.
  //    Un sitio que ignora el parámetro de página devuelve lo mismo siempre y
  //    en la app se ve como "no hay más datos" apenas scrolleás.
  try {
    const page2 = await retry(() => withTimeout(inst.latest(2), 40000, 'latest(2)'), {
      label: 'latest(2)',
    });
    const seen = new Set((firstPage || []).map((i) => i?.url));
    const fresh = (page2 || []).filter((i) => !seen.has(i?.url)).length;
    add(
      'paginación',
      (page2?.length ?? 0) > 0 && fresh > 0,
      `página 2: ${page2?.length ?? 0} ítems, ${fresh} nuevos`,
    );
  } catch (e) {
    add('paginación', false, short(e));
  }

  // 3. createFilter() — cada filtro declarado tiene que traer opciones.
  let filters = null;
  try {
    filters = await retry(() => withTimeout(inst.createFilter(), 40000, 'createFilter'), {
      label: 'createFilter',
    });
    const keys = Object.keys(filters || {});
    const empty = keys.filter((k) => {
      const f = filters[k];
      return !f || typeof f !== 'object' || !f.options || Object.keys(f.options).length === 0;
    });
    if (keys.length === 0) {
      // Sin filtros es válido (el botón simplemente no aparece en la app).
      add('filtros', true, 'no declara filtros');
    } else {
      add('filtros', empty.length === 0, empty.length ? `sin opciones: ${empty.join(', ')}` : `${keys.length} filtros`);
    }
  } catch (e) {
    add('filtros', false, short(e));
  }

  // 4. search() — tiene que encontrar algo real y sin duplicados.
  const keyword = KEYWORDS[pkg] || DEFAULT_KEYWORD;
  try {
    const items = await retry(() => withTimeout(inst.search(keyword, 1), 60000, 'search'), {
      label: 'search',
    });
    const urls = (items || []).map((i) => i?.url);
    const dupes = urls.length - new Set(urls).size;
    if (!Array.isArray(items) || items.length === 0) {
      add('search', false, `"${keyword}" no devolvió nada`);
    } else if (dupes > 0) {
      add('search', false, `"${keyword}": ${items.length} ítems con ${dupes} duplicado(s)`);
    } else {
      add('search', true, `"${keyword}": ${items.length} ítems`);
    }
  } catch (e) {
    add('search', false, short(e));
  }

  // 5. Cada filtro APLICADO de verdad tiene que devolver resultados — es el
  //    chequeo que asegura que la extensión entrega todo su contenido y no
  //    solo la portada.
  if (filters) {
    for (const key of Object.keys(filters)) {
      const f = filters[key];
      const options = Object.keys(f.options || {}).filter((o) => o !== (f.default ?? ''));
      if (options.length === 0) continue;
      const pick = options[0];
      const label = `filtro ${key}=${pick}`;
      try {
        const items = await retry(
          () => withTimeout(inst.search('', 1, { [key]: [pick] }), 60000, label),
          { attempts: 2, label },
        );
        add(label, Array.isArray(items) && items.length > 0, `${items?.length ?? 0} ítems`);
      } catch (e) {
        add(label, false, short(e));
      }
    }
  }

  // 6. detail() — se prueban VARIOS ítems, no solo el primero: el primer
  //    resultado de latest suele ser un estreno todavía sin capítulos
  //    publicados (0 episodios legítimo), y juzgar por ese solo daba un falso
  //    negativo. Alcanza con que alguno traiga episodios.
  try {
    let best = null;
    for (const item of (firstPage || []).slice(0, 4)) {
      if (!item?.url) continue;
      try {
        const d = await withTimeout(inst.detail(item.url), 90000, 'detail');
        const groups = Array.isArray(d?.episodes) ? d.episodes : [];
        const count = groups.reduce((n, g) => n + (g?.urls?.length ?? 0), 0);
        best = { count, title: d?.title ?? item.title };
        if (count > 0) break;
      } catch (e) {
        best = best ?? { count: 0, error: short(e) };
      }
    }
    if (!best) add('detail', false, 'no había ítems para probar');
    else if (best.count > 0) add('detail', true, `${best.count} capítulos/episodios`);
    else add('detail', false, best.error ?? 'ningún ítem devolvió capítulos');
  } catch (e) {
    add('detail', false, short(e));
  }

  return checks;
}

// ─── Corrida ────────────────────────────────────────────────────────────────

if (!existsSync(DIST_DIR)) {
  console.error('\n❌  dist/ no existe — ejecutá npm run build primero\n');
  process.exit(1);
}

const bundles = readdirSync(DIST_DIR)
  .filter((f) => f.endsWith('.js'))
  .sort();

if (bundles.length === 0) {
  console.error('\n❌  No hay bundles en dist/\n');
  process.exit(1);
}

const results = [];
let failedCount = 0;

console.log(`\n🌐  Live tests — ${bundles.length} bundle(s) contra sus sitios reales\n`);

for (const file of bundles) {
  const code = readFileSync(join(DIST_DIR, file), 'utf8');
  const pkg = /@package\s+(\S+)/.exec(code)?.[1] ?? file.replace('.js', '');
  const name = /@name\s+(.+)/.exec(code)?.[1]?.trim() ?? file;

  if (ONLY && ONLY !== pkg && ONLY !== file.replace('.js', '') && ONLY !== name) continue;

  sawNetworkError = false;
  let checks;
  try {
    const mod = await import(pathToFileURL(join(DIST_DIR, file)).href);
    const inst = new mod.default();
    checks = await checkExtension(inst, pkg);
  } catch (e) {
    checks = [{ name: 'cargar bundle', ok: false, detail: short(e) }];
  }

  const failures = checks.filter((c) => !c.ok);
  const ok = failures.length === 0;
  if (!ok) failedCount++;

  // Clasificación para el chequeo de salud: si TODO lo que falló fue por red,
  // el problema es el sitio, no el código de la extensión.
  const reason = ok ? null : sawNetworkError ? 'site-down' : 'broken';

  results.push({ name, package: pkg, ok, reason, checks });

  console.log(`${ok ? '✅' : '❌'}  ${name}  (${pkg})`);
  for (const c of checks) {
    if (c.ok) console.log(`      ok    ${c.name} — ${c.detail}`);
    else console.log(`      FALLA ${c.name} — ${c.detail}`);
  }
  if (!ok) {
    console.log(
      `      → motivo: ${reason === 'site-down' ? 'la página parece caída (error de red)' : 'la extensión responde pero no entrega contenido'}`,
    );
  }
  console.log('');
}

if (results.length === 0) {
  console.error(`❌  --only=${ONLY} no coincidió con ninguna extensión\n`);
  process.exit(1);
}

console.log('─'.repeat(60));
console.log(
  `${results.length - failedCount}/${results.length} extensión(es) pasaron` +
    (failedCount > 0 ? ` — ${failedCount} con problemas` : ''),
);

if (JSON_OUT) {
  writeFileSync(join(ROOT, JSON_OUT), JSON.stringify(results, null, 2));
  console.log(`📄  Resultado crudo en ${JSON_OUT}`);
}

if (failedCount > 0 && !REPORT_ONLY) {
  console.error(
    '\n⛔  No publiques así: arreglá lo de arriba, o usá --report-only si el\n' +
      '    sitio está caído y necesitás publicar igual.\n',
  );
  process.exit(1);
}
console.log('');

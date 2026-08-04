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

// El User-Agent EXACTO que la app usa en Android (ver getUASetting en
// prismhub_storage.dart). Sirve para simular el teléfono desde acá.
const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 13; Android) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36';

// Qué User-Agent rellena el shim cuando la extensión NO manda uno — igual que
// hace el puente de la app. Se cambia temporalmente para el chequeo de móvil.
let defaultUA = UA;

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
  // Catalogo de webtoons romanticos en español: 'one piece' no existe ahi.
  'io.prismhub.ikigai': 'vida',
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

// Marca si el sitio contestó con un desafío de Cloudflare. Es un tercer estado
// y NO significa que la extensión esté rota:
//
// El desafío exige ejecutar JavaScript en un navegador de verdad, cosa que este
// script —fetch pelado— no puede hacer nunca. La app sí lo pasa, porque cae al
// WebView, resuelve el desafío y se guarda la cookie cf_clearance.
//
// Sin distinguirlo, cada vez que Cloudflare subía la protección el chequeo
// marcaba la extensión como rota y el app le bloqueaba el contenido a todo el
// mundo, aunque funcionara perfecto. Medido en vivo: shademanga.com y
// zonatmo.com contestando 503 con "challenge-platform" en el cuerpo.
let sawChallenge = false;

// Cloudflare manda 403 o 503 con la página del desafío. OJO: `fetch` NO lanza
// en esos casos —la respuesta llega bien, solo que con el desafío en el cuerpo—
// así que esto no lo detectaba el manejo de errores de red.
function looksLikeChallenge(res, body) {
  // cf-mitigated es la senal explicita y no necesita mirar el cuerpo.
  if (res.headers.get('cf-mitigated')) return true;
  if (res.status !== 403 && res.status !== 503) return false;
  // Un 503 servido por el ORIGEN (mantenimiento del sitio) tambien pasa por
  // Cloudflare, asi que la sola presencia de cf-ray no alcanza: hace falta ver
  // el desafio en el cuerpo para no confundir mantenimiento con proteccion.
  // Cuerpo COMPLETO: el script del desafio suele ir al pie del HTML, asi que
  // mirar solo el principio lo dejaba pasar. Las paginas de desafio pesan unas
  // decenas de KB, revisarlas enteras no cuesta nada.
  const muestra = (body || '').toLowerCase();
  return (
    muestra.includes('challenge-platform') ||
    muestra.includes('cf-browser-verification') ||
    muestra.includes('just a moment')
  );
}

globalThis.sendMessage = async (channel, data) => {
  if (channel !== 'request') throw new Error(`canal no soportado: ${channel}`);
  const [url, opts = {}] = JSON.parse(data);
  const host = new URL(url).host;
  // El User-Agent de la extensión pisa al de acá — igual que el puente de la
  // app, que solo lo rellena si la extensión no manda uno.
  const headers = { 'User-Agent': defaultUA, ...(opts.headers || {}) };
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
  const body = await res.text();
  if (looksLikeChallenge(res, body)) {
    sawChallenge = true;
    throw new Error(
      `${host} respondió con un desafío de Cloudflare (HTTP ${res.status})`,
    );
  }
  return body;
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
  // Igual que add, pero lo que falle acá NO cuenta para dar la extension por
  // rota: se informa y nada mas.
  //
  // Se usa para lo que afea la pantalla pero no impide usar la extension. Una
  // ficha sin titulo o sin portada se sigue abriendo y se sigue reproduciendo;
  // marcarla "rota" por eso bloquea el contenido en el app por un detalle
  // cosmetico.
  //
  // Y el motivo concreto: estas dos comprobaciones fallaron en el robot
  // mientras en una conexion normal pasaban perfecto (comprobado con la misma
  // pelicula). Varios sitios le sirven otra pagina a las direcciones de un
  // centro de datos. Como el sitio SI contesta, no cae en "sitio caido" ni en
  // "protegido", y terminaba clasificado como "roto" — el peor de los tres —
  // por algo que del lado del usuario funciona.
  const avisar = (name, ok, detail) => checks.push({ name, ok, detail, leve: true });

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

  // 4b. LA MISMA consulta con User-Agent de MÓVIL.
  //
  // Este chequeo existe por un bug real que costó diez versiones encontrar: la
  // app rellena el User-Agent solo si la extensión no manda uno, y ahí usa el de
  // la plataforma — escritorio en PC y MÓVIL en Android. Varios sitios sirven
  // maquetados distintos según eso, así que una extensión andaba perfecto en la
  // PC y devolvía CERO en el celular. Esta prueba corre desde una sola máquina,
  // así que no lo veía: publicaba en verde algo que estaba roto en Android.
  //
  // Si la extensión fija su propio User-Agent (ver DESKTOP_UA en sdk/http), las
  // dos corridas dan lo mismo y esto pasa sin ruido — que es justo el objetivo.
  // Si no lo fija y el sitio responde distinto, salta ACÁ, antes de publicar.
  if (firstPage.length > 0) {
    try {
      defaultUA = MOBILE_UA;
      const mobile = await retry(
        () => withTimeout(inst.latest(1), 60000, 'user-agent móvil'),
        { attempts: 2, label: 'user-agent móvil' },
      );
      const n = Array.isArray(mobile) ? mobile.length : 0;
      // Se compara contra la corrida de escritorio: importa la diferencia, no el
      // número absoluto (un catálogo puede cambiar entre una y otra).
      if (n === 0) {
        add(
          'user-agent móvil',
          false,
          `${firstPage.length} ítems desde escritorio y 0 desde móvil — ` +
            `en Android va a aparecer vacía; fijá DESKTOP_UA en la extensión`,
        );
      } else {
        add('user-agent móvil', true, `${n} ítems`);
      }
    } catch (e) {
      add('user-agent móvil', false, short(e));
    } finally {
      // Restaurar SIEMPRE, incluso si falló: si quedara en móvil, todos los
      // chequeos siguientes correrían con el UA equivocado.
      defaultUA = UA;
    }
  }

  // 5. Cada filtro APLICADO de verdad tiene que devolver resultados Y cambiar
  //    algo. Que devuelva resultados no alcanza: si el sitio IGNORA el
  //    parámetro, responde el catálogo completo y el filtro "pasaría" la
  //    prueba estando roto. Pasó de verdad — `status` y `category` en hentaila
  //    y `datef` en xvideos se aceptan pero no filtran nada, y solo se
  //    detectaron comparando a mano contra el total sin filtrar.
  //
  //    Así que se compara contra una línea base sin filtros. Se compara la
  //    SECUENCIA de urls, no el conjunto: un filtro de orden devuelve los
  //    mismos títulos en otro orden, y eso es un efecto real y válido.
  if (filters) {
    let baseline = null;
    try {
      const items = await retry(
        () => withTimeout(inst.search('', 1, {}), 60000, 'base sin filtros'),
        { attempts: 2, label: 'base sin filtros' },
      );
      if (Array.isArray(items) && items.length > 0) {
        baseline = items.map((it) => it?.url ?? '').join('|');
      }
    } catch {
      // Si la línea base falla se sigue sin ella: mejor comprobar solo que el
      // filtro devuelve resultados que marcar un fallo falso por un hipo de red.
    }

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
        const n = Array.isArray(items) ? items.length : 0;
        if (n === 0) {
          add(label, false, '0 ítems');
          continue;
        }
        if (baseline !== null && items.map((it) => it?.url ?? '').join('|') === baseline) {
          // Sin efecto con el buscador vacío no significa roto: hay sitios donde
          // ciertos filtros solo existen en la PÁGINA DE BÚSQUEDA y no en el
          // listado (en xvideos, orden/duración/calidad son parámetros de
          // ?k=...). Antes de acusar al filtro se reintenta con palabra, contra
          // su propia línea base.
          const withKw = await retry(
            () => withTimeout(inst.search(keyword, 1, { [key]: [pick] }), 60000, label),
            { attempts: 2, label },
          );
          const kwBase = await retry(
            () => withTimeout(inst.search(keyword, 1, {}), 60000, label),
            { attempts: 2, label },
          );
          const a = (Array.isArray(withKw) ? withKw : []).map((it) => it?.url ?? '').join('|');
          const b = (Array.isArray(kwBase) ? kwBase : []).map((it) => it?.url ?? '').join('|');
          if (a && a !== b) {
            add(label, true, `${withKw.length} ítems (solo aplica con búsqueda)`);
          } else {
            add(
              label,
              false,
              `${n} ítems pero IDÉNTICOS a sin filtrar, con y sin búsqueda — el sitio ignora este filtro`,
            );
          }
          continue;
        }
        add(label, true, `${n} ítems${baseline === null ? ' (sin línea base)' : ''}`);
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
        best = {
          count,
          // OJO: el título del DETALLE, sin caer al del listado. La app guarda
          // en Historial/Favoritos el que devuelve detail(), así que si acá
          // viene vacío la card del Home sale sin título aunque el listado se
          // vea perfecto (pasó con TuMangaOnline: el <h1> traía un <small>
          // con el año adentro y el patrón no matcheaba). Enmascararlo con el
          // título del listado era justo lo que ocultaba el bug.
          title: typeof d?.title === 'string' ? d.title.trim() : '',
          cover: typeof d?.cover === 'string' ? d.cover.trim() : '',
          probed: item,
        };
        if (count > 0) break;
      } catch (e) {
        best = best ?? { count: 0, error: short(e) };
      }
    }
    if (!best) add('detail', false, 'no había ítems para probar');
    else if (best.count > 0) add('detail', true, `${best.count} capítulos/episodios`);
    else add('detail', false, best.error ?? 'ningún ítem devolvió capítulos');

    // 6b. El detalle tiene que traer título y portada propios.
    if (best?.probed) {
      if (best.title) {
        avisar('detail — título', true, JSON.stringify(best.title));
      } else {
        avisar(
          'detail — título',
          false,
          `detail() devolvió título vacío para ${best.probed.url}`,
        );
      }
      if (best.cover) avisar('detail — portada', true, 'ok');
      else avisar('detail — portada', false, `detail() devolvió portada vacía para ${best.probed.url}`);
    }
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

  // Los dos flags se reinician por extension: si no, el desafio de un
  // sitio contagiaba el diagnostico de todas las que vinieran despues.
  sawNetworkError = false;
  sawChallenge = false;
  let checks;
  try {
    const mod = await import(pathToFileURL(join(DIST_DIR, file)).href);
    const inst = new mod.default();
    checks = await checkExtension(inst, pkg);
  } catch (e) {
    checks = [{ name: 'cargar bundle', ok: false, detail: short(e) }];
  }

  // Los avisos no cuentan: ver `avisar` en checkExtension. Son cosas que se
  // ven mal pero no impiden usar la extension, y dar por rota una extension
  // que funciona le bloquea el contenido al usuario para nada.
  const failures = checks.filter((c) => !c.ok && !c.leve);
  const avisos = checks.filter((c) => !c.ok && c.leve);
  const ok = failures.length === 0;
  if (!ok) failedCount++;

  // Clasificación para el chequeo de salud: si TODO lo que falló fue por red,
  // el problema es el sitio, no el código de la extensión.
  // El desafío manda sobre los demás motivos: si el sitio ni siquiera nos dejó
  // entrar, lo que la extensión haga o deje de hacer no se pudo comprobar.
  // Ni UNA comprobacion trajo contenido, pero el sitio contesto igual.
  //
  // Eso no se puede llamar "rota". Si el codigo se hubiera roto, alguna
  // comprobacion seguiria pasando: se rompe un parseo, no los siete a la vez.
  // Que TODO venga vacio mientras las peticiones salen bien apunta al sitio,
  // que le entrega otra cosa a las direcciones de un centro de datos.
  //
  // Comprobado con Eporner: desde el robot, cero items en todo; desde una
  // conexion normal, las once comprobaciones en verde. Se marcaba "rota" y el
  // app le bloqueaba el contenido a todo el mundo por algo que funciona.
  //
  // Se trata como "protegida": no es que ande mal, es que desde aca no se
  // puede comprobar.
  const nadaTrajoContenido =
    !ok && checks.length > 1 && checks.every((c) => !c.ok || c.leve);

  const reason = ok
    ? null
    : sawChallenge
      ? 'protected'
      : sawNetworkError
        ? 'site-down'
        : nadaTrajoContenido
          ? 'protected'
          : 'broken';

  results.push({ name, package: pkg, ok, reason, checks });

  console.log(`${ok ? '✅' : '❌'}  ${name}  (${pkg})`);
  for (const c of checks) {
    if (c.ok) console.log(`      ok    ${c.name} — ${c.detail}`);
    else if (c.leve) console.log(`      aviso ${c.name} — ${c.detail}`);
    else console.log(`      FALLA ${c.name} — ${c.detail}`);
  }
  if (ok && avisos.length > 0) {
    console.log(
      `      → ${avisos.length} aviso(s): se ve mal pero se puede usar, no se marca inestable`,
    );
  }
  if (!ok) {
    console.log(
      `      → motivo: ${
        reason === 'protected'
          ? 'el sitio pide un desafío de Cloudflare — NO se puede verificar desde acá, la app sí lo pasa por WebView'
          : reason === 'site-down'
            ? 'la página parece caída (error de red)'
            : 'la extensión responde pero no entrega contenido'
      }`,
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

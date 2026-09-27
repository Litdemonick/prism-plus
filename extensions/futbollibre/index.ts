import type { PrismLiveEvent, PrismLiveChannel, PrismLiveSignal, PrismStream } from '../../sdk/types';

// sendMessage("request", ...) usa el dio de PrismHub (con UA, cookies y
// redirecciones), a diferencia de fetch() que usa http.Client básico.
declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://futbollibrefullhd.org';
// La agenda NO sale del sitio: sale de la API que el propio sitio consume
// (Strapi). Medido en vivo, es un JSON directo — más liviano y más estable
// que scrapear el HTML de la portada.
const AGENDA_URL = 'https://api.wqxag.com/diaries.json';
const CANAL_BASE = 'https://tvf90.com';
// Las imágenes de la agenda (banderas/ligas) llegan con ruta RELATIVA
// ("/uploads/x.png"). El sitio las completa con este dominio (su propio
// config.js, IMG_URL) — medido: responde 200 en ~0,3 s. Sin completarlas la
// app nunca podía cargarlas y quedaba el cuadro vacío.
const IMG_URL = 'https://img.wqxag.com';

function _imagen(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return IMG_URL + (url.startsWith('/') ? url : '/' + url);
}

async function _get(url: string, referer = BASE + '/'): Promise<string> {
  return sendMessage(
    'request',
    JSON.stringify([url, { method: 'get', headers: { Referer: referer } }]),
  );
}

// ─── base64 con CryptoJS ────────────────────────────────────────────────────
//
// El motor de PrismHub (QuickJS) no tiene `Buffer` ni `atob`/`btoa` — el
// `Buffer` de antes andaba en las pruebas con Node y en la app tiraba
// `ReferenceError: 'Buffer' is not defined` en schedule() y channels(), así
// que no cargaba nada. CryptoJS SÍ lo inyecta PrismHub en tiempo de
// ejecución (ver sdk/crypto.ts) apenas el bundle lo nombra — nativo del
// runtime, en vez de reinventar base64 a mano.
function _b64(s: string): string {
  return CryptoJS.enc.Utf8.parse(s).toString(CryptoJS.enc.Base64);
}

function _fromB64(s: string): string {
  return CryptoJS.enc.Base64.parse(s).toString(CryptoJS.enc.Utf8);
}

// ─── Canales fijos (24/7) ───────────────────────────────────────────────────
//
// Medidos uno por uno contra el sitio real (2026-09-26): la portada anuncia
// más de estos, pero "Fox Sports 1/2/3" devuelven 404 en su propia página —
// rotos en el sitio mismo, no algo que dependa de acá. Se listan solo los que
// de verdad resuelven a una señal HLS, confirmado hasta el archivo .m3u8:
// dsports, dsportsplus, espn, espn2, espn3, liga1max, telemundo — los siete,
// vía Referer-only header. Fox Sports igual aparece cuando un partido de la
// AGENDA la trae como señal (ahí no hace falta esta lista fija).
// Logos: los mismos que usa el sitio en la página de cada canal (og:image),
// medidos uno por uno (2026-09-27): 200 para dsports, dsports_plus, espn y
// liga_1_max. ESPN 2/3 no tienen el suyo (404) y usan el de ESPN, la misma
// marca; Telemundo no tiene ninguno y queda con el ícono de la app.
const _LOGOS = BASE + '/img/logo-canal/';
const _CANALES: { id: string; nombre: string; logo?: string }[] = [
  { id: 'dsports', nombre: 'DSports', logo: _LOGOS + 'dsports.webp' },
  { id: 'dsportsplus', nombre: 'DSports+', logo: _LOGOS + 'dsports_plus.webp' },
  { id: 'espn', nombre: 'ESPN', logo: _LOGOS + 'espn.webp' },
  { id: 'espn2', nombre: 'ESPN 2', logo: _LOGOS + 'espn.webp' },
  { id: 'espn3', nombre: 'ESPN 3', logo: _LOGOS + 'espn.webp' },
  { id: 'liga1max', nombre: 'Liga 1 MAX', logo: _LOGOS + 'liga_1_max.webp' },
  { id: 'telemundo', nombre: 'Telemundo' },
];

export async function channels(): Promise<PrismLiveChannel[]> {
  // Sin red: son 7 canales fijos y su URL de partida es siempre la misma
  // forma — no hace falta pedirle nada al sitio para listarlos.
  return _CANALES.map((c) => ({
    id: c.id,
    name: c.nombre,
    icon: c.logo,
    signals: [
      {
        id: _b64(`${CANAL_BASE}/online/canal.php?stream=${c.id}`),
        label: c.nombre,
      },
    ],
  }));
}

// ─── Agenda ──────────────────────────────────────────────────────────────────
//
// Cache CHICA Y CORTA (una sola entrada, 90s): la zona En vivo puede refrescar
// seguido mientras el usuario la mira, y la API no cambia de un segundo a
// otro. Sin esto, cada apertura/refresco es un pedido nuevo a un servidor que
// no es propio. Se descarta sola por tiempo, nunca crece: es un solo valor,
// no un mapa que acumule por parámetro.
let _cacheAgenda: { hasta: number; eventos: PrismLiveEvent[] } | null = null;
const _AGENDA_TTL_MS = 90_000;

interface _Diary {
  attributes: {
    diary_description: string;
    diary_hour: string;
    date_diary: string;
    channels?: { data: unknown[] };
    embeds?: { data: { attributes: { embed_name: string; embed_iframe: string } }[] };
    country?: {
      data?: {
        attributes?: { name?: string; image?: { data?: { attributes?: { url?: string } } } };
      };
    };
  };
}

function _signalsDe(embeds: { attributes: { embed_name: string; embed_iframe: string } }[]): PrismLiveSignal[] {
  const salida: PrismLiveSignal[] = [];
  for (const e of embeds) {
    // El embed_iframe es "/embed/eventos.html?r=<base64>", y ESE base64 ya es
    // la página del reproductor (ej. "https://tvf90.com/1.php?stream=x") —
    // se reusa tal cual como id de la señal: no hace falta inventar uno
    // propio, y resolveSignal ya sabe decodificar exactamente esta forma.
    const m = /[?&]r=([^&]+)/.exec(e.attributes.embed_iframe || '');
    if (!m) continue;
    salida.push({ id: decodeURIComponent(m[1]), label: e.attributes.embed_name || 'Señal' });
  }
  return salida;
}

export async function schedule(): Promise<PrismLiveEvent[]> {
  const ahora = Date.now();
  if (_cacheAgenda && _cacheAgenda.hasta > ahora) return _cacheAgenda.eventos;

  const cruda = await _get(AGENDA_URL);
  const json = JSON.parse(cruda) as { data?: _Diary[] };
  const lista = Array.isArray(json.data) ? json.data : [];

  const eventos: PrismLiveEvent[] = [];
  for (const d of lista) {
    const a = d.attributes;
    const signals = _signalsDe(a.embeds?.data ?? []);
    // Sin ninguna señal, el evento no sirve para nada en esta app — se
    // descarta acá en vez de mostrarlo vacío en la agenda.
    if (signals.length === 0) continue;

    // Hora del sitio: America/Lima (UTC-5, sin horario de verano, medido).
    // Se arma en ISO CON esa zona explícita — el cliente la pasa a la hora
    // local del usuario, acá no se adivina ninguna conversión.
    const startsAt = `${a.date_diary}T${a.diary_hour}-05:00`;

    const liga = a.country?.data?.attributes;
    const imagenLiga = _imagen(liga?.image?.data?.attributes?.url);

    eventos.push({
      id: String(d.attributes.diary_description.length + startsAt.length) +
        '-' + _b64(startsAt + a.diary_description).slice(0, 24),
      title: a.diary_description.replace(/\n+/g, ' ').trim(),
      league: liga?.name,
      leagueImage: imagenLiga,
      startsAt,
      signals,
    });
  }

  _cacheAgenda = { hasta: ahora + _AGENDA_TTL_MS, eventos };
  return eventos;
}

// ─── Resolución de señales ──────────────────────────────────────────────────
//
// Medido en vivo (2026-09-26): dos familias bien distintas detrás del mismo
// "embed" de la agenda.
//   · 1.php / 2.php / 3.php / plus1.php  → iframe interno /5.php → un .m3u8
//     en *.ftlly.com. Responde DIRECTO, sin cabeceras especiales, token de
//     ~5h. Esta es la familia que funciona.
//   · hd.php / canal.php (variante de evento, no la de canales fijos de
//     arriba) → iframe interno /6.php → *.fubo18.com, que RECHAZA la
//     conexión segura (TLS) desde esta red — no hay stream que ofrecer ahí.
// No se adivina cuál es cuál por el nombre: se sigue la cadena real de
// iframes hasta encontrar un .m3u8 o hasta agotar los saltos, y si no
// aparece ninguno se devuelve la lista vacía — nunca un stream inventado.
const _MAX_SALTOS = 4;

async function _seguirHastaM3u8(
  url: string,
  referer: string,
  saltos = _MAX_SALTOS,
): Promise<{ url: string; referer: string } | null> {
  if (saltos <= 0) return null;
  let html: string;
  try {
    html = await _get(url, referer);
  } catch {
    return null;
  }
  const m3u8 = /https?:\/\/[^'"<>\s]+\.m3u8[^'"<>\s]*/.exec(html);
  if (m3u8) {
    // ── No alcanza con ENCONTRAR el texto de la URL — hay que CARGARLA ──
    //
    // Medido en vivo: la familia "1.php/2.php/3.php/plus1.php" (servidor
    // *.ftlly.com) resuelve así de directo. Pero la familia "hd.php" de un
    // evento (servidor *.fubo18.com, distinta de los canales fijos de
    // arriba) rechaza la conexión segura desde esta red — el texto de la
    // URL aparece en la página igual, pegarla sin probarla devolvía un
    // stream que no carga, "nativo" mintiendo. Se pide la URL de verdad y
    // se exige el encabezado real de un m3u8 antes de darla por buena.
    let cuerpo: string;
    try {
      cuerpo = await _get(m3u8[0], url);
    } catch {
      return null;
    }
    if (!cuerpo.trimStart().startsWith('#EXTM3U')) return null;
    return { url: m3u8[0], referer: url };
  }

  const ifr = /<iframe[^>]+src=["']([^"']+)["']/i.exec(html);
  if (!ifr) return null;
  const siguiente = _resolverUrl(ifr[1], url);
  if (!siguiente) return null;
  return _seguirHastaM3u8(siguiente, url, saltos - 1);
}

// ─── URLs a mano ────────────────────────────────────────────────────────────
//
// Sin `new URL(...)`: igual que `Buffer`, no es seguro contar con él en el
// motor de la app — y como estaba dentro de un try que devolvía vacío, su
// falta se hubiera visto como "sin señales" en vez de como un error.
const _ABSOLUTA = /^https?:\/\/[^\s/?#]+/i;

function _resolverUrl(relativa: string, base: string): string | null {
  const r = relativa.trim();
  if (_ABSOLUTA.test(r)) return r;
  const origen = _ABSOLUTA.exec(base);
  if (!origen) return null;
  if (r.startsWith('//')) return base.slice(0, base.indexOf(':') + 1) + r;
  if (r.startsWith('/')) return origen[0] + r;
  const sinQuery = base.split(/[?#]/)[0];
  return sinQuery.slice(0, sinQuery.lastIndexOf('/') + 1) + r;
}

export async function resolveSignal(id: string): Promise<PrismStream[]> {
  let inicial: string;
  try {
    inicial = _fromB64(id).trim();
  } catch {
    return [];
  }
  // Valida que de verdad sea una URL antes de pedirle nada.
  if (!_ABSOLUTA.test(inicial)) return [];

  const resuelto = await _seguirHastaM3u8(inicial, BASE + '/');
  if (!resuelto) return [];

  return [
    {
      url: resuelto.url,
      mimeType: 'application/x-mpegURL',
      headers: { Referer: resuelto.referer },
      // Medido, no supuesto: esta familia (ftlly.com vía /5.php) responde
      // directo sin cabeceras de navegador — el motor nativo la reproduce
      // igual que cualquier HLS común. Ver el comentario largo de arriba.
      nativo: true,
    },
  ];
}

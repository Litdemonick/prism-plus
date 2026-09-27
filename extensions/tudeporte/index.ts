import type { PrismLiveEvent, PrismLiveChannel, PrismLiveSignal, PrismStream } from '../../sdk/types';

// sendMessage("request", ...) usa el dio de PrismHub (con UA, cookies y
// redirecciones), a diferencia de fetch() que usa http.Client básico.
declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://tudeporte.lat';
// La agenda sale de un JSON propio del sitio (lo consume su página
// "multiscreen" por fetch) — más liviano y estable que scrapear HTML.
const AGENDA_URL = BASE + '/agenda.json';

async function _get(
  url: string,
  referer = BASE + '/',
  extra: Record<string, string> = {},
): Promise<string> {
  return sendMessage(
    'request',
    JSON.stringify([url, { method: 'get', headers: { Referer: referer, ...extra } }]),
  );
}

// Base64 con CryptoJS — el motor de PrismHub (QuickJS) no tiene `Buffer` ni
// `atob`/`btoa`, pero SÍ inyecta CryptoJS en tiempo de ejecución apenas el
// bundle lo nombra (ver sdk/crypto.ts).
function _b64(s: string): string {
  return CryptoJS.enc.Utf8.parse(s).toString(CryptoJS.enc.Base64);
}

function _fromB64(s: string): string {
  return CryptoJS.enc.Base64.parse(s).toString(CryptoJS.enc.Utf8);
}

// Sin `new URL(...)` — no es seguro contar con él en el motor de la app.
const _ABSOLUTA = /^https?:\/\/[^\s/?#]+/i;

function _origen(url: string): string {
  const m = _ABSOLUTA.exec(url);
  return m ? m[0] + '/' : url;
}

// ─── Este sitio no tiene canales fijos 24/7 ─────────────────────────────────
//
// Todo lo que ofrece es la agenda de partidos del día (ver schedule) — a
// diferencia de Fútbol Libre, que además tiene un puñado de canales que
// transmiten siempre. Devolver vacío es lo correcto, no un hueco sin llenar.
export async function channels(): Promise<PrismLiveChannel[]> {
  return [];
}

// ─── Agenda ──────────────────────────────────────────────────────────────────
//
// Cache CHICA Y CORTA (una sola entrada, 90s) — mismo criterio que Fútbol
// Libre: la Zona En vivo puede refrescar seguido mientras el usuario la
// mira, y la agenda no cambia de un segundo a otro.
let _cacheAgenda: { hasta: number; eventos: PrismLiveEvent[] } | null = null;
const _AGENDA_TTL_MS = 90_000;

interface _Entrada {
  category: string;
  link: string;
  title: string;
  time: string;
  status: string;
  date: string;
}

// El `link` de cada entrada es SIEMPRE un wrapper propio del sitio
// ("/iframe.html?iframe=<url>") o de uno de sus partners
// ("tarjetarojita.xyz/sw3.html?get=<url>") — medido en vivo: los dos son
// páginas ESTÁTICAS que solo hacen `iframe.src = decodeURIComponent(param)`,
// sin nada que el servidor resuelva. Se salta esa página por completo y se
// va directo al objetivo real que ya viene en el parámetro.
function _objetivoDe(link: string): string | null {
  const m = /[?&](?:iframe|get)=([^&]+)/.exec(link);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

export async function schedule(): Promise<PrismLiveEvent[]> {
  const ahora = Date.now();
  if (_cacheAgenda && _cacheAgenda.hasta > ahora) return _cacheAgenda.eventos;

  const cruda = await _get(AGENDA_URL);
  const lista = JSON.parse(cruda) as _Entrada[];

  // La API repite el mismo partido una vez POR SEÑAL (una entrada por cada
  // canal/proveedor que lo transmite) — se agrupan en UN evento con varias
  // señales, mismo criterio que ya usa el selector de señales del
  // reproductor para elegir/saltar entre ellas.
  const grupos = new Map<string, { entrada: _Entrada; signals: PrismLiveSignal[] }>();
  for (const e of lista) {
    const objetivo = _objetivoDe(e.link);
    if (!objetivo) continue;
    const clave = `${e.category}|${e.title}|${e.date}|${e.time}`;
    let g = grupos.get(clave);
    if (!g) {
      g = { entrada: e, signals: [] };
      grupos.set(clave, g);
    }
    g.signals.push({
      id: _b64(objetivo),
      label: `Señal ${g.signals.length + 1}`,
    });
  }

  const eventos: PrismLiveEvent[] = [];
  for (const { entrada: e, signals } of grupos.values()) {
    if (signals.length === 0) continue;
    // Hora del sitio: America/Bogota (UTC-5, sin horario de verano) —
    // medido en el propio JS de su página "multiscreen"
    // (convertirHoraAZonaLocal usa ese huso para pasarla a la del usuario).
    const startsAt = `${e.date}T${e.time}:00-05:00`;
    const categoria = e.category.trim();
    eventos.push({
      id: _b64(`${categoria}|${e.title}|${e.date}|${e.time}`).slice(0, 32),
      title: e.title.trim(),
      league: categoria || undefined,
      startsAt,
      signals,
    });
  }

  _cacheAgenda = { hasta: ahora + _AGENDA_TTL_MS, eventos };
  return eventos;
}

// ─── Resolución de señales ──────────────────────────────────────────────────
//
// Medido en vivo (2026-09-26): la agenda reparte los partidos entre CINCO
// dominios de "reproductor", cada uno con su propia forma. Tres se pudieron
// resolver de punta a punta; los otros dos quedan afuera (no es adivinar,
// es que no hay stream verificable):
//
//   · streamx305.sbs      → un array `yK` de [índice, base64] + dos
//     funciones que devuelven un número cada una. Cada trozo, decodificado
//     de base64, da una cadena de dígitos; a ese número se le resta la suma
//     de las dos funciones y el resultado es el código de UN carácter de la
//     URL final — ordenados por índice arman el .m3u8 entero.
//   · streamtp-golden1.click → el más simple: `playbackURL = "..."` ya en
//     texto plano dentro del script.
//   · la18hd.su           → un .m3u8 suelto en el HTML, sin nada que
//     decodificar (igual que los dos de arriba, se exige el contenido real
//     antes de darlo por bueno — ver más abajo).
//   · streamtp99a.sbs     → reproductor Bitmovin con un empaquetador de
//     JavaScript propio (funciones que arman la URL letra por letra con
//     rotaciones dependientes de la posición). No es un caso de "falta
//     probar", es una ofuscación de otra familia entera — se deja afuera en
//     vez de adivinar un algoritmo que puede cambiar de un día para otro.
//   · tarjetarojita.xyz   → encadena a un cuarto sitio (lunchup.net) que
//     rechaza la petición (403) aun con el Referer correcto — no hay forma
//     de seguir sin credenciales que esta extensión no tiene.
//
// Como cada partido puede traer señales de varios de estos dominios (ver
// schedule), un partido con una señal "no resoluble" simplemente sigue
// teniendo las demás — el reproductor ya sabe saltar de una señal a la
// siguiente cuando una no entrega nada.
//
// Todas las páginas de reproductor exigen la cabecera `Sec-Fetch-Dest:
// iframe` — sin ella devuelven un 403 "Access Restricted" explícito,
// pidiendo justamente eso.

function _playbackDirecto(html: string): string | null {
  const m = /playbackURL\s*=\s*"([^"]+)"/.exec(html);
  return m ? m[1].replace(/\\\//g, '/') : null;
}

function _playbackOfuscado(html: string): string | null {
  // El nombre del array y el de las dos funciones cambian en CADA respuesta
  // (medido: "yK"/"KBNlW"/"BUwYa" en una, "rq"/"sDZuW"/"nvDXw" en otra) — la
  // estructura es la única parte estable. Se encuentra el array por lo que
  // HACE (el `.forEach` que arma `playbackURL` con `atob`+`fromCharCode`),
  // no por cómo se llama.
  const forEachRef = /(\w+)\.forEach\(e=>\{[\s\S]{0,200}?fromCharCode/.exec(html);
  const kRef = /var\s+k\s*=\s*(\w+)\(\)\s*\+\s*(\w+)\(\)/.exec(html);
  if (!forEachRef || !kRef) return null;

  const arrayMatch = new RegExp(
    forEachRef[1] + '\\s*=\\s*(\\[\\[[\\s\\S]*?\\]\\])\\s*;',
  ).exec(html);
  if (!arrayMatch) return null;

  const numeroDe = (nombre: string): number | null => {
    const m = new RegExp(
      'function\\s+' + nombre + '\\s*\\(\\)\\s*\\{\\s*return\\s+(\\d+)',
    ).exec(html);
    return m ? parseInt(m[1], 10) : null;
  };
  const n1 = numeroDe(kRef[1]);
  const n2 = numeroDe(kRef[2]);
  if (n1 === null || n2 === null) return null;
  const k = n1 + n2;

  let pares: [number, string][];
  try {
    pares = JSON.parse(arrayMatch[1]);
  } catch {
    return null;
  }
  pares.sort((a, b) => a[0] - b[0]);

  let url = '';
  for (const [, v] of pares) {
    const digitos = _fromB64(v).replace(/\D/g, '');
    if (!digitos) return null;
    url += String.fromCharCode(parseInt(digitos, 10) - k);
  }
  return url || null;
}

function _m3u8Suelto(html: string): string | null {
  const m = /https?:\/\/[^'"<>\s]+\.m3u8[^'"<>\s]*/.exec(html);
  return m ? m[0] : null;
}

export async function resolveSignal(id: string): Promise<PrismStream[]> {
  let objetivo: string;
  try {
    objetivo = _fromB64(id).trim();
  } catch {
    return [];
  }
  if (!_ABSOLUTA.test(objetivo)) return [];

  let html: string;
  try {
    html = await _get(objetivo, BASE + '/', { 'Sec-Fetch-Dest': 'iframe' });
  } catch {
    return [];
  }

  const m3u8 = _playbackDirecto(html) ?? _playbackOfuscado(html) ?? _m3u8Suelto(html);
  if (!m3u8) return [];

  // No alcanza con ENCONTRAR el texto de la URL — hay que cargarla. Un
  // dominio caído o con TLS rechazado deja el texto en la página igual, y
  // sin esta comprobación "nativo" mentiría (medido con la18hd.su/fubo18,
  // que responde así).
  let cuerpo: string;
  try {
    cuerpo = await _get(m3u8, _origen(objetivo));
  } catch {
    return [];
  }
  if (!cuerpo.trimStart().startsWith('#EXTM3U')) return [];

  return [
    {
      url: m3u8,
      mimeType: 'application/x-mpegURL',
      headers: { Referer: _origen(objetivo) },
      nativo: true,
    },
  ];
}

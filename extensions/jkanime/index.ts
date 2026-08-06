import { matchFirst, matchGroups, stripTags, decodeEntities } from '../../sdk/html';
import { fichaDe, resolverServidor, resolverReproductorPropio } from './servidores';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream } from '../../sdk/types';

// sendMessage("request", ...) usa el dio de PrismHub (con UA, cookies y redirecciones),
// a diferencia de fetch() que usa http.Client básico.
declare function sendMessage(channel: string, data: string): Promise<string>;

async function _get(url: string, headers: Record<string, string> = {}): Promise<string> {
  const raw = await sendMessage('request', JSON.stringify([url, { method: 'get', headers }]));
  try { return JSON.parse(raw); } catch { return raw; }
}

async function _post<T>(url: string, token: string): Promise<T> {
  const raw = await sendMessage('request', JSON.stringify([url, {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json',
    },
    data: '_token=' + encodeURIComponent(token),
  }]));
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as T; } catch (e) {
      throw e;
    }
  }
  return raw as T;
}

interface _EpItem { id: number; number: number; title: string; }
interface _EpPage { data: _EpItem[]; last_page: number; total: number; current_page?: number; }

// ─── JKAnime ──────────────────────────────────────────────────────────────────
const BASE = 'https://jkanime.net';

interface JKServer {
  remote: string | null;
  server: string;
  lang: number;   // 0=SUB, 1=LAT, 2=CAST
  slug: string;
}

// Dedup solo para search (evita el mismo resultado en páginas distintas).
// latest() NO usa dedup inter-página: cada página contiene el mismo anime con
// diferente episodio — filtrarlos vaciaría páginas 2, 3... dando "no hay datos".
const _searchSeen = new Map<string, Set<string>>();

interface JKDirectoryItem {
  title: string;
  slug: string;
  image: string;
}

interface JKDirectoryPage {
  current_page: number;
  last_page: number;
  data: JKDirectoryItem[];
}

// /directorio parece client-side (MixItUp/Vue) a simple vista — el <body>
// no trae cards armadas — pero en realidad SÍ es server-rendered: la data
// completa de la página viaja como `var animes = {JSON de paginación
// Laravel};` en un <script> inline, y un jQuery.each() la vuelca al DOM
// recién en el browser. Como el HTML crudo YA trae el JSON, no hace falta
// ejecutar ese JS — se parsea directo. Confirmado en vivo: 162 páginas
// reales de 30 c/u (4832 animes), cada página con contenido distinto.
// El corte en `};\r?\n` (no solo `};`) evita terminar el match antes de
// tiempo si una sinopsis contuviera "};" de casualidad.
function _parseDirectoryPage(html: string): JKDirectoryPage | null {
  const m = /var animes = (\{[\s\S]*?\});\r?\n/.exec(html);
  if (!m) return null;
  try { return JSON.parse(m[1]) as JKDirectoryPage; } catch { return null; }
}

// /directorio trae 9 selects reales — confirmados en vivo, uno por uno,
// contra el sitio (no solo mirando el <select>, varios vienen vacíos en el
// HTML crudo — genero/demografia/categoria/tipo/estado/orden SÍ traen
// opciones estáticas, pero letra y fecha quedan en blanco ahí y solo se
// llenan con JS del lado del sitio — igual el parámetro funciona pasado
// directo por query, probado con letra=a y fecha=2020).
// URLSearchParams no existe en el QuickJS de PrismHub — arma la query a mano.
function _directorioQuery(page: number, filter?: Record<string, string[]>): string {
  const f = filter ?? {};
  const parts = [`p=${page}`];
  const add = (key: string) => {
    const v = f[key]?.[0];
    if (v) parts.push(`${key}=${encodeURIComponent(v)}`);
  };
  add('filtro');
  add('orden');
  add('genero');
  add('demografia');
  add('categoria');
  add('tipo');
  add('estado');
  add('letra');
  add('fecha');
  add('temporada');
  return parts.join('&');
}

export async function latest(
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const html = await _get(`${BASE}/directorio?${_directorioQuery(page, filter)}`);
  const dir = _parseDirectoryPage(html);
  if (!dir || page > dir.last_page) return [];
  return dir.data.map(a => ({
    title: decodeEntities(a.title),
    url: a.slug,
    cover: a.image,
  }));
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const kw = keyword.trim();
  // Sin palabra clave: usar el directorio filtrable (mismo endpoint que
  // latest(), pero con los filtros aplicados).
  if (!kw) return latest(page, filter);

  // /buscar NO soporta estos filtros — confirmado en vivo: la misma
  // búsqueda con y sin "genero" en la query devuelve exactamente el mismo
  // HTML (mismo tamaño en bytes). Se ignoran acá a propósito en vez de
  // fingir que funcionan.
  if (page === 1) _searchSeen.delete(keyword);
  if (!_searchSeen.has(keyword)) _searchSeen.set(keyword, new Set());
  const seen = _searchSeen.get(keyword)!;
  const html = await _get(`${BASE}/buscar/${encodeURIComponent(keyword)}/?page=${page}`);
  const cards = _parseCards(html);
  const fresh = cards.filter(c => !seen.has(c.url));
  fresh.forEach(c => seen.add(c.url));
  return fresh;
}

// Géneros reales (46) confirmados desde el <select name="genero"> del sitio.
const _GENRES: Record<string, string> = {
  '': 'Todos',
  accion: 'Acción', aventura: 'Aventura', autos: 'Autos', comedia: 'Comedia',
  dementia: 'Dementia', demonios: 'Demonios', misterio: 'Misterio', drama: 'Drama',
  ecchi: 'Ecchi', fantasia: 'Fantasía', juegos: 'Juegos', hentai: 'Hentai',
  historico: 'Histórico', terror: 'Terror', 'nios': 'Niños', magia: 'Magia',
  'artes-marciales': 'Artes Marciales', mecha: 'Mecha', musica: 'Música',
  parodia: 'Parodia', samurai: 'Samurai', romance: 'Romance', colegial: 'Colegial',
  'sci-fi': 'Sci-Fi', shoujo: 'Shoujo', 'shoujo-ai': 'Shoujo Ai', shounen: 'Shounen',
  'shounen-ai': 'Shounen Ai', space: 'Space', deportes: 'Deportes',
  'super-poderes': 'Super Poderes', vampiros: 'Vampiros', yaoi: 'Yaoi', yuri: 'Yuri',
  harem: 'Harem', 'cosas-de-la-vida': 'Cosas de la vida', sobrenatural: 'Sobrenatural',
  militar: 'Militar', policial: 'Policial', psicologico: 'Psicológico',
  thriller: 'Thriller', seinen: 'Seinen', josei: 'Josei', latino: 'Español Latino',
  isekai: 'Isekai',
};

// Genera A-Z para "letra" — el <select> del sitio queda vacío en el HTML
// crudo (se llena con JS propio), pero el parámetro sí funciona pasado
// directo (confirmado en vivo con letra=a).
const _LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    filtro: {
      title: 'Ordenar por',
      options: { '': 'Fecha', nombre: 'Nombre', popularidad: 'Popularidad' },
      default: '',
      min: 1,
      max: 1,
    },
    orden: {
      title: 'Dirección',
      options: { '': 'Descendente', asc: 'Ascendente' },
      default: '',
      min: 1,
      max: 1,
    },
    tipo: {
      title: 'Tipo',
      options: {
        '': 'Todos',
        animes: 'Animes',
        peliculas: 'Películas',
        especiales: 'Especiales',
        ovas: 'Ovas',
        onas: 'Onas',
      },
      default: '',
      min: 1,
      max: 1,
    },
    estado: {
      title: 'Estado',
      options: {
        '': 'Todos',
        emision: 'En emisión',
        finalizados: 'Finalizado',
        estrenos: 'Por estrenar',
      },
      default: '',
      min: 1,
      max: 1,
    },
    categoria: {
      title: 'Categoría',
      options: { '': 'Todas', donghua: 'Donghua', latino: 'Latino' },
      default: '',
      min: 1,
      max: 1,
    },
    demografia: {
      title: 'Demografía',
      options: {
        '': 'Todas',
        'nios': 'Niños',
        shoujo: 'Shoujo',
        shounen: 'Shounen',
        seinen: 'Seinen',
        josei: 'Josei',
      },
      default: '',
      min: 1,
      max: 1,
    },
    genero: {
      title: 'Género',
      options: _GENRES,
      default: '',
      min: 1,
      max: 1,
    },
    letra: {
      title: 'Letra',
      options: { '': 'Todas', ..._LETTERS.reduce((acc, l) => ({ ...acc, [l]: l.toUpperCase() }), {}) },
      default: '',
      min: 1,
      max: 1,
    },
    fecha: {
      title: 'Año',
      options: { '': 'Todos', ..._DIRECTORIO_YEARS.reduce((acc, y) => ({ ...acc, [y]: y }), {}) },
      default: '',
      min: 1,
      max: 1,
    },
    // Ojo: los valores reales del <select name="temporada"> de /directorio
    // van en minúscula (invierno/primavera/verano/otoño) — confirmado en
    // vivo que "Invierno" (mayúscula, como usa /top más abajo) es IGNORADO
    // silenciosamente por este endpoint (misma cantidad de resultados que
    // sin filtro), mientras que "invierno" sí filtra correctamente.
    temporada: {
      title: 'Temporada',
      options: {
        '': 'Todas',
        invierno: 'Invierno',
        primavera: 'Primavera',
        verano: 'Verano',
        'otoño': 'Otoño',
      },
      default: '',
      min: 1,
      max: 1,
    },
  };
}

// <select name="fecha"> real de /directorio confirmado en vivo: 2026 hasta
// 1981 (no 2000 — un tope inventado que se había puesto por error acá).
const _DIRECTORIO_YEARS = Array.from({ length: 2026 - 1981 + 1 }, (_, i) => String(2026 - i));

// ─── Top animes (/top) — filtros reales confirmados en vivo: form GET con
// selects temporada (Primavera/Verano/Otoño/Invierno/"" = Top general) y
// fecha (año 2000-2026). Ambos combinables en la misma URL. Nota: /top usa
// temporada en MAYÚSCULA — es un endpoint distinto de /directorio con su
// propio casing, no unificar los dos _YEARS/temporada sin volver a probar
// en vivo cada uno por separado.
const _TOP_YEARS = Array.from({ length: 2026 - 2000 + 1 }, (_, i) => String(2026 - i));

export async function createTopFilter(): Promise<Record<string, unknown>> {
  return {
    temporada: {
      title: 'Temporada',
      options: {
        '': 'Top general',
        Primavera: 'Primavera',
        Verano: 'Verano',
        Otoño: 'Otoño',
        Invierno: 'Invierno',
      },
      default: '',
      min: 1,
      max: 1,
    },
    fecha: {
      title: 'Año',
      options: { '': 'Todos', ..._TOP_YEARS.reduce((acc, y) => ({ ...acc, [y]: y }), {}) },
      default: '',
      min: 1,
      max: 1,
    },
  };
}

export async function top(
  filter?: Record<string, string[]>,
  _page?: number,
): Promise<PrismItem[]> {
  const temporada = filter?.['temporada']?.[0] ?? '';
  const fecha = filter?.['fecha']?.[0] ?? '';
  // URLSearchParams no existe en el QuickJS de PrismHub — arma la query a
  // mano (confirmado en vivo: "ReferenceError: 'URLSearchParams' is not
  // defined" apenas se ejercita este código con un filtro puesto).
  const parts: string[] = [];
  if (temporada) parts.push(`temporada=${encodeURIComponent(temporada)}`);
  if (fecha) parts.push(`fecha=${encodeURIComponent(fecha)}`);
  const qs = parts.join('&');
  const html = await _get(`${BASE}/top${qs ? '?' + qs : ''}`);
  return _parseTopCards(html);
}

// Estructura confirmada en vivo (jkanime.net/top):
// <div class="col toplist mb-4"><div class="card">
//   <a href="https://jkanime.net/SLUG/"><div class="card-img">
//     <img class="card-img-top" src="COVER" alt="TITLE"></div>
//   <div class="card-badge"><i class="ti ti-thumb-up"></i> VOTOS</div>
//   <div class="card-body"><div data-rank="N" class="ranking">...
//   <h5 class="card-title">TITLE</h5>...
function _parseTopCards(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  const blocks = html.split('class="col toplist mb-4"').slice(1);
  for (const block of blocks) {
    const hrefM = /<a\s+href="https?:\/\/jkanime\.net\/([a-z0-9-]+)\/"/i.exec(block);
    if (!hrefM) continue;
    const coverM = /class="card-img-top"\s+src="([^"]+)"/i.exec(block);
    const votesM = /class="card-badge">[\s\S]{0,40}?<\/i>\s*([\d.,]+)/i.exec(block);
    const titleM = /class="card-title">([^<]+)<\/h5>/i.exec(block);
    if (!titleM) continue;
    items.push({
      title: decodeEntities(titleM[1].trim()),
      url: hrefM[1],
      cover: coverM ? coverM[1] : undefined,
      update: votesM ? `👍 ${votesM[1]}` : undefined,
    });
  }
  return items;
}

export async function detail(url: string): Promise<PrismDetail> {
  const slug = _toSlug(url);
  const html = await _get(`${BASE}/${slug}/`);

  // Ninguna página de jkanime trae <h1> (confirmado en vivo en varios
  // animes) — siempre cae al <title>, que viene con el nombre duplicado y
  // relleno SEO: "{título} - anime {título} online JkAnime". Cortar antes
  // de " - anime " da el nombre limpio; sin eso, el título completo con
  // basura terminaba mostrándose en toda la app (header, botón continuar, etc).
  const title =
    matchFirst(html, /<h1[^>]*>([^<]+)<\/h1>/i) ||
    matchFirst(html, /<title>\s*([^<]*?)\s*-\s*anime\s/i) ||
    matchFirst(html, /<title>([^|<]+)/i) ||
    slug;

  const cover =
    matchFirst(html, /property="og:image"\s+content="([^"]+)"/i) ||
    matchFirst(html, /class="card-img-top"\s+src="([^"]+)"/i) || '';

  const description = stripTags(
    matchFirst(html, /class="[^"]*sinopsis[^"]*"[^>]*>([\s\S]*?)<\/(?:div|p)>/i) ||
    matchFirst(html, /class="[^"]*descripci[^"]*"[^>]*>([\s\S]*?)<\/(?:div|p)>/i) || ''
  ).trim();

  // data-anime y csrf-token para la API de episodios — múltiples patrones
  const animeId =
    matchFirst(html, /data-anime="(\d+)"/i) ||
    matchFirst(html, /data-id="(\d+)"/i) ||
    matchFirst(html, /"anime_id"\s*:\s*(\d+)/i) ||
    matchFirst(html, /animeId\s*=\s*(\d+)/i);

  const token =
    matchFirst(html, /name="csrf-token"\s+content="([^"]+)"/i) ||
    matchFirst(html, /content="([^"]+)"\s+name="csrf-token"/i) ||
    matchFirst(html, /"csrf[_-]token"\s*:\s*"([^"]+)"/i);

  const episodes: PrismEpisode[] = [];

  if (animeId && token) {
    const allEps: _EpItem[] = [];
    let lastPage = 1;
    let first: _EpPage | null = null;

    // Página 1 primero — para obtener last_page
    try {
      first = await _post<_EpPage>(`${BASE}/ajax/episodes/${animeId}/1`, token);
      if (first && Array.isArray(first.data)) {
        allEps.push(...first.data);
        lastPage = first.last_page || 1;
      }
    } catch {}

    // La API pagina de a 16 fijos (per_page=16 del lado del servidor: probado,
    // ignora ?per_page=/&limit=), así que un anime largo salía carísimo —
    // One Piece son 74 páginas = 75 pedidos, y el puente JS de PrismHub los
    // procesa de a uno, así que abrir su detalle se sentía eterno.
    //
    // Atajo: la respuesta ya trae `total`, las URLs de episodio son solo
    // `slug/número` y los títulos son mecánicos ("One Piece - 625"), así que
    // si la numeración es la corrida 1..total se puede armar la lista entera
    // sin bajar el resto de las páginas.
    //
    // Pero eso NO se asume: cada anime/extensión es distinto (especiales,
    // numeración con 0, huecos, recopilatorios), así que se VERIFICA pidiendo
    // solo la última página y comprobando que la aritmética cierre exacta —
    // la primera página tiene que ser 1..n y la última tiene que arrancar
    // justo donde corresponde y terminar en `total`. Si algo no cuadra, se
    // cae al camino completo de siempre (bajar todas las páginas), así que
    // un anime con numeración rara sigue saliendo bien, solo sin el atajo.
    const perPage = first?.data?.length ?? 0;
    const total = first?.total ?? 0;
    let shortcutEps: _EpItem[] | null = null;

    if (first && lastPage > 2 && perPage > 0 && total > perPage) {
      try {
        const last = await _post<_EpPage>(
          `${BASE}/ajax/episodes/${animeId}/${lastPage}`,
          token,
        );
        const lastData = last?.data ?? [];
        const expectedLastStart = (lastPage - 1) * perPage + 1;
        const firstIsSequential = first.data.every((e, i) => e.number === i + 1);
        const lastIsSequential = lastData.every(
          (e, i) => e.number === expectedLastStart + i,
        );
        const countsMatch = expectedLastStart - 1 + lastData.length === total;

        if (lastData.length && firstIsSequential && lastIsSequential && countsMatch) {
          // Prefijo real tomado de un título de verdad (le saco el número del
          // final) — así los generados quedan igual que los que manda el
          // sitio, en vez de inventar un formato distinto.
          const sample = lastData[lastData.length - 1];
          const prefix = sample.title.replace(/\s*\d+\s*$/, '');
          const byNumber: Record<number, _EpItem> = {};
          for (const e of [...first.data, ...lastData]) byNumber[e.number] = e;
          shortcutEps = [];
          for (let n = 1; n <= total; n++) {
            const real = byNumber[n];
            shortcutEps.push(
              real ?? { id: n, number: n, title: `${prefix} ${n}`.trim() },
            );
          }
        }
      } catch {}
    }

    if (shortcutEps) {
      allEps.length = 0;
      allEps.push(...shortcutEps);
    } else if (lastPage > 1) {
      // Camino completo (o el atajo no validó): páginas restantes en paralelo
      // (batches de 10 para no saturar).
      const remaining = Array.from({ length: lastPage - 1 }, (_, i) => i + 2);
      const BATCH = 10;
      for (let i = 0; i < remaining.length; i += BATCH) {
        const batch = remaining.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map(p =>
            _post<_EpPage>(`${BASE}/ajax/episodes/${animeId}/${p}`, token)
              .catch(() => null),
          ),
        );
        for (const res of results) {
          if (res && Array.isArray(res.data)) allEps.push(...res.data);
        }
      }
    }

    const seenNumbers: Record<number, boolean> = {};
    for (const ep of allEps) {
      if (seenNumbers[ep.number]) continue;
      seenNumbers[ep.number] = true;
      episodes.push({ title: ep.title, url: `${slug}/${ep.number}`, number: ep.number });
    }
    episodes.sort((a, b) => (a.number || 0) - (b.number || 0));
  }

  const genres = matchGroups(
    html,
    /<a[^>]+href="[^"]*\/genero\/[^"]*"[^>]*>([^<]+)<\/a>/gi,
  ).map(g => g[0]);

  // Estado de emisión — el sitio lo pone como
  // <li><span>Estado:</span> <div class="enemision finished">Concluido</div></li>
  // (confirmado en vivo). Se lee el TEXTO, no la clase: la clase mezcla
  // "enemision" y "finished" en el mismo div aun estando concluido, así que
  // matchear por clase daría el estado al revés.
  const statusText = (
    matchFirst(html, /Estado:\s*<\/span>\s*<div[^>]*>([^<]+)<\/div>/i) || ''
  ).toLowerCase();
  const status: PrismDetail['status'] =
    statusText.includes('concluido') || statusText.includes('finalizado')
      ? 'completed'
      : statusText.includes('emision') || statusText.includes('emisión')
      ? 'ongoing'
      : statusText.includes('proximamente') || statusText.includes('próximamente')
      ? 'upcoming'
      : undefined;

  return { title, cover, description, episodes, genres, status };
}

type PrismEpisode = { title: string; url: string; number?: number };

// Servidores que solo funcionan con JS en el browser — dio nunca puede extraer su stream.
// Para estos, saltamos directo al WebView sniffer sin perder tiempo con HTTP scraping.
// OJO: streamwish/sfastwish/wishfast/swdyu se sacaron de esta lista —
// confirmado en vivo con curl que _resolveStreamwishDio() (ya existía, con
// API + fallback de desempaquetado del embed) SÍ funciona: el endpoint de
// API da 403 de Cloudflare, pero la página del embed en sí no está
// bloqueada y trae el eval(p,a,c,k) empaquetado con la URL real del m3u8.
// Esta lista los excluía sin haberlo probado nunca de verdad.
// voe.sx/voe. también se sacaron: _resolveVoeDio() funciona (verificado con
// curl, direct_access_url real y reproducible).
// vidhide y mixdrop también se sacaron, y por lo mismo: nunca se habían
// probado. Medidos en vivo contra el bundle ya compilado:
//   vidhide  → 3 de 3 intentos dan la lista HLS real (master.m3u8 en
//              acek-cdn.com, 200 application/vnd.apple.mpegurl)
//   mixdrop  → 206 video/mp4, el archivo entero
// Los dos reproducen nativo perfectamente y estaban sin botón.
const _JS_ONLY_HOSTS = [
  'filelions',
  'filemoon', 'moonplayer',
];

// URLs internas de jkanime que son embeds propios (desu, magi, desuka, etc.),
// no URLs de episodio. Se detectan por el path después del dominio.
function _isJkInternalEmbed(url: string): boolean {
  if (url.indexOf('jkanime.net') === -1) return false;
  // URLs de episodio tienen formato: /anime-slug/numero/
  // URLs de embed propio tienen paths como /desu/hash, /magi/hash, /desuka/hash, etc.
  const path = url.replace(/^https?:\/\/jkanime\.net/, '').replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean);
  // Episodio: partes[0]=slug, partes[1]=numero → segundo segmento es número
  if (parts.length === 2 && /^\d+$/.test(parts[1])) return false;
  // Si el primer segmento es un nombre de servidor conocido → embed interno
  const knownEmbeds = ['desu', 'magi', 'desuka', 'embed', 'player', 'desudesuka'];
  return knownEmbeds.some(e => parts[0] === e || url.indexOf('desudesuka') !== -1);
}

// ─── Timeout de resolución ─────────────────────────────────────────────────────
// Evita que un solo servidor lento (LAT/CAST con host caído, DNS lento, etc.)
// retrase toda la respuesta de watch(): si no resuelve a tiempo, se usa el
// fallback (URL cruda sin resolver) para que el WebView sniffer pueda intentarlo.

const _SERVER_TIMEOUT = 6_000;

async function _withTimeout<T>(promise: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>(resolve => {
    timer = setTimeout(() => resolve(fallback()), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Fallback síncrono de _resolveServer: sólo calcula la URL cruda + etiqueta,
// sin intentar ningún resolver de red. Se usa cuando el resolver real tarda
// más de _SERVER_TIMEOUT.
function _rawServerStream(server: JKServer): PrismStream | null {
  let raw = '';
  if (server.remote) {
    try { raw = _b64decode(server.remote); } catch { raw = ''; }
  }
  if (!raw && server.slug) {
    raw = server.slug.indexOf('http') === 0 ? server.slug : `${BASE}${server.slug}`;
  }
  if (!raw) return null;
  raw = _resolveRedirect(raw);
  const name = server.server || 'Embed';
  const langSuffix = server.lang === 1 ? ' LAT' : server.lang === 2 ? ' CAST' : '';
  // El rayo/mundo sale de la tabla de `servidores/`, que es donde está lo que se
  // midió de cada uno. Los de _JS_ONLY_HOSTS van al navegador sí o sí: esta
  // extensión ya los manda derecho al sniffer sin intentar resolverlos.
  const soloConJs = _JS_ONLY_HOSTS.some((h) => raw.toLowerCase().indexOf(h) !== -1);
  return {
    url: raw,
    quality: `${name}${langSuffix}`,
    nativo: soloConJs ? false : fichaDe(raw)?.nativo,
  };
}

export async function watch(url: string): Promise<PrismWatch> {
  // Fast-path A: embed URL externo (dominio != jkanime.net)
  if (url.indexOf('http') === 0 && url.indexOf('jkanime.net') === -1) {
    const uLow = url.toLowerCase();
    // Para servidores JS-only, ir directo al WebView sniffer sin intentar dio
    const isJsOnly = _JS_ONLY_HOSTS.some(h => uLow.indexOf(h) !== -1);
    if (!isJsOnly) {
      const name = _guessServerName(url);
      const stream = await _resolveEmbedDio(name, url, `${BASE}/`);
      if (stream) return { streams: [stream], pageUrl: '' };
    }
    // No se pudo resolver con dio (o es JS-only) → dejar que el WebView sniffer lo intente
    return { streams: [], pageUrl: url };
  }

  // Fast-path B: embed interno de jkanime (desu/magi/desuka) — NO es URL de episodio
  if (_isJkInternalEmbed(url)) {
    const uLow = url.toLowerCase();
    const isDesu = uLow.indexOf('/desu') !== -1 || uLow.indexOf('desudesuka') !== -1;
    const isMagi = uLow.indexOf('/magi') !== -1;
    // Los dos salen de la tabla: sus fichas se reconocen justamente por el
    // nombre en el path (/desu/, /magi/), que es el formato viejo.
    if (isDesu || isMagi) {
      const res = await resolverServidor(url, `${BASE}/`);
      if (res && res.url) {
        return {
          streams: [
            { url: res.url, quality: isDesu ? 'Desu' : 'Magi', headers: res.headers, nativo: true },
          ],
          pageUrl: '',
        };
      }
    }
    return { streams: [], pageUrl: url };
  }

  const episodeUrl =
    url.indexOf('http') === 0
      ? url
      : `${BASE}/${url.replace(/\/+$/, '')}/`;

  const html = await _get(episodeUrl);

  // Servidores SUB propios de JKAnime (Desu/Magi) — nunca viven en el array
  // `servers` de abajo, así que se resuelven aparte y siempre se intentan,
  // pase lo que pase con ese array (incluso si no existe o viene vacío).
  const subEntries = _parseJkSubServers(html);
  // Desu siempre primero: es el servidor default del propio sitio y el más
  // confiable — garantiza que sea streams[0] (X-Primary-Server) sin depender
  // del orden en que la página lo liste.
  subEntries.sort((a, b) => {
    const aDesu = a.name.toLowerCase() === 'desu' ? 0 : 1;
    const bDesu = b.name.toLowerCase() === 'desu' ? 0 : 1;
    return aDesu - bDesu;
  });
  const subResolved = await Promise.all(
    subEntries.map(e =>
      _withTimeout(
        _resolveJkInternalPlayer(e.iframeSrc, episodeUrl, e.name),
        _SERVER_TIMEOUT,
        () => ({ url: e.iframeSrc, quality: e.name } as PrismStream | null),
      ),
    ),
  );
  const subStreams = subResolved.filter((s): s is PrismStream => s !== null);

  const m =
    /(?:var|let|const)\s+servers\s*=\s*(\[[\s\S]*?\]);/.exec(html) ||
    /(?:var|let|const)\s+video\s*=\s*(\[[\s\S]*?\]);/.exec(html);

  if (!m) {
    return { streams: subStreams, pageUrl: episodeUrl };
  }

  let servers: JKServer[];
  try {
    servers = JSON.parse(m[1]) as JKServer[];
  } catch {
    return { streams: subStreams, pageUrl: episodeUrl };
  }

  if (!Array.isArray(servers) || servers.length === 0) {
    return { streams: subStreams, pageUrl: episodeUrl };
  }

  // SUB primero, luego LAT, luego CAST
  servers.sort((a, b) => (a.lang || 0) - (b.lang || 0));

  // NO resolver estos servidores acá: Desu (arriba) ya es el default y carga
  // solo, así que el resto se deja crudo/sin resolver (sin red, instantáneo)
  // — switchServer() en la app ya pide la resolución real on-demand cuando
  // el usuario elige uno de estos a mano, así que resolverlos acá de nuevo
  // sería trabajo duplicado y lo único que logra es demorar el arranque.
  const resolved = servers
    .map(s => _rawServerStream(s))
    .filter((s): s is PrismStream => s !== null);

  // Mega sigue afuera: cifrado client-side, sin URL interceptable (igual que
  // en animeytx) — ni el resolver ni el reproductor tienen algo real que
  // reproducir.
  //
  // A pedido explícito, el resto de la lista negra histórica (Streamtape,
  // Mp4upload, Mediafire, Streamwish/sfastwish/wishfast/swdyu, Filemoon vía
  // bysekoze.com) VUELVE a la lista de servidores: cada uno tenía un motivo
  // real y confirmado por el que NO reproduce bien en el reproductor NATIVO
  // (buffering que nunca se estabiliza, CDN random a veces roto, etc.), pero
  // ahora que el reproductor WebView (el visible, con su propio player
  // embebido) se reforzó bastante (detección de crash/proceso muerto,
  // reintento automático, mejor manejo de "no se pudo crear el WebView"),
  // vale la pena ofrecerlos igual: si el nativo falla, la app ya cae sola al
  // WebView (ver switchServer/_setServerFailed en video_controller.dart) sin
  // que el usuario tenga que hacer nada más que elegir el servidor. Mp4upload
  // en particular es el caso más claro: el archivo en sí es válido y un
  // navegador lo reproduce sin problema, solo mpv tenía el problema.
  // Filemoon (bysekoze.com) es el más arriesgado de los cinco — se había
  // confirmado en vivo que fallaba TAMBIÉN por WebView en un intento
  // anterior — puede seguir sin andar; si vuelve a fallar así, es candidato
  // a sacarse de nuevo.
  // Los de _JS_ONLY_HOSTS SIGUEN EN LA LISTA. Esa lista solo quiere decir "no
  // pierdas tiempo con dio, andá derecho al WebView", y acá además los estaba
  // BORRANDO: el servidor desaparecía de la app aunque el sitio lo ofreciera, y
  // el usuario se quedaba sin saber si el problema era la app, la red o el
  // episodio. Un botón que abre en WebView es mucho mejor que ningún botón.
  //
  // (Filemoon aparecía igual, pero de casualidad: su URL es bysekoze.com y no
  // contiene la palabra "filemoon", así que se escapaba del filtro.)
  //
  // Mega también vuelve. Cifra todo del lado del navegador, así que nativo NO
  // va a andar nunca y no tiene sentido pelearlo — pero el que lo reproduce es
  // justamente un navegador, y la app tiene uno. Al fallar el nativo,
  // _setServerFailed le pasa la URL del embed a webViewFallback y se abre el
  // reproductor WebView, que con mega.nz funciona. Sacarlo de la lista era
  // quitarle al usuario la única forma que sí tenía de verlo.
  // Mediafire sale de la lista, a pedido del usuario: **no es un servidor de
  // vídeo sino alojamiento de archivos**, y además reportó que cuando abre se ve
  // mal (carga la imagen en vez de reproducir). Que la medición diera 206
  // video/mp4 solo dice que el archivo baja, no que se reproduzca bien.
  //
  // **Mp4upload también sale, a pedido del usuario el 2026-08-06.** Es la
  // segunda excepción a la regla de no sacar botones, y se plantea acá para que
  // quede claro qué se perdió: eran 48 botones y el servidor RESUELVE bien —
  // 206, el archivo es un MP4 sano de 282 MB.
  //
  // Lo que no se pudo arreglar es el caudal. Ese host tarda ~1,5 s en empezar a
  // contestar cada pedido, así que lo que importa no es el ancho de banda sino
  // cuántos pedidos se hacen: leyendo de corrido entrega 1812 KB/s y de a trozos
  // cerrados de 256 KB baja a 171, cuando el archivo necesita 206. Se intentó
  // resolverlo del lado de la app manteniéndole la lectura abierta (ver
  // `bomba_de_datos.dart` en PrismHub), y aun así seguía trabándose en las dos
  // plataformas. El usuario prefirió sacarlo antes que dejar un botón que carga
  // y se atora.
  //
  // Si algún día se quiere volver a intentar, está todo medido: el resolver
  // sigue en `servidores/mp4upload/` con sus números, y el mecanismo de lectura
  // continua sigue en la app esperando que alguien lo declare.
  //
  // El resto sigue en la lista, incluidos los que van al navegador, porque un
  // botón que abre en el navegador es mucho mejor que ningún botón.
  const usable = resolved.filter((s) => {
    const u = (s.url ?? '').toLowerCase();
    return u.indexOf('mediafire') === -1 && u.indexOf('mp4upload') === -1;
  });

  // Direct streams (mp4/m3u8) antes que embeds crudos
  const direct = usable.filter(s => _isDirect(s.url));
  const embeds = usable.filter(s => !_isDirect(s.url));

  // SUB (Desu/Magi, resueltos arriba) primero — es lo que la página muestra
  // por default — luego LAT directos, luego embeds sin resolver.
  const streams = [...subStreams, ...direct, ...embeds];

  return { streams, pageUrl: episodeUrl };
}

// ─── Resolvers con dio (_get) ─────────────────────────────────────────────────

// Dispatcher unificado: usa _get (dio) primero para embed externos.
// Llamado desde el fast-path de watch() cuando switchServer envía una URL de embed.
async function _resolveEmbedDio(
  name: string,
  url: string,
  referer: string,
): Promise<PrismStream | null> {
  // Todo el enrutado por host vive ahora en `servidores/`: una carpeta por
  // servidor, con su resolver y lo que se midio de el. Aca solo se le pega la
  // etiqueta que ve el usuario.
  const res = await resolverServidor(url, referer);
  if (res && res.url) return { url: res.url, quality: name, headers: res.headers };
  return null;
}

// Los resolvers por servidor se mudaron a `servidores/`, una carpeta cada uno,
// con lo que se midio arriba de todo. Lo que sigue aca es solo el armado de la
// lista de servidores del episodio, que es propio de este sitio.

// ─── Servidores SUB propios de JKAnime (Desu/Magi vía jkplayer interno) ────────
//
// Estos NO viven en el array `servers` (ese solo trae el grupo LAT en la
// mayoría de episodios). Son asignaciones sueltas tipo:
//   video[0] = '<iframe ... src="https://jkanime.net/jkplayer/um?e=...&t=...">...';
// correlacionadas con el nombre del servidor via los botones:
//   <a id="btn-show-0" data-id="0" class="servers ...">Desu</a>
// El iframe apunta al REPRODUCTOR PROPIO de JKAnime (dominio jkdesa.com/DPlayer),
// no a un host externo — adentro, la URL real del .m3u8 está ofuscada en un
// atob('base64...') (con un bloque viejo comentado que NO hay que usar).

interface _JkSubEntry {
  index: number;
  name: string;
  iframeSrc: string;
}

function _parseJkSubServers(html: string): _JkSubEntry[] {
  const nameByIndex: Record<number, string> = {};
  const btnRe = /<a\s+id="btn-show-(\d+)"\s+data-id="\d+"\s+class="servers[^"]*"[^>]*>([^<]+)<\/a>/g;
  for (const bm of html.matchAll(btnRe)) {
    nameByIndex[parseInt(bm[1], 10)] = bm[2].trim();
  }

  const entries: _JkSubEntry[] = [];
  const videoRe = /video\[(\d+)\]\s*=\s*'<iframe[^']*?\ssrc="([^"]+)"/g;
  for (const vm of html.matchAll(videoRe)) {
    const idx = parseInt(vm[1], 10);
    entries.push({ index: idx, name: nameByIndex[idx] || `Sub ${idx + 1}`, iframeSrc: vm[2] });
  }
  return entries;
}

async function _resolveJkInternalPlayer(
  iframeSrc: string,
  referer: string,
  label: string,
): Promise<PrismStream | null> {
  const res = await resolverReproductorPropio(iframeSrc, referer || `${BASE}/`);
  if (!res) return null;
  // Desu y Magi salen de aca ya resueltos, marcados como nativos: se midio que
  // reproducen (206 application/vnd.apple.mpegurl) en todos los episodios
  // probados.
  return { url: res.url, quality: label, headers: res.headers, nativo: true };
}

// Desempaqueta eval(function(p,a,c,k,e,d){...}) de Dean Edwards
function _unpackEval(html: string): string {
  let out = '';
  const re = /eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]*?\.split\('\|'\)[^)]*\)\)/g;
  for (const m of html.matchAll(re)) {
    const inner = /\}\s*\(\s*'(.*?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'(.*?)'\.split\('\|'\)/s.exec(m[0]);
    if (!inner) continue;
    let payload = inner[1];
    const radix = parseInt(inner[2], 10);
    const count = parseInt(inner[3], 10);
    const words = inner[4].split('|');
    payload = payload.split("\\'").join("'");
    const enc = (n: number): string =>
      (n < radix ? '' : enc(Math.floor(n / radix))) +
      ((n = n % radix) > 35 ? String.fromCharCode(n + 29) : n.toString(36));
    const dict: Record<string, string> = {};
    for (let i = count - 1; i >= 0; i--) dict[enc(i)] = words[i] || enc(i);
    out += '\n' + payload.replace(/\b\w+\b/g, (w) => dict[w] ?? w);
  }
  return out;
}

// ─── Helpers generales ───────────────────────────────────────────────────────

function _isDirect(url: string): boolean {
  const u = url.toLowerCase();
  return u.indexOf('.m3u8') !== -1 || u.indexOf('.mp4') !== -1 ||
    u.indexOf('.mkv') !== -1 || u.indexOf('.ts') !== -1;
}

function _resolveRedirect(url: string): string {
  if (url.indexOf('/jkokru.php') !== -1) {
    const id = _urlParam(url, 'u');
    return id ? `http://ok.ru/videoembed/${id}` : url;
  }
  if (url.indexOf('/jkvmixdrop.php') !== -1) {
    const id = _urlParam(url, 'u');
    return id ? `https://mixdrop.ag/e/${id}` : url;
  }
  if (url.indexOf('/jksw.php') !== -1) {
    const id = _urlParam(url, 'u');
    return id ? `https://sfastwish.com/e/${id}` : url;
  }
  if (url.indexOf('/jk.php') !== -1) {
    const path = _urlParam(url, 'u');
    return path ? `${BASE}/${path}` : url;
  }
  return url;
}

function _urlParam(url: string, name: string): string {
  const re = new RegExp('[?&]' + name + '=([^&#]+)');
  const m = re.exec(url);
  return m ? decodeURIComponent(m[1]) : '';
}

// Base64 decode puro sin atob (para QuickJS)
function _b64decode(s: string): string {
  const T = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let r = '';
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  s = s.replace(/[^A-Za-z0-9+/]/g, '');
  for (let i = 0; i < s.length; i += 4) {
    const a = T.indexOf(s[i]);
    const b = T.indexOf(s[i + 1]);
    const c = T.indexOf(s[i + 2]);
    const d = T.indexOf(s[i + 3]);
    if (a < 0 || b < 0) break;
    r += String.fromCharCode((a << 2) | (b >> 4));
    if (c >= 0) r += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    if (d >= 0) r += String.fromCharCode(((c & 3) << 6) | d);
  }
  return r;
}

function _guessServerName(url: string): string {
  const u = url.toLowerCase();
  if (u.indexOf('voe') !== -1) return 'Voe';
  if (u.indexOf('streamtape') !== -1 || u.indexOf('stape') !== -1) return 'Streamtape';
  if (u.indexOf('mixdrop') !== -1 || u.indexOf('mxdrop') !== -1) return 'Mixdrop';
  if (u.indexOf('mp4upload') !== -1) return 'Mp4Upload';
  if (u.indexOf('dood') !== -1 || u.indexOf('ds2play') !== -1 || u.indexOf('ds2video') !== -1) return 'Doodstream';
  if (u.indexOf('streamwish') !== -1 || u.indexOf('sfastwish') !== -1 ||
      u.indexOf('wishfast') !== -1 || u.indexOf('vidhide') !== -1) return 'Streamwish';
  if (u.indexOf('filemoon') !== -1 || u.indexOf('moonplayer') !== -1) return 'Filemoon';
  if (u.indexOf('yourupload') !== -1 || u.indexOf('yupload') !== -1) return 'YourUpload';
  if (u.indexOf('hqq') !== -1 || u.indexOf('netu') !== -1) return 'Netu';
  if (u.indexOf('mega.nz') !== -1 || u.indexOf('mega.co.nz') !== -1) return 'Mega';
  return 'Embed';
}

function _toSlug(url: string): string {
  if (url.indexOf('http') !== 0) return url.replace(/\/+$/, '');
  return url
    .replace(/^https?:\/\/jkanime\.net\//, '')
    .replace(/\/+$/, '');
}

const _NAV_SLUGS = new Set([
  'genero','directorio','buscar','ajax','tag','temporada',
  'anime','ver','episodio','wp-content','wp-includes',
  // páginas de categoría de jkanime (no son animes)
  'serie','pelicula','especial','ova','ona','music','peli','especiales','cortos',
]);

function _isNavSlug(s: string): boolean {
  return !s || s.length < 3 || _NAV_SLUGS.has(s) || /[?&#]/.test(s);
}

// Extrae el primer segmento de un path tipo "slug" o "slug/23" → "slug"
function _firstSegment(path: string): string {
  return path.split('/')[0];
}

function _parseCards(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  if (!html) return items;

  const seen = new Set<string>();

  // ── Estrategia A: img.card-img-top (home page — recientes) ───────────────
  const imgRe = /<img\b[^>]*>/gi;
  let imgM: RegExpExecArray | null;
  while ((imgM = imgRe.exec(html)) !== null) {
    const tag = imgM[0];
    if (tag.indexOf('card-img-top') === -1) continue;

    // Cover: data-animepic > data-setbg (jkanime) > data-src > src
    // jkanime usa <div data-setbg="URL"> en lugar de <img src="URL">;
    // buscamos en ±500 chars alrededor del <img>
    const setbgNearM = /\bdata-setbg=["'](https?:\/\/[^"']{10,})["']/i.exec(
      html.slice(Math.max(0, imgM.index - 200), imgM.index + tag.length + 500),
    );
    const animePicM = /\bdata-animepic=["']([^"']+)["']/i.exec(tag);
    const dataSrcM  = /\bdata-src=["']([^"']+)["']/i.exec(tag);
    const srcM      = /\bsrc=["']([^"']+)["']/i.exec(tag);
    const srcVal    = srcM && srcM[1] && !/data:image|\.gif$|placeholder/i.test(srcM[1]) ? srcM[1] : '';
    const cover = (setbgNearM && setbgNearM[1]) ||
                  (animePicM  && animePicM[1])   ||
                  (dataSrcM   && dataSrcM[1])    ||
                  srcVal;

    // Slug: buscar el ÚLTIMO href de anime (no de categoría) en los 700 chars
    // antes de la imagen. El más cercano = el del <a> que envuelve este card.
    const pos = imgM.index;
    const beforeImg = html.slice(Math.max(0, pos - 700), pos);
    const allHrefs = [...beforeImg.matchAll(/href=["']https?:\/\/jkanime\.net\/([a-z0-9][a-z0-9-]{1,80}(?:\/\d+)?)\/["']/gi)];
    // Filtrar slugs de navegación/categoría y tomar el último válido
    const validHrefs = allHrefs.filter(m => !_isNavSlug(_firstSegment(m[1])));
    if (validHrefs.length === 0) continue;
    const hrefM = validHrefs[validHrefs.length - 1];
    const slug = _firstSegment(hrefM[1]);
    if (seen.has(slug)) continue;
    seen.add(slug);

    // Título: alt del img > heading/link en los 500 chars después del img > slug
    let title = '';
    const altM = /\balt=["']([^"']{2,})["']/i.exec(tag);
    if (altM && altM[1].trim().length > 1) {
      title = altM[1].trim();
    } else {
      const afterImg = html.slice(pos + tag.length, pos + tag.length + 500);
      // <h4/5/6><a href="...">TÍTULO</a></h4/5/6>
      const hLinkM = /<h[4-6][^>]*>\s*<a[^>]*>([^<]{2,80})<\/a>/i.exec(afterImg);
      // <h4/5/6>TÍTULO</h4/5/6>
      const hPlainM = /<h[4-6][^>]*>([^<]{2,80})<\/h[4-6]>/i.exec(afterImg);
      // class="card-title" o "anime-title"
      const cardTitleM = /class="[^"]*(?:card-title|anime-title)[^"]*"[^>]*>([^<]{2,80})</i.exec(afterImg);
      title = (hLinkM  && hLinkM[1].trim())  ||
              (hPlainM && hPlainM[1].trim())  ||
              (cardTitleM && cardTitleM[1].trim()) ||
              slug.replace(/-/g, ' ');
    }

    items.push({ title: decodeEntities(title), url: slug, cover });
  }

  // ── Estrategia B: resultados de búsqueda y directorio (estructura diferente) ────
  // Soporta hrefs absolutos (https://jkanime.net/slug/) Y relativos (/slug/)
  // ya que el directorio usa rutas relativas mientras la búsqueda usa absolutas.
  if (items.length === 0) {
    const hrefRe = /href=["'](?:https?:\/\/jkanime\.net)?\/([a-z0-9][a-z0-9-]{1,80})\/["']/gi;
    let hrefMatch: RegExpExecArray | null;
    while ((hrefMatch = hrefRe.exec(html)) !== null) {
      const slug = hrefMatch[1];
      if (_isNavSlug(slug)) continue;
      if (seen.has(slug)) continue;

      const pos = hrefMatch.index;
      // Ventana ajustada: 600 antes + 800 después (evita capturar otro card)
      const ctx = html.slice(Math.max(0, pos - 600), pos + 800);

      // Imagen: jkanime usa <div data-setbg="URL"> para el poster (no <img>)
      // También intentamos <img> con atributos lazy-load como fallback.
      let cover = '';

      // 1) data-setbg (patrón principal de jkanime)
      const setbgM = /\bdata-setbg=["'](https?:\/\/[^"']{10,})["']/i.exec(ctx);
      if (setbgM) {
        cover = setbgM[1];
      }

      // 2) background-image inline (misma info que data-setbg, usada cuando JS la aplica)
      if (!cover) {
        const bgM = /background-image:\s*url\(['"]?(https?:\/\/[^'")\s]{10,})['"]?\)/i.exec(ctx);
        if (bgM) cover = bgM[1];
      }

      // 3) Fallback <img> con atributos lazy-load
      if (!cover) {
        const imgCtxRe = /<img\b[^>]*>/gi;
        let imgCtxM: RegExpExecArray | null;
        while ((imgCtxM = imgCtxRe.exec(ctx)) !== null) {
          const t = imgCtxM[0];
          const s = /\b(?:data-lazy-src|data-lazy|data-original|data-src|src)=["']([^"']{20,})["']/i.exec(t);
          if (s && !/\.gif$|data:image|\.js$|\.css$|\.svg$|logo|icon|sprite/i.test(s[1])) {
            cover = s[1];
            break;
          }
        }
      }

      // Título: alt de imagen real > texto del link > headings > slug humanizado
      // OJO: usar SOLO contexto hacia adelante (desde `pos`) acá. El `ctx` de
      // arriba mira 600 chars hacia atrás para encontrar la portada (que a
      // veces precede al href) — pero para el título eso reengancha el
      // heading/card ANTERIOR (o el título de la página en el primer card),
      // dejando cada anime con el título del que viene después.
      // 1200, no 800: jkanime repite el mismo href para la imagen y para el
      // <h5><a>título</a></h5> del card, y ese segundo href (con el título
      // real) puede aparecer a ~800 chars del primero — con 800 la ventana
      // cortaba el <h5> a la mitad y nunca llegaba a leer el título.
      const titleCtx = html.slice(pos, pos + 1200);
      let title = '';
      // 1) alt de la imagen (si no es decorativo)
      const altM = /<img\b[^>]*\balt=["']([^"']{2,80})["'][^>]*>/i.exec(titleCtx);
      if (altM && !/logo|icon|banner|avatar/i.test(altM[1])) title = altM[1].trim();
      // 2) texto directamente dentro del <a href="...slug...">TEXTO</a>
      if (!title) {
        const linkEndCtx = html.slice(pos, pos + hrefMatch[0].length + 300);
        const linkTextM = /href=["'][^"']+["'][^>]*>([^<]{2,80})</i.exec(linkEndCtx);
        if (linkTextM) title = linkTextM[1].trim().replace(/\s+/g, ' ');
      }
      // 3) headings y spans de título en el contexto
      if (!title) {
        // <h4/5/6><a>TÍTULO</a> — estructura más común en jkanime
        const hLinkM = /<h[4-6][^>]*>\s*<a[^>]*>([^<]{2,80})<\/a>/i.exec(titleCtx);
        const hPlainM = /<h[2-6][^>]*>([^<]{2,80})<\/h[2-6]>/i.exec(titleCtx);
        const spanM = /class="[^"]*(?:title|name|anime)[^"]*"[^>]*>([^<]{2,80})</i.exec(titleCtx);
        title = (hLinkM  && hLinkM[1].trim())  ||
                (hPlainM && hPlainM[1].trim())  ||
                (spanM   && spanM[1].trim())    ||
                slug.replace(/-/g, ' ');
      }

      // Solo incluir si tiene imagen — filtra enlaces de navegación falsos positivos
      if (!cover) continue;
      seen.add(slug);
      items.push({ title: decodeEntities(title), url: slug, cover });
    }
  }

  return items;
}

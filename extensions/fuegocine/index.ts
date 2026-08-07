import { DESKTOP_UA } from '../../sdk/http';
import { decodeEntities } from '../../sdk/html';
import {
  fichaDe,
  resolverServidor,
  unlimplayAlDia,
  unlimplayMarcaMulti,
  type ServidorResuelto,
} from './servidores';
import { b64aTexto } from './servidores/comun';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream, PrismEpisode, PrismSeason } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://www.fuegocine.com';

/// Los servidores de adentro de unlimplay que se midió que REPRODUCEN en la
/// app. Solo estos salen como botón propio; el resto se llega por "UA Multi".
///
/// Se lleva a mano y no se deduce de la tabla de fichas a propósito: un host
/// puede coincidir con una ficha y aun así no resolver desde este sitio —pasó
/// con "remux", que salía con el rayo y devolvía nulo—. Acá solo entra lo
/// comprobado pidiendo el vídeo.
/// Escaneo del 2026-08-06 sobre **25 títulos** de la portada, midiendo las dos
/// cosas: que el resolver devuelva dirección Y que el CDN mande bytes de verdad
/// (se pide un rango real y se cuenta lo que llega).
///
///     servidor     resuelve  reproduce  falla
///     goodstream     19/22        19        0   ← entra
///     direct         26/26        16       10   ← ya estaba
///     vidhide        61/62        10       51
///     voe            17/88         7       10
///     streamhg       14/22         6        8
///     filelions       4/5          1        3
///     filemoon · streamwish · doodstream · streamtape · netu · remux   0
///
/// **Goodstream es hoy el más confiable de todos, incluso más que el Direct**:
/// cero fallos en 19 reproducciones. Ya había salido como botón y se había
/// vuelto atrás por fallar seguido; con esta medición vuelve.
///
/// **Vidhide no entra hoy, pero NO está descartado.** Resuelve 61 de 62 —el
/// resolver está impecable— y lo que falla es su CDN: 51 de sus fallos vienen
/// de `acek-cdn.com`, el mismo que ese día se midió caído (502/504) también
/// desde JKAnime. Se lo estaría juzgando en su peor día. Cuando ese CDN se
/// recupere, se vuelve a medir y alcanza con sumarlo acá.
///
/// **El orden de esta lista es el orden de los botones**, y es a propósito:
/// Goodstream va PRIMERO porque el cliente abre el primero de la lista y es el
/// que más veces funciona. El Direct falla 10 de 26 con un 403 que no es
/// nuestro —se probó el mismo m3u8 con Referer, con Origin, con los dos
/// User-Agent y sin ninguna cabecera, y da 403 en las seis; el sitio además
/// devuelve el mismo vale al segundo pedido, o sea que lo tiene cacheado y
/// nace muerto—. Abrir primero el que anda ahorra ese salto al navegador.
///
/// **Hoy no se usa**: UA sale con un solo botón, su propio menú. Se deja la
/// medición escrita porque es el trabajo caro —25 títulos, pidiendo el vídeo
/// uno por uno— y es lo que habría que rehacer para volver a intentarlo. Ver el
/// bloque de unlimplay más abajo, en watch().
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _UA_QUE_ANDAN = ['goodstream', 'direct'];

/// **Voe y Streamwish se probaron y NO entran.** Sus resolvers están copiados en
/// `servidores/` —traídos de hentaila y de jkanime, donde sí andan— y desde acá
/// resuelven: devuelven una dirección. Pero al pedir el vídeo no llega nada.
///
/// Medido el 2026-08-06 sobre From 3x5 y Supergirl, bajando el primer pedacito:
///
///   voe         404 · 0 KB
///   streamwish  206 con 0 KB, las dos veces
///
/// Contra: goodstream da 267 y 978 KB, y vidhide 1269 y 1169 KB.
///
/// O sea que resolver no alcanza: hay que pedir el vídeo. Si se hubieran
/// marcado con el rayo por "resuelve", el usuario los elegiría esperando el
/// reproductor de la app y terminaría en el navegador igual — que es
/// exactamente lo que este archivo viene evitando.
///
/// Los resolvers se dejan puestos igual: si el sitio cambia, ya están, y
/// alcanza con sumar el nombre a la lista de arriba después de medirlo.
const HOST = 'fuegocine.com';

async function _get(url: string): Promise<string> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([
      url,
      {
        method: 'get',
        headers: { Referer: `${BASE}/`, 'User-Agent': DESKTOP_UA },
      },
    ]),
  );
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function _fullUrl(url: string): string {
  if (url.indexOf('http') === 0) return url;
  return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ─── Catálogo ───────────────────────────────────────────────────────────────
// Blogger (blogspot) puro — confirmado en vivo: la API JSON nativa del feed
// (/feeds/posts/default) funciona directo con curl, soporta paginación real
// con start-index/max-results, filtro por etiqueta (Movie/Serie) y búsqueda
// de texto (q=), todo combinable. Muchísimo más confiable que scrapear HTML.
// El campo "content" del feed ya trae el HTML completo del post — incluye la
// portada TMDB y los atributos data-imdb/data-year/data-genres del bloque
// <ul class="post-details">, así que un solo fetch al feed alcanza para
// armar el PrismItem completo, sin pedir cada página individualmente.

interface _FeedEntry {
  title: { $t: string };
  content?: { $t: string };
  category: { term: string }[];
  link: { rel: string; href: string }[];
}

function _entryUrl(e: _FeedEntry): string {
  return e.link.find((l) => l.rel === 'alternate')?.href ?? '';
}

function _entryToItem(e: _FeedEntry): PrismItem {
  const content = e.content?.$t ?? '';
  const isSeries = e.category.some((c) => c.term === 'Serie');

  const metaM = /<div data-post-type="[a-z]+" hidden>\s*<img src="([^"]+)"\s*\/>\s*<p id="tmdb-synopsis">([^<]*)<\/p>/.exec(
    content,
  );
  const cover = metaM?.[1];
  const description = metaM ? decodeEntities(metaM[2].trim()) : undefined;

  const ulM = /<ul class="post-details[^>]*>/.exec(content);
  const ulTag = ulM?.[0] ?? '';
  const ratingM = /data-imdb="([\d.]+)"/.exec(ulTag);
  const rating = ratingM ? parseFloat(ratingM[1]) : undefined;
  const yearM = /data-year="(\d+)"/.exec(content);
  const year = yearM ? parseInt(yearM[1], 10) : undefined;
  const genresM = /data-genres="([^"]*)"/.exec(content);
  const tags = genresM ? genresM[1].split(',').map((g) => g.trim()).filter(Boolean) : undefined;

  const titleM = /<li data="([^"]+)"><span>Título<\/span>/.exec(content);
  const title = titleM ? decodeEntities(titleM[1].trim()) : decodeEntities(e.title.$t.trim());

  return {
    title,
    url: _entryUrl(e),
    cover,
    description,
    tags,
    year,
    rating: rating !== undefined && Number.isFinite(rating) ? rating : undefined,
    type: isSeries ? 'series' : 'movie',
  };
}

async function _fetchLabel(label: 'Movie' | 'Serie', page: number): Promise<PrismItem[]> {
  const perPage = 20;
  const startIndex = (page - 1) * perPage + 1;
  const url = `${BASE}/feeds/posts/default/-/${label}?alt=json&max-results=${perPage}&start-index=${startIndex}`;
  const json = await _get(url);
  if (typeof json === 'string') return [];
  const entries: _FeedEntry[] = (json as any)?.feed?.entry ?? [];
  return entries.map(_entryToItem);
}

// Sin filtro de tipo, se intercala película/serie página a página — igual
// convención que las demás extensiones de este repo (no hay un feed único
// que combine ambas etiquetas con OR, Blogger solo permite AND entre labels).
export async function latest(page: number): Promise<PrismItem[]> {
  const [movies, series] = await Promise.all([_fetchLabel('Movie', page), _fetchLabel('Serie', page)]);
  const merged: PrismItem[] = [];
  const max = Math.max(movies.length, series.length);
  for (let i = 0; i < max; i++) {
    if (movies[i]) merged.push(movies[i]);
    if (series[i]) merged.push(series[i]);
  }
  return merged;
}

// ─── Búsqueda ───────────────────────────────────────────────────────────────

const _TYPE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  Movie: 'Películas',
  Serie: 'Series',
};

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    tipo: { title: 'Tipo', options: _TYPE_OPTIONS, default: '', min: 1, max: 1 },
  };
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const tipo = filter?.['tipo']?.[0] as 'Movie' | 'Serie' | undefined;
  const kw = keyword.trim();

  if (!kw) {
    if (tipo === 'Movie') return _fetchLabel('Movie', page);
    if (tipo === 'Serie') return _fetchLabel('Serie', page);
    return latest(page);
  }

  // Blogger ignora el filtro de etiqueta (/-/Movie, /-/Serie) en cuanto se
  // combina con q= — confirmado en vivo, ambas rutas devuelven exactamente
  // los mismos resultados con una búsqueda de texto. Se pide sin filtro de
  // ruta y se clasifica/filtra acá, descartando además los posts de
  // episodios sueltos (sin etiqueta Movie ni Serie) — no son ítems de
  // catálogo, solo actualizaciones de una serie ya listada.
  //
  // OJO: el feed de texto de Blogger mezcla, en el mismo resultado, esos
  // posts de episodio CON el post real de catálogo — una serie con muchos
  // capítulos publicados puede inundar las primeras posiciones con puros
  // posts de episodio, empujando el post Movie/Serie varias páginas crudas
  // más abajo. Confirmado en vivo buscando "From": los primeros 20
  // resultados del feed son puros "From 4x10", "From 4x9", etc. — cero
  // posts Movie/Serie — así que una sola página cruda devolvía vacío aunque
  // la serie sí está en el catálogo (el buscador de PrismHub solo pide la
  // página 1 de cada extensión, así que ese vacío se traducía en "no
  // aparece" para el usuario). Por eso se pagina el feed crudo ACÁ ADENTRO,
  // buscando entradas válidas, en vez de confiar en que la página cruda
  // pedida alcance.
  const perPage = 20;
  const maxRawFetches = 6;
  const items: PrismItem[] = [];
  let rawPage = (page - 1) * maxRawFetches + 1;
  for (
    let attempt = 0;
    attempt < maxRawFetches && items.length < perPage;
    attempt++, rawPage++
  ) {
    const startIndex = (rawPage - 1) * perPage + 1;
    const json = await _get(
      `${BASE}/feeds/posts/default?alt=json&max-results=${perPage}&start-index=${startIndex}&q=${encodeURIComponent(kw)}`,
    );
    if (typeof json === 'string') break;
    const entries: _FeedEntry[] = (json as any)?.feed?.entry ?? [];
    if (entries.length === 0) break; // se acabó el feed de verdad
    for (const e of entries) {
      const isMovie = e.category.some((c) => c.term === 'Movie');
      const isSerie = e.category.some((c) => c.term === 'Serie');
      if (!isMovie && !isSerie) continue;
      if (tipo === 'Movie' && !isMovie) continue;
      if (tipo === 'Serie' && !isSerie) continue;
      items.push(_entryToItem(e));
    }
  }
  return items;
}

// ─── Detalle ────────────────────────────────────────────────────────────────

function _isSeriesHtml(html: string): boolean {
  return /<div data-post-type="serie" hidden>/.test(html);
}

export async function detail(url: string): Promise<PrismDetail> {
  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  const isSeries = _isSeriesHtml(html);

  const metaM = /<div data-post-type="[a-z]+" hidden>\s*<img src="([^"]+)"\s*\/>\s*<p id="tmdb-synopsis">([^<]*)<\/p>/.exec(
    html,
  );
  const cover = metaM?.[1];
  const description = metaM ? decodeEntities(metaM[2].trim()) : undefined;

  const titleM = /<li data="([^"]+)"><span>Título<\/span>/.exec(html);
  const title = titleM ? decodeEntities(titleM[1].trim()) : '';

  const ulM = /<ul class="post-details[^>]*>/.exec(html);
  const ulTag = ulM?.[0] ?? '';
  const ratingM = /data-imdb="([\d.]+)"/.exec(ulTag);
  const rating = ratingM ? parseFloat(ratingM[1]) : undefined;
  const yearM = /data-year="(\d+)"/.exec(html);
  const year = yearM ? parseInt(yearM[1], 10) : undefined;
  const genresM = /data-genres="([^"]*)"/.exec(html);
  const genres = genresM ? genresM[1].split(',').map((g) => g.trim()).filter(Boolean) : undefined;

  const extra: Record<string, string> = {};
  const durM = /data-duartion="([^"]*)"/.exec(html);
  if (durM && durM[1]) extra['Duración'] = durM[1].trim();
  const origM = /data-original-title="([^"]*)"/.exec(html);
  if (origM && origM[1]) extra['Título original'] = decodeEntities(origM[1].trim());

  const episodes: PrismEpisode[] = [];
  let seasons: PrismSeason[] | undefined;

  if (isSeries) {
    // Cada episodio lleva una etiqueta única "id-{postId}" que apunta al ID
    // interno de Blogger de ESTA página de serie (confirmado en vivo:
    // entry.id de la serie termina en "post-6924316536891050342", idéntico
    // al "id-6924316536891050342" que traen todos sus episodios) — filtrar
    // el feed por esa etiqueta trae todos los episodios de todas las
    // temporadas en una sola llamada, sin necesidad de adivinar nombres.
    const postIdM = /\/feeds\/(\d+)\/comments\/default/.exec(html);
    if (postIdM) {
      const epJson = await _get(
        `${BASE}/feeds/posts/default/-/id-${postIdM[1]}?alt=json&max-results=150`,
      );
      if (typeof epJson !== 'string') {
        const entries: _FeedEntry[] = (epJson as any)?.feed?.entry ?? [];
        const parsed: { season: number; number: number; title: string; url: string }[] = [];
        for (const e of entries) {
          const t = e.title.$t.trim();
          const m = /^(.*?)\s+(\d+)x(\d+)\s*$/.exec(t);
          if (!m) continue;
          parsed.push({
            season: parseInt(m[2], 10),
            number: parseInt(m[3], 10),
            title: `${decodeEntities(m[1].trim())} ${m[2]}x${m[3]}`,
            url: _entryUrl(e),
          });
        }
        parsed.sort((a, b) => a.season - b.season || a.number - b.number);
        const bySeason = new Map<number, PrismEpisode[]>();
        for (const p of parsed) {
          const ep: PrismEpisode = { title: p.title, url: p.url, number: p.number };
          episodes.push(ep);
          if (!bySeason.has(p.season)) bySeason.set(p.season, []);
          bySeason.get(p.season)!.push(ep);
        }
        seasons = [...bySeason.keys()]
          .sort((a, b) => a - b)
          .map((s) => ({ title: `Temporada ${s}`, episodes: bySeason.get(s)! }));
      }
    }
  } else {
    episodes.push({ title: 'Película completa', url: fullUrl });
  }

  return {
    title,
    cover,
    description,
    genres,
    episodes,
    seasons: seasons && seasons.length > 0 ? seasons : undefined,
    year: Number.isFinite(year as number) ? year : undefined,
    rating: rating !== undefined && Number.isFinite(rating) ? rating : undefined,
    extra: Object.keys(extra).length > 0 ? extra : undefined,
  };
}

// ─── Reproducción ───────────────────────────────────────────────────────────

// Confirmado en vivo — servidores realmente nativos (sin SPA/JS a ejecutar):
//  - Wrappers en *.blogspot.com que solo redirigen: o bien ?link=<url> (query
//    normal) o bien ...r=<base64(url)> (visto en el mismo sitio con dos
//    plantillas de wrapper distintas). El destino puede ser un archivo
//    directo (mp4 en rumble.cloud, confirmado con Content-Type: video/mp4 y
//    Accept-Ranges) o un embed de terceros que sí necesita resolveEmbed
//    (ej. firestream.to, que desde ahora resuelve nativo — ver
//    resolveFirestream en el SDK).
//  - unlimplay.com: la página del embed trae en texto plano un campo
//    "direct":"https://sN.vimeos.net/hls2/.../master.m3u8?..." — mismo estilo
//    de CDN firmado que uqload, sin necesidad de desempaquetar nada.
// Antes acá se ocultaba drive.google.com. Se quitó: el sitio lo ofrece y el
// usuario lo veía en la web pero no en la app —confirmado con Superman, donde
// la página lista FS, US, Drive y UA y la app mostraba solo tres—. Ahora sale
// con el mundo, como US: si el camino nativo no alcanza, la app lo reintenta
// con su navegador interno, que es donde Drive sí reproduce. Ocultarlo solo le
// quitaba esa oportunidad.

/**
 * Le pone `https:` a las direcciones que vienen sin protocolo.
 *
 * Varios wrappers guardan el destino como `//host/ruta` — valido dentro de una
 * pagina web, donde el navegador le pone el protocolo de la pagina, pero no
 * cuando se pide desde afuera. Medido en vivo con el servidor GS(ads):
 * "Unsupported scheme '' in URI //gscdn.cam/video/embed/..." — el pedido ni se
 * hacia, el resolver devolvia nulo y el servidor terminaba abriendose en el
 * navegador interno (con sus anuncios) pudiendo reproducirse en la app.
 */
/** "goodstream" -> "Goodstream", "direct 2" -> "Directo 2". */
function _conMayuscula(s: string): string {
  const n = s.toLowerCase() === 'direct 2' ? 'directo 2' : s;
  return n.charAt(0).toUpperCase() + n.slice(1);
}

function _conEsquema(url: string): string {
  const u = url.trim();
  if (u.indexOf('//') === 0) return `https:${u}`;
  if (!/^https?:\/\//i.test(u)) return `https://${u.replace(/^\/+/, '')}`;
  return u;
}

async function _resolveFinal(url: string): Promise<PrismStream | null> {
  const res = await resolverServidor(url, `${BASE}/`);
  if (res?.url) return { url: res.url, quality: 'Servidor', headers: res.headers };
  return null;
}

/**
 * A donde apunta de verdad una direccion, o null si es un envoltorio vacio.
 *
 * El envoltorio de blogspot no reproduce nada: lleva la direccion real adentro,
 * en `?link=` o en `r=<base64>`. Lo que vale es a donde apunta — tanto para
 * resolverlo como para saber si lleva rayo o mundo, porque mirando el
 * envoltorio no se puede saber nada: todos son iguales.
 */
function _destinoDe(url: string): string | null {
  if (url.indexOf('blogspot.com') === -1) return url;
  try {
    const linkM = /[?&]link=([^&]+)/.exec(url);
    if (linkM) return _conEsquema(decodeURIComponent(linkM[1]));
    const rM = /[?&]r=([A-Za-z0-9+/=]+)$/.exec(url);
    if (rM) return _conEsquema(b64aTexto(rM[1]));
  } catch {
    return null;
  }
  return null;
}

async function _resolveServerUrl(url: string): Promise<PrismStream | null> {
  const destino = _destinoDe(url);
  if (!destino) return null;
  return _resolveFinal(destino);
}

// El sitio publica la calidad de cada servidor en el mismo bloque, y hasta
// ahora se estaba tirando: el patrón la capturaba y nadie la usaba. Es lo que
// se ve en la página como "#FHD (1080p)" o "#Multicalidad", así que sale
// gratis — no hay que resolver nada para saberla.
function _parseSvLinks(html: string): { name: string; url: string; calidad: string }[] {
  const start = html.indexOf('const _SV_LINKS');
  if (start === -1) return [];
  const end = html.indexOf('</script>', start);
  const block = html.slice(start, end === -1 ? undefined : end);
  const re = /lang:\s*"([^"]*)"\s*,\s*name:\s*"([^"]*)"\s*,\s*quality:\s*"([^"]*)"\s*,\s*url:\s*"([^"]*)"/g;
  const out: { name: string; url: string; calidad: string }[] = [];
  for (const m of block.matchAll(re)) {
    out.push({
      name: m[2].replace(/&#\d+;/g, '').trim(),
      calidad: m[3].replace(/&#\d+;/g, '').replace(/^#/, '').trim(),
      url: m[4],
    });
  }
  return out;
}

export async function watch(url: string): Promise<PrismWatch> {
  // Fast-path: switchServer pidiendo resolver UN servidor puntual (una de
  // las URLs crudas de _SV_LINKS) — mismo patrón que las demás extensiones.
  if (url.indexOf('http') === 0 && url.indexOf(HOST) === -1) {
    try {
      const resolved = await _resolveServerUrl(url);
      if (resolved) return { streams: [resolved], pageUrl: '' };
    } catch {
      /* sigue abajo, al navegador */
    }
    // ── No se pudo resolver: va al navegador interno ──────────────────────
    //
    // Antes se devolvía la dirección CRUDA como si fuera un vídeo, y eso está
    // mal para todo lo que no sea un enlace directo. El caso que lo destapó es
    // **UA Multi**, que a propósito no resuelve —es el menú de la propia
    // página, no un vídeo— y aun así salía así:
    //
    //     watch("…/embed/tv/125988/1/1#multi")
    //       → { type: "hls", url: "…/embed/tv/125988/1/1#multi" }
    //
    // O sea: se le entregaba un HTML a mpv haciéndolo pasar por HLS. mpv no
    // puede con eso, falla, y la app cae al navegador igual — pero después de
    // dar la vuelta larga y de mostrar el fallo. Y en el navegador, sin que
    // nadie lo esperara ahí, corren los anuncios de la página.
    //
    // Devolverlo como página es lo que ya hacen las demás extensiones: el
    // navegador interno ejecuta JS de verdad y su sniffer encuentra el vídeo si
    // lo hay. Para UA Multi además es lo que se busca — el usuario elige ahí.
    return { streams: [], pageUrl: url };
  }

  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  if (typeof html !== 'string') return { streams: [], pageUrl: fullUrl };

  const links = _parseSvLinks(html);
  const streams: PrismStream[] = [];
  // Con qué ficha se reconoció cada stream, en el mismo orden. Se usa para
  // ordenar más abajo.
  const fichas: string[] = [];
  for (const link of links) {
    // Se normaliza acá también, y no solo al resolver: esta es la dirección que
    // se le entrega a la app, y es la que abre el navegador interno cuando el
    // camino nativo no alcanza. Con la ruta vieja, ahí se veía la portada del
    // sitio en vez del reproductor.
    const url =
      link.url.indexOf('unlimplay.com') !== -1 ? unlimplayAlDia(link.url) : link.url;
    // El rayo/mundo sale de la tabla de `servidores/`, que es donde está lo que
    // se midió de cada uno. Se mira el destino y no el envoltorio: los botones
    // de este sitio son etiquetas de dos letras ("FC", "UA", "GS(ads)") y todos
    // los envoltorios de blogspot son iguales por fuera.
    const destino = _destinoDe(url);
    const ficha = destino ? fichaDe(destino) : null;
    const esUnlimplay = url.indexOf('unlimplay.com') !== -1;
    // Se guarda con qué ficha se reconoció, para ordenar abajo sin tener que
    // volver a desenvolver el envoltorio de blogspot.
    // Los que NO son unlimplay salen tal cual, uno por botón.
    if (!esUnlimplay) {
      fichas.push(ficha?.boton ?? '');
      streams.push({
        url,
        quality: link.name || 'Servidor',
        nativo: ficha?.nativo,
      });
      continue;
    }

    // ── unlimplay: un solo boton, su propio menu ────────────────────────────
    //
    // unlimplay no es un servidor: es un reproductor con su propio menu, con
    // nueve servidores adentro y en varios idiomas. Se probaron las dos formas
    // de ofrecerlo y esta es la que quedo, a pedido explicito.
    //
    // ── Lo que se intento antes, y por que se volvio atras ──────────────────
    //
    // Se llego a abrir el menu y sacar cada servidor como boton propio, para
    // que fueran directo al reproductor nativo. Se midio sobre 25 titulos,
    // pidiendo el video de verdad y contando bytes:
    //
    //     goodstream   19 reproduce · 0 fallan
    //     direct       16 reproduce · 10 fallan
    //     vidhide      10 reproduce · 51 fallan   (su CDN, acek-cdn.com)
    //     voe · streamhg · filelions              flojos
    //     filemoon · streamwish · doodstream · streamtape · netu · remux   0
    //
    // O sea: de nueve servidores, dos servian. Y el Directo —que es el que el
    // sitio pone primero— falla 10 de 26 con un 403 que NO es del pedido: se
    // probo el mismo m3u8 con Referer, con Origin, con los dos User-Agent y
    // sin ninguna cabecera, y da 403 en las seis. El sitio ademas devuelve el
    // mismo vale al segundo pedido, o sea que lo tiene cacheado y nace muerto.
    //
    // Con lo cual el usuario tocaba un boton con rayo y terminaba igual en el
    // navegador, pero despues de dar la vuelta larga y ver el fallo.
    //
    // ── Por que un solo boton alcanza ───────────────────────────────────────
    //
    // Lo que hacia molesto ir al navegador eran los anuncios de la pagina, y
    // eso ya esta resuelto del lado de la app: el bloqueador corta los VAST en
    // origen, asi que el anuncio no llega a existir. Con eso, el menu propio
    // del sitio es mejor que dos botones nuestros que a veces andan: los tiene
    // todos, en todos los idiomas, y elige el usuario.
    //
    // Y sale mas rapido: antes habia que pedir la pagina del embed SOLO para
    // leer el menu y decidir que botones poner. Ahora no se pide nada.
    //
    // Si algun dia se quiere volver a intentar, esta todo: el lector del menu
    // por idioma y la marca `#lang=` siguen en `servidores/unlimplay/`.
    fichas.push(ficha?.boton ?? '');
    streams.push({
      url: `${url}${unlimplayMarcaMulti}`,
      quality: `${link.name || 'UA'} Multi`,
      nativo: false,
    });
  }

  // FC primero; después el resto de los que reproducen en la app; los de
  // navegador, al final.
  //
  // El cliente toma el PRIMER servidor de la lista como el inicial, y hasta
  // ahora ese era simplemente el que el sitio listara antes. Medido el
  // 2026-08-05 sobre seis títulos, eso daba dos problemas:
  //
  //   · **FC quedaba atrás siendo el mejor.** Es un mp4 directo y va a
  //     27-107 Mbps medidos; los demás son listas HLS de 2 a 12 Mbps. Cuando
  //     está, es el que conviene abrir.
  //   · **En un título el primario era US, que abre el NAVEGADOR.** O sea que
  //     ese episodio arrancaba fuera del reproductor de la app sin motivo,
  //     habiendo un UA nativo en la misma lista.
  //
  // Es un reordenamiento, no un filtro: están todos y en su orden original
  // dentro de cada grupo. Si el título no tiene FC, no cambia nada.
  //
  // Ojo con FC igual: hay títulos suyos que se cortan, y no es el servidor sino
  // cómo quedó armado el archivo (el audio entero al final, lejos del vídeo —
  // ver la carpeta `directo/`). Cuando pasa, la app cae sola al siguiente.
  // ── Drive sale de la lista, a pedido explícito (2026-08-06) ───────────────
  //
  // Drive no reproduce y no es cosa de la app: el propio Google corta el
  // archivo cuando se le acaba la cuota de gente sin cuenta. Medido en vivo,
  // eso es lo que se ve en el navegador interno:
  //
  //   «Inicia sesión en tu cuenta de Google para seguir reproduciendo este
  //    vídeo. Se ha alcanzado el límite de usuarios que no han iniciado sesión.»
  //
  // O sea que el botón no promete un vídeo: promete un cartel. Y encima no se
  // le puede ni cambiar la calidad, porque no hay nada reproduciéndose.
  //
  // No se borró nada: `servidores/drive/` sigue con sus mediciones, y volver a
  // ponerlo es sacar su nombre de acá.
  const FUERA_DE_LA_LISTA = ['drive.google.com'];
  const visibles = streams
    .map((s, i) => ({ s, boton: fichas[i], i }))
    .filter((x) =>
      !FUERA_DE_LA_LISTA.some((d) => (x.s.url ?? '').toLowerCase().indexOf(d) !== -1),
    );

  const orden = visibles;
  const peso = (x: { s: PrismStream; boton: string }) =>
    x.boton === 'FC' ? 0 : x.s.nativo === false ? 2 : 1;
  // El `i` desempata para que dentro de cada grupo se respete el orden del sitio.
  orden.sort((a, b) => peso(a) - peso(b) || a.i - b.i);

  return { streams: orden.map((x) => x.s), pageUrl: fullUrl };
}

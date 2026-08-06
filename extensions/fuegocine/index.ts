import { DESKTOP_UA } from '../../sdk/http';
import { decodeEntities } from '../../sdk/html';
import {
  fichaDe,
  resolverServidor,
  unlimplayAlDia,
  unlimplayMarcaMulti,
  servidoresDeUnlimplay,
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
const _UA_QUE_ANDAN = ['direct'];

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

    // ── unlimplay: todo sale de lo que tiene ADENTRO ────────────────────────
    //
    // No es un servidor, es un reproductor con su propio menú, y la página
    // publica ese menú en texto plano. **Todo lo que se ofrece sale de ahí**:
    // si un servidor no está en ese menú, no aparece — nada se inventa.
    //
    //   · el Direct, que es el único que se midió reproduciendo de forma
    //     confiable → botón propio, con rayo
    //   · "UA Multi" → abre la página, para elegir entre TODOS los demás
    //
    // Eso incluye al Direct: **"UA Directo" solo aparece si el menú lo trae**.
    // Antes se agregaba siempre por el solo hecho de que el título tuviera
    // unlimplay, y eso es suponer.
    //
    // Ojo con una cosa: el Direct se ofrece con la dirección del EMBED, no con
    // el m3u8 que el menú ya trae resuelto. Es a propósito — pasando por el
    // resolver, la dirección viene con el User-Agent correcto, y sin eso el CDN
    // contesta 403 (ver UA_NAVEGADOR en `servidores/comun.ts`).
    //
    // Medido el 2026-08-05/06 sobre From 3x5, Supergirl y La Casa del Dragón:
    //
    //   direct      ✔ reproduce, vía el resolver
    //   goodstream  ✔ resuelve, pero su CDN falla seguido en la app
    //   vidhide     ✔ resuelve, pero su nodo se cuelga sin devolver nada
    //   direct 2    ✗ "servidor no disponible": su token no vale como el otro
    //   remux       ✗ resuelve nulo aunque su host tenga ficha
    //   streamhg · filemoon · voe · streamwish · netu · doodstream  ✗
    //
    // Goodstream y Vidhide llegaron a salir como botón propio y se volvieron
    // atrás **a pedido del usuario**: resuelven, pero sus CDN fallan lo
    // suficiente como para que el botón prometa más de lo que cumple. Dos
    // botones que andan valen más que cinco que a veces sí y a veces no. Se
    // llegan por UA Multi, que es el menú del propio sitio.
    //
    // Los que fallan NO están medidos como imposibles: es que esta extensión
    // todavía no tiene su resolver, o el sitio no los sirve bien. Cuando alguno
    // pase a andar, se suma a `_UA_QUE_ANDAN` con su medición al lado.
    const adentro = await servidoresDeUnlimplay(url, `${BASE}/`);

    // **Si no se pudo leer el menú, igual se ofrece UA.** Sin esta red, un
    // pedido fallido a unlimplay dejaba el episodio SIN NINGÚN botón de UA —
    // pasó en From 3x5, que quedó solo con US. Y no es raro: unlimplay corta de
    // vez en cuando. Se sabe que el título tiene UA porque está en la lista del
    // sitio, así que se ofrece igual y que el resolver se arregle al elegirlo.
    if (!adentro.length) {
      for (const [nombre, esNativo] of [
        [`${link.name || 'UA'} Directo`, true],
        [`${link.name || 'UA'} Multi`, false],
      ] as [string, boolean][]) {
        fichas.push(ficha?.boton ?? '');
        streams.push({
          url: esNativo ? url : `${url}${unlimplayMarcaMulti}`,
          quality: nombre,
          nativo: esNativo,
        });
      }
      continue;
    }

    let hayMenu = false;
    for (const sv of adentro) {
      const clave = sv.nombre.toLowerCase();
      if (clave !== 'direct') hayMenu = true;
      if (_UA_QUE_ANDAN.indexOf(clave) === -1) continue;
      fichas.push(ficha?.boton ?? '');
      streams.push({
        // El Direct va por el embed y no por el m3u8 que el menú ya trae: así
        // pasa por el resolver, que le pone el User-Agent con el que el CDN lo
        // acepta. Con el m3u8 pelado, 403 (ver UA_NAVEGADOR en comun.ts).
        url,
        quality: `${link.name || 'UA'} Directo`,
        nativo: true,
      });
    }

    // El botón que abre la página, para todo lo demás. Solo si de verdad hay un
    // menú: si unlimplay trae únicamente el Direct, abrirla no suma nada.
    if (hayMenu) {
      fichas.push(ficha?.boton ?? '');
      streams.push({
        url: `${url}${unlimplayMarcaMulti}`,
        quality: `${link.name || 'UA'} Multi`,
        nativo: false,
      });
    }
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

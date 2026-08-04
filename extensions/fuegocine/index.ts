import { DESKTOP_UA } from '../../sdk/http';
import { decodeEntities } from '../../sdk/html';
import { resolveEmbed, b64decode } from '../../sdk/embeds';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream, PrismEpisode, PrismSeason } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://www.fuegocine.com';
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
// drive.google.com (requiere sesión/token, muy inestable para streaming
// directo) se descarta. upns.online (US) es una SPA sin datos en el HTML
// estático — no resoluble por regex acá — PERO se deja pasar sin resolver
// en vez de ocultarlo: confirmado en vivo que cuando el resolver nativo
// falla, PrismHub reintenta ESE mismo servidor con su propio WebView-sniffer
// (ejecuta JS real), que sí puede lograrlo donde este scraping estático no
// puede. Ocultarlo de la lista solo le quita esa segunda oportunidad.
const _NEVER_NATIVE_HOSTS = ['drive.google.com'];

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
function _conEsquema(url: string): string {
  const u = url.trim();
  if (u.indexOf('//') === 0) return `https:${u}`;
  if (!/^https?:\/\//i.test(u)) return `https://${u.replace(/^\/+/, '')}`;
  return u;
}

async function _resolveFinal(url: string): Promise<PrismStream | null> {
  if (/\.(mp4|mkv|webm|m3u8)(\?|$)/i.test(url) || url.indexOf('rumble.cloud') !== -1) {
    return { url, quality: 'Servidor' };
  }
  const res = await resolveEmbed('Servidor', url, `${BASE}/`);
  if (res?.url) return { url: res.url, quality: 'Servidor', headers: res.headers };
  return null;
}

/**
 * La ruta actual de un embed de unlimplay: `/f/embed/...`.
 *
 * El sitio guarda enlaces con rutas viejas —`/play/embed/...` y
 * `/play.php/embed/...`— y con esas devuelve su portada en vez del embed, asi
 * que el reproductor abria la pagina de inicio del sitio. Medido con los
 * mismos titulos: `/play.php/embed/movie/7131` y `/play/embed/movie/7131` no
 * traen nada, y `/f/embed/movie/7131` si. Las que hoy funcionan con
 * `/play/embed/` tambien funcionan con `/f/embed/`, o sea que normalizar no le
 * saca nada a las que ya andaban.
 */
function _unlimplayAlDia(url: string): string {
  return url.replace(/\/(?:play\.php|play|f)\/embed\//, '/f/embed/');
}

async function _resolveUnlimplay(url: string): Promise<PrismStream | null> {
  const html = await _get(_unlimplayAlDia(url));
  if (typeof html !== 'string') return null;
  const m = /"direct[^"]*":"([^"]+\.m3u8[^"]*)"/.exec(html);
  if (!m) return null;
  return { url: m[1].replace(/\\\//g, '/'), quality: 'Servidor' };
}

async function _resolveServerUrl(url: string): Promise<PrismStream | null> {
  if (url.indexOf('blogspot.com') !== -1) {
    const linkM = /[?&]link=([^&]+)/.exec(url);
    if (linkM) return _resolveFinal(_conEsquema(decodeURIComponent(linkM[1])));
    const rM = /[?&]r=([A-Za-z0-9+/=]+)$/.exec(url);
    if (rM) {
      try {
        return _resolveFinal(_conEsquema(b64decode(rM[1])));
      } catch {
        return null;
      }
    }
    return null;
  }
  if (url.indexOf('unlimplay.com') !== -1) return _resolveUnlimplay(url);

  const res = await resolveEmbed('Servidor', url, `${BASE}/`);
  if (res?.url) return { url: res.url, quality: 'Servidor', headers: res.headers };
  return null;
}

function _parseSvLinks(html: string): { name: string; url: string }[] {
  const start = html.indexOf('const _SV_LINKS');
  if (start === -1) return [];
  const end = html.indexOf('</script>', start);
  const block = html.slice(start, end === -1 ? undefined : end);
  const re = /lang:\s*"([^"]*)"\s*,\s*name:\s*"([^"]*)"\s*,\s*quality:\s*"([^"]*)"\s*,\s*url:\s*"([^"]*)"/g;
  const out: { name: string; url: string }[] = [];
  for (const m of block.matchAll(re)) {
    out.push({ name: m[2].replace(/&#\d+;/g, '').trim(), url: m[4] });
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
      /* sigue abajo con la URL cruda */
    }
    return { streams: [{ url, quality: 'Servidor' }], pageUrl: '' };
  }

  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  if (typeof html !== 'string') return { streams: [], pageUrl: fullUrl };

  const links = _parseSvLinks(html);
  const streams: PrismStream[] = [];
  for (const link of links) {
    if (_NEVER_NATIVE_HOSTS.some((h) => link.url.indexOf(h) !== -1)) continue;
    // Se normaliza acá también, y no solo al resolver: esta es la dirección que
    // se le entrega a la app, y es la que abre el navegador interno cuando el
    // camino nativo no alcanza. Con la ruta vieja, ahí se veía la portada del
    // sitio en vez del reproductor.
    const url =
      link.url.indexOf('unlimplay.com') !== -1 ? _unlimplayAlDia(link.url) : link.url;
    streams.push({ url, quality: link.name || 'Servidor' });
  }
  return { streams, pageUrl: fullUrl };
}

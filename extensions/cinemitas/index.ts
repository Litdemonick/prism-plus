import { stripTags, decodeEntities } from '../../sdk/html';
import { resolveEmbed, b64decode } from '../../sdk/embeds';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream, PrismEpisode } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://cinemitas.org';

async function _get(url: string): Promise<string> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([url, { method: 'get', headers: { Referer: `${BASE}/` } }]),
  );
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function _buildQuery(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value) parts.push(`${key}=${encodeURIComponent(value)}`);
  }
  return parts.join('&');
}

function _fullUrl(url: string): string {
  if (url.indexOf('http') === 0) return url;
  return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ─── Catálogo ───────────────────────────────────────────────────────────────
// Tema WordPress "Dooplay" — confirmado en vivo: catálogo en /movies/ y
// /tvshows/, paginado como /movies/page/N/. Cada tarjeta es un <article
// id="post-ID" class="item movies|tvshows">.

function _parseCatalog(html: string, forceType?: 'series'): PrismItem[] {
  const items: PrismItem[] = [];
  const re =
    /<article id="post-\d+"[^>]*>\s*<div class="poster">\s*<img src="([^"]+)"[^>]*alt="([^"]*)">(?:\s*<div class="rating">([^<]*)<\/div>)?[\s\S]*?<a href="(https:\/\/cinemitas\.org\/(?:movies|tvshows)\/[a-z0-9-]+\/)">[\s\S]*?<\/article>/g;
  for (const m of html.matchAll(re)) {
    const rating = parseFloat(m[3] ?? '');
    items.push({
      title: decodeEntities(m[2].trim()),
      url: m[4],
      cover: m[1],
      rating: Number.isFinite(rating) && rating > 0 ? rating : undefined,
      type: forceType,
    });
  }
  return items;
}

// Sin filtro de tipo, se mezclan página a página películas y series — el
// homepage del sitio no tiene un feed combinado paginado propio, así que
// se arma acá interlazando las dos secciones reales.
export async function latest(page: number): Promise<PrismItem[]> {
  const [moviesHtml, seriesHtml] = await Promise.all([
    _get(`${BASE}/movies/page/${page}/`),
    _get(`${BASE}/tvshows/page/${page}/`),
  ]);
  const movies = _parseCatalog(moviesHtml);
  const series = _parseCatalog(seriesHtml, 'series');
  const merged: PrismItem[] = [];
  const max = Math.max(movies.length, series.length);
  for (let i = 0; i < max; i++) {
    if (movies[i]) merged.push(movies[i]);
    if (series[i]) merged.push(series[i]);
  }
  return merged;
}

// ─── Búsqueda ───────────────────────────────────────────────────────────────
// La búsqueda por URL (?s=query) está bloqueada por un Managed Challenge de
// Cloudflare (confirmado en vivo, "Just a moment..." — igual que m440.in,
// no hay forma de resolverlo sin un navegador real). El tema Dooplay expone
// SU PROPIA API de búsqueda en vivo (/wp-json/dooplay/search/), que sí
// funciona con curl — pero exige un nonce de WordPress que expira, así que
// se extrae en vivo del home (embebido en base64 dentro de un <script>) y
// se cachea, reintentando una vez con un nonce fresco si vence.
let _cachedNonce: string | null = null;

async function _fetchNonce(): Promise<string | null> {
  const home = await _get(`${BASE}/`);
  if (typeof home !== 'string') return null;
  const b64M =
    /id="live_search-js-extra"\s+src="data:text\/javascript;base64,([A-Za-z0-9+/=]+)"/.exec(
      home,
    );
  if (!b64M) return null;
  try {
    const decoded = b64decode(b64M[1]);
    const nonceM = /"nonce":"([a-f0-9]+)"/.exec(decoded);
    return nonceM?.[1] ?? null;
  } catch {
    return null;
  }
}

async function _getNonce(): Promise<string | null> {
  if (_cachedNonce) return _cachedNonce;
  _cachedNonce = await _fetchNonce();
  return _cachedNonce;
}

interface _DooplaySearchResult {
  title: string;
  url: string;
  img?: string;
  extra?: { date?: string; imdb?: string | boolean };
}

function _dooplayResultsToItems(obj: Record<string, _DooplaySearchResult>): PrismItem[] {
  const items: PrismItem[] = [];
  for (const key of Object.keys(obj)) {
    const r = obj[key];
    if (!r?.title || !r?.url) continue;
    const year = parseInt(r.extra?.date ?? '', 10);
    const ratingRaw = r.extra?.imdb;
    const rating = typeof ratingRaw === 'string' ? parseFloat(ratingRaw) : undefined;
    items.push({
      title: decodeEntities(r.title),
      url: r.url,
      cover: r.img,
      year: Number.isFinite(year) ? year : undefined,
      rating: rating !== undefined && Number.isFinite(rating) ? rating : undefined,
      type: r.url.indexOf('/tvshows/') !== -1 ? 'series' : undefined,
    });
  }
  return items;
}

async function _dooplaySearch(keyword: string): Promise<PrismItem[]> {
  const nonce = await _getNonce();
  if (!nonce) return [];
  const query = `keyword=${encodeURIComponent(keyword)}&nonce=${nonce}`;
  let res = await _get(`${BASE}/wp-json/dooplay/search/?${query}`);
  if (typeof res !== 'string' && (res as any)?.error) {
    // Nonce vencido — refrescar una vez y reintentar.
    _cachedNonce = null;
    const fresh = await _getNonce();
    if (!fresh) return [];
    res = await _get(`${BASE}/wp-json/dooplay/search/?keyword=${encodeURIComponent(keyword)}&nonce=${fresh}`);
  }
  if (typeof res === 'string' || (res as any)?.error) return [];
  return _dooplayResultsToItems(res as Record<string, _DooplaySearchResult>);
}

const _TYPE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  movies: 'Películas',
  tvshows: 'Series',
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
  const tipo = filter?.['tipo']?.[0];

  if (!keyword.trim()) {
    // Sin palabra clave: navegar el catálogo real por sección (lo que la
    // API de búsqueda de Dooplay no ofrece, es solo texto libre).
    if (tipo === 'movies') return _parseCatalog(await _get(`${BASE}/movies/page/${page}/`));
    if (tipo === 'tvshows') {
      return _parseCatalog(await _get(`${BASE}/tvshows/page/${page}/`), 'series');
    }
    return latest(page);
  }

  // La API de búsqueda de Dooplay no pagina — solo tiene sentido en la
  // página 1 (páginas siguientes devuelven vacío en vez de repetir todo).
  if (page > 1) return [];
  const results = await _dooplaySearch(keyword.trim());
  if (tipo === 'movies') return results.filter((i) => i.url.indexOf('/movies/') !== -1);
  if (tipo === 'tvshows') return results.filter((i) => i.url.indexOf('/tvshows/') !== -1);
  return results;
}

// ─── Detalle ────────────────────────────────────────────────────────────────

// El sitio agrega nombres de sitios competidores/espejo como si fueran
// "géneros" (confirmado en vivo: "Aquipelis", "Cinecalidad", "Pelisflix",
// etc., mezclados con géneros reales como "Drama") — se usa una lista
// blanca de géneros reales (nomenclatura TMDB en español, de donde
// claramente vienen las portadas/metadatos) en vez de intentar bloquear
// cada nombre de sitio nuevo que agreguen.
const _REAL_GENRES = new Set([
  'acción', 'accion', 'acción y aventura', 'aventura', 'animación', 'animacion',
  'comedia', 'crimen', 'documental', 'drama', 'familia', 'fantasía', 'fantasia',
  'historia', 'terror', 'música', 'musica', 'misterio', 'romance',
  'ciencia ficción', 'ciencia ficcion', 'ciencia ficción y fantasía',
  'película de tv', 'pelicula de tv', 'suspense', 'suspenso', 'bélica', 'belica',
  'guerra', 'guerra y política', 'guerra y politica', 'western', 'wéstern',
  'reality', 'kids', 'infantil', 'soap', 'talk', 'news',
]);

function _isSeriesUrl(url: string): boolean {
  return url.indexOf('/tvshows/') !== -1 || url.indexOf('/episodes/') !== -1;
}

export async function detail(url: string): Promise<PrismDetail> {
  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  const isSeries = _isSeriesUrl(fullUrl);

  const title = /<h1[^>]*>\s*([^<]+?)\s*<\/h1>/i.exec(html)?.[1]?.trim() ?? '';

  let cover = /<div class="poster">\s*<img[^>]*itemprop="image"\s+src="([^"]+)"/i.exec(html)?.[1];
  // TMDB sirve varios tamaños con el mismo path — el catálogo trae w185
  // (miniatura), pero el detalle puede mostrarse más grande.
  if (cover) cover = cover.replace('/w185/', '/w500/');

  const description = stripTags(/<\/h3>\s*<p>([^<]+)<\/p>/i.exec(html)?.[1] ?? '').trim();

  const genres: string[] = [];
  const generosBlock = /class="sgeneros">([\s\S]*?)<\/div>/i.exec(html)?.[1] ?? '';
  for (const m of generosBlock.matchAll(/rel="tag">\s*([^<]+?)\s*</g)) {
    const name = decodeEntities(m[1].trim());
    if (_REAL_GENRES.has(name.toLowerCase())) genres.push(name);
  }

  const yearM = /class='date'[^>]*>([^<]*(\d{4}))?[^<]*</i.exec(html);
  const year = yearM ? parseInt((yearM[0].match(/\d{4}/) ?? [])[0] ?? '', 10) : undefined;

  // "dt_rating_vgs" es una encuesta de votos de LOS VISITANTES del sitio
  // (a veces un solo voto, nada que ver con el puntaje real) — confirmado
  // en vivo. El rating real (IMDb, igual al que muestra el catálogo) está
  // en el bloque "custom_fields" con id="repimdb".
  const ratingM = /id="repimdb"><strong>([\d.]+)<\/strong>/i.exec(html);
  const rating = ratingM ? parseFloat(ratingM[1]) : undefined;

  const extra: Record<string, string> = {};
  const durM = /itemprop='duration'[^>]*>([^<]+)</i.exec(html);
  if (durM) extra['Duración'] = durM[1].trim();
  const countryM = /<span class='country'>([^<]+)</i.exec(html);
  if (countryM) extra['País'] = countryM[1].trim();
  const dirM = /<strong>Dirección:<\/strong>\s*([^<]+)</i.exec(html);
  if (dirM) extra['Dirección'] = decodeEntities(dirM[1].trim());
  const castM = /<strong>Estrellas:<\/strong>\s*([^<]+)</i.exec(html);
  if (castM) extra['Reparto'] = decodeEntities(castM[1].trim());

  const episodes: PrismEpisode[] = [];
  const seasons: PrismDetail['seasons'] = [];

  if (isSeries) {
    // Temporadas/episodios — confirmado en vivo: #seasons .se-c por
    // temporada, cada uno con su propio <ul class="episodios"> de <li>.
    const seasonBlockRe = /<span class='se-t[^']*'>(\d+)<\/span>[\s\S]*?<div class='se-a'[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
    for (const sm of html.matchAll(seasonBlockRe)) {
      const seasonNum = sm[1];
      const seasonHtml = sm[2];
      const seasonEpisodes: PrismEpisode[] = [];
      const epRe =
        /<div class='numerando'>[^<]*<\/div><div class='episodiotitle'><a href='([^']+)'>([^<]+)<\/a>/g;
      for (const em of seasonHtml.matchAll(epRe)) {
        seasonEpisodes.push({ title: decodeEntities(em[2].trim()), url: em[1] });
      }
      if (seasonEpisodes.length > 0) {
        seasons.push({ title: `Temporada ${seasonNum}`, episodes: seasonEpisodes });
        episodes.push(...seasonEpisodes);
      }
    }
  } else {
    // Película: no hay episodios reales — un solo ítem que apunta a la
    // propia página, watch() detecta que es type='movie' por la URL.
    episodes.push({ title: 'Película completa', url: fullUrl });
  }

  return {
    title,
    cover,
    description,
    genres,
    episodes,
    seasons: seasons.length > 0 ? seasons : undefined,
    year: Number.isFinite(year as number) ? year : undefined,
    rating: rating !== undefined && Number.isFinite(rating) ? rating : undefined,
    extra: Object.keys(extra).length > 0 ? extra : undefined,
  };
}

// ─── Reproducción ───────────────────────────────────────────────────────────

// bysezoxexe.com: confirmado en vivo que es una SPA (React/Vue, bundle JS de
// >280KB minificado) sin ningún dato de stream en el HTML estático — a
// diferencia de los demás servidores (uqload, vibuxer), no hay jwplayer ni
// eval empaquetado que desofuscar, la página solo monta una app que arma el
// player client-side. No hay patrón de regex posible sin ejecutar ese JS
// (QuickJS no tiene DOM), así que se descarta igual que Mega en otras
// extensiones de este repo.
const _NEVER_NATIVE_HOSTS = ['bysezoxexe.com'];

async function _fetchServerEmbeds(
  postId: string,
  type: 'movie' | 'tv',
  labels: Record<string, string>,
): Promise<PrismStream[]> {
  const streams: PrismStream[] = [];
  for (const nume of Object.keys(labels)) {
    if (nume === 'trailer') continue;
    let raw: string;
    try {
      raw = await sendMessage(
        'request',
        JSON.stringify([
          `${BASE}/wp-admin/admin-ajax.php`,
          {
            method: 'post',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Requested-With': 'XMLHttpRequest',
              Referer: `${BASE}/`,
            },
            data: `action=doo_player_ajax&post=${postId}&type=${type}&nume=${nume}`,
          },
        ]),
      );
    } catch {
      continue;
    }
    let parsed: { embed_url?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const embedUrl = parsed?.embed_url;
    if (!embedUrl || typeof embedUrl !== 'string') continue;
    if (_NEVER_NATIVE_HOSTS.some((h) => embedUrl.indexOf(h) !== -1)) continue;
    streams.push({ url: embedUrl, quality: labels[nume] });
  }
  return streams;
}

export async function watch(url: string): Promise<PrismWatch> {
  // Fast-path: embed externo (switchServer pidiendo resolver UN servidor
  // puntual) — mismo patrón que las demás extensiones de este repo.
  if (url.indexOf('http') === 0 && url.indexOf('cinemitas.org') === -1) {
    try {
      const res = await resolveEmbed('Servidor', url, `${BASE}/`);
      if (res && res.url) {
        return { streams: [{ url: res.url, quality: 'Servidor', headers: res.headers }], pageUrl: '' };
      }
    } catch {
      /* sigue abajo con la URL cruda */
    }
    return { streams: [{ url, quality: 'Servidor' }], pageUrl: '' };
  }

  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  const isSeries = fullUrl.indexOf('/episodes/') !== -1;

  const postM = /id='playeroptionsul'[\s\S]*?data-post='(\d+)'/.exec(html);
  const postId = postM?.[1];
  if (!postId) return { streams: [], pageUrl: fullUrl };

  const labels: Record<string, string> = {};
  const optRe =
    /<li id='player-option-(\w+)' class='dooplay_player_option'[^>]*data-nume='(\w+)'[^>]*>[\s\S]*?<span class='title'>([^<]+)<\/span>/g;
  for (const m of html.matchAll(optRe)) {
    labels[m[2]] = decodeEntities(m[3].trim());
  }

  const streams = await _fetchServerEmbeds(postId, isSeries ? 'tv' : 'movie', labels);
  return { streams, pageUrl: fullUrl };
}

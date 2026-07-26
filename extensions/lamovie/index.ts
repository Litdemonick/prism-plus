import { resolveEmbed } from '../../sdk/embeds';
import type {
  PrismItem,
  PrismDetail,
  PrismWatch,
  PrismStream,
  PrismEpisode,
  PrismSeason,
  MediaType,
} from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://lamovie.org';
const API = 'https://lamovie.org/wp-api/v1';
const IMG = 'https://lamovie.org/wp-content/uploads';

// El sitio es una app 100% client-side (React sobre WordPress) — no hay HTML
// para scrapear, todo el catálogo/búsqueda/detalle/servidores sale de esta
// API propia (siteConfig.fastApi en el HTML del sitio, no la REST estándar de
// WP, que no expone nada útil). Verificada en vivo con curl contra cada
// endpoint.
async function _get<T = any>(url: string): Promise<T> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([url, { method: 'get', headers: { Referer: `${BASE}/` } }]),
  );
  return JSON.parse(raw) as T;
}

// ─── Tipos de contenido ─────────────────────────────────────────────────────
// Confirmado en vivo vía siteConfig.permalinks.types del HTML del sitio.
type PostType = 'movies' | 'tvshows' | 'animes' | 'novels';
const POST_TYPES: PostType[] = ['movies', 'tvshows', 'animes', 'novels'];
const PERMALINK: Record<PostType, string> = {
  movies: 'peliculas',
  tvshows: 'series',
  animes: 'animes',
  novels: 'novelas',
};
// novels = telenovelas (contenido de video, no libros) — MediaType 'series'
// es lo correcto acá, 'novel' del SDK es para light novels/libros.
function _mediaType(postType: string): MediaType {
  if (postType === 'movies') return 'movie';
  if (postType === 'animes') return 'anime';
  return 'series'; // tvshows, novels
}
function _isSerial(postType: string): boolean {
  return postType !== 'movies';
}

// ─── Taxonomías (id -> nombre) ──────────────────────────────────────────────
// Estático, tomado en vivo de siteConfig.datas del HTML del sitio —
// mismo criterio que otras extensiones de este repo con listas de géneros
// fijas: si el sitio agrega un término nuevo, ese id puntual no se traduce
// hasta actualizar esta lista, pero el resto sigue andando normal.
const _GENRES: Record<number, string> = {
  17: 'Drama', 18: 'Comedia', 33: 'Suspense', 32: 'Acción', 520: 'Animación',
  96: 'Terror', 180: 'Crimen', 130: 'Aventura', 115: 'Romance', 398: 'Familia',
  97: 'Misterio', 131: 'Ciencia ficción', 229: 'Fantasía', 704: 'Sci-Fi & Fantasy',
  705: 'Action & Adventure', 164: 'Documental', 165: 'Historia', 8: 'Música',
  6787: 'Película de TV', 3056: 'Bélica', 674: 'Western', 703: 'Kids',
  786: 'War & Politics', 12485: 'Reality', 19824: 'Soap',
};
const _QUALITIES: Record<number, string> = {
  495: 'Full HD', 496: 'Dual 1080p', 649: 'HD', 58679: 'BDRip', 58681: 'HDTV',
  59268: 'Dual 720p', 58683: 'WEB-DL 720p', 53691: 'DVDRip',
  58680: 'BDRip 1080p IMAX', 12703: 'HD1080p', 58678: 'WEB-DL 1080p',
  26624: '4K', 69831: 'WEB-DL 4k', 82756: '4K HDR', 58682: 'BRRip 1080p IMAX',
  49673: '1080P', 80332: 'REMUX 1080p', 87134: 'HD 1080P',
};
const _LANGS: Record<number, string> = {
  58651: 'Latino', 58652: 'Inglés', 58654: 'Japonés', 58655: 'Subtitulado',
  58653: 'Castellano', 58667: 'Coreano', 58661: 'Portugués',
};

// ─── Modelos de la API ──────────────────────────────────────────────────────
interface LMImages {
  poster?: string;
  backdrop?: string;
  logo?: string;
}
interface LMPost {
  _id: number;
  title: string;
  overview?: string;
  slug: string;
  images?: LMImages;
  rating?: string;
  genres?: number[];
  quality?: number[];
  countries?: number[];
  lang?: number[];
  years?: number[];
  type: string;
  certification?: string;
  release_date?: string;
  runtime?: string;
  original_title?: string;
  latest_episode?: unknown;
}
interface LMEpisode {
  _id: number;
  title: string;
  slug: string;
  overview?: string;
  runtime?: string;
  still_path?: string;
  season_number: number;
  episode_number: number;
  date?: string;
}
interface LMPage<T> {
  error: boolean;
  message?: string;
  data?: { posts: T[]; pagination?: { current_page: number; last_page: number; total: number } };
}
interface LMSingle {
  error: boolean;
  data?: LMPost;
}
interface LMPlayer {
  error: boolean;
  data?: {
    embeds: { url: string; server: string; lang?: string; quality?: string }[];
  };
}

function _cover(images?: LMImages): string | undefined {
  const p = images?.poster;
  if (!p) return undefined;
  return p.indexOf('http') === 0 ? p : `${IMG}${p}`;
}

// URL de la página del sitio para este post — usada como identificador de
// PrismItem/PrismDetail (url). Se reconstruye el postType+slug desde acá al
// pedir detail()/watch().
function _postUrl(postType: string, slug: string): string {
  const seg = PERMALINK[postType as PostType] ?? postType;
  return `${BASE}/${seg}/${slug}/`;
}

function _yearFromDate(date?: string): number | undefined {
  if (!date) return undefined;
  const y = parseInt(date.slice(0, 4), 10);
  return Number.isFinite(y) ? y : undefined;
}

function _tagsFromGenres(genres?: number[]): string[] | undefined {
  if (!genres || genres.length === 0) return undefined;
  const names = genres.map((g) => _GENRES[g]).filter((n): n is string => !!n);
  return names.length ? names : undefined;
}

function _itemFromPost(p: LMPost): PrismItem {
  return {
    title: p.title,
    url: _postUrl(p.type, p.slug),
    cover: _cover(p.images),
    description: p.overview,
    tags: _tagsFromGenres(p.genres),
    year: _yearFromDate(p.release_date),
    rating: p.rating ? parseFloat(p.rating) : undefined,
    type: _mediaType(p.type),
  };
}

// ─── Filtro (género/año/calidad/idioma/tipo) ────────────────────────────────
// OJO: no se pudo confirmar el formato real del parámetro `filter` que usa el
// sitio (varias formas probadas contra /listing/ y /search en vivo no
// cambiaron los resultados) — se aplica en el cliente, filtrando localmente
// por los ids que cada post ya trae (genres/years/quality/lang), mismo
// criterio que Olympus usa para género/estado en su búsqueda por texto.
interface LMFilter {
  postType?: PostType;
  genre?: number;
  year?: number;
  quality?: number;
  lang?: number;
}

function _parseFilter(filter?: Record<string, string[]>): LMFilter {
  const postType = filter?.['tipo']?.[0] as PostType | undefined;
  const genre = filter?.['genero']?.[0] ? parseInt(filter['genero'][0], 10) : undefined;
  const year = filter?.['anio']?.[0] ? parseInt(filter['anio'][0], 10) : undefined;
  const quality = filter?.['calidad']?.[0] ? parseInt(filter['calidad'][0], 10) : undefined;
  const lang = filter?.['idioma']?.[0] ? parseInt(filter['idioma'][0], 10) : undefined;
  return {
    postType: postType && POST_TYPES.includes(postType) ? postType : undefined,
    genre, year, quality, lang,
  };
}

function _matchesFilter(p: LMPost, f: LMFilter): boolean {
  if (f.genre && !(p.genres || []).includes(f.genre)) return false;
  if (f.quality && !(p.quality || []).includes(f.quality)) return false;
  if (f.lang && !(p.lang || []).includes(f.lang)) return false;
  if (f.year && _yearFromDate(p.release_date) !== f.year) return false;
  return true;
}

export async function createFilter(): Promise<Record<string, unknown>> {
  const genreOptions: Record<string, string> = { '': 'Todos' };
  for (const [id, name] of Object.entries(_GENRES)) genreOptions[id] = name;
  const qualityOptions: Record<string, string> = { '': 'Todas' };
  for (const [id, name] of Object.entries(_QUALITIES)) qualityOptions[id] = name;
  const langOptions: Record<string, string> = { '': 'Todos' };
  for (const [id, name] of Object.entries(_LANGS)) langOptions[id] = name;
  const tipoOptions: Record<string, string> = {
    '': 'Todos', movies: 'Películas', tvshows: 'Series', animes: 'Animes', novels: 'Novelas',
  };
  const currentYear = new Date().getFullYear();
  const yearOptions: Record<string, string> = { '': 'Todos' };
  for (let y = currentYear + 1; y >= 1970; y--) yearOptions[String(y)] = String(y);

  return {
    tipo: { title: 'Tipo', options: tipoOptions, default: '', min: 1, max: 1 },
    genero: { title: 'Género', options: genreOptions, default: '', min: 1, max: 1 },
    anio: { title: 'Año', options: yearOptions, default: '', min: 1, max: 1 },
    calidad: { title: 'Calidad', options: qualityOptions, default: '', min: 1, max: 1 },
    idioma: { title: 'Idioma', options: langOptions, default: '', min: 1, max: 1 },
  };
}

// ─── Catálogo ───────────────────────────────────────────────────────────────
// Página real de la API (postsPerPage sí funciona acá, a diferencia de
// /search — ver más abajo). Con filtro activo se pide de a una página cruda
// por vez y se filtra local, avanzando hasta juntar una página completa o
// agotar el catálogo (mismo criterio de reintento que ya usa la app del
// lado cliente para "rellenar" una página de vista).
async function _listing(postType: PostType, page: number, f: LMFilter): Promise<PrismItem[]> {
  const perPage = 20;
  const hasClientFilter = !!(f.genre || f.year || f.quality || f.lang);
  if (!hasClientFilter) {
    const res = await _get<LMPage<LMPost>>(
      `${API}/listing/${postType}?page=${page}&postType=${postType}&postsPerPage=${perPage}&orderBy=date&order=desc`,
    );
    if (res.error || !res.data) return [];
    return res.data.posts.map(_itemFromPost);
  }
  // Filtro local: la página pedida no corresponde 1:1 a una página cruda
  // (algunos posts crudos no matchean el filtro) — se avanza por páginas
  // crudas empezando donde correspondería si nada se filtrara, ajustando
  // hacia adelante hasta juntar contenido real.
  const items: PrismItem[] = [];
  let rawPage = page;
  const maxRawFetches = 6;
  for (let attempt = 0; attempt < maxRawFetches && items.length < perPage; attempt++, rawPage++) {
    const res = await _get<LMPage<LMPost>>(
      `${API}/listing/${postType}?page=${rawPage}&postType=${postType}&postsPerPage=${perPage}&orderBy=date&order=desc`,
    );
    if (res.error || !res.data || res.data.posts.length === 0) break;
    for (const p of res.data.posts) {
      if (_matchesFilter(p, f)) items.push(_itemFromPost(p));
    }
  }
  return items;
}

export async function latest(page: number, filter?: Record<string, string[]>): Promise<PrismItem[]> {
  const f = _parseFilter(filter);
  const postType = f.postType ?? 'movies';
  return _listing(postType, page, f);
}

// ─── Búsqueda ───────────────────────────────────────────────────────────────
// /search de la API devuelve UN resultado por "página" cruda (confirmado en
// vivo: postsPerPage/limit/count/etc no cambian eso, per_page siempre vuelve
// en 1) — se pagina puertas adentro pidiendo varias páginas crudas en
// paralelo para armar una página de vista real, mismo espíritu que el ajuste
// de paginación de FuegoCine esta sesión.
export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const kw = keyword.trim();
  const f = _parseFilter(filter);
  if (!kw) return latest(page, filter);
  if (kw.length < 3) return [];

  const perPage = 20;
  const rawStart = (page - 1) * perPage + 1;
  const requests = Array.from({ length: perPage }, (_, i) =>
    _get<LMPage<LMPost>>(`${API}/search?q=${encodeURIComponent(kw)}&page=${rawStart + i}`).catch(
      () => null,
    ),
  );
  const results = await Promise.all(requests);
  const items: PrismItem[] = [];
  for (const res of results) {
    const post = res?.data?.posts?.[0];
    if (!post) continue;
    if (f.postType && post.type !== f.postType) continue;
    if (!_matchesFilter(post, f)) continue;
    items.push(_itemFromPost(post));
  }
  return items;
}

// ─── Detalle ────────────────────────────────────────────────────────────────
function _parsePostUrl(url: string): { postType: PostType; slug: string } | null {
  for (const pt of POST_TYPES) {
    const seg = PERMALINK[pt];
    const m = new RegExp(`/${seg}/([^/]+)/?`).exec(url);
    if (m) return { postType: pt, slug: m[1] };
  }
  return null;
}

async function _fetchSeasons(showId: number, maxSeasons = 30): Promise<PrismSeason[]> {
  const seasons: PrismSeason[] = [];
  for (let season = 1; season <= maxSeasons; season++) {
    const res = await _get<LMPage<LMEpisode>>(
      `${API}/single/episodes/list?_id=${showId}&season=${season}&page=1&postsPerPage=100`,
    );
    const posts = res?.data?.posts ?? [];
    if (posts.length === 0) break;
    const episodes: PrismEpisode[] = posts.map((e) => ({
      title: e.title,
      url: `${BASE}/episodio/${e.slug}/?showId=${showId}&s=${e.season_number}&e=${e.episode_number}&epId=${e._id}`,
      thumbnail: e.still_path ? `https://image.tmdb.org/t/p/original${e.still_path}` : undefined,
      duration: e.runtime ? parseInt(e.runtime, 10) * 60 : undefined,
      airDate: e.date ? e.date.slice(0, 10) : undefined,
      number: e.episode_number,
    }));
    seasons.push({ title: `Temporada ${season}`, episodes });
  }
  return seasons;
}

export async function detail(url: string): Promise<PrismDetail> {
  const parsed = _parsePostUrl(url);
  if (!parsed) throw new Error('URL de LaMovie no reconocida');
  const { postType, slug } = parsed;
  const res = await _get<LMSingle>(
    `${API}/single/${postType}?slug=${encodeURIComponent(slug)}&postType=${postType}`,
  );
  if (res.error || !res.data) throw new Error('No se pudo cargar el detalle en LaMovie');
  const p = res.data;

  const episodesFlat: PrismEpisode[] = [];
  let seasons: PrismSeason[] | undefined;
  if (_isSerial(postType)) {
    seasons = await _fetchSeasons(p._id);
  } else {
    // Película: un solo "episodio" (la propia película) para que el flujo
    // de reproducción sea el mismo watch(url) con postId en la query.
    episodesFlat.push({
      title: p.title,
      url: `${BASE}/peliculas/${slug}/?showId=${p._id}`,
    });
  }

  return {
    title: p.title,
    cover: _cover(p.images),
    description: p.overview,
    episodes: episodesFlat,
    seasons,
    genres: _tagsFromGenres(p.genres),
    year: _yearFromDate(p.release_date),
    rating: p.rating ? parseFloat(p.rating) : undefined,
    extra: {
      ...(p.original_title ? { 'Título original': p.original_title } : {}),
      ...(p.certification ? { Clasificación: p.certification } : {}),
    },
    type: 'bangumi',
  };
}

// ─── Reproducción ───────────────────────────────────────────────────────────
// Los tres jugadores que este sitio usa por defecto (siteConfig.player.prior:
// vimeos/goodstream/voe) son hosts propios/poco comunes — igual se
// intenta resolverlos con el resolver genérico compartido (desempaqueta
// eval(p,a,c,k) y busca m3u8/mp4), y si eso falla, la app cae sola al
// WebView (mismo mecanismo que el resto de las extensiones de video).
function _postIdFromUrl(url: string): number | null {
  const m = /[?&]showId=(\d+)/.exec(url) || /[?&]epId=(\d+)/.exec(url);
  return m ? parseInt(m[1], 10) : null;
}

export async function watch(url: string): Promise<PrismWatch> {
  // Servidor externo ya elegido (switchServer) — resolver directo.
  if (url.indexOf('http') === 0 && url.indexOf(BASE) === -1) {
    const stream = await resolveEmbed(_guessServerName(url), url, `${BASE}/`);
    if (stream) {
      return { streams: [{ url: stream.url, headers: stream.headers }], pageUrl: '' };
    }
    return { streams: [], pageUrl: url };
  }

  const postId = _postIdFromUrl(url);
  if (postId == null) throw new Error('No se pudo identificar el contenido en LaMovie');

  const res = await _get<LMPlayer>(`${API}/player?postId=${postId}&demo=0`);
  if (res.error || !res.data) return { streams: [], pageUrl: url };

  const embeds = res.data.embeds || [];
  const resolved = await Promise.all(
    embeds.map(async (e): Promise<PrismStream | null> => {
      const r = await resolveEmbed(e.server || _guessServerName(e.url), e.url, `${BASE}/`);
      if (!r) return null;
      const label = [e.server, e.lang, e.quality].filter(Boolean).join(' ');
      return { url: r.url, headers: r.headers, quality: label || undefined };
    }),
  );
  const streams = resolved.filter((s): s is PrismStream => s !== null);

  // Si ninguno se pudo resolver, dejar el primer embed crudo como pageUrl —
  // así el WebView fallback puede intentarlo igual (el sitio muestra su
  // propio player embebido en esa página).
  if (streams.length === 0 && embeds.length > 0) {
    return { streams: [], pageUrl: embeds[0].url };
  }
  return { streams };
}

function _guessServerName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Embed';
  }
}

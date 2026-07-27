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
// Solo las que de verdad aparecen en el catálogo — confirmado en vivo
// escaneando +300 títulos reales (películas/series/animes): 4K, BDRip,
// REMUX, WEB-DL y el resto de la lista original (sacada de siteConfig.datas,
// que junta TODAS las etiquetas creadas alguna vez en el sitio, usadas o no)
// no aparecieron en ningún ítem — dejarlas como opción de filtro solo
// garantiza un "no hay datos" seguro.
const _QUALITIES: Record<number, string> = {
  495: 'Full HD', 496: 'Dual 1080p', 649: 'HD', 59268: 'Dual 720p', 58681: 'HDTV',
};
const _LANGS: Record<number, string> = {
  58651: 'Latino', 58652: 'Inglés', 58654: 'Japonés', 58655: 'Subtitulado',
  58653: 'Castellano', 58667: 'Coreano', 58661: 'Portugués',
};
const _COUNTRIES: Record<number, string> = {
  457: 'Estados Unidos', 774: 'Reino Unido', 787: 'Canadá', 617: 'Francia',
  5436: 'México', 2499: 'España', 733: 'Japón', 4601: 'Corea del Sur',
  1431: 'Alemania', 3912: 'Italia', 7746: 'Argentina', 2654: 'Australia',
  3416: 'India', 3623: 'Brasil', 1198: 'China', 3057: 'Polonia',
  9620: 'Rusia', 7483: 'Irlanda', 1364: 'Dinamarca', 12155: 'Colombia',
  11668: 'Turquía', 8300: 'Suecia', 9100: 'Tailandia', 6033: 'Países Bajos',
  5210: 'Bélgica', 15438: 'Chile', 16399: 'Noruega', 27475: 'Perú',
  35098: 'Venezuela', 40202: 'Portugal',
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

// ─── Filtro (género/año/país/orden/tipo) ────────────────────────────────────
// El parámetro `filter` de /listing SÍ funciona — el formato real (probado
// en vivo, no documentado) es un objeto plano {taxonomía: [ids]}, ej.
// {"genres":[32]} o {"years":[735],"countries":[733]} combinados. Confirmado
// que funciona de verdad para genres/years/countries (los resultados
// realmente cambian). quality y lang, en cambio, NO tienen efecto alguno vía
// este parámetro con ningún nombre/forma probada — se quedan como filtro
// aproximado del lado del cliente, sobre los resultados YA filtrados por
// género/año/país en el servidor. orderBy real: latest/popular/rated/views
// (no "date", que no es un valor válido) + order asc/desc.
type OrderBy = 'latest' | 'popular' | 'rated' | 'views';
interface LMFilter {
  postType?: PostType;
  genre?: number;
  year?: number;
  country?: number;
  quality?: number;
  lang?: number;
  orderBy: OrderBy;
  order: 'asc' | 'desc';
}

function _parseFilter(filter?: Record<string, string[]>): LMFilter {
  const postType = filter?.['tipo']?.[0] as PostType | undefined;
  const genre = filter?.['genero']?.[0] ? parseInt(filter['genero'][0], 10) : undefined;
  const year = filter?.['anio']?.[0] ? parseInt(filter['anio'][0], 10) : undefined;
  const country = filter?.['pais']?.[0] ? parseInt(filter['pais'][0], 10) : undefined;
  const quality = filter?.['calidad']?.[0] ? parseInt(filter['calidad'][0], 10) : undefined;
  const lang = filter?.['idioma']?.[0] ? parseInt(filter['idioma'][0], 10) : undefined;
  const orderBy = (filter?.['orden']?.[0] as OrderBy) || 'latest';
  const order = (filter?.['direccion']?.[0] as 'asc' | 'desc') || 'desc';
  return {
    postType: postType && POST_TYPES.includes(postType) ? postType : undefined,
    genre, year, country, quality, lang, orderBy, order,
  };
}

// Objeto real que la API acepta en `filter` — solo las taxonomías confirmadas
// en vivo (genres/years/countries). quality/lang NO van acá — no tienen
// ningún efecto server-side, se aplican aparte en el cliente.
function _serverFilterParam(f: LMFilter): string {
  const obj: Record<string, number[]> = {};
  if (f.genre) obj.genres = [f.genre];
  if (f.year) obj.years = [f.year];
  if (f.country) obj.countries = [f.country];
  if (Object.keys(obj).length === 0) return '';
  return `&filter=${encodeURIComponent(JSON.stringify(obj))}`;
}

function _matchesClientFilter(p: LMPost, f: LMFilter): boolean {
  if (f.quality && !(p.quality || []).includes(f.quality)) return false;
  if (f.lang && !(p.lang || []).includes(f.lang)) return false;
  return true;
}

export async function createFilter(): Promise<Record<string, unknown>> {
  const genreOptions: Record<string, string> = { '': 'Todos' };
  for (const [id, name] of Object.entries(_GENRES)) genreOptions[id] = name;
  const qualityOptions: Record<string, string> = { '': 'Todas' };
  for (const [id, name] of Object.entries(_QUALITIES)) qualityOptions[id] = name;
  const langOptions: Record<string, string> = { '': 'Todos' };
  for (const [id, name] of Object.entries(_LANGS)) langOptions[id] = name;
  const countryOptions: Record<string, string> = { '': 'Todos' };
  for (const [id, name] of Object.entries(_COUNTRIES)) countryOptions[id] = name;
  const tipoOptions: Record<string, string> = {
    '': 'Todos', movies: 'Películas', tvshows: 'Series', animes: 'Animes', novels: 'Novelas',
  };
  const currentYear = new Date().getFullYear();
  const yearOptions: Record<string, string> = { '': 'Todos' };
  for (let y = currentYear + 1; y >= 1970; y--) yearOptions[String(y)] = String(y);
  // Mismas 4 métricas + dirección que usa el sitio (Más recientes/populares/
  // valorados/vistos, con su reverso).
  const ordenOptions: Record<string, string> = {
    latest: 'Recientes', popular: 'Populares', rated: 'Valorados', views: 'Vistos',
  };
  const direccionOptions: Record<string, string> = { desc: 'Mayor a menor', asc: 'Menor a mayor' };

  return {
    tipo: { title: 'Tipo', options: tipoOptions, default: '', min: 1, max: 1 },
    orden: { title: 'Orden', options: ordenOptions, default: 'latest', min: 1, max: 1 },
    direccion: { title: 'Dirección', options: direccionOptions, default: 'desc', min: 1, max: 1 },
    genero: { title: 'Género', options: genreOptions, default: '', min: 1, max: 1 },
    anio: { title: 'Año', options: yearOptions, default: '', min: 1, max: 1 },
    pais: { title: 'País', options: countryOptions, default: '', min: 1, max: 1 },
    calidad: { title: 'Calidad', options: qualityOptions, default: '', min: 1, max: 1 },
    idioma: { title: 'Idioma', options: langOptions, default: '', min: 1, max: 1 },
  };
}

// ─── Catálogo ───────────────────────────────────────────────────────────────
// Página real de la API (postsPerPage sí funciona acá, a diferencia de
// /search — ver más abajo). género/año/país van server-side (filter real);
// calidad/idioma, al no tener efecto en el servidor, se aplican local sobre
// esos resultados YA acotados, pidiendo páginas de más si hace falta
// completar una página de vista.
async function _listing(postType: PostType, page: number, f: LMFilter): Promise<PrismItem[]> {
  const perPage = 20;
  const filterParam = _serverFilterParam(f);
  const base = `${API}/listing/${postType}?postType=${postType}&postsPerPage=${perPage}&orderBy=${f.orderBy}&order=${f.order}${filterParam}`;
  const needsClientFilter = !!(f.quality || f.lang);
  if (!needsClientFilter) {
    const res = await _get<LMPage<LMPost>>(`${base}&page=${page}`);
    if (res.error || !res.data) return [];
    return res.data.posts.map(_itemFromPost);
  }
  const items: PrismItem[] = [];
  let rawPage = page;
  const maxRawFetches = 8;
  for (let attempt = 0; attempt < maxRawFetches && items.length < perPage; attempt++, rawPage++) {
    const res = await _get<LMPage<LMPost>>(`${base}&page=${rawPage}`);
    if (res.error || !res.data || res.data.posts.length === 0) break;
    for (const p of res.data.posts) {
      if (_matchesClientFilter(p, f)) items.push(_itemFromPost(p));
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
    if (f.genre && !(post.genres || []).includes(f.genre)) continue;
    if (f.country && !(post.countries || []).includes(f.country)) continue;
    if (f.year && _yearFromDate(post.release_date) !== f.year) continue;
    if (!_matchesClientFilter(post, f)) continue;
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

// showSlug/showType van codificados en la URL de cada episodio para que
// watch() pueda reconstruir la página REAL del show como respaldo (ver
// comentario largo en watch()) — no existe una página individual por
// episodio en el sitio (confirmado en vivo: /episodio/{slug}-temporada-X-
// episodio-Y/ da 404 real); la navegación real de episodios pasa DENTRO de
// la página del show (botones "S1:E1"/"S1:E2" bajo el reproductor, misma
// URL para todos).
async function _fetchSeasons(
  showId: number,
  showSlug: string,
  showType: PostType,
  maxSeasons = 30,
): Promise<PrismSeason[]> {
  const seasons: PrismSeason[] = [];
  for (let season = 1; season <= maxSeasons; season++) {
    const res = await _get<LMPage<LMEpisode>>(
      `${API}/single/episodes/list?_id=${showId}&season=${season}&page=1&postsPerPage=100`,
    );
    const posts = res?.data?.posts ?? [];
    if (posts.length === 0) break;
    const episodes: PrismEpisode[] = posts.map((e) => ({
      title: e.title,
      url:
        `${BASE}/${PERMALINK[showType]}/${showSlug}/` +
        `?showId=${showId}&s=${e.season_number}&e=${e.episode_number}&epId=${e._id}`,
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
    seasons = await _fetchSeasons(p._id, slug, postType);
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
  // Servidor externo ya elegido (switchServer). NO se resuelve a stream
  // directo: ver el comentario largo más abajo — el m3u8 resuelto de estos
  // hosts da 403 para cualquier cliente que no sea un navegador real, así
  // que devolver la URL resuelta solo garantiza que el reproductor nativo
  // falle. Devolviendo la página del embed como pageUrl, la app va derecho
  // al camino de sniffer/WebView, que es el único que funciona acá.
  if (url.indexOf('http') === 0 && url.indexOf(BASE) === -1) {
    return { streams: [], pageUrl: url };
  }

  const postId = _postIdFromUrl(url);
  if (postId == null) throw new Error('No se pudo identificar el contenido en LaMovie');

  // Página real del sitio SIN los parámetros propios (?showId=&epId=... son
  // solo para que _postIdFromUrl recupere el id acá adentro) — confirmado
  // en vivo con curl que la página del episodio/película carga bien así,
  // tal cual, sin esa query string. Se manda SIEMPRE como pageUrl (no solo
  // cuando no hay embeds): si los servidores resuelven "bien" pero después
  // el nativo no logra reproducir ninguno de verdad (confirmado en vivo con
  // los tres — goodstream/voe/vimeos — fallando en la práctica pese a
  // resolver una URL con pinta válida), antes no quedaba NINGUNA página a
  // la que caer y el WebView nunca se ofrecía. Con esto, esa página (donde
  // el sitio reproduce con su propio player, que sí anda) siempre está
  // disponible como último recurso.
  const cleanPageUrl = url.split('?')[0];

  const res = await _get<LMPlayer>(`${API}/player?postId=${postId}&demo=0`);
  if (res.error || !res.data) return { streams: [], pageUrl: cleanPageUrl };

  const embeds = res.data.embeds || [];
  // Los embeds se devuelven CRUDOS, sin resolver a stream directo, a
  // propósito. Investigado a fondo contra los CDN reales (goodstream.one,
  // vimeos.zip): el m3u8 que sale de resolverlos responde 403 a CUALQUIER
  // cliente que no sea un navegador de verdad — probado con y sin
  // User-Agent de browser, y con Referer del propio host y de lamovie: los
  // cuatro casos dan 403. El token va firmado contra la IP y el CDN filtra
  // por fingerprint del cliente, exactamente el mismo caso que el SDK ya
  // documenta para premilkyway.com (mpv/libavformat rechazado aunque el
  // navegador reproduzca sin problema). De ahí que en la web "vimeos ande
  // en todo" y en la app fallaran los tres servidores: resolverlos era
  // justamente lo que rompía la reproducción.
  //
  // Dejándolos crudos, PrismHub los trata como embeds sin resolver y va
  // derecho a su camino de sniffer/WebView (ver play()/_trySniff en
  // video_controller.dart), que usa un motor de navegador real — el único
  // que estos hosts aceptan.
  const streams: PrismStream[] = embeds.map((e) => ({
    url: e.url,
    quality:
      [e.server, e.lang, e.quality, _guessServerName(e.url)].filter(Boolean).join(' ') ||
      undefined,
    headers: { Referer: `${BASE}/` },
  }));

  if (streams.length === 0) {
    return { streams: [], pageUrl: cleanPageUrl };
  }
  return { streams, pageUrl: cleanPageUrl };
}

// Sin new URL(...) a propósito: ese constructor no existe en el QuickJS de
// PrismHub (confirmado en vivo — ninguna otra extensión de este repo lo usa,
// todas extraen el host a mano). Devolvía siempre 'Embed' acá, así que los
// tres servidores (vimeos/goodstream/voe) terminaban con el MISMO nombre —
// y como X-Servers es un mapa por nombre, los tres colapsaban en una sola
// entrada (la última pisaba a las anteriores), dejando un solo botón de
// servidor visible aunque watch() devolviera los tres. Confirmado en vivo
// con capturas: solo aparecía "Online Latino Full HD Embed" una vez.
function _guessServerName(url: string): string {
  const m = /^https?:\/\/(?:www\.)?([^/:?#]+)/i.exec(url);
  return m ? m[1] : 'Embed';
}

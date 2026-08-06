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

import { resolver as resolverServidor, servidorDe } from './servidores';

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
function _tipoDeMedio(postType: string): MediaType {
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
    type: _tipoDeMedio(p.type),
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
// Los años que el sitio tiene, con su id de término.
//
// **El filtro espera el id, no el año.** Medido el 2026-08-06:
// `{"years":[2013]}` devuelve cero y `{"years":[775]}` devuelve los de 2013.
// Antes se mandaba el año directo, así que el filtro de año no filtraba nada.
const _YEARS: Record<string, number> = {
  '2026': 74006, '2025': 4, '2024': 1354, '2023': 2236, '2022': 1461, '2021': 2169,
  '2020': 2792, '2019': 1816, '2018': 1926, '2017': 1874, '2016': 1618, '2015': 8694,
  '2014': 2052, '2013': 775, '2012': 762, '2011': 769, '2010': 3858, '2009': 2092,
  '2008': 1395, '2007': 902, '2006': 873, '2005': 963, '2004': 728, '2003': 503,
  '2002': 800, '2001': 793, '2000': 684, '1999': 735, '1998': 1279, '1997': 600,
  '1996': 1142, '1995': 937, '1994': 533, '1993': 1707, '1992': 657, '1991': 2583,
  '1990': 707, '1989': 1258, '1988': 1726, '1987': 852, '1986': 1313, '1985': 1440,
  '1984': 1237, '1983': 6004, '1982': 1165, '1981': 1212, '1980': 4122, '1979': 2881,
  '1976': 1378, '1973': 2114,
};

// Los proveedores (Netflix, Disney+, Max…). El sitio los ofrece como
// "Proveedor" en su propia barra de filtros. Medido: funciona.
const _PROVIDERS: Record<number, string> = {
  459: 'Disney Plus',
  460: 'Google Play Movies',
  461: 'Apple TV',
  462: 'Rakuten TV',
  463: 'Microsoft Store',
  464: 'Amazon Video',
  465: 'MovistarTV',
  466: 'maxdome Store',
  467: 'Sky Store',
  468: 'Fetch TV',
  469: 'Cineplex',
  470: 'YouTube',
  472: 'blue TV',
  474: 'MagentaTV',
  475: 'Videoload',
  476: 'Freenet meinVOD',
  477: 'Viaplay',
  478: 'Blockbuster',
  479: 'SF Anytime',
  480: 'Elisa Viihde',
  481: 'Orange VOD',
  482: 'VIVA by videofutur',
  483: 'Premiere Max',
  487: 'Timvision',
  488: 'wavve',
  489: 'KPN',
  490: 'Pathé Thuis',
  491: 'TV 2 Play',
  492: 'Premiery Canal+',
  493: 'Hulu',
  494: 'Fandango At Home',
  522: 'meJane',
  523: 'Player',
  524: 'Kinopoisk',
  549: 'Claro video',
  551: 'Movistar Plus+ Ficción Total',
  563: 'Amazon Prime Video',
  565: 'Telia Play',
  566: 'Canal VOD',
  567: 'FILMO',
  568: 'Universcine',
  569: 'Bbox VOD',
  572: 'Netflix',
  573: 'U-NEXT',
  574: 'Netflix Standard with Ads',
  575: 'Watcha',
  580: 'Amazon Prime Video with Ads',
  581: 'Spectrum On Demand',
  675: 'Max',
  677: 'Videobuster',
};

// Órdenes medidos el 2026-08-06: estos cuatro cambian los resultados.
// `imdb`, `tmdb` y `rank` los acepta pero devuelve lo mismo que `latest`.
type OrderBy = 'latest' | 'popular' | 'rated' | 'views';
interface LMFilter {
  postType?: PostType;
  genre?: number;
  year?: number;
  country?: number;
  provider?: number;
  quality?: number;
  lang?: number;
  orderBy: OrderBy;
  order: 'asc' | 'desc';
}

function _parseFilter(filter?: Record<string, string[]>): LMFilter {
  const postType = filter?.['tipo']?.[0] as PostType | undefined;
  const genre = filter?.['genero']?.[0] ? parseInt(filter['genero'][0], 10) : undefined;
  // El año llega como el año en sí ("2013") y se traduce a su id de término,
  // que es lo que el filtro de la API espera de verdad.
  const year = filter?.['anio']?.[0] ? _YEARS[filter['anio'][0]] : undefined;
  const country = filter?.['pais']?.[0] ? parseInt(filter['pais'][0], 10) : undefined;
  const provider = filter?.['proveedor']?.[0]
    ? parseInt(filter['proveedor'][0], 10)
    : undefined;
  const quality = filter?.['calidad']?.[0] ? parseInt(filter['calidad'][0], 10) : undefined;
  const lang = filter?.['idioma']?.[0] ? parseInt(filter['idioma'][0], 10) : undefined;
  const orderBy = (filter?.['orden']?.[0] as OrderBy) || 'latest';
  const order = (filter?.['direccion']?.[0] as 'asc' | 'desc') || 'desc';
  return {
    postType: postType && POST_TYPES.includes(postType) ? postType : undefined,
    genre, year, country, provider, quality, lang, orderBy, order,
  };
}

// El objeto que la API acepta en `filter`, con las taxonomías que se
// comprobaron una por una el 2026-08-06: genres, years, countries y providers
// cambian los resultados. quality y lang no, con ningún nombre — ver la nota
// larga de createFilter.
function _serverFilterParam(f: LMFilter): string {
  const obj: Record<string, number[]> = {};
  if (f.genre) obj.genres = [f.genre];
  if (f.year) obj.years = [f.year];
  if (f.country) obj.countries = [f.country];
  if (f.provider) obj.providers = [f.provider];
  if (Object.keys(obj).length === 0) return '';
  return `&filter=${encodeURIComponent(JSON.stringify(obj))}`;
}

function _matchesClientFilter(p: LMPost, f: LMFilter): boolean {
  if (f.quality && !(p.quality || []).includes(f.quality)) return false;
  if (f.lang && !(p.lang || []).includes(f.lang)) return false;
  return true;
}

/**
 * Los filtros que el sitio SÍ aplica.
 *
 * **No están calidad ni idioma, y es a propósito.** Medido el 2026-08-06: el
 * parámetro `filter` de la API los ignora con cualquier nombre que se le
 * pase —`lang`, `langs`, `idioma`, `original_lang`, `quality`, `qualities`,
 * `calidad`— mientras que `genres` con los mismos formatos cambia los
 * resultados al instante. También se probó la otra vía, pidiendo el vale `tt`
 * de `/listing/tax/lang/{slug}` y usándolo contra `/listing/tax/{tt}`: devuelve
 * cero títulos siempre.
 *
 * Y aunque anduviera no serviría de mucho: TODOS los títulos del sitio traen
 * `lang: [58651, 58652]` —latino e inglés—, así que filtrar por latino no saca
 * ni uno. Filtrarlo del lado nuestro era mostrar un filtro que no filtra.
 *
 * Quedan los que sí andan, que son además los que se piden: recientes,
 * populares, valorados, vistos, y por tipo, género, año y país.
 */
export async function createFilter(): Promise<Record<string, unknown>> {
  const genreOptions: Record<string, string> = { '': 'Todos' };
  for (const [id, name] of Object.entries(_GENRES)) genreOptions[id] = name;
  const countryOptions: Record<string, string> = { '': 'Todos' };
  for (const [id, name] of Object.entries(_COUNTRIES)) countryOptions[id] = name;
  const providerOptions: Record<string, string> = { '': 'Todos' };
  for (const [id, name] of Object.entries(_PROVIDERS)) providerOptions[id] = name;
  const tipoOptions: Record<string, string> = {
    '': 'Todos', movies: 'Películas', tvshows: 'Series', animes: 'Animes', novels: 'Novelas',
  };
  // Los años son LOS QUE EL SITIO TIENE, no un rango inventado.
  //
  // Antes se armaba de corrido desde el año que viene hasta 1970, y el sitio
  // tiene 50 años sueltos que empiezan en 1973: elegir 1970, 1971 o 1972 daba
  // cero resultados sin explicar por qué. Medido el 2026-08-06 contra su
  // siteConfig.datas.years.
  const yearOptions: Record<string, string> = { '': 'Todos' };
  for (const year of Object.keys(_YEARS)) yearOptions[year] = year;
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
    proveedor: {
      title: 'Proveedor',
      options: providerOptions,
      default: '',
      min: 1,
      max: 1,
    },
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

/**
 * La portada: **todo mezclado**, como en el sitio.
 *
 * Sin elegir tipo se piden los cuatro —películas, series, animes y novelas— y
 * se intercalan. Antes, sin tipo, se devolvían solo películas: la extensión se
 * llama LaMovie y trae series y animes, pero para verlos había que saber que
 * existía el filtro e ir a buscarlo.
 *
 * Se intercalan de a uno en vez de pegar los cuatro bloques uno detrás de otro
 * para que la primera pantalla ya muestre de todo, que es de lo que se trata.
 */
/**
 * Le pone plazo a una promesa. Si no llega, devuelve el respaldo.
 *
 * Copia propia y no importada: es la misma idea que usa jkanime para sus
 * servidores lentos, pero acá el plazo y el motivo son otros, y tocar el de allá
 * no puede cambiar esto. Ver la nota de por qué cada extensión lleva lo suyo.
 */
async function _conPlazo<T>(promesa: Promise<T>, ms: number, respaldo: () => T): Promise<T> {
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const plazo = new Promise<T>((resolver) => {
    reloj = setTimeout(() => resolver(respaldo()), ms);
  });
  try {
    return await Promise.race([promesa, plazo]);
  } finally {
    if (reloj) clearTimeout(reloj);
  }
}

export async function latest(page: number, filter?: Record<string, string[]>): Promise<PrismItem[]> {
  const f = _parseFilter(filter);
  if (f.postType) return _listing(f.postType, page, f);

  // **Los cuatro a la vez, y con plazo propio cada uno.**
  //
  // A la vez porque de a uno son cuatro viajes encadenados y la portada
  // tardaría lo que suman.
  //
  // Y con plazo porque este sitio se puso MUY lento. Medido el 2026-08-06,
  // pidiéndole directamente a su API, sin la app en el medio:
  //
  //     movies   26,9 s      animes   2,8 s
  //     tvshows  10,4 s      novels   no contestó en 45 s
  //
  // Esperando a los cuatro, la portada tardaba lo que el peor: se quedaba en
  // blanco veinte segundos —el límite del puente de red— y volvía vacía,
  // aunque `animes` estuviera listo desde el segundo 2,8. Es lo peor de los dos
  // mundos: se espera todo y no se muestra nada.
  //
  // Con el plazo se muestra lo que llegó. Si el sitio se recupera no cambia
  // nada, porque todos entran cómodos; y si sigue lento, se ve contenido a los
  // ocho segundos en vez de una rueda infinita.
  //
  // Ocho segundos: por debajo del límite del puente, y por encima de lo que
  // tarda este sitio cuando está en un día normal.
  const PLAZO_POR_TIPO = 8_000;
  const porTipo = await Promise.all(
    POST_TYPES.map((t) =>
      _conPlazo(
        _listing(t, page, f).catch((e) => {
          console.log(`[lamovie] no se pudo listar ${t}: ${e}`);
          return [] as PrismItem[];
        }),
        PLAZO_POR_TIPO,
        () => {
          console.log(`[lamovie] ${t} no llegó en ${PLAZO_POR_TIPO / 1000} s: `
            + 'se muestra lo que haya de los demás');
          return [] as PrismItem[];
        },
      ),
    ),
  );

  const mezcla: PrismItem[] = [];
  const vistos: Record<string, boolean> = {};
  const masLargo = Math.max(0, ...porTipo.map((l) => l.length));
  for (let i = 0; i < masLargo; i++) {
    for (const lista of porTipo) {
      const it = lista[i];
      if (!it || vistos[it.url]) continue;
      vistos[it.url] = true;
      mezcla.push(it);
    }
  }
  return mezcla;
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
//
// Los servidores viven en `servidores/`, uno por carpeta, cada uno con lo que
// se midió de él. Ver `servidores/index.ts` para el resumen.
//
// **Lo que cambió, y por qué la extensión estaba marcada como inestable.**
//
// Antes los embeds se devolvían CRUDOS, sin resolver, con este razonamiento:
// «el m3u8 que sale de resolverlos responde 403 a CUALQUIER cliente que no sea
// un navegador de verdad — probado con y sin User-Agent de browser». Es falso.
// Medido el 2026-08-06 sobre 12 títulos: con User-Agent de navegador y el
// Referer del propio host, vimeos da 9 de 9 y goodstream 8 de 8, bajando el
// primer segmento de vídeo de verdad, entre 250 KB y 4,6 MB.
//
// Como no se resolvía nada, TODO se abría en el navegador interno aunque la
// mitad de los servidores reprodujeran en la app sin problema.
function _postIdFromUrl(url: string): number | null {
  // **El episodio primero, la serie después. El orden importa.**
  //
  // La dirección de un episodio lleva LOS DOS —`?showId=79891&…&epId=79893`—
  // y antes se miraba `showId` primero, así que todos los episodios de todas
  // las series terminaban pidiendo el reproductor de la SERIE.
  //
  // Y el de la serie no trae los servidores del episodio: devuelve un solo
  // embed de relleno, `https://lamovie.org/embed.html?v=1`, que es la página
  // de "este contenido todavía no está disponible". Medido el 2026-08-06 con
  // One Hundred Years of Solitude: con el id de la serie sale ese relleno y
  // nada más; con el id del episodio salen los cuatro de verdad.
  //
  // Por eso al abrir un episodio arrancaba en el navegador interno mostrando
  // "no disponible", y recién cambiando de servidor a mano aparecían los que
  // sí andan.
  const m = /[?&]epId=(\d+)/.exec(url) || /[?&]showId=(\d+)/.exec(url);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * El nombre del botón, tal como lo va a ver el usuario.
 *
 * Se arma con lo que publica la API —servidor, idioma— y NO con la calidad que
 * declara, que miente: el sitio etiqueta "Full HD" títulos cuyo vimeos solo
 * trae 480p y 720p. La calidad de verdad la mide el reproductor.
 */
function _nombreDeBoton(
  e: { server?: string; lang?: string },
  host: string,
  conocido: string | null,
): string {
  const partes: string[] = [];
  // El nombre del catálogo primero, si se lo reconoce.
  //
  // La API es incoherente con el suyo: al MISMO servidor lo llama "Online" en
  // unos títulos y "LaMovie" en otros, así que en el selector salían dos
  // nombres distintos para lo mismo y ninguno decía de qué servicio se trata.
  partes.push(conocido || e.server || host);
  if (e.lang) partes.push(e.lang);
  return partes.join(' ');
}

export async function watch(url: string): Promise<PrismWatch> {
  // Servidor ya elegido por el usuario (switchServer): llega la dirección del
  // embed suelta. Se intenta resolver con el resolver de ESE servidor; si no
  // devuelve nada, se entrega la página para que la app abra el navegador.
  if (url.indexOf('http') === 0 && url.indexOf(BASE) === -1) {
    const resuelto = await resolverServidor(url, `${BASE}/`);
    if (resuelto) {
      return {
        streams: [{ url: resuelto.url, headers: resuelto.headers }],
        pageUrl: url,
      };
    }
    return { streams: [], pageUrl: url };
  }

  const postId = _postIdFromUrl(url);
  if (postId == null) throw new Error('No se pudo identificar el contenido en LaMovie');

  // La página real del sitio, sin los parámetros propios (?showId=&epId= son
  // solo para recuperar el id acá adentro). Se manda SIEMPRE como pageUrl: si
  // ningún servidor resuelve, esa página es la última salida y ahí el sitio
  // reproduce con su propio reproductor.
  const cleanPageUrl = url.split('?')[0];

  const res = await _get<LMPlayer>(`${API}/player?postId=${postId}&demo=0`);
  if (res.error || !res.data) return { streams: [], pageUrl: cleanPageUrl };

  const embeds = res.data.embeds || [];
  if (embeds.length === 0) return { streams: [], pageUrl: cleanPageUrl };

  // **Salen TODOS los servidores, incluso los que no reproducen en la app.**
  //
  // Esto es a propósito y vale la pena decirlo: el sitio hace lo contrario.
  // Su propio reproductor tiene `prior: ["vimeos","goodstream","voe"]` con
  // `showPlayerName: false`, así que elige uno solo y esconde el resto — por
  // eso en la web parece que hay un servidor nada más. Acá se muestran los que
  // haya: si uno va lento o se cae, el usuario tiene a dónde ir.
  //
  // Los que no resuelven van igual, sin dirección resuelta y marcados 🌐: la
  // app los abre en el navegador interno, que ejecuta el JS de la página.
  const streams: PrismStream[] = [];
  for (const e of embeds) {
    // El relleno de "todavía no está disponible" NO es un servidor.
    //
    // Cuando al sitio le falta un título devuelve un embed que apunta a su
    // propia página de aviso. No reproduce ni puede reproducir: es un cartel.
    // Se descarta como se descartó en su momento el "mediafire" de otra
    // extensión — la regla de no ocultar servidores vale para los servidores,
    // y esto no lo es.
    //
    // Si era el único, quedan cero streams y la app abre la página del sitio,
    // que es donde el aviso tiene sentido y trae el botón de pedirlo.
    if (e.url.indexOf('/embed.html') !== -1) continue;
    const host = _guessServerName(e.url);
    const s = servidorDe(e.url);
    streams.push({
      url: e.url,
      quality: _nombreDeBoton(e, host, s ? s.boton : null),
      // El rayo y el mundo los dice la extensión, que es la que lo midió, y no
      // la app adivinando por el nombre del host.
      nativo: s ? s.nativo : false,
      headers: { Referer: `${BASE}/` },
    });
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

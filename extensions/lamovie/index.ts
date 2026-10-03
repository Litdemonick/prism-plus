import type {
  PrismItem,
  PrismDetail,
  PrismWatch,
  PrismStream,
  PrismEpisode,
  PrismSeason,
  MediaType,
  ContentStatus,
} from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

import { resolver as resolverServidor, servidorDe } from './servidores';

// ─── El sitio nuevo ─────────────────────────────────────────────────────────
//
// El 2026-09-27 LaMovie se rehízo entero: dejó de ser WordPress y su vieja API
// (`lamovie.org/wp-api/v1`, la de `siteConfig.fastApi`) pasó a contestar la
// página HTML del sitio para cualquier ruta. La app nueva es una SPA que sale a
// buscar todo a una API aparte, basada en TMDB, que está escrita en su propio
// script (`const kh="https://tmdb.allcalidad.re"`).
//
// Lo que se midió con curl ese día, ruta por ruta:
//
//   /v1/items?kind=movie|tvshow|anime   listado, con `page`, `limit` (hasta 100)
//        &sort=recent|popular|rating    `views` y cualquier otro valor = recent
//        &genre=<slug>                  el slug, NO el id (`genre=28` da cero)
//        &year=1999 &country=mx         el año tal cual; el país por código
//        &network=netflix               solo tiene sentido en series y anime
//   /v1/search?q=…&limit=100            SIN paginar: `page` y `offset` se
//                                       ignoran, con `limit=100` llega todo
//   /v1/items/{kind}/{id}               la ficha; en películas trae `code`
//   /v1/items/{kind}/{id}/seasons       temporadas, con `playable_count`
//   /v1/items/{kind}/{id}/seasons/{n}   episodios, cada uno con `code`
//   /v1/taxonomies                      géneros, años, países y cadenas
//
// Y el vídeo: el reproductor del sitio arma `https://vimeos.net/embed-%code%.html`
// (siteConfig.playerProvider) con el `code` de la película o del episodio. Es
// el único servidor que tiene ahora; los demás (goodstream, voe, doodstream)
// salieron junto con la API vieja.
const BASE = 'https://lamovie.org';
const API = 'https://tmdb.allcalidad.re/v1';
const IMG = 'https://image.tmdb.org/t/p';
const EMBED = 'https://vimeos.net/embed-';

async function _get<T = any>(url: string): Promise<T> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([url, { method: 'get', headers: { Referer: `${BASE}/` } }]),
  );
  // Si algún día la API vuelve a contestar HTML (como pasó con la vieja), que
  // el error lo diga claro en vez de un "Unexpected token <" sin contexto.
  const t = (raw || '').trim();
  if (t.charAt(0) !== '{' && t.charAt(0) !== '[') {
    throw new Error('LaMovie no devolvió datos (la API respondió otra cosa)');
  }
  return JSON.parse(t) as T;
}

// ─── Tipos de contenido ─────────────────────────────────────────────────────
type Kind = 'movie' | 'tvshow' | 'anime';
const KINDS: Kind[] = ['movie', 'tvshow', 'anime'];

// El tramo de la dirección en el sitio para cada tipo (sus rutas son
// /pelicula/:id/:slug, /serie/:id/:slug y /anime/:id/:slug).
const SEGMENTO: Record<Kind, string> = { movie: 'pelicula', tvshow: 'serie', anime: 'anime' };

function _tipoDeMedio(kind: string): MediaType {
  if (kind === 'movie') return 'movie';
  if (kind === 'anime') return 'anime';
  return 'series';
}

// ─── Modelos de la API ──────────────────────────────────────────────────────
interface LMTermino {
  id: number | null;
  slug: string;
  title: string;
}
interface LMItem {
  tmdb_id: number;
  kind: Kind;
  code: string | null;
  title: string;
  original_title?: string | null;
  slug: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  year?: number | null;
  runtime?: number | null;
  vote_average?: number | null;
  overview?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  status?: string | null;
  certification?: string | null;
  number_of_seasons?: number | null;
  genres?: LMTermino[];
  countries?: LMTermino[];
  networks?: LMTermino[];
  studios?: LMTermino[];
  playable?: boolean;
  latest_episode?: { season: number; episode: number } | null;
}
interface LMPagina {
  items?: LMItem[];
  pagination?: { page: number; total_pages: number; has_next: boolean };
}
interface LMTemporadaResumen {
  season: number;
  name?: string;
  air_date?: string | null;
  poster_path?: string | null;
  playable_count?: number;
}
interface LMEpisodio {
  season: number;
  episode: number;
  title?: string | null;
  runtime?: number | null;
  still_path?: string | null;
  air_date?: string | null;
  playable?: boolean;
  code?: string | null;
}

function _img(path: string | null | undefined, tam: string): string | undefined {
  if (!path) return undefined;
  if (path.indexOf('http') === 0) return path;
  return `${IMG}/${tam}${path.charAt(0) === '/' ? '' : '/'}${path}`;
}

function _itemUrl(kind: Kind, id: number, slug: string): string {
  return `${BASE}/${SEGMENTO[kind]}/${id}/${slug}`;
}

function _episodioUrl(kind: Kind, id: number, temporada: number, episodio: number): string {
  return `${BASE}/${SEGMENTO[kind]}/${id}/temporada/${temporada}/episodio/${episodio}`;
}

function _anio(i: LMItem): number | undefined {
  if (i.year) return i.year;
  const f = i.release_date || i.first_air_date;
  if (!f) return undefined;
  const y = parseInt(f.slice(0, 4), 10);
  return Number.isFinite(y) ? y : undefined;
}

function _generos(i: LMItem): string[] | undefined {
  const g = (i.genres || []).map((t) => t.title).filter((t) => !!t);
  return g.length ? g : undefined;
}

function _itemDe(i: LMItem): PrismItem {
  const ultimo = i.latest_episode;
  return {
    title: i.title,
    url: _itemUrl(i.kind, i.tmdb_id, i.slug),
    cover: _img(i.poster_path, 'w342'),
    description: i.overview || undefined,
    tags: _generos(i),
    year: _anio(i),
    rating: i.vote_average ? Math.round(i.vote_average * 10) / 10 : undefined,
    type: _tipoDeMedio(i.kind),
    update: ultimo && i.kind !== 'movie' ? `T${ultimo.season} E${ultimo.episode}` : undefined,
  };
}

// ─── Filtros ────────────────────────────────────────────────────────────────
//
// Solo los que la API aplica de verdad (medidos uno por uno, ver arriba). Ya no
// están "Dirección", "Calidad" ni "Idioma": la API nueva no ordena al revés y
// no filtra por calidad ni idioma.
type Orden = 'recent' | 'popular' | 'rating';
interface Filtro {
  kind?: Kind;
  orden: Orden;
  genero?: string;
  anio?: number;
  pais?: string;
  plataforma?: string;
}

// Los valores de la versión anterior de la extensión, por si la app los tiene
// guardados de una sesión vieja: se traducen en vez de dar cero resultados.
const _TIPO_VIEJO: Record<string, Kind> = {
  movies: 'movie', tvshows: 'tvshow', animes: 'anime', novels: 'tvshow',
};
const _ORDEN_VIEJO: Record<string, Orden> = {
  latest: 'recent', rated: 'rating', views: 'popular',
};

function _leerFiltro(filter?: Record<string, string[]>): Filtro {
  const v = (k: string): string | undefined => {
    const x = filter?.[k]?.[0];
    return x ? String(x) : undefined;
  };
  const tipo = v('tipo');
  const kind = tipo
    ? (KINDS as string[]).includes(tipo) ? (tipo as Kind) : _TIPO_VIEJO[tipo]
    : undefined;
  const o = v('orden');
  const orden: Orden =
    o === 'recent' || o === 'popular' || o === 'rating' ? o : (o && _ORDEN_VIEJO[o]) || 'recent';
  const anio = v('anio') ? parseInt(v('anio') as string, 10) : undefined;
  // Un género o país con el formato viejo (un id numérico) no existe en la API
  // nueva: se descarta en vez de mandar algo que devuelve cero.
  const genero = v('genero');
  const pais = v('pais');
  return {
    kind,
    orden,
    genero: genero && !/^\d+$/.test(genero) ? genero : undefined,
    anio: anio && Number.isFinite(anio) ? anio : undefined,
    pais: pais && !/^\d+$/.test(pais) ? pais : undefined,
    plataforma: v('plataforma'),
  };
}

// Géneros de respaldo, por si /v1/taxonomies no contesta al armar el filtro.
// Sacados de esa misma ruta el 2026-09-27 (los slugs llevan tilde a propósito:
// así los pide la API).
const _GENEROS_RESPALDO: Record<string, string> = {
  'acción': 'Acción', 'action-adventure': 'Acción y aventura', 'animación': 'Animación',
  'aventura': 'Aventura', 'bélica': 'Bélica', 'ciencia-ficción': 'Ciencia ficción',
  'sci-fi-fantasy': 'Ciencia ficción y fantasía', 'comedia': 'Comedia', 'crimen': 'Crimen',
  'documental': 'Documental', 'drama': 'Drama', 'familia': 'Familia', 'fantasía': 'Fantasía',
  'historia': 'Historia', 'kids': 'Infantil', 'misterio': 'Misterio', 'música': 'Música',
  'película-de-tv': 'Película de TV', 'reality': 'Reality', 'romance': 'Romance',
  'soap': 'Telenovela', 'suspense': 'Suspense', 'terror': 'Terror',
  'war-politics': 'Guerra y política', 'western': 'Western',
};

// La API da los países con su nombre en inglés. Los más comunes se muestran en
// español; el resto, como venga.
const _PAISES_ES: Record<string, string> = {
  us: 'Estados Unidos', gb: 'Reino Unido', jp: 'Japón', kr: 'Corea del Sur', mx: 'México',
  es: 'España', ar: 'Argentina', co: 'Colombia', cl: 'Chile', pe: 'Perú', ve: 'Venezuela',
  br: 'Brasil', ca: 'Canadá', fr: 'Francia', de: 'Alemania', it: 'Italia', cn: 'China',
  au: 'Australia', in: 'India', ie: 'Irlanda', be: 'Bélgica', hk: 'Hong Kong', se: 'Suecia',
  pl: 'Polonia', ru: 'Rusia', za: 'Sudáfrica', ch: 'Suiza', th: 'Tailandia', dk: 'Dinamarca',
  nl: 'Países Bajos', fi: 'Finlandia', tr: 'Turquía', cz: 'República Checa', no: 'Noruega',
  nz: 'Nueva Zelanda', id: 'Indonesia', ph: 'Filipinas', tw: 'Taiwán', pt: 'Portugal',
  uy: 'Uruguay', ec: 'Ecuador', bo: 'Bolivia', py: 'Paraguay', cr: 'Costa Rica',
  do: 'República Dominicana', pr: 'Puerto Rico', cu: 'Cuba', gt: 'Guatemala', at: 'Austria',
  gr: 'Grecia', hu: 'Hungría', il: 'Israel', eg: 'Egipto', ng: 'Nigeria', my: 'Malasia',
  sg: 'Singapur', ro: 'Rumania', ua: 'Ucrania', is: 'Islandia', lu: 'Luxemburgo',
};

// Cadenas de streaming que se ofrecen como "Plataforma". La API trae 271
// cadenas (casi todas canales de TV japoneses); se muestran solo estas, y
// solo si la API las tiene.
const _PLATAFORMAS = [
  'netflix', 'disney', 'prime-video', 'apple-tv', 'max', 'hbo-max', 'hbo', 'paramount',
  'hulu', 'crunchyroll', 'peacock', 'star-plus', 'vix', 'amc',
];

let _taxonomias: {
  generos: LMTermino[];
  anios: number[];
  paises: LMTermino[];
  cadenas: LMTermino[];
} | null = null;

async function _leerTaxonomias(): Promise<typeof _taxonomias> {
  if (_taxonomias) return _taxonomias;
  try {
    const t = await _get<{
      genres?: LMTermino[];
      years?: { year: number }[];
      countries?: LMTermino[];
      networks?: LMTermino[];
    }>(`${API}/taxonomies`);
    _taxonomias = {
      generos: t.genres || [],
      anios: (t.years || []).map((y) => y.year).filter((y) => !!y),
      paises: t.countries || [],
      cadenas: t.networks || [],
    };
    return _taxonomias;
  } catch (e) {
    console.log(`[lamovie] sin taxonomías: ${e}`);
    return null;
  }
}

export async function createFilter(): Promise<Record<string, unknown>> {
  const tax = await _leerTaxonomias();

  const generos: Record<string, string> = { '': 'Todos' };
  if (tax && tax.generos.length) {
    for (const g of tax.generos) generos[g.slug] = _GENEROS_RESPALDO[g.slug] || g.title;
  } else {
    Object.assign(generos, _GENEROS_RESPALDO);
  }

  // Los años que el sitio tiene de verdad, no un rango inventado.
  const anios: Record<string, string> = { '': 'Todos' };
  const listaAnios = tax && tax.anios.length
    ? tax.anios.slice().sort((a, b) => b - a)
    : [];
  if (listaAnios.length === 0) {
    const hoy = new Date().getFullYear();
    for (let y = hoy; y >= 1960; y--) listaAnios.push(y);
  }
  for (const y of listaAnios) anios[String(y)] = String(y);

  const paises: Record<string, string> = { '': 'Todos' };
  const listaPaises = tax && tax.paises.length
    ? tax.paises.map((p) => ({ slug: p.slug, nombre: _PAISES_ES[p.slug] || p.title }))
    : Object.keys(_PAISES_ES).map((slug) => ({ slug, nombre: _PAISES_ES[slug] }));
  listaPaises.sort((a, b) => a.nombre.localeCompare(b.nombre));
  for (const p of listaPaises) paises[p.slug] = p.nombre;

  const plataformas: Record<string, string> = { '': 'Todas' };
  const cadenas = tax ? tax.cadenas : [];
  for (const slug of _PLATAFORMAS) {
    const c = cadenas.find((x) => x.slug === slug);
    if (c || cadenas.length === 0) plataformas[slug] = c ? c.title : slug;
  }

  return {
    tipo: {
      title: 'Tipo',
      options: { '': 'Todos', movie: 'Películas', tvshow: 'Series', anime: 'Animes' },
      default: '', min: 1, max: 1,
    },
    orden: {
      title: 'Orden',
      options: { recent: 'Recientes', popular: 'Populares', rating: 'Mejor valorados' },
      default: 'recent', min: 1, max: 1,
    },
    genero: { title: 'Género', options: generos, default: '', min: 1, max: 1 },
    anio: { title: 'Año', options: anios, default: '', min: 1, max: 1 },
    pais: { title: 'País', options: paises, default: '', min: 1, max: 1 },
    plataforma: {
      title: 'Plataforma (series y animes)',
      options: plataformas, default: '', min: 1, max: 1,
    },
  };
}

// ─── Catálogo ───────────────────────────────────────────────────────────────
const POR_PAGINA = 24;

function _consulta(kind: Kind, page: number, f: Filtro): string {
  let q = `${API}/items?kind=${kind}&sort=${f.orden}&page=${page}&limit=${POR_PAGINA}`;
  if (f.genero) q += `&genre=${encodeURIComponent(f.genero)}`;
  if (f.anio) q += `&year=${f.anio}`;
  if (f.pais) q += `&country=${encodeURIComponent(f.pais)}`;
  if (f.plataforma && kind !== 'movie') q += `&network=${encodeURIComponent(f.plataforma)}`;
  return q;
}

// Lo que no se puede ver no se muestra: la API lista títulos que todavía no
// tienen ni un vídeo (`playable: false`), y abrirlos era llegar a una ficha
// vacía.
function _sirve(i: LMItem): boolean {
  return i.playable !== false;
}

async function _listar(kind: Kind, page: number, f: Filtro): Promise<PrismItem[]> {
  const r = await _get<LMPagina>(_consulta(kind, page, f));
  return (r.items || []).filter(_sirve).map(_itemDe);
}

/**
 * La portada: películas, series y animes mezclados, como en el sitio.
 *
 * Se piden los tres a la vez (tarda lo que el más lento, no la suma) y se
 * intercalan de a uno para que la primera pantalla ya muestre de todo. Cada
 * tipo atrapa su propio error: que uno falle no deja la portada vacía.
 */
export async function latest(page: number, filter?: Record<string, string[]>): Promise<PrismItem[]> {
  const f = _leerFiltro(filter);
  if (f.kind) return _listar(f.kind, page, f);

  // Con una plataforma elegida las películas no entran: la API no les asigna
  // cadena y devolvería el listado entero sin filtrar.
  const tipos = f.plataforma ? KINDS.filter((k) => k !== 'movie') : KINDS;
  const porTipo = await Promise.all(
    tipos.map((k) =>
      _listar(k, page, f).catch((e) => {
        console.log(`[lamovie] no se pudo listar ${k}: ${e}`);
        return [] as PrismItem[];
      }),
    ),
  );
  return _intercalar(porTipo);
}

function _intercalar(listas: PrismItem[][]): PrismItem[] {
  const mezcla: PrismItem[] = [];
  const vistos: Record<string, boolean> = {};
  const masLargo = Math.max(0, ...listas.map((l) => l.length));
  for (let i = 0; i < masLargo; i++) {
    for (const lista of listas) {
      const it = lista[i];
      if (!it || vistos[it.url]) continue;
      vistos[it.url] = true;
      mezcla.push(it);
    }
  }
  return mezcla;
}

// ─── Búsqueda ───────────────────────────────────────────────────────────────
//
// /v1/search no pagina: con `limit=100` devuelve todos los resultados de una
// vez (medido: "from" da 95, iguales con page=2 u offset=24). Así que la
// página 1 trae todo y las siguientes, nada — si no, la grilla repetiría la
// misma tanda al infinito.
export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const kw = keyword.trim();
  if (!kw) return latest(page, filter);
  if (page > 1) return [];
  const f = _leerFiltro(filter);

  let q = `${API}/search?q=${encodeURIComponent(kw)}&limit=100`;
  if (f.kind) q += `&kind=${f.kind}`;
  const r = await _get<LMPagina>(q);

  const vistas: Record<string, boolean> = {};
  const items: PrismItem[] = [];
  for (const i of r.items || []) {
    if (!i || !_sirve(i)) continue;
    // La búsqueda no toma filtros: se aplican acá, sobre lo que trae cada obra.
    if (f.kind && i.kind !== f.kind) continue;
    if (f.genero && !(i.genres || []).some((g) => g.slug === f.genero)) continue;
    if (f.anio && _anio(i) !== f.anio) continue;
    if (f.pais && !(i.countries || []).some((c) => c.slug === f.pais)) continue;
    if (f.plataforma && !(i.networks || []).some((c) => c.slug === f.plataforma)) continue;
    const it = _itemDe(i);
    if (vistas[it.url]) continue;
    vistas[it.url] = true;
    items.push(it);
  }
  return items;
}

// ─── Direcciones ────────────────────────────────────────────────────────────
interface Referencia {
  kind: Kind;
  id: number;
  temporada?: number;
  episodio?: number;
}

const _KIND_DE_SEGMENTO: Record<string, Kind> = {
  pelicula: 'movie', serie: 'tvshow', anime: 'anime',
};

/**
 * Lee una dirección de esta extensión.
 *
 * Acepta también las de la versión anterior (`/peliculas/{slug}/`,
 * `/series/{slug}/?showId=…&s=1&e=2`, `/animes/…`, `/novelas/…`), que siguen
 * guardadas en Favoritos, Historial y Descargas de quien ya usaba LaMovie. No
 * traen el id nuevo, así que se busca la obra por su slug; sin esto, todo lo
 * guardado de antes abría "no se pudo cargar".
 */
async function _referenciaDe(url: string): Promise<Referencia> {
  const nueva =
    /\/(pelicula|serie|anime)\/(\d+)(?:\/temporada\/(\d+)\/episodio\/(\d+)|\/[^/?#]*)?/.exec(url);
  if (nueva) {
    return {
      kind: _KIND_DE_SEGMENTO[nueva[1]],
      id: parseInt(nueva[2], 10),
      temporada: nueva[3] ? parseInt(nueva[3], 10) : undefined,
      episodio: nueva[4] ? parseInt(nueva[4], 10) : undefined,
    };
  }

  const vieja = /\/(peliculas|series|animes|novelas)\/([^/?#]+)/.exec(url);
  if (!vieja) throw new Error('Dirección de LaMovie no reconocida');
  const seg = vieja[1];
  const slug = decodeURIComponent(vieja[2]);
  const aceptados: Kind[] =
    seg === 'peliculas' ? ['movie'] : seg === 'animes' ? ['anime', 'tvshow'] : ['tvshow', 'anime'];
  const r = await _get<LMPagina>(
    `${API}/search?q=${encodeURIComponent(slug.replace(/-/g, ' '))}&limit=100`,
  );
  const obra = (r.items || []).find((i) => i.slug === slug && aceptados.indexOf(i.kind) !== -1);
  if (!obra) throw new Error('Este título ya no está en LaMovie');
  const s = /[?&]s=(\d+)/.exec(url);
  const e = /[?&]e=(\d+)/.exec(url);
  return {
    kind: obra.kind,
    id: obra.tmdb_id,
    temporada: s ? parseInt(s[1], 10) : undefined,
    episodio: e ? parseInt(e[1], 10) : undefined,
  };
}

// ─── Detalle ────────────────────────────────────────────────────────────────
function _estado(s?: string | null): ContentStatus | undefined {
  switch (s) {
    case 'Returning Series':
    case 'In Production':
      return 'ongoing';
    case 'Ended':
    case 'Canceled':
      return 'completed';
    case 'Planned':
    case 'Post Production':
    case 'Rumored':
      return 'upcoming';
    default:
      return undefined;
  }
}

async function _temporadas(kind: Kind, id: number): Promise<PrismSeason[]> {
  const r = await _get<{ seasons?: LMTemporadaResumen[] }>(`${API}/items/${kind}/${id}/seasons`);
  // Solo las que tienen algo para ver. La temporada 0 ("Especiales") entra si
  // trae episodios, pero va al final como en el sitio.
  const conVideo = (r.seasons || [])
    .filter((t) => (t.playable_count || 0) > 0)
    .sort((a, b) => (a.season === 0 ? 1 : b.season === 0 ? -1 : a.season - b.season));

  const detalles = await Promise.all(
    conVideo.map((t) =>
      _get<{ season?: { episodes?: LMEpisodio[] } }>(`${API}/items/${kind}/${id}/seasons/${t.season}`)
        .then((d) => ({ t, episodios: d.season?.episodes || [] }))
        .catch((e) => {
          console.log(`[lamovie] temporada ${t.season} sin cargar: ${e}`);
          return { t, episodios: [] as LMEpisodio[] };
        }),
    ),
  );

  const temporadas: PrismSeason[] = [];
  for (const { t, episodios } of detalles) {
    const lista: PrismEpisode[] = episodios
      // Sin exigir `code` (la API ya no lo manda, ver watch).
      .filter((e) => e.playable !== false)
      .sort((a, b) => a.episode - b.episode)
      .map((e) => ({
        title: e.title || `Episodio ${e.episode}`,
        url: _episodioUrl(kind, id, e.season, e.episode),
        thumbnail: _img(e.still_path, 'w300'),
        duration: e.runtime ? e.runtime * 60 : undefined,
        airDate: e.air_date ? e.air_date.slice(0, 10) : undefined,
        number: e.episode,
      }));
    if (lista.length === 0) continue;
    const y = t.air_date ? parseInt(t.air_date.slice(0, 4), 10) : NaN;
    temporadas.push({
      title: t.name || (t.season === 0 ? 'Especiales' : `Temporada ${t.season}`),
      episodes: lista,
      year: Number.isFinite(y) ? y : undefined,
      cover: _img(t.poster_path, 'w342'),
    });
  }
  return temporadas;
}

export async function detail(url: string): Promise<PrismDetail> {
  const ref = await _referenciaDe(url);
  const r = await _get<{ item?: LMItem }>(`${API}/items/${ref.kind}/${ref.id}`);
  const i = r.item;
  if (!i) throw new Error('No se pudo cargar la ficha en LaMovie');

  const episodios: PrismEpisode[] = [];
  let seasons: PrismSeason[] | undefined;
  if (i.kind === 'movie') {
    // Película: un solo "episodio", la película misma, para que el flujo de
    // reproducción sea el mismo watch(url).
    // Ya no se exige `code`: desde 2026-10 la ficha no lo trae (los
    // servidores salen de /v1/playback, ver watch). Con `playable` alcanza.
    if (i.playable !== false) {
      episodios.push({
        title: i.title,
        url: _itemUrl(i.kind, i.tmdb_id, i.slug),
        duration: i.runtime ? i.runtime * 60 : undefined,
      });
    }
  } else {
    seasons = await _temporadas(i.kind, i.tmdb_id);
  }

  const extra: Record<string, string> = {};
  if (i.original_title && i.original_title !== i.title) extra['Título original'] = i.original_title;
  if (i.certification) extra['Clasificación'] = i.certification;
  const paises = (i.countries || []).map((c) => _PAISES_ES[c.slug] || c.title).filter((x) => !!x);
  if (paises.length) extra['País'] = paises.join(', ');
  const cadenas = (i.networks || []).map((c) => c.title).filter((x) => !!x);
  if (cadenas.length) extra['Cadena'] = cadenas.join(', ');
  const estudios = (i.studios || []).slice(0, 3).map((c) => c.title).filter((x) => !!x);
  if (estudios.length) extra['Estudio'] = estudios.join(', ');

  return {
    title: i.title,
    cover: _img(i.poster_path, 'w500'),
    description: i.overview || undefined,
    episodes: episodios,
    seasons,
    genres: _generos(i),
    status: i.kind === 'movie' ? undefined : _estado(i.status),
    year: _anio(i),
    rating: i.vote_average ? Math.round(i.vote_average * 10) / 10 : undefined,
    extra,
    type: 'bangumi',
  };
}

// ─── Reproducción ───────────────────────────────────────────────────────────
//
// ── Desde 2026-10: los servidores salen de /v1/playback ─────────────────────
//
// La ficha dejó de traer el `code` del vídeo (medido: `playable: true` y
// `code` ausente en todas). El sitio pide los servidores aparte, a
// `/v1/playback/<tipo>/<id>` (con `?season=&episode=` en series), y recibe
// una LISTA: `{ url, host, lang, quality }`. Sin esto todas las fichas
// quedaban sin episodios y la extensión estaba marcada rota.
//
// Medido sobre 100 películas y 120 episodios (2026-10-03): solo dos hosts.
//   · vimeos.net      100/100 películas, 118/120 episodios. Resuelve nativo.
//   · goodstream.one   91/100 películas,  75/120 episodios. El embed responde
//     pero sus nodos de vídeo (encN/sN.goodstream.one) no aceptan conexión, y
//     en el teléfono decía «no disponible» (ya medido con FuegoCine). FUERA.
// Solo sale lo que reproduce en el reproductor de la app: la app ya no abre
// páginas en un navegador.

interface LMEmbed {
  url: string;
  host?: string;
  lang?: string;
  quality?: string;
}

async function _embedsDe(ref: Referencia): Promise<LMEmbed[]> {
  if (ref.kind !== 'movie' && (ref.temporada == null || ref.episodio == null)) {
    throw new Error('Falta el episodio a reproducir');
  }
  const q = ref.kind === 'movie' ? '' : `?season=${ref.temporada}&episode=${ref.episodio}`;
  // Un 404 llega como { error: … }: sin embeds.
  const r = await _get<{ embeds?: LMEmbed[] }>(`${API}/playback/${ref.kind}/${ref.id}${q}`);
  return Array.isArray(r.embeds) ? r.embeds.filter((e) => e && typeof e.url === 'string') : [];
}

/** «Latino», «Japonés (sub. latino)»: corto, para el botón. */
function _idioma(lang: string | undefined): string {
  const l = (lang || '').trim();
  if (!l) return '';
  const sub = /^(.+?)\s*-\s*Subt[ií]tulos?\s+(.+)$/i.exec(l);
  return sub ? `${sub[1]} (sub. ${sub[2].toLowerCase()})` : l;
}

async function _resolver(embed: string, lang?: string): Promise<PrismStream | null> {
  const resuelto = await resolverServidor(embed, `${BASE}/`);
  if (!resuelto) return null;
  const idioma = _idioma(lang);
  return {
    url: resuelto.url,
    headers: resuelto.headers,
    quality: idioma ? `Vimeos · ${idioma}` : 'Vimeos',
    nativo: true,
  };
}

export async function watch(url: string): Promise<PrismWatch> {
  // Llega la dirección de un embed suelto (cambio de servidor desde la app).
  if (url.indexOf('vimeos.') !== -1) {
    const s = await _resolver(url);
    return s ? { streams: [s] } : { streams: [], reason: 'servidores_no_disponibles' };
  }

  const ref = await _referenciaDe(url);
  const todos = await _embedsDe(ref);
  // Uno por dirección (el sitio a veces repite el mismo embed), y solo los
  // que la app sabe reproducir.
  const vistos = new Set<string>();
  const propios = todos.filter((e) => {
    if (!servidorDe(e.url) || vistos.has(e.url)) return false;
    vistos.add(e.url);
    return true;
  });
  if (!propios.length) {
    return { streams: [], reason: todos.length ? 'servidores_no_disponibles' : 'sin_servidores' };
  }
  const resueltos = await Promise.all(propios.map((e) => _resolver(e.url, e.lang).catch(() => null)));
  const streams = resueltos.filter((x): x is PrismStream => !!x);
  if (!streams.length) return { streams: [], reason: 'servidores_no_disponibles' };
  return { streams };
}

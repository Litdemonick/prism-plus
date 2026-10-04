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

import { resolver as resolverServidor, servidorDe, SERVIDORES } from './servidores';

// ─── La API de WordPress, otra vez ──────────────────────────────────────────
//
// LaMovie va y viene entre dos API. El 2026-09-27 dejó esta (la de
// `siteConfig.fastApi`) por una basada en TMDB (`tmdb.allcalidad.re/v1`); el
// 2026-10-04 volvió a esta y la de TMDB pasó a contestar 404 en todo.
//
// Medido con curl ese día, ruta por ruta:
//
//   /listing/<tipo>?postType=<tipo>      catálogo: movies | tvshows | animes,
//     &page &postsPerPage                con `pagination.last_page`
//     &orderBy=latest|views &order=desc  (`rating` ordena igual que `latest`)
//     &filter={"genres":[id],"years":[id],"countries":[id],"providers":[id]}
//                                        ids de `siteConfig.datas` (portada)
//   /search?postType=any|<tipo>&q=…      búsqueda, paginada igual
//   /single/<tipo>?slug=…&postType=…     la ficha: `_id` de WordPress
//   /single/episodes/list?_id=…&season=N episodios y `seasons` (["1","2"…])
//   /player?postId=<_id>&demo=0          servidores: `embeds[{url,server,lang}]`
//
// Las direcciones guardadas de antes (de la API de TMDB, con su id, y las de
// la primera versión, con `/peliculas/<slug>/`) llevan el SLUG: se abre por
// ahí, que es lo que esta API entiende.
const BASE = 'https://lamovie.org';
const API = `${BASE}/wp-api/v1`;
const SUBIDAS = `${BASE}/wp-content/uploads`;
const IMG = 'https://image.tmdb.org/t/p';

async function _get<T = any>(url: string): Promise<T> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([url, { method: 'get', headers: { Referer: `${BASE}/` } }]),
  );
  // Si la API vuelve a contestar HTML (ya pasó con las dos), que el error lo
  // diga claro en vez de un "Unexpected token <" sin contexto.
  const t = (raw || '').trim();
  if (t.charAt(0) !== '{' && t.charAt(0) !== '[') {
    throw new Error('LaMovie no devolvió datos (la API respondió otra cosa)');
  }
  return JSON.parse(t) as T;
}

/** La API envuelve todo en `{ error, message, data }`. */
async function _datos<T = any>(ruta: string): Promise<T> {
  const r = await _get<{ error?: boolean; message?: string; data?: T }>(`${API}${ruta}`);
  if (r.error || r.data == null) throw new Error(r.message || 'LaMovie no encontró eso');
  return r.data;
}

// ─── Tipos de contenido ─────────────────────────────────────────────────────
type Kind = 'movie' | 'tvshow' | 'anime';
const KINDS: Kind[] = ['movie', 'tvshow', 'anime'];

/** El `postType` de la API para cada tipo, y al revés. */
const POST_TYPE: Record<Kind, string> = { movie: 'movies', tvshow: 'tvshows', anime: 'animes' };
const KIND_DE_POST: Record<string, Kind> = { movies: 'movie', tvshows: 'tvshow', animes: 'anime' };

// El tramo de la dirección para cada tipo (/pelicula/:id/:slug, etc.).
const SEGMENTO: Record<Kind, string> = { movie: 'pelicula', tvshow: 'serie', anime: 'anime' };

function _tipoDeMedio(kind: string): MediaType {
  if (kind === 'movie') return 'movie';
  if (kind === 'anime') return 'anime';
  return 'series';
}

// ─── Modelos de la API ──────────────────────────────────────────────────────
interface LMItem {
  _id: number;
  title: string;
  slug: string;
  type: string;
  overview?: string | null;
  original_title?: string | null;
  images?: { poster?: string | null; backdrop?: string | null } | null;
  rating?: string | number | null;
  genres?: number[];
  countries?: number[];
  years?: number[];
  release_date?: string | null;
  runtime?: string | number | null;
  certification?: string | null;
  latest_episode?: { season_number?: number; episode_number?: number } | null;
}
interface LMPagina {
  posts?: LMItem[];
  pagination?: { current_page: number; last_page: number };
}
interface LMEpisodio {
  _id: number;
  title?: string | null;
  runtime?: string | number | null;
  still_path?: string | null;
  date?: string | null;
  season_number: number;
  episode_number: number;
}

function _img(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.indexOf('http') === 0) return path;
  return `${SUBIDAS}${path.charAt(0) === '/' ? '' : '/'}${path}`;
}

function _imgTmdb(path: string | null | undefined, tam: string): string | undefined {
  if (!path) return undefined;
  if (path.indexOf('http') === 0) return path;
  return `${IMG}/${tam}${path.charAt(0) === '/' ? '' : '/'}${path}`;
}

function _itemUrl(kind: Kind, id: number, slug: string): string {
  return `${BASE}/${SEGMENTO[kind]}/${id}/${slug}`;
}

/** Lleva el `_id` del episodio: con eso `watch` va directo a los servidores. */
function _episodioUrl(kind: Kind, slug: string, e: LMEpisodio): string {
  return `${BASE}/${SEGMENTO[kind]}/0/${slug}/temporada/${e.season_number}/episodio/${e.episode_number}?ep=${e._id}`;
}

/** «Mentes Criminales (2005)» → «Mentes Criminales»: el año va aparte. */
function _titulo(t: string): string {
  return (t || '').replace(/\s*\(\d{4}\)\s*$/, '').replace(/&amp;/g, '&');
}

function _anio(i: LMItem): number | undefined {
  const m = /\((\d{4})\)\s*$/.exec(i.title || '');
  if (m) return parseInt(m[1], 10);
  const y = i.release_date ? parseInt(i.release_date.slice(0, 4), 10) : NaN;
  return Number.isFinite(y) ? y : undefined;
}

function _numero(x: string | number | null | undefined): number | undefined {
  const n = typeof x === 'number' ? x : parseFloat(x || '');
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function _generos(i: LMItem): string[] | undefined {
  const nombres = (i.genres || [])
    .map((id) => _taxonomias?.genres[String(id)]?.name)
    .filter((x): x is string => !!x);
  return nombres.length ? nombres : undefined;
}

function _itemDe(i: LMItem): PrismItem | null {
  const kind = KIND_DE_POST[i.type];
  if (!kind || !i.slug) return null;
  const u = i.latest_episode;
  const rating = _numero(i.rating);
  return {
    title: _titulo(i.title),
    url: _itemUrl(kind, i._id, i.slug),
    cover: _img(i.images?.poster),
    description: i.overview || undefined,
    tags: _generos(i),
    year: _anio(i),
    rating: rating ? Math.round(rating * 10) / 10 : undefined,
    type: _tipoDeMedio(kind),
    update: u && u.season_number && u.episode_number && kind !== 'movie'
      ? `T${u.season_number} E${u.episode_number}`
      : undefined,
  };
}

// ─── Taxonomías (géneros, años, países, plataformas) ────────────────────────
//
// La API no las publica: están en `siteConfig.datas`, dentro de la portada del
// sitio, como `{"17":{"name":"Drama","slug":"drama"}, …}`. Son los ids que
// pide el filtro.
interface Termino {
  name: string;
  slug: string;
}
type Taxonomia = Record<string, Termino>;
let _taxonomias: {
  genres: Taxonomia;
  years: Taxonomia;
  countries: Taxonomia;
  providers: Taxonomia;
} | null = null;

async function _leerTaxonomias(): Promise<typeof _taxonomias> {
  if (_taxonomias) return _taxonomias;
  try {
    const raw = await sendMessage(
      'request',
      JSON.stringify([`${BASE}/`, { method: 'get', headers: { Referer: `${BASE}/` } }]),
    );
    let html = raw || '';
    try {
      const j = JSON.parse(html);
      if (typeof j === 'string') html = j;
    } catch {
      // ya era el texto
    }
    const leer = (clave: string): Taxonomia => {
      const m = new RegExp(`\\b${clave}:(\\{[^\\n]*\\})\\s*,?\\s*\\n`).exec(html);
      if (!m) return {};
      try {
        return JSON.parse(m[1]) as Taxonomia;
      } catch {
        return {};
      }
    };
    const t = {
      genres: leer('genres'),
      years: leer('years'),
      countries: leer('countries'),
      providers: leer('providers'),
    };
    if (Object.keys(t.genres).length === 0) throw new Error('la portada no trajo los géneros');
    _taxonomias = t;
    return _taxonomias;
  } catch (e) {
    console.log(`[lamovie] sin taxonomías: ${e}`);
    return null;
  }
}

/** Un valor de filtro (id, slug o nombre) → el id que pide la API. */
function _idDe(tax: Taxonomia | undefined, valor: string | undefined): number | undefined {
  if (!valor || !tax) return undefined;
  if (/^\d+$/.test(valor) && tax[valor]) return parseInt(valor, 10);
  const v = valor.toLowerCase();
  for (const id of Object.keys(tax)) {
    const t = tax[id];
    if (t.slug === v || (t.name || '').toLowerCase() === v) return parseInt(id, 10);
  }
  return undefined;
}

// ─── Filtros ────────────────────────────────────────────────────────────────
type Orden = 'recent' | 'popular';
interface Filtro {
  kind?: Kind;
  orden: Orden;
  genero?: string;
  anio?: string;
  pais?: string;
  plataforma?: string;
}

// Los valores de versiones anteriores, por si la app los tiene guardados.
const _TIPO_VIEJO: Record<string, Kind> = {
  movies: 'movie', tvshows: 'tvshow', animes: 'anime', novels: 'tvshow',
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
  return {
    kind,
    orden: o === 'popular' || o === 'views' ? 'popular' : 'recent',
    genero: v('genero'),
    anio: v('anio'),
    pais: v('pais'),
    plataforma: v('plataforma'),
  };
}

/** El `filter` de la API, con ids. Lo que no se reconoce no se manda. */
function _filtroApi(f: Filtro): string {
  const t = _taxonomias;
  const o: Record<string, number[]> = {};
  const g = _idDe(t?.genres, f.genero);
  if (g) o.genres = [g];
  const y = _idDe(t?.years, f.anio);
  if (y) o.years = [y];
  const c = _idDe(t?.countries, f.pais);
  if (c) o.countries = [c];
  const p = _idDe(t?.providers, f.plataforma);
  if (p) o.providers = [p];
  return Object.keys(o).length ? `&filter=${encodeURIComponent(JSON.stringify(o))}` : '';
}

function _opciones(
  tax: Taxonomia | undefined,
  todos: string,
  orden?: (a: Termino, b: Termino) => number,
): Record<string, string> {
  const out: Record<string, string> = { '': todos };
  const lista = Object.keys(tax || {}).map((id) => ({ id, t: (tax as Taxonomia)[id] }));
  lista.sort((a, b) => (orden ? orden(a.t, b.t) : a.t.name.localeCompare(b.t.name)));
  for (const { id, t } of lista) out[id] = t.name;
  return out;
}

export async function createFilter(): Promise<Record<string, unknown>> {
  const tax = await _leerTaxonomias();
  return {
    tipo: {
      title: 'Tipo',
      options: { '': 'Todos', movie: 'Películas', tvshow: 'Series', anime: 'Animes' },
      default: '', min: 1, max: 1,
    },
    orden: {
      title: 'Orden',
      options: { recent: 'Recientes', popular: 'Más vistos' },
      default: 'recent', min: 1, max: 1,
    },
    genero: { title: 'Género', options: _opciones(tax?.genres, 'Todos'), default: '', min: 1, max: 1 },
    anio: {
      title: 'Año',
      options: _opciones(tax?.years, 'Todos', (a, b) => parseInt(b.name, 10) - parseInt(a.name, 10)),
      default: '', min: 1, max: 1,
    },
    pais: { title: 'País', options: _opciones(tax?.countries, 'Todos'), default: '', min: 1, max: 1 },
    plataforma: {
      title: 'Plataforma',
      options: _opciones(tax?.providers, 'Todas'), default: '', min: 1, max: 1,
    },
  };
}

// ─── Catálogo ───────────────────────────────────────────────────────────────
const POR_PAGINA = 24;

async function _listar(kind: Kind, page: number, f: Filtro): Promise<PrismItem[]> {
  await _leerTaxonomias();
  const tipo = POST_TYPE[kind];
  const orden = f.orden === 'popular' ? 'views' : 'latest';
  const r = await _datos<LMPagina>(
    `/listing/${tipo}?postType=${tipo}&page=${page}&postsPerPage=${POR_PAGINA}` +
      `&orderBy=${orden}&order=desc${_filtroApi(f)}`,
  );
  if (r.pagination && page > r.pagination.last_page) return [];
  return (r.posts || []).map(_itemDe).filter((x): x is PrismItem => !!x);
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
  const porTipo = await Promise.all(
    KINDS.map((k) =>
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
export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const kw = keyword.trim();
  if (!kw) return latest(page, filter);
  await _leerTaxonomias();
  const f = _leerFiltro(filter);
  const tipo = f.kind ? POST_TYPE[f.kind] : 'any';
  const r = await _datos<LMPagina>(
    `/search?postType=${tipo}&q=${encodeURIComponent(kw)}&page=${page}&postsPerPage=${POR_PAGINA}${_filtroApi(f)}`,
  );
  if (r.pagination && page > r.pagination.last_page) return [];
  const vistas: Record<string, boolean> = {};
  const items: PrismItem[] = [];
  for (const i of r.posts || []) {
    const it = i ? _itemDe(i) : null;
    if (!it || vistas[it.url]) continue;
    vistas[it.url] = true;
    items.push(it);
  }
  return items;
}

// ─── Direcciones ────────────────────────────────────────────────────────────
interface Referencia {
  kind: Kind;
  slug?: string;
  temporada?: number;
  episodio?: number;
  /** El `_id` del episodio (o de la película) si la dirección ya lo trae. */
  postId?: number;
}

const _KIND_DE_SEGMENTO: Record<string, Kind> = {
  pelicula: 'movie', serie: 'tvshow', anime: 'anime',
  peliculas: 'movie', series: 'tvshow', animes: 'anime', novelas: 'tvshow',
};

/**
 * Lee una dirección de esta extensión, de cualquier versión:
 *
 *  · actual:  /serie/<id>/<slug>[/temporada/N/episodio/M?ep=<_id>]
 *  · TMDB:    /serie/<id>/<slug>   (el id era de TMDB: se ignora, vale el slug)
 *  · primera: /series/<slug>/?s=1&e=2
 *
 * Un episodio guardado por la versión de TMDB (`/serie/<id>/temporada/…`, sin
 * slug) no se puede ubicar: se avisa que se abra de nuevo desde la ficha.
 */
function _referenciaDe(url: string): Referencia {
  const ep = /[?&]ep=(\d+)/.exec(url);
  const t =
    /\/temporada\/(\d+)\/episodio\/(\d+)/.exec(url) || /[?&]s=(\d+)&e=(\d+)/.exec(url);
  const actual = /\/(pelicula|serie|anime)\/\d+\/([^/?#]+)/.exec(url);
  const vieja = /\/(peliculas|series|animes|novelas)\/([^/?#]+)/.exec(url);
  const suelto = /\/(pelicula|serie|anime)\//.exec(url);
  const m = actual || vieja;
  const seg = m ? m[1] : suelto ? suelto[1] : '';
  const kind = _KIND_DE_SEGMENTO[seg];
  if (!kind) throw new Error('Dirección de LaMovie no reconocida');
  const slug = m && m[2] !== 'temporada' ? decodeURIComponent(m[2]) : undefined;
  return {
    kind,
    slug,
    temporada: t ? parseInt(t[1], 10) : undefined,
    episodio: t ? parseInt(t[2], 10) : undefined,
    postId: ep ? parseInt(ep[1], 10) : undefined,
  };
}

/** La ficha de la API para un slug (con su `_id` de WordPress). */
async function _ficha(ref: Referencia): Promise<LMItem> {
  if (!ref.slug) {
    throw new Error('Este episodio se guardó con una versión vieja: abrilo de nuevo desde la ficha');
  }
  const tipo = POST_TYPE[ref.kind];
  try {
    return await _datos<LMItem>(`/single/${tipo}?slug=${encodeURIComponent(ref.slug)}&postType=${tipo}`);
  } catch (e) {
    // Una serie que el sitio pasó a anime (o al revés).
    const otro = ref.kind === 'anime' ? 'tvshows' : ref.kind === 'tvshow' ? 'animes' : null;
    if (!otro) throw new Error('Este título ya no está en LaMovie');
    return _datos<LMItem>(`/single/${otro}?slug=${encodeURIComponent(ref.slug)}&postType=${otro}`);
  }
}

// ─── Detalle ────────────────────────────────────────────────────────────────
async function _episodiosDeTemporada(
  id: number,
  temporada: string,
): Promise<{ eps: LMEpisodio[]; temporadas: string[] }> {
  const eps: LMEpisodio[] = [];
  let temporadas: string[] = [];
  for (let page = 1; page <= 20; page++) {
    const r = await _datos<{
      posts?: LMEpisodio[];
      seasons?: (string | number)[];
      pagination?: { last_page: number };
    }>(`/single/episodes/list?_id=${id}&season=${encodeURIComponent(temporada)}&page=${page}&postsPerPage=100`);
    if (page === 1) temporadas = (r.seasons || []).map(String);
    eps.push(...(r.posts || []));
    if (!r.pagination || page >= r.pagination.last_page) break;
  }
  return { eps, temporadas };
}

async function _temporadas(kind: Kind, i: LMItem): Promise<PrismSeason[]> {
  // La primera pedida trae la lista de temporadas; las demás se piden a la vez.
  const primera = await _episodiosDeTemporada(i._id, '1');
  const nombres = primera.temporadas.length ? primera.temporadas.slice() : ['1'];
  // La 0 («Especiales») va al final, como en el sitio.
  nombres.sort((a, b) => (a === '0' ? 1 : b === '0' ? -1 : parseInt(a, 10) - parseInt(b, 10)));
  const porTemporada = await Promise.all(
    nombres.map((n) =>
      n === '1'
        ? Promise.resolve({ n, eps: primera.eps })
        : _episodiosDeTemporada(i._id, n)
            .then((r) => ({ n, eps: r.eps }))
            .catch((e) => {
              console.log(`[lamovie] temporada ${n} sin cargar: ${e}`);
              return { n, eps: [] as LMEpisodio[] };
            }),
    ),
  );
  const temporadas: PrismSeason[] = [];
  for (const { n, eps } of porTemporada) {
    const lista: PrismEpisode[] = eps
      .slice()
      .sort((a, b) => a.episode_number - b.episode_number)
      .map((e) => {
        const min = _numero(e.runtime);
        return {
          title: `Episodio ${e.episode_number}`,
          url: _episodioUrl(kind, i.slug, e),
          thumbnail: _imgTmdb(e.still_path, 'w300'),
          duration: min ? min * 60 : undefined,
          airDate: e.date ? e.date.slice(0, 10) : undefined,
          number: e.episode_number,
        };
      });
    if (lista.length === 0) continue;
    temporadas.push({ title: n === '0' ? 'Especiales' : `Temporada ${n}`, episodes: lista });
  }
  return temporadas;
}

export async function detail(url: string): Promise<PrismDetail> {
  await _leerTaxonomias();
  const ref = _referenciaDe(url);
  const i = await _ficha(ref);
  const kind = KIND_DE_POST[i.type] || ref.kind;

  const episodios: PrismEpisode[] = [];
  let seasons: PrismSeason[] | undefined;
  if (kind === 'movie') {
    // Película: un solo "episodio", la película misma, con su `_id` para ir
    // directo a los servidores.
    const min = _numero(i.runtime);
    episodios.push({
      title: _titulo(i.title),
      url: `${_itemUrl(kind, i._id, i.slug)}?ep=${i._id}`,
      duration: min ? min * 60 : undefined,
    });
  } else {
    seasons = await _temporadas(kind, i);
  }

  const extra: Record<string, string> = {};
  if (i.original_title && _titulo(i.original_title) !== _titulo(i.title)) {
    extra['Título original'] = i.original_title;
  }
  if (i.certification) extra['Clasificación'] = i.certification;
  const paises = (i.countries || [])
    .map((id) => _taxonomias?.countries[String(id)]?.name)
    .filter((x): x is string => !!x);
  if (paises.length) extra['País'] = paises.join(', ');

  const rating = _numero(i.rating);
  return {
    title: _titulo(i.title),
    cover: _img(i.images?.poster),
    description: i.overview || undefined,
    episodes: episodios,
    seasons,
    genres: _generos(i),
    year: _anio(i),
    rating: rating ? Math.round(rating * 10) / 10 : undefined,
    extra,
    type: 'bangumi',
  };
}

// ─── Reproducción ───────────────────────────────────────────────────────────
//
// ── Los servidores salen de /player ─────────────────────────────────────────
//
// `/player?postId=<_id>` (el de la película o el del episodio) devuelve
// `embeds[{ url, server, lang, quality }]`. Con la API de WordPress de vuelta
// (2026-10-04) trae más hosts que antes: vimeos, voe, doodstream, goodstream,
// hlswish y videoapp. Solo salen los que reproducen en la app (ver
// `servidores/`): la app ya no abre páginas en un navegador.
//
// El idioma viene como «Latino», «Latino - Inglés» o «Latino - Japones»: con
// guion son DOS audios en el mismo vídeo (la lista de Vimeos los declara aparte
// y la app ofrece cambiar de idioma), no subtítulos.

interface LMEmbed {
  url: string;
  server?: string;
  lang?: string;
  quality?: string;
}

/** El `_id` de lo que hay que reproducir: de la dirección, o buscándolo. */
async function _postIdDe(ref: Referencia): Promise<number> {
  if (ref.postId) return ref.postId;
  const i = await _ficha(ref);
  if (ref.kind === 'movie' || KIND_DE_POST[i.type] === 'movie') return i._id;
  if (ref.temporada == null || ref.episodio == null) throw new Error('Falta el episodio a reproducir');
  const { eps } = await _episodiosDeTemporada(i._id, String(ref.temporada));
  const ep = eps.find((e) => e.episode_number === ref.episodio);
  if (!ep) throw new Error('Este episodio ya no está en LaMovie');
  return ep._id;
}

async function _embedsDe(ref: Referencia): Promise<LMEmbed[]> {
  const id = await _postIdDe(ref);
  const d = await _datos<{ embeds?: LMEmbed[] }>(`/player?postId=${id}&demo=0`);
  return Array.isArray(d.embeds) ? d.embeds.filter((e) => e && typeof e.url === 'string') : [];
}

/** «Latino», «Latino + Japonés», «Japonés (sub. latino)»: corto, para el botón. */
function _idioma(lang: string | undefined): string {
  const l = (lang || '').trim().replace(/Japones/g, 'Japonés').replace(/Ingles/g, 'Inglés');
  if (!l) return '';
  const sub = /^(.+?)\s*-\s*Subt[ií]tulos?\s+(.+)$/i.exec(l);
  if (sub) return `${sub[1]} (sub. ${sub[2].toLowerCase()})`;
  // «Latino - Inglés»: dos audios en el mismo vídeo.
  return l.replace(/\s*-\s*/g, ' + ');
}

/**
 * ¿La lista de vídeo llega de verdad? Vimeos a veces contesta 500/502 con una
 * página («500 ERROR») en vez de la lista: medido 2026-10-04 en 8 de 46
 * episodios (p3/p5.vimeos.zip). Ofrecerlo era un botón que no reproduce nunca.
 *
 * Solo para listas (un MP4 se bajaría entero). Si tarda más de [plazoMs] no
 * se lo saca: lento no es roto, y la app avisa cuando un servidor va lento.
 */
async function _listaLlega(url: string, headers?: Record<string, string>, plazoMs = 4000): Promise<boolean> {
  if (url.split('?')[0].indexOf('.m3u8') === -1) return true;
  const pedido = sendMessage('request', JSON.stringify([url, { method: 'get', headers: headers || {} }]))
    .then((raw) => {
      let t = raw || '';
      try {
        const j = JSON.parse(t);
        if (typeof j === 'string') t = j;
      } catch {
        // ya era el texto
      }
      return t.indexOf('#EXTM3U') !== -1;
    })
    .catch(() => false);
  const plazo = new Promise<boolean>((ok) => setTimeout(() => ok(true), plazoMs));
  return Promise.race([pedido, plazo]);
}

async function _resolver(embed: string, lang?: string): Promise<PrismStream | null> {
  const resuelto = await resolverServidor(embed, `${BASE}/`);
  if (!resuelto) return null;
  if (!(await _listaLlega(resuelto.url, resuelto.headers))) {
    console.log(`[lamovie] ${servidorDe(embed)?.boton ?? 'servidor'} no entrega el vídeo (error del servidor): no se ofrece`);
    return null;
  }
  const boton = servidorDe(embed)?.boton || 'Servidor';
  const idioma = _idioma(lang);
  return {
    url: resuelto.url,
    headers: resuelto.headers,
    quality: idioma ? `${boton} · ${idioma}` : boton,
    nativo: true,
  };
}

export async function watch(url: string): Promise<PrismWatch> {
  // Llega la dirección de un embed suelto (cambio de servidor desde la app).
  if (servidorDe(url)) {
    const s = await _resolver(url);
    return s ? { streams: [s] } : { streams: [], reason: 'servidores_no_disponibles' };
  }

  const ref = _referenciaDe(url);
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
  // El más rápido primero, que es el que la app abre sola: el orden de
  // `SERVIDORES` (Vimeos ~2,6 s, VOE ~11,6 s), no el del sitio.
  const orden = (u: string) => {
    const s = servidorDe(u);
    return s ? SERVIDORES.indexOf(s) : 99;
  };
  propios.sort((a, b) => orden(a.url) - orden(b.url));
  const resueltos = await Promise.all(propios.map((e) => _resolver(e.url, e.lang).catch(() => null)));
  const streams = resueltos.filter((x): x is PrismStream => !!x);
  if (!streams.length) return { streams: [], reason: 'servidores_no_disponibles' };
  return { streams };
}

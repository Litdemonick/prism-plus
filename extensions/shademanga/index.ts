import { resolveEmbed } from '../../sdk/embeds';
import type {
  PrismDetail,
  PrismItem,
  PrismMangaWatch,
  PrismWatch,
  PrismStream,
  PrismEpisode,
  ContentStatus,
} from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://www.shademanga.com';
const HOST = 'shademanga.com';

async function _get(url: string): Promise<any> {
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

function _splitGenres(g?: string | null): string[] | undefined {
  if (!g) return undefined;
  const list = g.split(',').map((s) => s.trim()).filter(Boolean);
  return list.length > 0 ? list : undefined;
}

// ─── Manga — API real (/api/series-locales/*), confirmada en vivo — sin
// scraping de HTML, catálogo/búsqueda/detalle/páginas del capítulo son todas
// llamadas JSON directas. Cada extensión "mixed" declara type: 'manga' o
// 'bangumi' por ítem (PrismItem.type para catálogo, PrismDetail.type para el
// detalle) — PrismHub no puede saberlo por sí solo porque la extensión entera
// tiene un único ExtensionType fijo en su manifest (ver ExtensionUtils.
// resolveType() del lado de la app).

interface _MangaListItem {
  id: number;
  titulo: string;
  descripcion?: string;
  generos?: string;
  portadaUrl?: string;
  esMayorDeEdad?: boolean;
  puntuacion?: number | null;
}

function _mangaUrl(id: number): string {
  return `${BASE}/serie/local/${id}`;
}

function _mangaChapterUrl(seriesId: number, chapterId: number): string {
  return `${BASE}/serie/local/${seriesId}/capitulo/${chapterId}`;
}

function _mangaItemToPrismItem(m: _MangaListItem): PrismItem {
  const rating = typeof m.puntuacion === 'number' && m.puntuacion > 0 ? m.puntuacion : undefined;
  return {
    title: m.titulo,
    url: _mangaUrl(m.id),
    cover: m.portadaUrl,
    description: m.descripcion,
    tags: _splitGenres(m.generos),
    rating,
    type: 'manga',
  };
}

async function _latestManga(page: number): Promise<PrismItem[]> {
  const json = await _get(`${BASE}/api/series-locales/populares?page=${page}`);
  if (!json || typeof json === 'string') return [];
  const items: _MangaListItem[] = json.items ?? [];
  return items.filter((m) => !m.esMayorDeEdad).map(_mangaItemToPrismItem);
}

async function _searchManga(keyword: string): Promise<PrismItem[]> {
  const url = `${BASE}/api/series-locales/search-candidates?q=${encodeURIComponent(keyword)}&take=20`;
  const json = await _get(url);
  if (!Array.isArray(json)) return [];
  return (json as _MangaListItem[]).filter((m) => !m.esMayorDeEdad).map(_mangaItemToPrismItem);
}

function _mapMangaStatus(estado?: string): ContentStatus | undefined {
  if (!estado) return undefined;
  const s = estado.toLowerCase();
  if (s.indexOf('curso') !== -1) return 'ongoing';
  if (s.indexOf('complet') !== -1) return 'completed';
  if (s.indexOf('pausa') !== -1 || s.indexOf('hiatus') !== -1) return 'hiatus';
  return undefined;
}

interface _MangaChapter {
  id: number;
  numeroCapitulo: number;
  titulo?: string | null;
  visible?: boolean;
}

interface _MangaDetailApi {
  id: number;
  titulo: string;
  descripcion?: string;
  portadaUrl?: string;
  generos?: string;
  puntuacion?: number | null;
  estado?: string;
  capitulos: _MangaChapter[];
}

async function _mangaDetail(id: number): Promise<PrismDetail> {
  const json: _MangaDetailApi = await _get(`${BASE}/api/series-locales/${id}`);
  const episodes: PrismEpisode[] = (json.capitulos ?? [])
    .filter((c) => c.visible !== false)
    .slice()
    .sort((a, b) => a.numeroCapitulo - b.numeroCapitulo)
    .map((c) => ({
      title: c.titulo ? `Cap. ${c.numeroCapitulo}: ${c.titulo}` : `Capítulo ${c.numeroCapitulo}`,
      url: _mangaChapterUrl(id, c.id),
      number: c.numeroCapitulo,
    }));

  const rating = typeof json.puntuacion === 'number' && json.puntuacion > 0 ? json.puntuacion : undefined;

  return {
    title: json.titulo,
    cover: json.portadaUrl,
    description: json.descripcion,
    genres: _splitGenres(json.generos),
    episodes,
    rating,
    status: _mapMangaStatus(json.estado),
    type: 'manga',
  };
}

async function _watchChapter(seriesId: string, chapterId: string): Promise<PrismMangaWatch> {
  const json = await _get(
    `${BASE}/api/series-locales/${seriesId}/capitulos/${chapterId}/paginas`,
  );
  const paginas: string[] = json?.paginas ?? [];
  return { urls: paginas };
}

// ─── Anime — API real (/api/anime/*), confirmada en vivo por separado de la
// de manga (no comparten prefijo). Servidores por episodio: en la práctica la
// mayoría son mp4upload/yourupload (resolver ya existente en el SDK
// compartido) — solo un puñado ("HD", player.zilla-networks.com) es una SPA
// sin datos estáticos, cae al WebView fallback como cualquier otro
// proveedor no resoluble.

interface _AnimeListItem {
  token: string;
  titulo: string;
  generos?: string;
  puntuacion?: number | null;
  esMayorDeEdad?: boolean;
  portadaUrl: string;
}

function _animeUrl(token: string): string {
  return `${BASE}/anime/${token}`;
}

function _animeEpisodeUrl(token: string, numero: number): string {
  return `${BASE}/anime/${token}/${numero}`;
}

function _animeAssetUrl(u: string): string {
  return u.indexOf('http') === 0 ? u : `${BASE}${u}`;
}

function _animeItemToPrismItem(a: _AnimeListItem): PrismItem {
  const rating = typeof a.puntuacion === 'number' && a.puntuacion > 0 ? a.puntuacion : undefined;
  return {
    title: a.titulo,
    url: _animeUrl(a.token),
    cover: _animeAssetUrl(a.portadaUrl),
    tags: _splitGenres(a.generos),
    rating,
    type: 'anime',
  };
}

async function _latestAnime(page: number): Promise<PrismItem[]> {
  const json = await _get(`${BASE}/api/anime?page=${page}`);
  if (!json || typeof json === 'string') return [];
  const items: _AnimeListItem[] = json.items ?? [];
  return items.filter((a) => !a.esMayorDeEdad).map(_animeItemToPrismItem);
}

async function _searchAnime(keyword: string): Promise<PrismItem[]> {
  const json = await _get(`${BASE}/api/anime?q=${encodeURIComponent(keyword)}`);
  if (!json || typeof json === 'string') return [];
  const items: _AnimeListItem[] = json.items ?? [];
  return items.filter((a) => !a.esMayorDeEdad).map(_animeItemToPrismItem);
}

function _mapAnimeStatus(estado?: string): ContentStatus | undefined {
  if (!estado) return undefined;
  const s = estado.toLowerCase();
  if (s.indexOf('emisi') !== -1) return 'ongoing';
  if (s.indexOf('final') !== -1 || s.indexOf('complet') !== -1) return 'completed';
  return undefined;
}

interface _AnimeEpisodeApi {
  numero: number;
  titulo?: string | null;
  fechaEmision?: string | null;
  thumbUrl?: string | null;
}

interface _AnimeDetailApi {
  token: string;
  titulo: string;
  titulosAlternativos?: string | null;
  sinopsis?: string | null;
  portadaUrl?: string;
  generos?: string;
  puntuacion?: number | null;
  estado?: string;
  episodios: _AnimeEpisodeApi[];
}

async function _animeDetail(token: string): Promise<PrismDetail> {
  const json: _AnimeDetailApi = await _get(`${BASE}/api/anime/${token}`);
  const episodes: PrismEpisode[] = (json.episodios ?? [])
    .slice()
    .sort((a, b) => a.numero - b.numero)
    .map((e) => ({
      title: e.titulo ? `Ep. ${e.numero}: ${e.titulo}` : `Episodio ${e.numero}`,
      url: _animeEpisodeUrl(token, e.numero),
      number: e.numero,
      thumbnail: e.thumbUrl ? _animeAssetUrl(e.thumbUrl) : undefined,
      airDate: e.fechaEmision ? e.fechaEmision.slice(0, 10) : undefined,
    }));

  const extra: Record<string, string> = {};
  if (json.titulosAlternativos) extra['Títulos alternativos'] = json.titulosAlternativos;

  const rating = typeof json.puntuacion === 'number' && json.puntuacion > 0 ? json.puntuacion : undefined;

  return {
    title: json.titulo,
    cover: json.portadaUrl ? _animeAssetUrl(json.portadaUrl) : undefined,
    description: json.sinopsis ?? undefined,
    genres: _splitGenres(json.generos),
    episodes,
    rating,
    status: _mapAnimeStatus(json.estado),
    extra: Object.keys(extra).length > 0 ? extra : undefined,
    type: 'bangumi',
  };
}

interface _AnimeEmbed {
  servidor: string;
  embedUrl: string;
  idioma?: string | null;
}

async function _watchEpisode(token: string, numero: string): Promise<PrismWatch> {
  const json = await _get(`${BASE}/api/anime/${token}/${numero}`);
  const embeds: _AnimeEmbed[] = json?.embeds ?? [];
  const streams: PrismStream[] = embeds.map((e) => ({
    url: e.embedUrl,
    quality: e.idioma ? `${e.servidor} (${e.idioma})` : e.servidor,
  }));
  return { streams };
}

// ─── Catálogo combinado ─────────────────────────────────────────────────────

function _interleave(a: PrismItem[], b: PrismItem[]): PrismItem[] {
  const merged: PrismItem[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i]) merged.push(a[i]);
    if (b[i]) merged.push(b[i]);
  }
  return merged;
}

export async function latest(page: number): Promise<PrismItem[]> {
  const [manga, anime] = await Promise.all([_latestManga(page), _latestAnime(page)]);
  return _interleave(manga, anime);
}

const _TYPE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  manga: 'Manga',
  anime: 'Anime',
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
  const kw = keyword.trim();

  if (!kw) {
    if (tipo === 'manga') return _latestManga(page);
    if (tipo === 'anime') return _latestAnime(page);
    return latest(page);
  }

  if (tipo === 'manga') return _searchManga(kw);
  if (tipo === 'anime') return _searchAnime(kw);

  const [manga, anime] = await Promise.all([_searchManga(kw), _searchAnime(kw)]);
  return _interleave(manga, anime);
}

// ─── Detalle ────────────────────────────────────────────────────────────────

function _mangaIdFromUrl(url: string): number | null {
  const m = /\/serie\/local\/(\d+)(?:\/|$)/.exec(url);
  return m ? parseInt(m[1], 10) : null;
}

function _animeTokenFromUrl(url: string): string | null {
  const m = /\/anime\/([^/]+)/.exec(url);
  return m ? m[1] : null;
}

export async function detail(url: string): Promise<PrismDetail> {
  const mangaId = _mangaIdFromUrl(url);
  if (mangaId !== null) return _mangaDetail(mangaId);

  const token = _animeTokenFromUrl(url);
  if (token) return _animeDetail(token);

  throw new Error(`URL de detalle no reconocida: ${url}`);
}

// ─── Reproducción/lectura ───────────────────────────────────────────────────

export async function watch(url: string): Promise<PrismMangaWatch | PrismWatch> {
  const chapterM = /\/serie\/local\/(\d+)\/capitulo\/(\d+)/.exec(url);
  if (chapterM) return _watchChapter(chapterM[1], chapterM[2]);

  const episodeM = /\/anime\/([^/]+)\/(\d+)/.exec(url);
  if (episodeM) return _watchEpisode(episodeM[1], episodeM[2]);

  // Fast-path: switchServer pidiendo resolver UN servidor de anime puntual
  // (embed crudo: mp4upload, yourupload, etc. — mismo patrón que las demás
  // extensiones de este repo).
  if (url.indexOf('http') === 0 && url.indexOf(HOST) === -1) {
    try {
      const res = await resolveEmbed('Servidor', url, `${BASE}/`);
      if (res && res.url) {
        return { streams: [{ url: res.url, quality: 'Servidor', headers: res.headers }] };
      }
    } catch {
      /* sigue abajo con la URL cruda */
    }
    return { streams: [{ url, quality: 'Servidor' }] };
  }

  return { streams: [] };
}

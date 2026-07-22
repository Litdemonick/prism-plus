import type { PrismItem, PrismDetail, PrismMangaWatch } from '../../sdk/types';

// sendMessage("request", ...) usa el dio de PrismHub (con UA, cookies y redirecciones),
// a diferencia de fetch() que usa http.Client básico.
declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://olympusxyz.com';
// El listado de capítulos vive en el backend directo (no en el proxy del front).
const BACKEND = 'https://panel.olympusxyz.com';

async function _get<T = unknown>(url: string): Promise<T> {
  const raw = await sendMessage('request', JSON.stringify([url, { method: 'get', headers: {} }]));
  try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
}

interface OlympusListItem {
  id: number;
  name: string;
  slug: string;
  cover?: string;
  type: 'comic' | 'novel';
  chapter_count?: number;
}

interface OlympusNewChapterItem {
  id: number;
  name: string;
  slug: string;
  cover?: string;
  type: 'comic' | 'novel';
  last_chapters?: { id: number; name: string; published_at: string }[];
}

interface OlympusChapterRef {
  id: number;
  name: string;
  published_at: string;
}

function _item(s: OlympusListItem): PrismItem {
  return {
    title: s.name,
    url: s.slug,
    cover: s.cover,
    update: s.chapter_count != null ? `Cap. ${s.chapter_count}` : undefined,
  };
}

// Recientemente actualizados — solo comics, las novelas usan otro formato de
// lectura (texto, no páginas) y no son parte de esta extensión.
export async function latest(page: number): Promise<PrismItem[]> {
  const d = await _get<{ data: OlympusNewChapterItem[] }>(`${BASE}/api/new-chapters?page=${page}`);
  return (d.data || [])
    .filter(s => s.type === 'comic')
    .map(s => ({
      title: s.name,
      url: s.slug,
      cover: s.cover,
      update: s.last_chapters?.[0] ? `Cap. ${s.last_chapters[0].name}` : undefined,
    }));
}

// El listado alfabético (/api/series) no soporta búsqueda por texto — el sitio
// hace fuzzy-search client-side sobre /api/series/list (~850 series completas).
// Replicamos eso: sin keyword usamos el listado paginado con filtros, con
// keyword pedimos la lista completa una vez (cacheada) y filtramos localmente.
let _listCache: OlympusListItem[] | null = null;
async function _fullList(): Promise<OlympusListItem[]> {
  if (_listCache) return _listCache;
  const d = await _get<{ data: OlympusListItem[] }>(`${BASE}/api/series/list`);
  _listCache = d.data || [];
  return _listCache;
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const genero = filter?.['genero']?.[0] ?? '';
  const estado = filter?.['estado']?.[0] ?? '';
  const q = keyword.trim();

  if (!q) {
    const params = new URLSearchParams({ page: String(page), direction: 'asc', type: 'comic' });
    if (genero) params.set('genres', genero);
    if (estado) params.set('status', estado);
    const d = await _get<{ data: { series: { data: OlympusListItem[] } } }>(
      `${BASE}/api/series?${params.toString()}`,
    );
    return (d.data?.series?.data || []).map(_item);
  }

  const all = await _fullList();
  const kw = q.toLowerCase();
  const matches = all.filter(s => s.type === 'comic' && s.name.toLowerCase().includes(kw));
  const perPage = 24;
  const start = (page - 1) * perPage;
  return matches.slice(start, start + perPage).map(_item);
}

export async function createFilter(): Promise<Record<string, unknown>> {
  const d = await _get<{
    genres: { id: number; name: string }[];
    statuses: { id: number; name: string }[];
  }>(`${BASE}/api/genres-statuses`);

  const generoOptions: Record<string, string> = { '': 'Todos' };
  for (const g of d.genres || []) generoOptions[String(g.id)] = g.name.trim();

  const estadoOptions: Record<string, string> = { '': 'Todos' };
  for (const s of d.statuses || []) estadoOptions[String(s.id)] = s.name.trim();

  return {
    genero: { title: 'Género', options: generoOptions, defaultOption: '', min: 1, max: 1 },
    estado: { title: 'Estado', options: estadoOptions, defaultOption: '', min: 1, max: 1 },
  };
}

async function _allChapters(slug: string): Promise<OlympusChapterRef[]> {
  const url = (page: number) =>
    `${BACKEND}/api/series/${encodeURIComponent(slug)}/chapters?page=${page}&direction=asc&type=comic`;
  const first = await _get<{ data: OlympusChapterRef[]; meta?: { last_page?: number } }>(url(1));
  const all = [...(first.data || [])];
  const lastPage = first.meta?.last_page ?? 1;
  for (let page = 2; page <= lastPage; page++) {
    const d = await _get<{ data: OlympusChapterRef[] }>(url(page));
    all.push(...(d.data || []));
  }
  return all;
}

export async function detail(slug: string): Promise<PrismDetail> {
  const d = await _get<{ data: Record<string, unknown> }>(
    `${BASE}/api/series/${encodeURIComponent(slug)}?type=comic`,
  );
  const s = d.data;

  const title = (s['name'] as string) || slug;
  const cover = (s['cover'] as string) || '';
  const description = (s['summary'] as string) || '';
  const genres = ((s['genres'] as { name: string }[]) || []).map(g => g.name.trim());

  const statusName = ((s['status'] as { name: string } | null)?.name || '').toLowerCase();
  const status = statusName.includes('activo')
    ? 'ongoing'
    : statusName.includes('final')
    ? 'completed'
    : statusName.includes('pausa') || statusName.includes('hiatus')
    ? 'hiatus'
    : undefined;

  const chapters = await _allChapters(slug);
  const episodes = chapters.map(c => ({
    // El endpoint de lectura necesita slug + id del capítulo — viajan juntos
    // en la url ya que watch() solo recibe este string.
    title: `Capítulo ${c.name}`,
    url: `${slug}::${c.id}`,
    number: Number(c.name) || undefined,
  }));

  return { title, cover, description, episodes, genres, status };
}

export async function watch(chapterId: string): Promise<PrismMangaWatch> {
  const sep = chapterId.indexOf('::');
  const slug = sep === -1 ? '' : chapterId.slice(0, sep);
  const id = sep === -1 ? chapterId : chapterId.slice(sep + 2);
  const d = await _get<{ chapter?: { pages?: string[] } }>(
    `${BASE}/api/capitulo/${encodeURIComponent(slug)}/${encodeURIComponent(id)}?type=comic`,
  );
  return { urls: d.chapter?.pages || [] };
}

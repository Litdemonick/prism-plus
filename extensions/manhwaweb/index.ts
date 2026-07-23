import type { PrismItem, PrismDetail, PrismMangaWatch } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const API = 'https://manhwawebbackend-production.up.railway.app';
const HEADERS = { 'Referer': 'https://manhwaweb.com' };

async function _get<T = unknown>(path: string): Promise<T> {
  const raw = await sendMessage('request', JSON.stringify([`${API}${path}`, { method: 'get', headers: {} }]));
  try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
}

function _item(m: Record<string, unknown>): PrismItem {
  const id = (m['real_id'] || m['id_rel'] || m['id_manhwa'] || m['_id']) as string;
  const cover = (m['_imagen'] || m['img']) as string || '';
  const title = (m['the_real_name'] || m['name_esp'] || m['name_manhwa']) as string || id;
  const caps = m['_numero_cap'] || m['chapter'];
  const update = caps != null ? `Cap. ${caps}` : undefined;
  return { title, url: id, cover, update, headers: HEADERS };
}

export async function latest(page: number): Promise<PrismItem[]> {
  if (page === 1) {
    const d = await _get<Record<string, unknown>>('/manhwa/nuevos');
    const manhwas = d['manhwas'] as Record<string, unknown>;
    const esp = (manhwas['manhwas_esp'] as Record<string, unknown>[]) || [];
    const all = (manhwas['_manhwas'] as Record<string, unknown>[]) || [];
    // Merge recent: esp first (Spanish translations), then raw
    const seen = new Set<string>();
    const items: PrismItem[] = [];
    for (const m of [...esp, ...all]) {
      const id = (m['id_rel'] || m['id_manhwa']) as string;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      items.push(_item(m));
    }
    return items;
  }
  // Page 2+ → library paginated (0-indexed)
  const d = await _get<Record<string, unknown>>(`/manhwa/library?buscar=&estado=&page=${page - 2}`);
  return ((d['data'] as Record<string, unknown>[]) || []).map(_item);
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const estado = filter?.['estado']?.[0] ?? '';
  const tipo = filter?.['tipo']?.[0] ?? '';
  const q = encodeURIComponent(keyword);
  const params = `buscar=${q}&estado=${estado}&tipo=${tipo}&page=${page - 1}`;
  const d = await _get<Record<string, unknown>>(`/manhwa/library?${params}`);
  return ((d['data'] as Record<string, unknown>[]) || []).map(_item);
}

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    estado: {
      title: 'Estado',
      options: {
        '': 'Todos',
        publicandose: 'En curso',
        finalizado: 'Finalizado',
        pausado: 'Pausado',
      },
      defaultOption: '',
      min: 1,
      max: 1,
    },
    tipo: {
      title: 'Tipo',
      options: {
        '': 'Todos',
        manhwa: 'Manhwa',
        manga: 'Manga',
        manhua: 'Manhua',
        novela: 'Novela',
      },
      defaultOption: '',
      min: 1,
      max: 1,
    },
  };
}

// "Lo más leído" — confirmado en vivo: /manhwa/nuevos (el mismo endpoint de
// latest()) ya trae un campo `top` con el ranking real (top.manhwas_esp),
// coincide exacto con lo que el sitio muestra en el widget. No se confirmó
// un parámetro real de "Semanal"/"Total" separado en este endpoint — no se
// inventa ese filtro, se deja el ranking tal cual viene.
export async function createTopFilter(): Promise<Record<string, unknown>> {
  return {};
}

export async function top(
  _filter?: Record<string, string[]>,
  _page?: number,
): Promise<PrismItem[]> {
  const d = await _get<Record<string, unknown>>('/manhwa/nuevos');
  const topData = d['top'] as Record<string, unknown> | undefined;
  const list = (topData?.['manhwas_esp'] as Record<string, unknown>[]) || [];
  return list.map(_topItem);
}

// Los ítems de top() tienen forma distinta a los de latest()/search() (traen
// `link`, no id_rel/id_manhwa) — confirmado en vivo contra /manhwa/see/{id}:
// el último segmento del link es el mismo id que espera detail().
function _topItem(m: Record<string, unknown>): PrismItem {
  const link = (m['link'] as string) || '';
  const id = link.split('/').filter(Boolean).pop() || link;
  return {
    title: (m['name'] as string) || id,
    url: id,
    cover: (m['imagen'] as string) || '',
    update: m['caps'] != null ? `Cap. ${m['caps']}` : undefined,
    headers: HEADERS,
  };
}

export async function detail(id: string): Promise<PrismDetail> {
  const d = await _get<Record<string, unknown>>(`/manhwa/see/${encodeURIComponent(id)}`);

  const title = (d['the_real_name'] || d['name_esp'] || d['_name'] || id) as string;
  const cover = (d['_imagen']) as string || '';
  const description = (d['_sinopsis']) as string || '';

  const rawCats = (d['_categoris'] as (Record<string, string> | number | string)[]) || [];
  const genres: string[] = rawCats
    .map((c) => {
      if (typeof c === 'object' && c !== null) return Object.values(c)[0] as string;
      return null;
    })
    .filter((g): g is string => typeof g === 'string');

  const rawChapters = (d['chapters'] as Record<string, unknown>[]) || [];
  const episodes = rawChapters
    .filter(c => c['link'])
    .map((c) => {
      const link = c['link'] as string;
      // Extract chapter ID: last non-empty path segment of the link
      const chapterId = link.replace(/\/$/, '').split('/').pop() ?? link;
      const num = c['chapter'] as number;
      return {
        title: `Capítulo ${num}`,
        url: chapterId,
        number: typeof num === 'number' ? num : undefined,
      };
    });

  return { title, cover, description, episodes, genres, headers: HEADERS };
}

export async function watch(chapterId: string): Promise<PrismMangaWatch> {
  const d = await _get<Record<string, unknown>>(`/chapters/see/${encodeURIComponent(chapterId)}`);
  const chapter = d['chapter'] as Record<string, unknown>;
  const imgs = (chapter?.['img'] as string[]) || [];
  return { urls: imgs, headers: HEADERS };
}

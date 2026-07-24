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

// Géneros reales del sitio (id -> nombre) — confirmado desde el bundle JS
// (no hay endpoint que los liste, están hardcodeados ahí). El backend los
// recibe bajo el nombre "generes" (typo propio del sitio, no nuestro),
// unidos con la letra "a" como separador literal — confirmado en vivo
// contra la API real (generes=3a29 filtra por Acción+Aventura).
const GENRES: Record<string, string> = {
  '3': 'Acción', '29': 'Aventura', '18': 'Comedia', '1': 'Drama',
  '42': 'Recuentos de la vida', '2': 'Romance', '5': 'Venganza', '6': 'Harem',
  '23': 'Fantasía', '31': 'Sobrenatural', '25': 'Tragedia', '43': 'Psicológico',
  '32': 'Horror', '44': 'Thriller', '28': 'Historias cortas', '30': 'Ecchi',
  '34': 'Gore', '27': 'Girls love', '45': 'Boys love', '41': 'Reencarnación',
  '37': 'Sistema de niveles', '33': 'Ciencia ficción', '38': 'Apocalíptico',
  '39': 'Artes marciales', '40': 'Superpoderes', '35': 'Cultivación (cultivo)',
  '8': 'Milf',
};

// Arma el query de /manhwa/library con todos los filtros reales del sitio
// (confirmados en vivo contra el backend, uno por uno) — no solo
// estado/tipo como antes.
function _libraryQuery(page: number, buscar: string, filter?: Record<string, string[]>): string {
  const f = filter ?? {};
  const estado = f['estado']?.[0] ?? '';
  const tipo = f['tipo']?.[0] ?? '';
  const erotico = f['erotico']?.[0] ?? '';
  const demografia = f['demografia']?.[0] ?? '';
  const orderItem = f['order_item']?.[0] ?? 'alfabetico';
  const orderDir = f['order_dir']?.[0] ?? 'desc';
  // Filtra cualquier entrada vacía antes de unir — el mecanismo genérico de
  // filtros de la app arranca cada filtro con [defaultOption] (acá ''),
  // que para un multi-selección como este no es un género real; sin
  // filtrarlo se colaría como generes=a3 en vez de generes=3.
  const generes = (f['generos'] ?? []).filter((id) => id !== '').join('a');
  return `buscar=${encodeURIComponent(buscar)}&estado=${estado}&tipo=${tipo}` +
    `&erotico=${erotico}&demografia=${demografia}&order_item=${orderItem}` +
    `&order_dir=${orderDir}&page=${page}&generes=${generes}`;
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
  const d = await _get<Record<string, unknown>>(`/manhwa/library?${_libraryQuery(page - 2, '')}`);
  return ((d['data'] as Record<string, unknown>[]) || []).map(_item);
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const d = await _get<Record<string, unknown>>(`/manhwa/library?${_libraryQuery(page - 1, keyword, filter)}`);
  return ((d['data'] as Record<string, unknown>[]) || []).map(_item);
}

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    tipo: {
      title: 'Tipo',
      options: {
        '': 'Todos',
        manhwa: 'Manhwa',
        manga: 'Manga',
        manhua: 'Manhua',
        doujinshi: 'Doujinshi',
        novela: 'Novela',
        one_shot: 'One shot',
      },
      default: '',
      min: 1,
      max: 1,
    },
    demografia: {
      title: 'Demografía',
      options: {
        '': 'Todas',
        seinen: 'Seinen',
        shonen: 'Shonen',
        josei: 'Josei',
        shojo: 'Shojo',
      },
      default: '',
      min: 1,
      max: 1,
    },
    estado: {
      title: 'Estado',
      options: {
        '': 'Todos',
        publicandose: 'En curso',
        finalizado: 'Finalizado',
        pausado: 'Pausado',
      },
      default: '',
      min: 1,
      max: 1,
    },
    erotico: {
      title: 'Erótico',
      options: {
        '': 'Todos',
        si: 'Sí',
        no: 'No',
      },
      default: '',
      min: 1,
      max: 1,
    },
    order_item: {
      title: 'Ordenar por',
      options: {
        alfabetico: 'Alfabético',
        creacion: 'Creación',
        popularidad: 'Popularidad',
        num_chapter: 'Núm. capítulos',
      },
      default: 'alfabetico',
      min: 1,
      max: 1,
    },
    order_dir: {
      title: 'Dirección',
      options: {
        desc: 'Descendente',
        asc: 'Ascendente',
      },
      default: 'desc',
      min: 1,
      max: 1,
    },
    generos: {
      title: 'Géneros',
      options: GENRES,
      default: '',
      min: 0,
      max: Object.keys(GENRES).length,
    },
  };
}

// "Lo más leído" — confirmado en vivo: /manhwa/nuevos (el mismo endpoint de
// latest()) ya trae un campo `top` con DOS rankings reales y distintos:
// manhwas_esp (traducido al español) y manhwas_raw (sin traducir). No es lo
// mismo que el toggle "Semanal"/"Total" del sitio (ese parámetro no se pudo
// confirmar), así que se expone la distinción real que sí existe —
// traducido vs raw — en vez de fabricar semanal/total.
export async function createTopFilter(): Promise<Record<string, unknown>> {
  return {
    idioma: {
      title: 'Idioma',
      options: { esp: 'Traducido', raw: 'Raw' },
      default: 'esp',
      min: 1,
      max: 1,
    },
  };
}

export async function top(
  filter?: Record<string, string[]>,
  _page?: number,
): Promise<PrismItem[]> {
  const idioma = filter?.['idioma']?.[0] ?? 'esp';
  const d = await _get<Record<string, unknown>>('/manhwa/nuevos');
  const topData = d['top'] as Record<string, unknown> | undefined;
  const key = idioma === 'raw' ? 'manhwas_raw' : 'manhwas_esp';
  const list = (topData?.[key] as Record<string, unknown>[]) || [];
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

  // Contenido agregado de otros sitios (ej. mangas.in, _plataforma !=
  // "manual") trae capítulos "fantasma": el link existe pero `img` viene
  // vacío — confirmado en vivo (Vinland Saga, 224 capítulos, todos con
  // img:[]) — y /chapters/see/{id} tira 404 para esos, porque ManhwaWeb
  // nunca tiene el contenido real, solo la referencia. Los títulos
  // "manual" sí traen img poblado desde acá. Filtrar por img no vacío
  // evita ofrecer capítulos que van a fallar al tocarlos.
  const rawChapters = (d['chapters'] as Record<string, unknown>[]) || [];
  const episodes = rawChapters
    .filter(c => c['link'] && Array.isArray(c['img']) && (c['img'] as unknown[]).length > 0)
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

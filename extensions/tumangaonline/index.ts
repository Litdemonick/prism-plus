import { DESKTOP_UA } from '../../sdk/http';
import { stripTags, decodeEntities } from '../../sdk/html';
import type { PrismDetail, PrismItem, PrismMangaWatch, PrismEpisode } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://zonatmo.org';

async function _get(url: string): Promise<string> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([
      url,
      {
        method: 'get',
        headers: { Referer: `${BASE}/`, 'User-Agent': DESKTOP_UA },
      },
    ]),
  );
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function _buildQuery(params: Record<string, string | string[] | undefined>): string {
  const parts: string[] = [];
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const v of value) if (v) parts.push(`${key}=${encodeURIComponent(v)}`);
    } else {
      parts.push(`${key}=${encodeURIComponent(value)}`);
    }
  }
  return parts.join('&');
}

function _fullUrl(url: string): string {
  if (url.indexOf('http') === 0) return url;
  return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ─── Catálogo ───────────────────────────────────────────────────────────────

function _parseCatalog(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  const re =
    /<a href="(https:\/\/zonatmo\.org\/library\/[a-z_]+\/\d+\/[a-z0-9-]+)">\s*<div class="thumbnail book lazy-cover" data-bg="([^"]+)">[\s\S]*?<h4 class="text-truncate" title="([^"]+)">/g;
  for (const m of html.matchAll(re)) {
    items.push({
      title: decodeEntities(m[3].trim()),
      url: m[1],
      cover: m[2],
    });
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  const query = _buildQuery({ page: page > 1 ? String(page) : undefined });
  const html = await _get(`${BASE}/biblioteca${query ? `?${query}` : ''}`);
  return _parseCatalog(html);
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const query = _buildQuery({
    title: keyword.trim() || undefined,
    type: filter?.['tipo']?.[0],
    demography: filter?.['demografia']?.[0],
    status: filter?.['estado']?.[0],
    'genders[]': filter?.['genero']?.[0],
    page: page > 1 ? String(page) : undefined,
  });
  const html = await _get(`${BASE}/biblioteca${query ? `?${query}` : ''}`);
  return _parseCatalog(html);
}

const _TYPE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  manga: 'Manga',
  manhua: 'Manhua',
  manhwa: 'Manhwa',
  webtoon: 'Webtoon',
  novel: 'Novela',
  comic: 'Comic',
  one_shot: 'One shot',
  doujinshi: 'Doujinshi',
  oel: 'OEL',
};

const _DEMOGRAPHY_OPTIONS: Record<string, string> = {
  '': 'Todas',
  seinen: 'Seinen',
  shoujo: 'Shoujo',
  shounen: 'Shounen',
  josei: 'Josei',
  kodomo: 'Kodomo',
};

const _STATUS_OPTIONS: Record<string, string> = {
  '': 'Todos',
  ongoing: 'En emisión',
  completed: 'Completado',
  ended: 'Finalizado',
  hiatus: 'En pausa',
  cancelled: 'Cancelado',
};

// Lista agregada en vivo desde los checkboxes reales del formulario de
// filtros del catálogo (confirmado en vivo, ?genders[]=N funciona). El
// sitio acumuló etiquetas de años sin depurar — hay bastante duplicado
// en español/inglés ("Shonen"/"Shounen", "Acción"/"Action", etc.), pero es
// lo que el catálogo real ofrece.
const _GENRE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  '1': 'Acción', '2': 'Aventura', '3': 'Comedia', '4': 'Drama', '5': 'Fantasía',
  '6': 'Horror', '7': 'Misterio', '8': 'Romance', '9': 'Ciencia Ficción',
  '10': 'Slice of Life', '11': 'Deportes', '12': 'Sobrenatural', '13': 'Thriller',
  '14': 'Histórico', '15': 'Psicológico', '16': 'Isekai', '17': 'Mecha',
  '18': 'Escolar', '19': 'Ecchi', '20': 'Harem', '22': 'Recuentos de la vida',
  '23': 'Shoujo', '24': 'Regresión', '25': 'Familia', '26': 'Magia', '27': '+18',
  '28': 'Vida Escolar', '29': 'Smut', '30': 'Boys Love', '31': 'Yaoi',
  '32': 'Adulto', '33': 'Maduro', '34': 'Supernatural', '35': 'Girls Love',
  '36': 'Reencarnación', '37': 'Tragedia', '38': 'Transmigración', '39': 'Sistema',
  '40': 'Harem Inverso', '41': 'Artes Marciales', '42': 'Shonen', '43': 'Militar',
  '44': 'Gore', '46': 'Deporte', '47': 'Apocalíptico', '48': 'Supervivencia',
  '49': 'Realidad Virtual', '50': 'Demonios', '51': 'Josei', '52': 'Yuri',
  '53': 'Seinen', '54': 'Género Bender', '56': 'Parodia', '57': 'Vampiros',
  '58': 'Superpoderes', '59': 'Samurái', '62': 'Ciberpunk', '64': 'Guerra',
  '65': 'Policiaco', '66': 'Crimen', '68': 'Traps', '73': 'Shounen',
  '76': 'Action', '77': 'Adventure', '78': 'Fantasy', '80': 'BL (Boys Love)',
  '83': 'Comedy', '84': 'School', '86': 'Novela', '87': 'Historical',
  '90': 'Military', '92': 'Doujinshi', '99': 'Sports', '101': 'Psychological',
  '102': 'Mystery', '104': 'Oneshot', '106': 'Manhwa', '107': 'Manga',
  '111': 'Academia', '114': 'Webtoon', '119': 'Reincarnation', '124': 'Viaje en el tiempo',
  '127': 'Time Travel',
};

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    tipo: { title: 'Tipo', options: _TYPE_OPTIONS, default: '', min: 1, max: 1 },
    demografia: { title: 'Demografía', options: _DEMOGRAPHY_OPTIONS, default: '', min: 1, max: 1 },
    estado: { title: 'Estado', options: _STATUS_OPTIONS, default: '', min: 1, max: 1 },
    genero: { title: 'Género', options: _GENRE_OPTIONS, default: '', min: 1, max: 1 },
  };
}

// ─── Detalle ────────────────────────────────────────────────────────────────

export async function detail(url: string): Promise<PrismDetail> {
  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);

  // El <h1> del título NO contiene solo texto: trae un <small>(2022)</small>
  // con el año adentro. El patrón anterior exigía </h1> justo después del
  // texto ([^<]+? no puede cruzar una etiqueta), así que no matcheaba nunca y
  // el detalle quedaba sin título — y como el Historial/Favoritos guardan el
  // título que viene del detalle, la card del Home también salía en blanco.
  // Se toma todo el interior del h1, se descarta el <small> del año y se
  // limpian etiquetas por si el sitio agrega alguna más.
  const titleHtml = /<h1 class="element-title[^"]*">([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? '';
  const title = decodeEntities(
    stripTags(titleHtml.replace(/<small[\s\S]*?<\/small>/gi, '')),
  ).trim();
  const cover = /<img class="book-thumbnail" src="([^"]+)"/i.exec(html)?.[1];
  const description = stripTags(
    /<p class="element-description[^"]*" id="manga-synopsis">([\s\S]*?)<\/p>/i.exec(html)?.[1] ?? '',
  ).trim();

  const genres: string[] = [];
  for (const m of html.matchAll(
    /class="badge badge-primary py-2 px-4 mx-1 my-2"\s*href="https:\/\/zonatmo\.org\/biblioteca\?genders\[\]=\d+">\s*([^<]+?)\s*</g,
  )) {
    genres.push(decodeEntities(m[1].trim()));
  }

  const statusText = /class="book-status [a-z]+">(?:[\s\S]*?<\/span>)?\s*([^<]+)</i.exec(html)?.[1]?.trim();
  const status: PrismDetail['status'] =
    statusText === 'En curso'
      ? 'ongoing'
      : statusText === 'Completado'
        ? 'completed'
        : statusText === 'Finalizado'
          ? 'completed'
          : statusText === 'Hiatus'
            ? 'hiatus'
            : undefined;

  // Cada capítulo puede tener varios grupos de traducción subidos — se usa
  // el primer link "Leer online" listado (el que el sitio muestra primero
  // por defecto), igual que hace el propio botón principal del sitio.
  const episodes: PrismEpisode[] = [];
  const chapterRe =
    /data-number="([0-9.]+)">\s*Capítulo [0-9.]+\s*<\/span>[\s\S]*?<a href="(https:\/\/zonatmo\.org\/view_uploads\/\d+)" class="btn btn-sm btn-primary">/g;
  for (const m of html.matchAll(chapterRe)) {
    const num = parseFloat(m[1]);
    episodes.push({
      title: `Capítulo ${m[1]}`,
      url: m[2],
      number: Number.isFinite(num) ? num : undefined,
    });
  }
  episodes.reverse();

  return { title, cover, description, genres, episodes, status };
}

// ─── Lectura ────────────────────────────────────────────────────────────────

// El host de las imágenes varía por capítulo — confirmado en vivo con 3
// variantes distintas: "storage.zonatmo.org", "storage2.zonatmo.org" y
// "storage2.zonatmo.org:8091" (con puerto explícito). El regex viejo tenía
// el host fijo ("storage2" sin puerto) y por eso algunos capítulos
// devolvían 0 páginas — se generaliza a cualquier subdominio de
// zonatmo.org con puerto opcional, mientras el path tenga "/chapters/".
const _IMAGE_RE = /src="(https:\/\/[a-z0-9.-]+\.zonatmo\.org(?::\d+)?\/chapters\/[^"]+)"/g;

export async function watch(url: string): Promise<PrismMangaWatch> {
  const html = await _get(_fullUrl(url));
  const urls: string[] = [];
  for (const m of html.matchAll(_IMAGE_RE)) {
    urls.push(m[1]);
  }
  return { urls, headers: { Referer: `${BASE}/` } };
}

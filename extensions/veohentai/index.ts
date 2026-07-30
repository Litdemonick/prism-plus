import { decodeEntities, stripTags } from '../../sdk/html';
import type {
  PrismDetail,
  PrismItem,
  PrismWatch,
  PrismEpisode,
} from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://veohentai.com';
const API = `${BASE}/wp-json/wp/v2`;

// El sitio es WordPress con la API REST abierta (confirmado en vivo), así que
// todo el contenido sale de JSON en vez de scrapear HTML: nada de romperse
// porque cambien una clase de CSS, y se puede pedir solo los campos necesarios
// con `_fields`, que además hace las respuestas mucho más chicas.
async function _getJson(url: string): Promise<unknown> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([url, { method: 'get', headers: { Referer: `${BASE}/` } }]),
  );
  // El puente puede devolver el cuerpo tal cual o como string JSON-encodeado
  // (según plataforma), así que se desenvuelve hasta dos veces.
  let value: unknown = raw;
  for (let i = 0; i < 2; i++) {
    if (typeof value !== 'string') break;
    try {
      value = JSON.parse(value);
    } catch {
      break;
    }
  }
  return value;
}

async function _getText(url: string): Promise<string> {
  const value = await _getJson(url);
  return typeof value === 'string' ? value : '';
}

async function _getArray(url: string): Promise<Record<string, unknown>[]> {
  const value = await _getJson(url);
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function _rendered(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const r = (value as Record<string, unknown>)['rendered'];
    if (typeof r === 'string') return r;
  }
  return '';
}

function _title(post: Record<string, unknown>): string {
  return decodeEntities(stripTags(_rendered(post['title'])).trim());
}

function _cover(post: Record<string, unknown>): string | undefined {
  const c = post['fox_cover'];
  if (c && typeof c === 'object') {
    const url = (c as Record<string, unknown>)['url'];
    if (typeof url === 'string' && url) return url;
  }
  return undefined;
}

function _firstNumber(value: unknown): number | undefined {
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number') {
    return value[0] as number;
  }
  return undefined;
}

// Los posts son EPISODIOS ("X Episodio 3"), no series. El número se saca del
// slug —que es estable— y solo si ahí no está se recurre al título.
function _episodeNumber(post: Record<string, unknown>): number {
  const slug = typeof post['slug'] === 'string' ? post['slug'] : '';
  const fromSlug = /episodio-(\d+)/i.exec(slug)?.[1];
  if (fromSlug) return Number(fromSlug);
  const fromTitle = /episodio\s*(\d+)/i.exec(_title(post))?.[1];
  return fromTitle ? Number(fromTitle) : 0;
}

function _serieUrl(slug: string): string {
  return `${BASE}/serie/${slug}/`;
}

function _serieSlugFromUrl(url: string): string {
  return url
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/serie\//, '')
    .replace(/\/$/, '');
}

// ─── Listados ───────────────────────────────────────────────────────────────

// Un ítem = una SERIE, no un episodio: si se listaran los posts crudos el
// catálogo se llenaría de "X Episodio 1", "X Episodio 2"... del mismo título.
// La taxonomía fox_serie no se puede ordenar por fecha (WordPress solo permite
// name/count/slug/id en taxonomías), así que para "lo último" se parte de los
// posts recientes y se colapsan a su serie — eso sí refleja novedades reales.
async function _seriesFromRecentPosts(
  page: number,
  extra: Record<string, string | undefined>,
): Promise<PrismItem[]> {
  const params: string[] = [
    'per_page=40',
    `page=${page < 1 ? 1 : page}`,
    '_fields=id,slug,title,fox_serie,fox_cover',
  ];
  for (const key of Object.keys(extra)) {
    const v = extra[key];
    if (v) params.push(`${key}=${encodeURIComponent(v)}`);
  }
  const posts = await _getArray(`${API}/posts?${params.join('&')}`);
  if (posts.length === 0) return [];

  // Colapsar a serie conservando el orden de recencia y quedándose con la
  // portada del episodio más nuevo de cada una.
  const order: number[] = [];
  const coverById: Record<number, string | undefined> = {};
  for (const post of posts) {
    const serieId = _firstNumber(post['fox_serie']);
    if (serieId === undefined) continue;
    if (coverById[serieId] === undefined) {
      order.push(serieId);
      coverById[serieId] = _cover(post);
    }
  }
  if (order.length === 0) return [];
  return _resolveSeries(order, coverById);
}

// Los nombres y slugs de las series se piden en UN solo request con `include`,
// no uno por serie.
async function _resolveSeries(
  ids: number[],
  coverById: Record<number, string | undefined>,
): Promise<PrismItem[]> {
  const series = await _getArray(
    `${API}/fox_serie?include=${ids.join(',')}&per_page=100&_fields=id,name,slug,count`,
  );
  const byId: Record<number, Record<string, unknown>> = {};
  for (const s of series) {
    const id = typeof s['id'] === 'number' ? s['id'] : undefined;
    if (id !== undefined) byId[id] = s;
  }
  const items: PrismItem[] = [];
  // Se recorre `ids` (no `series`) para respetar el orden de recencia: el
  // parámetro `include` de WordPress devuelve por id, no en el orden pedido.
  for (const id of ids) {
    const s = byId[id];
    if (!s) continue;
    const slug = typeof s['slug'] === 'string' ? s['slug'] : '';
    if (!slug) continue;
    const count = typeof s['count'] === 'number' ? s['count'] : undefined;
    items.push({
      title: decodeEntities(String(s['name'] ?? '').trim()),
      url: _serieUrl(slug),
      cover: coverById[id],
      update: count ? `${count} ep.` : undefined,
    });
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  return _seriesFromRecentPosts(page, {});
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const kw = keyword.trim();
  // `tags` acepta varios IDs separados por coma y los combina como "cualquiera
  // de estos" (comprobado en vivo), así que la selección múltiple se manda tal
  // cual. Se descartan los vacíos para que elegir "Todos" no rompa la consulta.
  const genre = (filter?.['genero'] ?? []).filter((g) => !!g).join(',');
  const brand = filter?.['estudio']?.[0] || '';

  // Con filtro activo hay que ir por los posts: género y estudio son taxonomías
  // de POST (tags / fox_brand), no de serie, así que no se pueden consultar
  // directamente sobre fox_serie.
  if (genre || brand) {
    return _seriesFromRecentPosts(page, {
      search: kw || undefined,
      tags: genre || undefined,
      fox_brand: brand || undefined,
    });
  }

  // Sin filtro y con texto: buscar sobre los NOMBRES de serie da mucho mejor
  // resultado que sobre títulos de episodio (que repiten "Episodio N").
  if (kw) {
    const series = await _getArray(
      `${API}/fox_serie?search=${encodeURIComponent(kw)}&per_page=20&page=${
        page < 1 ? 1 : page
      }&_fields=id,name,slug,count`,
    );
    if (series.length === 0) return [];

    const ids: number[] = [];
    for (const s of series) {
      const id = typeof s['id'] === 'number' ? s['id'] : undefined;
      if (id !== undefined) ids.push(id);
    }
    if (ids.length === 0) return [];

    // Las portadas viven en los posts, así que se traen todas de una sola vez
    // filtrando por las series encontradas.
    const posts = await _getArray(
      `${API}/posts?fox_serie=${ids.join(',')}&per_page=100&_fields=fox_serie,fox_cover`,
    );
    const coverById: Record<number, string | undefined> = {};
    for (const post of posts) {
      const serieId = _firstNumber(post['fox_serie']);
      if (serieId === undefined || coverById[serieId] !== undefined) continue;
      coverById[serieId] = _cover(post);
    }

    const items: PrismItem[] = [];
    for (const s of series) {
      const slug = typeof s['slug'] === 'string' ? s['slug'] : '';
      const id = typeof s['id'] === 'number' ? s['id'] : undefined;
      if (!slug || id === undefined) continue;
      const count = typeof s['count'] === 'number' ? s['count'] : undefined;
      items.push({
        title: decodeEntities(String(s['name'] ?? '').trim()),
        url: _serieUrl(slug),
        cover: coverById[id],
        update: count ? `${count} ep.` : undefined,
      });
    }
    return items;
  }

  return latest(page);
}

// ─── Filtros ────────────────────────────────────────────────────────────────

// Ambas listas se leyeron de las taxonomías reales del sitio (/tags y
// /fox_brand, pedidas ordenadas por cantidad de contenido), con el ID que
// devuelve la API junto a su nombre — que es como filtra WordPress. El número
// del comentario es cuántos episodios tiene cada una, así que la lista está
// ordenada por lo que más contenido tiene.
const _GENRE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  '3': 'Tetonas', // 2065
  '26': 'Escolares', // 877
  '48': 'Vírgenes', // 715
  '22': 'Violación', // 680
  '2': 'Romance', // 602
  '7': 'Anal', // 529
  '8': 'Harem', // 526
  '831': 'Corridas', // 489
  '835': 'Oral', // 460
  '11': 'Sin Censura', // 432
  '912': 'Censurado', // 376
  '13': 'Orgías', // 375
  '32': 'Milfs', // 353
  '31': 'Ahegao', // 329
  '65': 'Ninfomanía', // 304
  '41': 'Incesto', // 241
  '18': 'Lolicon', // 235
  '51': 'Yuri', // 198
  '42': 'Juegos Sexuales', // 194
  '21': 'Hardcore', // 189
  '36': 'Bondage', // 188
  '46': 'Netorare', // 175
  '5': 'Vanilla', // 144
  '9': 'Tentáculos', // 139
  '858': 'Fantasía', // 135
  '50': 'Maids', // 132
  '88': 'Teacher', // 126
  '113': 'Casadas', // 100
  '53': 'Enfermeras', // 97
  '228': 'Ecchi', // 96
};

const _BRAND_OPTIONS: Record<string, string> = {
  '': 'Todos',
  '911': 'Pink Pineapple', // 359
  '932': 'MS Pictures', // 229
  '916': 'PoRO', // 172
  '947': 'Mary Jane', // 146
  '952': 'Queen Bee', // 143
  '944': 'Suzuki Mirano', // 99
  '964': 'T-Rex', // 97
  '920': 'Bunnywalker', // 83
  '1007': 'nur', // 71
  '980': 'Majin Petit', // 62
  '931': 'Pixy Soft', // 61
  '950': 'MediaBank', // 61
  '971': 'Suiseisha', // 59
  '942': 'Vanilla', // 54
  '914': 'Collaboration Works', // 46
  '1008': 'Magin Label', // 45
  '943': 'Magic Bus', // 44
  '963': 'Showten', // 43
  '941': 'Lune Pictures', // 33
  '928': 'Discovery', // 30
};

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    // Varios géneros a la vez: la API acepta `tags` con IDs separados por coma
    // (comprobado en vivo) y los combina como "cualquiera de estos".
    genero: { title: 'Género', options: _GENRE_OPTIONS, default: '', min: 1, max: 6 },
    estudio: { title: 'Estudio', options: _BRAND_OPTIONS, default: '', min: 1, max: 1 },
  };
}

// ─── Detalle ────────────────────────────────────────────────────────────────

export async function detail(url: string): Promise<PrismDetail> {
  const slug = _serieSlugFromUrl(url);
  const series = await _getArray(
    `${API}/fox_serie?slug=${encodeURIComponent(slug)}&_fields=id,name,slug,description`,
  );
  const serie = series[0];
  if (!serie) return { title: '', episodes: [] };

  const serieId = typeof serie['id'] === 'number' ? serie['id'] : undefined;
  const title = decodeEntities(String(serie['name'] ?? '').trim());
  if (serieId === undefined) return { title, episodes: [] };

  const posts = await _getArray(
    `${API}/posts?fox_serie=${serieId}&per_page=100&_fields=id,slug,title,link,excerpt,date,fox_cover,tags`,
  );

  // Confirmado en vivo: orderby=date NO refleja el orden de episodios (para
  // "15 Bishoujo Hyouryuuki" devolvía el 3 antes del 1, porque los posts se
  // cargaron desordenados). Se ordena por el número real del episodio.
  const withNumber = posts.map((post) => ({ post, number: _episodeNumber(post) }));
  withNumber.sort((a, b) => a.number - b.number);

  const episodes: PrismEpisode[] = withNumber.map(({ post, number }) => ({
    title: number > 0 ? `Episodio ${number}` : _title(post),
    url: typeof post['link'] === 'string' ? post['link'] : `${BASE}/ver/${post['slug']}/`,
    thumbnail: _cover(post),
    number: number > 0 ? number : undefined,
  }));

  // La descripción de la serie casi siempre viene vacía en esta instalación, así
  // que se usa el extracto del primer episodio como respaldo.
  let description = decodeEntities(stripTags(String(serie['description'] ?? '')).trim());
  if (!description && withNumber.length > 0) {
    description = decodeEntities(stripTags(_rendered(withNumber[0].post['excerpt'])).trim());
  }

  // Los géneros son tags de los posts; se traducen los IDs a nombres en un solo
  // request en vez de uno por tag.
  const tagIds: number[] = [];
  for (const { post } of withNumber) {
    const tags = post['tags'];
    if (!Array.isArray(tags)) continue;
    for (const t of tags) {
      if (typeof t === 'number' && tagIds.indexOf(t) === -1) tagIds.push(t);
    }
  }
  const genres: string[] = [];
  if (tagIds.length > 0) {
    const tags = await _getArray(
      `${API}/tags?include=${tagIds.join(',')}&per_page=100&_fields=id,name`,
    );
    for (const t of tags) {
      const name = decodeEntities(String(t['name'] ?? '').trim());
      if (name && genres.indexOf(name) === -1) genres.push(name);
    }
  }

  const cover = withNumber.length > 0 ? _cover(withNumber[0].post) : undefined;

  return { title, cover, description, genres, episodes };
}

// ─── Reproducción ───────────────────────────────────────────────────────────

// El reproductor propio del sitio (hentaiplayer.com) entrega la URL final del
// vídeo recién tras un "challenge" resuelto del lado del cliente, con las
// llamadas de red congeladas para impedir automatización. No se intenta
// replicar eso: se devuelve el embed y `pageUrl` para que el cliente use el
// WebView, que es el camino universal que ya existe para estos casos. Lo que SÍ
// se puede aportar nativamente son los subtítulos en español, que viajan en
// base64 plano dentro de la página del reproductor.
export async function watch(url: string): Promise<PrismWatch> {
  const fullUrl = url.indexOf('http') === 0 ? url : `${BASE}${url}`;

  // Fast-path: el cliente manda directamente la URL del reproductor
  // (switchServer) — no hay nada que buscar en la API.
  let playerUrl = '';
  if (fullUrl.indexOf('veohentai.com') === -1) {
    playerUrl = fullUrl;
  } else {
    const slug = fullUrl
      .replace(/^https?:\/\/[^/]+/, '')
      .replace(/^\/ver\//, '')
      .replace(/\/$/, '');
    const posts = await _getArray(
      `${API}/posts?slug=${encodeURIComponent(slug)}&_fields=id,title,fox_video_url`,
    );
    const post = posts[0];
    if (!post) return { streams: [], pageUrl: fullUrl, reason: 'not_found' };
    const embedHtml = typeof post['fox_video_url'] === 'string' ? post['fox_video_url'] : '';
    playerUrl = /<iframe[^>]+src="([^"]+)"/i.exec(embedHtml)?.[1] ?? '';
  }

  if (!playerUrl) return { streams: [], pageUrl: fullUrl, reason: 'no_player' };

  // streams VACÍO a propósito, con pageUrl puesto: así es como se le pide al
  // cliente que use el WebView. El wrapper del build solo emite la url
  // `page://…` —la señal de "esto no es un stream directo"— cuando streams
  // llega vacío; si se devuelve el embed DENTRO de streams, lo toma por un
  // servidor reproducible, le pasa al reproductor nativo la URL de una página
  // HTML y falla con "servidor no accesible" (reportado en vivo).
  //
  // Tampoco se extraen los subtítulos: ese mismo camino `page://` los descarta,
  // así que pedirlos era un request de más para nada. No se pierde nada — el
  // reproductor propio del sitio, que es el que se carga en el WebView, ya trae
  // la pista en español cargada.
  return { streams: [], pageUrl: playerUrl };
}

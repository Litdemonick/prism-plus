import { DESKTOP_UA } from '../../sdk/http';
import { decodeEntities } from '../../sdk/html';
import { fichaDe, resolverServidor, type ServidorResuelto } from './servidores';
import { b64aTexto } from './servidores/comun';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream, PrismEpisode, PrismSeason } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://www.fuegocine.com';

const HOST = 'fuegocine.com';

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

function _fullUrl(url: string): string {
  if (url.indexOf('http') === 0) return url;
  return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ─── Catálogo ───────────────────────────────────────────────────────────────
// Blogger (blogspot) puro — confirmado en vivo: la API JSON nativa del feed
// (/feeds/posts/default) funciona directo con curl, soporta paginación real
// con start-index/max-results, filtro por etiqueta (Movie/Serie) y búsqueda
// de texto (q=), todo combinable. Muchísimo más confiable que scrapear HTML.
// El campo "content" del feed ya trae el HTML completo del post — incluye la
// portada TMDB y los atributos data-imdb/data-year/data-genres del bloque
// <ul class="post-details">, así que un solo fetch al feed alcanza para
// armar el PrismItem completo, sin pedir cada página individualmente.

interface _FeedEntry {
  title: { $t: string };
  content?: { $t: string };
  category: { term: string }[];
  link: { rel: string; href: string }[];
}

function _entryUrl(e: _FeedEntry): string {
  return e.link.find((l) => l.rel === 'alternate')?.href ?? '';
}

function _entryToItem(e: _FeedEntry): PrismItem {
  const content = e.content?.$t ?? '';
  const isSeries = e.category.some((c) => c.term === 'Serie');

  const metaM = /<div data-post-type="[a-z]+" hidden>\s*<img src="([^"]+)"\s*\/>\s*<p id="tmdb-synopsis">([^<]*)<\/p>/.exec(
    content,
  );
  const cover = metaM?.[1];
  const description = metaM ? decodeEntities(metaM[2].trim()) : undefined;

  const ulM = /<ul class="post-details[^>]*>/.exec(content);
  const ulTag = ulM?.[0] ?? '';
  const ratingM = /data-imdb="([\d.]+)"/.exec(ulTag);
  const rating = ratingM ? parseFloat(ratingM[1]) : undefined;
  const yearM = /data-year="(\d+)"/.exec(content);
  const year = yearM ? parseInt(yearM[1], 10) : undefined;
  const genresM = /data-genres="([^"]*)"/.exec(content);
  const tags = genresM ? genresM[1].split(',').map((g) => g.trim()).filter(Boolean) : undefined;

  const titleM = /<li data="([^"]+)"><span>Título<\/span>/.exec(content);
  const title = titleM ? decodeEntities(titleM[1].trim()) : decodeEntities(e.title.$t.trim());

  return {
    title,
    url: _entryUrl(e),
    cover,
    description,
    tags,
    year,
    rating: rating !== undefined && Number.isFinite(rating) ? rating : undefined,
    type: isSeries ? 'series' : 'movie',
  };
}

async function _fetchLabel(label: 'Movie' | 'Serie', page: number): Promise<PrismItem[]> {
  return (await _fetchLabelConFecha(label, page)).map((x) => x.item);
}

/**
 * Lo mismo, pero conservando cuando se publico cada uno.
 *
 * La fecha no va en `PrismItem` —no la muestra nadie— pero hace falta para
 * poder mezclar dos etiquetas por fecha real. Ver `latest`.
 */
async function _fetchLabelConFecha(
  label: 'Movie' | 'Serie',
  page: number,
): Promise<{ item: PrismItem; fecha: string }[]> {
  const perPage = 20;
  const startIndex = (page - 1) * perPage + 1;
  const url = `${BASE}/feeds/posts/default/-/${label}?alt=json&max-results=${perPage}&start-index=${startIndex}`;
  const json = await _get(url);
  if (typeof json === 'string') return [];
  const entries: _FeedEntry[] = (json as any)?.feed?.entry ?? [];
  return entries.map((e) => ({
    item: _entryToItem(e),
    fecha: (e as any)?.published?.$t ?? '',
  }));
}

// Sin filtro de tipo, se intercala película/serie página a página — igual
// convención que las demás extensiones de este repo (no hay un feed único
// que combine ambas etiquetas con OR, Blogger solo permite AND entre labels).
/**
 * Lo ultimo que publico el sitio, peliculas y series juntas y POR FECHA.
 *
 * ── Por que no se alternan una y una ────────────────────────────────────────
 *
 * Blogger no deja pedir dos etiquetas con OR, asi que hay que traer las dos por
 * separado. Antes se intercalaban de a una —pelicula, serie, pelicula, serie— y
 * eso parece justo pero no lo es: el sitio publica muchas mas peliculas que
 * series, asi que las series se acaban enseguida y las viejas suben.
 *
 * Medido el 2026-08-08: las cinco peliculas mas nuevas eran todas del 6 de
 * agosto, y las series iban del 4 de agosto al 1 de JULIO. Intercalando, «X Men
 * '97» del 1 de julio salia decimo, por delante de peliculas de anteayer. La
 * fila decia «Lo mas reciente» y mostraba cosas de hace cinco semanas.
 *
 * Ordenando por la fecha de publicacion sale lo que de verdad acaba de salir, en
 * el orden en que salio, sin importar de que tipo sea. Si un dia publican tres
 * series seguidas, van las tres arriba, que es lo correcto.
 */
export async function latest(page: number): Promise<PrismItem[]> {
  const [movies, series] = await Promise.all([
    _fetchLabelConFecha('Movie', page),
    _fetchLabelConFecha('Serie', page),
  ]);
  const todo = [...movies, ...series];
  // Comparacion de texto y no de Date: el feed las da en ISO 8601, que ordenado
  // como texto ya queda cronologico, y evita depender de como parsea fechas el
  // motor de JavaScript de cada plataforma.
  todo.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return todo.map((x) => x.item);
}

// ─── Búsqueda ───────────────────────────────────────────────────────────────

const _TYPE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  Movie: 'Películas',
  Serie: 'Series',
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
  const tipo = filter?.['tipo']?.[0] as 'Movie' | 'Serie' | undefined;
  const kw = keyword.trim();

  if (!kw) {
    if (tipo === 'Movie') return _fetchLabel('Movie', page);
    if (tipo === 'Serie') return _fetchLabel('Serie', page);
    return latest(page);
  }

  // Blogger ignora el filtro de etiqueta (/-/Movie, /-/Serie) en cuanto se
  // combina con q= — confirmado en vivo, ambas rutas devuelven exactamente
  // los mismos resultados con una búsqueda de texto. Se pide sin filtro de
  // ruta y se clasifica/filtra acá, descartando además los posts de
  // episodios sueltos (sin etiqueta Movie ni Serie) — no son ítems de
  // catálogo, solo actualizaciones de una serie ya listada.
  //
  // ── TODO de una vez, en la página 1 (2026-10-03) ──────────────────────────
  //
  // Antes cada página de la app juntaba hasta 6 páginas de 20 del feed y
  // cortaba al llegar a 20 obras: la página 2 arrancaba más adelante y lo del
  // medio no se veía nunca, y a veces se repetía. Medido con «batman»: 128
  // entradas, las 100 primeras casi todas posts de episodio («Batman: El
  // Enmascarado 1x…»), y las películas (2005, 2008, 1989, 2022) recién del 101
  // en adelante — el buscador general, que solo pide la página 1, no las veía.
  //
  // El feed de búsqueda es corto (lo más visto: 128 entradas; el total que
  // informa no es confiable, dice 100), así que se trae ENTERO en bloques de
  // 150 —un pedido casi siempre, dos como mucho: el techo de 300 está por si
  // el sitio cambia— y la página 1 devuelve todas las obras. La página 2 en
  // adelante vuelve vacía: no queda nada que mostrar, sin saltos ni repetidos.
  if (page > 1) return [];
  const porPedido = 150;
  const techo = 300;
  const entradas: _FeedEntry[] = [];
  for (let desde = 1; desde <= techo; desde += porPedido) {
    const json = await _get(
      `${BASE}/feeds/posts/default?alt=json&max-results=${porPedido}&start-index=${desde}&q=${encodeURIComponent(kw)}`,
    );
    if (typeof json === 'string') break;
    const bloque: _FeedEntry[] = (json as any)?.feed?.entry ?? [];
    entradas.push(...bloque);
    if (bloque.length < porPedido) break; // se acabó el feed de verdad
  }
  const items: PrismItem[] = [];
  const vistas = new Set<string>();
  for (const e of entradas) {
    const isMovie = e.category.some((c) => c.term === 'Movie');
    const isSerie = e.category.some((c) => c.term === 'Serie');
    if (!isMovie && !isSerie) continue;
    if (tipo === 'Movie' && !isMovie) continue;
    if (tipo === 'Serie' && !isSerie) continue;
    const item = _entryToItem(e);
    if (vistas.has(item.url)) continue;
    vistas.add(item.url);
    items.push(item);
  }
  // El título exacto, primero: quien escribe «Batman» busca la película que se
  // llama así antes que las que lo nombran.
  const exacto = (t: string) => _normalizar(t) === _normalizar(kw);
  return [...items.filter((i) => exacto(i.title)), ...items.filter((i) => !exacto(i.title))];
}

/** Para comparar títulos sin tildes, mayúsculas ni signos. */
function _normalizar(t: string): string {
  let s = t.toLowerCase();
  // `normalize` separa la tilde de la letra; si el motor de JavaScript no lo
  // tuviera, se compara igual, solo que sin quitar tildes.
  try {
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    /* sin normalize: queda con tildes */
  }
  return s.replace(/[^a-z0-9]+/g, ' ').trim();
}

// ─── Detalle ────────────────────────────────────────────────────────────────

function _isSeriesHtml(html: string): boolean {
  return /<div data-post-type="serie" hidden>/.test(html);
}

export async function detail(url: string): Promise<PrismDetail> {
  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  // ── Una página que llegó mal no es una ficha vacía ─────────────────────────
  //
  // Medido el 2026-10-02: con el sitio cargado, 7 de 247 fichas llegaron sin el
  // bloque de datos y se devolvían sin título, año ni sinopsis — la app las
  // mostraba vacías como si eso fuera todo. Sin la marca del tipo de post no es
  // una página de obra: se avisa con un error y la app puede reintentar.
  if (typeof html !== 'string' || !/<div data-post-type="[a-z]+" hidden>/.test(html)) {
    throw new Error('FuegoCine no devolvió la ficha completa. Probá de nuevo en un momento.');
  }
  const isSeries = _isSeriesHtml(html);

  const metaM = /<div data-post-type="[a-z]+" hidden>\s*<img src="([^"]+)"\s*\/>\s*<p id="tmdb-synopsis">([^<]*)<\/p>/.exec(
    html,
  );
  const cover = metaM?.[1];
  const description = metaM ? decodeEntities(metaM[2].trim()) : undefined;

  const titleM = /<li data="([^"]+)"><span>Título<\/span>/.exec(html);
  const title = titleM ? decodeEntities(titleM[1].trim()) : '';

  const ulM = /<ul class="post-details[^>]*>/.exec(html);
  const ulTag = ulM?.[0] ?? '';
  const ratingM = /data-imdb="([\d.]+)"/.exec(ulTag);
  const rating = ratingM ? parseFloat(ratingM[1]) : undefined;
  const yearM = /data-year="(\d+)"/.exec(html);
  const year = yearM ? parseInt(yearM[1], 10) : undefined;
  const genresM = /data-genres="([^"]*)"/.exec(html);
  const genres = genresM ? genresM[1].split(',').map((g) => g.trim()).filter(Boolean) : undefined;

  const extra: Record<string, string> = {};
  const durM = /data-duartion="([^"]*)"/.exec(html);
  if (durM && durM[1]) extra['Duración'] = durM[1].trim();
  const origM = /data-original-title="([^"]*)"/.exec(html);
  if (origM && origM[1]) extra['Título original'] = decodeEntities(origM[1].trim());

  const episodes: PrismEpisode[] = [];
  let seasons: PrismSeason[] | undefined;

  if (isSeries) {
    // Cada episodio lleva una etiqueta única "id-{postId}" que apunta al ID
    // interno de Blogger de ESTA página de serie (confirmado en vivo:
    // entry.id de la serie termina en "post-6924316536891050342", idéntico
    // al "id-6924316536891050342" que traen todos sus episodios) — filtrar
    // el feed por esa etiqueta trae todos los episodios de todas las
    // temporadas en una sola llamada, sin necesidad de adivinar nombres.
    const postIdM = /\/feeds\/(\d+)\/comments\/default/.exec(html);
    if (postIdM) {
      const epJson = await _get(
        `${BASE}/feeds/posts/default/-/id-${postIdM[1]}?alt=json&max-results=150`,
      );
      if (typeof epJson !== 'string') {
        const entries: _FeedEntry[] = (epJson as any)?.feed?.entry ?? [];
        const parsed: { season: number; number: number; title: string; url: string }[] = [];
        for (const e of entries) {
          const t = e.title.$t.trim();
          const m = /^(.*?)\s+(\d+)x(\d+)\s*$/.exec(t);
          if (!m) continue;
          parsed.push({
            season: parseInt(m[2], 10),
            number: parseInt(m[3], 10),
            title: `${decodeEntities(m[1].trim())} ${m[2]}x${m[3]}`,
            url: _entryUrl(e),
          });
        }
        parsed.sort((a, b) => a.season - b.season || a.number - b.number);
        const bySeason = new Map<number, PrismEpisode[]>();
        for (const p of parsed) {
          const ep: PrismEpisode = { title: p.title, url: p.url, number: p.number };
          episodes.push(ep);
          if (!bySeason.has(p.season)) bySeason.set(p.season, []);
          bySeason.get(p.season)!.push(ep);
        }
        seasons = [...bySeason.keys()]
          .sort((a, b) => a - b)
          .map((s) => ({ title: `Temporada ${s}`, episodes: bySeason.get(s)! }));
      }
    }
  } else {
    episodes.push({ title: 'Película completa', url: fullUrl });
  }

  return {
    title,
    cover,
    description,
    genres,
    episodes,
    seasons: seasons && seasons.length > 0 ? seasons : undefined,
    year: Number.isFinite(year as number) ? year : undefined,
    rating: rating !== undefined && Number.isFinite(rating) ? rating : undefined,
    extra: Object.keys(extra).length > 0 ? extra : undefined,
  };
}

// ─── Reproducción ───────────────────────────────────────────────────────────

// Confirmado en vivo — servidores realmente nativos (sin SPA/JS a ejecutar):
//  - Wrappers en *.blogspot.com que solo redirigen: o bien ?link=<url> (query
//    normal) o bien ...r=<base64(url)> (visto en el mismo sitio con dos
//    plantillas de wrapper distintas). El destino puede ser un archivo
//    directo (mp4 en rumble.cloud, confirmado con Content-Type: video/mp4 y
//    Accept-Ranges) o un embed de terceros que sí necesita resolveEmbed
//    (ej. firestream.to, que desde ahora resuelve nativo — ver
//    resolveFirestream en el SDK).
// Qué servidores se ofrecen y cuáles no (UA, US, pixeldrain, FCTL…), con lo
// medido de cada uno: ver la nota en `servidores/index.ts`.

/**
 * Le pone `https:` a las direcciones que vienen sin protocolo.
 *
 * Varios wrappers guardan el destino como `//host/ruta` — valido dentro de una
 * pagina web, donde el navegador le pone el protocolo de la pagina, pero no
 * cuando se pide desde afuera. Medido en vivo con el servidor GS(ads):
 * "Unsupported scheme '' in URI //gscdn.cam/video/embed/..." — el pedido ni se
 * hacia y el resolver devolvia nulo, pudiendo reproducirse en la app.
 */
function _conEsquema(url: string): string {
  const u = url.trim();
  if (u.indexOf('//') === 0) return `https:${u}`;
  if (!/^https?:\/\//i.test(u)) return `https://${u.replace(/^\/+/, '')}`;
  return u;
}

async function _resolveFinal(url: string): Promise<PrismStream | null> {
  const res = await resolverServidor(url, `${BASE}/`);
  if (res?.url) return { url: res.url, quality: 'Servidor', headers: res.headers };
  return null;
}

/**
 * A donde apunta de verdad una direccion, o null si es un envoltorio vacio.
 *
 * El envoltorio de blogspot no reproduce nada: lleva la direccion real adentro,
 * en `?link=` o en `r=<base64>`. Lo que vale es a donde apunta — tanto para
 * resolverlo como para saber si lleva rayo o mundo, porque mirando el
 * envoltorio no se puede saber nada: todos son iguales.
 */
function _destinoDe(url: string): string | null {
  if (url.indexOf('blogspot.com') === -1) return url;
  try {
    const linkM = /[?&]link=([^&]+)/.exec(url);
    if (linkM) return _conEsquema(decodeURIComponent(linkM[1]));
    const rM = /[?&]r=([A-Za-z0-9+/=]+)$/.exec(url);
    if (rM) return _conEsquema(b64aTexto(rM[1]));
  } catch {
    return null;
  }
  return null;
}

async function _resolveServerUrl(url: string): Promise<PrismStream | null> {
  const destino = _destinoDe(url);
  if (!destino) return null;
  return _resolveFinal(destino);
}

// El sitio publica la calidad de cada servidor en el mismo bloque, y hasta
// ahora se estaba tirando: el patrón la capturaba y nadie la usaba. Es lo que
// se ve en la página como "#FHD (1080p)" o "#Multicalidad", así que sale
// gratis — no hay que resolver nada para saberla.
function _parseSvLinks(html: string): { name: string; url: string; calidad: string }[] {
  const start = html.indexOf('const _SV_LINKS');
  if (start === -1) return [];
  const end = html.indexOf('</script>', start);
  const block = html.slice(start, end === -1 ? undefined : end);
  const re = /lang:\s*"([^"]*)"\s*,\s*name:\s*"([^"]*)"\s*,\s*quality:\s*"([^"]*)"\s*,\s*url:\s*"([^"]*)"/g;
  const out: { name: string; url: string; calidad: string }[] = [];
  for (const m of block.matchAll(re)) {
    out.push({
      name: m[2].replace(/&#\d+;/g, '').trim(),
      calidad: m[3].replace(/&#\d+;/g, '').replace(/^#/, '').trim(),
      url: m[4],
    });
  }
  return out;
}

export async function watch(url: string): Promise<PrismWatch> {
  // Fast-path: switchServer pidiendo resolver UN servidor puntual (una de
  // las URLs crudas de _SV_LINKS) — mismo patrón que las demás extensiones.
  if (url.indexOf('http') === 0 && url.indexOf(HOST) === -1) {
    try {
      const resolved = await _resolveServerUrl(url);
      if (resolved) return { streams: [resolved] };
    } catch (e) {
      console.log(`[fc] no se pudo resolver ${url.slice(0, 50)}: ${e}`);
    }
    // Sin resolver no hay nada que reproducir. Devolver la dirección cruda
    // era darle una página a mpv como si fuera vídeo, y la app ya no tiene
    // navegador interno al que mandarla.
    return { streams: [], reason: 'resolve_failed' };
  }

  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  if (typeof html !== 'string') return { streams: [] };

  const links = _parseSvLinks(html);
  const streams: PrismStream[] = [];
  // El lugar de cada stream según lo medido (ver `orden` en `servidores/`).
  const ordenes: number[] = [];
  // Sin repetidos: el sitio a veces pone DOS botones con el mismo archivo
  // detrás (mismo destino, otro nombre). Dos botones iguales no son dos
  // oportunidades: si uno no anda, el otro tampoco.
  const destinos = new Set<string>();
  for (const link of links) {
    // La ficha sale de la tabla de `servidores/`, que es donde está lo que se
    // midió de cada uno. Se mira el destino y no el envoltorio: los botones de
    // este sitio son etiquetas de dos letras ("FC", "GS(ads)") y todos los
    // envoltorios de blogspot son iguales por fuera.
    const destino = _destinoDe(link.url);
    const ficha = destino ? fichaDe(destino) : null;
    // **Solo salen los servidores que reproducen en la app.** La app ya no abre
    // páginas en un navegador: uno sin ficha nativa (UA, US, pixeldrain, o uno nuevo
    // que el sitio sume) sería un botón que no reproduce nunca. Se deja anotado
    // en el registro para venir a agregarlo si aparece seguido.
    if (!ficha || !ficha.nativo) {
      console.log(`[fc] servidor sin reproducción en la app, no se ofrece: ${link.name} ${(destino || link.url).slice(0, 60)}`);
      continue;
    }
    if (destino && destinos.has(destino)) {
      console.log(`[fc] botón repetido, no se ofrece dos veces: ${link.name}`);
      continue;
    }
    if (destino) destinos.add(destino);
    ordenes.push(ficha.orden);
    streams.push({ url: link.url, quality: link.name || 'Servidor', nativo: true });
  }

  // Sin ninguno que la app pueda abrir: se dice por qué, para que la app avise
  // que es la FUENTE la que no tiene este contenido ahora (y no la app).
  if (streams.length === 0) {
    return { streams: [], reason: links.length > 0 ? 'servidores_no_disponibles' : 'sin_servidores' };
  }

  // En el orden medido: el primero es el que la app abre sola, así que va el
  // que arranca más rápido y mejor se ve (FC, Drive, FCTL, PM…; ver `orden` en
  // `servidores/index.ts`). El orden del sitio desempata.
  //
  // Ojo con FC igual: hay títulos suyos que se cortan, y no es el servidor sino
  // cómo quedó armado el archivo (el audio entero al final, lejos del vídeo —
  // ver la carpeta `directo/`). Cuando pasa, la app cae sola al siguiente.
  const orden = streams.map((s, i) => ({ s, peso: ordenes[i], i }));
  orden.sort((a, b) => a.peso - b.peso || a.i - b.i);

  return { streams: orden.map((x) => x.s) };
}

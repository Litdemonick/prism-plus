import { DESKTOP_UA } from '../../sdk/http';
import { decodeEntities } from '../../sdk/html';
import { createCache, TTL } from '../../sdk/cache';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://es.pornhub.com';

async function _get(url: string): Promise<string> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([
      url,
      {
        method: 'get',
        headers: {
          Referer: `${BASE}/`,
          'User-Agent': DESKTOP_UA,
          // Sin esto el sitio contesta en ingles aunque se pida el dominio
          // en español: los nombres de las categorias llegarian en otro idioma
          // que el que muestran los filtros.
          'Accept-Language': 'es-ES,es;q=0.9',
        },
      },
    ]),
  );
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function _urlDeVideo(viewkey: string): string {
  return `${BASE}/view_video.php?viewkey=${viewkey}`;
}

/**
 * La ficha de un video, guardada un rato.
 *
 * detail() y watch() necesitan LA MISMA pagina, y pesa 1,3 MB: medido, 571 ms
 * cada una, o sea que tocar "Reproducir" pagaba de nuevo la espera entera que
 * ya se habia pagado al abrir la ficha.
 *
 * Se guarda con el TTL de los detalles y no el de las fuentes: lo que se guarda
 * es la PAGINA. Para la ficha eso alcanza: el titulo y la portada no caducan.
 *
 * ── Pero para reproducir NO alcanza, y el numero lo dice ────────────────────
 *
 * Aca decia que media hora «esta muy por debajo» de lo que duran las firmas.
 * Medido el 2026-08-08 contra el sitio: el parametro `e` de las direcciones
 * vencia a los 52 MINUTOS de bajar la pagina. O sea que treinta no esta muy por
 * debajo de nada — esta a veintidos minutos del limite.
 *
 * La cuenta que sale mal: si la ficha se abrio hace 29 minutos y recien ahi se
 * toca Reproducir, la pagina guardada todavia se sirve, pero a sus direcciones
 * les quedan 23 minutos de vida. Un video mas largo que eso se queda cargando
 * para siempre en la mitad, sin ningun error visible: los segmentos empiezan a
 * contestar 412 y el reproductor sigue esperando. Lo mismo al cambiar de
 * calidad, que usa las direcciones de la misma tanda.
 *
 * Por eso hay dos usos distintos de la misma pagina. `detail()` la toma
 * guardada, sin problema. `watch()` exige que sea RECIENTE, y si no lo es la
 * baja de nuevo: se pagan 571 ms una vez, contra un video que no se puede
 * terminar de ver.
 */
const _cachePagina = createCache();

/** Cuando se bajo cada pagina, para saber si sus firmas siguen sirviendo. */
const _bajadaEl: Record<string, number> = {};

/**
 * Cuanta vida le tiene que quedar a las firmas para reproducir con ellas.
 *
 * Cinco minutos de antiguedad deja unos 47 de margen, que cubre de sobra
 * cualquier video del sitio. Mas corto seria bajar la pagina de 1,3 MB casi
 * siempre, y esa espera es justo la que este cache vino a evitar.
 */
const FRESCA_PARA_REPRODUCIR = 5 * 60_000;

async function _pagina(url: string, paraReproducir = false): Promise<string> {
  const guardada = _cachePagina.get<string>(url);
  if (guardada) {
    const edad = Date.now() - (_bajadaEl[url] ?? 0);
    if (!paraReproducir || edad < FRESCA_PARA_REPRODUCIR) return guardada;
  }
  const html = await _get(url);
  _cachePagina.set(url, html, TTL.DETAIL);
  _bajadaEl[url] = Date.now();
  return html;
}

// ─── Listados ───────────────────────────────────────────────────────────────

/**
 * Tarjetas de cualquier listado (portada, busqueda, categoria u orden).
 *
 * El titulo se toma del atributo `title` del enlace y no del texto visible: el
 * texto va recortado con puntos suspensivos cuando es largo, y el atributo trae
 * el titulo entero.
 */
function _parseListado(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  const vistos: Record<string, boolean> = {};
  // Se exige `linkVideoThumb` en la clase, que es el enlace de la MINIATURA.
  // Cada tarjeta trae DOS enlaces al mismo video —la miniatura y el titulo de
  // abajo— y sin esto enganchaba el del titulo, que no lleva imagen: el
  // listado salia vacio mientras que la busqueda (que arma la tarjeta de otra
  // forma) andaba bien.
  // OJO con los espacios: el listado escribe `<a   href=` con varios y la
  // busqueda con uno solo, asi que la separacion va como \s+ y no literal.
  // Con un espacio fijo el listado devolvia CERO y la busqueda funcionaba, que
  // es justo el sintoma que hace pensar que el sitio bloquea cuando en realidad
  // solo cambia el sangrado del HTML.
  const re =
    /<a\s+href="\/view_video\.php\?viewkey=([a-z0-9]+)"\s+title="([^"]+)"[^>]*linkVideoThumb[^>]*>[\s\S]{0,900}?<img[^>]+src="([^"]+)"/g;
  for (const m of html.matchAll(re)) {
    if (vistos[m[1]]) continue;
    vistos[m[1]] = true;
    items.push({
      title: decodeEntities(m[2].trim()),
      url: _urlDeVideo(m[1]),
      cover: m[3],
    });
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  const html = await _get(`${BASE}/video${page > 1 ? `?page=${page}` : ''}`);
  return _parseListado(html);
}

/**
 * Limpia la consulta antes de mandarla al buscador del sitio.
 *
 * Los signos de puntuacion lo rompen. Medido con el titulo exacto de un video:
 * con los ":" y "-" que trae, el buscador devuelve cosas que no tienen nada que
 * ver; sacandolos, ese mismo video aparece PRIMERO. Asi que pegar un titulo
 * entero —que es lo mas natural cuando uno busca algo puntual— era justo el
 * caso que peor andaba.
 *
 * Se reemplazan por espacios en vez de borrarlos, para no pegar palabras que
 * estaban separadas.
 */
function _consultaLimpia(keyword: string): string {
  return keyword
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Recorta el HTML al bloque de RESULTADOS antes de leer las tarjetas.
 *
 * La pagina de busqueda trae, ademas de lo buscado, tiras de recomendados que
 * aparecen ANTES en el HTML. Sin recortar, lo primero que se leia eran esas
 * tiras: buscar el nombre de una modelo devolvia videos que no tenian nada que
 * ver, y el titulo exacto de un video tampoco lo encontraba.
 *
 * Si el bloque no esta (el sitio cambio el nombre), se devuelve todo y al menos
 * sigue habiendo resultados, aunque mezclados.
 */
function _soloResultados(html: string): string {
  for (const marca of ['id="videoSearchResult"', 'class="nf-videos videosListingSection"']) {
    const i = html.indexOf(marca);
    if (i > 0) return html.slice(i);
  }
  return html;
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const kw = _consultaLimpia(keyword);
  if (kw) {
    const html = await _get(
      `${BASE}/video/search?search=${encodeURIComponent(kw)}${page > 1 ? `&page=${page}` : ''}`,
    );
    return _parseListado(_soloResultados(html));
  }
  // Categoria y orden se combinan en la misma ruta, asi que se pueden usar
  // juntos (por ejemplo: lo mas visto dentro de una categoria).
  const partes: string[] = [];
  const cat = filter?.['categoria']?.[0];
  if (cat && cat.length > 0) partes.push(`c=${encodeURIComponent(cat)}`);
  const orden = filter?.['orden']?.[0];
  if (orden && orden.length > 0) partes.push(`o=${encodeURIComponent(orden)}`);
  if (page > 1) partes.push(`page=${page}`);
  const html = await _get(`${BASE}/video${partes.length ? `?${partes.join('&')}` : ''}`);
  return _parseListado(html);
}

// Las 96 categorias del sitio, con el nombre en español tal cual las muestra.
const _CATEGORIA_OPTIONS: Record<string, string> = {
  '': 'Todas',
  '612': '360°',
  '105': '60FPS',
  '3': 'Aficionado',
  '592': 'Al Dedo',
  '95': 'Alemanas',
  '35': 'Anal',
  '1': 'Asiáticas',
  '90': 'Audiciones',
  '76': 'Bisexual Masculino',
  '10': 'Bondage',
  '102': 'Brasileras',
  '96': 'Británicas',
  '14': 'Bukkake',
  '86': 'Caricaturas',
  '12': 'Celebridades',
  '100': 'Checas',
  '103': 'Coreanas',
  '242': 'Cornudos',
  '241': 'Cosplay',
  '15': 'Creampie',
  '4': 'Culos Grandes',
  '61': 'Cámara Web',
  '141': 'Detrás De Cámaras',
  '32': 'Divertidos',
  '72': 'Doble penetración',
  '88': 'Escuela (18+)',
  '33': 'Estriptís',
  '55': 'Europeos',
  '115': 'Exclusivo',
  '16': 'Eyaculaciones',
  '444': 'Fantasias de Padrastro',
  '18': 'Fetiches',
  '761': 'FFM',
  '53': 'Fiestas',
  '19': 'Fisting',
  '94': 'Francesas',
  '91': 'Fumadores',
  '6': 'Gordas',
  '101': 'Indias',
  '25': 'Interracial',
  '97': 'Italianas',
  '111': 'Japonésas',
  '181': 'Jovencitas/Viejos (18+)',
  '881': 'Juego',
  '81': 'Juegos de Rol',
  '23': 'Juguetes',
  '131': 'Lamidas de Coño',
  '26': 'Latinas',
  '27': 'Lesbianas',
  '28': 'Maduras',
  '13': 'Mamadas',
  '78': 'Masajes',
  '22': 'Masturbación',
  '29': 'MILF',
  '11': 'Morenas',
  '562': 'Mujeres Tatuadas',
  '512': 'Musculosos',
  '121': 'Música',
  '17': 'Negras',
  '89': 'Niñeras (18+)',
  '502': 'Orgasmo Femenino',
  '80': 'Orgía',
  '2': 'Orgías',
  '211': 'Orinadas',
  '20': 'Pajas',
  '201': 'Parodia',
  '42': 'Pelirojas',
  '93': 'Pies',
  '891': 'Podcast xxx',
  '41': 'POV',
  '24': 'Público',
  '31': 'Real',
  '57': 'Recopilación',
  '522': 'Romance',
  '9': 'Rubias',
  '99': 'Rusas',
  '532': 'Scissoring',
  '21': 'Sexo Duro',
  '67': 'Sexo Duro',
  '492': 'Solitaria',
  '92': 'Solitario',
  '69': 'Squirt',
  '542': 'Strap On',
  '732': 'Subtítulos',
  '8': 'Tetas Grandes',
  '59': 'Tetas pequeñas',
  '572': 'Trans With Girl',
  '65': 'Tríos',
  '722': 'Uncensored',
  '712': 'Uncensored',
  '482': 'Verdaderas Parejas',
  '138': 'Verdaderos Aficionados',
  '139': 'Verdaderos Modelos',
  '7': 'Vergas grandes',
  '43': 'Vintage',
  '98': 'Árabe',
};

const _ORDEN_OPTIONS: Record<string, string> = {
  '': 'Destacados',
  'mr': 'Mas recientes',
  'mv': 'Mas vistos',
  'tr': 'Mejor valorados',
  'ht': 'Mas populares',
  'cm': 'Mas comentados',
};

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    categoria: { title: 'Categoria', options: _CATEGORIA_OPTIONS, default: '', min: 1, max: 1 },
    orden: { title: 'Orden', options: _ORDEN_OPTIONS, default: '', min: 1, max: 1 },
  };
}

// ─── Ficha ──────────────────────────────────────────────────────────────────

export async function detail(url: string): Promise<PrismDetail> {
  const html = await _pagina(url);

  const title = decodeEntities(
    (/<h1[^>]*>\s*(?:<span[^>]*>)?\s*([^<]{2,160}?)\s*</.exec(html)?.[1] ?? '').trim(),
  );

  // La portada sale del propio reproductor (`image_url` de flashvars): es la
  // del video que se esta viendo, a diferencia de las imagenes de la pagina,
  // que son en su mayoria de la tira de recomendados.
  const cover = (/"image_url":"([^"]+)"/.exec(html)?.[1] ?? '').replace(/\\\//g, '/');

  // Etiquetas: categorias y actrices del video.
  const genres: string[] = [];
  for (const m of html.matchAll(
    /href="\/(?:video\?c=\d+|pornstar\/[^"]+|hd-porn\/[^"]*)"[^>]*>\s*([^<]{2,40}?)\s*</g,
  )) {
    const g = decodeEntities(m[1].trim());
    if (g && g.length > 1 && genres.indexOf(g) === -1) genres.push(g);
  }

  return {
    title,
    cover: cover || undefined,
    description: '',
    genres: genres.slice(0, 20),
    // Un video suelto, no una serie: una sola entrada para reproducir.
    episodes: [{ title: 'Reproducir', url, thumbnail: cover || undefined, number: 1 }],
  };
}

// ─── Reproduccion ───────────────────────────────────────────────────────────

/**
 * Las fuentes estan a la vista en `mediaDefinitions`, dentro de las flashvars
 * del reproductor.
 *
 * Cada calidad trae su propio `master.m3u8` ya firmado (`h=` y `e=`), asi que
 * no hay nada que desofuscar: alcanza con leerlas. Medido en vivo: 240p, 480p,
 * 720p y 1080p responden 200 con una lista HLS valida.
 *
 * OJO: la firma caduca (el parametro `e` es una marca de tiempo, y en la
 * medicion daba alrededor de una hora). Hay que resolver en el momento de
 * reproducir y no guardar la URL para despues.
 */
export async function watch(url: string): Promise<PrismWatch> {
  // Reutiliza la que ya bajo la ficha, pero solo si es reciente: sus firmas
  // vencen a los 52 minutos y con una pagina vieja el video se corta en la
  // mitad. Ver el comentario largo en `_pagina`.
  const html = await _pagina(url, true);

  const streams: PrismStream[] = [];
  const vistas: Record<string, boolean> = {};
  // Se leen los pares videoUrl/quality en el orden en que aparecen, sin
  // intentar parsear las flashvars enteras como JSON: es un objeto JS gigante
  // con mas cosas adentro y cualquier cambio del sitio romperia el parseo.
  for (const m of html.matchAll(/"videoUrl":"([^"]+?)"[^}]*?"quality":"?(\d+)"?/g)) {
    const fuente = m[1].replace(/\\\//g, '/');
    if (!fuente || vistas[fuente]) continue;
    vistas[fuente] = true;
    streams.push({
      url: fuente,
      quality: `${m[2]}p`,
      headers: { Referer: `${BASE}/` },
    });
  }

  if (streams.length === 0) {
    // Sin fuentes no hay nada que reproducir: se deja la propia pagina para que
    // el cliente la abra en el navegador interno.
    return { streams: [], pageUrl: url };
  }

  // De mayor a menor: el cliente toma la primera como predeterminada, y en las
  // flashvars vienen desordenadas (medido: 1080, 240, 480, 720).
  streams.sort((a, b) => _altura(b.quality) - _altura(a.quality));
  return { streams, pageUrl: url };
}

/** "1080p" -> 1080, para poder ordenar las calidades. */
function _altura(etiqueta: string | undefined): number {
  const m = /(\d{3,4})/.exec(etiqueta || '');
  return m ? parseInt(m[1], 10) : 0;
}

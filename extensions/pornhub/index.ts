import { DESKTOP_UA } from '../../sdk/http';
import { decodeEntities } from '../../sdk/html';
import { createCache, TTL } from '../../sdk/cache';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://es.pornhub.com';

/**
 * Las portadas salen de varios servidores, y uno (pix-cdn77.phncdn.com) solo
 * las entrega si se dice que vienen del sitio: medido el 2026-10-13, 403 sin
 * Referer y 200 con él. Le toca a una portada u otra al azar, en la lista y en
 * la ficha, así que se manda siempre.
 */
const _CABECERAS_DE_IMAGEN = { Referer: `${BASE}/` };

async function _get(url: string): Promise<string> {
  let raw = await _pedir(url);
  // ── La protección contra robots del sitio ───────────────────────────────
  //
  // Medido el 2026-10-13: después de muchos pedidos seguidos, el sitio deja
  // de mandar la página y manda una cuenta en JavaScript («leastFactor») que
  // un navegador resuelve solo y guarda como cookie `KEY`. Sin resolverla, la
  // lista sale vacía y los vídeos «sin servidores», también para quien navega
  // mucho en la app. Se resuelve acá y se repite el pedido una vez.
  if (typeof raw === 'string' && _esLaProteccion(raw)) {
    const llave = _resolverProteccion(raw);
    if (llave) {
      _llave = llave;
      console.log('[ph] el sitio pidió su comprobación contra robots: resuelta, se repite el pedido');
      // Un navegador recarga la página un momento después; repetir al
      // instante no pasó en las pruebas, con 1,5 s de espera sí.
      await new Promise((ok) => setTimeout(ok, 1500));
      raw = await _pedir(url);
      if (typeof raw === 'string' && _esLaProteccion(raw)) {
        console.log('[ph] el sitio sigue pidiendo la comprobación: está frenando por cantidad de pedidos, se reintenta más tarde');
      }
    } else {
      console.log('[ph] el sitio pidió su comprobación contra robots y no se pudo resolver');
    }
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function _pedir(url: string): Promise<string> {
  return sendMessage(
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
          // La cookie de la comprobación, si ya se resolvió. La app la junta
          // con las que tiene guardadas del sitio (no las pisa).
          ...(_llave ? { Cookie: `KEY=${_llave}` } : {}),
        },
      },
    ]),
  );
}

/** El valor de la cookie `KEY` de la última comprobación resuelta. */
let _llave: string | null = null;

function _esLaProteccion(html: string): boolean {
  return html.length < 20000 && html.indexOf('leastFactor') !== -1 && html.indexOf('KEY=') !== -1;
}

/**
 * Resuelve la comprobación contra robots SIN ejecutar el código del sitio:
 * se le sacan los comentarios (que están para confundir) y se hacen a mano
 * las únicas operaciones que trae — sumas y restas a `p` según bits de `s` —,
 * y después el mismo «menor factor» que calcula el sitio. Devuelve el valor de
 * la cookie, o null si el formato cambió (ahí no se inventa nada).
 */
function _resolverProteccion(html: string): string | null {
  const ini = html.indexOf('function go()');
  if (ini < 0) return null;
  const cuerpo = html.slice(ini).replace(/\/\*[\s\S]*?\*\//g, ' ');
  const pM = /var\s+p\s*=\s*(\d+)\s*;/.exec(cuerpo);
  const sM = /var\s+s\s*=\s*(\d+)\s*;/.exec(cuerpo);
  const cola = /document\.cookie\s*=\s*"KEY="\s*\+\s*n\s*\+\s*"\*"\s*\+\s*p\s*\/\s*n\s*\+\s*":"\s*\+\s*s\s*\+\s*":(\d+):1/.exec(cuerpo);
  const finM = cuerpo.indexOf('n=leastFactor(p)');
  if (!pM || !sM || !cola || finM < 0) return null;
  let p = Number(pM[1]);
  const s = Number(sM[1]);
  const desde = cuerpo.indexOf('var n;');
  if (desde < 0 || desde > finM) return null;
  let codigo = cuerpo.slice(desde + 'var n;'.length, finM).replace(/\s+/g, ' ');
  // Una operación: p+= A*B, p-= A, etc.
  const op = /^\s*p\s*([+-])=\s*(\d+)\s*(?:\*\s*(\d+))?\s*;/;
  const aplicar = (m: RegExpExecArray) => {
    const v = Number(m[2]) * (m[3] ? Number(m[3]) : 1);
    p = m[1] === '+' ? p + v : p - v;
  };
  for (let vueltas = 0; codigo.trim() && vueltas < 200; vueltas++) {
    const si = /^\s*if\s*\(\s*\(\s*s\s*>>\s*(\d+)\s*\)\s*&\s*1\s*\)/.exec(codigo);
    if (si) {
      codigo = codigo.slice(si[0].length);
      const a = op.exec(codigo);
      if (!a) return null;
      codigo = codigo.slice(a[0].length);
      const sino = /^\s*else\b/.exec(codigo);
      if (!sino) return null;
      codigo = codigo.slice(sino[0].length);
      const b = op.exec(codigo);
      if (!b) return null;
      codigo = codigo.slice(b[0].length);
      aplicar((s >> Number(si[1])) & 1 ? a : b);
      continue;
    }
    const suelta = op.exec(codigo);
    if (!suelta) return null;
    codigo = codigo.slice(suelta[0].length);
    aplicar(suelta);
  }
  if (!Number.isSafeInteger(p) || p <= 0) return null;
  const n = _menorFactor(p);
  return `${n}*${p / n}:${s}:${cola[1]}:1`;
}

/** El menor factor de `n`, con el mismo recorrido que la comprobación del sitio. */
function _menorFactor(n: number): number {
  if (n % 1 || n * n < 2) return 1;
  if (n % 2 === 0) return 2;
  if (n % 3 === 0) return 3;
  if (n % 5 === 0) return 5;
  const m = Math.sqrt(n);
  for (let i = 7; i <= m; i += 30) {
    for (const d of [0, 4, 6, 10, 12, 16, 22, 24]) if (n % (i + d) === 0) return i + d;
  }
  return n;
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
      headers: _CABECERAS_DE_IMAGEN,
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
    headers: _CABECERAS_DE_IMAGEN,
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
  const defs = _definiciones(html);
  const ref = { Referer: `${BASE}/` };

  // ── 1. Las listas HLS de la página, si siguen vivas ─────────────────────
  //
  // Medido el 2026-10-13: en 12 de 20 vídeos las listas venían de
  // hv-h.phncdn.com y contestaban 410 (borradas) en TODAS las calidades, así
  // que el vídeo no abría (y cambiar el host a ev-h da la lista pero los
  // pedacitos en 404). Se prueba la primera: si contesta con una lista, valen.
  const hls = defs.filter((d) => d.format === 'hls' && d.videoUrl);
  if (hls.length && (await _listaViva(hls[0].videoUrl))) {
    const streams = _sinRepetir(
      hls.map((d) => ({ url: d.videoUrl, quality: _calidad(d), headers: ref, nativo: true })),
    );
    // De mayor a menor: el cliente toma la primera como predeterminada, y en
    // la página vienen desordenadas (medido: 1080, 240, 480, 720).
    streams.sort((a, b) => _altura(b.quality) - _altura(a.quality));
    return { streams, pageUrl: url };
  }

  // ── 2. Si no, los mp4 del propio sitio (`get_media`) ─────────────────────
  //
  // Es la otra fuente que trae la página. Contesta la lista de mp4 en
  // ev.phncdn.com (vivo) en 240/480/720/1080p, y todos dejan saltar a
  // cualquier minuto (206). Necesita las cookies que dejó la página: las
  // guarda la app por extensión, y la página se acaba de pedir arriba.
  //
  // Esos mp4 tienen un tope de velocidad del sitio (`rate=500k`, ~500 KB/s):
  // sobra para 720p y queda justo para 1080p. Por eso 720p va primero.
  const gm = defs.find((d) => d.format === 'mp4' && /get_media/.test(d.videoUrl));
  if (gm) {
    if (hls.length) console.log(`[ph] las listas HLS no contestan (${hls[0].videoUrl.split('/')[2]}), se usan los mp4`);
    let lista: _Definicion[] = [];
    try {
      const crudo = await _get(gm.videoUrl);
      lista = (typeof crudo === 'string' ? JSON.parse(crudo) : crudo) as _Definicion[];
    } catch (e) {
      console.log(`[ph] get_media no devolvió una lista: ${e}`);
    }
    const streams = _sinRepetir(
      (Array.isArray(lista) ? lista : [])
        .filter((d) => d && typeof d.videoUrl === 'string' && /^https?:\/\//.test(d.videoUrl))
        .map((d) => ({ url: d.videoUrl, quality: _calidad(d), headers: ref, nativo: true, mimeType: 'video/mp4' })),
    );
    const orden = (q: string | undefined) => {
      const h = _altura(q);
      return h === 720 ? 0 : h === 1080 ? 1 : 2 + (1080 - h) / 10000;
    };
    streams.sort((a, b) => orden(a.quality) - orden(b.quality));
    if (streams.length) return { streams, pageUrl: url };
  }

  // Sin ninguna de las dos: el sitio no tiene el vídeo ahora. La app lo dice
  // así, en vez de un error genérico (ya no hay navegador interno).
  return { streams: [], pageUrl: url, reason: 'servidores_no_disponibles' };
}

interface _Definicion {
  format?: string;
  videoUrl: string;
  quality?: string | number | unknown[];
  height?: number;
}

/**
 * Las fuentes de la página (`mediaDefinitions`), leídas como lista JSON
 * contando corchetes hasta el que la cierra. Antes se sacaban con una
 * expresión sobre pares videoUrl/quality, que dejaba afuera la fuente de mp4
 * (su `quality` es una lista vacía).
 */
function _definiciones(html: string): _Definicion[] {
  const i = html.indexOf('"mediaDefinitions":');
  const desde = i < 0 ? -1 : html.indexOf('[', i);
  if (desde < 0) return [];
  let nivel = 0;
  for (let j = desde; j < html.length; j++) {
    const c = html[j];
    if (c === '[') nivel++;
    else if (c === ']' && --nivel === 0) {
      try {
        const lista = JSON.parse(html.slice(desde, j + 1));
        return Array.isArray(lista) ? lista.filter((d) => d && typeof d.videoUrl === 'string') : [];
      } catch {
        return [];
      }
    }
  }
  return [];
}

/** Si la lista HLS contesta con una lista de verdad (no un 410 vacío). */
async function _listaViva(direccion: string): Promise<boolean> {
  try {
    const cuerpo = await _get(direccion);
    return typeof cuerpo === 'string' && cuerpo.indexOf('#EXTM3U') !== -1;
  } catch {
    return false;
  }
}

/** "720p" a partir de `quality` o, si no viene, de `height`. */
function _calidad(d: _Definicion): string {
  const q = typeof d.quality === 'string' || typeof d.quality === 'number' ? String(d.quality) : '';
  const n = /(\d{3,4})/.exec(q)?.[1] ?? (d.height ? String(d.height) : '');
  return n ? `${n}p` : 'Auto';
}

function _sinRepetir(streams: PrismStream[]): PrismStream[] {
  const vistas: Record<string, boolean> = {};
  return streams.filter((s) => (vistas[s.url] ? false : (vistas[s.url] = true)));
}

/** "1080p" -> 1080, para poder ordenar las calidades. */
function _altura(etiqueta: string | undefined): number {
  const m = /(\d{3,4})/.exec(etiqueta || '');
  return m ? parseInt(m[1], 10) : 0;
}

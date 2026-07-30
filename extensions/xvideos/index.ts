import { decodeEntities, stripTags } from '../../sdk/html';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://www.xvideos.com';
// El sitio sirve el MISMO buscador por su host AMP. Se usa como respaldo porque
// se comprobó en vivo que el buscador principal puede devolver "Error interno /
// sin resultados" para una palabra concreta mientras el AMP responde bien con
// esa misma palabra (pasó con "cosplay"; "perra" funcionaba en los dos). Así una
// caída parcial del backend de búsqueda no deja la extensión sin buscar.
const AMP = 'https://amp.xvideos.com';

// User-Agent de ESCRITORIO fijo, a propósito. El puente de la app solo completa
// el User-Agent si la extensión no manda uno, y ahí usa el de la plataforma: el
// de Windows en PC y uno MÓVIL en Android (ver getUASetting en
// prismhub_storage.dart). Este sitio sirve maquetados distintos según eso, así
// que el teléfono recibía la versión móvil —con las cards en otra forma— y el
// parser no reconocía nada, mientras en PC funcionaba perfecto.
//
// Fijándolo acá, las tres plataformas piden y reciben EXACTAMENTE la misma
// página: lo que anda en Windows anda igual en Android y Linux.
const _DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function _get(url: string): Promise<string> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([
      url,
      {
        method: 'get',
        headers: { Referer: `${BASE}/`, 'User-Agent': _DESKTOP_UA },
      },
    ]),
  );
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw;
  }
}

// El sitio NO usa un único formato de URL de vídeo. Su propio JS reconoce
// /video12345/ y /video-abc123/, y además sirve /video.abc123/. Cuál te toca
// depende de la sesión/cliente, no de la plataforma: la PC recibía la variante
// con PUNTO y el celular la NUMÉRICA, con el mismo bundle.
//
// Ese era el bug de "anda en Windows y devuelve cero en Android": el patrón de
// acá exigía un `.` o un `-` justo después de "video", así que en el teléfono no
// reconocía NINGÚN enlace. Se midió en el propio dispositivo: llegaban 125 KB
// con las cards presentes (el marcador thumb-block estaba) y 0 enlaces
// reconocidos. No era la red, ni el User-Agent, ni el motor de JS.
//
// Un solo patrón compartido por todos los usos, para que no vuelvan a divergir.
//
// Y a propósito NO exige barra inicial: los href pueden venir absolutos
// (https://host/video…), desde la raíz (/video…) o RELATIVOS (video…/slug), y
// esto último es lo que rompía todo en el celular. El diagnóstico tomado en el
// propio teléfono lo dejó a la vista: llegaban 125 KB con las cards presentes
// (el marcador thumb-block estaba) y CERO enlaces reconocidos — imposible si la
// página trajera "/video" en algún lado. La página está bien; era el patrón el
// que exigía una forma de más.
const _VIDEO_ID = 'video(?:[.\\-][a-z0-9]+|\\d+)';
// Con delimitador por delante: inicio de cadena, barra o comilla. Así "video.x/"
// matchea igual esté suelto, tras "/" o tras 'href="'.
const _RE_ID_ANY = new RegExp(`(?:^|[/"'])${_VIDEO_ID}\\/`);

// ¿Este href apunta a la página de un vídeo? Se valida por forma, no por prefijo.
function _isVideoHref(href: string): boolean {
  if (!href) return false;
  const clean = href.split('\\/').join('/');
  // Descartar cosas como /videos-i-like, que empiezan igual pero no son vídeos.
  return _RE_ID_ANY.test(clean) || _RE_ID_ANY.test(`/${clean}`);
}

// Lleva cualquier forma de href a una URL absoluta del host principal.
function _absolutize(href: string): string {
  const clean = href.split('\\/').join('/').split('?')[0].split('#')[0];
  const at = clean.search(new RegExp(_VIDEO_ID));
  if (at < 0) return `${BASE}/${clean.replace(/^\/+/, '')}`;
  return `${BASE}/${clean.slice(at)}`;
}

// Los listados AMP enlazan a un dominio espejo (xvv1deos.com). Se normaliza todo
// al host principal para que detalle y reproducción peguen siempre al mismo
// sitio, sin importar de qué listado salió la card.
function _normalizeUrl(url: string): string {
  if (_isVideoHref(url)) return _absolutize(url);
  if (url.indexOf('http') === 0) return url;
  return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ─── Listados ───────────────────────────────────────────────────────────────

// Un solo parser para los dos formatos: el host principal abre cada card con
// class="thumb-block" y el AMP con class="video-thumb". En ambos casos, cortar
// por ese marcador deja el enlace, la miniatura y el <p class="title"> del MISMO
// vídeo dentro del trozo (el siguiente trozo empieza en la card siguiente).
function _parseList(html: string): PrismItem[] {
  // Corte por texto LITERAL, no por expresión regular, y a propósito: la versión
  // con regex —class="(?:[^"]*\s)?(?:thumb-block|video-thumb)— obliga al motor a
  // retroceder en cada `class="` de una página de ~100 KB, y el motor de regex
  // de QuickJS usa la pila para eso. En Android el runtime arranca con 1 MB de
  // stack y en escritorio con el default (ver extension_service.dart), así que
  // el mismo bundle devolvía resultados en PC y NADA en celular. Un split
  // literal es lineal, no retrocede y se comporta igual en cualquier motor.
  const marker =
    html.indexOf('thumb-block') !== -1
      ? 'thumb-block'
      : html.indexOf('video-thumb') !== -1
        ? 'video-thumb'
        : '';
  if (!marker) return _parseListLoose(html);
  const chunks = html.split(marker);
  const items: PrismItem[] = [];
  const seen: Record<string, boolean> = {};
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    // Se recorren TODOS los href del trozo y se queda con el primero que tenga
    // forma de vídeo, en vez de exigir un formato de ruta concreto: los enlaces
    // pueden venir absolutos, desde la raíz o relativos según el maquetado que
    // sirva el sitio.
    //
    // Sin matchAll: se usa exec() sobre una expresión creada ACÁ, local a esta
    // llamada. matchAll es de las funciones más nuevas del lenguaje y no se
    // comporta igual en todos los motores; peor todavía, una expresión global
    // compartida entre llamadas arrastra su `lastIndex` y hace que la siguiente
    // empiece a buscar desde donde quedó la anterior. Es lo único que podía
    // explicar que el MISMO html —confirmado byte a byte en el teléfono, 125 KB
    // y con is-desktop— diera 27 resultados en Windows y 0 en Android. exec()
    // con una expresión nueva por llamada no arrastra estado ni depende de eso.
    let href = '';
    const hrefRe = /href="([^"]+)"/g;
    let hm: RegExpExecArray | null;
    while ((hm = hrefRe.exec(chunk)) !== null) {
      if (_isVideoHref(hm[1])) {
        href = hm[1];
        break;
      }
    }
    if (!href) continue;
    const url = _absolutize(href);
    if (seen[url]) continue;

    // El title del <a> del bloque de título es el más fiable; si faltara se usa
    // el texto del enlace, que trae la duración pegada y hay que limpiar.
    let title = /<p class="title">[\s\S]{0,300}?title="([^"]*)"/.exec(chunk)?.[1] ?? '';
    if (!title) {
      const inner = /<p class="title">\s*<a[^>]*>([\s\S]{0,300}?)<\/a>/.exec(chunk)?.[1] ?? '';
      title = stripTags(inner);
    }
    title = decodeEntities(title.replace(/\s+/g, ' ').trim());
    if (!title) continue;

    // data-src en el host principal (el src real es un gif transparente de
    // lazy-load), src en las <amp-img> del AMP.
    const cover =
      /data-src="(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp|avif))"/.exec(chunk)?.[1] ??
      /<amp-img[^>]+src="(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp|avif))"/.exec(chunk)?.[1] ??
      undefined;

    const duration = /<span class="duration">([^<]+)<\/span>/.exec(chunk)?.[1]?.trim();

    seen[url] = true;
    items.push({ title, url, cover, update: duration || undefined });
  }
  return items.length > 0 ? items : _parseListLoose(html);
}

// Último recurso, sin depender de NINGUNA clase del HTML: junta los enlaces de
// vídeo que haya en la página y arma el título desde el propio slug de la URL
// (en este sitio el slug es el título pasado a minúsculas y con guiones bajos,
// así que se lee perfectamente bien).
//
// Existe porque la búsqueda funcionaba en Windows y devolvía CERO en Android
// con el mismo bundle. Sin poder reproducirlo desde acá, en vez de seguir
// adivinando qué difiere, esto garantiza que mientras la página traiga enlaces
// de vídeo salga contenido — aunque el maquetado que reciba el teléfono no sea
// el que espera el parser principal.
//
// La expresión es a propósito simple —clases de caracteres sueltas, sin grupos
// anidados ni cuantificadores solapados—: no retrocede, que es justo el
// problema que ya nos costó una vez acá.
function _parseListLoose(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  const seen: Record<string, boolean> = {};
  // Se des-escapan las barras primero: cuando las urls vienen dentro de un
  // bloque JSON embebido llegan como "\/video.xxx\/slug", y con esa barra
  // invertida en el medio ningún patrón de ruta las reconoce. Es un split/join
  // literal, sin regex.
  html = html.split('\\/').join('/');
  // Igual que en _parseList: exec() sobre una expresión creada acá, sin
  // matchAll y sin expresiones globales compartidas entre llamadas.
  const re = new RegExp(`${_VIDEO_ID}\\/[a-z0-9_\\-]+`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    // _absolutize y no concatenar con BASE: el patrón ya no exige barra inicial,
    // así que m[0] puede ser "video.xxx/slug" y pegarlo directo daría una url
    // rota ("...xvideos.comvideo.xxx/slug").
    const url = _absolutize(m[0]);
    if (seen[url]) continue;
    seen[url] = true;
    const slug = m[0].slice(m[0].indexOf('/') + 1);
    const title = decodeEntities(slug.replace(/[_-]+/g, ' ').trim());
    if (!title) continue;
    items.push({ title, url });
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  const n = page < 1 ? 1 : page;
  const html = await _get(`${BASE}/new/${n}`);
  return _parseList(html);
}

function _searchQuery(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): string {
  const parts: string[] = [`k=${encodeURIComponent(keyword.trim())}`];
  // El parámetro de página es 0-based en este sitio (p=0 es la primera).
  const p = (page < 1 ? 1 : page) - 1;
  if (p > 0) parts.push(`p=${p}`);
  const sort = filter?.['orden']?.[0];
  const durf = filter?.['duracion']?.[0];
  const quality = filter?.['calidad']?.[0];
  if (sort) parts.push(`sort=${encodeURIComponent(sort)}`);
  if (durf) parts.push(`durf=${encodeURIComponent(durf)}`);
  if (quality) parts.push(`quality=${encodeURIComponent(quality)}`);
  return parts.join('&');
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const kw = keyword.trim();
  const category = filter?.['categoria']?.[0] || '';

  // Categoría sin texto: se navega la página real de la categoría. Comprobado en
  // vivo que ahí la paginación es por RUTA (/tags/{cat}/{n} cambia de
  // resultados) y que ?p=, ?sort= y ?quality= NO tienen efecto en esa ruta, así
  // que no se mandan — mejor no ofrecer un orden que el sitio ignora.
  if (category && !kw) {
    const n = page < 1 ? 1 : page;
    const path = `/tags/${category}${n > 1 ? `/${n}` : ''}`;
    const html = await _get(`${BASE}${path}`);
    const items = _parseList(html);
    if (items.length > 0) return items;
    // Mismo respaldo por AMP que la búsqueda: se comprobó en vivo que esta
    // ruta puede devolver una respuesta vacía de forma pasajera (le pasó una
    // vez a la prueba automática mientras la misma URL respondía bien por
    // separado) y que el host AMP sirve estas mismas categorías, paginación
    // incluida. Sin esto, un hipo momentáneo dejaba la categoría en blanco.
    const ampHtml = await _get(`${AMP}${path}`);
    return _parseList(ampHtml);
  }

  // Sin texto ni categoría no hay búsqueda posible (el buscador exige `k`), así
  // que se cae al listado de novedades en vez de devolver vacío.
  if (!kw) return latest(page);

  // Con texto Y categoría se busca dentro de la categoría sumándola a la
  // consulta: comprobado que en este sitio una categoría también funciona como
  // término de búsqueda (?k=asiatica devuelve resultados), y así se conservan
  // orden, duración y calidad, que sí funcionan en la ruta de búsqueda.
  const effectiveKw = category ? `${kw} ${category.replace(/-/g, ' ')}` : kw;
  const query = _searchQuery(effectiveKw, page, filter);
  const html = await _get(`${BASE}/?${query}`);
  const items = _parseList(html);
  if (items.length > 0) return items;

  // Respaldo por host AMP — ver el comentario de la constante AMP.
  const ampHtml = await _get(`${AMP}/?${query}`);
  return _parseList(ampHtml);
}

// ─── Filtros ────────────────────────────────────────────────────────────────

// Solo valores comprobados en vivo: cada uno cambia realmente el primer
// resultado respecto a la búsqueda sin filtro. Se dejaron FUERA a propósito
// `sort=length` y `sort=views` (devolvían una página sin resultados) y `datef`
// (no filtraba nada), para no ofrecer filtros que no funcionan.
const _ORDER_OPTIONS: Record<string, string> = {
  '': 'Relevancia',
  uploaddate: 'Más recientes',
  rating: 'Mejor valorados',
};

const _DURATION_OPTIONS: Record<string, string> = {
  '': 'Cualquiera',
  '1-3min': '1 - 3 min',
  '10min_more': 'Más de 10 min',
  '20min_more': 'Más de 20 min',
};

const _QUALITY_OPTIONS: Record<string, string> = {
  '': 'Cualquiera',
  hd: 'HD',
  '1080P': '1080p',
};

// Categorías del propio sitio (rutas /tags/{slug}). El índice de tags tiene más
// de 2000 entradas —inservible como desplegable—, así que se ofrece una
// selección de las más usadas, y cada slug de esta lista se comprobó en vivo
// devolviendo resultados. Quedaron FUERA `colombiana` y `argentina`, que se
// probaron y devuelven 0.
const _CATEGORY_OPTIONS: Record<string, string> = {
  '': 'Todas',
  amateur: 'Amateur',
  anal: 'Anal',
  asiatica: 'Asiática',
  casero: 'Casero',
  corridas: 'Corridas',
  cosplay: 'Cosplay',
  culonas: 'Culonas',
  enfermera: 'Enfermera',
  espanol: 'Español',
  hentai: 'Hentai',
  interracial: 'Interracial',
  japonesa: 'Japonesa',
  latina: 'Latina',
  lesbianas: 'Lesbianas',
  maduras: 'Maduras',
  masaje: 'Masaje',
  mexicana: 'Mexicana',
  milf: 'MILF',
  morenas: 'Morenas',
  negras: 'Negras',
  orgia: 'Orgía',
  rubias: 'Rubias',
  squirt: 'Squirt',
  teen: 'Teen',
  tetonas: 'Tetonas',
  trio: 'Trío',
  universitaria: 'Universitaria',
  venezolana: 'Venezolana',
};

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    categoria: { title: 'Categoría', options: _CATEGORY_OPTIONS, default: '', min: 1, max: 1 },
    orden: { title: 'Orden', options: _ORDER_OPTIONS, default: '', min: 1, max: 1 },
    duracion: { title: 'Duración', options: _DURATION_OPTIONS, default: '', min: 1, max: 1 },
    calidad: { title: 'Calidad', options: _QUALITY_OPTIONS, default: '', min: 1, max: 1 },
  };
}

// ─── Detalle ────────────────────────────────────────────────────────────────

// Devuelve SOLO el bloque JSON-LD del vídeo (schema.org VideoObject). Es
// imprescindible acotar la búsqueda ahí: la página trae mucho JSON de
// configuración antes, y el primer "name" que aparece es del menú de la cuenta
// —literalmente "title_account"—, que es lo que se mostraba como título del
// vídeo (reportado en vivo). El VideoObject está miles de caracteres más abajo.
function _videoJsonLd(html: string): string {
  const at = html.indexOf('VideoObject');
  if (at === -1) return '';
  const start = html.lastIndexOf('<script', at);
  const end = html.indexOf('</script>', at);
  if (start === -1 || end === -1 || end <= start) {
    // Ventana de respaldo por si el bloque no viene en un <script> propio.
    return html.slice(at, at + 4000);
  }
  return html.slice(start, end);
}

// Cada vídeo es una pieza suelta (no hay series ni temporadas), así que el
// detalle expone UN único "episodio" que apunta al propio vídeo. Es lo que
// necesita el cliente para abrir el reproductor desde la ficha.
export async function detail(url: string): Promise<PrismDetail> {
  const fullUrl = _normalizeUrl(url);
  const html = await _get(fullUrl);

  // El JSON-LD (schema.org VideoObject) es la fuente más estable de la ficha:
  // lo genera el propio sitio para los buscadores. Se acota a ese bloque, nunca
  // a la página entera (ver _videoJsonLd).
  const ld = _videoJsonLd(html);

  // Cadena de respaldo del título: JSON-LD → og:title → <title> sin el sufijo
  // del sitio. Así, si el bloque cambiara de forma, sigue saliendo el título
  // real y no una clave interna del sitio.
  const name =
    /"name":\s*"((?:[^"\\]|\\.)*)"/.exec(ld)?.[1] ??
    /property="og:title"\s+content="([^"]*)"/i.exec(html)?.[1] ??
    /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ??
    '';
  const title = decodeEntities(
    name
      .replace(/\\"/g, '"')
      .replace(/\\\//g, '/')
      .replace(/\s*-\s*XVIDEOS\.COM\s*$/i, '')
      .trim(),
  );

  const description = decodeEntities(
    (/"description":\s*"((?:[^"\\]|\\.)*)"/.exec(ld)?.[1] ?? '')
      .replace(/\\"/g, '"')
      .replace(/\\\//g, '/')
      .trim(),
  );

  const cover = /"thumbnailUrl":\s*\[?\s*"([^"]+)"/.exec(ld)?.[1]?.replace(/\\\//g, '/');

  // duration: "PT00H07M06S"
  const durM = /"duration":\s*"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/.exec(ld);
  const seconds = durM
    ? Number(durM[1] ?? 0) * 3600 + Number(durM[2] ?? 0) * 60 + Number(durM[3] ?? 0)
    : undefined;

  const yearM = /"uploadDate":\s*"(\d{4})/.exec(ld)?.[1];

  // exec() y no matchAll, por el mismo motivo que en los parsers de listado.
  const tags: string[] = [];
  const tagRe = /href="\/(?:tags|c)\/([a-z0-9\-]+)"/g;
  let tm: RegExpExecArray | null;
  while ((tm = tagRe.exec(html)) !== null) {
    const t = tm[1].replace(/-\d+$/, '').replace(/-/g, ' ');
    if (t && tags.indexOf(t) === -1) tags.push(t);
    if (tags.length >= 12) break;
  }

  return {
    title,
    cover,
    description,
    genres: tags.length > 0 ? tags : undefined,
    year: yearM ? Number(yearM) : undefined,
    episodes: [
      {
        title: title || 'Ver vídeo',
        url: fullUrl,
        thumbnail: cover,
        duration: seconds && seconds > 0 ? seconds : undefined,
      },
    ],
  };
}

// ─── Reproducción ───────────────────────────────────────────────────────────

// La ruta del CDN indica la variante servida (.../mp4_sd.mp4, .../mp4_hd.mp4).
// Es lo único que hay: la página no publica ancho/alto en ningún metadato.
function _qualityLabel(url: string | undefined): string {
  if (!url) return 'MP4';
  const s = url.toLowerCase();
  if (s.indexOf('mp4_hd') !== -1) return 'HD';
  if (s.indexOf('mp4_sd') !== -1) return 'SD';
  return 'MP4';
}

export async function watch(url: string): Promise<PrismWatch> {
  const fullUrl = _normalizeUrl(url);
  const html = await _get(fullUrl);

  const streams: PrismStream[] = [];
  const seen: Record<string, boolean> = {};
  const push = (raw: string | undefined, quality: string) => {
    if (!raw) return;
    const clean = raw.replace(/\\\//g, '/').trim();
    if (!clean || clean.indexOf('http') !== 0 || seen[clean]) return;
    seen[clean] = true;
    // El CDN entrega el MP4 solo con el Referer del sitio.
    streams.push({
      url: clean,
      quality,
      mimeType: clean.indexOf('.m3u8') !== -1 ? 'application/x-mpegURL' : 'video/mp4',
      headers: { Referer: `${BASE}/` },
    });
  };

  // Los setters clásicos del html5player ya no aparecen en todas las páginas
  // (comprobado en vivo: en la que se probó no estaba ninguno), pero se leen
  // primero porque cuando están traen las calidades separadas.
  push(/setVideoHLS\('([^']+)'\)/.exec(html)?.[1], 'HLS');
  push(/setVideoUrlHigh\('([^']+)'\)/.exec(html)?.[1], 'Alta');
  push(/setVideoUrlLow\('([^']+)'\)/.exec(html)?.[1], 'Baja');

  // Fuente principal y confirmada: el `contentUrl` del JSON-LD es un MP4 ya
  // firmado (probado en vivo: responde 206 con content-type video/mp4).
  //
  // La página NO expone la resolución en ningún metadato (se buscaron height,
  // width, size_height y las marcas de HD del listado: ninguna está), pero la
  // propia ruta del CDN la indica —.../mp4_sd.mp4 o .../mp4_hd.mp4—, así que la
  // etiqueta que ve el usuario en el selector de calidad sale de ahí en vez de
  // un "MP4" genérico.
  const contentUrl = /"contentUrl":\s*"([^"]+)"/.exec(_videoJsonLd(html))?.[1];
  push(contentUrl, _qualityLabel(contentUrl));

  // Si ninguna vía nativa dio stream, el cliente cae al WebView sobre la propia
  // página del vídeo.
  return {
    streams,
    pageUrl: fullUrl,
    reason: streams.length === 0 ? 'no_stream_found' : undefined,
  };
}

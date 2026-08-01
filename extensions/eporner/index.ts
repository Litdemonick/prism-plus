import type {
  PrismItem,
  PrismDetail,
  PrismWatch,
  PrismStream,
} from '../../sdk/types';

// sendMessage("request", ...) usa el dio de PrismHub (con UA, cookies y
// redirecciones), a diferencia de fetch() que usa http.Client básico.
declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://www.eporner.com';
// El CDN de miniaturas responde igual sin Referer, pero se manda para todo por
// coherencia: la página del vídeo sí lo mira.
const HEADERS: Record<string, string> = { Referer: `${BASE}/` };

async function _get(path: string): Promise<string> {
  const url = path.indexOf('http') === 0 ? path : `${BASE}${path}`;
  return sendMessage(
    'request',
    JSON.stringify([url, { method: 'get', headers: HEADERS }]),
  );
}

function _decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function _stripTags(s: string): string {
  return _decode(s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '));
}

// ─── Listados ────────────────────────────────────────────────────────────────

/// Altura en píxeles que anuncia la insignia de calidad de una tarjeta.
///
/// El sitio la escribe de varias formas —"4K (2160p)", "1080p", "720p"— así que
/// se toma el número MÁS GRANDE del texto: en "4K (2160p)" el 4 no es una
/// resolución y quedarse con el primero daría 4 en vez de 2160.
function _alturaDe(texto: string | undefined): number {
  if (!texto) return 0;
  let alta = 0;
  for (const m of texto.matchAll(/(\d{3,4})/g)) {
    const n = Number(m[1]);
    if (n > alta) alta = n;
  }
  return alta;
}

/// Segundos que anuncia la tarjeta ("5:00", "1:39:03").
function _segundosDe(texto: string | undefined): number {
  if (!texto) return 0;
  const partes = texto.trim().split(':').map((p) => Number(p));
  if (partes.some((p) => !isFinite(p))) return 0;
  let total = 0;
  for (const p of partes) total = total * 60 + p;
  return total;
}

interface _Tarjeta extends PrismItem {
  _altura: number;
  _segundos: number;
}

/// Saca las tarjetas de un listado.
///
/// Se recorta a #vidresults antes de mirar nada. La primera página de una
/// búsqueda trae además bloques promocionados ANTES de la grilla —medido: 106
/// enlaces de vídeo contra los 65 de la grilla real— y sin recortar se colaban
/// como si fueran resultados de lo buscado.
///
/// Cada tarjeta abre con class="mb", así que se parte por ahí en vez de ir
/// enlace por enlace: dentro de una misma tarjeta el enlace al vídeo aparece
/// dos veces (la portada y el título) y la insignia de calidad, la duración y
/// la valoración están repartidas entre las dos.
///
/// El corte va por expresión y no por texto fijo porque el sitio usa DOS
/// formas: class="mb" a secas y class="mb hdy". Cortando por 'class="mb ' —con
/// el espacio— se perdían todas las primeras: medido, 47 tarjetas de 108 en un
/// listado normal, casi la mitad, y en una búsqueda con dos resultados se veía
/// uno solo. Peor todavía, esas tarjetas perdidas se llevaban su insignia de
/// calidad, así que el filtro de 4K no tenía qué mirar y no descartaba nada.
///
/// El [\s"] final es lo que evita romper la tarjeta en pedazos: adentro hay
/// mbimg, mbunder, mbtit y mbstats, y un corte por 'class="mb' pelado los
/// tomaría como si cada uno abriera una tarjeta nueva.
function _itemsDe(html: string): _Tarjeta[] {
  const ini = html.indexOf('id="vidresults"');
  const cuerpo = ini !== -1 ? html.slice(ini) : html;

  // Pedir una página que no existe NO da una lista vacía: el sitio responde
  // 404 y de yapa rellena la página con vídeos cualesquiera. Medido pidiendo la
  // página 2 de una búsqueda con dos resultados: 52 vídeos, ninguno con
  // relación con lo buscado. Sin esta comprobación, bajar en los resultados de
  // algo con poco contenido llenaba la pantalla de cosas que nadie pidió.
  //
  // El <title> y el <h1> son IDÉNTICOS a los de la página buena, así que no
  // sirven para distinguirlas; el aviso de que no hay resultados sí.
  if (/No results/i.test(cuerpo)) return [];

  const items: _Tarjeta[] = [];
  const vistos = new Set<string>();
  const trozos = cuerpo.split(/class="mb[\s"]/);
  // El primer trozo es lo que había ANTES de la primera tarjeta.
  for (let i = 1; i < trozos.length; i++) {
    const t = trozos[i];
    const href = /href="(\/video-[A-Za-z0-9]+\/[^"]*)"/.exec(t);
    if (!href) continue;
    const ruta = href[1];
    if (vistos.has(ruta)) continue;

    const img = /<img[^>]+src="(https?:\/\/[^"]+)"/.exec(t);
    const alt = /<img[^>]+alt="([^"]*)"/.exec(t);
    const tit = /class="mbtit"[^>]*>\s*<a[^>]*>([\s\S]{1,300}?)<\/a>/.exec(t);
    const titulo = _decode(alt?.[1] || '') || _stripTags(tit?.[1] || '');
    if (!titulo) continue;

    const calidad = /class="mvhdico"[^>]*>\s*<span[^>]*>([^<]{1,20})</.exec(t);
    const dur = /class="mbtim"[^>]*>([^<]{1,12})</.exec(t);
    const rate = /class="mbrate"[^>]*>\s*(\d{1,3})\s*%/.exec(t);

    const altura = _alturaDe(calidad?.[1]);
    const segundos = _segundosDe(dur?.[1]);

    vistos.add(ruta);
    items.push({
      title: titulo,
      url: `${BASE}${ruta}`,
      cover: img ? _decode(img[1]) : undefined,
      headers: HEADERS,
      // Lo que se ve bajo el título en la tarjeta: cuánto dura y en qué
      // calidad está, que es lo que se mira antes de abrir un vídeo.
      update: [dur?.[1]?.trim(), calidad?.[1]?.trim()]
        .filter((x) => x)
        .join(' · ') || undefined,
      // El sitio puntúa de 0 a 100 y el contrato del SDK es de 0 a 10.
      rating: rate ? Number(rate[1]) / 10 : undefined,
      _altura: altura,
      _segundos: segundos,
    });
  }
  return items;
}

// ─── Filtros ─────────────────────────────────────────────────────────────────

// Las 87 categorías del sitio, sacadas de /cats/. Van escritas acá y no se
// piden en cada arranque: son una lista estable y pedirlas costaría un viaje
// más cada vez que se abre el panel de filtros.
const CATEGORIAS: Record<string, string> = {
  '': 'Todas',
  'all': 'Todos los vídeos',
  '4k-porn': '4K Ultra HD',
  '60fps': '60 FPS',
  'hd-1080p': 'HD 1080p',
  'hd-sex': 'HD',
  'hq-porn': 'Alta calidad',
  'vr-porn': 'VR',
  'ai': 'IA',
  'amateur': 'Amateur',
  'anal': 'Anal',
  'asian': 'Asiático',
  'asmr': 'ASMR',
  'bbw': 'BBW',
  'bdsm': 'BDSM',
  'big-ass': 'Big Ass',
  'big-dick': 'Big Dick',
  'big-tits': 'Big Tits',
  'bisexual': 'Bisexual',
  'blonde': 'Rubias',
  'blowjob': 'Blowjob',
  'bondage': 'Bondage',
  'brunette': 'Morenas',
  'bukkake': 'Bukkake',
  'casting': 'Casting',
  'compilation': 'Recopilaciones',
  'cosplay': 'Cosplay',
  'creampie': 'Creampie',
  'cuckold': 'Cuckold',
  'cumshot': 'Cumshot',
  'doctor': 'Doctor',
  'double-penetration': 'Doble penetración',
  'ebony': 'Ebony',
  'fat': 'Gorditas',
  'fetish': 'Fetiche',
  'fisting': 'Fisting',
  'footjob': 'Footjob',
  'for-women': 'Para ellas',
  'gay': 'Gay',
  'gloryhole': 'Gloryhole',
  'group-sex': 'Sexo en grupo',
  'handjob': 'Handjob',
  'hardcore': 'Hardcore',
  'hentai': 'Hentai',
  'homemade': 'Casero',
  'hotel': 'Hotel',
  'hotwife': 'Hotwife',
  'housewives': 'Amas de casa',
  'indian': 'Indio',
  'indonesia': 'Indonesia',
  'interracial': 'Interracial',
  'japanese': 'Japonés',
  'latina': 'Latinas',
  'lesbians': 'Lesbianas',
  'lingerie': 'Lencería',
  'massage': 'Masajes',
  'masturbation': 'Masturbación',
  'mature': 'Maduras',
  'milf': 'MILF',
  'nurse': 'Enfermeras',
  'office': 'Oficina',
  'old-man': 'Mayores',
  'orgy': 'Orgías',
  'outdoor': 'Exteriores',
  'pawg': 'PAWG',
  'petite': 'Petite',
  'pinay': 'Pinay',
  'pornstar': 'Actrices',
  'pov-porn': 'POV',
  'pregnant': 'Embarazadas',
  'public': 'Público',
  'redhead': 'Pelirrojas',
  'shemale': 'Shemale',
  'sleep': 'Durmiendo',
  'small-tits': 'Small Tits',
  'squirt': 'Squirt',
  'stepmom': 'Madrastras',
  'stepsister': 'Hermanastras',
  'striptease': 'Striptease',
  'students': 'Estudiantes',
  'swingers': 'Swingers',
  'teens': 'Teen',
  'threesome': 'Tríos',
  'toys': 'Juguetes',
  'uniform': 'Uniformes',
  'vintage': 'Vintage',
  'webcam': 'Webcam',
};

// Altura mínima en píxeles que exige cada opción de calidad. El valor es el
// mismo que espera el sitio en ?quality=, así que sirve para las dos cosas.
const CALIDADES: Record<string, string> = {
  '': 'Cualquiera',
  '720': '720p o más',
  '1080': '1080p o más',
  '2160': '4K',
};

// Rango en minutos, "desde-hasta". Vacío en un extremo = sin límite.
const DURACIONES: Record<string, string> = {
  '': 'Cualquiera',
  '0-10': 'Menos de 10 min',
  '10-30': 'De 10 a 30 min',
  '30-60': 'De 30 min a 1 h',
  '60-': 'Más de 1 hora',
};

// El orden va como TRAMO DE RUTA y no como parámetro: el propio sitio enlaza
// /tag/<algo>/longest/ desde su barra de ordenación. Vacío = lo más reciente,
// que es el orden por defecto de cada listado.
const ORDENES: Record<string, string> = {
  '': 'Más recientes',
  'top-rated': 'Mejor valorados',
  'most-popular': 'Más vistos',
  'longest': 'Más largos',
};

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    categoria: {
      title: 'Categoría',
      options: CATEGORIAS,
      default: '',
      min: 1,
      max: 1,
    },
    calidad: { title: 'Calidad', options: CALIDADES, default: '', min: 1, max: 1 },
    duracion: {
      title: 'Duración',
      options: DURACIONES,
      default: '',
      min: 1,
      max: 1,
    },
    orden: { title: 'Ordenar por', options: ORDENES, default: '', min: 1, max: 1 },
  };
}

// ─── Consulta ────────────────────────────────────────────────────────────────

function _uno(filter: Record<string, string[]> | undefined, k: string): string {
  return filter?.[k]?.[0] ?? '';
}

/// Arma la ruta del listado.
///
/// El sitio tiene tres formas de listar y las tres se paginan igual, con el
/// número al final: búsqueda por texto, categoría, y el catálogo completo. El
/// orden va en medio, como un tramo más de la ruta.
function _ruta(
  page: number,
  keyword: string,
  filter?: Record<string, string[]>,
): string {
  const orden = _uno(filter, 'orden');
  const categoria = _uno(filter, 'categoria');

  let base: string;
  if (keyword.trim()) {
    base = `/search/${encodeURIComponent(keyword.trim())}`;
  } else if (categoria) {
    base = `/cat/${categoria}`;
  } else {
    base = '/cat/all';
  }
  if (orden) base += `/${orden}`;
  base += `/${page}/`;

  // Los mismos filtros se le piden TAMBIÉN al sitio, además de comprobarse acá
  // (ver _cumple). Cuando el sitio los respeta, las páginas vienen ya llenas de
  // lo que se busca en vez de traer veinte resultados para descartar
  // diecisiete.
  const q: string[] = [];
  const calidad = _uno(filter, 'calidad');
  if (calidad) q.push(`quality=${encodeURIComponent(calidad)}`);
  const duracion = _uno(filter, 'duracion');
  if (duracion) {
    const [min, max] = duracion.split('-');
    if (min) q.push(`durationmin=${encodeURIComponent(min)}`);
    if (max) q.push(`durationmax=${encodeURIComponent(max)}`);
  }
  return q.length ? `${base}?${q.join('&')}` : base;
}

/// ¿Esta tarjeta cumple los filtros de calidad y duración?
///
/// Se comprueba acá aunque ya se le pidan al sitio, porque el sitio no siempre
/// los aplica: medido, ?quality= cambia los resultados en las páginas de
/// categoría pero no en las de búsqueda. Sin esta comprobación, filtrar por 4K
/// desde el buscador devolvía la lista entera y el filtro parecía roto.
///
/// La tarjeta trae los dos datos, así que la comprobación es exacta y no cuesta
/// ni un pedido más.
function _cumple(it: _Tarjeta, filter?: Record<string, string[]>): boolean {
  const calidad = _uno(filter, 'calidad');
  if (calidad) {
    // Sin insignia de calidad no se descarta: hay tarjetas que no la traen y
    // tirarlas dejaría fuera vídeos que quizá sí cumplen.
    if (it._altura > 0 && it._altura < Number(calidad)) return false;
  }
  const duracion = _uno(filter, 'duracion');
  if (duracion && it._segundos > 0) {
    const [min, max] = duracion.split('-');
    if (min && it._segundos < Number(min) * 60) return false;
    if (max && it._segundos > Number(max) * 60) return false;
  }
  return true;
}

/// Quita los campos internos antes de devolver al cliente.
function _limpiar(items: _Tarjeta[]): PrismItem[] {
  return items.map((it) => {
    const { _altura, _segundos, ...resto } = it;
    return resto;
  });
}

// Hasta cuántas páginas del sitio se piden para llenar UNA página de
// resultados. Con un filtro exigente —4K sobre una búsqueda, donde el sitio no
// filtra— una página puede quedar en dos o tres resultados y parecer que no hay
// nada. Con tres intentos se junta bastante sin que la espera se note.
const PAGINAS_POR_TANDA = 3;
const MINIMO_DESEABLE = 12;

async function _listar(
  page: number,
  keyword: string,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const hayFiltro = !!(_uno(filter, 'calidad') || _uno(filter, 'duracion'));
  const salida: _Tarjeta[] = [];
  const vistos = new Set<string>();

  for (let i = 0; i < (hayFiltro ? PAGINAS_POR_TANDA : 1); i++) {
    const html = await _get(_ruta(page + i, keyword, filter));
    const lote = _itemsDe(html);
    // Página vacía: se acabó el listado, no tiene sentido seguir pidiendo.
    if (lote.length === 0) break;
    for (const it of lote) {
      if (vistos.has(it.url)) continue;
      vistos.add(it.url);
      if (_cumple(it, filter)) salida.push(it);
    }
    if (salida.length >= MINIMO_DESEABLE) break;
  }
  return _limpiar(salida);
}

export async function latest(page: number): Promise<PrismItem[]> {
  return _listar(page, '');
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  return _listar(page, keyword || '', filter);
}

// ─── Detalle ─────────────────────────────────────────────────────────────────

function _jsonLd(html: string): string {
  // Puede haber varios bloques ld+json (organización, migas, vídeo). Se busca
  // el del vídeo por su @type en vez de quedarse con el primero.
  for (const m of html.matchAll(
    /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    if (m[1].indexOf('VideoObject') !== -1) return m[1];
  }
  return '';
}

export async function detail(url: string): Promise<PrismDetail> {
  const html = await _get(url);
  const ld = _jsonLd(html);

  const title =
    _decode(/"name":\s*"((?:[^"\\]|\\.)*)"/.exec(ld)?.[1] || '')
      .replace(/\\"/g, '"') ||
    _decode(/<h1[^>]*>([\s\S]{1,200}?)<\/h1>/.exec(html)?.[1] || '')
      .replace(/\s+/g, ' ')
      .trim() ||
    'Vídeo';

  // Se usa la PRIMERA miniatura del JSON-LD, no la última.
  //
  // El JSON-LD trae dos: la del CDN de miniaturas y otra que el sitio genera a
  // pedido a la resolución completa del vídeo. Se estaba tomando la generada
  // por ser más grande, y eso hacía que abrir una ficha se sintiera lento:
  // medido, 269 KB y más de un segundo, contra 34 KB de la del CDN. Ocho veces
  // más peso para una imagen que se muestra de fondo, desenfocada y recortada.
  //
  // Y encima es la MISMA que ya trae la tarjeta del listado, así que al abrir
  // desde el catálogo la imagen suele estar ya en memoria y aparece de una.
  const thumbs = /"thumbnailUrl":\s*\[([^\]]*)\]/.exec(ld)?.[1] || '';
  const urls = [...thumbs.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const cover =
    urls.find((u) => u.indexOf('imggen') === -1) ||
    urls[0] ||
    /"image":\s*"([^"]+)"/.exec(ld)?.[1] ||
    /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/.exec(html)?.[1];

  // Categorías y etiquetas de la ficha: son los enlaces /cat/ y /tag/ del
  // bloque de arriba del vídeo.
  const genres: string[] = [];
  for (const re of [
    /href="\/cat\/[a-z0-9-]+\/"[^>]*>([^<]{1,40})</g,
    /href="\/tag\/[a-z0-9-]+\/"[^>]*>([^<]{1,40})</g,
  ]) {
    for (const m of html.matchAll(re)) {
      const g = _decode(m[1]).replace(/\s+/g, ' ').trim();
      if (g && genres.indexOf(g) === -1) genres.push(g);
      if (genres.length >= 24) break;
    }
  }

  const rating = Number(/"ratingValue":\s*"?(\d+)/.exec(ld)?.[1] || '0');
  const anio = /"uploadDate":\s*"(\d{4})/.exec(ld)?.[1];

  const extra: Record<string, string> = {};
  const w = /"width":\s*"?(\d+)/.exec(ld)?.[1];
  const h = /"height":\s*"?(\d+)/.exec(ld)?.[1];
  if (w && h) extra['Resolución'] = `${w}x${h}`;
  const vistas = /"userInteractionCount":\s*(\d+)/.exec(ld)?.[1];
  if (vistas) extra['Vistas'] = Number(vistas).toLocaleString('es');
  const actores = [...(ld.matchAll(/"actor":\s*\[([\s\S]*?)\]/g) || [])][0]?.[1];
  if (actores) {
    const nombres = [...actores.matchAll(/"name":\s*"([^"]+)"/g)].map((m) =>
      _decode(m[1]),
    );
    if (nombres.length) extra['Actores'] = nombres.join(', ');
  }
  // La descripción del sitio es una lista de palabras clave separadas por
  // comas, no una sinopsis. Se muestran las calidades disponibles, que es lo
  // único de ahí que sirve de verdad para decidir.
  const desc = /<meta[^>]+name="description"[^>]+content="([^"]*)"/.exec(html)?.[1];
  const calidades = /available in:\s*([^."]+)/i.exec(desc || '')?.[1];
  if (calidades) extra['Calidades'] = calidades.trim();

  // Duración en formato ISO 8601 ("PT0H39M3S").
  const mDur = /"duration":\s*"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/.exec(ld);
  const segundos = mDur
    ? Number(mDur[1] || 0) * 3600 + Number(mDur[2] || 0) * 60 + Number(mDur[3] || 0)
    : undefined;

  return {
    title,
    cover,
    // Sin sinopsis de verdad: lo que hay son palabras clave, y ya van como
    // géneros. Repetirlas como descripción sería llenar la ficha de ruido.
    description: '',
    // Un vídeo suelto, no una serie: una sola entrada para reproducir. El
    // cliente necesita al menos una para habilitar el botón.
    episodes: [
      {
        title: 'Reproducir',
        url,
        thumbnail: cover,
        duration: segundos,
        number: 1,
      },
    ],
    genres,
    rating: rating ? rating / 10 : undefined,
    year: anio ? Number(anio) : undefined,
    extra,
    headers: HEADERS,
  };
}

// ─── Reproducción ────────────────────────────────────────────────────────────

/// Traduce el hash de la página al que espera el servidor de fuentes.
///
/// La página trae EP.video.player.hash: 32 caracteres hexadecimales. El
/// reproductor del sitio lo parte en CUATRO tramos de ocho, lee cada tramo como
/// un número hexadecimal y lo reescribe en base 36, y concatena los cuatro.
/// Mandar el hash tal cual no sirve.
function _hashDelReproductor(hash: string): string {
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += parseInt(hash.slice(i * 8, i * 8 + 8), 16).toString(36);
  }
  return out;
}

export async function watch(url: string): Promise<PrismWatch> {
  const html = await _get(url);

  const vid = /EP\.video\.player\.vid\s*=\s*'([^']+)'/.exec(html)?.[1];
  const hash = /EP\.video\.player\.hash\s*=\s*'([0-9a-f]{32})'/.exec(html)?.[1];

  // Sin los datos del reproductor no se puede pedir nada firmado. Se cae al
  // WebView sobre la propia página, que es el respaldo universal del cliente.
  if (!vid || !hash) {
    return {
      streams: [],
      pageUrl: url,
      reason: 'js_eval_required',
      headers: HEADERS,
    };
  }

  // OJO con la url que devuelve esto: lleva la IP de quien la pide y una marca
  // de tiempo adentro, o sea que caduca y solo sirve en este dispositivo.
  // Tiene que pedirse al reproducir y NO puede guardarse en historial ni en
  // favoritos — por eso la identidad del vídeo es la url de la página y nunca
  // la del stream.
  const consulta =
    `/xhr/video/${encodeURIComponent(vid)}` +
    `?hash=${_hashDelReproductor(hash)}&domain=www.eporner.com` +
    `&fallback=false&embed=false&supportedFormats=dash,mp4`;

  let fuentes: Record<string, unknown> = {};
  try {
    const datos = JSON.parse(await _get(consulta));
    fuentes = (datos?.sources?.mp4 as Record<string, unknown>) || {};
  } catch {
    // Respuesta inesperada (mantenimiento, bloqueo por región): el WebView de
    // abajo sigue siendo una salida válida.
  }

  const streams: PrismStream[] = [];
  for (const etiqueta of Object.keys(fuentes)) {
    const v = fuentes[etiqueta] as { src?: string } | string;
    const src = typeof v === 'string' ? v : v?.src;
    if (!src || src.indexOf('http') !== 0) continue;
    streams.push({
      url: src,
      // La etiqueta viene ya legible del sitio: "2160p(4K) HD", "1080p HD"...
      quality: etiqueta.trim(),
      label: etiqueta.trim(),
      mimeType: 'video/mp4',
      headers: HEADERS,
    });
  }

  // De mayor a menor, para que el selector abra con la mejor arriba y el
  // cliente tome esa por defecto. El sitio las devuelve en ese orden, pero
  // depender del orden en que venga un JSON es pedir que se rompa solo.
  streams.sort((a, b) => _alturaDe(b.quality) - _alturaDe(a.quality));

  return {
    streams,
    // Se manda SIEMPRE, no solo cuando no hay streams: si una url firmada
    // caduca entre que se pide y se reproduce, el cliente tiene con qué
    // reintentar sin volver a fallar del todo.
    pageUrl: url,
    headers: HEADERS,
    reason: streams.length === 0 ? 'js_eval_required' : undefined,
  };
}

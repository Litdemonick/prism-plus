import { DESKTOP_UA } from '../../sdk/http';
import { decodeEntities } from '../../sdk/html';
import { createCache, TTL } from '../../sdk/cache';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://hqporner.com';

async function _get(url: string): Promise<string> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([
      url,
      { method: 'get', headers: { Referer: `${BASE}/`, 'User-Agent': DESKTOP_UA } },
    ]),
  );
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Las URLs del sitio y de sus CDN vienen sin esquema (`//host/...`). */
function _conEsquema(u: string): string {
  if (u.indexOf('//') === 0) return `https:${u}`;
  if (u.indexOf('http') === 0) return u;
  return `${BASE}${u.startsWith('/') ? '' : '/'}${u}`;
}

// ─── Listados ───────────────────────────────────────────────────────────────

/**
 * Tarjetas de cualquier listado (portada, busqueda o categoria).
 *
 * La portada NO esta en un `<img src>`: el sitio la pinta por JS y la unica
 * copia en el HTML es el argumento de `defaultImage("//.../_main.jpg", ...)`
 * que usa para restaurar la imagen cuando el mouse se va de la tarjeta. Por
 * eso se lee de ahi.
 */
function _parseListado(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  const vistos: Record<string, boolean> = {};
  const re =
    /defaultImage\("([^"]+)"[\s\S]{0,4000}?<h3 class="meta-data-title"><a href="(\/hdporn\/[^"]+)"[^>]*>([^<]+)<\/a>/g;
  for (const m of html.matchAll(re)) {
    const url = `${BASE}${m[2]}`;
    if (vistos[url]) continue;
    vistos[url] = true;
    items.push({
      title: decodeEntities(m[3].trim()),
      url,
      cover: _conEsquema(m[1]),
    });
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  // La paginacion del listado va POR RUTA (/hdporn/2), no por parametro.
  const html = await _get(page > 1 ? `${BASE}/hdporn/${page}` : `${BASE}/`);
  return _parseListado(html);
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const kw = keyword.trim();
  if (kw) {
    // OJO: la busqueda pagina por PARAMETRO (?q=..&p=2), al reves que el
    // listado y que las categorias. Comprobado en vivo: usar el esquema del
    // listado devolvia siempre la primera pagina.
    const html = await _get(
      `${BASE}/?q=${encodeURIComponent(kw)}${page > 1 ? `&p=${page}` : ''}`,
    );
    return _parseListado(html);
  }
  const cat = filter?.['categoria']?.[0];
  if (cat && cat.length > 0) {
    const html = await _get(`${BASE}/category/${cat}${page > 1 ? `/${page}` : ''}`);
    return _parseListado(html);
  }
  const orden = filter?.['orden']?.[0];
  if (orden && orden.length > 0) {
    const html = await _get(`${BASE}/${orden}${page > 1 ? `/${page}` : ''}`);
    return _parseListado(html);
  }
  return latest(page);
}

// Las 64 categorias del sitio, tomadas de /categories.
const _CATEGORIA_OPTIONS: Record<string, string> = {
  '': 'Todas',
  '1080p-porn': '1080p porn HD',
  '4k-porn': '4K porn',
  '60fps-porn': '60 FPS porn',
  'amateur': 'Amateur',
  'anal-sex-hd': 'Anal',
  'asian': 'Asian',
  'babe': 'Babe',
  'bdsm': 'Bdsm',
  'beach-porn': 'Beach',
  'big-ass': 'Big ass',
  'big-dick': 'Big dick',
  'big-tits': 'Big tits',
  'bisexual': 'Bisexual',
  'blonde': 'Blonde',
  'blowjob': 'Blowjob',
  'bondage': 'Bondage',
  'brunette': 'Brunette',
  'casting': 'Casting',
  'creampie': 'Creampie',
  'cumshot': 'Cumshot',
  'deepthroat': 'Deepthroat',
  'ebony': 'Ebony',
  'fetish': 'Fetish',
  'fingering': 'Fingering',
  'fisting': 'Fisting',
  'gangbang': 'Gangbang',
  'group-sex': 'Group sex',
  'hairy-pussy': 'Hairy pussy',
  'handjob': 'Handjob',
  'hentai': 'Hentai',
  'interracial': 'Interracial',
  'japanese-girls-porn': 'Japanese',
  'latina': 'Latina',
  'lesbian': 'Lesbian',
  'long-hair': 'Long hair',
  'masturbation': 'Masturbation',
  'mature': 'Mature',
  'milf': 'Milf',
  'moaning': 'Moaning',
  'old-and-young': 'Old and young',
  'orgasm': 'Orgasm',
  'orgy': 'Orgy',
  'outdoor': 'Outdoor',
  'pickup': 'Pickup',
  'pov': 'Pov',
  'public': 'Public',
  'pussy-licking': 'Pussy licking',
  'redhead': 'Redhead',
  'russian': 'Russian',
  'porn-massage': 'Sex massage',
  'sex-parties': 'Sex party',
  'shaved-pussy': 'Shaved pussy',
  'shemale': 'Shemale',
  'small-tits': 'Small tits',
  'squeezing-tits': 'Squeezing tits',
  'squirt': 'Squirt',
  'stockings': 'Stockings',
  'tattooed': 'Tattooed',
  'teen-porn': 'Teen porn',
  'threesome': 'Threesome',
  'undressing': 'Undressing',
  'uniforms': 'Uniforms',
  'vibrator': 'Vibrator',
  'vintage': 'Vintage',
};

const _ORDEN_OPTIONS: Record<string, string> = {
  '': 'Recientes',
  'top/week': 'Top de la semana',
  'top/month': 'Top del mes',
  'top': 'Top de siempre',
};

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    categoria: { title: 'Categoria', options: _CATEGORIA_OPTIONS, default: '', min: 1, max: 1 },
    orden: { title: 'Orden', options: _ORDEN_OPTIONS, default: '', min: 1, max: 1 },
  };
}

// ─── Ficha ──────────────────────────────────────────────────────────────────

export async function detail(url: string): Promise<PrismDetail> {
  const html = await _get(url);

  const title = decodeEntities(
    (/<h1[^>]*>([\s\S]{2,120}?)<\/h1>/.exec(html)?.[1] ?? '').trim(),
  );

  const genres: string[] = [];
  for (const m of html.matchAll(/href="\/(?:category|actress)\/[^"]+"[^>]*>\s*([^<]{2,40}?)\s*</g)) {
    const g = decodeEntities(m[1].trim());
    if (g && genres.indexOf(g) === -1) genres.push(g);
  }

  // La portada del video actual NO esta en esta pagina: los `defaultImage(...)`
  // que hay son de la tira de "relacionados" de abajo, asi que tomar el primero
  // pondria la miniatura de OTRO video (comprobado: el primero que aparece en
  // la ficha de un video corresponde a uno distinto).
  //
  // La verdadera es el poster del reproductor, y para eso hay que entrar al
  // iframe. Es un pedido de mas en la ficha, pero es la unica copia correcta y
  // sin ella el cliente muestra la entrada sin imagen.
  const cover = await _portadaDelReproductor(html);

  return {
    title,
    cover,
    description: '',
    genres,
    // Un video suelto, no una serie: una sola entrada para reproducir.
    episodes: [{ title: 'Reproducir', url, thumbnail: cover, number: 1 }],
  };
}

/**
 * La pagina del reproductor, guardada un rato.
 *
 * Hace falta DOS veces seguidas —la ficha la pide para la portada y watch()
 * para las fuentes— y es el pedido caro de las dos: medido, 690 ms de los 947
 * que tardaba la ficha, para traer 6 KB. Es lento por el saludo TLS contra un
 * host nuevo, no por el tamaño.
 *
 * Guardandola, tocar "Reproducir" ya no vuelve a pagar esa espera. El TTL es
 * el de los detalles y no el de las fuentes: lo que se guarda es la PAGINA,
 * cuyas URLs de video son fijas (sin firma ni caducidad, ver watch), asi que
 * no hay nada que se venza adentro.
 */
const _cachePlayer = createCache();

async function _paginaDelReproductor(iframe: string): Promise<string> {
  const url = _conEsquema(iframe);
  const guardada = _cachePlayer.get<string>(url);
  if (guardada) return guardada;
  const html = await _get(url);
  _cachePlayer.set(url, html, TTL.DETAIL);
  return html;
}

/**
 * Cuánto se espera como MUCHO por la portada, en milisegundos.
 *
 * La página del reproductor pesa 6 KB pero tarda: medido, 690 ms una vez y
 * 1141 ms otra, y eso era el 85% de lo que tardaba la ficha entera. Es el
 * saludo TLS contra ese host, no el tamaño, así que no hay nada que optimizar
 * del lado nuestro salvo dejar de esperarla.
 *
 * Con el límite: si contesta rápido, la ficha muestra la portada exacta del
 * vídeo; si se hace la lenta, se abre igual y el cliente se queda con la
 * portada que ya traía del listado. Antes se esperaba lo que hiciera falta y la
 * tarjeta quedaba vacía todo ese rato.
 */
const _ESPERA_PORTADA = 1200;

/** El `poster` del `<video>` del reproductor: la portada real del video. */
async function _portadaDelReproductor(htmlFicha: string): Promise<string | undefined> {
  const iframe = _iframeDelReproductor(htmlFicha);
  if (!iframe) return undefined;
  try {
    const player = await _conLimite(_paginaDelReproductor(iframe), _ESPERA_PORTADA);
    if (!player) return undefined;
    // Las comillas vienen escapadas porque el <video> se arma desde JS.
    const m = /poster=\\?"([^"\\]+)\\?"/.exec(player);
    return m ? _conEsquema(m[1]) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Devuelve null si tarda más de `ms`, sin cortar el pedido.
 *
 * A propósito NO se cancela: el pedido sigue y, cuando termina, queda guardado.
 * Así la ficha no espera, pero tocar "Reproducir" un segundo después ya lo
 * encuentra hecho en vez de arrancarlo de cero.
 */
function _conLimite<T>(promesa: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promesa,
    new Promise<null>((resolver) => setTimeout(() => resolver(null), ms)),
  ]);
}

/** El iframe del reproductor dentro de la ficha, si lo hay. */
function _iframeDelReproductor(html: string): string | undefined {
  return /<iframe[^>]+src="(\/\/[^"]*\/video\/[^"]*)"/.exec(html)?.[1];
}

// ─── Reproduccion ───────────────────────────────────────────────────────────

/**
 * El video sale del iframe del reproductor, en MP4 y por calidades.
 *
 * La ficha embebe un reproductor externo (mydaddy.cc y parientes) cuya pagina
 * lista las fuentes en texto plano:
 *
 *   <source src="//host/xxx/720.mp4" title="720p60" type="video/mp4" />
 *
 * Sin ofuscacion, sin tokens y sin caducidad. Medido en vivo: las tres
 * calidades responden 206 con `video/mp4` a 7-9 Mbps y aceptan pedir bytes del
 * medio del archivo, o sea que se puede cambiar de minuto.
 *
 * OJO con el bloqueador de anuncios: la pagina del reproductor comprueba si hay
 * uno y, cuando lo detecta, arma el `<video>` con UNA sola fuente de 360p en
 * vez de las tres. Nosotros no ejecutamos su JS —leemos el HTML— asi que
 * siempre vemos la lista completa; pero si algun dia esto se resolviera dentro
 * de un navegador con bloqueador, se perderian 720p y 1080p.
 */
export async function watch(url: string): Promise<PrismWatch> {
  const html = await _get(url);

  const iframe = _iframeDelReproductor(html);
  if (!iframe) {
    // Sin reproductor no hay nada que resolver: se deja la propia pagina para
    // que el cliente la abra en el navegador interno.
    return { streams: [], pageUrl: url };
  }

  // Reutiliza la que ya bajo la ficha, si sigue guardada: es el pedido lento
  // de los dos y sin esto se paga entero otra vez al tocar Reproducir.
  const player = await _paginaDelReproductor(iframe);
  const streams: PrismStream[] = [];
  const vistas: Record<string, boolean> = {};
  for (const m of player.matchAll(
    // Las comillas vienen ESCAPADAS: el reproductor arma el <video> desde
    // JavaScript, asi que en el HTML el texto real es src=\"...\". El \\? de
    // cada lado acepta con y sin barra, por si alguna variante lo sirve plano.
    /<source[^>]+src=\\?"([^"\\]+\.mp4)\\?"[^>]*title=\\?"([^"\\]+)\\?"/g,
  )) {
    const fuente = _conEsquema(m[1]);
    if (vistas[fuente]) continue;
    vistas[fuente] = true;
    streams.push({
      url: fuente,
      quality: m[2].trim(),
      headers: { Referer: _conEsquema(iframe) },
    });
  }

  if (streams.length === 0) return { streams: [], pageUrl: url };

  // De mayor a menor: el cliente toma la primera como predeterminada y en el
  // HTML vienen al reves (360 primero).
  streams.sort((a, b) => _altura(b.quality) - _altura(a.quality));
  return { streams, pageUrl: url };
}

/** "1080p60" -> 1080, para poder ordenar las calidades. */
function _altura(etiqueta: string | undefined): number {
  const m = /(\d{3,4})/.exec(etiqueta || '');
  return m ? parseInt(m[1], 10) : 0;
}

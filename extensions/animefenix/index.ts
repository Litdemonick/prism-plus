import { stripTags, decodeEntities } from '../../sdk/html';
import { resolveEmbed, b64decode } from '../../sdk/embeds';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream, PrismEpisode } from '../../sdk/types';

// sendMessage("request", ...) usa el dio de PrismHub (UA/cookies/redirecciones
// reales de la app) — confirmado esta sesión que el fetch() del polyfill de
// flutter_js se cuelga contra varios hosts (usado antes por sdk/embeds.ts,
// ya arreglado ahí). Esta extensión usa sendMessage desde el principio.
declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://animefenix2.tv';

// re.ironhentai.com (backend de los servidores "PremiuVIP"/"PlusTube") devuelve
// 406 Not Acceptable sin un header Accept realista de navegador — confirmado
// en vivo (curl con Accept:*/* -> 406, con el Accept completo de Chrome -> 200).
const _BROWSER_ACCEPT: Record<string, string> = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9',
};

async function _get(url: string, extraHeaders?: Record<string, string>): Promise<string> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([
      url,
      { method: 'get', headers: { Referer: `${BASE}/`, ...(extraHeaders ?? {}) } },
    ]),
  );
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function _buildQuery(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value) parts.push(`${key}=${encodeURIComponent(value)}`);
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
    /<a href="(\/[a-z0-9-]+)">\s*<figure>\s*<span class="tipo">([^<]*)<\/span>\s*<span class="estreno">([^<]*)<\/span>[\s\S]*?<p class="gray">([^<]*)<\/p>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<\/figure>\s*<p>([^<]+)<\/p>/g;
  for (const m of html.matchAll(re)) {
    const year = parseInt(m[3].trim(), 10);
    items.push({
      title: decodeEntities(m[6].trim()),
      url: `${BASE}${m[1]}`,
      cover: m[5],
      update: m[4]?.trim() ? decodeEntities(m[4].trim()) : undefined,
      year: Number.isFinite(year) ? year : undefined,
      tags: m[2]?.trim() ? [decodeEntities(m[2].trim())] : undefined,
    });
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  const query = _buildQuery({ p: page > 1 ? String(page) : undefined });
  const html = await _get(`${BASE}/directorio/anime${query ? `?${query}` : ''}`);
  return _parseCatalog(html);
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const query = _buildQuery({
    q: keyword.trim() || undefined,
    genero: filter?.['genero']?.[0],
    tipo: filter?.['tipo']?.[0],
    estado: filter?.['estado']?.[0],
    p: page > 1 ? String(page) : undefined,
  });
  const html = await _get(`${BASE}/directorio/anime${query ? `?${query}` : ''}`);
  return _parseCatalog(html);
}

// Listas agregadas en vivo desde el <select> real del formulario de filtros
// del catálogo (confirmado en vivo, ?genero=/?tipo=/?estado= funcionan).
const _GENRE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  '1': 'Acción',
  '2': 'Escolares',
  '3': 'Romance',
  '4': 'Shoujo',
  '5': 'Comedia',
  '6': 'Drama',
  '7': 'Seinen',
  '8': 'Deportes',
  '9': 'Shounen',
  '10': 'Recuentos de la vida',
  '11': 'Ecchi',
  '12': 'Sobrenatural',
  '13': 'Fantasía',
  '14': 'Magia',
  '15': 'Superpoderes',
  '16': 'Demencia',
  '17': 'Misterio',
  '18': 'Psicológico',
  '19': 'Suspenso',
  '20': 'Ciencia Ficción',
  '21': 'Mecha',
  '22': 'Militar',
  '23': 'Aventuras',
  '24': 'Historico',
  '25': 'Infantil',
  '26': 'Artes Marciales',
  '27': 'Terror',
  '28': 'Harem',
};

const _TYPE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  '1': 'TV Anime',
  '2': 'Película',
  '3': 'OVA',
  '4': 'Especial',
  '9': 'Serie',
  '11': 'Dorama',
  '14': 'Corto',
  '15': 'Donghua',
};

const _STATUS_OPTIONS: Record<string, string> = {
  '': 'Todos',
  '1': 'Finalizado',
  '2': 'En emisión',
  '3': 'Próximamente',
};

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    genero: { title: 'Género', options: _GENRE_OPTIONS, default: '', min: 1, max: 1 },
    tipo: { title: 'Tipo', options: _TYPE_OPTIONS, default: '', min: 1, max: 1 },
    estado: { title: 'Estado', options: _STATUS_OPTIONS, default: '', min: 1, max: 1 },
  };
}

// ─── Detalle ────────────────────────────────────────────────────────────────

export async function detail(url: string): Promise<PrismDetail> {
  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  const slug = fullUrl.replace(`${BASE}/`, '').replace(/\/$/, '');

  const title = /<h1[^>]*>([^<]+)<\/h1>/i.exec(html)?.[1]?.trim() ?? '';
  const cover = /property="og:image"\s+content="([^"]+)"/i.exec(html)?.[1];
  const description = stripTags(
    /Sinopsis<\/h2>\s*<p[^>]*>([^<]*)<\/p>/i.exec(html)?.[1] ?? '',
  ).trim();

  const genres: string[] = [];
  const generosBlockM = /Géneros<\/h2>([\s\S]*?)<!--/i.exec(html);
  if (generosBlockM) {
    for (const m of generosBlockM[1].matchAll(/genero=\d+"[^>]*>\s*([^<]+?)\s*</g)) {
      genres.push(decodeEntities(m[1].trim()));
    }
  }

  // La lista de episodios se carga por AJAX en tandas fijas de 16
  // (confirmado en vivo: botones "1-16","17-32"...) — se pide página por
  // página hasta que una tanda devuelve menos de 16 (última página).
  const episodes: PrismEpisode[] = [];
  const epRe = /<a href="(\/ver\/[^"]+)" class="episode-card">[\s\S]*?<span class="ep-title">([^<]+)<\/span>/g;
  let start = 0;
  for (let page = 0; page < 60; page++) {
    const chunk = await _get(`${fullUrl}?id=${slug}&load=episodes&start=${start}`);
    let found = 0;
    for (const m of chunk.matchAll(epRe)) {
      episodes.push({ title: decodeEntities(m[2].trim()), url: `${BASE}${m[1]}` });
      found++;
    }
    if (found === 0) break;
    start += 16;
    if (found < 16) break;
  }

  return { title, cover, description, genres, episodes };
}

// ─── Reproducción ───────────────────────────────────────────────────────────

// streamhls.to ("SaveFiles") es la MISMA red que savefiles.top/.com — un
// formulario POST a /dl estilo Openload (op/file_code/referer), sin resolver
// del SDK que lo cubra. Confirmado en vivo (misma imagen "img.savefiles.com"
// referenciada en su propio JS).
//
// StreamTape: descartado a pedido del usuario (falla siempre al abrir en la
// app real, mismo error intermitente ya visto en otras extensiones de este
// repo desde este entorno).
//
// PremiunVIP (re.ironhentai.com/hugging.php → huggingface.co): confirmado en
// vivo en la app real (2 animes distintos, mismo síntoma exacto ambas veces)
// que arranca — llega a determinar la resolución del video — pero después
// se queda cargando para siempre. La causa: huggingface.co firma la URL
// final del CDN (xet-bridge-us) con el rango de bytes EXACTO de la primera
// petición ("ByteRange" queda grabado en el Policy firmado, confirmado
// inspeccionando la redirección con curl). mpv reutiliza esa misma URL
// firmada para pedir el resto del archivo, pero la firma solo autoriza el
// rango inicial — cualquier pedido de rango distinto queda sin autorizar,
// de ahí el cuelgue eterno. Es una incompatibilidad estructural entre el
// backend de Hugging Face y el streaming progresivo por rangos que hace
// cualquier reproductor nativo — no hay resolver que pueda arreglarlo.
//
// StreamWish (flaswish.com en este sitio): confirmado en vivo que termina en
// premilkyway.com — el mismo CDN bloqueado por fingerprint TLS que streamhg
// (rechaza cualquier cliente que no sea un navegador real, ver sdk/embeds.ts
// resolveEmbed). sdk/embeds.ts ya descarta esa URL si CUALQUIER resolver
// termina ahí, pero eso solo evita el cuelgue de 20s al clickear — el botón
// no debería ni aparecer, ya que sabemos que nunca va a andar.
//
// Mp4upload: descartado a pedido del usuario — confirmado en la app real que
// su servidor (a3.mp4upload.com, puerto 183) tiene ancho de banda
// inconsistente para su conexión (a veces carga, después se traba y
// rebufferea todo el tiempo). El servidor en sí funciona bien (headers,
// soporte de rangos y velocidad de descarga verificados en vivo), es la ruta
// de red hacia ese host puntual la que no es confiable.
const _NEVER_NATIVE = new Set(['savefiles', 'streamtape', 'premiunvip', 'streamwish', 'mp4upload']);

// El mirror uqload.is que usa este sitio (a diferencia de uqload.com, que sí
// funciona en otras extensiones del repo) usa el MISMO formulario-gate POST
// /dl que streamhls/savefiles — confirmado en vivo en 2 episodios de animes
// distintos, ambos con el mismo action="/dl" op=embed/file_code/referer sin
// datos de video en el HTML estático. No es un problema de la extensión ni
// del host "Uqload" en general, es este mirror puntual.
const _NEVER_NATIVE_HOSTS = ['uqload.is'];

// PremiunVIP y PlusTube (backend re.ironhentai.com) ofuscan la URL real con
// `eval(atob(atob(X).split('').map(shift -1).join('')))` — doble base64 con
// un shift de -1 (Caesar) entre medio. Confirmado en vivo desempaquetando a
// mano: PremiunVIP da un <video src> directo (que redirige 302 a un archivo
// real en huggingface.co, sin ningún bloqueo), PlusTube da un hls.loadSource()
// con un m3u8 real de vtube.network. Ambos requieren el header Accept
// "de navegador" (ver _BROWSER_ACCEPT) o el host devuelve 406.
async function _resolveIronhentai(url: string): Promise<PrismStream | null> {
  const html = await _get(url, _BROWSER_ACCEPT);
  const m = /eval\(atob\(atob\('([A-Za-z0-9+\/=]+)'\)\.split/.exec(html);
  if (!m) return null;

  const once = b64decode(m[1]);
  const shifted = once
    .split('')
    .map((c) => String.fromCharCode(c.charCodeAt(0) - 1))
    .join('');
  const decoded = b64decode(shifted);

  const hlsM = /loadSource\('([^']+\.m3u8[^']*)'\)/.exec(decoded);
  if (hlsM) return { url: hlsM[1], quality: 'Servidor', headers: { Referer: `${BASE}/` } };

  const videoM = /videoId\s*=\s*'(https:\/\/re\.ironhentai\.com\/[^']+)'/.exec(decoded);
  if (videoM) {
    // El propio backend exige que el Referer sea la página de origen
    // (face.php), no animefenix2.tv — confirmado en vivo (con animefenix2.tv
    // de Referer, hugging.php devuelve 406; con face.php?id=..., redirige
    // 302 a un archivo real de huggingface.co).
    return {
      url: videoM[1],
      quality: 'Servidor',
      headers: { Referer: url, ..._BROWSER_ACCEPT },
    };
  }
  return null;
}

export async function watch(url: string): Promise<PrismWatch> {
  // Fast-path: embed externo (switchServer pidiendo resolver UN servidor
  // puntual) — mismo patrón que las demás extensiones de este repo.
  if (url.indexOf('http') === 0 && url.indexOf('animefenix2.tv') === -1) {
    if (url.indexOf('ironhentai.com') !== -1) {
      const res = await _resolveIronhentai(url);
      if (res) return { streams: [res], pageUrl: '' };
      return { streams: [{ url, quality: 'Servidor' }], pageUrl: '' };
    }
    try {
      const res = await resolveEmbed('Servidor', url, `${BASE}/`);
      if (res && res.url) {
        return { streams: [{ url: res.url, quality: 'Servidor', headers: res.headers }], pageUrl: '' };
      }
    } catch {
      /* sigue abajo con la URL cruda */
    }
    return { streams: [{ url, quality: 'Servidor' }], pageUrl: '' };
  }

  const episodeUrl = _fullUrl(url);
  const html = await _get(episodeUrl);

  const labels: Record<string, string> = {};
  for (const m of html.matchAll(/<a title="([^"]+)" href="#vid(\d+)">/g)) {
    labels[m[2]] = m[1].trim();
  }

  const streams: PrismStream[] = [];
  const tabRe =
    /tabsArray\['(\d+)'\]\s*=\s*"[^"]*?src='https:\/\/re\.animepelix\.net\/redirect\.php\?id=([^']+)'/g;
  for (const m of html.matchAll(tabRe)) {
    const num = m[1];
    const targetUrl = m[2];
    const name = labels[num] ?? `Servidor ${num}`;
    if (
      _NEVER_NATIVE.has(name.toLowerCase()) ||
      targetUrl.indexOf('streamhls') !== -1 ||
      _NEVER_NATIVE_HOSTS.some((h) => targetUrl.indexOf(h) !== -1)
    ) {
      continue;
    }
    streams.push({ url: targetUrl, quality: name });
  }

  return { streams, pageUrl: episodeUrl };
}

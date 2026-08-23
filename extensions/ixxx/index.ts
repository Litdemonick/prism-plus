import { DESKTOP_UA } from '../../sdk/http';
import { decodeEntities } from '../../sdk/html';
import { b64decode } from '../../sdk/embeds';
import { createCache, TTL } from '../../sdk/cache';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://www.ixxx.com';

async function _get(url: string, referer = `${BASE}/`): Promise<string> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([url, { method: 'get', headers: { Referer: referer, 'User-Agent': DESKTOP_UA } }]),
  );
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw;
  }
}

// Sin new URL(...) a propósito: ese constructor no existe en el QuickJS de
// PrismHub (ver el mismo comentario en extensions/lamovie/index.ts). Alcanza
// con el esquema y el host para el Referer que pide el CDN de destino.
function _origen(url: string): string {
  return /^https?:\/\/[^/]+/i.exec(url)?.[0] ?? url;
}

// ─── Listados ───────────────────────────────────────────────────────────────

// ixxx.com NO aloja los vídeos: es un directorio. Cada tarjeta enlaza a
// /out/?l=<blob>, un redirect que ofusca la URL real del sitio externo donde
// vive el vídeo — comprobado en vivo: en una sola página de "nuevos" aparecen
// hasta 11 dominios distintos (hugedickz, cuminstead, babepump, ebonypeek,
// juicyvid, eporner, thepornstar, fapnow, zatube, rainblow, bigbumfun).
//
// El blob es un MessagePack en base64 con la URL de destino como string
// plano adentro (comprobado decodificándolo en vivo: empieza con un array16
// y trae la URL sin ningún otro cifrado). No hace falta un parser de
// MessagePack completo — alcanza con decodificar el base64 y cortar el
// primer tramo con forma de URL: el byte de longitud del string de
// MessagePack que la precede no es un carácter válido de URL, así que corta
// justo donde tiene que cortar.
function _destinoReal(hrefOut: string): string | undefined {
  const m = /[?&]l=([^&]+)/.exec(hrefOut);
  if (!m) return undefined;
  let b64 = m[1];
  try {
    b64 = decodeURIComponent(b64);
  } catch {
    // Ya viene sin porcentaje-codificar.
  }
  const bin = b64decode(b64);
  return /https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/.exec(bin)?.[0];
}

// Tarjetas de cualquier listado (nuevos o búsqueda): todas comparten la
// clase "card sub group relative block space-y-1". Split literal, no regex,
// por lo mismo que en xvideos/index.ts: no retrocede y se comporta igual en
// cualquier motor.
// El puente sendMessage('request', ...) solo entrega el CUERPO de la
// respuesta — el status code queda del lado de Dart (ver
// extension_service.dart, jsRequest), y validateStatus:(_)=>true hace que ni
// un 403 tire excepción. Si Cloudflare interpone su verificación, esto recibe
// esa página con status 200 desde su punto de vista y no hay forma de
// distinguirla salvo mirar el propio HTML. Sin este chequeo, un bloqueo se
// leía igual que un sitio sin resultados: silencioso.
function _paginaDeVerificacion(html: string): boolean {
  return (
    html.indexOf('Just a moment') !== -1 ||
    html.indexOf('cf-chl') !== -1 ||
    html.indexOf('challenge-platform') !== -1 ||
    html.indexOf('Attention Required') !== -1
  );
}

function _parseListado(html: string): PrismItem[] {
  const marker = 'card sub group relative block space-y-1';
  if (html.indexOf(marker) === -1) {
    if (_paginaDeVerificacion(html)) {
      throw new Error(
        'ixxx.com respondió con una verificación de Cloudflare en vez del listado',
      );
    }
    // Sin el marcador de tarjeta y sin ser una verificación: es una forma de
    // página que no se reconoce. Se informa con un fragmento en vez de
    // devolver vacío en silencio, para no confundir "el sitio no tiene esto"
    // con "esto cambió y el parser quedó desactualizado".
    const titulo = /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim();
    throw new Error(
      `ixxx.com: no se encontró el marcador de tarjetas esperado (título de la página: "${titulo ?? '?'}")`,
    );
  }
  const chunks = html.split(marker);
  const items: PrismItem[] = [];
  const seen: Record<string, boolean> = {};
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const hrefOut = /href="(\/out\/\?l=[^"]+)"/.exec(chunk)?.[1];
    if (!hrefOut) continue;
    const url = _destinoReal(decodeEntities(hrefOut));
    if (!url || seen[url]) continue;

    const title = decodeEntities((/alt="([^"]*)"/.exec(chunk)?.[1] ?? '').trim());
    if (!title) continue;
    seen[url] = true;

    const cover = /src="(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/.exec(chunk)?.[1];
    // Solo las tarjetas de vídeo suelto traen minutos:segundos; las
    // promocionadas muestran una etiqueta "HD" en su lugar (comprobado en
    // vivo), así que no siempre hay duración.
    const duration = /badge[^>]*>\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*</.exec(chunk)?.[1];

    items.push({ title, url, cover, update: duration || undefined });
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  const n = page < 1 ? 1 : page;
  const html = await _get(`${BASE}/es/new${n > 1 ? `?page=${n}` : ''}`);
  return _parseListado(html);
}

export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const kw = keyword.trim();
  if (!kw) return latest(page);
  const n = page < 1 ? 1 : page;
  // La página SIEMPRE va puesta: comprobado en vivo que /es/search/{término}
  // sin número de página devuelve 302 (a veces a la ficha de categoría, si el
  // término coincide con un tag — le pasó a "latina"), mientras que
  // /es/search/{término}/1 responde 200 con los resultados reales.
  const html = await _get(`${BASE}/es/search/${encodeURIComponent(kw)}/${n}`);
  return _parseListado(html);
}

// ─── Ficha ──────────────────────────────────────────────────────────────────

// La página de destino, guardada un rato: detail() la pide para el título y
// la portada, y watch() para el stream — mismo pedido, se evita pagarlo dos
// veces (igual que hqporner con la página del iframe).
const _cacheDestino = createCache();

async function _paginaDestino(url: string): Promise<string> {
  const guardada = _cacheDestino.get<string>(url);
  if (guardada) return guardada;
  // Referer el propio ixxx.com: es de donde vendría un clic real.
  const html = await _get(url, `${BASE}/`);
  _cacheDestino.set(url, html, TTL.DETAIL);
  return html;
}

function _ogTag(html: string, prop: string): string | undefined {
  const re = new RegExp(`<meta[^>]+property="og:${prop}"[^>]+content="([^"]*)"`, 'i');
  return re.exec(html)?.[1];
}

// Cada vídeo es una pieza suelta de un sitio ajeno (no hay temporadas), así
// que el detalle expone un único "episodio" que apunta al propio vídeo.
//
// Open Graph es lo único razonablemente universal entre sitios tan distintos
// entre sí (hugedickz, cuminstead, babepump, juicyvid... comprobados en
// vivo): lo pone cada uno para que la vista previa de redes sociales
// funcione, así que está presente incluso cuando el maquetado del resto de
// la página no se parece en nada al de los demás.
export async function detail(url: string): Promise<PrismDetail> {
  const html = await _paginaDestino(url);

  const title = decodeEntities(
    _ogTag(html, 'title') ?? (/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').trim(),
  );
  const description = decodeEntities(_ogTag(html, 'description') ?? '');
  const cover = _ogTag(html, 'image');

  return {
    title,
    cover,
    description,
    episodes: [{ title: 'Reproducir', url, thumbnail: cover, number: 1 }],
  };
}

// ─── Reproducción ───────────────────────────────────────────────────────────

// Varios de los sitios a los que ixxx.com redirige (hugedickz, cuminstead y
// babepump, comprobados en vivo — probablemente más de la misma red)
// comparten la MISMA plantilla de reproductor: un <video id="np-video"> con
// un <source type="video/mp4"> sin cifrar ni ofuscar. El link es el propio
// endpoint de descarga del CDN (.../get_file/...), que responde con un
// redirect 302 a una URL firmada de corta duración — se guarda el link SIN
// firmar, no el destino del redirect, porque ese es el que no vence.
// Confirmado en vivo: 206 Partial Content, acepta Range, CORS abierto.
function _fuenteDirecta(html: string): string | undefined {
  return /<source[^>]+src="([^"]+\.mp4[^"]*)"[^>]*type="video\/mp4"/.exec(html)?.[1];
}

export async function watch(url: string): Promise<PrismWatch> {
  const html = await _paginaDestino(url);

  const directa = _fuenteDirecta(html);
  if (directa) {
    return {
      streams: [{ url: directa, quality: 'MP4', headers: { Referer: `${_origen(url)}/` } }],
      pageUrl: url,
    };
  }

  // El sitio de destino no usa la plantilla conocida (juicyvid, eporner,
  // thepornstar y varios más sirven el vídeo desde un reproductor propio con
  // JS, comprobado en vivo). En vez de mantener un resolver aparte para cada
  // uno de la decena de sitios distintos a los que ixxx.com puede mandar, se
  // deja la página para que el sniffer universal (WebView oculto, ver
  // stream_sniffer_service.dart del cliente) mire qué pide el reproductor
  // real y capture esa URL — el mecanismo que el SDK ya prevé para esto.
  return { streams: [], pageUrl: url, reason: 'js_eval_required' };
}

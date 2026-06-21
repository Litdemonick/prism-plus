import { get, getJson } from '../../sdk/http';
import { matchFirst, matchGroups, stripTags } from '../../sdk/html';
import { resolveEmbed } from '../../sdk/embeds';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream } from '../../sdk/types';

// ─── JKAnime ─────────────────────────────────────────────────────────────────
// Fuente: https://jkanime.net
// Anime en español latino con múltiples servidores por episodio.

const BASE = 'https://jkanime.net';

interface JKServer {
  remote: string | null;
  server: string;
  lang: number;   // 0=SUB, 1=LAT, 2=CAST
  slug: string;
}

/** Últimos animes actualizados */
export async function latest(page: number): Promise<PrismItem[]> {
  const html = await get(`${BASE}/directorio/${page}/desc/`);
  return _parseCards(html);
}

/** Búsqueda por título */
export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const html = await get(`${BASE}/buscar/${encodeURIComponent(keyword)}/${page}/`);
  return _parseCards(html);
}

/** Detalle del anime con lista de episodios */
export async function detail(url: string): Promise<PrismDetail> {
  const slug = _toSlug(url);
  const html = await get(`${BASE}/${slug}/`);

  // Título en .anime__details__title h3
  const title =
    matchFirst(html, /class="[^"]*anime__details__title[^"]*"[\s\S]*?<h3[^>]*>\s*([^<]+?)\s*<\/h3>/i) ||
    matchFirst(html, /<h3[^>]*class="[^"]*title[^"]*"[^>]*>\s*([^<]+?)\s*<\/h3>/i) ||
    matchFirst(html, /<h3[^>]*>\s*([^<]{3,}?)\s*<\/h3>/i) ||
    slug;

  // Portada: primer data-setbg de la página
  const rawCover = matchFirst(html, /data-setbg="([^"]+)"/i);
  const cover = rawCover ? _absUrl(rawCover) : '';

  // Descripción
  const description = stripTags(
    matchFirst(html, /class="[^"]*anime__details__text[^"]*"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) || '',
  ).trim();

  // ID del anime para la API de episodios
  const animeId = matchFirst(html, /data-anime="(\d+)"/i);

  let totalEps = 0;
  if (animeId) {
    try {
      const data = await getJson<{ last_id?: number }>(
        `${BASE}/ajax/last_episode/${animeId}/`,
      );
      totalEps = data.last_id || 0;
    } catch {
      // Si la API falla, quedamos con 0 → lista vacía
    }
  }

  const episodes: PrismEpisode[] = [];
  for (let i = 1; i <= totalEps; i++) {
    episodes.push({ title: `Episodio ${i}`, url: `${slug}/${i}`, number: i });
  }

  // Estado: "En emision" / "Finalizado"
  const statusRaw = matchFirst(html, /class="[^"]*enemision[^"]*"[^>]*>\s*([^<]+)/i);
  const status =
    statusRaw && statusRaw.indexOf('emision') !== -1
      ? ('ongoing' as const)
      : statusRaw && statusRaw.indexOf('inalizado') !== -1
        ? ('completed' as const)
        : undefined;

  const genres = matchGroups(
    html,
    /<a[^>]+href="[^"]*\/genero\/[^"]*"[^>]*>([^<]+)<\/a>/gi,
  ).map(g => g[0]);

  return {
    title,
    cover,
    description,
    episodes,
    genres,
    status,
    extra: { Estado: statusRaw ? statusRaw.trim() : '' },
  };
}

// Tipo auxiliar local (idéntico al de types.ts)
type PrismEpisode = { title: string; url: string; number?: number };

/** Streams de vídeo del episodio */
export async function watch(url: string): Promise<PrismWatch> {
  // Fast-path: embed URL de switchServer (host externo, no jkanime.net)
  if (url.indexOf('http') === 0 && url.indexOf('jkanime.net') === -1) {
    const name = _guessServerName(url);
    try {
      const resolved = await resolveEmbed(name, url, `${BASE}/`);
      if (resolved && resolved.url) {
        return {
          streams: [{ url: resolved.url, quality: name, headers: resolved.headers }],
          pageUrl: '',
        };
      }
    } catch {}
    return { streams: [], pageUrl: '' };
  }

  // Episodio: construir URL completa
  const episodeUrl =
    url.indexOf('http') === 0
      ? url
      : `${BASE}/${url.replace(/\/+$/, '')}/`;

  const html = await get(episodeUrl);

  // Extraer var servers = [...] del script embebido
  const m =
    /(?:var|let|const)\s+servers\s*=\s*(\[[\s\S]*?\]);/.exec(html) ||
    /(?:var|let|const)\s+video\s*=\s*(\[[\s\S]*?\]);/.exec(html);

  if (!m) return { streams: [], pageUrl: episodeUrl };

  let servers: JKServer[];
  try {
    servers = JSON.parse(m[1]) as JKServer[];
  } catch {
    return { streams: [], pageUrl: episodeUrl };
  }

  if (!Array.isArray(servers) || servers.length === 0) {
    return { streams: [], pageUrl: episodeUrl };
  }

  // SUB primero (lang 0), luego LAT (1), luego CAST (2)
  servers.sort((a, b) => (a.lang || 0) - (b.lang || 0));

  // Resolver todos en paralelo
  const resolved = await Promise.all(
    servers.map(s => _resolveServer(s, episodeUrl)),
  );

  const streams = resolved.filter((s): s is PrismStream => s !== null);

  // Mega siempre al final
  const isMega = (u: string) =>
    u.indexOf('mega.nz') !== -1 || u.indexOf('mega.co.nz') !== -1;

  return {
    streams: [
      ...streams.filter(s => !isMega(s.url)),
      ...streams.filter(s => isMega(s.url)),
    ],
    pageUrl: episodeUrl,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function _resolveServer(
  server: JKServer,
  pageUrl: string,
): Promise<PrismStream | null> {
  // 1. Obtener URL cruda: remote (base64) tiene prioridad sobre slug
  let raw = '';
  if (server.remote) {
    try {
      raw = _b64decode(server.remote);
    } catch {
      raw = '';
    }
  }
  if (!raw && server.slug) {
    raw =
      server.slug.indexOf('http') === 0
        ? server.slug
        : `${BASE}${server.slug}`;
  }
  if (!raw) return null;

  // 2. Resolver redirecciones internas de jkanime
  raw = _resolveRedirect(raw);

  const name = server.server || 'Embed';
  const langSuffix =
    server.lang === 1 ? ' LAT' : server.lang === 2 ? ' CAST' : '';
  const label = `${name}${langSuffix}`;
  const nameLow = name.toLowerCase();

  // 3. Mega → solo WebView (la UI de PrismHub lo intercepta antes de switchServer)
  if (raw.indexOf('mega.nz') !== -1 || raw.indexOf('mega.co.nz') !== -1) {
    return { url: raw, quality: label };
  }

  // 4. Desu → DPlayer: buscar URL del stream en la página
  if (nameLow === 'desu' || raw.indexOf('desudesuka') !== -1 || raw.indexOf('desu.') !== -1) {
    const r = await _resolveDesu(raw, pageUrl, label);
    return r !== null ? r : { url: raw, quality: label };
  }

  // 5. Magi → <source src="...m3u8">
  if (nameLow === 'magi' || raw.indexOf('magi') !== -1) {
    const r = await _resolveMagi(raw, pageUrl, label);
    return r !== null ? r : { url: raw, quality: label };
  }

  // 6. Intento general con resolveEmbed
  const serverName = _guessServerName(raw) || name;
  try {
    const res = await resolveEmbed(serverName, raw, `${BASE}/`);
    if (res && res.url) {
      return { url: res.url, quality: label, headers: res.headers };
    }
  } catch {}

  // 7. Fallback: URL cruda (PrismHub la intenta vía fast-path o WebView)
  return { url: raw, quality: label };
}

async function _resolveDesu(
  url: string,
  referer: string,
  label: string,
): Promise<PrismStream | null> {
  try {
    const html = await get(url, { Referer: referer });
    // DPlayer o JWPlayer: buscar URL de stream en config
    const stream =
      matchFirst(html, /"url"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i) ||
      matchFirst(html, /"file"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i) ||
      matchFirst(html, /"url"\s*:\s*"(https?:\/\/[^"]+\.mp4[^"]*)"/i) ||
      matchFirst(html, /<source[^>]+src="(https?:\/\/[^"]+\.m3u8[^"]*)"/i);
    if (stream) return { url: stream, quality: label };
  } catch {}
  return null;
}

async function _resolveMagi(
  url: string,
  referer: string,
  label: string,
): Promise<PrismStream | null> {
  try {
    const html = await get(url, { Referer: referer });
    const stream =
      matchFirst(html, /<source[^>]+src="(https?:\/\/[^"]+\.m3u8[^"]*)"/i) ||
      matchFirst(html, /<source[^>]+src="(https?:\/\/[^"]+\.mp4[^"]*)"/i) ||
      matchFirst(html, /source\s*:\s*['"]?(https?:\/\/[^'">\s]+\.m3u8)/i);
    if (stream) return { url: stream, quality: label };
  } catch {}
  return null;
}

/** Convierte redirecciones propias de jkanime a URLs directas de los embeds */
function _resolveRedirect(url: string): string {
  if (url.indexOf('/jkokru.php') !== -1) {
    const id = _urlParam(url, 'u');
    return id ? `http://ok.ru/videoembed/${id}` : url;
  }
  if (url.indexOf('/jkvmixdrop.php') !== -1) {
    const id = _urlParam(url, 'u');
    return id ? `https://mixdrop.ag/e/${id}` : url;
  }
  if (url.indexOf('/jksw.php') !== -1) {
    const id = _urlParam(url, 'u');
    return id ? `https://sfastwish.com/e/${id}` : url;
  }
  if (url.indexOf('/jk.php') !== -1) {
    const path = _urlParam(url, 'u');
    return path ? `${BASE}/${path}` : url;
  }
  return url;
}

function _urlParam(url: string, name: string): string {
  const re = new RegExp('[?&]' + name + '=([^&#]+)');
  const m = re.exec(url);
  return m ? decodeURIComponent(m[1]) : '';
}

/** Decodificador Base64 puro (sin atob) para QuickJS — soporta estándar y URL-safe */
function _b64decode(s: string): string {
  const T = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let r = '';
  // Normalizar URL-safe base64 (- → +, _ → /)
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  s = s.replace(/[^A-Za-z0-9+/]/g, '');
  for (let i = 0; i < s.length; i += 4) {
    const a = T.indexOf(s[i]);
    const b = T.indexOf(s[i + 1]);
    const c = T.indexOf(s[i + 2]);
    const d = T.indexOf(s[i + 3]);
    if (a < 0 || b < 0) break;
    r += String.fromCharCode((a << 2) | (b >> 4));
    if (c >= 0) r += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    if (d >= 0) r += String.fromCharCode(((c & 3) << 6) | d);
  }
  return r;
}

/** Infiere nombre de servidor a partir de la URL del embed */
function _guessServerName(url: string): string {
  const u = url.toLowerCase();
  if (u.indexOf('voe') !== -1) return 'Voe';
  if (u.indexOf('streamtape') !== -1 || u.indexOf('stape') !== -1) return 'Streamtape';
  if (u.indexOf('mixdrop') !== -1 || u.indexOf('mxdrop') !== -1) return 'Mixdrop';
  if (u.indexOf('mp4upload') !== -1) return 'Mp4Upload';
  if (u.indexOf('dood') !== -1 || u.indexOf('ds2play') !== -1 || u.indexOf('ds2video') !== -1)
    return 'Doodstream';
  if (
    u.indexOf('streamwish') !== -1 ||
    u.indexOf('sfastwish') !== -1 ||
    u.indexOf('wishfast') !== -1 ||
    u.indexOf('vidhide') !== -1
  )
    return 'Streamwish';
  if (u.indexOf('filemoon') !== -1 || u.indexOf('moonplayer') !== -1) return 'Filemoon';
  if (u.indexOf('yourupload') !== -1 || u.indexOf('yupload') !== -1) return 'YourUpload';
  if (u.indexOf('hqq') !== -1 || u.indexOf('netu') !== -1) return 'Netu';
  if (u.indexOf('mega.nz') !== -1 || u.indexOf('mega.co.nz') !== -1) return 'Mega';
  return 'Embed';
}

/** Extrae el slug del anime de una URL completa o de un slug parcial */
function _toSlug(url: string): string {
  if (url.indexOf('http') !== 0) return url.replace(/\/+$/, '');
  return url
    .replace(/^https?:\/\/jkanime\.net\//, '')
    .replace(/\/+$/, '');
}

function _absUrl(url: string): string {
  return url.indexOf('http') === 0 ? url : `${BASE}${url}`;
}

/** Parsea las tarjetas de anime de la página de directorio o búsqueda */
function _parseCards(html: string): PrismItem[] {
  const items: PrismItem[] = [];

  // Cada tarjeta tiene un único data-setbg (la portada). Dividimos por ese marcador
  // para aislar cada tarjeta. El resto del bloque contiene el slug y el título.
  const parts = html.split('data-setbg="');

  for (let i = 1; i < parts.length; i++) {
    // La URL de la portada termina en la próxima comilla
    const coverEnd = parts[i].indexOf('"');
    if (coverEnd < 4) continue;
    const cover = parts[i].slice(0, coverEnd);

    // Bloque de la tarjeta: contenido después de la portada hasta la próxima tarjeta
    // (máximo 3000 chars para no contaminar con la siguiente tarjeta)
    const block = parts[i].slice(coverEnd + 1, coverEnd + 3001);

    // Slug: primer href="/slug/" que no sea una ruta de navegación
    const slug = _firstAnimeSlug(block);
    if (!slug) continue;

    // Título: elemento con class="title" — el texto puede ser directo o dentro de <a>
    //   <p class="title">Texto</p>          → directo
    //   <p class="title"><a ...>Texto</a>   → anidado
    //   <a class="title" href="...">Texto   → el <a> ES el title
    let title = '';
    const titleTagMatch = /class="[^"]*title[^"]*"[^>]*>([\s\S]{1,120}?)(?:<\/[a-z]|$)/i.exec(block);
    if (titleTagMatch) {
      title = stripTags(titleTagMatch[1]).trim();
    }
    // Fallback: h5 o h4 con un link dentro
    if (!title) {
      const h5Match = /<h[2-6][^>]*>[^<]*<a[^>]*>([^<]+)<\/a>/i.exec(block);
      if (h5Match) title = h5Match[1].trim();
    }

    if (slug && title) {
      items.push({ title, url: slug, cover: _absUrl(cover) });
    }
  }
  return items;
}

/** Extrae el primer slug de anime válido de un bloque HTML */
function _firstAnimeSlug(block: string): string {
  for (const m of block.matchAll(/href="\/([^"/?#]{3,})\//gi)) {
    const slug = m[1];
    if (
      slug.indexOf('genero') === -1 &&
      slug.indexOf('tipo') === -1 &&
      slug.indexOf('directorio') === -1 &&
      slug.indexOf('buscar') === -1 &&
      slug.indexOf('ajax') === -1 &&
      slug.indexOf('static') === -1
    ) {
      return slug;
    }
  }
  return '';
}

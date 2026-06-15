import { get, request } from '../../sdk/http';
import { matchFirst, matchGroups, stripTags, between } from '../../sdk/html';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

// ─── TioAnime ────────────────────────────────────────────────────────────────
// Fuente: https://tioanime.com
// Anime en español latino con servidores múltiples.

const BASE = 'https://tioanime.com';

/** Últimos animes agregados */
export async function latest(page: number): Promise<PrismItem[]> {
  const html = await get(`${BASE}/directorio?p=${page}`);
  return _parseCards(html);
}

/** Búsqueda por título */
export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const html = await get(
    `${BASE}/directorio?q=${encodeURIComponent(keyword)}&p=${page}`,
  );
  return _parseCards(html);
}

/** Detalle del anime con lista de episodios */
export async function detail(url: string): Promise<PrismDetail> {
  const html = await get(`${BASE}/anime/${url}`);

  const title = matchFirst(html, /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i);

  const rawCover = matchFirst(
    html,
    /<div[^>]*class="[^"]*anime-image[^"]*"[\s\S]*?<img[^>]*src="([^"]+)"/i,
  );
  const cover = rawCover.startsWith('http') ? rawCover : `${BASE}${rawCover}`;

  const description = stripTags(
    between(html, '<p class="sinopsis">', '</p>'),
  );

  const episodes = _parseEpisodes(html, url);

  const status = matchFirst(html, /Estado:\s*<\/span>\s*<span[^>]*>([^<]+)<\/span>/i);
  const genres = matchGroups(
    html,
    /<a[^>]*href="\/genero\/[^"]*"[^>]*>([^<]+)<\/a>/gi,
  ).map(g => g[0]);

  return {
    title,
    cover,
    description,
    episodes,
    extra: {
      Estado: status,
      Géneros: genres.join(', '),
    },
  };
}

/** Streams de video — resuelve embeds en paralelo; fallback a URL cruda si no */
export async function watch(url: string): Promise<PrismWatch> {
  const html = await get(`${BASE}/ver/${url}`);

  const match = /var\s+videos\s*=\s*(\[\[[\s\S]*?\]\])/.exec(html);
  if (!match) return { streams: [] };

  let raw: [string, string][];
  try {
    raw = JSON.parse(match[1]) as [string, string][];
  } catch {
    return { streams: [] };
  }

  const candidates = raw.filter(([, u]) => u.startsWith('http'));

  // Intentar resolver cada embed en paralelo (timeout 8 s, sin reintentos)
  const results = await Promise.all(
    candidates.map(async ([server, embedUrl]) => {
      const resolved = await _resolveEmbed(server, embedUrl);
      return { server, embedUrl, resolved };
    }),
  );

  // Streams resueltos primero (URLs directas), luego embeds crudos como fallback
  const resolved = results
    .filter(r => r.resolved !== null)
    .map(r => ({ url: r.resolved!.url, quality: r.server, headers: r.resolved!.headers }));

  const fallback = results
    .filter(r => r.resolved === null)
    .map(r => ({ url: r.embedUrl, quality: r.server }));

  return { streams: [...resolved, ...fallback] };
}

// ─── Embed resolvers ──────────────────────────────────────────────────────────

interface _Resolved { url: string; headers?: Record<string, string>; }

async function _resolveEmbed(server: string, url: string): Promise<_Resolved | null> {
  const s = server.toLowerCase();
  if (s.includes('voe'))                               return _resolveVoe(url);
  if (s.includes('streamtape') || s.includes('tape'))  return _resolveStreamtape(url);
  return null;
}

/** voe.sx — soporta formato directo y ofuscación base64 (atob) */
async function _resolveVoe(url: string): Promise<_Resolved | null> {
  const html = await _fetchEmbed(url);
  if (!html) return null;

  // Patrón 1: hls:"url" o hls:'url' o hls: "url"
  let m = /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(html);
  if (m) return { url: m[1] };

  // Patrón 2: "hls":"url" (JSON estricto con comillas dobles)
  m = /"hls"\s*:\s*"([^"]+)"/.exec(html);
  if (m) return { url: m[1] };

  // Patrón 3: ofuscación atob — var wjs = atob('base64...')
  // VOE codifica el objeto de fuentes en base64 desde ~2024
  const atobMatch = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
  if (atobMatch) {
    try {
      const decoded = _b64decode(atobMatch[1]);
      // Buscar la URL m3u8 en el JSON decodificado
      let hls = /"hls"\s*:\s*"([^"]+)"/.exec(decoded)
             ?? /'hls'\s*:\s*'([^']+)'/.exec(decoded)
             ?? /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(decoded);
      if (hls) return { url: hls[1] };
      // Fallback: cualquier URL m3u8 en el string decodificado
      const direct = /(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/.exec(decoded);
      if (direct) return { url: direct[1] };
    } catch {
      // ignorar error de decodificación
    }
  }

  // Patrón 4: cualquier URL m3u8 visible en el HTML sin ofuscación
  m = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
  if (m) return { url: m[0] };

  return null;
}

/** streamtape.com — múltiples patrones de obfuscación */
async function _resolveStreamtape(url: string): Promise<_Resolved | null> {
  const html = await _fetchEmbed(url);
  if (!html) return null;

  // Patrón 1: URL completa get_video directa en el HTML
  let m = /(https?:\/\/streamtape\.[a-z]+\/get_video[^"'\s<>&]+)/.exec(html);
  if (m) return { url: m[1] };

  // Patrón 2: URL relativa //streamtape...
  m = /(\/\/streamtape\.[a-z]+\/get_video[^"'\s<>&]+)/.exec(html);
  if (m) return { url: `https:${m[1]}` };

  // Patrón 3: concatenación clásica innerHTML = 'part1' + 'part2'
  m = /robotlink[^)]*\)\s*\.innerHTML\s*=\s*["']([^"']+)["']\s*\+\s*["']([^"']*)["']/.exec(html);
  if (m) {
    const full = m[1] + m[2];
    return { url: full.startsWith('http') ? full : `https:${full}` };
  }

  return null;
}

/** Fetch de página embed con timeout corto y sin reintentos */
async function _fetchEmbed(url: string): Promise<string | null> {
  try {
    const res = await request(url, {
      headers: { Referer: `${BASE}/` },
      timeout: 8000,
      retries: 0,
    });
    return res.text();
  } catch {
    return null;
  }
}

/** Decodificador base64 puro JS (sin depender de atob del entorno) */
function _b64decode(s: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  let result = '';
  let i = 0;
  while (i < clean.length) {
    const b1 = chars.indexOf(clean[i++]);
    const b2 = chars.indexOf(clean[i++]);
    const b3 = i < clean.length ? chars.indexOf(clean[i++]) : -1;
    const b4 = i < clean.length ? chars.indexOf(clean[i++]) : -1;
    result += String.fromCharCode((b1 << 2) | (b2 >> 4));
    if (b3 !== -1) result += String.fromCharCode(((b2 & 15) << 4) | (b3 >> 2));
    if (b4 !== -1) result += String.fromCharCode(((b3 & 3) << 6) | b4);
  }
  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _parseCards(html: string): PrismItem[] {
  const pattern =
    /<article[^>]*class="[^"]*anime[^"]*"[\s\S]*?<a[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?class="[^"]*title[^"]*"[^>]*>[\s\S]*?>([^<]+)<\/a>/gi;

  const items: PrismItem[] = [];
  for (const [, slug, rawCover, title] of html.matchAll(pattern)) {
    items.push({
      title: title.trim(),
      url: slug.trim(),
      cover: rawCover.startsWith('http') ? rawCover : `${BASE}${rawCover}`,
    });
  }
  return items;
}

function _parseEpisodes(html: string, animeSlug: string): Array<{ title: string; url: string }> {
  const match = /var\s+episodes\s*=\s*(\[[\s\S]*?\])/.exec(html);
  if (!match) return [];

  try {
    const raw = JSON.parse(match[1]) as (string | number)[];
    return raw.reverse().map((ep, i) => {
      const slug =
        typeof ep === 'number' || /^\d+$/.test(String(ep))
          ? `${animeSlug}-${ep}`
          : String(ep);
      return { title: `Episodio ${raw.length - i}`, url: slug };
    });
  } catch {
    return [];
  }
}

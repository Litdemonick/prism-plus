import { get, request } from '../../sdk/http';
import { matchFirst, matchGroups, stripTags, between } from '../../sdk/html';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

// ─── AnimeFLV ────────────────────────────────────────────────────────────────
// Fuente: https://animeflv.net
// Anime con subtítulos en español y doblaje latino.

const BASE = 'https://animeflv.net';

/** Últimos animes agregados */
export async function latest(page: number): Promise<PrismItem[]> {
  const html = await get(`${BASE}/browse?order=added&page=${page}`);
  return _parseCards(html);
}

/** Búsqueda por título */
export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const html = await get(
    `${BASE}/browse?q=${encodeURIComponent(keyword)}&page=${page}`,
  );
  return _parseCards(html);
}

/** Detalle del anime con lista de episodios */
export async function detail(url: string): Promise<PrismDetail> {
  const html = await get(`${BASE}/anime/${url}`);

  const title = matchFirst(html, /<h1[^>]*class="[^"]*Title[^"]*"[^>]*>([^<]+)<\/h1>/i);

  const rawCover = matchFirst(
    html,
    /<div[^>]*class="[^"]*AnimeCover[^"]*"[\s\S]*?<img[^>]*src="([^"]+)"/i,
  );
  const cover = rawCover.startsWith('http') ? rawCover : `${BASE}${rawCover}`;

  const description = stripTags(between(html, '<div class="Description">', '</div>'));

  const episodes = _parseEpisodes(html, url);

  const status = matchFirst(
    html,
    /<span[^>]*>Estado:<\/span>\s*<span[^>]*>([^<]+)<\/span>/i,
  );
  const type = matchFirst(
    html,
    /<span[^>]*>Tipo:<\/span>\s*<a[^>]*>([^<]+)<\/a>/i,
  );
  const genres = matchGroups(
    html,
    /<a[^>]*href="\/browse[^"]*genre[^"]*"[^>]*>([^<]+)<\/a>/gi,
  ).map(g => g[0]);

  return {
    title,
    cover,
    description,
    episodes,
    extra: {
      Estado: status,
      Tipo: type,
      Géneros: genres.join(', '),
    },
  };
}

/** Streams de video — resuelve embeds en paralelo; fallback a URL cruda si no */
export async function watch(url: string): Promise<PrismWatch> {
  const html = await get(`${BASE}/ver/${url}`);

  // AnimeFLV guarda los servidores en: var videos = {"SUB":[...], "LAT":[...]}
  const videosMatch = /var\s+videos\s*=\s*(\{[\s\S]*?\});/.exec(html);
  if (!videosMatch) return { streams: [] };

  type VideoEntry = { server: string; url: string; ads: number; allow_mobile: boolean };
  let videos: Record<string, VideoEntry[]>;
  try {
    videos = JSON.parse(videosMatch[1]);
  } catch {
    return { streams: [] };
  }

  // Prioridad: LAT (doblaje) → SUB (subtítulos)
  const all = [...(videos['LAT'] ?? []), ...(videos['SUB'] ?? [])]
    .filter(v => v.url.startsWith('http'));

  if (all.length === 0) return { streams: [] };

  // Intentar resolver cada embed en paralelo
  const results = await Promise.all(
    all.map(async v => {
      const resolved = await _resolveEmbed(v.server, v.url);
      return { server: v.server, embedUrl: v.url, resolved };
    }),
  );

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
  if (s.includes('streamtape') || s.includes('stape') || s.includes('tape'))
                                                       return _resolveStreamtape(url);
  return null;
}

/** voe.sx — soporta formato directo y ofuscación base64 (atob) */
async function _resolveVoe(url: string): Promise<_Resolved | null> {
  const html = await _fetchEmbed(url);
  if (!html) return null;

  let m = /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(html);
  if (m) return { url: m[1] };

  m = /"hls"\s*:\s*"([^"]+)"/.exec(html);
  if (m) return { url: m[1] };

  // Ofuscación atob: var wjs = atob('base64...')
  const atobMatch = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
  if (atobMatch) {
    try {
      const decoded = _b64decode(atobMatch[1]);
      const hls = /"hls"\s*:\s*"([^"]+)"/.exec(decoded)
               ?? /'hls'\s*:\s*'([^']+)'/.exec(decoded)
               ?? /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(decoded);
      if (hls) return { url: hls[1] };
      const direct = /(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/.exec(decoded);
      if (direct) return { url: direct[1] };
    } catch {
      // ignorar
    }
  }

  m = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
  if (m) return { url: m[0] };

  return null;
}

/** streamtape.com — múltiples patrones */
async function _resolveStreamtape(url: string): Promise<_Resolved | null> {
  const html = await _fetchEmbed(url);
  if (!html) return null;

  let m = /(https?:\/\/streamtape\.[a-z]+\/get_video[^"'\s<>&]+)/.exec(html);
  if (m) return { url: m[1] };

  m = /(\/\/streamtape\.[a-z]+\/get_video[^"'\s<>&]+)/.exec(html);
  if (m) return { url: `https:${m[1]}` };

  m = /robotlink[^)]*\)\s*\.innerHTML\s*=\s*["']([^"']+)["']\s*\+\s*["']([^"']*)["']/.exec(html);
  if (m) {
    const full = m[1] + m[2];
    return { url: full.startsWith('http') ? full : `https:${full}` };
  }

  return null;
}

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
    /<article[^>]*class="[^"]*Anime[^"]*"[\s\S]*?<a[^>]*href="\/anime\/([^"]+)"[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<h3[^>]*class="[^"]*Title[^"]*"[^>]*>([^<]+)<\/h3>/gi;

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
  const match = /var\s+episodes\s*=\s*(\[\[[\s\S]*?\]\])/.exec(html);
  if (!match) return [];

  try {
    const raw = JSON.parse(match[1]) as [number, string][];
    return raw.reverse().map(([num]) => ({
      title: `Episodio ${num}`,
      url: `${animeSlug}-${num}`,
    }));
  } catch {
    return [];
  }
}

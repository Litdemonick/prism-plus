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

/** Streams de video del episodio — resuelve embeds a URLs directas en paralelo */
export async function watch(url: string): Promise<PrismWatch> {
  const html = await get(`${BASE}/ver/${url}`);

  // TioAnime embebe los videos en: var videos = [["server","url"],...]
  const match = /var\s+videos\s*=\s*(\[\[[\s\S]*?\]\])/.exec(html);
  if (!match) return { streams: [] };

  let raw: [string, string][];
  try {
    raw = JSON.parse(match[1]) as [string, string][];
  } catch {
    return { streams: [] };
  }

  const candidates = raw.filter(([, u]) => u.startsWith('http'));

  // Resolver embeds a URLs directas en paralelo (timeout corto por servidor)
  const results = await Promise.all(
    candidates.map(async ([server, embedUrl]) => {
      const resolved = await _resolveEmbed(server, embedUrl);
      if (!resolved) return null;
      return { url: resolved.url, quality: server, headers: resolved.headers };
    }),
  );

  return {
    streams: results.filter((s): s is NonNullable<typeof s> => s !== null),
  };
}

// ─── Embed resolvers ──────────────────────────────────────────────────────────

interface _Resolved { url: string; headers?: Record<string, string>; }

/** Despacha al resolver correcto según nombre del servidor */
async function _resolveEmbed(server: string, url: string): Promise<_Resolved | null> {
  const s = server.toLowerCase();
  if (s.includes('voe'))                          return _resolveVoe(url);
  if (s.includes('streamtape') || s.includes('tape')) return _resolveStreamtape(url);
  // mega, hqq, doodstream, filemoon → no resolvibles sin JS complejo
  return null;
}

/** voe.sx → extrae URL m3u8 de la página del embed */
async function _resolveVoe(url: string): Promise<_Resolved | null> {
  const html = await _fetchEmbed(url);
  if (!html) return null;

  // Pattern 1: hls: "https://..." o hls: 'https://...'
  let m = /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(html);
  if (m) return { url: m[1] };

  // Pattern 2: 'hls': 'url' (con comillas externas)
  m = /'hls'\s*:\s*'([^']+)'/.exec(html);
  if (m) return { url: m[1] };

  // Pattern 3: URL m3u8 directa en el HTML
  m = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
  if (m) return { url: m[0] };

  return null;
}

/** streamtape → extrae URL directa del video */
async function _resolveStreamtape(url: string): Promise<_Resolved | null> {
  const html = await _fetchEmbed(url);
  if (!html) return null;

  // Streamtape concatena dos strings: innerHTML = 'part1' + 'part2'
  let m = /robotlink['"]\)[^=]*=\s*["']([^"']+)["']\s*\+\s*["']([^"']*)["']/.exec(html);
  if (m) {
    const full = m[1] + m[2];
    return { url: full.startsWith('http') ? full : `https:${full}` };
  }

  // Fallback: URL de get_video directa en el HTML
  m = /(https?:\/\/streamtape\.[^/]+\/get_video[^"'\s<>]+)/.exec(html);
  if (m) return { url: m[1] };

  // Fallback 2: URL relativa //streamtape...
  m = /(\/\/streamtape\.[^/]+\/get_video[^"'\s<>]+)/.exec(html);
  if (m) return { url: `https:${m[1]}` };

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

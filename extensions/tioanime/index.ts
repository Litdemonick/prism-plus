import { get } from '../../sdk/http';
import { matchFirst, matchGroups, stripTags, between } from '../../sdk/html';
import { resolveEmbed } from '../../sdk/embeds';
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

  // TioAnime sirve la portada en /uploads/portadas/<id>.jpg. (Antes había una
  // clase `anime-image` que el sitio ya eliminó — por eso no cargaba la portada.)
  const rawCover =
    matchFirst(html, /<img[^>]*src="(\/uploads\/portadas\/[^"]+)"/i) ||
    matchFirst(html, /<img[^>]*src="([^"]*\/uploads\/[^"]+\.(?:jpg|jpeg|png|webp))"/i);
  const cover = !rawCover
    ? ''
    : rawCover.startsWith('http')
      ? rawCover
      : `${BASE}${rawCover}`;

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
  const pageUrl = `${BASE}/ver/${url}`;
  const html = await get(pageUrl);

  const match = /var\s+videos\s*=\s*(\[\[[\s\S]*?\]\])/.exec(html);
  if (!match) return { streams: [], pageUrl };

  let raw: [string, string][];
  try {
    raw = JSON.parse(match[1]) as [string, string][];
  } catch {
    return { streams: [], pageUrl };
  }

  const candidates = raw.filter(([, u]) => u.startsWith('http'));

  // Intentar resolver cada embed en paralelo (timeout 8 s, sin reintentos)
  const results = await Promise.all(
    candidates.map(async ([server, embedUrl]) => {
      const resolved = await resolveEmbed(server, embedUrl, `${BASE}/`);
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

  return { streams: [...resolved, ...fallback], pageUrl };
}

// Los resolvers (voe, streamtape, b64decode) viven en sdk/embeds.ts
// y son compartidos por todas las extensiones vía resolveEmbed().

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
  // Intentar con distintos patrones: var/let/const + posibles espacios antes de '='
  const match =
    /(?:var|let|const)\s+episodes\s*=\s*(\[[\s\S]*?\]);/.exec(html) ||
    /(?:var|let|const)\s+episodes\s*=\s*(\[[\s\S]*?\])/.exec(html);
  if (!match) return [];

  try {
    const raw = JSON.parse(match[1]) as (string | number)[];
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return raw.map((ep, i) => {
      const slug =
        typeof ep === 'number' || /^\d+$/.test(String(ep))
          ? `${animeSlug}-${ep}`
          : String(ep);
      return { title: `Episodio ${i + 1}`, url: slug };
    });
  } catch {
    return [];
  }
}

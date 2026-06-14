import { get } from '../../sdk/http';
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

  // TioAnime lista episodios en un array JS: var episodes = ["slug-1","slug-2",...]
  const episodes = _parseEpisodes(html);

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

/** Streams de video del episodio */
export async function watch(url: string): Promise<PrismWatch> {
  const html = await get(`${BASE}/ver/${url}`);

  // TioAnime embebe los videos en: var videos = [["server","url"],...]
  const match = /var\s+videos\s*=\s*(\[\[[\s\S]*?\]\])/.exec(html);
  if (!match) return { streams: [] };

  try {
    const raw = JSON.parse(match[1]) as [string, string][];
    const streams = raw
      .filter(([, url]) => url.startsWith('http'))
      .map(([server, url]) => ({ url, quality: server }));
    return { streams };
  } catch {
    return { streams: [] };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _parseCards(html: string): PrismItem[] {
  // <article class="anime ...">
  //   <a href="/anime/SLUG"><img src="COVER"></a>
  //   <h3 class="title"><a href="...">TÍTULO</a></h3>
  // </article>
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

function _parseEpisodes(html: string): Array<{ title: string; url: string }> {
  // var episodes = ["slug-episodio-1", "slug-episodio-2", ...]
  const match = /var\s+episodes\s*=\s*(\[[\s\S]*?\])/.exec(html);
  if (!match) return [];

  try {
    const raw = JSON.parse(match[1]) as string[];
    return raw.reverse().map((slug, i) => ({
      title: `Episodio ${raw.length - i}`,
      url: slug,
    }));
  } catch {
    return [];
  }
}

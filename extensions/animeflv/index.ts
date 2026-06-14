import { get } from '../../sdk/http';
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

  // Portada embebida en la ficha del anime
  const rawCover = matchFirst(
    html,
    /<div[^>]*class="[^"]*AnimeCover[^"]*"[\s\S]*?<img[^>]*src="([^"]+)"/i,
  );
  const cover = rawCover.startsWith('http') ? rawCover : `${BASE}${rawCover}`;

  const description = stripTags(between(html, '<div class="Description">', '</div>'));

  // Los episodios están en una variable JS: var episodes = [[num,"slug"],...]
  const episodes = _parseEpisodes(html, url);

  // Metadata extra de la ficha
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

/** Streams de video del episodio */
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
  const all = [...(videos['LAT'] ?? []), ...(videos['SUB'] ?? [])];

  // Filtramos solo streams directos y conocidos; los embeds necesitan extracción adicional
  const streams = all
    .filter(v => v.url.startsWith('http'))
    .map(v => ({
      url: v.url,
      quality: v.server,
    }));

  return { streams };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _parseCards(html: string): PrismItem[] {
  // <article class="Anime ..."><a href="/anime/SLUG">
  //   <img src="...COVER...">
  //   <h3 class="Title">TÍTULO</h3>
  // </a></article>
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
    // Invertimos para mostrar del más reciente al más antiguo
    return raw.reverse().map(([num]) => ({
      title: `Episodio ${num}`,
      url: `${animeSlug}-${num}`,
    }));
  } catch {
    return [];
  }
}

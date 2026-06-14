import { getJson, get } from '../../sdk/http';
import { matchFirst } from '../../sdk/html';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

const BASE = 'https://animepahe.ru';

interface PaheAiringItem {
  anime_title: string;
  anime_session: string;
  snapshot: string;
}

interface PaheAiringRes {
  data: PaheAiringItem[];
}

interface PaheSearchItem {
  title: string;
  session: string;
  poster: string;
}

interface PaheSearchRes {
  data: PaheSearchItem[];
}

interface PaheEpisode {
  episode: number;
  session: string;
}

interface PaheEpisodeRes {
  data: PaheEpisode[];
}

export async function latest(page: number): Promise<PrismItem[]> {
  const data = await getJson<PaheAiringRes>(`${BASE}/api?m=airing&page=${page}`);
  return data.data.map(item => ({
    title: item.anime_title,
    url: item.anime_session,
    cover: item.snapshot,
  }));
}

export async function search(keyword: string, _page: number): Promise<PrismItem[]> {
  const data = await getJson<PaheSearchRes>(
    `${BASE}/api?m=search&q=${encodeURIComponent(keyword)}`,
  );
  return data.data.map(item => ({
    title: item.title,
    url: item.session,
    cover: item.poster,
  }));
}

export async function detail(session: string): Promise<PrismDetail> {
  const [html, epData] = await Promise.all([
    get(`${BASE}/anime/${session}`),
    getJson<PaheEpisodeRes>(`${BASE}/api?m=release&id=${session}`),
  ]);

  const title =
    matchFirst(html, /<span[^>]*class="[^"]*user-select-none[^"]*"[^>]*>([^<]+)<\/span>/i) ||
    matchFirst(html, /<h1[^>]*>([^<]+)<\/h1>/i);
  const cover = matchFirst(html, /href="(https:\/\/i\.animepahe\.ru\/posters[^"]+)"/i);
  const description = matchFirst(
    html,
    /<div[^>]*class="[^"]*anime-synopsis[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ).replace(/<[^>]*>/g, '').trim();

  const episodes = [...epData.data].reverse().map(ep => ({
    title: `Episode ${ep.episode}`,
    url: `${session}/${ep.session}`,
  }));

  return { title, cover: cover || undefined, description, episodes };
}

// watch() requiere evaluar JS obfuscado de kwik.si — no es posible sin webview.
export async function watch(_url: string): Promise<PrismWatch> {
  return { streams: [] };
}

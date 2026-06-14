import { getJson } from '../../sdk/http';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

const API = 'https://api.amvstr.me/api/v2';

interface AmvTitle {
  english: string | null;
  romaji: string | null;
}

interface AmvCover {
  extraLarge: string | null;
  large: string | null;
}

interface AmvItem {
  id: number;
  title: AmvTitle;
  coverImage: AmvCover;
  description?: string;
}

interface AmvResults {
  results: AmvItem[];
}

interface AmvEpisode {
  id: string;
  title: string | null;
  number: number;
}

interface AmvEpisodesRes {
  episodes: AmvEpisode[];
}

interface AmvStream {
  stream: {
    multi: {
      main: { url: string };
    };
  };
}

function amvTitle(t: AmvTitle): string {
  return t.english ?? t.romaji ?? '';
}

function amvCover(c: AmvCover): string | undefined {
  return c.extraLarge ?? c.large ?? undefined;
}

export async function latest(_page: number): Promise<PrismItem[]> {
  const data = await getJson<AmvResults>(`${API}/trending`);
  return data.results.map(item => ({
    title: amvTitle(item.title),
    url: item.id.toString(),
    cover: amvCover(item.coverImage),
  }));
}

export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const data = await getJson<AmvResults>(
    `${API}/search?q=${encodeURIComponent(keyword)}&p=${page}&limit=10`,
  );
  return data.results.map(item => ({
    title: amvTitle(item.title),
    url: item.id.toString(),
    cover: amvCover(item.coverImage),
  }));
}

export async function detail(url: string): Promise<PrismDetail> {
  const [info, epData] = await Promise.all([
    getJson<AmvItem>(`${API}/info/${url}`),
    getJson<AmvEpisodesRes>(`${API}/episode/${url}`),
  ]);
  return {
    title: amvTitle(info.title),
    cover: amvCover(info.coverImage),
    description: info.description ?? '',
    episodes: epData.episodes.map(ep => ({
      title: ep.title ?? `Episode ${ep.number}`,
      url: ep.id,
    })),
  };
}

export async function watch(url: string): Promise<PrismWatch> {
  const data = await getJson<AmvStream>(`${API}/stream/${url}`);
  return {
    streams: [{ url: data.stream.multi.main.url }],
  };
}

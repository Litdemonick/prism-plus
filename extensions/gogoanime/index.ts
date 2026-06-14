import { getJson } from '../../sdk/http';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

const API = 'https://consumet-leox-api.vercel.app/anime/gogoanime';

interface ConsumetItem {
  id: string;
  title: string;
  image: string;
}

interface ConsumetResults {
  results: ConsumetItem[];
}

interface ConsumetEpisode {
  id: string;
  number: number;
}

interface ConsumetDetail {
  title: string;
  image: string;
  description: string;
  episodes: ConsumetEpisode[];
}

interface ConsumetSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

interface ConsumetWatch {
  sources: ConsumetSource[];
}

export async function latest(page: number): Promise<PrismItem[]> {
  const data = await getJson<ConsumetResults>(`${API}/top-airing?page=${page}`);
  return data.results.map(item => ({
    title: item.title,
    url: item.id,
    cover: item.image,
  }));
}

export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const data = await getJson<ConsumetResults>(
    `${API}/${encodeURIComponent(keyword)}?page=${page}`,
  );
  return data.results.map(item => ({
    title: item.title,
    url: item.id,
    cover: item.image,
  }));
}

export async function detail(url: string): Promise<PrismDetail> {
  const data = await getJson<ConsumetDetail>(`${API}/info/${url}`);
  return {
    title: data.title,
    cover: data.image,
    description: data.description,
    episodes: data.episodes.map(ep => ({
      title: `Episode ${ep.number}`,
      url: ep.id,
    })),
  };
}

export async function watch(url: string): Promise<PrismWatch> {
  const data = await getJson<ConsumetWatch>(`${API}/watch/${url}?server=gogocdn`);
  return {
    streams: data.sources
      .filter(s => s.url)
      .map(s => ({ url: s.url, quality: s.quality })),
  };
}

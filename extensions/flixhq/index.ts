import { getJson } from '../../sdk/http';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

const API = 'https://consumet8.vercel.app/movies/flixhq';

interface FlixItem {
  id: string;
  title: string;
  image: string;
}

interface FlixResults {
  results: FlixItem[];
}

interface FlixEpisode {
  id: string;
  title: string;
}

interface FlixDetail {
  title: string;
  cover: string;
  description: string;
  episodes: FlixEpisode[];
}

interface FlixSource {
  url: string;
  quality: string;
}

interface FlixSubtitle {
  lang: string;
  url: string;
}

interface FlixWatch {
  sources: FlixSource[];
  subtitles: FlixSubtitle[];
}

export async function latest(_page: number): Promise<PrismItem[]> {
  const data = await getJson<FlixResults>(`${API}/trending`);
  return data.results.map(item => ({
    title: item.title ?? '',
    url: item.id.toString(),
    cover: item.image,
  }));
}

export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const data = await getJson<FlixResults>(
    `${API}/${encodeURIComponent(keyword)}?page=${page}`,
  );
  return data.results.map(item => ({
    title: item.title ?? '',
    url: item.id.toString(),
    cover: item.image,
  }));
}

export async function detail(url: string): Promise<PrismDetail> {
  const data = await getJson<FlixDetail>(`${API}/info?id=${url}`);
  return {
    title: data.title ?? '',
    cover: data.cover,
    description: data.description ?? '',
    episodes: data.episodes.map(ep => ({
      title: ep.title ?? 'Episode',
      url: `${ep.id};${url}`,
    })),
  };
}

export async function watch(url: string): Promise<PrismWatch> {
  const semi = url.indexOf(';');
  const episodeId = url.slice(0, semi);
  const mediaId = url.slice(semi + 1);
  const data = await getJson<FlixWatch>(
    `${API}/watch?episodeId=${encodeURIComponent(episodeId)}&mediaId=${encodeURIComponent(mediaId)}`,
  );
  return {
    streams: data.sources.map(s => ({ url: s.url, quality: s.quality })),
    subtitles: (data.subtitles ?? []).map(s => ({
      label: s.lang,
      url: s.url,
      lang: s.lang,
    })),
  };
}

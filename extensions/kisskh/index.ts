import { getJson } from '../../sdk/http';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

const BASE = 'https://kisskh.co';

interface KisskItem {
  id: number;
  title: string;
  thumbnail: string;
}

interface KisskList {
  data: KisskItem[];
}

interface KisskEpisode {
  id: number;
  number: number;
}

interface KisskDetail {
  title: string;
  thumbnail: string;
  description: string;
  episodes: KisskEpisode[];
}

interface KisskStream {
  Video: string;
}

interface KisskSubtitle {
  label: string;
  src: string;
  land: string;
}

export async function latest(page: number): Promise<PrismItem[]> {
  const data = await getJson<KisskList>(
    `${BASE}/api/DramaList/List?page=${page}&type=0&sub=0&country=0&status=0&order=2&pageSize=40`,
  );
  return data.data.map(item => ({
    title: item.title,
    url: item.id.toString(),
    cover: item.thumbnail,
  }));
}

export async function search(keyword: string, _page: number): Promise<PrismItem[]> {
  const data = await getJson<KisskItem[]>(
    `${BASE}/api/DramaList/Search?q=${encodeURIComponent(keyword)}&type=0`,
  );
  return data.map(item => ({
    title: item.title,
    url: item.id.toString(),
    cover: item.thumbnail,
  }));
}

export async function detail(url: string): Promise<PrismDetail> {
  const data = await getJson<KisskDetail>(
    `${BASE}/api/DramaList/Drama/${url}?isq=true`,
  );
  return {
    title: data.title,
    cover: data.thumbnail,
    description: data.description,
    episodes: [...data.episodes].reverse().map(ep => ({
      title: `Episode ${ep.number}`,
      url: ep.id.toString(),
    })),
  };
}

export async function watch(url: string): Promise<PrismWatch> {
  const [streamData, subData] = await Promise.all([
    getJson<KisskStream>(`${BASE}/api/DramaList/Episode/${url}.png?err=false&ts=&time=`),
    getJson<KisskSubtitle[]>(`${BASE}/api/Sub/${url}`),
  ]);
  return {
    streams: [{ url: streamData.Video }],
    subtitles: subData.map(s => ({
      label: s.label,
      url: s.src,
      lang: s.land,
    })),
  };
}

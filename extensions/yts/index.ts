import { getJson } from '../../sdk/http';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

const API = 'https://yts.mx/api/v2';

interface YTSTorrent {
  url: string;
  quality: string;
  type: string;
}

interface YTSMovie {
  id: number;
  title: string;
  medium_cover_image: string;
  description_full: string;
  torrents: YTSTorrent[];
}

interface YTSListRes {
  data: { movies: YTSMovie[] };
}

interface YTSDetailRes {
  data: { movie: YTSMovie };
}

export async function latest(page: number): Promise<PrismItem[]> {
  const data = await getJson<YTSListRes>(`${API}/list_movies.json?page=${page}`);
  return data.data.movies.map(m => ({
    title: m.title,
    url: m.id.toString(),
    cover: m.medium_cover_image,
  }));
}

export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const data = await getJson<YTSListRes>(
    `${API}/list_movies.json?page=${page}&query_term=${encodeURIComponent(keyword)}`,
  );
  return data.data.movies.map(m => ({
    title: m.title,
    url: m.id.toString(),
    cover: m.medium_cover_image,
  }));
}

export async function detail(url: string): Promise<PrismDetail> {
  const data = await getJson<YTSDetailRes>(
    `${API}/movie_details.json?movie_id=${url}`,
  );
  const m = data.data.movie;
  return {
    title: m.title,
    cover: m.medium_cover_image,
    description: m.description_full,
    episodes: m.torrents.map(t => ({
      title: `${t.quality} ${t.type}`,
      url: t.url,
    })),
  };
}

export async function watch(url: string): Promise<PrismWatch> {
  return { streams: [{ url, quality: 'torrent' }] };
}

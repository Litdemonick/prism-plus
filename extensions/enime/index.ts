import { getJson } from '../../sdk/http';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

const API = 'https://api.enime.moe';

interface EnimeAnime {
  id: string;
  title: { native: string; english: string | null; romaji: string | null };
  coverImage: string;
  description: string;
  episodes: EnimeEpisode[];
}

interface EnimeEpisode {
  id: string;
  number: number;
  title: string | null;
}

interface EnimeRecentItem {
  animeId: string;
  number: number;
  anime: {
    title: { native: string; english: string | null };
    coverImage: string;
  };
}

interface EnimeRecentRes {
  data: EnimeRecentItem[];
}

interface EnimeSearchRes {
  data: EnimeAnime[];
}

interface EnimeSource {
  id: string;
  url: string;
}

interface EnimeEpisodeRes {
  sources: EnimeSource[];
}

function enimeTitle(t: { native: string; english: string | null; romaji?: string | null }): string {
  return t.english ?? t.romaji ?? t.native;
}

export async function latest(page: number): Promise<PrismItem[]> {
  const data = await getJson<EnimeRecentRes>(`${API}/recent?page=${page}`);
  return data.data.map(item => ({
    title: enimeTitle(item.anime.title),
    url: item.animeId,
    cover: item.anime.coverImage,
  }));
}

export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const data = await getJson<EnimeSearchRes>(
    `${API}/search/${encodeURIComponent(keyword)}?page=${page}`,
  );
  return data.data.map(item => ({
    title: enimeTitle(item.title),
    url: item.id,
    cover: item.coverImage,
  }));
}

export async function detail(url: string): Promise<PrismDetail> {
  const data = await getJson<EnimeAnime>(`${API}/anime/${url}`);
  return {
    title: enimeTitle(data.title),
    cover: data.coverImage,
    description: data.description,
    episodes: data.episodes.map(ep => ({
      title: ep.title ?? `Episode ${ep.number}`,
      url: ep.id,
    })),
  };
}

export async function watch(url: string): Promise<PrismWatch> {
  const data = await getJson<EnimeEpisodeRes>(`${API}/episode/${url}`);
  const source = data.sources[0];
  if (!source) return { streams: [] };
  return { streams: [{ url: source.url }] };
}

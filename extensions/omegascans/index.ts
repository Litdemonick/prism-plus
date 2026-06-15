import { getJson } from '../../sdk/http';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

const API = 'https://api.omegascans.org';

interface OmegaItem {
  series_slug: string;
  title: string;
  thumbnail: string;
}

interface OmegaResults {
  data: OmegaItem[];
}

interface OmegaChapter {
  chapter_name: string | null;
  title: string;
  chapter_slug: string;
  series: { series_slug: string };
}

interface OmegaDetail {
  id: number;
  title: string;
  thumbnail: string;
  description: string;
}

interface OmegaChapterData {
  chapter: {
    chapter_data?: { images?: string[] };
  };
}

function queryUrl(extra: string): string {
  return `${API}/query?series_status=All&order=desc&orderBy=total_views&series_type=Comic&perPage=20&${extra}`;
}

export async function latest(page: number): Promise<PrismItem[]> {
  const data = await getJson<OmegaResults>(queryUrl(`page=${page}`));
  return data.data.map(item => ({
    title: item.title,
    url: item.series_slug,
    cover: item.thumbnail,
  }));
}

export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const data = await getJson<OmegaResults>(
    queryUrl(`query_string=${encodeURIComponent(keyword)}&page=${page}`),
  );
  return data.data.map(item => ({
    title: item.title,
    url: item.series_slug,
    cover: item.thumbnail,
  }));
}

export async function detail(slug: string): Promise<PrismDetail> {
  const series = await getJson<OmegaDetail>(`${API}/series/${slug}`);
  const chapRes = await getJson<{ data: OmegaChapter[] }>(
    `${API}/chapter/query?page=1&perPage=10000&series_id=${series.id}`,
  );
  return {
    title: series.title,
    cover: series.thumbnail,
    description: series.description,
    episodes: chapRes.data.map(ch => ({
      title: ch.chapter_name ?? `Chapter ${ch.title}`,
      url: `${ch.series.series_slug}/${ch.chapter_slug}`,
    })),
  };
}

export async function watch(url: string): Promise<PrismWatch> {
  const data = await getJson<OmegaChapterData>(`${API}/chapter/${url}`);
  const images = data.chapter?.chapter_data?.images ?? [];
  return {
    streams: images.map((imgUrl, i) => ({
      url: imgUrl,
      quality: `Page ${i + 1}`,
    })),
  };
}

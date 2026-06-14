import { getJson } from '../../sdk/http';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

const API = 'https://cal1.iv.ggtyler.dev/api/v1';

interface InvThumbnail {
  url: string;
  quality: string;
}

interface InvFormatStream {
  url: string;
  qualityLabel: string;
  container: string;
}

interface InvVideo {
  videoId: string;
  title: string;
  videoThumbnails: InvThumbnail[];
  description?: string;
  formatStreams?: InvFormatStream[];
}

function bestThumb(thumbs: InvThumbnail[]): string | undefined {
  return thumbs.find(t => t.quality === 'maxres')?.url ?? thumbs[0]?.url;
}

export async function latest(_page: number): Promise<PrismItem[]> {
  const data = await getJson<InvVideo[]>(`${API}/trending?region=US`);
  return data.map(v => ({
    title: v.title,
    url: v.videoId,
    cover: bestThumb(v.videoThumbnails),
  }));
}

export async function search(keyword: string, _page: number): Promise<PrismItem[]> {
  const data = await getJson<InvVideo[]>(`${API}/search?q=${encodeURIComponent(keyword)}`);
  return data.map(v => ({
    title: v.title,
    url: v.videoId,
    cover: bestThumb(v.videoThumbnails),
  }));
}

export async function detail(url: string): Promise<PrismDetail> {
  const v = await getJson<InvVideo>(`${API}/videos/${url}`);
  return {
    title: v.title,
    cover: bestThumb(v.videoThumbnails),
    description: v.description,
    episodes: [{ title: v.title, url: v.videoId }],
  };
}

export async function watch(url: string): Promise<PrismWatch> {
  const v = await getJson<InvVideo>(`${API}/videos/${url}`);
  return {
    streams: (v.formatStreams ?? []).map(s => ({
      url: s.url,
      quality: s.qualityLabel,
    })),
  };
}

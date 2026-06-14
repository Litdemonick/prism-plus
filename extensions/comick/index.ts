import { getJson } from '../../sdk/http';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

const API = 'https://api.comick.fun';
const CDN = 'https://meo.comick.pictures';

interface ComickCover {
  b2key: string;
}

interface ComickItem {
  slug: string;
  title: string;
  md_covers: ComickCover[];
}

interface ComickTopRes {
  rank: ComickItem[];
}

interface ComickChapter {
  hid: string;
  chap: string | null;
  lang: string;
}

interface ComickDetailRes {
  comic: {
    title: string;
    hid: string;
    desc: string;
    md_covers: ComickCover[];
  };
}

interface ComickChaptersRes {
  chapters: ComickChapter[];
}

interface ComickPageImage {
  url: string;
}

interface ComickChapterRes {
  chapter: {
    images: ComickPageImage[];
  };
}

function comickCover(covers: ComickCover[]): string | undefined {
  return covers[0] ? `${CDN}/${covers[0].b2key}` : undefined;
}

export async function latest(page: number): Promise<PrismItem[]> {
  if (page > 1) return [];
  const data = await getJson<ComickTopRes>(`${API}/top?accept_mature_content=false`);
  return data.rank.map(item => ({
    title: item.title,
    url: item.slug,
    cover: comickCover(item.md_covers),
  }));
}

export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const data = await getJson<ComickItem[]>(
    `${API}/v1.0/search/?page=${page}&limit=30&q=${encodeURIComponent(keyword)}&t=false`,
  );
  return data.map(item => ({
    title: item.title,
    url: item.slug,
    cover: comickCover(item.md_covers),
  }));
}

export async function detail(slug: string): Promise<PrismDetail> {
  const res = await getJson<ComickDetailRes>(`${API}/comic/${slug}`);
  const { hid, title, desc, md_covers } = res.comic;

  const chapRes = await getJson<ComickChaptersRes>(
    `${API}/comic/${hid}/chapters?limit=99999`,
  );

  const byLang = new Map<string, ComickChapter[]>();
  for (const ch of chapRes.chapters) {
    if (!byLang.has(ch.lang)) byLang.set(ch.lang, []);
    byLang.get(ch.lang)!.push(ch);
  }

  const sorted = [...byLang.entries()].sort(([a], [b]) =>
    a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b),
  );

  const episodes = sorted.flatMap(([lang, chapters]) =>
    chapters.map(ch => ({
      title: `[${lang}] Chapter ${ch.chap ?? '?'}`,
      url: ch.hid,
    })),
  );

  return { title, cover: comickCover(md_covers), description: desc, episodes };
}

export async function watch(hid: string): Promise<PrismWatch> {
  const data = await getJson<ComickChapterRes>(
    `${API}/chapter/${hid}?tachiyomi=true`,
  );
  return {
    streams: data.chapter.images.map((img, i) => ({
      url: img.url,
      quality: `Page ${i + 1}`,
    })),
  };
}

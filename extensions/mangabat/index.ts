import { get } from '../../sdk/http';
import { matchFirst, matchGroups, between, stripTags } from '../../sdk/html';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

const BASE = 'https://h.mangabat.com';

function parseMangaBatList(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  const parts = html.split('list-story-item');
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const href = matchFirst(block, /href="([^"]+)"/i);
    const title = matchFirst(block, /title="([^"]+)"/i);
    const cover = matchFirst(block, /<img[^>]+src="([^"]+)"/i);
    if (!href || !title) continue;
    items.push({ title, url: href, cover: cover || undefined });
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  const html = await get(`${BASE}/manga-list-all/${page}`);
  return parseMangaBatList(html);
}

export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const html = await get(
    `${BASE}/search/manga/${encodeURIComponent(keyword)}?page=${page}`,
  );
  return parseMangaBatList(html);
}

export async function detail(url: string): Promise<PrismDetail> {
  const html = await get(url);

  const title = matchFirst(html, /<h1[^>]*>([^<]+)<\/h1>/i);
  const cover = matchFirst(html, /class="info-image"[\s\S]*?<img[^>]+src="([^"]+)"/i);
  const rawDesc = between(html, 'id="panel-story-info-description"', '</div>');
  const description = stripTags(rawDesc.replace(/^\s*<[^>]+>/i, ''));

  const episodes = matchGroups(
    html,
    /<a[^>]+href="(https:\/\/h\.mangabat\.com[^"]+)"[^>]*>([^<]+)<\/a>/gi,
  )
    .filter(([u]) => u.includes('/manga-'))
    .map(([u, t]) => ({ title: t.trim(), url: u }));

  return { title, cover: cover || undefined, description, episodes };
}

export async function watch(url: string): Promise<PrismWatch> {
  const html = await get(url, { Referer: `${BASE}/` });

  const readerMatch = /class="container-chapter-reader"([\s\S]*?)<\/div>/i.exec(html);
  if (!readerMatch) return { streams: [] };

  const pages = matchGroups(readerMatch[1], /<img[^>]+src="([^"]+)"[^>]*>/gi)
    .map(([src]) => src)
    .filter(Boolean);

  return {
    streams: pages.map((src, i) => ({
      url: src,
      quality: `Page ${i + 1}`,
      headers: { Referer: `${BASE}/` },
    })),
  };
}

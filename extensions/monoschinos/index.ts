import { get } from '../../sdk/http';
import { matchFirst, between, stripTags } from '../../sdk/html';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

const BASE = 'https://monoschinos.st';

function parseItems(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  const parts = html.split('ficha_efecto');
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const href = matchFirst(block, /href="([^"]+)"/i);
    const cover = matchFirst(block, /data-src="([^"]+)"/i);
    const title = matchFirst(block, /class="[^"]*title_cap[^"]*"[^>]*>([^<]+)/i);
    if (!href || !title) continue;
    items.push({
      title: title.trim(),
      url: href.startsWith('http') ? href : `${BASE}${href}`,
      cover: cover || undefined,
    });
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  const html = await get(`${BASE}/animes?p=${page}`);
  return parseItems(html);
}

export async function search(keyword: string, _page: number): Promise<PrismItem[]> {
  const html = await get(`${BASE}/buscar?q=${encodeURIComponent(keyword)}`);
  return parseItems(html);
}

export async function detail(url: string): Promise<PrismDetail> {
  const html = await get(url);

  const title = matchFirst(html, /<h1[^>]*>([^<]+)<\/h1>/i);
  const cover = matchFirst(html, /class="[^"]*lazy[^"]*"[^>]*data-src="([^"]+)"/i)
    || matchFirst(html, /data-src="([^"]+)"[^>]*class="[^"]*lazy[^"]*"/i);
  const descBlock = between(html, '<div class="mb-3">', '</div>');
  const description = stripTags(between(descBlock, '<p>', '</p>'));

  const ep1Match = /href="https?:\/\/monoschinos\.st\/ver\/([^"]+)-episodio-1"/.exec(html);
  if (!ep1Match) {
    return { title: title || url, cover: cover || undefined, description, episodes: [] };
  }

  const slug = ep1Match[1];
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/-/g, '[-]');
  const epRe = new RegExp(`/ver/${escapedSlug}-episodio-(\\d+)`, 'g');

  let maxEp = 1;
  for (const match of html.matchAll(epRe)) {
    const n = parseInt(match[1], 10);
    if (n > maxEp) maxEp = n;
  }

  const episodes = Array.from({ length: maxEp }, (_, i) => ({
    title: `Episodio ${i + 1}`,
    url: `${BASE}/ver/${slug}-episodio-${i + 1}`,
  }));

  return { title, cover: cover || undefined, description, episodes };
}

export async function watch(url: string): Promise<PrismWatch> {
  const html = await get(url, { Referer: `${BASE}/` });

  const pdMatch = /pixeldrain\.com\/u\/([A-Za-z0-9]+)/.exec(html);
  if (pdMatch) {
    return {
      streams: [{
        url: `https://pixeldrain.com/api/file/${pdMatch[1]}?download`,
        headers: { Referer: 'https://pixeldrain.com/' },
      }],
    };
  }

  const m3u8Match = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
  if (m3u8Match) {
    return { streams: [{ url: m3u8Match[1] }] };
  }

  return { streams: [] };
}

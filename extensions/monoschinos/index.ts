import { get } from '../../sdk/http';
import { matchFirst, between, stripTags } from '../../sdk/html';
import { resolveEmbed, b64decode } from '../../sdk/embeds';
import type { PrismDetail, PrismItem, PrismStream, PrismWatch } from '../../sdk/types';

// ─── MonosChinos ──────────────────────────────────────────────────────────────
// Fuente: https://monoschinos.st
// Anime en español latino.
// watch() decodifica atributos data-player (base64 → URL embed) y resuelve
// los servers conocidos (voe, streamtape) a streams directos.

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
  const cover =
    matchFirst(html, /class="[^"]*lazy[^"]*"[^>]*data-src="([^"]+)"/i) ||
    matchFirst(html, /data-src="([^"]+)"[^>]*class="[^"]*lazy[^"]*"/i);
  const descBlock = between(html, '<div class="mb-3">', '</div>');
  const description = stripTags(between(descBlock, '<p>', '</p>'));

  const ep1Match = new RegExp(
    `href="https?://monoschinos\\.st/ver/([^"]+)-episodio-1"`,
  ).exec(html);
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

  // 1. Descargas directas (sección "Descargas"): pixeldrain es un mp4 directo,
  //    sin ofuscación ni token atado a IP → el server MÁS fiable. Va primero.
  const direct: PrismStream[] = [];
  const pdRe = /pixeldrain\.com\/u\/([A-Za-z0-9]+)/g;
  const seenPd = new Set<string>();
  for (const m of html.matchAll(pdRe)) {
    if (seenPd.has(m[1])) continue;
    seenPd.add(m[1]);
    direct.push({
      url: `https://pixeldrain.com/api/file/${m[1]}`,
      quality: 'Pixeldrain',
      headers: { Referer: 'https://pixeldrain.com/' },
    });
  }

  // 2. Servers embed: <... data-player="BASE64">NombreServer<...>
  //    El BASE64 decodifica a una URL de embed (voe.sx, mixdrop, etc.)
  const playerRe = /data-player="([A-Za-z0-9+/=]{10,})"[^>]*>([^<]{1,30})</g;
  const candidates: Array<{ server: string; embedUrl: string }> = [];
  for (const m of html.matchAll(playerRe)) {
    try {
      const embedUrl = b64decode(m[1]);
      if (embedUrl.startsWith('http')) {
        candidates.push({ server: m[2].trim() || _guessServer(embedUrl), embedUrl });
      }
    } catch { /* ignorar */ }
  }

  // Resolver todos los embeds en paralelo.
  const results = await Promise.all(
    candidates.map(async ({ server, embedUrl }) => {
      const resolved = await resolveEmbed(server, embedUrl, `${BASE}/`);
      return { server, embedUrl, resolved };
    }),
  );

  const resolved = results
    .filter(r => r.resolved !== null)
    .map(r => ({ url: r.resolved!.url, quality: r.server, headers: r.resolved!.headers }));
  const fallback = results
    .filter(r => r.resolved === null)
    .map(r => ({ url: r.embedUrl, quality: r.server }));

  // Orden: descargas directas (más fiables) → embeds resueltos → embeds crudos.
  // PrismHub reproduce el primero y, si falla, hace auto-fallback al siguiente.
  const streams = [...direct, ...resolved, ...fallback];

  // Último recurso: m3u8 suelto en el HTML.
  if (streams.length === 0) {
    const m3u8Match = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
    if (m3u8Match) streams.push({ url: m3u8Match[1], quality: 'Directo' });
  }

  return { streams };
}

function _guessServer(url: string): string {
  if (url.includes('voe')) return 'Voe';
  if (url.includes('streamtape')) return 'Streamtape';
  if (url.includes('pixeldrain')) return 'Pixeldrain';
  return 'Embed';
}

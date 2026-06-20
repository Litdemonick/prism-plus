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
  //    Soporta comillas simples y dobles; base64 estándar o URL-safe.
  const dpRe = /data-player=(?:"([^"]{10,})"|'([^']{10,})')/g;
  const seenEmbed = new Set<string>();
  const candidates: Array<{ server: string; embedUrl: string }> = [];
  for (const m of html.matchAll(dpRe)) {
    try {
      const raw = (m[1] !== undefined ? m[1] : m[2]).replace(/[\s\r\n]/g, '');
      const embedUrl = b64decode(raw);
      if (!embedUrl.startsWith('http') || seenEmbed.has(embedUrl)) continue;
      seenEmbed.add(embedUrl);
      // Nombre del servidor: texto en los ~100 caracteres tras el atributo
      const ctx = html.slice(m.index!, m.index! + m[0].length + 100);
      const nm = /["'][^"']{8,}["'][^>]*>([^<\r\n]{1,40})</.exec(ctx);
      const name = nm?.[1]?.trim() || _guessServer(embedUrl);
      candidates.push({ server: name, embedUrl });
    } catch { /* ignorar */ }
  }

  // Fallback: si no hay data-player, buscar iframes de embeds conocidos en el HTML
  if (candidates.length === 0) {
    const ifrRe = /<iframe[^>]+src=["'](https?:\/\/(?:voe\.sx|streamtape\.|mixdrop\.|luluvdo\.|bysekoze\.|dsvplay\.|vidhide\.|filelions\.|streamwish\.|wishfast\.|vtube\.|filemoon\.|moon(?:player|video))[^"'\s>]+)["']/gi;
    for (const m2 of html.matchAll(ifrRe)) {
      const embedUrl = m2[1];
      if (seenEmbed.has(embedUrl)) continue;
      seenEmbed.add(embedUrl);
      candidates.push({ server: _guessServer(embedUrl), embedUrl });
    }
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

  // pageUrl = la propia URL del episodio: si todo lo anterior falla, la app la
  // carga en WebView y sniffe el player del sitio.
  return { streams, pageUrl: url };
}

function _guessServer(url: string): string {
  if (url.includes('voe')) return 'Voe';
  if (url.includes('streamtape')) return 'Streamtape';
  if (url.includes('pixeldrain')) return 'Pixeldrain';
  if (url.includes('mixdrop') || url.includes('mxdrop')) return 'Mixdrop';
  if (url.includes('luluvdo')) return 'Luluvdo';
  if (url.includes('bysekoze')) return 'Bysekoze';
  if (url.includes('dsvplay') || url.includes('dood')) return 'Doodstream';
  if (url.includes('streamwish') || url.includes('vidhide') || url.includes('filelions')) return 'Streamwish';
  if (url.includes('filemoon') || url.includes('moonplayer')) return 'Filemoon';
  return 'Embed';
}

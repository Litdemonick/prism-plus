import { get } from '../../sdk/http';
import { matchFirst, between, stripTags } from '../../sdk/html';
import { resolveEmbed, b64decode } from '../../sdk/embeds';
import type { PrismDetail, PrismItem, PrismStream, PrismWatch } from '../../sdk/types';

// ─── MonosChinos ──────────────────────────────────────────────────────────────
// Fuente: https://monoschinos.st
// Los players se cargan vía AJAX/JS — no están en el HTML estático.
// Estrategia: API interna → links de descarga en HTML (bysekoze, pixeldrain,
// gofile, filemoon, voe…) → page-sniff como último recurso.

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

  const streams: PrismStream[] = [];
  const seen = new Set<string>();

  // 1. API interna (los servers se cargan por AJAX — intentar antes que HTML)
  const episodioMatch = /\/ver\/(.+)-episodio-(\d+)$/.exec(url);
  if (episodioMatch) {
    const epSlug = episodioMatch[1];
    const epNum  = episodioMatch[2];
    const apiUrls = [
      `${BASE}/api/episode?slug=${epSlug}&number=${epNum}`,
      `${BASE}/api/servers?slug=${epSlug}-episodio-${epNum}`,
      `${BASE}/api/episode/${epSlug}/${epNum}`,
    ];
    for (const apiUrl of apiUrls) {
      try {
        const raw = await get(apiUrl, { 'X-Requested-With': 'XMLHttpRequest', Referer: url });
        const data = JSON.parse(raw);
        if (data?.url && !seen.has(data.url)) {
          seen.add(data.url);
          streams.push({ url: data.url, quality: data.name || 'MonosChinos' });
        } else if (Array.isArray(data)) {
          for (const s of data) {
            if (s?.url && !seen.has(s.url)) {
              seen.add(s.url);
              streams.push({ url: s.url, quality: s.name || 'Server' });
            }
          }
        }
        if (streams.length > 0) break;
      } catch { /* API no disponible o respuesta no JSON */ }
    }
  }

  // 2. Pixeldrain — API directa sin ofuscación, mp4 reproducible de inmediato
  for (const m of html.matchAll(/pixeldrain\.com\/(?:u|d)\/([A-Za-z0-9]+)/g)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    streams.push({
      url: `https://pixeldrain.com/api/file/${m[1]}`,
      quality: 'Pixeldrain',
      headers: { Referer: 'https://pixeldrain.com/' },
    });
  }

  // 3. Links de descarga estáticos: bysekoze, filemoon, voe, doodstream, etc.
  //    La sección "Descargas" del HTML sí contiene estos links (sin JS).
  const DL_RE = /https?:\/\/(?:bysekoze\.com|filemoon\.[a-z]{2,4}|voe\.sx|doodstream\.com|ds2play\.com|streamtape\.(?:com|net|to)|mixdrop\.(?:co|top|to|sx|ag)|mp4upload\.com)\/[^\s"'<>)]+/gi;
  const candidates: Array<{ name: string; embedUrl: string }> = [];
  for (const m of html.matchAll(DL_RE)) {
    const dlUrl = m[0].replace(/['"<>)\s]+$/, '');
    if (seen.has(dlUrl)) continue;
    seen.add(dlUrl);
    candidates.push({ name: _guessServer(dlUrl), embedUrl: dlUrl });
  }

  // Resolver todos los embeds/descargas en paralelo
  const resolved = await Promise.all(
    candidates.map(async ({ name, embedUrl }) => {
      const r = await resolveEmbed(name, embedUrl, `${BASE}/`);
      return r ? ({ url: r.url, quality: name, headers: r.headers } as PrismStream) : null;
    }),
  );
  for (const r of resolved) {
    if (r) streams.push(r);
  }

  // 4. Gofile — API pública para obtener link directo
  const gofileIds: string[] = [];
  for (const m of html.matchAll(/gofile\.io\/d\/([A-Za-z0-9]+)/g)) {
    if (!gofileIds.includes(m[1])) gofileIds.push(m[1]);
  }
  const gofileStreams = await Promise.all(
    gofileIds.map(async (gfId) => {
      try {
        const raw = await get(
          `https://api.gofile.io/getContent?contentId=${gfId}&token=&websiteToken=7fd94ds12fds4`,
          { Referer: 'https://gofile.io/' },
        );
        const data = JSON.parse(raw) as any;
        if (data?.status === 'ok') {
          const files = Object.values((data.data?.contents ?? {}) as object) as any[];
          const vid = files.find((f: any) => f?.mimetype?.includes('video'));
          if (vid?.directLink) {
            return { url: vid.directLink, quality: 'Gofile' } as PrismStream;
          }
        }
      } catch { /* ignorar */ }
      return null;
    }),
  );
  for (const r of gofileStreams) {
    if (r) streams.push(r);
  }

  // Último recurso antes de page-sniff: m3u8 suelto en el HTML
  if (streams.length === 0) {
    const m3u8 = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
    if (m3u8) streams.push({ url: m3u8[1], quality: 'Directo' });
  }

  // pageUrl = la URL del episodio para que la app la sniffe en WebView si todo falla
  return { streams, pageUrl: url };
}

function _guessServer(url: string): string {
  if (url.includes('voe')) return 'Voe';
  if (url.includes('streamtape')) return 'Streamtape';
  if (url.includes('pixeldrain')) return 'Pixeldrain';
  if (url.includes('mixdrop') || url.includes('mxdrop')) return 'Mixdrop';
  if (url.includes('doodstream') || url.includes('ds2play')) return 'Doodstream';
  if (url.includes('bysekoze')) return 'Bysekoze';
  if (url.includes('mp4upload')) return 'Mp4Upload';
  if (url.includes('filemoon') || url.includes('moonplayer')) return 'Filemoon';
  return 'Embed';
}

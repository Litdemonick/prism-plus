import { get } from '../../sdk/http';
import { matchFirst, between, stripTags } from '../../sdk/html';
// ─── MonosChinos ──────────────────────────────────────────────────────────────
// Fuente: https://monoschinos.st
// Players cargados vía AJAX/JS — no están en HTML estático.
// Estrategia: downloads en HTML (pixeldrain, bysekoze, voe, filemoon…) → X-Servers
// para que PrismHub sniffee cada embed en su propio WebView (frame principal).
// Sin streams: devuelve page://url para que el page-sniff de PrismHub los descubra.

const BASE = 'https://monoschinos.st';

function parseItems(html: string): object[] {
  const items: object[] = [];
  const parts = html.split('ficha_efecto');
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const href  = matchFirst(block, /href="([^"]+)"/i);
    const cover = matchFirst(block, /data-src="([^"]+)"/i);
    const title = matchFirst(block, /class="[^"]*title_cap[^"]*"[^>]*>([^<]+)/i);
    if (!href || !title) continue;
    items.push({
      title: title.trim(),
      url:   href.startsWith('http') ? href : `${BASE}${href}`,
      cover: cover || undefined,
    });
  }
  return items;
}

export async function latest(page: number): Promise<object[]> {
  return parseItems(await get(`${BASE}/animes?p=${page}`));
}

export async function search(keyword: string, _page: number): Promise<object[]> {
  return parseItems(await get(`${BASE}/buscar?q=${encodeURIComponent(keyword)}`));
}

export async function detail(url: string): Promise<object> {
  const html = await get(url);

  const title = matchFirst(html, /<h1[^>]*>([^<]+)<\/h1>/i);
  const cover =
    matchFirst(html, /class="[^"]*lazy[^"]*"[^>]*data-src="([^"]+)"/i) ||
    matchFirst(html, /data-src="([^"]+)"[^>]*class="[^"]*lazy[^"]*"/i);
  const descBlock = between(html, '<div class="mb-3">', '</div>');
  const description = stripTags(between(descBlock, '<p>', '</p>'));

  // Acepta tanto URLs absolutas como relativas para el link del episodio 1.
  const ep1Match = new RegExp(
    `href="(?:https?://monoschinos\\.st)?/ver/([^"]+)-episodio-1"`,
  ).exec(html);
  if (!ep1Match) {
    return { title: title || url, cover: cover || undefined, desc: description, episodes: [] };
  }

  const slug = ep1Match[1];
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/-/g, '[-]');
  const epRe = new RegExp(`/ver/${escapedSlug}-episodio-(\\d+)`, 'g');

  // Recolectar todos los números de episodio encontrados (no solo el máximo)
  // para cubrir el caso de episodios no consecutivos o páginas paginadas.
  const epNums = new Set<number>([1]);
  for (const match of html.matchAll(epRe)) {
    epNums.add(parseInt(match[1], 10));
  }

  // Intentar leer el total desde el texto de la página ("X episodios" / "X eps").
  const totalMatch = html.match(/(\d+)\s*(?:episodios?|eps?)\b/i);
  const totalFromText = totalMatch ? parseInt(totalMatch[1], 10) : 0;
  const maxEp = Math.max(...epNums, totalFromText > 0 ? totalFromText : 1);

  const episodes = Array.from({ length: maxEp }, (_, i) => ({
    name: `Episodio ${i + 1}`,
    url:  `${BASE}/ver/${slug}-episodio-${i + 1}`,
  }));

  return { title, cover: cover || undefined, desc: description, episodes: [{ title: 'Episodios', urls: episodes }] };
}

export async function watch(url: string): Promise<object> {
  const html = await get(url, { Referer: `${BASE}/` });

  // Mapa de servers: nombre → embed/download URL
  const servers: Record<string, string> = {};
  const referers: Record<string, string> = {};
  const seen = new Set<string>();

  function addServer(name: string, embedUrl: string) {
    if (seen.has(embedUrl)) return;
    seen.add(embedUrl);
    servers[name] = embedUrl;
    referers[name] = `${BASE}/`;
  }

  // 1. Pixeldrain — URL directa de API (más fiable)
  for (const m of html.matchAll(/pixeldrain\.com\/(?:u|d)\/([A-Za-z0-9]+)/g)) {
    addServer('Pixeldrain', `https://pixeldrain.com/api/file/${m[1]}`);
  }

  // 2. Links de descarga estáticos — solo hosts embed/stream, NO hosts de descarga directa
  // (mega, savefiles, etc. abren pestañas de descarga en el WebView en lugar de reproducir).
  const DL_RE = /https?:\/\/(?:bysekoze\.com|luluvdo\.com|filemoon\.[a-z]{2,4}|voe\.sx|doodstream\.com|ds2play\.com|streamtape\.(?:com|net|to)|mixdrop\.(?:co|top|to|sx|ag)|mp4upload\.com|vidhide\.com|filelions\.com|streamwish\.(?:com|to)|sendvid\.com|upstream\.to|uqload\.co|streamhide\.to)\/[^\s"'<>)]+/gi;
  for (const m of html.matchAll(DL_RE)) {
    const dlUrl = m[0].replace(/['"<>)\s]+$/, '');
    addServer(_guessServer(dlUrl), dlUrl);
  }

  // 3. Gofile — API pública
  for (const m of html.matchAll(/gofile\.io\/d\/([A-Za-z0-9]+)/g)) {
    const gfId = m[1];
    if (seen.has(`gofile:${gfId}`)) continue;
    seen.add(`gofile:${gfId}`);
    try {
      const raw = await get(
        `https://api.gofile.io/getContent?contentId=${gfId}&token=&websiteToken=7fd94ds12fds4`,
        { Referer: 'https://gofile.io/' },
      );
      const data = JSON.parse(raw) as Record<string, unknown>;
      if ((data as any)?.status === 'ok') {
        const files = Object.values(((data as any).data?.contents ?? {}) as object) as any[];
        const vid = files.find((f: any) => f?.mimetype?.includes('video'));
        if (vid?.directLink) addServer('Gofile', vid.directLink);
      }
    } catch { /* ignorar */ }
  }

  const serverNames = Object.keys(servers);

  // Sin links en HTML estático → devolver page:// para que PrismHub use el page-sniff
  // (PrismHub carga la página en WebView, extrae los embed URLs y los sniffea
  // individualmente en WebViews propios donde callHandler sí funciona).
  if (serverNames.length === 0) {
    return {
      type: 'hls',
      url: `page://${url}`,
      headers: {
        'X-Page-Url': url,
      },
    };
  }

  // Con links → devolver el primero como URL principal, resto en X-Servers.
  // PrismHub llama _trySniff(name, embedUrl) para cada uno en su propio WebView.
  const primaryName = serverNames[0];
  const primaryUrl  = servers[primaryName];

  return {
    type: 'hls',
    url: primaryUrl,
    headers: {
      'X-Servers':        JSON.stringify(servers),
      'X-Server-Referers': JSON.stringify(referers),
      'X-Primary-Server': primaryName,
      'X-Page-Url':       url,
    },
  };
}

function _guessServer(url: string): string {
  if (url.includes('voe'))        return 'Voe';
  if (url.includes('streamtape')) return 'Streamtape';
  if (url.includes('pixeldrain')) return 'Pixeldrain';
  if (url.includes('mixdrop') || url.includes('mxdrop')) return 'Mixdrop';
  if (url.includes('doodstream') || url.includes('ds2play')) return 'Doodstream';
  if (url.includes('bysekoze'))   return 'Bysekoze';
  if (url.includes('luluvdo'))    return 'Luluvdo';
  if (url.includes('mp4upload'))  return 'Mp4Upload';
  if (url.includes('filemoon') || url.includes('moonplayer')) return 'Filemoon';
  if (url.includes('vidhide') || url.includes('filelions') || url.includes('streamwish')) return 'Streamwish';
  return 'Embed';
}

// ==MiruExtension==
// @name         MonosChinos
// @version      1.1.0
// @author       PrismHub
// @lang         es
// @license      MIT
// @icon         https://monoschinos.st/img/2web.jpg
// @package      io.prismhub.monoschinos
// @type         bangumi
// @webSite      https://monoschinos.st
// @description  Anime en español latino desde MonosChinos
// ==/MiruExtension==

export default class extends Extension {
  async latest(page) {
    const html = await this.request(`/animes?p=${page}`);
    return _parseCards(html);
  }

  async search(kw) {
    const html = await this.request(`/buscar?q=${encodeURIComponent(kw)}`);
    return _parseCards(html);
  }

  async detail(url) {
    // url can be a full URL (https://monoschinos.st/anime/slug) or just a path
    const html = url.startsWith('http')
      ? await _fetchHtml(url, 'https://monoschinos.st/')
      : await this.request(url);

    const title = (_rx(/<h1[^>]*>([^<]+)<\/h1>/i, html) || url).trim();
    const cover = _rx(/class="[^"]*lazy[^"]*"[^>]*data-src="([^"]+)"/i, html)
      || _rx(/data-src="([^"]+)"[^>]*class="[^"]*lazy[^"]*"/i, html) || '';
    const descP = /<div[^>]*class="mb-3"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i.exec(html);
    const desc = descP ? descP[1].replace(/<[^>]*>/g, '').trim() : '';

    // Detectar slug de episodio 1 para construir la lista
    const ep1M = /href="https?:\/\/monoschinos\.st\/ver\/([^"]+)-episodio-1"/.exec(html);
    if (!ep1M) return { title, cover, desc, episodes: [{ title: 'Episodios', urls: [] }] };

    const slug = ep1M[1];
    const safeSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/-/g, '[-]');
    const epRe = new RegExp(`/ver/${safeSlug}-episodio-(\\d+)`, 'g');
    let maxEp = 1;
    let em;
    while ((em = epRe.exec(html)) !== null) {
      const n = parseInt(em[1], 10);
      if (n > maxEp) maxEp = n;
    }

    const urls = [];
    for (let i = 1; i <= maxEp; i++) {
      urls.push({
        name: `Episodio ${i}`,
        url: `https://monoschinos.st/ver/${slug}-episodio-${i}`,
      });
    }

    return { title, cover, desc, episodes: [{ title: 'Episodios', urls }] };
  }

  async watch(episodeUrl) {
    // Failover path: embed URL passed directly
    if (_isEmbed(episodeUrl)) return _resolveEmbedUrl(episodeUrl);

    const html = await _fetchHtml(episodeUrl, 'https://monoschinos.st/');

    // 1. Descarga directa Pixeldrain (más fiable)
    const pdM = /pixeldrain\.com\/u\/([A-Za-z0-9]+)/.exec(html);
    if (pdM) {
      return {
        type: 'mp4',
        url: `https://pixeldrain.com/api/file/${pdM[1]}`,
        headers: { Referer: 'https://pixeldrain.com/' },
      };
    }

    // 2. Embeds data-player (base64)
    const re = /data-player="([A-Za-z0-9+/=]{10,})"[^>]*>([^<]{1,40})</g;
    const candidates = [];
    let m;
    while ((m = re.exec(html)) !== null) {
      try {
        const embedUrl = _b64decode(m[1]);
        if (embedUrl.startsWith('http')) {
          candidates.push({ name: m[2].trim() || _guessServer(embedUrl), embed: embedUrl });
        }
      } catch {}
    }

    if (!candidates.length) return _err('No se encontraron servidores');

    const servers = {};
    for (const { name, embed } of candidates) servers[name] = embed;

    for (const { name, embed } of candidates) {
      const res = await _resolveEmbedUrl(embed);
      if (res && res.url && !res.url.startsWith('error://')) {
        return {
          type: res.type || 'hls',
          url: res.url,
          headers: {
            ...(res.headers || {}),
            'X-Servers': JSON.stringify(servers),
            'X-Primary-Server': name,
          },
        };
      }
    }

    const first = candidates[0];
    return {
      type: 'hls',
      url: first.embed,
      headers: {
        'X-Servers': JSON.stringify(servers),
        'X-Primary-Server': first.name,
      },
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _rx(re, html) {
  const m = re.exec(html);
  return m ? m[1] : null;
}

function _parseCards(html) {
  const items = [];
  const parts = html.split('ficha_efecto');
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const hrefM = /href="([^"]+)"/.exec(block);
    const coverM = /data-src="([^"]+)"/.exec(block);
    const titleM = /class="[^"]*title_cap[^"]*"[^>]*>([^<]+)/i.exec(block);
    if (!hrefM || !titleM) continue;
    const href = hrefM[1];
    items.push({
      title: titleM[1].trim(),
      url: href.startsWith('http') ? href : `https://monoschinos.st${href}`,
      cover: coverM ? coverM[1] : undefined,
    });
  }
  return items;
}

function _isEmbed(url) {
  if (!url.startsWith('http')) return false;
  return !url.includes('monoschinos.st');
}

function _guessServer(url) {
  if (url.includes('voe')) return 'Voe';
  if (url.includes('streamtape')) return 'Streamtape';
  if (url.includes('pixeldrain')) return 'Pixeldrain';
  if (url.includes('dood')) return 'Doodstream';
  if (url.includes('filemoon')) return 'Filemoon';
  return 'Embed';
}

function _err(msg) {
  return { type: 'hls', url: `error://${msg}`, headers: {} };
}

function _b64decode(s) {
  try {
    return CryptoJS.enc.Base64.parse(s).toString(CryptoJS.enc.Utf8);
  } catch {
    const t = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let r = '', buf = 0, bits = 0;
    for (const c of s.replace(/[^A-Za-z0-9+/]/g, '')) {
      buf = (buf << 6) | t.indexOf(c);
      bits += 6;
      if (bits >= 8) { bits -= 8; r += String.fromCharCode((buf >> bits) & 0xff); }
    }
    return r;
  }
}

async function _fetchHtml(url, referer) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': referer || url,
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
    }
  });
  return res.text();
}

async function _resolveEmbedUrl(url) {
  const s = url.toLowerCase();
  try {
    if (s.includes('voe')) return await _resolveVoe(url);
    if (s.includes('netu') || s.includes('hqq')) return await _resolveNetu(url);
    if (s.includes('streamtape')) return await _resolveStreamtape(url);
    if (s.includes('doodstream') || s.includes('dood')) return await _resolveDood(url);
    if (s.includes('filemoon') || s.includes('fmoonembed')) return await _resolveFilemoon(url);
    if (s.includes('pixeldrain')) {
      const pidM = /pixeldrain\.com\/u\/([A-Za-z0-9]+)/.exec(url);
      if (pidM) return { type: 'mp4', url: `https://pixeldrain.com/api/file/${pidM[1]}`, headers: { Referer: 'https://pixeldrain.com/' } };
    }
  } catch {}
  return _err(`Sin resolver: ${url}`);
}

async function _resolveVoe(url) {
  const html = await _fetchHtml(url, 'https://voe.sx/');
  const b64m = /['"]hls['"]\s*:\s*['"]([A-Za-z0-9+/=]{20,})['"]/.exec(html);
  if (b64m) {
    const dec = _b64decode(b64m[1]);
    const src = /(https?:[^\s"']+\.m3u8[^\s"']*)/.exec(dec.replace(/\\\//g, '/'));
    if (src) return { type: 'hls', url: src[1], headers: { Referer: 'https://voe.sx/' } };
  }
  const direct = /['"](?:hlsUrl|hls_url)['"]\s*:\s*['"]([^'"]+)['"]/.exec(html)
    || /(https?:[^\s"']+\.m3u8[^\s"']*)/.exec(html);
  if (direct) return { type: 'hls', url: direct[1], headers: { Referer: 'https://voe.sx/' } };
  return _err('voe: m3u8 no encontrada');
}

async function _resolveNetu(url) {
  let host = 'hqq.tv';
  try { host = new URL(url).hostname; } catch {}
  const referer = `https://${host}/`;
  const html = await _fetchHtml(url, referer);
  const re = /atob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/g;
  let am;
  while ((am = re.exec(html)) !== null) {
    const dec = _b64decode(am[1]);
    const src = /(https?:[^\s"'\\]+\.m3u8[^\s"'\\]*)/.exec(dec.replace(/\\\//g, '/'));
    if (src) return { type: 'hls', url: src[1], headers: { Referer: referer } };
  }
  const b64re = /=\s*['"]([A-Za-z0-9+/=]{80,})['"]/g;
  let bm;
  while ((bm = b64re.exec(html)) !== null) {
    try {
      const dec = _b64decode(bm[1]);
      const src = /(https?:[^\s"'\\]+\.m3u8[^\s"'\\]*)/.exec(dec.replace(/\\\//g, '/'));
      if (src) return { type: 'hls', url: src[1], headers: { Referer: referer } };
    } catch {}
  }
  const direct = /(https?:[^\s"'\\]+\.m3u8[^\s"'\\]*)/.exec(html.replace(/\\\//g, '/'));
  if (direct) return { type: 'hls', url: direct[1], headers: { Referer: referer } };
  return _err(`netu: m3u8 no encontrada (${host})`);
}

async function _resolveStreamtape(url) {
  const html = await _fetchHtml(url, 'https://streamtape.com/');
  const linkM = /id="robotlink"[^>]*>([^<]+)/.exec(html)
    || /robotlink.*?innerHTML\s*=\s*['"]([^'"]+)['"]/.exec(html);
  if (linkM) {
    const raw = linkM[1].replace(/&amp;/g, '&');
    const mp4Url = raw.startsWith('http') ? raw : `https:${raw}`;
    return { type: 'mp4', url: mp4Url, headers: { Referer: 'https://streamtape.com/' } };
  }
  return _err('streamtape: link no encontrado');
}

async function _resolveDood(url) {
  const html = await _fetchHtml(url, 'https://doodstream.com/');
  const passM = /\/pass_md5\/([^'"]+)/.exec(html);
  if (!passM) return _err('dood: pass no encontrado');
  const token = await _fetchHtml(`https://doodstream.com/pass_md5/${passM[1]}`, url);
  if (!token.startsWith('http')) return _err('dood: token inválido');
  const mp4Url = token + Math.random().toString(36).slice(2) + '?token=' + passM[1].split('/').pop();
  return { type: 'mp4', url: mp4Url, headers: { Referer: 'https://doodstream.com/' } };
}

async function _resolveFilemoon(url) {
  const html = await _fetchHtml(url, url);
  const src = /(https?:[^\s"']+\.m3u8[^\s"']*)/.exec(html);
  if (src) return { type: 'hls', url: src[1], headers: { Referer: url } };
  return _err('filemoon: m3u8 no encontrada');
}

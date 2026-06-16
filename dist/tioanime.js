// ==MiruExtension==
// @name         TioAnime
// @version      1.1.0
// @author       PrismHub
// @lang         es
// @license      MIT
// @icon         https://tioanime.com/favicon.ico
// @package      io.prismhub.tioanime
// @type         bangumi
// @webSite      https://tioanime.com
// @description  Anime en español latino desde TioAnime
// ==/MiruExtension==

export default class extends Extension {
  async latest(page) {
    const html = await this.request(`/directorio?p=${page}`);
    return _parseCards(html);
  }

  async search(kw, page) {
    const html = await this.request(`/directorio?q=${encodeURIComponent(kw)}&p=${page}`);
    return _parseCards(html);
  }

  async detail(url) {
    const slug = url.replace(/.*\/anime\//, '');
    const html = await this.request(`/anime/${slug}`);

    const title = (_rx(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i, html) || slug).trim();
    const rawCover = _rx(/<div[^>]*class="[^"]*anime-image[^"]*"[\s\S]*?<img[^>]*src="([^"]+)"/i, html) || '';
    const cover = rawCover.startsWith('http') ? rawCover : `https://tioanime.com${rawCover}`;
    const descM = /<p[^>]*class="[^"]*sinopsis[^"]*"[^>]*>([\s\S]*?)<\/p>/i.exec(html);
    const desc = descM ? descM[1].replace(/<[^>]*>/g, '').trim() : '';

    const epM = /var\s+episodes\s*=\s*(\[[\s\S]*?\])/.exec(html);
    const urls = [];
    if (epM) {
      try {
        const raw = JSON.parse(epM[1]);
        const reversed = raw.slice().reverse();
        for (let i = 0; i < reversed.length; i++) {
          const ep = reversed[i];
          const epSlug = (typeof ep === 'number' || /^\d+$/.test(String(ep)))
            ? `${slug}-${ep}` : String(ep);
          urls.push({ name: `Episodio ${raw.length - i}`, url: epSlug });
        }
      } catch {}
    }

    return { title, cover, desc, episodes: [{ title: 'Episodios', urls }] };
  }

  async watch(episodeUrl) {
    // Failover path: embed URL passed directly
    if (_isEmbed(episodeUrl)) return _resolveEmbedUrl(episodeUrl);

    const slug = episodeUrl.replace(/.*\/ver\//, '');
    const html = await this.request(`/ver/${slug}`);

    const m = /var\s+videos\s*=\s*(\[\[[\s\S]*?\]\])/.exec(html);
    if (!m) return _err('No se encontraron servidores');

    let raw;
    try { raw = JSON.parse(m[1]); } catch { return _err('Error parseando servidores'); }

    const candidates = raw.filter(([, u]) => u && u.startsWith('http'));
    if (!candidates.length) return _err('No hay URLs válidas');

    const servers = {};
    for (const [name, u] of candidates) servers[name] = u;

    // Resolver el primer servidor disponible
    for (const [name, embedUrl] of candidates) {
      const res = await _resolveEmbedUrl(embedUrl);
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

    // Fallback: devolver primer embed crudo
    const [firstName, firstUrl] = candidates[0];
    return {
      type: 'hls',
      url: firstUrl,
      headers: {
        'X-Servers': JSON.stringify(servers),
        'X-Primary-Server': firstName,
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
  const re = /<article[^>]*class="[^"]*anime[^"]*"[\s\S]*?<a[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?class="[^"]*title[^"]*"[^>]*>[\s\S]*?>([^<]+)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const [, slug, rawCover, title] = m;
    items.push({
      title: title.trim(),
      url: slug.trim(),
      cover: rawCover.startsWith('http') ? rawCover : `https://tioanime.com${rawCover}`,
    });
  }
  return items;
}

function _isEmbed(url) {
  if (!url.startsWith('http')) return false;
  return !url.includes('tioanime.com');
}

function _err(msg) {
  return { type: 'hls', url: `error://${msg}`, headers: {} };
}

function _b64decode(s) {
  try {
    // CryptoJS is pre-loaded by the runtime
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
  } catch {}
  return _err(`Sin resolver: ${url}`);
}

async function _resolveVoe(url) {
  const html = await _fetchHtml(url, 'https://voe.sx/');
  // voe: HLS en variable 'hls' base64 o hlsUrl
  const b64m = /['"]hls['"]\s*:\s*['"]([A-Za-z0-9+/=]{20,})['"]/.exec(html);
  if (b64m) {
    const dec = _b64decode(b64m[1]);
    const src = /(https?:[^\s"']+\.m3u8[^\s"']*)/.exec(dec.replace(/\\\//g, '/'));
    if (src) return { type: 'hls', url: src[1], headers: { Referer: 'https://voe.sx/' } };
  }
  // hlsUrl o direct
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
  // atob() patterns
  const re = /atob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/g;
  let am;
  while ((am = re.exec(html)) !== null) {
    const dec = _b64decode(am[1]);
    const src = /(https?:[^\s"'\\]+\.m3u8[^\s"'\\]*)/.exec(dec.replace(/\\\//g, '/'));
    if (src) return { type: 'hls', url: src[1], headers: { Referer: referer } };
  }
  // Long base64 variables
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
  // Streamtape: link construido con document.getElementById('robotlink')
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
  let html = await _fetchHtml(url, 'https://doodstream.com/');
  const passM = /\/pass_md5\/([^'"]+)/.exec(html);
  if (!passM) return _err('dood: pass no encontrado');
  const passUrl = `https://doodstream.com/pass_md5/${passM[1]}`;
  const token = await _fetchHtml(passUrl, url);
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

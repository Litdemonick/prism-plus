// ==MiruExtension==
// @name         AnimeFLV
// @version      1.1.0
// @author       PrismHub
// @lang         es
// @license      MIT
// @icon         https://animeflv.net/favicon.ico
// @package      io.prismhub.animeflv
// @type         bangumi
// @webSite      https://animeflv.net
// @description  Anime en español e inglés subtitulado desde AnimeFLV
// ==/MiruExtension==

export default class extends Extension {
  async latest(page) {
    const html = await this.request(`/browse?order=added&page=${page}`);
    return _parseCards(html);
  }

  async search(kw, page) {
    const html = await this.request(`/browse?q=${encodeURIComponent(kw)}&page=${page}`);
    return _parseCards(html);
  }

  async detail(url) {
    const slug = url.replace(/.*\/anime\//, '');
    const html = await this.request(`/anime/${slug}`);

    const title = (_rx(/<h1[^>]*class="[^"]*Title[^"]*"[^>]*>([^<]+)<\/h1>/i, html) || slug).trim();
    const rawCover = _rx(/<div[^>]*class="[^"]*AnimeCover[^"]*"[\s\S]*?<img[^>]*src="([^"]+)"/i, html) || '';
    const cover = rawCover.startsWith('http') ? rawCover : `https://animeflv.net${rawCover}`;
    const descBlock = /<div[^>]*class="Description"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
    const desc = descBlock ? descBlock[1].replace(/<[^>]*>/g, '').trim() : '';

    const epM = /var\s+episodes\s*=\s*(\[\[[\s\S]*?\]\])/.exec(html);
    const urls = [];
    if (epM) {
      try {
        const raw = JSON.parse(epM[1]);
        for (let i = raw.length - 1; i >= 0; i--) {
          const num = raw[i][0];
          urls.push({ name: `Episodio ${num}`, url: `${slug}-${num}` });
        }
      } catch {}
    }

    return { title, cover, desc, episodes: [{ title: 'Episodios', urls }] };
  }

  async watch(episodeUrl) {
    if (_isEmbed(episodeUrl)) return _resolveEmbedUrl(episodeUrl);

    const slug = episodeUrl.replace(/.*\/ver\//, '');
    const html = await this.request(`/ver/${slug}`);

    const vm = /var\s+videos\s*=\s*(\{[\s\S]*?\});/.exec(html);
    if (!vm) return _err('No se encontraron servidores');

    let videos;
    try { videos = JSON.parse(vm[1]); } catch { return _err('Error parseando servidores'); }

    const all = [...(videos['LAT'] || []), ...(videos['SUB'] || [])]
      .map(v => ({ name: v.server || v.title || 'Server', embed: v.code || v.url || '' }))
      .filter(v => v.embed.startsWith('http'));

    if (!all.length) return _err('No hay URLs válidas');

    const servers = {};
    for (const { name, embed } of all) servers[name] = embed;

    for (const { name, embed } of all) {
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

    const first = all[0];
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
  const re = /<article[^>]*class="[^"]*Anime[^"]*"[\s\S]*?<a[^>]*href="\/anime\/([^"]+)"[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<h3[^>]*class="[^"]*Title[^"]*"[^>]*>([^<]+)<\/h3>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const [, slug, rawCover, title] = m;
    items.push({
      title: title.trim(),
      url: slug.trim(),
      cover: rawCover.startsWith('http') ? rawCover : `https://animeflv.net${rawCover}`,
    });
  }
  return items;
}

function _isEmbed(url) {
  if (!url.startsWith('http')) return false;
  return !url.includes('animeflv.net');
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
    if (s.includes('mp4upload')) return await _resolveMp4upload(url);
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

async function _resolveMp4upload(url) {
  const html = await _fetchHtml(url, 'https://mp4upload.com/');
  const src = /src\s*:\s*["']([^"']+\.mp4[^"']*)["']/.exec(html)
    || /(https?:[^\s"']+\.mp4[^\s"']*)/.exec(html);
  if (src) return { type: 'mp4', url: src[1], headers: { Referer: 'https://mp4upload.com/' } };
  return _err('mp4upload: mp4 no encontrado');
}

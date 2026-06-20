// ==PrismHubExtension==
// @name         MonosChinos
// @version      1.1.7
// @author       PrismHub
// @lang         es
// @license      MIT
// @icon         https://monoschinos.st/img/2web.jpg
// @package      io.prismhub.monoschinos
// @type         bangumi
// @webSite      https://monoschinos.st
// @description  Anime en español latino desde MonosChinos
// ==/PrismHubExtension==
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};

// sdk/http.ts
var NetworkError = class extends Error {
  constructor(cause, url) {
    var _a;
    super(`Error de red en ${url}: ${(_a = cause == null ? void 0 : cause.message) != null ? _a : cause}`);
    this.name = "NetworkError";
  }
};
var HttpError = class extends Error {
  constructor(status, statusText, url) {
    super(`HTTP ${status} ${statusText} \u2014 ${url}`);
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.name = "HttpError";
  }
};
var TimeoutError = class extends Error {
  constructor(ms, url) {
    super(`Timeout de ${ms}ms superado \u2014 ${url}`);
    this.name = "TimeoutError";
  }
};
var DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
var DEFAULT_TIMEOUT = 15e3;
var DEFAULT_RETRIES = 2;
function isRetryable(status) {
  return status === 429 || status >= 500 && status < 600;
}
async function request(url, options = {}) {
  const {
    method = "GET",
    headers = {},
    body,
    retries = DEFAULT_RETRIES,
    timeout = DEFAULT_TIMEOUT,
    acceptStatus = false
  } = options;
  const merged = __spreadValues({ "User-Agent": DEFAULT_UA }, headers);
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const Ctrl = typeof AbortController !== "undefined" ? AbortController : null;
    const controller = Ctrl ? new Ctrl() : null;
    let timer;
    try {
      const res = await Promise.race([
        fetch(url, {
          method,
          headers: merged,
          body,
          signal: controller ? controller.signal : void 0
        }),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            if (controller) controller.abort();
            reject(new TimeoutError(timeout, url));
          }, timeout);
        })
      ]);
      if (timer) clearTimeout(timer);
      if (acceptStatus || res.ok) {
        return res;
      } else {
        const err = new HttpError(res.status, res.statusText, url);
        if (isRetryable(res.status) && attempt < retries) {
          lastError = err;
        } else {
          throw err;
        }
      }
    } catch (err) {
      if (timer) clearTimeout(timer);
      if (err instanceof TimeoutError) throw err;
      if (err instanceof HttpError) throw err;
      lastError = new NetworkError(err, url);
    }
    if (attempt < retries) await _sleep(300 * 2 ** attempt);
  }
  throw lastError;
}
async function get(url, headers) {
  return (await request(url, { headers })).text();
}
function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// sdk/html.ts
function matchFirst(html, pattern) {
  var _a, _b, _c;
  return (_c = (_b = (_a = pattern.exec(html)) == null ? void 0 : _a[1]) == null ? void 0 : _b.trim()) != null ? _c : "";
}
function between(html, start, end) {
  const s = html.indexOf(start);
  if (s === -1) return "";
  const e = html.indexOf(end, s + start.length);
  if (e === -1) return "";
  return html.slice(s + start.length, e).trim();
}
function stripTags(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// extensions/monoschinos/index.ts
var BASE = "https://monoschinos.st";
function parseItems(html) {
  const items = [];
  const parts = html.split("ficha_efecto");
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const href = matchFirst(block, /href="([^"]+)"/i);
    const cover = matchFirst(block, /data-src="([^"]+)"/i);
    const title = matchFirst(block, /class="[^"]*title_cap[^"]*"[^>]*>([^<]+)/i);
    if (!href || !title) continue;
    items.push({
      title: title.trim(),
      url: href.startsWith("http") ? href : `${BASE}${href}`,
      cover: cover || void 0
    });
  }
  return items;
}
async function latest(page) {
  return parseItems(await get(`${BASE}/animes?p=${page}`));
}
async function search(keyword, _page) {
  return parseItems(await get(`${BASE}/buscar?q=${encodeURIComponent(keyword)}`));
}
async function detail(url) {
  const html = await get(url);
  const title = matchFirst(html, /<h1[^>]*>([^<]+)<\/h1>/i);
  const cover = matchFirst(html, /class="[^"]*lazy[^"]*"[^>]*data-src="([^"]+)"/i) || matchFirst(html, /data-src="([^"]+)"[^>]*class="[^"]*lazy[^"]*"/i);
  const descBlock = between(html, '<div class="mb-3">', "</div>");
  const description = stripTags(between(descBlock, "<p>", "</p>"));
  const ep1Match = new RegExp(
    `href="https?://monoschinos\\.st/ver/([^"]+)-episodio-1"`
  ).exec(html);
  if (!ep1Match) {
    return { title: title || url, cover: cover || void 0, desc: description, episodes: [] };
  }
  const slug = ep1Match[1];
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/-/g, "[-]");
  const epRe = new RegExp(`/ver/${escapedSlug}-episodio-(\\d+)`, "g");
  let maxEp = 1;
  for (const match of html.matchAll(epRe)) {
    const n = parseInt(match[1], 10);
    if (n > maxEp) maxEp = n;
  }
  const episodes = Array.from({ length: maxEp }, (_, i) => ({
    name: `Episodio ${i + 1}`,
    url: `${BASE}/ver/${slug}-episodio-${i + 1}`
  }));
  return { title, cover: cover || void 0, desc: description, episodes: [{ title: "Episodios", urls: episodes }] };
}
async function watch(url) {
  var _a, _b;
  const html = await get(url, { Referer: `${BASE}/` });
  const servers = {};
  const referers = {};
  const seen = /* @__PURE__ */ new Set();
  function addServer(name, embedUrl) {
    if (seen.has(embedUrl)) return;
    seen.add(embedUrl);
    servers[name] = embedUrl;
    referers[name] = `${BASE}/`;
  }
  for (const m of html.matchAll(/pixeldrain\.com\/(?:u|d)\/([A-Za-z0-9]+)/g)) {
    addServer("Pixeldrain", `https://pixeldrain.com/api/file/${m[1]}`);
  }
  const DL_RE = /https?:\/\/(?:bysekoze\.com|luluvdo\.com|filemoon\.[a-z]{2,4}|voe\.sx|doodstream\.com|ds2play\.com|streamtape\.(?:com|net|to)|mixdrop\.(?:co|top|to|sx|ag)|mp4upload\.com|vidhide\.com|filelions\.com|streamwish\.(?:com|to))\/[^\s"'<>)]+/gi;
  for (const m of html.matchAll(DL_RE)) {
    const dlUrl = m[0].replace(/['"<>)\s]+$/, "");
    addServer(_guessServer(dlUrl), dlUrl);
  }
  for (const m of html.matchAll(/gofile\.io\/d\/([A-Za-z0-9]+)/g)) {
    const gfId = m[1];
    if (seen.has(`gofile:${gfId}`)) continue;
    seen.add(`gofile:${gfId}`);
    try {
      const raw = await get(
        `https://api.gofile.io/getContent?contentId=${gfId}&token=&websiteToken=7fd94ds12fds4`,
        { Referer: "https://gofile.io/" }
      );
      const data = JSON.parse(raw);
      if ((data == null ? void 0 : data.status) === "ok") {
        const files = Object.values((_b = (_a = data.data) == null ? void 0 : _a.contents) != null ? _b : {});
        const vid = files.find((f) => {
          var _a2;
          return (_a2 = f == null ? void 0 : f.mimetype) == null ? void 0 : _a2.includes("video");
        });
        if (vid == null ? void 0 : vid.directLink) addServer("Gofile", vid.directLink);
      }
    } catch (e) {
    }
  }
  const serverNames = Object.keys(servers);
  if (serverNames.length === 0) {
    return {
      type: "hls",
      url: `page://${url}`,
      headers: {
        "X-Page-Url": url
      }
    };
  }
  const primaryName = serverNames[0];
  const primaryUrl = servers[primaryName];
  return {
    type: "hls",
    url: primaryUrl,
    headers: {
      "X-Servers": JSON.stringify(servers),
      "X-Server-Referers": JSON.stringify(referers),
      "X-Primary-Server": primaryName,
      "X-Page-Url": url
    }
  };
}
function _guessServer(url) {
  if (url.includes("voe")) return "Voe";
  if (url.includes("streamtape")) return "Streamtape";
  if (url.includes("pixeldrain")) return "Pixeldrain";
  if (url.includes("mixdrop") || url.includes("mxdrop")) return "Mixdrop";
  if (url.includes("doodstream") || url.includes("ds2play")) return "Doodstream";
  if (url.includes("bysekoze")) return "Bysekoze";
  if (url.includes("luluvdo")) return "Luluvdo";
  if (url.includes("mp4upload")) return "Mp4Upload";
  if (url.includes("filemoon") || url.includes("moonplayer")) return "Filemoon";
  if (url.includes("vidhide") || url.includes("filelions") || url.includes("streamwish")) return "Streamwish";
  return "Embed";
}

export default class extends Extension {
  async latest(page) { return latest(page); }
  async search(kw, page, filter) { return search(kw, page, filter); }
  async createFilter(filter) { return (typeof createFilter === 'function') ? createFilter(filter) : {}; }

  // Adapta el detail de Prism+ al de PrismHub: episodios planos [{title,url}] ->
  // grupos [{title, urls:[{name,url}]}], y description -> desc.
  async detail(url) {
    var d = await detail(url);
    if (!d || typeof d !== 'object') return d;
    var eps = Array.isArray(d.episodes) ? d.episodes : [];
    var grouped;
    if (eps.length && eps[0] && Array.isArray(eps[0].urls)) {
      grouped = eps.map(function (g) {
        return {
          title: g.title || 'Episodios',
          urls: (Array.isArray(g.urls) ? g.urls : []).filter(function (e) {
            return e && e.url;
          }).map(function (e) {
            return { name: e.name || e.title || e.url, url: e.url };
          })
        };
      });
    } else {
      grouped = [{
        title: 'Episodios',
        urls: eps.filter(function (e) { return e && e.url; }).map(function (e) {
          return { name: e.title || e.name || e.url, url: e.url };
        })
      }];
    }
    return {
      title: d.title || '',
      cover: d.cover,
      desc: d.desc || d.description || '',
      episodes: grouped,
      headers: d.headers
    };
  }
  async checkUpdate(url) { return (typeof checkUpdate === 'function') ? checkUpdate(url) : {}; }

  // Adapta el formato de Prism+ ({streams:[{url,quality,headers}]}) al contrato
  // de watch de PrismHub ({type,url,headers} + X-Servers para el selector de
  // servidores). Si llega una URL ya resuelta (cambio de servidor), se devuelve.
  async watch(url) {
    if (typeof url === 'string' && url.indexOf('http') === 0 &&
        (url.indexOf('.m3u8') !== -1 || url.indexOf('.mp4') !== -1)) {
      return { type: url.indexOf('.mp4') !== -1 ? 'mp4' : 'hls', url: url, headers: {} };
    }
    var r = await watch(url);
    if (!r || !Array.isArray(r.streams)) return r;
    var streams = r.streams.filter(function (s) { return s && s.url; });
    // pageUrl: la URL de la página del episodio. La app la carga en un WebView
    // oculto y sniffe el player que el propio sitio carga (fallback universal).
    var pageUrl = r.pageUrl || '';
    if (streams.length === 0) {
      if (pageUrl) {
        return { type: 'hls', url: 'page://' + pageUrl,
          headers: { 'X-Page-Url': pageUrl } };
      }
      return { type: 'hls', url: 'error://Sin servidores disponibles', headers: {} };
    }
    var servers = {}, referers = {};
    for (var i = 0; i < streams.length; i++) {
      var s = streams[i];
      var nm = s.quality || s.server || ('Servidor ' + (i + 1));
      servers[nm] = s.url;
      if (s.headers && s.headers.Referer) referers[nm] = s.headers.Referer;
    }
    var p = streams[0];
    var extra = {
      'X-Servers': JSON.stringify(servers),
      'X-Primary-Server': p.quality || p.server || 'Servidor 1',
      'X-Server-Referers': JSON.stringify(referers)
    };
    if (pageUrl) extra['X-Page-Url'] = pageUrl;
    return {
      type: p.url.indexOf('.mp4') !== -1 ? 'mp4' : 'hls',
      url: p.url,
      subtitles: r.subtitles || [],
      headers: Object.assign({}, p.headers || {}, extra)
    };
  }
}

// ==PrismHubExtension==
// @name         OmegaScans
// @version      1.0.1
// @author       PrismHub
// @lang         en
// @license      MIT
// @icon         https://omegascans.org/icon.png
// @package      io.prismhub.omegascans
// @type         manga
// @webSite      https://omegascans.org
// @description  Manga en inglés (manhwa / manhua) vía API de OmegaScans
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
    const controller = new AbortController();
    try {
      const res = await Promise.race([
        fetch(url, { method, headers: merged, body, signal: controller.signal }),
        new Promise(
          (_, reject) => setTimeout(() => {
            controller.abort();
            reject(new TimeoutError(timeout, url));
          }, timeout)
        )
      ]);
      if (acceptStatus || res.ok) {
        controller.abort();
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
      if (err instanceof TimeoutError) throw err;
      if (err instanceof HttpError) throw err;
      lastError = new NetworkError(err, url);
    }
    if (attempt < retries) await _sleep(300 * 2 ** attempt);
  }
  throw lastError;
}
async function getJson(url, headers) {
  return (await request(url, { headers })).json();
}
function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// extensions/omegascans/index.ts
var API = "https://api.omegascans.org";
function queryUrl(extra) {
  return `${API}/query?series_status=All&order=desc&orderBy=total_views&series_type=Comic&perPage=20&${extra}`;
}
async function latest(page) {
  const data = await getJson(queryUrl(`page=${page}`));
  return data.data.map((item) => ({
    title: item.title,
    url: item.series_slug,
    cover: item.thumbnail
  }));
}
async function search(keyword, page) {
  const data = await getJson(
    queryUrl(`query_string=${encodeURIComponent(keyword)}&page=${page}`)
  );
  return data.data.map((item) => ({
    title: item.title,
    url: item.series_slug,
    cover: item.thumbnail
  }));
}
async function detail(slug) {
  const series = await getJson(`${API}/series/${slug}`);
  const chapRes = await getJson(
    `${API}/chapter/query?page=1&perPage=10000&series_id=${series.id}`
  );
  return {
    title: series.title,
    cover: series.thumbnail,
    description: series.description,
    episodes: chapRes.data.map((ch) => {
      var _a;
      return {
        title: (_a = ch.chapter_name) != null ? _a : `Chapter ${ch.title}`,
        url: `${ch.series.series_slug}/${ch.chapter_slug}`
      };
    })
  };
}
async function watch(url) {
  var _a, _b, _c;
  const data = await getJson(`${API}/chapter/${url}`);
  const images = (_c = (_b = (_a = data.chapter) == null ? void 0 : _a.chapter_data) == null ? void 0 : _b.images) != null ? _c : [];
  return {
    streams: images.map((imgUrl, i) => ({
      url: imgUrl,
      quality: `Page ${i + 1}`
    }))
  };
}

export default class extends Extension {
  async latest(page) { return latest(page); }
  async search(kw, page, filter) { return search(kw, page, filter); }
  async detail(url) { return detail(url); }
  async createFilter(filter) { return (typeof createFilter === 'function') ? createFilter(filter) : {}; }
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
    if (streams.length === 0) {
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
    return {
      type: p.url.indexOf('.mp4') !== -1 ? 'mp4' : 'hls',
      url: p.url,
      subtitles: r.subtitles || [],
      headers: Object.assign({}, p.headers || {}, {
        'X-Servers': JSON.stringify(servers),
        'X-Primary-Server': p.quality || p.server || 'Servidor 1',
        'X-Server-Referers': JSON.stringify(referers)
      })
    };
  }
}

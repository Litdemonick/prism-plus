// ==PrismHubExtension==
// @name         MangaDex
// @version      1.0.2
// @author       PrismHub
// @lang         all
// @license      MIT
// @icon         https://mangadex.org/img/avatar.png
// @package      io.prismhub.mangadex
// @type         manga
// @webSite      https://mangadex.org
// @description  Manga multi-idioma vía API oficial de MangaDex
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

// extensions/mangadex/index.ts
var API = "https://api.mangadex.org";
var COVERS = "https://uploads.mangadex.org/covers";
function coverUrl(mangaId, fileName) {
  return `${COVERS}/${mangaId}/${fileName}.256.jpg`;
}
function titleOf(attrs) {
  var _a, _b;
  const t = attrs.title;
  return (_b = (_a = t["en"]) != null ? _a : t[Object.keys(t)[0]]) != null ? _b : "Unknown";
}
function mapItem(item) {
  var _a;
  const rel = item.relationships.find((r) => r.type === "cover_art");
  if (!((_a = rel == null ? void 0 : rel.attributes) == null ? void 0 : _a.fileName)) return null;
  return {
    title: titleOf(item.attributes),
    url: item.id,
    cover: coverUrl(item.id, rel.attributes.fileName)
  };
}
var RATINGS = "contentRating%5B%5D=safe&contentRating%5B%5D=suggestive&contentRating%5B%5D=erotica";
var INCLUDES = "includes%5B%5D=cover_art";
async function latest(page) {
  const offset = (page - 1) * 30;
  const data = await getJson(
    `${API}/manga?order%5BlatestUploadedChapter%5D=desc&limit=30&offset=${offset}&${INCLUDES}&${RATINGS}`
  );
  return data.data.flatMap((item) => {
    const mapped = mapItem(item);
    return mapped ? [mapped] : [];
  });
}
async function search(keyword, page) {
  const offset = (page - 1) * 30;
  const data = await getJson(
    `${API}/manga?title=${encodeURIComponent(keyword)}&limit=30&offset=${offset}&${INCLUDES}&${RATINGS}&order%5Brelevance%5D=desc`
  );
  return data.data.flatMap((item) => {
    const mapped = mapItem(item);
    return mapped ? [mapped] : [];
  });
}
async function detail(mangaId) {
  var _a, _b, _c;
  const [mangaRes, chapRes] = await Promise.all([
    getJson(`${API}/manga/${mangaId}?${INCLUDES}&${RATINGS}`),
    getJson(
      `${API}/manga/${mangaId}/feed?order%5Bvolume%5D=asc&order%5Bchapter%5D=asc&limit=500&translatedLanguage%5B%5D=en&${RATINGS}`
    )
  ]);
  const manga = mangaRes.data;
  const rel = manga.relationships.find((r) => r.type === "cover_art");
  const cover = ((_a = rel == null ? void 0 : rel.attributes) == null ? void 0 : _a.fileName) ? coverUrl(mangaId, rel.attributes.fileName) : void 0;
  const desc = manga.attributes.description;
  const description = (_c = (_b = desc["en"]) != null ? _b : desc[Object.keys(desc)[0]]) != null ? _c : "";
  const episodes = chapRes.data.map((ch) => {
    const num = ch.attributes.chapter;
    const t = ch.attributes.title;
    const label = num ? `Chapter ${num}${t ? ` \u2014 ${t}` : ""}` : t != null ? t : "Chapter";
    return { title: label, url: ch.id };
  });
  return { title: titleOf(manga.attributes), cover, description, episodes };
}
async function watch(chapterId) {
  const data = await getJson(`${API}/at-home/server/${chapterId}`);
  const { baseUrl, chapter: { hash, data: pages } } = data;
  return {
    streams: pages.map((filename, i) => ({
      url: `${baseUrl}/data/${hash}/${filename}`,
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

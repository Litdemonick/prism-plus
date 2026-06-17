// ==PrismHubExtension==
// @name         Jikan Anime
// @version      1.0.0
// @author       PrismHub
// @lang         en
// @license      MIT
// @icon         https://cdn.myanimelist.net/img/sp/icon/apple-touch-icon-256.png
// @package      io.prismhub.jikan
// @type         bangumi
// @webSite      https://myanimelist.net
// @description  Catálogo de anime desde MyAnimeList vía Jikan API pública (sin autenticación)
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
    try {
      const res = await Promise.race([
        fetch(url, {
          method,
          headers: merged,
          body,
          signal: controller ? controller.signal : void 0
        }),
        new Promise(
          (_, reject) => setTimeout(() => {
            if (controller) controller.abort();
            reject(new TimeoutError(timeout, url));
          }, timeout)
        )
      ]);
      if (acceptStatus || res.ok) {
        if (controller) controller.abort();
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

// extensions/jikan-anime/index.ts
var BASE = "https://api.jikan.moe/v4";
async function latest(page) {
  const data = await getJson(
    `${BASE}/top/anime?page=${page}&filter=airing&limit=20`
  );
  return data.data.map(mapItem);
}
async function search(keyword, page) {
  const data = await getJson(
    `${BASE}/anime?q=${encodeURIComponent(keyword)}&page=${page}&limit=20&sfw=true`
  );
  return data.data.map(mapItem);
}
async function detail(url) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
  const [anime, eps] = await Promise.all([
    getJson(`${BASE}/anime/${url}/full`),
    getJson(`${BASE}/anime/${url}/episodes`)
  ]);
  const a = anime.data;
  return {
    title: a.title,
    cover: (_b = (_a = a.images) == null ? void 0 : _a.jpg) == null ? void 0 : _b.large_image_url,
    description: (_c = a.synopsis) != null ? _c : void 0,
    episodes: eps.data.map((e) => ({
      title: e.title ? `Ep. ${e.mal_id} \u2014 ${e.title}` : `Episodio ${e.mal_id}`,
      url: `${url}/ep/${e.mal_id}`
    })),
    extra: {
      Estado: (_d = a.status) != null ? _d : "",
      Tipo: (_e = a.type) != null ? _e : "",
      Episodios: String((_f = a.episodes) != null ? _f : "?"),
      Duraci\u00F3n: (_g = a.duration) != null ? _g : "",
      Calificaci\u00F3n: a.score ? `${a.score} / 10` : "N/A",
      Estudio: (_j = (_i = (_h = a.studios) == null ? void 0 : _h[0]) == null ? void 0 : _i.name) != null ? _j : "",
      Temporada: a.season && a.year ? `${capitalize(a.season)} ${a.year}` : "",
      G\u00E9neros: (_l = (_k = a.genres) == null ? void 0 : _k.map((g) => g.name).join(", ")) != null ? _l : ""
    }
  };
}
async function watch(_url) {
  return { streams: [] };
}
function mapItem(a) {
  var _a, _b, _c, _d;
  return {
    title: a.title,
    url: String(a.mal_id),
    cover: (_b = (_a = a.images) == null ? void 0 : _a.jpg) == null ? void 0 : _b.image_url,
    description: (_c = a.synopsis) != null ? _c : void 0,
    tags: (_d = a.genres) == null ? void 0 : _d.map((g) => g.name)
  };
}
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
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

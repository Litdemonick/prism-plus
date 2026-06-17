// ==PrismHubExtension==
// @name         Animepahe
// @version      1.0.1
// @author       PrismHub
// @lang         en
// @license      MIT
// @icon         https://animepahe.ru/web-app-manifest-512x512.png
// @package      io.prismhub.animepahe
// @type         bangumi
// @webSite      https://animepahe.ru
// @description  Anime en inglés desde Animepahe
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
async function get(url, headers) {
  return (await request(url, { headers })).text();
}
async function getJson(url, headers) {
  return (await request(url, { headers })).json();
}
function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// sdk/html.ts
function matchFirst(html, pattern) {
  var _a, _b, _c;
  return (_c = (_b = (_a = pattern.exec(html)) == null ? void 0 : _a[1]) == null ? void 0 : _b.trim()) != null ? _c : "";
}

// sdk/unpack.ts
function unpackPacker(packed) {
  const argMatch = /\}\s*\(\s*([\s\S]+?),\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\(\s*'\|'\s*\)/.exec(
    packed
  );
  if (!argMatch) return packed;
  const rawCode = argMatch[1];
  const radix = parseInt(argMatch[2], 10);
  let count = parseInt(argMatch[3], 10);
  const keys = argMatch[4].split("|");
  const codeMatch = /^\s*'([\s\S]*)'\s*$/.exec(rawCode) || /^\s*"([\s\S]*)"\s*$/.exec(rawCode);
  if (!codeMatch) return packed;
  let code = codeMatch[1];
  function toBase(n) {
    var _a, _b;
    const digits = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const safeRadix = Math.min(radix, 62);
    if (n < safeRadix) return (_a = digits[n]) != null ? _a : n.toString(36);
    return toBase(Math.floor(n / safeRadix)) + ((_b = digits[n % safeRadix]) != null ? _b : (n % safeRadix).toString(36));
  }
  const lookup = {};
  while (count--) {
    const key = toBase(count);
    if (keys[count] && keys[count] !== "") {
      lookup[key] = keys[count];
    }
  }
  code = code.replace(/\b(\w+)\b/g, (token) => {
    var _a;
    return (_a = lookup[token]) != null ? _a : token;
  });
  code = code.replace(/\\'/g, "'").replace(/\\"/g, '"');
  return code;
}
function unpackAllInHtml(html) {
  const results = [];
  const re = /eval\s*\(\s*function\s*\(p,a,c,k,e,[d_]\)([\s\S]*?)\)\s*\)/g;
  let match;
  while ((match = re.exec(html)) !== null) {
    const unpacked = unpackPacker(match[0]);
    if (unpacked !== match[0]) results.push(unpacked);
  }
  return results;
}

// sdk/cache.ts
var TTL = {
  /** Listas (latest/search) — cambian con frecuencia */
  LIST: 5 * 6e4,
  // 5 minutos
  /** Detalles (detail) — estables, cambian poco */
  DETAIL: 30 * 6e4,
  // 30 minutos
  /** Streams (watch) — no cachear, las URLs expiran */
  WATCH: 0
};
function createCache() {
  const store = /* @__PURE__ */ new Map();
  function get2(key) {
    const entry = store.get(key);
    if (!entry) return void 0;
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      store.delete(key);
      return void 0;
    }
    return entry.value;
  }
  function set(key, value, ttlMs = TTL.LIST) {
    if (ttlMs === 0) return;
    store.set(key, {
      value,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : -1
    });
  }
  function has(key) {
    return get2(key) !== void 0;
  }
  function del(key) {
    store.delete(key);
  }
  function clear() {
    store.clear();
  }
  return { get: get2, set, has, delete: del, clear };
}

// extensions/animepahe/index.ts
var BASE = "https://animepahe.ru";
var KWIK = "https://kwik.si";
var CACHE = createCache();
async function latest(page) {
  const key = `latest:${page}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const data = await getJson(`${BASE}/api?m=airing&page=${page}`);
  const result = data.data.map((item) => ({
    title: item.anime_title,
    url: item.anime_session,
    cover: item.snapshot
  }));
  CACHE.set(key, result, TTL.LIST);
  return result;
}
async function search(keyword, _page) {
  const key = `search:${keyword}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const data = await getJson(
    `${BASE}/api?m=search&q=${encodeURIComponent(keyword)}`
  );
  const result = data.data.map((item) => ({
    title: item.title,
    url: item.session,
    cover: item.poster
  }));
  CACHE.set(key, result, TTL.LIST);
  return result;
}
async function detail(session) {
  const key = `detail:${session}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const [html, epData] = await Promise.all([
    get(`${BASE}/anime/${session}`),
    getJson(`${BASE}/api?m=release&id=${session}&sort=episode_asc`)
  ]);
  const title = matchFirst(html, /<span[^>]*class="[^"]*user-select-none[^"]*"[^>]*>([^<]+)<\/span>/i) || matchFirst(html, /<h1[^>]*>([^<]+)<\/h1>/i);
  const cover = matchFirst(html, /href="(https:\/\/i\.animepahe\.ru\/posters[^"]+)"/i);
  const description = matchFirst(
    html,
    /<div[^>]*class="[^"]*anime-synopsis[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  ).replace(/<[^>]*>/g, "").trim();
  const episodes = epData.data.map((ep) => ({
    title: `Episode ${ep.episode}`,
    url: `${session};${ep.session}`
  }));
  const result = { title, cover: cover || void 0, description, episodes };
  CACHE.set(key, result, TTL.DETAIL);
  return result;
}
async function watch(url) {
  var _a;
  const [animeSession, episodeSession] = url.split(";");
  if (!episodeSession) return { streams: [] };
  const linksData = await getJson(
    `${BASE}/api?m=links&id=${animeSession}&session=${episodeSession}&p=kwik`
  );
  const entries = Object.entries((_a = linksData.data) != null ? _a : {});
  if (entries.length === 0) return { streams: [] };
  const streams = [];
  for (const [quality, link] of entries) {
    const kwikUrl = link.kwik;
    if (!kwikUrl) continue;
    try {
      const m3u8 = await resolveKwik(kwikUrl);
      if (m3u8) {
        streams.push({
          url: m3u8,
          quality,
          label: `${quality} ${link.audio === "jpn" ? "(Sub)" : "(Dub)"}`,
          mimeType: "application/x-mpegURL",
          headers: { Referer: `${KWIK}/` }
        });
      }
    } catch (e) {
    }
  }
  return { streams, headers: { Referer: `${KWIK}/` } };
}
async function resolveKwik(kwikUrl) {
  const html = await get(kwikUrl, {
    Referer: `${BASE}/`,
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Dest": "iframe"
  });
  const unpacked = unpackAllInHtml(html);
  for (const code of unpacked) {
    const m3u8 = matchFirst(code, /source\s*=\s*'([^']+\.m3u8[^']*)'/i) || matchFirst(code, /source\s*=\s*"([^"]+\.m3u8[^"]*)"/i) || matchFirst(code, /file\s*:\s*"([^"]+\.m3u8[^"]*)"/i) || matchFirst(code, /file\s*:\s*'([^']+\.m3u8[^']*)'/i) || matchFirst(code, /"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/i);
    if (m3u8) {
      return m3u8.split("|")[0].trim();
    }
  }
  const direct = matchFirst(html, /https?:\/\/[^\s"']+\.m3u8[^\s"']*/i);
  return direct || null;
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

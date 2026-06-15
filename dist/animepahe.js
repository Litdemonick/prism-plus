"use strict";
var io_prismhub_animepahe = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // extensions/animepahe/index.ts
  var index_exports = {};
  __export(index_exports, {
    detail: () => detail,
    latest: () => latest,
    search: () => search,
    watch: () => watch
  });

  // sdk/http.ts
  var NetworkError = class extends Error {
    constructor(cause, url) {
      super(`Error de red en ${url}: ${cause?.message ?? cause}`);
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
      timeout = DEFAULT_TIMEOUT
    } = options;
    const merged = { "User-Agent": DEFAULT_UA, ...headers };
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
        if (!res.ok) {
          const err = new HttpError(res.status, res.statusText, url);
          if (isRetryable(res.status) && attempt < retries) {
            lastError = err;
          } else {
            throw err;
          }
        } else {
          controller.abort();
          return res;
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
    return pattern.exec(html)?.[1]?.trim() ?? "";
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
      const digits = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const safeRadix = Math.min(radix, 62);
      if (n < safeRadix) return digits[n] ?? n.toString(36);
      return toBase(Math.floor(n / safeRadix)) + (digits[n % safeRadix] ?? (n % safeRadix).toString(36));
    }
    const lookup = {};
    while (count--) {
      const key = toBase(count);
      if (keys[count] && keys[count] !== "") {
        lookup[key] = keys[count];
      }
    }
    code = code.replace(/\b(\w+)\b/g, (token) => lookup[token] ?? token);
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
    const [animeSession, episodeSession] = url.split(";");
    if (!episodeSession) return { streams: [] };
    const linksData = await getJson(
      `${BASE}/api?m=links&id=${animeSession}&session=${episodeSession}&p=kwik`
    );
    const entries = Object.entries(linksData.data ?? {});
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
      } catch {
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
  return __toCommonJS(index_exports);
})();
;(function(){
  function _s(v){return v==null?'':String(v);}
  function _ep(ep){
    if(!ep||typeof ep!=='object')return null;
    var u=_s(ep.url);if(!u)return null;
    return{title:_s(ep.title)||u,url:u,thumbnail:ep.thumbnail!=null?_s(ep.thumbnail):void 0,
      duration:typeof ep.duration==='number'?ep.duration:void 0,
      airDate:ep.airDate!=null?_s(ep.airDate):void 0,
      number:typeof ep.number==='number'?ep.number:void 0};
  }
  function _detail(d){
    if(!d||typeof d!=='object')return{title:'',episodes:[]};
    var eps=(Array.isArray(d.episodes)?d.episodes:[]).map(_ep).filter(Boolean);
    return Object.assign({},d,{episodes:eps});
  }
  function _items(a){
    if(!Array.isArray(a))return[];
    return a.map(function(it){
      if(!it||typeof it!=='object')return null;
      var u=_s(it.url);if(!u)return null;
      return Object.assign({},it,{title:_s(it.title)||u,url:u});
    }).filter(Boolean);
  }
  var _m=typeof io_prismhub_animepahe!=='undefined'?io_prismhub_animepahe:null;
  if(_m&&typeof _m==='object'){
    var _d=_m.detail,_l=_m.latest,_ss=_m.search;
    if(typeof _d==='function')_m.detail=function(){return _d.apply(_m,arguments).then(_detail);};
    if(typeof _l==='function')_m.latest=function(){return _l.apply(_m,arguments).then(_items);};
    if(typeof _ss==='function')_m.search=function(){return _ss.apply(_m,arguments).then(_items);};
  }
})();

"use strict";
var io_prismhub_monoschinos = (() => {
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

  // extensions/monoschinos/index.ts
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
  function _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // sdk/html.ts
  function matchFirst(html, pattern) {
    return pattern.exec(html)?.[1]?.trim() ?? "";
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

  // sdk/embeds.ts
  async function resolveEmbed(server, embedUrl, referer) {
    const s = server.toLowerCase();
    if (s.includes("voe")) return resolveVoe(embedUrl, referer);
    if (s.includes("streamtape") || s.includes("stape") || s.includes("tape"))
      return resolveStreamtape(embedUrl, referer);
    return null;
  }
  async function resolveVoe(url, referer) {
    let html = await fetchEmbed(url, referer);
    if (!html) return null;
    const redir = /window\.location(?:\.href)?\s*=\s*['"](https?:\/\/[^'"]+)['"]/.exec(
      html
    );
    if (redir) {
      const mirror = await fetchEmbed(redir[1], "https://voe.sx/");
      if (mirror) html = mirror;
    }
    const jsonScript = /<script[^>]*type=["']application\/json["'][^>]*>\s*\[\s*"([^"]+)"\s*\]\s*<\/script>/.exec(
      html
    );
    if (jsonScript) {
      const decoded = _voeDecode(jsonScript[1]);
      if (decoded) {
        const mp4 = /"direct_access_url"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(decoded);
        if (mp4) return { url: _unescapeUrl(mp4[1]) };
        const src = /"source"\s*:\s*"([^"]+)"/.exec(decoded);
        if (src) return { url: _unescapeUrl(src[1]) };
        const anyM3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(
          decoded.replace(/\\\//g, "/")
        );
        if (anyM3u8) return { url: anyM3u8[1] };
      }
    }
    let m = /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(html);
    if (m) return { url: m[1] };
    const atobMatch = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
    if (atobMatch) {
      try {
        const decoded = b64decode(atobMatch[1]);
        const hls = /['"]hls['"]\s*:\s*['"]([^'"]+)['"]/.exec(decoded);
        if (hls) return { url: hls[1] };
        const direct = /(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/.exec(decoded);
        if (direct) return { url: direct[1] };
      } catch {
      }
    }
    m = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
    if (m) return { url: m[0] };
    return null;
  }
  function _rot13(s) {
    return s.replace(/[a-zA-Z]/g, (c) => {
      const base = c <= "Z" ? 65 : 97;
      return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
    });
  }
  function _unescapeUrl(s) {
    return s.replace(/\\\//g, "/");
  }
  function _voeDecode(raw) {
    try {
      let r = _rot13(raw);
      for (const p of ["@$", "^^", "#&", "~@", "%?", "*~", "!!", "`"]) {
        r = r.split(p).join("");
      }
      const step3 = b64decode(r);
      let shifted = "";
      for (let i = 0; i < step3.length; i++) {
        shifted += String.fromCharCode(step3.charCodeAt(i) - 3);
      }
      const reversed = shifted.split("").reverse().join("");
      return b64decode(reversed);
    } catch {
      return null;
    }
  }
  async function resolveStreamtape(url, referer) {
    const html = await fetchEmbed(url, referer);
    if (!html) return null;
    let m = /(https?:\/\/streamtape\.[a-z]+\/get_video[^"'\s<>&]+)/.exec(html);
    if (m) return { url: m[1] };
    m = /(\/\/streamtape\.[a-z]+\/get_video[^"'\s<>&]+)/.exec(html);
    if (m) return { url: `https:${m[1]}` };
    m = /robotlink[^)]*\)\s*\.innerHTML\s*=\s*["']([^"']+)["']\s*\+\s*["']([^"']*)["']/.exec(html);
    if (m) {
      const full = m[1] + m[2];
      return { url: full.startsWith("http") ? full : `https:${full}` };
    }
    return null;
  }
  async function fetchEmbed(url, referer) {
    try {
      const res = await request(url, {
        headers: { Referer: referer },
        timeout: 8e3,
        retries: 0
      });
      return res.text();
    } catch {
      return null;
    }
  }
  function b64decode(s) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const clean = s.replace(/[^A-Za-z0-9+/]/g, "");
    let result = "";
    let i = 0;
    while (i < clean.length) {
      const b1 = chars.indexOf(clean[i++]);
      const b2 = chars.indexOf(clean[i++]);
      const b3 = i < clean.length ? chars.indexOf(clean[i++]) : -1;
      const b4 = i < clean.length ? chars.indexOf(clean[i++]) : -1;
      result += String.fromCharCode(b1 << 2 | b2 >> 4);
      if (b3 !== -1) result += String.fromCharCode((b2 & 15) << 4 | b3 >> 2);
      if (b4 !== -1) result += String.fromCharCode((b3 & 3) << 6 | b4);
    }
    return result;
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
    const html = await get(`${BASE}/animes?p=${page}`);
    return parseItems(html);
  }
  async function search(keyword, _page) {
    const html = await get(`${BASE}/buscar?q=${encodeURIComponent(keyword)}`);
    return parseItems(html);
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
      return { title: title || url, cover: cover || void 0, description, episodes: [] };
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
      title: `Episodio ${i + 1}`,
      url: `${BASE}/ver/${slug}-episodio-${i + 1}`
    }));
    return { title, cover: cover || void 0, description, episodes };
  }
  async function watch(url) {
    const html = await get(url, { Referer: `${BASE}/` });
    const playerRe = /data-player="([A-Za-z0-9+/=]{10,})"[^>]*>([^<]{1,30})</g;
    const candidates = [];
    for (const m of html.matchAll(playerRe)) {
      const b64 = m[1];
      const serverLabel = m[2].trim();
      try {
        const embedUrl = b64decode(b64);
        if (embedUrl.startsWith("http")) {
          candidates.push({ server: serverLabel || _guessServer(embedUrl), embedUrl });
        }
      } catch {
      }
    }
    if (candidates.length === 0) {
      const pdMatch = /pixeldrain\.com\/u\/([A-Za-z0-9]+)/.exec(html);
      if (pdMatch) {
        return {
          streams: [{
            url: `https://pixeldrain.com/api/file/${pdMatch[1]}?download`,
            headers: { Referer: "https://pixeldrain.com/" }
          }]
        };
      }
      const m3u8Match = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
      if (m3u8Match) return { streams: [{ url: m3u8Match[1] }] };
      const iframeSrc = /[^-]src="(https?:\/\/(?:voe\.sx|streamtape\.[a-z]+)[^"]+)"/.exec(html);
      if (iframeSrc) {
        const embedUrl = iframeSrc[1];
        const server = _guessServer(embedUrl);
        const resolved2 = await resolveEmbed(server, embedUrl, `${BASE}/`);
        if (resolved2) return { streams: [{ url: resolved2.url, headers: resolved2.headers }] };
        return { streams: [{ url: embedUrl, quality: server }] };
      }
      return { streams: [] };
    }
    const results = await Promise.all(
      candidates.map(async ({ server, embedUrl }) => {
        const resolved2 = await resolveEmbed(server, embedUrl, `${BASE}/`);
        return { server, embedUrl, resolved: resolved2 };
      })
    );
    const resolved = results.filter((r) => r.resolved !== null).map((r) => ({ url: r.resolved.url, quality: r.server, headers: r.resolved.headers }));
    const fallback = results.filter((r) => r.resolved === null).map((r) => ({ url: r.embedUrl, quality: r.server }));
    return { streams: [...resolved, ...fallback] };
  }
  function _guessServer(url) {
    if (url.includes("voe")) return "Voe";
    if (url.includes("streamtape")) return "Streamtape";
    if (url.includes("pixeldrain")) return "Pixeldrain";
    return "Embed";
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
  var _m=typeof io_prismhub_monoschinos!=='undefined'?io_prismhub_monoschinos:null;
  if(_m&&typeof _m==='object'){
    var _d=_m.detail,_l=_m.latest,_ss=_m.search;
    if(typeof _d==='function'||typeof _l==='function'||typeof _ss==='function'){
      // esbuild define exports como getters no-configurables (Object.defineProperty sin set).
      // En strict mode asignar directo falla. Copiamos LEYENDO los getters a un objeto plano.
      var _w={};
      for(var _k in _m){try{_w[_k]=_m[_k];}catch(_e){}}
      if(typeof _d==='function')_w.detail=async function(){return _detail(await _d.apply(_m,arguments));};
      if(typeof _l==='function')_w.latest=async function(){return _items(await _l.apply(_m,arguments));};
      if(typeof _ss==='function')_w.search=async function(){return _items(await _ss.apply(_m,arguments));};
      io_prismhub_monoschinos=_w;
    }
  }
})();

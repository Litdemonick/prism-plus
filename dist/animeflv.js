"use strict";
var io_prismhub_animeflv = (() => {
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

  // extensions/animeflv/index.ts
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
  function matchGroups(html, pattern) {
    const flags = pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g";
    return [...html.matchAll(new RegExp(pattern.source, flags))].map(
      (m) => [...m].slice(1).map((s) => s?.trim() ?? "")
    );
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
    const s = `${server} ${embedUrl}`.toLowerCase();
    let result;
    try {
      if (s.includes("voe")) result = await resolveVoe(embedUrl, referer);
      else if (s.includes("streamtape") || s.includes("stape") || s.includes("strtape"))
        result = await resolveStreamtape(embedUrl, referer);
      else if (s.includes("mixdrop") || s.includes("mxdrop") || s.includes("mdrop"))
        result = await resolveMixdrop(embedUrl, referer);
      else if (s.includes("mp4upload")) result = await resolveMp4upload(embedUrl, referer);
      else result = await resolveGeneric(embedUrl, referer);
    } catch (e) {
      console.log(`[resolveEmbed] ${server} THREW: ${e?.message ?? e}`);
      return null;
    }
    console.log(
      `[resolveEmbed] ${server} -> ${result ? result.url.slice(0, 60) : "NULL"}`
    );
    return result;
  }
  async function resolveVoe(url, referer) {
    const voeOpts = { timeout: 14e3, retries: 1 };
    let html = await fetchEmbed(url, referer, voeOpts);
    if (!html) return null;
    const redir = /window\.location(?:\.href)?\s*=\s*['"](https?:\/\/[^'"]+)['"]/.exec(
      html
    );
    if (redir) {
      const mirror = await fetchEmbed(redir[1], "https://voe.sx/", voeOpts);
      if (mirror) html = mirror;
    }
    const jsonScript = /<script[^>]*type=["']application\/json["'][^>]*>\s*\[\s*"([^"]+)"\s*\]\s*<\/script>/.exec(
      html
    );
    if (jsonScript) {
      const decoded = _voeDecode(jsonScript[1]);
      if (decoded) {
        const src = /"source"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(decoded);
        if (src) return { url: _unescapeUrl(src[1]) };
        const anyM3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(
          decoded.replace(/\\\//g, "/")
        );
        if (anyM3u8) return { url: anyM3u8[1] };
        const mp4 = /"direct_access_url"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(decoded);
        if (mp4) return { url: _unescapeUrl(mp4[1]) };
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
    const div = /id=["'](?:ideoolink|botlink|robotlink)["'][^>]*>\s*(\/\/?[^<]*get_video[^<]*)</.exec(
      html
    );
    if (div) {
      let path = div[1].trim();
      if (path.startsWith("//")) path = `https:${path}`;
      else if (path.startsWith("/")) path = `https:/${path}`;
      if (!/[?&]stream=/.test(path)) path += "&stream=1";
      return { url: path, headers: { Referer: "https://streamtape.com/" } };
    }
    let m = /(https?:\/\/streamtape\.[a-z]+\/get_video[^"'\s<>]+)/.exec(html);
    if (m) return { url: m[1], headers: { Referer: "https://streamtape.com/" } };
    m = /(\/\/streamtape\.[a-z]+\/get_video[^"'\s<>]+)/.exec(html);
    if (m) return { url: `https:${m[1]}`, headers: { Referer: "https://streamtape.com/" } };
    return null;
  }
  async function resolveMixdrop(url, referer) {
    const html = await fetchEmbed(url, referer);
    if (!html) return null;
    const unpacked = _unpackAll(html);
    const wurl = /MDCore\.wurl\s*=\s*["']([^"']+)["']/.exec(unpacked);
    let target = wurl?.[1];
    if (!target) {
      const mp4 = /(\/\/[^"'\s]+\.mp4[^"'\s]*)/.exec(unpacked);
      target = mp4?.[1];
    }
    if (!target) return null;
    const full = target.startsWith("http") ? target : `https:${target}`;
    return { url: full, headers: { Referer: "https://mixdrop.top/" } };
  }
  async function resolveMp4upload(url, referer) {
    const html = await fetchEmbed(url, referer);
    if (!html) return null;
    const candidates = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g) ?? [];
    const real = candidates.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
    if (!real) return null;
    return { url: real, headers: { Referer: "https://www.mp4upload.com/" } };
  }
  async function resolveGeneric(url, referer) {
    const html = await fetchEmbed(url, referer);
    if (!html) return null;
    const host = _hostOf(url);
    const headers = host ? { Referer: `https://${host}/` } : void 0;
    const haystack = `${html}
${_unpackAll(html)}`;
    const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(haystack.replace(/\\\//g, "/"));
    if (m3u8) return { url: m3u8[1], headers };
    const file = /(?:file|source|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/.exec(
      haystack
    );
    if (file) return { url: file[1], headers };
    const mp4s = haystack.match(/https?:[^"'\s\\]+\.mp4[^"'\s\\]*/g) ?? [];
    const real = mp4s.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
    if (real) return { url: real.replace(/\\\//g, "/"), headers };
    return null;
  }
  function _unpackAll(html) {
    let out = "";
    const re = /eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]*?\.split\('\|'\)[^)]*\)\)/g;
    for (const m of html.matchAll(re)) {
      const u = _unpack(m[0]);
      if (u) out += `
${u}`;
    }
    return out;
  }
  function _unpack(src) {
    const m = /\}\s*\(\s*'(.*?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'(.*?)'\.split\('\|'\)/s.exec(
      src
    );
    if (!m) return "";
    let payload = m[1];
    const radix = parseInt(m[2], 10);
    const count = parseInt(m[3], 10);
    const words = m[4].split("|");
    payload = payload.split("\\'").join("'");
    const enc = (n) => (n < radix ? "" : enc(Math.floor(n / radix))) + ((n = n % radix) > 35 ? String.fromCharCode(n + 29) : n.toString(36));
    const dict = {};
    for (let i = count - 1; i >= 0; i--) dict[enc(i)] = words[i] || enc(i);
    return payload.replace(/\b\w+\b/g, (w) => dict[w] ?? w);
  }
  function _hostOf(url) {
    const m = /^https?:\/\/([^/]+)/.exec(url);
    return m ? m[1] : null;
  }
  async function fetchEmbed(url, referer, opts = {}) {
    try {
      const res = await request(url, {
        headers: { Referer: referer },
        timeout: opts.timeout ?? 8e3,
        retries: opts.retries ?? 0
      });
      return res.text();
    } catch (e) {
      console.log(`[fetchEmbed] FAIL ${url.slice(0, 45)} :: ${e?.message ?? e}`);
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

  // extensions/animeflv/index.ts
  var BASE = "https://animeflv.net";
  async function latest(page) {
    const html = await get(`${BASE}/browse?order=added&page=${page}`);
    return _parseCards(html);
  }
  async function search(keyword, page) {
    const html = await get(
      `${BASE}/browse?q=${encodeURIComponent(keyword)}&page=${page}`
    );
    return _parseCards(html);
  }
  async function detail(url) {
    const html = await get(`${BASE}/anime/${url}`);
    const title = matchFirst(html, /<h1[^>]*class="[^"]*Title[^"]*"[^>]*>([^<]+)<\/h1>/i);
    const rawCover = matchFirst(
      html,
      /<div[^>]*class="[^"]*AnimeCover[^"]*"[\s\S]*?<img[^>]*src="([^"]+)"/i
    );
    const cover = rawCover.startsWith("http") ? rawCover : `${BASE}${rawCover}`;
    const description = stripTags(between(html, '<div class="Description">', "</div>"));
    const episodes = _parseEpisodes(html, url);
    const status = matchFirst(
      html,
      /<span[^>]*>Estado:<\/span>\s*<span[^>]*>([^<]+)<\/span>/i
    );
    const type = matchFirst(
      html,
      /<span[^>]*>Tipo:<\/span>\s*<a[^>]*>([^<]+)<\/a>/i
    );
    const genres = matchGroups(
      html,
      /<a[^>]*href="\/browse[^"]*genre[^"]*"[^>]*>([^<]+)<\/a>/gi
    ).map((g) => g[0]);
    return {
      title,
      cover,
      description,
      episodes,
      extra: {
        Estado: status,
        Tipo: type,
        G\u00E9neros: genres.join(", ")
      }
    };
  }
  async function watch(url) {
    const html = await get(`${BASE}/ver/${url}`);
    const videosMatch = /var\s+videos\s*=\s*(\{[\s\S]*?\});/.exec(html);
    if (!videosMatch) return { streams: [] };
    let videos;
    try {
      videos = JSON.parse(videosMatch[1]);
    } catch {
      return { streams: [] };
    }
    const all = [...videos["LAT"] ?? [], ...videos["SUB"] ?? []].map((v) => ({ server: v.server || v.title || "", embed: v.code ?? v.url ?? "" })).filter((v) => v.embed.startsWith("http"));
    if (all.length === 0) return { streams: [] };
    const results = await Promise.all(
      all.map(async (v) => {
        const resolved2 = await resolveEmbed(v.server, v.embed, `${BASE}/`);
        return { server: v.server, embedUrl: v.embed, resolved: resolved2 };
      })
    );
    const resolved = results.filter((r) => r.resolved !== null).map((r) => ({ url: r.resolved.url, quality: r.server, headers: r.resolved.headers }));
    const fallback = results.filter((r) => r.resolved === null).map((r) => ({ url: r.embedUrl, quality: r.server }));
    return { streams: [...resolved, ...fallback] };
  }
  function _parseCards(html) {
    const pattern = /<article[^>]*class="[^"]*Anime[^"]*"[\s\S]*?<a[^>]*href="\/anime\/([^"]+)"[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<h3[^>]*class="[^"]*Title[^"]*"[^>]*>([^<]+)<\/h3>/gi;
    const items = [];
    for (const [, slug, rawCover, title] of html.matchAll(pattern)) {
      items.push({
        title: title.trim(),
        url: slug.trim(),
        cover: rawCover.startsWith("http") ? rawCover : `${BASE}${rawCover}`
      });
    }
    return items;
  }
  function _parseEpisodes(html, animeSlug) {
    const match = /var\s+episodes\s*=\s*(\[\[[\s\S]*?\]\])/.exec(html);
    if (!match) return [];
    try {
      const raw = JSON.parse(match[1]);
      return raw.reverse().map(([num]) => ({
        title: `Episodio ${num}`,
        url: `${animeSlug}-${num}`
      }));
    } catch {
      return [];
    }
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
  var _m=typeof io_prismhub_animeflv!=='undefined'?io_prismhub_animeflv:null;
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
      io_prismhub_animeflv=_w;
    }
  }
})();

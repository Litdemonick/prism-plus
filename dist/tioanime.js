"use strict";
var io_prismhub_tioanime = (() => {
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

  // extensions/tioanime/index.ts
  var index_exports = {};
  __export(index_exports, {
    detail: () => detail,
    latest: () => latest,
    search: () => search,
    watch: () => watch
  });

  // sdk/http.ts
  var DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  async function request(url, options = {}) {
    const { method = "GET", headers = {}, body, retries = 2 } = options;
    const merged = { "User-Agent": DEFAULT_UA, ...headers };
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fetch(url, { method, headers: merged, body });
      } catch (err) {
        lastError = err;
        if (attempt < retries) await _sleep(300 * 2 ** attempt);
      }
    }
    throw lastError;
  }
  async function get(url, headers) {
    const res = await request(url, { headers });
    return res.text();
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

  // extensions/tioanime/index.ts
  var BASE = "https://tioanime.com";
  async function latest(page) {
    const html = await get(`${BASE}/directorio?p=${page}`);
    return _parseCards(html);
  }
  async function search(keyword, page) {
    const html = await get(
      `${BASE}/directorio?q=${encodeURIComponent(keyword)}&p=${page}`
    );
    return _parseCards(html);
  }
  async function detail(url) {
    const html = await get(`${BASE}/anime/${url}`);
    const title = matchFirst(html, /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i);
    const rawCover = matchFirst(
      html,
      /<div[^>]*class="[^"]*anime-image[^"]*"[\s\S]*?<img[^>]*src="([^"]+)"/i
    );
    const cover = rawCover.startsWith("http") ? rawCover : `${BASE}${rawCover}`;
    const description = stripTags(
      between(html, '<p class="sinopsis">', "</p>")
    );
    const episodes = _parseEpisodes(html);
    const status = matchFirst(html, /Estado:\s*<\/span>\s*<span[^>]*>([^<]+)<\/span>/i);
    const genres = matchGroups(
      html,
      /<a[^>]*href="\/genero\/[^"]*"[^>]*>([^<]+)<\/a>/gi
    ).map((g) => g[0]);
    return {
      title,
      cover,
      description,
      episodes,
      extra: {
        Estado: status,
        G\u00E9neros: genres.join(", ")
      }
    };
  }
  async function watch(url) {
    const html = await get(`${BASE}/ver/${url}`);
    const match = /var\s+videos\s*=\s*(\[\[[\s\S]*?\]\])/.exec(html);
    if (!match) return { streams: [] };
    try {
      const raw = JSON.parse(match[1]);
      const streams = raw.filter(([, url2]) => url2.startsWith("http")).map(([server, url2]) => ({ url: url2, quality: server }));
      return { streams };
    } catch {
      return { streams: [] };
    }
  }
  function _parseCards(html) {
    const pattern = /<article[^>]*class="[^"]*anime[^"]*"[\s\S]*?<a[^>]*href="\/anime\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?class="[^"]*title[^"]*"[^>]*>[\s\S]*?>([^<]+)<\/a>/gi;
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
  function _parseEpisodes(html) {
    const match = /var\s+episodes\s*=\s*(\[[\s\S]*?\])/.exec(html);
    if (!match) return [];
    try {
      const raw = JSON.parse(match[1]);
      return raw.reverse().map((slug, i) => ({
        title: `Episodio ${raw.length - i}`,
        url: slug
      }));
    } catch {
      return [];
    }
  }
  return __toCommonJS(index_exports);
})();

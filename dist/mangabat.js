"use strict";
var io_prismhub_mangabat = (() => {
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

  // extensions/mangabat/index.ts
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

  // extensions/mangabat/index.ts
  var BASE = "https://h.mangabat.com";
  function parseMangaBatList(html) {
    const items = [];
    const parts = html.split("list-story-item");
    for (let i = 1; i < parts.length; i++) {
      const block = parts[i];
      const href = matchFirst(block, /href="([^"]+)"/i);
      const title = matchFirst(block, /title="([^"]+)"/i);
      const cover = matchFirst(block, /<img[^>]+src="([^"]+)"/i);
      if (!href || !title) continue;
      items.push({ title, url: href, cover: cover || void 0 });
    }
    return items;
  }
  async function latest(page) {
    const html = await get(`${BASE}/manga-list-all/${page}`);
    return parseMangaBatList(html);
  }
  async function search(keyword, page) {
    const html = await get(
      `${BASE}/search/manga/${encodeURIComponent(keyword)}?page=${page}`
    );
    return parseMangaBatList(html);
  }
  async function detail(url) {
    const html = await get(url);
    const title = matchFirst(html, /<h1[^>]*>([^<]+)<\/h1>/i);
    const cover = matchFirst(html, /class="info-image"[\s\S]*?<img[^>]+src="([^"]+)"/i);
    const rawDesc = between(html, 'id="panel-story-info-description"', "</div>");
    const description = stripTags(rawDesc.replace(/^\s*<[^>]+>/i, ""));
    const episodes = matchGroups(
      html,
      /<a[^>]+href="(https:\/\/h\.mangabat\.com[^"]+)"[^>]*>([^<]+)<\/a>/gi
    ).filter(([u]) => u.includes("/manga-")).map(([u, t]) => ({ title: t.trim(), url: u }));
    return { title, cover: cover || void 0, description, episodes };
  }
  async function watch(url) {
    const html = await get(url, { Referer: `${BASE}/` });
    const readerMatch = /class="container-chapter-reader"([\s\S]*?)<\/div>/i.exec(html);
    if (!readerMatch) return { streams: [] };
    const pages = matchGroups(readerMatch[1], /<img[^>]+src="([^"]+)"[^>]*>/gi).map(([src]) => src).filter(Boolean);
    return {
      streams: pages.map((src, i) => ({
        url: src,
        quality: `Page ${i + 1}`,
        headers: { Referer: `${BASE}/` }
      }))
    };
  }
  return __toCommonJS(index_exports);
})();

"use strict";
var io_prismhub_comick = (() => {
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

  // extensions/comick/index.ts
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
  async function getJson(url, headers) {
    return (await request(url, { headers })).json();
  }
  function _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // extensions/comick/index.ts
  var API = "https://api.comick.fun";
  var CDN = "https://meo.comick.pictures";
  function comickCover(covers) {
    return covers[0] ? `${CDN}/${covers[0].b2key}` : void 0;
  }
  async function latest(page) {
    if (page > 1) return [];
    const data = await getJson(`${API}/top?accept_mature_content=false`);
    return data.rank.map((item) => ({
      title: item.title,
      url: item.slug,
      cover: comickCover(item.md_covers)
    }));
  }
  async function search(keyword, page) {
    const data = await getJson(
      `${API}/v1.0/search/?page=${page}&limit=30&q=${encodeURIComponent(keyword)}&t=false`
    );
    return data.map((item) => ({
      title: item.title,
      url: item.slug,
      cover: comickCover(item.md_covers)
    }));
  }
  async function detail(slug) {
    const res = await getJson(`${API}/comic/${slug}`);
    const { hid, title, desc, md_covers } = res.comic;
    const chapRes = await getJson(
      `${API}/comic/${hid}/chapters?limit=99999`
    );
    const byLang = /* @__PURE__ */ new Map();
    for (const ch of chapRes.chapters) {
      if (!byLang.has(ch.lang)) byLang.set(ch.lang, []);
      byLang.get(ch.lang).push(ch);
    }
    const sorted = [...byLang.entries()].sort(
      ([a], [b]) => a === "en" ? -1 : b === "en" ? 1 : a.localeCompare(b)
    );
    const episodes = sorted.flatMap(
      ([lang, chapters]) => chapters.map((ch) => ({
        title: `[${lang}] Chapter ${ch.chap ?? "?"}`,
        url: ch.hid
      }))
    );
    return { title, cover: comickCover(md_covers), description: desc, episodes };
  }
  async function watch(hid) {
    const data = await getJson(
      `${API}/chapter/${hid}?tachiyomi=true`
    );
    return {
      streams: data.chapter.images.map((img, i) => ({
        url: img.url,
        quality: `Page ${i + 1}`
      }))
    };
  }
  return __toCommonJS(index_exports);
})();

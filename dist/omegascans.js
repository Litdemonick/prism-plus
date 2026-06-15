"use strict";
var io_prismhub_omegascans = (() => {
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

  // extensions/omegascans/index.ts
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
      episodes: chapRes.data.map((ch) => ({
        title: ch.chapter_name ?? `Chapter ${ch.title}`,
        url: `${ch.series.series_slug}/${ch.chapter_slug}`
      }))
    };
  }
  async function watch(url) {
    const data = await getJson(`${API}/chapter/${url}`);
    return {
      streams: data.chapter.chapter_data.images.map((imgUrl, i) => ({
        url: imgUrl,
        quality: `Page ${i + 1}`
      }))
    };
  }
  return __toCommonJS(index_exports);
})();

"use strict";
var io_prismhub_jikan = (() => {
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

  // extensions/jikan-anime/index.ts
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
  async function getJson(url, headers) {
    const res = await request(url, { headers });
    return res.json();
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
    const [anime, eps] = await Promise.all([
      getJson(`${BASE}/anime/${url}/full`),
      getJson(`${BASE}/anime/${url}/episodes`)
    ]);
    const a = anime.data;
    return {
      title: a.title,
      cover: a.images?.jpg?.large_image_url,
      description: a.synopsis ?? void 0,
      episodes: eps.data.map((e) => ({
        title: e.title ? `Ep. ${e.mal_id} \u2014 ${e.title}` : `Episodio ${e.mal_id}`,
        url: `${url}/ep/${e.mal_id}`
      })),
      extra: {
        Estado: a.status ?? "",
        Tipo: a.type ?? "",
        Episodios: String(a.episodes ?? "?"),
        Duraci\u00F3n: a.duration ?? "",
        Calificaci\u00F3n: a.score ? `${a.score} / 10` : "N/A",
        Estudio: a.studios?.[0]?.name ?? "",
        Temporada: a.season && a.year ? `${capitalize(a.season)} ${a.year}` : "",
        G\u00E9neros: a.genres?.map((g) => g.name).join(", ") ?? ""
      }
    };
  }
  async function watch(_url) {
    return { streams: [] };
  }
  function mapItem(a) {
    return {
      title: a.title,
      url: String(a.mal_id),
      cover: a.images?.jpg?.image_url,
      description: a.synopsis ?? void 0,
      tags: a.genres?.map((g) => g.name)
    };
  }
  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return __toCommonJS(index_exports);
})();

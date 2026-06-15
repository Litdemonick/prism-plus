"use strict";
var io_prismhub_mangadex = (() => {
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

  // extensions/mangadex/index.ts
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

  // extensions/mangadex/index.ts
  var API = "https://api.mangadex.org";
  var COVERS = "https://uploads.mangadex.org/covers";
  function coverUrl(mangaId, fileName) {
    return `${COVERS}/${mangaId}/${fileName}.256.jpg`;
  }
  function titleOf(attrs) {
    const t = attrs.title;
    return t["en"] ?? t[Object.keys(t)[0]] ?? "Unknown";
  }
  function mapItem(item) {
    const rel = item.relationships.find((r) => r.type === "cover_art");
    if (!rel?.attributes?.fileName) return null;
    return {
      title: titleOf(item.attributes),
      url: item.id,
      cover: coverUrl(item.id, rel.attributes.fileName)
    };
  }
  var RATINGS = "contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica";
  var INCLUDES = "includes[]=cover_art";
  async function latest(page) {
    const offset = (page - 1) * 30;
    const data = await getJson(
      `${API}/manga?order[rating]=desc&limit=30&offset=${offset}&${INCLUDES}&${RATINGS}`
    );
    return data.data.flatMap((item) => {
      const mapped = mapItem(item);
      return mapped ? [mapped] : [];
    });
  }
  async function search(keyword, page) {
    const offset = (page - 1) * 30;
    const data = await getJson(
      `${API}/manga?title=${encodeURIComponent(keyword)}&limit=30&offset=${offset}&${INCLUDES}&${RATINGS}`
    );
    return data.data.flatMap((item) => {
      const mapped = mapItem(item);
      return mapped ? [mapped] : [];
    });
  }
  async function detail(mangaId) {
    const [mangaRes, chapRes] = await Promise.all([
      getJson(`${API}/manga/${mangaId}?${INCLUDES}&${RATINGS}`),
      getJson(
        `${API}/manga/${mangaId}/feed?order[volume]=asc&order[chapter]=asc&limit=500&translatedLanguage[]=en&${RATINGS}`
      )
    ]);
    const manga = mangaRes.data;
    const rel = manga.relationships.find((r) => r.type === "cover_art");
    const cover = rel?.attributes?.fileName ? coverUrl(mangaId, rel.attributes.fileName) : void 0;
    const desc = manga.attributes.description;
    const description = desc["en"] ?? desc[Object.keys(desc)[0]] ?? "";
    const episodes = chapRes.data.map((ch) => {
      const num = ch.attributes.chapter;
      const t = ch.attributes.title;
      const label = num ? `Chapter ${num}${t ? ` \u2014 ${t}` : ""}` : t ?? "Chapter";
      return { title: label, url: ch.id };
    });
    return { title: titleOf(manga.attributes), cover, description, episodes };
  }
  async function watch(chapterId) {
    const data = await getJson(`${API}/at-home/server/${chapterId}`);
    const { baseUrl, chapter: { hash, data: pages } } = data;
    return {
      streams: pages.map((filename, i) => ({
        url: `${baseUrl}/data/${hash}/${filename}`,
        quality: `Page ${i + 1}`
      }))
    };
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
  var _m=typeof io_prismhub_mangadex!=='undefined'?io_prismhub_mangadex:null;
  if(_m&&typeof _m==='object'){
    var _d=_m.detail,_l=_m.latest,_ss=_m.search;
    if(typeof _d==='function')_m.detail=function(){return _d.apply(_m,arguments).then(_detail);};
    if(typeof _l==='function')_m.latest=function(){return _l.apply(_m,arguments).then(_items);};
    if(typeof _ss==='function')_m.search=function(){return _ss.apply(_m,arguments).then(_items);};
  }
})();

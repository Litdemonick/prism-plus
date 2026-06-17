// ==PrismHubExtension==
// @name         MangaDex
// @version      1.0.2
// @author       PrismHub
// @lang         all
// @license      MIT
// @icon         https://mangadex.org/img/avatar.png
// @package      io.prismhub.mangadex
// @type         manga
// @webSite      https://mangadex.org
// @description  Manga multi-idioma vía API oficial de MangaDex
// ==/PrismHubExtension==

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
      timeout = DEFAULT_TIMEOUT,
      acceptStatus = false
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
        if (acceptStatus || res.ok) {
          controller.abort();
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
  var RATINGS = "contentRating%5B%5D=safe&contentRating%5B%5D=suggestive&contentRating%5B%5D=erotica";
  var INCLUDES = "includes%5B%5D=cover_art";
  async function latest(page) {
    const offset = (page - 1) * 30;
    const data = await getJson(
      `${API}/manga?order%5BlatestUploadedChapter%5D=desc&limit=30&offset=${offset}&${INCLUDES}&${RATINGS}`
    );
    return data.data.flatMap((item) => {
      const mapped = mapItem(item);
      return mapped ? [mapped] : [];
    });
  }
  async function search(keyword, page) {
    const offset = (page - 1) * 30;
    const data = await getJson(
      `${API}/manga?title=${encodeURIComponent(keyword)}&limit=30&offset=${offset}&${INCLUDES}&${RATINGS}&order%5Brelevance%5D=desc`
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
        `${API}/manga/${mangaId}/feed?order%5Bvolume%5D=asc&order%5Bchapter%5D=asc&limit=500&translatedLanguage%5B%5D=en&${RATINGS}`
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
    if(typeof _d==='function'||typeof _l==='function'||typeof _ss==='function'){
      // esbuild define exports como getters no-configurables (Object.defineProperty sin set).
      // En strict mode asignar directo falla. Copiamos LEYENDO los getters a un objeto plano.
      var _w={};
      for(var _k in _m){try{_w[_k]=_m[_k];}catch(_e){}}
      if(typeof _d==='function')_w.detail=async function(){return _detail(await _d.apply(_m,arguments));};
      if(typeof _l==='function')_w.latest=async function(){return _items(await _l.apply(_m,arguments));};
      if(typeof _ss==='function')_w.search=async function(){return _items(await _ss.apply(_m,arguments));};
      io_prismhub_mangadex=_w;
    }
  }
})();
export default class extends Extension {
  async latest(page) { return io_prismhub_mangadex.latest(page); }
  async search(kw, page, filter) { return io_prismhub_mangadex.search(kw, page, filter); }
  async createFilter(filter) { return typeof io_prismhub_mangadex.createFilter === 'function' ? io_prismhub_mangadex.createFilter(filter) : {}; }
  async detail(url) { return io_prismhub_mangadex.detail(url); }
  async checkUpdate(url) { return typeof io_prismhub_mangadex.checkUpdate === 'function' ? io_prismhub_mangadex.checkUpdate(url) : {}; }

  // Adapta el formato de Prism+ ({streams:[{url,quality,headers}]}) al contrato
  // de watch de PrismHub ({type,url,headers} + X-Servers para el selector de
  // servidores). Si llega una URL ya resuelta (cambio de servidor), se devuelve.
  async watch(url) {
    if (typeof url === 'string' && url.indexOf('http') === 0 &&
        (url.indexOf('.m3u8') !== -1 || url.indexOf('.mp4') !== -1)) {
      return { type: url.indexOf('.mp4') !== -1 ? 'mp4' : 'hls', url: url, headers: {} };
    }
    var r = await io_prismhub_mangadex.watch(url);
    if (!r || !Array.isArray(r.streams)) return r;
    var streams = r.streams.filter(function (s) { return s && s.url; });
    if (streams.length === 0) {
      return { type: 'hls', url: 'error://Sin servidores disponibles', headers: {} };
    }
    var servers = {}, referers = {};
    for (var i = 0; i < streams.length; i++) {
      var s = streams[i];
      var name = s.quality || s.server || ('Servidor ' + (i + 1));
      servers[name] = s.url;
      if (s.headers && s.headers.Referer) referers[name] = s.headers.Referer;
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


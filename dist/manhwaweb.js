// ==PrismHubExtension==
// @name         ManhwaWeb
// @version      1.3.1
// @author       PrismHub
// @lang         es
// @license      MIT
// @package      io.prismhub.manhwaweb
// @type         manga
// @webSite      https://manhwaweb.com
// @description  Manhwa, manga y manhua en español desde ManhwaWeb
// ==/PrismHubExtension==
// extensions/manhwaweb/index.ts
var API = "https://manhwawebbackend-production.up.railway.app";
var HEADERS = { "Referer": "https://manhwaweb.com" };
async function _get(path) {
  const raw = await sendMessage("request", JSON.stringify([`${API}${path}`, { method: "get", headers: {} }]));
  try {
    return JSON.parse(raw);
  } catch (e) {
    return raw;
  }
}
function _item(m) {
  const id = m["real_id"] || m["id_rel"] || m["id_manhwa"] || m["_id"];
  const cover = m["_imagen"] || m["img"] || "";
  const title = m["the_real_name"] || m["name_esp"] || m["name_manhwa"] || id;
  const caps = m["_numero_cap"] || m["chapter"];
  const update = caps != null ? `Cap. ${caps}` : void 0;
  return { title, url: id, cover, update, headers: HEADERS };
}
var GENRES = {
  "3": "Acci\xF3n",
  "29": "Aventura",
  "18": "Comedia",
  "1": "Drama",
  "42": "Recuentos de la vida",
  "2": "Romance",
  "5": "Venganza",
  "6": "Harem",
  "23": "Fantas\xEDa",
  "31": "Sobrenatural",
  "25": "Tragedia",
  "43": "Psicol\xF3gico",
  "32": "Horror",
  "44": "Thriller",
  "28": "Historias cortas",
  "30": "Ecchi",
  "34": "Gore",
  "27": "Girls love",
  "45": "Boys love",
  "41": "Reencarnaci\xF3n",
  "37": "Sistema de niveles",
  "33": "Ciencia ficci\xF3n",
  "38": "Apocal\xEDptico",
  "39": "Artes marciales",
  "40": "Superpoderes",
  "35": "Cultivaci\xF3n (cultivo)",
  "8": "Milf"
};
function _libraryQuery(page, buscar, filter) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
  const f = filter != null ? filter : {};
  const estado = (_b = (_a = f["estado"]) == null ? void 0 : _a[0]) != null ? _b : "";
  const tipo = (_d = (_c = f["tipo"]) == null ? void 0 : _c[0]) != null ? _d : "";
  const erotico = (_f = (_e = f["erotico"]) == null ? void 0 : _e[0]) != null ? _f : "";
  const demografia = (_h = (_g = f["demografia"]) == null ? void 0 : _g[0]) != null ? _h : "";
  const orderItem = (_j = (_i = f["order_item"]) == null ? void 0 : _i[0]) != null ? _j : "alfabetico";
  const orderDir = (_l = (_k = f["order_dir"]) == null ? void 0 : _k[0]) != null ? _l : "desc";
  const generes = ((_m = f["generos"]) != null ? _m : []).filter((id) => id !== "").join("a");
  return `buscar=${encodeURIComponent(buscar)}&estado=${estado}&tipo=${tipo}&erotico=${erotico}&demografia=${demografia}&order_item=${orderItem}&order_dir=${orderDir}&page=${page}&generes=${generes}`;
}
async function latest(page) {
  if (page === 1) {
    const d2 = await _get("/manhwa/nuevos");
    const manhwas = d2["manhwas"];
    const esp = manhwas["manhwas_esp"] || [];
    const all = manhwas["_manhwas"] || [];
    const seen = /* @__PURE__ */ new Set();
    const items = [];
    for (const m of [...esp, ...all]) {
      const id = m["id_rel"] || m["id_manhwa"];
      if (!id || seen.has(id)) continue;
      seen.add(id);
      items.push(_item(m));
    }
    return items;
  }
  const d = await _get(`/manhwa/library?${_libraryQuery(page - 2, "")}`);
  return (d["data"] || []).map(_item);
}
async function search(keyword, page, filter) {
  const d = await _get(`/manhwa/library?${_libraryQuery(page - 1, keyword, filter)}`);
  return (d["data"] || []).map(_item);
}
async function createFilter() {
  return {
    tipo: {
      title: "Tipo",
      options: {
        "": "Todos",
        manhwa: "Manhwa",
        manga: "Manga",
        manhua: "Manhua",
        doujinshi: "Doujinshi",
        novela: "Novela",
        one_shot: "One shot"
      },
      default: "",
      min: 1,
      max: 1
    },
    demografia: {
      title: "Demograf\xEDa",
      options: {
        "": "Todas",
        seinen: "Seinen",
        shonen: "Shonen",
        josei: "Josei",
        shojo: "Shojo"
      },
      default: "",
      min: 1,
      max: 1
    },
    estado: {
      title: "Estado",
      options: {
        "": "Todos",
        publicandose: "En curso",
        finalizado: "Finalizado",
        pausado: "Pausado"
      },
      default: "",
      min: 1,
      max: 1
    },
    erotico: {
      title: "Er\xF3tico",
      options: {
        "": "Todos",
        si: "S\xED",
        no: "No"
      },
      default: "",
      min: 1,
      max: 1
    },
    order_item: {
      title: "Ordenar por",
      options: {
        alfabetico: "Alfab\xE9tico",
        creacion: "Creaci\xF3n",
        popularidad: "Popularidad",
        num_chapter: "N\xFAm. cap\xEDtulos"
      },
      default: "alfabetico",
      min: 1,
      max: 1
    },
    order_dir: {
      title: "Direcci\xF3n",
      options: {
        desc: "Descendente",
        asc: "Ascendente"
      },
      default: "desc",
      min: 1,
      max: 1
    },
    generos: {
      title: "G\xE9neros",
      options: GENRES,
      default: "",
      min: 0,
      max: Object.keys(GENRES).length
    }
  };
}
async function createTopFilter() {
  return {
    idioma: {
      title: "Idioma",
      options: { esp: "Traducido", raw: "Raw" },
      default: "esp",
      min: 1,
      max: 1
    }
  };
}
async function top(filter, _page) {
  var _a, _b;
  const idioma = (_b = (_a = filter == null ? void 0 : filter["idioma"]) == null ? void 0 : _a[0]) != null ? _b : "esp";
  const d = await _get("/manhwa/nuevos");
  const topData = d["top"];
  const key = idioma === "raw" ? "manhwas_raw" : "manhwas_esp";
  const list = (topData == null ? void 0 : topData[key]) || [];
  return list.map(_topItem);
}
function _topItem(m) {
  const link = m["link"] || "";
  const id = link.split("/").filter(Boolean).pop() || link;
  return {
    title: m["name"] || id,
    url: id,
    cover: m["imagen"] || "",
    update: m["caps"] != null ? `Cap. ${m["caps"]}` : void 0,
    headers: HEADERS
  };
}
async function detail(id) {
  const d = await _get(`/manhwa/see/${encodeURIComponent(id)}`);
  const title = d["the_real_name"] || d["name_esp"] || d["_name"] || id;
  const cover = d["_imagen"] || "";
  const description = d["_sinopsis"] || "";
  const rawCats = d["_categoris"] || [];
  const genres = rawCats.map((c) => {
    if (typeof c === "object" && c !== null) return Object.values(c)[0];
    return null;
  }).filter((g) => typeof g === "string");
  const rawChapters = d["chapters"] || [];
  const episodes = rawChapters.filter((c) => c["link"] && Array.isArray(c["img"]) && c["img"].length > 0).map((c) => {
    var _a;
    const link = c["link"];
    const chapterId = (_a = link.replace(/\/$/, "").split("/").pop()) != null ? _a : link;
    const num = c["chapter"];
    return {
      title: `Cap\xEDtulo ${num}`,
      url: chapterId,
      number: typeof num === "number" ? num : void 0
    };
  });
  return { title, cover, description, episodes, genres, headers: HEADERS };
}
async function watch(chapterId) {
  const d = await _get(`/chapters/see/${encodeURIComponent(chapterId)}`);
  const chapter = d["chapter"];
  const imgs = (chapter == null ? void 0 : chapter["img"]) || [];
  return { urls: imgs, headers: HEADERS };
}

export default class extends Extension {
  async latest(page) { return latest(page); }
  async search(kw, page, filter) { return search(kw, page, filter); }
  async createFilter(filter) { return (typeof createFilter === 'function') ? createFilter(filter) : {}; }
  async top(filter, page) { return (typeof top === 'function') ? top(filter, page) : []; }
  async createTopFilter() { return (typeof createTopFilter === 'function') ? createTopFilter() : {}; }

  // Adapta el detail de Prism+ al de PrismHub: episodios planos [{title,url}] ->
  // grupos [{title, urls:[{name,url}]}], y description -> desc.
  async detail(url) {
    var d = await detail(url);
    if (!d || typeof d !== 'object') return d;
    var eps = Array.isArray(d.episodes) ? d.episodes : [];
    var grouped;
    if (eps.length && eps[0] && Array.isArray(eps[0].urls)) {
      grouped = eps.map(function (g) {
        return {
          title: g.title || 'Episodios',
          urls: (Array.isArray(g.urls) ? g.urls : []).filter(function (e) {
            return e && e.url;
          }).map(function (e) {
            return { name: e.name || e.title || e.url, url: e.url };
          })
        };
      });
    } else {
      grouped = [{
        title: 'Episodios',
        urls: eps.filter(function (e) { return e && e.url; }).map(function (e) {
          return { name: e.title || e.name || e.url, url: e.url };
        })
      }];
    }
    return {
      title: d.title || '',
      cover: d.cover,
      desc: d.desc || d.description || '',
      episodes: grouped,
      headers: d.headers
    };
  }
  async checkUpdate(url) { return (typeof checkUpdate === 'function') ? checkUpdate(url) : {}; }

  // Adapta el formato de Prism+ ({streams:[{url,quality,headers}]}) al contrato
  // de watch de PrismHub ({type,url,headers} + X-Servers para el selector de
  // servidores). Maneja 3 casos:
  //   1. URL directa (.m3u8/.mp4) → fast-path, devolver inmediatamente.
  //   2. URL de embed externo conocido (voe.sx, yourupload.com, netu, etc.) →
  //      resolveEmbed on-demand (igual que JiruHub). Aplica a TODAS las extensiones.
  //   3. URL de episodio normal → llamar watch() de la extensión.
  async watch(url) {
    // Fast-path 1: URL ya resuelta (stream directo .m3u8 o .mp4).
    // El wrapper del build script la devuelve sin llamar a la extensión.
    if (typeof url === 'string' && url.indexOf('http') === 0 &&
        (url.indexOf('.m3u8') !== -1 || url.indexOf('.mp4') !== -1)) {
      return { type: url.indexOf('.mp4') !== -1 ? 'mp4' : 'hls', url: url, headers: {} };
    }

    // Fast-path 2: embed URL de host conocido — resolver on-demand con el SDK.
    // PrismHub llama runtime.watch(embedUrl) desde switchServer() cuando el usuario
    // elige un servidor cuya URL no es un stream directo. Aplica a todas las
    // extensiones que bundleen el SDK (resolveEmbed disponible como global).
    if (typeof url === 'string' && url.indexOf('http') === 0 &&
        typeof resolveEmbed === 'function') {
      var _lurl = url.toLowerCase();
      var _embedMap = {
        yourupload: 'YourUpload', yupload: 'YourUpload',
        'voe.sx': 'Voe', 'voe.': 'Voe',
        'hqq.': 'Netu', 'netu.': 'Netu',
        streamtape: 'Streamtape', stape: 'Streamtape',
        mixdrop: 'Mixdrop', mxdrop: 'Mixdrop',
        mp4upload: 'Mp4Upload',
        doodstream: 'Doodstream', ds2play: 'Doodstream', ds2video: 'Doodstream',
        streamwish: 'Streamwish', wishfast: 'Streamwish',
        vidhide: 'Streamwish', filelions: 'Streamwish',
        filemoon: 'Filemoon', moonplayer: 'Filemoon',
        luluvdo: 'Luluvdo', bysekoze: 'Bysekoze',
        pixeldrain: 'Pixeldrain',
        sendvid: 'Sendvid', uqload: 'Uqload',
        upstream: 'Upstream',
      };
      var _sname = null;
      for (var _k in _embedMap) {
        if (_lurl.indexOf(_k) !== -1) { _sname = _embedMap[_k]; break; }
      }
      if (_sname) {
        try {
          var _res = await resolveEmbed(_sname, url, '');
          if (_res && _res.url) {
            return {
              type: _res.url.indexOf('.mp4') !== -1 ? 'mp4' : 'hls',
              url: _res.url,
              headers: _res.headers || {}
            };
          }
        } catch (_e) { /* resolveEmbed falló — continuar con la extensión */ }
      }
    }

    var r = await watch(url);
    if (!r || !Array.isArray(r.streams)) return r;
    var streams = r.streams.filter(function (s) { return s && s.url; });
    var pageUrl = r.pageUrl || '';
    if (streams.length === 0) {
      if (pageUrl) {
        return { type: 'hls', url: 'page://' + pageUrl,
          headers: { 'X-Page-Url': pageUrl } };
      }
      return { type: 'hls', url: 'error://Sin servidores disponibles', headers: {} };
    }
    var servers = {}, referers = {};
    for (var i = 0; i < streams.length; i++) {
      var s = streams[i];
      var nm = s.quality || s.server || ('Servidor ' + (i + 1));
      servers[nm] = s.url;
      if (s.headers && s.headers.Referer) referers[nm] = s.headers.Referer;
    }
    var p = streams[0];
    var extra = {
      'X-Servers': JSON.stringify(servers),
      'X-Primary-Server': p.quality || p.server || 'Servidor 1',
      'X-Server-Referers': JSON.stringify(referers)
    };
    if (pageUrl) extra['X-Page-Url'] = pageUrl;
    return {
      type: p.url.indexOf('.mp4') !== -1 ? 'mp4' : 'hls',
      url: p.url,
      subtitles: r.subtitles || [],
      headers: Object.assign({}, p.headers || {}, extra)
    };
  }
}

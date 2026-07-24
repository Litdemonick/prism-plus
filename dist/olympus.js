// ==PrismHubExtension==
// @name         Olympus
// @version      1.1.1
// @author       PrismHub
// @lang         es
// @license      MIT
// @package      io.prismhub.olympus
// @type         manga
// @webSite      https://olympusxyz.com
// @description  Manhwa, manga y manhua en español desde Olympus Scanlation
// ==/PrismHubExtension==
// extensions/olympus/index.ts
var BASE = "https://olympusxyz.com";
var BACKEND = "https://panel.olympusxyz.com";
async function _get(url) {
  const raw = await sendMessage("request", JSON.stringify([url, { method: "get", headers: {} }]));
  try {
    return JSON.parse(raw);
  } catch (e) {
    return raw;
  }
}
function _item(s) {
  return {
    title: s.name,
    url: s.slug,
    cover: s.cover,
    update: s.chapter_count != null ? `Cap. ${s.chapter_count}` : void 0
  };
}
async function latest(page) {
  const d = await _get(`${BASE}/api/new-chapters?page=${page}`);
  return (d.data || []).filter((s) => s.type === "comic").map((s) => {
    var _a;
    return {
      title: s.name,
      url: s.slug,
      cover: s.cover,
      update: ((_a = s.last_chapters) == null ? void 0 : _a[0]) ? `Cap. ${s.last_chapters[0].name}` : void 0
    };
  });
}
var _listCache = null;
async function _fullList() {
  if (_listCache) return _listCache;
  const d = await _get(`${BASE}/api/series/list`);
  _listCache = d.data || [];
  return _listCache;
}
async function search(keyword, page, filter) {
  var _a, _b, _c, _d, _e, _f;
  const genero = (_b = (_a = filter == null ? void 0 : filter["genero"]) == null ? void 0 : _a[0]) != null ? _b : "";
  const estado = (_d = (_c = filter == null ? void 0 : filter["estado"]) == null ? void 0 : _c[0]) != null ? _d : "";
  const q = keyword.trim();
  if (!q) {
    const params = new URLSearchParams({ page: String(page), direction: "asc", type: "comic" });
    if (genero) params.set("genres", genero);
    if (estado) params.set("status", estado);
    const d = await _get(
      `${BASE}/api/series?${params.toString()}`
    );
    return (((_f = (_e = d.data) == null ? void 0 : _e.series) == null ? void 0 : _f.data) || []).map(_item);
  }
  const all = await _fullList();
  const kw = q.toLowerCase();
  const matches = all.filter((s) => s.type === "comic" && s.name.toLowerCase().includes(kw));
  const perPage = 24;
  const start = (page - 1) * perPage;
  return matches.slice(start, start + perPage).map(_item);
}
async function createFilter() {
  const d = await _get(`${BASE}/api/genres-statuses`);
  const generoOptions = { "": "Todos" };
  for (const g of d.genres || []) generoOptions[String(g.id)] = g.name.trim();
  const estadoOptions = { "": "Todos" };
  for (const s of d.statuses || []) estadoOptions[String(s.id)] = s.name.trim();
  return {
    genero: { title: "G\xE9nero", options: generoOptions, default: "", min: 1, max: 1 },
    estado: { title: "Estado", options: estadoOptions, default: "", min: 1, max: 1 }
  };
}
function _fmtViews(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
}
async function createTopFilter() {
  return {
    periodo: {
      title: "Periodo",
      options: { total: "Total", mensual: "Mensual" },
      default: "total",
      min: 1,
      max: 1
    }
  };
}
async function top(filter, page) {
  var _a, _b;
  const periodo = (_b = (_a = filter == null ? void 0 : filter["periodo"]) == null ? void 0 : _a[0]) != null ? _b : "total";
  const d = await _get(
    `${BASE}/api/rankings?page=${page != null ? page : 1}`
  );
  const list = [...d.data || []];
  list.sort(
    (a, b) => periodo === "mensual" ? b.monthly_views - a.monthly_views : b.total_views - a.total_views
  );
  return list.map((s) => ({
    title: s.name,
    url: s.slug,
    cover: s.cover,
    update: `${_fmtViews(periodo === "mensual" ? s.monthly_views : s.total_views)} vistas`
  }));
}
async function _allChapters(slug) {
  var _a, _b;
  const url = (page) => `${BACKEND}/api/series/${encodeURIComponent(slug)}/chapters?page=${page}&direction=asc&type=comic`;
  const first = await _get(url(1));
  const all = [...first.data || []];
  const lastPage = (_b = (_a = first.meta) == null ? void 0 : _a.last_page) != null ? _b : 1;
  for (let page = 2; page <= lastPage; page++) {
    const d = await _get(url(page));
    all.push(...d.data || []);
  }
  return all;
}
async function detail(slug) {
  var _a;
  const d = await _get(
    `${BASE}/api/series/${encodeURIComponent(slug)}?type=comic`
  );
  const s = d.data;
  const title = s["name"] || slug;
  const cover = s["cover"] || "";
  const description = s["summary"] || "";
  const genres = (s["genres"] || []).map((g) => g.name.trim());
  const statusName = (((_a = s["status"]) == null ? void 0 : _a.name) || "").toLowerCase();
  const status = statusName.includes("activo") ? "ongoing" : statusName.includes("final") ? "completed" : statusName.includes("pausa") || statusName.includes("hiatus") ? "hiatus" : void 0;
  const chapters = await _allChapters(slug);
  const episodes = chapters.map((c) => ({
    // El endpoint de lectura necesita slug + id del capítulo — viajan juntos
    // en la url ya que watch() solo recibe este string.
    title: `Cap\xEDtulo ${c.name}`,
    url: `${slug}::${c.id}`,
    number: Number(c.name) || void 0
  }));
  return { title, cover, description, episodes, genres, status };
}
async function watch(chapterId) {
  var _a;
  const sep = chapterId.indexOf("::");
  const slug = sep === -1 ? "" : chapterId.slice(0, sep);
  const id = sep === -1 ? chapterId : chapterId.slice(sep + 2);
  const d = await _get(
    `${BASE}/api/capitulo/${encodeURIComponent(slug)}/${encodeURIComponent(id)}?type=comic`
  );
  return { urls: ((_a = d.chapter) == null ? void 0 : _a.pages) || [] };
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

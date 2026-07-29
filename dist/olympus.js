// ==PrismHubExtension==
// @name         Olympus
// @version      1.2.9
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.olympus
// @type         manga
// @nsfw         false
// @webSite      https://olympusxyz.com
// @description  Manhwa, manga y manhua traducidos por fans — scanlation en español, actualizado seguido.
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
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const genero = (_b = (_a = filter == null ? void 0 : filter["genero"]) == null ? void 0 : _a[0]) != null ? _b : "";
  const estado = (_d = (_c = filter == null ? void 0 : filter["estado"]) == null ? void 0 : _c[0]) != null ? _d : "";
  const direction = (_f = (_e = filter == null ? void 0 : filter["direction"]) == null ? void 0 : _e[0]) != null ? _f : "asc";
  const q = keyword.trim();
  if (!q) {
    const parts = [`page=${page}`, `direction=${direction}`, "type=comic"];
    if (genero) parts.push(`genres=${encodeURIComponent(genero)}`);
    if (estado) parts.push(`status=${encodeURIComponent(estado)}`);
    const d = await _get(
      `${BASE}/api/series?${parts.join("&")}`
    );
    return (((_h = (_g = d.data) == null ? void 0 : _g.series) == null ? void 0 : _h.data) || []).map(_item);
  }
  const all = await _fullList();
  const kw = q.toLowerCase();
  const matches = all.filter((s) => s.type === "comic" && s.name.toLowerCase().includes(kw));
  matches.sort(
    (a, b) => direction === "desc" ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)
  );
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
    estado: { title: "Estado", options: estadoOptions, default: "", min: 1, max: 1 },
    direction: {
      title: "Orden",
      options: { asc: "A-Z", desc: "Z-A" },
      default: "asc",
      min: 1,
      max: 1
    }
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
function _slugBase(slug) {
  return slug.replace(/-\d{8}-\d{6,}$/, "");
}
async function _resolveCurrentSlug(oldSlug) {
  try {
    const list = await _get(`${BASE}/api/series/list`);
    const base = _slugBase(oldSlug);
    const hit = ((list == null ? void 0 : list.data) || []).find((s) => s && _slugBase(s.slug) === base);
    return hit && hit.slug !== oldSlug ? hit.slug : null;
  } catch (e) {
    return null;
  }
}
async function detail(slug) {
  var _a;
  let d = await _get(
    `${BASE}/api/series/${encodeURIComponent(slug)}?type=comic`
  );
  if (!(d == null ? void 0 : d.data)) {
    const current = await _resolveCurrentSlug(slug);
    if (current) {
      slug = current;
      d = await _get(
        `${BASE}/api/series/${encodeURIComponent(slug)}?type=comic`
      );
    }
  }
  const s = d == null ? void 0 : d.data;
  if (!s || typeof s !== "object") {
    throw new Error("Olympus no devolvi\xF3 datos para esta obra. Intent\xE1 m\xE1s tarde.");
  }
  const title = s["name"] || slug;
  const cover = s["cover"] || "";
  const description = s["summary"] || "";
  const genres = (s["genres"] || []).filter((g) => g && typeof g.name === "string").map((g) => g.name.trim());
  const statusName = (((_a = s["status"]) == null ? void 0 : _a.name) || "").toLowerCase();
  const status = statusName.includes("activo") ? "ongoing" : statusName.includes("final") ? "completed" : statusName.includes("pausa") || statusName.includes("hiatus") ? "hiatus" : void 0;
  const chapters = await _allChapters(slug);
  const episodes = chapters.filter((c) => c && c.name != null && c.id != null).map((c) => ({
    // El endpoint de lectura necesita slug + id del capítulo — viajan
    // juntos en la url ya que watch() solo recibe este string.
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

// OJO: nunca usar url.indexOf('.mp4')/('.m3u8') suelto — algunos dominios de
// hosts (ej. "mp4upload.com") contienen esa subcadena en el propio nombre
// aunque la URL sea una página de embed, no un archivo directo (confirmado
// en vivo: rompía mp4upload por completo, ni siquiera llegaba a llamar
// watch() de la extensión). Exigir que la extensión esté al FINAL del path
// (antes de ?query o #fragment).
// Segundo caso confirmado en vivo (animeytx, host burstcloud.co): la
// extensión SÍ está al final del path ("/embed/<hash>/Nombre.mp4") pero es
// la página embed (HTML, jwplayer), no el archivo — el nombre real del
// archivo subido se refleja en la URL de la página. Un "/embed/" real no
// necesita servir el archivo así, así que cualquier URL con ese segmento se
// trata como página, no como media directa, dejando que la extensión (que
// sí sabe resolverla) se ocupe.
// Tercer caso confirmado en vivo (animejara, host streamtape.com): el mismo
// truco pero sin "/embed/" — streamtape sirve sus páginas como
// "/e/{id}/{nombre-original}.mp4" (content-type: text/html real, confirmado
// con curl). Cualquier host de esta lista (todos con resolver propio en el
// SDK, ver Fast-path 2 más abajo) NUNCA cuenta como media directa, sin
// importar cómo termine la URL — si sabemos resolverlo, que lo resuelva el
// SDK en vez de asumir que la extensión final "por casualidad" ya es el
// archivo real.
var _KNOWN_EMBED_HOSTS = {
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
function _isDirectMediaUrl(u) {
  if (typeof u !== 'string') return false;
  if (/\/embed\//i.test(u)) return false;
  var lower = u.toLowerCase();
  for (var _k in _KNOWN_EMBED_HOSTS) {
    if (lower.indexOf(_k) !== -1) return false;
  }
  return /\.(mp4|m3u8|mkv|webm)(\?|#|$)/i.test(u);
}
function _mediaType(u) {
  return /\.mp4(\?|#|$)/i.test(u) ? 'mp4' : 'hls';
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
    // Temporadas: el SDK las expone como d.seasons ([{title, episodes:[]}]),
    // y PrismHub ya sabe mostrar varios grupos (el selector "Episodios" del
    // detalle) — pero este adaptador las IGNORABA por completo, así que una
    // serie con temporadas separadas llegaba aplastada en un solo grupo
    // "Episodios" (confirmado con FuegoCine, que ya las armaba bien desde
    // hace rato). Si vienen temporadas, cada una es un grupo.
    var seasons = Array.isArray(d.seasons) ? d.seasons : [];
    if (seasons.length) {
      grouped = seasons.filter(function (s) {
        return s && Array.isArray(s.episodes) && s.episodes.length;
      }).map(function (s, i) {
        return {
          title: s.title || ('Temporada ' + (i + 1)),
          urls: s.episodes.filter(function (e) {
            return e && e.url;
          }).map(function (e) {
            return { name: e.title || e.name || e.url, url: e.url };
          })
        };
      });
    }
    // Si no hubo temporadas utilizables, seguir con el camino de siempre.
    if (grouped && !grouped.length) grouped = undefined;
    if (grouped) {
      // ya resuelto arriba
    } else if (eps.length && eps[0] && Array.isArray(eps[0].urls)) {
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
    // Object.assign(d, ...) primero — antes este wrapper reconstruía el
    // objeto a mano con solo estos 5 campos, así que TODO lo demás que la
    // extensión devuelve (genres, rating, status, extra y sobre todo type,
    // crítico para una extensión "mixed" como ShadeManga) se perdía en
    // silencio. Confirmado en vivo: un manga de ShadeManga abría el
    // reproductor de video en vez del lector porque type nunca llegaba a
    // PrismHub, cayendo al default de ExtensionUtils.resolveType.
    return Object.assign({}, d, {
      title: d.title || '',
      cover: d.cover,
      desc: d.desc || d.description || '',
      episodes: grouped,
      headers: d.headers
    });
  }
  async checkUpdate(url) { return (typeof checkUpdate === 'function') ? checkUpdate(url) : {}; }

  // Adapta el formato de Prism+ ({streams:[{url,quality,headers}]}) al contrato
  // de watch de PrismHub ({type,url,headers} + X-Servers para el selector de
  // servidores). Maneja 3 casos:
  //   1. URL directa (.m3u8/.mp4) → fast-path, devolver inmediatamente.
  //   2. URL de embed externo conocido (voe.sx, yourupload.com, netu, etc.) →
  //      resolveEmbed on-demand. Aplica a TODAS las extensiones.
  //   3. URL de episodio normal → llamar watch() de la extensión.
  async watch(url) {
    // Fast-path 1: URL ya resuelta (stream directo .m3u8 o .mp4).
    // El wrapper del build script la devuelve sin llamar a la extensión.
    if (typeof url === 'string' && url.indexOf('http') === 0 &&
        _isDirectMediaUrl(url)) {
      return { type: _mediaType(url), url: url, headers: {} };
    }

    // Fast-path 2: embed URL de host conocido — resolver on-demand con el SDK.
    // PrismHub llama runtime.watch(embedUrl) desde switchServer() cuando el usuario
    // elige un servidor cuya URL no es un stream directo. Aplica a todas las
    // extensiones que bundleen el SDK (resolveEmbed disponible como global).
    if (typeof url === 'string' && url.indexOf('http') === 0 &&
        typeof resolveEmbed === 'function') {
      var _lurl = url.toLowerCase();
      var _sname = null;
      for (var _k in _KNOWN_EMBED_HOSTS) {
        if (_lurl.indexOf(_k) !== -1) { _sname = _KNOWN_EMBED_HOSTS[_k]; break; }
      }
      if (_sname) {
        try {
          var _res = await resolveEmbed(_sname, url, '');
          if (_res && _res.url) {
            return {
              type: _mediaType(_res.url),
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
      type: _mediaType(p.url),
      url: p.url,
      subtitles: r.subtitles || [],
      headers: Object.assign({}, p.headers || {}, extra)
    };
  }
}

// ==PrismHubExtension==
// @name         TuMangaOnline
// @version      1.0.3
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.tumangaonline
// @type         manga
// @nsfw         false
// @webSite      https://zonatmo.org
// @description  Manga, manhwa y manhua en español desde ZonaTMO (TuMangaOnline) — catálogo con filtros completos
// ==/PrismHubExtension==
// sdk/html.ts
function stripTags(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
function decodeEntities(html) {
  return html.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

// extensions/tumangaonline/index.ts
var BASE = "https://zonatmo.org";
async function _get(url) {
  const raw = await sendMessage(
    "request",
    JSON.stringify([url, { method: "get", headers: { Referer: `${BASE}/` } }])
  );
  try {
    return JSON.parse(raw);
  } catch (e) {
    return raw;
  }
}
function _buildQuery(params) {
  const parts = [];
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const v of value) if (v) parts.push(`${key}=${encodeURIComponent(v)}`);
    } else {
      parts.push(`${key}=${encodeURIComponent(value)}`);
    }
  }
  return parts.join("&");
}
function _fullUrl(url) {
  if (url.indexOf("http") === 0) return url;
  return `${BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}
function _parseCatalog(html) {
  const items = [];
  const re = /<a href="(https:\/\/zonatmo\.org\/library\/[a-z_]+\/\d+\/[a-z0-9-]+)">\s*<div class="thumbnail book lazy-cover" data-bg="([^"]+)">[\s\S]*?<h4 class="text-truncate" title="([^"]+)">/g;
  for (const m of html.matchAll(re)) {
    items.push({
      title: decodeEntities(m[3].trim()),
      url: m[1],
      cover: m[2]
    });
  }
  return items;
}
async function latest(page) {
  const query = _buildQuery({ page: page > 1 ? String(page) : void 0 });
  const html = await _get(`${BASE}/biblioteca${query ? `?${query}` : ""}`);
  return _parseCatalog(html);
}
async function search(keyword, page, filter) {
  var _a, _b, _c, _d;
  const query = _buildQuery({
    title: keyword.trim() || void 0,
    type: (_a = filter == null ? void 0 : filter["tipo"]) == null ? void 0 : _a[0],
    demography: (_b = filter == null ? void 0 : filter["demografia"]) == null ? void 0 : _b[0],
    status: (_c = filter == null ? void 0 : filter["estado"]) == null ? void 0 : _c[0],
    "genders[]": (_d = filter == null ? void 0 : filter["genero"]) == null ? void 0 : _d[0],
    page: page > 1 ? String(page) : void 0
  });
  const html = await _get(`${BASE}/biblioteca${query ? `?${query}` : ""}`);
  return _parseCatalog(html);
}
var _TYPE_OPTIONS = {
  "": "Todos",
  manga: "Manga",
  manhua: "Manhua",
  manhwa: "Manhwa",
  webtoon: "Webtoon",
  novel: "Novela",
  comic: "Comic",
  one_shot: "One shot",
  doujinshi: "Doujinshi",
  oel: "OEL"
};
var _DEMOGRAPHY_OPTIONS = {
  "": "Todas",
  seinen: "Seinen",
  shoujo: "Shoujo",
  shounen: "Shounen",
  josei: "Josei",
  kodomo: "Kodomo"
};
var _STATUS_OPTIONS = {
  "": "Todos",
  ongoing: "En emisi\xF3n",
  completed: "Completado",
  ended: "Finalizado",
  hiatus: "En pausa",
  cancelled: "Cancelado"
};
var _GENRE_OPTIONS = {
  "": "Todos",
  "1": "Acci\xF3n",
  "2": "Aventura",
  "3": "Comedia",
  "4": "Drama",
  "5": "Fantas\xEDa",
  "6": "Horror",
  "7": "Misterio",
  "8": "Romance",
  "9": "Ciencia Ficci\xF3n",
  "10": "Slice of Life",
  "11": "Deportes",
  "12": "Sobrenatural",
  "13": "Thriller",
  "14": "Hist\xF3rico",
  "15": "Psicol\xF3gico",
  "16": "Isekai",
  "17": "Mecha",
  "18": "Escolar",
  "19": "Ecchi",
  "20": "Harem",
  "22": "Recuentos de la vida",
  "23": "Shoujo",
  "24": "Regresi\xF3n",
  "25": "Familia",
  "26": "Magia",
  "27": "+18",
  "28": "Vida Escolar",
  "29": "Smut",
  "30": "Boys Love",
  "31": "Yaoi",
  "32": "Adulto",
  "33": "Maduro",
  "34": "Supernatural",
  "35": "Girls Love",
  "36": "Reencarnaci\xF3n",
  "37": "Tragedia",
  "38": "Transmigraci\xF3n",
  "39": "Sistema",
  "40": "Harem Inverso",
  "41": "Artes Marciales",
  "42": "Shonen",
  "43": "Militar",
  "44": "Gore",
  "46": "Deporte",
  "47": "Apocal\xEDptico",
  "48": "Supervivencia",
  "49": "Realidad Virtual",
  "50": "Demonios",
  "51": "Josei",
  "52": "Yuri",
  "53": "Seinen",
  "54": "G\xE9nero Bender",
  "56": "Parodia",
  "57": "Vampiros",
  "58": "Superpoderes",
  "59": "Samur\xE1i",
  "62": "Ciberpunk",
  "64": "Guerra",
  "65": "Policiaco",
  "66": "Crimen",
  "68": "Traps",
  "73": "Shounen",
  "76": "Action",
  "77": "Adventure",
  "78": "Fantasy",
  "80": "BL (Boys Love)",
  "83": "Comedy",
  "84": "School",
  "86": "Novela",
  "87": "Historical",
  "90": "Military",
  "92": "Doujinshi",
  "99": "Sports",
  "101": "Psychological",
  "102": "Mystery",
  "104": "Oneshot",
  "106": "Manhwa",
  "107": "Manga",
  "111": "Academia",
  "114": "Webtoon",
  "119": "Reincarnation",
  "124": "Viaje en el tiempo",
  "127": "Time Travel"
};
async function createFilter() {
  return {
    tipo: { title: "Tipo", options: _TYPE_OPTIONS, default: "", min: 1, max: 1 },
    demografia: { title: "Demograf\xEDa", options: _DEMOGRAPHY_OPTIONS, default: "", min: 1, max: 1 },
    estado: { title: "Estado", options: _STATUS_OPTIONS, default: "", min: 1, max: 1 },
    genero: { title: "G\xE9nero", options: _GENRE_OPTIONS, default: "", min: 1, max: 1 }
  };
}
async function detail(url) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  const title = (_c = (_b = (_a = /<h1 class="element-title my-2">\s*([^<]+?)\s*<\/h1>/i.exec(html)) == null ? void 0 : _a[1]) == null ? void 0 : _b.trim()) != null ? _c : "";
  const cover = (_d = /<img class="book-thumbnail" src="([^"]+)"/i.exec(html)) == null ? void 0 : _d[1];
  const description = stripTags(
    (_f = (_e = /<p class="element-description[^"]*" id="manga-synopsis">([\s\S]*?)<\/p>/i.exec(html)) == null ? void 0 : _e[1]) != null ? _f : ""
  ).trim();
  const genres = [];
  for (const m of html.matchAll(
    /class="badge badge-primary py-2 px-4 mx-1 my-2"\s*href="https:\/\/zonatmo\.org\/biblioteca\?genders\[\]=\d+">\s*([^<]+?)\s*</g
  )) {
    genres.push(decodeEntities(m[1].trim()));
  }
  const statusText = (_h = (_g = /class="book-status [a-z]+">(?:[\s\S]*?<\/span>)?\s*([^<]+)</i.exec(html)) == null ? void 0 : _g[1]) == null ? void 0 : _h.trim();
  const status = statusText === "En curso" ? "ongoing" : statusText === "Completado" ? "completed" : statusText === "Finalizado" ? "completed" : statusText === "Hiatus" ? "hiatus" : void 0;
  const episodes = [];
  const chapterRe = /data-number="([0-9.]+)">\s*Capítulo [0-9.]+\s*<\/span>[\s\S]*?<a href="(https:\/\/zonatmo\.org\/view_uploads\/\d+)" class="btn btn-sm btn-primary">/g;
  for (const m of html.matchAll(chapterRe)) {
    const num = parseFloat(m[1]);
    episodes.push({
      title: `Cap\xEDtulo ${m[1]}`,
      url: m[2],
      number: Number.isFinite(num) ? num : void 0
    });
  }
  episodes.reverse();
  return { title, cover, description, genres, episodes, status };
}
var _IMAGE_RE = /src="(https:\/\/[a-z0-9.-]+\.zonatmo\.org(?::\d+)?\/chapters\/[^"]+)"/g;
async function watch(url) {
  const html = await _get(_fullUrl(url));
  const urls = [];
  for (const m of html.matchAll(_IMAGE_RE)) {
    urls.push(m[1]);
  }
  return { urls, headers: { Referer: `${BASE}/` } };
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

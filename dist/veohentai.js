// ==PrismHubExtension==
// @name         VeoHentai
// @version      1.0.1
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.veohentai
// @type         bangumi
// @nsfw         true
// @webSite      https://veohentai.com
// @description  Hentai en español agrupado por serie, con catálogo completo y filtros por género y estudio (contenido +18).
// ==/PrismHubExtension==
// sdk/html.ts
function stripTags(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
function decodeEntities(html) {
  return html.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10))).replace(
    /&([a-zA-Z][a-zA-Z0-9]*);/g,
    (m, name) => {
      var _a;
      return (_a = _NAMED_ENTITIES[name]) != null ? _a : m;
    }
  );
}
var _NAMED_ENTITIES = {
  // Vocales acentuadas y eñe — el caso común en español
  aacute: "\xE1",
  eacute: "\xE9",
  iacute: "\xED",
  oacute: "\xF3",
  uacute: "\xFA",
  Aacute: "\xC1",
  Eacute: "\xC9",
  Iacute: "\xCD",
  Oacute: "\xD3",
  Uacute: "\xDA",
  ntilde: "\xF1",
  Ntilde: "\xD1",
  uuml: "\xFC",
  Uuml: "\xDC",
  // Otros idiomas latinos que aparecen en títulos (francés, portugués, alemán)
  agrave: "\xE0",
  egrave: "\xE8",
  igrave: "\xEC",
  ograve: "\xF2",
  ugrave: "\xF9",
  Agrave: "\xC0",
  Egrave: "\xC8",
  Igrave: "\xCC",
  Ograve: "\xD2",
  Ugrave: "\xD9",
  acirc: "\xE2",
  ecirc: "\xEA",
  icirc: "\xEE",
  ocirc: "\xF4",
  ucirc: "\xFB",
  Acirc: "\xC2",
  Ecirc: "\xCA",
  Icirc: "\xCE",
  Ocirc: "\xD4",
  Ucirc: "\xDB",
  atilde: "\xE3",
  otilde: "\xF5",
  Atilde: "\xC3",
  Otilde: "\xD5",
  auml: "\xE4",
  ouml: "\xF6",
  Auml: "\xC4",
  Ouml: "\xD6",
  ccedil: "\xE7",
  Ccedil: "\xC7",
  szlig: "\xDF",
  aring: "\xE5",
  Aring: "\xC5",
  aelig: "\xE6",
  AElig: "\xC6",
  oslash: "\xF8",
  Oslash: "\xD8",
  // Signos y puntuación
  iexcl: "\xA1",
  iquest: "\xBF",
  excl: "!",
  quest: "?",
  ordf: "\xAA",
  ordm: "\xBA",
  deg: "\xB0",
  laquo: "\xAB",
  raquo: "\xBB",
  hellip: "\u2026",
  mdash: "\u2014",
  ndash: "\u2013",
  minus: "\u2212",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201C",
  rdquo: "\u201D",
  bull: "\u2022",
  middot: "\xB7",
  sbquo: "\u201A",
  bdquo: "\u201E",
  apos: "'",
  lpar: "(",
  rpar: ")",
  comma: ",",
  period: ".",
  colon: ":",
  semi: ";",
  sol: "/",
  bsol: "\\",
  num: "#",
  dollar: "$",
  percnt: "%",
  plus: "+",
  equals: "=",
  ast: "*",
  commat: "@",
  lowbar: "_",
  verbar: "|",
  // Símbolos
  euro: "\u20AC",
  pound: "\xA3",
  yen: "\xA5",
  cent: "\xA2",
  curren: "\xA4",
  copy: "\xA9",
  reg: "\xAE",
  trade: "\u2122",
  sect: "\xA7",
  para: "\xB6",
  times: "\xD7",
  divide: "\xF7",
  plusmn: "\xB1",
  frac12: "\xBD",
  frac14: "\xBC",
  frac34: "\xBE",
  sup1: "\xB9",
  sup2: "\xB2",
  sup3: "\xB3",
  micro: "\xB5",
  not: "\xAC",
  shy: "",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  zwnj: "",
  zwj: ""
};

// extensions/veohentai/index.ts
var BASE = "https://veohentai.com";
var API = `${BASE}/wp-json/wp/v2`;
async function _getJson(url) {
  const raw = await sendMessage(
    "request",
    JSON.stringify([url, { method: "get", headers: { Referer: `${BASE}/` } }])
  );
  let value = raw;
  for (let i = 0; i < 2; i++) {
    if (typeof value !== "string") break;
    try {
      value = JSON.parse(value);
    } catch (e) {
      break;
    }
  }
  return value;
}
async function _getArray(url) {
  const value = await _getJson(url);
  return Array.isArray(value) ? value : [];
}
function _rendered(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const r = value["rendered"];
    if (typeof r === "string") return r;
  }
  return "";
}
function _title(post) {
  return decodeEntities(stripTags(_rendered(post["title"])).trim());
}
function _cover(post) {
  const c = post["fox_cover"];
  if (c && typeof c === "object") {
    const url = c["url"];
    if (typeof url === "string" && url) return url;
  }
  return void 0;
}
function _firstNumber(value) {
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "number") {
    return value[0];
  }
  return void 0;
}
function _episodeNumber(post) {
  var _a, _b;
  const slug = typeof post["slug"] === "string" ? post["slug"] : "";
  const fromSlug = (_a = /episodio-(\d+)/i.exec(slug)) == null ? void 0 : _a[1];
  if (fromSlug) return Number(fromSlug);
  const fromTitle = (_b = /episodio\s*(\d+)/i.exec(_title(post))) == null ? void 0 : _b[1];
  return fromTitle ? Number(fromTitle) : 0;
}
function _serieUrl(slug) {
  return `${BASE}/serie/${slug}/`;
}
function _serieSlugFromUrl(url) {
  return url.replace(/^https?:\/\/[^/]+/, "").replace(/^\/serie\//, "").replace(/\/$/, "");
}
async function _seriesFromRecentPosts(page, extra) {
  const params = [
    "per_page=40",
    `page=${page < 1 ? 1 : page}`,
    "_fields=id,slug,title,fox_serie,fox_cover"
  ];
  for (const key of Object.keys(extra)) {
    const v = extra[key];
    if (v) params.push(`${key}=${encodeURIComponent(v)}`);
  }
  const posts = await _getArray(`${API}/posts?${params.join("&")}`);
  if (posts.length === 0) return [];
  const order = [];
  const coverById = {};
  for (const post of posts) {
    const serieId = _firstNumber(post["fox_serie"]);
    if (serieId === void 0) continue;
    if (coverById[serieId] === void 0) {
      order.push(serieId);
      coverById[serieId] = _cover(post);
    }
  }
  if (order.length === 0) return [];
  return _resolveSeries(order, coverById);
}
async function _resolveSeries(ids, coverById) {
  var _a;
  const series = await _getArray(
    `${API}/fox_serie?include=${ids.join(",")}&per_page=100&_fields=id,name,slug,count`
  );
  const byId = {};
  for (const s of series) {
    const id = typeof s["id"] === "number" ? s["id"] : void 0;
    if (id !== void 0) byId[id] = s;
  }
  const items = [];
  for (const id of ids) {
    const s = byId[id];
    if (!s) continue;
    const slug = typeof s["slug"] === "string" ? s["slug"] : "";
    if (!slug) continue;
    const count = typeof s["count"] === "number" ? s["count"] : void 0;
    items.push({
      title: decodeEntities(String((_a = s["name"]) != null ? _a : "").trim()),
      url: _serieUrl(slug),
      cover: coverById[id],
      update: count ? `${count} ep.` : void 0
    });
  }
  return items;
}
async function latest(page) {
  return _seriesFromRecentPosts(page, {});
}
async function search(keyword, page, filter) {
  var _a, _b, _c;
  const kw = keyword.trim();
  const genre = ((_a = filter == null ? void 0 : filter["genero"]) != null ? _a : []).filter((g) => !!g).join(",");
  const brand = ((_b = filter == null ? void 0 : filter["estudio"]) == null ? void 0 : _b[0]) || "";
  if (genre || brand) {
    return _seriesFromRecentPosts(page, {
      search: kw || void 0,
      tags: genre || void 0,
      fox_brand: brand || void 0
    });
  }
  if (kw) {
    const series = await _getArray(
      `${API}/fox_serie?search=${encodeURIComponent(kw)}&per_page=20&page=${page < 1 ? 1 : page}&_fields=id,name,slug,count`
    );
    if (series.length === 0) return [];
    const ids = [];
    for (const s of series) {
      const id = typeof s["id"] === "number" ? s["id"] : void 0;
      if (id !== void 0) ids.push(id);
    }
    if (ids.length === 0) return [];
    const posts = await _getArray(
      `${API}/posts?fox_serie=${ids.join(",")}&per_page=100&_fields=fox_serie,fox_cover`
    );
    const coverById = {};
    for (const post of posts) {
      const serieId = _firstNumber(post["fox_serie"]);
      if (serieId === void 0 || coverById[serieId] !== void 0) continue;
      coverById[serieId] = _cover(post);
    }
    const items = [];
    for (const s of series) {
      const slug = typeof s["slug"] === "string" ? s["slug"] : "";
      const id = typeof s["id"] === "number" ? s["id"] : void 0;
      if (!slug || id === void 0) continue;
      const count = typeof s["count"] === "number" ? s["count"] : void 0;
      items.push({
        title: decodeEntities(String((_c = s["name"]) != null ? _c : "").trim()),
        url: _serieUrl(slug),
        cover: coverById[id],
        update: count ? `${count} ep.` : void 0
      });
    }
    return items;
  }
  return latest(page);
}
var _GENRE_OPTIONS = {
  "": "Todos",
  "3": "Tetonas",
  // 2065
  "26": "Escolares",
  // 877
  "48": "V\xEDrgenes",
  // 715
  "22": "Violaci\xF3n",
  // 680
  "2": "Romance",
  // 602
  "7": "Anal",
  // 529
  "8": "Harem",
  // 526
  "831": "Corridas",
  // 489
  "835": "Oral",
  // 460
  "11": "Sin Censura",
  // 432
  "912": "Censurado",
  // 376
  "13": "Org\xEDas",
  // 375
  "32": "Milfs",
  // 353
  "31": "Ahegao",
  // 329
  "65": "Ninfoman\xEDa",
  // 304
  "41": "Incesto",
  // 241
  "18": "Lolicon",
  // 235
  "51": "Yuri",
  // 198
  "42": "Juegos Sexuales",
  // 194
  "21": "Hardcore",
  // 189
  "36": "Bondage",
  // 188
  "46": "Netorare",
  // 175
  "5": "Vanilla",
  // 144
  "9": "Tent\xE1culos",
  // 139
  "858": "Fantas\xEDa",
  // 135
  "50": "Maids",
  // 132
  "88": "Teacher",
  // 126
  "113": "Casadas",
  // 100
  "53": "Enfermeras",
  // 97
  "228": "Ecchi"
  // 96
};
var _BRAND_OPTIONS = {
  "": "Todos",
  "911": "Pink Pineapple",
  // 359
  "932": "MS Pictures",
  // 229
  "916": "PoRO",
  // 172
  "947": "Mary Jane",
  // 146
  "952": "Queen Bee",
  // 143
  "944": "Suzuki Mirano",
  // 99
  "964": "T-Rex",
  // 97
  "920": "Bunnywalker",
  // 83
  "1007": "nur",
  // 71
  "980": "Majin Petit",
  // 62
  "931": "Pixy Soft",
  // 61
  "950": "MediaBank",
  // 61
  "971": "Suiseisha",
  // 59
  "942": "Vanilla",
  // 54
  "914": "Collaboration Works",
  // 46
  "1008": "Magin Label",
  // 45
  "943": "Magic Bus",
  // 44
  "963": "Showten",
  // 43
  "941": "Lune Pictures",
  // 33
  "928": "Discovery"
  // 30
};
async function createFilter() {
  return {
    // Varios géneros a la vez: la API acepta `tags` con IDs separados por coma
    // (comprobado en vivo) y los combina como "cualquiera de estos".
    genero: { title: "G\xE9nero", options: _GENRE_OPTIONS, default: "", min: 1, max: 6 },
    estudio: { title: "Estudio", options: _BRAND_OPTIONS, default: "", min: 1, max: 1 }
  };
}
async function detail(url) {
  var _a, _b, _c;
  const slug = _serieSlugFromUrl(url);
  const series = await _getArray(
    `${API}/fox_serie?slug=${encodeURIComponent(slug)}&_fields=id,name,slug,description`
  );
  const serie = series[0];
  if (!serie) return { title: "", episodes: [] };
  const serieId = typeof serie["id"] === "number" ? serie["id"] : void 0;
  const title = decodeEntities(String((_a = serie["name"]) != null ? _a : "").trim());
  if (serieId === void 0) return { title, episodes: [] };
  const posts = await _getArray(
    `${API}/posts?fox_serie=${serieId}&per_page=100&_fields=id,slug,title,link,excerpt,date,fox_cover,tags`
  );
  const withNumber = posts.map((post) => ({ post, number: _episodeNumber(post) }));
  withNumber.sort((a, b) => a.number - b.number);
  const episodes = withNumber.map(({ post, number }) => ({
    title: number > 0 ? `Episodio ${number}` : _title(post),
    url: typeof post["link"] === "string" ? post["link"] : `${BASE}/ver/${post["slug"]}/`,
    thumbnail: _cover(post),
    number: number > 0 ? number : void 0
  }));
  let description = decodeEntities(stripTags(String((_b = serie["description"]) != null ? _b : "")).trim());
  if (!description && withNumber.length > 0) {
    description = decodeEntities(stripTags(_rendered(withNumber[0].post["excerpt"])).trim());
  }
  const tagIds = [];
  for (const { post } of withNumber) {
    const tags = post["tags"];
    if (!Array.isArray(tags)) continue;
    for (const t of tags) {
      if (typeof t === "number" && tagIds.indexOf(t) === -1) tagIds.push(t);
    }
  }
  const genres = [];
  if (tagIds.length > 0) {
    const tags = await _getArray(
      `${API}/tags?include=${tagIds.join(",")}&per_page=100&_fields=id,name`
    );
    for (const t of tags) {
      const name = decodeEntities(String((_c = t["name"]) != null ? _c : "").trim());
      if (name && genres.indexOf(name) === -1) genres.push(name);
    }
  }
  const cover = withNumber.length > 0 ? _cover(withNumber[0].post) : void 0;
  return { title, cover, description, genres, episodes };
}
async function watch(url) {
  var _a, _b;
  const fullUrl = url.indexOf("http") === 0 ? url : `${BASE}${url}`;
  let playerUrl = "";
  if (fullUrl.indexOf("veohentai.com") === -1) {
    playerUrl = fullUrl;
  } else {
    const slug = fullUrl.replace(/^https?:\/\/[^/]+/, "").replace(/^\/ver\//, "").replace(/\/$/, "");
    const posts = await _getArray(
      `${API}/posts?slug=${encodeURIComponent(slug)}&_fields=id,title,fox_video_url`
    );
    const post = posts[0];
    if (!post) return { streams: [], pageUrl: fullUrl, reason: "not_found" };
    const embedHtml = typeof post["fox_video_url"] === "string" ? post["fox_video_url"] : "";
    playerUrl = (_b = (_a = /<iframe[^>]+src="([^"]+)"/i.exec(embedHtml)) == null ? void 0 : _a[1]) != null ? _b : "";
  }
  if (!playerUrl) return { streams: [], pageUrl: fullUrl, reason: "no_player" };
  return { streams: [], pageUrl: playerUrl };
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
  // La clave lleva "/file" a propósito: el enlace YA resuelto vive en
  // download####.mediafire.com y también contiene "mediafire", así que una
  // clave suelta lo haría pasar por página de embed y volvería a resolverse.
  'mediafire.com/file': 'Mediafire',
  doodstream: 'Doodstream', ds2play: 'Doodstream', ds2video: 'Doodstream',
  // dsvplay/playmogo faltaban acá: son la misma red de Doodstream (dsvplay
  // redirige a playmogo), y sin la clave el fast-path no los reconocía como
  // embed y nunca llegaban al resolver que sí sabe resolverlos.
  dsvplay: 'Doodstream', playmogo: 'Doodstream',
  hexload: 'Hexload',
  savefiles: 'Savefiles', streamhls: 'Savefiles',
  bysekoze: 'Byse',
  streamwish: 'Streamwish', wishfast: 'Streamwish',
  vidhide: 'Streamwish', filelions: 'Streamwish',
  filemoon: 'Filemoon', moonplayer: 'Filemoon',
  luluvdo: 'Luluvdo', bysekoze: 'Bysekoze',
  pixeldrain: 'Pixeldrain',
  sendvid: 'Sendvid', uqload: 'Uqload',
  upstream: 'Upstream',
};
// Solo la RUTA, sin lo que venga despues de ? o #.
//
// Mirar la direccion entera daba falsos positivos que terminaban en "Error de
// reproduccion": hay servidores que son una pagina normal y llevan el video de
// verdad DENTRO de un parametro, por ejemplo
//   https://un-blog.blogspot.com/?player=fluidplayer&link=https%3A%2F%2F...%2Fpeli.mp4
// Eso termina en ".mp4", asi que se daba por buena la pagina y se le mandaba al
// reproductor un HTML en vez de un video. Con la ruta sola, esa direccion ya no
// pasa por directa y sigue su camino normal hasta resolverse.
function _rutaDe(u) {
  var sinAncla = u.split('#')[0];
  return sinAncla.split('?')[0];
}
function _isDirectMediaUrl(u) {
  if (typeof u !== 'string') return false;
  if (/\/embed\//i.test(u)) return false;
  var lower = u.toLowerCase();
  for (var _k in _KNOWN_EMBED_HOSTS) {
    if (lower.indexOf(_k) !== -1) return false;
  }
  return /\.(mp4|m3u8|mkv|webm)$/i.test(_rutaDe(u));
}
function _mediaType(u) {
  return /\.mp4$/i.test(_rutaDe(u)) ? 'mp4' : 'hls';
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
    var servers = {}, referers = {}, nativos = {}, hayNativos = false;
    for (var i = 0; i < streams.length; i++) {
      var s = streams[i];
      var nm = s.quality || s.server || ('Servidor ' + (i + 1));
      servers[nm] = s.url;
      if (s.headers && s.headers.Referer) referers[nm] = s.headers.Referer;
      // El rayo/mundo de la tira de servidores, cuando la extension lo sabe.
      // Solo viaja lo que la extension declara: si no dice nada, la app sigue
      // decidiendolo como venia haciendolo.
      if (typeof s.nativo === 'boolean') { nativos[nm] = s.nativo; hayNativos = true; }
    }
    var p = streams[0];
    var extra = {
      'X-Servers': JSON.stringify(servers),
      'X-Primary-Server': p.quality || p.server || 'Servidor 1',
      'X-Server-Referers': JSON.stringify(referers)
    };
    if (hayNativos) extra['X-Server-Native'] = JSON.stringify(nativos);
    if (pageUrl) extra['X-Page-Url'] = pageUrl;
    return {
      type: _mediaType(p.url),
      url: p.url,
      subtitles: r.subtitles || [],
      headers: Object.assign({}, p.headers || {}, extra)
    };
  }
}

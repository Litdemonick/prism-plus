// ==PrismHubExtension==
// @name         XVideos
// @version      1.0.9
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.xvideos
// @type         bangumi
// @nsfw         true
// @webSite      https://www.xvideos.com
// @description  Vídeos para adultos con buscador, filtros de categoría, orden, duración y calidad, y reproducción directa (contenido +18).
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

// extensions/xvideos/index.ts
var BASE = "https://www.xvideos.com";
var AMP = "https://amp.xvideos.com";
var _DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
async function _get(url) {
  const raw = await sendMessage(
    "request",
    JSON.stringify([
      url,
      {
        method: "get",
        headers: { Referer: `${BASE}/`, "User-Agent": _DESKTOP_UA }
      }
    ])
  );
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : raw;
  } catch (e) {
    return raw;
  }
}
var _VIDEO_ID = "video(?:[.\\-][a-z0-9]+|\\d+)";
var _RE_ID_ANY = new RegExp(`(?:^|[/"'])${_VIDEO_ID}\\/`);
function _isVideoHref(href) {
  if (!href) return false;
  const clean = href.split("\\/").join("/");
  return _RE_ID_ANY.test(clean) || _RE_ID_ANY.test(`/${clean}`);
}
function _absolutize(href) {
  const clean = href.split("\\/").join("/").split("?")[0].split("#")[0];
  const at = clean.search(new RegExp(_VIDEO_ID));
  if (at < 0) return `${BASE}/${clean.replace(/^\/+/, "")}`;
  return `${BASE}/${clean.slice(at)}`;
}
function _normalizeUrl(url) {
  if (_isVideoHref(url)) return _absolutize(url);
  if (url.indexOf("http") === 0) return url;
  return `${BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}
function _parseList(html) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  const marker = html.indexOf("thumb-block") !== -1 ? "thumb-block" : html.indexOf("video-thumb") !== -1 ? "video-thumb" : "";
  if (!marker) return _parseListLoose(html);
  const chunks = html.split(marker);
  const items = [];
  const seen = {};
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    let href = "";
    const hrefRe = /href="([^"]+)"/g;
    let hm;
    while ((hm = hrefRe.exec(chunk)) !== null) {
      if (_isVideoHref(hm[1])) {
        href = hm[1];
        break;
      }
    }
    if (!href) continue;
    const url = _absolutize(href);
    if (seen[url]) continue;
    let title = (_b = (_a = /<p class="title">[\s\S]{0,300}?title="([^"]*)"/.exec(chunk)) == null ? void 0 : _a[1]) != null ? _b : "";
    if (!title) {
      const inner = (_d = (_c = /<p class="title">\s*<a[^>]*>([\s\S]{0,300}?)<\/a>/.exec(chunk)) == null ? void 0 : _c[1]) != null ? _d : "";
      title = stripTags(inner);
    }
    title = decodeEntities(title.replace(/\s+/g, " ").trim());
    if (!title) continue;
    const cover = (_h = (_g = (_e = /data-src="(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp|avif))"/.exec(chunk)) == null ? void 0 : _e[1]) != null ? _g : (_f = /<amp-img[^>]+src="(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp|avif))"/.exec(chunk)) == null ? void 0 : _f[1]) != null ? _h : void 0;
    const duration = (_j = (_i = /<span class="duration">([^<]+)<\/span>/.exec(chunk)) == null ? void 0 : _i[1]) == null ? void 0 : _j.trim();
    seen[url] = true;
    items.push({ title, url, cover, update: duration || void 0 });
  }
  return items.length > 0 ? items : _parseListLoose(html);
}
function _parseListLoose(html) {
  const items = [];
  const seen = {};
  html = html.split("\\/").join("/");
  const re = new RegExp(`${_VIDEO_ID}\\/[a-z0-9_\\-]+`, "g");
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = _absolutize(m[0]);
    if (seen[url]) continue;
    seen[url] = true;
    const slug = m[0].slice(m[0].indexOf("/") + 1);
    const title = decodeEntities(slug.replace(/[_-]+/g, " ").trim());
    if (!title) continue;
    items.push({ title, url });
  }
  return items;
}
async function latest(page) {
  const n = page < 1 ? 1 : page;
  const html = await _get(`${BASE}/new/${n}`);
  return _parseList(html);
}
function _searchQuery(keyword, page, filter) {
  var _a, _b, _c;
  const parts = [`k=${encodeURIComponent(keyword.trim())}`];
  const p = (page < 1 ? 1 : page) - 1;
  if (p > 0) parts.push(`p=${p}`);
  const sort = (_a = filter == null ? void 0 : filter["orden"]) == null ? void 0 : _a[0];
  const durf = (_b = filter == null ? void 0 : filter["duracion"]) == null ? void 0 : _b[0];
  const quality = (_c = filter == null ? void 0 : filter["calidad"]) == null ? void 0 : _c[0];
  if (sort) parts.push(`sort=${encodeURIComponent(sort)}`);
  if (durf) parts.push(`durf=${encodeURIComponent(durf)}`);
  if (quality) parts.push(`quality=${encodeURIComponent(quality)}`);
  return parts.join("&");
}
async function search(keyword, page, filter) {
  var _a;
  const kw = keyword.trim();
  const category = ((_a = filter == null ? void 0 : filter["categoria"]) == null ? void 0 : _a[0]) || "";
  if (category && !kw) {
    const n = page < 1 ? 1 : page;
    const path = `/tags/${category}${n > 1 ? `/${n}` : ""}`;
    const html2 = await _get(`${BASE}${path}`);
    const items2 = _parseList(html2);
    if (items2.length > 0) return items2;
    const ampHtml2 = await _get(`${AMP}${path}`);
    return _parseList(ampHtml2);
  }
  if (!kw) return latest(page);
  const effectiveKw = category ? `${kw} ${category.replace(/-/g, " ")}` : kw;
  const query = _searchQuery(effectiveKw, page, filter);
  const html = await _get(`${BASE}/?${query}`);
  const items = _parseList(html);
  if (items.length > 0) return items;
  const ampHtml = await _get(`${AMP}/?${query}`);
  return _parseList(ampHtml);
}
var _ORDER_OPTIONS = {
  "": "Relevancia",
  uploaddate: "M\xE1s recientes",
  rating: "Mejor valorados"
};
var _DURATION_OPTIONS = {
  "": "Cualquiera",
  "1-3min": "1 - 3 min",
  "10min_more": "M\xE1s de 10 min",
  "20min_more": "M\xE1s de 20 min"
};
var _QUALITY_OPTIONS = {
  "": "Cualquiera",
  hd: "HD",
  "1080P": "1080p"
};
var _CATEGORY_OPTIONS = {
  "": "Todas",
  amateur: "Amateur",
  anal: "Anal",
  asiatica: "Asi\xE1tica",
  casero: "Casero",
  corridas: "Corridas",
  cosplay: "Cosplay",
  culonas: "Culonas",
  enfermera: "Enfermera",
  espanol: "Espa\xF1ol",
  hentai: "Hentai",
  interracial: "Interracial",
  japonesa: "Japonesa",
  latina: "Latina",
  lesbianas: "Lesbianas",
  maduras: "Maduras",
  masaje: "Masaje",
  mexicana: "Mexicana",
  milf: "MILF",
  morenas: "Morenas",
  negras: "Negras",
  orgia: "Org\xEDa",
  rubias: "Rubias",
  squirt: "Squirt",
  teen: "Teen",
  tetonas: "Tetonas",
  trio: "Tr\xEDo",
  universitaria: "Universitaria",
  venezolana: "Venezolana"
};
async function createFilter() {
  return {
    categoria: { title: "Categor\xEDa", options: _CATEGORY_OPTIONS, default: "", min: 1, max: 1 },
    orden: { title: "Orden", options: _ORDER_OPTIONS, default: "", min: 1, max: 1 },
    duracion: { title: "Duraci\xF3n", options: _DURATION_OPTIONS, default: "", min: 1, max: 1 },
    calidad: { title: "Calidad", options: _QUALITY_OPTIONS, default: "", min: 1, max: 1 }
  };
}
function _videoJsonLd(html) {
  const at = html.indexOf("VideoObject");
  if (at === -1) return "";
  const start = html.lastIndexOf("<script", at);
  const end = html.indexOf("</script>", at);
  if (start === -1 || end === -1 || end <= start) {
    return html.slice(at, at + 4e3);
  }
  return html.slice(start, end);
}
async function detail(url) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
  const fullUrl = _normalizeUrl(url);
  const html = await _get(fullUrl);
  const ld = _videoJsonLd(html);
  const name = (_f = (_e = (_c = (_a = /"name":\s*"((?:[^"\\]|\\.)*)"/.exec(ld)) == null ? void 0 : _a[1]) != null ? _c : (_b = /property="og:title"\s+content="([^"]*)"/i.exec(html)) == null ? void 0 : _b[1]) != null ? _e : (_d = /<title>([\s\S]*?)<\/title>/i.exec(html)) == null ? void 0 : _d[1]) != null ? _f : "";
  const title = decodeEntities(
    name.replace(/\\"/g, '"').replace(/\\\//g, "/").replace(/\s*-\s*XVIDEOS\.COM\s*$/i, "").trim()
  );
  const description = decodeEntities(
    ((_h = (_g = /"description":\s*"((?:[^"\\]|\\.)*)"/.exec(ld)) == null ? void 0 : _g[1]) != null ? _h : "").replace(/\\"/g, '"').replace(/\\\//g, "/").trim()
  );
  const cover = (_j = (_i = /"thumbnailUrl":\s*\[?\s*"([^"]+)"/.exec(ld)) == null ? void 0 : _i[1]) == null ? void 0 : _j.replace(/\\\//g, "/");
  const durM = /"duration":\s*"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/.exec(ld);
  const seconds = durM ? Number((_k = durM[1]) != null ? _k : 0) * 3600 + Number((_l = durM[2]) != null ? _l : 0) * 60 + Number((_m = durM[3]) != null ? _m : 0) : void 0;
  const yearM = (_n = /"uploadDate":\s*"(\d{4})/.exec(ld)) == null ? void 0 : _n[1];
  const tags = [];
  const tagRe = /href="\/(?:tags|c)\/([a-z0-9\-]+)"/g;
  let tm;
  while ((tm = tagRe.exec(html)) !== null) {
    const t = tm[1].replace(/-\d+$/, "").replace(/-/g, " ");
    if (t && tags.indexOf(t) === -1) tags.push(t);
    if (tags.length >= 12) break;
  }
  return {
    title,
    cover,
    description,
    genres: tags.length > 0 ? tags : void 0,
    year: yearM ? Number(yearM) : void 0,
    episodes: [
      {
        title: title || "Ver v\xEDdeo",
        url: fullUrl,
        thumbnail: cover,
        duration: seconds && seconds > 0 ? seconds : void 0
      }
    ]
  };
}
function _qualityLabel(url) {
  if (!url) return "MP4";
  const s = url.toLowerCase();
  if (s.indexOf("mp4_hd") !== -1) return "HD";
  if (s.indexOf("mp4_sd") !== -1) return "SD";
  return "MP4";
}
async function watch(url) {
  var _a, _b, _c, _d;
  const fullUrl = _normalizeUrl(url);
  const html = await _get(fullUrl);
  const streams = [];
  const seen = {};
  const push = (raw, quality) => {
    if (!raw) return;
    const clean = raw.replace(/\\\//g, "/").trim();
    if (!clean || clean.indexOf("http") !== 0 || seen[clean]) return;
    seen[clean] = true;
    streams.push({
      url: clean,
      quality,
      mimeType: clean.indexOf(".m3u8") !== -1 ? "application/x-mpegURL" : "video/mp4",
      headers: { Referer: `${BASE}/` }
    });
  };
  push((_a = /setVideoHLS\('([^']+)'\)/.exec(html)) == null ? void 0 : _a[1], "HLS");
  push((_b = /setVideoUrlHigh\('([^']+)'\)/.exec(html)) == null ? void 0 : _b[1], "Alta");
  push((_c = /setVideoUrlLow\('([^']+)'\)/.exec(html)) == null ? void 0 : _c[1], "Baja");
  const contentUrl = (_d = /"contentUrl":\s*"([^"]+)"/.exec(_videoJsonLd(html))) == null ? void 0 : _d[1];
  push(contentUrl, _qualityLabel(contentUrl));
  return {
    streams,
    pageUrl: fullUrl,
    reason: streams.length === 0 ? "no_stream_found" : void 0
  };
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

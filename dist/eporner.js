// ==PrismHubExtension==
// @name         Eporner
// @version      1.0.1
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.eporner
// @type         bangumi
// @nsfw         true
// @webSite      https://www.eporner.com
// @description  Vídeos para adultos con buscador, 87 categorías, filtros de calidad (hasta 4K), duración y orden, y reproducción directa con selector de calidad (contenido +18).
// ==/PrismHubExtension==
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};

// extensions/eporner/index.ts
var BASE = "https://www.eporner.com";
var HEADERS = { Referer: `${BASE}/` };
async function _get(path) {
  const url = path.indexOf("http") === 0 ? path : `${BASE}${path}`;
  return sendMessage(
    "request",
    JSON.stringify([url, { method: "get", headers: HEADERS }])
  );
}
function _decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").trim();
}
function _stripTags(s) {
  return _decode(s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}
function _alturaDe(texto) {
  if (!texto) return 0;
  let alta = 0;
  for (const m of texto.matchAll(/(\d{3,4})/g)) {
    const n = Number(m[1]);
    if (n > alta) alta = n;
  }
  return alta;
}
function _segundosDe(texto) {
  if (!texto) return 0;
  const partes = texto.trim().split(":").map((p) => Number(p));
  if (partes.some((p) => !isFinite(p))) return 0;
  let total = 0;
  for (const p of partes) total = total * 60 + p;
  return total;
}
function _itemsDe(html) {
  var _a, _b;
  const ini = html.indexOf('id="vidresults"');
  const cuerpo = ini !== -1 ? html.slice(ini) : html;
  if (/No results/i.test(cuerpo)) return [];
  const items = [];
  const vistos = /* @__PURE__ */ new Set();
  const trozos = cuerpo.split(/class="mb[\s"]/);
  for (let i = 1; i < trozos.length; i++) {
    const t = trozos[i];
    const href = /href="(\/video-[A-Za-z0-9]+\/[^"]*)"/.exec(t);
    if (!href) continue;
    const ruta = href[1];
    if (vistos.has(ruta)) continue;
    const img = /<img[^>]+src="(https?:\/\/[^"]+)"/.exec(t);
    const alt = /<img[^>]+alt="([^"]*)"/.exec(t);
    const tit = /class="mbtit"[^>]*>\s*<a[^>]*>([\s\S]{1,300}?)<\/a>/.exec(t);
    const titulo = _decode((alt == null ? void 0 : alt[1]) || "") || _stripTags((tit == null ? void 0 : tit[1]) || "");
    if (!titulo) continue;
    const calidad = /class="mvhdico"[^>]*>\s*<span[^>]*>([^<]{1,20})</.exec(t);
    const dur = /class="mbtim"[^>]*>([^<]{1,12})</.exec(t);
    const rate = /class="mbrate"[^>]*>\s*(\d{1,3})\s*%/.exec(t);
    const altura = _alturaDe(calidad == null ? void 0 : calidad[1]);
    const segundos = _segundosDe(dur == null ? void 0 : dur[1]);
    vistos.add(ruta);
    items.push({
      title: titulo,
      url: `${BASE}${ruta}`,
      cover: img ? _decode(img[1]) : void 0,
      headers: HEADERS,
      // Lo que se ve bajo el título en la tarjeta: cuánto dura y en qué
      // calidad está, que es lo que se mira antes de abrir un vídeo.
      update: [(_a = dur == null ? void 0 : dur[1]) == null ? void 0 : _a.trim(), (_b = calidad == null ? void 0 : calidad[1]) == null ? void 0 : _b.trim()].filter((x) => x).join(" \xB7 ") || void 0,
      // El sitio puntúa de 0 a 100 y el contrato del SDK es de 0 a 10.
      rating: rate ? Number(rate[1]) / 10 : void 0,
      _altura: altura,
      _segundos: segundos
    });
  }
  return items;
}
var CATEGORIAS = {
  "": "Todas",
  "all": "Todos los v\xEDdeos",
  "4k-porn": "4K Ultra HD",
  "60fps": "60 FPS",
  "hd-1080p": "HD 1080p",
  "hd-sex": "HD",
  "hq-porn": "Alta calidad",
  "vr-porn": "VR",
  "ai": "IA",
  "amateur": "Amateur",
  "anal": "Anal",
  "asian": "Asi\xE1tico",
  "asmr": "ASMR",
  "bbw": "BBW",
  "bdsm": "BDSM",
  "big-ass": "Big Ass",
  "big-dick": "Big Dick",
  "big-tits": "Big Tits",
  "bisexual": "Bisexual",
  "blonde": "Rubias",
  "blowjob": "Blowjob",
  "bondage": "Bondage",
  "brunette": "Morenas",
  "bukkake": "Bukkake",
  "casting": "Casting",
  "compilation": "Recopilaciones",
  "cosplay": "Cosplay",
  "creampie": "Creampie",
  "cuckold": "Cuckold",
  "cumshot": "Cumshot",
  "doctor": "Doctor",
  "double-penetration": "Doble penetraci\xF3n",
  "ebony": "Ebony",
  "fat": "Gorditas",
  "fetish": "Fetiche",
  "fisting": "Fisting",
  "footjob": "Footjob",
  "for-women": "Para ellas",
  "gay": "Gay",
  "gloryhole": "Gloryhole",
  "group-sex": "Sexo en grupo",
  "handjob": "Handjob",
  "hardcore": "Hardcore",
  "hentai": "Hentai",
  "homemade": "Casero",
  "hotel": "Hotel",
  "hotwife": "Hotwife",
  "housewives": "Amas de casa",
  "indian": "Indio",
  "indonesia": "Indonesia",
  "interracial": "Interracial",
  "japanese": "Japon\xE9s",
  "latina": "Latinas",
  "lesbians": "Lesbianas",
  "lingerie": "Lencer\xEDa",
  "massage": "Masajes",
  "masturbation": "Masturbaci\xF3n",
  "mature": "Maduras",
  "milf": "MILF",
  "nurse": "Enfermeras",
  "office": "Oficina",
  "old-man": "Mayores",
  "orgy": "Org\xEDas",
  "outdoor": "Exteriores",
  "pawg": "PAWG",
  "petite": "Petite",
  "pinay": "Pinay",
  "pornstar": "Actrices",
  "pov-porn": "POV",
  "pregnant": "Embarazadas",
  "public": "P\xFAblico",
  "redhead": "Pelirrojas",
  "shemale": "Shemale",
  "sleep": "Durmiendo",
  "small-tits": "Small Tits",
  "squirt": "Squirt",
  "stepmom": "Madrastras",
  "stepsister": "Hermanastras",
  "striptease": "Striptease",
  "students": "Estudiantes",
  "swingers": "Swingers",
  "teens": "Teen",
  "threesome": "Tr\xEDos",
  "toys": "Juguetes",
  "uniform": "Uniformes",
  "vintage": "Vintage",
  "webcam": "Webcam"
};
var CALIDADES = {
  "": "Cualquiera",
  "720": "720p o m\xE1s",
  "1080": "1080p o m\xE1s",
  "2160": "4K"
};
var DURACIONES = {
  "": "Cualquiera",
  "0-10": "Menos de 10 min",
  "10-30": "De 10 a 30 min",
  "30-60": "De 30 min a 1 h",
  "60-": "M\xE1s de 1 hora"
};
var ORDENES = {
  "": "M\xE1s recientes",
  "top-rated": "Mejor valorados",
  "most-popular": "M\xE1s vistos",
  "longest": "M\xE1s largos"
};
async function createFilter() {
  return {
    categoria: {
      title: "Categor\xEDa",
      options: CATEGORIAS,
      default: "",
      min: 1,
      max: 1
    },
    calidad: { title: "Calidad", options: CALIDADES, default: "", min: 1, max: 1 },
    duracion: {
      title: "Duraci\xF3n",
      options: DURACIONES,
      default: "",
      min: 1,
      max: 1
    },
    orden: { title: "Ordenar por", options: ORDENES, default: "", min: 1, max: 1 }
  };
}
function _uno(filter, k) {
  var _a, _b;
  return (_b = (_a = filter == null ? void 0 : filter[k]) == null ? void 0 : _a[0]) != null ? _b : "";
}
function _ruta(page, keyword, filter) {
  const orden = _uno(filter, "orden");
  const categoria = _uno(filter, "categoria");
  let base;
  if (keyword.trim()) {
    base = `/search/${encodeURIComponent(keyword.trim())}`;
  } else if (categoria) {
    base = `/cat/${categoria}`;
  } else {
    base = "/cat/all";
  }
  if (orden) base += `/${orden}`;
  base += `/${page}/`;
  const q = [];
  const calidad = _uno(filter, "calidad");
  if (calidad) q.push(`quality=${encodeURIComponent(calidad)}`);
  const duracion = _uno(filter, "duracion");
  if (duracion) {
    const [min, max] = duracion.split("-");
    if (min) q.push(`durationmin=${encodeURIComponent(min)}`);
    if (max) q.push(`durationmax=${encodeURIComponent(max)}`);
  }
  return q.length ? `${base}?${q.join("&")}` : base;
}
function _cumple(it, filter) {
  const calidad = _uno(filter, "calidad");
  if (calidad) {
    if (it._altura > 0 && it._altura < Number(calidad)) return false;
  }
  const duracion = _uno(filter, "duracion");
  if (duracion && it._segundos > 0) {
    const [min, max] = duracion.split("-");
    if (min && it._segundos < Number(min) * 60) return false;
    if (max && it._segundos > Number(max) * 60) return false;
  }
  return true;
}
function _limpiar(items) {
  return items.map((it) => {
    const _a = it, { _altura, _segundos } = _a, resto = __objRest(_a, ["_altura", "_segundos"]);
    return resto;
  });
}
var PAGINAS_POR_TANDA = 3;
var MINIMO_DESEABLE = 12;
async function _listar(page, keyword, filter) {
  const hayFiltro = !!(_uno(filter, "calidad") || _uno(filter, "duracion"));
  const salida = [];
  const vistos = /* @__PURE__ */ new Set();
  for (let i = 0; i < (hayFiltro ? PAGINAS_POR_TANDA : 1); i++) {
    const html = await _get(_ruta(page + i, keyword, filter));
    const lote = _itemsDe(html);
    if (lote.length === 0) break;
    for (const it of lote) {
      if (vistos.has(it.url)) continue;
      vistos.add(it.url);
      if (_cumple(it, filter)) salida.push(it);
    }
    if (salida.length >= MINIMO_DESEABLE) break;
  }
  return _limpiar(salida);
}
async function latest(page) {
  return _listar(page, "");
}
async function search(keyword, page, filter) {
  return _listar(page, keyword || "", filter);
}
function _jsonLd(html) {
  for (const m of html.matchAll(
    /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g
  )) {
    if (m[1].indexOf("VideoObject") !== -1) return m[1];
  }
  return "";
}
async function detail(url) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
  const html = await _get(url);
  const ld = _jsonLd(html);
  const title = _decode(((_a = /"name":\s*"((?:[^"\\]|\\.)*)"/.exec(ld)) == null ? void 0 : _a[1]) || "").replace(/\\"/g, '"') || _decode(((_b = /<h1[^>]*>([\s\S]{1,200}?)<\/h1>/.exec(html)) == null ? void 0 : _b[1]) || "").replace(/\s+/g, " ").trim() || "V\xEDdeo";
  const thumbs = ((_c = /"thumbnailUrl":\s*\[([^\]]*)\]/.exec(ld)) == null ? void 0 : _c[1]) || "";
  const urls = [...thumbs.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const cover = urls.find((u) => u.indexOf("imggen") === -1) || urls[0] || ((_d = /"image":\s*"([^"]+)"/.exec(ld)) == null ? void 0 : _d[1]) || ((_e = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/.exec(html)) == null ? void 0 : _e[1]);
  const genres = [];
  for (const re of [
    /href="\/cat\/[a-z0-9-]+\/"[^>]*>([^<]{1,40})</g,
    /href="\/tag\/[a-z0-9-]+\/"[^>]*>([^<]{1,40})</g
  ]) {
    for (const m of html.matchAll(re)) {
      const g = _decode(m[1]).replace(/\s+/g, " ").trim();
      if (g && genres.indexOf(g) === -1) genres.push(g);
      if (genres.length >= 24) break;
    }
  }
  const rating = Number(((_f = /"ratingValue":\s*"?(\d+)/.exec(ld)) == null ? void 0 : _f[1]) || "0");
  const anio = (_g = /"uploadDate":\s*"(\d{4})/.exec(ld)) == null ? void 0 : _g[1];
  const extra = {};
  const w = (_h = /"width":\s*"?(\d+)/.exec(ld)) == null ? void 0 : _h[1];
  const h = (_i = /"height":\s*"?(\d+)/.exec(ld)) == null ? void 0 : _i[1];
  if (w && h) extra["Resoluci\xF3n"] = `${w}x${h}`;
  const vistas = (_j = /"userInteractionCount":\s*(\d+)/.exec(ld)) == null ? void 0 : _j[1];
  if (vistas) extra["Vistas"] = Number(vistas).toLocaleString("es");
  const actores = (_k = [...ld.matchAll(/"actor":\s*\[([\s\S]*?)\]/g) || []][0]) == null ? void 0 : _k[1];
  if (actores) {
    const nombres = [...actores.matchAll(/"name":\s*"([^"]+)"/g)].map(
      (m) => _decode(m[1])
    );
    if (nombres.length) extra["Actores"] = nombres.join(", ");
  }
  const desc = (_l = /<meta[^>]+name="description"[^>]+content="([^"]*)"/.exec(html)) == null ? void 0 : _l[1];
  const calidades = (_m = /available in:\s*([^."]+)/i.exec(desc || "")) == null ? void 0 : _m[1];
  if (calidades) extra["Calidades"] = calidades.trim();
  const mDur = /"duration":\s*"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/.exec(ld);
  const segundos = mDur ? Number(mDur[1] || 0) * 3600 + Number(mDur[2] || 0) * 60 + Number(mDur[3] || 0) : void 0;
  return {
    title,
    cover,
    // Sin sinopsis de verdad: lo que hay son palabras clave, y ya van como
    // géneros. Repetirlas como descripción sería llenar la ficha de ruido.
    description: "",
    // Un vídeo suelto, no una serie: una sola entrada para reproducir. El
    // cliente necesita al menos una para habilitar el botón.
    episodes: [
      {
        title: "Reproducir",
        url,
        thumbnail: cover,
        duration: segundos,
        number: 1
      }
    ],
    genres,
    rating: rating ? rating / 10 : void 0,
    year: anio ? Number(anio) : void 0,
    extra,
    headers: HEADERS
  };
}
function _hashDelReproductor(hash) {
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += parseInt(hash.slice(i * 8, i * 8 + 8), 16).toString(36);
  }
  return out;
}
async function watch(url) {
  var _a, _b, _c;
  const html = await _get(url);
  const vid = (_a = /EP\.video\.player\.vid\s*=\s*'([^']+)'/.exec(html)) == null ? void 0 : _a[1];
  const hash = (_b = /EP\.video\.player\.hash\s*=\s*'([0-9a-f]{32})'/.exec(html)) == null ? void 0 : _b[1];
  if (!vid || !hash) {
    return {
      streams: [],
      pageUrl: url,
      reason: "js_eval_required",
      headers: HEADERS
    };
  }
  const consulta = `/xhr/video/${encodeURIComponent(vid)}?hash=${_hashDelReproductor(hash)}&domain=www.eporner.com&fallback=false&embed=false&supportedFormats=dash,mp4`;
  let fuentes = {};
  try {
    const datos = JSON.parse(await _get(consulta));
    fuentes = ((_c = datos == null ? void 0 : datos.sources) == null ? void 0 : _c.mp4) || {};
  } catch (e) {
  }
  const streams = [];
  for (const etiqueta of Object.keys(fuentes)) {
    const v = fuentes[etiqueta];
    const src = typeof v === "string" ? v : v == null ? void 0 : v.src;
    if (!src || src.indexOf("http") !== 0) continue;
    streams.push({
      url: src,
      // La etiqueta viene ya legible del sitio: "2160p(4K) HD", "1080p HD"...
      quality: etiqueta.trim(),
      label: etiqueta.trim(),
      mimeType: "video/mp4",
      headers: HEADERS
    });
  }
  streams.sort((a, b) => _alturaDe(b.quality) - _alturaDe(a.quality));
  return {
    streams,
    // Se manda SIEMPRE, no solo cuando no hay streams: si una url firmada
    // caduca entre que se pide y se reproduce, el cliente tiene con qué
    // reintentar sin volver a fallar del todo.
    pageUrl: url,
    headers: HEADERS,
    reason: streams.length === 0 ? "js_eval_required" : void 0
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

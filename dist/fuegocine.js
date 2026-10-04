// ==PrismHubExtension==
// @name         FuegoCine
// @version      1.10.5
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.fuegocine
// @type         bangumi
// @nsfw         false
// @contentKind  accion-real
// @latestLabel  lo-mas-reciente
// @webSite      https://www.fuegocine.com
// @description  Pelis y series al toque, en español, con servidores directos listos para reproducir sin vueltas.
// ==/PrismHubExtension==
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};

// sdk/http.ts
var DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// sdk/html.ts
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

// extensions/fuegocine/servidores/directo/index.ts
async function resolver(url) {
  return { url };
}

// extensions/fuegocine/servidores/comun.ts
var UA_NAVEGADOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
async function pedir(url, referer, headers) {
  var _a;
  try {
    return await sendMessage(
      "request",
      JSON.stringify([
        url,
        {
          method: "get",
          // El User-Agent va PRIMERO para que quien llame pueda pisarlo.
          headers: __spreadValues({ "User-Agent": UA_NAVEGADOR, Referer: referer }, headers)
        }
      ])
    );
  } catch (e) {
    console.log(`[fc] no se pudo pedir ${url.slice(0, 45)} :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return null;
  }
}
async function postJson(url, cuerpo, referer) {
  var _a;
  try {
    return await sendMessage(
      "request",
      JSON.stringify([
        url,
        {
          method: "post",
          headers: { "Content-Type": "application/json", Referer: referer },
          data: JSON.stringify(cuerpo)
        }
      ])
    );
  } catch (e) {
    console.log(`[fc] POST fall\xF3 ${url.slice(0, 45)} :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return null;
  }
}
function hostDe(url) {
  const m = /^https?:\/\/([^/]+)/.exec(url);
  return m ? m[1] : null;
}
function codigoDe(url) {
  const sinQuery = url.split("?")[0].split("#")[0].replace(/\/+$/, "");
  const ultimo = sinQuery.slice(sinQuery.lastIndexOf("/") + 1);
  return ultimo.replace(/^embed-/, "").replace(/\.html?$/, "");
}
function b64aTexto(s) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const limpio = s.replace(/[^A-Za-z0-9+/]/g, "");
  let out = "";
  let i = 0;
  while (i < limpio.length) {
    const b1 = chars.indexOf(limpio[i++]);
    const b2 = chars.indexOf(limpio[i++]);
    const b3 = i < limpio.length ? chars.indexOf(limpio[i++]) : -1;
    const b4 = i < limpio.length ? chars.indexOf(limpio[i++]) : -1;
    out += String.fromCharCode(b1 << 2 | b2 >> 4);
    if (b3 !== -1) out += String.fromCharCode((b2 & 15) << 4 | b3 >> 2);
    if (b4 !== -1) out += String.fromCharCode((b3 & 3) << 6 | b4);
  }
  return out;
}
function desempaquetarUno(src) {
  const m = new RegExp("\\}\\s*\\(\\s*'(.*?)'\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*'(.*?)'\\.split\\('\\|'\\)", "s").exec(src);
  if (!m) return "";
  let payload = m[1];
  const radix = parseInt(m[2], 10);
  const count = parseInt(m[3], 10);
  const palabras = m[4].split("|");
  payload = payload.split("\\'").join("'");
  const enc = (n) => (n < radix ? "" : enc(Math.floor(n / radix))) + ((n = n % radix) > 35 ? String.fromCharCode(n + 29) : n.toString(36));
  const dic = {};
  for (let i = count - 1; i >= 0; i--) dic[enc(i)] = palabras[i] || enc(i);
  return payload.replace(/\b\w+\b/g, (w) => {
    var _a;
    return (_a = dic[w]) != null ? _a : w;
  });
}
function cabecerasDeStream(extra) {
  return __spreadValues({ "User-Agent": UA_NAVEGADOR }, extra != null ? extra : {});
}
function buscarDireccion(html, headers) {
  var _a;
  headers = cabecerasDeStream(headers);
  const plano = `${html}
${desempaquetarTodo(html)}`.replace(/\\\//g, "/");
  const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(plano);
  if (m3u8) return { url: m3u8[1], headers };
  for (const m of html.matchAll(/atob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/g)) {
    try {
      const claro = b64aTexto(m[1]).replace(/\\\//g, "/");
      const src = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(claro);
      if (src) return { url: src[1], headers };
    } catch (e) {
    }
  }
  const file = /(?:file|source|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/.exec(plano);
  if (file) return { url: file[1], headers };
  const mp4s = (_a = plano.match(/https?:[^"'\s\\]+\.mp4[^"'\s\\]*/g)) != null ? _a : [];
  const real = mp4s.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (real) return { url: real, headers };
  return null;
}
function desempaquetarTodo(html) {
  let out = "";
  const re = /eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]*?\.split\('\|'\)[^)]*\)\)/g;
  for (const m of html.matchAll(re)) {
    const u = desempaquetarUno(m[0]);
    if (u) out += `
${u}`;
  }
  return out;
}

// extensions/fuegocine/servidores/drive/index.ts
function idDe(url) {
  var _a, _b, _c, _d;
  return (_d = (_c = (_a = /\/d\/([\w-]{10,})/.exec(url)) == null ? void 0 : _a[1]) != null ? _c : (_b = /[?&]id=([\w-]{10,})/.exec(url)) == null ? void 0 : _b[1]) != null ? _d : null;
}
async function resolver2(url) {
  const id = idDe(url);
  if (!id) return null;
  return {
    url: `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
    headers: { "User-Agent": UA_NAVEGADOR }
  };
}

// extensions/fuegocine/servidores/ok.ru/index.ts
var COMILLAS = ["\\&quot;", "&quot;"];
function valorDe(html, clave) {
  for (const q of COMILLAS) {
    const marca = `${clave}${q}:${q}`;
    const desde = html.indexOf(marca);
    if (desde === -1) continue;
    const ini = desde + marca.length;
    const fin = html.indexOf("&quot;", ini);
    if (fin === -1) continue;
    const salida = html.slice(ini, fin).replace(/\\+$/, "").split("\\\\u0026").join("&").split("\\u0026").join("&");
    if (/^https?:\/\//.test(salida)) return salida;
  }
  return null;
}
async function resolver3(url) {
  const html = await pedir(url, "https://ok.ru/");
  if (!html) return null;
  const hls = valorDe(html, "hlsManifestUrl");
  if (hls) return { url: hls };
  const dash = valorDe(html, "ondemandDash");
  if (dash) return { url: dash, headers: { "User-Agent": UA_NAVEGADOR } };
  return null;
}

// extensions/fuegocine/servidores/playmate/index.ts
async function resolver4(url) {
  const codigo = codigoDe(url);
  if (!codigo) return null;
  const raw = await postJson("https://playmate.to/api/s", { c: codigo, d: "desktop" }, url);
  if (!raw) return null;
  try {
    const j = typeof raw === "string" ? JSON.parse(raw) : raw;
    const sx = j == null ? void 0 : j.sx;
    if (typeof sx !== "string" || !/^https?:\/\//.test(sx)) {
      console.log(`[fc/pm] la API no trajo la fuente: ${String(raw).slice(0, 80)}`);
      return null;
    }
    return { url: sx, headers: { "User-Agent": UA_NAVEGADOR, Referer: "https://playmate.to/" } };
  } catch (e) {
    console.log(`[fc/pm] respuesta que no es JSON: ${String(raw).slice(0, 80)}`);
    return null;
  }
}

// extensions/fuegocine/servidores/videro/index.ts
async function resolver5(url) {
  var _a, _b, _c;
  if (/\.m3u8(\?|$)/i.test(url)) return { url };
  const id = (_a = /\/e\/([A-Za-z0-9]+)/.exec(url)) == null ? void 0 : _a[1];
  if (!id) return null;
  const host = (_b = hostDe(url)) != null ? _b : "videro.my";
  const raw = await pedir(`https://${host}/api/videos/public/${id}`, url, { Accept: "application/json" });
  if (!raw) return null;
  try {
    const j = typeof raw === "string" ? JSON.parse(raw) : raw;
    const ruta = (_c = j == null ? void 0 : j.hls_url) != null ? _c : j == null ? void 0 : j.hls_path;
    if ((j == null ? void 0 : j.status) !== "ready" || typeof ruta !== "string" || !ruta) {
      console.log(`[fc/videro] no est\xE1 listo: ${String(raw).slice(0, 80)}`);
      return null;
    }
    const lista = /^https?:\/\//.test(ruta) ? ruta : `https://${host}${ruta.startsWith("/") ? "" : "/"}${ruta}`;
    return { url: lista, headers: { "User-Agent": UA_NAVEGADOR, Referer: url } };
  } catch (e) {
    console.log(`[fc/videro] respuesta que no es JSON: ${String(raw).slice(0, 80)}`);
    return null;
  }
}

// extensions/fuegocine/servidores/vidsst/index.ts
async function resolver6(url, referer) {
  var _a;
  const html = await pedir(url, referer);
  if (!html) return null;
  const m = (_a = /const\s+url\s*=\s*"([^"]+)"/.exec(html)) != null ? _a : /const\s+url\s*=\s*'([^']+)'/.exec(html);
  if (!m) {
    console.log("[fc/vst] la p\xE1gina no trae la direcci\xF3n del v\xEDdeo");
    return null;
  }
  const directo = m[1].replace(/\\\//g, "/");
  if (!/^https?:\/\//.test(directo)) return null;
  return { url: directo, headers: { "User-Agent": UA_NAVEGADOR, Referer: url } };
}

// extensions/fuegocine/servidores/vimeos/index.ts
async function resolver7(url, referer) {
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : void 0);
}

// extensions/fuegocine/servidores/index.ts
var SERVIDORES = [
  {
    boton: "FC",
    // videro.my: el 2026-09-27 cinco de cada seis títulos ya servían FC desde
    // ahí (un m3u8 abierto, sin cabeceras). Sin este host se quedaban sin
    // ficha y el botón FC no reproducía.
    hosts: ["rumble.cloud", "files.eintim.me", "1a-1791.com", "archive.org"],
    botones: 195,
    nativo: true,
    // Archivo directo, 27–107 Mbps y arranque mediano de 0,4 s.
    orden: 0,
    resolver
  },
  {
    boton: "Drive",
    hosts: ["drive.google.com", "drive.usercontent.google.com"],
    botones: 88,
    nativo: true,
    // 1080p H.264 y más de 100 Mbps; archivos de 2 a 5 GB.
    orden: 1,
    resolver: resolver2
  },
  {
    boton: "PM",
    hosts: ["playmate.to"],
    botones: 20,
    nativo: true,
    orden: 2,
    resolver: resolver4
  },
  {
    // Videro: la lista directa (botón «FC») o su reproductor `/e/` («VRAD»).
    boton: "VRAD",
    hosts: ["videro."],
    botones: 6,
    nativo: true,
    orden: 3,
    resolver: resolver5
  },
  {
    boton: "VST",
    hosts: ["vids.st"],
    botones: 20,
    nativo: true,
    orden: 4,
    resolver: resolver6
  },
  {
    boton: "OK.RU",
    hosts: ["ok.ru", "okru"],
    botones: 55,
    nativo: true,
    orden: 6,
    resolver: resolver3
  },
  {
    boton: "Vimeo",
    hosts: ["vimeos"],
    botones: 49,
    nativo: true,
    orden: 7,
    resolver: resolver7
  }
];
function fichaDe(url) {
  var _a;
  const u = url.toLowerCase();
  return (_a = SERVIDORES.find((s) => s.hosts.some((h) => u.indexOf(h) !== -1))) != null ? _a : null;
}
async function resolverServidor(url, referer) {
  const ficha = fichaDe(url);
  if (ficha) return ficha.resolver(url, referer);
  console.log(`[fc] servidor sin ficha, no se ofrece: ${url.slice(0, 60)}`);
  return null;
}

// extensions/fuegocine/index.ts
var BASE = "https://www.fuegocine.com";
var HOST = "fuegocine.com";
async function _get(url) {
  const raw = await sendMessage(
    "request",
    JSON.stringify([
      url,
      {
        method: "get",
        headers: { Referer: `${BASE}/`, "User-Agent": DESKTOP_UA }
      }
    ])
  );
  try {
    return JSON.parse(raw);
  } catch (e) {
    return raw;
  }
}
function _fullUrl(url) {
  if (url.indexOf("http") === 0) return url;
  return `${BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}
function _entryUrl(e) {
  var _a, _b;
  return (_b = (_a = e.link.find((l) => l.rel === "alternate")) == null ? void 0 : _a.href) != null ? _b : "";
}
function _entryToItem(e) {
  var _a, _b, _c;
  const content = (_b = (_a = e.content) == null ? void 0 : _a.$t) != null ? _b : "";
  const isSeries = e.category.some((c) => c.term === "Serie");
  const metaM = /<div data-post-type="[a-z]+" hidden>\s*<img src="([^"]+)"\s*\/>\s*<p id="tmdb-synopsis">([^<]*)<\/p>/.exec(
    content
  );
  const cover = metaM == null ? void 0 : metaM[1];
  const description = metaM ? decodeEntities(metaM[2].trim()) : void 0;
  const ulM = /<ul class="post-details[^>]*>/.exec(content);
  const ulTag = (_c = ulM == null ? void 0 : ulM[0]) != null ? _c : "";
  const ratingM = /data-imdb="([\d.]+)"/.exec(ulTag);
  const rating = ratingM ? parseFloat(ratingM[1]) : void 0;
  const yearM = /data-year="(\d+)"/.exec(content);
  const year = yearM ? parseInt(yearM[1], 10) : void 0;
  const genresM = /data-genres="([^"]*)"/.exec(content);
  const tags = genresM ? genresM[1].split(",").map((g) => g.trim()).filter(Boolean) : void 0;
  const titleM = /<li data="([^"]+)"><span>Título<\/span>/.exec(content);
  const title = titleM ? decodeEntities(titleM[1].trim()) : decodeEntities(e.title.$t.trim());
  return {
    title,
    url: _entryUrl(e),
    cover,
    description,
    tags,
    year,
    rating: rating !== void 0 && Number.isFinite(rating) ? rating : void 0,
    type: isSeries ? "series" : "movie"
  };
}
async function _fetchLabel(label, page) {
  return (await _fetchLabelConFecha(label, page)).map((x) => x.item);
}
async function _fetchLabelConFecha(label, page) {
  var _a, _b;
  const perPage = 20;
  const startIndex = (page - 1) * perPage + 1;
  const url = `${BASE}/feeds/posts/default/-/${label}?alt=json&max-results=${perPage}&start-index=${startIndex}`;
  const json = await _get(url);
  if (typeof json === "string") return [];
  const entries = (_b = (_a = json == null ? void 0 : json.feed) == null ? void 0 : _a.entry) != null ? _b : [];
  return entries.map((e) => {
    var _a2, _b2;
    return {
      item: _entryToItem(e),
      fecha: (_b2 = (_a2 = e == null ? void 0 : e.published) == null ? void 0 : _a2.$t) != null ? _b2 : ""
    };
  });
}
async function latest(page) {
  const [movies, series] = await Promise.all([
    _fetchLabelConFecha("Movie", page),
    _fetchLabelConFecha("Serie", page)
  ]);
  const todo = [...movies, ...series];
  todo.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return todo.map((x) => x.item);
}
var _TYPE_OPTIONS = {
  "": "Todos",
  Movie: "Pel\xEDculas",
  Serie: "Series"
};
async function createFilter() {
  return {
    tipo: { title: "Tipo", options: _TYPE_OPTIONS, default: "", min: 1, max: 1 }
  };
}
async function search(keyword, page, filter) {
  var _a, _b, _c;
  const tipo = (_a = filter == null ? void 0 : filter["tipo"]) == null ? void 0 : _a[0];
  const kw = keyword.trim();
  if (!kw) {
    if (tipo === "Movie") return _fetchLabel("Movie", page);
    if (tipo === "Serie") return _fetchLabel("Serie", page);
    return latest(page);
  }
  if (page > 1) return [];
  const porPedido = 150;
  const techo = 300;
  const entradas = [];
  for (let desde = 1; desde <= techo; desde += porPedido) {
    const json = await _get(
      `${BASE}/feeds/posts/default?alt=json&max-results=${porPedido}&start-index=${desde}&q=${encodeURIComponent(kw)}`
    );
    if (typeof json === "string") break;
    const bloque = (_c = (_b = json == null ? void 0 : json.feed) == null ? void 0 : _b.entry) != null ? _c : [];
    entradas.push(...bloque);
    if (bloque.length < porPedido) break;
  }
  const items = [];
  const vistas = /* @__PURE__ */ new Set();
  for (const e of entradas) {
    const isMovie = e.category.some((c) => c.term === "Movie");
    const isSerie = e.category.some((c) => c.term === "Serie");
    if (!isMovie && !isSerie) continue;
    if (tipo === "Movie" && !isMovie) continue;
    if (tipo === "Serie" && !isSerie) continue;
    const item = _entryToItem(e);
    if (vistas.has(item.url)) continue;
    vistas.add(item.url);
    items.push(item);
  }
  const exacto = (t) => _normalizar(t) === _normalizar(kw);
  return [...items.filter((i) => exacto(i.title)), ...items.filter((i) => !exacto(i.title))];
}
function _normalizar(t) {
  let s = t.toLowerCase();
  try {
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch (e) {
  }
  return s.replace(/[^a-z0-9]+/g, " ").trim();
}
function _isSeriesHtml(html) {
  return /<div data-post-type="serie" hidden>/.test(html);
}
async function detail(url) {
  var _a, _b, _c;
  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  if (typeof html !== "string" || !/<div data-post-type="[a-z]+" hidden>/.test(html)) {
    throw new Error("FuegoCine no devolvi\xF3 la ficha completa. Prob\xE1 de nuevo en un momento.");
  }
  const isSeries = _isSeriesHtml(html);
  const metaM = /<div data-post-type="[a-z]+" hidden>\s*<img src="([^"]+)"\s*\/>\s*<p id="tmdb-synopsis">([^<]*)<\/p>/.exec(
    html
  );
  const cover = metaM == null ? void 0 : metaM[1];
  const description = metaM ? decodeEntities(metaM[2].trim()) : void 0;
  const titleM = /<li data="([^"]+)"><span>Título<\/span>/.exec(html);
  const title = titleM ? decodeEntities(titleM[1].trim()) : "";
  const ulM = /<ul class="post-details[^>]*>/.exec(html);
  const ulTag = (_a = ulM == null ? void 0 : ulM[0]) != null ? _a : "";
  const ratingM = /data-imdb="([\d.]+)"/.exec(ulTag);
  const rating = ratingM ? parseFloat(ratingM[1]) : void 0;
  const yearM = /data-year="(\d+)"/.exec(html);
  const year = yearM ? parseInt(yearM[1], 10) : void 0;
  const genresM = /data-genres="([^"]*)"/.exec(html);
  const genres = genresM ? genresM[1].split(",").map((g) => g.trim()).filter(Boolean) : void 0;
  const extra = {};
  const durM = /data-duartion="([^"]*)"/.exec(html);
  if (durM && durM[1]) extra["Duraci\xF3n"] = durM[1].trim();
  const origM = /data-original-title="([^"]*)"/.exec(html);
  if (origM && origM[1]) extra["T\xEDtulo original"] = decodeEntities(origM[1].trim());
  const episodes = [];
  let seasons;
  if (isSeries) {
    const postIdM = /\/feeds\/(\d+)\/comments\/default/.exec(html);
    if (postIdM) {
      const epJson = await _get(
        `${BASE}/feeds/posts/default/-/id-${postIdM[1]}?alt=json&max-results=150`
      );
      if (typeof epJson !== "string") {
        const entries = (_c = (_b = epJson == null ? void 0 : epJson.feed) == null ? void 0 : _b.entry) != null ? _c : [];
        const parsed = [];
        for (const e of entries) {
          const t = e.title.$t.trim();
          const m = /^(.*?)\s+(\d+)x(\d+)\s*$/.exec(t);
          if (!m) continue;
          parsed.push({
            season: parseInt(m[2], 10),
            number: parseInt(m[3], 10),
            title: `${decodeEntities(m[1].trim())} ${m[2]}x${m[3]}`,
            url: _entryUrl(e)
          });
        }
        parsed.sort((a, b) => a.season - b.season || a.number - b.number);
        const bySeason = /* @__PURE__ */ new Map();
        for (const p of parsed) {
          const ep = { title: p.title, url: p.url, number: p.number };
          episodes.push(ep);
          if (!bySeason.has(p.season)) bySeason.set(p.season, []);
          bySeason.get(p.season).push(ep);
        }
        seasons = [...bySeason.keys()].sort((a, b) => a - b).map((s) => ({ title: `Temporada ${s}`, episodes: bySeason.get(s) }));
      }
    }
  } else {
    episodes.push({ title: "Pel\xEDcula completa", url: fullUrl });
  }
  return {
    title,
    cover,
    description,
    genres,
    episodes,
    seasons: seasons && seasons.length > 0 ? seasons : void 0,
    year: Number.isFinite(year) ? year : void 0,
    rating: rating !== void 0 && Number.isFinite(rating) ? rating : void 0,
    extra: Object.keys(extra).length > 0 ? extra : void 0
  };
}
function _conEsquema(url) {
  const u = url.trim();
  if (u.indexOf("//") === 0) return `https:${u}`;
  if (!/^https?:\/\//i.test(u)) return `https://${u.replace(/^\/+/, "")}`;
  return u;
}
async function _resolveFinal(url) {
  const res = await resolverServidor(url, `${BASE}/`);
  if (res == null ? void 0 : res.url) return { url: res.url, quality: "Servidor", headers: res.headers };
  return null;
}
function _destinoDe(url) {
  if (url.indexOf("blogspot.com") === -1) return url;
  try {
    const linkM = /[?&]link=([^&]+)/.exec(url);
    if (linkM) return _conEsquema(decodeURIComponent(linkM[1]));
    const rM = /[?&]r=([A-Za-z0-9+/=]+)$/.exec(url);
    if (rM) return _conEsquema(b64aTexto(rM[1]));
  } catch (e) {
    return null;
  }
  return null;
}
async function _resolveServerUrl(url) {
  const destino = _destinoDe(url);
  if (!destino) return null;
  return _resolveFinal(destino);
}
function _parseSvLinks(html) {
  const start = html.indexOf("const _SV_LINKS");
  if (start === -1) return [];
  const end = html.indexOf("</script>", start);
  const block = html.slice(start, end === -1 ? void 0 : end);
  const re = /lang:\s*"([^"]*)"\s*,\s*name:\s*"([^"]*)"\s*,\s*quality:\s*"([^"]*)"\s*,\s*url:\s*"([^"]*)"/g;
  const out = [];
  for (const m of block.matchAll(re)) {
    out.push({
      // Sin el «(ads)» que el sitio le pone a algunos botones («GS(ads)»,
      // «Vimeo(ads)»): avisa que SU página tiene publicidad, y en la app no
      // hay ninguna (se reproduce el vídeo directo). Mostrarlo hacía pensar
      // que sí (reportado 2026-10-03).
      name: m[2].replace(/&#\d+;/g, "").replace(/\s*\(ads\)\s*$/i, "").trim(),
      calidad: m[3].replace(/&#\d+;/g, "").replace(/^#/, "").trim(),
      url: m[4]
    });
  }
  return out;
}
async function watch(url) {
  if (url.indexOf("http") === 0 && url.indexOf(HOST) === -1) {
    try {
      const resolved = await _resolveServerUrl(url);
      if (resolved) return { streams: [resolved] };
    } catch (e) {
      console.log(`[fc] no se pudo resolver ${url.slice(0, 50)}: ${e}`);
    }
    return { streams: [], reason: "resolve_failed" };
  }
  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  if (typeof html !== "string" || !/<div data-post-type="[a-z]+" hidden>/.test(html)) {
    throw new Error("FuegoCine no respondi\xF3 bien: prob\xE1 de nuevo en un rato.");
  }
  const links = _parseSvLinks(html);
  const streams = [];
  const ordenes = [];
  const destinos = /* @__PURE__ */ new Set();
  for (const link of links) {
    const destino = _destinoDe(link.url);
    const ficha = destino ? fichaDe(destino) : null;
    if (!ficha || !ficha.nativo) {
      console.log(`[fc] servidor sin reproducci\xF3n en la app, no se ofrece: ${link.name} ${(destino || link.url).slice(0, 60)}`);
      continue;
    }
    if (destino && destinos.has(destino)) {
      console.log(`[fc] bot\xF3n repetido, no se ofrece dos veces: ${link.name}`);
      continue;
    }
    if (destino) destinos.add(destino);
    ordenes.push(ficha.orden);
    streams.push({ url: link.url, quality: link.name || "Servidor", nativo: true });
  }
  if (streams.length === 0) {
    return { streams: [], reason: links.length > 0 ? "servidores_no_disponibles" : "sin_servidores" };
  }
  const orden = streams.map((s, i) => ({ s, peso: ordenes[i], i }));
  orden.sort((a, b) => a.peso - b.peso || a.i - b.i);
  return { streams: orden.map((x) => x.s) };
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

  // Solo las extensiones "type": "live" implementan estas tres — el resto
  // nunca las llama (PrismHub las gatea por ExtensionType.live), así que el
  // guard `typeof X === 'function'` alcanza: no hace falta saber el tipo acá.
  async schedule() { return (typeof schedule === 'function') ? schedule() : []; }
  async channels() { return (typeof channels === 'function') ? channels() : []; }
  async resolveSignal(id) {
    return (typeof resolveSignal === 'function') ? resolveSignal(id) : [];
  }

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
      // El MOTIVO viaja a la app (sistema global de mensajes): con él dice si
      // el problema es de la extensión (el sitio no tiene el contenido, sus
      // servidores no responden) y no de la app. Va después de un # para que
      // una app vieja lo siga tomando como un error igual que antes.
      var motivo = typeof r.reason === 'string' && r.reason ? r.reason : '';
      if (pageUrl && !motivo) {
        return { type: 'hls', url: 'page://' + pageUrl,
          headers: { 'X-Page-Url': pageUrl } };
      }
      return { type: 'hls', url: 'error://Sin servidores disponibles' +
        (motivo ? '#motivo=' + encodeURIComponent(motivo) : ''), headers: {} };
    }
    var servers = {}, referers = {}, nativos = {}, hayNativos = false;
    var calidades = {}, hayCalidades = false;
    for (var i = 0; i < streams.length; i++) {
      var s = streams[i];
      var nm = s.quality || s.server || ('Servidor ' + (i + 1));
      // Un sitio puede ofrecer DOS veces el mismo servidor —FuegoCine lista dos
      // "FC" en Ghost Rider 2 y dos "Drive" en Supergirl, cada uno con su propia
      // direccion— y como esto es un objeto con el nombre de clave, el segundo
      // pisaba al primero y esa opcion se PERDIA. El usuario las veia en la web
      // y no en la app. Se numeran a partir del segundo para que salgan todos:
      // a veces uno de los dos anda mejor o se ve mejor.
      if (servers[nm] !== undefined) {
        var rep = 2;
        while (servers[nm + ' ' + rep] !== undefined) rep++;
        nm = nm + ' ' + rep;
      }
      servers[nm] = s.url;
      if (s.headers && s.headers.Referer) referers[nm] = s.headers.Referer;
      // El rayo/mundo de la tira de servidores, cuando la extension lo sabe.
      // Solo viaja lo que la extension declara: si no dice nada, la app sigue
      // decidiendolo como venia haciendolo.
      if (typeof s.nativo === 'boolean') { nativos[nm] = s.nativo; hayNativos = true; }
      // La calidad que declara el sitio NO viaja: es lo que el sitio promete,
      // no lo que se midio, y no coincide. Medido en FuegoCine: dice
      // "FHD (1080p)" de UA y UA solo publica 480p y 720p. Mostrarselo al
      // usuario como si fuera la calidad real seria repetirle una promesa que
      // no se cumple — mejor que el reproductor diga lo que de verdad esta
      // reproduciendo. Se deja el canal armado por si algun dia hay una
      // calidad MEDIDA que valga la pena mandar.
    }
    var p = streams[0];
    var extra = {
      'X-Servers': JSON.stringify(servers),
      'X-Primary-Server': p.quality || p.server || 'Servidor 1',
      'X-Server-Referers': JSON.stringify(referers)
    };
    if (hayNativos) extra['X-Server-Native'] = JSON.stringify(nativos);
    if (hayCalidades) extra['X-Server-Quality'] = JSON.stringify(calidades);
    if (pageUrl) extra['X-Page-Url'] = pageUrl;
    return {
      type: _mediaType(p.url),
      url: p.url,
      subtitles: r.subtitles || [],
      headers: Object.assign({}, p.headers || {}, extra)
    };
  }
}

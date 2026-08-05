// ==PrismHubExtension==
// @name         HentaiLA
// @version      1.0.5
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.hentaila
// @type         bangumi
// @nsfw         true
// @webSite      https://hentaila.com
// @description  Hentai en español con catálogo completo, filtros por género y varios servidores por episodio (contenido +18).
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

// extensions/hentaila/servidores/comun.ts
async function pedir(url, referer, headers) {
  var _a;
  try {
    return await sendMessage(
      "request",
      JSON.stringify([url, { method: "get", headers: __spreadValues({ Referer: referer }, headers) }])
    );
  } catch (e) {
    console.log(`[ht] no se pudo pedir ${url.slice(0, 45)} :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return null;
  }
}
function hostDe(url) {
  const m = /^https?:\/\/([^/]+)/.exec(url);
  return m ? m[1] : null;
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
function buscarDireccion(html, headers) {
  var _a;
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

// extensions/hentaila/servidores/mp4upload/index.ts
async function resolver(url, referer) {
  var _a;
  const html = await pedir(url, referer);
  if (!html) return null;
  const candidatos = (_a = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g)) != null ? _a : [];
  const real = candidatos.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) return null;
  return { url: real, headers: { Referer: "https://www.mp4upload.com/" } };
}

// extensions/hentaila/servidores/netu/index.ts
async function resolver2(_url, _referer) {
  return null;
}

// extensions/hentaila/servidores/streamwish/index.ts
async function resolver3(_url, _referer) {
  return null;
}

// extensions/hentaila/servidores/vidhide/index.ts
async function resolver4(url, referer) {
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : void 0);
}

// extensions/hentaila/servidores/vip/index.ts
async function resolver5(_url, _referer) {
  return null;
}

// extensions/hentaila/servidores/voe/index.ts
function rot13(s) {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
  });
}
function desescapar(s) {
  return s.replace(/\\\//g, "/");
}
function descifrar(crudo) {
  try {
    let r = rot13(crudo);
    for (const p of ["@$", "^^", "#&", "~@", "%?", "*~", "!!", "`"]) r = r.split(p).join("");
    const paso3 = b64aTexto(r);
    let corrido = "";
    for (let i = 0; i < paso3.length; i++) corrido += String.fromCharCode(paso3.charCodeAt(i) - 3);
    return b64aTexto(corrido.split("").reverse().join(""));
  } catch (e) {
    return null;
  }
}
async function resolver6(url, referer) {
  let html = await pedir(url, referer);
  if (!html) return null;
  const redir = /window\.location(?:\.href)?\s*=\s*['"](https?:\/\/[^'"]+)['"]/.exec(html);
  if (redir) {
    const espejo = await pedir(redir[1], "https://voe.sx/");
    if (espejo) html = espejo;
  }
  const bloque = /<script[^>]*type=["']application\/json["'][^>]*>\s*\[\s*"([^"]+)"\s*\]\s*<\/script>/.exec(html);
  if (bloque) {
    const claro = descifrar(bloque[1]);
    if (claro) {
      const src = /"source"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(claro);
      if (src) return { url: desescapar(src[1]) };
      const cualquiera = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(desescapar(claro));
      if (cualquiera) return { url: cualquiera[1] };
      const mp4 = /"direct_access_url"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(claro);
      if (mp4) return { url: desescapar(mp4[1]) };
    }
  }
  let m = /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(html);
  if (m) return { url: m[1] };
  const enBase64 = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
  if (enBase64) {
    try {
      const claro = b64aTexto(enBase64[1]);
      const hls = /['"]hls['"]\s*:\s*['"]([^'"]+)['"]/.exec(claro);
      if (hls) return { url: hls[1] };
      const directo = /(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/.exec(claro);
      if (directo) return { url: directo[1] };
    } catch (e) {
    }
  }
  m = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
  if (m) return { url: m[0] };
  return null;
}

// extensions/hentaila/servidores/yourupload/index.ts
async function resolver7(url, referer) {
  const html = await pedir(url, referer);
  if (!html) return null;
  const hdrs = { Referer: "https://www.yourupload.com/" };
  const norm = (u) => u.replace(/\\\//g, "/").replace(/^\/\//, "https://");
  let m = /(?:file|src|source)\s*:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i.exec(html);
  if (m) return { url: norm(m[1]), headers: hdrs };
  m = /(https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*)/.exec(html);
  if (m) return { url: m[1], headers: hdrs };
  m = /(\/\/[^"'\s<>]+\.mp4[^"'\s<>]*)/.exec(html);
  if (m) return { url: `https:${m[1]}`, headers: hdrs };
  return null;
}

// extensions/hentaila/servidores/index.ts
var SERVIDORES = [
  {
    boton: "YourUpload",
    hosts: ["yourupload", "yupload"],
    botones: 200,
    nativo: true,
    resolver: resolver7
  },
  {
    boton: "VIP",
    hosts: ["hvidserv"],
    botones: 200,
    nativo: false,
    resolver: resolver5
  },
  {
    boton: "Voe",
    hosts: ["voe.sx", "voe."],
    botones: 200,
    nativo: true,
    resolver: resolver6
  },
  {
    boton: "VidHide",
    hosts: ["ryderjet", "vidhide", "vhide"],
    botones: 199,
    nativo: true,
    resolver: resolver4
  },
  {
    boton: "MP4Upload",
    hosts: ["mp4upload"],
    botones: 196,
    nativo: true,
    resolver
  },
  {
    boton: "Netu",
    hosts: ["hqq", "netu"],
    botones: 188,
    nativo: false,
    resolver: resolver2
  },
  {
    boton: "StreamWish",
    hosts: ["ghbrisk", "streamwish", "wishfast"],
    botones: 50,
    nativo: false,
    resolver: resolver3
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
  console.log(`[ht] servidor sin ficha, se prueba a mano: ${url.slice(0, 60)}`);
  return resolver4(url, referer);
}

// extensions/hentaila/index.ts
var BASE = "https://hentaila.com";
var CDN = "https://cdn.hentaila.com";
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
function _unescapeJs(s) {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\n/g, "\n").replace(/\\r/g, "").replace(/\\t/g, " ").replace(/\\\//g, "/").replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, "\\");
}
var _CARD_MARKER = 'class="aspect-poster';
var _CARD_FALLBACK_RE = /href="(\/media\/[a-z0-9-]+)"[^>]*>\s*<span class="sr-only">Ver ([^<]+)<\/span>/g;
function _parseCatalog(html) {
  var _a, _b, _c;
  const items = [];
  const seen = {};
  const chunks = html.split(_CARD_MARKER);
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const title = (_a = /alt="Portada de ([^"]*)"/.exec(chunk)) == null ? void 0 : _a[1];
    if (!title) continue;
    const href = (_b = /href="(\/media\/[a-z0-9-]+)"/.exec(chunk)) == null ? void 0 : _b[1];
    if (!href) continue;
    const url = `${BASE}${href}`;
    if (seen[url]) continue;
    seen[url] = true;
    const cover = (_c = /src="([^"]+)"/.exec(chunk)) == null ? void 0 : _c[1];
    items.push({
      title: decodeEntities(title.trim()),
      url,
      cover: cover ? _fullUrl(cover) : void 0
    });
  }
  if (items.length > 0) return items;
  for (const m of html.matchAll(_CARD_FALLBACK_RE)) {
    const url = `${BASE}${m[1]}`;
    if (seen[url]) continue;
    seen[url] = true;
    items.push({ title: decodeEntities(m[2].trim()), url });
  }
  return items;
}
async function latest(page) {
  const query = _buildQuery({ page: page > 1 ? String(page) : void 0 });
  const html = await _get(`${BASE}/catalogo${query ? `?${query}` : ""}`);
  return _parseCatalog(html);
}
async function search(keyword, page, filter) {
  var _a, _b, _c, _d, _e;
  const years = (_a = filter == null ? void 0 : filter["anio"]) == null ? void 0 : _a[0];
  const query = _buildQuery({
    search: keyword.trim() || void 0,
    genre: filter == null ? void 0 : filter["genero"],
    uncensored: ((_b = filter == null ? void 0 : filter["censura"]) == null ? void 0 : _b[0]) || void 0,
    letter: ((_c = filter == null ? void 0 : filter["letra"]) == null ? void 0 : _c[0]) || void 0,
    order: ((_d = filter == null ? void 0 : filter["orden"]) == null ? void 0 : _d[0]) || void 0,
    status: ((_e = filter == null ? void 0 : filter["estado"]) == null ? void 0 : _e[0]) || void 0,
    minYear: years ? years.split("-")[0] : void 0,
    maxYear: years ? years.split("-")[1] : void 0,
    page: page > 1 ? String(page) : void 0
  });
  const html = await _get(`${BASE}/catalogo${query ? `?${query}` : ""}`);
  return _parseCatalog(html);
}
var _GENRE_OPTIONS = {
  "": "Todos",
  "3d": "3D",
  ahegao: "Ahegao",
  anal: "Anal",
  bondage: "Bondage",
  casadas: "Casadas",
  chikan: "Chikan",
  ecchi: "Ecchi",
  elfas: "Elfas",
  enfermeras: "Enfermeras",
  escolares: "Escolares",
  futanari: "Futanari",
  gal: "Gal",
  gore: "Gore",
  hardcore: "Hardcore",
  harem: "Harem",
  incesto: "Incesto",
  "juegos-sexuales": "Juegos Sexuales",
  maids: "Maids",
  milfs: "Milfs",
  netorare: "Netorare",
  ninfomania: "Ninfoman\xEDa",
  ninjas: "Ninjas",
  orgias: "Org\xEDas",
  oyakodon: "Oyakodon",
  paizuri: "Paizuri",
  petit: "Petit",
  romance: "Romance",
  shota: "Shota",
  softcore: "Softcore",
  succubus: "Succubus",
  suspenso: "Suspenso",
  teacher: "Teacher",
  tentaculos: "Tent\xE1culos",
  tetonas: "Tetonas",
  threesome: "Threesome",
  vanilla: "Vanilla",
  violacion: "Violaci\xF3n",
  virgenes: "V\xEDrgenes",
  yaoi: "Yaoi",
  yuri: "Yuri"
};
var _CENSORSHIP_OPTIONS = {
  "": "Todo",
  true: "Solo sin censura"
};
var _ORDER_OPTIONS = {
  "": "Por defecto",
  popular: "M\xE1s populares",
  score: "Mejor puntuados"
};
var _STATUS_OPTIONS = {
  "": "Todos",
  emision: "En emisi\xF3n",
  proximamente: "Pr\xF3ximamente"
};
var _YEAR_OPTIONS = {
  "": "Todos",
  "2020-2026": "2020 - 2026",
  "2015-2019": "2015 - 2019",
  "2010-2014": "2010 - 2014",
  "2000-2009": "2000 - 2009",
  "1990-1999": "1990 - 1999"
};
var _LETTER_OPTIONS = { "": "Todas" };
for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") _LETTER_OPTIONS[c] = c;
async function createFilter() {
  return {
    // Varios géneros a la vez, igual que los checkboxes del propio sitio:
    // repetir `genre=` en la URL los combina como "cualquiera de estos"
    // (comprobado en vivo: milfs 175 + anal 259 → milfs&anal 381). Ojo, la forma
    // con coma (`genre=milfs,anal`) el sitio la IGNORA y devuelve el catálogo
    // entero, así que hay que mandarlos repetidos — es lo que hace _buildQuery
    // con un array.
    genero: { title: "G\xE9nero", options: _GENRE_OPTIONS, default: "", min: 1, max: 6 },
    censura: {
      title: "Censura",
      options: _CENSORSHIP_OPTIONS,
      default: "",
      min: 1,
      max: 1,
      adultOption: "true"
    },
    orden: { title: "Orden", options: _ORDER_OPTIONS, default: "", min: 1, max: 1 },
    estado: { title: "Estado", options: _STATUS_OPTIONS, default: "", min: 1, max: 1 },
    anio: { title: "A\xF1o", options: _YEAR_OPTIONS, default: "", min: 1, max: 1 },
    letra: { title: "Letra", options: _LETTER_OPTIONS, default: "", min: 1, max: 1 }
  };
}
async function detail(url) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  const slug = fullUrl.replace(`${BASE}/media/`, "").replace(/\/$/, "");
  const blobStart = html.indexOf("media:{id:");
  const blob = blobStart >= 0 ? html.slice(blobStart, blobStart + 6e3) : "";
  const id = (_a = /media:\{id:(\d+)/.exec(blob)) == null ? void 0 : _a[1];
  const title = _unescapeJs((_c = (_b = /,title:"((?:[^"\\]|\\.)*)"/.exec(blob)) == null ? void 0 : _b[1]) != null ? _c : "") || decodeEntities((_f = (_e = (_d = /<h1[^>]*>([^<]+)<\/h1>/i.exec(html)) == null ? void 0 : _d[1]) == null ? void 0 : _e.trim()) != null ? _f : "");
  const description = _unescapeJs((_h = (_g = /synopsis:"((?:[^"\\]|\\.)*)"/.exec(blob)) == null ? void 0 : _g[1]) != null ? _h : "");
  const cover = id ? `${CDN}/covers/${id}.jpg` : void 0;
  const genres = [];
  const genresBlock = (_j = (_i = /genres:\[([\s\S]*?)\]/.exec(blob)) == null ? void 0 : _i[1]) != null ? _j : "";
  for (const m of genresBlock.matchAll(/name:"((?:[^"\\]|\\.)*)"/g)) {
    genres.push(_unescapeJs(m[1]));
  }
  const episodesBlock = (_l = (_k = /episodes:\[([\s\S]*?)\]/.exec(blob)) == null ? void 0 : _k[1]) != null ? _l : "";
  const numbers = [];
  for (const m of episodesBlock.matchAll(/number:(\d+)/g)) numbers.push(Number(m[1]));
  numbers.sort((a, b) => a - b);
  const episodes = numbers.map((n) => ({
    title: `Episodio ${n}`,
    url: `${BASE}/media/${slug}/${n}`,
    number: n
  }));
  if (episodes.length === 0) {
    const seen = {};
    for (const m of html.matchAll(/href="\/media\/[a-z0-9-]+\/(\d+)"/g)) {
      if (seen[m[1]]) continue;
      seen[m[1]] = true;
      episodes.push({
        title: `Episodio ${m[1]}`,
        url: `${BASE}/media/${slug}/${m[1]}`,
        number: Number(m[1])
      });
    }
    episodes.sort((a, b) => {
      var _a2, _b2;
      return ((_a2 = a.number) != null ? _a2 : 0) - ((_b2 = b.number) != null ? _b2 : 0);
    });
  }
  const yearStr = (_m = /startDate:"(\d{4})/.exec(blob)) == null ? void 0 : _m[1];
  const yearNum = yearStr ? Number(yearStr) : void 0;
  const year = yearNum && yearNum >= 1960 && yearNum <= 2100 ? yearNum : void 0;
  const scoreStr = (_n = /score:([\d.]+)/.exec(blob)) == null ? void 0 : _n[1];
  const score = scoreStr ? Number(scoreStr) : void 0;
  const categoryName = _unescapeJs(
    (_p = (_o = /category:\{[^}]*?name:"((?:[^"\\]|\\.)*)"/.exec(blob)) == null ? void 0 : _o[1]) != null ? _p : ""
  );
  const extra = {};
  if (categoryName) extra["Tipo"] = categoryName;
  return {
    title,
    cover,
    description,
    genres,
    episodes,
    year,
    rating: score && score > 0 ? score : void 0,
    extra: Object.keys(extra).length > 0 ? extra : void 0
  };
}
var _NEVER_NATIVE = ["mega.nz", "mega.co.nz"];
function _isBlocked(url) {
  const s = url.toLowerCase();
  for (const bad of _NEVER_NATIVE) if (s.indexOf(bad) !== -1) return true;
  return false;
}
async function watch(url) {
  var _a;
  if (url.indexOf("http") === 0 && url.indexOf("hentaila.com") === -1) {
    try {
      const res = _isBlocked(url) ? null : await resolverServidor(url, `${BASE}/`);
      if (res && res.url) {
        return {
          streams: [{ url: res.url, quality: "Servidor", headers: res.headers }],
          pageUrl: ""
        };
      }
    } catch (e) {
    }
    return { streams: [{ url, quality: "Servidor" }], pageUrl: "" };
  }
  const episodeUrl = _fullUrl(url);
  const html = await _get(episodeUrl);
  const embedsStart = html.indexOf("embeds:{");
  let embedsBlock = "";
  if (embedsStart >= 0) {
    const rest = html.slice(embedsStart);
    const downloadsAt = rest.indexOf("downloads:");
    embedsBlock = downloadsAt > 0 ? rest.slice(0, downloadsAt) : rest.slice(0, 4e3);
  }
  const streams = [];
  const seen = {};
  for (const m of embedsBlock.matchAll(
    /server:"((?:[^"\\]|\\.)*)",url:"((?:[^"\\]|\\.)*)"/g
  )) {
    const server = _unescapeJs(m[1]);
    const embedUrl = _unescapeJs(m[2]);
    if (!embedUrl || _isBlocked(embedUrl) || seen[embedUrl]) continue;
    seen[embedUrl] = true;
    streams.push({ url: embedUrl, quality: server });
  }
  if (streams.length === 0) {
    const iframe = (_a = /<iframe[^>]+src="([^"]+)"/i.exec(html)) == null ? void 0 : _a[1];
    if (iframe && !_isBlocked(iframe)) streams.push({ url: iframe, quality: "Servidor" });
  }
  const esPreferido = (nombre) => nombre.toLowerCase().replace(/[^a-z]/g, "").indexOf("yourupload") !== -1;
  streams.sort((a, b) => {
    const pa = esPreferido(a.quality || "") ? 0 : 1;
    const pb = esPreferido(b.quality || "") ? 0 : 1;
    return pa - pb;
  });
  return { streams, pageUrl: episodeUrl };
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

// ==PrismHubExtension==
// @name         AnimeFenix
// @version      1.3.1
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.animefenix
// @type         bangumi
// @nsfw         false
// @webSite      https://animefenix2.tv
// @description  Anime sub y latino con catálogo completo, filtros y varios servidores de respaldo para ver sin cortes.
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

// extensions/animefenix/servidores/comun.ts
async function pedir(url, referer, headers) {
  var _a;
  try {
    return await sendMessage(
      "request",
      JSON.stringify([url, { method: "get", headers: __spreadValues({ Referer: referer }, headers) }])
    );
  } catch (e) {
    console.log(`[af] no se pudo pedir ${url.slice(0, 45)} :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return null;
  }
}
var ACEPTA_NAVEGADOR = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9"
};
function desofuscarIronhentai(html) {
  const m = /eval\(atob\(atob\('([A-Za-z0-9+/=]+)'\)\.split/.exec(html);
  if (!m) return null;
  const unaVez = b64aTexto(m[1]);
  let corrido = "";
  for (let i = 0; i < unaVez.length; i++) {
    corrido += String.fromCharCode(unaVez.charCodeAt(i) - 1);
  }
  return b64aTexto(corrido);
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

// extensions/animefenix/servidores/hidenise/index.ts
async function resolver(url, referer) {
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : void 0);
}

// extensions/animefenix/servidores/mixdrop/index.ts
async function resolver2(url, referer) {
  const html = await pedir(url, referer);
  if (!html) return null;
  const desempaquetado = desempaquetarTodo(html);
  const wurl = /MDCore\.wurl\s*=\s*["']([^"']+)["']/.exec(desempaquetado);
  let destino = wurl == null ? void 0 : wurl[1];
  if (!destino) {
    const mp4 = /(\/\/[^"'\s]+\.mp4[^"'\s]*)/.exec(desempaquetado);
    destino = mp4 == null ? void 0 : mp4[1];
  }
  if (!destino) return null;
  const completa = destino.indexOf("http") === 0 ? destino : `https:${destino}`;
  return { url: completa, headers: { Referer: "https://mixdrop.top/" } };
}

// extensions/animefenix/servidores/mp4upload/index.ts
async function resolver3(url, referer) {
  var _a;
  const html = await pedir(url, referer);
  if (!html) return null;
  const candidatos = (_a = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g)) != null ? _a : [];
  const real = candidatos.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) return null;
  return { url: real, headers: { Referer: "https://www.mp4upload.com/" } };
}

// extensions/animefenix/servidores/plustube/index.ts
var BASE = "https://animefenix.tv";
async function resolver4(url, _referer) {
  const html = await pedir(url, `${BASE}/`, ACEPTA_NAVEGADOR);
  if (!html) return null;
  const claro = desofuscarIronhentai(html);
  if (!claro) return null;
  const hls = /loadSource\('([^']+\.m3u8[^']*)'\)/.exec(claro);
  if (!hls) return null;
  return { url: hls[1], headers: { Referer: `${BASE}/` } };
}

// extensions/animefenix/servidores/premiunvip/index.ts
async function resolver5(_url, _referer) {
  return null;
}

// extensions/animefenix/servidores/streamtape/index.ts
function normalizar(path) {
  let out = path.trim();
  if (out.indexOf("//") === 0) out = `https:${out}`;
  else if (out.indexOf("/") === 0) out = `https:/${out}`;
  if (!/[?&]stream=/.test(out)) out += "&stream=1";
  return out;
}
function desdeElJs(html, embedUrl) {
  const armados = /(["'])(\/{1,2}[^"']*)\1\s*\+\s*(?:(["'])\3\s*\+\s*)?\(\s*(["'])([^"']+)\4\s*\)((?:\s*\.\s*substring\(\s*\d+\s*(?:,\s*\d+\s*)?\))+)/g;
  const recortes = /\.\s*substring\(\s*(\d+)\s*(?:,\s*(\d+)\s*)?\)/g;
  const host = (/^https?:\/\/([^/]+)/.exec(embedUrl) || ["", ""])[1].replace(/^www\./, "");
  if (!host) return null;
  const idEmbed = (/\/[ev]\/([A-Za-z0-9_-]+)/.exec(embedUrl) || ["", ""])[1];
  const candidatos = [];
  let m;
  armados.lastIndex = 0;
  while ((m = armados.exec(html)) !== null) {
    let resto = m[5];
    recortes.lastIndex = 0;
    let r;
    while ((r = recortes.exec(m[6])) !== null) {
      resto = r[2] === void 0 ? resto.substring(parseInt(r[1], 10)) : resto.substring(parseInt(r[1], 10), parseInt(r[2], 10));
    }
    candidatos.push(m[2] + resto);
  }
  if (!candidatos.length) return null;
  const bienFormados = candidatos.filter((c) => {
    const forma = /^\/\/([^/]+)\/get_video\?/.exec(c);
    return !!forma && forma[1].replace(/^www\./, "") === host && c.indexOf("token=") !== -1;
  });
  if (idEmbed) {
    const conElId = bienFormados.filter((c) => c.indexOf(`id=${idEmbed}&`) !== -1);
    if (conElId.length) return normalizar(conElId[0]);
  }
  for (const c of bienFormados) {
    if (bienFormados.filter((o) => o === c).length > 1) {
      console.log("[af] streamtape: elegido por repetici\xF3n, sin id en el embed");
      return normalizar(c);
    }
  }
  console.log(
    `[af] streamtape: ${candidatos.length} candidato(s) en el JS, ninguno confiable (id esperado: ${idEmbed || "desconocido"})`
  );
  return null;
}
async function resolver6(url, referer) {
  const html = await pedir(url, referer);
  if (!html) return null;
  const headers = { Referer: "https://streamtape.com/" };
  const delJs = desdeElJs(html, url);
  if (delJs) return { url: delJs, headers };
  const div = /id=["'](?:ideoolink|botlink|robotlink)["'][^>]*>\s*(\/\/?[^<]*get_video\?[^<]*)</.exec(html);
  if (div) {
    console.log("[af] streamtape: sin JS utilizable, se usa el div (puede ser se\xF1uelo)");
    return { url: normalizar(div[1].trim()), headers };
  }
  let m = /(https?:\/\/streamtape\.[a-z]+\/get_video\?[^"'\s<>]+)/.exec(html);
  if (m) return { url: normalizar(m[1]), headers };
  m = /(\/\/streamtape\.[a-z]+\/get_video\?[^"'\s<>]+)/.exec(html);
  if (m) return { url: normalizar(m[1]), headers };
  console.log("[af] streamtape: no se encontr\xF3 ninguna URL get_video en el embed");
  return null;
}

// extensions/animefenix/servidores/streamwish/index.ts
async function resolver7(_url, _referer) {
  return null;
}

// extensions/animefenix/servidores/uqload/index.ts
async function resolver8(_url, _referer) {
  return null;
}

// extensions/animefenix/servidores/voe/index.ts
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
async function resolver9(url, referer) {
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

// extensions/animefenix/servidores/yourupload/index.ts
async function resolver10(url, referer) {
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

// extensions/animefenix/servidores/index.ts
var SERVIDORES = [
  {
    boton: "PlusTube",
    hosts: ["ironhentai.com/vt.php"],
    botones: 61,
    nativo: true,
    resolver: resolver4
  },
  {
    boton: "PremiunVIP",
    hosts: ["ironhentai.com/face.php", "ironhentai.com/hugging.php"],
    botones: 59,
    nativo: false,
    resolver: resolver5
  },
  {
    boton: "StreamTape",
    hosts: ["streamtape", "stape", "strtape"],
    botones: 60,
    nativo: true,
    resolver: resolver6
  },
  {
    boton: "Voex",
    hosts: ["voe.sx", "voe."],
    botones: 60,
    nativo: true,
    resolver: resolver9
  },
  {
    boton: "Uqload",
    hosts: ["uqload"],
    botones: 56,
    nativo: false,
    resolver: resolver8
  },
  {
    boton: "Mp4Upload",
    hosts: ["mp4upload"],
    botones: 51,
    nativo: true,
    resolver: resolver3
  },
  {
    boton: "StreamWish",
    hosts: ["flaswish", "streamwish", "wishfast"],
    botones: 3,
    nativo: false,
    resolver: resolver7
  },
  {
    boton: "HideNise",
    hosts: ["callistanise", "vidhide", "vhide"],
    botones: 3,
    nativo: true,
    resolver
  },
  {
    // Los espejos meten letras de más ("miiiixdrop", "miixdrop") para esquivar
    // bloqueos por dominio exacto, pero "xdrop" siempre sobrevive.
    boton: "MixEx",
    hosts: ["xdrop"],
    botones: 3,
    nativo: true,
    resolver: resolver2
  },
  {
    boton: "YourUpload",
    hosts: ["yourupload", "yupload"],
    botones: 1,
    nativo: true,
    resolver: resolver10
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
  console.log(`[af] servidor sin ficha, se prueba a mano: ${url.slice(0, 60)}`);
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : void 0);
}

// extensions/animefenix/index.ts
var BASE2 = "https://animefenix2.tv";
async function _get(url, extraHeaders) {
  const raw = await sendMessage(
    "request",
    JSON.stringify([
      url,
      {
        method: "get",
        // DESKTOP_UA va ANTES del spread para que un extraHeaders con su propio
        // User-Agent lo siga pisando (lo usan los resolvers de servidores).
        headers: __spreadValues({
          Referer: `${BASE2}/`,
          "User-Agent": DESKTOP_UA
        }, extraHeaders != null ? extraHeaders : {})
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
    if (value) parts.push(`${key}=${encodeURIComponent(value)}`);
  }
  return parts.join("&");
}
function _fullUrl(url) {
  if (url.indexOf("http") === 0) return url;
  return `${BASE2}${url.startsWith("/") ? "" : "/"}${url}`;
}
function _parseCatalog(html) {
  var _a, _b;
  const items = [];
  const re = /<a href="(\/[a-z0-9-]+)">\s*<figure>\s*<span class="tipo">([^<]*)<\/span>\s*<span class="estreno">([^<]*)<\/span>[\s\S]*?<p class="gray">([^<]*)<\/p>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<\/figure>\s*<p>([^<]+)<\/p>/g;
  for (const m of html.matchAll(re)) {
    const year = parseInt(m[3].trim(), 10);
    items.push({
      title: decodeEntities(m[6].trim()),
      url: `${BASE2}${m[1]}`,
      cover: m[5],
      update: ((_a = m[4]) == null ? void 0 : _a.trim()) ? decodeEntities(m[4].trim()) : void 0,
      year: Number.isFinite(year) ? year : void 0,
      tags: ((_b = m[2]) == null ? void 0 : _b.trim()) ? [decodeEntities(m[2].trim())] : void 0
    });
  }
  return items;
}
function _parseRecientes(html) {
  const i = html.indexOf("Episodios recientes");
  if (i < 0) return [];
  const resto = html.slice(i);
  const fin = resto.slice(30).indexOf("<section");
  const frag = fin > 0 ? resto.slice(0, fin + 30) : resto;
  const items = [];
  const re = /<a href="(\/ver\/[^"]+)" title="([^"]*?)\s*Episodio\s*(\d+)"[\s\S]*?<img src="([^"]+)"/g;
  for (const m of frag.matchAll(re)) {
    items.push({
      title: decodeEntities(m[2].trim()),
      url: m[1],
      cover: m[4],
      update: `Ep. ${m[3]}`
    });
  }
  return items;
}
async function latest(page) {
  if (page <= 1) {
    try {
      const portada = await _get(BASE2);
      const recientes = _parseRecientes(portada);
      if (recientes.length) return recientes;
    } catch (e) {
    }
  }
  const query = _buildQuery({ p: page > 1 ? String(page) : void 0 });
  const html = await _get(`${BASE2}/directorio/anime${query ? `?${query}` : ""}`);
  return _parseCatalog(html);
}
async function _searchOnce(keyword, page, genero, tipo, estado) {
  const query = _buildQuery({
    q: keyword.trim() || void 0,
    genero,
    tipo,
    estado,
    p: page > 1 ? String(page) : void 0
  });
  const html = await _get(`${BASE2}/directorio/anime${query ? `?${query}` : ""}`);
  return _parseCatalog(html);
}
async function search(keyword, page, filter) {
  var _a, _b, _c;
  const genero = (_a = filter == null ? void 0 : filter["genero"]) == null ? void 0 : _a[0];
  const tipo = (_b = filter == null ? void 0 : filter["tipo"]) == null ? void 0 : _b[0];
  const estado = (_c = filter == null ? void 0 : filter["estado"]) == null ? void 0 : _c[0];
  const base = await _searchOnce(keyword, page, genero, tipo, estado);
  if (tipo || page > 1 || !keyword.trim()) return base;
  const _UNION_TYPES = ["1", "2", "3", "4"];
  const perType = await Promise.all(
    _UNION_TYPES.map(
      (t) => _searchOnce(keyword, page, genero, t, estado).catch(() => [])
    )
  );
  const merged = [];
  const seen = {};
  for (const item of base) {
    if (seen[item.url]) continue;
    seen[item.url] = true;
    merged.push(item);
  }
  for (const list of perType) {
    for (const item of list) {
      if (seen[item.url]) continue;
      seen[item.url] = true;
      merged.push(item);
    }
  }
  return merged;
}
var _GENRE_OPTIONS = {
  "": "Todos",
  "1": "Acci\xF3n",
  "2": "Escolares",
  "3": "Romance",
  "4": "Shoujo",
  "5": "Comedia",
  "6": "Drama",
  "7": "Seinen",
  "8": "Deportes",
  "9": "Shounen",
  "10": "Recuentos de la vida",
  "11": "Ecchi",
  "12": "Sobrenatural",
  "13": "Fantas\xEDa",
  "14": "Magia",
  "15": "Superpoderes",
  "16": "Demencia",
  "17": "Misterio",
  "18": "Psicol\xF3gico",
  "19": "Suspenso",
  "20": "Ciencia Ficci\xF3n",
  "21": "Mecha",
  "22": "Militar",
  "23": "Aventuras",
  "24": "Historico",
  "25": "Infantil",
  "26": "Artes Marciales",
  "27": "Terror",
  "28": "Harem"
};
var _TYPE_OPTIONS = {
  "": "Todos",
  "1": "TV Anime",
  "2": "Pel\xEDcula",
  "3": "OVA",
  "4": "Especial",
  "9": "Serie",
  "11": "Dorama",
  "14": "Corto",
  "15": "Donghua"
};
var _STATUS_OPTIONS = {
  "": "Todos",
  "1": "Finalizado",
  "2": "En emisi\xF3n",
  "3": "Pr\xF3ximamente"
};
async function createFilter() {
  return {
    genero: { title: "G\xE9nero", options: _GENRE_OPTIONS, default: "", min: 1, max: 1 },
    tipo: { title: "Tipo", options: _TYPE_OPTIONS, default: "", min: 1, max: 1 },
    estado: { title: "Estado", options: _STATUS_OPTIONS, default: "", min: 1, max: 1 }
  };
}
async function _serieDelEpisodio(url) {
  try {
    const html = await _get(_fullUrl(url));
    const m = /<a href="(\/[^"]+)"[^>]*>\s*<i class="fa fa-list-alt"/.exec(html);
    return m ? m[1] : null;
  } catch (e) {
    return null;
  }
}
async function detail(url) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  if (url.indexOf("/ver/") >= 0) {
    const serie = await _serieDelEpisodio(url);
    if (serie) url = serie;
  }
  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  const slug = fullUrl.replace(`${BASE2}/`, "").replace(/\/$/, "");
  const title = (_c = (_b = (_a = /<h1[^>]*>([^<]+)<\/h1>/i.exec(html)) == null ? void 0 : _a[1]) == null ? void 0 : _b.trim()) != null ? _c : "";
  const cover = (_d = /property="og:image"\s+content="([^"]+)"/i.exec(html)) == null ? void 0 : _d[1];
  const description = stripTags(
    (_f = (_e = /Sinopsis<\/h2>\s*<p[^>]*>([^<]*)<\/p>/i.exec(html)) == null ? void 0 : _e[1]) != null ? _f : ""
  ).trim();
  const genres = [];
  const generosBlockM = /Géneros<\/h2>([\s\S]*?)<!--/i.exec(html);
  if (generosBlockM) {
    for (const m of generosBlockM[1].matchAll(/genero=\d+"[^>]*>\s*([^<]+?)\s*</g)) {
      genres.push(decodeEntities(m[1].trim()));
    }
  }
  const episodes = [];
  const epRe = /<a href="(\/ver\/[^"]+)" class="episode-card">[\s\S]*?<span class="ep-title">([^<]+)<\/span>/g;
  let start = 0;
  for (let page = 0; page < 60; page++) {
    const chunk = await _get(`${fullUrl}?id=${slug}&load=episodes&start=${start}`);
    let found = 0;
    for (const m of chunk.matchAll(epRe)) {
      episodes.push({ title: decodeEntities(m[2].trim()), url: `${BASE2}${m[1]}` });
      found++;
    }
    if (found === 0) break;
    start += 16;
    if (found < 16) break;
  }
  const statusText = ((_h = (_g = /Estado:\s*<\/span>\s*([^<]+)/i.exec(html)) == null ? void 0 : _g[1]) != null ? _h : "").trim().toLowerCase();
  const status = statusText.includes("finalizado") || statusText.includes("concluido") ? "completed" : statusText.includes("emision") || statusText.includes("emisi\xF3n") ? "ongoing" : statusText.includes("proximamente") || statusText.includes("pr\xF3ximamente") ? "upcoming" : void 0;
  return { title, cover, description, genres, episodes, status };
}
async function watch(url) {
  var _a, _b;
  if (url.indexOf("http") === 0 && url.indexOf("animefenix2.tv") === -1) {
    try {
      const res = await resolverServidor(url, `${BASE2}/`);
      if (res && res.url) {
        return { streams: [{ url: res.url, quality: "Servidor", headers: res.headers }], pageUrl: "" };
      }
    } catch (e) {
    }
    return { streams: [{ url, quality: "Servidor" }], pageUrl: "" };
  }
  const episodeUrl = _fullUrl(url);
  const html = await _get(episodeUrl);
  const labels = {};
  for (const m of html.matchAll(/<a title="([^"]+)" href="#vid(\d+)">/g)) {
    labels[m[2]] = m[1].trim();
  }
  const streams = [];
  const tabRe = /tabsArray\['(\d+)'\]\s*=\s*"[^"]*?src='https:\/\/re\.animepelix\.net\/redirect\.php\?id=([^']+)'/g;
  for (const m of html.matchAll(tabRe)) {
    const num = m[1];
    const targetUrl = m[2];
    const name = (_a = labels[num]) != null ? _a : `Servidor ${num}`;
    streams.push({ url: targetUrl, quality: name, nativo: (_b = fichaDe(targetUrl)) == null ? void 0 : _b.nativo });
  }
  streams.sort((a, b) => (a.nativo === false ? 1 : 0) - (b.nativo === false ? 1 : 0));
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

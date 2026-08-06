// ==PrismHubExtension==
// @name         JKAnime
// @version      1.12.6
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.jkanime
// @type         bangumi
// @nsfw         false
// @webSite      https://jkanime.net
// @description  Anime sub y latino con varios servidores de respaldo — si uno falla, seguís viendo por otro.
// ==/PrismHubExtension==
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

// sdk/html.ts
function matchFirst(html, pattern) {
  var _a, _b, _c;
  return (_c = (_b = (_a = pattern.exec(html)) == null ? void 0 : _a[1]) == null ? void 0 : _b.trim()) != null ? _c : "";
}
function matchGroups(html, pattern) {
  const flags = pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g";
  return [...html.matchAll(new RegExp(pattern.source, flags))].map(
    (m) => [...m].slice(1).map((s) => {
      var _a;
      return (_a = s == null ? void 0 : s.trim()) != null ? _a : "";
    })
  );
}
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

// extensions/jkanime/servidores/comun.ts
var UA_DEL_REPRODUCTOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
var CABECERAS_DEL_REPRODUCTOR = {
  "User-Agent": UA_DEL_REPRODUCTOR
};
async function pedir(url, referer, headers) {
  var _a;
  try {
    return await sendMessage(
      "request",
      JSON.stringify([url, { method: "get", headers: __spreadValues({ Referer: referer }, headers) }])
    );
  } catch (e) {
    console.log(`[jk] no se pudo pedir ${url.slice(0, 45)} :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return null;
  }
}
async function resolverReproductorPropio(iframeSrc, referer) {
  const hdrs = { Referer: referer };
  const html = await pedir(iframeSrc, referer);
  if (!html) return null;
  const enBase64 = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
  if (enBase64) {
    try {
      const claro = b64aTexto(enBase64[1]);
      if (claro.indexOf(".m3u8") !== -1 || claro.indexOf(".mp4") !== -1) {
        return { url: claro, headers: hdrs };
      }
    } catch (e) {
    }
  }
  const patrones = [
    /<source\s+src=['"]([^'"]+\.m3u8[^'"]*)['"]/i,
    /url\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i,
    /loadSource\(\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i,
    /<source\s+src=['"]([^'"]+\.mp4[^'"]*)['"]/i,
    /url\s*:\s*['"]([^'"]+\.mp4[^'"]*)['"]/i
  ];
  for (const re of patrones) {
    const m = re.exec(html);
    if (m) return { url: m[1], headers: hdrs };
  }
  return null;
}
function codigoDe(url) {
  const sinQuery = url.split("?")[0].split("#")[0].replace(/\/+$/, "");
  const ultimo = sinQuery.slice(sinQuery.lastIndexOf("/") + 1);
  return ultimo.replace(/^embed-/, "").replace(/\.html?$/, "");
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

// extensions/jkanime/servidores/desu/index.ts
async function resolver(url, referer) {
  const hdrs = { Referer: referer };
  const html = await pedir(url, referer);
  if (!html) return null;
  const patrones = [
    /"url"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i,
    /"file"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i,
    /"url"\s*:\s*"(https?:\/\/[^"]+\.mp4[^"]*)"/i,
    /<source[^>]+src="(https?:\/\/[^"]+\.m3u8[^"]*)"/i
  ];
  for (const re of patrones) {
    const m = re.exec(html);
    if (m) return { url: m[1], headers: hdrs };
  }
  return null;
}

// extensions/jkanime/servidores/doodstream/index.ts
async function resolver2(_url, _referer) {
  return null;
}

// extensions/jkanime/servidores/filemoon/index.ts
function b64urlAWord(s) {
  const normal = s.replace(/-/g, "+").replace(/_/g, "/");
  const relleno = normal.length % 4 === 0 ? "" : "=".repeat(4 - normal.length % 4);
  return CryptoJS.enc.Base64.parse(normal + relleno);
}
async function resolver3(url, referer) {
  var _a;
  const host = hostDe(url) || "bysekoze.com";
  const codigo = codigoDe(url);
  if (!codigo) return null;
  const crudo = await pedir(
    `https://${host}/api/videos/${codigo}`,
    referer || `https://${host}/`,
    CABECERAS_DEL_REPRODUCTOR
  );
  if (!crudo) return null;
  let meta;
  try {
    meta = JSON.parse(crudo);
  } catch (e) {
    console.log("[jk] filemoon: la API no devolvi\xF3 JSON");
    return null;
  }
  const pb = meta.playback;
  if (!pb || !pb.iv || !pb.payload || !Array.isArray(pb.key_parts)) {
    console.log("[jk] filemoon: la API no trajo datos de reproducci\xF3n");
    return null;
  }
  const v = Number(pb.version);
  const partes = pb.key_parts;
  const indices = v >= 1 && v <= 20 && 31 - v <= partes.length ? [v, 31 - v] : null;
  const elegidas = indices ? indices.map((i) => partes[i - 1]).filter((p) => typeof p === "string" && p.length > 0) : partes;
  if (!elegidas.length) return null;
  try {
    let clave = b64urlAWord(elegidas[0]);
    for (let i = 1; i < elegidas.length; i++) clave = clave.concat(b64urlAWord(elegidas[i]));
    const iv = b64urlAWord(pb.iv);
    const contador = CryptoJS.lib.WordArray.create(iv.words.concat([2]), 16);
    const cifrado = b64urlAWord(pb.payload);
    const sinEtiqueta = CryptoJS.lib.WordArray.create(
      cifrado.words.slice(),
      cifrado.sigBytes - 16
    );
    const claro = CryptoJS.AES.decrypt(
      { ciphertext: sinEtiqueta },
      clave,
      { iv: contador, mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding }
    ).toString(CryptoJS.enc.Utf8);
    const m = /"url"\s*:\s*"([^"]+)"/.exec(claro);
    if (!m) {
      console.log("[jk] filemoon: se descifr\xF3 pero no hab\xEDa ninguna url adentro");
      return null;
    }
    return {
      url: m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/"),
      // El mismo User-Agent con el que se pidió la API: el token del CDN se
      // emitió para ése.
      headers: {
        Referer: `https://${host}/`,
        "User-Agent": UA_DEL_REPRODUCTOR
      }
    };
  } catch (e) {
    console.log(`[jk] filemoon: no se pudo descifrar: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return null;
  }
}

// extensions/jkanime/servidores/generico/index.ts
async function resolver4(url, referer) {
  var _a;
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  const headers = host ? { Referer: `https://${host}/` } : void 0;
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

// extensions/jkanime/servidores/magi/index.ts
async function resolver5(url, referer) {
  const hdrs = { Referer: referer };
  const html = await pedir(url, referer);
  if (!html) return null;
  const patrones = [
    /<source[^>]+src="(https?:\/\/[^"]+\.m3u8[^"]*)"/i,
    /<source[^>]+src="(https?:\/\/[^"]+\.mp4[^"]*)"/i,
    /source\s*:\s*['"]?(https?:\/\/[^'">\s]+\.m3u8)/i
  ];
  for (const re of patrones) {
    const m = re.exec(html);
    if (m) return { url: m[1], headers: hdrs };
  }
  return null;
}

// extensions/jkanime/servidores/mega/index.ts
async function resolver6(_url, _referer) {
  return null;
}

// extensions/jkanime/servidores/mixdrop/index.ts
var DOMINIOS_DE_REPUESTO = ["miixdrop.com", "mxdrop.to", "mixdrop.top"];
function conOtroDominio(url, dominio) {
  const host = hostDe(url);
  if (!host || host === dominio) return null;
  return url.replace(host, dominio);
}
async function sacarDestino(url, referer) {
  var _a;
  const html = await pedir(url, referer, CABECERAS_DEL_REPRODUCTOR);
  if (!html) return null;
  const desempaquetado = desempaquetarTodo(html);
  const wurl = /MDCore\.wurl\s*=\s*["']([^"']+)["']/.exec(desempaquetado);
  if (wurl == null ? void 0 : wurl[1]) return wurl[1];
  const mp4 = /(\/\/[^"'\s]+\.mp4[^"'\s]*)/.exec(desempaquetado);
  return (_a = mp4 == null ? void 0 : mp4[1]) != null ? _a : null;
}
async function resolver7(url, referer) {
  let destino = await sacarDestino(url, referer);
  if (!destino) {
    for (const dominio of DOMINIOS_DE_REPUESTO) {
      const otra = conOtroDominio(url, dominio);
      if (!otra) continue;
      destino = await sacarDestino(otra, referer);
      if (destino) break;
    }
  }
  if (!destino) return null;
  const completa = destino.indexOf("http") === 0 ? destino : `https:${destino}`;
  return {
    url: completa,
    headers: __spreadValues({
      Referer: "https://mixdrop.top/"
    }, CABECERAS_DEL_REPRODUCTOR)
  };
}

// extensions/jkanime/servidores/mp4upload/index.ts
async function resolver8(url, referer) {
  var _a;
  const html = await pedir(url, referer);
  if (!html) return null;
  const candidatos = (_a = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g)) != null ? _a : [];
  const real = candidatos.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) return null;
  return { url: real, headers: { Referer: "https://www.mp4upload.com/" } };
}

// extensions/jkanime/servidores/streamtape/index.ts
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
async function resolver9(url, referer) {
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

// extensions/jkanime/servidores/streamwish/index.ts
async function resolver10(url, referer) {
  var _a;
  const host = hostDe(url);
  if (!host) return null;
  const hdrs = { Referer: `https://${host}/` };
  const idM = /\/(?:e|f|d|v)\/([A-Za-z0-9]+)/.exec(url);
  if (idM) {
    const json = await pedir(`https://${host}/api/file/${idM[1]}?json=1`, `https://${host}/`, {
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json"
    });
    if (json) {
      const m3u82 = /"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(json);
      if (m3u82) return { url: m3u82[1].replace(/\\\//g, "/"), headers: hdrs };
      const mp4 = /"file"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(json);
      if (mp4) return { url: mp4[1].replace(/\\\//g, "/"), headers: hdrs };
    }
  }
  const html = await pedir(url, `https://${host}/`);
  if (!html) return null;
  const plano = `${html}
${desempaquetarTodo(html)}`.replace(/\\\//g, "/");
  const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(plano);
  if (m3u8) return { url: m3u8[1], headers: hdrs };
  const file = /(?:file|source|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/i.exec(plano);
  if (file) return { url: file[1], headers: hdrs };
  const enBase64 = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
  if (enBase64) {
    try {
      const dec = b64aTexto(enBase64[1]);
      const src = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(dec.replace(/\\\//g, "/"));
      if (src) return { url: src[1], headers: hdrs };
    } catch (e) {
    }
  }
  const mp4s = (_a = plano.match(/https?:[^"'\s\\]+\.mp4[^"'\s\\]*/g)) != null ? _a : [];
  const real = mp4s.find((u) => !/\.(?:css|js|jpg|png|woff)/.test(u));
  if (real) return { url: real, headers: hdrs };
  return null;
}

// extensions/jkanime/servidores/voe/index.ts
function rot13(s) {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
  });
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
async function resolver11(url, referer) {
  let html = await pedir(url, referer, CABECERAS_DEL_REPRODUCTOR);
  if (!html) return null;
  const redir = /window\.location(?:\.href)?\s*=\s*['"](https?:\/\/[^'"]+)['"]/.exec(html);
  if (redir) {
    const espejo = await pedir(redir[1], "https://voe.sx/", CABECERAS_DEL_REPRODUCTOR);
    if (espejo) html = espejo;
  }
  const salida = (u) => ({
    url: u.replace(/\\\//g, "/"),
    headers: CABECERAS_DEL_REPRODUCTOR
  });
  const bloque = /<script[^>]*type=["']application\/json["'][^>]*>\s*\[\s*"([^"]+)"\s*\]\s*<\/script>/.exec(html);
  if (bloque) {
    const claro = descifrar(bloque[1]);
    if (claro) {
      const mp4 = /"direct_access_url"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(claro);
      if (mp4) return salida(mp4[1]);
      const src = /"source"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(claro);
      if (src) return salida(src[1]);
      const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(claro.replace(/\\\//g, "/"));
      if (m3u8) return salida(m3u8[1]);
    }
  }
  let m = /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(html);
  if (m) return salida(m[1]);
  const enBase64 = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
  if (enBase64) {
    try {
      const dec = b64aTexto(enBase64[1]);
      const hls = /['"]hls['"]\s*:\s*['"]([^'"]+)['"]/.exec(dec);
      if (hls) return salida(hls[1]);
    } catch (e) {
    }
  }
  m = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
  if (m) return salida(m[0]);
  return null;
}

// extensions/jkanime/servidores/index.ts
var SERVIDORES = [
  {
    boton: "Desu",
    hosts: ["/desu", "desudesuka"],
    botones: 59,
    nativo: true,
    resolver
  },
  {
    boton: "Magi",
    hosts: ["/magi"],
    botones: 59,
    nativo: true,
    resolver: resolver5
  },
  {
    boton: "Streamtape",
    hosts: ["streamtape", "stape", "strtape"],
    botones: 59,
    nativo: true,
    resolver: resolver9
  },
  {
    boton: "Mega",
    hosts: ["mega.nz", "mega.co.nz"],
    botones: 59,
    nativo: false,
    resolver: resolver6
  },
  {
    boton: "Streamwish",
    hosts: ["sfastwish", "streamwish", "wishfast", "swdyu"],
    botones: 59,
    nativo: true,
    resolver: resolver10
  },
  {
    boton: "VOE",
    hosts: ["voe.sx", "voe."],
    botones: 59,
    nativo: true,
    resolver: resolver11
  },
  {
    boton: "Vidhide",
    hosts: ["vidhide", "vhide"],
    botones: 59,
    nativo: true,
    resolver: resolver10
  },
  {
    boton: "Mixdrop",
    hosts: ["mixdrop", "mxdrop", "xdrop"],
    botones: 59,
    nativo: true,
    resolver: resolver7
  },
  {
    boton: "Filemoon",
    hosts: ["bysekoze", "byse.", "filemoon", "moonplayer"],
    botones: 58,
    nativo: true,
    resolver: resolver3
  },
  {
    boton: "Doodstream",
    hosts: ["dsvplay", "playmogo", "dooodster", "dood"],
    botones: 55,
    nativo: false,
    resolver: resolver2
  },
  {
    boton: "Mp4upload",
    hosts: ["mp4upload"],
    botones: 48,
    nativo: true,
    resolver: resolver8
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
  console.log(`[jk] servidor sin ficha, se prueba a mano: ${url.slice(0, 60)}`);
  return resolver4(url, referer);
}

// extensions/jkanime/index.ts
async function _get(url, headers = {}) {
  const raw = await sendMessage("request", JSON.stringify([url, { method: "get", headers }]));
  try {
    return JSON.parse(raw);
  } catch (e) {
    return raw;
  }
}
async function _post(url, token) {
  const raw = await sendMessage("request", JSON.stringify([url, {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json"
    },
    data: "_token=" + encodeURIComponent(token)
  }]));
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (e) {
      throw e;
    }
  }
  return raw;
}
var BASE = "https://jkanime.net";
var _searchSeen = /* @__PURE__ */ new Map();
function _parseDirectoryPage(html) {
  const m = /var animes = (\{[\s\S]*?\});\r?\n/.exec(html);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    return null;
  }
}
function _directorioQuery(page, filter) {
  const f = filter != null ? filter : {};
  const parts = [`p=${page}`];
  const add = (key) => {
    var _a;
    const v = (_a = f[key]) == null ? void 0 : _a[0];
    if (v) parts.push(`${key}=${encodeURIComponent(v)}`);
  };
  add("filtro");
  add("orden");
  add("genero");
  add("demografia");
  add("categoria");
  add("tipo");
  add("estado");
  add("letra");
  add("fecha");
  add("temporada");
  return parts.join("&");
}
async function latest(page, filter) {
  const html = await _get(`${BASE}/directorio?${_directorioQuery(page, filter)}`);
  const dir = _parseDirectoryPage(html);
  if (!dir || page > dir.last_page) return [];
  return dir.data.map((a) => ({
    title: decodeEntities(a.title),
    url: a.slug,
    cover: a.image
  }));
}
async function search(keyword, page, filter) {
  const kw = keyword.trim();
  if (!kw) return latest(page, filter);
  if (page === 1) _searchSeen.delete(keyword);
  if (!_searchSeen.has(keyword)) _searchSeen.set(keyword, /* @__PURE__ */ new Set());
  const seen = _searchSeen.get(keyword);
  const html = await _get(`${BASE}/buscar/${encodeURIComponent(keyword)}/?page=${page}`);
  const cards = _parseCards(html);
  const fresh = cards.filter((c) => !seen.has(c.url));
  fresh.forEach((c) => seen.add(c.url));
  return fresh;
}
var _GENRES = {
  "": "Todos",
  accion: "Acci\xF3n",
  aventura: "Aventura",
  autos: "Autos",
  comedia: "Comedia",
  dementia: "Dementia",
  demonios: "Demonios",
  misterio: "Misterio",
  drama: "Drama",
  ecchi: "Ecchi",
  fantasia: "Fantas\xEDa",
  juegos: "Juegos",
  hentai: "Hentai",
  historico: "Hist\xF3rico",
  terror: "Terror",
  "nios": "Ni\xF1os",
  magia: "Magia",
  "artes-marciales": "Artes Marciales",
  mecha: "Mecha",
  musica: "M\xFAsica",
  parodia: "Parodia",
  samurai: "Samurai",
  romance: "Romance",
  colegial: "Colegial",
  "sci-fi": "Sci-Fi",
  shoujo: "Shoujo",
  "shoujo-ai": "Shoujo Ai",
  shounen: "Shounen",
  "shounen-ai": "Shounen Ai",
  space: "Space",
  deportes: "Deportes",
  "super-poderes": "Super Poderes",
  vampiros: "Vampiros",
  yaoi: "Yaoi",
  yuri: "Yuri",
  harem: "Harem",
  "cosas-de-la-vida": "Cosas de la vida",
  sobrenatural: "Sobrenatural",
  militar: "Militar",
  policial: "Policial",
  psicologico: "Psicol\xF3gico",
  thriller: "Thriller",
  seinen: "Seinen",
  josei: "Josei",
  latino: "Espa\xF1ol Latino",
  isekai: "Isekai"
};
var _LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
async function createFilter() {
  return {
    filtro: {
      title: "Ordenar por",
      options: { "": "Fecha", nombre: "Nombre", popularidad: "Popularidad" },
      default: "",
      min: 1,
      max: 1
    },
    orden: {
      title: "Direcci\xF3n",
      options: { "": "Descendente", asc: "Ascendente" },
      default: "",
      min: 1,
      max: 1
    },
    tipo: {
      title: "Tipo",
      options: {
        "": "Todos",
        animes: "Animes",
        peliculas: "Pel\xEDculas",
        especiales: "Especiales",
        ovas: "Ovas",
        onas: "Onas"
      },
      default: "",
      min: 1,
      max: 1
    },
    estado: {
      title: "Estado",
      options: {
        "": "Todos",
        emision: "En emisi\xF3n",
        finalizados: "Finalizado",
        estrenos: "Por estrenar"
      },
      default: "",
      min: 1,
      max: 1
    },
    categoria: {
      title: "Categor\xEDa",
      options: { "": "Todas", donghua: "Donghua", latino: "Latino" },
      default: "",
      min: 1,
      max: 1
    },
    demografia: {
      title: "Demograf\xEDa",
      options: {
        "": "Todas",
        "nios": "Ni\xF1os",
        shoujo: "Shoujo",
        shounen: "Shounen",
        seinen: "Seinen",
        josei: "Josei"
      },
      default: "",
      min: 1,
      max: 1
    },
    genero: {
      title: "G\xE9nero",
      options: _GENRES,
      default: "",
      min: 1,
      max: 1
    },
    letra: {
      title: "Letra",
      options: __spreadValues({ "": "Todas" }, _LETTERS.reduce((acc, l) => __spreadProps(__spreadValues({}, acc), { [l]: l.toUpperCase() }), {})),
      default: "",
      min: 1,
      max: 1
    },
    fecha: {
      title: "A\xF1o",
      options: __spreadValues({ "": "Todos" }, _DIRECTORIO_YEARS.reduce((acc, y) => __spreadProps(__spreadValues({}, acc), { [y]: y }), {})),
      default: "",
      min: 1,
      max: 1
    },
    // Ojo: los valores reales del <select name="temporada"> de /directorio
    // van en minúscula (invierno/primavera/verano/otoño) — confirmado en
    // vivo que "Invierno" (mayúscula, como usa /top más abajo) es IGNORADO
    // silenciosamente por este endpoint (misma cantidad de resultados que
    // sin filtro), mientras que "invierno" sí filtra correctamente.
    temporada: {
      title: "Temporada",
      options: {
        "": "Todas",
        invierno: "Invierno",
        primavera: "Primavera",
        verano: "Verano",
        "oto\xF1o": "Oto\xF1o"
      },
      default: "",
      min: 1,
      max: 1
    }
  };
}
var _DIRECTORIO_YEARS = Array.from({ length: 2026 - 1981 + 1 }, (_, i) => String(2026 - i));
var _TOP_YEARS = Array.from({ length: 2026 - 2e3 + 1 }, (_, i) => String(2026 - i));
async function createTopFilter() {
  return {
    temporada: {
      title: "Temporada",
      options: {
        "": "Top general",
        Primavera: "Primavera",
        Verano: "Verano",
        Oto\u00F1o: "Oto\xF1o",
        Invierno: "Invierno"
      },
      default: "",
      min: 1,
      max: 1
    },
    fecha: {
      title: "A\xF1o",
      options: __spreadValues({ "": "Todos" }, _TOP_YEARS.reduce((acc, y) => __spreadProps(__spreadValues({}, acc), { [y]: y }), {})),
      default: "",
      min: 1,
      max: 1
    }
  };
}
async function top(filter, _page) {
  var _a, _b, _c, _d;
  const temporada = (_b = (_a = filter == null ? void 0 : filter["temporada"]) == null ? void 0 : _a[0]) != null ? _b : "";
  const fecha = (_d = (_c = filter == null ? void 0 : filter["fecha"]) == null ? void 0 : _c[0]) != null ? _d : "";
  const parts = [];
  if (temporada) parts.push(`temporada=${encodeURIComponent(temporada)}`);
  if (fecha) parts.push(`fecha=${encodeURIComponent(fecha)}`);
  const qs = parts.join("&");
  const html = await _get(`${BASE}/top${qs ? "?" + qs : ""}`);
  return _parseTopCards(html);
}
function _parseTopCards(html) {
  const items = [];
  const blocks = html.split('class="col toplist mb-4"').slice(1);
  for (const block of blocks) {
    const hrefM = /<a\s+href="https?:\/\/jkanime\.net\/([a-z0-9-]+)\/"/i.exec(block);
    if (!hrefM) continue;
    const coverM = /class="card-img-top"\s+src="([^"]+)"/i.exec(block);
    const votesM = /class="card-badge">[\s\S]{0,40}?<\/i>\s*([\d.,]+)/i.exec(block);
    const titleM = /class="card-title">([^<]+)<\/h5>/i.exec(block);
    if (!titleM) continue;
    items.push({
      title: decodeEntities(titleM[1].trim()),
      url: hrefM[1],
      cover: coverM ? coverM[1] : void 0,
      update: votesM ? `\u{1F44D} ${votesM[1]}` : void 0
    });
  }
  return items;
}
async function detail(url) {
  var _a, _b, _c, _d;
  const slug = _toSlug(url);
  const html = await _get(`${BASE}/${slug}/`);
  const title = matchFirst(html, /<h1[^>]*>([^<]+)<\/h1>/i) || matchFirst(html, /<title>\s*([^<]*?)\s*-\s*anime\s/i) || matchFirst(html, /<title>([^|<]+)/i) || slug;
  const cover = matchFirst(html, /property="og:image"\s+content="([^"]+)"/i) || matchFirst(html, /class="card-img-top"\s+src="([^"]+)"/i) || "";
  const description = stripTags(
    matchFirst(html, /class="[^"]*sinopsis[^"]*"[^>]*>([\s\S]*?)<\/(?:div|p)>/i) || matchFirst(html, /class="[^"]*descripci[^"]*"[^>]*>([\s\S]*?)<\/(?:div|p)>/i) || ""
  ).trim();
  const animeId = matchFirst(html, /data-anime="(\d+)"/i) || matchFirst(html, /data-id="(\d+)"/i) || matchFirst(html, /"anime_id"\s*:\s*(\d+)/i) || matchFirst(html, /animeId\s*=\s*(\d+)/i);
  const token = matchFirst(html, /name="csrf-token"\s+content="([^"]+)"/i) || matchFirst(html, /content="([^"]+)"\s+name="csrf-token"/i) || matchFirst(html, /"csrf[_-]token"\s*:\s*"([^"]+)"/i);
  const episodes = [];
  if (animeId && token) {
    const allEps = [];
    let lastPage = 1;
    let first = null;
    try {
      first = await _post(`${BASE}/ajax/episodes/${animeId}/1`, token);
      if (first && Array.isArray(first.data)) {
        allEps.push(...first.data);
        lastPage = first.last_page || 1;
      }
    } catch (e) {
    }
    const perPage = (_b = (_a = first == null ? void 0 : first.data) == null ? void 0 : _a.length) != null ? _b : 0;
    const total = (_c = first == null ? void 0 : first.total) != null ? _c : 0;
    let shortcutEps = null;
    if (first && lastPage > 2 && perPage > 0 && total > perPage) {
      try {
        const last = await _post(
          `${BASE}/ajax/episodes/${animeId}/${lastPage}`,
          token
        );
        const lastData = (_d = last == null ? void 0 : last.data) != null ? _d : [];
        const expectedLastStart = (lastPage - 1) * perPage + 1;
        const firstIsSequential = first.data.every((e, i) => e.number === i + 1);
        const lastIsSequential = lastData.every(
          (e, i) => e.number === expectedLastStart + i
        );
        const countsMatch = expectedLastStart - 1 + lastData.length === total;
        if (lastData.length && firstIsSequential && lastIsSequential && countsMatch) {
          const sample = lastData[lastData.length - 1];
          const prefix = sample.title.replace(/\s*\d+\s*$/, "");
          const byNumber = {};
          for (const e of [...first.data, ...lastData]) byNumber[e.number] = e;
          shortcutEps = [];
          for (let n = 1; n <= total; n++) {
            const real = byNumber[n];
            shortcutEps.push(
              real != null ? real : { id: n, number: n, title: `${prefix} ${n}`.trim() }
            );
          }
        }
      } catch (e) {
      }
    }
    if (shortcutEps) {
      allEps.length = 0;
      allEps.push(...shortcutEps);
    } else if (lastPage > 1) {
      const remaining = Array.from({ length: lastPage - 1 }, (_, i) => i + 2);
      const BATCH = 10;
      for (let i = 0; i < remaining.length; i += BATCH) {
        const batch = remaining.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map(
            (p) => _post(`${BASE}/ajax/episodes/${animeId}/${p}`, token).catch(() => null)
          )
        );
        for (const res of results) {
          if (res && Array.isArray(res.data)) allEps.push(...res.data);
        }
      }
    }
    const seenNumbers = {};
    for (const ep of allEps) {
      if (seenNumbers[ep.number]) continue;
      seenNumbers[ep.number] = true;
      episodes.push({ title: ep.title, url: `${slug}/${ep.number}`, number: ep.number });
    }
    episodes.sort((a, b) => (a.number || 0) - (b.number || 0));
  }
  const genres = matchGroups(
    html,
    /<a[^>]+href="[^"]*\/genero\/[^"]*"[^>]*>([^<]+)<\/a>/gi
  ).map((g) => g[0]);
  const statusText = (matchFirst(html, /Estado:\s*<\/span>\s*<div[^>]*>([^<]+)<\/div>/i) || "").toLowerCase();
  const status = statusText.includes("concluido") || statusText.includes("finalizado") ? "completed" : statusText.includes("emision") || statusText.includes("emisi\xF3n") ? "ongoing" : statusText.includes("proximamente") || statusText.includes("pr\xF3ximamente") ? "upcoming" : void 0;
  return { title, cover, description, episodes, genres, status };
}
var _JS_ONLY_HOSTS = [
  "filelions",
  "filemoon",
  "moonplayer"
];
function _isJkInternalEmbed(url) {
  if (url.indexOf("jkanime.net") === -1) return false;
  const path = url.replace(/^https?:\/\/jkanime\.net/, "").replace(/\/+$/, "");
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 2 && /^\d+$/.test(parts[1])) return false;
  const knownEmbeds = ["desu", "magi", "desuka", "embed", "player", "desudesuka"];
  return knownEmbeds.some((e) => parts[0] === e || url.indexOf("desudesuka") !== -1);
}
var _SERVER_TIMEOUT = 6e3;
async function _withTimeout(promise, ms, fallback) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallback()), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
function _rawServerStream(server) {
  var _a;
  let raw = "";
  if (server.remote) {
    try {
      raw = _b64decode(server.remote);
    } catch (e) {
      raw = "";
    }
  }
  if (!raw && server.slug) {
    raw = server.slug.indexOf("http") === 0 ? server.slug : `${BASE}${server.slug}`;
  }
  if (!raw) return null;
  raw = _resolveRedirect(raw);
  const name = server.server || "Embed";
  const langSuffix = server.lang === 1 ? " LAT" : server.lang === 2 ? " CAST" : "";
  const soloConJs = _JS_ONLY_HOSTS.some((h) => raw.toLowerCase().indexOf(h) !== -1);
  return {
    url: raw,
    quality: `${name}${langSuffix}`,
    nativo: soloConJs ? false : (_a = fichaDe(raw)) == null ? void 0 : _a.nativo
  };
}
async function watch(url) {
  if (url.indexOf("http") === 0 && url.indexOf("jkanime.net") === -1) {
    const uLow = url.toLowerCase();
    const isJsOnly = _JS_ONLY_HOSTS.some((h) => uLow.indexOf(h) !== -1);
    if (!isJsOnly) {
      const name = _guessServerName(url);
      const stream = await _resolveEmbedDio(name, url, `${BASE}/`);
      if (stream) return { streams: [stream], pageUrl: "" };
    }
    return { streams: [], pageUrl: url };
  }
  if (_isJkInternalEmbed(url)) {
    const uLow = url.toLowerCase();
    const isDesu = uLow.indexOf("/desu") !== -1 || uLow.indexOf("desudesuka") !== -1;
    const isMagi = uLow.indexOf("/magi") !== -1;
    if (isDesu || isMagi) {
      const res = await resolverServidor(url, `${BASE}/`);
      if (res && res.url) {
        return {
          streams: [
            { url: res.url, quality: isDesu ? "Desu" : "Magi", headers: res.headers, nativo: true }
          ],
          pageUrl: ""
        };
      }
    }
    return { streams: [], pageUrl: url };
  }
  const episodeUrl = url.indexOf("http") === 0 ? url : `${BASE}/${url.replace(/\/+$/, "")}/`;
  const html = await _get(episodeUrl);
  const subEntries = _parseJkSubServers(html);
  subEntries.sort((a, b) => {
    const aDesu = a.name.toLowerCase() === "desu" ? 0 : 1;
    const bDesu = b.name.toLowerCase() === "desu" ? 0 : 1;
    return aDesu - bDesu;
  });
  const subResolved = await Promise.all(
    subEntries.map(
      (e) => _withTimeout(
        _resolveJkInternalPlayer(e.iframeSrc, episodeUrl, e.name),
        _SERVER_TIMEOUT,
        () => ({ url: e.iframeSrc, quality: e.name })
      )
    )
  );
  const subStreams = subResolved.filter((s) => s !== null);
  const m = /(?:var|let|const)\s+servers\s*=\s*(\[[\s\S]*?\]);/.exec(html) || /(?:var|let|const)\s+video\s*=\s*(\[[\s\S]*?\]);/.exec(html);
  if (!m) {
    return { streams: subStreams, pageUrl: episodeUrl };
  }
  let servers;
  try {
    servers = JSON.parse(m[1]);
  } catch (e) {
    return { streams: subStreams, pageUrl: episodeUrl };
  }
  if (!Array.isArray(servers) || servers.length === 0) {
    return { streams: subStreams, pageUrl: episodeUrl };
  }
  servers.sort((a, b) => (a.lang || 0) - (b.lang || 0));
  const resolved = servers.map((s) => _rawServerStream(s)).filter((s) => s !== null);
  const FUERA_DE_LA_LISTA = ["mediafire", "mp4upload", "mixdrop", "mxdrop", "xdrop"];
  const usable = resolved.filter((s) => {
    var _a;
    const u = ((_a = s.url) != null ? _a : "").toLowerCase();
    return !FUERA_DE_LA_LISTA.some((nombre) => u.indexOf(nombre) !== -1);
  });
  const direct = usable.filter((s) => _isDirect(s.url));
  const embeds = usable.filter((s) => !_isDirect(s.url));
  const streams = [...subStreams, ...direct, ...embeds];
  return { streams, pageUrl: episodeUrl };
}
async function _resolveEmbedDio(name, url, referer) {
  const res = await resolverServidor(url, referer);
  if (res && res.url) return { url: res.url, quality: name, headers: res.headers };
  return null;
}
function _parseJkSubServers(html) {
  const nameByIndex = {};
  const btnRe = /<a\s+id="btn-show-(\d+)"\s+data-id="\d+"\s+class="servers[^"]*"[^>]*>([^<]+)<\/a>/g;
  for (const bm of html.matchAll(btnRe)) {
    nameByIndex[parseInt(bm[1], 10)] = bm[2].trim();
  }
  const entries = [];
  const videoRe = /video\[(\d+)\]\s*=\s*'<iframe[^']*?\ssrc="([^"]+)"/g;
  for (const vm of html.matchAll(videoRe)) {
    const idx = parseInt(vm[1], 10);
    entries.push({ index: idx, name: nameByIndex[idx] || `Sub ${idx + 1}`, iframeSrc: vm[2] });
  }
  return entries;
}
async function _resolveJkInternalPlayer(iframeSrc, referer, label) {
  const res = await resolverReproductorPropio(iframeSrc, referer || `${BASE}/`);
  if (!res) return null;
  return { url: res.url, quality: label, headers: res.headers, nativo: true };
}
function _isDirect(url) {
  const u = url.toLowerCase();
  return u.indexOf(".m3u8") !== -1 || u.indexOf(".mp4") !== -1 || u.indexOf(".mkv") !== -1 || u.indexOf(".ts") !== -1;
}
function _resolveRedirect(url) {
  if (url.indexOf("/jkokru.php") !== -1) {
    const id = _urlParam(url, "u");
    return id ? `http://ok.ru/videoembed/${id}` : url;
  }
  if (url.indexOf("/jkvmixdrop.php") !== -1) {
    const id = _urlParam(url, "u");
    return id ? `https://mixdrop.ag/e/${id}` : url;
  }
  if (url.indexOf("/jksw.php") !== -1) {
    const id = _urlParam(url, "u");
    return id ? `https://sfastwish.com/e/${id}` : url;
  }
  if (url.indexOf("/jk.php") !== -1) {
    const path = _urlParam(url, "u");
    return path ? `${BASE}/${path}` : url;
  }
  return url;
}
function _urlParam(url, name) {
  const re = new RegExp("[?&]" + name + "=([^&#]+)");
  const m = re.exec(url);
  return m ? decodeURIComponent(m[1]) : "";
}
function _b64decode(s) {
  const T = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let r = "";
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  s = s.replace(/[^A-Za-z0-9+/]/g, "");
  for (let i = 0; i < s.length; i += 4) {
    const a = T.indexOf(s[i]);
    const b = T.indexOf(s[i + 1]);
    const c = T.indexOf(s[i + 2]);
    const d = T.indexOf(s[i + 3]);
    if (a < 0 || b < 0) break;
    r += String.fromCharCode(a << 2 | b >> 4);
    if (c >= 0) r += String.fromCharCode((b & 15) << 4 | c >> 2);
    if (d >= 0) r += String.fromCharCode((c & 3) << 6 | d);
  }
  return r;
}
function _guessServerName(url) {
  const u = url.toLowerCase();
  if (u.indexOf("voe") !== -1) return "Voe";
  if (u.indexOf("streamtape") !== -1 || u.indexOf("stape") !== -1) return "Streamtape";
  if (u.indexOf("mixdrop") !== -1 || u.indexOf("mxdrop") !== -1) return "Mixdrop";
  if (u.indexOf("mp4upload") !== -1) return "Mp4Upload";
  if (u.indexOf("dood") !== -1 || u.indexOf("ds2play") !== -1 || u.indexOf("ds2video") !== -1) return "Doodstream";
  if (u.indexOf("streamwish") !== -1 || u.indexOf("sfastwish") !== -1 || u.indexOf("wishfast") !== -1 || u.indexOf("vidhide") !== -1) return "Streamwish";
  if (u.indexOf("filemoon") !== -1 || u.indexOf("moonplayer") !== -1) return "Filemoon";
  if (u.indexOf("yourupload") !== -1 || u.indexOf("yupload") !== -1) return "YourUpload";
  if (u.indexOf("hqq") !== -1 || u.indexOf("netu") !== -1) return "Netu";
  if (u.indexOf("mega.nz") !== -1 || u.indexOf("mega.co.nz") !== -1) return "Mega";
  return "Embed";
}
function _toSlug(url) {
  if (url.indexOf("http") !== 0) return url.replace(/\/+$/, "");
  return url.replace(/^https?:\/\/jkanime\.net\//, "").replace(/\/+$/, "");
}
var _NAV_SLUGS = /* @__PURE__ */ new Set([
  "genero",
  "directorio",
  "buscar",
  "ajax",
  "tag",
  "temporada",
  "anime",
  "ver",
  "episodio",
  "wp-content",
  "wp-includes",
  // páginas de categoría de jkanime (no son animes)
  "serie",
  "pelicula",
  "especial",
  "ova",
  "ona",
  "music",
  "peli",
  "especiales",
  "cortos"
]);
function _isNavSlug(s) {
  return !s || s.length < 3 || _NAV_SLUGS.has(s) || /[?&#]/.test(s);
}
function _firstSegment(path) {
  return path.split("/")[0];
}
function _parseCards(html) {
  const items = [];
  if (!html) return items;
  const seen = /* @__PURE__ */ new Set();
  const imgRe = /<img\b[^>]*>/gi;
  let imgM;
  while ((imgM = imgRe.exec(html)) !== null) {
    const tag = imgM[0];
    if (tag.indexOf("card-img-top") === -1) continue;
    const setbgNearM = /\bdata-setbg=["'](https?:\/\/[^"']{10,})["']/i.exec(
      html.slice(Math.max(0, imgM.index - 200), imgM.index + tag.length + 500)
    );
    const animePicM = /\bdata-animepic=["']([^"']+)["']/i.exec(tag);
    const dataSrcM = /\bdata-src=["']([^"']+)["']/i.exec(tag);
    const srcM = /\bsrc=["']([^"']+)["']/i.exec(tag);
    const srcVal = srcM && srcM[1] && !/data:image|\.gif$|placeholder/i.test(srcM[1]) ? srcM[1] : "";
    const cover = setbgNearM && setbgNearM[1] || animePicM && animePicM[1] || dataSrcM && dataSrcM[1] || srcVal;
    const pos = imgM.index;
    const beforeImg = html.slice(Math.max(0, pos - 700), pos);
    const allHrefs = [...beforeImg.matchAll(/href=["']https?:\/\/jkanime\.net\/([a-z0-9][a-z0-9-]{1,80}(?:\/\d+)?)\/["']/gi)];
    const validHrefs = allHrefs.filter((m) => !_isNavSlug(_firstSegment(m[1])));
    if (validHrefs.length === 0) continue;
    const hrefM = validHrefs[validHrefs.length - 1];
    const slug = _firstSegment(hrefM[1]);
    if (seen.has(slug)) continue;
    seen.add(slug);
    let title = "";
    const altM = /\balt=["']([^"']{2,})["']/i.exec(tag);
    if (altM && altM[1].trim().length > 1) {
      title = altM[1].trim();
    } else {
      const afterImg = html.slice(pos + tag.length, pos + tag.length + 500);
      const hLinkM = /<h[4-6][^>]*>\s*<a[^>]*>([^<]{2,80})<\/a>/i.exec(afterImg);
      const hPlainM = /<h[4-6][^>]*>([^<]{2,80})<\/h[4-6]>/i.exec(afterImg);
      const cardTitleM = /class="[^"]*(?:card-title|anime-title)[^"]*"[^>]*>([^<]{2,80})</i.exec(afterImg);
      title = hLinkM && hLinkM[1].trim() || hPlainM && hPlainM[1].trim() || cardTitleM && cardTitleM[1].trim() || slug.replace(/-/g, " ");
    }
    items.push({ title: decodeEntities(title), url: slug, cover });
  }
  if (items.length === 0) {
    const hrefRe = /href=["'](?:https?:\/\/jkanime\.net)?\/([a-z0-9][a-z0-9-]{1,80})\/["']/gi;
    let hrefMatch;
    while ((hrefMatch = hrefRe.exec(html)) !== null) {
      const slug = hrefMatch[1];
      if (_isNavSlug(slug)) continue;
      if (seen.has(slug)) continue;
      const pos = hrefMatch.index;
      const ctx = html.slice(Math.max(0, pos - 600), pos + 800);
      let cover = "";
      const setbgM = /\bdata-setbg=["'](https?:\/\/[^"']{10,})["']/i.exec(ctx);
      if (setbgM) {
        cover = setbgM[1];
      }
      if (!cover) {
        const bgM = /background-image:\s*url\(['"]?(https?:\/\/[^'")\s]{10,})['"]?\)/i.exec(ctx);
        if (bgM) cover = bgM[1];
      }
      if (!cover) {
        const imgCtxRe = /<img\b[^>]*>/gi;
        let imgCtxM;
        while ((imgCtxM = imgCtxRe.exec(ctx)) !== null) {
          const t = imgCtxM[0];
          const s = /\b(?:data-lazy-src|data-lazy|data-original|data-src|src)=["']([^"']{20,})["']/i.exec(t);
          if (s && !/\.gif$|data:image|\.js$|\.css$|\.svg$|logo|icon|sprite/i.test(s[1])) {
            cover = s[1];
            break;
          }
        }
      }
      const titleCtx = html.slice(pos, pos + 1200);
      let title = "";
      const altM = /<img\b[^>]*\balt=["']([^"']{2,80})["'][^>]*>/i.exec(titleCtx);
      if (altM && !/logo|icon|banner|avatar/i.test(altM[1])) title = altM[1].trim();
      if (!title) {
        const linkEndCtx = html.slice(pos, pos + hrefMatch[0].length + 300);
        const linkTextM = /href=["'][^"']+["'][^>]*>([^<]{2,80})</i.exec(linkEndCtx);
        if (linkTextM) title = linkTextM[1].trim().replace(/\s+/g, " ");
      }
      if (!title) {
        const hLinkM = /<h[4-6][^>]*>\s*<a[^>]*>([^<]{2,80})<\/a>/i.exec(titleCtx);
        const hPlainM = /<h[2-6][^>]*>([^<]{2,80})<\/h[2-6]>/i.exec(titleCtx);
        const spanM = /class="[^"]*(?:title|name|anime)[^"]*"[^>]*>([^<]{2,80})</i.exec(titleCtx);
        title = hLinkM && hLinkM[1].trim() || hPlainM && hPlainM[1].trim() || spanM && spanM[1].trim() || slug.replace(/-/g, " ");
      }
      if (!cover) continue;
      seen.add(slug);
      items.push({ title: decodeEntities(title), url: slug, cover });
    }
  }
  return items;
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

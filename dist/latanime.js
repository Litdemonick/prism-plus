// ==PrismHubExtension==
// @name         LatAnime
// @version      1.1.4
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.latanime
// @type         bangumi
// @nsfw         false
// @contentKind  anime
// @latestLabel  anadidos-recientemente
// @webSite      https://latanime.org
// @description  Anime doblado al latino y castellano, con filtros por año, género, letra y categoría, y varios servidores por episodio.
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

// sdk/embeds.ts
function b64decode(s) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = s.replace(/[^A-Za-z0-9+/]/g, "");
  let result = "";
  let i = 0;
  while (i < clean.length) {
    const b1 = chars.indexOf(clean[i++]);
    const b2 = chars.indexOf(clean[i++]);
    const b3 = i < clean.length ? chars.indexOf(clean[i++]) : -1;
    const b4 = i < clean.length ? chars.indexOf(clean[i++]) : -1;
    result += String.fromCharCode(b1 << 2 | b2 >> 4);
    if (b3 !== -1) result += String.fromCharCode((b2 & 15) << 4 | b3 >> 2);
    if (b4 !== -1) result += String.fromCharCode((b3 & 3) << 6 | b4);
  }
  return result;
}

// extensions/latanime/servidores/comun.ts
async function pedir(url, referer, headers) {
  var _a;
  try {
    return await sendMessage(
      "request",
      JSON.stringify([url, { method: "get", headers: __spreadValues({ Referer: referer }, headers) }])
    );
  } catch (e) {
    console.log(`[la] no se pudo pedir ${url.slice(0, 45)} :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return null;
  }
}
async function postForm(url, campos, referer) {
  var _a;
  const cuerpo = Object.keys(campos).map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(campos[k])}`).join("&");
  try {
    return await sendMessage(
      "request",
      JSON.stringify([
        url,
        {
          method: "post",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            Referer: referer
          },
          data: cuerpo
        }
      ])
    );
  } catch (e) {
    console.log(`[la] POST fall\xF3 ${url.slice(0, 45)} :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return null;
  }
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

// extensions/latanime/servidores/byse/index.ts
function b64urlAWord(s) {
  const normal = s.replace(/-/g, "+").replace(/_/g, "/");
  const relleno = normal.length % 4 === 0 ? "" : "=".repeat(4 - normal.length % 4);
  return CryptoJS.enc.Base64.parse(normal + relleno);
}
async function resolver(url, referer) {
  var _a;
  const host = hostDe(url) || "bysekoze.com";
  const codigo = codigoDe(url);
  if (!codigo) return null;
  const crudo = await pedir(`https://${host}/api/videos/${codigo}`, referer || `https://${host}/`);
  if (!crudo) return null;
  let meta;
  try {
    meta = JSON.parse(crudo);
  } catch (e) {
    console.log("[la] byse: la API no devolvi\xF3 JSON");
    return null;
  }
  const pb = meta.playback;
  if (!pb || !pb.iv || !pb.payload || !Array.isArray(pb.key_parts)) {
    console.log("[la] byse: la API no trajo datos de reproducci\xF3n");
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
      console.log("[la] byse: se descifr\xF3 pero no hab\xEDa ninguna url adentro");
      return null;
    }
    return {
      url: m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/"),
      headers: { Referer: `https://${host}/` }
    };
  } catch (e) {
    console.log(`[la] byse: no se pudo descifrar: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return null;
  }
}

// extensions/latanime/servidores/dsvplay/index.ts
async function resolver2(_url, _referer) {
  return null;
}

// extensions/latanime/servidores/hexload/index.ts
async function resolver3(url, referer) {
  const host = hostDe(url) || "hexload.com";
  const codigo = codigoDe(url);
  if (!codigo) return null;
  const crudo = await postForm(
    `https://${host}/download`,
    { op: "download3", id: codigo, ajax: "1", method_free: "1" },
    referer || `https://${host}/`
  );
  if (!crudo) return null;
  const m = /"url"\s*:\s*"([^"]+)"/.exec(crudo);
  if (!m) {
    console.log("[la] hexload: el POST no devolvi\xF3 ninguna url");
    return null;
  }
  return { url: m[1].replace(/\\\//g, "/"), headers: { Referer: `https://${host}/` } };
}

// extensions/latanime/servidores/mega/index.ts
async function resolver4(_url, _referer) {
  return null;
}

// extensions/latanime/servidores/mixdrop/index.ts
async function resolver5(url, referer) {
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

// extensions/latanime/servidores/mojon/index.ts
async function resolver6(_url, _referer) {
  return null;
}

// extensions/latanime/servidores/mp4upload/index.ts
async function resolver7(url, referer) {
  var _a;
  const html = await pedir(url, referer);
  if (!html) return null;
  const candidatos = (_a = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g)) != null ? _a : [];
  const real = candidatos.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) return null;
  return { url: real, headers: { Referer: "https://www.mp4upload.com/" } };
}

// extensions/latanime/servidores/savefiles/index.ts
async function resolver8(url, referer) {
  const host = hostDe(url) || "savefiles.com";
  const codigo = codigoDe(url);
  if (!codigo) return null;
  const html = await postForm(
    `https://${host}/dl`,
    { op: "embed", file_code: codigo, auto: "1", referer: referer || "" },
    referer || `https://${host}/`
  );
  if (!html) return null;
  const plano = html.replace(/\\\//g, "/");
  const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(plano);
  if (m3u8) return { url: m3u8[1], headers: { Referer: `https://${host}/` } };
  const mp4 = /(https?:[^"'\s\\]+\.mp4[^"'\s\\]*)/.exec(plano);
  if (mp4) return { url: mp4[1], headers: { Referer: `https://${host}/` } };
  console.log("[la] savefiles: el POST a /dl no trajo ninguna fuente");
  return null;
}

// extensions/latanime/servidores/uqload/index.ts
async function resolver9(url, referer) {
  const host = hostDe(url);
  if (!host) return null;
  const hdrs = { Referer: `https://${host}/` };
  const codigo = codigoDe(url);
  if (codigo) {
    const json = await pedir(`https://${host}/api/file/${codigo}?json=1`, `https://${host}/`);
    if (json) {
      const m3u8 = /"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(json);
      if (m3u8) return { url: m3u8[1].replace(/\\\//g, "/"), headers: hdrs };
      const mp4 = /"file"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(json);
      if (mp4) return { url: mp4[1].replace(/\\\//g, "/"), headers: hdrs };
    }
  }
  const html = await pedir(url, referer);
  if (!html) return null;
  return buscarDireccion(html, hdrs);
}

// extensions/latanime/servidores/voe/index.ts
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
async function resolver10(url, referer) {
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

// extensions/latanime/servidores/index.ts
var SERVIDORES = [
  {
    boton: "Puj",
    hosts: ["mojon.latanime.org"],
    botones: 1,
    nativo: false,
    resolver: resolver6
  },
  {
    boton: "Savefiles",
    hosts: ["savefiles"],
    botones: 119,
    nativo: true,
    resolver: resolver8
  },
  {
    boton: "Mixdrop",
    hosts: ["mixdrop", "mxdrop", "xdrop"],
    botones: 119,
    nativo: true,
    resolver: resolver5
  },
  {
    boton: "Voe",
    hosts: ["voe.sx", "voe."],
    botones: 118,
    nativo: true,
    resolver: resolver10
  },
  {
    boton: "Byse",
    hosts: ["bysekoze"],
    botones: 96,
    nativo: true,
    resolver
  },
  {
    // Mismo servicio y mismo resolver que el de arriba, pero este host contesta
    // sin datos de reproducción. Ficha aparte para que el icono no mienta.
    boton: "Byse",
    hosts: ["byse.sx", "byse."],
    botones: 21,
    nativo: false,
    resolver
  },
  {
    boton: "Hexload",
    hosts: ["hexload"],
    botones: 117,
    nativo: true,
    resolver: resolver3
  },
  {
    boton: "Mega",
    hosts: ["mega.nz", "mega.co.nz"],
    botones: 115,
    nativo: false,
    resolver: resolver4
  },
  {
    boton: "Dsvplay",
    hosts: ["dsvplay", "playmogo", "dooodster", "dood"],
    botones: 115,
    nativo: false,
    resolver: resolver2
  },
  {
    boton: "Mp4upload",
    hosts: ["mp4upload"],
    botones: 101,
    nativo: true,
    resolver: resolver7
  },
  {
    boton: "Uqload",
    hosts: ["uqload"],
    botones: 2,
    nativo: true,
    resolver: resolver9
  },
  {
    // El mismo motor que savefiles, pero acá el POST vuelve sin fuentes.
    boton: "Savefiles",
    hosts: ["streamhls"],
    botones: 2,
    nativo: false,
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
  console.log(`[la] servidor sin ficha, se prueba a mano: ${url.slice(0, 60)}`);
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : void 0);
}

// extensions/latanime/index.ts
var BASE = "https://latanime.org";
async function _get(url) {
  const raw = await sendMessage(
    "request",
    JSON.stringify([
      url,
      { method: "get", headers: { Referer: `${BASE}/`, "User-Agent": DESKTOP_UA } }
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
function _parseCatalog(html) {
  var _a, _b, _c;
  const items = [];
  const re = /<a href="(https:\/\/latanime\.org\/anime\/[^"]+)">([\s\S]*?)<h3[^>]*>([^<]+)<\/h3>/g;
  for (const m of html.matchAll(re)) {
    const bloque = m[2];
    const portada = (_c = (_a = /data-src="([^"]+)"/.exec(bloque)) == null ? void 0 : _a[1]) != null ? _c : (_b = /<img[^>]*\ssrc="([^"]+)"/.exec(bloque)) == null ? void 0 : _b[1];
    items.push({
      title: decodeEntities(m[3].trim()),
      url: m[1],
      cover: portada ? _fullUrl(portada) : void 0
    });
  }
  return items;
}
function _parseRecientes(html) {
  const i = html.search(/A.adidos recientemente/);
  if (i < 0) return [];
  const items = [];
  const re = /<a href="([^"]*\/ver\/[^"]+)">[\s\S]{0,600}?data-src="([^"]+)"[\s\S]{0,800}?<h2[^>]*>([^<]+)<\/h2>/g;
  for (const m of html.slice(i).matchAll(re)) {
    const crudo = decodeEntities(m[3].trim());
    const partes = /^Episodio\s+(\d+)\s*-\s*(.+)$/i.exec(crudo);
    items.push({
      title: partes ? partes[2] : crudo,
      url: m[1],
      cover: m[2],
      update: partes ? `Ep. ${partes[1]}` : void 0
    });
  }
  return items;
}
async function _conPortadaVertical(items) {
  const slugDe = (url) => {
    var _a, _b;
    return (_b = (_a = /\/ver\/([a-z0-9-]+)-episodio-\d+/i.exec(url)) == null ? void 0 : _a[1]) != null ? _b : null;
  };
  const pendientes = [
    ...new Set(items.map((x) => slugDe(x.url)).filter((x) => !!x))
  ];
  if (!pendientes.length) return items;
  const portadas = /* @__PURE__ */ new Map();
  let vencido = false;
  const plazo = new Promise(
    (r) => setTimeout(() => {
      vencido = true;
      r();
    }, 6e3)
  );
  const obrero = async () => {
    while (pendientes.length && !vencido) {
      const slug = pendientes.pop();
      if (!slug) return;
      try {
        const html = await _get(`${BASE}/anime/${slug}`);
        const m = /(?:data-)?src="([^"]*thumbs\/imagen\/[^"]+)"/.exec(html);
        if (m) portadas.set(slug, m[1]);
      } catch (e) {
      }
    }
  };
  await Promise.race([
    Promise.all([obrero(), obrero(), obrero(), obrero(), obrero(), obrero()]),
    plazo
  ]);
  return items.map((x) => {
    const slug = slugDe(x.url);
    const mejor = slug ? portadas.get(slug) : void 0;
    return mejor ? __spreadProps(__spreadValues({}, x), { cover: mejor }) : x;
  });
}
async function latest(page) {
  if (page <= 1) {
    try {
      const portada = await _get(BASE);
      const recientes = _parseRecientes(portada);
      if (recientes.length) return await _conPortadaVertical(recientes);
    } catch (e) {
    }
  }
  const html = await _get(`${BASE}/animes${page > 1 ? `?p=${page}` : ""}`);
  return _parseCatalog(html);
}
var _SIN_FILTRO = "false";
function _valorFiltro(filter, clave) {
  var _a;
  const v = (_a = filter == null ? void 0 : filter[clave]) == null ? void 0 : _a[0];
  return v && v.length > 0 ? v : _SIN_FILTRO;
}
async function search(keyword, page, filter) {
  const kw = keyword.trim();
  if (kw) {
    const html2 = await _get(
      `${BASE}/buscar?q=${encodeURIComponent(kw)}${page > 1 ? `&p=${page}` : ""}`
    );
    return _parseCatalog(html2);
  }
  const partes = [
    `fecha=${encodeURIComponent(_valorFiltro(filter, "fecha"))}`,
    `genero=${encodeURIComponent(_valorFiltro(filter, "genero"))}`,
    `letra=${encodeURIComponent(_valorFiltro(filter, "letra"))}`,
    `categoria=${encodeURIComponent(_valorFiltro(filter, "categoria"))}`
  ];
  if (page > 1) partes.push(`p=${page}`);
  const html = await _get(`${BASE}/animes?${partes.join("&")}`);
  return _parseCatalog(html);
}
var _ANIO_OPTIONS = { [_SIN_FILTRO]: "Todos" };
for (let a = 2026; a >= 1982; a--) _ANIO_OPTIONS[String(a)] = String(a);
var _GENERO_OPTIONS = {
  [_SIN_FILTRO]: "Todos",
  "accion": "Acci\xF3n",
  "artes-marciales": "Artes Marciales",
  "aventura": "Aventura",
  "aenime": "Aenime",
  "blu-ray": "Blu-ray",
  "carreras": "Carreras",
  "castellano": "Castellano",
  "ciencia-ficcion": "Ciencia Ficci\xF3n",
  "comedia": "Comedia",
  "cyberpunk": "Cyberpunk",
  "dementia": "Dementia",
  "demonios": "Demonios",
  "deportes": "Deportes",
  "donghua": "Donghua",
  "drama": "Drama",
  "ecchi": "Ecchi",
  "escolares": "Escolares",
  "espacial": "Espacial",
  "fantasia": "Fantas\xEDa",
  "gore": "Gore",
  "harem": "Harem",
  "historico": "Hist\xF3rico",
  "historia-paralela": "Historia paralela",
  "horror": "Horror",
  "isekai": "Isekai",
  "josei": "Josei",
  "latino": "Latino",
  "lucha": "Lucha",
  "magia": "Magia",
  "mecha": "Mecha",
  "militar": "Militar",
  "misterio": "Misterio",
  "monogatari": "Monogatari",
  "musica": "M\xFAsica",
  "parodias": "Parodias",
  "policia": "Polic\xEDa",
  "psicologico": "Psicol\xF3gico",
  "recuerdos-de-la-vida": "Recuerdos de la vida",
  "romance": "Romance",
  "samurai": "Samurai",
  "seinen": "Seinen",
  "shojo": "Shojo",
  "shonen": "Shonen",
  "sobrenatural": "Sobrenatural",
  "suspenso": "Suspenso",
  "vampiros": "Vampiros",
  "yaoi": "Yaoi",
  "yuri": "Yuri"
};
var _LETRA_OPTIONS = { [_SIN_FILTRO]: "Todas", "09": "0-9" };
for (let i = 0; i < 26; i++) {
  const l = String.fromCharCode(65 + i);
  _LETRA_OPTIONS[l] = l;
}
var _CATEGORIA_OPTIONS = {
  [_SIN_FILTRO]: "Todas",
  "anime": "Anime",
  "ova": "Ova",
  "Pel\xEDcula": "Pel\xEDcula",
  "especial": "Especial",
  "corto": "Corto",
  "ona": "Ona",
  "donghua": "Donghua",
  "sin-censura": "Sin Censura",
  "preestreno": "Preestreno",
  "pelicula-1080p": "Pel\xEDcula 1080p",
  "latino": "Latino",
  "Pel\xEDcula Latino": "Pel\xEDcula Latino",
  "castellano": "Castellano",
  "Pel\xEDcula Castellano": "Pel\xEDcula Castellano",
  "ova-latino": "Ova Latino",
  "ova-castellano": "Ova Castellano",
  "latino-sin-censura": "Latino Sin Censura",
  "live-action": "Live Action",
  "Cartoon": "Cartoon",
  "catalan": "Catal\xE1n"
};
async function createFilter() {
  return {
    genero: { title: "G\xE9nero", options: _GENERO_OPTIONS, default: _SIN_FILTRO, min: 1, max: 1 },
    categoria: {
      title: "Categor\xEDa",
      options: _CATEGORIA_OPTIONS,
      default: _SIN_FILTRO,
      min: 1,
      max: 1
    },
    fecha: { title: "A\xF1o", options: _ANIO_OPTIONS, default: _SIN_FILTRO, min: 1, max: 1 },
    letra: { title: "Letra", options: _LETRA_OPTIONS, default: _SIN_FILTRO, min: 1, max: 1 }
  };
}
async function _serieDelEpisodio(url) {
  try {
    const html = await _get(url);
    const m = /href="([^"]*\/anime\/[^"]+)"/.exec(html);
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
  const html = await _get(_fullUrl(url));
  const title = decodeEntities(
    (_c = (_b = (_a = /<h2[^>]*>([^<]+)<\/h2>/i.exec(html)) == null ? void 0 : _a[1]) == null ? void 0 : _b.trim()) != null ? _c : ""
  );
  const coverM = (_d = /class="serieimgficha"[\s\S]{0,200}?<img[^>]*src="([^"]+)"/i.exec(html)) == null ? void 0 : _d[1];
  const description = decodeEntities(
    stripTags((_f = (_e = /<p class="my-2 opacity-75">([\s\S]*?)<\/p>/i.exec(html)) == null ? void 0 : _e[1]) != null ? _f : "").trim()
  );
  const genres = [];
  for (const m of html.matchAll(
    /href="https:\/\/latanime\.org\/genero\/[^"]*"[^>]*>\s*(?:<div[^>]*>\s*)?([^<]{2,30})</g
  )) {
    const g = decodeEntities(m[1].trim());
    if (g && genres.indexOf(g) === -1) genres.push(g);
  }
  const vistos = {};
  const sueltos = [];
  for (const m of html.matchAll(/href="(https:\/\/latanime\.org\/ver\/[^"]+)"/g)) {
    const u = m[1];
    if (vistos[u]) continue;
    vistos[u] = true;
    const nM = /-episodio-(\d+(?:\.\d+)?)/.exec(u);
    sueltos.push({ n: nM ? parseFloat(nM[1]) : sueltos.length + 1, url: u });
  }
  sueltos.sort((a, b) => a.n - b.n);
  const episodes = sueltos.map((e) => ({
    title: `Episodio ${e.n}`,
    url: e.url
  }));
  const estado = (_h = (_g = /class="btn-estado[^"]*"[\s\S]{0,320}?<\/svg>\s*([A-Za-zÁÉÍÓÚáéíóúñÑ]+)/i.exec(html)) == null ? void 0 : _g[1]) == null ? void 0 : _h.toLowerCase();
  const status = estado === "emision" || estado === "emisi\xF3n" ? "ongoing" : estado === "finalizado" ? "completed" : estado === "estreno" || estado === "proximamente" || estado === "pr\xF3ximamente" ? "upcoming" : void 0;
  return {
    title,
    cover: coverM ? _fullUrl(coverM) : void 0,
    description,
    genres,
    episodes,
    status
  };
}
function _esMega(u) {
  return u.indexOf("mega.nz") !== -1 || u.indexOf("mega.co.nz") !== -1;
}
async function watch(url) {
  var _a;
  if (url.indexOf("http") === 0 && url.indexOf("latanime.org") === -1) {
    if (!_esMega(url)) {
      try {
        const res = await resolverServidor(url, `${BASE}/`);
        if (res && res.url) {
          return {
            streams: [{ url: res.url, quality: _nombreDe(url), headers: res.headers }],
            pageUrl: ""
          };
        }
      } catch (e) {
      }
    }
    return { streams: [], pageUrl: url };
  }
  const episodeUrl = _fullUrl(url);
  const html = await _get(episodeUrl);
  const streams = [];
  for (const m of html.matchAll(/data-player="([^"]+)"[^>]*>\s*([^<]*)</g)) {
    let embed = "";
    try {
      embed = b64decode(m[1]).trim();
    } catch (e) {
      continue;
    }
    if (embed.indexOf("http") !== 0) continue;
    const etiqueta = decodeEntities(m[2].trim()) || _nombreDe(embed);
    streams.push({
      url: embed,
      quality: _nombreBonito(etiqueta),
      nativo: (_a = fichaDe(embed)) == null ? void 0 : _a.nativo
    });
  }
  return { streams, pageUrl: episodeUrl };
}
function _nombreDe(u) {
  const l = u.toLowerCase();
  if (l.indexOf("dsvplay") !== -1 || l.indexOf("playmogo") !== -1 || l.indexOf("dood") !== -1)
    return "Doodstream";
  if (l.indexOf("bysekoze") !== -1) return "Byse";
  if (l.indexOf("hexload") !== -1) return "Hexload";
  if (l.indexOf("savefiles") !== -1) return "Savefiles";
  if (l.indexOf("mixdrop") !== -1) return "Mixdrop";
  if (l.indexOf("voe") !== -1) return "Voe";
  if (l.indexOf("mp4upload") !== -1) return "Mp4upload";
  if (l.indexOf("mega") !== -1) return "Mega";
  return "Servidor";
}
function _nombreBonito(s) {
  if (!s) return "Servidor";
  return s.charAt(0).toUpperCase() + s.slice(1);
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

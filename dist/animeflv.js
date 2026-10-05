// ==PrismHubExtension==
// @name         AnimeFLV
// @version      1.0.1
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.animeflv
// @type         bangumi
// @nsfw         false
// @contentKind  anime
// @latestLabel  ultimos-episodios
// @webSite      https://animeflv.or.at
// @description  Anime sub español y latino con los últimos episodios del día, directorio completo por género y servidores que reproducen directo en la app.
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

// extensions/animeflv/servidores/comun.ts
var UA_ESCRITORIO = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
async function pedir(url, referer, headers) {
  var _a;
  try {
    return await sendMessage(
      "request",
      JSON.stringify([
        url,
        { method: "get", headers: __spreadValues({ Referer: referer, "User-Agent": UA_ESCRITORIO }, headers) }
      ])
    );
  } catch (e) {
    console.log(`[flv] no se pudo pedir ${url.slice(0, 45)} :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
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

// extensions/animeflv/servidores/byse/index.ts
function b64urlAWord(s) {
  const normal = s.replace(/-/g, "+").replace(/_/g, "/");
  const relleno = normal.length % 4 === 0 ? "" : "=".repeat(4 - normal.length % 4);
  return CryptoJS.enc.Base64.parse(normal + relleno);
}
async function estaListo(url, referer) {
  var _a, _b;
  const host = hostDe(url);
  const codigo = codigoDe(url);
  if (!host || !codigo) return true;
  try {
    const crudo = await pedir(`https://${host}/api/videos/${codigo}`, referer || `https://${host}/`);
    if (!crudo) return true;
    const meta = JSON.parse(crudo);
    if (meta.playback) return true;
    const estado = (_b = (_a = meta.processing) == null ? void 0 : _a.encoding) == null ? void 0 : _b.state;
    return !(estado && estado !== "done" && estado !== "ready");
  } catch (e) {
    return true;
  }
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
    console.log("[flv] byse: la API no devolvi\xF3 JSON");
    return null;
  }
  const pb = meta.playback;
  if (!pb || !pb.iv || !pb.payload || !Array.isArray(pb.key_parts)) {
    console.log("[flv] byse: la API no trajo datos de reproducci\xF3n");
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
      console.log("[flv] byse: se descifr\xF3 pero no hab\xEDa ninguna url adentro");
      return null;
    }
    return {
      url: m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/"),
      headers: { Referer: `https://${host}/` }
    };
  } catch (e) {
    console.log(`[flv] byse: no se pudo descifrar: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return null;
  }
}

// extensions/animeflv/servidores/mp4upload/index.ts
async function resolver2(url, referer) {
  var _a;
  const html = await pedir(url, referer);
  if (!html) return null;
  const candidatos = (_a = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g)) != null ? _a : [];
  const real = candidatos.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) {
    console.log("[flv] mp4upload: la p\xE1gina del embed no tra\xEDa ning\xFAn mp4");
    return null;
  }
  return { url: real, headers: { Referer: "https://www.mp4upload.com/" } };
}

// extensions/animeflv/servidores/upnshare/index.ts
var BASE = "https://animeav1.uns.bio";
var CLAVE = "kiemtienmua911ca";
var IV = "1234567890oiuytr";
function descifrar(hex) {
  var _a;
  const limpio = hex.trim();
  if (!/^[0-9a-f]+$/i.test(limpio) || limpio.length % 32 !== 0) return "";
  try {
    return CryptoJS.AES.decrypt(
      { ciphertext: CryptoJS.enc.Hex.parse(limpio) },
      CryptoJS.enc.Utf8.parse(CLAVE),
      { iv: CryptoJS.enc.Utf8.parse(IV), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    ).toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.log(`[flv] upnshare: no se pudo descifrar :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return "";
  }
}
var CABECERAS = {
  Referer: `${BASE}/`,
  "User-Agent": UA_ESCRITORIO
  // Que los pedacitos los baje la app y no mpv.
  //
  // ── Las cuatro combinaciones que se probaron EN VIVO ─────────────────────
  //
  //   1. sin declarar nada .......................... se cuelga al saltar
  //   2. declarada lista ............................ se cuelga al saltar
  //   3. declarada lista + relay .................... se cuelga al saltar
  //   4. declarada lista + se puede recorrer ........ SALTA AL FINAL y termina
  //
  // La 4 es la que dio el dato bueno: al dejar de reconectar, en vez de
  // colgarse llega a fin de archivo. O sea que **el pedido que sigue al salto
  // falla** — antes reconectaba en bucle (colgado) y ahora se rinde. Las dos
  // caras del mismo problema.
  //
  // Y falla solo cuando lo pide mpv: el mismo origen, pedido desde afuera,
  // entrega el ÚLTIMO pedacito sin haber pedido los anteriores en **32 de 32**
  // sobre 25 títulos. Por eso ahora los pide la app, y encima con el recorrido
  // ya habilitado — que es la combinación que faltaba.
  // No es una cabecera: es la declaración de que esto es una lista de
  // pedacitos, y con ella la app deja que la lista se pueda RECORRER.
  //
  // Su dirección ya termina en `.m3u8`, así que para reconocerla como lista no
  // hacía falta; se declara por lo otro. Le pasaba lo mismo que al HLS —«el
  // cuadro apareció y el vídeo no avanzó en 6 s», medido en vivo el
  // 2026-08-10—, y este **ni siquiera manda una cabecera rara**, que fue lo
  // que descartó que el problema fueran las cabeceras. El mp4 directo del
  // mismo episodio anda perfecto: lo que rompía era `reconnect_streamed`,
  // que le dice a ffmpeg que la fuente no se puede recorrer.
};
function esReal(nombre, lista) {
  var _a, _b, _c, _d;
  const propia = (_a = /-(f\d+)-/.exec(nombre)) == null ? void 0 : _a[1];
  const usa = (_d = (_b = /init-(f\d+)-/.exec(lista)) == null ? void 0 : _b[1]) != null ? _d : (_c = /seg-\d+-(f\d+)-/.exec(lista)) == null ? void 0 : _c[1];
  return !propia || !usa || propia === usa;
}
async function sinCalidadesFalsas(master) {
  var _a, _b;
  const texto = await pedir(master, `${BASE}/`);
  if (!texto || texto.indexOf("#EXT-X-STREAM-INF") === -1) return master;
  const sinQuery = master.split("?")[0];
  const base = sinQuery.slice(0, sinQuery.lastIndexOf("/") + 1);
  const lineas = texto.split("\n").map((l) => l.trim());
  const variantes = [];
  for (let i = 0; i < lineas.length; i++) {
    if (lineas[i].indexOf("#EXT-X-STREAM-INF") !== 0) continue;
    const alto = parseInt((_b = (_a = /RESOLUTION=\d+x(\d+)/.exec(lineas[i])) == null ? void 0 : _a[1]) != null ? _b : "0", 10);
    const ref = lineas.slice(i + 1).find((l) => l && l[0] !== "#");
    if (ref) variantes.push({ url: /^https?:/.test(ref) ? ref : base + ref, alto });
  }
  if (variantes.length < 2) return master;
  const plazo = new Promise((ok) => setTimeout(() => ok(null), 4e3));
  const revisadas = await Promise.race([
    Promise.all(variantes.map(async (v) => {
      const lista = await pedir(v.url, `${BASE}/`);
      return __spreadProps(__spreadValues({}, v), { real: lista ? esReal(v.url, lista) : true });
    })),
    plazo
  ]);
  if (!revisadas || revisadas.every((v) => v.real)) return master;
  const mejor = revisadas.filter((v) => v.real).sort((a, b) => b.alto - a.alto)[0];
  if (!mejor) return master;
  console.log(`[flv] upnshare: el maestro anuncia ${revisadas.filter((v) => !v.real).map((v) => `${v.alto}p`).join("/")} sin tenerlo, se abre directo en ${mejor.alto}p`);
  return mejor.url;
}
async function resolver3(url, _referer) {
  var _a, _b, _c, _d, _e;
  const id = (_a = /#([A-Za-z0-9_-]{3,20})/.exec(url)) == null ? void 0 : _a[1];
  if (!id) {
    console.log(`[flv] upnshare: la direcci\xF3n no trae id en el # :: ${url.slice(0, 60)}`);
    return null;
  }
  const hexVideo = await pedir(`${BASE}/api/v1/video?id=${id}`, `${BASE}/`);
  const claroVideo = hexVideo ? descifrar(hexVideo) : "";
  const master = (_c = (_b = /"source"\s*:\s*"([^"]+)"/.exec(claroVideo)) == null ? void 0 : _b[1]) == null ? void 0 : _c.replace(/\\\//g, "/");
  if (master && master.indexOf(".m3u8") !== -1) {
    return { url: await sinCalidadesFalsas(master), headers: CABECERAS };
  }
  console.log("[flv] upnshare: sin lista maestra, se cae al mp4 de una calidad");
  const hex = await pedir(`${BASE}/api/v1/download?id=${id}`, `${BASE}/`);
  if (!hex) return null;
  const claro = descifrar(hex);
  if (!claro) return null;
  const mp4 = (_e = (_d = /"mp4"\s*:\s*"([^"]+)"/.exec(claro)) == null ? void 0 : _d[1]) == null ? void 0 : _e.replace(/\\\//g, "/");
  if (!mp4) {
    console.log("[flv] upnshare: se descifr\xF3 pero no hab\xEDa mp4 adentro");
    return null;
  }
  return { url: mp4, headers: CABECERAS };
}

// extensions/animeflv/servidores/voe/index.ts
function rot13(s) {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
  });
}
function desescapar(s) {
  return s.replace(/\\\//g, "/");
}
function descifrar2(crudo) {
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
async function resolver4(url, referer) {
  let html = await pedir(url, referer);
  if (!html) return null;
  const redir = /window\.location(?:\.href)?\s*=\s*['"](https?:\/\/[^'"]+)['"]/.exec(html);
  if (redir) {
    const espejo = await pedir(redir[1], "https://voe.sx/");
    if (espejo) html = espejo;
  }
  const bloque = /<script[^>]*type=["']application\/json["'][^>]*>\s*\[\s*"([^"]+)"\s*\]\s*<\/script>/.exec(html);
  if (bloque) {
    const claro = descifrar2(bloque[1]);
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

// extensions/animeflv/servidores/index.ts
var SERVIDORES = [
  {
    boton: "Voe",
    hosts: ["voe.sx", "voe."],
    botones: 0,
    nativo: true,
    resolver: resolver4,
    orden: 0
  },
  {
    boton: "Byse",
    hosts: ["//byse"],
    botones: 0,
    nativo: true,
    resolver,
    orden: 1
  },
  {
    boton: "UPNShare",
    hosts: ["uns.bio", "upns."],
    botones: 0,
    nativo: true,
    resolver: resolver3,
    orden: 2
  },
  {
    boton: "MP4Upload",
    hosts: ["mp4upload"],
    botones: 0,
    nativo: true,
    resolver: resolver2,
    orden: 3
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
  console.log(`[flv] servidor desconocido, sin resolver: ${url.slice(0, 60)}`);
  return null;
}

// extensions/animeflv/index.ts
var BASE2 = "https://animeflv.or.at";
async function _get(url) {
  const raw = await sendMessage(
    "request",
    JSON.stringify([
      url,
      {
        method: "get",
        headers: { Referer: `${BASE2}/`, "User-Agent": DESKTOP_UA }
      }
    ])
  );
  if (typeof raw !== "string") return raw;
  return raw;
}
async function _getJson(url) {
  try {
    const crudo = await _get(url);
    if (typeof crudo !== "string") return crudo;
    return JSON.parse(crudo);
  } catch (e) {
    console.log(`[flv] la API no contest\xF3 JSON en ${url.slice(0, 80)}: ${e}`);
    return null;
  }
}
function _abs(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return BASE2 + (url.startsWith("/") ? url : `/${url}`);
}
function _portadaGrande(url) {
  return url.replace(/-\d{2,4}x\d{2,4}(\.[a-z]{3,4})$/i, "$1");
}
function _desdeBase64(b64) {
  const tabla = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let bits = 0;
  let acum = 0;
  let salida = "";
  for (const c of b64.replace(/[^A-Za-z0-9+/]/g, "")) {
    acum = acum << 6 | tabla.indexOf(c);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      salida += String.fromCharCode(acum >> bits & 255);
    }
  }
  return salida;
}
function _parseTarjetasDeAnime(html) {
  const items = [];
  const vistos = {};
  const re = /<a class="thumbnail-link" href="(https:\/\/animeflv\.or\.at\/anime\/[^"]+\/)"[\s\S]*?<img class="anime-image" src="([^"]+)" alt="([^"]*)"/g;
  for (const m of html.matchAll(re)) {
    if (vistos[m[1]]) continue;
    vistos[m[1]] = true;
    items.push({
      title: decodeEntities(m[3].trim()),
      url: m[1],
      cover: _portadaGrande(m[2])
    });
  }
  return items;
}
function _parseUltimosEpisodios(html) {
  const items = [];
  const re = /<div class="Episode">\s*<a href="([^"]+)">[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<h2 class="Title">([^<]+)<\/h2>/g;
  for (const m of html.matchAll(re)) {
    const crudo = decodeEntities(m[3].trim());
    const conNumero = /^(.*?)\s+Episodio\s+([\d.]+)\s*$/i.exec(crudo);
    items.push({
      title: conNumero ? conNumero[1] : crudo,
      url: m[1],
      cover: _portadaGrande(m[2]),
      update: conNumero ? `Ep. ${conNumero[2]}` : void 0
    });
  }
  return items;
}
async function latest(page) {
  if (page <= 6) {
    const html2 = await _get(`${BASE2}/?episodes_page=${page}`);
    const items = _parseUltimosEpisodios(html2);
    if (items.length) return items;
  }
  const n = page <= 6 ? 1 : page - 6;
  const html = await _get(n <= 1 ? `${BASE2}/anime/` : `${BASE2}/anime/page/${n}/`);
  return _parseTarjetasDeAnime(html);
}
async function search(keyword, page, filter) {
  var _a;
  const q = keyword.trim();
  const genero = (_a = filter == null ? void 0 : filter["genero"]) == null ? void 0 : _a[0];
  if (q) {
    if (page > 1) return [];
    const html2 = await _get(`${BASE2}/?s=${encodeURIComponent(q)}`);
    return _parseTarjetasDeAnime(html2);
  }
  if (genero) return _porGenero(genero, page);
  const html = await _get(page <= 1 ? `${BASE2}/anime/` : `${BASE2}/anime/page/${page}/`);
  return _parseTarjetasDeAnime(html);
}
var _POR_PAGINA = 24;
var _seriesDeGenero = {};
async function _seriesDelGenero(generoId) {
  const guardado = _seriesDeGenero[generoId];
  if (guardado && guardado.hasta > Date.now()) return guardado.series;
  const series = [];
  const vistas = {};
  for (let pag = 1; pag <= 10; pag++) {
    const posts = await _getJson(
      `${BASE2}/wp-json/wp/v2/posts?genre=${encodeURIComponent(generoId)}&per_page=100&page=${pag}&_fields=categories,featured_media`
    );
    if (!Array.isArray(posts) || !posts.length) break;
    for (const p of posts) {
      const cat = (p.categories || []).find((c) => c !== 1);
      if (cat == null || vistas[cat]) continue;
      vistas[cat] = true;
      series.push({ cat, media: p.featured_media || 0 });
    }
    if (posts.length < 100) break;
  }
  _seriesDeGenero[generoId] = { hasta: Date.now() + 10 * 60 * 1e3, series };
  return series;
}
async function _porGenero(generoId, page) {
  var _a, _b;
  const todas = await _seriesDelGenero(generoId);
  const tanda = todas.slice((page - 1) * _POR_PAGINA, page * _POR_PAGINA);
  if (!tanda.length) return [];
  const cats = (_a = await _getJson(
    `${BASE2}/wp-json/wp/v2/categories?include=${tanda.map((s) => s.cat).join(",")}&per_page=100&_fields=id,name,link`
  )) != null ? _a : [];
  const medios = tanda.map((s) => s.media).filter((m) => m > 0);
  const imgs = medios.length ? (_b = await _getJson(
    `${BASE2}/wp-json/wp/v2/media?include=${medios.join(",")}&per_page=100&_fields=id,source_url`
  )) != null ? _b : [] : [];
  const catPorId = {};
  for (const c of Array.isArray(cats) ? cats : []) catPorId[c.id] = c;
  const imgPorId = {};
  for (const i of Array.isArray(imgs) ? imgs : []) imgPorId[i.id] = i.source_url;
  const items = [];
  for (const s of tanda) {
    const c = catPorId[s.cat];
    if (!c || !/\/anime\//.test(c.link)) continue;
    items.push({
      title: decodeEntities(c.name),
      url: c.link,
      cover: imgPorId[s.media] ? _portadaGrande(imgPorId[s.media]) : ""
    });
  }
  return items;
}
async function createFilter() {
  var _a;
  const lista = (_a = await _getJson(
    `${BASE2}/wp-json/wp/v2/genre?per_page=100&_fields=id,name,count`
  )) != null ? _a : [];
  const opciones = { "": "Todos" };
  for (const g of lista.filter((g2) => g2.count > 0).sort((a, b) => a.name.localeCompare(b.name))) {
    opciones[String(g.id)] = decodeEntities(g.name);
  }
  return {
    genero: { title: "G\xE9nero", options: opciones, default: "", min: 1, max: 1 }
  };
}
async function _serieDelEpisodio(url) {
  try {
    const html = await _get(url);
    const m = /class="breadcrumb-item breadcrumb-current" href="([^"]+)"/.exec(html) || /href="(https:\/\/animeflv\.or\.at\/anime\/[^"]+\/)"[^>]*title=/.exec(html);
    return m ? m[1] : null;
  } catch (e) {
    return null;
  }
}
function _slugDeSerie(url) {
  var _a, _b;
  return (_b = (_a = /\/anime\/([^/]+)\/?$/.exec(url)) == null ? void 0 : _a[1]) != null ? _b : null;
}
async function detail(url) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
  let serie = _abs(url);
  if (!/\/anime\/[^/]+\/?$/.test(serie)) {
    serie = (_a = await _serieDelEpisodio(serie)) != null ? _a : serie;
  }
  const html = await _get(serie);
  const titulo = decodeEntities(
    ((_e = (_d = (_b = /<h1 class="anime-title">([\s\S]*?)<\/h1>/.exec(html)) == null ? void 0 : _b[1]) != null ? _d : (_c = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)) == null ? void 0 : _c[1]) != null ? _e : "").trim()
  );
  const portada = /class="poster-image"[^>]*src="([^"]+)"|<img src="([^"]+)" alt="[^"]*" class="poster-image"/.exec(html);
  const sinopsisHtml = (_g = (_f = /<div class="anime-synopsis">([\s\S]*?)<\/div>/.exec(html)) == null ? void 0 : _f[1]) != null ? _g : "";
  const sinopsis = decodeEntities(stripTags(sinopsisHtml.replace(/<h3>[\s\S]*?<\/h3>/, ""))).trim();
  const generos = [...html.matchAll(/<span class="genre-tag">([^<]+)<\/span>/g)].map(
    (m) => decodeEntities(m[1].trim())
  );
  const puntaje = parseFloat((_i = (_h = /<div class="rating-score">([\d.]+)<\/div>/.exec(html)) == null ? void 0 : _h[1]) != null ? _i : "");
  const episodios = [];
  const slug = _slugDeSerie(serie);
  if (slug) {
    const cat = await _getJson(
      `${BASE2}/wp-json/wp/v2/categories?slug=${encodeURIComponent(slug)}&_fields=id`
    );
    const id = (_j = cat == null ? void 0 : cat[0]) == null ? void 0 : _j.id;
    if (id) {
      for (let pagina = 1; pagina <= 20; pagina++) {
        const posts = await _getJson(
          `${BASE2}/wp-json/wp/v2/posts?categories=${id}&per_page=100&page=${pagina}&orderby=date&order=asc&_fields=link,title,date`
        );
        if (!Array.isArray(posts) || posts.length === 0) break;
        for (const p of posts) {
          const nombre = decodeEntities((_l = (_k = p.title) == null ? void 0 : _k.rendered) != null ? _l : "").trim();
          const numero = parseFloat((_n = (_m = /Episodio\s+([\d.]+)/i.exec(nombre)) == null ? void 0 : _m[1]) != null ? _n : "");
          episodios.push({
            title: Number.isFinite(numero) ? `Episodio ${numero}` : nombre,
            url: p.link,
            number: Number.isFinite(numero) ? numero : void 0,
            airDate: p.date ? p.date.slice(0, 10) : void 0
          });
        }
        if (posts.length < 100) break;
      }
      episodios.sort((a, b) => {
        var _a2, _b2;
        return ((_a2 = a.number) != null ? _a2 : 0) - ((_b2 = b.number) != null ? _b2 : 0);
      });
    }
  }
  return {
    title: titulo || slug || "AnimeFLV",
    cover: portada ? portada[1] || portada[2] : void 0,
    description: sinopsis || void 0,
    genres: generos.length ? generos : void 0,
    rating: Number.isFinite(puntaje) ? puntaje : void 0,
    episodes: episodios
  };
}
var _IDIOMAS = {
  sub: "SUB",
  subtitulado: "SUB",
  latino: "LAT",
  lat: "LAT",
  castellano: "CAST",
  dub: "LAT"
};
async function watch(url) {
  var _a, _b;
  if (url.indexOf("http") === 0 && url.indexOf("animeflv.or.at") === -1) {
    try {
      const res = await resolverServidor(url, `${BASE2}/`);
      if (res && res.url) {
        return {
          streams: [{ url: res.url, quality: "Servidor", headers: res.headers, nativo: true }]
        };
      }
    } catch (e) {
      console.log(`[flv] no se pudo resolver ${url.slice(0, 50)}: ${e}`);
    }
    return { streams: [], reason: "resolve_failed" };
  }
  const html = await _get(_abs(url));
  if (typeof html !== "string" || !html) {
    throw new Error("AnimeFLV no respondi\xF3: el sitio puede estar ca\xEDdo o muy lento");
  }
  const botones = [];
  const re = /<span class="tooltip-text">([^<]+)<\/span>\s*<button[^>]*data-src="([^"]+)"[^>]*?(?:app_type="([^"]*)")?[^>]*>/g;
  for (const m of html.matchAll(re)) {
    const direccion = _desdeBase64(m[2]).trim();
    if (!/^https?:\/\//.test(direccion)) continue;
    const idioma = (_a = _IDIOMAS[(m[3] || "sub").toLowerCase()]) != null ? _a : (m[3] || "SUB").toUpperCase();
    botones.push({ nombre: decodeEntities(m[1].trim()), url: direccion, idioma });
  }
  if (botones.length === 0) {
    const def = (_b = /data-default-src="([^"]+)"/.exec(html)) == null ? void 0 : _b[1];
    if (def) botones.push({ nombre: "Servidor", url: _desdeBase64(def).trim(), idioma: "SUB" });
  }
  const byseSinTerminar = {};
  await Promise.all(
    botones.filter((b) => {
      var _a2;
      return ((_a2 = fichaDe(b.url)) == null ? void 0 : _a2.boton) === "Byse";
    }).map(async (b) => {
      const listo = await Promise.race([
        estaListo(b.url, `${BASE2}/`),
        new Promise((ok) => setTimeout(() => ok(true), 3e3))
      ]);
      if (!listo) {
        byseSinTerminar[b.url] = true;
        console.log(`[flv] byse todav\xEDa codifica este v\xEDdeo, no se ofrece: ${b.url.slice(0, 50)}`);
      }
    })
  );
  const idiomas = [...new Set(botones.map((b) => b.idioma))];
  const variosIdiomas = idiomas.length > 1;
  idiomas.sort((a, b) => a === "SUB" ? -1 : b === "SUB" ? 1 : 0);
  const streams = [];
  const vistos = {};
  for (const idioma of idiomas) {
    const orden = (u) => {
      const f = fichaDe(u);
      return f ? f.orden : 99;
    };
    const delIdioma = botones.filter((b) => b.idioma === idioma && !byseSinTerminar[b.url]).sort((a, b) => orden(a.url) - orden(b.url));
    for (const b of delIdioma) {
      if (vistos[b.url]) continue;
      const ficha = fichaDe(b.url);
      if (!ficha || !ficha.nativo) {
        console.log(`[flv] servidor sin reproducci\xF3n en la app, no se ofrece: ${b.nombre} ${b.url.slice(0, 50)}`);
        continue;
      }
      vistos[b.url] = true;
      streams.push({
        url: b.url,
        quality: variosIdiomas ? `${ficha.boton} \xB7 ${idioma}` : ficha.boton,
        nativo: true
      });
    }
  }
  return { streams };
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

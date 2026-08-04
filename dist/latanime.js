// ==PrismHubExtension==
// @name         LatAnime
// @version      1.0.0
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.latanime
// @type         bangumi
// @nsfw         false
// @webSite      https://latanime.org
// @description  Anime doblado al latino y castellano, con filtros por año, género, letra y categoría, y varios servidores por episodio.
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

// sdk/embeds.ts
async function resolveEmbed(server, embedUrl, referer) {
  var _a;
  const s = `${server} ${embedUrl}`.toLowerCase();
  if (s.includes("mega.nz") || s.includes("mega.co.nz") || s.includes("abyssplayer.com") || s.includes("abyss.to") || s.includes("short.icu")) {
    console.log(`[resolveEmbed] ${server} -> NULL (host conocido irresoluble, sin fetch)`);
    return null;
  }
  let result;
  try {
    if (s.includes("voe")) result = await resolveVoe(embedUrl, referer);
    else if (s.includes("streamtape") || s.includes("stape") || s.includes("strtape"))
      result = await resolveStreamtape(embedUrl, referer);
    else if (s.includes("mixdrop") || s.includes("mxdrop") || s.includes("mdrop") || s.includes("xdrop"))
      result = await resolveMixdrop(embedUrl, referer);
    else if (s.includes("mp4upload")) result = await resolveMp4upload(embedUrl, referer);
    else if (s.includes("mediafire")) result = await resolveMediafire(embedUrl, referer);
    else if (s.includes("hexload")) result = await resolveHexload(embedUrl, referer);
    else if (s.includes("firestream")) result = await resolveFirestream(embedUrl, referer);
    else if (s.includes("savefiles") || s.includes("streamhls"))
      result = await resolveSavefiles(embedUrl, referer);
    else if (s.includes("bysekoze") || s.includes("byse."))
      result = await resolveByse(embedUrl, referer);
    else if (s.includes("yourupload") || s.includes("yupload"))
      result = await resolveYourupload(embedUrl, referer);
    else if (s.includes("pixeldrain")) result = resolvePixeldrain(embedUrl);
    else if (s.includes("dood") || s.includes("dsvplay") || s.includes("playmogo") || s.includes("d000d") || s.includes("ds2play") || s.includes("ds2video") || s.includes("vidply") || s.includes("do0od") || s.includes("all3do"))
      result = await resolveDoodstream(embedUrl, referer);
    else if (s.includes("hqq") || s.includes("netu")) result = await resolveNetu(embedUrl, referer);
    else if (s.includes("ok.ru") || s.includes("okru") || s.includes("odnoklassniki"))
      result = await resolveOkru(embedUrl);
    else if (s.includes("streamwish") || s.includes("wishfast") || s.includes("vidhide") || s.includes("filelions") || s.includes("vhide") || s.includes("vtube") || s.includes("luluvdo") || s.includes("vidmoly") || s.includes("filemoon") || s.includes("moonplayer") || s.includes("swdyu") || s.includes("bestx") || s.includes("embedrise") || s.includes("ridoo") || s.includes("uqload") || s.includes("flaxtv"))
      result = await resolveStreamwish(embedUrl, referer);
    else if (s.includes("streamhg") || s.includes("hgcloud") || s.includes("vibuxer"))
      result = await resolveStreamHg(embedUrl, referer);
    else result = await resolveGeneric(embedUrl, referer);
  } catch (e) {
    console.log(`[resolveEmbed] ${server} THREW: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return null;
  }
  if (result && result.url.includes("premilkyway.com")) {
    console.log(`[resolveEmbed] ${server} -> NULL (premilkyway.com, bloqueo TLS conocido)`);
    return null;
  }
  console.log(
    `[resolveEmbed] ${server} -> ${result ? result.url.slice(0, 60) : "NULL"}`
  );
  return result;
}
async function resolveVoe(url, referer) {
  const voeOpts = { timeout: 5e3, retries: 0 };
  let html = await fetchEmbed(url, referer, voeOpts);
  if (!html) return null;
  const redir = /window\.location(?:\.href)?\s*=\s*['"](https?:\/\/[^'"]+)['"]/.exec(
    html
  );
  if (redir) {
    const mirror = await fetchEmbed(redir[1], "https://voe.sx/", voeOpts);
    if (mirror) html = mirror;
  }
  const jsonScript = /<script[^>]*type=["']application\/json["'][^>]*>\s*\[\s*"([^"]+)"\s*\]\s*<\/script>/.exec(
    html
  );
  if (jsonScript) {
    const decoded = _voeDecode(jsonScript[1]);
    if (decoded) {
      const src = /"source"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(decoded);
      if (src) return { url: _unescapeUrl(src[1]) };
      const anyM3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(
        decoded.replace(/\\\//g, "/")
      );
      if (anyM3u8) return { url: anyM3u8[1] };
      const mp4 = /"direct_access_url"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(decoded);
      if (mp4) return { url: _unescapeUrl(mp4[1]) };
    }
  }
  let m = /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(html);
  if (m) return { url: m[1] };
  const atobMatch = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
  if (atobMatch) {
    try {
      const decoded = b64decode(atobMatch[1]);
      const hls = /['"]hls['"]\s*:\s*['"]([^'"]+)['"]/.exec(decoded);
      if (hls) return { url: hls[1] };
      const direct = /(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/.exec(decoded);
      if (direct) return { url: direct[1] };
    } catch (e) {
    }
  }
  m = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
  if (m) return { url: m[0] };
  return null;
}
function _rot13(s) {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
  });
}
function _unescapeUrl(s) {
  return s.replace(/\\\//g, "/");
}
function _voeDecode(raw) {
  try {
    let r = _rot13(raw);
    for (const p of ["@$", "^^", "#&", "~@", "%?", "*~", "!!", "`"]) {
      r = r.split(p).join("");
    }
    const step3 = b64decode(r);
    let shifted = "";
    for (let i = 0; i < step3.length; i++) {
      shifted += String.fromCharCode(step3.charCodeAt(i) - 3);
    }
    const reversed = shifted.split("").reverse().join("");
    return b64decode(reversed);
  } catch (e) {
    return null;
  }
}
async function resolveStreamtape(url, referer) {
  const html = await fetchEmbed(url, referer);
  if (!html) return null;
  const headers = { Referer: "https://streamtape.com/" };
  const delJs = _streamtapeDesdeElJs(html, url);
  if (delJs) return { url: delJs, headers };
  const div = /id=["'](?:ideoolink|botlink|robotlink)["'][^>]*>\s*(\/\/?[^<]*get_video\?[^<]*)</.exec(
    html
  );
  if (div) {
    console.log("[streamtape] sin JS utilizable, se usa el div (puede ser se\xF1uelo)");
    return { url: _streamtapeNormalizar(div[1].trim()), headers };
  }
  let m = /(https?:\/\/streamtape\.[a-z]+\/get_video\?[^"'\s<>]+)/.exec(html);
  if (m) return { url: _streamtapeNormalizar(m[1]), headers };
  m = /(\/\/streamtape\.[a-z]+\/get_video\?[^"'\s<>]+)/.exec(html);
  if (m) return { url: _streamtapeNormalizar(m[1]), headers };
  console.log("[streamtape] no se encontr\xF3 ninguna URL get_video en el embed");
  return null;
}
function _streamtapeDesdeElJs(html, embedUrl) {
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
    if (conElId.length) return _streamtapeNormalizar(conElId[0]);
  }
  for (const c of bienFormados) {
    if (bienFormados.filter((o) => o === c).length > 1) {
      console.log("[streamtape] elegido por repetici\xF3n, sin id en el embed");
      return _streamtapeNormalizar(c);
    }
  }
  console.log(
    `[streamtape] ${candidatos.length} candidato(s) en el JS, ninguno confiable (id esperado: ${idEmbed || "desconocido"})`
  );
  return null;
}
async function resolveMediafire(url, referer) {
  const html = await fetchEmbed(url, referer);
  if (!html) return null;
  const m = /https:\/\/download[0-9]*\.mediafire\.com\/[^"'<>\s\\]+/.exec(html);
  if (m) return { url: m[0], headers: { Referer: "https://www.mediafire.com/" } };
  console.log("[mediafire] no se encontr\xF3 el enlace de descarga en la p\xE1gina");
  return null;
}
function _streamtapeNormalizar(path) {
  let out = path.trim();
  if (out.indexOf("//") === 0) out = `https:${out}`;
  else if (out.indexOf("/") === 0) out = `https:/${out}`;
  if (!/[?&]stream=/.test(out)) out += "&stream=1";
  return out;
}
async function resolveMixdrop(url, referer) {
  const html = await fetchEmbed(url, referer);
  if (!html) return null;
  const unpacked = _unpackAll(html);
  const wurl = /MDCore\.wurl\s*=\s*["']([^"']+)["']/.exec(unpacked);
  let target = wurl == null ? void 0 : wurl[1];
  if (!target) {
    const mp4 = /(\/\/[^"'\s]+\.mp4[^"'\s]*)/.exec(unpacked);
    target = mp4 == null ? void 0 : mp4[1];
  }
  if (!target) return null;
  const full = target.startsWith("http") ? target : `https:${target}`;
  return { url: full, headers: { Referer: "https://mixdrop.top/" } };
}
async function resolveMp4upload(url, referer) {
  var _a;
  const html = await fetchEmbed(url, referer);
  if (!html) return null;
  const candidates = (_a = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g)) != null ? _a : [];
  const real = candidates.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) return null;
  return { url: real, headers: { Referer: "https://www.mp4upload.com/" } };
}
async function resolveYourupload(url, referer) {
  const html = await fetchEmbed(url, referer, { timeout: 5e3, retries: 0 });
  if (!html) return null;
  const hdrs = { Referer: "https://www.yourupload.com/" };
  const norm = (u) => u.replace(/\\\//g, "/").replace(/^\/\//, "https://");
  let m = /(?:file|src|source)\s*:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i.exec(
    html
  );
  if (m) return { url: norm(m[1]), headers: hdrs };
  m = /(https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*)/.exec(html);
  if (m) return { url: m[1], headers: hdrs };
  m = /(\/\/[^"'\s<>]+\.mp4[^"'\s<>]*)/.exec(html);
  if (m) return { url: "https:" + m[1], headers: hdrs };
  return null;
}
function resolvePixeldrain(url) {
  const m = /pixeldrain\.com\/(?:u|d|api\/file)\/([A-Za-z0-9]+)/.exec(url);
  if (!m) return null;
  return {
    url: `https://pixeldrain.com/api/file/${m[1]}`,
    headers: { Referer: "https://pixeldrain.com/" }
  };
}
async function resolveDoodstream(url, referer) {
  const host = _hostOf(url);
  if (!host) return null;
  const html = await fetchEmbed(url, referer, { timeout: 5e3, retries: 0 });
  if (!html) return null;
  const md5 = /\/pass_md5\/[A-Za-z0-9\-]+\/[A-Za-z0-9]+/.exec(html);
  if (!md5) return null;
  const md5path = md5[0];
  const token = md5path.slice(md5path.lastIndexOf("/") + 1);
  const base = await fetchEmbed(
    `https://${host}${md5path}`,
    `https://${host}/`,
    { timeout: 5e3, retries: 0 }
  );
  if (!base || !/^https?:\/\//.test(base.trim())) return null;
  const rand = _randomStr(10);
  const finalUrl = `${base.trim()}${rand}?token=${token}&expiry=${Date.now()}`;
  return { url: finalUrl, headers: { Referer: `https://${host}/` } };
}
function _randomStr(len) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return s;
}
async function resolveNetu(url, referer) {
  var _a;
  const host = (_a = _hostOf(url)) != null ? _a : "hqq.tv";
  const siteHdrs = {
    Referer: `https://${host}/`,
    Origin: `https://${host}`
  };
  const html = await fetchEmbed(url, referer, {
    timeout: 5e3,
    retries: 0,
    headers: { Origin: `https://${host}` }
  });
  if (!html) return null;
  for (const m of html.matchAll(/atob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/g)) {
    try {
      const decoded = b64decode(m[1]);
      const src = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(decoded.replace(/\\\//g, "/"));
      if (src) return { url: src[1], headers: _cdnReferer(src[1], siteHdrs) };
    } catch (e) {
    }
  }
  const haystack = `${html}
${_unpackAll(html)}`;
  const direct = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(haystack.replace(/\\\//g, "/"));
  if (direct) return { url: direct[1], headers: _cdnReferer(direct[1], siteHdrs) };
  for (const m of html.matchAll(/=\s*['"]([A-Za-z0-9+/=]{80,})['"]/g)) {
    try {
      const decoded = b64decode(m[1]);
      const src = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(decoded.replace(/\\\//g, "/"));
      if (src) return { url: src[1], headers: _cdnReferer(src[1], siteHdrs) };
    } catch (e) {
    }
  }
  const fileM = /(?:file|source|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/.exec(html);
  if (fileM) return { url: fileM[1].replace(/\\\//g, "/"), headers: siteHdrs };
  return null;
}
function _cdnReferer(streamUrl, fallback) {
  const h = _hostOf(streamUrl);
  if (!h) return fallback;
  return { Referer: `https://${h}/`, Origin: `https://${h}` };
}
async function resolveOkru(url) {
  const html = await fetchEmbed(url, "https://ok.ru/");
  if (!html) return null;
  const marker = "hlsManifestUrl\\&quot;:\\&quot;";
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const from = start + marker.length;
  const end = html.indexOf("\\&quot;", from);
  if (end === -1) return null;
  const url2 = html.slice(from, end).split("\\\\u0026").join("&");
  if (!/^https?:\/\//.test(url2)) return null;
  return { url: url2 };
}
async function resolveStreamwish(url, referer) {
  const host = _hostOf(url);
  if (!host) return null;
  const hdrs = { Referer: `https://${host}/` };
  const idM = /\/(?:e|f|d)\/([A-Za-z0-9]+)/.exec(url);
  if (idM) {
    const id = idM[1];
    const apiJson = await fetchEmbed(
      `https://${host}/api/file/${id}?json=1`,
      `https://${host}/`,
      { timeout: 7e3 }
    );
    if (apiJson) {
      const fileM = /"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(apiJson);
      if (fileM) return { url: fileM[1].replace(/\\\//g, "/"), headers: hdrs };
      const mp4M = /"file"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(apiJson);
      if (mp4M) return { url: mp4M[1].replace(/\\\//g, "/"), headers: hdrs };
    }
  }
  return resolveGeneric(url, referer);
}
async function resolveStreamHg(url, referer) {
  const idM = /\/e\/([A-Za-z0-9]+)/.exec(url);
  if (!idM) return null;
  const html = await fetchEmbed(`https://vibuxer.com/e/${idM[1]}`, referer, {
    headers: { Referer: "https://hgcloud.to/" }
  });
  if (!html) return null;
  const flat = `${html}
${_unpackAll(html)}`.replace(/\\\//g, "/");
  const m3u8 = /((?:https?:)?\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(flat);
  if (!m3u8) return null;
  const streamUrl = m3u8[1].startsWith("//") ? `https:${m3u8[1]}` : m3u8[1];
  return { url: streamUrl, headers: { Referer: "https://vibuxer.com/" } };
}
async function resolveGeneric(url, referer) {
  var _a;
  const html = await fetchEmbed(url, referer);
  if (!html) return null;
  const host = _hostOf(url);
  const headers = host ? { Referer: `https://${host}/` } : void 0;
  const haystack = `${html}
${_unpackAll(html)}`;
  const flat = haystack.replace(/\\\//g, "/");
  const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(flat);
  if (m3u8) return { url: m3u8[1], headers };
  for (const m of html.matchAll(/atob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/g)) {
    try {
      const decoded = b64decode(m[1]);
      const src = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(decoded.replace(/\\\//g, "/"));
      if (src) return { url: src[1], headers };
    } catch (e) {
    }
  }
  const file = /(?:file|source|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/.exec(flat);
  if (file) return { url: file[1], headers };
  const mp4s = (_a = flat.match(/https?:[^"'\s\\]+\.mp4[^"'\s\\]*/g)) != null ? _a : [];
  const real = mp4s.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (real) return { url: real, headers };
  return null;
}
async function _postForm(url, campos, referer) {
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
    console.log(`[postForm] FAIL ${url.slice(0, 45)} :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return null;
  }
}
function _codigoDe(url) {
  const sinQuery = url.split("?")[0].split("#")[0].replace(/\/+$/, "");
  const ultimo = sinQuery.slice(sinQuery.lastIndexOf("/") + 1);
  return ultimo.replace(/^embed-/, "").replace(/\.html?$/, "");
}
async function resolveHexload(url, referer) {
  const host = _hostOf(url) || "hexload.com";
  const code = _codigoDe(url);
  if (!code) return null;
  const raw = await _postForm(
    `https://${host}/download`,
    { op: "download3", id: code, ajax: "1", method_free: "1" },
    referer || `https://${host}/`
  );
  if (!raw) return null;
  const m = /"url"\s*:\s*"([^"]+)"/.exec(raw);
  if (!m) {
    console.log("[hexload] el POST no devolvi\xF3 ninguna url");
    return null;
  }
  return {
    url: m[1].replace(/\\\//g, "/"),
    headers: { Referer: `https://${host}/` }
  };
}
async function _postJson(url, cuerpo, referer) {
  var _a;
  try {
    return await sendMessage(
      "request",
      JSON.stringify([
        url,
        {
          method: "post",
          headers: {
            "Content-Type": "application/json",
            Referer: referer
          },
          data: JSON.stringify(cuerpo)
        }
      ])
    );
  } catch (e) {
    console.log(`[postJson] FAIL ${url.slice(0, 45)} :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return null;
  }
}
async function resolveFirestream(url, referer) {
  var _a;
  const host = _hostOf(url) || "firestream.to";
  const codigo = _codigoDe(url);
  if (!codigo) return null;
  const html = await fetchEmbed(url, referer || `https://${host}/`);
  if (typeof html !== "string") return null;
  const yaFirmada = /"signedVideoUrl"\s*:\s*"([^"]+)"/.exec(html);
  if (yaFirmada && yaFirmada[1] && yaFirmada[1] !== "null") {
    return {
      url: yaFirmada[1].replace(/\\\//g, "/"),
      headers: { Referer: `https://${host}/` }
    };
  }
  const vale = /<script[^>]+id="token-blob"[^>]*>([^<]+)<\/script>/.exec(html);
  if (!vale) {
    console.log("[firestream] la p\xE1gina no trae el vale para canjear");
    return null;
  }
  const raw = await _postJson(
    `https://${host}/api/videos/${encodeURIComponent(codigo)}/resolve`,
    { blob: vale[1].trim() },
    url
  );
  if (!raw) return null;
  const m = (_a = /"signedVideoUrl"\s*:\s*"([^"]+)"/.exec(raw)) != null ? _a : /"signedVideoSdUrl"\s*:\s*"([^"]+)"/.exec(raw);
  if (!m) {
    console.log("[firestream] el canje no devolvi\xF3 ninguna url");
    return null;
  }
  return {
    url: m[1].replace(/\\\//g, "/"),
    headers: { Referer: `https://${host}/` }
  };
}
async function resolveSavefiles(url, referer) {
  const host = _hostOf(url) || "savefiles.com";
  const code = _codigoDe(url);
  if (!code) return null;
  const html = await _postForm(
    `https://${host}/dl`,
    { op: "embed", file_code: code, auto: "1", referer: referer || "" },
    referer || `https://${host}/`
  );
  if (!html) return null;
  const plano = html.replace(/\\\//g, "/");
  const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(plano);
  if (m3u8) return { url: m3u8[1], headers: { Referer: `https://${host}/` } };
  const mp4 = /(https?:[^"'\s\\]+\.mp4[^"'\s\\]*)/.exec(plano);
  if (mp4) return { url: mp4[1], headers: { Referer: `https://${host}/` } };
  console.log("[savefiles] el POST a /dl no trajo ninguna fuente");
  return null;
}
async function resolveByse(url, referer) {
  var _a;
  const host = _hostOf(url) || "bysekoze.com";
  const code = _codigoDe(url);
  if (!code) return null;
  const raw = await fetchEmbed(`https://${host}/api/videos/${code}`, referer || `https://${host}/`);
  if (!raw) return null;
  let meta;
  try {
    meta = JSON.parse(raw);
  } catch (e) {
    console.log("[byse] la API no devolvi\xF3 JSON");
    return null;
  }
  const pb = meta.playback;
  if (!pb || !pb.iv || !pb.payload || !Array.isArray(pb.key_parts)) {
    console.log("[byse] la API no trajo datos de reproducci\xF3n");
    return null;
  }
  const v = Number(pb.version);
  const partes = pb.key_parts;
  const indices = v >= 1 && v <= 20 && 31 - v <= partes.length ? [v, 31 - v] : null;
  const elegidas = indices ? indices.map((i) => partes[i - 1]).filter((p) => typeof p === "string" && p.length > 0) : partes;
  if (!elegidas.length) return null;
  try {
    let clave = _b64urlAWord(elegidas[0]);
    for (let i = 1; i < elegidas.length; i++) {
      clave = clave.concat(_b64urlAWord(elegidas[i]));
    }
    const iv = _b64urlAWord(pb.iv);
    const contador = CryptoJS.lib.WordArray.create(iv.words.concat([2]), 16);
    const cifrado = _b64urlAWord(pb.payload);
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
      console.log("[byse] se descifr\xF3 pero no hab\xEDa ninguna url adentro");
      return null;
    }
    return {
      url: m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/"),
      headers: { Referer: `https://${host}/` }
    };
  } catch (e) {
    console.log(`[byse] no se pudo descifrar: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return null;
  }
}
function _b64urlAWord(s) {
  const normal = s.replace(/-/g, "+").replace(/_/g, "/");
  const relleno = normal.length % 4 === 0 ? "" : "=".repeat(4 - normal.length % 4);
  return CryptoJS.enc.Base64.parse(normal + relleno);
}
function _unpackAll(html) {
  let out = "";
  const re = /eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]*?\.split\('\|'\)[^)]*\)\)/g;
  for (const m of html.matchAll(re)) {
    const u = _unpack(m[0]);
    if (u) out += `
${u}`;
  }
  return out;
}
function _unpack(src) {
  const m = new RegExp("\\}\\s*\\(\\s*'(.*?)'\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*'(.*?)'\\.split\\('\\|'\\)", "s").exec(
    src
  );
  if (!m) return "";
  let payload = m[1];
  const radix = parseInt(m[2], 10);
  const count = parseInt(m[3], 10);
  const words = m[4].split("|");
  payload = payload.split("\\'").join("'");
  const enc = (n) => (n < radix ? "" : enc(Math.floor(n / radix))) + ((n = n % radix) > 35 ? String.fromCharCode(n + 29) : n.toString(36));
  const dict = {};
  for (let i = count - 1; i >= 0; i--) dict[enc(i)] = words[i] || enc(i);
  return payload.replace(/\b\w+\b/g, (w) => {
    var _a;
    return (_a = dict[w]) != null ? _a : w;
  });
}
function _hostOf(url) {
  const m = /^https?:\/\/([^/]+)/.exec(url);
  return m ? m[1] : null;
}
async function fetchEmbed(url, referer, opts = {}) {
  var _a, _b, _c;
  const headers = __spreadValues({ Referer: referer }, (_a = opts.headers) != null ? _a : {});
  const retries = (_b = opts.retries) != null ? _b : 0;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await sendMessage("request", JSON.stringify([url, { method: "get", headers }]));
    } catch (e) {
      lastErr = e;
    }
  }
  console.log(`[fetchEmbed] FAIL ${url.slice(0, 45)} :: ${(_c = lastErr == null ? void 0 : lastErr.message) != null ? _c : lastErr}`);
  return null;
}
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
async function latest(page) {
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
async function detail(url) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
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
  if (url.indexOf("http") === 0 && url.indexOf("latanime.org") === -1) {
    if (!_esMega(url)) {
      try {
        const res = await resolveEmbed(_nombreDe(url), url, `${BASE}/`);
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
    streams.push({ url: embed, quality: _nombreBonito(etiqueta) });
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

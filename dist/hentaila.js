// ==PrismHubExtension==
// @name         HentaiLA
// @version      1.0.1
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
    else if (s.includes("yourupload") || s.includes("yupload"))
      result = await resolveYourupload(embedUrl, referer);
    else if (s.includes("pixeldrain")) result = resolvePixeldrain(embedUrl);
    else if (s.includes("dood") || s.includes("dsvplay") || s.includes("playmogo") || s.includes("d000d") || s.includes("ds2play") || s.includes("ds2video") || s.includes("vidply") || s.includes("do0od") || s.includes("all3do"))
      result = await resolveDoodstream(embedUrl, referer);
    else if (s.includes("hqq") || s.includes("netu")) result = await resolveNetu(embedUrl, referer);
    else if (s.includes("ok.ru") || s.includes("okru") || s.includes("odnoklassniki"))
      result = await resolveOkru(embedUrl);
    else if (s.includes("streamwish") || s.includes("wishfast") || s.includes("vidhide") || s.includes("filelions") || s.includes("vhide") || s.includes("vtube") || s.includes("luluvdo") || s.includes("vidmoly") || s.includes("filemoon") || s.includes("moonplayer") || s.includes("swdyu") || s.includes("bysekoze") || s.includes("bestx") || s.includes("embedrise") || s.includes("ridoo") || s.includes("uqload") || s.includes("flaxtv"))
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
  const div = /id=["'](?:ideoolink|botlink|robotlink)["'][^>]*>\s*(\/\/?[^<]*get_video[^<]*)</.exec(
    html
  );
  if (div) {
    let path = div[1].trim();
    if (path.startsWith("//")) path = `https:${path}`;
    else if (path.startsWith("/")) path = `https:/${path}`;
    if (!/[?&]stream=/.test(path)) path += "&stream=1";
    return { url: path, headers: { Referer: "https://streamtape.com/" } };
  }
  let m = /(https?:\/\/streamtape\.[a-z]+\/get_video[^"'\s<>]+)/.exec(html);
  if (m) return { url: m[1], headers: { Referer: "https://streamtape.com/" } };
  m = /(\/\/streamtape\.[a-z]+\/get_video[^"'\s<>]+)/.exec(html);
  if (m) return { url: `https:${m[1]}`, headers: { Referer: "https://streamtape.com/" } };
  return null;
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

// extensions/hentaila/index.ts
var BASE = "https://hentaila.com";
var CDN = "https://cdn.hentaila.com";
async function _get(url) {
  const raw = await sendMessage(
    "request",
    JSON.stringify([url, { method: "get", headers: { Referer: `${BASE}/` } }])
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
      const res = await resolveEmbed("Servidor", url, `${BASE}/`);
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

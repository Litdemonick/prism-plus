// ==PrismHubExtension==
// @name         JKAnime
// @version      1.0.0
// @author       PrismHub
// @lang         es
// @license      MIT
// @package      io.prismhub.jkanime
// @type         bangumi
// @webSite      https://jkanime.net
// @description  Anime en español latino desde JKAnime — múltiples servidores confiables
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

// sdk/http.ts
var NetworkError = class extends Error {
  constructor(cause, url) {
    var _a;
    super(`Error de red en ${url}: ${(_a = cause == null ? void 0 : cause.message) != null ? _a : cause}`);
    this.name = "NetworkError";
  }
};
var HttpError = class extends Error {
  constructor(status, statusText, url) {
    super(`HTTP ${status} ${statusText} \u2014 ${url}`);
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.name = "HttpError";
  }
};
var TimeoutError = class extends Error {
  constructor(ms, url) {
    super(`Timeout de ${ms}ms superado \u2014 ${url}`);
    this.name = "TimeoutError";
  }
};
var DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
var DEFAULT_TIMEOUT = 15e3;
var DEFAULT_RETRIES = 2;
function isRetryable(status) {
  return status === 429 || status >= 500 && status < 600;
}
async function request(url, options = {}) {
  const {
    method = "GET",
    headers = {},
    body,
    retries = DEFAULT_RETRIES,
    timeout = DEFAULT_TIMEOUT,
    acceptStatus = false
  } = options;
  const merged = __spreadValues({ "User-Agent": DEFAULT_UA }, headers);
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const Ctrl = typeof AbortController !== "undefined" ? AbortController : null;
    const controller = Ctrl ? new Ctrl() : null;
    let timer;
    try {
      const res = await Promise.race([
        fetch(url, {
          method,
          headers: merged,
          body,
          signal: controller ? controller.signal : void 0
        }),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            if (controller) controller.abort();
            reject(new TimeoutError(timeout, url));
          }, timeout);
        })
      ]);
      if (timer) clearTimeout(timer);
      if (acceptStatus || res.ok) {
        return res;
      } else {
        const err = new HttpError(res.status, res.statusText, url);
        if (isRetryable(res.status) && attempt < retries) {
          lastError = err;
        } else {
          throw err;
        }
      }
    } catch (err) {
      if (timer) clearTimeout(timer);
      if (err instanceof TimeoutError) throw err;
      if (err instanceof HttpError) throw err;
      lastError = new NetworkError(err, url);
    }
    if (attempt < retries) await _sleep(300 * 2 ** attempt);
  }
  throw lastError;
}
function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// sdk/embeds.ts
async function resolveEmbed(server, embedUrl, referer) {
  var _a;
  const s = `${server} ${embedUrl}`.toLowerCase();
  let result;
  try {
    if (s.includes("voe")) result = await resolveVoe(embedUrl, referer);
    else if (s.includes("streamtape") || s.includes("stape") || s.includes("strtape"))
      result = await resolveStreamtape(embedUrl, referer);
    else if (s.includes("mixdrop") || s.includes("mxdrop") || s.includes("mdrop"))
      result = await resolveMixdrop(embedUrl, referer);
    else if (s.includes("mp4upload")) result = await resolveMp4upload(embedUrl, referer);
    else if (s.includes("yourupload") || s.includes("yupload"))
      result = await resolveYourupload(embedUrl, referer);
    else if (s.includes("pixeldrain")) result = resolvePixeldrain(embedUrl);
    else if (s.includes("dood") || s.includes("dsvplay") || s.includes("playmogo") || s.includes("d000d") || s.includes("ds2play") || s.includes("ds2video") || s.includes("vidply") || s.includes("do0od") || s.includes("all3do"))
      result = await resolveDoodstream(embedUrl, referer);
    else if (s.includes("hqq") || s.includes("netu")) result = await resolveNetu(embedUrl, referer);
    else if (s.includes("streamwish") || s.includes("wishfast") || s.includes("vidhide") || s.includes("filelions") || s.includes("vhide") || s.includes("vtube") || s.includes("luluvdo") || s.includes("vidmoly") || s.includes("filemoon") || s.includes("moonplayer") || s.includes("swdyu") || s.includes("bysekoze") || s.includes("bestx") || s.includes("embedrise") || s.includes("ridoo") || s.includes("uqload") || s.includes("flaxtv"))
      result = await resolveStreamwish(embedUrl, referer);
    else result = await resolveGeneric(embedUrl, referer);
  } catch (e) {
    console.log(`[resolveEmbed] ${server} THREW: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
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
  var _a, _b, _c, _d;
  try {
    const res = await request(url, {
      headers: __spreadValues({ Referer: referer }, (_a = opts.headers) != null ? _a : {}),
      timeout: (_b = opts.timeout) != null ? _b : 8e3,
      retries: (_c = opts.retries) != null ? _c : 0,
      acceptStatus: true
      // muchos embeds traen el contenido útil en 403/404
    });
    return res.text();
  } catch (e) {
    console.log(`[fetchEmbed] FAIL ${url.slice(0, 45)} :: ${(_d = e == null ? void 0 : e.message) != null ? _d : e}`);
    return null;
  }
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
async function latest(page) {
  const url = page === 1 ? BASE + "/" : `${BASE}/directorio/?p=${page - 1}`;
  const html = await _get(url);
  return _parseCards(html);
}
async function search(keyword, page) {
  if (page === 1) _searchSeen.delete(keyword);
  if (!_searchSeen.has(keyword)) _searchSeen.set(keyword, /* @__PURE__ */ new Set());
  const seen = _searchSeen.get(keyword);
  const html = await _get(`${BASE}/buscar/${encodeURIComponent(keyword)}/?page=${page}`);
  const cards = _parseCards(html);
  const fresh = cards.filter((c) => !seen.has(c.url));
  fresh.forEach((c) => seen.add(c.url));
  return fresh;
}
async function detail(url) {
  const slug = _toSlug(url);
  const html = await _get(`${BASE}/${slug}/`);
  const title = matchFirst(html, /<h1[^>]*>([^<]+)<\/h1>/i) || matchFirst(html, /<title>([^|<]+)/i) || slug;
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
    try {
      const first = await _post(`${BASE}/ajax/episodes/${animeId}/1`, token);
      if (first && Array.isArray(first.data)) {
        allEps.push(...first.data);
        lastPage = first.last_page || 1;
      }
    } catch (e) {
    }
    if (lastPage > 1) {
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
    for (const ep of allEps) {
      episodes.push({ title: ep.title, url: `${slug}/${ep.number}`, number: ep.number });
    }
    episodes.sort((a, b) => (a.number || 0) - (b.number || 0));
  }
  const genres = matchGroups(
    html,
    /<a[^>]+href="[^"]*\/genero\/[^"]*"[^>]*>([^<]+)<\/a>/gi
  ).map((g) => g[0]);
  return { title, cover, description, episodes, genres };
}
var _JS_ONLY_HOSTS = [
  "voe.sx",
  "voe.",
  "streamwish",
  "sfastwish",
  "wishfast",
  "swdyu",
  "vidhide",
  "filelions",
  "filemoon",
  "moonplayer",
  "mixdrop",
  "mxdrop"
];
function _isJkInternalEmbed(url) {
  if (url.indexOf("jkanime.net") === -1) return false;
  const path = url.replace(/^https?:\/\/jkanime\.net/, "").replace(/\/+$/, "");
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 2 && /^\d+$/.test(parts[1])) return false;
  const knownEmbeds = ["desu", "magi", "desuka", "embed", "player", "desudesuka"];
  return knownEmbeds.some((e) => parts[0] === e || url.indexOf("desudesuka") !== -1);
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
    if (isDesu) {
      const stream = await _resolveDesu(url, `${BASE}/`, "Desu");
      if (stream) return { streams: [stream], pageUrl: "" };
    } else if (isMagi) {
      const stream = await _resolveMagi(url, `${BASE}/`, "Magi");
      if (stream) return { streams: [stream], pageUrl: "" };
    }
    return { streams: [], pageUrl: url };
  }
  const episodeUrl = url.indexOf("http") === 0 ? url : `${BASE}/${url.replace(/\/+$/, "")}/`;
  const html = await _get(episodeUrl);
  const m = /(?:var|let|const)\s+servers\s*=\s*(\[[\s\S]*?\]);/.exec(html) || /(?:var|let|const)\s+video\s*=\s*(\[[\s\S]*?\]);/.exec(html);
  if (!m) {
    return { streams: [], pageUrl: episodeUrl };
  }
  let servers;
  try {
    servers = JSON.parse(m[1]);
  } catch (e) {
    return { streams: [], pageUrl: episodeUrl };
  }
  if (!Array.isArray(servers) || servers.length === 0) {
    return { streams: [], pageUrl: episodeUrl };
  }
  servers.sort((a, b) => (a.lang || 0) - (b.lang || 0));
  const resolved = await Promise.all(
    servers.map((s) => _resolveServer(s, episodeUrl))
  );
  const direct = resolved.filter((s) => s !== null && _isDirect(s.url));
  const embeds = resolved.filter((s) => s !== null && !_isDirect(s.url));
  const streams = [...direct, ...embeds];
  const isMega = (u) => u.indexOf("mega.nz") !== -1 || u.indexOf("mega.co.nz") !== -1;
  const ordered = [
    ...streams.filter((s) => !isMega(s.url)),
    ...streams.filter((s) => isMega(s.url))
  ];
  return { streams: ordered, pageUrl: episodeUrl };
}
async function _resolveServer(server, pageUrl) {
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
  const label = `${name}${langSuffix}`;
  const nameLow = name.toLowerCase();
  if (raw.indexOf("mega.nz") !== -1 || raw.indexOf("mega.co.nz") !== -1) {
    return { url: raw, quality: label };
  }
  if (nameLow === "desu" || raw.indexOf("desudesuka") !== -1 || raw.indexOf("desu.") !== -1) {
    const r = await _resolveDesu(raw, pageUrl, label);
    if (r) return r;
    return { url: raw, quality: label };
  }
  if (nameLow === "magi" || raw.indexOf("magi") !== -1) {
    const r = await _resolveMagi(raw, pageUrl, label);
    if (r) return r;
    return { url: raw, quality: label };
  }
  if (nameLow === "voe" || raw.indexOf("voe.sx") !== -1 || raw.indexOf("voe.") !== -1) {
    const r = await _resolveVoeDio(raw, label);
    if (r) return r;
    return { url: raw, quality: label };
  }
  if (nameLow === "streamtape" || raw.indexOf("streamtape") !== -1 || raw.indexOf("stape") !== -1) {
    const r = await _resolveStreamtapeDio(raw, label);
    if (r) return r;
    return { url: raw, quality: label };
  }
  if (nameLow === "streamwish" || raw.indexOf("streamwish") !== -1 || raw.indexOf("sfastwish") !== -1 || raw.indexOf("wishfast") !== -1 || raw.indexOf("vidhide") !== -1 || raw.indexOf("filelions") !== -1 || raw.indexOf("swdyu") !== -1) {
    const r = await _resolveStreamwishDio(raw, label);
    if (r) return r;
    return { url: raw, quality: label };
  }
  if (raw.indexOf("mp4upload") !== -1) {
    try {
      const res = await resolveEmbed("Mp4Upload", raw, `${BASE}/`);
      if (res && res.url) return { url: res.url, quality: label, headers: res.headers };
    } catch (e) {
    }
    return null;
  }
  if (nameLow === "mixdrop" || raw.indexOf("mixdrop") !== -1 || raw.indexOf("mxdrop") !== -1) {
    try {
      const res = await resolveEmbed("Mixdrop", raw, `${BASE}/`);
      if (res && res.url) return { url: res.url, quality: label, headers: res.headers };
    } catch (e) {
    }
    return { url: raw, quality: label };
  }
  if (nameLow === "doodstream" || nameLow === "dood" || raw.indexOf("dood") !== -1 || raw.indexOf("ds2play") !== -1 || raw.indexOf("ds2video") !== -1) {
    try {
      const res = await resolveEmbed("Doodstream", raw, `${BASE}/`);
      if (res && res.url) return { url: res.url, quality: label, headers: res.headers };
    } catch (e) {
    }
    return null;
  }
  const serverName = _guessServerName(raw) || name;
  try {
    const res = await resolveEmbed(serverName, raw, `${BASE}/`);
    if (res && res.url) return { url: res.url, quality: label, headers: res.headers };
  } catch (e) {
  }
  const rawLow = raw.toLowerCase();
  if (rawLow.indexOf("yourupload") !== -1 || rawLow.indexOf("dood") !== -1 || rawLow.indexOf("ok.ru") !== -1 || rawLow.indexOf("mixdrop") !== -1 || rawLow.indexOf("filemoon") !== -1) {
    return { url: raw, quality: label };
  }
  return null;
}
async function _resolveEmbedDio(name, url, referer) {
  const label = name;
  const u = url.toLowerCase();
  if (u.indexOf("voe") !== -1) return _resolveVoeDio(url, label);
  if (u.indexOf("streamtape") !== -1 || u.indexOf("stape") !== -1) return _resolveStreamtapeDio(url, label);
  if (u.indexOf("streamwish") !== -1 || u.indexOf("sfastwish") !== -1 || u.indexOf("wishfast") !== -1 || u.indexOf("vidhide") !== -1) return _resolveStreamwishDio(url, label);
  if (u.indexOf("mp4upload") !== -1) {
    try {
      const res = await resolveEmbed("Mp4Upload", url, referer);
      if (res && res.url) return { url: res.url, quality: label, headers: res.headers };
    } catch (e) {
    }
    return null;
  }
  try {
    const res = await resolveEmbed(name, url, referer);
    if (res && res.url) return { url: res.url, quality: label, headers: res.headers };
  } catch (e) {
  }
  return null;
}
async function _resolveVoeDio(url, label) {
  try {
    let html = await _get(url, { "Referer": BASE + "/" });
    if (!html) return null;
    const redir = /window\.location(?:\.href)?\s*=\s*['"](https?:\/\/[^'"]+)['"]/.exec(html);
    if (redir) {
      const mirror = await _get(redir[1], { "Referer": "https://voe.sx/" });
      if (mirror) html = mirror;
    }
    const jsonScript = /<script[^>]*type=["']application\/json["'][^>]*>\s*\[\s*"([^"]+)"\s*\]\s*<\/script>/.exec(html);
    if (jsonScript) {
      const decoded = _voeDecode2(jsonScript[1]);
      if (decoded) {
        const src = /"source"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(decoded);
        if (src) return { url: src[1].replace(/\\\//g, "/"), quality: label };
        const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(decoded.replace(/\\\//g, "/"));
        if (m3u8) return { url: m3u8[1], quality: label };
        const mp4 = /"direct_access_url"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(decoded);
        if (mp4) return { url: mp4[1].replace(/\\\//g, "/"), quality: label };
      }
    }
    let m = /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(html);
    if (m) return { url: m[1], quality: label };
    const atobM = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
    if (atobM) {
      try {
        const dec = _b64decode(atobM[1]);
        const hls = /['"]hls['"]\s*:\s*['"]([^'"]+)['"]/.exec(dec);
        if (hls) return { url: hls[1], quality: label };
      } catch (e) {
      }
    }
    m = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
    if (m) return { url: m[0], quality: label };
  } catch (e) {
  }
  return null;
}
async function _resolveStreamtapeDio(url, label) {
  try {
    const html = await _get(url, { "Referer": BASE + "/" });
    if (!html) return null;
    const div = /id=["'](?:ideoolink|botlink|robotlink)["'][^>]*>\s*(\/\/?[^<]*get_video[^<]*)</.exec(html);
    if (div) {
      let path = div[1].trim();
      if (path.startsWith("//")) path = "https:" + path;
      else if (path.startsWith("/")) path = "https:/" + path;
      if (!/[?&]stream=/.test(path)) path += "&stream=1";
      return { url: path, quality: label, headers: { "Referer": "https://streamtape.com/" } };
    }
    const robot = /robotlink['"]\)[^'"]+(\/\/?streamtape[^'"]+)['"]/i.exec(html);
    if (robot) {
      const p = robot[1].startsWith("//") ? "https:" + robot[1] : robot[1];
      return { url: p + "&stream=1", quality: label, headers: { "Referer": "https://streamtape.com/" } };
    }
    let m = /(https?:\/\/streamtape\.[a-z]+\/get_video[^"'\s<>]+)/.exec(html);
    if (m) return { url: m[1], quality: label, headers: { "Referer": "https://streamtape.com/" } };
    m = /(\/\/streamtape\.[a-z]+\/get_video[^"'\s<>]+)/.exec(html);
    if (m) return { url: "https:" + m[1], quality: label, headers: { "Referer": "https://streamtape.com/" } };
  } catch (e) {
  }
  return null;
}
async function _resolveStreamwishDio(url, label) {
  var _a;
  try {
    const hostM = /^https?:\/\/([^/]+)/.exec(url);
    const host = hostM ? hostM[1] : null;
    if (!host) return null;
    const hdrs = { "Referer": "https://" + host + "/" };
    const idM = /\/(?:e|f|d|v)\/([A-Za-z0-9]+)/.exec(url);
    if (idM) {
      const id = idM[1];
      try {
        const json = await _get(
          "https://" + host + "/api/file/" + id + "?json=1",
          __spreadProps(__spreadValues({}, hdrs), { "X-Requested-With": "XMLHttpRequest", "Accept": "application/json" })
        );
        if (json) {
          const fileM = /"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(json);
          if (fileM) return { url: fileM[1].replace(/\\\//g, "/"), quality: label, headers: hdrs };
          const mp4M = /"file"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(json);
          if (mp4M) return { url: mp4M[1].replace(/\\\//g, "/"), quality: label, headers: hdrs };
        }
      } catch (e) {
      }
    }
    const html = await _get(url, hdrs);
    if (!html) return null;
    const unpacked = _unpackEval(html);
    const full = (html + "\n" + unpacked).replace(/\\\//g, "/");
    const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(full);
    if (m3u8) return { url: m3u8[1], quality: label, headers: hdrs };
    const file = /(?:file|source|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/i.exec(full);
    if (file) return { url: file[1], quality: label, headers: hdrs };
    const atobM = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
    if (atobM) {
      try {
        const dec = _b64decode(atobM[1]);
        const src = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(dec.replace(/\\\//g, "/"));
        if (src) return { url: src[1], quality: label, headers: hdrs };
      } catch (e) {
      }
    }
    const mp4s = (_a = full.match(/https?:[^"'\s\\]+\.mp4[^"'\s\\]*/g)) != null ? _a : [];
    const real = mp4s.find((u) => !/\.(?:css|js|jpg|png|woff)/.test(u));
    if (real) return { url: real, quality: label, headers: hdrs };
  } catch (e) {
  }
  return null;
}
async function _resolveDesu(url, referer, label) {
  try {
    const hdrs = { "Referer": referer || `${BASE}/` };
    const html = await _get(url, hdrs);
    const stream = matchFirst(html, /"url"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i) || matchFirst(html, /"file"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i) || matchFirst(html, /"url"\s*:\s*"(https?:\/\/[^"]+\.mp4[^"]*)"/i) || matchFirst(html, /<source[^>]+src="(https?:\/\/[^"]+\.m3u8[^"]*)"/i);
    if (stream) return { url: stream, quality: label, headers: hdrs };
  } catch (e) {
  }
  return null;
}
async function _resolveMagi(url, referer, label) {
  try {
    const hdrs = { "Referer": referer || `${BASE}/` };
    const html = await _get(url, hdrs);
    const stream = matchFirst(html, /<source[^>]+src="(https?:\/\/[^"]+\.m3u8[^"]*)"/i) || matchFirst(html, /<source[^>]+src="(https?:\/\/[^"]+\.mp4[^"]*)"/i) || matchFirst(html, /source\s*:\s*['"]?(https?:\/\/[^'">\s]+\.m3u8)/i);
    if (stream) return { url: stream, quality: label, headers: hdrs };
  } catch (e) {
  }
  return null;
}
function _rot132(s) {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
  });
}
function _voeDecode2(raw) {
  try {
    let r = _rot132(raw);
    for (const p of ["@$", "^^", "#&", "~@", "%?", "*~", "!!", "`"]) {
      r = r.split(p).join("");
    }
    const step3 = _b64decode(r);
    let shifted = "";
    for (let i = 0; i < step3.length; i++) {
      shifted += String.fromCharCode(step3.charCodeAt(i) - 3);
    }
    const reversed = shifted.split("").reverse().join("");
    return _b64decode(reversed);
  } catch (e) {
    return null;
  }
}
function _unpackEval(html) {
  let out = "";
  const re = /eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]*?\.split\('\|'\)[^)]*\)\)/g;
  for (const m of html.matchAll(re)) {
    const inner = new RegExp("\\}\\s*\\(\\s*'(.*?)'\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*'(.*?)'\\.split\\('\\|'\\)", "s").exec(m[0]);
    if (!inner) continue;
    let payload = inner[1];
    const radix = parseInt(inner[2], 10);
    const count = parseInt(inner[3], 10);
    const words = inner[4].split("|");
    payload = payload.split("\\'").join("'");
    const enc = (n) => (n < radix ? "" : enc(Math.floor(n / radix))) + ((n = n % radix) > 35 ? String.fromCharCode(n + 29) : n.toString(36));
    const dict = {};
    for (let i = count - 1; i >= 0; i--) dict[enc(i)] = words[i] || enc(i);
    out += "\n" + payload.replace(/\b\w+\b/g, (w) => {
      var _a;
      return (_a = dict[w]) != null ? _a : w;
    });
  }
  return out;
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
    items.push({ title, url: slug, cover });
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
      let title = "";
      const altM = /<img\b[^>]*\balt=["']([^"']{2,80})["'][^>]*>/i.exec(ctx);
      if (altM && !/logo|icon|banner|avatar/i.test(altM[1])) title = altM[1].trim();
      if (!title) {
        const linkEndCtx = html.slice(pos, pos + hrefMatch[0].length + 300);
        const linkTextM = /href=["'][^"']+["'][^>]*>([^<]{2,80})</i.exec(linkEndCtx);
        if (linkTextM) title = linkTextM[1].trim().replace(/\s+/g, " ");
      }
      if (!title) {
        const hLinkM = /<h[4-6][^>]*>\s*<a[^>]*>([^<]{2,80})<\/a>/i.exec(ctx);
        const hPlainM = /<h[2-6][^>]*>([^<]{2,80})<\/h[2-6]>/i.exec(ctx);
        const spanM = /class="[^"]*(?:title|name|anime)[^"]*"[^>]*>([^<]{2,80})</i.exec(ctx);
        title = hLinkM && hLinkM[1].trim() || hPlainM && hPlainM[1].trim() || spanM && spanM[1].trim() || slug.replace(/-/g, " ");
      }
      if (!cover) continue;
      seen.add(slug);
      items.push({ title, url: slug, cover });
    }
  }
  return items;
}

export default class extends Extension {
  async latest(page) { return latest(page); }
  async search(kw, page, filter) { return search(kw, page, filter); }
  async createFilter(filter) { return (typeof createFilter === 'function') ? createFilter(filter) : {}; }

  // Adapta el detail de Prism+ al de PrismHub: episodios planos [{title,url}] ->
  // grupos [{title, urls:[{name,url}]}], y description -> desc.
  async detail(url) {
    var d = await detail(url);
    if (!d || typeof d !== 'object') return d;
    var eps = Array.isArray(d.episodes) ? d.episodes : [];
    var grouped;
    if (eps.length && eps[0] && Array.isArray(eps[0].urls)) {
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
    return {
      title: d.title || '',
      cover: d.cover,
      desc: d.desc || d.description || '',
      episodes: grouped,
      headers: d.headers
    };
  }
  async checkUpdate(url) { return (typeof checkUpdate === 'function') ? checkUpdate(url) : {}; }

  // Adapta el formato de Prism+ ({streams:[{url,quality,headers}]}) al contrato
  // de watch de PrismHub ({type,url,headers} + X-Servers para el selector de
  // servidores). Maneja 3 casos:
  //   1. URL directa (.m3u8/.mp4) → fast-path, devolver inmediatamente.
  //   2. URL de embed externo conocido (voe.sx, yourupload.com, netu, etc.) →
  //      resolveEmbed on-demand (igual que JiruHub). Aplica a TODAS las extensiones.
  //   3. URL de episodio normal → llamar watch() de la extensión.
  async watch(url) {
    // Fast-path 1: URL ya resuelta (stream directo .m3u8 o .mp4).
    // El wrapper del build script la devuelve sin llamar a la extensión.
    if (typeof url === 'string' && url.indexOf('http') === 0 &&
        (url.indexOf('.m3u8') !== -1 || url.indexOf('.mp4') !== -1)) {
      return { type: url.indexOf('.mp4') !== -1 ? 'mp4' : 'hls', url: url, headers: {} };
    }

    // Fast-path 2: embed URL de host conocido — resolver on-demand con el SDK.
    // PrismHub llama runtime.watch(embedUrl) desde switchServer() cuando el usuario
    // elige un servidor cuya URL no es un stream directo. Aplica a todas las
    // extensiones que bundleen el SDK (resolveEmbed disponible como global).
    if (typeof url === 'string' && url.indexOf('http') === 0 &&
        typeof resolveEmbed === 'function') {
      var _lurl = url.toLowerCase();
      var _embedMap = {
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
      var _sname = null;
      for (var _k in _embedMap) {
        if (_lurl.indexOf(_k) !== -1) { _sname = _embedMap[_k]; break; }
      }
      if (_sname) {
        try {
          var _res = await resolveEmbed(_sname, url, '');
          if (_res && _res.url) {
            return {
              type: _res.url.indexOf('.mp4') !== -1 ? 'mp4' : 'hls',
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
      type: p.url.indexOf('.mp4') !== -1 ? 'mp4' : 'hls',
      url: p.url,
      subtitles: r.subtitles || [],
      headers: Object.assign({}, p.headers || {}, extra)
    };
  }
}

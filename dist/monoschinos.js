// ==PrismHubExtension==
// @name         MonosChinos
// @version      1.1.4
// @author       PrismHub
// @lang         es
// @license      MIT
// @icon         https://monoschinos.st/img/2web.jpg
// @package      io.prismhub.monoschinos
// @type         bangumi
// @webSite      https://monoschinos.st
// @description  Anime en español latino desde MonosChinos
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
    try {
      const res = await Promise.race([
        fetch(url, {
          method,
          headers: merged,
          body,
          signal: controller ? controller.signal : void 0
        }),
        new Promise(
          (_, reject) => setTimeout(() => {
            if (controller) controller.abort();
            reject(new TimeoutError(timeout, url));
          }, timeout)
        )
      ]);
      if (acceptStatus || res.ok) {
        if (controller) controller.abort();
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
      if (err instanceof TimeoutError) throw err;
      if (err instanceof HttpError) throw err;
      lastError = new NetworkError(err, url);
    }
    if (attempt < retries) await _sleep(300 * 2 ** attempt);
  }
  throw lastError;
}
async function get(url, headers) {
  return (await request(url, { headers })).text();
}
function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// sdk/html.ts
function matchFirst(html, pattern) {
  var _a, _b, _c;
  return (_c = (_b = (_a = pattern.exec(html)) == null ? void 0 : _a[1]) == null ? void 0 : _b.trim()) != null ? _c : "";
}
function between(html, start, end) {
  const s = html.indexOf(start);
  if (s === -1) return "";
  const e = html.indexOf(end, s + start.length);
  if (e === -1) return "";
  return html.slice(s + start.length, e).trim();
}
function stripTags(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
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
    else if (s.includes("hqq") || s.includes("netu")) result = await resolveNetu(embedUrl, referer);
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
  const voeOpts = { timeout: 7e3, retries: 0 };
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
  const html = await fetchEmbed(url, referer, { timeout: 12e3, retries: 1 });
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
async function resolveNetu(url, referer) {
  var _a;
  const host = (_a = _hostOf(url)) != null ? _a : "hqq.tv";
  const siteHdrs = {
    Referer: `https://${host}/`,
    Origin: `https://${host}`
  };
  const html = await fetchEmbed(url, referer, {
    timeout: 12e3,
    retries: 1,
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

// extensions/monoschinos/index.ts
var BASE = "https://monoschinos.st";
function parseItems(html) {
  const items = [];
  const parts = html.split("ficha_efecto");
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const href = matchFirst(block, /href="([^"]+)"/i);
    const cover = matchFirst(block, /data-src="([^"]+)"/i);
    const title = matchFirst(block, /class="[^"]*title_cap[^"]*"[^>]*>([^<]+)/i);
    if (!href || !title) continue;
    items.push({
      title: title.trim(),
      url: href.startsWith("http") ? href : `${BASE}${href}`,
      cover: cover || void 0
    });
  }
  return items;
}
async function latest(page) {
  const html = await get(`${BASE}/animes?p=${page}`);
  return parseItems(html);
}
async function search(keyword, _page) {
  const html = await get(`${BASE}/buscar?q=${encodeURIComponent(keyword)}`);
  return parseItems(html);
}
async function detail(url) {
  const html = await get(url);
  const title = matchFirst(html, /<h1[^>]*>([^<]+)<\/h1>/i);
  const cover = matchFirst(html, /class="[^"]*lazy[^"]*"[^>]*data-src="([^"]+)"/i) || matchFirst(html, /data-src="([^"]+)"[^>]*class="[^"]*lazy[^"]*"/i);
  const descBlock = between(html, '<div class="mb-3">', "</div>");
  const description = stripTags(between(descBlock, "<p>", "</p>"));
  const ep1Match = new RegExp(
    `href="https?://monoschinos\\.st/ver/([^"]+)-episodio-1"`
  ).exec(html);
  if (!ep1Match) {
    return { title: title || url, cover: cover || void 0, description, episodes: [] };
  }
  const slug = ep1Match[1];
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/-/g, "[-]");
  const epRe = new RegExp(`/ver/${escapedSlug}-episodio-(\\d+)`, "g");
  let maxEp = 1;
  for (const match of html.matchAll(epRe)) {
    const n = parseInt(match[1], 10);
    if (n > maxEp) maxEp = n;
  }
  const episodes = Array.from({ length: maxEp }, (_, i) => ({
    title: `Episodio ${i + 1}`,
    url: `${BASE}/ver/${slug}-episodio-${i + 1}`
  }));
  return { title, cover: cover || void 0, description, episodes };
}
async function watch(url) {
  const html = await get(url, { Referer: `${BASE}/` });
  const direct = [];
  const pdRe = /pixeldrain\.com\/u\/([A-Za-z0-9]+)/g;
  const seenPd = /* @__PURE__ */ new Set();
  for (const m of html.matchAll(pdRe)) {
    if (seenPd.has(m[1])) continue;
    seenPd.add(m[1]);
    direct.push({
      url: `https://pixeldrain.com/api/file/${m[1]}`,
      quality: "Pixeldrain",
      headers: { Referer: "https://pixeldrain.com/" }
    });
  }
  const playerRe = /data-player="([A-Za-z0-9+/=]{10,})"[^>]*>([^<]{1,30})</g;
  const candidates = [];
  for (const m of html.matchAll(playerRe)) {
    try {
      const embedUrl = b64decode(m[1]);
      if (embedUrl.startsWith("http")) {
        candidates.push({ server: m[2].trim() || _guessServer(embedUrl), embedUrl });
      }
    } catch (e) {
    }
  }
  const results = await Promise.all(
    candidates.map(async ({ server, embedUrl }) => {
      const resolved2 = await resolveEmbed(server, embedUrl, `${BASE}/`);
      return { server, embedUrl, resolved: resolved2 };
    })
  );
  const resolved = results.filter((r) => r.resolved !== null).map((r) => ({ url: r.resolved.url, quality: r.server, headers: r.resolved.headers }));
  const fallback = results.filter((r) => r.resolved === null).map((r) => ({ url: r.embedUrl, quality: r.server }));
  const streams = [...direct, ...resolved, ...fallback];
  if (streams.length === 0) {
    const m3u8Match = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
    if (m3u8Match) streams.push({ url: m3u8Match[1], quality: "Directo" });
  }
  return { streams };
}
function _guessServer(url) {
  if (url.includes("voe")) return "Voe";
  if (url.includes("streamtape")) return "Streamtape";
  if (url.includes("pixeldrain")) return "Pixeldrain";
  return "Embed";
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
  // servidores). Si llega una URL ya resuelta (cambio de servidor), se devuelve.
  async watch(url) {
    if (typeof url === 'string' && url.indexOf('http') === 0 &&
        (url.indexOf('.m3u8') !== -1 || url.indexOf('.mp4') !== -1)) {
      return { type: url.indexOf('.mp4') !== -1 ? 'mp4' : 'hls', url: url, headers: {} };
    }
    var r = await watch(url);
    if (!r || !Array.isArray(r.streams)) return r;
    var streams = r.streams.filter(function (s) { return s && s.url; });
    if (streams.length === 0) {
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
    return {
      type: p.url.indexOf('.mp4') !== -1 ? 'mp4' : 'hls',
      url: p.url,
      subtitles: r.subtitles || [],
      headers: Object.assign({}, p.headers || {}, {
        'X-Servers': JSON.stringify(servers),
        'X-Primary-Server': p.quality || p.server || 'Servidor 1',
        'X-Server-Referers': JSON.stringify(referers)
      })
    };
  }
}

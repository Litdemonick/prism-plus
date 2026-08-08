// ==PrismHubExtension==
// @name         ShadeManga
// @version      1.4.2
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.shademanga
// @type         mixed
// @nsfw         false
// @webSite      https://www.shademanga.com
// @description  Manga y anime en un solo lugar: leé y mirá sin cambiar de app (incluye contenido +18).
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

// extensions/shademanga/servidores/comun.ts
async function pedir(url, referer, headers) {
  var _a;
  try {
    return await sendMessage(
      "request",
      JSON.stringify([url, { method: "get", headers: __spreadValues({ Referer: referer }, headers) }])
    );
  } catch (e) {
    console.log(`[sm] no se pudo pedir ${url.slice(0, 45)} :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
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

// extensions/shademanga/servidores/doodstream/index.ts
async function resolver(_url, _referer) {
  return null;
}

// extensions/shademanga/servidores/filelions/index.ts
async function resolver2(_url, _referer) {
  return null;
}

// extensions/shademanga/servidores/filemoon/index.ts
async function resolver3(_url, _referer) {
  return null;
}

// extensions/shademanga/servidores/hd/index.ts
async function resolver4(_url, _referer) {
  return null;
}

// extensions/shademanga/servidores/mixdrop/index.ts
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

// extensions/shademanga/servidores/mp4upload/index.ts
async function resolver6(url, referer) {
  var _a;
  const html = await pedir(url, referer);
  if (!html) return null;
  const candidatos = (_a = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g)) != null ? _a : [];
  const real = candidatos.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) return null;
  return { url: real, headers: { Referer: "https://www.mp4upload.com/" } };
}

// extensions/shademanga/servidores/yourupload/index.ts
function esRelleno(u) {
  return u.indexOf("novideo") !== -1;
}
async function resolver7(url, referer) {
  var _a, _b;
  const html = await pedir(url, referer);
  if (!html) return null;
  const hdrs = { Referer: "https://www.yourupload.com/" };
  const norm = (u) => u.replace(/\\\//g, "/").replace(/^\/\//, "https://");
  const m = /(?:file|src|source)\s*:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i.exec(html);
  if (m && !esRelleno(m[1])) return { url: norm(m[1]), headers: hdrs };
  const absolutos = (_a = html.match(/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/g)) != null ? _a : [];
  const real = absolutos.find((u) => !esRelleno(u));
  if (real) return { url: real, headers: hdrs };
  const relativos = (_b = html.match(/\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/g)) != null ? _b : [];
  const realRel = relativos.find((u) => !esRelleno(u));
  if (realRel) return { url: `https:${realRel}`, headers: hdrs };
  return null;
}

// extensions/shademanga/servidores/index.ts
var SERVIDORES = [
  {
    boton: "Mp4upload",
    hosts: ["mp4upload"],
    botones: 96,
    nativo: true,
    resolver: resolver6
  },
  {
    boton: "HD",
    hosts: ["zilla-networks"],
    botones: 46,
    nativo: false,
    resolver: resolver4
  },
  {
    boton: "YourUpload",
    hosts: ["yourupload", "yupload"],
    botones: 31,
    nativo: true,
    resolver: resolver7
  },
  {
    boton: "filemoon",
    hosts: ["bysesukior", "byse.", "bysekoze"],
    botones: 20,
    nativo: false,
    resolver: resolver3
  },
  {
    // Tres oes, no dos — ver la carpeta. `playmogo` va acá porque es a donde
    // redirige, para que la ficha lo siga reconociendo si el sitio lo cambia.
    boton: "doodstream",
    hosts: ["dooodster", "playmogo", "dood"],
    botones: 19,
    nativo: false,
    resolver
  },
  {
    boton: "mixdrop",
    hosts: ["mixdrop", "mxdrop", "xdrop"],
    botones: 19,
    nativo: true,
    resolver: resolver5
  },
  {
    boton: "filelions",
    hosts: ["filelions"],
    botones: 19,
    nativo: false,
    resolver: resolver2
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
  console.log(`[sm] servidor sin ficha, se prueba a mano: ${url.slice(0, 60)}`);
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : void 0);
}

// extensions/shademanga/index.ts
var BASE = "https://www.shademanga.com";
var HOST = "shademanga.com";
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
function _splitGenres(g) {
  if (!g) return void 0;
  const list = g.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length > 0 ? list : void 0;
}
function _mangaUrl(id) {
  return `${BASE}/serie/local/${id}`;
}
function _extMangaUrl(smId) {
  return `${BASE}/adultos/manga/o/${smId}`;
}
function _extSmIdFromUrl(url) {
  const m = /\/adultos\/manga\/o\/(\d+)/.exec(url);
  return m ? parseInt(m[1], 10) : null;
}
function _isExternal(m) {
  return (m.externo === true || m.fuente === "smhentai") && !!m.smId;
}
function _mangaDedupeKey(m) {
  if (m.publicId) return m.publicId;
  if (_isExternal(m)) return `ext:${m.smId}`;
  return `local:${m.id}`;
}
function _mangaChapterUrl(seriesId, chapterId) {
  return `${BASE}/serie/local/${seriesId}/capitulo/${chapterId}`;
}
function _mangaItemToPrismItem(m) {
  const rating = typeof m.puntuacion === "number" && m.puntuacion > 0 ? m.puntuacion : void 0;
  return {
    title: m.titulo,
    url: _isExternal(m) ? _extMangaUrl(m.smId) : _mangaUrl(m.id),
    cover: m.portadaUrl,
    description: m.descripcion,
    tags: _splitGenres(m.generos),
    rating,
    type: "manga"
  };
}
async function _latestManga(page) {
  var _a;
  const json = await _get(`${BASE}/api/series-locales/populares?page=${page}`);
  if (!json || typeof json === "string") return [];
  const items = (_a = json.items) != null ? _a : [];
  return items.filter((m) => !m.esMayorDeEdad).map(_mangaItemToPrismItem);
}
async function _mangaNovedades(page, includeAdult) {
  var _a;
  const json = await _get(
    `${BASE}/api/series-locales/capitulos/recientes?page=${page}&pageSize=20`
  );
  const items = (_a = json == null ? void 0 : json.items) != null ? _a : [];
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const it of items) {
    if (!it.serie || seen.has(it.serie.id)) continue;
    if (!includeAdult && it.serie.esMayorDeEdad) continue;
    seen.add(it.serie.id);
    const item = _mangaItemToPrismItem(it.serie);
    item.update = `Cap. ${it.numeroCapitulo}`;
    out.push(item);
  }
  return out;
}
var _mangaGenresCache = null;
async function _fetchMangaGenres() {
  if (_mangaGenresCache) return _mangaGenresCache;
  const json = await _get(`${BASE}/api/series-locales/generos`);
  if (!Array.isArray(json)) return [];
  _mangaGenresCache = json.map((g) => g.nombre).filter((n) => !!n);
  return _mangaGenresCache;
}
async function _mangaByGenero(genero, page, includeAdult) {
  var _a;
  const url = `${BASE}/api/series-locales?genero=${encodeURIComponent(genero)}&page=${page}&pageSize=20&includeAdult=${includeAdult}`;
  const json = await _get(url);
  const items = Array.isArray(json) ? json : (_a = json == null ? void 0 : json.items) != null ? _a : [];
  return items.filter((m) => includeAdult || !m.esMayorDeEdad).map(_mangaItemToPrismItem);
}
async function _searchManga(keyword, includeAdult) {
  const url = `${BASE}/api/series-locales/search-candidates?q=${encodeURIComponent(keyword)}&take=20&includeAdult=${includeAdult}`;
  const json = await _get(url);
  if (!Array.isArray(json)) return [];
  const items = json;
  return (includeAdult ? items : items.filter((m) => !m.esMayorDeEdad)).map(_mangaItemToPrismItem);
}
var _ADULT_MANGA_GENRES = [
  "Hentai",
  "Adult",
  "Erotica",
  "Ecchi",
  "Smut",
  "Doujinshi",
  "Full Color"
];
async function _mangaAdultByGenrePage(genero, page) {
  var _a;
  const url = `${BASE}/api/series-locales?genero=${encodeURIComponent(genero)}&page=${page}&pageSize=100&includeAdult=true`;
  const json = await _get(url);
  const items = Array.isArray(json) ? json : (_a = json == null ? void 0 : json.items) != null ? _a : [];
  return items.filter((m) => m.esMayorDeEdad);
}
async function _latestMangaAdult(page) {
  var _a, _b;
  const lists = await Promise.all(
    _ADULT_MANGA_GENRES.map(
      (g) => _mangaAdultByGenrePage(g, page).catch(() => [])
    )
  );
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  if (page === 1) {
    try {
      const json = await _get(`${BASE}/api/series-locales/adultos/home`);
      if (json && typeof json !== "string") {
        const secciones = (_a = json.secciones) != null ? _a : [];
        for (const s of secciones) {
          for (const it of (_b = s.items) != null ? _b : []) {
            const key = _mangaDedupeKey(it);
            if (seen.has(key)) continue;
            seen.add(key);
            items.push(it);
          }
        }
      }
    } catch (e) {
    }
  }
  for (const list of lists) {
    for (const it of list) {
      const key = _mangaDedupeKey(it);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(it);
    }
  }
  return items.map(_mangaItemToPrismItem);
}
function _mapMangaStatus(estado) {
  if (!estado) return void 0;
  const s = estado.toLowerCase();
  if (s.indexOf("curso") !== -1) return "ongoing";
  if (s.indexOf("complet") !== -1) return "completed";
  if (s.indexOf("pausa") !== -1 || s.indexOf("hiatus") !== -1) return "hiatus";
  return void 0;
}
async function _mangaDetail(id) {
  var _a;
  const json = await _get(`${BASE}/api/series-locales/${id}`);
  const episodes = ((_a = json.capitulos) != null ? _a : []).filter((c) => c.visible !== false).slice().sort((a, b) => a.numeroCapitulo - b.numeroCapitulo).map((c) => ({
    title: c.titulo ? `Cap. ${c.numeroCapitulo}: ${c.titulo}` : `Cap\xEDtulo ${c.numeroCapitulo}`,
    url: _mangaChapterUrl(id, c.id),
    number: c.numeroCapitulo
  }));
  const rating = typeof json.puntuacion === "number" && json.puntuacion > 0 ? json.puntuacion : void 0;
  return {
    title: json.titulo,
    cover: json.portadaUrl,
    description: json.descripcion,
    genres: _splitGenres(json.generos),
    episodes,
    rating,
    status: _mapMangaStatus(json.estado),
    type: "manga"
  };
}
async function _watchChapter(seriesId, chapterId) {
  var _a;
  const json = await _get(
    `${BASE}/api/series-locales/${seriesId}/capitulos/${chapterId}/paginas`
  );
  const paginas = (_a = json == null ? void 0 : json.paginas) != null ? _a : [];
  return { urls: paginas };
}
function _animeUrl(token) {
  return `${BASE}/anime/${token}`;
}
function _animeEpisodeUrl(token, numero) {
  return `${BASE}/anime/${token}/${numero}`;
}
function _animeAssetUrl(u) {
  return u.indexOf("http") === 0 ? u : `${BASE}${u}`;
}
function _animeItemToPrismItem(a) {
  const rating = typeof a.puntuacion === "number" && a.puntuacion > 0 ? a.puntuacion : void 0;
  return {
    title: a.titulo,
    url: _animeUrl(a.token),
    cover: _animeAssetUrl(a.portadaUrl),
    tags: _splitGenres(a.generos),
    rating,
    type: "anime"
  };
}
async function _latestAnime(page) {
  var _a;
  const json = await _get(`${BASE}/api/anime?page=${page}`);
  if (!json || typeof json === "string") return [];
  const items = (_a = json.items) != null ? _a : [];
  return items.filter((a) => !a.esMayorDeEdad).map(_animeItemToPrismItem);
}
var _animeGenresCache = null;
async function _fetchAnimeGenres() {
  var _a;
  if (_animeGenresCache) return _animeGenresCache;
  const json = await _get(`${BASE}/api/anime/generos`);
  const list = (_a = json == null ? void 0 : json.generos) != null ? _a : [];
  _animeGenresCache = list.map((g) => g.genero).filter((n) => !!n);
  return _animeGenresCache;
}
async function _animeByGenero(genero, page) {
  var _a;
  const json = await _get(`${BASE}/api/anime?genero=${encodeURIComponent(genero)}&page=${page}`);
  if (!json || typeof json === "string") return [];
  const items = (_a = json.items) != null ? _a : [];
  return items.filter((a) => !a.esMayorDeEdad).map(_animeItemToPrismItem);
}
async function _searchAnime(keyword) {
  var _a;
  const json = await _get(`${BASE}/api/anime?q=${encodeURIComponent(keyword)}`);
  if (!json || typeof json === "string") return [];
  const items = (_a = json.items) != null ? _a : [];
  return items.filter((a) => !a.esMayorDeEdad).map(_animeItemToPrismItem);
}
var _ANIME_ADULT_PAGE_SIZE = 48;
var _animeAdultDump = null;
function _animeAdultAll() {
  if (_animeAdultDump) return _animeAdultDump;
  _animeAdultDump = (async () => {
    var _a, _b;
    const json = await _get(`${BASE}/api/anime/adultos/home`);
    if (!json || typeof json === "string") return [];
    const secciones = (_a = json.secciones) != null ? _a : [];
    const vistos = /* @__PURE__ */ new Set();
    const items = [];
    for (const s of secciones) {
      for (const it of (_b = s.items) != null ? _b : []) {
        if (!(it == null ? void 0 : it.token) || vistos.has(it.token)) continue;
        vistos.add(it.token);
        items.push(it);
      }
    }
    return items;
  })().catch(() => {
    _animeAdultDump = null;
    return [];
  });
  return _animeAdultDump;
}
async function _latestAnimeAdult(page) {
  const todos = await _animeAdultAll();
  const desde = (page - 1) * _ANIME_ADULT_PAGE_SIZE;
  if (desde >= todos.length) return [];
  return todos.slice(desde, desde + _ANIME_ADULT_PAGE_SIZE).map(_animeItemToPrismItem);
}
function _mapAnimeStatus(estado) {
  if (!estado) return void 0;
  const s = estado.toLowerCase();
  if (s.indexOf("emisi") !== -1) return "ongoing";
  if (s.indexOf("final") !== -1 || s.indexOf("complet") !== -1) return "completed";
  return void 0;
}
async function _animeDetail(token) {
  var _a, _b;
  const json = await _get(`${BASE}/api/anime/${token}`);
  const episodes = ((_a = json.episodios) != null ? _a : []).slice().sort((a, b) => a.numero - b.numero).map((e) => ({
    title: e.titulo ? `Ep. ${e.numero}: ${e.titulo}` : `Episodio ${e.numero}`,
    url: _animeEpisodeUrl(token, e.numero),
    number: e.numero,
    thumbnail: e.thumbUrl ? _animeAssetUrl(e.thumbUrl) : void 0,
    airDate: e.fechaEmision ? e.fechaEmision.slice(0, 10) : void 0
  }));
  const extra = {};
  if (json.titulosAlternativos) extra["T\xEDtulos alternativos"] = json.titulosAlternativos;
  const rating = typeof json.puntuacion === "number" && json.puntuacion > 0 ? json.puntuacion : void 0;
  return {
    title: json.titulo,
    cover: json.portadaUrl ? _animeAssetUrl(json.portadaUrl) : void 0,
    description: (_b = json.sinopsis) != null ? _b : void 0,
    genres: _splitGenres(json.generos),
    episodes,
    rating,
    status: _mapAnimeStatus(json.estado),
    extra: Object.keys(extra).length > 0 ? extra : void 0,
    type: "bangumi"
  };
}
async function _watchEpisode(token, numero) {
  var _a;
  const json = await _get(`${BASE}/api/anime/${token}/${numero}`);
  const embeds = (_a = json == null ? void 0 : json.embeds) != null ? _a : [];
  const streams = embeds.map((e) => {
    var _a2;
    return {
      url: e.embedUrl,
      quality: e.idioma ? `${e.servidor} (${e.idioma})` : e.servidor,
      // El rayo/mundo sale de la tabla de `servidores/`, que es donde está lo que
      // se midió de cada uno. El nombre solo no alcanza: acá el mismo servidor se
      // rotula "Mp4upload (SUB)", "Mp4upload (DUB)" o "mp4upload" según la ficha.
      nativo: (_a2 = fichaDe(e.embedUrl)) == null ? void 0 : _a2.nativo
    };
  });
  return { streams };
}
function _interleave(a, b) {
  const merged = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i]) merged.push(a[i]);
    if (b[i]) merged.push(b[i]);
  }
  return merged;
}
async function latest(page) {
  const [manga, anime] = await Promise.all([
    _mangaNovedades(page, false),
    _latestAnime(page)
  ]);
  return _interleave(manga, anime);
}
var _TYPE_OPTIONS = {
  "": "Todos",
  manga: "Manga",
  anime: "Anime"
};
var _ORDEN_OPTIONS = {
  populares: "Populares",
  novedades: "Novedades"
};
var _ADULT_OPTIONS = {
  no: "Ocultar +18",
  si: "Mostrar +18"
};
var _ADULT_GENRE_OPTIONS = {
  "": "Todos",
  Hentai: "Hentai",
  Erotica: "Er\xF3tico",
  Adult: "Adulto",
  Ecchi: "Ecchi",
  Doujinshi: "Doujinshi",
  "Full Color": "A color",
  Smut: "Smut",
  Yuri: "Yuri",
  Yaoi: "Yaoi"
};
async function createFilter(filter) {
  var _a;
  const isAdult = ((_a = filter == null ? void 0 : filter["adultos"]) == null ? void 0 : _a[0]) === "si";
  let generoOptions;
  if (isAdult) {
    generoOptions = _ADULT_GENRE_OPTIONS;
  } else {
    const [mangaGenres, animeGenres] = await Promise.all([
      _fetchMangaGenres(),
      _fetchAnimeGenres()
    ]);
    const generoSet = /* @__PURE__ */ new Set([...mangaGenres, ...animeGenres]);
    generoOptions = { "": "Todos" };
    for (const g of [...generoSet].sort((a, b) => a.localeCompare(b))) generoOptions[g] = g;
  }
  return {
    tipo: { title: "Tipo", options: _TYPE_OPTIONS, default: "", min: 1, max: 1 },
    orden: { title: "Orden", options: _ORDEN_OPTIONS, default: "populares", min: 1, max: 1 },
    // El título dice de qué zona son los géneros que se están ofreciendo, así
    // queda claro que la lista cambió al prender el +18 y no parece un bug.
    genero: {
      title: isAdult ? "G\xE9nero (+18)" : "G\xE9nero",
      options: generoOptions,
      default: "",
      min: 1,
      max: 1
    },
    adultos: {
      title: "Adultos",
      options: _ADULT_OPTIONS,
      default: "no",
      min: 1,
      max: 1,
      adultOption: "si"
    }
  };
}
async function search(keyword, page, filter) {
  var _a, _b, _c, _d, _e;
  const tipo = (_a = filter == null ? void 0 : filter["tipo"]) == null ? void 0 : _a[0];
  const orden = (_c = (_b = filter == null ? void 0 : filter["orden"]) == null ? void 0 : _b[0]) != null ? _c : "populares";
  const genero = (_d = filter == null ? void 0 : filter["genero"]) == null ? void 0 : _d[0];
  const includeAdult = ((_e = filter == null ? void 0 : filter["adultos"]) == null ? void 0 : _e[0]) === "si";
  const kw = keyword.trim();
  if (kw) {
    if (includeAdult) return _searchManga(kw, true);
    if (tipo === "manga") return _searchManga(kw, false);
    if (tipo === "anime") return _searchAnime(kw);
    const [manga2, anime2] = await Promise.all([_searchManga(kw, false), _searchAnime(kw)]);
    return _interleave(manga2, anime2);
  }
  if (genero) {
    if (tipo === "anime") return _animeByGenero(genero, page);
    if (tipo === "manga" || includeAdult) return _mangaByGenero(genero, page, includeAdult);
    const [manga2, anime2] = await Promise.all([
      _mangaByGenero(genero, page, includeAdult),
      _animeByGenero(genero, page)
    ]);
    return _interleave(manga2, anime2);
  }
  if (includeAdult) {
    if (tipo === "manga") return _latestMangaAdult(page);
    if (tipo === "anime") return _latestAnimeAdult(page);
    const [manga2, anime2] = await Promise.all([_latestMangaAdult(page), _latestAnimeAdult(page)]);
    return _interleave(manga2, anime2);
  }
  const mangaFetch = orden === "novedades" ? _mangaNovedades(page, false) : _latestManga(page);
  if (tipo === "manga") return mangaFetch;
  if (tipo === "anime") return _latestAnime(page);
  const [manga, anime] = await Promise.all([mangaFetch, _latestAnime(page)]);
  return _interleave(manga, anime);
}
function _mangaIdFromUrl(url) {
  const m = /\/serie\/local\/(\d+)(?:\/|$)/.exec(url);
  return m ? parseInt(m[1], 10) : null;
}
function _animeTokenFromUrl(url) {
  const m = /\/anime\/([^/]+)/.exec(url);
  return m ? m[1] : null;
}
async function _extMangaDetail(smId) {
  var _a, _b;
  const json = await _get(`${BASE}/api/series-locales/ext/${smId}`);
  const pages = (_a = json.totalPaginas) != null ? _a : 0;
  return {
    title: json.titulo,
    cover: json.portadaUrl,
    description: (_b = json.descripcion) != null ? _b : void 0,
    genres: _splitGenres(json.generos),
    episodes: [
      {
        title: pages > 0 ? `Oneshot (${pages} p\xE1ginas)` : "Oneshot",
        url: _extMangaUrl(smId),
        number: 1
      }
    ],
    status: "completed",
    type: "manga"
  };
}
async function _extMangaWatch(smId) {
  var _a;
  const json = await _get(`${BASE}/api/series-locales/ext/${smId}/paginas`);
  const raw = Array.isArray(json) ? json : (_a = json == null ? void 0 : json.paginas) != null ? _a : [];
  const urls = raw.map(
    (p) => {
      var _a2;
      return typeof p === "string" ? p : (_a2 = p == null ? void 0 : p.url) != null ? _a2 : "";
    }
  ).filter((u) => !!u);
  return { urls };
}
async function detail(url) {
  const extId = _extSmIdFromUrl(url);
  if (extId !== null) return _extMangaDetail(extId);
  const mangaId = _mangaIdFromUrl(url);
  if (mangaId !== null) return _mangaDetail(mangaId);
  const token = _animeTokenFromUrl(url);
  if (token) return _animeDetail(token);
  throw new Error(`URL de detalle no reconocida: ${url}`);
}
async function watch(url) {
  const extId = _extSmIdFromUrl(url);
  if (extId !== null) return _extMangaWatch(extId);
  const chapterM = /\/serie\/local\/(\d+)\/capitulo\/(\d+)/.exec(url);
  if (chapterM) return _watchChapter(chapterM[1], chapterM[2]);
  const episodeM = /\/anime\/([^/]+)\/(\d+)/.exec(url);
  if (episodeM) return _watchEpisode(episodeM[1], episodeM[2]);
  if (url.indexOf("http") === 0 && url.indexOf(HOST) === -1) {
    try {
      const res = await resolverServidor(url, `${BASE}/`);
      if (res && res.url) {
        return { streams: [{ url: res.url, quality: "Servidor", headers: res.headers }] };
      }
    } catch (e) {
    }
    return { streams: [{ url, quality: "Servidor" }] };
  }
  return { streams: [] };
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

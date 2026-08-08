// ==PrismHubExtension==
// @name         LaMovie
// @version      1.1.7
// @author       PrismHub
// @lang         es
// @license      MIT
// @package      io.prismhub.lamovie
// @type         bangumi
// @nsfw         false
// @latestLabel  recien-anadidas
// @webSite      https://lamovie.org
// @description  Películas, series, animes y novelas en español desde LaMovie — catálogo, búsqueda y filtros por género/año/calidad/idioma
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

// extensions/lamovie/servidores/doodstream/index.ts
async function resolver(_url, _referer) {
  return null;
}

// extensions/lamovie/servidores/comun.ts
var UA_NAVEGADOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
async function pedir(url, referer, headers) {
  var _a;
  try {
    return await sendMessage(
      "request",
      JSON.stringify([
        url,
        {
          method: "get",
          // El User-Agent va PRIMERO para que quien llame pueda pisarlo.
          headers: __spreadValues({ "User-Agent": UA_NAVEGADOR, Referer: referer }, headers)
        }
      ])
    );
  } catch (e) {
    console.log(`[fc] no se pudo pedir ${url.slice(0, 45)} :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
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
function cabecerasDeStream(extra) {
  return __spreadValues({ "User-Agent": UA_NAVEGADOR }, extra != null ? extra : {});
}
function buscarDireccion(html, headers) {
  var _a;
  headers = cabecerasDeStream(headers);
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

// extensions/lamovie/servidores/goodstream/index.ts
async function resolver2(url, referer) {
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : void 0);
}

// extensions/lamovie/servidores/vimeos/index.ts
async function resolver3(url, referer) {
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : void 0);
}

// extensions/lamovie/servidores/voe/index.ts
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

// extensions/lamovie/servidores/index.ts
var SERVIDORES = [
  {
    boton: "Vimeos",
    hosts: ["vimeos"],
    medido: "9/9",
    nativo: true,
    resolver: resolver3
  },
  {
    boton: "GoodstreamOne",
    hosts: ["goodstream"],
    medido: "8/8",
    nativo: true,
    resolver: resolver2
  },
  {
    boton: "Voe",
    hosts: ["voe.sx", "voe.", "voedelivery", "jonathansociallike", "brookethoughi"],
    medido: "anda en la app",
    nativo: true,
    resolver: resolver4
  },
  {
    boton: "Doodstream",
    hosts: ["doodstream", "dood.", "d000d", "dooood"],
    medido: "0/7",
    nativo: false,
    resolver
  }
];
function servidorDe(url) {
  const u = url.toLowerCase();
  for (const s of SERVIDORES) {
    for (const h of s.hosts) {
      if (u.indexOf(h) !== -1) return s;
    }
  }
  return null;
}
async function resolver5(url, referer) {
  const s = servidorDe(url);
  if (!s) return null;
  try {
    return await s.resolver(url, referer);
  } catch (e) {
    console.log(`[lamovie/${s.boton}] no se pudo resolver: ${e}`);
    return null;
  }
}

// extensions/lamovie/index.ts
var BASE = "https://lamovie.org";
var API = "https://lamovie.org/wp-api/v1";
var IMG = "https://lamovie.org/wp-content/uploads";
async function _get(url) {
  const raw = await sendMessage(
    "request",
    JSON.stringify([url, { method: "get", headers: { Referer: `${BASE}/` } }])
  );
  return JSON.parse(raw);
}
var POST_TYPES = ["movies", "tvshows", "animes", "novels"];
var PERMALINK = {
  movies: "peliculas",
  tvshows: "series",
  animes: "animes",
  novels: "novelas"
};
function _tipoDeMedio(postType) {
  if (postType === "movies") return "movie";
  if (postType === "animes") return "anime";
  return "series";
}
function _isSerial(postType) {
  return postType !== "movies";
}
var _GENRES = {
  17: "Drama",
  18: "Comedia",
  33: "Suspense",
  32: "Acci\xF3n",
  520: "Animaci\xF3n",
  96: "Terror",
  180: "Crimen",
  130: "Aventura",
  115: "Romance",
  398: "Familia",
  97: "Misterio",
  131: "Ciencia ficci\xF3n",
  229: "Fantas\xEDa",
  704: "Sci-Fi & Fantasy",
  705: "Action & Adventure",
  164: "Documental",
  165: "Historia",
  8: "M\xFAsica",
  6787: "Pel\xEDcula de TV",
  3056: "B\xE9lica",
  674: "Western",
  703: "Kids",
  786: "War & Politics",
  12485: "Reality",
  19824: "Soap"
};
var _COUNTRIES = {
  457: "Estados Unidos",
  774: "Reino Unido",
  787: "Canad\xE1",
  617: "Francia",
  5436: "M\xE9xico",
  2499: "Espa\xF1a",
  733: "Jap\xF3n",
  4601: "Corea del Sur",
  1431: "Alemania",
  3912: "Italia",
  7746: "Argentina",
  2654: "Australia",
  3416: "India",
  3623: "Brasil",
  1198: "China",
  3057: "Polonia",
  9620: "Rusia",
  7483: "Irlanda",
  1364: "Dinamarca",
  12155: "Colombia",
  11668: "Turqu\xEDa",
  8300: "Suecia",
  9100: "Tailandia",
  6033: "Pa\xEDses Bajos",
  5210: "B\xE9lgica",
  15438: "Chile",
  16399: "Noruega",
  27475: "Per\xFA",
  35098: "Venezuela",
  40202: "Portugal"
};
function _cover(images) {
  const p = images == null ? void 0 : images.poster;
  if (!p) return void 0;
  return p.indexOf("http") === 0 ? p : `${IMG}${p}`;
}
function _postUrl(postType, slug) {
  var _a;
  const seg = (_a = PERMALINK[postType]) != null ? _a : postType;
  return `${BASE}/${seg}/${slug}/`;
}
function _yearFromDate(date) {
  if (!date) return void 0;
  const y = parseInt(date.slice(0, 4), 10);
  return Number.isFinite(y) ? y : void 0;
}
function _tagsFromGenres(genres) {
  if (!genres || genres.length === 0) return void 0;
  const names = genres.map((g) => _GENRES[g]).filter((n) => !!n);
  return names.length ? names : void 0;
}
function _itemFromPost(p) {
  return {
    title: p.title,
    url: _postUrl(p.type, p.slug),
    cover: _cover(p.images),
    description: p.overview,
    tags: _tagsFromGenres(p.genres),
    year: _yearFromDate(p.release_date),
    rating: p.rating ? parseFloat(p.rating) : void 0,
    type: _tipoDeMedio(p.type)
  };
}
var _YEARS = {
  "2026": 74006,
  "2025": 4,
  "2024": 1354,
  "2023": 2236,
  "2022": 1461,
  "2021": 2169,
  "2020": 2792,
  "2019": 1816,
  "2018": 1926,
  "2017": 1874,
  "2016": 1618,
  "2015": 8694,
  "2014": 2052,
  "2013": 775,
  "2012": 762,
  "2011": 769,
  "2010": 3858,
  "2009": 2092,
  "2008": 1395,
  "2007": 902,
  "2006": 873,
  "2005": 963,
  "2004": 728,
  "2003": 503,
  "2002": 800,
  "2001": 793,
  "2000": 684,
  "1999": 735,
  "1998": 1279,
  "1997": 600,
  "1996": 1142,
  "1995": 937,
  "1994": 533,
  "1993": 1707,
  "1992": 657,
  "1991": 2583,
  "1990": 707,
  "1989": 1258,
  "1988": 1726,
  "1987": 852,
  "1986": 1313,
  "1985": 1440,
  "1984": 1237,
  "1983": 6004,
  "1982": 1165,
  "1981": 1212,
  "1980": 4122,
  "1979": 2881,
  "1976": 1378,
  "1973": 2114
};
var _PROVIDERS = {
  459: "Disney Plus",
  460: "Google Play Movies",
  461: "Apple TV",
  462: "Rakuten TV",
  463: "Microsoft Store",
  464: "Amazon Video",
  465: "MovistarTV",
  466: "maxdome Store",
  467: "Sky Store",
  468: "Fetch TV",
  469: "Cineplex",
  470: "YouTube",
  472: "blue TV",
  474: "MagentaTV",
  475: "Videoload",
  476: "Freenet meinVOD",
  477: "Viaplay",
  478: "Blockbuster",
  479: "SF Anytime",
  480: "Elisa Viihde",
  481: "Orange VOD",
  482: "VIVA by videofutur",
  483: "Premiere Max",
  487: "Timvision",
  488: "wavve",
  489: "KPN",
  490: "Path\xE9 Thuis",
  491: "TV 2 Play",
  492: "Premiery Canal+",
  493: "Hulu",
  494: "Fandango At Home",
  522: "meJane",
  523: "Player",
  524: "Kinopoisk",
  549: "Claro video",
  551: "Movistar Plus+ Ficci\xF3n Total",
  563: "Amazon Prime Video",
  565: "Telia Play",
  566: "Canal VOD",
  567: "FILMO",
  568: "Universcine",
  569: "Bbox VOD",
  572: "Netflix",
  573: "U-NEXT",
  574: "Netflix Standard with Ads",
  575: "Watcha",
  580: "Amazon Prime Video with Ads",
  581: "Spectrum On Demand",
  675: "Max",
  677: "Videobuster"
};
function _parseFilter(filter) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const postType = (_a = filter == null ? void 0 : filter["tipo"]) == null ? void 0 : _a[0];
  const genre = ((_b = filter == null ? void 0 : filter["genero"]) == null ? void 0 : _b[0]) ? parseInt(filter["genero"][0], 10) : void 0;
  const year = ((_c = filter == null ? void 0 : filter["anio"]) == null ? void 0 : _c[0]) ? _YEARS[filter["anio"][0]] : void 0;
  const country = ((_d = filter == null ? void 0 : filter["pais"]) == null ? void 0 : _d[0]) ? parseInt(filter["pais"][0], 10) : void 0;
  const provider = ((_e = filter == null ? void 0 : filter["proveedor"]) == null ? void 0 : _e[0]) ? parseInt(filter["proveedor"][0], 10) : void 0;
  const quality = ((_f = filter == null ? void 0 : filter["calidad"]) == null ? void 0 : _f[0]) ? parseInt(filter["calidad"][0], 10) : void 0;
  const lang = ((_g = filter == null ? void 0 : filter["idioma"]) == null ? void 0 : _g[0]) ? parseInt(filter["idioma"][0], 10) : void 0;
  const orderBy = ((_h = filter == null ? void 0 : filter["orden"]) == null ? void 0 : _h[0]) || "latest";
  const order = ((_i = filter == null ? void 0 : filter["direccion"]) == null ? void 0 : _i[0]) || "desc";
  return {
    postType: postType && POST_TYPES.includes(postType) ? postType : void 0,
    genre,
    year,
    country,
    provider,
    quality,
    lang,
    orderBy,
    order
  };
}
function _serverFilterParam(f) {
  const obj = {};
  if (f.genre) obj.genres = [f.genre];
  if (f.year) obj.years = [f.year];
  if (f.country) obj.countries = [f.country];
  if (f.provider) obj.providers = [f.provider];
  if (Object.keys(obj).length === 0) return "";
  return `&filter=${encodeURIComponent(JSON.stringify(obj))}`;
}
function _matchesClientFilter(p, f) {
  if (f.quality && !(p.quality || []).includes(f.quality)) return false;
  if (f.lang && !(p.lang || []).includes(f.lang)) return false;
  return true;
}
async function createFilter() {
  const genreOptions = { "": "Todos" };
  for (const [id, name] of Object.entries(_GENRES)) genreOptions[id] = name;
  const countryOptions = { "": "Todos" };
  for (const [id, name] of Object.entries(_COUNTRIES)) countryOptions[id] = name;
  const providerOptions = { "": "Todos" };
  for (const [id, name] of Object.entries(_PROVIDERS)) providerOptions[id] = name;
  const tipoOptions = {
    "": "Todos",
    movies: "Pel\xEDculas",
    tvshows: "Series",
    animes: "Animes",
    novels: "Novelas"
  };
  const yearOptions = { "": "Todos" };
  for (const year of Object.keys(_YEARS)) yearOptions[year] = year;
  const ordenOptions = {
    latest: "Recientes",
    popular: "Populares",
    rated: "Valorados",
    views: "Vistos"
  };
  const direccionOptions = { desc: "Mayor a menor", asc: "Menor a mayor" };
  return {
    tipo: { title: "Tipo", options: tipoOptions, default: "", min: 1, max: 1 },
    orden: { title: "Orden", options: ordenOptions, default: "latest", min: 1, max: 1 },
    direccion: { title: "Direcci\xF3n", options: direccionOptions, default: "desc", min: 1, max: 1 },
    genero: { title: "G\xE9nero", options: genreOptions, default: "", min: 1, max: 1 },
    anio: { title: "A\xF1o", options: yearOptions, default: "", min: 1, max: 1 },
    pais: { title: "Pa\xEDs", options: countryOptions, default: "", min: 1, max: 1 },
    proveedor: {
      title: "Proveedor",
      options: providerOptions,
      default: "",
      min: 1,
      max: 1
    }
  };
}
async function _listing(postType, page, f) {
  const perPage = 20;
  const filterParam = _serverFilterParam(f);
  const base = `${API}/listing/${postType}?postType=${postType}&postsPerPage=${perPage}&orderBy=${f.orderBy}&order=${f.order}${filterParam}`;
  const needsClientFilter = !!(f.quality || f.lang);
  if (!needsClientFilter) {
    const res = await _get(`${base}&page=${page}`);
    if (res.error || !res.data) return [];
    return res.data.posts.map(_itemFromPost);
  }
  const items = [];
  let rawPage = page;
  const maxRawFetches = 8;
  for (let attempt = 0; attempt < maxRawFetches && items.length < perPage; attempt++, rawPage++) {
    const res = await _get(`${base}&page=${rawPage}`);
    if (res.error || !res.data || res.data.posts.length === 0) break;
    for (const p of res.data.posts) {
      if (_matchesClientFilter(p, f)) items.push(_itemFromPost(p));
    }
  }
  return items;
}
async function latest(page, filter) {
  const f = _parseFilter(filter);
  if (f.postType) return _listing(f.postType, page, f);
  const porTipo = await Promise.all(
    POST_TYPES.map(
      (t) => _listing(t, page, f).catch((e) => {
        console.log(`[lamovie] no se pudo listar ${t}: ${e}`);
        return [];
      })
    )
  );
  const mezcla = [];
  const vistos = {};
  const masLargo = Math.max(0, ...porTipo.map((l) => l.length));
  for (let i = 0; i < masLargo; i++) {
    for (const lista of porTipo) {
      const it = lista[i];
      if (!it || vistos[it.url]) continue;
      vistos[it.url] = true;
      mezcla.push(it);
    }
  }
  return mezcla;
}
async function search(keyword, page, filter) {
  var _a, _b;
  const kw = keyword.trim();
  const f = _parseFilter(filter);
  if (!kw) return latest(page, filter);
  if (kw.length < 3) return [];
  const perPage = 20;
  const rawStart = (page - 1) * perPage + 1;
  const requests = Array.from(
    { length: perPage },
    (_, i) => _get(`${API}/search?q=${encodeURIComponent(kw)}&page=${rawStart + i}`).catch(
      () => null
    )
  );
  const results = await Promise.all(requests);
  const items = [];
  for (const res of results) {
    const post = (_b = (_a = res == null ? void 0 : res.data) == null ? void 0 : _a.posts) == null ? void 0 : _b[0];
    if (!post) continue;
    if (f.postType && post.type !== f.postType) continue;
    if (f.genre && !(post.genres || []).includes(f.genre)) continue;
    if (f.country && !(post.countries || []).includes(f.country)) continue;
    if (f.year && _yearFromDate(post.release_date) !== f.year) continue;
    if (!_matchesClientFilter(post, f)) continue;
    items.push(_itemFromPost(post));
  }
  return items;
}
function _parsePostUrl(url) {
  for (const pt of POST_TYPES) {
    const seg = PERMALINK[pt];
    const m = new RegExp(`/${seg}/([^/]+)/?`).exec(url);
    if (m) return { postType: pt, slug: m[1] };
  }
  return null;
}
async function _fetchSeasons(showId, showSlug, showType, maxSeasons = 30) {
  var _a, _b;
  const seasons = [];
  for (let season = 1; season <= maxSeasons; season++) {
    const res = await _get(
      `${API}/single/episodes/list?_id=${showId}&season=${season}&page=1&postsPerPage=100`
    );
    const posts = (_b = (_a = res == null ? void 0 : res.data) == null ? void 0 : _a.posts) != null ? _b : [];
    if (posts.length === 0) break;
    const episodes = posts.map((e) => ({
      title: e.title,
      url: `${BASE}/${PERMALINK[showType]}/${showSlug}/?showId=${showId}&s=${e.season_number}&e=${e.episode_number}&epId=${e._id}`,
      thumbnail: e.still_path ? `https://image.tmdb.org/t/p/original${e.still_path}` : void 0,
      duration: e.runtime ? parseInt(e.runtime, 10) * 60 : void 0,
      airDate: e.date ? e.date.slice(0, 10) : void 0,
      number: e.episode_number
    }));
    seasons.push({ title: `Temporada ${season}`, episodes });
  }
  return seasons;
}
async function detail(url) {
  const parsed = _parsePostUrl(url);
  if (!parsed) throw new Error("URL de LaMovie no reconocida");
  const { postType, slug } = parsed;
  const res = await _get(
    `${API}/single/${postType}?slug=${encodeURIComponent(slug)}&postType=${postType}`
  );
  if (res.error || !res.data) throw new Error("No se pudo cargar el detalle en LaMovie");
  const p = res.data;
  const episodesFlat = [];
  let seasons;
  if (_isSerial(postType)) {
    seasons = await _fetchSeasons(p._id, slug, postType);
  } else {
    episodesFlat.push({
      title: p.title,
      url: `${BASE}/peliculas/${slug}/?showId=${p._id}`
    });
  }
  return {
    title: p.title,
    cover: _cover(p.images),
    description: p.overview,
    episodes: episodesFlat,
    seasons,
    genres: _tagsFromGenres(p.genres),
    year: _yearFromDate(p.release_date),
    rating: p.rating ? parseFloat(p.rating) : void 0,
    extra: __spreadValues(__spreadValues({}, p.original_title ? { "T\xEDtulo original": p.original_title } : {}), p.certification ? { Clasificaci\u00F3n: p.certification } : {}),
    type: "bangumi"
  };
}
function _postIdFromUrl(url) {
  const m = /[?&]epId=(\d+)/.exec(url) || /[?&]showId=(\d+)/.exec(url);
  return m ? parseInt(m[1], 10) : null;
}
function _nombreDeBoton(e, host, conocido) {
  const partes = [];
  partes.push(conocido || e.server || host);
  if (e.lang) partes.push(e.lang);
  return partes.join(" ");
}
async function watch(url) {
  if (url.indexOf("http") === 0 && url.indexOf(BASE) === -1) {
    const resuelto = await resolver5(url, `${BASE}/`);
    if (resuelto) {
      return {
        streams: [{ url: resuelto.url, headers: resuelto.headers }],
        pageUrl: url
      };
    }
    return { streams: [], pageUrl: url };
  }
  const postId = _postIdFromUrl(url);
  if (postId == null) throw new Error("No se pudo identificar el contenido en LaMovie");
  const cleanPageUrl = url.split("?")[0];
  const res = await _get(`${API}/player?postId=${postId}&demo=0`);
  if (res.error || !res.data) return { streams: [], pageUrl: cleanPageUrl };
  const embeds = res.data.embeds || [];
  if (embeds.length === 0) return { streams: [], pageUrl: cleanPageUrl };
  const streams = [];
  for (const e of embeds) {
    if (e.url.indexOf("/embed.html") !== -1) continue;
    const host = _guessServerName(e.url);
    const s = servidorDe(e.url);
    streams.push({
      url: e.url,
      quality: _nombreDeBoton(e, host, s ? s.boton : null),
      // El rayo y el mundo los dice la extensión, que es la que lo midió, y no
      // la app adivinando por el nombre del host.
      nativo: s ? s.nativo : false,
      headers: { Referer: `${BASE}/` }
    });
  }
  return { streams, pageUrl: cleanPageUrl };
}
function _guessServerName(url) {
  const m = /^https?:\/\/(?:www\.)?([^/:?#]+)/i.exec(url);
  return m ? m[1] : "Embed";
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

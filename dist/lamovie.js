// ==PrismHubExtension==
// @name         LaMovie
// @version      1.5.0
// @author       PrismHub
// @lang         es
// @license      MIT
// @package      io.prismhub.lamovie
// @type         bangumi
// @nsfw         false
// @contentKind  accion-real
// @latestLabel  recien-anadidas
// @webSite      https://lamovie.org
// @description  Películas, series y animes en español desde LaMovie — catálogo, búsqueda y filtros por tipo, género, año, país y plataforma
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

// extensions/lamovie/servidores/comun.ts
var UA_NAVEGADOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var UA_DEL_REPRODUCTOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
var CABECERAS_DEL_REPRODUCTOR = {
  "User-Agent": UA_DEL_REPRODUCTOR
};
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
    console.log(`[lamovie] no se pudo pedir ${url.slice(0, 45)} :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
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

// extensions/lamovie/servidores/vimeos/index.ts
async function resolver(url, referer) {
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
async function resolver2(url, referer) {
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

// extensions/lamovie/servidores/index.ts
var SERVIDORES = [
  { boton: "Vimeos", hosts: ["vimeos"], resolver },
  // MP4 directo: más lento que Vimeos para arrancar (medido 2026-10-04: 11,6 s
  // desde el principio, 14,3 s en el minuto 40) pero reproduce, y en la mitad
  // de los títulos es el único que anda. Mismo resolvedor que JKAnime.
  { boton: "VOE", hosts: ["voe.sx", "voe."], resolver: resolver2 }
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
async function resolver3(url, referer) {
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
var API = `${BASE}/wp-api/v1`;
var SUBIDAS = `${BASE}/wp-content/uploads`;
var IMG = "https://image.tmdb.org/t/p";
async function _get(url) {
  const raw = await sendMessage(
    "request",
    JSON.stringify([url, { method: "get", headers: { Referer: `${BASE}/` } }])
  );
  const t = (raw || "").trim();
  if (t.charAt(0) !== "{" && t.charAt(0) !== "[") {
    throw new Error("LaMovie no devolvi\xF3 datos (la API respondi\xF3 otra cosa)");
  }
  return JSON.parse(t);
}
async function _datos(ruta) {
  const r = await _get(`${API}${ruta}`);
  if (r.error || r.data == null) throw new Error(r.message || "LaMovie no encontr\xF3 eso");
  return r.data;
}
var KINDS = ["movie", "tvshow", "anime"];
var POST_TYPE = { movie: "movies", tvshow: "tvshows", anime: "animes" };
var KIND_DE_POST = { movies: "movie", tvshows: "tvshow", animes: "anime" };
var SEGMENTO = { movie: "pelicula", tvshow: "serie", anime: "anime" };
function _tipoDeMedio(kind) {
  if (kind === "movie") return "movie";
  if (kind === "anime") return "anime";
  return "series";
}
function _img(path) {
  if (!path) return void 0;
  if (path.indexOf("http") === 0) return path;
  return `${SUBIDAS}${path.charAt(0) === "/" ? "" : "/"}${path}`;
}
function _imgTmdb(path, tam) {
  if (!path) return void 0;
  if (path.indexOf("http") === 0) return path;
  return `${IMG}/${tam}${path.charAt(0) === "/" ? "" : "/"}${path}`;
}
function _itemUrl(kind, id, slug) {
  return `${BASE}/${SEGMENTO[kind]}/${id}/${slug}`;
}
function _episodioUrl(kind, slug, e) {
  return `${BASE}/${SEGMENTO[kind]}/0/${slug}/temporada/${e.season_number}/episodio/${e.episode_number}?ep=${e._id}`;
}
function _titulo(t) {
  return (t || "").replace(/\s*\(\d{4}\)\s*$/, "").replace(/&amp;/g, "&");
}
function _anio(i) {
  const m = /\((\d{4})\)\s*$/.exec(i.title || "");
  if (m) return parseInt(m[1], 10);
  const y = i.release_date ? parseInt(i.release_date.slice(0, 4), 10) : NaN;
  return Number.isFinite(y) ? y : void 0;
}
function _numero(x) {
  const n = typeof x === "number" ? x : parseFloat(x || "");
  return Number.isFinite(n) && n > 0 ? n : void 0;
}
function _generos(i) {
  const nombres = (i.genres || []).map((id) => {
    var _a;
    return (_a = _taxonomias == null ? void 0 : _taxonomias.genres[String(id)]) == null ? void 0 : _a.name;
  }).filter((x) => !!x);
  return nombres.length ? nombres : void 0;
}
function _itemDe(i) {
  var _a;
  const kind = KIND_DE_POST[i.type];
  if (!kind || !i.slug) return null;
  const u = i.latest_episode;
  const rating = _numero(i.rating);
  return {
    title: _titulo(i.title),
    url: _itemUrl(kind, i._id, i.slug),
    cover: _img((_a = i.images) == null ? void 0 : _a.poster),
    description: i.overview || void 0,
    tags: _generos(i),
    year: _anio(i),
    rating: rating ? Math.round(rating * 10) / 10 : void 0,
    type: _tipoDeMedio(kind),
    update: u && u.season_number && u.episode_number && kind !== "movie" ? `T${u.season_number} E${u.episode_number}` : void 0
  };
}
var _taxonomias = null;
async function _leerTaxonomias() {
  if (_taxonomias) return _taxonomias;
  try {
    const raw = await sendMessage(
      "request",
      JSON.stringify([`${BASE}/`, { method: "get", headers: { Referer: `${BASE}/` } }])
    );
    let html = raw || "";
    try {
      const j = JSON.parse(html);
      if (typeof j === "string") html = j;
    } catch (e) {
    }
    const leer = (clave) => {
      const m = new RegExp(`\\b${clave}:(\\{[^\\n]*\\})\\s*,?\\s*\\n`).exec(html);
      if (!m) return {};
      try {
        return JSON.parse(m[1]);
      } catch (e) {
        return {};
      }
    };
    const t = {
      genres: leer("genres"),
      years: leer("years"),
      countries: leer("countries"),
      providers: leer("providers")
    };
    if (Object.keys(t.genres).length === 0) throw new Error("la portada no trajo los g\xE9neros");
    _taxonomias = t;
    return _taxonomias;
  } catch (e) {
    console.log(`[lamovie] sin taxonom\xEDas: ${e}`);
    return null;
  }
}
function _idDe(tax, valor) {
  if (!valor || !tax) return void 0;
  if (/^\d+$/.test(valor) && tax[valor]) return parseInt(valor, 10);
  const v = valor.toLowerCase();
  for (const id of Object.keys(tax)) {
    const t = tax[id];
    if (t.slug === v || (t.name || "").toLowerCase() === v) return parseInt(id, 10);
  }
  return void 0;
}
var _TIPO_VIEJO = {
  movies: "movie",
  tvshows: "tvshow",
  animes: "anime",
  novels: "tvshow"
};
function _leerFiltro(filter) {
  const v = (k) => {
    var _a;
    const x = (_a = filter == null ? void 0 : filter[k]) == null ? void 0 : _a[0];
    return x ? String(x) : void 0;
  };
  const tipo = v("tipo");
  const kind = tipo ? KINDS.includes(tipo) ? tipo : _TIPO_VIEJO[tipo] : void 0;
  const o = v("orden");
  return {
    kind,
    orden: o === "popular" || o === "views" ? "popular" : "recent",
    genero: v("genero"),
    anio: v("anio"),
    pais: v("pais"),
    plataforma: v("plataforma")
  };
}
function _filtroApi(f) {
  const t = _taxonomias;
  const o = {};
  const g = _idDe(t == null ? void 0 : t.genres, f.genero);
  if (g) o.genres = [g];
  const y = _idDe(t == null ? void 0 : t.years, f.anio);
  if (y) o.years = [y];
  const c = _idDe(t == null ? void 0 : t.countries, f.pais);
  if (c) o.countries = [c];
  const p = _idDe(t == null ? void 0 : t.providers, f.plataforma);
  if (p) o.providers = [p];
  return Object.keys(o).length ? `&filter=${encodeURIComponent(JSON.stringify(o))}` : "";
}
function _opciones(tax, todos, orden) {
  const out = { "": todos };
  const lista = Object.keys(tax || {}).map((id) => ({ id, t: tax[id] }));
  lista.sort((a, b) => orden ? orden(a.t, b.t) : a.t.name.localeCompare(b.t.name));
  for (const { id, t } of lista) out[id] = t.name;
  return out;
}
async function createFilter() {
  const tax = await _leerTaxonomias();
  return {
    tipo: {
      title: "Tipo",
      options: { "": "Todos", movie: "Pel\xEDculas", tvshow: "Series", anime: "Animes" },
      default: "",
      min: 1,
      max: 1
    },
    orden: {
      title: "Orden",
      options: { recent: "Recientes", popular: "M\xE1s vistos" },
      default: "recent",
      min: 1,
      max: 1
    },
    genero: { title: "G\xE9nero", options: _opciones(tax == null ? void 0 : tax.genres, "Todos"), default: "", min: 1, max: 1 },
    anio: {
      title: "A\xF1o",
      options: _opciones(tax == null ? void 0 : tax.years, "Todos", (a, b) => parseInt(b.name, 10) - parseInt(a.name, 10)),
      default: "",
      min: 1,
      max: 1
    },
    pais: { title: "Pa\xEDs", options: _opciones(tax == null ? void 0 : tax.countries, "Todos"), default: "", min: 1, max: 1 },
    plataforma: {
      title: "Plataforma",
      options: _opciones(tax == null ? void 0 : tax.providers, "Todas"),
      default: "",
      min: 1,
      max: 1
    }
  };
}
var POR_PAGINA = 24;
async function _listar(kind, page, f) {
  await _leerTaxonomias();
  const tipo = POST_TYPE[kind];
  const orden = f.orden === "popular" ? "views" : "latest";
  const r = await _datos(
    `/listing/${tipo}?postType=${tipo}&page=${page}&postsPerPage=${POR_PAGINA}&orderBy=${orden}&order=desc${_filtroApi(f)}`
  );
  if (r.pagination && page > r.pagination.last_page) return [];
  return (r.posts || []).map(_itemDe).filter((x) => !!x);
}
async function latest(page, filter) {
  const f = _leerFiltro(filter);
  if (f.kind) return _listar(f.kind, page, f);
  const porTipo = await Promise.all(
    KINDS.map(
      (k) => _listar(k, page, f).catch((e) => {
        console.log(`[lamovie] no se pudo listar ${k}: ${e}`);
        return [];
      })
    )
  );
  return _intercalar(porTipo);
}
function _intercalar(listas) {
  const mezcla = [];
  const vistos = {};
  const masLargo = Math.max(0, ...listas.map((l) => l.length));
  for (let i = 0; i < masLargo; i++) {
    for (const lista of listas) {
      const it = lista[i];
      if (!it || vistos[it.url]) continue;
      vistos[it.url] = true;
      mezcla.push(it);
    }
  }
  return mezcla;
}
async function search(keyword, page, filter) {
  const kw = keyword.trim();
  if (!kw) return latest(page, filter);
  await _leerTaxonomias();
  const f = _leerFiltro(filter);
  const tipo = f.kind ? POST_TYPE[f.kind] : "any";
  const r = await _datos(
    `/search?postType=${tipo}&q=${encodeURIComponent(kw)}&page=${page}&postsPerPage=${POR_PAGINA}${_filtroApi(f)}`
  );
  if (r.pagination && page > r.pagination.last_page) return [];
  const vistas = {};
  const items = [];
  for (const i of r.posts || []) {
    const it = i ? _itemDe(i) : null;
    if (!it || vistas[it.url]) continue;
    vistas[it.url] = true;
    items.push(it);
  }
  return items;
}
var _KIND_DE_SEGMENTO = {
  pelicula: "movie",
  serie: "tvshow",
  anime: "anime",
  peliculas: "movie",
  series: "tvshow",
  animes: "anime",
  novelas: "tvshow"
};
function _referenciaDe(url) {
  const ep = /[?&]ep=(\d+)/.exec(url);
  const t = /\/temporada\/(\d+)\/episodio\/(\d+)/.exec(url) || /[?&]s=(\d+)&e=(\d+)/.exec(url);
  const actual = /\/(pelicula|serie|anime)\/\d+\/([^/?#]+)/.exec(url);
  const vieja = /\/(peliculas|series|animes|novelas)\/([^/?#]+)/.exec(url);
  const suelto = /\/(pelicula|serie|anime)\//.exec(url);
  const m = actual || vieja;
  const seg = m ? m[1] : suelto ? suelto[1] : "";
  const kind = _KIND_DE_SEGMENTO[seg];
  if (!kind) throw new Error("Direcci\xF3n de LaMovie no reconocida");
  const slug = m && m[2] !== "temporada" ? decodeURIComponent(m[2]) : void 0;
  return {
    kind,
    slug,
    temporada: t ? parseInt(t[1], 10) : void 0,
    episodio: t ? parseInt(t[2], 10) : void 0,
    postId: ep ? parseInt(ep[1], 10) : void 0
  };
}
async function _ficha(ref) {
  if (!ref.slug) {
    throw new Error("Este episodio se guard\xF3 con una versi\xF3n vieja: abrilo de nuevo desde la ficha");
  }
  const tipo = POST_TYPE[ref.kind];
  try {
    return await _datos(`/single/${tipo}?slug=${encodeURIComponent(ref.slug)}&postType=${tipo}`);
  } catch (e) {
    const otro = ref.kind === "anime" ? "tvshows" : ref.kind === "tvshow" ? "animes" : null;
    if (!otro) throw new Error("Este t\xEDtulo ya no est\xE1 en LaMovie");
    return _datos(`/single/${otro}?slug=${encodeURIComponent(ref.slug)}&postType=${otro}`);
  }
}
async function _episodiosDeTemporada(id, temporada) {
  const eps = [];
  let temporadas = [];
  for (let page = 1; page <= 20; page++) {
    const r = await _datos(`/single/episodes/list?_id=${id}&season=${encodeURIComponent(temporada)}&page=${page}&postsPerPage=100`);
    if (page === 1) temporadas = (r.seasons || []).map(String);
    eps.push(...r.posts || []);
    if (!r.pagination || page >= r.pagination.last_page) break;
  }
  return { eps, temporadas };
}
async function _temporadas(kind, i) {
  const primera = await _episodiosDeTemporada(i._id, "1");
  const nombres = primera.temporadas.length ? primera.temporadas.slice() : ["1"];
  nombres.sort((a, b) => a === "0" ? 1 : b === "0" ? -1 : parseInt(a, 10) - parseInt(b, 10));
  const porTemporada = await Promise.all(
    nombres.map(
      (n) => n === "1" ? Promise.resolve({ n, eps: primera.eps }) : _episodiosDeTemporada(i._id, n).then((r) => ({ n, eps: r.eps })).catch((e) => {
        console.log(`[lamovie] temporada ${n} sin cargar: ${e}`);
        return { n, eps: [] };
      })
    )
  );
  const temporadas = [];
  for (const { n, eps } of porTemporada) {
    const lista = eps.slice().sort((a, b) => a.episode_number - b.episode_number).map((e) => {
      const min = _numero(e.runtime);
      return {
        title: `Episodio ${e.episode_number}`,
        url: _episodioUrl(kind, i.slug, e),
        thumbnail: _imgTmdb(e.still_path, "w300"),
        duration: min ? min * 60 : void 0,
        airDate: e.date ? e.date.slice(0, 10) : void 0,
        number: e.episode_number
      };
    });
    if (lista.length === 0) continue;
    temporadas.push({ title: n === "0" ? "Especiales" : `Temporada ${n}`, episodes: lista });
  }
  return temporadas;
}
async function detail(url) {
  var _a;
  await _leerTaxonomias();
  const ref = _referenciaDe(url);
  const i = await _ficha(ref);
  const kind = KIND_DE_POST[i.type] || ref.kind;
  const episodios = [];
  let seasons;
  if (kind === "movie") {
    const min = _numero(i.runtime);
    episodios.push({
      title: _titulo(i.title),
      url: `${_itemUrl(kind, i._id, i.slug)}?ep=${i._id}`,
      duration: min ? min * 60 : void 0
    });
  } else {
    seasons = await _temporadas(kind, i);
  }
  const extra = {};
  if (i.original_title && _titulo(i.original_title) !== _titulo(i.title)) {
    extra["T\xEDtulo original"] = i.original_title;
  }
  if (i.certification) extra["Clasificaci\xF3n"] = i.certification;
  const paises = (i.countries || []).map((id) => {
    var _a2;
    return (_a2 = _taxonomias == null ? void 0 : _taxonomias.countries[String(id)]) == null ? void 0 : _a2.name;
  }).filter((x) => !!x);
  if (paises.length) extra["Pa\xEDs"] = paises.join(", ");
  const rating = _numero(i.rating);
  return {
    title: _titulo(i.title),
    cover: _img((_a = i.images) == null ? void 0 : _a.poster),
    description: i.overview || void 0,
    episodes: episodios,
    seasons,
    genres: _generos(i),
    year: _anio(i),
    rating: rating ? Math.round(rating * 10) / 10 : void 0,
    extra,
    type: "bangumi"
  };
}
async function _postIdDe(ref) {
  if (ref.postId) return ref.postId;
  const i = await _ficha(ref);
  if (ref.kind === "movie" || KIND_DE_POST[i.type] === "movie") return i._id;
  if (ref.temporada == null || ref.episodio == null) throw new Error("Falta el episodio a reproducir");
  const { eps } = await _episodiosDeTemporada(i._id, String(ref.temporada));
  const ep = eps.find((e) => e.episode_number === ref.episodio);
  if (!ep) throw new Error("Este episodio ya no est\xE1 en LaMovie");
  return ep._id;
}
async function _embedsDe(ref) {
  const id = await _postIdDe(ref);
  const d = await _datos(`/player?postId=${id}&demo=0`);
  return Array.isArray(d.embeds) ? d.embeds.filter((e) => e && typeof e.url === "string") : [];
}
function _idioma(lang) {
  const l = (lang || "").trim().replace(/Japones/g, "Japon\xE9s").replace(/Ingles/g, "Ingl\xE9s");
  if (!l) return "";
  const sub = /^(.+?)\s*-\s*Subt[ií]tulos?\s+(.+)$/i.exec(l);
  if (sub) return `${sub[1]} (sub. ${sub[2].toLowerCase()})`;
  return l.replace(/\s*-\s*/g, " + ");
}
async function _listaLlega(url, headers, plazoMs = 4e3) {
  if (url.split("?")[0].indexOf(".m3u8") === -1) return true;
  const pedido = sendMessage("request", JSON.stringify([url, { method: "get", headers: headers || {} }])).then((raw) => {
    let t = raw || "";
    try {
      const j = JSON.parse(t);
      if (typeof j === "string") t = j;
    } catch (e) {
    }
    return t.indexOf("#EXTM3U") !== -1;
  }).catch(() => false);
  const plazo = new Promise((ok) => setTimeout(() => ok(true), plazoMs));
  return Promise.race([pedido, plazo]);
}
async function _resolver(embed, lang) {
  var _a, _b, _c;
  const resuelto = await resolver3(embed, `${BASE}/`);
  if (!resuelto) return null;
  if (!await _listaLlega(resuelto.url, resuelto.headers)) {
    console.log(`[lamovie] ${(_b = (_a = servidorDe(embed)) == null ? void 0 : _a.boton) != null ? _b : "servidor"} no entrega el v\xEDdeo (error del servidor): no se ofrece`);
    return null;
  }
  const boton = ((_c = servidorDe(embed)) == null ? void 0 : _c.boton) || "Servidor";
  const idioma = _idioma(lang);
  return {
    url: resuelto.url,
    headers: resuelto.headers,
    quality: idioma ? `${boton} \xB7 ${idioma}` : boton,
    nativo: true
  };
}
async function watch(url) {
  if (servidorDe(url)) {
    const s = await _resolver(url);
    return s ? { streams: [s] } : { streams: [], reason: "servidores_no_disponibles" };
  }
  const ref = _referenciaDe(url);
  const todos = await _embedsDe(ref);
  const vistos = /* @__PURE__ */ new Set();
  const propios = todos.filter((e) => {
    if (!servidorDe(e.url) || vistos.has(e.url)) return false;
    vistos.add(e.url);
    return true;
  });
  if (!propios.length) {
    return { streams: [], reason: todos.length ? "servidores_no_disponibles" : "sin_servidores" };
  }
  const orden = (u) => {
    const s = servidorDe(u);
    return s ? SERVIDORES.indexOf(s) : 99;
  };
  propios.sort((a, b) => orden(a.url) - orden(b.url));
  const resueltos = await Promise.all(propios.map((e) => _resolver(e.url, e.lang).catch(() => null)));
  const streams = resueltos.filter((x) => !!x);
  if (!streams.length) return { streams: [], reason: "servidores_no_disponibles" };
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

// ==PrismHubExtension==
// @name         LaMovie
// @version      1.3.0
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

// extensions/lamovie/servidores/index.ts
var SERVIDORES = [
  { boton: "Vimeos", hosts: ["vimeos"], resolver }
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
async function resolver2(url, referer) {
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
var API = "https://tmdb.allcalidad.re/v1";
var IMG = "https://image.tmdb.org/t/p";
var EMBED = "https://vimeos.net/embed-";
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
var KINDS = ["movie", "tvshow", "anime"];
var SEGMENTO = { movie: "pelicula", tvshow: "serie", anime: "anime" };
function _tipoDeMedio(kind) {
  if (kind === "movie") return "movie";
  if (kind === "anime") return "anime";
  return "series";
}
function _img(path, tam) {
  if (!path) return void 0;
  if (path.indexOf("http") === 0) return path;
  return `${IMG}/${tam}${path.charAt(0) === "/" ? "" : "/"}${path}`;
}
function _itemUrl(kind, id, slug) {
  return `${BASE}/${SEGMENTO[kind]}/${id}/${slug}`;
}
function _episodioUrl(kind, id, temporada, episodio) {
  return `${BASE}/${SEGMENTO[kind]}/${id}/temporada/${temporada}/episodio/${episodio}`;
}
function _anio(i) {
  if (i.year) return i.year;
  const f = i.release_date || i.first_air_date;
  if (!f) return void 0;
  const y = parseInt(f.slice(0, 4), 10);
  return Number.isFinite(y) ? y : void 0;
}
function _generos(i) {
  const g = (i.genres || []).map((t) => t.title).filter((t) => !!t);
  return g.length ? g : void 0;
}
function _itemDe(i) {
  const ultimo = i.latest_episode;
  return {
    title: i.title,
    url: _itemUrl(i.kind, i.tmdb_id, i.slug),
    cover: _img(i.poster_path, "w342"),
    description: i.overview || void 0,
    tags: _generos(i),
    year: _anio(i),
    rating: i.vote_average ? Math.round(i.vote_average * 10) / 10 : void 0,
    type: _tipoDeMedio(i.kind),
    update: ultimo && i.kind !== "movie" ? `T${ultimo.season} E${ultimo.episode}` : void 0
  };
}
var _TIPO_VIEJO = {
  movies: "movie",
  tvshows: "tvshow",
  animes: "anime",
  novels: "tvshow"
};
var _ORDEN_VIEJO = {
  latest: "recent",
  rated: "rating",
  views: "popular"
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
  const orden = o === "recent" || o === "popular" || o === "rating" ? o : o && _ORDEN_VIEJO[o] || "recent";
  const anio = v("anio") ? parseInt(v("anio"), 10) : void 0;
  const genero = v("genero");
  const pais = v("pais");
  return {
    kind,
    orden,
    genero: genero && !/^\d+$/.test(genero) ? genero : void 0,
    anio: anio && Number.isFinite(anio) ? anio : void 0,
    pais: pais && !/^\d+$/.test(pais) ? pais : void 0,
    plataforma: v("plataforma")
  };
}
var _GENEROS_RESPALDO = {
  "acci\xF3n": "Acci\xF3n",
  "action-adventure": "Acci\xF3n y aventura",
  "animaci\xF3n": "Animaci\xF3n",
  "aventura": "Aventura",
  "b\xE9lica": "B\xE9lica",
  "ciencia-ficci\xF3n": "Ciencia ficci\xF3n",
  "sci-fi-fantasy": "Ciencia ficci\xF3n y fantas\xEDa",
  "comedia": "Comedia",
  "crimen": "Crimen",
  "documental": "Documental",
  "drama": "Drama",
  "familia": "Familia",
  "fantas\xEDa": "Fantas\xEDa",
  "historia": "Historia",
  "kids": "Infantil",
  "misterio": "Misterio",
  "m\xFAsica": "M\xFAsica",
  "pel\xEDcula-de-tv": "Pel\xEDcula de TV",
  "reality": "Reality",
  "romance": "Romance",
  "soap": "Telenovela",
  "suspense": "Suspense",
  "terror": "Terror",
  "war-politics": "Guerra y pol\xEDtica",
  "western": "Western"
};
var _PAISES_ES = {
  us: "Estados Unidos",
  gb: "Reino Unido",
  jp: "Jap\xF3n",
  kr: "Corea del Sur",
  mx: "M\xE9xico",
  es: "Espa\xF1a",
  ar: "Argentina",
  co: "Colombia",
  cl: "Chile",
  pe: "Per\xFA",
  ve: "Venezuela",
  br: "Brasil",
  ca: "Canad\xE1",
  fr: "Francia",
  de: "Alemania",
  it: "Italia",
  cn: "China",
  au: "Australia",
  in: "India",
  ie: "Irlanda",
  be: "B\xE9lgica",
  hk: "Hong Kong",
  se: "Suecia",
  pl: "Polonia",
  ru: "Rusia",
  za: "Sud\xE1frica",
  ch: "Suiza",
  th: "Tailandia",
  dk: "Dinamarca",
  nl: "Pa\xEDses Bajos",
  fi: "Finlandia",
  tr: "Turqu\xEDa",
  cz: "Rep\xFAblica Checa",
  no: "Noruega",
  nz: "Nueva Zelanda",
  id: "Indonesia",
  ph: "Filipinas",
  tw: "Taiw\xE1n",
  pt: "Portugal",
  uy: "Uruguay",
  ec: "Ecuador",
  bo: "Bolivia",
  py: "Paraguay",
  cr: "Costa Rica",
  do: "Rep\xFAblica Dominicana",
  pr: "Puerto Rico",
  cu: "Cuba",
  gt: "Guatemala",
  at: "Austria",
  gr: "Grecia",
  hu: "Hungr\xEDa",
  il: "Israel",
  eg: "Egipto",
  ng: "Nigeria",
  my: "Malasia",
  sg: "Singapur",
  ro: "Rumania",
  ua: "Ucrania",
  is: "Islandia",
  lu: "Luxemburgo"
};
var _PLATAFORMAS = [
  "netflix",
  "disney",
  "prime-video",
  "apple-tv",
  "max",
  "hbo-max",
  "hbo",
  "paramount",
  "hulu",
  "crunchyroll",
  "peacock",
  "star-plus",
  "vix",
  "amc"
];
var _taxonomias = null;
async function _leerTaxonomias() {
  if (_taxonomias) return _taxonomias;
  try {
    const t = await _get(`${API}/taxonomies`);
    _taxonomias = {
      generos: t.genres || [],
      anios: (t.years || []).map((y) => y.year).filter((y) => !!y),
      paises: t.countries || [],
      cadenas: t.networks || []
    };
    return _taxonomias;
  } catch (e) {
    console.log(`[lamovie] sin taxonom\xEDas: ${e}`);
    return null;
  }
}
async function createFilter() {
  const tax = await _leerTaxonomias();
  const generos = { "": "Todos" };
  if (tax && tax.generos.length) {
    for (const g of tax.generos) generos[g.slug] = _GENEROS_RESPALDO[g.slug] || g.title;
  } else {
    Object.assign(generos, _GENEROS_RESPALDO);
  }
  const anios = { "": "Todos" };
  const listaAnios = tax && tax.anios.length ? tax.anios.slice().sort((a, b) => b - a) : [];
  if (listaAnios.length === 0) {
    const hoy = (/* @__PURE__ */ new Date()).getFullYear();
    for (let y = hoy; y >= 1960; y--) listaAnios.push(y);
  }
  for (const y of listaAnios) anios[String(y)] = String(y);
  const paises = { "": "Todos" };
  const listaPaises = tax && tax.paises.length ? tax.paises.map((p) => ({ slug: p.slug, nombre: _PAISES_ES[p.slug] || p.title })) : Object.keys(_PAISES_ES).map((slug) => ({ slug, nombre: _PAISES_ES[slug] }));
  listaPaises.sort((a, b) => a.nombre.localeCompare(b.nombre));
  for (const p of listaPaises) paises[p.slug] = p.nombre;
  const plataformas = { "": "Todas" };
  const cadenas = tax ? tax.cadenas : [];
  for (const slug of _PLATAFORMAS) {
    const c = cadenas.find((x) => x.slug === slug);
    if (c || cadenas.length === 0) plataformas[slug] = c ? c.title : slug;
  }
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
      options: { recent: "Recientes", popular: "Populares", rating: "Mejor valorados" },
      default: "recent",
      min: 1,
      max: 1
    },
    genero: { title: "G\xE9nero", options: generos, default: "", min: 1, max: 1 },
    anio: { title: "A\xF1o", options: anios, default: "", min: 1, max: 1 },
    pais: { title: "Pa\xEDs", options: paises, default: "", min: 1, max: 1 },
    plataforma: {
      title: "Plataforma (series y animes)",
      options: plataformas,
      default: "",
      min: 1,
      max: 1
    }
  };
}
var POR_PAGINA = 24;
function _consulta(kind, page, f) {
  let q = `${API}/items?kind=${kind}&sort=${f.orden}&page=${page}&limit=${POR_PAGINA}`;
  if (f.genero) q += `&genre=${encodeURIComponent(f.genero)}`;
  if (f.anio) q += `&year=${f.anio}`;
  if (f.pais) q += `&country=${encodeURIComponent(f.pais)}`;
  if (f.plataforma && kind !== "movie") q += `&network=${encodeURIComponent(f.plataforma)}`;
  return q;
}
function _sirve(i) {
  return i.playable !== false;
}
async function _listar(kind, page, f) {
  const r = await _get(_consulta(kind, page, f));
  return (r.items || []).filter(_sirve).map(_itemDe);
}
async function latest(page, filter) {
  const f = _leerFiltro(filter);
  if (f.kind) return _listar(f.kind, page, f);
  const tipos = f.plataforma ? KINDS.filter((k) => k !== "movie") : KINDS;
  const porTipo = await Promise.all(
    tipos.map(
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
  if (page > 1) return [];
  const f = _leerFiltro(filter);
  let q = `${API}/search?q=${encodeURIComponent(kw)}&limit=100`;
  if (f.kind) q += `&kind=${f.kind}`;
  const r = await _get(q);
  const vistas = {};
  const items = [];
  for (const i of r.items || []) {
    if (!i || !_sirve(i)) continue;
    if (f.kind && i.kind !== f.kind) continue;
    if (f.genero && !(i.genres || []).some((g) => g.slug === f.genero)) continue;
    if (f.anio && _anio(i) !== f.anio) continue;
    if (f.pais && !(i.countries || []).some((c) => c.slug === f.pais)) continue;
    if (f.plataforma && !(i.networks || []).some((c) => c.slug === f.plataforma)) continue;
    const it = _itemDe(i);
    if (vistas[it.url]) continue;
    vistas[it.url] = true;
    items.push(it);
  }
  return items;
}
var _KIND_DE_SEGMENTO = {
  pelicula: "movie",
  serie: "tvshow",
  anime: "anime"
};
async function _referenciaDe(url) {
  const nueva = /\/(pelicula|serie|anime)\/(\d+)(?:\/temporada\/(\d+)\/episodio\/(\d+)|\/[^/?#]*)?/.exec(url);
  if (nueva) {
    return {
      kind: _KIND_DE_SEGMENTO[nueva[1]],
      id: parseInt(nueva[2], 10),
      temporada: nueva[3] ? parseInt(nueva[3], 10) : void 0,
      episodio: nueva[4] ? parseInt(nueva[4], 10) : void 0
    };
  }
  const vieja = /\/(peliculas|series|animes|novelas)\/([^/?#]+)/.exec(url);
  if (!vieja) throw new Error("Direcci\xF3n de LaMovie no reconocida");
  const seg = vieja[1];
  const slug = decodeURIComponent(vieja[2]);
  const aceptados = seg === "peliculas" ? ["movie"] : seg === "animes" ? ["anime", "tvshow"] : ["tvshow", "anime"];
  const r = await _get(
    `${API}/search?q=${encodeURIComponent(slug.replace(/-/g, " "))}&limit=100`
  );
  const obra = (r.items || []).find((i) => i.slug === slug && aceptados.indexOf(i.kind) !== -1);
  if (!obra) throw new Error("Este t\xEDtulo ya no est\xE1 en LaMovie");
  const s = /[?&]s=(\d+)/.exec(url);
  const e = /[?&]e=(\d+)/.exec(url);
  return {
    kind: obra.kind,
    id: obra.tmdb_id,
    temporada: s ? parseInt(s[1], 10) : void 0,
    episodio: e ? parseInt(e[1], 10) : void 0
  };
}
function _estado(s) {
  switch (s) {
    case "Returning Series":
    case "In Production":
      return "ongoing";
    case "Ended":
    case "Canceled":
      return "completed";
    case "Planned":
    case "Post Production":
    case "Rumored":
      return "upcoming";
    default:
      return void 0;
  }
}
async function _temporadas(kind, id) {
  const r = await _get(`${API}/items/${kind}/${id}/seasons`);
  const conVideo = (r.seasons || []).filter((t) => (t.playable_count || 0) > 0).sort((a, b) => a.season === 0 ? 1 : b.season === 0 ? -1 : a.season - b.season);
  const detalles = await Promise.all(
    conVideo.map(
      (t) => _get(`${API}/items/${kind}/${id}/seasons/${t.season}`).then((d) => {
        var _a;
        return { t, episodios: ((_a = d.season) == null ? void 0 : _a.episodes) || [] };
      }).catch((e) => {
        console.log(`[lamovie] temporada ${t.season} sin cargar: ${e}`);
        return { t, episodios: [] };
      })
    )
  );
  const temporadas = [];
  for (const { t, episodios } of detalles) {
    const lista = episodios.filter((e) => e.playable !== false && !!e.code).sort((a, b) => a.episode - b.episode).map((e) => ({
      title: e.title || `Episodio ${e.episode}`,
      url: _episodioUrl(kind, id, e.season, e.episode),
      thumbnail: _img(e.still_path, "w300"),
      duration: e.runtime ? e.runtime * 60 : void 0,
      airDate: e.air_date ? e.air_date.slice(0, 10) : void 0,
      number: e.episode
    }));
    if (lista.length === 0) continue;
    const y = t.air_date ? parseInt(t.air_date.slice(0, 4), 10) : NaN;
    temporadas.push({
      title: t.name || (t.season === 0 ? "Especiales" : `Temporada ${t.season}`),
      episodes: lista,
      year: Number.isFinite(y) ? y : void 0,
      cover: _img(t.poster_path, "w342")
    });
  }
  return temporadas;
}
async function detail(url) {
  const ref = await _referenciaDe(url);
  const r = await _get(`${API}/items/${ref.kind}/${ref.id}`);
  const i = r.item;
  if (!i) throw new Error("No se pudo cargar la ficha en LaMovie");
  const episodios = [];
  let seasons;
  if (i.kind === "movie") {
    if (i.playable !== false && i.code) {
      episodios.push({
        title: i.title,
        url: _itemUrl(i.kind, i.tmdb_id, i.slug),
        duration: i.runtime ? i.runtime * 60 : void 0
      });
    }
  } else {
    seasons = await _temporadas(i.kind, i.tmdb_id);
  }
  const extra = {};
  if (i.original_title && i.original_title !== i.title) extra["T\xEDtulo original"] = i.original_title;
  if (i.certification) extra["Clasificaci\xF3n"] = i.certification;
  const paises = (i.countries || []).map((c) => _PAISES_ES[c.slug] || c.title).filter((x) => !!x);
  if (paises.length) extra["Pa\xEDs"] = paises.join(", ");
  const cadenas = (i.networks || []).map((c) => c.title).filter((x) => !!x);
  if (cadenas.length) extra["Cadena"] = cadenas.join(", ");
  const estudios = (i.studios || []).slice(0, 3).map((c) => c.title).filter((x) => !!x);
  if (estudios.length) extra["Estudio"] = estudios.join(", ");
  return {
    title: i.title,
    cover: _img(i.poster_path, "w500"),
    description: i.overview || void 0,
    episodes: episodios,
    seasons,
    genres: _generos(i),
    status: i.kind === "movie" ? void 0 : _estado(i.status),
    year: _anio(i),
    rating: i.vote_average ? Math.round(i.vote_average * 10) / 10 : void 0,
    extra,
    type: "bangumi"
  };
}
async function _codigoDe(ref) {
  if (ref.kind === "movie") {
    const r2 = await _get(`${API}/items/movie/${ref.id}`);
    return r2.item && r2.item.playable !== false ? r2.item.code || null : null;
  }
  if (ref.temporada == null || ref.episodio == null) {
    throw new Error("Falta el episodio a reproducir");
  }
  const r = await _get(
    `${API}/items/${ref.kind}/${ref.id}/seasons/${ref.temporada}/episodes/${ref.episodio}`
  );
  return r.episode && r.episode.playable !== false ? r.episode.code || null : null;
}
async function _resolver(embed) {
  const resuelto = await resolver2(embed, `${BASE}/`);
  if (!resuelto) return { streams: [], reason: "resolve_failed" };
  return {
    streams: [
      {
        url: resuelto.url,
        headers: resuelto.headers,
        quality: "Vimeos",
        nativo: true
      }
    ]
  };
}
async function watch(url) {
  if (url.indexOf("vimeos.") !== -1) return _resolver(url);
  const ref = await _referenciaDe(url);
  const code = await _codigoDe(ref);
  if (!code) return { streams: [], reason: "not_available" };
  return _resolver(`${EMBED}${code}.html`);
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

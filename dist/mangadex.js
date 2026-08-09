// ==PrismHubExtension==
// @name         MangaDex
// @version      1.0.1
// @author       PrismPlus
// @lang         multi
// @license      MIT
// @package      io.prismhub.mangadex
// @type         manga
// @nsfw         false
// @latestLabel  ultimos-capitulos
// @webSite      https://mangadex.org
// @description  El catálogo de MangaDex, con capítulos en español, inglés, japonés y una veintena de idiomas más.
// ==/PrismHubExtension==
// extensions/mangadex/index.ts
var API = "https://api.mangadex.org";
var PORTADAS = "https://uploads.mangadex.org/covers";
var POR_PAGINA = 32;
async function _get(ruta, params = {}) {
  const partes = [];
  for (const [clave, valor] of Object.entries(params)) {
    if (valor === void 0) continue;
    if (Array.isArray(valor)) {
      for (const v of valor) {
        if (v) partes.push(`${encodeURIComponent(clave)}=${encodeURIComponent(v)}`);
      }
    } else {
      partes.push(`${encodeURIComponent(clave)}=${encodeURIComponent(valor)}`);
    }
  }
  const url = `${API}${ruta}${partes.length ? `?${partes.join("&")}` : ""}`;
  const crudo = await sendMessage(
    "request",
    JSON.stringify([url, { method: "get", headers: { Accept: "application/json" } }])
  );
  return JSON.parse(crudo);
}
var _APTO = ["safe", "suggestive"];
var _TODO = ["safe", "suggestive", "erotica", "pornographic"];
function _clasificacion(filtro) {
  var _a;
  return ((_a = filtro == null ? void 0 : filtro["adulto"]) == null ? void 0 : _a[0]) === "si" ? _TODO : _APTO;
}
function _idiomas(filtro) {
  var _a;
  const elegido = (_a = filtro == null ? void 0 : filtro["idioma"]) == null ? void 0 : _a[0];
  if (elegido) return elegido === "es" ? ["es", "es-la"] : [elegido];
  return ["es", "es-la"];
}
function _titulo(a) {
  var _a, _b, _c, _d, _e, _f, _g;
  const t = (_a = a == null ? void 0 : a.title) != null ? _a : {};
  const alt = (_b = a == null ? void 0 : a.altTitles) != null ? _b : [];
  return (_g = (_f = (_e = (_d = (_c = t.es) != null ? _c : t["es-la"]) != null ? _d : t.en) != null ? _e : Object.values(t)[0]) != null ? _f : alt.map((x) => {
    var _a2, _b2;
    return (_b2 = (_a2 = x.es) != null ? _a2 : x["es-la"]) != null ? _b2 : x.en;
  })[0]) != null ? _g : "Sin t\xEDtulo";
}
function _descripcion(a) {
  var _a, _b, _c, _d;
  const d = (_a = a == null ? void 0 : a.description) != null ? _a : {};
  return (_d = (_c = (_b = d.es) != null ? _b : d["es-la"]) != null ? _c : d.en) != null ? _d : Object.values(d)[0];
}
function _portada(m) {
  var _a, _b;
  const rel = ((_a = m.relationships) != null ? _a : []).find((r) => r.type === "cover_art");
  const archivo = (_b = rel == null ? void 0 : rel.attributes) == null ? void 0 : _b["fileName"];
  return archivo ? `${PORTADAS}/${m.id}/${archivo}.512.jpg` : void 0;
}
function _item(m, actualizacion) {
  var _a;
  const a = (_a = m.attributes) != null ? _a : {};
  return {
    title: _titulo(a),
    url: m.id,
    cover: _portada(m),
    update: actualizacion,
    year: typeof a.year === "number" ? a.year : void 0
  };
}
async function _obrasPorId(ids) {
  var _a;
  const mapa = /* @__PURE__ */ new Map();
  if (!ids.length) return mapa;
  const r = await _get("/manga", {
    limit: String(Math.min(ids.length, 100)),
    "ids[]": ids,
    "includes[]": ["cover_art"],
    // Sin esto la API aplica su clasificación por defecto y descarta obras que
    // YA venían en la lista de capítulos: quedaban tarjetas sin título.
    "contentRating[]": _TODO
  });
  for (const m of (_a = r.data) != null ? _a : []) mapa.set(m.id, m);
  return mapa;
}
async function latest(page) {
  var _a, _b, _c;
  const PIDE = 100;
  const orden = [];
  const capDe = /* @__PURE__ */ new Map();
  const OBJETIVO = 24;
  for (let tanda = 0; tanda < 2; tanda++) {
    const r = await _get("/chapter", {
      limit: String(PIDE),
      offset: String((Math.max(0, page - 1) * 2 + tanda) * PIDE),
      "order[readableAt]": "desc",
      "translatedLanguage[]": _idiomas(),
      "contentRating[]": _APTO,
      includeExternalUrl: "0",
      "includes[]": ["manga"]
    });
    const capitulos = (_a = r.data) != null ? _a : [];
    for (const c of capitulos) {
      const obra = ((_b = c.relationships) != null ? _b : []).find((x) => x.type === "manga");
      if (!obra || capDe.has(obra.id)) continue;
      const n = (_c = c.attributes) == null ? void 0 : _c.chapter;
      capDe.set(obra.id, n ? `Cap. ${n}` : "Nuevo");
      orden.push(obra.id);
    }
    if (orden.length >= OBJETIVO || capitulos.length < PIDE) break;
  }
  const obras = await _obrasPorId(orden.slice(0, 100));
  return orden.map((id) => {
    const m = obras.get(id);
    return m ? _item(m, capDe.get(id)) : null;
  }).filter((x) => x !== null);
}
async function search(keyword, page, filter) {
  var _a, _b, _c, _d, _e, _f;
  const texto = keyword.trim();
  const orden = ((_a = filter == null ? void 0 : filter["orden"]) == null ? void 0 : _a[0]) || "followedCount";
  const r = await _get("/manga", {
    limit: String(POR_PAGINA),
    offset: String(Math.max(0, page - 1) * POR_PAGINA),
    title: texto || void 0,
    // Buscando por texto manda la relevancia; sin texto, lo que se eligió.
    [texto ? "order[relevance]" : `order[${orden}]`]: "desc",
    "contentRating[]": _clasificacion(filter),
    "includes[]": ["cover_art"],
    "includedTags[]": (_b = filter == null ? void 0 : filter["genero"]) == null ? void 0 : _b.filter(Boolean),
    "status[]": (_c = filter == null ? void 0 : filter["estado"]) == null ? void 0 : _c.filter(Boolean),
    "publicationDemographic[]": (_d = filter == null ? void 0 : filter["demografia"]) == null ? void 0 : _d.filter(Boolean),
    "originalLanguage[]": (_e = filter == null ? void 0 : filter["tipo"]) == null ? void 0 : _e.filter(Boolean),
    // Que exista traducido al idioma que se pide: sin esto la búsqueda
    // devuelve obras que después no tienen ni un capítulo que leer.
    "availableTranslatedLanguage[]": _idiomas(filter)
  });
  return ((_f = r.data) != null ? _f : []).map((m) => _item(m));
}
var _GENEROS = {
  "": "Todos",
  "391b0423-d847-456f-aff0-8b0cfc03066b": "Acci\xF3n",
  "87cc87cd-a395-47af-b27a-93258283bbc6": "Aventura",
  "4d32cc48-9f00-4cca-9b5a-a839f0764984": "Comedia",
  "b9af3a63-f058-46de-a9a0-e0c13906197a": "Drama",
  "cdc58593-87dd-415e-bbc0-2ec27bf404cc": "Fantas\xEDa",
  "423e2eae-a7a2-4a8b-ac03-a8351462d71d": "Romance",
  "256c8bd9-4904-4360-bf4f-508a76d67183": "Ciencia Ficci\xF3n",
  "ee968100-4191-4968-93d3-f82d72be7e46": "Misterio",
  "3b60b75c-a2d7-4860-ab56-05f391bb889c": "Psicol\xF3gico",
  "cdad7e68-1419-41dd-bdce-27753074a640": "Horror",
  "07251805-a27e-4d59-b488-f0bfbec15168": "Thriller",
  "69964a64-2f90-4d33-beeb-f3ed2875eb4c": "Deportes",
  "33771934-028e-4cb3-8744-691e866a923e": "Hist\xF3rico",
  "ace04997-f6bd-436e-b261-779182193d3d": "Isekai",
  "f8f62932-27da-4fe4-8ee1-6779a8c5edba": "Tragedia",
  "e5301a23-ebd9-49dd-a0cb-2add944c7fe9": "Recuentos de la vida",
  "50880a9d-5440-4732-9afb-8f457127e836": "Mecha",
  "5ca48985-9a9d-4bd8-be29-80dc0303db72": "Crimen",
  "7064a261-a137-4d3a-8848-2d385de3a99c": "Superh\xE9roes",
  "acc803a4-c95a-4c22-86fc-eb6b582d82a2": "Wuxia",
  "c8cbe35b-1b2b-4a3f-9c37-db84c4514856": "Medicina",
  "81c836c9-914a-4eca-981a-560dad663e73": "Chicas m\xE1gicas",
  "b1e97889-25b4-4258-b28b-cd7f4d28ea9b": "Filos\xF3fico",
  "5920b825-4181-4a17-beeb-9918b0ff7a30": "Boys Love",
  "a3c67850-4684-404e-9b7f-c69850ee5da6": "Girls Love"
};
var _TIPOS = {
  "": "Todos",
  ja: "Manga",
  ko: "Manhwa",
  zh: "Manhua"
};
var _ESTADOS = {
  "": "Todos",
  ongoing: "En emisi\xF3n",
  completed: "Finalizado",
  hiatus: "Pausado",
  cancelled: "Cancelado"
};
var _DEMOGRAFIAS = {
  "": "Todas",
  shounen: "Shounen",
  shoujo: "Shoujo",
  seinen: "Seinen",
  josei: "Josei"
};
var _IDIOMAS = {
  es: "Espa\xF1ol",
  en: "Ingl\xE9s",
  "pt-br": "Portugu\xE9s (Brasil)",
  ja: "Japon\xE9s",
  ko: "Coreano",
  zh: "Chino",
  fr: "Franc\xE9s",
  ru: "Ruso",
  de: "Alem\xE1n",
  it: "Italiano",
  id: "Indonesio",
  vi: "Vietnamita"
};
var _ORDENES = {
  followedCount: "Popularidad",
  latestUploadedChapter: "Actualizaci\xF3n",
  rating: "Valoraci\xF3n",
  createdAt: "Novedad",
  title: "T\xEDtulo"
};
async function createFilter() {
  return {
    // Primero y con `adultOption`: es la marca con la que PrismHub reconoce
    // una puerta a contenido para adultos. Con ella manda siempre el valor
    // seguro desde el Inicio y desde el buscador normal, y solo la abre dentro
    // de la Zona +18.
    adulto: {
      title: "Contenido adulto",
      options: { no: "No", si: "S\xED" },
      default: "no",
      adultOption: "si",
      min: 1,
      max: 1
    },
    idioma: {
      title: "Idioma",
      options: _IDIOMAS,
      default: "es",
      min: 1,
      max: 1
    },
    tipo: { title: "Tipo", options: _TIPOS, default: "", min: 1, max: 1 },
    genero: { title: "G\xE9nero", options: _GENEROS, default: "", min: 1, max: 1 },
    estado: { title: "Estado", options: _ESTADOS, default: "", min: 1, max: 1 },
    demografia: {
      title: "Demograf\xEDa",
      options: _DEMOGRAFIAS,
      default: "",
      min: 1,
      max: 1
    },
    orden: {
      title: "Ordenar por",
      options: _ORDENES,
      default: "followedCount",
      min: 1,
      max: 1
    }
  };
}
var _ESTADO_PRISM = {
  ongoing: "ongoing",
  completed: "completed",
  hiatus: "hiatus",
  cancelled: "completed"
};
async function detail(url) {
  var _a, _b, _c, _d, _e, _f, _g;
  const id = url.trim();
  const r = await _get(`/manga/${id}`, {
    "includes[]": ["cover_art", "author"]
  });
  const m = r.data;
  const a = (_a = m == null ? void 0 : m.attributes) != null ? _a : {};
  const generos = [];
  for (const t of (_b = a.tags) != null ? _b : []) {
    const nombre = (_e = _GENEROS[t.id]) != null ? _e : (_d = (_c = t.attributes) == null ? void 0 : _c.name) == null ? void 0 : _d.en;
    if (nombre) generos.push(nombre);
  }
  const autor = ((_f = m == null ? void 0 : m.relationships) != null ? _f : []).find((x) => x.type === "author");
  const extra = {};
  if ((_g = autor == null ? void 0 : autor.attributes) == null ? void 0 : _g["name"]) extra["Autor"] = String(autor.attributes["name"]);
  const original = a.originalLanguage;
  if (original && _TIPOS[original]) extra["Tipo"] = _TIPOS[original];
  if (a.publicationDemographic) extra["Demograf\xEDa"] = String(a.publicationDemographic);
  return {
    title: m ? _titulo(a) : "Sin t\xEDtulo",
    cover: m ? _portada(m) : void 0,
    description: _descripcion(a),
    genres: generos.length ? generos : void 0,
    status: _ESTADO_PRISM[a.status],
    year: typeof a.year === "number" ? a.year : void 0,
    extra: Object.keys(extra).length ? extra : void 0,
    episodes: await _capitulos(id)
  };
}
var _TANDAS = 5;
async function _capitulos(id) {
  var _a, _b, _c, _d;
  const salida = [];
  const vistos = /* @__PURE__ */ new Set();
  for (let i = 0; i < _TANDAS; i++) {
    const r = await _get(`/manga/${id}/feed`, {
      limit: "100",
      offset: String(i * 100),
      "translatedLanguage[]": _idiomas(),
      "order[chapter]": "asc",
      "order[volume]": "asc",
      // Mismo motivo que en latest: los externos no se pueden leer acá.
      includeExternalUrl: "0",
      "contentRating[]": _TODO
    });
    const tanda = (_a = r.data) != null ? _a : [];
    for (const c of tanda) {
      const at = (_b = c.attributes) != null ? _b : {};
      if (!at.pages) continue;
      const clave = `${(_c = at.volume) != null ? _c : ""}-${(_d = at.chapter) != null ? _d : c.id}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      const numero = at.chapter ? `Cap\xEDtulo ${at.chapter}` : "Oneshot";
      const nombre = at.title ? `${numero}: ${at.title}` : numero;
      salida.push({
        title: nombre,
        url: c.id,
        number: at.chapter ? Number(at.chapter) : void 0,
        airDate: typeof at.publishAt === "string" ? at.publishAt.slice(0, 10) : void 0
      });
    }
    if (tanda.length < 100) break;
  }
  return salida;
}
async function watch(url) {
  var _a, _b, _c;
  const r = await _get(`/at-home/server/${url.trim()}`);
  const base = r.baseUrl;
  const hash = (_a = r.chapter) == null ? void 0 : _a.hash;
  const paginas = (_c = (_b = r.chapter) == null ? void 0 : _b.data) != null ? _c : [];
  if (!base || !hash || !paginas.length) {
    return { urls: [] };
  }
  return { urls: paginas.map((p) => `${base}/data/${hash}/${p}`) };
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

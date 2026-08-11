// ==PrismHubExtension==
// @name         AnimeAV1
// @version      1.0.9
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.animeav1
// @type         bangumi
// @nsfw         false
// @latestLabel  recientemente-agregados
// @webSite      https://animeav1.com
// @description  Anime subtitulado y doblado con catálogo completo, filtros por género, estado, año y letra, y tres de sus cuatro servidores reproduciendo en la app.
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

// extensions/animeav1/servidores/hls/index.ts
var CABECERAS = {
  // La imprescindible. Sin ella, 403 en todos los pedacitos.
  "Sec-Fetch-Site": "same-origin",
  // El resto, leído del pedido real que hace el reproductor de la web.
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  Accept: "*/*",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  Origin: "https://player.zilla-networks.com",
  Referer: "https://player.zilla-networks.com/",
  "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"'
};
async function resolver(url, _referer) {
  var _a;
  const hash = (_a = /\/play\/([a-f0-9]{32})/i.exec(url)) == null ? void 0 : _a[1];
  if (!hash) {
    console.log(`[av1] hls: la direcci\xF3n no trae hash de 32 :: ${url.slice(0, 60)}`);
    return null;
  }
  return {
    url: `https://player.zilla-networks.com/m3u8/${hash}`,
    headers: CABECERAS
  };
}

// extensions/animeav1/servidores/mega/index.ts
async function resolver2(_url, _referer) {
  return null;
}

// extensions/animeav1/servidores/comun.ts
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
    console.log(`[av1] no se pudo pedir ${url.slice(0, 45)} :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return null;
  }
}

// extensions/animeav1/servidores/mp4upload/index.ts
async function resolver3(url, referer) {
  var _a;
  const html = await pedir(url, referer);
  if (!html) return null;
  const candidatos = (_a = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g)) != null ? _a : [];
  const real = candidatos.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) {
    console.log("[av1] mp4upload: la p\xE1gina del embed no tra\xEDa ning\xFAn mp4");
    return null;
  }
  return { url: real, headers: { Referer: "https://www.mp4upload.com/" } };
}

// extensions/animeav1/servidores/upnshare/index.ts
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
    console.log(`[av1] upnshare: no se pudo descifrar :: ${(_a = e == null ? void 0 : e.message) != null ? _a : e}`);
    return "";
  }
}
var CABECERAS2 = {
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
async function resolver4(url, _referer) {
  var _a, _b, _c, _d, _e;
  const id = (_a = /#([A-Za-z0-9_-]{3,20})/.exec(url)) == null ? void 0 : _a[1];
  if (!id) {
    console.log(`[av1] upnshare: la direcci\xF3n no trae id en el # :: ${url.slice(0, 60)}`);
    return null;
  }
  const hexVideo = await pedir(`${BASE}/api/v1/video?id=${id}`, `${BASE}/`);
  const claroVideo = hexVideo ? descifrar(hexVideo) : "";
  const master = (_c = (_b = /"source"\s*:\s*"([^"]+)"/.exec(claroVideo)) == null ? void 0 : _b[1]) == null ? void 0 : _c.replace(/\\\//g, "/");
  if (master && master.indexOf(".m3u8") !== -1) {
    return { url: master, headers: CABECERAS2 };
  }
  console.log("[av1] upnshare: sin lista maestra, se cae al mp4 de una calidad");
  const hex = await pedir(`${BASE}/api/v1/download?id=${id}`, `${BASE}/`);
  if (!hex) return null;
  const claro = descifrar(hex);
  if (!claro) return null;
  const mp4 = (_e = (_d = /"mp4"\s*:\s*"([^"]+)"/.exec(claro)) == null ? void 0 : _d[1]) == null ? void 0 : _e.replace(/\\\//g, "/");
  if (!mp4) {
    console.log("[av1] upnshare: se descifr\xF3 pero no hab\xEDa mp4 adentro");
    return null;
  }
  return { url: mp4, headers: CABECERAS2 };
}

// extensions/animeav1/servidores/index.ts
var SERVIDORES = [
  {
    boton: "HLS",
    hosts: ["zilla-networks"],
    botones: 122,
    nativo: true,
    resolver
  },
  {
    boton: "UPNShare",
    hosts: ["uns.bio", "upns."],
    botones: 123,
    nativo: true,
    resolver: resolver4
  },
  {
    boton: "MP4Upload",
    hosts: ["mp4upload"],
    botones: 122,
    nativo: true,
    resolver: resolver3
  },
  {
    boton: "Mega",
    hosts: ["mega.nz", "mega.co.nz"],
    botones: 122,
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
  console.log(`[av1] servidor desconocido, va al navegador: ${url.slice(0, 60)}`);
  return null;
}

// extensions/animeav1/index.ts
var BASE2 = "https://animeav1.com";
var CDN = "https://cdn.animeav1.com";
async function _get(url) {
  const raw = await sendMessage(
    "request",
    JSON.stringify([
      url,
      {
        method: "get",
        headers: { Referer: `${BASE2}/`, "User-Agent": UA_ESCRITORIO }
      }
    ])
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
  return `${BASE2}${url.startsWith("/") ? "" : "/"}${url}`;
}
function _unescapeJs(s) {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\n/g, "\n").replace(/\\r/g, "").replace(/\\t/g, " ").replace(/\\\//g, "/").replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, "\\");
}
var _CARD_MARKER = 'class="aspect-poster';
var _CARD_FALLBACK_RE = /href="(\/media\/[a-z0-9-]+)"[^>]*>\s*<span class="sr-only">Ver ([^<]+)<\/span>/g;
function _parseCatalog(html, dentro) {
  var _a, _b, _c;
  const items = [];
  const seen = dentro != null ? dentro : {};
  const chunks = html.split(_CARD_MARKER);
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const title = (_a = /alt="Portada de ([^"]*)"/.exec(chunk)) == null ? void 0 : _a[1];
    if (!title) continue;
    const href = (_b = /href="(\/media\/[a-z0-9-]+)"/.exec(chunk)) == null ? void 0 : _b[1];
    if (!href) continue;
    const url = `${BASE2}${href}`;
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
    const url = `${BASE2}${m[1]}`;
    if (seen[url]) continue;
    seen[url] = true;
    items.push({ title: decodeEntities(m[2].trim()), url });
  }
  return items;
}
async function latest(page) {
  if (page > 1) {
    const html = await _get(`${BASE2}/catalogo?page=${page}`);
    return _parseCatalog(html);
  }
  const [portada, catalogo] = await Promise.all([_get(`${BASE2}/`), _get(`${BASE2}/catalogo`)]);
  const vistos = {};
  const items = _parseCatalog(portada, vistos);
  return items.concat(_parseCatalog(catalogo, vistos));
}
async function search(keyword, page, filter) {
  var _a, _b, _c, _d;
  const years = (_a = filter == null ? void 0 : filter["anio"]) == null ? void 0 : _a[0];
  const query = _buildQuery({
    search: keyword.trim() || void 0,
    genre: filter == null ? void 0 : filter["genero"],
    status: ((_b = filter == null ? void 0 : filter["estado"]) == null ? void 0 : _b[0]) || void 0,
    order: ((_c = filter == null ? void 0 : filter["orden"]) == null ? void 0 : _c[0]) || void 0,
    letter: ((_d = filter == null ? void 0 : filter["letra"]) == null ? void 0 : _d[0]) || void 0,
    minYear: years ? years.split("-")[0] : void 0,
    maxYear: years ? years.split("-")[1] : void 0,
    page: page > 1 ? String(page) : void 0
  });
  const html = await _get(`${BASE2}/catalogo${query ? `?${query}` : ""}`);
  return _parseCatalog(html);
}
var _GENRE_OPTIONS = {
  "": "Todos",
  accion: "Acci\xF3n",
  antropomorfico: "Antropom\xF3rfico",
  "artes-marciales": "Artes Marciales",
  aventura: "Aventura",
  carreras: "Carreras",
  "ciencia-ficcion": "Ciencia Ficci\xF3n",
  comedia: "Comedia",
  deportes: "Deportes",
  detectives: "Detectives",
  drama: "Drama",
  ecchi: "Ecchi",
  "elenco-adulto": "Elenco Adulto",
  escolares: "Escolares",
  espacial: "Espacial",
  fantasia: "Fantas\xEDa",
  gore: "Gore",
  gourmet: "Gourmet",
  harem: "Harem",
  historico: "Hist\xF3rico",
  "idols-hombre": "Idols (Hombre)",
  "idols-mujer": "Idols (Mujer)",
  infantil: "Infantil",
  isekai: "Isekai",
  josei: "Josei",
  "juegos-estrategia": "Juegos Estrategia",
  "mahou-shoujo": "Mahou Shoujo",
  mecha: "Mecha",
  militar: "Militar",
  misterio: "Misterio",
  mitologia: "Mitolog\xEDa",
  musica: "M\xFAsica",
  parodia: "Parodia",
  psicologico: "Psicol\xF3gico",
  "recuentos-de-la-vida": "Recuentos de la Vida",
  romance: "Romance",
  samurai: "Samurai",
  seinen: "Seinen",
  shoujo: "Shoujo",
  "shoujo-ai": "Shoujo Ai",
  shounen: "Shounen",
  "shounen-ai": "Shounen Ai",
  sobrenatural: "Sobrenatural",
  superpoderes: "Superpoderes",
  suspenso: "Suspenso",
  terror: "Terror",
  vampiros: "Vampiros"
};
var _STATUS_OPTIONS = {
  "": "Todos",
  emision: "En emisi\xF3n",
  finalizado: "Finalizado",
  proximamente: "Pr\xF3ximamente"
};
var _ORDER_OPTIONS = {
  "": "Por defecto",
  popular: "M\xE1s populares",
  score: "Mejor puntuados",
  title: "Por t\xEDtulo"
};
var _YEAR_OPTIONS = {
  "": "Todos",
  "2020-2026": "2020 - 2026",
  "2015-2019": "2015 - 2019",
  "2010-2014": "2010 - 2014",
  "2000-2009": "2000 - 2009",
  "1990-1999": "1990 - 1999",
  "1960-1989": "Antes de 1990"
};
var _LETTER_OPTIONS = { "": "Todas" };
for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") _LETTER_OPTIONS[c] = c;
async function createFilter() {
  return {
    // Varios géneros a la vez, igual que los checkboxes del propio sitio:
    // repetir `genre=` en la URL los combina como "cualquiera de estos"
    // (comprobado: mecha 317 + vampiros 84 → los dos juntos, 401, que da
    // exacto). Ojo, la forma con coma (`genre=mecha,vampiros`) el sitio la
    // IGNORA y devuelve el catálogo entero, así que hay que mandarlos
    // repetidos — es lo que hace _buildQuery con un array.
    genero: { title: "G\xE9nero", options: _GENRE_OPTIONS, default: "", min: 1, max: 6 },
    estado: { title: "Estado", options: _STATUS_OPTIONS, default: "", min: 1, max: 1 },
    orden: { title: "Orden", options: _ORDER_OPTIONS, default: "", min: 1, max: 1 },
    anio: { title: "A\xF1o", options: _YEAR_OPTIONS, default: "", min: 1, max: 1 },
    letra: { title: "Letra", options: _LETTER_OPTIONS, default: "", min: 1, max: 1 }
  };
}
var _ESTADOS = { "0": "completed", "2": "ongoing" };
async function detail(url) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  const slug = fullUrl.replace(`${BASE2}/media/`, "").replace(/\/$/, "");
  const blobStart = html.indexOf("media:{id:");
  const blob = blobStart >= 0 ? html.slice(blobStart, blobStart + 8e3) : "";
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
  const categoryName = _unescapeJs(
    (_n = (_m = /category:\{[^}]*?name:"((?:[^"\\]|\\.)*)"/.exec(blob)) == null ? void 0 : _m[1]) != null ? _n : ""
  );
  const esUnico = numbers.length === 1;
  const nombreEpisodio = (n) => esUnico && n === 0 ? "Ver" : `Episodio ${n}`;
  const episodes = numbers.map((n) => ({
    title: nombreEpisodio(n),
    url: `${BASE2}/media/${slug}/${n}`,
    number: n,
    // Miniatura propia de cada episodio. Existen y responden: comprobadas 20
    // de 20 sobre diez títulos (el primero y el último episodio de cada uno).
    //
    // **Hoy no llegan a la app y no es cosa de la extensión**: el empaquetador
    // del repo aplana la lista a `{title:'Episodios', urls:[{name,url}]}`, así
    // que `thumbnail`, `airDate` y `number` se pierden en el camino
    // (comprobado el 2026-08-10 corriendo el bundle ya compilado). Es el
    // pendiente que ya está anotado para la 1.0.26. Se manda igual: el campo
    // es parte del contrato, está bien medido, y el día que el empaquetador
    // deje de aplanarlo esto anda solo.
    thumbnail: id ? `${CDN}/screenshots/${id}/${n}.jpg` : void 0
  }));
  if (episodes.length === 0) {
    const seen = {};
    for (const m of html.matchAll(/href="\/media\/[a-z0-9-]+\/(\d+)"/g)) {
      if (seen[m[1]]) continue;
      seen[m[1]] = true;
      episodes.push({
        title: `Episodio ${m[1]}`,
        url: `${BASE2}/media/${slug}/${m[1]}`,
        number: Number(m[1])
      });
    }
    episodes.sort((a, b) => {
      var _a2, _b2;
      return ((_a2 = a.number) != null ? _a2 : 0) - ((_b2 = b.number) != null ? _b2 : 0);
    });
  }
  const yearStr = (_o = /startDate:"(\d{4})/.exec(blob)) == null ? void 0 : _o[1];
  const yearNum = yearStr ? Number(yearStr) : void 0;
  const year = yearNum && yearNum >= 1960 && yearNum <= 2100 ? yearNum : void 0;
  const scoreStr = (_p = /score:([\d.]+)/.exec(blob)) == null ? void 0 : _p[1];
  const score = scoreStr ? Number(scoreStr) : void 0;
  const extra = {};
  if (categoryName) extra["Tipo"] = categoryName;
  const aka = (_r = (_q = /aka:\{([^}]*)\}/.exec(blob)) == null ? void 0 : _q[1]) != null ? _r : "";
  const akaJa = _unescapeJs((_t = (_s = /"ja-jp":"((?:[^"\\]|\\.)*)"/.exec(aka)) == null ? void 0 : _s[1]) != null ? _t : "");
  const akaEn = _unescapeJs((_v = (_u = /"en-us":"((?:[^"\\]|\\.)*)"/.exec(aka)) == null ? void 0 : _u[1]) != null ? _v : "");
  if (akaJa) extra["T\xEDtulo original"] = akaJa;
  if (akaEn) extra["Tambi\xE9n conocido como"] = akaEn;
  const votos = (_w = /votes:(\d+)/.exec(blob)) == null ? void 0 : _w[1];
  if (votos && Number(votos) > 0) extra["Votos"] = votos;
  const proximo = (_x = /nextDate:"(\d{4}-\d{2}-\d{2})/.exec(blob)) == null ? void 0 : _x[1];
  if (proximo) extra["Pr\xF3ximo episodio"] = proximo;
  const estado = _ESTADOS[(_z = (_y = /,status:(\d+)/.exec(blob)) == null ? void 0 : _y[1]) != null ? _z : ""];
  return {
    title,
    cover,
    description,
    genres,
    episodes,
    year,
    status: estado,
    rating: score && score > 0 ? score : void 0,
    extra: Object.keys(extra).length > 0 ? extra : void 0
  };
}
var _IDIOMAS = { SUB: "SUB", DUB: "DUB" };
function _estaRota(url) {
  return /\/embed-undef(?:ined)?\.html/i.test(url) || /[?#/]undefined(?:[?#/&]|$)/i.test(url);
}
async function watch(url) {
  var _a, _b, _c, _d;
  if (url.indexOf("http") === 0 && url.indexOf("animeav1.com") === -1) {
    try {
      const res = await resolverServidor(url, `${BASE2}/`);
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
    embedsBlock = downloadsAt > 0 ? rest.slice(0, downloadsAt) : rest.slice(0, 6e3);
  }
  const porIdioma = [];
  for (const m of embedsBlock.matchAll(/([A-Z]{2,5}):\[([\s\S]*?)\]/g)) {
    const idioma = _IDIOMAS[m[1]];
    if (!idioma) continue;
    for (const s of m[2].matchAll(/server:"((?:[^"\\]|\\.)*)",url:"((?:[^"\\]|\\.)*)"/g)) {
      const direccion = _unescapeJs(s[2]);
      if (_estaRota(direccion)) {
        console.log(`[av1] el sitio publica un enlace roto, se descarta: ${direccion}`);
        continue;
      }
      porIdioma.push({
        idioma,
        server: _unescapeJs(s[1]),
        url: direccion
      });
    }
  }
  const streams = [];
  const seen = {};
  const idiomas = ["SUB", "DUB"];
  const vistosIdioma = {};
  let cuantosIdiomas = 0;
  for (const e of porIdioma) {
    if (vistosIdioma[e.idioma]) continue;
    vistosIdioma[e.idioma] = true;
    cuantosIdiomas++;
  }
  const variosIdiomas = cuantosIdiomas > 1;
  for (const idioma of idiomas) {
    const delIdioma = porIdioma.filter((e) => e.idioma === idioma);
    const conFicha = delIdioma.map((e) => __spreadProps(__spreadValues({}, e), { ficha: fichaDe(e.url) })).sort((a, b) => {
      var _a2, _b2, _c2;
      return ((_a2 = a.ficha) == null ? void 0 : _a2.nativo) === ((_b2 = b.ficha) == null ? void 0 : _b2.nativo) ? 0 : ((_c2 = a.ficha) == null ? void 0 : _c2.nativo) ? -1 : 1;
    });
    for (const e of conFicha) {
      if (!e.url || seen[e.url]) continue;
      if (((_a = e.ficha) == null ? void 0 : _a.boton) === "Mega") continue;
      seen[e.url] = true;
      streams.push({
        url: e.url,
        // Con el idioma pegado al nombre: sin eso, un episodio con doblaje
        // muestra "HLS" dos veces y no hay forma de saber cuál es cuál.
        quality: variosIdiomas ? `${e.server} \xB7 ${e.idioma}` : e.server,
        // El rayo y el mundo salen de la tabla de `servidores/`, que es donde
        // está lo que se midió de cada uno. Sin esto la app lo adivina por el
        // nombre, y acá le erraría a dos: "HLS" no es el nombre de ningún
        // servidor conocido, y Mega reproduce solo en el navegador.
        nativo: (_b = e.ficha) == null ? void 0 : _b.nativo
      });
    }
  }
  if (streams.length === 0) {
    const iframe = (_c = /<iframe[^>]+src="([^"]+)"/i.exec(html)) == null ? void 0 : _c[1];
    if (iframe) {
      streams.push({ url: iframe, quality: "Servidor", nativo: (_d = fichaDe(iframe)) == null ? void 0 : _d.nativo });
    }
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

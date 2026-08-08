// ==PrismHubExtension==
// @name         Ikigai Mangas
// @version      1.1.4
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.ikigai
// @type         mixedReading
// @nsfw         false
// @latestLabel  nuevos-capitulos
// @webSite      https://visorikigai.gettocaboca.com
// @description  Cómics, manhwas y novelas ligeras en español. Catálogo grande con filtros por tipo, género y orden.
// ==/PrismHubExtension==
// extensions/ikigai/index.ts
var BASE = "https://visorikigai.gettocaboca.com";
var LECTOR = "https://viralikigai.radiot.space";
async function _html(url) {
  return sendMessage(
    "request",
    JSON.stringify([url, { method: "get", headers: { Referer: BASE + "/" } }])
  );
}
function _decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").trim();
}
function _stripTags(s) {
  return _decode(s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}
function _itemsDe(html) {
  const items = [];
  const vistos = /* @__PURE__ */ new Set();
  const re = /href="\/series\/([a-z0-9-]+)\/"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const slug = m[1];
    if (vistos.has(slug)) continue;
    const dentro = html.slice(m.index, m.index + 1200);
    const img = /<img[^>]+src="([^"]+)"[^>]*>/.exec(dentro);
    if (img && /rs:fill:80:110/.test(img[1])) continue;
    const alt = /<img[^>]+alt="([^"]*)"/.exec(dentro);
    const titulo = alt ? _decode(alt[1]) : _stripTags(dentro).slice(0, 120);
    if (!titulo) continue;
    vistos.add(slug);
    items.push({
      title: titulo,
      url: slug,
      cover: img ? _decode(img[1]) : void 0
    });
  }
  return items;
}
function _consulta(page, filter, extra) {
  var _a, _b;
  const partes = [];
  const uno = (k) => {
    var _a2, _b2;
    return (_b2 = (_a2 = filter == null ? void 0 : filter[k]) == null ? void 0 : _a2[0]) != null ? _b2 : "";
  };
  const tipo = uno("tipo");
  if (tipo) partes.push(`tipos[]=${encodeURIComponent(tipo)}`);
  const genero = uno("genero");
  if (genero) partes.push(`generos[]=${encodeURIComponent(genero)}`);
  const ordenar = (_a = extra == null ? void 0 : extra["ordenar"]) != null ? _a : uno("ordenar");
  if (ordenar) partes.push(`ordenar=${encodeURIComponent(ordenar)}`);
  const direccion = (_b = extra == null ? void 0 : extra["direccion"]) != null ? _b : uno("direccion");
  if (direccion) partes.push(`direccion=${encodeURIComponent(direccion)}`);
  partes.push(`pagina=${page}`);
  return `${BASE}/series/?${partes.join("&")}`;
}
async function latest(page) {
  const html = await _html(
    _consulta(page, void 0, { ordenar: "last_chapter_date", direccion: "desc" })
  );
  return _itemsDe(html);
}
var PAGINAS_BUSQUEDA = 30;
var PAGINAS_POR_TANDA = 6;
var RESULTADOS_OBJETIVO = 24;
var RESULTADOS_SUFICIENTES = 5;
var LARGO_ESPECIFICO = 8;
function _normalizar(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}
var TOPE_PAGINAS = 400;
var VENTANA = 3;
var PRIMERA_ORDENADA = 3;
var PAGINAS_SUELTAS = [1, 2];
function _pagCache() {
  return /* @__PURE__ */ new Map();
}
async function _paginaDelPrefijo(prefijo, filter, pagina) {
  let lo = PRIMERA_ORDENADA;
  let hi = TOPE_PAGINAS;
  while (lo < hi) {
    const medio = lo + hi >> 1;
    const items = await pagina(medio);
    if (items.length === 0 || items[0].title >= prefijo) hi = medio;
    else lo = medio + 1;
  }
  return lo;
}
async function _porPrincipioDelTitulo(keyword, filter, cache) {
  const pagina = (n) => {
    const clave = String(n);
    let p = cache.get(clave);
    if (!p) {
      p = (async () => {
        try {
          return _itemsDe(
            await _html(_consulta(n, filter, { ordenar: "name", direccion: "asc" }))
          );
        } catch (e) {
          return [];
        }
      })();
      cache.set(clave, p);
    }
    return p;
  };
  const inicial = keyword.slice(0, 1);
  const variantes = [.../* @__PURE__ */ new Set([
    inicial.toUpperCase() + keyword.slice(1),
    inicial.toLowerCase() + keyword.slice(1)
  ])];
  const buscado = _normalizar(keyword);
  const salida = [];
  const vistos = /* @__PURE__ */ new Set();
  const recoger = (items) => {
    for (const it of items) {
      if (vistos.has(it.url)) continue;
      vistos.add(it.url);
      if (_normalizar(it.title).startsWith(buscado)) salida.push(it);
    }
  };
  recoger((await Promise.all(PAGINAS_SUELTAS.map(pagina))).flat());
  for (const prefijo of variantes) {
    const centro = await _paginaDelPrefijo(prefijo, filter, pagina);
    const lote = await Promise.all(
      Array.from({ length: VENTANA * 2 }, (_, k) => centro - VENTANA + k).filter((n) => n >= PRIMERA_ORDENADA && n <= TOPE_PAGINAS).map(pagina)
    );
    for (const items of lote) recoger(items);
    if (salida.length > 0) break;
  }
  return salida;
}
async function search(keyword, page, filter) {
  if (!keyword || !keyword.trim()) {
    return _itemsDe(await _html(_consulta(page, filter)));
  }
  const buscado = _normalizar(keyword);
  const encontrados = [];
  const vistos = /* @__PURE__ */ new Set();
  try {
    for (const it of await _porPrincipioDelTitulo(keyword, filter, _pagCache())) {
      if (vistos.has(it.url)) continue;
      vistos.add(it.url);
      encontrados.push(it);
    }
  } catch (e) {
  }
  const porPrefijo = encontrados.length;
  const especifica = buscado.length >= LARGO_ESPECIFICO;
  if (porPrefijo >= RESULTADOS_SUFICIENTES || porPrefijo > 0 && especifica) {
    encontrados.sort((a, b) => a.title.localeCompare(b.title, "es"));
    const porPagina0 = 24;
    return encontrados.slice((page - 1) * porPagina0, (page - 1) * porPagina0 + porPagina0);
  }
  for (let p = 1; p <= PAGINAS_BUSQUEDA; p += PAGINAS_POR_TANDA) {
    const tanda = [];
    for (let k = p; k < p + PAGINAS_POR_TANDA && k <= PAGINAS_BUSQUEDA; k++) {
      tanda.push(k);
    }
    const htmls = await Promise.all(
      tanda.map(async (k) => {
        try {
          return await _html(_consulta(k, filter));
        } catch (e) {
          return "";
        }
      })
    );
    let huboItems = false;
    for (const html of htmls) {
      if (!html) continue;
      const lote = _itemsDe(html);
      if (lote.length > 0) huboItems = true;
      for (const it of lote) {
        if (vistos.has(it.url)) continue;
        vistos.add(it.url);
        if (_normalizar(it.title).includes(buscado)) encontrados.push(it);
      }
    }
    if (!huboItems) break;
    if (encontrados.length >= RESULTADOS_OBJETIVO) break;
  }
  const abc = (a, b) => a.title.localeCompare(b.title, "es");
  const cabeza = encontrados.slice(0, porPrefijo).sort(abc);
  const resto = encontrados.slice(porPrefijo).sort(abc);
  encontrados.length = 0;
  encontrados.push(...cabeza, ...resto);
  const porPagina = 24;
  const desde = (page - 1) * porPagina;
  return encontrados.slice(desde, desde + porPagina);
}
var GENEROS = {
  "": "Todos",
  "906397904327999491": "Acci\xF3n",
  "906409527934582787": "Adulto",
  "906397904061530115": "Aventura",
  "906409351330037763": "Boys Love",
  "906398112851165187": "Comedia",
  "906397903933407235": "Drama",
  "906397894348570627": "Fantas\xEDa",
  "906397894527549443": "Romance",
  "906397894408372227": "Shoujo",
  "906409351272792067": "+18"
};
async function createFilter() {
  return {
    // Sin "Manga": el menu del sitio enlaza ?tipos[]=manga pero el catalogo no
    // tiene ninguna serie con ese tipo, asi que elegirlo llevaba a una lista
    // vacia. Novela va antes que Comic porque los comics son ~5300 de las
    // ~5700 series: su primera pagina es identica a la de "Todos" y no deja
    // ver que el filtro hizo algo.
    tipo: {
      title: "Tipo",
      options: { "": "Todos", novel: "Novela", comic: "C\xF3mic" },
      default: "",
      min: 1,
      max: 1
    },
    genero: { title: "G\xE9nero", options: GENEROS, default: "", min: 1, max: 1 },
    ordenar: {
      title: "Ordenar por",
      options: {
        last_chapter_date: "Actualizaci\xF3n reciente",
        name: "Nombre",
        created_at: "M\xE1s nuevos",
        view_count: "M\xE1s vistos",
        bookmark_count: "M\xE1s guardados",
        rating_count: "Mejor valorados"
      },
      default: "last_chapter_date",
      min: 1,
      max: 1
    },
    direccion: {
      title: "Orden",
      options: { desc: "Descendente", asc: "Ascendente" },
      default: "desc",
      min: 1,
      max: 1
    }
  };
}
async function detail(slug) {
  const url = `${BASE}/series/${encodeURIComponent(slug)}/`;
  const completo = await _html(url);
  const iniMain = completo.indexOf("<main");
  const finMain = completo.lastIndexOf("</main>");
  const html = iniMain !== -1 && finMain > iniMain ? completo.slice(iniMain, finMain) : completo;
  const tituloCrudo = /<title[^>]*>([\s\S]*?)<\/title>/.exec(completo);
  const title = tituloCrudo ? _decode(tituloCrudo[1]).replace(/\s*\|\s*Ikigai Mangas\s*$/i, "") : slug;
  const desc = /<meta[^>]+name="description"[^>]+content="([^"]*)"/.exec(completo);
  const description = desc ? _decode(desc[1]) : "";
  let cover;
  const imgs = html.match(/https:\/\/image\d?\.ikigaimangas\.cloud\/[^"'\s]+/g) || [];
  for (const u of imgs) {
    if (/rs:fill:80:110/.test(u)) continue;
    cover = u;
    break;
  }
  const episodes = [];
  const vistos = /* @__PURE__ */ new Set();
  const reCap = /href="\/capitulo\/(\d+)\/"/g;
  let m;
  while ((m = reCap.exec(html)) !== null) {
    const id = m[1];
    if (vistos.has(id)) continue;
    const texto = _stripTags(html.slice(m.index, m.index + 500));
    if (/^(primer|último|ultimo)\s+cap/i.test(texto)) continue;
    vistos.add(id);
    const num = /cap[íi]tulo\s*([\d.]+)/i.exec(texto);
    const enc = /(cap[íi]tulo\s*[\d.]+(?:\s*:\s*[^<]{1,60})?)/i.exec(texto);
    episodes.push({
      title: enc ? enc[1].trim() : `Cap\xEDtulo ${num ? num[1] : episodes.length + 1}`,
      url: id,
      number: num ? Number(num[1]) : void 0
    });
  }
  episodes.sort((a, b) => {
    if (a.number == null && b.number == null) return 0;
    if (a.number == null) return 1;
    if (b.number == null) return -1;
    return a.number - b.number;
  });
  const genres = [];
  const reGen = /href="\/series\/\?[^"]*generos\[\]=\d+"[^>]*>([^<]{1,40})</g;
  while ((m = reGen.exec(html)) !== null) {
    const nombre = _decode(m[1]);
    if (nombre && !genres.includes(nombre)) genres.push(nombre);
  }
  const plano = _stripTags(html);
  const status = /\bcompleta\b/i.test(plano) ? "completed" : /\bhiatus\b/i.test(plano) ? "hiatus" : /\ben curso\b/i.test(plano) ? "ongoing" : void 0;
  const esNovela = /(^|>)\s*Novela\s*(<|$)/i.test(html) || /-novela\/?$/i.test(slug) || /\bnovela\b/i.test(title);
  const type = esNovela ? "fikushon" : "manga";
  return { title, cover, description, episodes, genres, status, type };
}
function _cuerpoDelCapitulo(html) {
  const abre = /<div[^>]*\bclass="[^"]*\bprose\b[^"]*"[^>]*>/i.exec(html);
  if (!abre) return null;
  let nivel = 1;
  let i = abre.index + abre[0].length;
  const desde = i;
  const re = /<\/?div\b/gi;
  re.lastIndex = i;
  let m;
  while ((m = re.exec(html)) !== null) {
    nivel += m[0][1] === "/" ? -1 : 1;
    if (nivel === 0) return html.slice(desde, m.index);
    i = re.lastIndex;
  }
  return html.slice(desde);
}
function _parrafosDe(html) {
  const cuerpo = _cuerpoDelCapitulo(html);
  if (cuerpo === null) return [];
  const limpio = cuerpo.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const parrafos = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(limpio)) !== null) {
    const texto = _stripTags(m[1].replace(/<br\s*\/?>/gi, "\n"));
    if (texto.length > 0) parrafos.push(texto);
  }
  return parrafos;
}
async function watch(chapterId) {
  const url = `${LECTOR}/capitulo/${encodeURIComponent(chapterId)}/?forceSetTheme=dark&forceSetNsfw=true&userHasLogin=false`;
  const html = await _html(url);
  const urls = [];
  const vistos = /* @__PURE__ */ new Set();
  const re = /https:\/\/image\d?\.ikigaimangas\.cloud\/[^"'\s\\]+?\.(?:webp|jpg|jpeg|png)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const u = _decode(m[0]);
    if (/rs:fill/.test(u)) continue;
    if (!/\/series\/\d+\/\d+\//.test(u)) continue;
    if (vistos.has(u)) continue;
    vistos.add(u);
    urls.push(u);
  }
  const numeroDe = (u) => {
    const nombre = u.slice(u.lastIndexOf("/") + 1);
    const m2 = /(\d+)\.[a-z]+$/.exec(nombre);
    return m2 ? Number(m2[1]) : null;
  };
  urls.sort((a, b) => {
    const na = numeroDe(a);
    const nb = numeroDe(b);
    if (na == null && nb == null) return 0;
    if (na == null) return 1;
    if (nb == null) return -1;
    return na - nb;
  });
  if (urls.length > 0) {
    return { urls, headers: { Referer: LECTOR + "/" } };
  }
  const parrafos = _parrafosDe(html);
  if (parrafos.length > 0) {
    const tit = /<title[^>]*>([\s\S]*?)<\/title>/.exec(html);
    const titulo = tit ? _decode(tit[1]).replace(/\s*\|\s*Ikigai Mangas\s*$/i, "") : "Cap\xEDtulo";
    return { content: parrafos, title: titulo };
  }
  throw new Error(
    "Este cap\xEDtulo no tiene contenido publicado todav\xEDa. Prob\xE1 con otro cap\xEDtulo o volv\xE9 m\xE1s tarde."
  );
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

// ==PrismHubExtension==
// @name         TuDeporte
// @version      1.0.0
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.tudeporte
// @type         live
// @nsfw         false
// @webSite      https://tudeporte.lat
// @description  Agenda de fútbol del día con varias señales por partido, que resuelven directo — sin navegador.
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

// extensions/tudeporte/index.ts
var BASE = "https://tudeporte.lat";
var AGENDA_URL = BASE + "/agenda.json";
async function _get(url, referer = BASE + "/", extra = {}) {
  return sendMessage(
    "request",
    JSON.stringify([url, { method: "get", headers: __spreadValues({ Referer: referer }, extra) }])
  );
}
function _b64(s) {
  return CryptoJS.enc.Utf8.parse(s).toString(CryptoJS.enc.Base64);
}
function _fromB64(s) {
  return CryptoJS.enc.Base64.parse(s).toString(CryptoJS.enc.Utf8);
}
var _ABSOLUTA = /^https?:\/\/[^\s/?#]+/i;
function _origen(url) {
  const m = _ABSOLUTA.exec(url);
  return m ? m[0] + "/" : url;
}
async function channels() {
  return [];
}
var _cacheAgenda = null;
var _AGENDA_TTL_MS = 9e4;
function _objetivoDe(link) {
  const m = /[?&](?:iframe|get)=([^&]+)/.exec(link);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch (e) {
    return m[1];
  }
}
async function schedule() {
  const ahora = Date.now();
  if (_cacheAgenda && _cacheAgenda.hasta > ahora) return _cacheAgenda.eventos;
  const cruda = await _get(AGENDA_URL);
  const lista = JSON.parse(cruda);
  const grupos = /* @__PURE__ */ new Map();
  for (const e of lista) {
    const objetivo = _objetivoDe(e.link);
    if (!objetivo) continue;
    const clave = `${e.category}|${e.title}|${e.date}|${e.time}`;
    let g = grupos.get(clave);
    if (!g) {
      g = { entrada: e, signals: [] };
      grupos.set(clave, g);
    }
    g.signals.push({
      id: _b64(objetivo),
      label: `Se\xF1al ${g.signals.length + 1}`
    });
  }
  const eventos = [];
  for (const { entrada: e, signals } of grupos.values()) {
    if (signals.length === 0) continue;
    const startsAt = `${e.date}T${e.time}:00-05:00`;
    const categoria = e.category.trim();
    eventos.push({
      id: _b64(`${categoria}|${e.title}|${e.date}|${e.time}`).slice(0, 32),
      title: e.title.trim(),
      league: categoria || void 0,
      startsAt,
      signals
    });
  }
  _cacheAgenda = { hasta: ahora + _AGENDA_TTL_MS, eventos };
  return eventos;
}
function _playbackDirecto(html) {
  const m = /playbackURL\s*=\s*"([^"]+)"/.exec(html);
  return m ? m[1].replace(/\\\//g, "/") : null;
}
function _playbackOfuscado(html) {
  const forEachRef = /(\w+)\.forEach\(e=>\{[\s\S]{0,200}?fromCharCode/.exec(html);
  const kRef = /var\s+k\s*=\s*(\w+)\(\)\s*\+\s*(\w+)\(\)/.exec(html);
  if (!forEachRef || !kRef) return null;
  const arrayMatch = new RegExp(
    forEachRef[1] + "\\s*=\\s*(\\[\\[[\\s\\S]*?\\]\\])\\s*;"
  ).exec(html);
  if (!arrayMatch) return null;
  const numeroDe = (nombre) => {
    const m = new RegExp(
      "function\\s+" + nombre + "\\s*\\(\\)\\s*\\{\\s*return\\s+(\\d+)"
    ).exec(html);
    return m ? parseInt(m[1], 10) : null;
  };
  const n1 = numeroDe(kRef[1]);
  const n2 = numeroDe(kRef[2]);
  if (n1 === null || n2 === null) return null;
  const k = n1 + n2;
  let pares;
  try {
    pares = JSON.parse(arrayMatch[1]);
  } catch (e) {
    return null;
  }
  pares.sort((a, b) => a[0] - b[0]);
  let url = "";
  for (const [, v] of pares) {
    const digitos = _fromB64(v).replace(/\D/g, "");
    if (!digitos) return null;
    url += String.fromCharCode(parseInt(digitos, 10) - k);
  }
  return url || null;
}
function _m3u8Suelto(html) {
  const m = /https?:\/\/[^'"<>\s]+\.m3u8[^'"<>\s]*/.exec(html);
  return m ? m[0] : null;
}
async function resolveSignal(id) {
  var _a, _b;
  let objetivo;
  try {
    objetivo = _fromB64(id).trim();
  } catch (e) {
    return [];
  }
  if (!_ABSOLUTA.test(objetivo)) return [];
  let html;
  try {
    html = await _get(objetivo, BASE + "/", { "Sec-Fetch-Dest": "iframe" });
  } catch (e) {
    return [];
  }
  const m3u8 = (_b = (_a = _playbackDirecto(html)) != null ? _a : _playbackOfuscado(html)) != null ? _b : _m3u8Suelto(html);
  if (!m3u8) return [];
  let cuerpo;
  try {
    cuerpo = await _get(m3u8, _origen(objetivo));
  } catch (e) {
    return [];
  }
  if (!cuerpo.trimStart().startsWith("#EXTM3U")) return [];
  return [
    {
      url: m3u8,
      mimeType: "application/x-mpegURL",
      headers: { Referer: _origen(objetivo) },
      nativo: true
    }
  ];
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

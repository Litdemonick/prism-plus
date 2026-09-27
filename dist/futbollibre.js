// ==PrismHubExtension==
// @name         Fútbol Libre
// @version      1.0.3
// @author       PrismPlus
// @lang         es
// @license      MIT
// @package      io.prismhub.futbollibre
// @type         live
// @nsfw         false
// @webSite      https://futbollibrefullhd.org
// @description  Agenda deportiva del día (fútbol y más) y canales fijos en vivo, con señales que resuelven directo — sin navegador.
// ==/PrismHubExtension==
// extensions/futbollibre/index.ts
var BASE = "https://futbollibrefullhd.org";
var AGENDA_URL = "https://api.wqxag.com/diaries.json";
var CANAL_BASE = "https://tvf90.com";
var IMG_URL = "https://img.wqxag.com";
function _imagen(url) {
  if (!url) return void 0;
  if (/^https?:\/\//i.test(url)) return url;
  return IMG_URL + (url.startsWith("/") ? url : "/" + url);
}
async function _get(url, referer = BASE + "/") {
  return sendMessage(
    "request",
    JSON.stringify([url, { method: "get", headers: { Referer: referer } }])
  );
}
function _b64(s) {
  return CryptoJS.enc.Utf8.parse(s).toString(CryptoJS.enc.Base64);
}
function _fromB64(s) {
  return CryptoJS.enc.Base64.parse(s).toString(CryptoJS.enc.Utf8);
}
var _LOGOS = BASE + "/img/logo-canal/";
var _CANALES = [
  { id: "dsports", nombre: "DSports", logo: _LOGOS + "dsports.webp", desc: "DIRECTV Sports: f\xFAtbol sudamericano e internacional, tenis y otros deportes en vivo." },
  { id: "dsportsplus", nombre: "DSports+", logo: _LOGOS + "dsports_plus.webp", desc: "Segunda se\xF1al de DIRECTV Sports, con partidos y eventos en simult\xE1neo." },
  { id: "espn", nombre: "ESPN", logo: _LOGOS + "espn.webp", desc: "ESPN: f\xFAtbol, b\xE1squet, tenis y m\xE1s deportes en vivo." },
  { id: "espn2", nombre: "ESPN 2", logo: _LOGOS + "espn.webp", desc: "Se\xF1al alternativa de ESPN, con m\xE1s partidos y eventos en vivo." },
  { id: "espn3", nombre: "ESPN 3", logo: _LOGOS + "espn.webp", desc: "Tercera se\xF1al de ESPN, para los eventos que corren al mismo tiempo." },
  { id: "liga1max", nombre: "Liga 1 MAX", logo: _LOGOS + "liga_1_max.webp", desc: "Canal oficial de la Liga 1 de Per\xFA, con los partidos del torneo." },
  { id: "telemundo", nombre: "Telemundo", desc: "Cadena en espa\xF1ol de Estados Unidos, con f\xFAtbol y programaci\xF3n deportiva." }
];
async function channels() {
  return _CANALES.map((c) => ({
    id: c.id,
    name: c.nombre,
    icon: c.logo,
    description: c.desc,
    signals: [
      {
        id: _b64(`${CANAL_BASE}/online/canal.php?stream=${c.id}`),
        label: c.nombre
      }
    ]
  }));
}
var _cacheAgenda = null;
var _AGENDA_TTL_MS = 9e4;
function _signalsDe(embeds) {
  const salida = [];
  for (const e of embeds) {
    const m = /[?&]r=([^&]+)/.exec(e.attributes.embed_iframe || "");
    if (!m) continue;
    salida.push({ id: decodeURIComponent(m[1]), label: e.attributes.embed_name || "Se\xF1al" });
  }
  return salida;
}
async function schedule() {
  var _a, _b, _c, _d, _e, _f, _g;
  const ahora = Date.now();
  if (_cacheAgenda && _cacheAgenda.hasta > ahora) return _cacheAgenda.eventos;
  const cruda = await _get(AGENDA_URL);
  const json = JSON.parse(cruda);
  const lista = Array.isArray(json.data) ? json.data : [];
  const eventos = [];
  for (const d of lista) {
    const a = d.attributes;
    const signals = _signalsDe((_b = (_a = a.embeds) == null ? void 0 : _a.data) != null ? _b : []);
    if (signals.length === 0) continue;
    const startsAt = `${a.date_diary}T${a.diary_hour}-05:00`;
    const liga = (_d = (_c = a.country) == null ? void 0 : _c.data) == null ? void 0 : _d.attributes;
    const imagenLiga = _imagen((_g = (_f = (_e = liga == null ? void 0 : liga.image) == null ? void 0 : _e.data) == null ? void 0 : _f.attributes) == null ? void 0 : _g.url);
    eventos.push({
      id: String(d.attributes.diary_description.length + startsAt.length) + "-" + _b64(startsAt + a.diary_description).slice(0, 24),
      title: a.diary_description.replace(/\n+/g, " ").trim(),
      league: liga == null ? void 0 : liga.name,
      leagueImage: imagenLiga,
      startsAt,
      signals
    });
  }
  _cacheAgenda = { hasta: ahora + _AGENDA_TTL_MS, eventos };
  return eventos;
}
var _MAX_SALTOS = 4;
async function _seguirHastaM3u8(url, referer, saltos = _MAX_SALTOS) {
  if (saltos <= 0) return null;
  let html;
  try {
    html = await _get(url, referer);
  } catch (e) {
    return null;
  }
  const m3u8 = /https?:\/\/[^'"<>\s]+\.m3u8[^'"<>\s]*/.exec(html);
  if (m3u8) {
    let cuerpo;
    try {
      cuerpo = await _get(m3u8[0], url);
    } catch (e) {
      return null;
    }
    if (!cuerpo.trimStart().startsWith("#EXTM3U")) return null;
    return { url: m3u8[0], referer: url };
  }
  const ifr = /<iframe[^>]+src=["']([^"']+)["']/i.exec(html);
  if (!ifr) return null;
  const siguiente = _resolverUrl(ifr[1], url);
  if (!siguiente) return null;
  return _seguirHastaM3u8(siguiente, url, saltos - 1);
}
var _ABSOLUTA = /^https?:\/\/[^\s/?#]+/i;
function _resolverUrl(relativa, base) {
  const r = relativa.trim();
  if (_ABSOLUTA.test(r)) return r;
  const origen = _ABSOLUTA.exec(base);
  if (!origen) return null;
  if (r.startsWith("//")) return base.slice(0, base.indexOf(":") + 1) + r;
  if (r.startsWith("/")) return origen[0] + r;
  const sinQuery = base.split(/[?#]/)[0];
  return sinQuery.slice(0, sinQuery.lastIndexOf("/") + 1) + r;
}
async function resolveSignal(id) {
  let inicial;
  try {
    inicial = _fromB64(id).trim();
  } catch (e) {
    return [];
  }
  if (!_ABSOLUTA.test(inicial)) return [];
  const resuelto = await _seguirHastaM3u8(inicial, BASE + "/");
  if (!resuelto) return [];
  return [
    {
      url: resuelto.url,
      mimeType: "application/x-mpegURL",
      headers: { Referer: resuelto.referer },
      // Medido, no supuesto: esta familia (ftlly.com vía /5.php) responde
      // directo sin cabeceras de navegador — el motor nativo la reproduce
      // igual que cualquier HLS común. Ver el comentario largo de arriba.
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

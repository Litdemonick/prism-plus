import { DESKTOP_UA } from '../../sdk/http';
import { decodeEntities, stripTags } from '../../sdk/html';
import { fichaDe, resolverServidor } from './servidores';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream, PrismEpisode } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://tioanime.com';

async function _get(url: string): Promise<string> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([
      url,
      {
        method: 'get',
        headers: { Referer: `${BASE}/`, 'User-Agent': DESKTOP_UA },
      },
    ]),
  );
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function _buildQuery(params: Record<string, string | string[] | undefined>): string {
  const parts: string[] = [];
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const v of value) if (v) parts.push(`${key}=${encodeURIComponent(v)}`);
    } else {
      parts.push(`${key}=${encodeURIComponent(value)}`);
    }
  }
  return parts.join('&');
}

function _fullUrl(url: string): string {
  if (url.indexOf('http') === 0) return url;
  return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ─── Catálogo ───────────────────────────────────────────────────────────────

function _parseCatalog(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  const re =
    /<a href="(\/anime\/[a-z0-9-]+)">\s*<div class="thumb">[\s\S]*?<img src="([^"]+)"[^>]*>[\s\S]*?<\/div>\s*<h3 class="title">([^<]+)<\/h3>/g;
  for (const m of html.matchAll(re)) {
    items.push({
      title: decodeEntities(m[3].trim()),
      url: `${BASE}${m[1]}`,
      cover: _fullUrl(m[2]),
    });
  }
  return items;
}

/**
 * La portada vertical de la serie, a partir de la miniatura del episodio.
 *
 * ── Por que hace falta ──────────────────────────────────────────────────────
 *
 * La seccion de ultimos episodios trae `/uploads/thumbs/<id>.jpg`: una captura
 * APAISADA de 300x199. Nuestras tarjetas son verticales, asi que esa imagen se
 * recorta y se estira, y se ve borrosa al lado de las extensiones que si
 * devuelven la portada. Medido: 300x199 contra los 429x600 de otras.
 *
 * El sitio guarda la portada vertical con EL MISMO numero en otra carpeta:
 * `/uploads/portadas/<id>.jpg`, de 260x370. Comprobado con cinco ids
 * distintos, incluidos viejos: las dos rutas contestan 200 siempre.
 *
 * Es un cambio de texto, sin pedidos de mas: la fila no tarda ni un milisegundo
 * mas que antes. Si algun dia una portada faltara, la imagen queda vacia y la
 * tarjeta muestra el titulo igual — no se rompe nada.
 */
function _portadaDeLaMiniatura(url: string): string {
  return url.replace('/uploads/thumbs/', '/uploads/portadas/');
}

/**
 * «Ultimos Episodios» de la portada.
 *
 * Devuelve EPISODIOS: la direccion es /ver/<slug>-<n>. El titulo del sitio trae
 * el numero pegado al final —«... 2nd Season 6»— asi que se separa: el nombre
 * de la serie va al titulo y el numero a `update`, igual que el resto del repo.
 */
function _parseUltimosEpisodios(html: string): PrismItem[] {
  const i = html.indexOf('ltimos Episodios');
  if (i < 0) return [];
  // Hasta la proxima lista: la portada tiene mas secciones abajo.
  const resto = html.slice(i);
  const fin = resto.slice(40).indexOf('<ul class="animes');
  const frag = fin > 0 ? resto.slice(0, fin + 40) : resto;

  const items: PrismItem[] = [];
  const re =
    /<a href="(\/ver\/[^"]+)">\s*<div class="thumb">[\s\S]*?<img src="([^"]+)"[^>]*>[\s\S]*?<h3 class="title">([^<]+)<\/h3>/g;
  for (const m of frag.matchAll(re)) {
    const crudo = decodeEntities(m[3].trim());
    // El numero final es el episodio. Si no lo hubiera, se deja el titulo tal
    // cual: mejor sin etiqueta que inventando una.
    const conNumero = /^(.*?)\s+(\d+)$/.exec(crudo);
    items.push({
      title: conNumero ? conNumero[1] : crudo,
      url: `${BASE}${m[1]}`,
      cover: _fullUrl(_portadaDeLaMiniatura(m[2])),
      update: conNumero ? `Ep. ${conNumero[2]}` : undefined,
    });
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  // ── Pagina 1: lo que el sitio muestra como recien salido ────────────────
  //
  // /directorio devuelve el catalogo en su orden, que no es por fecha: el Home
  // mostraba animes viejos como novedades. La portada tiene «Ultimos
  // Episodios» y es lo que la gente mira al entrar.
  //
  // Desde la pagina 2 sigue por el directorio: la portada no se pagina.
  if (page <= 1) {
    try {
      const portada = await _get(BASE);
      const recientes = _parseUltimosEpisodios(portada);
      if (recientes.length) return recientes;
    } catch {
      // Sin portada se sigue por el directorio, que es lo que hacia antes.
    }
  }
  const query = _buildQuery({ p: page > 1 ? String(page) : undefined });
  const html = await _get(`${BASE}/directorio${query ? `?${query}` : ''}`);
  return _parseCatalog(html);
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const query = _buildQuery({
    q: keyword.trim() || undefined,
    'genero[]': filter?.['genero'],
    'type[]': filter?.['tipo'],
    status: filter?.['estado']?.[0],
    p: page > 1 ? String(page) : undefined,
  });
  const html = await _get(`${BASE}/directorio${query ? `?${query}` : ''}`);
  return _parseCatalog(html);
}

// Lista agregada en vivo desde el <select id="genero"> real del formulario
// de filtros del catálogo (confirmado en vivo, /directorio?genero[]=X funciona).
const _GENRE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  'accion': 'Acción',
  'artes-marciales': 'Artes Marciales',
  'aventura': 'Aventuras',
  'carreras': 'Carreras',
  'ciencia-ficcion': 'Ciencia Ficción',
  'comedia': 'Comedia',
  'demencia': 'Demencia',
  'demonios': 'Demonios',
  'deportes': 'Deportes',
  'drama': 'Drama',
  'ecchi': 'Ecchi',
  'escolares': 'Escolares',
  'espacial': 'Espacial',
  'fantasia': 'Fantasía',
  'harem': 'Harem',
  'historico': 'Histórico',
  'infantil': 'Infantil',
  'josei': 'Josei',
  'juegos': 'Juegos',
  'magia': 'Magia',
  'mecha': 'Mecha',
  'militar': 'Militar',
  'misterio': 'Misterio',
  'musica': 'Música',
  'parodia': 'Parodia',
  'policia': 'Policía',
  'psicologico': 'Psicológico',
  'recuentos-de-la-vida': 'Recuentos de la vida',
  'romance': 'Romance',
  'samurai': 'Samurái',
  'seinen': 'Seinen',
  'shoujo': 'Shoujo',
  'shounen': 'Shounen',
  'sobrenatural': 'Sobrenatural',
  'superpoderes': 'Superpoderes',
  'suspenso': 'Suspenso',
  'terror': 'Terror',
  'vampiros': 'Vampiros',
  'yaoi': 'Yaoi',
  'yuri': 'Yuri',
};

const _TYPE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  '0': 'TV',
  '1': 'Película',
  '2': 'OVA',
  '3': 'Especial',
};

const _STATUS_OPTIONS: Record<string, string> = {
  '': 'Todos',
  '2': 'Finalizado',
  '1': 'En emisión',
  '3': 'Próximamente',
};

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    genero: { title: 'Género', options: _GENRE_OPTIONS, default: '', min: 1, max: 1 },
    tipo: { title: 'Tipo', options: _TYPE_OPTIONS, default: '', min: 1, max: 1 },
    estado: { title: 'Estado', options: _STATUS_OPTIONS, default: '', min: 1, max: 1 },
  };
}

// ─── Detalle ────────────────────────────────────────────────────────────────

/**
 * De la direccion de un episodio a la de su serie.
 *
 * La pagina del episodio tiene UN solo enlace /anime/<slug> —el boton que
 * vuelve a la serie— asi que alcanza con tomar el primero. Se lee la pagina en
 * vez de cortarle el numero al slug: hay series cuyo nombre termina en numero y
 * ahi el recorte abriria otra cosa.
 */
async function _serieDelEpisodio(url: string): Promise<string | null> {
  try {
    const html = await _get(_fullUrl(url));
    const m = /href="(\/anime\/[^"]+)"/.exec(html);
    return m ? `${BASE}${m[1]}` : null;
  } catch {
    return null;
  }
}

export async function detail(url: string): Promise<PrismDetail> {
  // Viene de una tarjeta de «Ultimos Episodios». Si no se pudo averiguar la
  // serie, se sigue con lo que vino: intentar es mejor que fallar de entrada.
  if (url.indexOf('/ver/') >= 0) {
    const serie = await _serieDelEpisodio(url);
    if (serie) url = serie;
  }
  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  const slug = fullUrl.replace(`${BASE}/anime/`, '').replace(/\/$/, '');

  const title = /<h1 class="title">([^<]+)<\/h1>/i.exec(html)?.[1]?.trim() ?? '';
  const coverM = /<figure><img src="([^"]+)"/i.exec(html)?.[1];
  const cover = coverM ? _fullUrl(coverM) : undefined;
  const statusText = /class="[^"]*status"[^>]*>(?:<i[^>]*><\/i>)?([^<]+)</i.exec(html)?.[1]?.trim();

  const description = stripTags(
    /<p class="sinopsis">([\s\S]*?)<\/p>/i.exec(html)?.[1] ?? '',
  ).trim();

  const genres: string[] = [];
  const generosBlockM = /<p class="genres">([\s\S]*?)<\/p>/i.exec(html);
  if (generosBlockM) {
    for (const m of generosBlockM[1].matchAll(/class="btn btn-sm btn-light rounded-pill">([^<]+)</g)) {
      genres.push(decodeEntities(m[1].trim()));
    }
  }

  // Confirmado en vivo: "var episodes = [N,...,2,1];" trae TODOS los números
  // de episodio de una — a diferencia de animefenix, no hace falta paginar
  // por AJAX. Viene en orden descendente (más nuevo primero).
  const episodesM = /var episodes\s*=\s*(\[[\d,\s]*\])/.exec(html);
  const episodeNumbers: number[] = episodesM ? JSON.parse(episodesM[1]) : [];
  const episodes: PrismEpisode[] = episodeNumbers
    .slice()
    .reverse()
    .map((n) => ({ title: `Episodio ${n}`, url: `${BASE}/ver/${slug}-${n}` }));

  const status: PrismDetail['status'] =
    statusText === 'En emision'
      ? 'ongoing'
      : statusText === 'Finalizado'
        ? 'completed'
        : statusText === 'Proximamente'
          ? 'upcoming'
          : undefined;

  return { title, cover, description, genres, episodes, status };
}

// ─── Reproducción ───────────────────────────────────────────────────────────

// Antes acá había un `_NEVER_NATIVE` que sacaba mega y netu de la lista, para
// no ofrecer servidores que el reproductor nativo no puede abrir. Se quitó, y
// el porqué está medido:
//
// Este sitio sirve SOLO TRES servidores —Mega, Voe y YourUpload— en todos los
// episodios. Ocultar uno deja dos, y de 6 episodios sueltos hubo uno donde los
// dos que quedaban fallaron: el usuario se quedaba sin nada teniendo un Mega
// que el navegador interno reproduce bien. Ocultar el botón no evita el fallo,
// lo convierte en un episodio muerto.
//
// Ahora Mega va en la lista marcado con el mundo (ver `servidores/mega/`), que
// es lo mismo que ya se hace en latanime. Y netu directamente no aparece más en
// el sitio: no estaba en ninguno de los 40 episodios revisados.

export async function watch(url: string): Promise<PrismWatch> {
  // Fast-path: embed externo (switchServer pidiendo resolver UN servidor
  // puntual) — mismo patrón que las demás extensiones de este repo.
  if (url.indexOf('http') === 0 && url.indexOf('tioanime.com') === -1) {
    try {
      const res = await resolverServidor(url, `${BASE}/`);
      if (res && res.url) {
        return { streams: [{ url: res.url, quality: 'Servidor', headers: res.headers }], pageUrl: '' };
      }
    } catch {
      /* sigue abajo con la URL cruda */
    }
    return { streams: [{ url, quality: 'Servidor' }], pageUrl: '' };
  }

  const episodeUrl = _fullUrl(url);
  const html = await _get(episodeUrl);

  const videosM = /var videos\s*=\s*(\[[\s\S]*?\]);/.exec(html);
  const streams: PrismStream[] = [];
  if (videosM) {
    const videos = JSON.parse(videosM[1].replace(/\\\//g, '/')) as [string, string, number, number][];
    for (const [name, embedUrl] of videos) {
      // Ya no se filtra nada: se muestran los tres y cada uno lleva su marca.
      // El rayo/mundo sale de la tabla de `servidores/`, que es donde está lo
      // que se midió de cada uno.
      streams.push({ url: embedUrl, quality: name, nativo: fichaDe(embedUrl)?.nativo });
    }
  }

  // Los que reproducen en la app, primero.
  //
  // Hace falta desde que Mega volvió a la lista: el sitio lo lista PRIMERO de
  // los tres, y el cliente toma el primer servidor como el inicial. Sin esto,
  // devolver Mega a la lista habría hecho que cada episodio abriera de entrada
  // en el navegador interno en vez de en el reproductor de la app.
  //
  // Es un reordenamiento, no un filtro: están los tres, y entre los nativos se
  // respeta el orden del sitio.
  streams.sort((a, b) => (a.nativo === false ? 1 : 0) - (b.nativo === false ? 1 : 0));

  return { streams, pageUrl: episodeUrl };
}

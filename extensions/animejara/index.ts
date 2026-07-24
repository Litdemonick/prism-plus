import { decodeEntities, stripTags } from '../../sdk/html';
import { resolveEmbed } from '../../sdk/embeds';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream } from '../../sdk/types';

// sendMessage("request", ...) usa el dio de PrismHub (con UA, cookies y redirecciones),
// a diferencia de fetch() que usa http.Client básico.
declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://animejara.com';

// El catálogo/episodio de este sitio devuelve HTML real y útil bajo un
// status 404 varias veces (paginar más allá de la página 1, filtrar por
// "tag") — confirmado en vivo con curl. PrismHub ya no tira excepción por
// esto (validateStatus permisivo del lado de la app), así que acá solo hay
// que pedir y parsear como si nada.
// decodeEntities (SDK) no cubre entidades numéricas (&#038; etc.) — WordPress
// las usa todo el tiempo para el "&" en URLs de query string (confirmado en
// vivo: el src del iframe del reproductor viene como "...&#038;idcapitulo=1",
// que sin esto queda una URL rota — nunca llega a encontrar el segundo
// parámetro).
function _decodeUrlEntities(s: string): string {
  return decodeEntities(s).replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

async function _get(url: string): Promise<string> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([url, { method: 'get', headers: { Referer: `${BASE}/` } }]),
  );
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

// URLSearchParams no existe en el QuickJS de PrismHub — arma la query a mano,
// saltando cualquier valor vacío/"Todos" (así no ensucia la URL con params
// sueltos que el sitio podría interpretar distinto a "sin filtro").
function _buildQuery(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value) parts.push(`${key}=${encodeURIComponent(value)}`);
  }
  return parts.join('&');
}

interface _CatalogCardData {
  titulo: string;
  poster: string;
  anio?: string;
  tipo?: string;
  estado?: string;
  sinopsis?: string;
  categorias?: string[];
}

// Cada tarjeta del catálogo trae un atributo data-anime con un JSON completo
// (título, portada, año, sinopsis, categorías...) — mucho más rico que tener
// que scrapear campo por campo. Solo hace falta decodificar las entidades
// HTML (&quot; etc.) antes de parsearlo.
function _parseCatalog(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  const re = /<a href="(https:\/\/animejara\.com\/anime\/[^"]+)" class="anime-card" data-anime="([^"]+)"/g;
  for (const m of html.matchAll(re)) {
    try {
      const data = JSON.parse(decodeEntities(m[2])) as _CatalogCardData;
      items.push({
        title: data.titulo,
        url: m[1],
        cover: data.poster,
        update: data.estado === 'emision' ? 'En emisión' : undefined,
      });
    } catch {
      // tarjeta con JSON corrupto (raro) — se saltea, no rompe el resto.
    }
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  const query = _buildQuery({ paged: page > 1 ? String(page) : undefined });
  const html = await _get(`${BASE}/catalogo${query ? `?${query}` : ''}`);
  return _parseCatalog(html);
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const query = _buildQuery({
    q: keyword.trim() || undefined,
    tag: filter?.['genero']?.[0],
    anio: filter?.['anio']?.[0],
    tipo: filter?.['tipo']?.[0],
    estado: filter?.['estado']?.[0],
    idioma: filter?.['idioma']?.[0],
    paged: page > 1 ? String(page) : undefined,
  });
  const html = await _get(`${BASE}/catalogo${query ? `?${query}` : ''}`);
  return _parseCatalog(html);
}

// Lista de géneros agregada EN VIVO recorriendo ~20 páginas del catálogo real
// (585 títulos) — el sitio no tiene un desplegable de género visible en el
// filtro, pero el parámetro "tag" sí funciona server-side (confirmado en
// vivo: ?tag=Aventura bajó el total de 585 a 201 resultados reales).
const _GENRE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  'Accion': 'Acción',
  'Amor': 'Amor',
  'Artes marciales': 'Artes marciales',
  'Aventura': 'Aventura',
  'Carreras': 'Carreras',
  'Ciencia ficcion': 'Ciencia ficción',
  'Comedia': 'Comedia',
  'Comidas': 'Comidas',
  'Crimen': 'Crimen',
  'Demonios': 'Demonios',
  'Deportes': 'Deportes',
  'Drama': 'Drama',
  'Ecchi': 'Ecchi',
  'Escolar': 'Escolar',
  'Espacial': 'Espacial',
  'Espadachin': 'Espadachín',
  'Familia': 'Familia',
  'Fantasia': 'Fantasía',
  'Gore': 'Gore',
  'Harem': 'Harem',
  'Historico': 'Histórico',
  'Isekai': 'Isekai',
  'Josei': 'Josei',
  'Juegos': 'Juegos',
  'Magia': 'Magia',
  'Mecha': 'Mecha',
  'Militar': 'Militar',
  'Misterio': 'Misterio',
  'Musica': 'Música',
  'Parodia': 'Parodia',
  'Psicologico': 'Psicológico',
  'Recuerdos': 'Recuerdos',
  'Robots': 'Robots',
  'Romance': 'Romance',
  'Samurai': 'Samurái',
  'Seinen': 'Seinen',
  'Shoujo': 'Shoujo',
  'Shounen': 'Shounen',
  'Sobrenatural': 'Sobrenatural',
  'Studio ghibli': 'Studio Ghibli',
  'Superpoderes': 'Superpoderes',
  'Suspenso': 'Suspenso',
  'Terror': 'Terror',
  'Vampiros': 'Vampiros',
  'Yaoi': 'Yaoi',
  'Yuri': 'Yuri',
  'Zombies': 'Zombies',
};

// Confirmado en vivo en el desplegable del catálogo (1983 al año más reciente).
function _yearOptions(): Record<string, string> {
  const options: Record<string, string> = { '': 'Todos' };
  const currentYear = 2026; // el propio catálogo lista hasta el año en curso.
  for (let y = currentYear; y >= 1983; y--) options[String(y)] = String(y);
  return options;
}

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    genero: { title: 'Género', options: _GENRE_OPTIONS, default: '', min: 1, max: 1 },
    anio: { title: 'Año', options: _yearOptions(), default: '', min: 1, max: 1 },
    tipo: {
      title: 'Tipo',
      options: { '': 'Todos', serie: 'Serie', pelicula: 'Película' },
      default: '',
      min: 1,
      max: 1,
    },
    estado: {
      title: 'Estado',
      options: { '': 'Todos', Emision: 'En emisión', Finalizado: 'Finalizado' },
      default: '',
      min: 1,
      max: 1,
    },
    idioma: {
      title: 'Idioma',
      options: { '': 'Todos', latino: 'Latino', japones: 'Japonés', castellano: 'Castellano' },
      default: '',
      min: 1,
      max: 1,
    },
  };
}

// ─── Detalle ────────────────────────────────────────────────────────────────

interface _TemporadaEpisodio {
  numero_episodio: string;
  nombre_episodio?: string;
}
interface _Temporada {
  numero_temporada: number;
  poster_temporada?: string;
  episodios: _TemporadaEpisodio[];
}

export async function detail(url: string): Promise<PrismDetail> {
  const fullUrl = url.indexOf('http') === 0 ? url : `${BASE}/anime/${url}`;
  const html = await _get(fullUrl);

  const title =
    /<h1[^>]*>([^<]+)<\/h1>/i.exec(html)?.[1]?.trim() ??
    /<title>([^<|]+)/i.exec(html)?.[1]?.trim() ??
    '';

  const description = stripTags(
    /anime-sinopsis-contenedor[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i.exec(html)?.[1] ?? '',
  ).trim();

  const genres: string[] = [];
  const catBlockM = /anime-categorias[\s\S]*?<\/div>/i.exec(html);
  if (catBlockM) {
    for (const m of catBlockM[0].matchAll(/<span[^>]*>([^<]+)<\/span>/g)) {
      genres.push(m[1].trim());
    }
  }

  const slugM = /const\s+ANIME_SLUG\s*=\s*'([^']+)'/.exec(html);
  const slug = slugM ? slugM[1] : fullUrl.replace(`${BASE}/anime/`, '').replace(/\/$/, '');

  const dataM = /const\s+TEMPORADAS_DATA\s*=\s*(\[[\s\S]*?\]);/.exec(html);
  const temporadas: _Temporada[] = dataM ? JSON.parse(dataM[1]) : [];

  let cover = temporadas[0]?.poster_temporada;
  if (!cover) {
    cover = matchFirstCover(html);
  }

  // Grupo por temporada — el wrapper del build detecta este formato
  // (episodes[i].urls) y arma la UI de "seleccionar temporada" sola; sin
  // esto (lista plana) las series con más de una temporada mezclarían todo
  // en un solo listado interminable.
  const episodeGroups = temporadas.map((temp) => ({
    title: `Temporada ${temp.numero_temporada}`,
    urls: temp.episodios.map((ep) => ({
      title: ep.nombre_episodio?.trim()
        ? `${ep.numero_episodio}. ${ep.nombre_episodio.trim()}`
        : `Episodio ${ep.numero_episodio}`,
      url: `episode/${slug}-${temp.numero_temporada}x${ep.numero_episodio}`,
    })),
  }));

  return {
    title,
    cover,
    description,
    genres,
    // El tipo declarado pide PrismEpisode[] (title/url planos) pero el
    // wrapper del build en runtime también acepta grupos (title/urls) para
    // series con temporadas — confirmado leyendo scripts/build.mjs. No hay
    // forma de tipar esto "correcto" sin romper el build de un tirón, así
    // que se castea a propósito.
    episodes: episodeGroups as unknown as PrismDetail['episodes'],
  };
}

function matchFirstCover(html: string): string | undefined {
  const m = /property="og:image:secure_url"\s+content="([^"]+)"/i.exec(html);
  return m && m[1] ? m[1] : undefined;
}

// ─── Reproducción ───────────────────────────────────────────────────────────

// Servidores confirmados en vivo como imposibles de resolver por scraping:
//  - streamhg (hgcloud.to): página "Loading..." vacía — el video real se
//    arma recién con un bundle JS de 70KB fuertemente ofuscado, sin ningún
//    patrón de API reconocible.
//  - savefiles (savefiles.top): formulario POST a /dl (mismo estilo que los
//    viejos clones de Openload) — mecanismo distinto al de Doodstream
//    (pass_md5), no hay resolver del SDK que lo cubra.
//  - filemoon (en realidad bysekoze.com bajo el capó): mismo cascarón vacío
//    de React ("Byse Frontend", idéntico bundle JS) que ya se descartó como
//    "Moon" en animeytx — sin ningún dato de video en el HTML estático, todo
//    se arma client-side. Es el mismo servicio con otro dominio, no una
//    coincidencia de nombre.
// El resto (vidhide→filelions, netu, uqload, streamtape, mp4upload, mixdrop,
// lulustream→luluvdo) usa resolvers ya existentes del SDK compartido —
// confirmados en vivo resolviendo a streams reales cuando el archivo
// subido sigue disponible (algunos hosts individuales a veces tienen el
// archivo borrado/caído — es variación normal de sitios con espejos
// múltiples, no motivo para descartar el host entero).
const _NEVER_NATIVE = new Set(['streamhg', 'savefiles', 'filemoon']);

export async function watch(url: string): Promise<PrismWatch> {
  // Fast-path: embed externo (switchServer pidiendo resolver UN servidor
  // puntual) — mismo patrón que las demás extensiones de este repo.
  if (url.indexOf('http') === 0 && url.indexOf('animejara.com') === -1) {
    try {
      const res = await resolveEmbed('Servidor', url, `${BASE}/`);
      if (res && res.url) {
        return { streams: [{ url: res.url, quality: 'Servidor', headers: res.headers }], pageUrl: '' };
      }
    } catch {
      /* sigue abajo con la URL cruda */
    }
    return { streams: [{ url, quality: 'Servidor' }], pageUrl: '' };
  }

  const episodeUrl = url.indexOf('http') === 0 ? url : `${BASE}/${url}`;
  const html = await _get(episodeUrl);

  const iframeM = /<iframe id="iframe-video" src="([^"]+)"/i.exec(html);
  if (!iframeM) return { streams: [], pageUrl: episodeUrl };

  const embedPageUrl = _decodeUrlEntities(iframeM[1]);
  const embedHtml = await _get(embedPageUrl);

  const streams: PrismStream[] = [];
  const re = /playVideo\(&quot;\s*([^&]+?)\s*&quot;\)"[^>]*>[\s\S]*?alt="([^"]+)"/g;
  for (const m of embedHtml.matchAll(re)) {
    const name = m[2].trim();
    if (_NEVER_NATIVE.has(name.toLowerCase())) continue;
    streams.push({ url: m[1].trim(), quality: name.charAt(0).toUpperCase() + name.slice(1) });
  }

  return { streams, pageUrl: episodeUrl };
}

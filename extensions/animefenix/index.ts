import { DESKTOP_UA } from '../../sdk/http';
import { stripTags, decodeEntities } from '../../sdk/html';
import { fichaDe, resolverServidor } from './servidores';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream, PrismEpisode } from '../../sdk/types';

// sendMessage("request", ...) usa el dio de PrismHub (UA/cookies/redirecciones
// reales de la app) — confirmado esta sesión que el fetch() del polyfill de
// flutter_js se cuelga contra varios hosts (usado antes por sdk/embeds.ts,
// ya arreglado ahí). Esta extensión usa sendMessage desde el principio.
declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://animefenix2.tv';

async function _get(url: string, extraHeaders?: Record<string, string>): Promise<string> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([
      url,
      {
        method: 'get',
        // DESKTOP_UA va ANTES del spread para que un extraHeaders con su propio
        // User-Agent lo siga pisando (lo usan los resolvers de servidores).
        headers: {
          Referer: `${BASE}/`,
          'User-Agent': DESKTOP_UA,
          ...(extraHeaders ?? {}),
        },
      },
    ]),
  );
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function _buildQuery(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value) parts.push(`${key}=${encodeURIComponent(value)}`);
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
    /<a href="(\/[a-z0-9-]+)">\s*<figure>\s*<span class="tipo">([^<]*)<\/span>\s*<span class="estreno">([^<]*)<\/span>[\s\S]*?<p class="gray">([^<]*)<\/p>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<\/figure>\s*<p>([^<]+)<\/p>/g;
  for (const m of html.matchAll(re)) {
    const year = parseInt(m[3].trim(), 10);
    items.push({
      title: decodeEntities(m[6].trim()),
      url: `${BASE}${m[1]}`,
      cover: m[5],
      update: m[4]?.trim() ? decodeEntities(m[4].trim()) : undefined,
      year: Number.isFinite(year) ? year : undefined,
      tags: m[2]?.trim() ? [decodeEntities(m[2].trim())] : undefined,
    });
  }
  return items;
}

/**
 * «Episodios recientes» de la portada.
 *
 * Devuelve EPISODIOS, no series: la direccion es /ver/<slug>-<n> y el titulo
 * lleva su numero en `update`. Al tocar la tarjeta, `detail()` se encarga de
 * remontar a la serie — ver el comentario ahi.
 */
function _parseRecientes(html: string): PrismItem[] {
  const i = html.indexOf('Episodios recientes');
  if (i < 0) return [];
  // Hasta la proxima seccion: sin esto se leeria la portada entera.
  const resto = html.slice(i);
  const fin = resto.slice(30).indexOf('<section');
  const frag = fin > 0 ? resto.slice(0, fin + 30) : resto;

  const items: PrismItem[] = [];
  const re =
    /<a href="(\/ver\/[^"]+)" title="([^"]*?)\s*Episodio\s*(\d+)"[\s\S]*?<img src="([^"]+)"/g;
  for (const m of frag.matchAll(re)) {
    items.push({
      title: decodeEntities(m[2].trim()),
      url: m[1],
      cover: m[4],
      update: `Ep. ${m[3]}`,
    });
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  // ── Pagina 1: lo que el sitio muestra como recien salido ────────────────
  //
  // /directorio/anime devuelve el catalogo completo en su orden, que no es por
  // fecha: el Home mostraba animes viejos como si fueran novedades. La portada
  // tiene su seccion de episodios recientes y es la que la gente mira.
  //
  // Desde la pagina 2 sigue por el directorio: la portada no se pagina, y es
  // mejor continuar con otra cosa que cortarse en seco.
  if (page <= 1) {
    try {
      const portada = await _get(BASE);
      const recientes = _parseRecientes(portada);
      if (recientes.length) return recientes;
    } catch {
      // La portada no contesto: se sigue por el directorio, que es lo que
      // hacia antes.
    }
  }
  const query = _buildQuery({ p: page > 1 ? String(page) : undefined });
  const html = await _get(`${BASE}/directorio/anime${query ? `?${query}` : ''}`);
  return _parseCatalog(html);
}

async function _searchOnce(
  keyword: string,
  page: number,
  genero?: string,
  tipo?: string,
  estado?: string,
): Promise<PrismItem[]> {
  const query = _buildQuery({
    q: keyword.trim() || undefined,
    genero,
    tipo,
    estado,
    p: page > 1 ? String(page) : undefined,
  });
  const html = await _get(`${BASE}/directorio/anime${query ? `?${query}` : ''}`);
  return _parseCatalog(html);
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const genero = filter?.['genero']?.[0];
  const tipo = filter?.['tipo']?.[0];
  const estado = filter?.['estado']?.[0];

  const base = await _searchOnce(keyword, page, genero, tipo, estado);

  // El buscador del sitio se come resultados cuando NO se le pasa ?tipo=
  // (confirmado en vivo con curl: q="boku no kokoro" sin tipo devuelve 3
  // resultados y su paginación declara UNA sola página, pero la MISMA query
  // con &tipo=2 devuelve "Boku no Kokoro no Yabai Yatsu Movie" —slug
  // /bokuyaba-movie— que no aparecía por ningún lado; la unión por tipos da
  // 4). Es un bug del backend de ellos, no del parseo: la película nunca
  // está en el HTML de la búsqueda sin filtrar. Cuando el usuario NO eligió
  // un tipo puntual, se repite la búsqueda por cada tipo en paralelo y se
  // unen los resultados (deduplicados por url, respetando el orden original
  // primero). Solo en la página 1: las siguientes ya vienen de una consulta
  // que el sitio pagina normalmente.
  if (tipo || page > 1 || !keyword.trim()) return base;

  // Solo los 4 tipos principales (TV/Película/OVA/Especial), no los 8 —
  // medido contra el sitio real con 4 búsquedas distintas ("one piece",
  // "naruto", "boku no kokoro", "dragon ball"): la unión con {1,2,3,4} da
  // EXACTAMENTE el mismo total que con los 8 tipos (22/10/4/12
  // respectivamente), así que los otros cuatro (Serie, Dorama, Corto,
  // Donghua) solo agregaban latencia. Además se verificó que la búsqueda
  // sin filtro sí devuelve títulos de esos tipos raros por su cuenta (un
  // donghua, un dorama, una serie y un corto, buscados por nombre), así que
  // no quedan afuera. Son 5 pedidos en total en vez de 9: importa porque el
  // puente JS de PrismHub los procesa de a uno, así que cada pedido de más
  // se siente en el tiempo de respuesta de la búsqueda general.
  const _UNION_TYPES = ['1', '2', '3', '4'];

  const perType = await Promise.all(
    _UNION_TYPES.map((t) =>
      _searchOnce(keyword, page, genero, t, estado).catch(() => [] as PrismItem[]),
    ),
  );

  const merged: PrismItem[] = [];
  const seen: Record<string, boolean> = {};
  for (const item of base) {
    if (seen[item.url]) continue;
    seen[item.url] = true;
    merged.push(item);
  }
  for (const list of perType) {
    for (const item of list) {
      if (seen[item.url]) continue;
      seen[item.url] = true;
      merged.push(item);
    }
  }
  return merged;
}

// Listas agregadas en vivo desde el <select> real del formulario de filtros
// del catálogo (confirmado en vivo, ?genero=/?tipo=/?estado= funcionan).
const _GENRE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  '1': 'Acción',
  '2': 'Escolares',
  '3': 'Romance',
  '4': 'Shoujo',
  '5': 'Comedia',
  '6': 'Drama',
  '7': 'Seinen',
  '8': 'Deportes',
  '9': 'Shounen',
  '10': 'Recuentos de la vida',
  '11': 'Ecchi',
  '12': 'Sobrenatural',
  '13': 'Fantasía',
  '14': 'Magia',
  '15': 'Superpoderes',
  '16': 'Demencia',
  '17': 'Misterio',
  '18': 'Psicológico',
  '19': 'Suspenso',
  '20': 'Ciencia Ficción',
  '21': 'Mecha',
  '22': 'Militar',
  '23': 'Aventuras',
  '24': 'Historico',
  '25': 'Infantil',
  '26': 'Artes Marciales',
  '27': 'Terror',
  '28': 'Harem',
};

const _TYPE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  '1': 'TV Anime',
  '2': 'Película',
  '3': 'OVA',
  '4': 'Especial',
  '9': 'Serie',
  '11': 'Dorama',
  '14': 'Corto',
  '15': 'Donghua',
};

const _STATUS_OPTIONS: Record<string, string> = {
  '': 'Todos',
  '1': 'Finalizado',
  '2': 'En emisión',
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
 * ── Por que se lee la pagina y no se corta el slug ─────────────────────────
 *
 * Lo facil seria sacarle el `-6` final a `/ver/hell-mode-s2-6`. Funciona en la
 * mayoria, pero se rompe con cualquier serie cuyo slug termine en numero —y
 * las hay: temporadas, años, secuelas—. Ahi la ficha abriria en otra serie o
 * en nada, sin ninguna pista de por que.
 *
 * La pagina del episodio tiene un boton «Episodios» que apunta a su serie, con
 * el icono `fa-list-alt`. Eso es un dato del sitio, no una suposicion nuestra.
 */
async function _serieDelEpisodio(url: string): Promise<string | null> {
  try {
    const html = await _get(_fullUrl(url));
    const m = /<a href="(\/[^"]+)"[^>]*>\s*<i class="fa fa-list-alt"/.exec(html);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export async function detail(url: string): Promise<PrismDetail> {
  // Viene de una tarjeta de «Episodios recientes»: primero se averigua de que
  // serie es. Si no se pudo, se sigue con lo que vino — devolver un error seria
  // peor que intentar.
  if (url.indexOf('/ver/') >= 0) {
    const serie = await _serieDelEpisodio(url);
    if (serie) url = serie;
  }
  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  const slug = fullUrl.replace(`${BASE}/`, '').replace(/\/$/, '');

  const title = /<h1[^>]*>([^<]+)<\/h1>/i.exec(html)?.[1]?.trim() ?? '';
  const cover = /property="og:image"\s+content="([^"]+)"/i.exec(html)?.[1];
  const description = stripTags(
    /Sinopsis<\/h2>\s*<p[^>]*>([^<]*)<\/p>/i.exec(html)?.[1] ?? '',
  ).trim();

  const genres: string[] = [];
  const generosBlockM = /Géneros<\/h2>([\s\S]*?)<!--/i.exec(html);
  if (generosBlockM) {
    for (const m of generosBlockM[1].matchAll(/genero=\d+"[^>]*>\s*([^<]+?)\s*</g)) {
      genres.push(decodeEntities(m[1].trim()));
    }
  }

  // La lista de episodios se carga por AJAX en tandas fijas de 16
  // (confirmado en vivo: botones "1-16","17-32"...) — se pide página por
  // página hasta que una tanda devuelve menos de 16 (última página).
  const episodes: PrismEpisode[] = [];
  const epRe = /<a href="(\/ver\/[^"]+)" class="episode-card">[\s\S]*?<span class="ep-title">([^<]+)<\/span>/g;
  let start = 0;
  for (let page = 0; page < 60; page++) {
    const chunk = await _get(`${fullUrl}?id=${slug}&load=episodes&start=${start}`);
    let found = 0;
    for (const m of chunk.matchAll(epRe)) {
      episodes.push({ title: decodeEntities(m[2].trim()), url: `${BASE}${m[1]}` });
      found++;
    }
    if (found === 0) break;
    start += 16;
    if (found < 16) break;
  }

  // Estado de emisión — la ficha lo lista como
  // <span ...>Estado:</span> Finalizado  (confirmado en vivo). Se acota el
  // match a texto suelto tras el </span> para no engancharse con los links
  // del menú ("En Emisión" aparece varias veces en la navegación).
  const statusText = (
    /Estado:\s*<\/span>\s*([^<]+)/i.exec(html)?.[1] ?? ''
  ).trim().toLowerCase();
  const status: PrismDetail['status'] =
    statusText.includes('finalizado') || statusText.includes('concluido')
      ? 'completed'
      : statusText.includes('emision') || statusText.includes('emisión')
      ? 'ongoing'
      : statusText.includes('proximamente') || statusText.includes('próximamente')
      ? 'upcoming'
      : undefined;

  return { title, cover, description, genres, episodes, status };
}

// ─── Reproducción ───────────────────────────────────────────────────────────

// Antes acá había dos listas —`_NEVER_NATIVE` y `_NEVER_NATIVE_HOSTS`— que
// sacaban cuatro servidores de la lista: PremiunVIP, Uqload, StreamWish y
// Mp4Upload. Unos 169 botones de 60 episodios que el usuario nunca veía.
//
// Se quitaron a pedido suyo: prefiere verlos y que se arreglen después. El
// motivo de cada uno no se perdió, se mudó a su carpeta en `servidores/`, y
// ahora en vez de desaparecer llevan el mundo, que dice "esto abre en el
// navegador interno".
//
// Un resumen de por qué estaba cada uno, que sigue valiendo:
//
//   PremiunVIP  resuelve perfecto y IGUAL no sirve en el reproductor nativo:
//               huggingface firma la dirección del CDN con el rango de bytes
//               exacto del primer pedido, así que cualquier otro rango queda
//               sin autorizar y se cuelga para siempre. En un navegador anda.
//   Uqload      el espejo uqload.is de este sitio esconde todo detrás de un
//               formulario POST /dl. Medido 0 de 5 episodios.
//   StreamWish  termina en premilkyway.com, que rechaza la huella TLS de mpv.
//   Mp4Upload   este resuelve y reproduce; se ocultó porque en la app real el
//               nodo :183 rebufereaba en la conexión del usuario. Va con el
//               rayo porque es lo que se midió.

// La desofuscación de re.ironhentai.com (PlusTube y PremiunVIP) se mudó a
// `servidores/`: el truco compartido —doble base64 con un corrimiento de -1
// entre medio— está en `comun.ts` como `desofuscarIronhentai`, y lo que cambia
// entre los dos está en la carpeta de cada uno. Acá ya no hace falta nada:
// `resolverServidor` los reconoce por el endpoint (vt.php contra face.php).

export async function watch(url: string): Promise<PrismWatch> {
  // Fast-path: embed externo (switchServer pidiendo resolver UN servidor
  // puntual) — mismo patrón que las demás extensiones de este repo.
  if (url.indexOf('http') === 0 && url.indexOf('animefenix2.tv') === -1) {
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

  const labels: Record<string, string> = {};
  for (const m of html.matchAll(/<a title="([^"]+)" href="#vid(\d+)">/g)) {
    labels[m[2]] = m[1].trim();
  }

  const streams: PrismStream[] = [];
  const tabRe =
    /tabsArray\['(\d+)'\]\s*=\s*"[^"]*?src='https:\/\/re\.animepelix\.net\/redirect\.php\?id=([^']+)'/g;
  for (const m of html.matchAll(tabRe)) {
    const num = m[1];
    const targetUrl = m[2];
    const name = labels[num] ?? `Servidor ${num}`;
    // Ya no se filtra: se muestran todos y cada uno lleva su marca. El rayo y el
    // mundo salen de la tabla de `servidores/`, que es donde está lo que se
    // midió de cada uno — así el usuario ve que existen y cómo van a abrir, en
    // vez de que le falten opciones sin explicación.
    // El rayo/mundo sale de la tabla de `servidores/`. Acá hace falta que vaya
    // por la dirección y no por el nombre: PlusTube y PremiunVIP comparten host
    // y solo los distingue el endpoint (vt.php contra face.php).
    streams.push({ url: targetUrl, quality: name, nativo: fichaDe(targetUrl)?.nativo });
  }

  // Los que reproducen en la app, primero.
  //
  // Hace falta desde que se dejaron de ocultar cuatro servidores: el sitio
  // lista **PremiunVIP primero** y el cliente toma el primero como el inicial,
  // así que sin esto cada episodio habría abierto justo con el que se cuelga.
  //
  // Es un reordenamiento, no un filtro: están todos, y entre los nativos se
  // respeta el orden del sitio.
  streams.sort((a, b) => (a.nativo === false ? 1 : 0) - (b.nativo === false ? 1 : 0));

  return { streams, pageUrl: episodeUrl };
}

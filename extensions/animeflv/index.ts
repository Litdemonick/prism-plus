import { DESKTOP_UA } from '../../sdk/http';
import { decodeEntities, stripTags } from '../../sdk/html';
import { fichaDe, resolverServidor } from './servidores';
import type {
  PrismDetail,
  PrismEpisode,
  PrismItem,
  PrismStream,
  PrismWatch,
} from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

// ─── AnimeFLV (animeflv.or.at) ───────────────────────────────────────────────
//
// Un WordPress. Medido el 2026-09-27:
// - La portada trae «Últimos episodios» paginados en `?episodes_page=1..6`
//   (24 por página). Es la sección de Inicio de esta extensión.
// - El directorio es `/anime/page/N/`. La página `/genre/<slug>/` está rota
//   en el sitio (muestra una ficha suelta): el género cuelga de los EPISODIOS,
//   no de los animes, así que el listado por género se arma desde la API.
// - Cada anime es una CATEGORÍA de WordPress, y cada episodio un post de esa
//   categoría: la API abierta (`/wp-json/wp/v2/…`) los da ordenados y
//   paginados, más estable que leer el HTML (que arma la lista con JS).
// - El sitio arrancó en junio de 2026: cada anime tiene los episodios desde
//   entonces (One Piece, 14), no la serie entera.
// - Servidores: botones con la dirección en base64 — ver `servidores/`.

const BASE = 'https://animeflv.or.at';

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
  // La API devuelve JSON: el puente puede entregarlo ya decodificado o como
  // texto. Para el HTML, texto tal cual.
  if (typeof raw !== 'string') return raw as unknown as string;
  return raw;
}

async function _getJson<T>(url: string): Promise<T | null> {
  try {
    const crudo = await _get(url);
    if (typeof crudo !== 'string') return crudo as unknown as T;
    return JSON.parse(crudo) as T;
  } catch (e) {
    console.log(`[flv] la API no contestó JSON en ${url.slice(0, 80)}: ${e}`);
    return null;
  }
}

function _abs(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return BASE + (url.startsWith('/') ? url : `/${url}`);
}

/** La portada en tamaño completo: WordPress agrega "-260x200" a las chicas. */
function _portadaGrande(url: string): string {
  return url.replace(/-\d{2,4}x\d{2,4}(\.[a-z]{3,4})$/i, '$1');
}

/** base64 → texto, sin atob (el motor de la app no lo tiene). */
function _desdeBase64(b64: string): string {
  const tabla = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let bits = 0;
  let acum = 0;
  let salida = '';
  for (const c of b64.replace(/[^A-Za-z0-9+/]/g, '')) {
    acum = (acum << 6) | tabla.indexOf(c);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      salida += String.fromCharCode((acum >> bits) & 0xff);
    }
  }
  return salida;
}

// ─── Listados ───────────────────────────────────────────────────────────────

/** Tarjetas del directorio, de un género o de la búsqueda (llevan al anime). */
function _parseTarjetasDeAnime(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  const vistos: Record<string, boolean> = {};
  const re =
    /<a class="thumbnail-link" href="(https:\/\/animeflv\.or\.at\/anime\/[^"]+\/)"[\s\S]*?<img class="anime-image" src="([^"]+)" alt="([^"]*)"/g;
  for (const m of html.matchAll(re)) {
    if (vistos[m[1]]) continue;
    vistos[m[1]] = true;
    items.push({
      title: decodeEntities(m[3].trim()),
      url: m[1],
      cover: _portadaGrande(m[2]),
    });
  }
  return items;
}

/**
 * «Últimos episodios»: cada tarjeta es un EPISODIO (/AAAA/MM/DD/<slug>-episodio-N/).
 * El título del sitio es «One Piece Episodio 1180»: el nombre de la serie va al
 * título y el número a `update`, igual que el resto del repo.
 */
function _parseUltimosEpisodios(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  const re =
    /<div class="Episode">\s*<a href="([^"]+)">[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<h2 class="Title">([^<]+)<\/h2>/g;
  for (const m of html.matchAll(re)) {
    const crudo = decodeEntities(m[3].trim());
    const conNumero = /^(.*?)\s+Episodio\s+([\d.]+)\s*$/i.exec(crudo);
    items.push({
      title: conNumero ? conNumero[1] : crudo,
      url: m[1],
      cover: _portadaGrande(m[2]),
      update: conNumero ? `Ep. ${conNumero[2]}` : undefined,
    });
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  // Las 6 páginas de «Últimos episodios» de la portada; después, el
  // directorio, para que el carrusel no se quede sin más.
  if (page <= 6) {
    const html = await _get(`${BASE}/?episodes_page=${page}`);
    const items = _parseUltimosEpisodios(html);
    if (items.length) return items;
  }
  const n = page <= 6 ? 1 : page - 6;
  const html = await _get(n <= 1 ? `${BASE}/anime/` : `${BASE}/anime/page/${n}/`);
  return _parseTarjetasDeAnime(html);
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const q = keyword.trim();
  const genero = filter?.['genero']?.[0];
  if (q) {
    // La búsqueda del sitio no pagina (la página 2 redirige): todo en la 1.
    if (page > 1) return [];
    const html = await _get(`${BASE}/?s=${encodeURIComponent(q)}`);
    return _parseTarjetasDeAnime(html);
  }
  if (genero) return _porGenero(genero, page);
  const html = await _get(page <= 1 ? `${BASE}/anime/` : `${BASE}/anime/page/${page}/`);
  return _parseTarjetasDeAnime(html);
}

/**
 * Animes de un género. La API da EPISODIOS del género (100 por consulta) y una
 * serie aparece en varias tandas: se junta la lista entera de series una vez
 * (con techo de 10 consultas), se guarda unos minutos y se pagina de a 24, así
 * ninguna serie sale repetida entre páginas.
 */
const _POR_PAGINA = 24;
const _seriesDeGenero: Record<string, { hasta: number; series: { cat: number; media: number }[] }> = {};

async function _seriesDelGenero(generoId: string): Promise<{ cat: number; media: number }[]> {
  const guardado = _seriesDeGenero[generoId];
  if (guardado && guardado.hasta > Date.now()) return guardado.series;
  const series: { cat: number; media: number }[] = [];
  const vistas: Record<number, boolean> = {};
  for (let pag = 1; pag <= 10; pag++) {
    const posts = await _getJson<{ categories: number[]; featured_media: number }[]>(
      `${BASE}/wp-json/wp/v2/posts?genre=${encodeURIComponent(generoId)}&per_page=100&page=${pag}&_fields=categories,featured_media`,
    );
    // Pasada la última página la API contesta un objeto de error, no una lista.
    if (!Array.isArray(posts) || !posts.length) break;
    for (const p of posts) {
      // La serie es la categoría que no es «Sin categoría» (id 1).
      const cat = (p.categories || []).find((c) => c !== 1);
      if (cat == null || vistas[cat]) continue;
      vistas[cat] = true;
      series.push({ cat, media: p.featured_media || 0 });
    }
    if (posts.length < 100) break;
  }
  _seriesDeGenero[generoId] = { hasta: Date.now() + 10 * 60 * 1000, series };
  return series;
}

async function _porGenero(generoId: string, page: number): Promise<PrismItem[]> {
  const todas = await _seriesDelGenero(generoId);
  const tanda = todas.slice((page - 1) * _POR_PAGINA, page * _POR_PAGINA);
  if (!tanda.length) return [];
  const cats =
    (await _getJson<{ id: number; name: string; link: string }[]>(
      `${BASE}/wp-json/wp/v2/categories?include=${tanda.map((s) => s.cat).join(',')}&per_page=100&_fields=id,name,link`,
    )) ?? [];
  const medios = tanda.map((s) => s.media).filter((m) => m > 0);
  const imgs = medios.length
    ? ((await _getJson<{ id: number; source_url: string }[]>(
        `${BASE}/wp-json/wp/v2/media?include=${medios.join(',')}&per_page=100&_fields=id,source_url`,
      )) ?? [])
    : [];
  const catPorId: Record<number, { name: string; link: string }> = {};
  for (const c of Array.isArray(cats) ? cats : []) catPorId[c.id] = c;
  const imgPorId: Record<number, string> = {};
  for (const i of Array.isArray(imgs) ? imgs : []) imgPorId[i.id] = i.source_url;
  const items: PrismItem[] = [];
  for (const s of tanda) {
    const c = catPorId[s.cat];
    if (!c || !/\/anime\//.test(c.link)) continue;
    items.push({
      title: decodeEntities(c.name),
      url: c.link,
      cover: imgPorId[s.media] ? _portadaGrande(imgPorId[s.media]) : '',
    });
  }
  return items;
}

// ─── Filtros ────────────────────────────────────────────────────────────────

export async function createFilter(): Promise<Record<string, unknown>> {
  // Los géneros salen de la API del propio sitio, no de una lista a mano:
  // si suma uno, aparece solo.
  const lista =
    (await _getJson<{ id: number; name: string; count: number }[]>(
      `${BASE}/wp-json/wp/v2/genre?per_page=100&_fields=id,name,count`,
    )) ?? [];
  // La clave es el id: es lo que pide la API de posts para filtrar.
  const opciones: Record<string, string> = { '': 'Todos' };
  for (const g of lista.filter((g) => g.count > 0).sort((a, b) => a.name.localeCompare(b.name))) {
    opciones[String(g.id)] = decodeEntities(g.name);
  }
  return {
    genero: { title: 'Género', options: opciones, default: '', min: 1, max: 1 },
  };
}

// ─── Detalle ────────────────────────────────────────────────────────────────

/** De la dirección de un episodio a la de su serie (el enlace de la miga). */
async function _serieDelEpisodio(url: string): Promise<string | null> {
  try {
    const html = await _get(url);
    const m = /class="breadcrumb-item breadcrumb-current" href="([^"]+)"/.exec(html) ||
      /href="(https:\/\/animeflv\.or\.at\/anime\/[^"]+\/)"[^>]*title=/.exec(html);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function _slugDeSerie(url: string): string | null {
  return /\/anime\/([^/]+)\/?$/.exec(url)?.[1] ?? null;
}

export async function detail(url: string): Promise<PrismDetail> {
  let serie = _abs(url);
  // Desde «Últimos episodios» llega la dirección de un EPISODIO.
  if (!/\/anime\/[^/]+\/?$/.test(serie)) {
    serie = (await _serieDelEpisodio(serie)) ?? serie;
  }
  const html = await _get(serie);

  const titulo = decodeEntities(
    (/<h1 class="anime-title">([\s\S]*?)<\/h1>/.exec(html)?.[1] ??
      /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ??
      '').trim(),
  );
  const portada = /class="poster-image"[^>]*src="([^"]+)"|<img src="([^"]+)" alt="[^"]*" class="poster-image"/.exec(html);
  const sinopsisHtml = /<div class="anime-synopsis">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
  const sinopsis = decodeEntities(stripTags(sinopsisHtml.replace(/<h3>[\s\S]*?<\/h3>/, ''))).trim();
  const generos = [...html.matchAll(/<span class="genre-tag">([^<]+)<\/span>/g)].map((m) =>
    decodeEntities(m[1].trim()),
  );
  const puntaje = parseFloat(/<div class="rating-score">([\d.]+)<\/div>/.exec(html)?.[1] ?? '');

  // Los episodios, por la API: la categoría de la serie → sus posts.
  const episodios: PrismEpisode[] = [];
  const slug = _slugDeSerie(serie);
  if (slug) {
    const cat = await _getJson<{ id: number }[]>(
      `${BASE}/wp-json/wp/v2/categories?slug=${encodeURIComponent(slug)}&_fields=id`,
    );
    const id = cat?.[0]?.id;
    if (id) {
      for (let pagina = 1; pagina <= 20; pagina++) {
        const posts = await _getJson<{ link: string; title: { rendered: string }; date: string }[]>(
          `${BASE}/wp-json/wp/v2/posts?categories=${id}&per_page=100&page=${pagina}&orderby=date&order=asc&_fields=link,title,date`,
        );
        if (!Array.isArray(posts) || posts.length === 0) break;
        for (const p of posts) {
          const nombre = decodeEntities(p.title?.rendered ?? '').trim();
          const numero = parseFloat(/Episodio\s+([\d.]+)/i.exec(nombre)?.[1] ?? '');
          episodios.push({
            title: Number.isFinite(numero) ? `Episodio ${numero}` : nombre,
            url: p.link,
            number: Number.isFinite(numero) ? numero : undefined,
            airDate: p.date ? p.date.slice(0, 10) : undefined,
          });
        }
        if (posts.length < 100) break;
      }
      // En orden de número (las fechas pueden no seguirlo si suben tarde uno).
      episodios.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    }
  }

  return {
    title: titulo || slug || 'AnimeFLV',
    cover: portada ? portada[1] || portada[2] : undefined,
    description: sinopsis || undefined,
    genres: generos.length ? generos : undefined,
    rating: Number.isFinite(puntaje) ? puntaje : undefined,
    episodes: episodios,
  };
}

// ─── Reproducción ───────────────────────────────────────────────────────────

const _IDIOMAS: Record<string, string> = {
  sub: 'SUB',
  subtitulado: 'SUB',
  latino: 'LAT',
  lat: 'LAT',
  castellano: 'CAST',
  dub: 'LAT',
};

export async function watch(url: string): Promise<PrismWatch> {
  // La app pide resolver UN servidor puntual: llega la dirección del embed.
  if (url.indexOf('http') === 0 && url.indexOf('animeflv.or.at') === -1) {
    try {
      const res = await resolverServidor(url, `${BASE}/`);
      if (res && res.url) {
        return {
          streams: [{ url: res.url, quality: 'Servidor', headers: res.headers, nativo: true }],
        };
      }
    } catch (e) {
      console.log(`[flv] no se pudo resolver ${url.slice(0, 50)}: ${e}`);
    }
    return { streams: [], reason: 'resolve_failed' };
  }

  const html = await _get(_abs(url));
  if (typeof html !== 'string' || !html) {
    throw new Error('AnimeFLV no respondió: el sitio puede estar caído o muy lento');
  }

  // Botones: nombre en el tooltip, dirección en base64 en data-src, idioma
  // en app_type.
  const botones: { nombre: string; url: string; idioma: string }[] = [];
  const re =
    /<span class="tooltip-text">([^<]+)<\/span>\s*<button[^>]*data-src="([^"]+)"[^>]*?(?:app_type="([^"]*)")?[^>]*>/g;
  for (const m of html.matchAll(re)) {
    const direccion = _desdeBase64(m[2]).trim();
    if (!/^https?:\/\//.test(direccion)) continue;
    const idioma = _IDIOMAS[(m[3] || 'sub').toLowerCase()] ?? (m[3] || 'SUB').toUpperCase();
    botones.push({ nombre: decodeEntities(m[1].trim()), url: direccion, idioma });
  }
  // Respaldo: el reproductor por defecto de la página.
  if (botones.length === 0) {
    const def = /data-default-src="([^"]+)"/.exec(html)?.[1];
    if (def) botones.push({ nombre: 'Servidor', url: _desdeBase64(def).trim(), idioma: 'SUB' });
  }

  const idiomas = [...new Set(botones.map((b) => b.idioma))];
  const variosIdiomas = idiomas.length > 1;
  // SUB primero, después el resto: la app arranca con el primero, y así el
  // idioma no cambia solo de un episodio a otro.
  idiomas.sort((a, b) => (a === 'SUB' ? -1 : b === 'SUB' ? 1 : 0));

  const streams: PrismStream[] = [];
  const vistos: Record<string, boolean> = {};
  for (const idioma of idiomas) {
    // Dentro de cada idioma, en el orden de la tabla de servidores (el mejor
    // primero), y solo los que reproducen en la app.
    const orden = (u: string) => {
      const f = fichaDe(u);
      return f ? f.orden : 99;
    };
    const delIdioma = botones
      .filter((b) => b.idioma === idioma)
      .sort((a, b) => orden(a.url) - orden(b.url));
    for (const b of delIdioma) {
      if (vistos[b.url]) continue;
      const ficha = fichaDe(b.url);
      if (!ficha || !ficha.nativo) {
        console.log(`[flv] servidor sin reproducción en la app, no se ofrece: ${b.nombre} ${b.url.slice(0, 50)}`);
        continue;
      }
      vistos[b.url] = true;
      streams.push({
        url: b.url,
        quality: variosIdiomas ? `${ficha.boton} · ${idioma}` : ficha.boton,
        nativo: true,
      });
    }
  }
  return { streams };
}

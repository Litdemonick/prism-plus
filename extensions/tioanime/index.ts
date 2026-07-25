import { decodeEntities, stripTags } from '../../sdk/html';
import { resolveEmbed } from '../../sdk/embeds';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream, PrismEpisode } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://tioanime.com';

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

export async function latest(page: number): Promise<PrismItem[]> {
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

export async function detail(url: string): Promise<PrismDetail> {
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

// Mega: descartado a pedido del usuario (todo cifrado client-side, sin URL
// interceptable — el propio sdk/embeds.ts ya lo rechaza de entrada).
// Netu (hqq.tv en este sitio): probado en vivo, resolveEmbed devuelve NULL —
// el formato de ofuscación de este mirror puntual no matchea ninguno de los
// patrones que ya cubre sdk/embeds.ts::resolveNetu.
const _NEVER_NATIVE = new Set(['mega', 'netu']);

export async function watch(url: string): Promise<PrismWatch> {
  // Fast-path: embed externo (switchServer pidiendo resolver UN servidor
  // puntual) — mismo patrón que las demás extensiones de este repo.
  if (url.indexOf('http') === 0 && url.indexOf('tioanime.com') === -1) {
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

  const episodeUrl = _fullUrl(url);
  const html = await _get(episodeUrl);

  const videosM = /var videos\s*=\s*(\[[\s\S]*?\]);/.exec(html);
  const streams: PrismStream[] = [];
  if (videosM) {
    const videos = JSON.parse(videosM[1].replace(/\\\//g, '/')) as [string, string, number, number][];
    for (const [name, embedUrl] of videos) {
      if (_NEVER_NATIVE.has(name.toLowerCase())) continue;
      streams.push({ url: embedUrl, quality: name });
    }
  }

  return { streams, pageUrl: episodeUrl };
}

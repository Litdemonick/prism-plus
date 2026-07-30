import { decodeEntities } from '../../sdk/html';
import { resolveEmbed } from '../../sdk/embeds';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream, PrismEpisode } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://hentaila.com';
const CDN = 'https://cdn.hentaila.com';

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

// El sitio es SvelteKit y embute los datos del servidor como un OBJETO JS (no
// JSON: claves sin comillas y referencias tipo `category:a`), así que no se
// puede JSON.parse. Se leen campos puntuales por regex y se des-escapan a mano
// las secuencias de string de JS.
function _unescapeJs(s: string): string {
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

// ─── Catálogo ───────────────────────────────────────────────────────────────

// La portada de cada card viene con alt="Portada de X"; el bloque de hover
// repite la imagen con alt="Póster de X", así que filtrar por "Portada de"
// evita quedarse con la duplicada. El href al detalle aparece DESPUÉS del
// <h3> del título, de ahí el salto acotado entre medio.
const _CARD_RE =
  /<img[^>]+class="aspect-poster[^"]*"[^>]+src="([^"]+)"[^>]*alt="Portada de ([^"]*)"[\s\S]{0,1500}?href="(\/media\/[a-z0-9-]+)"/g;

// Respaldo por si cambian las clases de la card: el enlace al detalle siempre
// lleva un <span class="sr-only">Ver TÍTULO</span> para accesibilidad. Da
// título y url aunque no dé portada — mejor mostrar el catálogo sin imagen que
// una pantalla vacía.
const _CARD_FALLBACK_RE =
  /href="(\/media\/[a-z0-9-]+)"[^>]*>\s*<span class="sr-only">Ver ([^<]+)<\/span>/g;

function _parseCatalog(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  const seen: Record<string, boolean> = {};
  for (const m of html.matchAll(_CARD_RE)) {
    const url = `${BASE}${m[3]}`;
    if (seen[url]) continue;
    seen[url] = true;
    items.push({
      title: decodeEntities(m[2].trim()),
      url,
      cover: _fullUrl(m[1]),
    });
  }
  if (items.length > 0) return items;
  for (const m of html.matchAll(_CARD_FALLBACK_RE)) {
    const url = `${BASE}${m[1]}`;
    if (seen[url]) continue;
    seen[url] = true;
    items.push({ title: decodeEntities(m[2].trim()), url });
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  const query = _buildQuery({ page: page > 1 ? String(page) : undefined });
  const html = await _get(`${BASE}/catalogo${query ? `?${query}` : ''}`);
  return _parseCatalog(html);
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  // Confirmado en vivo contra el propio catálogo: `genre` filtra (milfs → 175
  // de 1000), `uncensored` filtra (319), `minYear`/`maxYear` filtran (2020-2026
  // → 321), `letter` filtra (A → 63) y `status=emision` filtra (54). El
  // parámetro `category` se acepta pero NO filtra (siempre 1000), así que no se
  // expone en createFilter.
  const years = filter?.['anio']?.[0];
  const query = _buildQuery({
    search: keyword.trim() || undefined,
    genre: filter?.['genero'],
    uncensored: filter?.['censura']?.[0] || undefined,
    letter: filter?.['letra']?.[0] || undefined,
    order: filter?.['orden']?.[0] || undefined,
    status: filter?.['estado']?.[0] || undefined,
    minYear: years ? years.split('-')[0] : undefined,
    maxYear: years ? years.split('-')[1] : undefined,
    page: page > 1 ? String(page) : undefined,
  });
  const html = await _get(`${BASE}/catalogo${query ? `?${query}` : ''}`);
  return _parseCatalog(html);
}

// ─── Filtros ────────────────────────────────────────────────────────────────

// Los 40 géneros salen del genresIdsMap que el propio sitio embute en
// /catalogo, no de una lista escrita a mano.
const _GENRE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  '3d': '3D',
  ahegao: 'Ahegao',
  anal: 'Anal',
  bondage: 'Bondage',
  casadas: 'Casadas',
  chikan: 'Chikan',
  ecchi: 'Ecchi',
  elfas: 'Elfas',
  enfermeras: 'Enfermeras',
  escolares: 'Escolares',
  futanari: 'Futanari',
  gal: 'Gal',
  gore: 'Gore',
  hardcore: 'Hardcore',
  harem: 'Harem',
  incesto: 'Incesto',
  'juegos-sexuales': 'Juegos Sexuales',
  maids: 'Maids',
  milfs: 'Milfs',
  netorare: 'Netorare',
  ninfomania: 'Ninfomanía',
  ninjas: 'Ninjas',
  orgias: 'Orgías',
  oyakodon: 'Oyakodon',
  paizuri: 'Paizuri',
  petit: 'Petit',
  romance: 'Romance',
  shota: 'Shota',
  softcore: 'Softcore',
  succubus: 'Succubus',
  suspenso: 'Suspenso',
  teacher: 'Teacher',
  tentaculos: 'Tentáculos',
  tetonas: 'Tetonas',
  threesome: 'Threesome',
  vanilla: 'Vanilla',
  violacion: 'Violación',
  virgenes: 'Vírgenes',
  yaoi: 'Yaoi',
  yuri: 'Yuri',
};

const _CENSORSHIP_OPTIONS: Record<string, string> = {
  '': 'Todo',
  true: 'Solo sin censura',
};

// Solo los valores cuyo efecto se comprobó en vivo: `popular` y `score`
// cambian el primer resultado, mientras que recent/added/name devolvían lo
// mismo que sin parámetro (son el default o no están soportados).
const _ORDER_OPTIONS: Record<string, string> = {
  '': 'Por defecto',
  popular: 'Más populares',
  score: 'Mejor puntuados',
};

// El sitio muestra un desplegable "Estado" con tres opciones, pero por URL solo
// responden estas dos: `emision` filtra de verdad (54 de 1000) y `proximamente`
// es un valor válido que hoy devuelve 0 (no hay próximos anunciados). El
// "Finalizado" del sitio no se pudo reproducir por URL —se probaron finalizado,
// finalizada, finalizados, terminado, concluido, completado y todos devolvían el
// catálogo entero—, así que no se ofrece en vez de fingir que filtra: para eso
// ya está "Todos", que es casi lo mismo (la enorme mayoría está finalizada).
const _STATUS_OPTIONS: Record<string, string> = {
  '': 'Todos',
  emision: 'En emisión',
  proximamente: 'Próximamente',
};

const _YEAR_OPTIONS: Record<string, string> = {
  '': 'Todos',
  '2020-2026': '2020 - 2026',
  '2015-2019': '2015 - 2019',
  '2010-2014': '2010 - 2014',
  '2000-2009': '2000 - 2009',
  '1990-1999': '1990 - 1999',
};

const _LETTER_OPTIONS: Record<string, string> = { '': 'Todas' };
for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') _LETTER_OPTIONS[c] = c;

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    // Varios géneros a la vez, igual que los checkboxes del propio sitio:
    // repetir `genre=` en la URL los combina como "cualquiera de estos"
    // (comprobado en vivo: milfs 175 + anal 259 → milfs&anal 381). Ojo, la forma
    // con coma (`genre=milfs,anal`) el sitio la IGNORA y devuelve el catálogo
    // entero, así que hay que mandarlos repetidos — es lo que hace _buildQuery
    // con un array.
    genero: { title: 'Género', options: _GENRE_OPTIONS, default: '', min: 1, max: 6 },
    censura: {
      title: 'Censura',
      options: _CENSORSHIP_OPTIONS,
      default: '',
      min: 1,
      max: 1,
      adultOption: 'true',
    },
    orden: { title: 'Orden', options: _ORDER_OPTIONS, default: '', min: 1, max: 1 },
    estado: { title: 'Estado', options: _STATUS_OPTIONS, default: '', min: 1, max: 1 },
    anio: { title: 'Año', options: _YEAR_OPTIONS, default: '', min: 1, max: 1 },
    letra: { title: 'Letra', options: _LETTER_OPTIONS, default: '', min: 1, max: 1 },
  };
}

// ─── Detalle ────────────────────────────────────────────────────────────────

export async function detail(url: string): Promise<PrismDetail> {
  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  const slug = fullUrl.replace(`${BASE}/media/`, '').replace(/\/$/, '');

  // Todo el detalle sale del objeto `media:{...}` que embute SvelteKit — es la
  // misma fuente que usa el sitio para pintar la página, así que no depende de
  // clases de CSS que puedan cambiar.
  const blobStart = html.indexOf('media:{id:');
  const blob = blobStart >= 0 ? html.slice(blobStart, blobStart + 6000) : '';

  const id = /media:\{id:(\d+)/.exec(blob)?.[1];
  const title =
    _unescapeJs(/,title:"((?:[^"\\]|\\.)*)"/.exec(blob)?.[1] ?? '') ||
    decodeEntities(/<h1[^>]*>([^<]+)<\/h1>/i.exec(html)?.[1]?.trim() ?? '');
  const description = _unescapeJs(/synopsis:"((?:[^"\\]|\\.)*)"/.exec(blob)?.[1] ?? '');

  // El poster no viene en el blob (poster:null en todos los revisados); se
  // arma con el id, que es el patrón real del CDN (covers/{id}.jpg).
  const cover = id ? `${CDN}/covers/${id}.jpg` : undefined;

  const genres: string[] = [];
  const genresBlock = /genres:\[([\s\S]*?)\]/.exec(blob)?.[1] ?? '';
  for (const m of genresBlock.matchAll(/name:"((?:[^"\\]|\\.)*)"/g)) {
    genres.push(_unescapeJs(m[1]));
  }

  // episodes:[{id:N,number:M}] — solo interesa `number`, la URL del episodio se
  // arma con el slug (/media/{slug}/{number}), igual que hacen los enlaces
  // reales de la página.
  const episodesBlock = /episodes:\[([\s\S]*?)\]/.exec(blob)?.[1] ?? '';
  const numbers: number[] = [];
  for (const m of episodesBlock.matchAll(/number:(\d+)/g)) numbers.push(Number(m[1]));
  numbers.sort((a, b) => a - b);

  const episodes: PrismEpisode[] = numbers.map((n) => ({
    title: `Episodio ${n}`,
    url: `${BASE}/media/${slug}/${n}`,
    number: n,
  }));

  // Respaldo: si el blob cambiara de forma, los enlaces /media/{slug}/{n}
  // siguen estando en el HTML.
  if (episodes.length === 0) {
    const seen: Record<string, boolean> = {};
    for (const m of html.matchAll(/href="\/media\/[a-z0-9-]+\/(\d+)"/g)) {
      if (seen[m[1]]) continue;
      seen[m[1]] = true;
      episodes.push({
        title: `Episodio ${m[1]}`,
        url: `${BASE}/media/${slug}/${m[1]}`,
        number: Number(m[1]),
      });
    }
    episodes.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  }

  const yearStr = /startDate:"(\d{4})/.exec(blob)?.[1];
  // Hay fichas con startDate absurdo (ej. "3200-02-01"), así que se descarta
  // cualquier año fuera de un rango razonable en vez de mostrar basura.
  const yearNum = yearStr ? Number(yearStr) : undefined;
  const year = yearNum && yearNum >= 1960 && yearNum <= 2100 ? yearNum : undefined;

  const scoreStr = /score:([\d.]+)/.exec(blob)?.[1];
  const score = scoreStr ? Number(scoreStr) : undefined;

  const categoryName = _unescapeJs(
    /category:\{[^}]*?name:"((?:[^"\\]|\\.)*)"/.exec(blob)?.[1] ?? '',
  );

  const extra: Record<string, string> = {};
  if (categoryName) extra['Tipo'] = categoryName;

  return {
    title,
    cover,
    description,
    genres,
    episodes,
    year,
    rating: score && score > 0 ? score : undefined,
    extra: Object.keys(extra).length > 0 ? extra : undefined,
  };
}

// ─── Reproducción ───────────────────────────────────────────────────────────

// Mega: cifrado del lado del cliente, sin URL interceptable — el propio
// sdk/embeds.ts lo rechaza de entrada, así que no se ofrece como servidor.
const _NEVER_NATIVE = ['mega.nz', 'mega.co.nz'];

function _isBlocked(url: string): boolean {
  const s = url.toLowerCase();
  for (const bad of _NEVER_NATIVE) if (s.indexOf(bad) !== -1) return true;
  return false;
}

export async function watch(url: string): Promise<PrismWatch> {
  // Fast-path: el cliente pide resolver UN servidor puntual (switchServer) y
  // manda la URL del embed directamente — mismo patrón que el resto del repo.
  if (url.indexOf('http') === 0 && url.indexOf('hentaila.com') === -1) {
    try {
      const res = await resolveEmbed('Servidor', url, `${BASE}/`);
      if (res && res.url) {
        return {
          streams: [{ url: res.url, quality: 'Servidor', headers: res.headers }],
          pageUrl: '',
        };
      }
    } catch {
      /* sigue abajo con la URL cruda */
    }
    return { streams: [{ url, quality: 'Servidor' }], pageUrl: '' };
  }

  const episodeUrl = _fullUrl(url);
  const html = await _get(episodeUrl);

  // El bloque `embeds:{SUB:[{server,url},...]}` es el que alimenta el iframe
  // del sitio. Se corta antes de `downloads:` a propósito: ese otro bloque
  // tiene la misma forma {server,url} pero son enlaces de DESCARGA
  // (MediaFire, 1Fichier...), no reproducibles.
  const embedsStart = html.indexOf('embeds:{');
  let embedsBlock = '';
  if (embedsStart >= 0) {
    const rest = html.slice(embedsStart);
    const downloadsAt = rest.indexOf('downloads:');
    embedsBlock = downloadsAt > 0 ? rest.slice(0, downloadsAt) : rest.slice(0, 4000);
  }

  const streams: PrismStream[] = [];
  const seen: Record<string, boolean> = {};
  for (const m of embedsBlock.matchAll(
    /server:"((?:[^"\\]|\\.)*)",url:"((?:[^"\\]|\\.)*)"/g,
  )) {
    const server = _unescapeJs(m[1]);
    const embedUrl = _unescapeJs(m[2]);
    if (!embedUrl || _isBlocked(embedUrl) || seen[embedUrl]) continue;
    seen[embedUrl] = true;
    streams.push({ url: embedUrl, quality: server });
  }

  // Último recurso: el iframe que ya viene renderizado en la página.
  if (streams.length === 0) {
    const iframe = /<iframe[^>]+src="([^"]+)"/i.exec(html)?.[1];
    if (iframe && !_isBlocked(iframe)) streams.push({ url: iframe, quality: 'Servidor' });
  }

  // pageUrl siempre: si ningún resolver nativo saca el stream, el cliente cae
  // al WebView sobre la página real del episodio.
  return { streams, pageUrl: episodeUrl };
}

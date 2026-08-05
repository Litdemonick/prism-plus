import { DESKTOP_UA } from '../../sdk/http';
import { decodeEntities, stripTags } from '../../sdk/html';
import { b64decode } from '../../sdk/embeds';
import { fichaDe, resolverServidor } from './servidores';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream, PrismEpisode } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://latanime.org';

async function _get(url: string): Promise<string> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([
      url,
      { method: 'get', headers: { Referer: `${BASE}/`, 'User-Agent': DESKTOP_UA } },
    ]),
  );
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function _fullUrl(url: string): string {
  if (url.indexOf('http') === 0) return url;
  return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ─── Catálogo ───────────────────────────────────────────────────────────────

/**
 * Tarjetas de un listado (directorio o resultados de búsqueda).
 *
 * Las dos páginas usan la MISMA tarjeta pero cargan la portada distinto, y esto
 * hay que respetarlo o una de las dos queda sin imágenes:
 *
 *   directorio → carga diferida: `src` es un placeholder gris igual para todos
 *                (`/img/anime.png`) y la portada real está en `data-src`
 *   búsqueda   → sin diferir: la portada real está directamente en `src`
 *
 * Por eso se toma `data-src` si está y `src` si no, en vez de exigir uno solo
 * (exigir `data-src` dejaba la búsqueda devolviendo cero resultados).
 */
function _parseCatalog(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  const re =
    /<a href="(https:\/\/latanime\.org\/anime\/[^"]+)">([\s\S]*?)<h3[^>]*>([^<]+)<\/h3>/g;
  for (const m of html.matchAll(re)) {
    const bloque = m[2];
    const portada =
      /data-src="([^"]+)"/.exec(bloque)?.[1] ??
      /<img[^>]*\ssrc="([^"]+)"/.exec(bloque)?.[1];
    items.push({
      title: decodeEntities(m[3].trim()),
      url: m[1],
      cover: portada ? _fullUrl(portada) : undefined,
    });
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  const html = await _get(`${BASE}/animes${page > 1 ? `?p=${page}` : ''}`);
  return _parseCatalog(html);
}

// Los filtros sin elegir viajan con el valor 'false', no vacíos — así los manda
// el propio formulario del sitio (confirmado en la URL real:
// /animes?fecha=false&genero=false&letra=false&categoria=false).
const _SIN_FILTRO = 'false';

function _valorFiltro(filter: Record<string, string[]> | undefined, clave: string): string {
  const v = filter?.[clave]?.[0];
  return v && v.length > 0 ? v : _SIN_FILTRO;
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const kw = keyword.trim();
  // El buscador es su propia ruta y NO admite los filtros del directorio, así
  // que se usa uno u otro según haya texto. El campo es `q` (el formulario
  // apunta a /buscar pero el input se llama q).
  if (kw) {
    const html = await _get(
      `${BASE}/buscar?q=${encodeURIComponent(kw)}${page > 1 ? `&p=${page}` : ''}`,
    );
    return _parseCatalog(html);
  }
  const partes = [
    `fecha=${encodeURIComponent(_valorFiltro(filter, 'fecha'))}`,
    `genero=${encodeURIComponent(_valorFiltro(filter, 'genero'))}`,
    `letra=${encodeURIComponent(_valorFiltro(filter, 'letra'))}`,
    `categoria=${encodeURIComponent(_valorFiltro(filter, 'categoria'))}`,
  ];
  if (page > 1) partes.push(`p=${page}`);
  const html = await _get(`${BASE}/animes?${partes.join('&')}`);
  return _parseCatalog(html);
}

// Los cuatro filtros del directorio, tal cual los `<select>` del sitio.
// Comprobados uno por uno en vivo, y también combinados
// (genero=accion + fecha=2024 + categoria=anime devuelve 2 resultados, o sea
// que filtran de verdad y no devuelven el listado entero).

const _ANIO_OPTIONS: Record<string, string> = { [_SIN_FILTRO]: 'Todos' };
for (let a = 2026; a >= 1982; a--) _ANIO_OPTIONS[String(a)] = String(a);

const _GENERO_OPTIONS: Record<string, string> = {
  [_SIN_FILTRO]: 'Todos',
  'accion': 'Acción',
  'artes-marciales': 'Artes Marciales',
  'aventura': 'Aventura',
  'aenime': 'Aenime',
  'blu-ray': 'Blu-ray',
  'carreras': 'Carreras',
  'castellano': 'Castellano',
  'ciencia-ficcion': 'Ciencia Ficción',
  'comedia': 'Comedia',
  'cyberpunk': 'Cyberpunk',
  'dementia': 'Dementia',
  'demonios': 'Demonios',
  'deportes': 'Deportes',
  'donghua': 'Donghua',
  'drama': 'Drama',
  'ecchi': 'Ecchi',
  'escolares': 'Escolares',
  'espacial': 'Espacial',
  'fantasia': 'Fantasía',
  'gore': 'Gore',
  'harem': 'Harem',
  'historico': 'Histórico',
  'historia-paralela': 'Historia paralela',
  'horror': 'Horror',
  'isekai': 'Isekai',
  'josei': 'Josei',
  'latino': 'Latino',
  'lucha': 'Lucha',
  'magia': 'Magia',
  'mecha': 'Mecha',
  'militar': 'Militar',
  'misterio': 'Misterio',
  'monogatari': 'Monogatari',
  'musica': 'Música',
  'parodias': 'Parodias',
  'policia': 'Policía',
  'psicologico': 'Psicológico',
  'recuerdos-de-la-vida': 'Recuerdos de la vida',
  'romance': 'Romance',
  'samurai': 'Samurai',
  'seinen': 'Seinen',
  'shojo': 'Shojo',
  'shonen': 'Shonen',
  'sobrenatural': 'Sobrenatural',
  'suspenso': 'Suspenso',
  'vampiros': 'Vampiros',
  'yaoi': 'Yaoi',
  'yuri': 'Yuri',
};

const _LETRA_OPTIONS: Record<string, string> = { [_SIN_FILTRO]: 'Todas', '09': '0-9' };
for (let i = 0; i < 26; i++) {
  const l = String.fromCharCode(65 + i);
  _LETRA_OPTIONS[l] = l;
}

const _CATEGORIA_OPTIONS: Record<string, string> = {
  [_SIN_FILTRO]: 'Todas',
  'anime': 'Anime',
  'ova': 'Ova',
  'Película': 'Película',
  'especial': 'Especial',
  'corto': 'Corto',
  'ona': 'Ona',
  'donghua': 'Donghua',
  'sin-censura': 'Sin Censura',
  'preestreno': 'Preestreno',
  'pelicula-1080p': 'Película 1080p',
  'latino': 'Latino',
  'Película Latino': 'Película Latino',
  'castellano': 'Castellano',
  'Película Castellano': 'Película Castellano',
  'ova-latino': 'Ova Latino',
  'ova-castellano': 'Ova Castellano',
  'latino-sin-censura': 'Latino Sin Censura',
  'live-action': 'Live Action',
  'Cartoon': 'Cartoon',
  'catalan': 'Catalán',
};

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    genero: { title: 'Género', options: _GENERO_OPTIONS, default: _SIN_FILTRO, min: 1, max: 1 },
    categoria: {
      title: 'Categoría',
      options: _CATEGORIA_OPTIONS,
      default: _SIN_FILTRO,
      min: 1,
      max: 1,
    },
    fecha: { title: 'Año', options: _ANIO_OPTIONS, default: _SIN_FILTRO, min: 1, max: 1 },
    letra: { title: 'Letra', options: _LETRA_OPTIONS, default: _SIN_FILTRO, min: 1, max: 1 },
  };
}

// ─── Detalle ────────────────────────────────────────────────────────────────

export async function detail(url: string): Promise<PrismDetail> {
  const html = await _get(_fullUrl(url));

  const title = decodeEntities(
    /<h2[^>]*>([^<]+)<\/h2>/i.exec(html)?.[1]?.trim() ?? '',
  );
  // La portada de la ficha sí va en `src` (no es diferida como las del
  // catálogo), dentro del bloque `serieimgficha`.
  const coverM = /class="serieimgficha"[\s\S]{0,200}?<img[^>]*src="([^"]+)"/i.exec(html)?.[1];

  const description = decodeEntities(
    stripTags(/<p class="my-2 opacity-75">([\s\S]*?)<\/p>/i.exec(html)?.[1] ?? '').trim(),
  );

  // El texto va dentro de un <div> propio: <a href="/genero/x"><div class="btn">
  // Acción</div></a>. Sin contemplar ese div la lista salía siempre vacía.
  const genres: string[] = [];
  for (const m of html.matchAll(
    /href="https:\/\/latanime\.org\/genero\/[^"]*"[^>]*>\s*(?:<div[^>]*>\s*)?([^<]{2,30})</g,
  )) {
    const g = decodeEntities(m[1].trim());
    if (g && genres.indexOf(g) === -1) genres.push(g);
  }

  // Los episodios se leen de los enlaces /ver/ y se ordenan por número: el
  // sitio los lista en un contenedor con scroll y no siempre en el mismo
  // sentido, así que confiar en el orden del HTML deja capítulos desordenados.
  const vistos: Record<string, boolean> = {};
  const sueltos: { n: number; url: string }[] = [];
  for (const m of html.matchAll(/href="(https:\/\/latanime\.org\/ver\/[^"]+)"/g)) {
    const u = m[1];
    if (vistos[u]) continue;
    vistos[u] = true;
    const nM = /-episodio-(\d+(?:\.\d+)?)/.exec(u);
    sueltos.push({ n: nM ? parseFloat(nM[1]) : sueltos.length + 1, url: u });
  }
  sueltos.sort((a, b) => a.n - b.n);
  const episodes: PrismEpisode[] = sueltos.map((e) => ({
    title: `Episodio ${e.n}`,
    url: e.url,
  }));

  const estado = /class="btn-estado[^"]*"[\s\S]{0,320}?<\/svg>\s*([A-Za-zÁÉÍÓÚáéíóúñÑ]+)/i
    .exec(html)?.[1]
    ?.toLowerCase();
  const status: PrismDetail['status'] =
    estado === 'emision' || estado === 'emisión'
      ? 'ongoing'
      : estado === 'finalizado'
        ? 'completed'
        : estado === 'estreno' || estado === 'proximamente' || estado === 'próximamente'
          ? 'upcoming'
          : undefined;

  return {
    title,
    cover: coverM ? _fullUrl(coverM) : undefined,
    description,
    genres,
    episodes,
    status,
  };
}

// ─── Reproducción ───────────────────────────────────────────────────────────

// Mega es el único que no puede ir por el reproductor nativo: cifra el ARCHIVO
// (no la dirección), así que lo que viaja por la red son bytes cifrados que
// solo un navegador descifra mientras reproduce — no hay URL que sacar. Igual
// se deja en la lista: al fallar el nativo la app abre el WebView, que sí lo
// reproduce. Todos los demás servidores del sitio se resuelven nativos, ver
// sdk/embeds.ts (dsvplay/Doodstream, byse, hexload, savefiles, mixdrop, voe y
// mp4upload — medidos uno por uno).
function _esMega(u: string): boolean {
  return u.indexOf('mega.nz') !== -1 || u.indexOf('mega.co.nz') !== -1;
}

export async function watch(url: string): Promise<PrismWatch> {
  // Fast-path: switchServer pidiendo resolver UN servidor puntual.
  if (url.indexOf('http') === 0 && url.indexOf('latanime.org') === -1) {
    if (!_esMega(url)) {
      try {
        const res = await resolverServidor(url, `${BASE}/`);
        if (res && res.url) {
          return {
            streams: [{ url: res.url, quality: _nombreDe(url), headers: res.headers }],
            pageUrl: '',
          };
        }
      } catch {
        /* sigue: que lo intente el WebView */
      }
    }
    // Sin resolver: se devuelve la página para que la app abra el WebView.
    return { streams: [], pageUrl: url };
  }

  const episodeUrl = _fullUrl(url);
  const html = await _get(episodeUrl);

  // Cada servidor es un <a data-player="BASE64">etiqueta</a>. El set cambia de
  // un episodio a otro (no todos los capítulos están en todos los hosts), así
  // que se lee lo que haya en vez de asumir una lista fija.
  const streams: PrismStream[] = [];
  for (const m of html.matchAll(/data-player="([^"]+)"[^>]*>\s*([^<]*)</g)) {
    let embed = '';
    try {
      embed = b64decode(m[1]).trim();
    } catch {
      continue;
    }
    if (embed.indexOf('http') !== 0) continue;
    const etiqueta = decodeEntities(m[2].trim()) || _nombreDe(embed);
    // El rayo/mundo sale de la tabla de `servidores/`, que va por HOST. Acá
    // hace falta que sea así: el sitio rotula algunos botones como "Ok", el
    // mismo nombre para servidores distintos, así que por la etiqueta no se
    // puede decidir nada.
    streams.push({
      url: embed,
      quality: _nombreBonito(etiqueta),
      nativo: fichaDe(embed)?.nativo,
    });
  }

  return { streams, pageUrl: episodeUrl };
}

/** Nombre de servidor a partir del host, para cuando la etiqueta viene vacía. */
function _nombreDe(u: string): string {
  const l = u.toLowerCase();
  if (l.indexOf('dsvplay') !== -1 || l.indexOf('playmogo') !== -1 || l.indexOf('dood') !== -1)
    return 'Doodstream';
  if (l.indexOf('bysekoze') !== -1) return 'Byse';
  if (l.indexOf('hexload') !== -1) return 'Hexload';
  if (l.indexOf('savefiles') !== -1) return 'Savefiles';
  if (l.indexOf('mixdrop') !== -1) return 'Mixdrop';
  if (l.indexOf('voe') !== -1) return 'Voe';
  if (l.indexOf('mp4upload') !== -1) return 'Mp4upload';
  if (l.indexOf('mega') !== -1) return 'Mega';
  return 'Servidor';
}

/** El sitio etiqueta en minúsculas ("voe", "byse"); se muestran capitalizados. */
function _nombreBonito(s: string): string {
  if (!s) return 'Servidor';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

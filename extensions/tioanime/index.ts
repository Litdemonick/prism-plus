import { DESKTOP_UA } from '../../sdk/http';
import { decodeEntities, stripTags } from '../../sdk/html';
import { SERVIDORES, type Servidor, fichaDe, resolverServidor } from './servidores';
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
    year: filter?.['anio']?.[0],
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

// El año del sitio va como rango `desde,hasta` y cuenta del 1 de enero de
// `desde` al 1 de enero de `hasta`. Medido el 2026-10-12: `2025,2026` trae solo
// lo de 2025; `2025,2025` trae 4 obras sueltas, y un año solo (`2026`) se
// ignora y devuelve todo el catálogo. Por eso cada opción termina en el año
// siguiente. El orden («Más reciente») el sitio lo ignora: no se ofrece.
const _YEAR_OPTIONS: Record<string, string> = {
  '': 'Todos',
  '2026,2027': '2026',
  '2025,2026': '2025',
  '2024,2025': '2024',
  '2020,2024': '2020 – 2023',
  '2010,2020': '2010 – 2019',
  '2000,2010': '2000 – 2009',
  '1990,2000': '1990 – 1999',
  '1950,1990': 'Antes de 1990',
};

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    genero: { title: 'Género', options: _GENRE_OPTIONS, default: '', min: 1, max: 1 },
    tipo: { title: 'Tipo', options: _TYPE_OPTIONS, default: '', min: 1, max: 1 },
    estado: { title: 'Estado', options: _STATUS_OPTIONS, default: '', min: 1, max: 1 },
    anio: { title: 'Año', options: _YEAR_OPTIONS, default: '', min: 1, max: 1 },
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
//
// Qué servidores trae el sitio, medido el 2026-10-12 sobre 36 episodios:
//
//   - Lo reciente trae Mega, Voe y YourUpload.
//   - Lo viejo trae además StreamSB, VidGuard, MixDrop, Okru, Maru y Netu.
//
// Se ofrecen solo los que reproducen en la app: Voe, YourUpload y Okru (ver la
// tabla de `servidores/`). Mega y el resto no tienen resolvedor, y la app ya no
// abre páginas en un navegador: serían botones que no reproducen nunca.

export async function watch(url: string): Promise<PrismWatch> {
  // Fast-path: embed externo (switchServer pidiendo resolver UN servidor
  // puntual) — mismo patrón que las demás extensiones de este repo.
  if (url.indexOf('http') === 0 && url.indexOf('tioanime.com') === -1) {
    try {
      const res = await resolverServidor(url, `${BASE}/`);
      if (res && res.url) {
        return { streams: [{ url: res.url, quality: 'Servidor', headers: res.headers, nativo: true }] };
      }
    } catch (e) {
      console.log(`[ta] no se pudo resolver ${url.slice(0, 50)}: ${e}`);
    }
    // Sin resolver no hay nada que reproducir: devolver el embed crudo solo
    // hacía que el reproductor intentara abrir una página como si fuera vídeo.
    return { streams: [], reason: 'resolve_failed' };
  }

  const episodeUrl = _fullUrl(url);
  const html = await _get(episodeUrl);

  const videosM = /var videos\s*=\s*(\[[\s\S]*?\]);/.exec(html);
  if (!videosM) {
    console.log(`[ta] el episodio no trae lista de vídeos: ${episodeUrl.slice(0, 70)}`);
    return { streams: [], pageUrl: episodeUrl, reason: 'sin_servidores' };
  }
  const videos = JSON.parse(videosM[1].replace(/\\\//g, '/')) as [string, string, number, number][];

  const candidatos: { url: string; ficha: Servidor }[] = [];
  for (const [name, embedUrl] of videos) {
    const ficha = fichaDe(embedUrl);
    if (!ficha || !ficha.nativo) {
      console.log(`[ta] servidor sin reproducción en la app, no se ofrece: ${name} ${embedUrl.slice(0, 50)}`);
      continue;
    }
    if (candidatos.some((c) => c.url === embedUrl)) continue;
    candidatos.push({ url: embedUrl, ficha });
  }

  // **Lo borrado no se ofrece.** Medido el 2026-10-12 sobre 20 episodios
  // viejos: Voe ya no tenía 6 de 10, YourUpload 10 de 19 y Okru 9 de 10, y en
  // 6 episodios no quedaba ninguno. Se le pregunta a la vez a todos, con tope
  // de 3 s, y solo se esconde lo que el servidor dice que borró: sin respuesta
  // a tiempo, ante la duda, se ofrece.
  const borrados: Record<string, boolean> = {};
  await Promise.all(
    candidatos.map(async (c) => {
      const vivo = await Promise.race([
        c.ficha.estaVivo(c.url, `${BASE}/`).catch(() => null),
        new Promise<null>((ok) => setTimeout(() => ok(null), 3000)),
      ]);
      if (vivo === false) {
        borrados[c.url] = true;
        console.log(`[ta] ${c.ficha.boton} ya no tiene este vídeo, no se ofrece: ${c.url.slice(0, 50)}`);
      }
    }),
  );

  // En el orden de la tabla (el mejor primero), no en el del sitio, que cambia
  // de un episodio a otro: así la app arranca siempre por el mismo.
  const orden = (f: Servidor) => SERVIDORES.indexOf(f);
  const streams: PrismStream[] = candidatos
    .filter((c) => !borrados[c.url])
    .sort((a, b) => orden(a.ficha) - orden(b.ficha))
    .map((c) => ({ url: c.url, quality: c.ficha.boton, nativo: true }));

  if (!streams.length) {
    // Con servidores en la página pero todos borrados, la app avisa que el
    // vídeo ya no está en el sitio, en vez de un error genérico.
    return {
      streams: [],
      pageUrl: episodeUrl,
      reason: candidatos.length ? 'servidores_no_disponibles' : 'sin_servidores',
    };
  }
  return { streams };
}

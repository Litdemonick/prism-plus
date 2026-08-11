import { decodeEntities } from '../../sdk/html';
import { UA_ESCRITORIO, fichaDe, resolverServidor } from './servidores';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream, PrismEpisode } from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://animeav1.com';
const CDN = 'https://cdn.animeav1.com';

async function _get(url: string): Promise<string> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([
      url,
      {
        method: 'get',
        headers: { Referer: `${BASE}/`, 'User-Agent': UA_ESCRITORIO },
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

// Marcador literal por el que se corta el HTML en cards. Medido el 2026-08-10:
// en la portada y en el catálogo hay exactamente un trozo por título, y cada
// uno trae su portada (alt="Portada de X"), su título y su enlace. La otra
// imagen de la card —la del bloque de hover, alt="Póster de X"— no lleva esta
// clase, así que no ensucia el corte.
//
// Se corta con split de texto literal y NO con una expresión regular a
// propósito: una regex que salte de la imagen al href (algo tipo
// [\s\S]{0,1500}?) obliga al motor a retroceder en cada card, y el motor de
// regex de QuickJS usa la pila para eso. En Android el runtime arranca con 1 MB
// de stack y en escritorio con el default (ver extension_service.dart), o sea
// que el mismo bundle puede funcionar en PC y devolver NADA en celular — pasó
// exactamente eso con el parser de la extensión de xvideos. Un split literal es
// lineal, no retrocede y da el mismo resultado en cualquier motor.
const _CARD_MARKER = 'class="aspect-poster';

// Respaldo por si cambian las clases de la card: el enlace al detalle siempre
// lleva un <span class="sr-only">Ver TÍTULO</span> para accesibilidad. Da
// título y url aunque no dé portada — mejor mostrar el catálogo sin imagen que
// una pantalla vacía.
const _CARD_FALLBACK_RE =
  /href="(\/media\/[a-z0-9-]+)"[^>]*>\s*<span class="sr-only">Ver ([^<]+)<\/span>/g;

function _parseCatalog(html: string, dentro?: Record<string, boolean>): PrismItem[] {
  const items: PrismItem[] = [];
  const seen: Record<string, boolean> = dentro ?? {};
  // Los regex de acá abajo corren sobre trozos chicos (una card), no sobre la
  // página entera — por eso son baratos y no hay riesgo de retroceso profundo.
  const chunks = html.split(_CARD_MARKER);
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const title = /alt="Portada de ([^"]*)"/.exec(chunk)?.[1];
    if (!title) continue; // no es una card de título
    const href = /href="(\/media\/[a-z0-9-]+)"/.exec(chunk)?.[1];
    if (!href) continue;
    const url = `${BASE}${href}`;
    if (seen[url]) continue;
    seen[url] = true;
    const cover = /src="([^"]+)"/.exec(chunk)?.[1];
    items.push({
      title: decodeEntities(title.trim()),
      url,
      cover: cover ? _fullUrl(cover) : undefined,
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

/**
 * Lo recién agregado, que es lo que va en el Inicio.
 *
 * ── Por qué la primera página pide dos cosas ─────────────────────────────────
 *
 * La sección **«Animes · Recientemente Agregados»** de la portada es la única
 * que está ordenada por lo último que entró, y es lo que se pidió mostrar en el
 * Inicio. Medido el 2026-08-10: va por id descendente y sin saltarse ninguno
 * (4433, 4432, 4431 … 4414).
 *
 * El catálogo NO sirve para reemplazarla. Ordena por otra cosa parecida pero
 * distinta, y **los cuatro más nuevos no están en él**: se probaron doce
 * variantes de `order=` (added, recent, created, new, latest, id, updated,
 * date…) y todas devuelven exactamente lo mismo que sin ordenar, empezando por
 * el 4429. Los 4433-4430 no aparecen en sus cinco primeras páginas.
 *
 * Pero la portada son 20 títulos fijos y no pagina, así que sola no alcanza
 * para desplazarse. De ahí el reparto:
 *
 *   página 1  →  portada (20) + catálogo página 1, sin repetir
 *   página N  →  catálogo página N
 *
 * Con eso no queda ni un hueco ni un repetido: la portada cubre 4433-4414 y el
 * catálogo aporta los seis de abajo (4413-4405) que ella no trae; la página 2
 * arranca en 4408, que no está en ninguna de las dos.
 *
 * El costo es un pedido de más, y **solo en la primera página**. Van en
 * paralelo, así que la espera es la del más lento, no la suma.
 */
export async function latest(page: number): Promise<PrismItem[]> {
  if (page > 1) {
    const html = await _get(`${BASE}/catalogo?page=${page}`);
    return _parseCatalog(html);
  }
  const [portada, catalogo] = await Promise.all([_get(`${BASE}/`), _get(`${BASE}/catalogo`)]);
  // El mismo registro de vistos para las dos, así que lo que ya salió en la
  // portada no se repite abajo.
  const vistos: Record<string, boolean> = {};
  const items = _parseCatalog(portada, vistos);
  return items.concat(_parseCatalog(catalogo, vistos));
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  // Todos comprobados en vivo contra el propio catálogo el 2026-08-10 — ver el
  // detalle de cada uno en createFilter, acá abajo.
  const years = filter?.['anio']?.[0];
  const query = _buildQuery({
    search: keyword.trim() || undefined,
    genre: filter?.['genero'],
    status: filter?.['estado']?.[0] || undefined,
    order: filter?.['orden']?.[0] || undefined,
    letter: filter?.['letra']?.[0] || undefined,
    minYear: years ? years.split('-')[0] : undefined,
    maxYear: years ? years.split('-')[1] : undefined,
    page: page > 1 ? String(page) : undefined,
  });
  const html = await _get(`${BASE}/catalogo${query ? `?${query}` : ''}`);
  return _parseCatalog(html);
}

// ─── Filtros ────────────────────────────────────────────────────────────────

// Los 46 géneros salen del `genresIdsMap` que el propio sitio embute en
// /catalogo, no de una lista escrita a mano. El sitio los separa en dos grupos
// (type:0 y type:1, que en su interfaz son «Géneros» y «Temas»); acá van juntos
// porque el parámetro de la URL es el mismo para los dos.
const _GENRE_OPTIONS: Record<string, string> = {
  '': 'Todos',
  accion: 'Acción',
  antropomorfico: 'Antropomórfico',
  'artes-marciales': 'Artes Marciales',
  aventura: 'Aventura',
  carreras: 'Carreras',
  'ciencia-ficcion': 'Ciencia Ficción',
  comedia: 'Comedia',
  deportes: 'Deportes',
  detectives: 'Detectives',
  drama: 'Drama',
  ecchi: 'Ecchi',
  'elenco-adulto': 'Elenco Adulto',
  escolares: 'Escolares',
  espacial: 'Espacial',
  fantasia: 'Fantasía',
  gore: 'Gore',
  gourmet: 'Gourmet',
  harem: 'Harem',
  historico: 'Histórico',
  'idols-hombre': 'Idols (Hombre)',
  'idols-mujer': 'Idols (Mujer)',
  infantil: 'Infantil',
  isekai: 'Isekai',
  josei: 'Josei',
  'juegos-estrategia': 'Juegos Estrategia',
  'mahou-shoujo': 'Mahou Shoujo',
  mecha: 'Mecha',
  militar: 'Militar',
  misterio: 'Misterio',
  mitologia: 'Mitología',
  musica: 'Música',
  parodia: 'Parodia',
  psicologico: 'Psicológico',
  'recuentos-de-la-vida': 'Recuentos de la Vida',
  romance: 'Romance',
  samurai: 'Samurai',
  seinen: 'Seinen',
  shoujo: 'Shoujo',
  'shoujo-ai': 'Shoujo Ai',
  shounen: 'Shounen',
  'shounen-ai': 'Shounen Ai',
  sobrenatural: 'Sobrenatural',
  superpoderes: 'Superpoderes',
  suspenso: 'Suspenso',
  terror: 'Terror',
  vampiros: 'Vampiros',
};

// ── Por qué NO hay filtro de tipo (Película / OVA / Especial) ────────────────
//
// El sitio tiene un `category=` que **funciona**: acepta los slugs de su
// `categoriesIdsMap` y la cuenta da exacta — `search=movie` devuelve 278, y
// partido sale 277 en `tv-anime` más 1 en `pelicula`. (Con el id numérico,
// `category=2`, en cambio devuelve el catálogo entero: solo anda el slug.)
//
// Pero está **vacío de contenido**: el sitio tiene casi todo su catálogo
// marcado como TV Anime, así que filtrar por Película, OVA o Especial devuelve
// **un solo título cada uno**, y filtrar por TV Anime da exactamente lo mismo
// que no filtrar (revisados 120 ítems del catálogo: los 120 son TV Anime).
//
// O sea: de las cuatro opciones, tres devuelven un resultado y la cuarta no
// hace nada. Ofrecerlo sería darle al usuario un filtro que parece roto cuando
// el que está mal clasificado es el catálogo del sitio. Si algún día terminan
// de clasificar, se agrega `category: filter?.['tipo']?.[0]` en search y este
// bloque de opciones — está todo medido, no hay que volver a averiguarlo.

// Los tres que el sitio acepta de verdad. Comprobado contra un género acotado
// (mecha = 317 títulos) para que el tope de 1000 no tapara el resultado:
// `emision` deja 1, `finalizado` deja 316 y `proximamente` deja 0 (hoy no hay
// ninguno anunciado, pero el valor es válido). Cualquier otra palabra
// —terminado, completado, finalizada— devuelve los 317, o sea que no filtra.
const _STATUS_OPTIONS: Record<string, string> = {
  '': 'Todos',
  emision: 'En emisión',
  finalizado: 'Finalizado',
  proximamente: 'Próximamente',
};

// Solo los tres cuyo efecto se vio: con mecha, `popular` trae Code Geass
// primero, `score` trae Code Geass R2 y `title` trae 009-1. En cambio recent,
// added, name, updated y created devuelven exactamente lo mismo que sin
// ordenar, así que son el orden por omisión y no se ofrecen como si hicieran
// algo.
const _ORDER_OPTIONS: Record<string, string> = {
  '': 'Por defecto',
  popular: 'Más populares',
  score: 'Mejor puntuados',
  title: 'Por título',
};

const _YEAR_OPTIONS: Record<string, string> = {
  '': 'Todos',
  '2020-2026': '2020 - 2026',
  '2015-2019': '2015 - 2019',
  '2010-2014': '2010 - 2014',
  '2000-2009': '2000 - 2009',
  '1990-1999': '1990 - 1999',
  '1960-1989': 'Antes de 1990',
};

const _LETTER_OPTIONS: Record<string, string> = { '': 'Todas' };
for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') _LETTER_OPTIONS[c] = c;

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    // Varios géneros a la vez, igual que los checkboxes del propio sitio:
    // repetir `genre=` en la URL los combina como "cualquiera de estos"
    // (comprobado: mecha 317 + vampiros 84 → los dos juntos, 401, que da
    // exacto). Ojo, la forma con coma (`genre=mecha,vampiros`) el sitio la
    // IGNORA y devuelve el catálogo entero, así que hay que mandarlos
    // repetidos — es lo que hace _buildQuery con un array.
    genero: { title: 'Género', options: _GENRE_OPTIONS, default: '', min: 1, max: 6 },
    estado: { title: 'Estado', options: _STATUS_OPTIONS, default: '', min: 1, max: 1 },
    orden: { title: 'Orden', options: _ORDER_OPTIONS, default: '', min: 1, max: 1 },
    anio: { title: 'Año', options: _YEAR_OPTIONS, default: '', min: 1, max: 1 },
    letra: { title: 'Letra', options: _LETTER_OPTIONS, default: '', min: 1, max: 1 },
  };
}

// ─── Detalle ────────────────────────────────────────────────────────────────

// El `status` del blob es un número. Medido con el filtro del propio sitio:
// pidiendo status=emision los títulos vienen con 2, y con status=finalizado
// vienen con 0. Los otros valores no se pudieron ver (hoy no hay ningún
// "próximamente" en el catálogo), así que se dejan sin traducir en vez de
// adivinarlos: la app se arregla sin el dato, pero no con un dato falso.
const _ESTADOS: Record<string, 'ongoing' | 'completed'> = { '0': 'completed', '2': 'ongoing' };

export async function detail(url: string): Promise<PrismDetail> {
  const fullUrl = _fullUrl(url);
  const html = await _get(fullUrl);
  const slug = fullUrl.replace(`${BASE}/media/`, '').replace(/\/$/, '');

  // Todo el detalle sale del objeto `media:{...}` que embute SvelteKit — es la
  // misma fuente que usa el sitio para pintar la página, así que no depende de
  // clases de CSS que puedan cambiar.
  const blobStart = html.indexOf('media:{id:');
  const blob = blobStart >= 0 ? html.slice(blobStart, blobStart + 8000) : '';

  const id = /media:\{id:(\d+)/.exec(blob)?.[1];
  const title =
    _unescapeJs(/,title:"((?:[^"\\]|\\.)*)"/.exec(blob)?.[1] ?? '') ||
    decodeEntities(/<h1[^>]*>([^<]+)<\/h1>/i.exec(html)?.[1]?.trim() ?? '');
  const description = _unescapeJs(/synopsis:"((?:[^"\\]|\\.)*)"/.exec(blob)?.[1] ?? '');

  // El poster viene siempre en null en el blob; se arma con el id, que es el
  // patrón real del CDN.
  const cover = id ? `${CDN}/covers/${id}.jpg` : undefined;

  const genres: string[] = [];
  const genresBlock = /genres:\[([\s\S]*?)\]/.exec(blob)?.[1] ?? '';
  for (const m of genresBlock.matchAll(/name:"((?:[^"\\]|\\.)*)"/g)) {
    genres.push(_unescapeJs(m[1]));
  }

  // episodes:[{id:N,number:M}] — la URL se arma con el slug y el `number`,
  // igual que los enlaces reales de la página.
  //
  // **El número NO se puede dar por sentado.** Las películas vienen con
  // `number:0`, y pedir /1 en esas devuelve una página sin servidores: parece
  // un título roto y no lo está. Por eso se usan los números tal como vienen y
  // nunca un contador propio.
  const episodesBlock = /episodes:\[([\s\S]*?)\]/.exec(blob)?.[1] ?? '';
  const numbers: number[] = [];
  for (const m of episodesBlock.matchAll(/number:(\d+)/g)) numbers.push(Number(m[1]));
  numbers.sort((a, b) => a - b);

  const categoryName = _unescapeJs(
    /category:\{[^}]*?name:"((?:[^"\\]|\\.)*)"/.exec(blob)?.[1] ?? '',
  );
  // Una película o un especial viene como un único episodio con `number:0`, y
  // "Episodio 0" ahí queda mal. Se rotula "Ver" y no con la categoría del
  // sitio: se probó y **la categoría miente** — la película de Ansatsu
  // Kyoushitsu figura como "TV Anime", que es lo que este sitio le pone a casi
  // todo su catálogo. Mejor una palabra neutra que un dato falso.
  const esUnico = numbers.length === 1;
  const nombreEpisodio = (n: number): string =>
    esUnico && n === 0 ? 'Ver' : `Episodio ${n}`;

  const episodes: PrismEpisode[] = numbers.map((n) => ({
    title: nombreEpisodio(n),
    url: `${BASE}/media/${slug}/${n}`,
    number: n,
    // Miniatura propia de cada episodio. Existen y responden: comprobadas 20
    // de 20 sobre diez títulos (el primero y el último episodio de cada uno).
    //
    // **Hoy no llegan a la app y no es cosa de la extensión**: el empaquetador
    // del repo aplana la lista a `{title:'Episodios', urls:[{name,url}]}`, así
    // que `thumbnail`, `airDate` y `number` se pierden en el camino
    // (comprobado el 2026-08-10 corriendo el bundle ya compilado). Es el
    // pendiente que ya está anotado para la 1.0.26. Se manda igual: el campo
    // es parte del contrato, está bien medido, y el día que el empaquetador
    // deje de aplanarlo esto anda solo.
    thumbnail: id ? `${CDN}/screenshots/${id}/${n}.jpg` : undefined,
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
  // Hay fichas con startDate absurdo, así que se descarta cualquier año fuera
  // de un rango razonable en vez de mostrar basura.
  const yearNum = yearStr ? Number(yearStr) : undefined;
  const year = yearNum && yearNum >= 1960 && yearNum <= 2100 ? yearNum : undefined;

  const scoreStr = /score:([\d.]+)/.exec(blob)?.[1];
  const score = scoreStr ? Number(scoreStr) : undefined;

  const extra: Record<string, string> = {};
  if (categoryName) extra['Tipo'] = categoryName;
  // El título original y el internacional, que el sitio guarda aparte.
  const aka = /aka:\{([^}]*)\}/.exec(blob)?.[1] ?? '';
  const akaJa = _unescapeJs(/"ja-jp":"((?:[^"\\]|\\.)*)"/.exec(aka)?.[1] ?? '');
  const akaEn = _unescapeJs(/"en-us":"((?:[^"\\]|\\.)*)"/.exec(aka)?.[1] ?? '');
  if (akaJa) extra['Título original'] = akaJa;
  if (akaEn) extra['También conocido como'] = akaEn;
  const votos = /votes:(\d+)/.exec(blob)?.[1];
  if (votos && Number(votos) > 0) extra['Votos'] = votos;
  // Cuándo sale el próximo, si está en emisión.
  const proximo = /nextDate:"(\d{4}-\d{2}-\d{2})/.exec(blob)?.[1];
  if (proximo) extra['Próximo episodio'] = proximo;

  const estado = _ESTADOS[/,status:(\d+)/.exec(blob)?.[1] ?? ''];

  return {
    title,
    cover,
    description,
    genres,
    episodes,
    year,
    status: estado,
    rating: score && score > 0 ? score : undefined,
    extra: Object.keys(extra).length > 0 ? extra : undefined,
  };
}

// ─── Reproducción ───────────────────────────────────────────────────────────

/**
 * Cómo rotula el sitio cada idioma. Se respetan sus siglas en vez de traducir:
 * es lo que el usuario ve en la web, y traducir «DUB» a «Latino» sería afirmar
 * algo que el sitio no dice.
 */
const _IDIOMAS: Record<string, string> = { SUB: 'SUB', DUB: 'DUB' };

/**
 * Enlaces que el propio sitio publica rotos.
 *
 * No es una precaución teórica: la película «Kimetsu no Yaiba Movie 1» trae,
 * **en SUB y en DUB**, `https://www.mp4upload.com/embed-undef.html` — con
 * `undef` donde va el identificador. El sitio guardó un `undefined` de su
 * propio JavaScript.
 *
 * Y el resultado era de lo peor que puede pasar: esa dirección no existe,
 * mp4upload redirige a su página de políticas, el reproductor dice «no
 * reconozco el formato» y la app termina abriendo el navegador interno sobre
 * **la pantalla de iniciar sesión de mp4upload**. Reportado en vivo el
 * 2026-08-10 y confundido con «mp4upload está caído», cuando el servidor
 * funciona perfecto: medido, el embed de cualquier otro episodio contesta 200
 * con su mp4 adentro.
 *
 * Descartarlo acá hace que el botón ni aparezca en esos episodios, que es lo
 * honesto: ese archivo no está subido, no hay nada que abrir.
 */
function _estaRota(url: string): boolean {
  return /\/embed-undef(?:ined)?\.html/i.test(url) || /[?#/]undefined(?:[?#/&]|$)/i.test(url);
}

export async function watch(url: string): Promise<PrismWatch> {
  // Fast-path: el cliente pide resolver UN servidor puntual (switchServer) y
  // manda la URL del embed directamente — mismo patrón que el resto del repo.
  if (url.indexOf('http') === 0 && url.indexOf('animeav1.com') === -1) {
    try {
      const res = await resolverServidor(url, `${BASE}/`);
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

  // El bloque `embeds:{SUB:[{server,url},…],DUB:[…]}` es el que alimenta el
  // reproductor del sitio. Se corta antes de `downloads:` a propósito: ese otro
  // bloque tiene la misma forma {server,url} pero son enlaces de DESCARGA
  // (TransferIt, 1Fichier, MediaFire…), no reproducibles.
  const embedsStart = html.indexOf('embeds:{');
  let embedsBlock = '';
  if (embedsStart >= 0) {
    const rest = html.slice(embedsStart);
    const downloadsAt = rest.indexOf('downloads:');
    embedsBlock = downloadsAt > 0 ? rest.slice(0, downloadsAt) : rest.slice(0, 6000);
  }

  // Los idiomas se leen por separado y **no se deduplica por nombre de
  // servidor**: los cuatro botones se repiten en cada idioma con direcciones
  // distintas, así que deduplicar por nombre borraría un idioma entero. Es el
  // error que ya se había cometido en FuegoCine.
  const porIdioma: { idioma: string; server: string; url: string }[] = [];
  for (const m of embedsBlock.matchAll(/([A-Z]{2,5}):\[([\s\S]*?)\]/g)) {
    const idioma = _IDIOMAS[m[1]];
    if (!idioma) continue;
    for (const s of m[2].matchAll(/server:"((?:[^"\\]|\\.)*)",url:"((?:[^"\\]|\\.)*)"/g)) {
      const direccion = _unescapeJs(s[2]);
      if (_estaRota(direccion)) {
        console.log(`[av1] el sitio publica un enlace roto, se descarta: ${direccion}`);
        continue;
      }
      porIdioma.push({
        idioma,
        server: _unescapeJs(s[1]),
        url: direccion,
      });
    }
  }

  const streams: PrismStream[] = [];
  const seen: Record<string, boolean> = {};
  // SUB primero y DUB después, aunque el sitio los mande al revés cuando hay
  // doblaje. El motivo es que la app abre el episodio con el PRIMER servidor de
  // la lista: como solo 23 de 99 títulos tienen doblaje, respetar el orden del
  // sitio haría que un episodio arrancara en DUB y el siguiente —del mismo
  // anime, pero sin doblar— en SUB. Empezando siempre por SUB el idioma no
  // cambia solo de un episodio a otro, y el doblaje queda a un toque.
  const idiomas = ['SUB', 'DUB'];
  // Solo se aclara el idioma cuando el episodio trae más de uno: en los 76 de
  // cada 99 que vienen solo subtitulados, un "HLS · SUB" sería ruido.
  const vistosIdioma: Record<string, boolean> = {};
  let cuantosIdiomas = 0;
  for (const e of porIdioma) {
    if (vistosIdioma[e.idioma]) continue;
    vistosIdioma[e.idioma] = true;
    cuantosIdiomas++;
  }
  const variosIdiomas = cuantosIdiomas > 1;
  for (const idioma of idiomas) {
    // Dentro de cada idioma, el orden es el de la tabla de `servidores/`:
    // los nativos primero y Mega al final.
    const delIdioma = porIdioma.filter((e) => e.idioma === idioma);
    const conFicha = delIdioma
      .map((e) => ({ ...e, ficha: fichaDe(e.url) }))
      .sort((a, b) => (a.ficha?.nativo === b.ficha?.nativo ? 0 : a.ficha?.nativo ? -1 : 1));
    for (const e of conFicha) {
      if (!e.url || seen[e.url]) continue;
      // Mega fuera de la lista, a pedido del usuario (2026-08-10). No reproduce
      // en el nativo —descifra del lado del navegador y no hay dirección que
      // sacar— así que su botón solo lleva al navegador interno.
      //
      // Acá sí se puede sacar y en tioanime NO: allá eran tres servidores y
      // quitarlo dejaba episodios sin ninguno que abriera. Estos episodios
      // quedan con tres, y los tres reproducen nativo.
      if (e.ficha?.boton === 'Mega') continue;
      seen[e.url] = true;
      streams.push({
        url: e.url,
        // Con el idioma pegado al nombre: sin eso, un episodio con doblaje
        // muestra "HLS" dos veces y no hay forma de saber cuál es cuál.
        quality: variosIdiomas ? `${e.server} · ${e.idioma}` : e.server,
        // El rayo y el mundo salen de la tabla de `servidores/`, que es donde
        // está lo que se midió de cada uno. Sin esto la app lo adivina por el
        // nombre, y acá le erraría a dos: "HLS" no es el nombre de ningún
        // servidor conocido, y Mega reproduce solo en el navegador.
        nativo: e.ficha?.nativo,
      });
    }
  }

  // Último recurso: el iframe que ya viene renderizado en la página.
  if (streams.length === 0) {
    const iframe = /<iframe[^>]+src="([^"]+)"/i.exec(html)?.[1];
    if (iframe) {
      streams.push({ url: iframe, quality: 'Servidor', nativo: fichaDe(iframe)?.nativo });
    }
  }

  // pageUrl siempre: si ningún resolver nativo saca el stream, el cliente cae
  // al WebView sobre la página real del episodio.
  return { streams, pageUrl: episodeUrl };
}

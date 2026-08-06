// ─── UA · unlimplay.com ──────────────────────────────────────────────────────
//
// 395 botones: el servidor más usado del sitio. Reproduce en la app.
//
// La página del embed trae, en texto plano, un campo "direct" con un
// `master.m3u8` firmado en vimeos.net. Sin desempaquetar nada.
//
// OJO CON LA RUTA: el sitio guarda enlaces con rutas viejas —`/play/embed/...`
// y `/play.php/embed/...`— y con esas devuelve su PORTADA en vez del embed, así
// que el reproductor abría la página de inicio. Medido con los mismos títulos:
// `/play.php/embed/movie/7131` y `/play/embed/movie/7131` no traen nada, y
// `/f/embed/movie/7131` sí. Las que hoy funcionan con `/play/embed/` también
// funcionan con `/f/embed/`, o sea que normalizar no le saca nada a las que ya
// andaban.
//
// Medido el 2026-08-04: ~3,5 s (la página pesa 113 KB) hasta el m3u8.
//
// ── Este servidor llega hasta 720p, y se sabe sin bajar nada ────────────────
//
// Medido el 2026-08-05: la lista que devuelve trae SOLO DOS variantes, 480p y
// 720p. No hay 1080p, así que ver "Calidad de arranque: 720p" no es que la app
// esté eligiendo mal — es el máximo que hay.
//
//   Van Helsing    888x480  0,81 Mbps  ·  1328x720  1,98 Mbps
//   Matilda       1152x480  0,93 Mbps  ·  1728x720  2,38 Mbps
//
// **El truco:** las calidades están escritas en la propia dirección, en el
// tramo `_,n,h,.urlset` de antes del `master.m3u8`. Cada letra es una variante:
// `n` es 480p y `h` es 720p. Los de goodstream, por ejemplo, traen
// `_,l,n,h,x,.urlset` — cuatro. O sea que mirando la dirección ya se sabe qué
// calidades hay, sin pedir el m3u8.
//
// ── Y ojo: hay títulos que unlimplay directamente no tiene ──────────────────
//
// Medido sobre 5 títulos: 4 resuelven y 1 no. El que no (`/f/embed/movie/1212763`,
// Evil Dead: En Llamas) devuelve una página de 113 KB que carga bien pero **no
// trae ninguna dirección de vídeo adentro** — el único `.m3u8` que aparece es
// una expresión regular dentro del JS del reproductor. No es que el resolver
// falle: el archivo no está. Ahí no sirve ni el navegador interno, porque la
// página tampoco tiene nada que encontrar.

import { pedir, UA_NAVEGADOR, type ServidorResuelto } from '../comun';

/** La ruta al día. Se exporta porque también hace falta ANTES de resolver: es
 *  la dirección que se le entrega a la app, y la que abre el navegador interno
 *  si el camino nativo no alcanza. Con la ruta vieja, ahí se veía la portada. */
export function rutaAlDia(url: string): string {
  return url.replace(/\/(?:play\.php|play|f)\/embed\//, '/f/embed/');
}

/**
 * La marca que separa los dos usos de este mismo embed.
 *
 * unlimplay sirve para dos cosas distintas y conviene ofrecerlas por separado:
 *
 *   **UA Directo** — su opción "Direct", que es la que este resolver saca del
 *   campo `direct`: un m3u8 que reproduce en la app. ⚡
 *
 *   **UA Multi** — la MISMA página, pero abierta en el navegador interno para
 *   que el usuario use el selector propio de unlimplay, que ofrece otros ocho
 *   servidores (Goodstream, Streamhg, Filemoon, Voe, Streamwish, Vidhide,
 *   Netu…). Eso no se puede resolver desde acá: hay que dejar que la página lo
 *   maneje. 🌐
 *
 * Como los dos son la misma dirección, se distinguen con este fragmento. Al
 * sitio no le molesta —los fragmentos ni se mandan al servidor— y acá alcanza
 * para saber que ese botón NO tiene que resolverse.
 */
export const MARCA_MULTI = '#multi';

/** Marca de idioma para el Direct: `#lang=subtitulado`. */
export const MARCA_IDIOMA = '#lang=';

/** El idioma pedido en una dirección, o null si no lleva marca. */
export function idiomaDe(url: string): string | null {
  const i = url.indexOf(MARCA_IDIOMA);
  return i === -1 ? null : url.slice(i + MARCA_IDIOMA.length);
}

/**
 * Etiqueta corta del idioma, para el nombre del botón.
 *
 * El sitio no usa un vocabulario fijo: se vieron `latino`, `subtitulado`,
 * `español` y `espanol` (sin eñe) en el mismo catálogo, y a veces los cuatro en
 * el mismo título. Se normaliza acá para que el botón no dependa de cómo lo
 * escribieron ese día.
 */
export function etiquetaDeIdioma(idioma: string): string {
  const i = idioma.toLowerCase();
  if (i.indexOf('latino') !== -1) return 'LAT';
  if (i.indexOf('subtitul') !== -1 || i.indexOf('ingl') !== -1) return 'Inglés-Sub';
  if (i.indexOf('espa') !== -1) return 'ESP';
  if (i.indexOf('cast') !== -1) return 'CAST';
  return idioma;
}

/** Un servidor de los que unlimplay lleva adentro. */
export interface ServidorDeUnlimplay {
  nombre: string;
  /** Tal cual lo escribió el sitio: `latino`, `subtitulado`, `español`… */
  idioma: string;
  url: string;
  /** true si ya viene resuelto y no hay nada que pedir (los "direct"). */
  yaResuelto: boolean;
}

/**
 * Los servidores que unlimplay lleva ADENTRO.
 *
 * unlimplay no es un servidor: es un reproductor con su propio menú. La página
 * publica ese menú en texto plano, en un `const EMBEDS = {...}` con los idiomas
 * arriba y los servidores adentro de cada uno:
 *
 *   {"latino":{"direct":"https://s8.vimeos.net/…master.m3u8?t=…",
 *              "goodstream":"https://goodstream.one/embed-….html",
 *              "streamhg":"https://hlswish.com/e/…",
 *              "filemoon":"https://filemoon.sx/e/…",
 *              "voe":"https://voe.sx/e/…",
 *              "streamwish":"https://streamwish.to/e/…",
 *              "vidhide":"https://vidhidepro.com/v/…",
 *              "netu":"https://waaw.to/f/…",
 *              "direct 2":"https://s8.vimeos.net/…"}}
 *
 * Sacarlos de ahí es lo que permite ofrecerlos como botones propios en vez de
 * mandar al usuario al navegador a buscarlos: la mayoría son servidores que el
 * repo ya sabe resolver, así que pasan a reproducir en la app.
 *
 * Los `direct` son un regalo: **ya vienen resueltos**, son el m3u8 firmado. No
 * hay que pedir nada más.
 *
 * Cuesta UN pedido (la página del embed), y es el mismo que igual haría falta
 * para resolver el Direct.
 */
export async function servidoresDe(
  url: string,
  referer: string,
): Promise<ServidorDeUnlimplay[]> {
  const html = await pedir(rutaAlDia(url), referer);
  if (typeof html !== 'string') return [];
  return servidoresDeBloque(html);
}

/**
 * Lo mismo que [servidoresDe], pero sobre un HTML que ya se tiene.
 *
 * Separado para que el resolver del Direct pueda leer el menú sin hacer un
 * SEGUNDO pedido a la misma página que acaba de traer.
 */
export function servidoresDeBloque(html: string): ServidorDeUnlimplay[] {
  const ini = html.indexOf('const EMBEDS');
  if (ini === -1) return [];
  // Se corta un trozo generoso y se leen los pares con regex: no se hace
  // JSON.parse porque el bloque sigue con más cosas después y encontrarle el
  // cierre exacto es más frágil que buscar los pares que interesan.
  const bloque = html.slice(ini, ini + 8000);

  // ── El idioma importa, y antes se tiraba ──────────────────────────────────
  //
  // El bloque va agrupado POR IDIOMA, y acá se leía de corrido deduplicando por
  // nombre. Con eso, de un título con latino y subtitulado quedaba SOLO el
  // primero: el menú del propio sitio mostraba el doble de opciones que la app.
  //
  // Se recorren los grupos en orden, quedándose con el idioma del último
  // encabezado visto. Los idiomas medidos en el catálogo son cuatro y no son
  // consistentes —`latino`, `subtitulado`, `español` y `espanol`—, así que no
  // se validan contra una lista: cualquier clave que abra un grupo vale.
  //
  // `searched_names` NO es un grupo de servidores: es un array de títulos que
  // el sitio deja ahí. Se saltea porque no abre `{`.
  const salida: ServidorDeUnlimplay[] = [];
  const vistos: Record<string, boolean> = {};
  let idioma = '';
  const re = /"([a-zA-ZÀ-ÿ0-9 _-]{3,24})"\s*:\s*(\{|"(https?:\/\/[^"]+)")/g;
  for (const m of bloque.matchAll(re)) {
    const clave = m[1].trim();
    // Abre un grupo: es un idioma.
    if (m[2] === '{') {
      idioma = clave;
      continue;
    }
    const dir = (m[3] ?? '').replace(/\\\//g, '/');
    if (!dir) continue;
    // Un mismo servidor puede venir repetido dentro del mismo idioma
    // ("voe", "voe 2", "voe 3"): se distingue por nombre COMPLETO, así no se
    // pierde ninguno, y quien arma los botones decide si los quiere todos.
    const llave = `${idioma}|${clave}`;
    if (vistos[llave]) continue;
    vistos[llave] = true;
    salida.push({
      nombre: clave,
      idioma,
      url: dir,
      // Los "direct" ya son el m3u8; el resto son páginas de embed.
      yaResuelto: /\.m3u8/.test(dir),
    });
  }
  return salida;
}

export async function resolver(
  url: string,
  referer: string,
): Promise<ServidorResuelto | null> {
  // El botón "UA Multi" va al navegador a propósito: lo que se quiere de él es
  // el selector de la propia página, no el vídeo directo.
  if (url.indexOf(MARCA_MULTI) !== -1) return null;

  const html = await pedir(rutaAlDia(url), referer);
  if (typeof html !== 'string') return null;

  // ── El Direct del idioma que se pidió ─────────────────────────────────────
  //
  // Todos los idiomas comparten la MISMA dirección de embed, así que sin esto
  // los botones de latino y de subtitulado resolvían al mismo `direct`: el
  // primero de la página. El usuario elegía subtitulado y le salía el latino.
  //
  // La marca `#lang=…` va en el fragmento, igual que `#multi`: no se manda al
  // servidor y alcanza para saber cuál buscar. Sin marca, se toma el primero,
  // que es como venía siendo.
  const idioma = idiomaDe(url);
  if (idioma) {
    const delIdioma = servidoresDeBloque(html).find(
      (s) => s.idioma === idioma && /^direct/i.test(s.nombre) && s.yaResuelto,
    );
    if (delIdioma) {
      return {
        url: delIdioma.url,
        headers: { 'User-Agent': UA_NAVEGADOR },
      };
    }
    // Si ese idioma no trae Direct, se sigue con el de abajo: mejor el de otro
    // idioma que ninguno — el botón ya existe y el usuario lo tocó.
    console.log(`[fc/unlimplay] sin direct para "${idioma}", se usa el primero`);
  }

  const m = /"direct[^"]*":"([^"]+\.m3u8[^"]*)"/.exec(html);
  if (!m) {
    console.log('[fc/unlimplay] la página no trae el campo direct');
    return null;
  }
  // El User-Agent viaja junto con la dirección, y no es un adorno: vimeos ata
  // el vale a quien lo pidió. Si el reproductor pide con el suyo —mpv manda
  // "libmpv"— el CDN contesta 403 y en la app se ve como "no se puede
  // reproducir" con un servidor que está impecable. Medido: ver UA_NAVEGADOR
  // en `comun.ts`.
  return {
    url: m[1].replace(/\\\//g, '/'),
    headers: { 'User-Agent': UA_NAVEGADOR },
  };
}

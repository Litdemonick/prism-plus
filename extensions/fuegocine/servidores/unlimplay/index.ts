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

import { pedir, type ServidorResuelto } from '../comun';

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

export async function resolver(
  url: string,
  referer: string,
): Promise<ServidorResuelto | null> {
  // El botón "UA Multi" va al navegador a propósito: lo que se quiere de él es
  // el selector de la propia página, no el vídeo directo.
  if (url.indexOf(MARCA_MULTI) !== -1) return null;

  const html = await pedir(rutaAlDia(url), referer);
  if (typeof html !== 'string') return null;
  const m = /"direct[^"]*":"([^"]+\.m3u8[^"]*)"/.exec(html);
  if (!m) {
    console.log('[fc/unlimplay] la página no trae el campo direct');
    return null;
  }
  return { url: m[1].replace(/\\\//g, '/') };
}

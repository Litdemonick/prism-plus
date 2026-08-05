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

import { pedir, type ServidorResuelto } from '../comun';

/** La ruta al día. Se exporta porque también hace falta ANTES de resolver: es
 *  la dirección que se le entrega a la app, y la que abre el navegador interno
 *  si el camino nativo no alcanza. Con la ruta vieja, ahí se veía la portada. */
export function rutaAlDia(url: string): string {
  return url.replace(/\/(?:play\.php|play|f)\/embed\//, '/f/embed/');
}

export async function resolver(
  url: string,
  referer: string,
): Promise<ServidorResuelto | null> {
  const html = await pedir(rutaAlDia(url), referer);
  if (typeof html !== 'string') return null;
  const m = /"direct[^"]*":"([^"]+\.m3u8[^"]*)"/.exec(html);
  if (!m) {
    console.log('[fc/unlimplay] la página no trae el campo direct');
    return null;
  }
  return { url: m[1].replace(/\\\//g, '/') };
}

// ─── Vimeo · vimeos.net ──────────────────────────────────────────────────────
//
// 49 botones en el catálogo. Reproduce en la app.
//
// Nada que ver con vimeo.com: es la misma plataforma que hay detrás de
// unlimplay (sus direcciones terminan en vimeos.net / vimeos.zip).
//
// Como dropload, guarda la dirección dentro de un `eval(p,a,c,k,e,d)`. La
// página además trae jwplayer y anuncios, que acá no se cargan: se saca la
// dirección y se le pasa al reproductor de la app.
//
// Medido el 2026-08-04: ~0,6 s hasta un `master.m3u8` en p*.vimeos.zip.

import { buscarDireccion, hostDe, pedir, type ServidorResuelto } from '../comun';

export async function resolver(
  url: string,
  referer: string,
): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : undefined);
}

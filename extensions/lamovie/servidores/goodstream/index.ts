// ─── GoodstreamOne · goodstream.one ⚡ nativo ────────────────────────────────
//
// El segundo del sitio, y el ÚNICO con 1080p. Reproduce en la app.
//
// **Medido el 2026-08-06: 8 de 8.** Con el primer segmento bajado de verdad,
// entre 480 KB y 4,6 MB según el título.
//
// ── Es el que más calidad da ────────────────────────────────────────────────
//
// Su dirección trae `_,l,n,h,x,.urlset`: CUATRO variantes, contra las dos de
// vimeos. La `x` es la de arriba. Así que cuando un título tiene los dos
// servidores, este es el que conviene para ver en grande — y por eso va segundo
// en la lista y no último.
//
// Guarda la dirección igual que vimeos, dentro de un `eval(p,a,c,k,e,d)`.
//
// Medido: ~2,9 s desde el embed hasta tener el m3u8.
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

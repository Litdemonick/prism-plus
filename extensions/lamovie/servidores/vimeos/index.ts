// ─── LaMovie · vimeos.net ⚡ nativo ──────────────────────────────────────────
//
// El reproductor propio del sitio, y el que más aparece: sale en TODOS los
// títulos que se probaron. La API lo publica con el nombre "LaMovie" o
// "Online" según el título, pero es siempre el mismo.
//
// Nada que ver con vimeo.com: es la misma plataforma que hay detrás de
// unlimplay en FuegoCine (sus direcciones terminan en vimeos.net / vimeos.zip).
//
// **Medido el 2026-08-06: 9 de 9.** No se miró si "resolvía": de cada uno se
// bajó el primer segmento de vídeo, y llegaron entre 250 KB y 2,6 MB. Reproduce
// en la app, sin navegador de por medio.
//
// La dirección viene dentro de un `eval(p,a,c,k,e,d)`. La página además trae
// jwplayer y anuncios, que acá no se cargan: se saca la dirección y se le pasa
// al reproductor.
//
// ── Llega hasta 720p, y se sabe sin bajar nada ──────────────────────────────
//
// Las calidades están escritas en la propia dirección, en el tramo
// `_,n,h,.urlset` de antes del `master.m3u8`: cada letra es una variante, `n`
// es 480p y `h` es 720p. Los 9 medidos traen `n,h` — o sea DOS, sin 1080p, aunque
// la API del sitio etiquete el título como "Full HD". Confirmado abriendo la
// lista: 1152x480 a 0,74 Mbps y 1728x720 a 2,00 Mbps.
//
// Para 1080p en este sitio hay que ir a GoodstreamOne, que trae `l,n,h,x`.
//
// Medido: ~2,4 s desde el embed hasta tener el m3u8.
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

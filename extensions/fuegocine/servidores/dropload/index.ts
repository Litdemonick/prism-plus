// ─── DL · dropload.co ────────────────────────────────────────────────────────
//
// 47 botones en el catálogo. Reproduce en la app.
//
// La página redirige sola a dr0pstream.com, así que los dos hosts son el mismo
// servidor y por eso comparten esta carpeta.
//
// La dirección NO está escrita en el HTML: viene partida en el diccionario de
// un `eval(function(p,a,c,k,e,d){...})` y se arma al desempaquetar. Sin eso, la
// página parece no tener vídeo — de hecho así la dimos por rota una vez.
//
// Medido el 2026-08-04: ~1 s hasta un `master.m3u8` en dropcdn.io.

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

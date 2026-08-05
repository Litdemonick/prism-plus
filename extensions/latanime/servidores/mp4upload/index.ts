// ─── Mp4upload ⚡ nativo ──────────────────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 120 títulos: **101 botones**.
//
//   embed   https://www.mp4upload.com/embed-129ueyj6bsir.html
//   sale    https://a4.mp4upload.com:183/d/xkxv6n5pz3b4quuobcsew…
//   tarda   510–560 ms
//   se abre 206 application/octet-stream
//
// La dirección está en texto plano en la página del embed; alcanza con agarrar
// el primer mp4 que no sea un archivo del propio sitio. Dos cosas que parecen
// un error y no lo son: sale por un puerto raro (`:183`) y NO declara
// `video/mp4` sino `application/octet-stream`. El reproductor lo toma igual.
// El Referer tiene que ser el de mp4upload, con el de latanime no anda.

import { pedir, type ServidorResuelto } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;
  const candidatos = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g) ?? [];
  const real = candidatos.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) return null;
  return { url: real, headers: { Referer: 'https://www.mp4upload.com/' } };
}

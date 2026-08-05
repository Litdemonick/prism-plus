// ─── Mp4upload ⚡ nativo ──────────────────────────────────────────────────────
//
// Medido el 2026-08-04: **~96 botones**, el más pesado de los siete. Aparece
// con dos hosts y tres etiquetas distintas — `www.mp4upload.com` (77) y
// `mp4upload.com` a secas (19), rotulado "Mp4upload (SUB)", "Mp4upload (DUB)" o
// "mp4upload" según la ficha. Es el mismo servidor, por eso una sola carpeta.
//
//   embed   https://www.mp4upload.com/embed-8myscgxutw2c.html
//   sale    https://a3.mp4upload.com:183/d/xsx6fvnpz3b4quuo6oruep2zkjz…
//   tarda   290–900 ms
//   se abre 206 application/octet-stream
//
// La dirección está en texto plano en la página del embed; alcanza con agarrar
// el primer mp4 que no sea un archivo del propio sitio. Dos cosas que parecen
// un error y no lo son: sale por un puerto raro (`:183`) y NO declara
// `video/mp4` sino `application/octet-stream`. El reproductor lo toma igual.
// El Referer tiene que ser el de mp4upload, con el de shademanga no anda.

import { pedir, type ServidorResuelto } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;
  const candidatos = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g) ?? [];
  const real = candidatos.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) return null;
  return { url: real, headers: { Referer: 'https://www.mp4upload.com/' } };
}

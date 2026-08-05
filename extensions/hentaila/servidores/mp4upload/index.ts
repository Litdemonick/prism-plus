// ─── MP4Upload ⚡ nativo ──────────────────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 200 títulos: **196 botones**.
//
//   embed   https://www.mp4upload.com/embed-5h6gcuhbngzn.html
//   sale    https://a4.mp4upload.com:183/d/xkxubffmz3b4quuo4oru6oqwiyci4eq…
//   tarda   180–530 ms
//   se abre 206 application/octet-stream
//
// La dirección está en texto plano en la página del embed; alcanza con agarrar
// el primer mp4 que no sea un archivo del propio sitio. Ojo con dos cosas que
// ya mordieron: sale por un puerto raro (`:183`) y NO declara `video/mp4` sino
// `application/octet-stream` — las dos son normales acá, el reproductor lo toma
// igual. El Referer tiene que ser el de mp4upload, con el de hentaila no anda.

import { pedir, type ServidorResuelto } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;
  const candidatos = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g) ?? [];
  const real = candidatos.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) return null;
  return { url: real, headers: { Referer: 'https://www.mp4upload.com/' } };
}

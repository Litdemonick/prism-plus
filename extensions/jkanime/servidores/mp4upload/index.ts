// ─── Mp4upload ⚡ nativo ──────────────────────────────────────────────────────
//
// Medido el 2026-08-05: **48 botones**, resuelve y reproduce (206
// `application/octet-stream`).
//
//   embed   https://www.mp4upload.com/embed-p3kvzahep5gk.html
//   sale    https://aN.mp4upload.com:183/d/…
//
// Dos cosas que parecen un error y no lo son: sale por un puerto raro (`:183`)
// y NO declara `video/mp4` sino `application/octet-stream`. El reproductor lo
// toma igual. El Referer tiene que ser el de mp4upload.
//
// ── El bug que hacía fallar esto SIEMPRE, y no estaba acá ───────────────────
//
// La dirección viene en texto plano en la página; esta extracción está
// verificada en vivo con curl y funciona bien. Durante mucho tiempo mp4upload
// fallaba igual, y la causa estaba en otro lado: el envoltorio de `build.mjs`
// hacía `url.indexOf('.mp4')` suelto, y **"mp4upload.com" como nombre de
// dominio ya contiene esa subcadena**. El atajo creía que la dirección del
// embed ya era un archivo directo, así que ni llamaba a `watch()` — este código
// no llegaba a ejecutarse nunca. Vale recordarlo antes de buscar el problema
// dentro del resolver.

import { pedir, type ServidorResuelto } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;
  const candidatos = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g) ?? [];
  const real = candidatos.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) return null;
  return { url: real, headers: { Referer: 'https://www.mp4upload.com/' } };
}

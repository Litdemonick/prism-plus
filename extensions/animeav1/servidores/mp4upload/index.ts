// ─── MP4Upload ⚡ nativo ──────────────────────────────────────────────────────
//
// Medido el 2026-08-10 sobre 100 títulos: **122 botones**.
//
//   embed   https://www.mp4upload.com/embed-nqc5816mloo4.html
//   sale    https://a4.mp4upload.com:183/d/xkxzzafoz3b4quuoassbii2dc…/video.mp4
//
// La dirección está en texto plano dentro del `player.src({...})` de la página
// del embed; alcanza con agarrar el primer mp4 que no sea un archivo del propio
// sitio (hoja de estilo, script, miniatura).
//
// Dos cosas normales acá que ya mordieron en otras extensiones: sale por un
// **puerto raro** (`:183`) y **no declara `video/mp4`** sino
// `application/octet-stream`. El reproductor lo toma igual.
//
// El Referer tiene que ser el de mp4upload: con el de animeav1 no anda.
//
// **Copia**: este resolver es el mismo que usan hentaila, shademanga, latanime,
// animefenix y jkanime. Si se arregla acá, esas siguen con su versión vieja —
// que es exactamente para lo que están aisladas.

import { pedir, type ServidorResuelto } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;
  const candidatos = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g) ?? [];
  const real = candidatos.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) {
    console.log('[av1] mp4upload: la página del embed no traía ningún mp4');
    return null;
  }
  return { url: real, headers: { Referer: 'https://www.mp4upload.com/' } };
}

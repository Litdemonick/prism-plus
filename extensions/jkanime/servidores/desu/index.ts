// ─── Desu ⚡ nativo ───────────────────────────────────────────────────────────
//
// Es uno de los dos reproductores PROPIOS de jkanime, no un host de terceros.
// Medido el 2026-08-05: **está en todos los episodios y es el primero de la
// lista** — o sea, el que abre por defecto. 206 `application/vnd.apple.mpegurl`
// en los cuatro episodios probados.
//
//   sale    https://nika.playmudos.com/{base64…}
//   headers Referer con la página del episodio (el CDN lo exige)
//
// ── Ojo con esto al medirlo ─────────────────────────────────────────────────
//
// Desu y Magi vienen **YA RESUELTOS** en la lista del episodio, a diferencia
// del resto de servidores, que llegan crudos y los resuelve la app recién
// cuando el usuario los elige. Volver a pasarlos por `watch()` da null y parece
// que estuvieran rotos — pasó, y casi queda escrito que el servidor más
// importante de la extensión no funcionaba. Lo que hay que hacer es abrir la
// dirección tal cual viene.
//
// El trabajo real lo hace `resolverReproductorPropio` en `comun.ts`, porque
// Desu y Magi comparten el mismo iframe y el mismo archivo. Acá queda lo suyo:
// el formato viejo, con la dirección `/desu/` servida aparte.

import { pedir, type ServidorResuelto } from '../comun';

/** El formato viejo: una página `/desu/…` con la dirección en un JSON suelto. */
export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const hdrs = { Referer: referer };
  const html = await pedir(url, referer);
  if (!html) return null;
  const patrones = [
    /"url"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i,
    /"file"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i,
    /"url"\s*:\s*"(https?:\/\/[^"]+\.mp4[^"]*)"/i,
    /<source[^>]+src="(https?:\/\/[^"]+\.m3u8[^"]*)"/i,
  ];
  for (const re of patrones) {
    const m = re.exec(html);
    // El Referer viaja con el stream para que mpv y el CDN lo acepten.
    if (m) return { url: m[1], headers: hdrs };
  }
  return null;
}

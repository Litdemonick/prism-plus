// ─── Magi ⚡ nativo ───────────────────────────────────────────────────────────
//
// El otro reproductor propio de jkanime. Medido el 2026-08-05: está en todos
// los episodios, junto a Desu, y **apunta al MISMO archivo** — mismo
// `nika.playmudos.com`, misma dirección. 206 `application/vnd.apple.mpegurl`.
//
// Vale la misma advertencia que en la carpeta de Desu: viene **ya resuelto** en
// la lista del episodio, así que volver a pasarlo por `watch()` da null y
// parece roto.
//
// La diferencia con Desu, confirmada en vivo: **Magi NO ofusca con `atob()`**,
// trae la dirección directo en un `<source src='…'>`. Eso lo contempla
// `resolverReproductorPropio` en `comun.ts`, que es el que los dos usan.
// Acá queda lo suyo: el formato viejo con la dirección `/magi/` servida aparte.

import { pedir, type ServidorResuelto } from '../comun';

/** El formato viejo: una página `/magi/…` con la dirección en un `<source>`. */
export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const hdrs = { Referer: referer };
  const html = await pedir(url, referer);
  if (!html) return null;
  const patrones = [
    /<source[^>]+src="(https?:\/\/[^"]+\.m3u8[^"]*)"/i,
    /<source[^>]+src="(https?:\/\/[^"]+\.mp4[^"]*)"/i,
    /source\s*:\s*['"]?(https?:\/\/[^'">\s]+\.m3u8)/i,
  ];
  for (const re of patrones) {
    const m = re.exec(html);
    if (m) return { url: m[1], headers: hdrs };
  }
  return null;
}

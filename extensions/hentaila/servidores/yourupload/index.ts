// ─── YourUpload ⚡ nativo ─────────────────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 200 títulos del catálogo: **200 botones**, o sea
// que está en TODOS. Es el que la extensión pone primero a propósito (ver el
// reordenamiento en `index.ts` de la extensión): resuelve a un mp4 directo de
// forma más confiable que ningún otro de acá.
//
//   embed   https://www.yourupload.com/embed/kuL1d4B0DM35
//   sale    https://vidcache.net:8161/a2026080423gRJ0P6A5u/video.mp4
//   tarda   170–380 ms
//   se abre 206 video/mp4
//
// La dirección está en texto plano en la página del embed, en el `file:` del
// reproductor JW. El tramo del medio de la dirección cambia en cada pedido
// (`a20260804` + azar), o sea que es de un solo uso: no sirve guardarla.

import { pedir, type ServidorResuelto } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;

  // El Referer tiene que ser el del propio yourupload: vidcache rechaza el de
  // hentaila.
  const hdrs = { Referer: 'https://www.yourupload.com/' };

  const norm = (u: string) => u.replace(/\\\//g, '/').replace(/^\/\//, 'https://');

  // 1. Reproductor JW: file / src / source
  let m = /(?:file|src|source)\s*:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i.exec(html);
  if (m) return { url: norm(m[1]), headers: hdrs };

  // 2. Cualquier mp4 absoluto del CDN
  m = /(https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*)/.exec(html);
  if (m) return { url: m[1], headers: hdrs };

  // 3. mp4 sin protocolo (`//cdn...`)
  m = /(\/\/[^"'\s<>]+\.mp4[^"'\s<>]*)/.exec(html);
  if (m) return { url: `https:${m[1]}`, headers: hdrs };

  return null;
}

// ─── YourUpload ⚡ nativo ─────────────────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 60 episodios: **1 botón**. Casi no aparece en este
// sitio, pero cuando aparece resuelve limpio: 206 video/mp4 en ~330 ms.
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

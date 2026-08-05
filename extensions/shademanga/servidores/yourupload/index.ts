// ─── YourUpload ⚡ nativo ─────────────────────────────────────────────────────
//
// Medido el 2026-08-04: **~31 botones**.
//
//   embed   https://www.yourupload.com/embed/GH8HrQk543E7
//   sale    https://vidcache.net:8161/a20260804rk185geqluL/video.mp4
//   tarda   150–330 ms
//   se abre 206 video/mp4
//
// El tramo del medio de la dirección cambia en cada pedido, o sea que es de un
// solo uso: no sirve guardarla.
//
// ── El relleno `novideo.mp4`, que es lo que había que arreglar ───────────────
//
// Acá pasa algo que no pasa en las otras extensiones con este mismo servidor:
// una parte de los episodios NO está subida a YourUpload, y la página del embed
// igual trae un reproductor — pero cargado con un archivo de relleno:
//
//     file: "/embed/novideo.mp4"
//
// Medido sobre 8 episodios: 2 devolvían eso. Y como el patrón de búsqueda es
// "el primer `file:` que termine en .mp4", el resolver lo tomaba por bueno y
// devolvía **una dirección relativa, sin host** — que no es ni una dirección
// válida. El reproductor recibía `/embed/novideo.mp4`, no podía abrirlo y el
// usuario veía un error, en vez de que la app cayera al navegador o al
// siguiente servidor.
//
// Por eso se descarta explícitamente: si lo único que hay es el relleno, este
// resolver devuelve null, que es la forma de decir "acá no hay nada".

import { pedir, type ServidorResuelto } from '../comun';

/** El relleno que pone el sitio cuando el episodio no está subido. */
function esRelleno(u: string): boolean {
  return u.indexOf('novideo') !== -1;
}

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;

  // El Referer tiene que ser el del propio yourupload: vidcache rechaza el de
  // shademanga.
  const hdrs = { Referer: 'https://www.yourupload.com/' };

  const norm = (u: string) => u.replace(/\\\//g, '/').replace(/^\/\//, 'https://');

  // 1. Reproductor JW: file / src / source
  const m = /(?:file|src|source)\s*:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i.exec(html);
  if (m && !esRelleno(m[1])) return { url: norm(m[1]), headers: hdrs };

  // 2. Cualquier mp4 absoluto del CDN que no sea el relleno.
  const absolutos = html.match(/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/g) ?? [];
  const real = absolutos.find((u) => !esRelleno(u));
  if (real) return { url: real, headers: hdrs };

  // 3. mp4 sin protocolo (`//cdn...`), tambien salteando el relleno.
  const relativos = html.match(/\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/g) ?? [];
  const realRel = relativos.find((u) => !esRelleno(u));
  if (realRel) return { url: `https:${realRel}`, headers: hdrs };

  return null;
}

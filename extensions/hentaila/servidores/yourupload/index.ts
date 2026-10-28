// ─── YourUpload ⚡ nativo ─────────────────────────────────────────────────────
//
// Copiado de tioanime el 2026-10-28 (allá trae lo de `novideo` y `estaVivo`,
// que acá faltaban). Medido en tioanime el 2026-08-04: está en TODOS. Es el
// más confiable de los tres: sobre 6 episodios sueltos resolvió 5, y las 5
// reprodujeron.
//
//   embed   https://www.yourupload.com/embed/QG53kSORa6sF
//   sale    https://vidcache.net:8161/a20260804VPC1o6F0ljo/video.mp4
//   tarda   130–330 ms
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
  // Un vídeo que el sitio ya borró trae `/embed/novideo.mp4`: no es vídeo, es
  // su cartel de "no disponible". Medido el 2026-09-27 en 3 de 8 episodios.
  // Devolverlo como dirección hacía que el reproductor probara abrir una ruta
  // relativa; sin vídeo, la app pasa directo al siguiente servidor.
  if (m && m[1].indexOf('novideo') !== -1) return null;
  if (m) return { url: norm(m[1]), headers: hdrs };

  // 2. Cualquier mp4 absoluto del CDN
  m = /(https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*)/.exec(html);
  if (m) return { url: m[1], headers: hdrs };

  // 3. mp4 sin protocolo (`//cdn...`)
  m = /(\/\/[^"'\s<>]+\.mp4[^"'\s<>]*)/.exec(html);
  if (m) return { url: `https:${m[1]}`, headers: hdrs };

  return null;
}

/**
 * Si el vídeo sigue en YourUpload: true sí, false borrado, null no se sabe.
 *
 * Medido el 2026-10-12 en tioanime: 10 de 19 episodios viejos ya no estaban.
 * Lo borrado trae `novideo.mp4` o una página de error con 404: «Content
 * Restricted», «Content Invalid» o «An Error Has Occurred». Sin respuesta es
 * null y el servidor se ofrece igual.
 *
 * **La página puede estar bien y el vídeo no.** Medido el 2026-10-13: en 3
 * episodios la página traía su mp4 en vidcache, pero el vídeo no contestó en
 * 60 s (los buenos, en ~1 s). Por eso, si la página está bien, se pide el
 * primer byte del vídeo: si llega, está vivo. Si no llega, esto no contesta y
 * quien llama decide con su tope (ver `watch` en el index de la extensión).
 */
export async function estaVivo(url: string, referer: string): Promise<boolean | null> {
  const html = await pedir(url, referer);
  if (!html) return null;
  if (html.indexOf('novideo') !== -1) return false;
  if (/<title>\s*Content (?:Restricted|Invalid)/i.test(html)) return false;
  if (/<h1>\s*An Error Has Occurred/i.test(html) && !/\.mp4/.test(html)) return false;
  const mp4 = /(?:file|src|source)\s*:\s*["']([^"']+\.mp4[^"']*)["']/i.exec(html)?.[1];
  if (!mp4) return /\.mp4/.test(html) ? true : null;
  const direccion = mp4.replace(/\\\//g, '/').replace(/^\/\//, 'https://');
  const byte = await pedir(direccion, 'https://www.yourupload.com/', { Range: 'bytes=0-0' });
  return byte !== null ? true : null;
}

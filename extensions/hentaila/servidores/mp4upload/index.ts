// ─── Mp4upload ⚡ nativo ──────────────────────────────────────────────────────
//
// Copiado de shademanga el 2026-10-28 (con su `estaVivo`). Lo de abajo es lo
// medido allá. Medido el 2026-08-04: **~96 botones**, el más pesado de los siete. Aparece
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

/** La dirección del vídeo dentro de la página del embed, o null. */
function direccionEn(html: string): string | null {
  const candidatos = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g) ?? [];
  return candidatos.find((u) => !/\.(?:css|js|jpg|png)/.test(u)) ?? null;
}

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;
  const real = direccionEn(html);
  if (!real) return null;
  return { url: real, headers: { Referer: 'https://www.mp4upload.com/' } };
}

/**
 * Si el vídeo sigue ahí: true sí, false borrado, null no se sabe.
 *
 * Medido el 2026-10-27: lo borrado es la página «File was deleted» y nada más
 * (16 bytes); pasaba en todos los episodios probados de Naruto Shippuden.
 *
 * NO se pide el primer byte del vídeo: su servidor (`a3.mp4upload.com:183`) a
 * veces no conecta, y esa espera se sumaba a CADA episodio (la lista tardaba
 * 3,2 s siempre). Si el vídeo no abre, la app pasa sola al siguiente.
 */
export async function estaVivo(url: string, referer: string): Promise<boolean | null> {
  const html = await pedir(url, referer);
  if (html === null) return null;
  // «File was deleted», y nada más.
  if (html.length < 100 && /deleted/i.test(html)) return false;
  return direccionEn(html) ? true : null;
}

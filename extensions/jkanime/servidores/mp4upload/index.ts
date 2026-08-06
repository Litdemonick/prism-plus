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

// ── Por qué se veía la imagen pero el vídeo quedaba congelado ────────────────
//
// Resolvía bien y el archivo es un MP4 impecable, pero al reproducir se clavaba
// en el segundo 2. Medido el 2026-08-06, mismo archivo y misma red:
//
//   pedido abierto (`bytes=0-`), leyendo de corrido   1812 KB/s
//   lo mismo desde el medio, tras un salto            1789 KB/s
//   un trozo cerrado de 1 MB                           514 KB/s
//   un trozo cerrado de 256 KB                         171 KB/s
//
// Este servidor tarda cerca de **un segundo y medio** en empezar a contestar
// cada pedido, y recién ahí toma velocidad. O sea que lo que hunde el caudal no
// es el ancho de banda sino CUÁNTOS pedidos se hacen: pidiendo de a poco le
// entraban al reproductor 109-119 KB/s cuando el archivo necesita 206, y la
// imagen quedaba congelada con el colchón clavado en 2,7 s — nunca llegaba a los
// 3 s que hacen falta para arrancar.
//
// Por eso se declara `X-Lectura-Continua`: le pide a la app que le lea el
// archivo de una sola vez en vez de ir pidiendo tramos sueltos. La app tiene el
// mecanismo armado y no sabe de servidores; el que sabe que ESTE los cobra caro
// es este archivo, que es donde está la medición.
//
// **Está solo en la copia de jkanime.** El mismo servidor está copiado en
// animefenix, latanime, shademanga y hentaila: si allá también se congela, se
// mide y se agrega la línea en cada una. No se toca ninguna sin medirla.

import { pedir, type ServidorResuelto } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;
  const candidatos = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g) ?? [];
  const real = candidatos.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) return null;
  return {
    url: real,
    headers: {
      Referer: 'https://www.mp4upload.com/',
      // No es una cabecera HTTP: es una declaración para la app, que la saca
      // antes de pedirle nada a la fuente. Ver el bloque de arriba.
      'X-Lectura-Continua': '1',
    },
  };
}

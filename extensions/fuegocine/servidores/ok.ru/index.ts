// ─── OK.RU · ok.ru ───────────────────────────────────────────────────────────
//
// 55 botones en el catálogo. Reproduce en la app.
//
// El m3u8 viene en el propio HTML, dentro de un atributo que a su vez lleva
// JSON. Por eso se busca con índices y no con una expresión: la marca es
// literal y el final también.
//
// **El escapado cambió, y hay que aceptar los dos.** Hasta agosto venía
// DOBLE: las comillas como `\&quot;` y los `&` como `\\u0026`. El 2026-09-27 ya
// venía simple: `&quot;` y `&`. Buscando solo la forma vieja no se
// encontraba nada y el servidor no reproducía, con vídeos que estaban bien.
//
// La dirección lleva la IP de quien la pidió (`srcIp`): sirve porque la pide
// el mismo aparato que la va a reproducir.
//
// Medido el 2026-08-04: ~0,8 s hasta un `video.m3u8` en vkuser.net.

import { pedir, type ServidorResuelto } from '../comun';

const MARCAS = ['hlsManifestUrl\\&quot;:\\&quot;', 'hlsManifestUrl&quot;:&quot;'];

export async function resolver(url: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, 'https://ok.ru/');
  if (!html) return null;
  for (const marca of MARCAS) {
    const desde = html.indexOf(marca);
    if (desde === -1) continue;
    const ini = desde + marca.length;
    // Termina en la comilla escapada, con o sin barra delante.
    const fin = html.indexOf('&quot;', ini);
    if (fin === -1) continue;
    const salida = html
      .slice(ini, fin)
      .replace(/\\+$/, '')
      .split('\\\\u0026').join('&')
      .split('\\u0026').join('&');
    if (/^https?:\/\//.test(salida)) return { url: salida };
  }
  // Sin la marca: el vídeo no existe más ("Видео не найдено") o cambió otra vez.
  return null;
}

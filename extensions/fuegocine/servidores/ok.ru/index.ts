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
//
// ── Los que solo traen DASH (2026-10-03) ────────────────────────────────────
//
// En la medición entera, 9 de 24 OK.RU no traían `hlsManifestUrl`: se daban
// por perdidos y eran vídeos que estaban bien. Esos traen `ondemandDash`, un
// manifiesto DASH (hasta 1080p). Probado con la MISMA libmpv de la app: carga
// (1920x800, 2 h 04 min, 13 pistas), avanza y salta al minuto 30 sin cortes.
// El HLS sigue primero cuando está; el DASH es el respaldo. El archivo directo
// por calidad que también viene (`"name":"full"`) contesta 400: no se usa.

import { pedir, type ServidorResuelto, UA_NAVEGADOR } from '../comun';

/** Las dos formas de escapar las comillas que se vieron en el HTML. */
const COMILLAS = ['\\&quot;', '&quot;'];

/** El valor de `"<clave>":"…"` dentro del atributo, o null. */
function valorDe(html: string, clave: string): string | null {
  for (const q of COMILLAS) {
    const marca = `${clave}${q}:${q}`;
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
    if (/^https?:\/\//.test(salida)) return salida;
  }
  return null;
}

export async function resolver(url: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, 'https://ok.ru/');
  if (!html) return null;
  const hls = valorDe(html, 'hlsManifestUrl');
  if (hls) return { url: hls };
  // El vale del DASH va atado al navegador (`srcAg=CHROME`): se pide con el
  // mismo User-Agent con que se resolvió.
  const dash = valorDe(html, 'ondemandDash');
  if (dash) return { url: dash, headers: { 'User-Agent': UA_NAVEGADOR } };
  // Sin ninguno: el vídeo no existe más ("Видео не найдено") o cambió otra vez.
  return null;
}

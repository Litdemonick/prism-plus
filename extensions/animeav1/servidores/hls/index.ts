// ─── HLS (player.zilla-networks.com) ⚡ nativo ────────────────────────────────
//
// Medido el 2026-08-10 sobre 100 títulos: **122 botones**, y es el que el sitio
// deja SELECCIONADO al abrir el episodio. O sea que es el camino por defecto:
// si este cae al navegador, la extensión entera se siente de navegador.
//
//   embed   https://player.zilla-networks.com/play/{hash de 32}
//   lista   https://player.zilla-networks.com/m3u8/{el MISMO hash}
//   trozos  https://player.zilla-networks.com/segs/{hash}/{000..}.html
//
// ── No hace falta pedir la página del embed ─────────────────────────────────
//
// El hash de 32 caracteres que arma la lista ya viene en la URL del embed, así
// que la lista se construye sin un solo pedido de red. `/play/` es un cascarón
// de Vite (639 bytes) que no aporta nada: pedirlo sería regalarle al usuario
// una espera antes de cada episodio.
//
// ── Lo que costó y NO conviene volver a averiguar ────────────────────────────
//
// **Los trozos dan 403 de Cloudflare (4553 bytes) a menos que se mande
// `Sec-Fetch-Site: same-origin`.** Es UNA cabecera, y el valor tiene que ser
// exactamente ese. Medido el 2026-08-10 quitando y poniendo de a una sobre el
// juego completo de cabeceras de un navegador:
//
//   Sec-Fetch-Site: same-origin  →  200, 1.032.577 bytes   ✔
//   Sec-Fetch-Site: same-site    →  403
//   Sec-Fetch-Site: cross-site   →  403
//   Sec-Fetch-Site: none         →  403
//   Sec-Fetch-Site: (cualquier otra cosa, o ausente)  →  403
//
// Y NINGUNA otra cabecera lo abre ni hace falta: sin User-Agent, sin Referer,
// sin Origin, sin Accept, sin sec-ch-ua — con la de arriba sola alcanza, y sin
// ella no alcanza ninguna combinación de las demás.
//
// Esto **corrige** lo que figuraba en el repo. En hentaila (servidor VIP,
// cdn.hvidserv.com) y en shademanga (servidor HD, este mismo host) se había
// concluido que el 403 iba por **huella TLS** y que por eso no había forma
// desde la extensión. Era falso: es una cabecera común y corriente.
// **Ojo: esas dos extensiones NO se tocaron** —cada una lleva su copia y se
// arregla por separado—, pero ahí está el dato por si se retoman.
//
// ── Que llega vídeo de verdad, no un 200 vacío ───────────────────────────────
//
//   init.html   1.365 b   ftypiso5   (la cabecera del fMP4)
//   000.html  1.032.577 b styp msdh  (fragmento CMAF)
//   050.html  1.168.016 b styp msdh
//   caudal sostenido, 8 trozos seguidos: **10,15 MB/s**
//
// ── Lo único que no se puede medir desde acá ─────────────────────────────────
//
// Que la cabecera llegue a CADA trozo, y no solo a la lista. La app enruta los
// m3u8 con cabeceras por su proxy local justamente para eso, así que debería;
// pero es del lado de la app y hay que verlo con la app corriendo. Si algún día
// esto se cuelga cargando, ese es el primer lugar para mirar.

import { type ServidorResuelto } from '../comun';

// ── Por qué se declara que es una LISTA ──────────────────────────────────────
//
// La dirección de la lista es `/m3u8/{hash}`: **no termina en `.m3u8`**. La app
// decide si algo es lista o archivo entero mirando cómo termina la ruta, así
// que esta se abría como si fuera un MP4 entero — con `multiple_requests=1`,
// sin `reconnect_streamed` y salteándose el camino de HLS.
//
// De corrido reproducía igual (mpv reconoce el formato por el contenido), pero
// **al tocar la barra para adelantar se quedaba cargando sin parar**, y a veces
// volvía sola al principio. Reportado en vivo el 2026-08-10, en SUB y en DUB.
//
// El origen no tiene nada que ver: la lista es VOD con `#EXT-X-ENDLIST` y 143
// pedacitos, y saltar directo al pedacito 71 o al 142 sin haber pedido los
// anteriores devuelve 200 en 71-559 ms.
//
// Se intentó primero la salida que no tocaba la app —pedir la misma lista con
// un nombre terminado en `.m3u8`— y el servidor no la sirve: `{hash}.m3u8`,
// `/index.m3u8` y `/master.m3u8` dan 404, y la query no cuenta porque la app
// mira la dirección sin ella. Por eso se declara.
// ── Las cabeceras: el juego COMPLETO de un navegador ────────────────────────
//
// `Sec-Fetch-Site: same-origin` es la única imprescindible: sin ella todos los
// pedacitos dan 403 (ver arriba). Las demás van porque **el navegador las
// manda y a él no le cortan nada**.
//
// Medido el 2026-08-10 con las herramientas del navegador sobre el mismo
// episodio: el reproductor de la web pide los pedacitos y le llegan todos
// enteros —200, entre 97 y 407 ms, ni un fallo—, mientras que al reproductor de
// la app le llegan CORTADOS (`error=End of file` en el registro de ffmpeg).
// Mismo servidor, misma red, mismo archivo: lo único distinto es cómo se piden.
// El navegador manda el juego completo; mpv mandaba solo la primera.
//
// **`Accept-Encoding` NO se manda, a propósito**: si el servidor contestara
// comprimido, el reproductor tendría que saber descomprimirlo, y eso es un
// problema nuevo para arreglar otro.
const CABECERAS = {
  // La imprescindible. Sin ella, 403 en todos los pedacitos.
  'Sec-Fetch-Site': 'same-origin',
  // El resto, leído del pedido real que hace el reproductor de la web.
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  Accept: '*/*',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  Origin: 'https://player.zilla-networks.com',
  Referer: 'https://player.zilla-networks.com/',
  'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

export async function resolver(url: string, _referer: string): Promise<ServidorResuelto | null> {
  const hash = /\/play\/([a-f0-9]{32})/i.exec(url)?.[1];
  if (!hash) {
    console.log(`[av1] hls: la dirección no trae hash de 32 :: ${url.slice(0, 60)}`);
    return null;
  }
  return {
    url: `https://player.zilla-networks.com/m3u8/${hash}`,
    headers: CABECERAS,
  };
}

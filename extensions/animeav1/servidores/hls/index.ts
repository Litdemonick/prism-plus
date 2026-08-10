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
const CABECERAS = {
  // Sin esta, todos los trozos dan 403. Ver arriba.
  'Sec-Fetch-Site': 'same-origin',
  // No es una cabecera: es la declaración de que esto es una lista de
  // pedacitos. La app la lee y la saca antes de pedirle nada a la fuente.
  'X-Lista-De-Pedacitos': '1',
  // ── Se probó pasarlo por el relay de la app y NO era eso ────────────────
  //
  // Se llegó a mandar los pedacitos por el relay local pensando que a mpv no
  // le llegaba la cabecera. **El registro probó que sí le llega**: en el
  // pedido que mpv le hace al relay se lee `sec-fetch-site: same-origin`. O
  // sea que la propaga, el relay no aportaba nada y solo metía un
  // intermediario en el medio de todo el vídeo. Se sacó.
  //
  // Lo que de verdad lo rompía era `reconnect_streamed`, que la app le pone a
  // TODA lista y le dice a ffmpeg que la fuente no se puede recorrer. Estos
  // pedacitos son fMP4/CMAF (llevan `#EXT-X-MAP` y cada uno es un fragmento
  // del MISMO mp4), así que sin poder recorrer no hay salto posible. Lo
  // enciende la declaración de acá arriba.
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

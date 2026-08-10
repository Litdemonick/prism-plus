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

/** La cabecera —y su valor exacto— sin la cual todos los trozos dan 403. */
const CABECERAS = { 'Sec-Fetch-Site': 'same-origin' };

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

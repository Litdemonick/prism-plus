// ─── StreamWish (flaswish.com) 🌐 navegador ──────────────────────────────────
//
// Medido el 2026-08-04 sobre 60 episodios: **3 botones**, casi no aparece.
// Va al navegador. Devuelve null a propósito.
//
// Hasta el 2026-08-05 estaba OCULTO; a pedido del usuario se dejó de esconder
// y ahora se ofrece con el mundo, que es donde sí reproduce.
//
// El motivo no es el resolver: la dirección se saca sin problema, pero termina
// en **premilkyway.com**, que está descartado desde antes porque rechaza la
// huella TLS de mpv/libavformat. Confirmado en su momento con curl y con la app
// de verdad: mpv se queda veinte y pico de segundos cargando y falla.
//
// Es el mismo cuadro que en hentaila con `ghbrisk.com`, donde se probaron los
// tres caminos posibles (genérico, streamwish y streamhg) y los tres terminaban
// en premilkyway. El problema está un escalón más abajo, en el CDN: ningún
// resolver lo puede esquivar.
//
// Por eso null derecho, sin gastar el pedido.
//
// Si algún día flaswish deja de caer en premilkyway, lo que anda es el camino
// de la familia streamwish: la API `/api/file/{id}?json=1` y, si no da, bajar el
// embed y desempaquetar el `eval(p,a,c,k,e,d)`.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

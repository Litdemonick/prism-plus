// ─── StreamWish (ghbrisk.com) 🌐 navegador ───────────────────────────────────
//
// Medido el 2026-08-04 sobre 200 títulos: **50 botones** — el más chico de los
// siete, aparece en uno de cada cuatro episodios.
// Va al navegador. Devuelve null a propósito.
//
// ── Lo que se aclaró al aislarla ─────────────────────────────────────────────
//
// `ghbrisk.com` no estaba en la lista de hosts del enrutador del SDK, así que
// caía al genérico en vez de ir a `resolveStreamwish` — quedaba la duda de si
// enrutarlo bien lo iba a arreglar. **Se midió: no cambia nada.** Los tres
// caminos (genérico, streamwish y streamhg) sacan la dirección sin problema…
// y los tres terminan en el mismo lugar:
//
//   https://jZdDKEFw9oEu0.premilkyway.com/hls2/01/14589/bju4sm2tq6wo…m3u8
//
// Y **premilkyway.com está descartado a propósito desde antes**: rechaza la
// huella TLS de mpv/libavformat. Confirmado en su momento con curl y con la app
// de verdad — mpv se queda 20 segundos y pico cargando y termina fallando. O
// sea que el problema no es el resolver, está un escalón más abajo, en el CDN:
// ningún camino lo puede esquivar.
//
// Por eso null derecho, sin gastar el pedido: la app cae al navegador interno,
// que sí lo reproduce.
//
// Si alguna vez ghbrisk deja de caer en premilkyway, lo que anda es cualquiera
// de los tres caminos — el genérico de `comun.ts` alcanza, porque la página
// trae el m3u8 empaquetado con `eval(p,a,c,k,e,d)`.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

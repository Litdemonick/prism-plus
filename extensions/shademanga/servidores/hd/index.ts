// ─── HD (player.zilla-networks.com) 🌐 navegador ─────────────────────────────
//
// Medido el 2026-08-04: **~46 botones**, el segundo más pesado. Sale rotulado
// "HD (SUB)" o "HD (DUB)" según el idioma.
// Va al navegador. Devuelve null a propósito.
//
// ── Por qué ─────────────────────────────────────────────────────────────────
//
// No es que el resolver no encuentre la dirección: **no se puede ni bajar la
// página del embed**. Pedirla devuelve 403 de Cloudflare ("Attention
// Required!", 4553 bytes) a cualquier cliente que no sea un navegador de
// verdad. No hay HTML que raspar, así que no hay nada que intentar:
//
//   https://player.zilla-networks.com/play/{hash de 32}   →  403
//
// Es el mismo cuadro que el servidor VIP de hentaila, salvo que allá al menos
// la lista de reproducción se podía armar sola y lo que fallaba eran los
// pedazos. Acá el 403 es en la puerta.
//
// Se deja en la lista igual, sin ocultarlo: la app lo reintenta con su
// navegador interno, que ejecuta JS de verdad y pasa el control de Cloudflare.
// Ocultarlo solo le quitaría esa segunda oportunidad, y son ~46 botones.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

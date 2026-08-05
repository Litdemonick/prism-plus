// ─── Dsvplay / Doodstream 🌐 navegador ───────────────────────────────────────
//
// Medido el 2026-08-04 sobre 120 títulos: **115 botones**.
// Va al navegador. Devuelve null a propósito.
//
// ── Lo que se probó, para no volver a probarlo ──────────────────────────────
//
// `dsvplay.com` SÍ está en la lista de hosts del enrutador del SDK, así que le
// llegaba a resolveDoodstream sin problema — no es un caso de mal enrutado.
// Simplemente no saca nada. Y también se probó su redirección: `dsvplay.com`
// contesta 301 hacia `playmogo.com`, que es el otro nombre de la misma familia,
// y por ahí tampoco:
//
//   dsvplay.com/e/{id}   → resolveDoodstream → null
//   playmogo.com/e/{id}  → resolveDoodstream → null
//
// (Lo mismo se midió en shademanga con `dooodster.com`, otro nombre del mismo
// servicio. Tres dominios distintos, el mismo resultado: hoy no entrega la
// dirección por raspado.)
//
// Se deja en la lista igual, sin ocultarlo: son 115 botones y el navegador
// interno los reproduce.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

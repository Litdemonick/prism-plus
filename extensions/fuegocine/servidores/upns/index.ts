// ─── US · fuegocineplayer.upns.online ────────────────────────────────────────
//
// 241 botones: el segundo más usado del sitio. HOY NO RESUELVE — va al
// navegador interno, que ejecuta JS de verdad y sí puede reproducirlo.
//
// El botón NO se saca de la lista: el usuario quiere verlo aunque abra en el
// navegador. Lo que se hace es marcarlo con el mundo y no con el rayo.
//
// ── Lo que se sabe, para no volver a averiguarlo (2026-08-04) ────────────────
//
// Es una SPA de Vite: la página son 1.312 bytes con `<title>Loading...</title>`
// y todo lo demás lo arma `/assets/index-*.js` (883 KB). No hay NADA en el HTML
// estático, así que ninguna expresión regular puede sacar la dirección.
//
// El bundle expone tres puntos de entrada:
//
//   /api/v1/video?id=      /api/v1/info?id=      /api/v1/download?id=
//
// y el id es lo que va después del `#` en la dirección
// (`.../#g93icb` → `id=g93icb`). Los tres contestan, pero devuelven **hex
// cifrado**. No usa CryptoJS ni conversión hex a la vista, así que descifra con
// WebCrypto y la llave sale de otro lado — probablemente de `/api/v1/player?t=`.
//
// **NO está descartado que se pueda nativo.** Falta seguir por ahí: encontrar
// dónde arma la llave y replicarlo.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string): Promise<ServidorResuelto | null> {
  return null;
}

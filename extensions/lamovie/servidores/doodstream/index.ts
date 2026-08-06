// ─── Doodstream 🌐 navegador ────────────────────────────────────────────────
//
// **Medido el 2026-08-06: 0 de 7.** Devuelve null a propósito.
//
// Acá hay que ser honesto con lo que se midió: el banco NO LLEGÓ a la página.
// Node corta la conexión antes del handshake —`tlsv1 alert access denied`— o
// sea que el CDN rechaza su huella de TLS, no su petición. Eso NO prueba que el
// servidor no ande; prueba que desde el banco no se puede saber.
//
// Se deja en 🌐 igualmente, por dos motivos. El primero es que en las otras
// extensiones del repo —jkanime, shademanga, latanime— este mismo servicio se
// midió a fondo con tres dominios distintos de su familia y dio 0 en todos. El
// segundo es que marcarlo ⚡ sin haberlo visto reproducir sería justo el error
// que ya se cometió tres veces en este repo: un servidor con el rayo que al
// tocarlo no abre.
//
// Si algún día se lo puede medir de verdad y reproduce, se cambia acá.
import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

// ─── Mega 🌐 navegador ───────────────────────────────────────────────────────
//
// Medido el 2026-08-04: **está en el 100% de los episodios mirados** (40 de 40).
// Devuelve null a propósito, y de entrada, sin pedir nada.
//
// Mega no cifra la DIRECCIÓN, cifra el ARCHIVO: lo que viaja por la red son
// bytes cifrados y la clave está en el fragmento de la URL (`#!…`), que ni
// siquiera se manda al servidor. Solo un navegador que ejecute su JS puede ir
// descifrando mientras reproduce. No hay ninguna dirección que sacar.
//
// ── Por qué ahora aparece en la lista, y antes no ───────────────────────────
//
// Hasta ahora esta extensión lo **ocultaba**: estaba en un `_NEVER_NATIVE` que
// lo sacaba de la lista de servidores, así que el usuario nunca lo veía. La
// idea era no ofrecer algo que el reproductor nativo no puede abrir.
//
// El problema es que TioAnime tiene SOLO TRES servidores —Mega, Voe y
// YourUpload— y ocultar uno deja dos. Medido sobre 6 episodios sueltos, hubo
// uno donde **los dos fallaron**:
//
//   tioanime.com/ver/nige-jouzu-no-wakagimi-2nd-season-1
//     Mega        ← lo tenía, y estaba oculto
//     Voe         ✗ el embed ya no existe
//     YourUpload  ✗
//
// Ese episodio quedaba muerto para el usuario, teniendo una opción que el
// navegador interno reproduce bien. Ocultar el botón no evita un fallo: lo
// convierte en un episodio sin servidores.
//
// Ahora se deja en la lista con el mundo, que es lo que ya se hace en latanime
// con este mismo servidor y lo que se decidió para FuegoCine con US y Drive:
// el botón no se saca, se marca. Si el nativo no puede, la app abre el WebView
// sola.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

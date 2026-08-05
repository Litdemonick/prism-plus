// ─── Puj / mojon.latanime.org 🌐 navegador ───────────────────────────────────
//
// Medido el 2026-08-04 sobre 120 títulos: **1 botón**. Es el más raro de todos
// y aparece casi nunca, pero conviene tenerlo anotado porque es distinto a los
// demás: **es un envoltorio del propio sitio**, no un servidor de terceros.
//
//   https://mojon.latanime.org/aqua/fn?url=https://voe.sx/e/bpqz5g1kkfmj
//
// O sea que lleva otra dirección adentro, en `?url=`, y esa sí es de un
// servidor conocido (en el caso visto, Voe).
//
// ── Lo que se probó ─────────────────────────────────────────────────────────
//
// Lo obvio sería desenvolverlo y resolver lo de adentro, como se hace con los
// envoltorios de blogspot en FuegoCine. Se probó, y de las dos formas:
//
//   la dirección con el envoltorio      → null
//   la de adentro, ya desenvuelta       → null
//
// La de adentro tampoco resuelve, así que desenvolver no habría arreglado
// nada — con ese embed puntual, al menos. Con un solo botón en 120 títulos no
// alcanza para saber si el embed estaba muerto o si el envoltorio los sirve
// siempre así.
//
// Por eso queda en null, que es lo que hacía antes: la app cae al navegador.
// Si algún día aparece más seguido, el camino a probar primero es desenvolver
// `?url=` y pasarle eso a `resolverServidor`, que ya sabe reconocer voe y el
// resto por el host.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

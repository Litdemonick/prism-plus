// ─── doodstream (dooodster.com) 🌐 navegador ─────────────────────────────────
//
// Medido el 2026-08-04: **~19 botones**.
// Va al navegador. Devuelve null a propósito.
//
// ── El detalle del nombre, que despista ─────────────────────────────────────
//
// El host es `dooodster.com`, con **tres oes**. El enrutador del SDK reconoce
// esta familia buscando `dood` —dos oes— y "dood" no es subcadena de
// "dooodster", así que nunca le llegaba a resolveDoodstream: caía al genérico.
// Parecía la explicación de por qué no anda.
//
// **No lo es.** Se midió pasándoselo derecho al resolver correcto, y de las dos
// formas: el host tal cual y su redirección real (`dooodster.com` contesta 301
// hacia `playmogo.com`, que sí está en la lista del enrutador). Las dos
// devuelven null:
//
//   resolveDoodstream(dooodster.com/e/…)  →  null
//   resolveDoodstream(playmogo.com/e/…)   →  null
//
// O sea que el problema no es el enrutado sino el sitio, que hoy no entrega la
// dirección por raspado. Se deja en la lista para que la app lo reintente con
// su navegador interno.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

// ─── Doodstream (dsvplay.com) 🌐 navegador ───────────────────────────────────
//
// Medido el 2026-08-05: **55 botones**. Devuelve null a propósito.
//
// Hoy no entrega la dirección por raspado: 0 de 2 episodios probados. Lo mismo
// se midió en las otras extensiones del repo con los otros nombres de esta
// misma familia —`dooodster.com` en shademanga y `dsvplay.com` en latanime—,
// probando además su redirección a `playmogo.com`. Tres dominios distintos, el
// mismo resultado.
//
// O sea que no es un problema de enrutado ni de esta extensión: es el servicio.
// Se deja en la lista para que la app lo reintente con su navegador interno,
// que ejecuta JS de verdad.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

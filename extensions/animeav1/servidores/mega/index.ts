// ─── Mega (mega.nz) 🌐 navegador ──────────────────────────────────────────────
//
// Medido el 2026-08-10 sobre 100 títulos: **122 botones**.
// Devuelve null a propósito, sin pedir nada.
//
// ── Por qué ──────────────────────────────────────────────────────────────────
//
// Mega cifra del lado del navegador: la clave viaja en el fragmento de la URL
// (`#EgtgZ8J8-yFhFJ2skxcxEYlJrpi3kzFYtPb-3kxnSx0`) y el archivo se descifra en
// memoria mientras se reproduce. No hay ninguna dirección que un reproductor
// pueda abrir, así que no hay nada que resolver — no es que el resolver falle.
//
// Se corta acá mismo, sin gastar el pedido de red: la espera sería tiempo
// tirado a la basura en cada episodio.
//
// ── Y sin embargo se deja en la lista ────────────────────────────────────────
//
// El navegador interno de la app SÍ lo reproduce, porque ejecuta el JS que hace
// el descifrado. Sacar el botón no evitaría ningún fallo: convertiría un
// episodio con cuatro opciones en uno con tres. Es la misma decisión que se
// tomó en tioanime, donde ocultar Mega dejó episodios muertos.
//
// Va al final de la lista para que nunca sea el servidor con el que arranca el
// episodio: la app toma el primero como el inicial, y empezar por el único que
// obliga a salir al navegador sería el peor arranque posible.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

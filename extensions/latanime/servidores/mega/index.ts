// ─── Mega 🌐 navegador ───────────────────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 120 títulos: **115 botones**.
// Va al navegador. Devuelve null a propósito, y de entrada, sin pedir nada.
//
// Mega no cifra la DIRECCIÓN, cifra el ARCHIVO: lo que viaja por la red son
// bytes cifrados y la clave está en el fragmento de la URL (`#!…`), que ni
// siquiera se manda al servidor. Solo un navegador que ejecute su JS puede ir
// descifrando mientras reproduce. No hay ninguna dirección que sacar, por más
// que se raspe la página.
//
// Por eso ni se intenta: cualquier pedido es tiempo regalado antes de caer al
// navegador, que es donde sí funciona.
//
// Y por eso se deja en la lista en vez de ocultarlo: son 115 botones que el
// navegador interno reproduce bien.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

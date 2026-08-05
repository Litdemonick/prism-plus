// ─── filelions (filelions.top) 🌐 navegador ──────────────────────────────────
//
// Medido el 2026-08-04: **~19 botones**.
// Va al navegador. Devuelve null a propósito, y de entrada.
//
// ── Este no es "no resuelve": el host no responde ───────────────────────────
//
// El dominio resuelve por DNS —apunta a Cloudflare, 172.67.137.199 y
// 104.21.38.190— pero la conexión no se llega a establecer: curl devuelve
// **HTTP 000**, que es "ni contestó". No es un 403 ni una página de error: no
// hay diálogo.
//
// Por eso este devuelve null sin pedir nada. Intentarlo es regalarle al usuario
// la espera del tiempo de espera de red antes de caer al navegador — y el
// navegador probablemente tampoco pueda, porque el problema es del host, no del
// raspado.
//
// Se deja en la lista igual, sin ocultarlo: es la única forma de que el usuario
// vea que ese servidor existe y está caído, en vez de que el episodio muestre
// un servidor menos sin explicación. Si algún día el dominio vuelve, lo que hay
// que probar primero es el camino del genérico (`buscarDireccion` de
// `comun.ts`), que es lo que le corresponde a esta familia.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

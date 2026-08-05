// ─── Uqload (uqload.is) 🌐 navegador ─────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 60 episodios: **56 botones**. Va al navegador.
// Devuelve null a propósito.
//
// ── Es el espejo, no el servidor ────────────────────────────────────────────
//
// `uqload.com` funciona bien en otras extensiones del repo (en latanime,
// `uqload.is` incluso resuelve por la API de la familia streamwish). Pero el
// espejo que usa ESTE sitio no entrega nada: la página del embed no trae datos
// de vídeo en el HTML estático, solo un formulario `action="/dl"` con
// `op`/`file_code`/`referer` — el mismo portón POST que usan streamhls y
// savefiles.
//
// Medido el 2026-08-04 sobre **5 episodios distintos: 0 de 5**. No es un embed
// muerto suelto, es siempre. Ya se había confirmado antes sobre 2 episodios, y
// la nueva medición lo repite.
//
// Ojo con la forma de la dirección, que también despista: el sitio la sirve con
// el nodo pegado en la query, `…/e/kkz0jmr5ntyw?e15.uqload.is/i/0…`.
//
// ── Por qué ahora aparece en la lista ───────────────────────────────────────
//
// Hasta el 2026-08-05 estaba OCULTO. El navegador interno sí puede con el
// portón, porque ejecuta el JS que el raspado no ejecuta. A pedido del usuario
// se dejó de esconder: son 56 botones que ahora se ofrecen con el mundo.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

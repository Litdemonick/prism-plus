// ─── Mixdrop ⚡ nativo ────────────────────────────────────────────────────────
//
// Medido el 2026-08-05: **59 botones** (uno por episodio), resuelve 3 de 3 con
// 206 `video/mp4`.
//
//   embed   https://mixdrop.top/e/eln06odncgv0w9
//   sale    https://{azar}.mxcontent.net/v2/{id}.mp4?s=…
//   tarda   ~580 ms
//
// La dirección viene empaquetada con el `eval(p,a,c,k,e,d)` de siempre, en una
// variable `MDCore.wurl`. Hay que desempaquetar sí o sí.
//
// Hasta ahora esto lo resolvía el SDK compartido; es una de las copias que se
// trajeron para que esta extensión no dependa de él. El Referer va fijo con
// `mixdrop.top`, que es el que acepta el CDN. La firma `?s=` cambia en cada
// pedido: la dirección es de un solo uso.

// ── Por qué no reproducía, en Windows NI en Android ─────────────────────────
//
// El CDN ata la dirección al User-Agent EXACTO que la pidió, y la app resolvía
// con uno y reproducía con otro. Medido el 2026-08-06, mismo episodio:
//
//     resuelto con escritorio → pedido con el de mpv →  403
//     resuelto con móvil      → pedido con el de mpv →  403
//     resuelto con el de mpv  → pedido con el de mpv →  206 video/mp4
//
// **Es más estricto que VOE y Filemoon**, que tienen el mismo problema de
// fondo: aquéllos daban por buena cualquier cabecera de escritorio, así que
// solo fallaban en el teléfono. Mixdrop no perdona ni de un escritorio a otro
// —`Edg/120` a `Chrome/125` ya es 403—, y por eso se caía en las dos.
//
// El Referer, en cambio, le da igual: contesta 206 con él y sin él. Se sigue
// mandando porque no molesta y es lo que el sitio espera.
//
// El dominio también se mudó: `mixdrop.top` redirige a `miixdrop.com` (con dos
// íes). Eso NO hacía falta tocarlo — el puente de red sigue las redirecciones y
// la ruta se conserva—, pero conviene saberlo antes de salir a buscar el
// problema en otro lado.

import {
  pedir,
  desempaquetarTodo,
  CABECERAS_DEL_REPRODUCTOR,
  type ServidorResuelto,
} from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer, CABECERAS_DEL_REPRODUCTOR);
  if (!html) return null;

  const desempaquetado = desempaquetarTodo(html);
  const wurl = /MDCore\.wurl\s*=\s*["']([^"']+)["']/.exec(desempaquetado);
  let destino = wurl?.[1];
  if (!destino) {
    const mp4 = /(\/\/[^"'\s]+\.mp4[^"'\s]*)/.exec(desempaquetado);
    destino = mp4?.[1];
  }
  if (!destino) return null;

  const completa = destino.indexOf('http') === 0 ? destino : `https:${destino}`;
  // El MISMO User-Agent con el que se pidió: el CDN emitió la dirección para
  // ése y rechaza cualquier otro. Ver el bloque de arriba.
  return {
    url: completa,
    headers: {
      Referer: 'https://mixdrop.top/',
      ...CABECERAS_DEL_REPRODUCTOR,
    },
  };
}

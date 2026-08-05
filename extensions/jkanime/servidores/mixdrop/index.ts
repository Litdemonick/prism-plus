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

import { pedir, desempaquetarTodo, type ServidorResuelto } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
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
  return { url: completa, headers: { Referer: 'https://mixdrop.top/' } };
}

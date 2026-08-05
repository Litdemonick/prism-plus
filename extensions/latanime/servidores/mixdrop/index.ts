// ─── mixdrop ⚡ nativo ────────────────────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 120 títulos: **119 botones**.
//
//   embed   https://mixdrop.top/e/7krpl7k1fvnqpj
//   sale    https://30xplewoo.mxcontent.net/v2/7krpl7k1fvnqpj.mp4?s=…
//   tarda   580–600 ms
//   se abre 206 video/mp4
//
// La dirección viene empaquetada con el `eval(p,a,c,k,e,d)` de siempre, en una
// variable `MDCore.wurl`. Hay que desempaquetar sí o sí: el genérico —que busca
// m3u8/mp4 sueltos— **no lo saca** (medido, devuelve null), así que este
// resolver no es redundante.
//
// Acá el sitio usa `mixdrop.top` directo, que es también el Referer que acepta
// el CDN. (En shademanga el espejo es `mixdrop.ps` y el Referer igual va con
// `.top` — por eso está fijo y no se arma con el host.)
//
// La firma `?s=` cambia en cada pedido: la dirección es de un solo uso.

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

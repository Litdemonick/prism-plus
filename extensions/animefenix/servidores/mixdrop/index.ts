// ─── mixdrop ⚡ nativo ────────────────────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 60 episodios: **3 botones**, repartidos entre dos
// espejos: `miiiixdrop.net` (2) y `miixdrop.net` (1). El sitio lo rotula
// "MixEx".
//
//   embed   https://miiiixdrop.net/e/xwo1jk3dbm7dgv
//   sale    https://81bfqpx79.mxcontent.net/v2/xwo1jk3dbm7dgv.mp4?s=…
//   tarda   600–700 ms
//   se abre 206 video/mp4
//
// Ojo con los nombres: los espejos meten letras de más ("miiiixdrop",
// "miixdrop") para esquivar bloqueos por dominio exacto, pero **"xdrop" siempre
// sobrevive** — por eso la ficha se reconoce por ese trozo.
//
// La dirección viene empaquetada con el `eval(p,a,c,k,e,d)` de siempre, en una
// variable `MDCore.wurl`. Hay que desempaquetar sí o sí: el genérico —que busca
// m3u8/mp4 sueltos— **no lo saca** (medido, devuelve null), así que este
// resolver no es redundante.
//
// El sitio usa el espejo `mixdrop.ps`; el Referer, en cambio, va con
// `mixdrop.top`, que es el que acepta el CDN.
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

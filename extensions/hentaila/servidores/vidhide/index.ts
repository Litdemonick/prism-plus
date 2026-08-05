// ─── VidHide (ryderjet.com) ⚡ nativo ─────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 200 títulos: **199 botones**, o sea casi todos.
//
//   embed   https://ryderjet.com/embed/bkor1xdaclz9
//   sale    https://wt4PjIIVE9AGjPL.dramiyos-cdn.com/hls2/01/08403/bkor1xd…m3u8
//   tarda   670–1000 ms
//   se abre 200 application/vnd.apple.mpegurl
//
// ── Lo que se aclaró al aislarla ─────────────────────────────────────────────
//
// `ryderjet.com` no estaba en la lista de hosts del enrutador del SDK, así que
// caía al genérico en vez de ir a `resolveStreamwish` — quedaba la duda de si
// eso lo estaba perjudicando. **Se midió: no.** Los dos caminos devuelven la
// MISMA dirección, con el mismo CDN y la misma demora, sobre dos episodios
// distintos. Lo que pasa es que la página trae el m3u8 empaquetado con el
// `eval(p,a,c,k,e,d)` de siempre, y eso el genérico ya lo desarma solo; la API
// `/api/file/{id}?json=1` de la familia streamwish no aporta nada acá.
//
// Por eso este resolver es el camino genérico y no una copia de streamwish: es
// lo que se midió que anda, no lo que parecía que correspondía por el nombre.
//
// El subdominio del CDN (`wt4PjIIVE9AGjPL`) cambia en cada pedido, así que la
// dirección es de un solo uso.

import { pedir, hostDe, buscarDireccion, type ServidorResuelto } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : undefined);
}

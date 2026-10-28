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

/**
 * Una dirección de la lista, completa. Sin `new URL`: el motor de JS de la app
 * no lo tiene (ya rompió una extensión en vivo).
 */
function _resolver(rel: string, base: string): string {
  if (/^https?:\/\//i.test(rel)) return rel;
  const origen = /^(https?:\/\/[^/]+)/i.exec(base)?.[1] ?? '';
  if (rel.startsWith('/')) return origen + rel;
  const sinConsulta = base.split('?')[0];
  return sinConsulta.slice(0, sinConsulta.lastIndexOf('/') + 1) + rel;
}

/**
 * Si el vídeo sigue en VidHide: true sí, false no, null no se sabe.
 *
 * Medido el 2026-10-28 (37 obras): cuando el vídeo ya no está, VidHide NO da
 * error — entrega una lista de reproducción de mentira, de unos 7 pedazos, que
 * contestan 403. Los vídeos de verdad traen 160 o más y contestan bien. Se
 * baja la lista (y la variante, si es una maestra) y se pide UN byte del primer
 * pedazo: 403 es «no está».
 */
export async function estaVivo(url: string, referer: string): Promise<boolean | null> {
  const r = await resolver(url, referer);
  if (!r) return null;
  const cab = r.headers;
  let lista = await pedir(r.url, referer, cab);
  if (!lista || lista.indexOf('#EXTM3U') === -1) return null;
  let base = r.url;
  const primera = (texto: string) =>
    texto.split('\n').map((l) => l.trim()).find((l) => l && l[0] !== '#') ?? null;
  if (lista.indexOf('#EXT-X-STREAM-INF') !== -1) {
    const variante = primera(lista);
    if (!variante) return null;
    base = _resolver(variante, base);
    lista = await pedir(base, referer, cab);
    if (!lista) return null;
  }
  const pedazo = primera(lista);
  if (!pedazo) return null;
  const byte = await pedir(_resolver(pedazo, base), referer, { ...cab, Range: 'bytes=0-0' });
  if (byte === null) return null;
  // El rechazo es una página de error chica; un pedazo real devuelve 1 byte.
  return byte.length <= 4;
}

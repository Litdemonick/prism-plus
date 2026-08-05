// ─── HideNise (callistanise.com) ⚡ nativo ────────────────────────────────────
//
// Medido el 2026-08-04 sobre 60 episodios: **3 botones**. Casi no aparece,
// pero resuelve limpio.
//
//   embed   https://callistanise.com/embed/e3qwve4e7erf
//   sale    un m3u8 firmado (acek-cdn.com / dramiyos-cdn.com, rota)
//   tarda   770–790 ms
//   se abre 200 application/vnd.apple.mpegurl
//
// Es de la familia vidhide/streamwish con otro nombre. La página trae el m3u8
// empaquetado con el `eval(p,a,c,k,e,d)` de siempre, así que alcanza con bajar
// y desempaquetar — no hace falta la API de esa familia. El subdominio del CDN
// cambia en cada pedido: la dirección es de un solo uso.

import { pedir, hostDe, buscarDireccion, type ServidorResuelto } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : undefined);
}

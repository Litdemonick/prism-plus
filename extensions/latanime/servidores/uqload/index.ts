// ─── Uqload ⚡ nativo ─────────────────────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 120 títulos: **2 botones**. Es el más chico de
// todos y aparece muy de vez en cuando, pero resuelve limpio.
//
//   embed   https://uqload.is/cfzcesmh9go2.html
//   sale    https://strm10.uqload.is/hls2/02/05061/cfzcesmh9go2…m3u8
//   tarda   ~440 ms
//   se abre 200 application/vnd.apple.mpegurl
//
// Es de la familia streamwish: primero se prueba la API `/api/file/{id}?json=1`
// y, si no da, se baja el embed y se busca ahí (que es lo que termina pasando
// acá, porque la dirección viene empaquetada con `eval(p,a,c,k,e,d)`).
//
// El código sale del nombre del archivo (`cfzcesmh9go2.html`), no de un `/e/`
// como en el resto de la familia — por eso se usa `codigoDe`, que saca el
// último tramo y le quita la extensión.

import { pedir, hostDe, codigoDe, buscarDireccion, type ServidorResuelto } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const host = hostDe(url);
  if (!host) return null;
  const hdrs = { Referer: `https://${host}/` };

  const codigo = codigoDe(url);
  if (codigo) {
    const json = await pedir(`https://${host}/api/file/${codigo}?json=1`, `https://${host}/`);
    if (json) {
      const m3u8 = /"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(json);
      if (m3u8) return { url: m3u8[1].replace(/\\\//g, '/'), headers: hdrs };
      const mp4 = /"file"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(json);
      if (mp4) return { url: mp4[1].replace(/\\\//g, '/'), headers: hdrs };
    }
  }

  // Respaldo: bajar el embed y buscar adentro, desempaquetando lo que haya.
  const html = await pedir(url, referer);
  if (!html) return null;
  return buscarDireccion(html, hdrs);
}

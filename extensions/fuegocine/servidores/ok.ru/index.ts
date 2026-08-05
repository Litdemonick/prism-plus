// ─── OK.RU · ok.ru ───────────────────────────────────────────────────────────
//
// 55 botones en el catálogo. Reproduce en la app.
//
// El m3u8 viene en el propio HTML, pero DOBLEMENTE escapado: está dentro de un
// atributo que a su vez lleva JSON, así que las comillas aparecen como
// `\&quot;` y los `&` como `\\u0026`. Por eso se busca con índices y no con una
// expresión: la marca es literal y el final también.
//
// Medido el 2026-08-04: ~0,8 s hasta un `video.m3u8` en vkuser.net.

import { pedir, type ServidorResuelto } from '../comun';

export async function resolver(url: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, 'https://ok.ru/');
  if (!html) return null;
  const marca = 'hlsManifestUrl\\&quot;:\\&quot;';
  const desde = html.indexOf(marca);
  if (desde === -1) return null;
  const ini = desde + marca.length;
  const fin = html.indexOf('\\&quot;', ini);
  if (fin === -1) return null;
  const salida = html.slice(ini, fin).split('\\\\u0026').join('&');
  if (!/^https?:\/\//.test(salida)) return null;
  return { url: salida };
}

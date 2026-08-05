// ─── Savefiles ⚡ nativo ──────────────────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 120 títulos: **119 botones**, el que más aparece.
//
//   embed   https://savefiles.com/e/h3882sysrdkr
//   sale    https://s2.savefiles.com/hls2/01/00405/,h3882sysrdkr…m3u8
//   tarda   340–500 ms
//   se abre 200 application/vnd.apple.mpegurl
//
// La página no trae el vídeo: hay que hacer el mismo POST que hace el sitio por
// AJAX contra `/dl`, con `op=embed` y el código del archivo. La respuesta ya
// trae el m3u8 en texto plano.
//
// **`streamhls.to` es el mismo motor pero HOY NO ANDA** (2 botones). El mismo
// POST contra ese host devuelve una respuesta sin ninguna fuente adentro
// ("el POST a /dl no trajo ninguna fuente"). Comparte este resolver igual, pero
// en la tabla va marcado como de navegador, que es lo que se midió.

import { postForm, hostDe, codigoDe, type ServidorResuelto } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const host = hostDe(url) || 'savefiles.com';
  const codigo = codigoDe(url);
  if (!codigo) return null;

  const html = await postForm(
    `https://${host}/dl`,
    { op: 'embed', file_code: codigo, auto: '1', referer: referer || '' },
    referer || `https://${host}/`,
  );
  if (!html) return null;

  const plano = html.replace(/\\\//g, '/');
  const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(plano);
  if (m3u8) return { url: m3u8[1], headers: { Referer: `https://${host}/` } };
  const mp4 = /(https?:[^"'\s\\]+\.mp4[^"'\s\\]*)/.exec(plano);
  if (mp4) return { url: mp4[1], headers: { Referer: `https://${host}/` } };

  console.log('[la] savefiles: el POST a /dl no trajo ninguna fuente');
  return null;
}

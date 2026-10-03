// ─── VRAD (videro.my) ────────────────────────────────────────────────────────
//
// Videro aparece de dos formas en el sitio:
//
//   · Como botón «FC» con la lista HLS directa (…/index.m3u8): eso ya lo abre
//     el resolver `directo`, no pasa por acá.
//   · Como botón «VRAD» con la página del reproductor, `videro.my/e/<id>`.
//     Hasta la 1.9.5 eso también iba a `directo`, que devolvía la PÁGINA como si
//     fuera vídeo (medido: 2 de 2 «HTTP 200 text/html»).
//
// La página es una app de React que pide la fuente a su API pública:
//
//   GET https://videro.my/api/videos/public/<id>
//   → {"status":"ready","hls_url":"/hls/<hash>/index.m3u8", …}
//
// Medido el 2026-10-02: 3 de 3 con la lista bajando bien.

import { hostDe, pedir, type ServidorResuelto, UA_NAVEGADOR } from '../comun';

export async function resolver(url: string): Promise<ServidorResuelto | null> {
  // La lista directa: tal cual.
  if (/\.m3u8(\?|$)/i.test(url)) return { url };
  const id = /\/e\/([A-Za-z0-9]+)/.exec(url)?.[1];
  if (!id) return null;
  const host = hostDe(url) ?? 'videro.my';
  const raw = await pedir(`https://${host}/api/videos/public/${id}`, url, { Accept: 'application/json' });
  if (!raw) return null;
  try {
    const j = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const ruta = j?.hls_url ?? j?.hls_path;
    if (j?.status !== 'ready' || typeof ruta !== 'string' || !ruta) {
      console.log(`[fc/videro] no está listo: ${String(raw).slice(0, 80)}`);
      return null;
    }
    const lista = /^https?:\/\//.test(ruta) ? ruta : `https://${host}${ruta.startsWith('/') ? '' : '/'}${ruta}`;
    return { url: lista, headers: { 'User-Agent': UA_NAVEGADOR, Referer: url } };
  } catch {
    console.log(`[fc/videro] respuesta que no es JSON: ${String(raw).slice(0, 80)}`);
    return null;
  }
}

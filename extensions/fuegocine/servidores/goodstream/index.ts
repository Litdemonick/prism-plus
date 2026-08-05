// ─── GS · gscdn.cam y goodstream.one ─────────────────────────────────────────
//
// 128 botones en el catálogo (97 gscdn + 31 goodstream). Reproduce en la app.
// El botón dice "GS✅(ads)": los anuncios son de la página del embed, que acá
// no se abre — se saca la dirección y se le pasa al reproductor de la app.
//
// gscdn.cam es un envoltorio de goodstream.one, y los dos traen el m3u8 en
// TEXTO PLANO, en `sources: [{file:"..."}]`. No hace falta desempaquetar nada,
// pero se pasa igual por buscarDireccion por si algún día lo empaquetan.
//
// OJO: las direcciones de gscdn vienen sin protocolo (`//gscdn.cam/...`). Eso
// lo normaliza quien llama, antes de llegar acá.
//
// Medido el 2026-08-04: ~0,7 s hasta un `master.m3u8` firmado en enc*.goodstream.one.

import { buscarDireccion, hostDe, pedir, type ServidorResuelto } from '../comun';

export async function resolver(
  url: string,
  referer: string,
): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : undefined);
}

// ─── VST (vids.st) ───────────────────────────────────────────────────────────
//
// Medido el 2026-10-02: 8 de 8 andan (20 de 356 páginas). La página del
// reproductor trae la dirección del mp4 en claro:
//
//   const url = "https:\/\/vids.st\/storage\/uploads\/video139062\/remote.mp4";
//
// Archivo mp4 con pedidos por partes (206), de 1 a 8 MB/s desde el medio.
//
// Ojo: el `fetch` de Node no conecta con vids.st (curl sí, y Edge también); hay
// que confirmarlo dentro de la app, que usa otro cliente.

import { pedir, type ServidorResuelto, UA_NAVEGADOR } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;
  const m = /const\s+url\s*=\s*"([^"]+)"/.exec(html) ?? /const\s+url\s*=\s*'([^']+)'/.exec(html);
  if (!m) {
    console.log('[fc/vst] la página no trae la dirección del vídeo');
    return null;
  }
  const directo = m[1].replace(/\\\//g, '/');
  if (!/^https?:\/\//.test(directo)) return null;
  return { url: directo, headers: { 'User-Agent': UA_NAVEGADOR, Referer: url } };
}

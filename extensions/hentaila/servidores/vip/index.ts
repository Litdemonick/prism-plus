// ─── VIP ⚡ nativo ───────────────────────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 200 títulos: **200 botones**, está en TODOS.
//
// ── Cómo saca la dirección el sitio ──────────────────────────────────────────
//
// La página del embed es un cascarón Vite vacío; el bundle arma la lista con el
// hash de 32 caracteres que ya viene en la URL del embed, sin pedir nada:
//
//     https://<host>/play/09a4b16abcdf3964037a2384602aa768
//     https://<host>/m3u8/09a4b16abcdf3964037a2384602aa768
//
// ── Antes iba al navegador; desde el 2026-10-28, no ──────────────────────────
//
// En `cdn.hvidserv.com` los pedazos (`/segs/<hash>/000.html`) daban 403 de
// Cloudflare, y por eso esto devolvía null a propósito. El sitio se mudó a
// `cdn.dotanborito.net` y ahí la lista Y los pedazos contestan 200, sin token
// ni Referer (medido: lista de 15 KB, pedazos de 1,2 MB, fMP4 real con su
// `init`). Ya no hay navegador en la app, así que esto vuelve a ser nativo.
//
// Los pedazos siguen llamándose `.html`. Las versiones nuevas de FFmpeg (desde
// la 7.1) rechazan eso («mismatches allowed extensions», probado con la 9.0);
// el mpv de la app trae FFmpeg 6.0 en PC y tampoco tiene ese filtro en
// Android, así que pasa. Si algún día se actualiza mpv, mirar acá primero.

import { pedir, hostDe, type ServidorResuelto } from '../comun';

function _lista(url: string): string | null {
  const hash = /\/play\/([a-f0-9]{32})/i.exec(url)?.[1];
  const host = hostDe(url);
  return hash && host ? `https://${host}/m3u8/${hash}` : null;
}

export async function resolver(url: string): Promise<ServidorResuelto | null> {
  const lista = _lista(url);
  return lista ? { url: lista } : null;
}

/** true sí, false borrado («Not Found»), null no se sabe. */
export async function estaVivo(url: string): Promise<boolean | null> {
  const lista = _lista(url);
  if (!lista) return null;
  const texto = await pedir(lista, url);
  if (texto === null) return null;
  if (texto.indexOf('#EXTM3U') !== -1) return true;
  if (/not found/i.test(texto)) return false;
  return null;
}

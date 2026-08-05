// ─── PlusTube (re.ironhentai.com/vt.php) ⚡ nativo ────────────────────────────
//
// Medido el 2026-08-04 sobre 60 episodios: **61 botones**, el que más aparece —
// está en todos, y en alguno hay dos.
//
//   embed   https://re.ironhentai.com/vt.php?id=d1dpk3qvbsls
//   sale    https://str12.vtube.network/hls/,x5s4v36mljyki…m3u8
//   tarda   ~270 ms
//   se abre 206 application/vnd.apple.mpegurl
//
// Es el backend propio del sitio, no un servidor de terceros. Esconde la
// dirección con doble base64 y un corrimiento de -1 entre medio — eso lo hace
// `desofuscarIronhentai` en `comun.ts`, porque PremiunVIP usa el mismo truco.
// Lo que queda adentro es un `hls.loadSource('…m3u8')` en texto plano.
//
// Sin las cabeceras de navegador el host devuelve **406** y no hay nada que
// desofuscar. Es lo único que exige: ni cookies ni token.

import { pedir, desofuscarIronhentai, ACEPTA_NAVEGADOR, type ServidorResuelto } from '../comun';

const BASE = 'https://animefenix.tv';

export async function resolver(url: string, _referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, `${BASE}/`, ACEPTA_NAVEGADOR);
  if (!html) return null;

  const claro = desofuscarIronhentai(html);
  if (!claro) return null;

  const hls = /loadSource\('([^']+\.m3u8[^']*)'\)/.exec(claro);
  if (!hls) return null;
  return { url: hls[1], headers: { Referer: `${BASE}/` } };
}

// ─── PM (playmate.to) ────────────────────────────────────────────────────────
//
// Medido el 2026-10-02: 15 de 15 andan (20 de 356 páginas; casi todas series
// de 2026 que no tenían ningún otro servidor que la app pudiera abrir: El
// Método Scaloni, Linternas, Tierra de Mafia, Mr. Robot…).
//
// La página es un jwplayer que pide la fuente a su propia API:
//
//   POST https://playmate.to/api/s   {"c": "<código>", "d": "desktop"}
//   → {"sx": "https://…/hls/<id>/master.txt", "lx": "English", …}
//
// `sx` es una lista HLS maestra aunque termine en .txt, y sus trozos vienen
// disfrazados de .css/.js/.woff (TS de verdad). El ffmpeg de la app (6.0, en
// Windows y Android) los acepta; si algún día se actualiza a uno que mire las
// extensiones de los trozos (`extension_picky`), hay que permitirlas ahí.
// No pide cabeceras: la lista y los trozos contestan 200 sin Referer.

import { codigoDe, postJson, type ServidorResuelto, UA_NAVEGADOR } from '../comun';

export async function resolver(url: string): Promise<ServidorResuelto | null> {
  const codigo = codigoDe(url);
  if (!codigo) return null;
  const raw = await postJson('https://playmate.to/api/s', { c: codigo, d: 'desktop' }, url);
  if (!raw) return null;
  try {
    const j = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const sx = j?.sx;
    if (typeof sx !== 'string' || !/^https?:\/\//.test(sx)) {
      console.log(`[fc/pm] la API no trajo la fuente: ${String(raw).slice(0, 80)}`);
      return null;
    }
    return { url: sx, headers: { 'User-Agent': UA_NAVEGADOR, Referer: 'https://playmate.to/' } };
  } catch {
    console.log(`[fc/pm] respuesta que no es JSON: ${String(raw).slice(0, 80)}`);
    return null;
  }
}

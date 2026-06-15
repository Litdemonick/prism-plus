// ─── Prism+ SDK — Resolvers de embeds de video ────────────────────────────────
// Funciones compartidas para extraer URLs de stream directas desde páginas embed
// de servidores comunes: voe.sx, streamtape.com.
//
// Uso en extensiones:
//   import { resolveEmbed, b64decode } from '../../sdk/embeds';

import { request } from './http';

export interface ResolvedEmbed {
  url: string;
  headers?: Record<string, string>;
}

/**
 * Detecta el servidor a partir del nombre o URL y delega al resolver correcto.
 * Retorna null si el servidor no está soportado o la resolución falla.
 */
export async function resolveEmbed(
  server: string,
  embedUrl: string,
  referer: string,
): Promise<ResolvedEmbed | null> {
  const s = server.toLowerCase();
  if (s.includes('voe')) return resolveVoe(embedUrl, referer);
  if (s.includes('streamtape') || s.includes('stape') || s.includes('tape'))
    return resolveStreamtape(embedUrl, referer);
  return null;
}

/** voe.sx — soporta hls directo y ofuscación base64 (atob) */
export async function resolveVoe(
  url: string,
  referer: string,
): Promise<ResolvedEmbed | null> {
  const html = await fetchEmbed(url, referer);
  if (!html) return null;

  let m = /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(html);
  if (m) return { url: m[1] };

  m = /"hls"\s*:\s*"([^"]+)"/.exec(html);
  if (m) return { url: m[1] };

  // Ofuscación atob: var wjs = atob('base64...')
  const atobMatch = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
  if (atobMatch) {
    try {
      const decoded = b64decode(atobMatch[1]);
      const hls =
        /"hls"\s*:\s*"([^"]+)"/.exec(decoded) ??
        /'hls'\s*:\s*'([^']+)'/.exec(decoded) ??
        /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(decoded);
      if (hls) return { url: hls[1] };
      const direct = /(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/.exec(decoded);
      if (direct) return { url: direct[1] };
    } catch { /* ignorar error de decodificación */ }
  }

  m = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
  if (m) return { url: m[0] };

  return null;
}

/** streamtape.com — múltiples patrones de obfuscación */
export async function resolveStreamtape(
  url: string,
  referer: string,
): Promise<ResolvedEmbed | null> {
  const html = await fetchEmbed(url, referer);
  if (!html) return null;

  let m = /(https?:\/\/streamtape\.[a-z]+\/get_video[^"'\s<>&]+)/.exec(html);
  if (m) return { url: m[1] };

  m = /(\/\/streamtape\.[a-z]+\/get_video[^"'\s<>&]+)/.exec(html);
  if (m) return { url: `https:${m[1]}` };

  m = /robotlink[^)]*\)\s*\.innerHTML\s*=\s*["']([^"']+)["']\s*\+\s*["']([^"']*)["']/.exec(html);
  if (m) {
    const full = m[1] + m[2];
    return { url: full.startsWith('http') ? full : `https:${full}` };
  }

  return null;
}

/** Fetch con timeout corto y sin reintentos — para páginas embed externas */
export async function fetchEmbed(url: string, referer: string): Promise<string | null> {
  try {
    const res = await request(url, {
      headers: { Referer: referer },
      timeout: 8000,
      retries: 0,
    });
    return res.text();
  } catch {
    return null;
  }
}

/** Decodificador base64 puro JS — no depende de atob() del entorno */
export function b64decode(s: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  let result = '';
  let i = 0;
  while (i < clean.length) {
    const b1 = chars.indexOf(clean[i++]);
    const b2 = chars.indexOf(clean[i++]);
    const b3 = i < clean.length ? chars.indexOf(clean[i++]) : -1;
    const b4 = i < clean.length ? chars.indexOf(clean[i++]) : -1;
    result += String.fromCharCode((b1 << 2) | (b2 >> 4));
    if (b3 !== -1) result += String.fromCharCode(((b2 & 15) << 4) | (b3 >> 2));
    if (b4 !== -1) result += String.fromCharCode(((b3 & 3) << 6) | b4);
  }
  return result;
}

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

/**
 * voe.sx — formato 2024+.
 *
 * El embed `voe.sx/e/xxx` ahora es una página de redirección JS hacia un dominio
 * espejo rotativo (p. ej. `juliewomanwish.com/e/xxx`). El espejo embebe los datos
 * cifrados en `<script type="application/json">["..."]</script>`.
 *
 * Algoritmo de descifrado (ingeniería inversa, voe 2024):
 *   1. ROT13
 *   2. eliminar los marcadores de relleno: @$ ^^ #& ~@ %? *~ !! `
 *   3. base64 decode
 *   4. desplazar cada char −3
 *   5. invertir la cadena
 *   6. base64 decode → JSON con `source` (m3u8) y `direct_access_url` (mp4)
 *
 * Se prefiere el mp4 directo (más simple para el reproductor); si no, el m3u8.
 * Mantiene fallbacks para páginas voe antiguas (hls directo / atob).
 */
export async function resolveVoe(
  url: string,
  referer: string,
): Promise<ResolvedEmbed | null> {
  let html = await fetchEmbed(url, referer);
  if (!html) return null;

  // 1. Seguir la redirección JS al dominio espejo, si la hay.
  const redir = /window\.location(?:\.href)?\s*=\s*['"](https?:\/\/[^'"]+)['"]/.exec(
    html,
  );
  if (redir) {
    const mirror = await fetchEmbed(redir[1], 'https://voe.sx/');
    if (mirror) html = mirror;
  }

  // 2. Formato 2024: JSON cifrado en <script type="application/json">["..."]</script>
  const jsonScript = /<script[^>]*type=["']application\/json["'][^>]*>\s*\[\s*"([^"]+)"\s*\]\s*<\/script>/.exec(
    html,
  );
  if (jsonScript) {
    const decoded = _voeDecode(jsonScript[1]);
    if (decoded) {
      const mp4 = /"direct_access_url"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(decoded);
      if (mp4) return { url: _unescapeUrl(mp4[1]) };
      const src = /"source"\s*:\s*"([^"]+)"/.exec(decoded);
      if (src) return { url: _unescapeUrl(src[1]) };
      const anyM3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(
        decoded.replace(/\\\//g, '/'),
      );
      if (anyM3u8) return { url: anyM3u8[1] };
    }
  }

  // 3. Fallbacks para páginas voe antiguas.
  let m = /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(html);
  if (m) return { url: m[1] };

  const atobMatch = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
  if (atobMatch) {
    try {
      const decoded = b64decode(atobMatch[1]);
      const hls = /['"]hls['"]\s*:\s*['"]([^'"]+)['"]/.exec(decoded);
      if (hls) return { url: hls[1] };
      const direct = /(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/.exec(decoded);
      if (direct) return { url: direct[1] };
    } catch { /* ignorar */ }
  }

  m = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
  if (m) return { url: m[0] };

  return null;
}

/** ROT13 sobre letras ASCII. */
function _rot13(s: string): string {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

/** Convierte las barras escapadas de JSON (`\/` → `/`). */
function _unescapeUrl(s: string): string {
  return s.replace(/\\\//g, '/');
}

/** Descifrado de la cadena ofuscada de voe 2024. Retorna JSON crudo o null. */
function _voeDecode(raw: string): string | null {
  try {
    let r = _rot13(raw);
    for (const p of ['@$', '^^', '#&', '~@', '%?', '*~', '!!', '`']) {
      r = r.split(p).join('');
    }
    const step3 = b64decode(r);
    let shifted = '';
    for (let i = 0; i < step3.length; i++) {
      shifted += String.fromCharCode(step3.charCodeAt(i) - 3);
    }
    const reversed = shifted.split('').reverse().join('');
    return b64decode(reversed);
  } catch {
    return null;
  }
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

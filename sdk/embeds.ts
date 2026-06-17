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
 * Si el servidor no es conocido, intenta un resolver genérico (desempaqueta
 * `eval(p,a,c,k,e,d)` y busca m3u8/mp4) — así muchos hosts de la familia
 * streamwish/filemoon funcionan sin código específico.
 * Retorna null si la resolución falla por completo.
 */
export async function resolveEmbed(
  server: string,
  embedUrl: string,
  referer: string,
): Promise<ResolvedEmbed | null> {
  const s = `${server} ${embedUrl}`.toLowerCase();

  let result: ResolvedEmbed | null;
  try {
    if (s.includes('voe')) result = await resolveVoe(embedUrl, referer);
    else if (s.includes('streamtape') || s.includes('stape') || s.includes('strtape'))
      result = await resolveStreamtape(embedUrl, referer);
    else if (s.includes('mixdrop') || s.includes('mxdrop') || s.includes('mdrop'))
      result = await resolveMixdrop(embedUrl, referer);
    else if (s.includes('mp4upload')) result = await resolveMp4upload(embedUrl, referer);
    else if (s.includes('yourupload') || s.includes('yupload'))
      result = await resolveYourupload(embedUrl, referer);
    else if (s.includes('hqq') || s.includes('netu')) result = await resolveNetu(embedUrl, referer);
    // Familia streamwish/filemoon/luluvdo/etc.: el genérico desempaqueta el eval.
    else result = await resolveGeneric(embedUrl, referer);
  } catch (e) {
    console.log(`[resolveEmbed] ${server} THREW: ${(e as Error)?.message ?? e}`);
    return null;
  }

  console.log(
    `[resolveEmbed] ${server} -> ${result ? result.url.slice(0, 60) : 'NULL'}`,
  );
  return result;
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
  // voe encadena 2 fetches (redirect + espejo); le damos más margen y 1 reintento
  // para reducir fallos intermitentes bajo carga paralela.
  const voeOpts = { timeout: 14000, retries: 1 };
  let html = await fetchEmbed(url, referer, voeOpts);
  if (!html) return null;

  // 1. Seguir la redirección JS al dominio espejo, si la hay.
  const redir = /window\.location(?:\.href)?\s*=\s*['"](https?:\/\/[^'"]+)['"]/.exec(
    html,
  );
  if (redir) {
    const mirror = await fetchEmbed(redir[1], 'https://voe.sx/', voeOpts);
    if (mirror) html = mirror;
  }

  // 2. Formato 2024: JSON cifrado en <script type="application/json">["..."]</script>
  const jsonScript = /<script[^>]*type=["']application\/json["'][^>]*>\s*\[\s*"([^"]+)"\s*\]\s*<\/script>/.exec(
    html,
  );
  if (jsonScript) {
    const decoded = _voeDecode(jsonScript[1]);
    if (decoded) {
      // Preferir el m3u8 (`source`): es streaming-optimizado y media_kit lo
      // reproduce nativo. El `direct_access_url` es un mp4 de DESCARGA (moov al
      // final, sin soporte de rangos) → no reproduce progresivamente en el player.
      const src = /"source"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(decoded);
      if (src) return { url: _unescapeUrl(src[1]) };
      const anyM3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(
        decoded.replace(/\\\//g, '/'),
      );
      if (anyM3u8) return { url: anyM3u8[1] };
      // Fallback: mp4 directo (solo si no hay m3u8).
      const mp4 = /"direct_access_url"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(decoded);
      if (mp4) return { url: _unescapeUrl(mp4[1]) };
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

/**
 * streamtape.com — formato 2024.
 *
 * El link del vídeo está en un div oculto `id="ideoolink"` o `id="botlink"`:
 *   <div id="ideoolink">/streamtape.com/get_video?id=...&expires=...&token=...</div>
 * Se le antepone `https:` y se agrega `&stream=1`. El token va atado a la IP que
 * cargó el embed, así que se reproduce desde la misma máquina (PrismHub).
 * Conserva patrones viejos (get_video directo, robotlink concat) como fallback.
 */
export async function resolveStreamtape(
  url: string,
  referer: string,
): Promise<ResolvedEmbed | null> {
  const html = await fetchEmbed(url, referer);
  if (!html) return null;

  // Formato 2024: div oculto con la URL get_video.
  const div =
    /id=["'](?:ideoolink|botlink|robotlink)["'][^>]*>\s*(\/\/?[^<]*get_video[^<]*)</.exec(
      html,
    );
  if (div) {
    let path = div[1].trim();
    if (path.startsWith('//')) path = `https:${path}`;
    else if (path.startsWith('/')) path = `https:/${path}`;
    if (!/[?&]stream=/.test(path)) path += '&stream=1';
    return { url: path, headers: { Referer: 'https://streamtape.com/' } };
  }

  // Fallbacks (formatos antiguos).
  let m = /(https?:\/\/streamtape\.[a-z]+\/get_video[^"'\s<>]+)/.exec(html);
  if (m) return { url: m[1], headers: { Referer: 'https://streamtape.com/' } };

  m = /(\/\/streamtape\.[a-z]+\/get_video[^"'\s<>]+)/.exec(html);
  if (m) return { url: `https:${m[1]}`, headers: { Referer: 'https://streamtape.com/' } };

  return null;
}

/** mixdrop — `MDCore.wurl` dentro del eval empaquetado → mp4 directo */
export async function resolveMixdrop(
  url: string,
  referer: string,
): Promise<ResolvedEmbed | null> {
  const html = await fetchEmbed(url, referer);
  if (!html) return null;
  const unpacked = _unpackAll(html);
  const wurl = /MDCore\.wurl\s*=\s*["']([^"']+)["']/.exec(unpacked);
  let target = wurl?.[1];
  if (!target) {
    const mp4 = /(\/\/[^"'\s]+\.mp4[^"'\s]*)/.exec(unpacked);
    target = mp4?.[1];
  }
  if (!target) return null;
  const full = target.startsWith('http') ? target : `https:${target}`;
  return { url: full, headers: { Referer: 'https://mixdrop.top/' } };
}

/** mp4upload — mp4 directo en la página del embed */
export async function resolveMp4upload(
  url: string,
  referer: string,
): Promise<ResolvedEmbed | null> {
  const html = await fetchEmbed(url, referer);
  if (!html) return null;
  const candidates = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g) ?? [];
  const real = candidates.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) return null;
  return { url: real, headers: { Referer: 'https://www.mp4upload.com/' } };
}

/**
 * yourupload.com — embed `yourupload.com/embed/XXX`.
 *
 * El reproductor JW de YourUpload expone el mp4 directo en la página del embed,
 * normalmente como `file: "https://cdnXX.yourupload.com/.../video.mp4"` (a veces
 * protocolo-relativo `//cdn...`). Es mp4 directo, así que media_kit lo reproduce
 * sin más. Se prueban varios patrones por robustez.
 */
export async function resolveYourupload(
  url: string,
  referer: string,
): Promise<ResolvedEmbed | null> {
  const html = await fetchEmbed(url, referer, { timeout: 12000, retries: 1 });
  if (!html) return null;
  const hdrs = { Referer: 'https://www.yourupload.com/' };

  const norm = (u: string) =>
    u.replace(/\\\//g, '/').replace(/^\/\//, 'https://');

  // 1. JW Player: file/src/source con mp4 o m3u8
  let m = /(?:file|src|source)\s*:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i.exec(
    html,
  );
  if (m) return { url: norm(m[1]), headers: hdrs };

  // 2. Cualquier URL .mp4 absoluta del CDN
  m = /(https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*)/.exec(html);
  if (m) return { url: m[1], headers: hdrs };

  // 3. .mp4 protocolo-relativo
  m = /(\/\/[^"'\s<>]+\.mp4[^"'\s<>]*)/.exec(html);
  if (m) return { url: 'https:' + m[1], headers: hdrs };

  return null;
}

/**
 * hqq.tv / Netu — formato 2024.
 *
 * El embed `hqq.tv/player/embed_player.php?vid=XXX` suele almacenar la URL HLS
 * en uno de estos formatos:
 *   • `atob('BASE64...')` → decodificar → JSON con m3u8
 *   • `eval(function(p,a,c,k,e,d){…})` → Dean Edwards packer → m3u8 en texto claro
 *   • variables base64 `var x = 'AAAAAA...'` → decodificar → m3u8
 *   • JW Player setup `{file:"...m3u8"}` → m3u8 en texto claro
 *
 * El Referer/Origin se extrae del propio dominio CDN del stream (no del host del
 * embed), que es lo que requieren los segmentos HLS del CDN de hqq.
 */
export async function resolveNetu(
  url: string,
  referer: string,
): Promise<ResolvedEmbed | null> {
  const html = await fetchEmbed(url, referer, { timeout: 12000, retries: 1 });
  if (!html) return null;

  const host = _hostOf(url) ?? 'hqq.tv';
  const siteHdrs: Record<string, string> = {
    Referer: `https://${host}/`,
    Origin: `https://${host}`,
  };

  // 1. atob() → decode → find m3u8 (formato más común en hqq 2024)
  for (const m of html.matchAll(/atob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/g)) {
    try {
      const decoded = b64decode(m[1]);
      const src = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(decoded.replace(/\\\//g, '/'));
      if (src) return { url: src[1], headers: _cdnReferer(src[1], siteHdrs) };
    } catch { /* ignorar */ }
  }

  // 2. eval(p,a,c,k) + m3u8 en texto claro
  const haystack = `${html}\n${_unpackAll(html)}`;
  const direct = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(haystack.replace(/\\\//g, '/'));
  if (direct) return { url: direct[1], headers: _cdnReferer(direct[1], siteHdrs) };

  // 3. Variables base64 largas (var x = 'AAAA...')
  for (const m of html.matchAll(/=\s*['"]([A-Za-z0-9+/=]{80,})['"]/g)) {
    try {
      const decoded = b64decode(m[1]);
      const src = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(decoded.replace(/\\\//g, '/'));
      if (src) return { url: src[1], headers: _cdnReferer(src[1], siteHdrs) };
    } catch { /* ignorar */ }
  }

  // 4. JW Player file/source con m3u8 o mp4
  const fileM = /(?:file|source|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/.exec(html);
  if (fileM) return { url: fileM[1].replace(/\\\//g, '/'), headers: siteHdrs };

  return null;
}

/** Usa el dominio del propio CDN del stream como Referer/Origin (lo que exige hqq). */
function _cdnReferer(
  streamUrl: string,
  fallback: Record<string, string>,
): Record<string, string> {
  const h = _hostOf(streamUrl);
  if (!h) return fallback;
  return { Referer: `https://${h}/`, Origin: `https://${h}` };
}

/**
 * Resolver genérico: descarga el embed, desempaqueta cualquier `eval(p,a,c,k,e,d)`
 * y busca el stream (m3u8 firmado, `file:`/`source:`/`src:` de jwplayer, o mp4).
 * Cubre luluvdo y buena parte de la familia streamwish/filemoon sin código
 * específico por host.
 */
export async function resolveGeneric(
  url: string,
  referer: string,
): Promise<ResolvedEmbed | null> {
  const html = await fetchEmbed(url, referer);
  if (!html) return null;

  const host = _hostOf(url);
  const headers = host ? { Referer: `https://${host}/` } : undefined;
  const haystack = `${html}\n${_unpackAll(html)}`;
  const flat = haystack.replace(/\\\//g, '/');

  // m3u8 (preferido: streams adaptativos firmados)
  const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(flat);
  if (m3u8) return { url: m3u8[1], headers };

  // atob() → decode → m3u8 (común en embeds modernos con ofuscación ligera)
  for (const m of html.matchAll(/atob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/g)) {
    try {
      const decoded = b64decode(m[1]);
      const src = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(decoded.replace(/\\\//g, '/'));
      if (src) return { url: src[1], headers };
    } catch { /* ignorar */ }
  }

  // jwplayer: file/source/src
  const file = /(?:file|source|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/.exec(flat);
  if (file) return { url: file[1], headers };

  // mp4 suelto (descartando assets)
  const mp4s = flat.match(/https?:[^"'\s\\]+\.mp4[^"'\s\\]*/g) ?? [];
  const real = mp4s.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (real) return { url: real, headers };

  return null;
}

// ─── Desempaquetador de eval(p,a,c,k,e,d) (Dean Edwards) ──────────────────────

/** Desempaqueta TODOS los bloques `eval(function(p,a,c,k,e,d){…})` del HTML. */
function _unpackAll(html: string): string {
  let out = '';
  const re = /eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]*?\.split\('\|'\)[^)]*\)\)/g;
  for (const m of html.matchAll(re)) {
    const u = _unpack(m[0]);
    if (u) out += `\n${u}`;
  }
  return out;
}

/** Desempaqueta un único bloque empaquetado. Retorna '' si no matchea. */
function _unpack(src: string): string {
  const m = /\}\s*\(\s*'(.*?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'(.*?)'\.split\('\|'\)/s.exec(
    src,
  );
  if (!m) return '';
  let payload = m[1];
  const radix = parseInt(m[2], 10);
  const count = parseInt(m[3], 10);
  const words = m[4].split('|');
  payload = payload.split("\\'").join("'");

  const enc = (n: number): string =>
    (n < radix ? '' : enc(Math.floor(n / radix))) +
    ((n = n % radix) > 35 ? String.fromCharCode(n + 29) : n.toString(36));

  const dict: Record<string, string> = {};
  for (let i = count - 1; i >= 0; i--) dict[enc(i)] = words[i] || enc(i);

  return payload.replace(/\b\w+\b/g, (w) => dict[w] ?? w);
}

/** Extrae el host de una URL sin usar la API URL (no disponible en QuickJS). */
function _hostOf(url: string): string | null {
  const m = /^https?:\/\/([^/]+)/.exec(url);
  return m ? m[1] : null;
}

/** Fetch para páginas embed externas. Acepta timeout/retries para hosts lentos. */
export async function fetchEmbed(
  url: string,
  referer: string,
  opts: { timeout?: number; retries?: number } = {},
): Promise<string | null> {
  try {
    const res = await request(url, {
      headers: { Referer: referer },
      timeout: opts.timeout ?? 8000,
      retries: opts.retries ?? 0,
      acceptStatus: true, // muchos embeds traen el contenido útil en 403/404
    });
    return res.text();
  } catch (e) {
    console.log(`[fetchEmbed] FAIL ${url.slice(0, 45)} :: ${(e as Error)?.message ?? e}`);
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

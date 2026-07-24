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
    else if (s.includes('pixeldrain')) result = resolvePixeldrain(embedUrl);
    else if (
      s.includes('dood') || s.includes('dsvplay') || s.includes('playmogo') ||
      s.includes('d000d') || s.includes('ds2play') || s.includes('ds2video') ||
      s.includes('vidply') || s.includes('do0od') || s.includes('all3do')
    )
      result = await resolveDoodstream(embedUrl, referer);
    else if (s.includes('hqq') || s.includes('netu')) result = await resolveNetu(embedUrl, referer);
    else if (s.includes('ok.ru') || s.includes('okru') || s.includes('odnoklassniki'))
      result = await resolveOkru(embedUrl);
    else if (
      s.includes('streamwish') || s.includes('wishfast') || s.includes('vidhide') ||
      s.includes('filelions') || s.includes('vhide') || s.includes('vtube') ||
      s.includes('luluvdo') || s.includes('vidmoly') || s.includes('filemoon') ||
      s.includes('moonplayer') || s.includes('swdyu') || s.includes('bysekoze') ||
      s.includes('bestx') || s.includes('embedrise') || s.includes('ridoo') ||
      s.includes('uqload') || s.includes('flaxtv')
    )
      result = await resolveStreamwish(embedUrl, referer);
    // Genérico como último recurso: desempaqueta eval y busca m3u8/mp4.
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
  // Timeout corto y sin reintento: si Voe está bloqueado por el ISP (sus
  // dominios espejo rotan y algunos ISP los filtran), hay que fallar rápido
  // para no demorar la apertura del episodio esperando a Voe.
  const voeOpts = { timeout: 5000, retries: 0 };
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
  const html = await fetchEmbed(url, referer, { timeout: 5000, retries: 0 });
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
 * pixeldrain.com — descarga directa, sin ofuscación.
 *
 * Acepta cualquier forma de URL pixeldrain:
 *   • pixeldrain.com/u/{id}        (página de visualización)
 *   • pixeldrain.com/api/file/{id} (descarga directa, ya resuelta)
 *   • pixeldrain.com/d/{id}        (descarga)
 * y devuelve el endpoint de archivo directo `/api/file/{id}`, que media_kit
 * reproduce nativo. Es síncrono: solo reescribe la URL, no hace fetch.
 */
export function resolvePixeldrain(url: string): ResolvedEmbed | null {
  const m = /pixeldrain\.com\/(?:u|d|api\/file)\/([A-Za-z0-9]+)/.exec(url);
  if (!m) return null;
  return {
    url: `https://pixeldrain.com/api/file/${m[1]}`,
    headers: { Referer: 'https://pixeldrain.com/' },
  };
}

/**
 * doodstream y sus espejos (dsvplay, playmogo, d000d, ds2play, vidply…).
 *
 * Algoritmo (verificado 2026): el embed (que redirige al espejo del momento)
 * contiene una ruta `/pass_md5/<id>/<token>`. Se descarga esa ruta con el
 * Referer del embed → devuelve la URL base del CDN en texto plano. La URL final
 * de reproducción es: base + 10 caracteres aleatorios + `?token=<token>&expiry=<ms>`.
 * media_kit la reproduce nativo (es un mp4 directo).
 *
 * No necesita conocer el dominio espejo: se piden tanto el embed como el
 * pass_md5 al host original y el cliente sigue la redirección automáticamente.
 */
export async function resolveDoodstream(
  url: string,
  referer: string,
): Promise<ResolvedEmbed | null> {
  const host = _hostOf(url);
  if (!host) return null;
  const html = await fetchEmbed(url, referer, { timeout: 5000, retries: 0 });
  if (!html) return null;

  const md5 = /\/pass_md5\/[A-Za-z0-9\-]+\/[A-Za-z0-9]+/.exec(html);
  if (!md5) return null;
  const md5path = md5[0];
  const token = md5path.slice(md5path.lastIndexOf('/') + 1);

  // La respuesta de pass_md5 es la URL base del CDN (texto plano).
  const base = await fetchEmbed(
    `https://${host}${md5path}`,
    `https://${host}/`,
    { timeout: 5000, retries: 0 },
  );
  if (!base || !/^https?:\/\//.test(base.trim())) return null;

  const rand = _randomStr(10);
  const finalUrl = `${base.trim()}${rand}?token=${token}&expiry=${Date.now()}`;
  return { url: finalUrl, headers: { Referer: `https://${host}/` } };
}

/** Cadena alfanumérica aleatoria (para el sufijo que exige el CDN de dood). */
function _randomStr(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return s;
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
  const host = _hostOf(url) ?? 'hqq.tv';
  const siteHdrs: Record<string, string> = {
    Referer: `https://${host}/`,
    Origin: `https://${host}`,
  };

  // hqq/netu responde 403 sin el header Origin del propio host — enviarlo es lo
  // que desbloquea la página del reproductor.
  const html = await fetchEmbed(url, referer, {
    timeout: 5000,
    retries: 0,
    headers: { Origin: `https://${host}` },
  });
  if (!html) return null;

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
 * ok.ru (Odnoklassniki) — embed `ok.ru/videoembed/{id}`.
 *
 * La página trae un blob JSON incrustado en el atributo `data-options` con
 * TRES capas de escapado superpuestas (confirmado en vivo, byte a byte):
 *   1. El HTML-atributo escapa las comillas como `&quot;`.
 *   2. Dentro va un objeto JSON cuyo campo "metadata" es a su vez un STRING ya
 *      JSON.stringify-eado una vez (por eso sus comillas internas llevan un
 *      backslash extra: `\&quot;`).
 *   3. Ese "metadata" stringificado escapó además cada "&" como `&` antes
 *      de volver a stringificarse, así que en el texto crudo aparece como
 *      `\\u0026` (dos backslashes reales + "u0026").
 * No hace falta reconstruir todo el JSON: `hlsManifestUrl` no contiene "&"
 * reales en esta etapa (todos están escapados), así que se puede capturar el
 * valor completo cortando en el primer `&quot;` (delimitador) y luego
 * colapsar cada `\\u0026` directo a "&" en un solo paso.
 */
export async function resolveOkru(url: string): Promise<ResolvedEmbed | null> {
  const html = await fetchEmbed(url, 'https://ok.ru/');
  if (!html) return null;
  const marker = 'hlsManifestUrl\\&quot;:\\&quot;';
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const from = start + marker.length;
  const end = html.indexOf('\\&quot;', from);
  if (end === -1) return null;
  const url2 = html.slice(from, end).split('\\\\u0026').join('&');
  if (!/^https?:\/\//.test(url2)) return null;
  return { url: url2 };
}

/**
 * Familia streamwish / wishfast / vidhide / filelions / luluvdo / vidmoly.
 *
 * Todos comparten el mismo motor (streamwish open-source). Estrategia:
 *   1. API JSON: `https://{host}/api/file/{id}?json=1` → devuelve sources[].file
 *      (el método más fiable y rápido — no depende de ofuscación).
 *   2. Fallback scraping del embed (para hosts que bloquean la API).
 *
 * Filemoon/moonplayer también suelen tener esta API; cuando no, el genérico
 * intenta desempaquetar el eval.
 */
export async function resolveStreamwish(
  url: string,
  referer: string,
): Promise<ResolvedEmbed | null> {
  const host = _hostOf(url);
  if (!host) return null;
  const hdrs = { Referer: `https://${host}/` };

  // Extraer ID del path: /e/{id}, /f/{id}, /d/{id}
  const idM = /\/(?:e|f|d)\/([A-Za-z0-9]+)/.exec(url);
  if (idM) {
    const id = idM[1];
    // API JSON — retorna {"result":[{"file":"...m3u8"},...]}
    const apiJson = await fetchEmbed(
      `https://${host}/api/file/${id}?json=1`,
      `https://${host}/`,
      { timeout: 7000 },
    );
    if (apiJson) {
      const fileM = /"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(apiJson);
      if (fileM) return { url: fileM[1].replace(/\\\//g, '/'), headers: hdrs };
      // Algunos devuelven mp4 en vez de m3u8
      const mp4M = /"file"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(apiJson);
      if (mp4M) return { url: mp4M[1].replace(/\\\//g, '/'), headers: hdrs };
    }
  }

  // Fallback: scraping + desempaquetado del embed
  return resolveGeneric(url, referer);
}

/**
 * Resolver genérico: descarga el embed, desempaqueta cualquier `eval(p,a,c,k,e,d)`
 * y busca el stream (m3u8 firmado, `file:`/`source:`/`src:` de jwplayer, o mp4).
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
  opts: {
    timeout?: number;
    retries?: number;
    headers?: Record<string, string>;
  } = {},
): Promise<string | null> {
  try {
    const res = await request(url, {
      headers: { Referer: referer, ...(opts.headers ?? {}) },
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

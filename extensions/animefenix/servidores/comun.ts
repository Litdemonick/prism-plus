// ─── Piezas compartidas por los servidores de animefenix ───────────────────────
//
// Copiadas del SDK y no importadas de él, a propósito: ver el porqué en
// `index.ts` de esta misma carpeta. Compartidas SOLO entre los servidores de
// animefenix — ninguna otra extensión las toca.

declare function sendMessage(channel: string, data: string): Promise<string>;

/** Lo que devuelve un resolver cuando pudo. */
export interface ServidorResuelto {
  url: string;
  headers?: Record<string, string>;
}

// ─── Pedidos ─────────────────────────────────────────────────────────────────

/** GET a una página de embed. Devuelve null si no se pudo. */
export async function pedir(
  url: string,
  referer: string,
  headers?: Record<string, string>,
): Promise<string | null> {
  try {
    return await sendMessage(
      'request',
      JSON.stringify([url, { method: 'get', headers: { Referer: referer, ...headers } }]),
    );
  } catch (e) {
    console.log(`[af] no se pudo pedir ${url.slice(0, 45)} :: ${(e as Error)?.message ?? e}`);
    return null;
  }
}

/**
 * Cabeceras "de navegador".
 *
 * El backend `re.ironhentai.com` —el de PlusTube y PremiunVIP— devuelve **406**
 * sin ellas. Es lo único que hace falta: no pide cookies ni token.
 */
export const ACEPTA_NAVEGADOR: Record<string, string> = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9',
};

/**
 * Desofusca una página de `re.ironhentai.com` y devuelve el JS ya en claro.
 *
 * Las dos —PlusTube (`vt.php`) y PremiunVIP (`face.php`)— esconden la dirección
 * con el mismo truco: `eval(atob(atob(X).split('').map(shift -1).join('')))`.
 * O sea base64, correr cada carácter uno para atrás, y base64 otra vez.
 *
 * Lo comparten esos dos y nadie más. Lo que cambia es qué hay ADENTRO, y de eso
 * se ocupa cada carpeta: PlusTube deja un `loadSource()` con un m3u8 y
 * PremiunVIP un `videoId` que apunta de vuelta a su propio backend.
 */
export function desofuscarIronhentai(html: string): string | null {
  const m = /eval\(atob\(atob\('([A-Za-z0-9+/=]+)'\)\.split/.exec(html);
  if (!m) return null;
  const unaVez = b64aTexto(m[1]);
  let corrido = '';
  for (let i = 0; i < unaVez.length; i++) {
    corrido += String.fromCharCode(unaVez.charCodeAt(i) - 1);
  }
  return b64aTexto(corrido);
}

// ─── Ayudantes ───────────────────────────────────────────────────────────────

/** El host de una dirección, sin usar la API URL (no existe en QuickJS). */
export function hostDe(url: string): string | null {
  const m = /^https?:\/\/([^/]+)/.exec(url);
  return m ? m[1] : null;
}

/** base64 a texto, sin depender de atob() del entorno. */
export function b64aTexto(s: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const limpio = s.replace(/[^A-Za-z0-9+/]/g, '');
  let out = '';
  let i = 0;
  while (i < limpio.length) {
    const b1 = chars.indexOf(limpio[i++]);
    const b2 = chars.indexOf(limpio[i++]);
    const b3 = i < limpio.length ? chars.indexOf(limpio[i++]) : -1;
    const b4 = i < limpio.length ? chars.indexOf(limpio[i++]) : -1;
    out += String.fromCharCode((b1 << 2) | (b2 >> 4));
    if (b3 !== -1) out += String.fromCharCode(((b2 & 15) << 4) | (b3 >> 2));
    if (b4 !== -1) out += String.fromCharCode(((b3 & 3) << 6) | b4);
  }
  return out;
}

// ─── Desempaquetador eval(p,a,c,k,e,d) (Dean Edwards) ────────────────────────
//
// Lo necesitan HideNise y MixEx: la dirección no está en el HTML tal cual,
// está partida en el diccionario del empaquetado y se arma al desempaquetar.

/** Desempaqueta un bloque. Devuelve '' si no es de este formato. */
function desempaquetarUno(src: string): string {
  const m = /\}\s*\(\s*'(.*?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'(.*?)'\.split\('\|'\)/s.exec(src);
  if (!m) return '';
  let payload = m[1];
  const radix = parseInt(m[2], 10);
  const count = parseInt(m[3], 10);
  const palabras = m[4].split('|');
  payload = payload.split("\\'").join("'");

  const enc = (n: number): string =>
    (n < radix ? '' : enc(Math.floor(n / radix))) +
    ((n = n % radix) > 35 ? String.fromCharCode(n + 29) : n.toString(36));

  const dic: Record<string, string> = {};
  for (let i = count - 1; i >= 0; i--) dic[enc(i)] = palabras[i] || enc(i);

  return payload.replace(/\b\w+\b/g, (w) => dic[w] ?? w);
}

/** Desempaqueta TODOS los bloques del HTML y los devuelve pegados. */
export function desempaquetarTodo(html: string): string {
  let out = '';
  const re = /eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]*?\.split\('\|'\)[^)]*\)\)/g;
  for (const m of html.matchAll(re)) {
    const u = desempaquetarUno(m[0]);
    if (u) out += `\n${u}`;
  }
  return out;
}

/**
 * Busca la dirección del vídeo dentro de una página de embed ya bajada.
 *
 * Desempaqueta lo que haya y prueba, en orden, las cuatro formas en que estos
 * sitios la guardan. Lo comparten HideNise y el camino de respaldo de
 * `index.ts`; cada uno tiene su propia carpeta, así que arreglar uno no toca al
 * otro.
 */
export function buscarDireccion(
  html: string,
  headers?: Record<string, string>,
): ServidorResuelto | null {
  const plano = `${html}\n${desempaquetarTodo(html)}`.replace(/\\\//g, '/');

  // m3u8 primero: es lo que da calidades y permite cambiar de minuto.
  const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(plano);
  if (m3u8) return { url: m3u8[1], headers };

  // atob('...') → adentro puede venir el m3u8.
  for (const m of html.matchAll(/atob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/g)) {
    try {
      const claro = b64aTexto(m[1]).replace(/\\\//g, '/');
      const src = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(claro);
      if (src) return { url: src[1], headers };
    } catch {
      /* si no se puede decodificar, se sigue con lo siguiente */
    }
  }

  // jwplayer: file / source / src
  const file = /(?:file|source|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/.exec(plano);
  if (file) return { url: file[1], headers };

  // mp4 suelto, descartando lo que sea hoja de estilo o script
  const mp4s = plano.match(/https?:[^"'\s\\]+\.mp4[^"'\s\\]*/g) ?? [];
  const real = mp4s.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (real) return { url: real, headers };

  return null;
}

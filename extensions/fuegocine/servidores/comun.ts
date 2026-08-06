// ─── Piezas compartidas por los servidores de FuegoCine ──────────────────────
//
// Copiadas del SDK y no importadas de él, a propósito: ver el porqué en
// `index.ts` de esta misma carpeta. Compartidas SOLO entre los servidores de
// FuegoCine — ninguna otra extensión las toca.

declare function sendMessage(channel: string, data: string): Promise<string>;

/** Lo que devuelve un resolver cuando pudo. */
export interface ServidorResuelto {
  url: string;
  headers?: Record<string, string>;
}

// ─── Pedidos ─────────────────────────────────────────────────────────────────

/**
 * El User-Agent con el que se piden TODAS las páginas de embed de acá.
 *
 * Está fijo y se exporta porque hace falta devolverlo junto con la dirección
 * resuelta, y eso no es un detalle: **estos CDN atan el vale al User-Agent de
 * quien lo pidió.**
 *
 * Medido el 2026-08-06 con goodstream, resolviendo y pidiendo el m3u8 al
 * instante:
 *
 *   el MISMO User-Agent   200 · la lista llega bien
 *   otro navegador        403
 *   como mpv (libmpv)     403
 *   ninguno               403
 *
 * O sea que el resolver conseguía una dirección perfecta y el reproductor la
 * pedía con SU propio User-Agent, así que el CDN se la rechazaba. En la app se
 * veía como "no se puede reproducir en el reproductor nativo" con un servidor
 * que estaba impecable.
 *
 * Por eso cada resolver de un CDN firmado devuelve este mismo valor en sus
 * cabeceras: la app las pasa tal cual al reproductor y ahí los dos coinciden.
 */
export const UA_NAVEGADOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** GET a una página de embed. Devuelve null si no se pudo. */
export async function pedir(
  url: string,
  referer: string,
  headers?: Record<string, string>,
): Promise<string | null> {
  try {
    return await sendMessage(
      'request',
      JSON.stringify([
        url,
        {
          method: 'get',
          // El User-Agent va PRIMERO para que quien llame pueda pisarlo.
          headers: { 'User-Agent': UA_NAVEGADOR, Referer: referer, ...headers },
        },
      ]),
    );
  } catch (e) {
    console.log(`[fc] no se pudo pedir ${url.slice(0, 45)} :: ${(e as Error)?.message ?? e}`);
    return null;
  }
}

/** POST con cuerpo JSON. Lo usa firestream para canjear su vale. */
export async function postJson(
  url: string,
  cuerpo: unknown,
  referer: string,
): Promise<string | null> {
  try {
    return await sendMessage(
      'request',
      JSON.stringify([
        url,
        {
          method: 'post',
          headers: { 'Content-Type': 'application/json', Referer: referer },
          data: JSON.stringify(cuerpo),
        },
      ]),
    );
  } catch (e) {
    console.log(`[fc] POST falló ${url.slice(0, 45)} :: ${(e as Error)?.message ?? e}`);
    return null;
  }
}

// ─── Ayudantes ───────────────────────────────────────────────────────────────

/** El host de una dirección, sin usar la API URL (no existe en QuickJS). */
export function hostDe(url: string): string | null {
  const m = /^https?:\/\/([^/]+)/.exec(url);
  return m ? m[1] : null;
}

/** Último tramo del path, sin extensión ni el prefijo `embed-`. */
export function codigoDe(url: string): string {
  const sinQuery = url.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const ultimo = sinQuery.slice(sinQuery.lastIndexOf('/') + 1);
  return ultimo.replace(/^embed-/, '').replace(/\.html?$/, '');
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
// Lo necesitan dropload y vimeos: la dirección no está en el HTML tal cual,
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

/**
 * Busca la dirección del vídeo dentro de una página de embed ya bajada.
 *
 * Desempaqueta lo que haya y prueba, en orden, las cuatro formas en que estos
 * sitios la guardan. Es lo único que comparten goodstream, dropload y vimeos:
 * cada uno tiene su propia carpeta y su propio resolver, así que arreglar uno
 * no toca a los otros dos.
 */
/**
 * Las cabeceras con las que hay que PEDIR el vídeo.
 *
 * Siempre lleva el mismo User-Agent con el que se resolvió: estos CDN atan el
 * vale a quien lo pidió, así que si el reproductor pide con otro, 403 (ver
 * `UA_NAVEGADOR`).
 */
function cabecerasDeStream(extra?: Record<string, string>): Record<string, string> {
  return { 'User-Agent': UA_NAVEGADOR, ...(extra ?? {}) };
}

export function buscarDireccion(
  html: string,
  headers?: Record<string, string>,
): ServidorResuelto | null {
  headers = cabecerasDeStream(headers);
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

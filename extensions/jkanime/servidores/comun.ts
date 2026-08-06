// ─── Piezas compartidas por los servidores de jkanime ────────────────────────
//
// Copiadas del SDK y no importadas de él, a propósito: ver el porqué en
// `index.ts` de esta misma carpeta. Compartidas SOLO entre los servidores de
// jkanime — ninguna otra extensión las toca.
//
// Buena parte de estos resolvers ya eran propios de la extensión (voe,
// streamwish/vidhide, mp4upload y los dos reproductores internos, con su propio
// base64 y su propio desempaquetador): esos se MUDARON de archivo, tal cual,
// sin retocar una línea. Lo que sí se copió del SDK fue lo que todavía salía de
// ahí: streamtape, mixdrop, filemoon (byse) y el genérico.

declare function sendMessage(channel: string, data: string): Promise<string>;

/** Lo que devuelve un resolver cuando pudo. */
export interface ServidorResuelto {
  url: string;
  headers?: Record<string, string>;
}

/**
 * El User-Agent con el que la app REPRODUCE.
 *
 * ── Por qué hace falta, y por qué solo se notaba en el teléfono ─────────────
 *
 * La app no usa el mismo User-Agent para resolver que para reproducir. Para
 * resolver usa el del ajuste, que en Android es uno de móvil; para reproducir
 * usa siempre este, de escritorio. Y hay hosts que **atan la dirección al
 * User-Agent que la pidió**.
 *
 * Medido en VOE el 2026-08-06, mismo episodio, misma red:
 *
 *     resuelto con escritorio → pedido con este UA →  206 video/mp4
 *     resuelto con móvil      → pedido con este UA →  403
 *     resuelto con móvil      → pedido con el de móvil → 206 video/mp4
 *
 * En la computadora nunca se vio porque los dos son de escritorio y el host los
 * da por equivalentes. En Android la dirección se firmaba para un móvil y
 * después se pedía como escritorio: 403 en VOE, 404 en Filemoon, y el servidor
 * caía al navegador pareciendo roto.
 *
 * Un resolver que use esto tiene que hacer las DOS cosas: pedir con este UA y
 * devolverlo en `headers`. Así las dos puntas coinciden y Android queda igual
 * que la computadora. **No hace falta preguntar en qué plataforma se está**:
 * justamente lo que se busca es que no dependa de eso.
 *
 * Tiene que seguir siendo el mismo que `_browserUA` en video_controller.dart.
 */
export const UA_DEL_REPRODUCTOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

/** Para mandarlo en un pedido y devolverlo en la respuesta, sin repetirlo. */
export const CABECERAS_DEL_REPRODUCTOR: Record<string, string> = {
  'User-Agent': UA_DEL_REPRODUCTOR,
};

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
    console.log(`[jk] no se pudo pedir ${url.slice(0, 45)} :: ${(e as Error)?.message ?? e}`);
    return null;
  }
}

/**
 * El reproductor PROPIO de jkanime, que es de donde salen Desu y Magi.
 *
 * Vive en `comun.ts` y no en una carpeta porque lo comparten los dos de verdad:
 * el mismo iframe, el mismo archivo. Lo que cambia entre ellos está en su
 * carpeta.
 *
 * El iframe apunta a un dominio del propio sitio (jkdesa.com/DPlayer), no a un
 * host de terceros. Adentro, la dirección del m3u8 va ofuscada en un
 * `atob('base64…')` — y hay un bloque VIEJO comentado con la dirección en texto
 * plano que NO hay que usar. Por eso se prueba primero el atob.
 */
export async function resolverReproductorPropio(
  iframeSrc: string,
  referer: string,
): Promise<ServidorResuelto | null> {
  const hdrs = { Referer: referer };
  const html = await pedir(iframeSrc, referer);
  if (!html) return null;

  const enBase64 = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
  if (enBase64) {
    try {
      const claro = b64aTexto(enBase64[1]);
      if (claro.indexOf('.m3u8') !== -1 || claro.indexOf('.mp4') !== -1) {
        return { url: claro, headers: hdrs };
      }
    } catch {
      /* si no se puede decodificar, se sigue con lo de abajo */
    }
  }

  // Respaldo: la dirección en texto plano, por si el sitio deja de ofuscarla.
  // Confirmado en vivo: Magi NO usa atob() como Desu — trae la dirección
  // directo en un <source src='…'> normal, sin cifrar. Sin este patrón, Magi
  // —que apunta al MISMO archivo que Desu— nunca se resolvía.
  const patrones = [
    /<source\s+src=['"]([^'"]+\.m3u8[^'"]*)['"]/i,
    /url\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i,
    /loadSource\(\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i,
    /<source\s+src=['"]([^'"]+\.mp4[^'"]*)['"]/i,
    /url\s*:\s*['"]([^'"]+\.mp4[^'"]*)['"]/i,
  ];
  for (const re of patrones) {
    const m = re.exec(html);
    if (m) return { url: m[1], headers: hdrs };
  }
  return null;
}

/** Último tramo del path, sin extensión ni el prefijo `embed-`. */
export function codigoDe(url: string): string {
  const sinQuery = url.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const ultimo = sinQuery.slice(sinQuery.lastIndexOf('/') + 1);
  return ultimo.replace(/^embed-/, '').replace(/\.html?$/, '');
}

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
// Solo para el genérico de esta carpeta. **Los resolvers propios de la
// extensión siguen usando su `_unpackEval` de `index.ts`, que no se tocó.**

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

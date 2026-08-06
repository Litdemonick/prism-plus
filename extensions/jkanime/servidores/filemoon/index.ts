// ─── Filemoon (bysekoze.com) ⚡ nativo ────────────────────────────────────────
//
// Medido el 2026-08-05: **58 botones**, resuelve 2 de 2 con 200
// `application/vnd.apple.mpegurl`.
//
//   embed   https://bysekoze.com/e/juquict5a8jx/
//   sale    https://edge1-madrid-sprintcdn.r66nv9ed.com/hls2/06/…m3u8
//   tarda   ~325 ms
//
// El botón dice "Filemoon" pero el motor es Byse — el mismo que en latanime.
// Hasta ahora lo resolvía el SDK compartido; es una de las copias que se
// trajeron para que esta extensión no dependa de él.
//
// ── OJO: acá hay un falso negativo que casi cuesta 58 botones ───────────────
//
// Este es el único resolver del repo que usa `CryptoJS`, que **no se importa**:
// lo inyecta el runtime de PrismHub cuando el bundle menciona ese identificador
// (ver `sdk/crypto.ts`). En Node no existe, así que el descifrado muere con
// "CryptoJS is not defined" y el resolver devuelve null **como si el servidor
// estuviera roto**. En latanime esa trampa casi hace que se marcaran 96 botones
// como de navegador sin motivo.
//
// Para medir esto fuera de la app hay que dárselo a mano:
//
//     import CryptoJS from 'crypto-js';
//     globalThis.CryptoJS = CryptoJS;
//
// ── Ojo también con el host ─────────────────────────────────────────────────
//
// Este servicio no se porta igual en todos sus dominios: `bysekoze.com`
// resuelve (acá y en latanime), pero `byse.sx` y `bysesukior.com` —el de
// shademanga— contestan sin datos de reproducción. Si un día deja de andar,
// mirar primero QUÉ dominio está sirviendo el sitio.
//
// ── Cómo está escondida la dirección ────────────────────────────────────────
//
// La página del embed es un cascarón que se arma solo. Los datos salen de
// `/api/videos/{código}`, que devuelve el vídeo cifrado con AES-256-GCM junto
// con el IV, el texto cifrado y **treinta** trozos de clave.
//
// Los treinta son puro ruido: se usan solo DOS, y cuáles salen de una cuenta
// trivial sobre el número de versión —`[v, 31 - v]`— sacada del propio código
// del sitio. Se decodifican esos dos, se pegan, y eso es la clave de 32 bytes.
// Adentro del texto cifrado está el `master.m3u8` en claro.
//
// Se descifra como AES-CTR y no como GCM porque el runtime solo trae CryptoJS:
// son el mismo algoritmo, GCM es CTR con el contador arrancando en `IV‖2` más
// una etiqueta de autenticidad al final. Esa etiqueta acá no aporta nada
// —sirve para detectar que alguien manipuló el mensaje, no para leerlo— así que
// se descarta y se descifra el resto.
//
// OJO: el token del CDN dura unas 3 horas (`expires_at` en la respuesta). Hay
// que pedir y descifrar en el momento de reproducir, no guardar la dirección.

// ── El token del CDN queda atado al User-Agent que pidió la API ─────────────
//
// Mismo caso que VOE.
//
//   WINDOWS y LINUX  andaba — los dos User-Agent son de escritorio.
//   ANDROID          404 — la MISMA dirección que en la computadora entrega la
//                    lista, en el teléfono no, porque el token se emitió para
//                    un móvil y después se pedía como escritorio.
//
// Medido el 2026-08-06. Ver UA_DEL_REPRODUCTOR en comun.ts.

import {
  pedir,
  hostDe,
  codigoDe,
  UA_DEL_REPRODUCTOR,
  CABECERAS_DEL_REPRODUCTOR,
  type ServidorResuelto,
} from '../comun';

/** base64url (con `-` y `_`, y sin relleno) → WordArray de CryptoJS. */
function b64urlAWord(s: string): CryptoJSWordArray {
  const normal = s.replace(/-/g, '+').replace(/_/g, '/');
  const relleno = normal.length % 4 === 0 ? '' : '='.repeat(4 - (normal.length % 4));
  return CryptoJS.enc.Base64.parse(normal + relleno) as unknown as CryptoJSWordArray;
}

interface CryptoJSWordArray {
  words: number[];
  sigBytes: number;
  concat(otro: CryptoJSWordArray): CryptoJSWordArray;
}

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const host = hostDe(url) || 'bysekoze.com';
  const codigo = codigoDe(url);
  if (!codigo) return null;

  const crudo = await pedir(
    `https://${host}/api/videos/${codigo}`,
    referer || `https://${host}/`,
    CABECERAS_DEL_REPRODUCTOR,
  );
  if (!crudo) return null;

  let meta: {
    playback?: { iv?: string; payload?: string; key_parts?: string[]; version?: number };
  };
  try {
    meta = JSON.parse(crudo);
  } catch {
    console.log('[jk] filemoon: la API no devolvió JSON');
    return null;
  }
  const pb = meta.playback;
  if (!pb || !pb.iv || !pb.payload || !Array.isArray(pb.key_parts)) {
    console.log('[jk] filemoon: la API no trajo datos de reproducción');
    return null;
  }

  const v = Number(pb.version);
  const partes = pb.key_parts;
  // El mismo cálculo que hace el sitio. Si la versión se sale de rango se usan
  // todos los trozos, que es también lo que hace su código.
  const indices = v >= 1 && v <= 20 && 31 - v <= partes.length ? [v, 31 - v] : null;
  const elegidas = indices
    ? indices.map((i) => partes[i - 1]).filter((p) => typeof p === 'string' && p.length > 0)
    : partes;
  if (!elegidas.length) return null;

  try {
    // Cada trozo se decodifica POR SEPARADO y recién después se pegan los
    // bytes. Juntar los base64 y decodificar el resultado da otra cosa: los
    // trozos no miden lo mismo (32 y 22 caracteres), así que el segundo queda
    // desalineado y sale una clave que descifra basura.
    let clave = b64urlAWord(elegidas[0]);
    for (let i = 1; i < elegidas.length; i++) clave = clave.concat(b64urlAWord(elegidas[i]));

    // Contador inicial de GCM: IV (12 bytes) seguido del entero 2.
    const iv = b64urlAWord(pb.iv);
    const contador = CryptoJS.lib.WordArray.create(iv.words.concat([2]), 16);
    const cifrado = b64urlAWord(pb.payload);
    // Fuera los 16 bytes finales: son la etiqueta, no parte del mensaje.
    const sinEtiqueta = CryptoJS.lib.WordArray.create(
      cifrado.words.slice(),
      cifrado.sigBytes - 16,
    );
    const claro = CryptoJS.AES.decrypt(
      { ciphertext: sinEtiqueta } as never,
      clave,
      { iv: contador, mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding },
    ).toString(CryptoJS.enc.Utf8);

    const m = /"url"\s*:\s*"([^"]+)"/.exec(claro);
    if (!m) {
      console.log('[jk] filemoon: se descifró pero no había ninguna url adentro');
      return null;
    }
    return {
      url: m[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/'),
      // El mismo User-Agent con el que se pidió la API: el token del CDN se
      // emitió para ése.
      headers: {
        Referer: `https://${host}/`,
        'User-Agent': UA_DEL_REPRODUCTOR,
      },
    };
  } catch (e) {
    console.log(`[jk] filemoon: no se pudo descifrar: ${(e as Error)?.message ?? e}`);
    return null;
  }
}

// ─── Byse ⚡ nativo en bysekoze.com · 🌐 en byse.sx ───────────────────────────
//
// Medido el 2026-08-04 sobre 120 títulos: **117 botones**, repartidos en dos
// hosts que NO se comportan igual:
//
//   96  bysekoze.com  ⚡ resuelve  ·  200 application/vnd.apple.mpegurl
//   21  byse.sx       🌐 su API contesta pero sin datos de reproducción
//
// Por eso en la tabla van como dos fichas distintas apuntando a este mismo
// resolver: el código es uno solo, lo que cambia es qué contesta cada host.
//
//   embed   https://bysekoze.com/e/c8k9c70sbcqo
//   sale    https://edge1-waw-sprintcdn.r66nv9ed.com/hls2/06/11748/…m3u8
//   tarda   320–420 ms
//
// ── OJO: acá hubo un falso negativo que casi cuesta 96 botones ───────────────
//
// La primera medición dio que Byse NO resolvía, y la conclusión iba a ser
// "el sitio cambió a una SPA, va al navegador". **Era mentira, y la culpa era
// del banco de pruebas.** Este resolver es el único del repo que usa `CryptoJS`,
// que NO se importa: lo inyecta el runtime de PrismHub cuando el bundle
// menciona ese identificador (ver `sdk/crypto.ts`). En Node no existe, así que
// el descifrado muere con "CryptoJS is not defined" y el resolver devuelve
// null como si el servidor estuviera roto.
//
// Para medir esto fuera de la app hay que dárselo a mano:
//
//     import CryptoJS from 'crypto-js';
//     globalThis.CryptoJS = CryptoJS;
//
// Con eso puesto, bysekoze resuelve a la primera.
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

import { pedir, hostDe, codigoDe, type ServidorResuelto } from '../comun';

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

  const crudo = await pedir(`https://${host}/api/videos/${codigo}`, referer || `https://${host}/`);
  if (!crudo) return null;

  let meta: {
    playback?: { iv?: string; payload?: string; key_parts?: string[]; version?: number };
  };
  try {
    meta = JSON.parse(crudo);
  } catch {
    console.log('[la] byse: la API no devolvió JSON');
    return null;
  }
  const pb = meta.playback;
  if (!pb || !pb.iv || !pb.payload || !Array.isArray(pb.key_parts)) {
    console.log('[la] byse: la API no trajo datos de reproducción');
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
      console.log('[la] byse: se descifró pero no había ninguna url adentro');
      return null;
    }
    return {
      url: m[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/'),
      headers: { Referer: `https://${host}/` },
    };
  } catch (e) {
    console.log(`[la] byse: no se pudo descifrar: ${(e as Error)?.message ?? e}`);
    return null;
  }
}

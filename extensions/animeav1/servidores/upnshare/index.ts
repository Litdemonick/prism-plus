// ─── UPNShare (animeav1.uns.bio) ⚡ nativo ────────────────────────────────────
//
// Medido el 2026-08-10 sobre 100 títulos: **123 botones**, el más repartido de
// los cuatro. Sale como mp4 1080p directo.
//
//   embed   https://animeav1.uns.bio/#{id de 6}
//   api     https://animeav1.uns.bio/api/v1/download?id={ese mismo id}
//   sale    https://{ip}/{vale}/{caducidad}/kdv/…/1080p.mp4/download?title=…
//
// ── Este servidor estaba dado por NO resuelto en todo el repo ────────────────
//
// Es el mismo motor que el botón **US de FuegoCine** (fuegocineplayer.upns.online,
// 241 botones), que desde el 2026-08-04 figura como "SPA de Vite, contesta hex
// cifrado, descifra con WebCrypto y la llave sale de otro lado". La llave
// apareció: está **en el propio bundle**, armada a pedazos para que no se pueda
// buscar como texto. **FuegoCine no se tocó** —cada extensión lleva su copia—,
// pero el dato queda acá por si se retoma.
//
// ── Cómo se arma la llave, y por qué se puede dejar escrita ──────────────────
//
// El bundle define dos funciones, `T()` (clave) y `A()` (IV), que construyen
// las cadenas carácter por carácter con `String.fromCharCode`. Las dos leen del
// navegador, pero **solo cosas que acá son constantes**:
//
//   T() usa  window.location.protocol[1]      → 't' de "https:"
//   A() usa  protocol.length * (protocol+"//").length  → 6 * 8 = 48
//   A() usa  window.location.hash.charCodeAt(0)        → '#'
//
// Con la página servida por https y con hash —siempre, el id viaja en el
// fragmento— las dos dan siempre lo mismo:
//
//   clave  kiemtienmua911ca   (16 bytes → AES-128)
//   IV     1234567890oiuytr   (16 bytes)
//
// El cuerpo llega en **hex**, y es AES-128-CBC con relleno PKCS7.
//
// Si algún día el sitio rota la llave, el síntoma es que el descifrado sale
// vacío o con basura: entonces hay que volver a `T()`/`A()` en el bundle
// (`/assets/index-*.js`, buscar `"AES-CBC"`) y rearmarlas.
//
// ── Que llega vídeo de verdad ────────────────────────────────────────────────
//
// Medido sobre el episodio de muestra, con vale fresco en cada intento:
//
//   206 video/mp4 · 219,2 MB · ftyp → **moov AL PRINCIPIO**
//   acepta rangos del medio (206 con content-range) → se puede cambiar de minuto
//   caudal: 0,29 MB/s al principio · 0,31 al medio · 0,73 al final
//
// El archivo pide ~0,15 MB/s (219 MB para ~24 min), así que 0,29 alcanza — con
// el doble de margen, no más. No es rápido, pero se sostiene y **está bien
// entrelazado**, que es lo que hace sufrir a FuegoCine FC.
//
// ── Las cabeceras, medidas de a una ─────────────────────────────────────────
//
// El CDN pide **User-Agent Y Referer**, las dos. Con una sola da 403:
//
//   nada · solo UA · solo Sec-Fetch-Site      →  403
//   UA + Referer https://animeav1.uns.bio/    →  206 video/mp4   ✔
//
// ── El nodo cambia en cada pedido ────────────────────────────────────────────
//
// El vale trae la IP del CDN adentro y **no es siempre la misma**: en 12
// pedidos seguidos del mismo episodio salieron dos nodos distintos
// (94.131.217.89 once veces y 203.188.166.37 una). Los 12 abrieron, así que
// esto NO es lotería como el hexload de latanime; pero durante las pruebas un
// nodo suelto (185.237.107.225) no llegó a conectar. Si alguna vez falla, la
// app cae sola al navegador y al reintentar lo más probable es que toque otro
// nodo. Por eso el vale se pide fresco cada vez y no se guarda.
//
// El `cf` que devuelve `/api/v1/video` (un master HLS en nuvistar.online) se
// probó y **no sirve**: la lista maestra baja, pero sus variantes dan 403/404
// por cualquier camino. Por eso se va por `/api/v1/download`, que es mp4 y
// además da 1080p sin tener que elegir variante.

import { UA_ESCRITORIO, pedir, type ServidorResuelto } from '../comun';

const BASE = 'https://animeav1.uns.bio';

// Rearmadas de T() y A() del bundle — ver arriba de dónde sale cada carácter.
const CLAVE = 'kiemtienmua911ca';
const IV = '1234567890oiuytr';

/** hex → texto claro. Devuelve '' si no era descifrable. */
function descifrar(hex: string): string {
  const limpio = hex.trim();
  if (!/^[0-9a-f]+$/i.test(limpio) || limpio.length % 32 !== 0) return '';
  try {
    return CryptoJS.AES.decrypt(
      { ciphertext: CryptoJS.enc.Hex.parse(limpio) } as never,
      CryptoJS.enc.Utf8.parse(CLAVE),
      { iv: CryptoJS.enc.Utf8.parse(IV), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
    ).toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.log(`[av1] upnshare: no se pudo descifrar :: ${(e as Error)?.message ?? e}`);
    return '';
  }
}

export async function resolver(url: string, _referer: string): Promise<ServidorResuelto | null> {
  // El id viaja en el fragmento: https://animeav1.uns.bio/#eowi65
  const id = /#([A-Za-z0-9_-]{3,20})/.exec(url)?.[1];
  if (!id) {
    console.log(`[av1] upnshare: la dirección no trae id en el # :: ${url.slice(0, 60)}`);
    return null;
  }

  const hex = await pedir(`${BASE}/api/v1/download?id=${id}`, `${BASE}/`);
  if (!hex) return null;

  const claro = descifrar(hex);
  if (!claro) return null;

  // El JSON viene con las barras escapadas (\/), como lo manda el sitio.
  const mp4 = /"mp4"\s*:\s*"([^"]+)"/.exec(claro)?.[1]?.replace(/\\\//g, '/');
  if (!mp4) {
    console.log('[av1] upnshare: se descifró pero no había mp4 adentro');
    return null;
  }

  return {
    url: mp4,
    // Las dos hacen falta: con una sola el CDN devuelve 403.
    headers: { Referer: `${BASE}/`, 'User-Agent': UA_ESCRITORIO },
  };
}

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
// ── Por qué va por la lista maestra y no por el mp4 (2026-08-10) ─────────────
//
// La primera versión devolvía el mp4 de `/api/v1/download`: una sola calidad,
// 1080p. Andaba, pero el usuario reportó en vivo que **al adelantar tocando la
// barra se quedaba cargando sin parar** en el doblaje. Medido, la causa no es
// el salto sino el **caudal del nodo**: el CDN reparte cada vale entre nodos
// distintos y no todos dan lo mismo.
//
//   4 MB reales, diez vales seguidos del mismo episodio:
//     185.237.106.177  1,71 · 1,09 · 0,76 · 1,14 · 2,93 · 2,15 MB/s   ok
//     203.188.166.13   0,14 MB/s   ← el archivo pide ~0,19: se corta
//     185.237.106.72   0,15 MB/s   ← ídem
//
// **4 de cada 10 no alcanzan.** Y no se puede esquivar eligiendo nodo: se midió
// si un pedido barato lo delata y **no** —el peor nodo bueno tarda 3724 ms en
// 64 KB y el mejor malo 1004 ms, así que se pisan—, y encima el MISMO nodo da
// 0,22 en un pedido y 0,17 en el siguiente. Tampoco se puede bajar de calidad
// por ahí: el vale está firmado para el 1080p y pedir `720p.mp4` da 403.
//
// La lista maestra de `/api/v1/video` arregla las dos cosas de una:
//
//   - trae **720p y 1080p**, así que el reproductor baja solo cuando la red no
//     da, en vez de atragantarse con el 1080p;
//   - es VOD con `#EXT-X-ENDLIST` y 358 pedacitos, y saltar al último devuelve
//     200 en 446 ms;
//   - **termina en `.m3u8`**, así que entra sola por el camino de HLS de la app
//     —el que esquiva nodos caídos y sigue maestros— sin declarar nada.
//
// El mp4 queda de respaldo por si algún día el maestro no viene. Si esto sale
// peor que antes, volver al mp4 es cambiar el orden de los dos bloques.
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

// Las dos hacen falta: con una sola el CDN devuelve 403.
const CABECERAS = {
  Referer: `${BASE}/`,
  'User-Agent': UA_ESCRITORIO,
  // No es una cabecera: es la declaración de que esto es una lista de
  // pedacitos, y con ella la app deja que la lista se pueda RECORRER.
  //
  // Su dirección ya termina en `.m3u8`, así que para reconocerla como lista no
  // hacía falta; se declara por lo otro. Le pasaba lo mismo que al HLS —«el
  // cuadro apareció y el vídeo no avanzó en 6 s», medido en vivo el
  // 2026-08-10—, y este **ni siquiera manda una cabecera rara**, que fue lo
  // que descartó que el problema fueran las cabeceras. El mp4 directo del
  // mismo episodio anda perfecto: lo que rompía era `reconnect_streamed`,
  // que le dice a ffmpeg que la fuente no se puede recorrer.
  'X-Lista-De-Pedacitos': '1',
};

export async function resolver(url: string, _referer: string): Promise<ServidorResuelto | null> {
  // El id viaja en el fragmento: https://animeav1.uns.bio/#eowi65
  const id = /#([A-Za-z0-9_-]{3,20})/.exec(url)?.[1];
  if (!id) {
    console.log(`[av1] upnshare: la dirección no trae id en el # :: ${url.slice(0, 60)}`);
    return null;
  }

  // Primero la lista maestra, que es lo que usa el propio reproductor del sitio.
  const hexVideo = await pedir(`${BASE}/api/v1/video?id=${id}`, `${BASE}/`);
  const claroVideo = hexVideo ? descifrar(hexVideo) : '';
  const master = /"source"\s*:\s*"([^"]+)"/.exec(claroVideo)?.[1]?.replace(/\\\//g, '/');
  if (master && master.indexOf('.m3u8') !== -1) {
    return { url: master, headers: CABECERAS };
  }

  // Respaldo: el mp4 de una sola calidad. Anda, pero es peor — ver arriba.
  console.log('[av1] upnshare: sin lista maestra, se cae al mp4 de una calidad');
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

  return { url: mp4, headers: CABECERAS };
}

// ─── Netu / hqq.ac 🌐 navegador ──────────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 200 títulos: **188 botones**.
// Va al navegador. Devuelve null a propósito, y esto es lo que hay que saber
// para no volver a caer en la trampa.
//
// ── La trampa: el genérico "resuelve" y devuelve basura ──────────────────────
//
// El resolver propio de hqq devuelve null (su descifrado ya no da con la página
// de hoy), así que lo natural sería dejarlo caer al genérico, que SÍ encuentra
// una dirección con pinta perfecta:
//
//   https://4fw4gd.cfglobalcdn.com/secip/1/861rQM940fF8R1fZDCdglg/
//     OTQuMjUuMTcwLjI2/1606597200/hls-vod-s03/flv/api/files/videos/…m3u8
//
// Está muerta. Es un ejemplo viejo que quedó pegado en la página, y se ve
// leyendo la propia dirección:
//
//   • `OTQuMjUuMTcwLjI2` es base64 de **94.25.170.26** — el permiso está atado a
//     la IP de otro, no a la nuestra.
//   • `1606597200` es el vencimiento: **28 de noviembre de 2020**.
//   • El host ni siquiera conecta: HTTP 000, no responde.
//
// Y ojo con cómo se mide esto, porque acá hubo un falso negativo: el fetch de
// Node fallaba con "unable to verify the first certificate", que parece un
// bloqueo pero es la cadena de certificados del propio Node. Recién probando
// con `curl -k` se ve el 000 de verdad.
//
// Devolver una dirección muerta es peor que no devolver nada: el reproductor la
// intenta, espera y falla, en vez de pasar de una al navegador. Por eso null
// derecho, sin probar el genérico.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

// ─── FS · firestream.to ──────────────────────────────────────────────────────
//
// 92 botones en el catálogo. Reproduce en la app.
//
// La página no trae la dirección: trae un VALE de un solo uso y hay que
// canjearlo. El vale va en `<script id="token-blob" type="text/plain">` y se
// cambia por la dirección firmada en `/api/videos/{codigo}/resolve`. A veces la
// página ya viene con la dirección hecha (`signedVideoUrl`) y no hay qué
// canjear.
//
// Medido el 2026-08-04: ~1,2 s hasta un `.../encodings/...` servible.

import { codigoDe, hostDe, pedir, postJson, type ServidorResuelto } from '../comun';

export async function resolver(
  url: string,
  referer: string,
): Promise<ServidorResuelto | null> {
  const host = hostDe(url) || 'firestream.to';
  const codigo = codigoDe(url);
  if (!codigo) return null;

  const html = await pedir(url, referer || `https://${host}/`);
  if (typeof html !== 'string') return null;

  const yaFirmada = /"signedVideoUrl"\s*:\s*"([^"]+)"/.exec(html);
  if (yaFirmada && yaFirmada[1] && yaFirmada[1] !== 'null') {
    return {
      url: yaFirmada[1].replace(/\\\//g, '/'),
      headers: { Referer: `https://${host}/` },
    };
  }

  const vale = /<script[^>]+id="token-blob"[^>]*>([^<]+)<\/script>/.exec(html);
  if (!vale) {
    console.log('[fc/firestream] la página no trae el vale para canjear');
    return null;
  }

  const raw = await postJson(
    `https://${host}/api/videos/${encodeURIComponent(codigo)}/resolve`,
    { blob: vale[1].trim() },
    url,
  );
  if (!raw) return null;

  // Se lee con regex y no con JSON.parse para no romperse si el host agrega
  // campos o envuelve la respuesta.
  const m =
    /"signedVideoUrl"\s*:\s*"([^"]+)"/.exec(raw) ??
    /"signedVideoSdUrl"\s*:\s*"([^"]+)"/.exec(raw);
  if (!m) {
    console.log('[fc/firestream] el canje no devolvió ninguna url');
    return null;
  }
  return {
    url: m[1].replace(/\\\//g, '/'),
    headers: { Referer: `https://${host}/` },
  };
}

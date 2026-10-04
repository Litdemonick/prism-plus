// ─── VOE ⚡ nativo ────────────────────────────────────────────────────────────
//
// Medido el 2026-08-05: **59 botones** (uno por episodio) y resuelve 3 de 3 en
// los episodios probados, con 206 `video/mp4`.
//
//   embed   https://voe.sx/e/5xtovdzbjm5q
//   sale    un mp4 en cloudwindow-route.com
//   tarda   500–590 ms
//
// ── Acá hay una decisión distinta a la del resto del repo ───────────────────
//
// Las otras extensiones prefieren el `source` (m3u8) sobre el
// `direct_access_url` (mp4). **Esta prefiere el mp4**, y es a propósito:
// confirmado en vivo con Streamwish que el HLS de estos hosts de terceros
// reparte los pedacitos en un servidor de CDN elegido al azar en cada
// resolución, con episodios de inestabilidad real. Un mp4 directo es una sola
// conexión, sin esa lotería.
//
// Es justo la clase de diferencia por la que cada extensión lleva su copia: si
// esto viviera en el SDK, "arreglar" el orden para otra rompería esta.
//
// ── Cómo está escondida la dirección ────────────────────────────────────────
//
// `voe.sx/e/xxx` ya no trae el vídeo: redirige por JS a un dominio espejo que
// va rotando. El espejo mete los datos cifrados en un
// `<script type="application/json">["…"]</script>`, y para leerlos hay que
// deshacer seis capas: ROT13, sacar el relleno (@$ ^^ #& ~@ %? *~ !! `),
// base64, correr cada carácter −3, dar vuelta la cadena, y base64 otra vez.

// ── La dirección queda atada al User-Agent que la pidió ─────────────────────
//
//   WINDOWS y LINUX  andaba — resolvía y reproducía con dos User-Agent de
//                    escritorio distintos, y VOE los da por equivalentes.
//   ANDROID          403 — resolvía con el de móvil y reproducía con el de
//                    escritorio, así que el CDN rechazaba la dirección y el
//                    servidor caía al navegador pareciendo roto.
//
// Medido el 2026-08-06. Los números están en UA_DEL_REPRODUCTOR, en comun.ts.
//
// Se pide con el MISMO User-Agent con el que después se reproduce y se devuelve
// en las cabeceras, así las dos plataformas hacen exactamente lo mismo.

import {
  pedir,
  b64aTexto,
  CABECERAS_DEL_REPRODUCTOR,
  type ServidorResuelto,
} from '../comun';

/** ROT13 sobre letras ASCII. */
function rot13(s: string): string {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

/** Deshace las seis capas. Devuelve el JSON crudo, o null si no se pudo. */
function descifrar(crudo: string): string | null {
  try {
    let r = rot13(crudo);
    for (const p of ['@$', '^^', '#&', '~@', '%?', '*~', '!!', '`']) r = r.split(p).join('');
    const paso3 = b64aTexto(r);
    let corrido = '';
    for (let i = 0; i < paso3.length; i++) corrido += String.fromCharCode(paso3.charCodeAt(i) - 3);
    return b64aTexto(corrido.split('').reverse().join(''));
  } catch {
    return null;
  }
}

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  let html = await pedir(url, referer, CABECERAS_DEL_REPRODUCTOR);
  if (!html) return null;

  // Seguir la redirección al espejo, si la hay.
  const redir = /window\.location(?:\.href)?\s*=\s*['"](https?:\/\/[^'"]+)['"]/.exec(html);
  if (redir) {
    const espejo = await pedir(redir[1], 'https://voe.sx/', CABECERAS_DEL_REPRODUCTOR);
    if (espejo) html = espejo;
  }

  // Toda salida lleva el User-Agent con el que se pidió. Por acá hay seis
  // caminos distintos y el que se olvidara volvería a dar 403 en el teléfono,
  // así que se arma en un solo lugar.
  const salida = (u: string): ServidorResuelto => ({
    url: u.replace(/\\\//g, '/'),
    headers: CABECERAS_DEL_REPRODUCTOR,
  });

  const bloque =
    /<script[^>]*type=["']application\/json["'][^>]*>\s*\[\s*"([^"]+)"\s*\]\s*<\/script>/.exec(html);
  if (bloque) {
    const claro = descifrar(bloque[1]);
    if (claro) {
      // El mp4 PRIMERO — ver arriba por qué.
      const mp4 = /"direct_access_url"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(claro);
      if (mp4) return salida(mp4[1]);
      const src = /"source"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(claro);
      if (src) return salida(src[1]);
      const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(claro.replace(/\\\//g, '/'));
      if (m3u8) return salida(m3u8[1]);
    }
  }

  // Respaldos para páginas de Voe viejas.
  let m = /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(html);
  if (m) return salida(m[1]);

  const enBase64 = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
  if (enBase64) {
    try {
      const dec = b64aTexto(enBase64[1]);
      const hls = /['"]hls['"]\s*:\s*['"]([^'"]+)['"]/.exec(dec);
      if (hls) return salida(hls[1]);
    } catch {
      /* si no se puede decodificar, se sigue con lo de abajo */
    }
  }

  m = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
  if (m) return salida(m[0]);

  return null;
}

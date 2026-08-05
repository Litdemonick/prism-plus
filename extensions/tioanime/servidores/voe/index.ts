// ─── Voe ⚡ nativo ────────────────────────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 80 títulos: **80 botones**, está en TODOS.
//
//   embed   https://voe.sx/e/9ma8hzh1gnxv
//   sale    https://ugc-cdn-caching-n3lwlvsywuuq2ifiqn.cloudwindow-route.com/…m3u8
//   tarda   300–830 ms (son dos pedidos: el de voe.sx y el del espejo)
//   se abre 200 application/vnd.apple.mpegurl
//
// No siempre está: sobre 6 episodios sueltos, **resolvió 4**. Los dos que no,
// fue el embed en sí (Voe ya no lo tiene), no el resolver. Cuando resuelve,
// reproduce: 4 de 4.
//
// El camino genérico NO lo saca (medido en hentaila, mismo resolver): si este
// se borra, Voe pasa al navegador.
//
// ── Cómo está escondida la dirección ─────────────────────────────────────────
//
// `voe.sx/e/xxx` ya no trae el vídeo: es una página que redirige por JS a un
// dominio espejo que va rotando (p. ej. `juliewomanwish.com/e/xxx`). El espejo
// mete los datos cifrados en un `<script type="application/json">["…"]</script>`,
// y para leerlos hay que deshacer seis capas, en este orden:
//
//   1. ROT13
//   2. sacar el relleno: @$ ^^ #& ~@ %? *~ !! `
//   3. base64
//   4. correr cada carácter −3
//   5. dar vuelta la cadena
//   6. base64 otra vez → recién ahí sale el JSON
//
// Del JSON se prefiere `source` (el m3u8) y no `direct_access_url`: ese segundo
// es un mp4 de DESCARGA, con el índice al final y sin soporte de rangos, así
// que el reproductor no lo puede ir abriendo de a poco.
//
// Un pedido y un solo intento: los dominios espejo de Voe rotan y algunos
// proveedores de internet los filtran. Si está bloqueado conviene fallar rápido
// y no hacer esperar la apertura del episodio.

import { pedir, b64aTexto, type ServidorResuelto } from '../comun';

/** ROT13 sobre letras ASCII. */
function rot13(s: string): string {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

/** Las barras escapadas del JSON (`\/` → `/`). */
function desescapar(s: string): string {
  return s.replace(/\\\//g, '/');
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
  let html = await pedir(url, referer);
  if (!html) return null;

  // 1. Seguir la redirección al espejo, si la hay.
  const redir = /window\.location(?:\.href)?\s*=\s*['"](https?:\/\/[^'"]+)['"]/.exec(html);
  if (redir) {
    const espejo = await pedir(redir[1], 'https://voe.sx/');
    if (espejo) html = espejo;
  }

  // 2. El formato de ahora: el bloque JSON cifrado.
  const bloque =
    /<script[^>]*type=["']application\/json["'][^>]*>\s*\[\s*"([^"]+)"\s*\]\s*<\/script>/.exec(html);
  if (bloque) {
    const claro = descifrar(bloque[1]);
    if (claro) {
      const src = /"source"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(claro);
      if (src) return { url: desescapar(src[1]) };
      const cualquiera = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(desescapar(claro));
      if (cualquiera) return { url: cualquiera[1] };
      const mp4 = /"direct_access_url"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(claro);
      if (mp4) return { url: desescapar(mp4[1]) };
    }
  }

  // 3. Respaldos para páginas de Voe viejas.
  let m = /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(html);
  if (m) return { url: m[1] };

  const enBase64 = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
  if (enBase64) {
    try {
      const claro = b64aTexto(enBase64[1]);
      const hls = /['"]hls['"]\s*:\s*['"]([^'"]+)['"]/.exec(claro);
      if (hls) return { url: hls[1] };
      const directo = /(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/.exec(claro);
      if (directo) return { url: directo[1] };
    } catch {
      /* si no se puede decodificar, se sigue con lo de abajo */
    }
  }

  m = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
  if (m) return { url: m[0] };

  return null;
}

// ─── Voe 🌐 navegador ───────────────────────────────────────────────────────
//
// **Medido el 2026-08-06: 0 de 9.** Sale en casi todos los títulos y no entrega
// la dirección en ninguno.
//
// El resolver es el mismo que anda en otras extensiones del repo —sigue la
// redirección al espejo y descifra el bloque JSON— y acá no encuentra nada: la
// página que devuelve para los embeds de LaMovie no trae ni el bloque cifrado
// ni un m3u8 suelto. No es que el resolver esté roto: no hay qué sacar.
//
// Se deja en la lista igual, y esto es a propósito: **nunca se ocultan
// servidores**. La app cae sola al navegador interno, que ejecuta el JS de la
// página de verdad, y ahí sí reproduce.
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

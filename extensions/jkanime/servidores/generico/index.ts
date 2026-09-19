// ─── El genérico ─────────────────────────────────────────────────────────────
//
// El último recurso: cuando la dirección no es de ninguno de los servidores que
// esta extensión ya sabe resolver por su cuenta, se baja la página, se
// desempaqueta lo que haya y se busca el vídeo.
//
// ── Por qué existe esta copia ───────────────────────────────────────────────
//
// Es una de las pocas cosas que jkanime todavía sacaba de `sdk/embeds.ts`.
// Copiado tal cual de `resolveGeneric`. Con esto, esta extensión ya no depende del SDK para
// resolver ningún servidor: tocar el SDK no la puede romper, y arreglar algo
// acá no puede romper a las demás.
//
// **Lo que NO se movió, a propósito:** voe, streamwish/vidhide y los dos
// reproductores propios (Desu y Magi) los resuelve esta extensión con código
// suyo desde hace rato, en `index.ts`. Anda, está medido, y moverlo era
// riesgo sin ganancia.
//
// ── Qué agarra hoy ──────────────────────────────────────────────────────────
//
// Nada que la extensión ofrezca: `watch()` solo deja pasar a los seis
// servidores activos, así que ningún botón del sitio llega hasta acá. Queda
// como red para cuando se sume un servidor nuevo y todavía no tenga su ficha,
// y para que el registro deje ver que hay que agregarlo con su carpeta.

import { pedir, hostDe, desempaquetarTodo, b64aTexto, type ServidorResuelto } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;

  const host = hostDe(url);
  const headers = host ? { Referer: `https://${host}/` } : undefined;
  const plano = `${html}\n${desempaquetarTodo(html)}`.replace(/\\\//g, '/');

  // m3u8 primero: es lo que da calidades y permite cambiar de minuto.
  const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(plano);
  if (m3u8) return { url: m3u8[1], headers };

  // atob('...') → adentro puede venir el m3u8.
  for (const m of html.matchAll(/atob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/g)) {
    try {
      const claro = b64aTexto(m[1]).replace(/\\\//g, '/');
      const src = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(claro);
      if (src) return { url: src[1], headers };
    } catch {
      /* si no se puede decodificar, se sigue con lo siguiente */
    }
  }

  // jwplayer: file / source / src
  const file = /(?:file|source|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/.exec(plano);
  if (file) return { url: file[1], headers };

  // mp4 suelto, descartando lo que sea hoja de estilo o script. Es el que
  // levanta a mediafire.
  const mp4s = plano.match(/https?:[^"'\s\\]+\.mp4[^"'\s\\]*/g) ?? [];
  const real = mp4s.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (real) return { url: real, headers };

  return null;
}

// ─── El genérico ─────────────────────────────────────────────────────────────
//
// El último recurso: cuando la dirección no es de ninguno de los servidores que
// esta extensión ya sabe resolver por su cuenta, se baja la página, se
// desempaqueta lo que haya y se busca el vídeo.
//
// ── Por qué existe esta copia ───────────────────────────────────────────────
//
// Es una de las dos únicas cosas que jkanime todavía sacaba de `sdk/embeds.ts`
// (la otra es StreamTape, en la carpeta de al lado). Copiado tal cual de
// `resolveGeneric`. Con esto, esta extensión ya no depende del SDK para
// resolver ningún servidor: tocar el SDK no la puede romper, y arreglar algo
// acá no puede romper a las demás.
//
// **Lo que NO se movió, a propósito:** voe, streamwish/vidhide, mixdrop,
// mp4upload y los dos reproductores propios (Desu y Magi) los resuelve esta
// extensión con código suyo desde hace rato, en `index.ts`. Anda, está medido,
// y moverlo era riesgo sin ganancia.
//
// ── Qué agarra hoy ──────────────────────────────────────────────────────────
//
// Medido el 2026-08-05 sobre 3 episodios, lo único que hoy cae acá es
// `dsvplay.com` (Doodstream), y devuelve null — ya tiene su carpeta con lo
// medido.
//
// Mediafire también caía acá y **se sacó de la lista a pedido del usuario**.
// El motivo es doble y vale anotarlo: no es un servidor de vídeo sino
// alojamiento de archivos, así que no corresponde ofrecerlo como uno más; y
// además el usuario reportó que cuando SÍ abre, se ve mal — carga la imagen en
// vez de reproducir. Que devuelva 206 video/mp4 en la medición no alcanza: eso
// solo dice que el archivo baja, no que se reproduzca bien. El filtro está en
// `index.ts` de la extensión.
//
// O sea que hoy el genérico no le sirve a nadie en particular: queda como red
// para lo que el sitio sume mañana.

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

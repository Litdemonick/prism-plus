// ─── Streamwish ⚡ nativo ─────────────────────────────────────────────────────
//
// Medido el 2026-08-05: **59 botones** (uno por episodio), resuelve 3 de 3 con
// 200 `application/vnd.apple.mpegurl`. En este sitio el host es
// `sfastwish.com`.
//
//   embed   https://sfastwish.com/e/agbdoyvb5mkn
//   tarda   1280–1320 ms
//
// Primero prueba la API `/api/file/{id}?json=1` y, si no da, baja el embed y
// busca ahí desempaquetando el `eval(p,a,c,k,e,d)`.
//
// **Este mismo resolver es el de Vidhide** (`vidhidevip.com`): es el mismo
// motor con otro nombre. La carpeta de al lado tiene su ficha y su medición.
//
// ── Ojo con dónde termina ───────────────────────────────────────────────────
//
// Medido: la dirección que devuelve cae en **premilkyway.com**, que en el resto
// del repo está descartado porque rechaza la huella TLS de mpv/libavformat.
// Acá NO se descarta, y es a propósito: esta extensión nunca tuvo ese filtro y
// el usuario reporta que sus servidores andan bien hoy. Cambiarlo sería tocar
// algo que funciona para el usuario a partir de una medición hecha en otra
// extensión. Si alguna vez este servidor empieza a colgarse 20 segundos y
// fallar, ESTE es el primer lugar para mirar.

import { pedir, hostDe, desempaquetarTodo, b64aTexto, type ServidorResuelto } from '../comun';

/**
 * Hosts cuya API JSON ya contestó que no, en lo que va de esta sesión.
 *
 * ── Por qué hace falta ──────────────────────────────────────────────────────
 *
 * La API se prueba primero porque cuando anda es un viaje en vez de dos. Pero
 * cuando el host la tiene cerrada contesta 403 SIEMPRE, y ese intento perdido
 * se pagaba en cada episodio. Medido en un televisor, abriendo un capítulo:
 *
 *     GET https://sfastwish.com/…  → 403 · 775 ms
 *     GET https://sfastwish.com/…  → 200 · 777 ms
 *
 * Casi ochocientos milisegundos de espera antes de ver imagen, cada vez, para
 * preguntar algo que ya se sabe que va a fallar.
 *
 * Con esto se pregunta UNA vez por host: si contesta, se sigue usando el
 * camino corto; si no, los episodios siguientes van derecho al embed. El
 * conjunto vive en memoria y se va con el motor, así que un host que vuelva a
 * habilitarla se reintenta en la sesión siguiente — no queda marcado para
 * siempre.
 */
const apiCerrada = new Set<string>();

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const host = hostDe(url);
  if (!host) return null;
  const hdrs = { Referer: `https://${host}/` };

  // La API JSON del motor streamwish.
  const idM = /\/(?:e|f|d|v)\/([A-Za-z0-9]+)/.exec(url);
  if (idM && !apiCerrada.has(host)) {
    const json = await pedir(`https://${host}/api/file/${idM[1]}?json=1`, `https://${host}/`, {
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json',
    });
    if (!json) {
      apiCerrada.add(host);
      console.log(`[jk] ${host}: la API no contesta, se va derecho al embed de acá en más`);
    }
    if (json) {
      const m3u8 = /"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(json);
      if (m3u8) return { url: m3u8[1].replace(/\\\//g, '/'), headers: hdrs };
      const mp4 = /"file"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(json);
      if (mp4) return { url: mp4[1].replace(/\\\//g, '/'), headers: hdrs };
    }
  }

  // Respaldo: bajar el embed y buscar adentro.
  const html = await pedir(url, `https://${host}/`);
  if (!html) return null;
  const plano = `${html}\n${desempaquetarTodo(html)}`.replace(/\\\//g, '/');

  const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(plano);
  if (m3u8) return { url: m3u8[1], headers: hdrs };

  const file = /(?:file|source|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/i.exec(plano);
  if (file) return { url: file[1], headers: hdrs };

  const enBase64 = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
  if (enBase64) {
    try {
      const dec = b64aTexto(enBase64[1]);
      const src = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(dec.replace(/\\\//g, '/'));
      if (src) return { url: src[1], headers: hdrs };
    } catch {
      /* si no se puede decodificar, se sigue */
    }
  }

  const mp4s = plano.match(/https?:[^"'\s\\]+\.mp4[^"'\s\\]*/g) ?? [];
  const real = mp4s.find((u) => !/\.(?:css|js|jpg|png|woff)/.test(u));
  if (real) return { url: real, headers: hdrs };

  // Se dice POR QUÉ no salió, no solo que no salió.
  //
  // Devolver null a secas deja a la app mostrando «este servidor no está
  // disponible» sin ninguna pista, y desde el registro del usuario no se puede
  // distinguir «el embed no llegó» de «llegó pero cambió y ya no se reconoce».
  // Son dos arreglos distintos: uno es de red, el otro es de este archivo.
  console.log(
    `[jk] ${host}: el embed llegó (${html.length} car., ${plano.length} tras ` +
      `desempaquetar) pero no tiene ninguna dirección de vídeo reconocible`,
  );
  return null;
}

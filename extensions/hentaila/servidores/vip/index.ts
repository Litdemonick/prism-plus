// ─── VIP (cdn.hvidserv.com) 🌐 navegador ─────────────────────────────────────
//
// Medido el 2026-08-04 sobre 200 títulos: **200 botones**, está en TODOS.
// Va al navegador. Devuelve null a propósito, y acá queda por qué, que es lo
// que costó averiguar.
//
// ── Cómo saca la dirección el sitio ──────────────────────────────────────────
//
// La página del embed son 741 bytes de cascarón Vite: un `<div id="app">` vacío
// y nada más. No hay dirección que raspar. Toda la lógica está en el bundle
// `/assets/index-*.js`, y adentro hace exactamente esto:
//
//     const l = window.location.pathname.split("/").pop();
//     if (l.length !== 32) return;
//     jwplayer("player").setup({ file: "https://cdn.hvidserv.com/m3u8/" + l });
//
// O sea que la lista de reproducción se arma sola con el hash de 32 caracteres
// que ya viene en la URL del embed — no hace falta pedir la página siquiera:
//
//     https://cdn.hvidserv.com/play/416ef274e31766e697becb1de2f3eefd
//     https://cdn.hvidserv.com/m3u8/416ef274e31766e697becb1de2f3eefd
//
// Y esa lista responde 200 con un HLS de verdad (#EXTM3U, VOD, ~15 KB), sin
// token, sin caducidad y sin necesitar Referer.
//
// ── Por qué igual va al navegador ────────────────────────────────────────────
//
// Porque lo que se rompe es un escalón más abajo: **los segmentos**. La lista
// apunta a `cdn.hvidserv.com/segs/{hash}/000.html` (con extensión .html para
// esquivar bloqueadores de anuncios) y cada uno devuelve **403 de Cloudflare**
// ("Attention Required!") a todo lo que no sea un navegador de verdad.
// Comprobado el 2026-08-04, todo desde la misma máquina y la misma IP:
//
//   /play/{hash}          200      ← el cascarón
//   /m3u8/{hash}          200      ← la lista, entera
//   /segs/{hash}/000.html 403      ← el vídeo
//
// Y el 403 del segmento no cede por nada de lo que se probó: sin Referer, con
// el de hentaila, con el del propio /play, con Origin, desde curl y desde el
// fetch de Node. Tampoco es cosa de sesión: la secuencia play → m3u8 → segmento
// con la misma cookiera no deja ninguna cookie y el segmento sigue en 403.
//
// Devolver la lista sería peor que no devolver nada: el reproductor la abriría
// bien, se quedaría esperando, y recién ahí fallaría — el usuario espera para
// no ver nada. Con null la app cae de una al navegador interno, que es un
// navegador de verdad y pasa el control de Cloudflare.
//
// ── Si alguna vez se quiere reintentar ───────────────────────────────────────
//
// El único dato que falta es si el reproductor nativo (mpv en escritorio,
// ExoPlayer en Android) pasa ese control de Cloudflare, que va por huella TLS y
// no por cabeceras: curl y Node no pasan, pero eso no dice nada de ellos. Es
// una prueba que hay que hacer en la app, no acá. Si pasara, alcanza con
// devolver `{ url: https://cdn.hvidserv.com/m3u8/${hash} }` — son 200 botones
// que pasarían al reproductor propio.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

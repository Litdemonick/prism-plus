// ─── Maru · my.mail.ru ⚡ nativo ───────────────────────────────────────────────
//
// Medido el 2026-10-27: 7 de ~160 botones del catálogo de anime (el sitio lo
// rotula "Maru"). Muchos están borrados (2 de 3 en la muestra), pero los que
// están se reproducen directo en la app.
//
//   embed   https://my.mail.ru/video/embed/9149163570439654075
//   datos   https://my.mail.ru/+/video/meta/9149163570439654075   (JSON)
//   sale    https://cdn59.my.mail.ru/hv/69235237.mp4?…&video_key=…  (720p)
//
// Los datos traen el vídeo en 720p y 360p. El sitio además manda una cookie
// `video_key`, pero NO hace falta: la misma llave va dentro de la dirección
// (probado sin la cookie: 206 video/mp4 en las dos calidades). Lo borrado
// contesta 404 con `video_not_found`.

import { pedir, type ServidorResuelto } from '../comun';

interface _Meta {
  videos?: { key?: string; url?: string }[];
  error?: string;
}

function _id(url: string): string | null {
  return /\/embed\/(\d+)/.exec(url)?.[1] ?? null;
}

async function _meta(url: string): Promise<_Meta | null> {
  const id = _id(url);
  if (!id) return null;
  const texto = await pedir(`https://my.mail.ru/+/video/meta/${id}`, url);
  if (!texto) return null;
  try {
    return JSON.parse(texto) as _Meta;
  } catch {
    return null;
  }
}

export async function resolver(url: string): Promise<ServidorResuelto | null> {
  const meta = await _meta(url);
  const videos = (meta?.videos ?? []).filter((v) => v.url);
  if (!videos.length) return null;
  // 720p primero (el que abre la app), si no el primero que haya.
  const elegido = videos.find((v) => v.key === '720p') ?? videos[0];
  const dir = elegido.url!.startsWith('//') ? `https:${elegido.url}` : elegido.url!;
  return { url: dir };
}

/** true sí, false borrado (`video_not_found`), null no se sabe. */
export async function estaVivo(url: string): Promise<boolean | null> {
  const meta = await _meta(url);
  if (!meta) return null;
  if (meta.error === 'video_not_found') return false;
  return (meta.videos ?? []).some((v) => v.url) ? true : null;
}

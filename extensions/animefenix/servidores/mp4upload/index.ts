// ─── Mp4upload ⚡ nativo ──────────────────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 60 episodios: **51 botones**. Resuelve bien —206
// `application/octet-stream`, comprobado— pero hoy la extensión **lo oculta**.
//
// Y eso NO es una medición: es una decisión del usuario, tomada porque en la
// app real el nodo `a3.mp4upload.com:183` tenía un ancho de banda que no le
// alcanzaba a su conexión — cargaba un rato y después se trababa y rebufereaba
// todo el tiempo. El servidor en sí está bien (cabeceras, soporte de rangos y
// velocidad de descarga verificados en vivo); lo que no es confiable es la ruta
// de red hacia ese host puntual.
//
// Por eso el resolver se copia igual y queda funcionando: lo que lo saca de la
// lista es el filtro de `index.ts` de la extensión, no esta carpeta. Si alguna
// vez se quiere volver a ofrecer, alcanza con sacarlo de ahí — la ficha ya lo
// tiene marcado como nativo.
//
// La dirección está en texto plano en la página del embed; alcanza con agarrar
// el primer mp4 que no sea un archivo del propio sitio. Dos cosas que parecen
// un error y no lo son: sale por un puerto raro (`:183`) y NO declara
// `video/mp4` sino `application/octet-stream`. El reproductor lo toma igual.
// El Referer tiene que ser el de mp4upload, con el de shademanga no anda.

import { pedir, type ServidorResuelto } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;
  const candidatos = html.match(/https?:[^"'\s]+\.mp4[^"'\s]*/g) ?? [];
  const real = candidatos.find((u) => !/\.(?:css|js|jpg|png)/.test(u));
  if (!real) return null;
  return { url: real, headers: { Referer: 'https://www.mp4upload.com/' } };
}

// ─── FC · el archivo directo ─────────────────────────────────────────────────
//
// 195 botones. Reproduce en la app.
//
// No es un servidor con página propia: es el mp4 servido tal cual, repartido
// entre cuatro hosts (hugh.cdn.rumble.cloud, files.eintim.me, 1a-1791.com y
// archive.org). No hay nada que resolver — se le pasa la dirección al
// reproductor y listo.
//
// OJO, esto explica los cortes que se ven en algunos títulos y en otros no: un
// mp4 puede tener su índice (`moov`) al principio o al FINAL del archivo, según
// con qué programa se armó. Con el índice al final hay que ir al fondo del
// archivo y volver para armar cada segundo, y eso se paga carísimo por
// internet: medido con dos títulos del MISMO host, 40 KB/s reales en el que lo
// tiene al final contra 3,6 MB/s en el que lo tiene al principio, con el
// servidor entregando 8-9 MB/s si se le pide el archivo aparte.
//
// O sea que cuando FC "va mal en una serie y perfecto en otra", NO es el
// servidor: es cómo quedó armado ese archivo al subirlo. La app lo detecta sola
// y lo anota en el registro ("índice del archivo: AL FINAL").

import { type ServidorResuelto } from '../comun';

export async function resolver(url: string): Promise<ServidorResuelto | null> {
  return { url };
}

// ─── Drive (drive.google.com) ────────────────────────────────────────────────
//
// Medido el 2026-10-02 sobre 15 títulos de la muestra (88 de 356 páginas del
// sitio traen Drive, siempre «FHD 1080p»):
//
//   · 14 de 15 bajan SIN cuenta por la descarga directa de Google
//     (`drive.usercontent.google.com/download?id=…&export=download&confirm=t`).
//     Uno estaba borrado (404).
//   · Aceptan pedidos por partes (206): se puede saltar al medio y al final.
//   · El mismo enlace sigue sirviendo 4 minutos después (y no lleva vale de un
//     solo uso: alcanza con `confirm=t`, sin el `uuid` del aviso).
//   · Más de 100 Mbps sostenidos; una película de 2 h pide unos 3,6.
//   · Archivos MKV/MP4 de 2 a 5 GB: H.264 (decodificable por hardware), audio
//     AC3/EAC3 y subtítulos dentro.
//
// Lo de septiembre («Google corta el archivo a quien no tiene cuenta») era con
// la dirección vieja de drive.google.com/uc; esta no.
//
// **No se sondea antes** a propósito: el puente de pedidos de la app trae la
// respuesta ENTERA como texto, y si Google ignorara el Range serían gigas en
// memoria. Si el archivo no abre (borrado, o limitado por demasiadas
// descargas), el reproductor falla al abrirlo y la app pasa sola al siguiente
// servidor.

import { type ServidorResuelto, UA_NAVEGADOR } from '../comun';

/** El id del archivo, venga como /file/d/<id>/… o como ?id=<id>. */
function idDe(url: string): string | null {
  return /\/d\/([\w-]{10,})/.exec(url)?.[1] ?? /[?&]id=([\w-]{10,})/.exec(url)?.[1] ?? null;
}

export async function resolver(url: string): Promise<ServidorResuelto | null> {
  const id = idDe(url);
  if (!id) return null;
  return {
    url: `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
    headers: { 'User-Agent': UA_NAVEGADOR },
  };
}

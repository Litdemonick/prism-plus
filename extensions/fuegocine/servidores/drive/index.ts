// ─── Drive · drive.google.com ────────────────────────────────────────────────
//
// 139 botones. NO resuelve: Drive pide sesión y token para servir el archivo, y
// aun con eso es muy inestable para reproducir de corrido.
//
// Va al navegador interno, que es donde sí anda. El botón no se saca de la
// lista: antes se lo escondía y el usuario perdía 139 botones sin saber que
// existían.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string): Promise<ServidorResuelto | null> {
  return null;
}

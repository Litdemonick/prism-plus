// ─── filemoon (bysesukior.com) 🌐 navegador ──────────────────────────────────
//
// Medido el 2026-08-04: **~20 botones**.
// Va al navegador. Devuelve null a propósito.
//
// ── Lo que se probó, para no volver a probarlo ──────────────────────────────
//
// El botón dice "filemoon" pero el host es `bysesukior.com`, así que se probó
// por los tres caminos que podrían corresponderle. **Ninguno saca nada:**
//
//   resolveByse       la API contesta, pero sin datos de reproducción
//   resolveStreamwish null
//   el genérico       null
//
// El motivo está en la página: son 1605 bytes de cascarón de una SPA — el
// `<title>` dice "Byse Frontend" y el contenido lo arma JS después. No hay
// dirección escrita en ningún lado que raspar.
//
// **Ojo al re-medir esto:** `resolveByse` usa un `CryptoJS` global que inyecta
// el runtime de PrismHub y que en Node NO existe. Sin dárselo a mano, muere con
// "CryptoJS is not defined" y parece que el servidor estuviera roto — pasó, y
// en latanime costó casi dar por perdidos 96 botones. El resultado de arriba
// está medido CON el global puesto:
//
//     import CryptoJS from 'crypto-js';
//     globalThis.CryptoJS = CryptoJS;
//
// Con CryptoJS presente, este host sigue devolviendo "sin datos de
// reproducción" — o sea que acá el fallo es real. En latanime, en cambio, el
// host `bysekoze.com` resuelve perfecto con el mismo resolver.
//
// Ojo con el nombre del host, que además explica por qué el enrutador del SDK
// tampoco lo agarraba: busca `byse.` **con punto** y este es `bysesukior.com`,
// así que caía al genérico. Da igual — medido arriba, el resolver correcto
// tampoco lo saca. No hay mejora escondida ahí.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

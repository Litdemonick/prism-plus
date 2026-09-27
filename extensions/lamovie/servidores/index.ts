// ─── Los servidores de LaMovie ───────────────────────────────────────────────
//
// Una carpeta por servidor, con su nombre. Cada una lleva su propio resolver y
// arriba de todo lo que se midió de ese servidor, para no volver a averiguarlo.
//
// **Por qué está copiado y no importado:** vimeos lo usan también otras
// extensiones de este repo. Compartiendo el código, tocarlo para arreglar
// LaMovie podía romper FuegoCine sin que nadie se enterara hasta que un usuario
// lo reportara. Con la copia, lo que se toque acá se queda acá.
//
// ── Solo vimeos, desde el 2026-09-27 ────────────────────────────────────────
//
// El sitio nuevo tiene un único reproductor: arma
// `https://vimeos.net/embed-{code}.html` con el `code` de cada película o
// episodio (siteConfig.playerProvider). GoodstreamOne, Voe y Doodstream
// salieron junto con la API vieja, y con ellos sus carpetas.
//
// Además, acá solo va lo que reproduce en el reproductor de la app: la app ya
// no abre páginas en un navegador, así que un servidor que no resuelve a un
// vídeo directo no le sirve a nadie.

import { type ServidorResuelto } from './comun';
import * as vimeos from './vimeos';

export { type ServidorResuelto } from './comun';

export interface Servidor {
  /** El nombre que ve el usuario en el selector de servidores. */
  boton: string;
  /** Trozos de host con los que se reconoce esta dirección. */
  hosts: string[];
  resolver: (url: string, referer: string) => Promise<ServidorResuelto | null>;
}

export const SERVIDORES: Servidor[] = [
  { boton: 'Vimeos', hosts: ['vimeos'], resolver: vimeos.resolver },
];

/** El servidor al que pertenece una dirección, si se lo reconoce. */
export function servidorDe(url: string): Servidor | null {
  const u = url.toLowerCase();
  for (const s of SERVIDORES) {
    for (const h of s.hosts) {
      if (u.indexOf(h) !== -1) return s;
    }
  }
  return null;
}

/**
 * Resuelve una dirección de embed a algo que el reproductor pueda abrir.
 *
 * Devuelve `null` si no se reconoce el servidor o si no se pudo sacar el vídeo.
 */
export async function resolver(
  url: string,
  referer: string,
): Promise<ServidorResuelto | null> {
  const s = servidorDe(url);
  if (!s) return null;
  try {
    return await s.resolver(url, referer);
  } catch (e) {
    // Que falle no puede tumbar la extensión: se anota y se devuelve nada.
    console.log(`[lamovie/${s.boton}] no se pudo resolver: ${e}`);
    return null;
  }
}

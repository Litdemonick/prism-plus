// ─── Los servidores de FuegoCine ─────────────────────────────────────────────
//
// Una carpeta por servidor, con su nombre. Cada una lleva su propio resolver y
// arriba de todo lo que se midió de ese servidor, para no volver a averiguarlo.
//
// **Por qué está copiado del SDK y no importado de él:** varios de estos
// servidores (ok.ru, firestream, el genérico) los usan también otras
// extensiones. Compartiendo el código, tocar uno para arreglar FuegoCine podía
// romper LatAnime o JKAnime sin que nadie se enterara hasta que un usuario lo
// reportara. Con la copia, lo que se toque acá se queda acá.
//
// **Cómo mantener esto:** la copia arranca IGUAL a la que funciona; no se
// retoca "por las dudas". Si un servidor falla en FuegoCine se arregla ESTA
// copia y ninguna otra. Y si se arregla acá algo que también está en otra
// extensión, conviene avisarlo: la otra sigue con la versión vieja.
//
// El precio, asumido: cuando un servidor cambia de formato hay que arreglarlo
// en cada extensión por separado.
//
// ── El catálogo, medido el 2026-08-04 ────────────────────────────────────────
//
// Escaneado entero por el feed de Blogger (el `content` de cada post ya trae el
// bloque `_SV_LINKS`, así que no hace falta pedir título por título):
// **1.346 botones en 396 títulos.**

import { type ServidorResuelto } from './comun';
import * as directo from './directo';
import * as dropload from './dropload';
import * as firestream from './firestream';
import * as goodstream from './goodstream';
import * as okru from './ok.ru';
import * as vimeos from './vimeos';

export { type ServidorResuelto } from './comun';

// ── Los que salieron el 2026-09-27 ───────────────────────────────────────────
//
// La app ya no abre páginas en un navegador: un servidor que no resuelve a un
// vídeo directo es un botón que no reproduce nunca. Se midió sobre seis
// títulos, bajando vídeo, y salieron con su carpeta:
//
//   UA (unlimplay)  0 de 24. Su menú ya no trae servidores: solo "direct" y
//                   "proxy", y los dos contestan 403 porque el vale del CDN
//                   está atado a la IP de unlimplay. En la mitad de los
//                   títulos el menú viene vacío (`EMBEDS = []`).
//   US (upns)       marcado de navegador desde agosto.
//   Drive           el propio Google corta el archivo a quien no tiene cuenta.

export interface Servidor {
  /** El botón como lo muestra el sitio. */
  boton: string;
  /** Trozos de host con los que se reconoce esta dirección. */
  hosts: string[];
  /** Cuántos botones tiene en el catálogo — para saber qué pesa y qué no. */
  botones: number;
  /** Si reproduce en el reproductor de la app (rayo) o en el navegador (mundo). */
  nativo: boolean;
  resolver: (url: string, referer: string) => Promise<ServidorResuelto | null>;
}

/** Ordenados por peso: primero los que más aparecen en el catálogo. */
export const SERVIDORES: Servidor[] = [
  {
    boton: 'FC',
    // videro.my: el 2026-09-27 cinco de cada seis títulos ya servían FC desde
    // ahí (un m3u8 abierto, sin cabeceras). Sin este host se quedaban sin
    // ficha y el botón FC no reproducía.
    hosts: ['rumble.cloud', 'files.eintim.me', '1a-1791.com', 'archive.org', 'videro.'],
    botones: 195,
    nativo: true,
    resolver: directo.resolver,
  },
  {
    boton: 'GS',
    hosts: ['gscdn', 'goodstream'],
    botones: 128,
    nativo: true,
    resolver: goodstream.resolver,
  },
  {
    boton: 'FS',
    hosts: ['firestream'],
    botones: 92,
    nativo: true,
    resolver: firestream.resolver,
  },
  {
    boton: 'OK.RU',
    hosts: ['ok.ru', 'okru'],
    botones: 55,
    nativo: true,
    resolver: okru.resolver,
  },
  {
    boton: 'Vimeo',
    hosts: ['vimeos'],
    botones: 49,
    nativo: true,
    resolver: vimeos.resolver,
  },
  {
    boton: 'DL',
    hosts: ['dropload', 'dr0pstream'],
    botones: 47,
    nativo: true,
    resolver: dropload.resolver,
  },
];

/** La ficha del servidor al que apunta esta dirección, o null si no es ninguno. */
export function fichaDe(url: string): Servidor | null {
  const u = url.toLowerCase();
  return SERVIDORES.find((s) => s.hosts.some((h) => u.indexOf(h) !== -1)) ?? null;
}

/**
 * Resuelve una dirección de servidor a algo que la app pueda abrir.
 *
 * Devuelve null cuando no se puede, y ahí la app prueba con otro servidor.
 */
export async function resolverServidor(
  url: string,
  referer: string,
): Promise<ServidorResuelto | null> {
  const ficha = fichaDe(url);
  if (ficha) return ficha.resolver(url, referer);
  // Un servidor que no está en la tabla: se prueba con el mismo camino que
  // goodstream —bajar y buscar— en vez de darlo por perdido. Si el sitio suma
  // uno nuevo, esto lo agarra igual, y el registro deja ver que hay que
  // agregarlo acá con su carpeta.
  console.log(`[fc] servidor sin ficha, se prueba a mano: ${url.slice(0, 60)}`);
  return goodstream.resolver(url, referer);
}

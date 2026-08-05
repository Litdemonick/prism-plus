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
import * as drive from './drive';
import * as dropload from './dropload';
import * as firestream from './firestream';
import * as goodstream from './goodstream';
import * as okru from './ok.ru';
import * as unlimplay from './unlimplay';
import * as upns from './upns';
import * as vimeos from './vimeos';

export { type ServidorResuelto } from './comun';
export { rutaAlDia as unlimplayAlDia, MARCA_MULTI as unlimplayMarcaMulti } from './unlimplay';

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
    boton: 'UA',
    hosts: ['unlimplay'],
    botones: 395,
    nativo: true,
    resolver: unlimplay.resolver,
  },
  {
    boton: 'US',
    hosts: ['upns'],
    botones: 241,
    nativo: false,
    resolver: upns.resolver,
  },
  {
    boton: 'FC',
    hosts: ['rumble.cloud', 'files.eintim.me', '1a-1791.com', 'archive.org'],
    botones: 195,
    nativo: true,
    resolver: directo.resolver,
  },
  {
    boton: 'Drive',
    hosts: ['drive.google.com'],
    botones: 139,
    nativo: false,
    resolver: drive.resolver,
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
 * Devuelve null cuando no se puede: ahí la app reintenta ESE mismo servidor con
 * su navegador interno, que ejecuta JS de verdad y a veces llega donde esto no.
 * Por eso un servidor que no resuelve igual se deja en la lista.
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

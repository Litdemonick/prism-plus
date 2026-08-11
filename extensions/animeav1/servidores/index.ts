// ─── Los servidores de animeav1 ──────────────────────────────────────────────
//
// Una carpeta por servidor, con su nombre. Cada una lleva su propio resolver y
// arriba de todo lo que se midió de ese servidor, para no volver a averiguarlo.
//
// **Por qué está copiado del SDK y no importado de él:** MP4Upload lo usan
// también hentaila, shademanga, latanime, animefenix y jkanime. Compartiendo el
// código, tocar uno para arreglar animeav1 podía romper cualquiera de esas sin
// que nadie se enterara hasta que un usuario lo reportara. Con la copia, lo que
// se toque acá se queda acá.
//
// **Cómo mantener esto:** la copia arranca IGUAL a la que funciona; no se
// retoca "por las dudas". Si un servidor falla en animeav1 se arregla ESTA
// copia y ninguna otra. Y si se arregla acá algo que también está en otra
// extensión, conviene avisarlo: la otra sigue con la versión vieja.
//
// El precio, asumido: cuando un servidor cambia de formato hay que arreglarlo
// en cada extensión por separado.
//
// ── El catálogo, medido el 2026-08-10 ────────────────────────────────────────
//
// Recorridos **100 títulos** de las cinco primeras páginas del catálogo. **Los
// cuatro servidores son siempre los mismos** y aparecen en todos los episodios:
// no hay servidores raros sueltos ni episodios con una lista distinta.
//
//   123  UPNShare   animeav1.uns.bio            ⚡ nativo
//   122  HLS        player.zilla-networks.com   ⚡ nativo   ← el que trae elegido el sitio
//   122  Mega       mega.nz                     🌐 navegador
//   122  MP4Upload  www.mp4upload.com           ⚡ nativo
//
// **Tres de cuatro reproducen en la app**, incluido el que el sitio deja
// seleccionado. De 99 títulos con servidores, uno solo se quedó sin lista, y no
// era del sitio: es una película con `number:0` y se estaba pidiendo el
// episodio 1, que no existe.
//
// ── Idiomas ──────────────────────────────────────────────────────────────────
//
// El bloque viene agrupado por idioma: `embeds:{DUB:[…],SUB:[…]}`, y **cada
// idioma trae sus propias direcciones** para los cuatro servidores. De 99
// títulos, 99 tienen SUB y **23 tienen DUB**. Un episodio con los dos trae 8
// botones, no 4. Ojo con deduplicar por nombre de servidor al leerlos: se
// perdería un idioma entero, que es exactamente lo que había pasado en
// FuegoCine.

import { type ServidorResuelto } from './comun';
import * as hls from './hls';
import * as mega from './mega';
import * as mp4upload from './mp4upload';
import * as upnshare from './upnshare';

export { type ServidorResuelto, UA_ESCRITORIO } from './comun';

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

/**
 * En el orden en el que se ofrecen: **los nativos primero y Mega al final**.
 *
 * La app toma el primero de la lista como el servidor inicial del episodio, así
 * que este orden decide con cuál arranca. HLS va primero porque es el que el
 * propio sitio deja seleccionado y el que más caudal dio (10 MB/s contra 0,3 de
 * UPNShare).
 */
export const SERVIDORES: Servidor[] = [
  {
    boton: 'HLS',
    hosts: ['zilla-networks'],
    botones: 122,
    nativo: true,
    resolver: hls.resolver,
  },
  {
    boton: 'UPNShare',
    hosts: ['uns.bio', 'upns.'],
    botones: 123,
    nativo: true,
    resolver: upnshare.resolver,
  },
  {
    boton: 'MP4Upload',
    hosts: ['mp4upload'],
    botones: 122,
    nativo: true,
    resolver: mp4upload.resolver,
  },
  {
    boton: 'Mega',
    hosts: ['mega.nz', 'mega.co.nz'],
    botones: 122,
    nativo: false,
    resolver: mega.resolver,
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
  // Un servidor que no está en la tabla. En los 100 títulos medidos no apareció
  // ninguno, así que si esto salta es que el sitio sumó uno nuevo: se deja
  // anotado en el registro para venir a agregarle su carpeta, y mientras tanto
  // la app se lo lleva a su navegador interno.
  console.log(`[av1] servidor desconocido, va al navegador: ${url.slice(0, 60)}`);
  return null;
}

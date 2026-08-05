// ─── Los servidores de latanime ──────────────────────────────────────────────
//
// Una carpeta por servidor, con su nombre. Cada una lleva su propio resolver y
// arriba de todo lo que se midió de ese servidor, para no volver a averiguarlo.
//
// **Por qué está copiado del SDK y no importado de él:** voe, mixdrop,
// mp4upload y byse los usan también otras extensiones. Compartiendo el código,
// tocar uno para arreglar latanime podía romper JKAnime o ShadeManga sin que
// nadie se enterara hasta que un usuario lo reportara. Con la copia, lo que se
// toque acá se queda acá.
//
// **Cómo mantener esto:** la copia arranca IGUAL a la que funciona; no se
// retoca "por las dudas". Si un servidor falla en latanime se arregla ESTA
// copia y ninguna otra. Y si se arregla acá algo que también está en otra
// extensión, conviene avisarlo: la otra sigue con la versión vieja.
//
// El precio, asumido: cuando un servidor cambia de formato hay que arreglarlo
// en cada extensión por separado.
//
// ── El catálogo, medido el 2026-08-04 ────────────────────────────────────────
//
// Recorridos 120 títulos, episodio 1 de cada uno. Solo uno se quedó sin
// servidores. Los ocho grandes están en casi todos los episodios; los tres de
// abajo aparecen sueltos.
//
//   119  Savefiles   savefiles.com          ⚡ nativo
//   119  Mixdrop     mixdrop.top            ⚡ nativo
//   118  Voe         voe.sx                 ⚡ nativo
//   117  Byse        bysekoze.com (96)      ⚡ nativo
//                    byse.sx (21)           🌐 su API no trae reproducción
//   117  Hexload     hexload.com            ⚡ nativo (el nodo es lotería)
//   115  Mega        mega.nz                🌐 cifra el archivo, no la dirección
//   115  Dsvplay     dsvplay.com            🌐 no resuelve por ningún camino
//   101  Mp4upload   www.mp4upload.com      ⚡ nativo
//     2  Uqload      uqload.is              ⚡ nativo
//     2  Savefiles   streamhls.to           🌐 el POST a /dl no trae fuentes
//     1  Puj         mojon.latanime.org     🌐 envoltorio del propio sitio
//
// **La etiqueta no sirve para decidir nada acá.** El sitio rotula algunos
// botones como "Ok" —se vieron 8, repartidos entre mixdrop, hexload, mega y
// dsvplay—, así que el mismo nombre cae en servidores distintos. Por eso la
// tabla va por host y no por nombre.
//
// ── La trampa que casi cuesta 96 botones ────────────────────────────────────
//
// La primera medición dio que **Byse no resolvía** y la conclusión iba a ser
// "el sitio cambió a una SPA, va al navegador". Era falso: `resolveByse` es el
// único del repo que usa `CryptoJS`, que no se importa —lo inyecta el runtime
// de PrismHub cuando el bundle menciona ese identificador (ver `sdk/crypto.ts`)—
// y en Node no existe. El descifrado moría con "CryptoJS is not defined" y
// parecía que el servidor estuviera roto.
//
// Cualquier banco de pruebas que toque byse tiene que darle el global a mano:
//
//     import CryptoJS from 'crypto-js';
//     globalThis.CryptoJS = CryptoJS;

import { type ServidorResuelto, pedir, hostDe, buscarDireccion } from './comun';
import * as byse from './byse';
import * as dsvplay from './dsvplay';
import * as hexload from './hexload';
import * as mega from './mega';
import * as mixdrop from './mixdrop';
import * as mojon from './mojon';
import * as mp4upload from './mp4upload';
import * as savefiles from './savefiles';
import * as uqload from './uqload';
import * as voe from './voe';

export { type ServidorResuelto } from './comun';

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
 * Ordenados por peso: primero los que más aparecen en el catálogo.
 *
 * **Salvo el envoltorio, que va primero de todo aunque sea el más chico.**
 * `fichaDe` busca el trozo de host en la dirección ENTERA, y la del envoltorio
 * lleva otra adentro (`…/aqua/fn?url=https://voe.sx/e/…`). Si Voe fuera antes,
 * se quedaría con el envoltorio y le pondría el rayo a algo que abre el
 * navegador. Medido: pasaba.
 *
 * Por lo mismo, ojo con el orden entre `savefiles.com` y `streamhls.to`, y
 * entre `bysekoze.com` y `byse.sx`: son el mismo resolver pero fichas
 * separadas, porque uno resuelve y el otro no. La más específica va ANTES.
 */
export const SERVIDORES: Servidor[] = [
  {
    boton: 'Puj',
    hosts: ['mojon.latanime.org'],
    botones: 1,
    nativo: false,
    resolver: mojon.resolver,
  },
  {
    boton: 'Savefiles',
    hosts: ['savefiles'],
    botones: 119,
    nativo: true,
    resolver: savefiles.resolver,
  },
  {
    boton: 'Mixdrop',
    hosts: ['mixdrop', 'mxdrop', 'xdrop'],
    botones: 119,
    nativo: true,
    resolver: mixdrop.resolver,
  },
  {
    boton: 'Voe',
    hosts: ['voe.sx', 'voe.'],
    botones: 118,
    nativo: true,
    resolver: voe.resolver,
  },
  {
    boton: 'Byse',
    hosts: ['bysekoze'],
    botones: 96,
    nativo: true,
    resolver: byse.resolver,
  },
  {
    // Mismo servicio y mismo resolver que el de arriba, pero este host contesta
    // sin datos de reproducción. Ficha aparte para que el icono no mienta.
    boton: 'Byse',
    hosts: ['byse.sx', 'byse.'],
    botones: 21,
    nativo: false,
    resolver: byse.resolver,
  },
  {
    boton: 'Hexload',
    hosts: ['hexload'],
    botones: 117,
    nativo: true,
    resolver: hexload.resolver,
  },
  {
    boton: 'Mega',
    hosts: ['mega.nz', 'mega.co.nz'],
    botones: 115,
    nativo: false,
    resolver: mega.resolver,
  },
  {
    boton: 'Dsvplay',
    hosts: ['dsvplay', 'playmogo', 'dooodster', 'dood'],
    botones: 115,
    nativo: false,
    resolver: dsvplay.resolver,
  },
  {
    boton: 'Mp4upload',
    hosts: ['mp4upload'],
    botones: 101,
    nativo: true,
    resolver: mp4upload.resolver,
  },
  {
    boton: 'Uqload',
    hosts: ['uqload'],
    botones: 2,
    nativo: true,
    resolver: uqload.resolver,
  },
  {
    // El mismo motor que savefiles, pero acá el POST vuelve sin fuentes.
    boton: 'Savefiles',
    hosts: ['streamhls'],
    botones: 2,
    nativo: false,
    resolver: savefiles.resolver,
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
  // Un servidor que no está en la tabla: se prueba bajando la página y
  // buscando, en vez de darlo por perdido. Si el sitio suma uno nuevo, esto lo
  // agarra igual, y el registro deja ver que hay que agregarlo acá con su
  // carpeta.
  console.log(`[la] servidor sin ficha, se prueba a mano: ${url.slice(0, 60)}`);
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : undefined);
}

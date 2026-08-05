// ─── Los servidores de jkanime ───────────────────────────────────────────────
//
// Una carpeta por servidor, con su nombre. Cada una lleva su propio resolver y
// arriba de todo lo que se midió de ese servidor, para no volver a averiguarlo.
//
// **Por qué está copiado del SDK y no importado de él:** streamtape, mixdrop y
// byse los usan también otras extensiones. Compartiendo el código, tocar uno
// para arreglar jkanime podía romper LatAnime o AnimeFenix sin que nadie se
// enterara hasta que un usuario lo reportara. Con la copia, lo que se toque acá
// se queda acá — y, sobre todo, lo que se toque en el SDK ya no puede romper
// esto.
//
// **Esta extensión es la que más reproduce en la app de todo el repo**: de once
// servidores, nueve resuelven nativo. Por eso la copia arrancó IGUAL a lo que
// funcionaba y no se retocó nada "por las dudas": la mayor parte de estos
// resolvers ya eran propios de la extensión y solo se mudaron de archivo.
//
// El precio, asumido: cuando un servidor cambia de formato hay que arreglarlo
// en cada extensión por separado.
//
// ── El catálogo, medido el 2026-08-05 ────────────────────────────────────────
//
// Recorridos 59 episodios para el peso, y 3 episodios completos servidor por
// servidor para saber cuáles reproducen.
//
//    59  Desu        nika.playmudos.com   ⚡ ya resuelto en la lista, y primero
//    59  Magi        nika.playmudos.com   ⚡ mismo archivo que Desu
//    59  Streamtape  streamtape.com       ⚡ 3/3 resuelve · 2/3 abre
//    59  Mega        mega.nz              🌐 cifra el archivo, no la dirección
//    59  Streamwish  sfastwish.com        ⚡ 3/3
//    59  VOE         voe.sx               ⚡ 3/3
//    59  Vidhide     vidhidevip.com       ⚡ 3/3
//    59  Mixdrop     mixdrop.top          ⚡ 3/3
//    58  Filemoon    bysekoze.com         ⚡ 2/2
//    55  Doodstream  dsvplay.com          🌐 0/2, no entrega la dirección
//    48  Mp4upload   www.mp4upload.com    ⚡ 1/1
//
// Cada servidor aparece dos veces por episodio en la mayoría: una en SUB y otra
// en LAT ("VOE" y "VOE LAT"), por eso los botones que ve el usuario son más.
//
// **Mediafire ya no está.** Aparecía en 59 episodios y hasta resolvía, pero se
// sacó a pedido del usuario: no es un servidor de vídeo sino alojamiento de
// archivos, y además reportó que cuando abre se ve mal. El filtro está en
// `index.ts` de la extensión.
//
// ── Tres trampas al medir esta extensión ────────────────────────────────────
//
// Las tres dieron falsos negativos, y las tres habrían hecho escribir que algo
// está roto cuando no lo está:
//
// 1. **Sin cookies, la extensión parece muerta.** Los episodios se piden con un
//    POST a `/ajax/episodes/` mandando el csrf-token de la página, y Laravel
//    exige que ese token viaje con la cookie de sesión de la MISMA visita. Sin
//    ella el sitio contesta "Page Expired", el JSON.parse falla y la lista de
//    episodios queda VACÍA — 0 de 60 títulos. El dio de PrismHub guarda cookies
//    solo; el fetch de Node no. Cualquier banco de pruebas de jkanime necesita
//    su bolsa de cookies.
//
// 2. **Desu y Magi vienen YA RESUELTOS** en la lista del episodio, a diferencia
//    del resto, que llegan crudos. Volver a pasarlos por `watch()` da null y
//    parece que el servidor principal no funcionara. Hay que abrir la dirección
//    tal cual viene.
//
// 3. **Filemoon necesita `CryptoJS`**, que el runtime inyecta y en Node no
//    existe. Sin dárselo a mano, muere con "CryptoJS is not defined".

import { type ServidorResuelto, pedir, hostDe, resolverReproductorPropio } from './comun';
import * as desu from './desu';
import * as doodstream from './doodstream';
import * as filemoon from './filemoon';
import * as generico from './generico';
import * as magi from './magi';
import * as mega from './mega';
import * as mixdrop from './mixdrop';
import * as mp4upload from './mp4upload';
import * as streamtape from './streamtape';
import * as streamwish from './streamwish';
import * as vidhide from './vidhide';
import * as voe from './voe';

export { type ServidorResuelto } from './comun';
export { resolverReproductorPropio } from './comun';

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
 * Desu y Magi comparten host (`nika.playmudos.com`) y no se distinguen por la
 * dirección, así que sus fichas están para el formato viejo, con el nombre en
 * el path (`/desu/`, `/magi/`). En la lista del episodio los dos salen del
 * reproductor propio y ya vienen resueltos, así que no pasan por `fichaDe`.
 */
export const SERVIDORES: Servidor[] = [
  {
    boton: 'Desu',
    hosts: ['/desu', 'desudesuka'],
    botones: 59,
    nativo: true,
    resolver: desu.resolver,
  },
  {
    boton: 'Magi',
    hosts: ['/magi'],
    botones: 59,
    nativo: true,
    resolver: magi.resolver,
  },
  {
    boton: 'Streamtape',
    hosts: ['streamtape', 'stape', 'strtape'],
    botones: 59,
    nativo: true,
    resolver: streamtape.resolver,
  },
  {
    boton: 'Mega',
    hosts: ['mega.nz', 'mega.co.nz'],
    botones: 59,
    nativo: false,
    resolver: mega.resolver,
  },
  {
    boton: 'Streamwish',
    hosts: ['sfastwish', 'streamwish', 'wishfast', 'swdyu'],
    botones: 59,
    nativo: true,
    resolver: streamwish.resolver,
  },
  {
    boton: 'VOE',
    hosts: ['voe.sx', 'voe.'],
    botones: 59,
    nativo: true,
    resolver: voe.resolver,
  },
  {
    boton: 'Vidhide',
    hosts: ['vidhide', 'vhide'],
    botones: 59,
    nativo: true,
    resolver: vidhide.resolver,
  },
  {
    boton: 'Mixdrop',
    hosts: ['mixdrop', 'mxdrop', 'xdrop'],
    botones: 59,
    nativo: true,
    resolver: mixdrop.resolver,
  },
  {
    boton: 'Filemoon',
    hosts: ['bysekoze', 'byse.', 'filemoon', 'moonplayer'],
    botones: 58,
    nativo: true,
    resolver: filemoon.resolver,
  },
  {
    boton: 'Doodstream',
    hosts: ['dsvplay', 'playmogo', 'dooodster', 'dood'],
    botones: 55,
    nativo: false,
    resolver: doodstream.resolver,
  },
  {
    boton: 'Mp4upload',
    hosts: ['mp4upload'],
    botones: 48,
    nativo: true,
    resolver: mp4upload.resolver,
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
  // Un servidor que no está en la tabla: lo intenta el genérico en vez de darlo
  // por perdido. Si el sitio suma uno nuevo, esto lo agarra igual, y el
  // registro deja ver que hay que agregarlo acá con su carpeta.
  console.log(`[jk] servidor sin ficha, se prueba a mano: ${url.slice(0, 60)}`);
  return generico.resolver(url, referer);
}

/** Para que el genérico y los ayudantes queden accesibles desde la extensión. */
export { pedir, hostDe };

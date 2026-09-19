// ─── Los servidores de jkanime ───────────────────────────────────────────────
//
// Una carpeta por servidor, con su nombre. Cada una lleva su propio resolver y
// arriba de todo lo que se midió de ese servidor, para no volver a averiguarlo.
//
// **Por qué está copiado del SDK y no importado de él:** streamwish también lo
// usan otras extensiones. Compartiendo el código, tocar uno para arreglar
// jkanime podía romper LatAnime o AnimeFenix sin que nadie se enterara hasta
// que un usuario lo reportara. Con la copia, lo que se toque acá se queda
// acá — y, sobre todo, lo que se toque en el SDK ya no puede romper esto.
//
// **Solo quedan los servidores activos, a pedido explícito (2026-09-18):**
// Desu, Magi, Streamwish, VOE, Vidhide y Filemoon. Los demás botones que
// todavía manda el sitio (Doodstream, Mixdrop, Mp4upload, Streamtape, Mega,
// Mediafire) no se ofrecen: `watch()` en `index.ts` solo deja pasar a estos
// seis. Sus resolvers se borraron de acá — si algún día alguno vuelve a
// andar, está en el historial de git, no hace falta reescribirlo de cero.
//
// El precio asumido de la copia sigue igual: cuando un servidor cambia de
// formato hay que arreglarlo en cada extensión por separado.
//
// ── El catálogo activo, medido el 2026-08-05 ─────────────────────────────────
//
// Recorridos 59 episodios para el peso, y 3 episodios completos servidor por
// servidor para saber cuáles reproducen. Solo los seis que quedaron:
//
//    59  Desu        nika.playmudos.com   ⚡ ya resuelto en la lista, y primero
//    59  Magi        nika.playmudos.com   ⚡ mismo archivo que Desu
//    59  Streamwish  sfastwish.com        ⚡ 3/3
//    59  VOE         voe.sx               ⚡ 3/3
//    59  Vidhide     vidhidevip.com       ⚡ 3/3
//    58  Filemoon    bysekoze.com         ⚡ 2/2
//
// Cada servidor aparece dos veces por episodio en la mayoría: una en SUB y otra
// en LAT ("VOE" y "VOE LAT"), por eso los botones que ve el usuario son más.
//
// **Mediafire, Streamtape, Mega, Mixdrop, Doodstream y Mp4upload ya no
// están** — `watch()`, en `index.ts` de la extensión, solo deja pasar a los
// seis de la lista de arriba.
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
import * as filemoon from './filemoon';
import * as generico from './generico';
import * as magi from './magi';
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
    boton: 'Filemoon',
    hosts: ['bysekoze', 'byse.', 'filemoon', 'moonplayer'],
    botones: 58,
    nativo: true,
    resolver: filemoon.resolver,
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

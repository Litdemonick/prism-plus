// ─── Los servidores de LaMovie ───────────────────────────────────────────────
//
// Una carpeta por servidor, con su nombre. Cada una lleva su propio resolver y
// arriba de todo lo que se midió de ese servidor, para no volver a averiguarlo.
//
// **Por qué está copiado y no importado:** vimeos, goodstream y voe los usan
// también otras extensiones de este repo. Compartiendo el código, tocar uno
// para arreglar LaMovie podía romper FuegoCine sin que nadie se enterara hasta
// que un usuario lo reportara. Con la copia, lo que se toque acá se queda acá.
//
// **Cómo mantener esto:** la copia arranca IGUAL a la que funciona; no se
// retoca "por las dudas". Si un servidor falla en LaMovie se arregla ESTA copia
// y ninguna otra. Y si se arregla acá algo que también está en otra extensión,
// conviene avisarlo: la otra sigue con la versión vieja.
//
// El precio, asumido: cuando un servidor cambia de formato hay que arreglarlo
// en cada extensión por separado.
//
// ── Lo que se midió, el 2026-08-06 ───────────────────────────────────────────
//
// **27 servidores en 12 títulos** (películas, series y animes), y de cada uno
// no se miró si "resolvía": se le bajó un pedazo de vídeo de verdad. Resolver y
// reproducir no son lo mismo, y marcar ⚡ algo que después no abre es peor que
// dejarlo en 🌐.
//
//   LaMovie / Online   9/9   ⚡   vimeos, el reproductor propio del sitio
//   GoodstreamOne      8/8   ⚡
//   Voe                     ⚡   ver abajo: el banco se equivocaba
//   Doodstream         0/7   🌐   ver la nota de su carpeta
//
// ── Voe: el banco decía 0/9 y anda ───────────────────────────────────────────
//
// El banco de Node daba "sin dirección en la página" en los 9. En la app,
// probado en vivo el 2026-08-06, el mismo resolver saca el m3u8 y reproduce:
//
//   switchServer: Voe → https://voe.sx/e/jze0ie1ocqf4
//   lista MAESTRA con 1 calidad · 692 pedacitos · va directo a mpv
//
// O sea que la página que Voe le devuelve a Node NO es la que le devuelve a la
// app. Es la segunda vez que pasa lo mismo en esta extensión: el banco es una
// aproximación, y cuando dice que no y la app dice que sí, **manda la app**.
//
// ── La corrección importante ─────────────────────────────────────────────────
//
// La versión anterior de esta extensión devolvía los embeds CRUDOS, sin
// resolver, y lo explicaba así: «el m3u8 que sale de resolverlos responde 403 a
// CUALQUIER cliente que no sea un navegador de verdad — probado con y sin
// User-Agent de browser».
//
// **Eso es falso, y por eso la extensión estaba marcada como inestable.** Con
// User-Agent de navegador y el Referer del propio host, el master responde 200
// y el primer segmento baja 2 MB de vídeo. Se midió sobre los 12 títulos de
// arriba, no sobre uno.
//
// La trampa es la de siempre en este repo: un banco que pide sin User-Agent de
// navegador ve 403 en todos lados y hace concluir que el servidor bloquea. El
// que bloqueaba era el banco. Por eso `comun.ts` manda `UA_NAVEGADOR` siempre y
// no como opción.

import { type ServidorResuelto } from './comun';
import * as doodstream from './doodstream';
import * as goodstream from './goodstream';
import * as vimeos from './vimeos';
import * as voe from './voe';

export { type ServidorResuelto } from './comun';

export interface Servidor {
  /** El nombre que ve el usuario en el selector de servidores.
   *
   *  **No es el que publica la API**, y es a propósito: el sitio llama al mismo
   *  servidor "Online" en unos títulos y "LaMovie" en otros, así que en la lista
   *  aparecían dos nombres para lo mismo y ninguno decía qué era. Acá va el
   *  nombre real del servicio. */
  boton: string;
  /** Trozos de host con los que se reconoce esta dirección. */
  hosts: string[];
  /** Cuántas veces salió bien sobre cuántas se probó. */
  medido: string;
  /** Si reproduce en el reproductor de la app (rayo) o en el navegador (mundo). */
  nativo: boolean;
  resolver: (url: string, referer: string) => Promise<ServidorResuelto | null>;
}

/** Ordenados por lo que rinden: primero los que reproducen en la app. */
export const SERVIDORES: Servidor[] = [
  {
    boton: 'Vimeos',
    hosts: ['vimeos'],
    medido: '9/9',
    nativo: true,
    resolver: vimeos.resolver,
  },
  {
    boton: 'GoodstreamOne',
    hosts: ['goodstream'],
    medido: '8/8',
    nativo: true,
    resolver: goodstream.resolver,
  },
  {
    boton: 'Voe',
    hosts: ['voe.sx', 'voe.', 'voedelivery', 'jonathansociallike', 'brookethoughi'],
    medido: 'anda en la app',
    nativo: true,
    resolver: voe.resolver,
  },
  {
    boton: 'Doodstream',
    hosts: ['doodstream', 'dood.', 'd000d', 'dooood'],
    medido: '0/7',
    nativo: false,
    resolver: doodstream.resolver,
  },
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
 * Devuelve `null` cuando no hay nada que resolver, y eso NO es un error: la app
 * cae sola al navegador interno, que es lo correcto para Voe y Doodstream.
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
    // Que un servidor falle no puede tumbar a los demás: se anota y se sigue.
    console.log(`[lamovie/${s.boton}] no se pudo resolver: ${e}`);
    return null;
  }
}

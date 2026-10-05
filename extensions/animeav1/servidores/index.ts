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
// ── Medido el 2026-10-04, por rangos ─────────────────────────────────────────
//
// Recién subidos y por años (2015-2019, 2010-2014, 2000-2009): tres títulos por
// rango, primer y último episodio, cada servidor resuelto y con el vídeo
// pedido de verdad. Y con la libmpv de la app, hasta la primera imagen:
//
//   Voe        34/34   720p    5,7 s   no falló en ningún rango
//   MP4Upload  21-28/30 1080p  3,1 s   a veces ni conecta: SACADO (ver abajo)
//   Byse       22/34   1080p   7,4 s   0/12 en lo recién subido: el vídeo sigue
//                                      «codificando» en Byse (ver byse/estaListo)
//   UPNShare   24/34   1080p   11 s    ~30 % de sus nodos no contestan
//
// HLS (player.zilla-networks.com), que era el primero y el que el sitio traía
// elegido, ya no lo publica en ningún episodio: se sacó de la tabla.
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
import * as byse from './byse';
import * as upnshare from './upnshare';
import * as voe from './voe';

export { type ServidorResuelto, UA_ESCRITORIO } from './comun';
export { estaListo as byseEstaListo } from './byse';

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
 * En el orden en el que se ofrecen (ver la medición de arriba).
 *
 * La app abre el PRIMERO sola y no cambia de servidor por su cuenta, así que
 * el primero tiene que ser el que no falla: Voe (34 de 34), aunque dé 720p.
 * Después Byse (solo si ya terminó de codificar el vídeo) y UPNShare (1080p;
 * en la app arranca en ~5 s por el relay).
 *
 * MP4Upload se sacó (2026-10-04): cuando anda da 1080p en 3 s, pero a veces
 * su servidor de vídeo (puerto 183) ni acepta la conexión — 21 a 28 de 30 en
 * las mediciones y 0 de 2 en vivo en PC. Un botón que a veces no abre no se
 * ofrece; Byse y UPNShare ya cubren el 1080p.
 */
export const SERVIDORES: Servidor[] = [
  {
    boton: 'Voe',
    hosts: ['voe.sx', 'voe.'],
    botones: 34,
    nativo: true,
    resolver: voe.resolver,
  },
  // Byse cambia de dominio (bysekoze, byselapuix…): se lo reconoce por el
  // prefijo.
  {
    boton: 'Byse',
    hosts: ['//byse'],
    botones: 34,
    nativo: true,
    resolver: byse.resolver,
  },
  {
    boton: 'UPNShare',
    hosts: ['uns.bio', 'upns.'],
    botones: 34,
    nativo: true,
    resolver: upnshare.resolver,
  },
];

/** El lugar de un servidor en la tabla (los que no están, al final). */
export function ordenDe(url: string): number {
  const f = fichaDe(url);
  return f ? SERVIDORES.indexOf(f) : SERVIDORES.length;
}

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
  // Un servidor que no está en la tabla: el sitio sumó uno nuevo. Se deja
  // anotado en el registro para venir a agregarle su carpeta.
  console.log(`[av1] servidor desconocido, sin resolver: ${url.slice(0, 60)}`);
  return null;
}

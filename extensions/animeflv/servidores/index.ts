// ─── Los servidores de AnimeFLV (animeflv.or.at) ─────────────────────────────
//
// Copia de los de AnimeAV1 (misma regla del repo: cada extensión lleva su
// propia copia, así arreglar una no rompe otra). AnimeFLV usa el MISMO
// UPNShare que AnimeAV1 (`animeav1.uns.bio`), más Voe, Byse y MP4Upload.
// No usa el HLS de zilla-networks, así que esa carpeta no se copió.
//
// Cada episodio trae los servidores como botones con la dirección en base64
// (`data-src`), y el idioma en `app_type` (Sub, Latino).
//
// El orden de la tabla es el orden en que se ofrecen: la app arranca con el
// primero. Se decidió midiendo en vivo cuál resuelve y cuál baja más rápido
// (ver la medición al pie de la tabla).

import { type ServidorResuelto } from './comun';
import * as byse from './byse';
import * as mp4upload from './mp4upload';
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
  /** Posición en la tabla (0 = el mejor): se ofrece en ese orden. */
  orden: number;
}

/**
 * En el orden en el que se ofrecen. Todos reproducen en la app: Mega se sacó
 * el 2026-09-27, porque sin el navegador interno no tiene forma de reproducir.
 *
 * La app toma el primero de la lista como el servidor inicial del episodio, así
 * que este orden decide con cuál arranca. Medido el 2026-09-27 sobre 5 episodios
 * recientes (primer segmento de vídeo bajado entero):
 * - Byse: resuelve en ~0,35 s y baja a ~3,9 MB/s (mediana), 4/4.
 * - Voe: resuelve en ~0,8 s y baja a ~1,6 MB/s, 5/5.
 * - UPNShare: resuelve rápido pero baja a ~23 KB/s: se corta al verlo.
 * - MP4Upload: un solo archivo, 17-373 KB/s y un tiempo de espera en 8.
 *
 * Remedido el 2026-10-05 (12 obras recientes + el catálogo por páginas), y el
 * orden cambió: Voe primero.
 * - Byse: 3/12 en lo reciente. El resto todavía codificaba en el sitio y no
 *   abría; la app arrancaba justo en ese. Ahora se esconde mientras codifica
 *   (ver byse/estaListo) y va segundo.
 * - Voe: 12/12, el más parejo.
 * - UPNShare: en 2 de cada 3 episodios recientes anuncia un 1080p que no
 *   tiene; se abre directo en la calidad real (ver upnshare).
 * - MP4Upload: 0,13-0,57 MB/s y 2 de 8 sin conectar. Se queda al final porque
 *   en lo más viejo del catálogo solo están UPNShare y él.
 */
export const SERVIDORES: Servidor[] = [
  {
    boton: 'Voe',
    hosts: ['voe.sx', 'voe.'],
    botones: 0,
    nativo: true,
    resolver: voe.resolver,
    orden: 0,
  },
  {
    boton: 'Byse',
    hosts: ['//byse'],
    botones: 0,
    nativo: true,
    resolver: byse.resolver,
    orden: 1,
  },
  {
    boton: 'UPNShare',
    hosts: ['uns.bio', 'upns.'],
    botones: 0,
    nativo: true,
    resolver: upnshare.resolver,
    orden: 2,
  },
  {
    boton: 'MP4Upload',
    hosts: ['mp4upload'],
    botones: 0,
    nativo: true,
    resolver: mp4upload.resolver,
    orden: 3,
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
  // Un servidor que no está en la tabla: el sitio sumó uno nuevo. Se deja
  // anotado en el registro para venir a agregarle su carpeta.
  console.log(`[flv] servidor desconocido, sin resolver: ${url.slice(0, 60)}`);
  return null;
}

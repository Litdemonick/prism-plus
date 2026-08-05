// ─── Los servidores de hentaila ──────────────────────────────────────────────
//
// Una carpeta por servidor, con su nombre. Cada una lleva su propio resolver y
// arriba de todo lo que se midió de ese servidor, para no volver a averiguarlo.
//
// **Por qué está copiado del SDK y no importado de él:** varios de estos
// servidores (voe, mp4upload, el genérico) los usan también otras extensiones.
// Compartiendo el código, tocar uno para arreglar hentaila podía romper
// LatAnime o TioAnime sin que nadie se enterara hasta que un usuario lo
// reportara. Con la copia, lo que se toque acá se queda acá.
//
// **Cómo mantener esto:** la copia arranca IGUAL a la que funciona; no se
// retoca "por las dudas". Si un servidor falla en hentaila se arregla ESTA
// copia y ninguna otra. Y si se arregla acá algo que también está en otra
// extensión, conviene avisarlo: la otra sigue con la versión vieja.
//
// El precio, asumido: cuando un servidor cambia de formato hay que arreglarlo
// en cada extensión por separado.
//
// ── El catálogo, medido el 2026-08-04 ────────────────────────────────────────
//
// Recorridos 200 títulos del catálogo, episodio 1 de cada uno (la dirección del
// episodio se arma con la de la ficha, `/media/{slug}/1`, así que sale con un
// pedido por título). **Ningún episodio se quedó sin servidores.**
//
//   200  YourUpload  www.yourupload.com   ⚡ nativo
//   200  VIP         cdn.hvidserv.com     🌐 navegador
//   200  Voe         voe.sx               ⚡ nativo
//   199  VidHide     ryderjet.com         ⚡ nativo
//   196  MP4Upload   www.mp4upload.com    ⚡ nativo
//   188  Netu        hqq.ac               🌐 navegador
//    50  StreamWish  ghbrisk.com          🌐 navegador
//
// Los siete son fijos: no hay episodios con servidores raros sueltos, la lista
// es siempre la misma y solo cambia cuáles están.
//
// ── Las dos dudas que traía esto, ya medidas ─────────────────────────────────
//
// `ghbrisk.com` y `ryderjet.com` no estaban en la lista de hosts del enrutador
// del SDK, así que caían al genérico en vez de ir a `resolveStreamwish`, y
// quedaba pendiente ver si enrutarlos bien los mejoraba. **No.** Ryderjet ya
// sacaba la dirección correcta por el genérico (los dos caminos dan la misma,
// comprobado sobre dos episodios) y ghbrisk termina en premilkyway.com por
// cualquier camino, que está descartado desde antes por la huella TLS. El
// detalle está en la carpeta de cada uno.

import { type ServidorResuelto } from './comun';
import * as mp4upload from './mp4upload';
import * as netu from './netu';
import * as streamwish from './streamwish';
import * as vidhide from './vidhide';
import * as vip from './vip';
import * as voe from './voe';
import * as yourupload from './yourupload';

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

/** Ordenados por peso: primero los que más aparecen en el catálogo. */
export const SERVIDORES: Servidor[] = [
  {
    boton: 'YourUpload',
    hosts: ['yourupload', 'yupload'],
    botones: 200,
    nativo: true,
    resolver: yourupload.resolver,
  },
  {
    boton: 'VIP',
    hosts: ['hvidserv'],
    botones: 200,
    nativo: false,
    resolver: vip.resolver,
  },
  {
    boton: 'Voe',
    hosts: ['voe.sx', 'voe.'],
    botones: 200,
    nativo: true,
    resolver: voe.resolver,
  },
  {
    boton: 'VidHide',
    hosts: ['ryderjet', 'vidhide', 'vhide'],
    botones: 199,
    nativo: true,
    resolver: vidhide.resolver,
  },
  {
    boton: 'MP4Upload',
    hosts: ['mp4upload'],
    botones: 196,
    nativo: true,
    resolver: mp4upload.resolver,
  },
  {
    boton: 'Netu',
    hosts: ['hqq', 'netu'],
    botones: 188,
    nativo: false,
    resolver: netu.resolver,
  },
  {
    boton: 'StreamWish',
    hosts: ['ghbrisk', 'streamwish', 'wishfast'],
    botones: 50,
    nativo: false,
    resolver: streamwish.resolver,
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
  // VidHide —bajar y buscar— en vez de darlo por perdido. Si el sitio suma uno
  // nuevo, esto lo agarra igual, y el registro deja ver que hay que agregarlo
  // acá con su carpeta.
  console.log(`[ht] servidor sin ficha, se prueba a mano: ${url.slice(0, 60)}`);
  return vidhide.resolver(url, referer);
}

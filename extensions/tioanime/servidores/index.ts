// ─── Los servidores de tioanime ──────────────────────────────────────────────
//
// Una carpeta por servidor, con su nombre. Cada una lleva su propio resolver y
// arriba de todo lo que se midió de ese servidor, para no volver a averiguarlo.
//
// **Por qué está copiado del SDK y no importado de él:** voe y yourupload los
// usan también otras extensiones. Compartiendo el código, tocar uno para
// arreglar tioanime podía romper HentaiLA o LatAnime sin que nadie se enterara
// hasta que un usuario lo reportara. Con la copia, lo que se toque acá se queda
// acá.
//
// **Cómo mantener esto:** la copia arranca IGUAL a la que funciona; no se
// retoca "por las dudas". Si un servidor falla en tioanime se arregla ESTA
// copia y ninguna otra. Y si se arregla acá algo que también está en otra
// extensión, conviene avisarlo: la otra sigue con la versión vieja.
//
// El precio, asumido: cuando un servidor cambia de formato hay que arreglarlo
// en cada extensión por separado.
//
// ── El catálogo, medido el 2026-08-04 ────────────────────────────────────────
//
// Recorridos 80 títulos, episodio 1 de cada uno. **La lista es siempre la
// misma, exactamente estos tres, en todos los episodios:**
//
//   80  Voe         voe.sx               ⚡ nativo
//   80  YourUpload  www.yourupload.com   ⚡ nativo
//   40  Mega        mega.nz              🌐 navegador
//
// (Mega figura 40 porque se contó aparte, sobre la lista CRUDA del sitio: hasta
// ahora la extensión lo ocultaba y no llegaba a la cuenta. Está en el 100% de
// los episodios, igual que los otros dos.)
//
// Son tres y nada más. No hay episodios con servidores raros sueltos.
//
// ── Lo que cambió acá, y por qué ────────────────────────────────────────────
//
// **Mega vuelve a la lista.** Estaba en un `_NEVER_NATIVE` que lo sacaba, para
// no ofrecer algo que el reproductor nativo no puede abrir. Pero con solo tres
// servidores, ocultar uno deja dos — y de 6 episodios sueltos, en uno fallaron
// los dos (`nige-jouzu-no-wakagimi-2nd-season-1`). Ese episodio quedaba muerto
// teniendo un Mega que el navegador interno reproduce bien. El detalle está en
// su carpeta.
//
// La otra mitad de ese `_NEVER_NATIVE` era `netu` (hqq.tv en este sitio).
// **Hoy el sitio ya no lo sirve**: no apareció en ninguno de los 40 episodios
// cuya lista cruda se revisó. Si volviera, lo que se midió en hentaila es que
// no resuelve y que el genérico saca una dirección muerta (token vencido en
// 2020 y atado a una IP ajena), así que iría con el mundo.

import { type ServidorResuelto, pedir, hostDe, buscarDireccion } from './comun';
import * as mega from './mega';
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
    boton: 'Voe',
    hosts: ['voe.sx', 'voe.'],
    botones: 80,
    nativo: true,
    resolver: voe.resolver,
  },
  {
    boton: 'YourUpload',
    hosts: ['yourupload', 'yupload'],
    botones: 80,
    nativo: true,
    resolver: yourupload.resolver,
  },
  {
    boton: 'Mega',
    hosts: ['mega.nz', 'mega.co.nz'],
    botones: 80,
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
  // Un servidor que no está en la tabla: se prueba bajando la página y
  // buscando, en vez de darlo por perdido. Si el sitio suma uno nuevo, esto lo
  // agarra igual, y el registro deja ver que hay que agregarlo acá con su
  // carpeta.
  console.log(`[ta] servidor sin ficha, se prueba a mano: ${url.slice(0, 60)}`);
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : undefined);
}

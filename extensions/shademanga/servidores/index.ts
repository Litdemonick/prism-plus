// ─── Los servidores de shademanga ────────────────────────────────────────────
//
// Una carpeta por servidor, con su nombre. Cada una lleva su propio resolver y
// arriba de todo lo que se midió de ese servidor, para no volver a averiguarlo.
//
// Esto es solo para la mitad de ANIME del sitio. La de manga no tiene
// servidores: son imágenes y se leen directo.
//
// **Por qué está copiado del SDK y no importado de él:** mp4upload, yourupload
// y mixdrop los usan también otras extensiones. Compartiendo el código, tocar
// uno para arreglar shademanga podía romper LatAnime o JKAnime sin que nadie se
// enterara hasta que un usuario lo reportara. Con la copia, lo que se toque acá
// se queda acá.
//
// **Cómo mantener esto:** la copia arranca IGUAL a la que funciona; no se
// retoca "por las dudas". Si un servidor falla en shademanga se arregla ESTA
// copia y ninguna otra. Y si se arregla acá algo que también está en otra
// extensión, conviene avisarlo: la otra sigue con la versión vieja.
//
// El precio, asumido: cuando un servidor cambia de formato hay que arreglarlo
// en cada extensión por separado.
//
// ── El catálogo, medido el 2026-08-04 ────────────────────────────────────────
//
//   ~96  Mp4upload   www.mp4upload.com + mp4upload.com   ⚡ nativo
//   ~46  HD          player.zilla-networks.com           🌐 navegador
//   ~31  YourUpload  www.yourupload.com                  ⚡ nativo
//   ~20  filemoon    bysesukior.com                      🌐 navegador
//   ~19  doodstream  dooodster.com                       🌐 navegador
//   ~19  mixdrop     mixdrop.ps                          ⚡ nativo
//   ~19  filelions   filelions.top                       🌐 el host no responde
//
// Van con "~" a propósito: son de un recorrido de 48 fichas de anime, no del
// catálogo entero. Lo que importa acá es el orden de peso y cuáles hay, y eso
// se repitió igual en dos corridas.
//
// **Trampa al medir esto, que costó un rato:** pidiendo de a varios en paralelo
// el sitio devuelve fichas con `episodes: []`, y parece que el catálogo estuviera
// vacío. De a 5 daban 105 de 144 fichas sin episodios; **de a 1, 10 de 48**. No
// era la extensión: eran los pedidos pisándose. Cualquier medición de este sitio
// va secuencial.
//
// ── Lo que resuelve y lo que no ─────────────────────────────────────────────
//
// Tres de los siete reproducen en la app y llegan al ~146 de los botones. De
// los otros cuatro, ninguno es cosa del enrutado: se probaron uno por uno con
// el resolver que les correspondía por familia y ninguno saca la dirección
// —está anotado en cada carpeta—. El de filelions es el más claro: el dominio
// ni siquiera contesta.

import { type ServidorResuelto, pedir, hostDe, buscarDireccion } from './comun';
import * as doodstream from './doodstream';
import * as filelions from './filelions';
import * as filemoon from './filemoon';
import * as hd from './hd';
import * as mixdrop from './mixdrop';
import * as mp4upload from './mp4upload';
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
    boton: 'Mp4upload',
    hosts: ['mp4upload'],
    botones: 96,
    nativo: true,
    resolver: mp4upload.resolver,
  },
  {
    boton: 'HD',
    hosts: ['zilla-networks'],
    botones: 46,
    nativo: false,
    resolver: hd.resolver,
  },
  {
    boton: 'YourUpload',
    hosts: ['yourupload', 'yupload'],
    botones: 31,
    nativo: true,
    resolver: yourupload.resolver,
  },
  {
    boton: 'filemoon',
    hosts: ['bysesukior', 'byse.', 'bysekoze'],
    botones: 20,
    nativo: false,
    resolver: filemoon.resolver,
  },
  {
    // Tres oes, no dos — ver la carpeta. `playmogo` va acá porque es a donde
    // redirige, para que la ficha lo siga reconociendo si el sitio lo cambia.
    boton: 'doodstream',
    hosts: ['dooodster', 'playmogo', 'dood'],
    botones: 19,
    nativo: false,
    resolver: doodstream.resolver,
  },
  {
    boton: 'mixdrop',
    hosts: ['mixdrop', 'mxdrop', 'xdrop'],
    botones: 19,
    nativo: true,
    resolver: mixdrop.resolver,
  },
  {
    boton: 'filelions',
    hosts: ['filelions'],
    botones: 19,
    nativo: false,
    resolver: filelions.resolver,
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
  console.log(`[sm] servidor sin ficha, se prueba a mano: ${url.slice(0, 60)}`);
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : undefined);
}

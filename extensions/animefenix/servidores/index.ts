// ─── Los servidores de animefenix ────────────────────────────────────────────
//
// Una carpeta por servidor, con su nombre. Cada una lleva su propio resolver y
// arriba de todo lo que se midió de ese servidor, para no volver a averiguarlo.
//
// **Por qué está copiado del SDK y no importado de él:** voe, mp4upload,
// streamtape y mixdrop los usan también otras extensiones. Compartiendo el
// código, tocar uno para arreglar animefenix podía romper JKAnime o LatAnime
// sin que nadie se enterara hasta que un usuario lo reportara. Con la copia, lo
// que se toque acá se queda acá.
//
// **Cómo mantener esto:** la copia arranca IGUAL a la que funciona; no se
// retoca "por las dudas". Si un servidor falla en animefenix se arregla ESTA
// copia y ninguna otra. Y si se arregla acá algo que también está en otra
// extensión, conviene avisarlo: la otra sigue con la versión vieja.
//
// El precio, asumido: cuando un servidor cambia de formato hay que arreglarlo
// en cada extensión por separado.
//
// ── El catálogo, medido el 2026-08-04 ────────────────────────────────────────
//
// Recorridos 60 episodios, leyendo la lista CRUDA del sitio —o sea, incluyendo
// los que hoy la extensión oculta, que de otro modo no se contarían.
//
//    61  PlusTube    re.ironhentai.com/vt.php    ⚡ nativo
//    60  StreamTape  streamtape.com              ⚡ nativo
//    60  Voex        voe.sx                      ⚡ nativo
//    59  PremiunVIP  re.ironhentai.com/face.php  🌐 OCULTO hoy
//    56  Uqload      uqload.is                   🌐 OCULTO hoy
//    51  Mp4Upload   www.mp4upload.com           ⚡ OCULTO a pedido del usuario
//     3  StreamWish  flaswish.com                🌐 OCULTO hoy
//     3  HideNise    callistanise.com            ⚡ nativo
//     3  MixEx       miiiixdrop.net / miixdrop   ⚡ nativo
//     1  YourUpload  www.yourupload.com          ⚡ nativo
//
// **Este sitio esconde mucho: 4 de 10 servidores, unos 169 botones.** Cada uno
// tiene su motivo escrito en su carpeta. El filtro sigue estando en `index.ts`
// de la extensión y no se tocó acá — cambiarlo es una decisión, no una
// medición.
//
// ── Una trampa al medir, que dio un falso negativo ──────────────────────────
//
// La primera pasada dio que StreamTape, Voe y Mp4Upload **no resolvían**, y la
// conclusión iba a ser que este sitio los sirve rotos. Era mentira: el episodio
// que tocó de muestra tenía los tres embeds muertos. Repitiendo sobre 5
// episodios distintos:
//
//   streamtape.com   4/5 resuelven y reproducen
//   voe.sx           4/5
//   mp4upload.com    1/2
//   uqload.is        0/5   ← este sí es siempre
//
// O sea: **un episodio no alcanza para dar un servidor por muerto en este
// sitio**, porque los embeds caídos son comunes. Hay que probar varios.
//
// La otra trampa fue del banco: PlusTube y PremiunVIP tienen su propio resolver
// (backend `re.ironhentai.com`), así que medirlos con `resolveEmbed` a secas
// da null y parece que estuvieran rotos. Hay que ir por `watch()`.

import { type ServidorResuelto, pedir, hostDe, buscarDireccion } from './comun';
import * as hidenise from './hidenise';
import * as mixdrop from './mixdrop';
import * as mp4upload from './mp4upload';
import * as plustube from './plustube';
import * as premiunvip from './premiunvip';
import * as streamtape from './streamtape';
import * as streamwish from './streamwish';
import * as uqload from './uqload';
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

/**
 * Ordenados por peso: primero los que más aparecen en el catálogo.
 *
 * **Ojo con PlusTube y PremiunVIP: comparten host** (`re.ironhentai.com`) y lo
 * único que los distingue es el endpoint, `vt.php` contra `face.php`. Por eso
 * sus fichas se reconocen por el path entero y no por el dominio, y van ANTES
 * de cualquier ficha que pudiera coincidir con el dominio suelto.
 */
export const SERVIDORES: Servidor[] = [
  {
    boton: 'PlusTube',
    hosts: ['ironhentai.com/vt.php'],
    botones: 61,
    nativo: true,
    resolver: plustube.resolver,
  },
  {
    boton: 'PremiunVIP',
    hosts: ['ironhentai.com/face.php', 'ironhentai.com/hugging.php'],
    botones: 59,
    nativo: false,
    resolver: premiunvip.resolver,
  },
  {
    boton: 'StreamTape',
    hosts: ['streamtape', 'stape', 'strtape'],
    botones: 60,
    nativo: true,
    resolver: streamtape.resolver,
  },
  {
    boton: 'Voex',
    hosts: ['voe.sx', 'voe.'],
    botones: 60,
    nativo: true,
    resolver: voe.resolver,
  },
  {
    boton: 'Uqload',
    hosts: ['uqload'],
    botones: 56,
    nativo: false,
    resolver: uqload.resolver,
  },
  {
    boton: 'Mp4Upload',
    hosts: ['mp4upload'],
    botones: 51,
    nativo: true,
    resolver: mp4upload.resolver,
  },
  {
    boton: 'StreamWish',
    hosts: ['flaswish', 'streamwish', 'wishfast'],
    botones: 3,
    nativo: false,
    resolver: streamwish.resolver,
  },
  {
    boton: 'HideNise',
    hosts: ['callistanise', 'vidhide', 'vhide'],
    botones: 3,
    nativo: true,
    resolver: hidenise.resolver,
  },
  {
    // Los espejos meten letras de más ("miiiixdrop", "miixdrop") para esquivar
    // bloqueos por dominio exacto, pero "xdrop" siempre sobrevive.
    boton: 'MixEx',
    hosts: ['xdrop'],
    botones: 3,
    nativo: true,
    resolver: mixdrop.resolver,
  },
  {
    boton: 'YourUpload',
    hosts: ['yourupload', 'yupload'],
    botones: 1,
    nativo: true,
    resolver: yourupload.resolver,
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
  console.log(`[af] servidor sin ficha, se prueba a mano: ${url.slice(0, 60)}`);
  const html = await pedir(url, referer);
  if (!html) return null;
  const host = hostDe(url);
  return buscarDireccion(html, host ? { Referer: `https://${host}/` } : undefined);
}

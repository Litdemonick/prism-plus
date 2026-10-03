// ─── Los servidores de FuegoCine ─────────────────────────────────────────────
//
// Una carpeta por servidor, con su nombre. Cada una lleva su propio resolver y
// arriba de todo lo que se midió de ese servidor, para no volver a averiguarlo.
//
// **Por qué está copiado del SDK y no importado de él:** varios de estos
// servidores (ok.ru, firestream, el genérico) los usan también otras
// extensiones. Compartiendo el código, tocar uno para arreglar FuegoCine podía
// romper LatAnime o JKAnime sin que nadie se enterara hasta que un usuario lo
// reportara. Con la copia, lo que se toque acá se queda acá.
//
// **Cómo mantener esto:** la copia arranca IGUAL a la que funciona; no se
// retoca "por las dudas". Si un servidor falla en FuegoCine se arregla ESTA
// copia y ninguna otra. Y si se arregla acá algo que también está en otra
// extensión, conviene avisarlo: la otra sigue con la versión vieja.
//
// El precio, asumido: cuando un servidor cambia de formato hay que arreglarlo
// en cada extensión por separado.
//
// ── El catálogo, medido el 2026-08-04 ────────────────────────────────────────
//
// Escaneado entero por el feed de Blogger (el `content` de cada post ya trae el
// bloque `_SV_LINKS`, así que no hace falta pedir título por título):
// **1.346 botones en 396 títulos.**

import { type ServidorResuelto } from './comun';
import * as directo from './directo';
import * as drive from './drive';
import * as okru from './ok.ru';
import * as playmate from './playmate';
import * as videro from './videro';
import * as vidsst from './vidsst';
import * as vimeos from './vimeos';

export { type ServidorResuelto } from './comun';

// ── Los que salieron el 2026-09-27 ───────────────────────────────────────────
//
// La app ya no abre páginas en un navegador: un servidor que no resuelve a un
// vídeo directo es un botón que no reproduce nunca. Se midió sobre seis
// títulos, bajando vídeo, y salieron con su carpeta:
//
//   UA (unlimplay)  0 de 24. Su menú ya no trae servidores: solo "direct" y
//                   "proxy", y los dos contestan 403 porque el vale del CDN
//                   está atado a la IP de unlimplay. En la mitad de los
//                   títulos el menú viene vacío (`EMBEDS = []`).
//   US (upns)       marcado de navegador desde agosto.
//
// ── La medición entera del 2026-10-02 (Fase 3) ───────────────────────────────
//
// Catálogo: 3115 películas y 125 series. Muestra de 247 obras / 356 episodios
// de 2026 a 1939. Con la 1.9.5 solo se podían ver 161 (45 %): el sitio pone
// botones de servidores que la extensión no sabía abrir. El detalle, en
// `progreso/PLAN_FASE3_SUPREMA.md` de PrismHub (sección FuegoCine).
//
// Volvieron, con su carpeta y lo medido arriba: **Drive** (14/15; la dirección
// de descarga de Google sí anda sin cuenta), **PM** (15/15), **VST** (8/8),
// y **VRAD** (3/3, antes iba a `directo` y devolvía la página).
//
// Siguen fuera, con dato y no por las dudas:
//
//   UA (unlimplay)  menú vacío en 13/13, también por su consulta dinámica.
//   US (upns)       su API contesta «Video not found or deleted» en 19/19, con
//                   el pedido exacto del reproductor (desofuscado).
//   pixeldrain      15/15 borrados (404).
//   DL (dropload)   pide un captcha de Cloudflare («no soy un robot») antes
//                   del vídeo: 0/12 en todo el catálogo (21 botones).
//   FS (firestream) 12/12 archivos borrados (404) en TODO el catálogo (solo
//                   19 botones en 3240 obras).
//   GS (goodstream) la página resuelve, pero su servidor de vídeo
//                   (enc*.goodstream.one) no conecta: medido desde la PC
//                   (0/20, «Connect Timeout») y confirmado por el usuario en el
//                   teléfono con otra red (2026-10-03: «no disponible»).
//   FCTL (hf.space) el mismo enlace dio vídeo 6/6 y horas después 2/6 («Not
//                   found»), y tarda ~6 s. Algo que anda a veces no se ofrece.
//   LVAD (loadvid)  la lista llega como TEXTO, no como dirección: necesita la
//                   app. Anotado.
//   Sueltos         VidSonic, TurboVid, NL, VidNest, Kraken, AMP4, AVC, BN, BR…
//                   de 1 a 3 páginas cada uno, la mayoría caídos.

export interface Servidor {
  /** El botón como lo muestra el sitio. */
  boton: string;
  /** Trozos de host con los que se reconoce esta dirección. */
  hosts: string[];
  /** Cuántos botones tiene en el catálogo — para saber qué pesa y qué no. */
  botones: number;
  /** Si reproduce en el reproductor de la app (rayo) o en el navegador (mundo). */
  nativo: boolean;
  /**
   * En qué lugar se ofrece (menor = antes). Sale de lo medido: el primero es el
   * que abre la app sola, así que va el que arranca más rápido y mejor se ve.
   */
  orden: number;
  resolver: (url: string, referer: string) => Promise<ServidorResuelto | null>;
}

/** Ordenados por peso: primero los que más aparecen en el catálogo. */
export const SERVIDORES: Servidor[] = [
  {
    boton: 'FC',
    // videro.my: el 2026-09-27 cinco de cada seis títulos ya servían FC desde
    // ahí (un m3u8 abierto, sin cabeceras). Sin este host se quedaban sin
    // ficha y el botón FC no reproducía.
    hosts: ['rumble.cloud', 'files.eintim.me', '1a-1791.com', 'archive.org'],
    botones: 195,
    nativo: true,
    // Archivo directo, 27–107 Mbps y arranque mediano de 0,4 s.
    orden: 0,
    resolver: directo.resolver,
  },
  {
    boton: 'Drive',
    hosts: ['drive.google.com', 'drive.usercontent.google.com'],
    botones: 88,
    nativo: true,
    // 1080p H.264 y más de 100 Mbps; archivos de 2 a 5 GB.
    orden: 1,
    resolver: drive.resolver,
  },
  {
    boton: 'PM',
    hosts: ['playmate.to'],
    botones: 20,
    nativo: true,
    orden: 2,
    resolver: playmate.resolver,
  },
  {
    // Videro: la lista directa (botón «FC») o su reproductor `/e/` («VRAD»).
    boton: 'VRAD',
    hosts: ['videro.'],
    botones: 6,
    nativo: true,
    orden: 3,
    resolver: videro.resolver,
  },
  {
    boton: 'VST',
    hosts: ['vids.st'],
    botones: 20,
    nativo: true,
    orden: 4,
    resolver: vidsst.resolver,
  },
  {
    boton: 'OK.RU',
    hosts: ['ok.ru', 'okru'],
    botones: 55,
    nativo: true,
    orden: 6,
    resolver: okru.resolver,
  },
  {
    boton: 'Vimeo',
    hosts: ['vimeos'],
    botones: 49,
    nativo: true,
    orden: 7,
    resolver: vimeos.resolver,
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
 *
 * Un servidor que no está en la tabla NO se intenta «a mano»: `watch` ya no
 * ofrece ninguno así (solo los que se midieron y andan), así que esto solo
 * llega con datos viejos —una descarga en cola de antes de la 1.10— y ahí
 * probarlo con otro resolvedor era pedirle cosas sin sentido a una página que
 * no es suya. Se descarta y queda en el registro.
 */
export async function resolverServidor(
  url: string,
  referer: string,
): Promise<ServidorResuelto | null> {
  const ficha = fichaDe(url);
  if (ficha) return ficha.resolver(url, referer);
  console.log(`[fc] servidor sin ficha, no se ofrece: ${url.slice(0, 60)}`);
  return null;
}

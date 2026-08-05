// ─── PremiunVIP (re.ironhentai.com/face.php) 🌐 navegador ────────────────────
//
// Medido el 2026-08-04 sobre 60 episodios: **59 botones**, casi tantos como
// PlusTube. Hoy la extensión **lo oculta**, así que el usuario no lo ve.
// Este resolver devuelve null a propósito.
//
// ── El caso más engañoso de todos: resuelve bien y NO sirve ─────────────────
//
// Comparte backend con PlusTube y se desofusca igual (doble base64 con
// corrimiento, ver `desofuscarIronhentai` en `comun.ts`). Lo que sale adentro no
// es un m3u8 sino un `videoId` que apunta de vuelta al propio backend
// (`hugging.php`), y ESO **resuelve perfecto**: medido, 206 `video/mp4`.
//
// O sea que cualquier medición rápida lo da por bueno. **En la app real no lo
// es**, y esto está confirmado en vivo sobre dos animes distintos, con el mismo
// síntoma exacto las dos veces: arranca, llega a determinar la resolución del
// vídeo, y después se queda cargando para siempre.
//
// La causa, medida inspeccionando la redirección con curl: `hugging.php`
// redirige a huggingface.co, que firma la dirección final del CDN
// (xet-bridge-us) con el **rango de bytes EXACTO de la primera petición** — el
// "ByteRange" queda grabado dentro del Policy firmado. El reproductor nativo
// reutiliza esa misma dirección firmada para pedir el resto del archivo, pero
// la firma solo autoriza el rango inicial: cualquier otro rango queda sin
// autorizar y el pedido nunca vuelve. De ahí el cuelgue eterno.
//
// Es una incompatibilidad estructural entre el backend de Hugging Face y el
// streaming por rangos que hace cualquier reproductor nativo. **No hay resolver
// que pueda arreglarlo**, por eso este devuelve null en vez de la dirección que
// sí sabe encontrar.
//
// ── Lo que queda por decidir ────────────────────────────────────────────────
//
// Hoy además está OCULTO, que es distinto de "va al navegador": el usuario ni
// lo ve. Y el navegador interno sí lo reproduciría — el problema es del
// reproductor nativo pidiendo rangos, no del archivo. Son 59 botones que
// podrían estar disponibles con el mundo, como se hizo con Mega en tioanime.
// No se cambió acá porque es una decisión del usuario, no una medición.

import { type ServidorResuelto } from '../comun';

export async function resolver(_url: string, _referer: string): Promise<ServidorResuelto | null> {
  return null;
}

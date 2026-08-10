// ─── Piezas compartidas por los servidores de animeav1 ───────────────────────
//
// Copiadas y no importadas del SDK, a propósito: ver el porqué en `index.ts` de
// esta misma carpeta. Compartidas SOLO entre los servidores de animeav1 —
// ninguna otra extensión las toca.

declare function sendMessage(channel: string, data: string): Promise<string>;

/** El User-Agent con el que el sitio y sus servidores esperan que se pida. */
export const UA_ESCRITORIO =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Lo que devuelve un resolver cuando pudo. */
export interface ServidorResuelto {
  url: string;
  headers?: Record<string, string>;
}

// ─── Pedidos ─────────────────────────────────────────────────────────────────

/** GET a una página de embed. Devuelve null si no se pudo. */
export async function pedir(
  url: string,
  referer: string,
  headers?: Record<string, string>,
): Promise<string | null> {
  try {
    return await sendMessage(
      'request',
      JSON.stringify([
        url,
        { method: 'get', headers: { Referer: referer, 'User-Agent': UA_ESCRITORIO, ...headers } },
      ]),
    );
  } catch (e) {
    console.log(`[av1] no se pudo pedir ${url.slice(0, 45)} :: ${(e as Error)?.message ?? e}`);
    return null;
  }
}

// ─── Ayudantes ───────────────────────────────────────────────────────────────

/** El host de una dirección, sin usar la API URL (no existe en QuickJS). */
export function hostDe(url: string): string | null {
  const m = /^https?:\/\/([^/]+)/.exec(url);
  return m ? m[1] : null;
}

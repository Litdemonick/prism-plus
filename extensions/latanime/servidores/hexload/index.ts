// ─── Hexload ⚡ nativo ────────────────────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 120 títulos: **117 botones**.
//
//   embed   https://hexload.com/embed-ljdm74uwpc50
//   sale    https://{nodo}/d/{código}
//   tarda   270–650 ms
//
// La página no trae el vídeo: lo pide por AJAX a `/download` con
// `op=download3`. Se replica ese mismo POST y la respuesta ya trae la dirección
// directa en un JSON.
//
// ── El nodo es una lotería, y conviene saberlo ──────────────────────────────
//
// El resolver anda siempre —devuelve dirección en los cuatro episodios que se
// probaron—, pero el nodo del CDN que te toca no siempre responde. Medido el
// 2026-08-04, cuatro episodios seguidos:
//
//   droply.top         ✗  no conecta (ni con curl, ni con node)
//   droply.top         ✗
//   drewimplemnt.top   ✔  206 application/octet-stream
//   droply.top         ✗
//
// O sea: 1 de 4. Igual va marcado como nativo, porque cuando el nodo responde
// reproduce en la app sin problema, y cuando no, la app ya cae sola al
// navegador. Marcarlo de navegador sería mentirle al usuario en el otro
// sentido.
//
// Si alguna vez se quiere mejorar esto, lo que hay que averiguar es si el nodo
// se puede pedir de nuevo (¿otro POST da otro nodo?) o si viene atado al
// archivo. No se probó.

import { postForm, hostDe, codigoDe, type ServidorResuelto } from '../comun';

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const host = hostDe(url) || 'hexload.com';
  const codigo = codigoDe(url);
  if (!codigo) return null;

  const crudo = await postForm(
    `https://${host}/download`,
    { op: 'download3', id: codigo, ajax: '1', method_free: '1' },
    referer || `https://${host}/`,
  );
  if (!crudo) return null;

  // La respuesta es JSON, pero se lee con regex para no romperse si el host
  // agrega campos o devuelve el JSON envuelto en algo.
  const m = /"url"\s*:\s*"([^"]+)"/.exec(crudo);
  if (!m) {
    console.log('[la] hexload: el POST no devolvió ninguna url');
    return null;
  }
  return { url: m[1].replace(/\\\//g, '/'), headers: { Referer: `https://${host}/` } };
}

// ─── Prism+ SDK — Sanitización de retornos en runtime ───────────────────────
// TypeScript solo verifica tipos en compilación. Si la fuente devuelve un
// campo inesperado (número donde se espera string, null, undefined, etc.) el
// cliente recibiría datos corruptos sin error aparente.
//
// Estas funciones convierten coercitivamente los campos críticos al tipo
// correcto antes de que el cliente los consuma. Se aplican automáticamente
// por el build script a todas las extensiones (footer de esbuild), por lo
// que no es necesario llamarlas manualmente, pero están disponibles para
// extensiones con lógica especial que quieran aplicarlas ellas mismas.

import type { PrismDetail, PrismEpisode, PrismItem, PrismWatch } from './types';

// ─── Helpers internos ────────────────────────────────────────────────────────

function _str(v: unknown): string {
  return v == null ? '' : String(v);
}

// ─── Episodio / capítulo ──────────────────────────────────────────────────────

/**
 * Normaliza un episodio para garantizar que `url` siempre sea un string
 * no vacío. Devuelve `null` si el episodio es irrecuperable (sin url).
 */
export function sanitizeEpisode(ep: unknown): PrismEpisode | null {
  if (ep == null || typeof ep !== 'object') return null;
  const o = ep as Record<string, unknown>;
  const url = _str(o['url']);
  if (!url) return null;
  return {
    title:     _str(o['title']) || url,
    url,
    thumbnail: o['thumbnail'] != null ? _str(o['thumbnail']) : undefined,
    duration:  typeof o['duration'] === 'number' ? o['duration'] : undefined,
    airDate:   o['airDate'] != null ? _str(o['airDate']) : undefined,
    number:    typeof o['number'] === 'number' ? o['number'] : undefined,
  };
}

// ─── Detalle ─────────────────────────────────────────────────────────────────

/**
 * Normaliza el retorno de `detail()`. Garantiza que todos los episodios
 * tengan `url` string no vacío — los que no lo tengan son descartados.
 */
export function sanitizeDetail(d: unknown): PrismDetail {
  if (d == null || typeof d !== 'object') {
    return { title: '', episodes: [] };
  }
  const o = d as Record<string, unknown>;
  const episodes = (Array.isArray(o['episodes']) ? o['episodes'] : [])
    .map(sanitizeEpisode)
    .filter((e): e is PrismEpisode => e !== null);

  return { ...(o as PrismDetail), episodes };
}

// ─── Lista ───────────────────────────────────────────────────────────────────

/**
 * Normaliza el retorno de `latest()` y `search()`. Descarta ítems sin `url`.
 */
export function sanitizeItems(items: unknown): PrismItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((it): PrismItem | null => {
      if (it == null || typeof it !== 'object') return null;
      const o = it as Record<string, unknown>;
      const url = _str(o['url']);
      if (!url) return null;
      return { ...(o as PrismItem), title: _str(o['title']) || url, url };
    })
    .filter((it): it is PrismItem => it !== null);
}

// ─── Watch ───────────────────────────────────────────────────────────────────

/**
 * Normaliza el retorno de `watch()`. Descarta streams sin `url`.
 */
export function sanitizeWatch(w: unknown): PrismWatch {
  if (w == null || typeof w !== 'object') return { streams: [] };
  const o = w as Record<string, unknown>;
  const streams = (Array.isArray(o['streams']) ? o['streams'] : []).filter(
    (s): s is PrismWatch['streams'][number] =>
      s != null && typeof s === 'object' && typeof (s as Record<string, unknown>)['url'] === 'string' && !!( s as Record<string, unknown>)['url'],
  );
  return { ...(o as PrismWatch), streams };
}

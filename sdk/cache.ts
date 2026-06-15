// ─── Prism+ SDK — Caché en memoria con TTL ───────────────────────────────────
// Evita requests redundantes al mismo endpoint dentro de la misma sesión.
// Usa un Map simple — sin dependencias externas, compatible con QuickJS.
//
// Uso recomendado:
//   const CACHE = createCache();
//   export async function latest(page: number) {
//     const key = `latest:${page}`;
//     const cached = CACHE.get<PrismItem[]>(key);
//     if (cached) return cached;
//     const result = await fetchLatest(page);
//     CACHE.set(key, result, 5 * 60_000); // 5 minutos
//     return result;
//   }

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface PrismCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs?: number): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
}

/** TTLs por defecto recomendados en ms */
export const TTL = {
  /** Listas (latest/search) — cambian con frecuencia */
  LIST:   5   * 60_000,  // 5 minutos
  /** Detalles (detail) — estables, cambian poco */
  DETAIL: 30  * 60_000,  // 30 minutos
  /** Streams (watch) — no cachear, las URLs expiran */
  WATCH:  0,
} as const;

/**
 * Crea una instancia de caché independiente por extensión.
 * Llamar createCache() en el módulo de la extensión, no importar una instancia global,
 * para que cada extensión tenga su propio espacio de claves.
 */
export function createCache(): PrismCache {
  const store = new Map<string, CacheEntry<unknown>>();

  function get<T>(key: string): T | undefined {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  function set<T>(key: string, value: T, ttlMs = TTL.LIST): void {
    if (ttlMs === 0) return; // TTL 0 = no cachear
    store.set(key, {
      value,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : -1,
    });
  }

  function has(key: string): boolean {
    return get(key) !== undefined;
  }

  function del(key: string): void {
    store.delete(key);
  }

  function clear(): void {
    store.clear();
  }

  return { get, set, has, delete: del, clear };
}

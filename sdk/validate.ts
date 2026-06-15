// ─── Prism+ SDK — Guards de tipos en runtime ─────────────────────────────────
// TypeScript solo verifica tipos en compilación.
// Estos guards detectan en ejecución si una API externa devolvió datos inesperados,
// antes de que el cliente reciba un objeto con campos undefined.

import type { PrismItem, PrismDetail, PrismWatch } from './types';

// ─── Error de validación ─────────────────────────────────────────────────────

export class ValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly expected: string,
    public readonly got: unknown,
    context?: string,
  ) {
    const ctx = context ? ` [${context}]` : '';
    super(`${ctx} campo '${field}': se esperaba ${expected}, recibido ${typeof got === 'object' ? JSON.stringify(got)?.slice(0, 60) : got}`);
    this.name = 'ValidationError';
  }
}

// ─── Helpers internos ────────────────────────────────────────────────────────

function requireString(obj: Record<string, unknown>, field: string, ctx: string): void {
  if (typeof obj[field] !== 'string' || (obj[field] as string).trim() === '') {
    throw new ValidationError(field, 'string no vacío', obj[field], ctx);
  }
}

function requireArray(obj: Record<string, unknown>, field: string, ctx: string): void {
  if (!Array.isArray(obj[field])) {
    throw new ValidationError(field, 'array', obj[field], ctx);
  }
}

// ─── Guards públicos ─────────────────────────────────────────────────────────

/**
 * Verifica que x sea un PrismItem válido (title + url presentes).
 * Lanza ValidationError si no lo es.
 */
export function guardItem(x: unknown, context = 'PrismItem'): asserts x is PrismItem {
  if (typeof x !== 'object' || x === null) {
    throw new ValidationError('(raíz)', 'objeto', x, context);
  }
  const o = x as Record<string, unknown>;
  requireString(o, 'title', context);
  requireString(o, 'url', context);
}

/**
 * Verifica que x sea un PrismDetail válido (title + episodes array).
 * Lanza ValidationError si no lo es.
 */
export function guardDetail(x: unknown, context = 'PrismDetail'): asserts x is PrismDetail {
  if (typeof x !== 'object' || x === null) {
    throw new ValidationError('(raíz)', 'objeto', x, context);
  }
  const o = x as Record<string, unknown>;
  requireString(o, 'title', context);
  requireArray(o, 'episodes', context);

  for (const [i, ep] of (o.episodes as unknown[]).entries()) {
    guardItem(ep, `${context}.episodes[${i}]`);
  }
}

/**
 * Verifica que x sea un PrismWatch válido (streams array presente).
 * Lanza ValidationError si no lo es.
 */
export function guardWatch(x: unknown, context = 'PrismWatch'): asserts x is PrismWatch {
  if (typeof x !== 'object' || x === null) {
    throw new ValidationError('(raíz)', 'objeto', x, context);
  }
  const o = x as Record<string, unknown>;
  requireArray(o, 'streams', context);

  for (const [i, s] of (o.streams as unknown[]).entries()) {
    if (typeof s !== 'object' || s === null) {
      throw new ValidationError(`streams[${i}]`, 'objeto', s, context);
    }
    requireString(s as Record<string, unknown>, 'url', `${context}.streams[${i}]`);
  }
}

/**
 * Versión no-lanzable: retorna true/false en vez de lanzar.
 */
export function isValidItem(x: unknown): x is PrismItem {
  try { guardItem(x); return true; } catch { return false; }
}

export function isValidDetail(x: unknown): x is PrismDetail {
  try { guardDetail(x); return true; } catch { return false; }
}

export function isValidWatch(x: unknown): x is PrismWatch {
  try { guardWatch(x); return true; } catch { return false; }
}

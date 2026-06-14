// ─── Helpers de parseo HTML para el SDK Prism+ ──────────────────────────────
// QuickJS no tiene DOM ni document.querySelector.
// Estas utilidades cubren los casos más comunes con regex.

/**
 * Primer match del grupo de captura 1.
 * @example matchFirst(html, /<title>([^<]+)<\/title>/i)
 */
export function matchFirst(html: string, pattern: RegExp): string {
  return pattern.exec(html)?.[1]?.trim() ?? '';
}

/**
 * Todos los valores del grupo de captura 1.
 * @example matchAll(html, /href="([^"]+)"/g)
 */
export function matchAll(html: string, pattern: RegExp): string[] {
  const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
  return [...html.matchAll(new RegExp(pattern.source, flags))].map(
    m => m[1]?.trim() ?? '',
  );
}

/**
 * Todos los matches con múltiples grupos de captura.
 * @example matchGroups(html, /<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)
 */
export function matchGroups(html: string, pattern: RegExp): string[][] {
  const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
  return [...html.matchAll(new RegExp(pattern.source, flags))].map(m =>
    [...m].slice(1).map(s => s?.trim() ?? ''),
  );
}

/**
 * Texto entre dos delimitadores literales.
 * @example between(html, '<title>', '</title>')
 */
export function between(html: string, start: string, end: string): string {
  const s = html.indexOf(start);
  if (s === -1) return '';
  const e = html.indexOf(end, s + start.length);
  if (e === -1) return '';
  return html.slice(s + start.length, e).trim();
}

/**
 * Valor de un atributo HTML.
 * @example attr(html, 'img', 'src')
 */
export function attr(html: string, tag: string, attribute: string): string {
  const re = new RegExp(
    `<${tag}[^>]*?\\s${attribute}=["']([^"']+)["']`,
    'i',
  );
  return re.exec(html)?.[1]?.trim() ?? '';
}

/** Elimina etiquetas HTML y decodifica entidades básicas. */
export function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Decodifica entidades HTML básicas sin eliminar etiquetas. */
export function decodeEntities(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

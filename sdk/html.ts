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
 * Como matchFirst pero retorna `fallback` si no hay match,
 * en lugar de string vacío — distingue "campo vacío" de "parseo fallido".
 * @example matchFirstOr(html, /href="([^"]+)"/i, null)
 */
export function matchFirstOr<T>(html: string, pattern: RegExp, fallback: T): string | T {
  const m = pattern.exec(html);
  return m?.[1]?.trim() ?? fallback;
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
    .replace(/&nbsp;/g, ' ')
    // Entidades numéricas genéricas (ej. &#8217; comilla tipográfica, muy
    // común en nombres de reparto/directores) — confirmado en vivo que
    // faltaba, dejaba el código crudo sin decodificar en vez del carácter.
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    // Entidades NOMBRADAS. Faltaban por completo y los sitios de este repo son
    // casi todos en español, donde aparecen a cada rato: un título real de
    // xvideos llegaba como "Pendeja de 18 a&ntilde;os ... polla gorda&excl;"
    // (confirmado en vivo). Es aditivo — antes esos códigos quedaban crudos, así
    // que no hay comportamiento previo que dependa de ellos. Las que no estén en
    // la tabla se dejan intactas en vez de romperlas.
    .replace(
      /&([a-zA-Z][a-zA-Z0-9]*);/g,
      (m, name: string) => _NAMED_ENTITIES[name] ?? m,
    );
}

const _NAMED_ENTITIES: Record<string, string> = {
  // Vocales acentuadas y eñe — el caso común en español
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü',
  // Otros idiomas latinos que aparecen en títulos (francés, portugués, alemán)
  agrave: 'à', egrave: 'è', igrave: 'ì', ograve: 'ò', ugrave: 'ù',
  Agrave: 'À', Egrave: 'È', Igrave: 'Ì', Ograve: 'Ò', Ugrave: 'Ù',
  acirc: 'â', ecirc: 'ê', icirc: 'î', ocirc: 'ô', ucirc: 'û',
  Acirc: 'Â', Ecirc: 'Ê', Icirc: 'Î', Ocirc: 'Ô', Ucirc: 'Û',
  atilde: 'ã', otilde: 'õ', Atilde: 'Ã', Otilde: 'Õ',
  auml: 'ä', ouml: 'ö', Auml: 'Ä', Ouml: 'Ö',
  ccedil: 'ç', Ccedil: 'Ç', szlig: 'ß', aring: 'å', Aring: 'Å',
  aelig: 'æ', AElig: 'Æ', oslash: 'ø', Oslash: 'Ø',
  // Signos y puntuación
  iexcl: '¡', iquest: '¿', excl: '!', quest: '?',
  ordf: 'ª', ordm: 'º', deg: '°', laquo: '«', raquo: '»',
  hellip: '…', mdash: '—', ndash: '–', minus: '−',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  bull: '•', middot: '·', sbquo: '‚', bdquo: '„',
  apos: "'", lpar: '(', rpar: ')', comma: ',', period: '.', colon: ':',
  semi: ';', sol: '/', bsol: '\\', num: '#', dollar: '$', percnt: '%',
  plus: '+', equals: '=', ast: '*', commat: '@', lowbar: '_', verbar: '|',
  // Símbolos
  euro: '€', pound: '£', yen: '¥', cent: '¢', curren: '¤',
  copy: '©', reg: '®', trade: '™', sect: '§', para: '¶',
  times: '×', divide: '÷', plusmn: '±', frac12: '½', frac14: '¼', frac34: '¾',
  sup1: '¹', sup2: '²', sup3: '³', micro: 'µ', not: '¬', shy: '',
  ensp: ' ', emsp: ' ', thinsp: ' ', zwnj: '', zwj: '',
};

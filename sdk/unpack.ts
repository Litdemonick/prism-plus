// ─── Prism+ SDK — Desobfuscador P.A.C.K.E.R. ─────────────────────────────────
// Implementación original del algoritmo de Dean Edwards (P.A.C.K.E.R.).
// Permite desempaquetar scripts obfuscados sin ejecutar eval() ni código externo.
//
// Formato objetivo:
//   eval(function(p,a,c,k,e,d){...}('CÓDIGO', RADIX, COUNT, 'k0|k1|k2'.split('|'), 0, {}))
//
// Usado por: kwik.si (streams de Animepahe y otros sitios que usan esta CDN).

/**
 * Detecta si una cadena es un script empaquetado con P.A.C.K.E.R.
 */
export function isPacked(source: string): boolean {
  return /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[d|_]\s*\)/.test(
    source,
  );
}

/**
 * Desempaqueta un script obfuscado con P.A.C.K.E.R.
 * Retorna el código fuente original o el input si no se reconoce el formato.
 */
export function unpackPacker(packed: string): string {
  // Extraer los argumentos del eval:
  // eval(function(p,a,c,k,e,d){...}('CÓDIGO', RADIX, COUNT, 'K0|K1|K2'.split('|'), 0, {}))
  const argMatch = /\}\s*\(\s*([\s\S]+?),\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\(\s*'\|'\s*\)/.exec(
    packed,
  );
  if (!argMatch) return packed;

  // El código puede estar entre comillas simples o dobles — tomamos el grupo capturado
  const rawCode = argMatch[1];
  const radix   = parseInt(argMatch[2], 10);
  let   count   = parseInt(argMatch[3], 10);
  const keys    = argMatch[4].split('|');

  // Extraer 'p' (el template de código ofuscado) desescapando comillas internas
  const codeMatch = /^\s*'([\s\S]*)'\s*$/.exec(rawCode) ||
                    /^\s*"([\s\S]*)"\s*$/.exec(rawCode);
  if (!codeMatch) return packed;

  let code = codeMatch[1];

  // Construir tabla de decodificación: índice numérico → palabra original
  function toBase(n: number): string {
    const digits = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const safeRadix = Math.min(radix, 62);
    if (n < safeRadix) return digits[n] ?? n.toString(36);
    return toBase(Math.floor(n / safeRadix)) + (digits[n % safeRadix] ?? (n % safeRadix).toString(36));
  }

  const lookup: Record<string, string> = {};
  while (count--) {
    const key = toBase(count);
    if (keys[count] && keys[count] !== '') {
      lookup[key] = keys[count];
    }
  }

  // Reemplazar cada token ofuscado con su valor real
  code = code.replace(/\b(\w+)\b/g, (token) => lookup[token] ?? token);

  // Desescapar secuencias comunes que el packer introduce
  code = code.replace(/\\'/g, "'").replace(/\\"/g, '"');

  return code;
}

/**
 * Extrae y desempaqueta TODOS los scripts P.A.C.K.E.R. de un HTML.
 * Útil cuando la página tiene múltiples bloques obfuscados.
 */
export function unpackAllInHtml(html: string): string[] {
  const results: string[] = [];
  const re = /eval\s*\(\s*function\s*\(p,a,c,k,e,[d_]\)([\s\S]*?)\)\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const unpacked = unpackPacker(match[0]);
    if (unpacked !== match[0]) results.push(unpacked);
  }
  return results;
}

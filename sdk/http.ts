// ─── Cliente HTTP del SDK Prism+ ────────────────────────────────────────────
// Envuelve el fetch() inyectado por PrismHub en el runtime QuickJS.
// Añade reintentos, User-Agent por defecto y helpers tipados.

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  /** Intentos adicionales ante error de red (default: 2) */
  retries?: number;
}

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Petición HTTP con User-Agent automático y reintentos exponenciales.
 * Usa el fetch() que PrismHub inyecta en el runtime QuickJS.
 */
export async function request(
  url: string,
  options: RequestOptions = {},
): Promise<Response> {
  const { method = 'GET', headers = {}, body, retries = 2 } = options;
  const merged = { 'User-Agent': DEFAULT_UA, ...headers };

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, { method, headers: merged, body });
    } catch (err) {
      lastError = err;
      if (attempt < retries) await _sleep(300 * 2 ** attempt);
    }
  }
  throw lastError;
}

/** GET → string (HTML o texto plano) */
export async function get(
  url: string,
  headers?: Record<string, string>,
): Promise<string> {
  const res = await request(url, { headers });
  return res.text();
}

/** GET → JSON parseado */
export async function getJson<T = unknown>(
  url: string,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await request(url, { headers });
  return res.json() as Promise<T>;
}

/** POST con body de texto y cabeceras opcionales → string */
export async function post(
  url: string,
  body: string,
  headers?: Record<string, string>,
): Promise<string> {
  const res = await request(url, { method: 'POST', body, headers });
  return res.text();
}

/** POST JSON → objeto parseado */
export async function postJson<T = unknown>(
  url: string,
  data: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await request(url, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  return res.json() as Promise<T>;
}

function _sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

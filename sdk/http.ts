// ─── Cliente HTTP del SDK Prism+ ─────────────────────────────────────────────
// Envuelve el fetch() inyectado por PrismHub en el runtime QuickJS.
// Añade timeout, reintentos inteligentes, User-Agent y manejo de errores HTTP.

// ─── Errores tipados ──────────────────────────────────────────────────────────

/** Error de red o de fetch — el servidor no llegó a responder */
export class NetworkError extends Error {
  constructor(cause: unknown, url: string) {
    super(`Error de red en ${url}: ${(cause as Error)?.message ?? cause}`);
    this.name = 'NetworkError';
  }
}

/** El servidor respondió pero con un código HTTP de error */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly url: string,
  ) {
    super(`HTTP ${status} ${statusText} — ${url}`);
    this.name = 'HttpError';
  }
}

/** El servidor no respondió dentro del tiempo límite */
export class TimeoutError extends Error {
  constructor(ms: number, url: string) {
    super(`Timeout de ${ms}ms superado — ${url}`);
    this.name = 'TimeoutError';
  }
}

// ─── Opciones ─────────────────────────────────────────────────────────────────

export interface RequestOptions {
  method?:  'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?:    string;
  /** Intentos adicionales ante error de red o 5xx (default: 2) */
  retries?: number;
  /** Tiempo límite por intento en ms (default: 15 000) */
  timeout?: number;
  /** Si true, no lanza HttpError ante 4xx/5xx: devuelve la respuesta igual. */
  acceptStatus?: boolean;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const DEFAULT_TIMEOUT = 15_000;
const DEFAULT_RETRIES = 2;

/** Códigos HTTP que merece la pena reintentar */
function isRetryable(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Petición HTTP base con:
 *  - Timeout por intento (Promise.race + AbortController)
 *  - Reintentos con backoff exponencial para errores de red y 5xx/429
 *  - Verificación de res.ok — lanza HttpError ante cualquier 4xx/5xx
 *  - Errores tipados: NetworkError, HttpError, TimeoutError
 */
export async function request(
  url: string,
  options: RequestOptions = {},
): Promise<Response> {
  const {
    method  = 'GET',
    headers = {},
    body,
    retries = DEFAULT_RETRIES,
    timeout = DEFAULT_TIMEOUT,
    acceptStatus = false,
  } = options;

  const merged = { 'User-Agent': DEFAULT_UA, ...headers };
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // AbortController no existe en el QuickJS de PrismHub. Es opcional: el
    // Promise.race de abajo ya garantiza el timeout aunque no podamos cancelar
    // el fetch subyacente.
    const Ctrl =
      typeof AbortController !== 'undefined' ? AbortController : null;
    const controller = Ctrl ? new Ctrl() : null;

    try {
      // Promise.race garantiza timeout aunque el runtime no soporte AbortSignal
      const res = await Promise.race([
        fetch(url, {
          method,
          headers: merged,
          body,
          signal: controller ? controller.signal : undefined,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => {
            if (controller) controller.abort();
            reject(new TimeoutError(timeout, url));
          }, timeout),
        ),
      ]);

      // acceptStatus: devolver la respuesta sea cual sea el código (para
      // resolución de embeds — muchos hosts traen el contenido útil en páginas
      // 403/404). Si no, errores 4xx/5xx lanzan HttpError.
      if (acceptStatus || res.ok) {
        if (controller) controller.abort(); // cancelar el timer de timeout
        return res;
      } else {
        const err = new HttpError(res.status, res.statusText, url);
        // Reintentar solo si es retryable Y quedan intentos
        if (isRetryable(res.status) && attempt < retries) {
          lastError = err;
        } else {
          throw err;
        }
      }
    } catch (err) {
      // Timeout — no reintentar
      if (err instanceof TimeoutError) throw err;
      // HttpError no-retryable — ya fue lanzado arriba, dejar pasar
      if (err instanceof HttpError) throw err;
      // Error de red — reintentar
      lastError = new NetworkError(err, url);
    }

    if (attempt < retries) await _sleep(300 * 2 ** attempt); // 300ms, 600ms
  }

  throw lastError;
}

// ─── Helpers públicos ─────────────────────────────────────────────────────────

/** GET → string (HTML o texto plano) */
export async function get(
  url: string,
  headers?: Record<string, string>,
): Promise<string> {
  return (await request(url, { headers })).text();
}

/** GET → JSON parseado y tipado */
export async function getJson<T = unknown>(
  url: string,
  headers?: Record<string, string>,
): Promise<T> {
  return (await request(url, { headers })).json() as Promise<T>;
}

/** POST con body de texto → string */
export async function post(
  url: string,
  body: string,
  headers?: Record<string, string>,
): Promise<string> {
  return (await request(url, { method: 'POST', body, headers })).text();
}

/** POST con objeto → JSON parseado */
export async function postJson<T = unknown>(
  url: string,
  data: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  return (
    await request(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', ...headers },
    })
  ).json() as Promise<T>;
}

// ─── Interno ──────────────────────────────────────────────────────────────────

function _sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

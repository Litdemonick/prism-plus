<div align="center">

<br>

<picture>
  <img src="https://raw.githubusercontent.com/Litdemonick/prism-plus/main/assets/logo_prismplus.png" alt="Prism+" width="340" />
</picture>

<br><br>

# ✨ Prism+

**El motor de extensiones oficial y exclusivo de PrismHub.**

<br>

[![Licencia MIT](https://img.shields.io/github/license/Litdemonick/prism-plus?style=flat-square)](LICENSE)
[![Extensiones](https://img.shields.io/badge/extensiones-3_verificadas-6f42c1?style=flat-square)](#catalogo)
[![Firma](https://img.shields.io/badge/firma-Ed25519-2ea043?style=flat-square)](#seguridad)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript)](tsconfig.json)

</div>

Prism+ es la **única fuente de extensiones de [PrismHub](https://github.com/Litdemonick/Prism_Hub)**. PrismHub se alimenta exclusivamente de este repositorio: trae de fábrica un conjunto curado de extensiones nativas y descarga el resto del catálogo desde aquí.

Cada extensión habla con una fuente (un sitio de anime, una API de manga, una plataforma de películas, un feed de video) y expone una interfaz unificada. El build genera **el formato nativo de PrismHub** automáticamente — cabecera `==PrismHubExtension==` + `export default class extends Extension` — así que todo lo que se publica aquí funciona directamente en la app.

> 🌍 **Alcance:** anime, manga, manhwa, películas, series, documentales, TV en vivo, novelas, podcasts, feeds de video y más.

> 🧪 **Estado actual: arranque limpio.** El catálogo se reinició para incluir **solo extensiones verificadas una por una**. Hoy hay 3 (TioAnime, MonosChinos, MangaDex); las nuevas se agregan y se prueban desde el [Prism+ Studio](#studio) antes de publicarse, para no shippear nada sin testear.

> 🔒 **Cerrado y firmado.** Solo el mantenedor publica. Cada extensión se **firma con una llave privada Ed25519** y PrismHub la verifica con la llave pública embebida — rechaza cualquier extensión no firmada o alterada (ver [Seguridad](#seguridad)). Que el repo sea público (legible) no permite a nadie inyectar extensiones: hace falta la llave privada, que nunca sale de la máquina del mantenedor.

---

## 📋 Tabla de Contenidos

- [🏗️ Arquitectura](#arquitectura)
- [🛡️ Calidad y robustez](#calidad)
- [🔐 Seguridad — firma de extensiones](#seguridad)
- [🎞️ Reproducción de video — page-sniff por WebView](#video)
- [🛠️ Prism+ Studio — administrar y probar extensiones](#studio)
- [📦 Referencia del SDK](#sdk)
- [🔧 Cómo escribir una extensión](#extension)
- [📚 Catálogo de extensiones](#catalogo)
- [🔌 Consumo desde PrismHub](#integracion)
- [⚙️ Build](#build)

---

<a id="arquitectura"></a>

## 🏗️ Arquitectura

```
prism-plus/
├── sdk/
│   ├── index.ts      ← Punto de entrada único del SDK (barrel export)
│   ├── types.ts      ← Contratos públicos (PrismItem, PrismDetail, PrismWatch, PrismPage…)
│   ├── http.ts       ← Cliente HTTP — timeout, reintentos, errores tipados
│   ├── html.ts       ← Parser HTML basado en regex (sin DOM)
│   ├── unpack.ts     ← Desobfuscador P.A.C.K.E.R. (kwik.si y similares)
│   ├── validate.ts   ← Guards de tipos en runtime (lanzan error)
│   ├── sanitize.ts   ← Sanitización defensiva en runtime (coerción, no lanza)
│   └── cache.ts      ← Caché en memoria con TTL
├── extensions/
│   └── <nombre>/
│       ├── index.ts      ← latest(), search(), detail(), watch()
│       └── manifest.json ← name, package, version, type, icon, description
├── scripts/
│   ├── build.mjs     ← Compilador esbuild → dist/ + index.json + footer de sanitización
│   ├── validate.mjs  ← Validador pre-build de estructura
│   └── test.mjs      ← Smoke tests de bundles compilados
└── dist/             ← Generado por CI y commiteado automáticamente — no editar a mano
```

Cada extensión se compila como un **bundle IIFE autocontenido** (el SDK queda embebido, sin dependencias externas en runtime). El `index.json` es el catálogo que tu app descarga para descubrir extensiones.

### 🔄 Flujo de datos

```
latest(page) ──► Fuente web ──► JSON/HTML ──► PrismItem[]
                                                    │
                                          [sanitize automático]
                                                    │
search(kw)   ──────────────────────────────────► cliente

detail(url)  ──► Fuente web ──► PrismDetail ──► [sanitize] ──► cliente

watch(url)   ──► Fuente web ──► PrismWatch  ──────────────────► cliente
```

El build script **inyecta automáticamente** un footer de sanitización en cada bundle. El cliente siempre recibe campos `url` como strings no vacíos — los episodios con URL inválida son descartados silenciosamente.

### 💡 Supuestos de runtime

El SDK usa las siguientes APIs globales. El host debe proveerlas si el entorno no las incluye de forma nativa (ej: QuickJS, JavaScriptCore, Hermes).

| Global | Usado en | Notas |
|--------|----------|-------|
| `fetch(input, init?)` | `sdk/http.ts` — todas las peticiones HTTP | Obligatorio. Debe retornar una `Promise<Response>` compatible |
| `AbortController` / `AbortSignal` | `sdk/http.ts` — timeout por petición vía `Promise.race` | Obligatorio. Sin él, cada llamada a `request()` lanza `ReferenceError` |
| `btoa(str)` / `atob(str)` | Extensiones que encodifican en Base64 | Obligatorio si alguna extensión los usa |
| `console.log/warn/error` | Logs de debug en extensiones | Opcional. Sin él, los `console.*` lanzan error silencioso |
| `setTimeout` / `clearTimeout` | Backoff de reintentos en `sdk/http.ts` | Obligatorio si se usan reintentos con delay |

**Sin DOM, sin Node.js built-ins, sin sistema de archivos. Sintaxis ES2020 garantizada.**

#### Ejemplo de polyfills mínimos para QuickJS (Dart/Flutter)

> ⚠️ **Crítico — bridge síncrono para `fetch`:** En motores embebidos como QuickJS (flutter_js), `sendMessage` llama al handler de Dart de forma **completamente síncrona** y devuelve el valor de retorno inmediatamente. Un handler `async` no funciona — QuickJS recibiría el objeto `Future` sin resolver, no la respuesta HTTP.
>
> El patrón correcto es: `sendMessage('fetch', req)` devuelve un `reqId` String síncrono → Dart inicia el HTTP en background → al completar inyecta el resultado con `rt.evaluate('__fetchDone(reqId, json)')` → la Promise de `fetch()` se resuelve dentro de esa llamada a `evaluate()`.

```dart
// 1. Handler síncrono: devuelve reqId inmediatamente (DEBE ser String, no int)
rt.onMessage('hostFetch', (dynamic args) {
  final reqId = (++_counter).toString();
  _startFetch(reqId, args.toString()); // fire-and-forget async
  return reqId; // síncrono — QuickJS recibe el reqId en la misma llamada
});

// 2. HTTP async: al terminar, inyecta el resultado en QuickJS
void _startFetch(String reqId, String reqJson) async {
  try {
    final req = jsonDecode(reqJson);
    final res = await http.get(Uri.parse(req['url']));
    final payload = jsonEncode({'status': res.statusCode, 'body': res.body, ...});
    rt.evaluate('__fetchDone("$reqId", ${jsonEncode(payload)})');
  } catch (e) {
    rt.evaluate('__fetchErr("$reqId", ${jsonEncode(e.toString())})');
  }
}

// 3. Polyfill JS: fetch() crea Promise, __fetchDone() la resuelve
rt.evaluate(r'''
var __fetchCbs = {};
globalThis.fetch = function(input, init) {
  var reqId = sendMessage('hostFetch', JSON.stringify({
    url: typeof input === 'string' ? input : input.url,
    method: (init && init.method || 'GET').toUpperCase(),
    headers: (init && init.headers) || {},
  }));
  return new Promise(function(resolve, reject) {
    __fetchCbs[reqId] = { ok: resolve, err: reject };
  });
};
globalThis.__fetchDone = function(id, json) {
  var cb = __fetchCbs[id]; if (!cb) return; delete __fetchCbs[id];
  var d = JSON.parse(json);
  cb.ok({ ok: d.status >= 200 && d.status < 300, status: d.status,
    text: function() { return Promise.resolve(d.body); },
    json: function() { return Promise.resolve(JSON.parse(d.body)); } });
};
globalThis.__fetchErr = function(id, msg) {
  var cb = __fetchCbs[id]; if (!cb) return; delete __fetchCbs[id];
  cb.err(new Error(msg));
};

// AbortController (stub mínimo — el timeout de 15s del SDK lo usa)
(function() {
  function AbortSignal() { this.aborted = false; this._l = []; }
  AbortSignal.prototype.addEventListener = function(t, fn) { if (t==='abort') this._l.push(fn); };
  AbortSignal.prototype._abort = function() {
    this.aborted = true; this._l.forEach(function(f){try{f({type:'abort'});}catch(_){}});
  };
  function AbortController() { this.signal = new AbortSignal(); }
  AbortController.prototype.abort = function() { this.signal._abort(); };
  globalThis.AbortController = AbortController;
  globalThis.AbortSignal = AbortSignal;
})();
''');
```

> PrismHub implementa todos estos polyfills en [`lib/data/services/extension/extension_service.dart`](https://github.com/Litdemonick/Prism_Hub/blob/develop/lib/data/services/extension/extension_service.dart).
>
> **Nota adicional:** Si cargas múltiples extensiones en instancias de runtime independientes, usa nombres de canal únicos por instancia (ej: `'hostFetch_io_prismhub_jikan'`) para evitar que los handlers de diferentes runtimes se sobreescriban entre sí.

---

<a id="calidad"></a>

## 🛡️ Calidad y robustez

### Errores tipados y distinguibles

El SDK lanza tres clases de error diferenciadas — la app siempre sabe qué falló:

| Error | Cuándo | ¿Se reintenta? |
|-------|--------|----------------|
| `HttpError(status, statusText, url)` | Servidor respondió con 4xx / 5xx | Solo 429 y 5xx |
| `NetworkError` | Sin respuesta (red caída, DNS) | Siempre |
| `TimeoutError` | Servidor tardó más de 15s | No |

```typescript
import { getJson, HttpError, TimeoutError } from '../../sdk';

try {
  const data = await getJson('/api/...');
} catch (err) {
  if (err instanceof HttpError)    console.error(`Error ${err.status} — ${err.url}`);
  if (err instanceof TimeoutError) console.error('La fuente tardó demasiado');
}
```

### Reintentos inteligentes con backoff exponencial

```
Intento 1 → error de red     → espera 300ms
Intento 2 → HTTP 503         → espera 600ms
Intento 3 → éxito ✅
```

Reintentar: errores de red, `429`, `5xx`. No reintentar: `TimeoutError`, `4xx`.

### Timeout de 15s por petición

`Promise.race + AbortController` — ningún fetch se queda colgado indefinidamente. Configurable por extensión:

```typescript
const res = await request(url, { timeout: 8_000 });
```

### Sanitización automática de retornos

El build script inyecta un wrapper invisible al final de cada bundle que sanitiza automáticamente los retornos de `latest()`, `search()` y `detail()` antes de que lleguen al cliente:

- **`url` numérico → string**: si una fuente devuelve `episodes = [1, 2, 3]` en vez de slugs, el `url` queda `"1"`, `"2"`, `"3"`. El wrapper lo deja como está — es responsabilidad de `detail()` construir la URL correcta desde el slug del anime (ver patrón en tioanime).
- **Episodios con `url` vacío o null** → descartados del array.
- **Ítems de lista con `url` vacío** → descartados.
- **`title` null/undefined** → se sustituye por `url`.

```typescript
// Ejemplo: la fuente devuelve números en el array de episodios
// ❌ antes: watch() recibía "1" → 404
function _parseEpisodes(html: string, animeSlug: string) {
  const raw = JSON.parse(match[1]); // [1, 2, 3, ...]
  return raw.map((ep, i) => {
    // ✅ construir slug completo cuando ep es número
    const slug = typeof ep === 'number' ? `${animeSlug}-${ep}` : String(ep);
    return { title: `Episodio ${i + 1}`, url: slug };
  });
}
```

También puedes usar las funciones de sanitización manualmente si tu extensión necesita lógica especial:

```typescript
import { sanitizeDetail, sanitizeItems, sanitizeEpisode } from '../../sdk';

const result = sanitizeDetail(await fetchDetail(url));
```

### Validación estricta (opcional)

```typescript
import { guardItem, guardDetail, isValidWatch } from '../../sdk';

guardItem(data);    // lanza ValidationError si no tiene title + url
guardDetail(data);  // lanza si no tiene title + episodes[]
isValidWatch(data); // retorna boolean, no lanza
```

Error típico: `PrismDetail [GoGoAnime.detail()]: campo 'title' — se esperaba string no vacío, recibido undefined`

### Caché en memoria con TTL

```typescript
import { createCache, TTL } from '../../sdk';
const CACHE = createCache();

export async function latest(page: number) {
  const hit = CACHE.get<PrismItem[]>(`latest:${page}`);
  if (hit) return hit;
  const result = await fetchLatest(page);
  CACHE.set(`latest:${page}`, result, TTL.LIST); // 5 minutos
  return result;
}
```

TTLs recomendados: `TTL.LIST` = 5min · `TTL.DETAIL` = 30min · `TTL.WATCH` = 0 (no cachear, las URLs expiran)

### Desobfuscador P.A.C.K.E.R.

Para fuentes que usan kwik.si u otros CDNs con scripts obfuscados por el algoritmo de Dean Edwards:

```typescript
import { unpackAllInHtml, isPacked } from '../../sdk';

const html     = await get(embedUrl, { Referer: baseUrl });
const unpacked = unpackAllInHtml(html);   // devuelve el código fuente real
const m3u8     = matchFirst(unpacked[0], /source='([^']+\.m3u8)'/);
```

### Pipeline CI — 4 pasos, falla rápido

```
1. npm run validate   → estructura y campos de manifest
2. npm run typecheck  → errores TypeScript (tsc --noEmit)
3. npm run build      → compilación esbuild
4. npm test           → smoke tests: verifica exports y async en cada bundle
```

Si el paso 1 falla, el 2, 3 y 4 no corren. `dist/` nunca se contamina.

### Versionado de protocolo

```json
{ "name": "Prism+", "protocolVersion": "1", "extensions": [...] }
```

---

<a id="seguridad"></a>

## 🔐 Seguridad — firma de extensiones

PrismHub ejecuta el JavaScript de cada extensión. Para que **nadie pueda inyectar una extensión maliciosa** —ni por un PR colado, ni por un repo comprometido, ni por un ataque MITM en la descarga— cada bundle se **firma criptográficamente**.

```
Mantenedor                                   PrismHub (la app)
──────────                                   ─────────────────
🔒 llave PRIVADA (Ed25519)                   🔓 llave PÚBLICA embebida
   · nunca sale de su máquina                   · viaja dentro de la app
   · gitignored (.keys/)

Al publicar:  firma = sign(privada, bundle.js)   →  guardada en index.json
                                                     (campos sha256 + signature)
Al instalar:  PrismHub baja el bundle  →  verify(pública, bundle, signature)
                                          · firma válida   → instala ✅
                                          · sin firma/alterada → RECHAZA ❌
```

**Por qué el repo público no es un riesgo:** leer el código (público) no es escribir. Solo el mantenedor pushea, y aunque alguien lograra colar un bundle, sin la llave privada la firma no valida y la app lo rechaza. La seguridad no depende del repo sino de la **llave**.

```bash
npm run keygen   # genera el par una sola vez:
                 #   .keys/private.pem  → SECRETA, gitignored (respaldala)
                 #   keys/public.pem    → pública, commiteada
                 #   keys/public.hex    → para embeber en prism_hub
```

Cada `npm run build` firma automáticamente si `.keys/private.pem` está presente. El `index.json` queda con `sha256` + `signature` por extensión.

---

<a id="video"></a>

## 🎞️ Reproducción de video — page-sniff por WebView

Los sitios de anime alojan el video en hosts embed (voe, streamwish, doodstream, mp4upload…) que ofuscan su stream y rotan la técnica seguido. En vez de pelear un resolver regex por host, PrismHub usa la lógica del **propio navegador**:

```
watch() devuelve, además de los servidores que pudo resolver:
  · pageUrl  → la URL de la página del episodio en el sitio

Si los resolvers nativos no sacan el stream, PrismHub:
  1. carga pageUrl en un WebView OCULTO (pasa Cloudflare, corre el JS real)
  2. monta los embeds del sitio en iframes y deja que sus players arranquen
  3. intercepta el .m3u8/.mp4 que el player pide (hook de fetch/XHR/<video>)
  4. lo reproduce NATIVO en el reproductor (mpv) — rápido, sin anuncios
```

Por eso una extensión de video solo necesita devolver `pageUrl` (y los embeds que pueda); el page-sniff universal hace el resto. Mega es la única excepción (transmite cifrado dentro de su página).

```typescript
export async function watch(url: string): Promise<PrismWatch> {
  const pageUrl = `${BASE}/ver/${url}`;
  const html = await get(pageUrl);
  // ...intentar resolver embeds...
  return { streams: [...resueltos, ...embeds], pageUrl };  // pageUrl = fallback universal
}
```

---

<a id="studio"></a>

## 🛠️ Prism+ Studio — administrar y probar extensiones

El Studio es la herramienta visual (local) para el mantenedor: **crear, editar, probar, firmar y publicar** extensiones sin tocar la consola.

| Acción | Qué hace |
|--------|----------|
| **Listar** | Todas las extensiones con estado ✅ probada / ❌ falla / ⏳ sin probar + versión |
| **Crear / Editar** | Formulario de manifest + editor del `index.ts` |
| **Probar (de verdad)** | Corre `latest` / `search` / `detail` / `watch` contra la fuente real y muestra los resultados |
| **Firmar + Publicar** | `npm run build` (firma) + commit + push a GitHub, con un botón |
| **Borrar** | Quita la extensión y regenera `index.json` |

El **push** usa las credenciales git locales del mantenedor — que el código del Studio sea open source no le da acceso de publicación a nadie.

---

<a id="sdk"></a>

## 📦 Referencia del SDK

> Importa siempre desde `'../../sdk'` — el barrel `sdk/index.ts` expone todo.

### `types.ts` — Contratos

#### `MediaType`
```typescript
type MediaType =
  'anime' | 'manga' | 'novel' | 'movie' | 'series' |
  'documentary' | 'live' | 'video' | 'music' | 'podcast' | 'other'
```

#### `PrismItem` — latest() y search()
```typescript
interface PrismItem {
  title: string; url: string;
  cover?: string; description?: string; tags?: string[];
  year?: number; rating?: number; type?: MediaType;
}
```

#### `PrismPage<T>` — paginación enriquecida (opcional)
```typescript
interface PrismPage<T = PrismItem> {
  items:   T[];
  hasMore: boolean;  // false = no hay más páginas
  total?:  number;   // si la API lo provee
}
```

#### `PrismDetail` — detail()
```typescript
interface PrismDetail {
  title: string;
  cover?: string; description?: string;
  episodes: PrismEpisode[];
  seasons?:  PrismSeason[];
  genres?: string[];
  status?: 'ongoing' | 'completed' | 'upcoming' | 'hiatus';
  year?: number; rating?: number;
  extra?: Record<string, string>;
}
interface PrismEpisode { title: string; url: string; thumbnail?: string; duration?: number; airDate?: string; number?: number; }
interface PrismSeason  { title: string; episodes: PrismEpisode[]; year?: number; cover?: string; }
```

#### `PrismWatch` — watch()
```typescript
interface PrismWatch {
  streams:    PrismStream[];
  subtitles?: PrismSubtitle[];
  headers?:   Record<string, string>;
  reason?:    string;  // por qué streams[] está vacío: "region_blocked", "premium_required"…
}
interface PrismStream   { url: string; quality?: string; label?: string; headers?: Record<string, string>; mimeType?: string; }
interface PrismSubtitle { label: string; url: string; lang?: string; }
```

---

### `http.ts` — Cliente HTTP

```typescript
get(url, headers?)                          // → string (HTML)
getJson<T>(url, headers?)                   // → T (JSON)
post(url, body, headers?)                   // → string
postJson<T>(url, data, headers?)            // → T
request(url, { retries?, timeout?, ... })   // → Response
```

✅ Timeout 15s · ✅ 3 reintentos con backoff · ✅ `res.ok` verificado · ✅ Errores tipados

---

### `html.ts` — Parser sin DOM

```typescript
matchFirst(html, re)               // primer grupo capturado, '' si no hay match
matchFirstOr(html, re, fallback)   // como matchFirst pero retorna fallback
matchAll(html, re)                 // todos los grupos 1
matchGroups(html, re)              // todos los grupos como tuplas
between(html, start, end)          // texto entre dos delimitadores
attr(html, tag, attribute)         // valor de atributo HTML
stripTags(html)                    // elimina etiquetas
decodeEntities(str)                // &amp; → &, &lt; → <, …
```

---

### `unpack.ts` — Desobfuscador P.A.C.K.E.R.

```typescript
isPacked(source)          // boolean — detecta si es un script empaquetado
unpackPacker(packed)      // desempaqueta un script individual
unpackAllInHtml(html)     // extrae y desempaqueta todos los scripts del HTML
```

---

### `validate.ts` — Guards de runtime

```typescript
guardItem(x, context?)    // asserts x is PrismItem   — lanza ValidationError
guardDetail(x, context?)  // asserts x is PrismDetail — lanza ValidationError
guardWatch(x, context?)   // asserts x is PrismWatch  — lanza ValidationError
isValidItem(x)            // boolean, no lanza
isValidDetail(x)          // boolean, no lanza
isValidWatch(x)           // boolean, no lanza
```

---

### `sanitize.ts` — Sanitización de runtime

```typescript
sanitizeEpisode(ep)   // PrismEpisode | null — null si url está vacío
sanitizeDetail(d)     // PrismDetail — filtra episodios con url inválido
sanitizeItems(items)  // PrismItem[] — filtra ítems con url inválido
sanitizeWatch(w)      // PrismWatch  — filtra streams con url inválido
```

> Estas funciones son aplicadas **automáticamente** por el build script a cada extensión vía footer de esbuild. No es necesario llamarlas manualmente salvo en lógica personalizada.

---

### `cache.ts` — Caché TTL

```typescript
const CACHE = createCache();
CACHE.get<T>(key)              // T | undefined
CACHE.set(key, value, ttlMs)   // guarda con TTL
CACHE.has(key)                 // boolean
CACHE.delete(key)              // elimina entrada
CACHE.clear()                  // vacía todo

TTL.LIST   // 5 minutos  — para latest()/search()
TTL.DETAIL // 30 minutos — para detail()
TTL.WATCH  // 0          — no cachear watch()
```

---

<a id="extension"></a>

## 🔧 Cómo escribir una extensión

### Paso 1 — Crear la carpeta

```
extensions/mifuente/
├── index.ts
└── manifest.json
```

### Paso 2 — Manifest

```json
{
  "name": "Mi Fuente",
  "package": "io.prismhub.mifuente",
  "version": "1.0.0",
  "author": "tu-usuario",
  "type": "anime",
  "icon": "https://mifuente.com/favicon.png",
  "description": "Descripción corta"
}
```

`type` válidos: `anime` · `manga` · `novel` · `movie` · `series` · `documentary` · `live` · `video` · `music` · `podcast` · `other`

### Paso 3 — `index.ts`

```typescript
import { getJson, createCache, guardDetail, TTL } from '../../sdk';
import type { PrismItem, PrismDetail, PrismWatch } from '../../sdk';

const API   = 'https://api.mifuente.com/v1';
const CACHE = createCache();

export async function latest(page: number): Promise<PrismItem[]> {
  const hit = CACHE.get<PrismItem[]>(`l:${page}`);
  if (hit) return hit;
  const data = await getJson<{ results: any[] }>(`${API}/latest?page=${page}`);
  const result = data.results.map(r => ({ title: r.title, url: r.id, cover: r.poster }));
  CACHE.set(`l:${page}`, result, TTL.LIST);
  return result;
}

export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const data = await getJson<{ results: any[] }>(
    `${API}/search?q=${encodeURIComponent(keyword)}&page=${page}`,
  );
  return data.results.map(r => ({ title: r.title, url: r.id, cover: r.poster }));
}

export async function detail(url: string): Promise<PrismDetail> {
  const data = await getJson<any>(`${API}/info/${url}`);
  const result = {
    title:    data.title,
    cover:    data.poster,
    genres:   data.genres,
    episodes: data.episodes.map((ep: any) => ({ title: `Ep ${ep.n}`, url: ep.id })),
  };
  guardDetail(result, 'MiFuente.detail()');
  return result;
}

export async function watch(url: string): Promise<PrismWatch> {
  const data = await getJson<any>(`${API}/watch/${url}`);
  return { streams: data.sources.map((s: any) => ({ url: s.url, quality: s.quality })) };
}
```

### ✅ Reglas

| ✅ Hacer | ❌ Evitar |
|----------|-----------|
| Importar desde `'../../sdk'` | Importar módulos de Node.js |
| Usar `guardDetail()` para validar en runtime | Usar `document`, `window` |
| Caché con `createCache()` + `TTL.*` | `eval()` o código dinámico |
| `{ streams: [], reason: 'premium_required' }` si no hay stream | Lanzar errores no controlados |
| `url` siempre string no vacío en PrismEpisode / PrismItem | Retornar IDs numéricos directamente |
| Construir el slug completo si la fuente usa números (`${animeSlug}-${n}`) | Esperar que el cliente lo construya |
| `watch()` retorna URLs directas (m3u8/mp4) **y** `pageUrl` para el [page-sniff](#video) | Omitir `pageUrl`: sin él, si los resolvers fallan, no hay fallback universal |
| Encodear `[]` en query strings como `%5B%5D` — ej: `order%5Brating%5D=desc` | Usar `[]` literales en URLs — Dart/Dio puede codificarlos y causar rechazo de la API |

### Cómo manejar URLs de episodio construidas desde HTML

Cuando una fuente codifica los episodios como identificadores numéricos o slugs parciales en el HTML, `detail()` debe construir la URL completa que `watch()` necesita:

```typescript
// Patrón: la fuente tiene var episodes = [1, 2, 3] (números)
// watch() espera: "naruto-shippuden-1", "naruto-shippuden-2"…

export async function detail(url: string): Promise<PrismDetail> {
  const html = await get(`${BASE}/anime/${url}`);
  // url = slug del anime, ej: "naruto-shippuden"
  return {
    ...,
    episodes: _parseEpisodes(html, url),
  };
}

function _parseEpisodes(html: string, animeSlug: string) {
  const raw = JSON.parse(/* extraer array del HTML */);
  return raw.map((ep: string | number, i: number) => {
    const slug = typeof ep === 'number' ? `${animeSlug}-${ep}` : ep;
    return { title: `Episodio ${i + 1}`, url: slug };
  });
}

export async function watch(url: string): Promise<PrismWatch> {
  // url = "naruto-shippuden-1" — URL válida directa
  const html = await get(`${BASE}/ver/${url}`);
  ...
}
```

### Paso 4 — Versionar y publicar

Cada vez que modifiques el código de una extensión, incrementa el `version` en su `manifest.json`:

```json
{ "version": "1.0.1" }
```

El cliente compara la versión del índice remoto con la versión local — si difieren, reinstala automáticamente. Sin bump de versión, los usuarios existentes no reciben el fix.

```bash
npm run build   # validate + typecheck + esbuild + test
# luego hacer commit de: index.ts, manifest.json, dist/<nombre>.js, index.json
```

---

<a id="catalogo"></a>

## 📚 Catálogo de extensiones

> 🧪 **Arranque limpio.** El catálogo se reinició para incluir **solo extensiones verificadas una por una** desde el [Studio](#studio). Las nuevas se agregan probadas; nada se shippea sin testear.

**3 extensiones verificadas**

| Extensión | Idioma | Fuente | Tipo | Estado |
|-----------|--------|--------|------|--------|
| **TioAnime** | ES | tioanime.com | Anime | ✅ probada |
| **MonosChinos** | ES | monoschinos.st | Anime | ✅ probada |
| **MangaDex** | Multi | api.mangadex.org | Manga | ✅ probada |

> Las extensiones de anime usan el [page-sniff por WebView](#video) como fallback universal de reproducción.

---

<a id="integracion"></a>

## 🔌 Consumo desde PrismHub

> ⚠️ **Prism+ es exclusivo de [PrismHub](https://github.com/Litdemonick/Prism_Hub).** No es un núcleo universal para otras apps: cada extensión se publica en el **formato nativo de PrismHub** (cabecera `==PrismHubExtension==` + `export default class extends Extension`) y se ejecuta dentro del runtime de PrismHub. Otra app no podría cargarlas sin replicar ese runtime.

PrismHub ya viene configurado para alimentarse de este repositorio. No hay nada que integrar manualmente:

1. Descarga el catálogo `index.json` y muestra las extensiones disponibles.
2. Pre-instala el conjunto curado de nativas y descarga el resto bajo demanda.
3. Carga cada `.js` (formato `export default class extends Extension`) en su motor JS.

```
GET https://raw.githubusercontent.com/Litdemonick/prism-plus/main/index.json
```

```json
{
  "name": "Prism+",
  "protocolVersion": "1",
  "extensions": [
    {
      "name": "TioAnime",
      "package": "io.prismhub.tioanime",
      "version": "1.1.0",
      "type": "bangumi",
      "webSite": "https://tioanime.com",
      "script": "https://raw.githubusercontent.com/Litdemonick/prism-plus/main/dist/tioanime.js"
    }
  ]
}
```

Cada `script` apunta a un bundle ya listo para PrismHub:

```javascript
// ==PrismHubExtension==
// @package      io.prismhub.tioanime
// @type         bangumi
// ==/PrismHubExtension==
export default class extends Extension {
  async latest(page) { /* ... */ }
  async search(kw, page) { /* ... */ }
  async detail(url) { /* ... */ }
  async watch(url) { /* ... */ }
}
```

### Self-hosting (solo el mantenedor)

```yaml
env:
  REPO_OWNER: Litdemonick
  REPO_NAME:  prism-plus
  BRANCH:     main
```

---

<a id="build"></a>

## ⚙️ Build

```bash
npm install
npm run validate    # estructura y campos de cada extensión
npm run typecheck   # TypeScript strict (tsc --noEmit)
npm run build       # validate + esbuild → dist/ + index.json
npm test            # smoke tests: verifica exports de cada bundle
```

| Variable | Default | Descripción |
|----------|---------|-------------|
| `REPO_OWNER` | `Litdemonick` | Usuario GitHub para URLs raw |
| `REPO_NAME` | `prism-plus` | Nombre del repo |
| `BRANCH` | `main` | Rama de producción |

---

<a id="contribuir"></a>

## 🤝 Contribuir

1. 🍴 Fork del repo
2. ➕ Crea `extensions/<nombre>/index.ts` + `manifest.json`
3. 🔨 `npm run build` — corrige cualquier error
4. 📬 Pull Request

**Lineamientos:**
- TypeScript únicamente — `import { ... } from '../../sdk'`
- Implementaciones originales — no copiar código de otros repos
- Si una fuente requiere `eval` o crypto del cliente: `{ streams: [], reason: 'js_eval_required' }`

---

## 📄 Licencia

MIT © [Litdemonick](https://github.com/Litdemonick)

---

<div align="center">

⭐ Si Prism+ te resulta útil, ¡dale una estrella al repo!

</div>

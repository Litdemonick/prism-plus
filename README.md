<div align="center">

# ✨ Prism+

**El núcleo de extensiones universal y open-source para medios de streaming.**

[![Licencia MIT](https://img.shields.io/github/license/Litdemonick/prism-plus?style=flat-square)](LICENSE)
[![Extensiones](https://img.shields.io/badge/extensiones-16-6f42c1?style=flat-square)](#catalogo)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript)](tsconfig.json)
[![Build](https://img.shields.io/github/actions/workflow/status/Litdemonick/prism-plus/build.yml?branch=main&style=flat-square&label=CI)](https://github.com/Litdemonick/prism-plus/actions)

</div>

Prism+ es la capa de extensiones que impulsa [PrismHub](https://github.com/Litdemonick/Prism_Hub) y cualquier cliente de medios compatible. Cada extensión es un módulo TypeScript que sabe cómo hablar con una fuente — un sitio de anime, una API de manga, una plataforma de películas, un feed de video — y expone una interfaz unificada que tu app puede llamar.

> 🌍 **Alcance:** anime, manga, manhwa, películas, series, documentales, TV en vivo, novelas, podcasts, feeds de video y mucho más. Si existe una fuente web pública, puede haber una extensión Prism+ para ella.

---

## 📋 Tabla de Contenidos

- [🏗️ Arquitectura](#arquitectura)
- [🛡️ Calidad y robustez](#calidad)
- [📦 Referencia del SDK](#sdk)
- [🔧 Cómo escribir una extensión](#extension)
- [📚 Catálogo de extensiones](#catalogo)
- [🔌 Integrar Prism+ en tu app](#integracion)
- [⚙️ Build](#build)
- [🤝 Contribuir](#contribuir)

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
│   ├── validate.ts   ← Guards de tipos en runtime
│   └── cache.ts      ← Caché en memoria con TTL
├── extensions/
│   └── <nombre>/
│       ├── index.ts      ← latest(), search(), detail(), watch()
│       └── manifest.json ← name, package, version, type, icon, description
├── scripts/
│   ├── build.mjs     ← Compilador esbuild → dist/ + index.json
│   ├── validate.mjs  ← Validador pre-build de estructura
│   └── test.mjs      ← Smoke tests de bundles compilados
└── dist/             ← Generado por CI — no hacer commit manualmente
```

Cada extensión se compila como un **bundle IIFE autocontenido** (el SDK queda embebido, sin dependencias externas en runtime). El `index.json` es el catálogo que tu app descarga para descubrir extensiones.

### 💡 Supuestos de runtime

- `fetch()` disponible como global (provisto por el host, ej: QuickJS en PrismHub)
- Sin DOM, sin Node.js built-ins, sin sistema de archivos
- Sintaxis ES2020 garantizada

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

### Validación de tipos en runtime

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

### Paso 4 — Build

```bash
npm run build   # validate + typecheck + esbuild + test
```

---

<a id="catalogo"></a>

## 📚 Catálogo de extensiones

**16 extensiones · 5 categorías**

### 🎌 Anime — 8

| Extensión | Idioma | Fuente | Estado |
|-----------|--------|--------|--------|
| **GoGoAnime** | EN | Consumet API | ✅ HLS streams |
| **AniGoGo** | EN | amvstr.me + AniList | ✅ HLS streams |
| **Animepahe** | EN | animepahe.ru + kwik.si | ✅ HLS — desobfuscado con P.A.C.K.E.R. |
| **Enime** | EN | api.enime.moe | ✅ API abierta |
| **MonosChinos** | ES | monoschinos.net | ✅ HTML scrape + m3u8 |
| **TioAnime** | ES | tioanime.com | ✅ HTML scrape |
| **AnimeFLV** | ES | animeflv.net | ✅ HTML scrape |
| **Jikan Anime** | All | MyAnimeList via Jikan | 🔵 Solo metadatos |

### 📖 Manga — 4

| Extensión | Idioma | Fuente | Estado |
|-----------|--------|--------|--------|
| **MangaDex** | Multi | api.mangadex.org | ✅ API oficial, paralelo |
| **Comick** | Multi | comick.fun | ✅ Multi-idioma |
| **MangaBat** | EN | h.mangabat.com | ✅ HTML scrape |
| **OmegaScans** | EN | omegascans.org | ✅ Manhwa / manhua |

### 🎬 Películas — 2

| Extensión | Idioma | Fuente | Estado |
|-----------|--------|--------|--------|
| **FlixHQ** | EN | Consumet API | ✅ Películas + series |
| **YTS** | EN | yts.mx | ✅ Torrents magnet |

### 📺 Series — 1

| Extensión | Idioma | Fuente | Estado |
|-----------|--------|--------|--------|
| **Kisskh** | Multi | kisskh.co | ✅ Doramas, subtítulos paralelos |

### 🎥 Video — 1

| Extensión | Idioma | Fuente | Estado |
|-----------|--------|--------|--------|
| **Invidious** | All | cal1.iv.ggtyler.dev | ✅ YouTube-compatible |

> ✅ Funcional completo · 🔵 Solo metadatos / catálogo

---

<a id="integracion"></a>

## 🔌 Integrar Prism+ en tu app

### Descargar el catálogo

```
GET https://raw.githubusercontent.com/Litdemonick/prism-plus/main/index.json
```

```json
{
  "name": "Prism+",
  "protocolVersion": "1",
  "extensions": [
    {
      "name": "GoGoAnime",
      "package": "io.prismhub.gogoanime",
      "version": "1.0.0",
      "type": "anime",
      "script": "https://raw.githubusercontent.com/Litdemonick/prism-plus/main/dist/gogoanime.js"
    }
  ]
}
```

### Cargar y usar una extensión

El nombre global del IIFE es el `package` con no-alfanuméricos reemplazados por `_`:

```javascript
// io.prismhub.gogoanime → io_prismhub_gogoanime
const ext = io_prismhub_gogoanime;

const items  = await ext.latest(1);
const detail = await ext.detail(items[0].url);
const play   = await ext.watch(detail.episodes[0].url);
// play.streams[0].url → URL reproducible
// play.reason         → "premium_required" si está vacío
```

### Self-hosting

```yaml
env:
  REPO_OWNER: tu-usuario
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

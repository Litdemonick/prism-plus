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
│   ├── types.ts      ← Contratos públicos (PrismItem, PrismDetail, PrismWatch, …)
│   ├── http.ts       ← Cliente HTTP con timeout, reintentos y errores tipados
│   └── html.ts       ← Parser HTML basado en regex (sin DOM requerido)
├── extensions/
│   └── <nombre>/
│       ├── index.ts      ← Lógica de la extensión (latest, search, detail, watch)
│       └── manifest.json ← Metadatos (nombre, package id, tipo, icono, …)
├── scripts/
│   ├── build.mjs     ← Compilador esbuild → dist/<nombre>.js + index.json
│   └── validate.mjs  ← Validador pre-build de estructura y exports
└── dist/             ← Generado por CI — no hacer commit manualmente
```

Cada extensión se compila como un **bundle IIFE autocontenido** (sin dependencias externas en runtime). El `index.json` final es el catálogo que tu app descarga para descubrir las extensiones disponibles.

### 💡 Supuestos de runtime

- `fetch()` disponible como global (provisto por la app host, ej: QuickJS en PrismHub)
- Sin DOM, sin Node.js built-ins, sin sistema de archivos
- Sintaxis ES2020 garantizada

---

<a id="calidad"></a>

## 🛡️ Calidad y robustez

Prism+ está diseñado para ser confiable en producción, no solo en demos. Estas garantías están implementadas en el SDK y en el pipeline de CI.

### Manejo de errores — errores tipados y distinguibles

El SDK lanza tres tipos de error claramente diferenciados para que la app cliente pueda reaccionar de forma precisa:

| Error | Cuándo se lanza | ¿Se reintenta? |
|-------|-----------------|----------------|
| `HttpError` | El servidor respondió con 4xx / 5xx | Solo 429 y 5xx |
| `NetworkError` | No hubo respuesta (red caída, DNS, etc.) | Siempre |
| `TimeoutError` | El servidor tardó más de 15 segundos | No |

```typescript
import { getJson, HttpError, TimeoutError } from '../../sdk/http';

try {
  const data = await getJson('/api/...');
} catch (err) {
  if (err instanceof HttpError)    console.error(`Error ${err.status} en ${err.url}`);
  if (err instanceof TimeoutError) console.error('La fuente tardó demasiado');
  // NetworkError se reintenta automáticamente — nunca llega aquí si hay conexión
}
```

Antes de esta versión, un error 503 silenciosamente intentaba parsear HTML como JSON y lanzaba un `SyntaxError: Unexpected token '<'` sin contexto. **Eso ya no existe.**

### Reintentos inteligentes con backoff exponencial

`request()` reintenta automáticamente sin que la extensión haga nada:

```
Intento 1 → falla con error de red
  espera 300ms
Intento 2 → falla con HTTP 503
  espera 600ms
Intento 3 → éxito ✅
```

- **Reintentar:** errores de red, `429 Too Many Requests`, `5xx Server Error`
- **No reintentar:** `TimeoutError`, errores `4xx` (404, 401, 403…) — son definitivos

### Timeout por petición — sin fetches colgados

Cada `fetch()` tiene un timeout de **15 segundos** por defecto usando `Promise.race + AbortController`. Funciona aunque el runtime no soporte `AbortSignal` nativamente.

```typescript
// Timeout personalizado por extensión
const res = await request(url, { timeout: 8_000 }); // 8 segundos
```

### Validación pre-build — `npm run validate`

Antes de compilar, el script verifica cada extensión automáticamente:

- ✅ `manifest.json` existe y tiene todos los campos obligatorios
- ✅ El `type` es un valor válido de `MediaType`
- ✅ El `package` sigue el formato `io.prismhub.<nombre>`
- ✅ La `version` es semver válida (`1.0.0`)
- ✅ `index.ts` exporta las 4 funciones obligatorias (`latest`, `search`, `detail`, `watch`)
- ✅ No importa módulos de Node.js (`fs`, `path`, `crypto`) — incompatibles con QuickJS
- ✅ No usa `window` ni `document` — sin DOM en QuickJS

```
🔍  Validando 16 extensión(es)...

  ✓  gogoanime
  ✓  mangadex
  ✗  mi-extension
       ↳ manifest: campo 'icon' vacío o ausente
       ↳ index.ts: falta 'export async function watch('

❌  2 problema(s) encontrado(s) — corrige antes de compilar
```

### CI robusto — 3 pasos en orden

El pipeline de GitHub Actions ejecuta los pasos en secuencia y falla rápido:

```
1. npm run validate   ← estructura y campos del manifest
2. npm run typecheck  ← errores TypeScript (tsc --noEmit)
3. npm run build      ← compilación con esbuild
```

Si el paso 1 falla, el paso 2 y 3 no se ejecutan. El `dist/` del catálogo nunca se actualiza con código roto.

### Versionado de protocolo — `protocolVersion`

El `index.json` incluye un campo `protocolVersion` para que las apps cliente puedan detectar cambios de formato incompatibles:

```json
{
  "name": "Prism+",
  "protocolVersion": "1",
  "extensions": [...]
}
```

Si en el futuro se cambia el formato del catálogo de forma breaking, la versión sube a `"2"` y las apps antiguas saben que necesitan actualizarse.

---

<a id="sdk"></a>

## 📦 Referencia del SDK

### `sdk/types.ts`

#### 🏷️ `MediaType`

```typescript
type MediaType =
  | 'anime'        // Animación japonesa / donghua
  | 'manga'        // Cómics japoneses, manhwa, manhua, webtoon
  | 'novel'        // Light novels, web novels
  | 'movie'        // Películas
  | 'series'       // Series de TV, doramas
  | 'documentary'  // Documentales
  | 'live'         // TV en vivo / IPTV
  | 'video'        // Video general (YouTube, etc.)
  | 'music'        // MVs, videos musicales
  | 'podcast'      // Podcasts con video o audio
  | 'other';       // Cualquier otro tipo
```

#### 📄 `PrismItem` — retornado por `latest()` y `search()`

```typescript
interface PrismItem {
  title:        string;
  url:          string;     // id opaco o URL completa → se pasa a detail()
  cover?:       string;
  description?: string;
  tags?:        string[];
  year?:        number;
  rating?:      number;     // 0–10
  type?:        MediaType;
}
```

#### 🗂️ `PrismDetail` — retornado por `detail()`

```typescript
interface PrismDetail {
  title:        string;
  cover?:       string;
  description?: string;
  episodes:     PrismEpisode[];  // lista plana (sin temporadas)
  seasons?:     PrismSeason[];   // con temporadas (opcional)
  genres?:      string[];
  status?:      'ongoing' | 'completed' | 'upcoming' | 'hiatus';
  year?:        number;
  rating?:      number;
  extra?:       Record<string, string>;  // Estudio, Director, País, etc.
}

interface PrismEpisode {
  title:      string;
  url:        string;     // id opaco o URL → se pasa a watch()
  thumbnail?: string;
  duration?:  number;     // segundos
  airDate?:   string;     // ISO 8601 — YYYY-MM-DD
  number?:    number;
}

interface PrismSeason {
  title:    string;
  episodes: PrismEpisode[];
  year?:    number;
  cover?:   string;
}
```

#### ▶️ `PrismWatch` — retornado por `watch()`

```typescript
interface PrismWatch {
  streams:    PrismStream[];
  subtitles?: PrismSubtitle[];
  headers?:   Record<string, string>;  // headers globales para todos los streams
}

interface PrismStream {
  url:       string;
  quality?:  string;    // "1080p", "720p", "Página 1", …
  label?:    string;    // nombre visible en el selector de fuente
  headers?:  Record<string, string>;
  mimeType?: string;    // "application/x-mpegURL", "video/mp4", …
}

interface PrismSubtitle {
  label: string;
  url:   string;
  lang?: string;        // BCP-47: "es", "en", "ja", …
}
```

---

### 🌐 `sdk/http.ts`

Cliente HTTP con **timeout**, **reintentos inteligentes**, **errores tipados** y **User-Agent realista** de Chrome.

```typescript
get(url: string, headers?: Record<string, string>): Promise<string>
getJson<T>(url: string, headers?: Record<string, string>): Promise<T>
post(url: string, body: string, headers?: Record<string, string>): Promise<string>
postJson<T>(url: string, data: unknown, headers?: Record<string, string>): Promise<T>
request(url: string, options?: RequestOptions): Promise<Response>
```

✅ **Timeout de 15s** por petición — sin fetches colgados  
✅ Hasta **3 reintentos** con backoff exponencial (300ms → 600ms)  
✅ **Errores tipados**: `HttpError`, `NetworkError`, `TimeoutError`  
✅ **User-Agent de Chrome** por defecto (evita bloqueos básicos)  
✅ Verifica `res.ok` — nunca parsea HTML de error como JSON  
✅ Compatible con cualquier runtime que provea `fetch()` global

---

### 🔍 `sdk/html.ts`

Parser HTML basado en **expresiones regulares** — funciona sin DOM. Ideal para extensiones que hacen scraping.

```typescript
matchFirst(html, re)          // primer grupo capturado
matchAll(html, re)            // todos los grupos 1 como array
matchGroups(html, re)         // todos los grupos como array de tuplas
between(html, start, end)     // texto entre dos delimitadores
attr(html, tag, attribute)    // valor de un atributo HTML
stripTags(html)               // elimina etiquetas HTML
decodeEntities(str)           // &amp; → &, &lt; → <, …
```

---

<a id="extension"></a>

## 🔧 Cómo escribir una extensión

### Paso 1 — Crear la carpeta

```
extensions/
└── mifuente/
    ├── index.ts
    └── manifest.json
```

### Paso 2 — Escribir el manifest

```json
{
  "name": "Mi Fuente",
  "package": "io.prismhub.mifuente",
  "version": "1.0.0",
  "author": "tu-usuario-github",
  "type": "anime",
  "icon": "https://mifuente.com/favicon.png",
  "description": "Descripción corta de la fuente"
}
```

Valores válidos para `type`: `anime` · `manga` · `novel` · `movie` · `series` · `documentary` · `live` · `video` · `music` · `podcast` · `other`

### Paso 3 — Implementar `index.ts`

Cada extensión exporta exactamente **cuatro funciones async**:

```typescript
import { getJson } from '../../sdk/http';
import type { PrismItem, PrismDetail, PrismWatch } from '../../sdk/types';

const API = 'https://api.mifuente.com/v1';

export async function latest(page: number): Promise<PrismItem[]> {
  const data = await getJson<{ results: any[] }>(`${API}/latest?page=${page}`);
  return data.results.map(item => ({ title: item.title, url: item.id, cover: item.poster }));
}

export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const data = await getJson<{ results: any[] }>(
    `${API}/search?q=${encodeURIComponent(keyword)}&page=${page}`,
  );
  return data.results.map(item => ({ title: item.title, url: item.id, cover: item.poster }));
}

export async function detail(url: string): Promise<PrismDetail> {
  const data = await getJson<any>(`${API}/info/${url}`);
  return {
    title:       data.title,
    cover:       data.poster,
    description: data.synopsis,
    genres:      data.genres,
    status:      data.status === 'Completed' ? 'completed' : 'ongoing',
    episodes:    data.episodes.map((ep: any) => ({ title: `Episodio ${ep.number}`, url: ep.id })),
  };
}

export async function watch(url: string): Promise<PrismWatch> {
  const data = await getJson<any>(`${API}/watch/${url}`);
  return { streams: data.sources.map((s: any) => ({ url: s.url, quality: s.quality })) };
}
```

### ✅ Reglas de la extensión

| ✅ Hacer | ❌ Evitar |
|----------|-----------|
| Usar `getJson<T>()` para JSON | Importar módulos de Node.js (`fs`, `path`, `crypto`) |
| Usar `get()` para HTML scraping | Usar `document`, `window` u otras APIs DOM |
| Usar helpers de `sdk/html.ts` | Copiar código de otros repositorios |
| Retornar `{ streams: [] }` si watch() no puede extraer URL | Romper el build con código no compilable |
| Solo `title` y `url` son obligatorios | Dependencias externas en runtime |

### Paso 4 — Build y prueba

```bash
npm run build
# → valida, compila y actualiza dist/mifuente.js + index.json
```

---

<a id="catalogo"></a>

## 📚 Catálogo de extensiones

**16 extensiones** en **5 categorías de medios**.

### 🎌 Anime — 8 extensiones

| Extensión | Idioma | Fuente | Notas |
|-----------|--------|--------|-------|
| 🟢 **GoGoAnime** | EN | gogoanime via Consumet API | Streams HLS |
| 🟢 **AniGoGo** | EN | amvstr.me + AniList | Streams HLS |
| 🟡 **Animepahe** | EN | animepahe.ru | `watch()` vacío — kwik.si requiere JS eval |
| 🟢 **Enime** | EN | api.enime.moe | API abierta, HLS |
| 🟢 **MonosChinos** | ES | monoschinos.net | HTML scrape + m3u8 |
| 🟢 **TioAnime** | ES | tioanime.com | HTML scrape |
| 🟢 **AnimeFLV** | ES | animeflv.net | HTML scrape |
| 🔵 **Jikan Anime** | Todos | MyAnimeList via Jikan | Solo metadatos, sin streams |

> 🟢 Funcional completo · 🟡 Parcial · 🔵 Solo catálogo / metadatos

### 📖 Manga / Cómics — 4 extensiones

| Extensión | Idioma | Fuente | Notas |
|-----------|--------|--------|-------|
| 🟢 **MangaDex** | Multi | api.mangadex.org | API oficial, fetches paralelos |
| 🟢 **Comick** | Multi | comick.fun | Agrupa capítulos por idioma |
| 🟢 **MangaBat** | EN | h.mangabat.com | HTML scrape |
| 🟢 **OmegaScans** | EN | omegascans.org | Foco en manhwa / manhua |

### 🎬 Películas — 2 extensiones

| Extensión | Idioma | Fuente | Notas |
|-----------|--------|--------|-------|
| 🟢 **FlixHQ** | EN | flixhq.vip via Consumet | Películas + series |
| 🟢 **YTS** | EN | yts.mx | Links torrent (magnet) |

### 📺 Series / Dramas — 1 extensión

| Extensión | Idioma | Fuente | Notas |
|-----------|--------|--------|-------|
| 🟢 **Kisskh** | Multi | kisskh.co | Doramas asiáticos, subtítulos paralelos |

### 🎥 Video — 1 extensión

| Extensión | Idioma | Fuente | Notas |
|-----------|--------|--------|-------|
| 🟢 **Invidious** | Todos | cal1.iv.ggtyler.dev | Compatible con YouTube, sin tracking |

---

<a id="integracion"></a>

## 🔌 Integrar Prism+ en tu app

### Paso 1 — Descargar el catálogo

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

### Paso 2 — Cargar el script de la extensión

Cada URL de `script` apunta a un bundle IIFE autocontenido. El nombre global del IIFE es el `package` con caracteres no alfanuméricos reemplazados por `_`:

```
io.prismhub.gogoanime  →  io_prismhub_gogoanime
```

### Paso 3 — Llamar la extensión

```javascript
const ext = io_prismhub_gogoanime;

const items  = await ext.latest(1);
const detail = await ext.detail(items[0].url);
const play   = await ext.watch(detail.episodes[0].url);

// play.streams[0].url → URL reproducible 🎉
```

### 🍴 Self-hosting (fork propio)

Haz fork del repo y configura estas variables en tu CI:

```yaml
env:
  REPO_OWNER: tu-usuario-github
  REPO_NAME: prism-plus
  BRANCH: main
```

El build script usa estas variables para construir las URLs raw de GitHub en `index.json`. Sin más cambios necesarios.

---

<a id="build"></a>

## ⚙️ Build

```bash
npm install
npm run validate    # valida estructura de todas las extensiones
npm run typecheck   # chequeo de tipos TypeScript (sin emitir)
npm run build       # validate + compila → dist/ + index.json
```

Variables de entorno aceptadas por `scripts/build.mjs`:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `REPO_OWNER` | `Litdemonick` | Usuario de GitHub para URLs raw |
| `REPO_NAME` | `prism-plus` | Nombre del repositorio |
| `BRANCH` | `main` | Rama para URLs raw |

El CI está en `.github/workflows/build.yml` — se dispara en cada push a `main` que toque `extensions/`, `sdk/` o `scripts/`, y ejecuta validate → typecheck → build en orden antes de commitear `dist/`.

---

<a id="contribuir"></a>

## 🤝 Contribuir

1. 🍴 Haz fork del repo
2. ➕ Añade tu extensión en `extensions/<nombre>/`
3. 🔨 Ejecuta `npm run build` y corrige cualquier error
4. 📬 Abre un Pull Request

**📏 Lineamientos:**
- Solo TypeScript — nada de JavaScript plano
- Implementaciones originales — no copiar código de otros repos
- Usar los helpers del SDK — no importar built-ins de Node.js
- Si una fuente requiere `eval` o crypto del lado del cliente, documéntalo y retorna `{ streams: [] }`

---

## 📄 Licencia

MIT — libre para uso personal y comercial.

---

<div align="center">

**Hecho con ❤️ por [Litdemonick](https://github.com/Litdemonick)**

⭐ Si Prism+ te resulta útil, ¡dale una estrella al repo!

</div>

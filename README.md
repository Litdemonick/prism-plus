<img src="https://raw.githubusercontent.com/Litdemonick/prism-plus/main/assets/banner.png" alt="Prism+" width="100%" />

# ✨ Prism+

> **El núcleo de extensiones universal y open-source para medios de streaming.**

Prism+ es la capa de extensiones que impulsa [PrismHub](https://github.com/Litdemonick/Prism_Hub) y cualquier cliente de medios compatible. Cada extensión es un módulo TypeScript que sabe cómo hablar con una fuente — un sitio de anime, una API de manga, una plataforma de películas, un feed de video — y expone una interfaz unificada que tu app puede llamar.

> 🌍 **Alcance:** anime, manga, manhwa, películas, series, documentales, TV en vivo, novelas, podcasts, feeds de video compatibles con YouTube y mucho más. Si existe una fuente web pública, puede haber una extensión Prism+ para ella.

---

## 📋 Tabla de Contenidos

- [🏗️ Arquitectura](#arquitectura)
- [📦 Referencia del SDK](#referencia-del-sdk)
- [🔧 Cómo escribir una extensión](#cómo-escribir-una-extensión)
- [📚 Catálogo de extensiones](#catálogo-de-extensiones)
- [🔌 Integrar Prism+ en tu app](#integrar-prism-en-tu-app)
- [⚙️ Build](#build)
- [🤝 Contribuir](#contribuir)

---

## 🏗️ Arquitectura

```
prism-plus/
├── sdk/
│   ├── types.ts      ← Contratos públicos (PrismItem, PrismDetail, PrismWatch, …)
│   ├── http.ts       ← Cliente HTTP con reintentos y headers por defecto
│   └── html.ts       ← Parser HTML basado en regex (sin DOM requerido)
├── extensions/
│   └── <nombre>/
│       ├── index.ts      ← Lógica de la extensión (latest, search, detail, watch)
│       └── manifest.json ← Metadatos (nombre, package id, tipo, icono, …)
├── scripts/
│   └── build.mjs     ← Compilador esbuild → dist/<nombre>.js + index.json
└── dist/             ← Generado por CI — no hacer commit manualmente
```

Cada extensión se compila como un **bundle IIFE autocontenido** (sin dependencias externas en runtime). El `index.json` final es el catálogo que tu app descarga para descubrir las extensiones disponibles.

### 💡 Supuestos de runtime
- `fetch()` disponible como global (provisto por la app host, ej: QuickJS en PrismHub)
- Sin DOM, sin Node.js built-ins, sin sistema de archivos
- Sintaxis ES2020 garantizada

---

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

Cliente HTTP integrado con **reintentos automáticos** y **User-Agent realista** de Chrome.

```typescript
// GET → string (HTML o texto)
get(url: string, headers?: Record<string, string>): Promise<string>

// GET → JSON parseado
getJson<T>(url: string, headers?: Record<string, string>): Promise<T>

// POST con body → string
post(url: string, body: string, headers?: Record<string, string>): Promise<string>

// POST con body → JSON parseado
postJson<T>(url: string, body: string, headers?: Record<string, string>): Promise<T>

// Fetch raw con control total
request(url: string, init?: RequestInit): Promise<Response>
```

✅ Hasta **3 reintentos** con backoff exponencial  
✅ **User-Agent de Chrome** por defecto (evita bloqueos básicos)  
✅ Compatible con cualquier runtime que provea `fetch()` global

---

### 🔍 `sdk/html.ts`

Parser HTML basado en **expresiones regulares** — funciona sin DOM. Ideal para extensiones que hacen scraping.

```typescript
matchFirst(html: string, re: RegExp): string          // primer grupo capturado
matchAll(html: string, re: RegExp): string[]           // todos los grupos 1
matchGroups(html: string, re: RegExp): string[][]      // todos los grupos como tuplas
between(html: string, start: string, end: string): string  // contenido entre delimitadores
attr(html: string, attr: string): string               // valor de un atributo HTML
stripTags(html: string): string                        // eliminar etiquetas HTML
decodeEntities(str: string): string                    // &amp; → &, &lt; → <, …
```

---

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

// 🏠 Feed de inicio / actualizados recientemente
export async function latest(page: number): Promise<PrismItem[]> {
  const data = await getJson<{ results: any[] }>(`${API}/latest?page=${page}`);
  return data.results.map(item => ({
    title: item.title,
    url:   item.id,
    cover: item.poster,
  }));
}

// 🔎 Búsqueda
export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const data = await getJson<{ results: any[] }>(
    `${API}/search?q=${encodeURIComponent(keyword)}&page=${page}`,
  );
  return data.results.map(item => ({
    title: item.title,
    url:   item.id,
    cover: item.poster,
  }));
}

// 📄 Página de detalle — recibe url de latest() o search()
export async function detail(url: string): Promise<PrismDetail> {
  const data = await getJson<any>(`${API}/info/${url}`);
  return {
    title:       data.title,
    cover:       data.poster,
    description: data.synopsis,
    genres:      data.genres,
    status:      data.status === 'Completed' ? 'completed' : 'ongoing',
    episodes:    data.episodes.map((ep: any) => ({
      title: `Episodio ${ep.number}`,
      url:   ep.id,
    })),
  };
}

// ▶️ Reproducción — recibe url de un episodio
export async function watch(url: string): Promise<PrismWatch> {
  const data = await getJson<any>(`${API}/watch/${url}`);
  return {
    streams: data.sources.map((s: any) => ({
      url:     s.url,
      quality: s.quality,
    })),
  };
}
```

### ✅ Reglas de la extensión

| ✅ Hacer | ❌ Evitar |
|----------|-----------|
| Usar `getJson<T>()` para JSON | Importar módulos de Node.js (`fs`, `path`, `crypto`) |
| Usar `get()` para HTML scraping | Usar `document`, `window` u otras APIs DOM |
| Usar helpers de `sdk/html.ts` | Copiar código de otros repositorios |
| Retornar `{ streams: [] }` si watch() no puede extraer URL | Romper el build con código no compilable |
| Solo campos `title` y `url` son obligatorios | Hacer dependencias externas en runtime |

### Paso 4 — Build y prueba

```bash
npm run build
# → dist/mifuente.js + index.json actualizado
```

---

## 📚 Catálogo de extensiones

**16 extensiones** en **5 categorías de medios**.

### 🎌 Anime (8 extensiones)

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

> 🟢 Funcional completo · 🟡 Parcial · 🔵 Catálogo/Metadatos

### 📖 Manga / Cómics (4 extensiones)

| Extensión | Idioma | Fuente | Notas |
|-----------|--------|--------|-------|
| 🟢 **MangaDex** | Multi | api.mangadex.org | API oficial, fetches paralelos |
| 🟢 **Comick** | Multi | comick.fun | Agrupa capítulos por idioma |
| 🟢 **MangaBat** | EN | h.mangabat.com | HTML scrape |
| 🟢 **OmegaScans** | EN | omegascans.org | Foco en manhwa / manhua |

### 🎬 Películas (2 extensiones)

| Extensión | Idioma | Fuente | Notas |
|-----------|--------|--------|-------|
| 🟢 **FlixHQ** | EN | flixhq.vip via Consumet | Películas + series |
| 🟢 **YTS** | EN | yts.mx | Links torrent (magnet) |

### 📺 Series / Dramas (1 extensión)

| Extensión | Idioma | Fuente | Notas |
|-----------|--------|--------|-------|
| 🟢 **Kisskh** | Multi | kisskh.co | Doramas asiáticos, subtítulos paralelos |

### 🎥 Video (1 extensión)

| Extensión | Idioma | Fuente | Notas |
|-----------|--------|--------|-------|
| 🟢 **Invidious** | Todos | cal1.iv.ggtyler.dev | Compatible con YouTube, sin tracking |

---

## 🔌 Integrar Prism+ en tu app

### Paso 1 — Descargar el catálogo

```
GET https://raw.githubusercontent.com/Litdemonick/prism-plus/main/index.json
```

Respuesta:
```json
{
  "name": "Prism+",
  "description": "Repositorio oficial de extensiones para PrismHub y plataformas compatibles",
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

Cada URL de `script` apunta a un bundle IIFE autocontenido. Cárgalo en tu runtime JS y llama las funciones exportadas. El nombre global del IIFE es el `package` con caracteres no alfanuméricos reemplazados por `_`:

```
io.prismhub.gogoanime  →  io_prismhub_gogoanime
```

### Paso 3 — Llamar la extensión

```javascript
// Después de cargar el IIFE:
const ext = io_prismhub_gogoanime;

const items  = await ext.latest(1);           // página 1 del feed
const detail = await ext.detail(items[0].url); // detalle del primer resultado
const play   = await ext.watch(detail.episodes[0].url); // streams del primer ep

// play.streams[0].url → URL reproducible 🎉
```

### 🍴 Self-hosting (fork propio)

Haz fork del repo y configura la variable de entorno `REPO_OWNER` en tu CI:

```yaml
env:
  REPO_OWNER: tu-usuario-github
  REPO_NAME: prism-plus
  BRANCH: main
```

El script de build usa estas variables para construir las URLs raw de GitHub en `index.json`. Sin más cambios necesarios.

---

## ⚙️ Build

```bash
npm install
npm run build       # compila todas las extensiones → dist/ + index.json
npm run typecheck   # chequeo de tipos sin emitir
```

Variables de entorno aceptadas por `scripts/build.mjs`:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `REPO_OWNER` | `Litdemonick` | Usuario de GitHub para URLs raw |
| `REPO_NAME` | `prism-plus` | Nombre del repositorio |
| `BRANCH` | `main` | Rama para URLs raw |

El CI está en `.github/workflows/build.yml` — se dispara en cada push a `main` que toque `extensions/`, `sdk/` o `scripts/`, compila y hace commit de `dist/` e `index.json` automáticamente.

---

## 🤝 Contribuir

1. 🍴 Haz fork del repo
2. ➕ Añade tu extensión en `extensions/<nombre>/`
3. 🔨 Ejecuta `npm run build` y corrige errores de TypeScript
4. 📬 Abre un Pull Request

**📏 Lineamientos:**
- Solo TypeScript — nada de JavaScript plano
- Implementaciones originales — no copiar código de otros repos de extensiones
- Usar los helpers del SDK — no importar built-ins de Node.js
- Si una fuente requiere ejecución JS del lado del cliente (`eval`, crypto), documéntalo y retorna `{ streams: [] }` en lugar de romper el build

---

## 📄 Licencia

MIT — libre para uso personal y comercial.

---

<div align="center">

**Hecho con ❤️ por [Litdemonick](https://github.com/Litdemonick)**

⭐ Si Prism+ te resulta útil, ¡dale una estrella al repo!

</div>

# Prism+

**Repositorio oficial de extensiones para [PrismHub](https://github.com/Litdemonick/Prism_Hub)**

Prism+ es el catálogo de extensiones de PrismHub — la app para ver anime, leer manga, cómics y novelas desde múltiples fuentes en un solo lugar. Cada extensión es un bundle TypeScript compilado que sabe cómo hablar con un sitio web específico.

---

## Extensiones disponibles

| Nombre | Tipo | Idioma | Descripción |
|--------|------|--------|-------------|
| 🎌 **Jikan Anime** | Anime | 🌐 Multi | Catálogo completo de MyAnimeList vía Jikan API |
| 🦊 **AnimeFLV** | Anime | 🇪🇸 Español | Anime con subs y doblaje latino en AnimeFLV |
| 🐾 **TioAnime** | Anime | 🇪🇸 Español | Anime en español latino desde TioAnime |

---

## Agregar este repo a PrismHub

1. Abre **PrismHub**
2. Ve a la pestaña **Extensiones**
3. Pulsa el botón **＋** (añadir repositorio)
4. Pega esta URL:

```
https://raw.githubusercontent.com/Litdemonick/prism-plus/main/index.json
```

5. Pulsa **Añadir** → aparecerán todas las extensiones en la pestaña **Explorar**
6. Instala las que quieras con el botón de descarga

---

## Cómo funciona

```
Prism+ (este repo)              PrismHub (la app)
────────────────────            ─────────────────
index.json ──────────────────→  Lista de extensiones disponibles
dist/animeflv.js ────────────→  Se descarga e instala
  │
  └─ latest(page)   ──────────→  Pantalla de inicio
  └─ search(kw, page) ────────→  Búsqueda
  └─ detail(url)    ──────────→  Página de detalle
  └─ watch(url)     ──────────→  Reproductor / Lector
```

Cada extensión es un archivo `.js` autocontenido (bundle IIFE) que corre en QuickJS dentro de PrismHub. Usa el `fetch()` inyectado por la app para hacer peticiones HTTP.

---

## Crear una extensión

### 1. Crea la carpeta

```
extensions/
└── mi-sitio/
    ├── index.ts       ← código de la extensión
    └── manifest.json  ← metadata
```

### 2. Escribe el `manifest.json`

```json
{
  "name": "Mi Sitio",
  "package": "io.prismhub.misitio",
  "version": "1.0.0",
  "author": "Tu nombre",
  "type": "anime",
  "icon": "https://misitio.com/favicon.ico",
  "description": "Descripción corta de la fuente"
}
```

**Tipos válidos:** `anime` · `manga` · `comic` · `novel`

### 3. Escribe el `index.ts`

```typescript
import { get, getJson } from '../../sdk/http';
import { matchFirst, matchAll, between, stripTags } from '../../sdk/html';
import type { PrismItem, PrismDetail, PrismWatch } from '../../sdk/types';

const BASE = 'https://misitio.com';

/** Últimos contenidos — se muestra en la pantalla de inicio */
export async function latest(page: number): Promise<PrismItem[]> {
  const html = await get(`${BASE}/nuevos?p=${page}`);
  // parsear y retornar lista
  return [];
}

/** Búsqueda por palabra clave */
export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const html = await get(`${BASE}/buscar?q=${encodeURIComponent(keyword)}&p=${page}`);
  return [];
}

/** Detalle: portada, descripción, lista de episodios/capítulos */
export async function detail(url: string): Promise<PrismDetail> {
  const html = await get(`${BASE}/anime/${url}`);
  return {
    title: matchFirst(html, /<h1[^>]*>([^<]+)<\/h1>/i),
    description: stripTags(between(html, '<div class="sinopsis">', '</div>')),
    episodes: [],
  };
}

/** Reproducción: streams de video o URLs de imágenes */
export async function watch(url: string): Promise<PrismWatch> {
  return { streams: [] };
}
```

### 4. Compila y sube

```bash
npm run build        # compila todas las extensiones + genera index.json
git add .
git commit -m "feat: añadir mi-sitio"
git push             # GitHub Actions recompila automáticamente
```

---

## SDK

El SDK está en `sdk/` y se bundlea dentro de cada extensión automáticamente.

### `sdk/http.ts` — Cliente HTTP

```typescript
get(url, headers?)          → Promise<string>       // HTML / texto
getJson<T>(url, headers?)   → Promise<T>            // JSON parseado
post(url, body, headers?)   → Promise<string>       // POST texto
postJson<T>(url, data, headers?) → Promise<T>       // POST JSON
```

Incluye **reintentos automáticos** (2 reintentos con backoff exponencial) y **User-Agent** de Chrome por defecto.

### `sdk/html.ts` — Parseo HTML con regex

```typescript
matchFirst(html, pattern)          → string        // primer grupo 1
matchAll(html, pattern)            → string[]      // todos los grupos 1
matchGroups(html, pattern)         → string[][]    // múltiples grupos
between(html, start, end)          → string        // texto entre delimitadores
attr(html, tag, attribute)         → string        // valor de atributo
stripTags(html)                    → string        // elimina etiquetas HTML
decodeEntities(html)               → string        // decodifica &amp; &lt; etc.
```

### `sdk/types.ts` — Contratos de datos

```typescript
PrismItem    // { title, url, cover?, description?, tags? }
PrismEpisode // { title, url }
PrismDetail  // { title, cover?, description?, episodes[], extra? }
PrismStream  // { url, quality?, headers? }
PrismSubtitle// { label, url, lang? }
PrismWatch   // { streams[], subtitles? }
```

---

## Estructura del proyecto

```
prism-plus/
├── sdk/                  # TypeScript SDK (se bundlea en cada extensión)
│   ├── types.ts          # Contratos de datos
│   ├── http.ts           # Cliente HTTP con reintentos
│   ├── html.ts           # Helpers de parseo HTML
│   └── index.ts          # Barrel export
├── extensions/           # Una carpeta por extensión
│   ├── jikan-anime/
│   ├── animeflv/
│   └── tioanime/
├── dist/                 # Bundles compilados (auto-generados)
├── scripts/
│   └── build.mjs         # Build con esbuild + genera index.json
├── index.json            # Índice del repo (auto-generado)
├── package.json
└── tsconfig.json
```

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Compilar todas las extensiones
npm run build

# Verificar tipos TypeScript
npm run typecheck
```

---

## Licencia

MIT — libre para usar, modificar y distribuir.

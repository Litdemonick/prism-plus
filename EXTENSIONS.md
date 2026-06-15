# Guía de extensiones — Prism+

Cómo crear, verificar y mantener extensiones en este repositorio.

---

## Reglas de calidad antes de agregar una extensión

Una extensión solo debe agregarse al repositorio si cumple **todos** los puntos de este checklist. Si alguno falla, la extensión no se agrega (o se elimina si ya existe).

### Checklist de verificación

- [ ] **Dominio activo** — la URL base del sitio responde (no DNS NXDOMAIN, no 403, no Cloudflare loop)
- [ ] **`latest()` devuelve ítems** — al menos un resultado con `title`, `url` y `cover` no vacíos
- [ ] **`search()` devuelve resultados** — búsqueda con un término conocido retorna ítems
- [ ] **`detail()` devuelve episodios** — el array `episodes` no está vacío para un anime conocido
- [ ] **`watch()` devuelve al menos un stream reproducible** — `streams[0].url` es una URL `.m3u8` o `.mp4` que media_kit puede abrir (no una página embed HTML)
- [ ] **Sin dependencias de APIs de terceros en Vercel gratuito** — APIs como `consumet*.vercel.app`, `api.*.vercel.app` mantenidas por terceros están prohibidas; se caen sin aviso (ver historial: enime, flixhq, gogoanime eliminados por esto)
- [ ] **Manifest correcto** — `manifest.json` tiene `name`, `package`, `version`, `type` e `icon` válidos

### Tipos de fuente permitidos (de más a menos estable)

| Tipo | Ejemplo | Estabilidad |
|------|---------|-------------|
| API oficial del sitio | MangaDex, Jikan, OmegaScans | Alta |
| Scraping directo del sitio | AnimeFLV, TioAnime, MonosChinos | Media |
| API de tercero self-hosted por nosotros | — | Media (si lo controlamos) |
| API de tercero en Vercel/fly.io ajeno | consumet, enime, amvstr | **Prohibido** |
| Instancia comunitaria (Invidious, etc.) | — | **Prohibido** |

---

## Estructura de una extensión

```
extensions/
  nombre-extension/
    index.ts        ← lógica principal
    manifest.json   ← metadatos
```

### manifest.json

```json
{
  "name": "NombreVisible",
  "package": "io.prismhub.nombreextension",
  "version": "1.0.0",
  "author": "PrismHub",
  "type": "anime | manga | movie | series | video",
  "icon": "https://sitio.com/favicon.ico",
  "description": "Descripción corta en español"
}
```

### index.ts — funciones requeridas

Cada extensión **debe exportar** estas cuatro funciones con la firma exacta:

```typescript
export async function latest(page: number): Promise<PrismItem[]>
export async function search(keyword: string, page: number): Promise<PrismItem[]>
export async function detail(url: string): Promise<PrismDetail>
export async function watch(url: string): Promise<PrismWatch>
```

---

## SDK disponible

Importa desde `../../sdk` (no desde sub-módulos individuales):

```typescript
import { get, getJson, request }     from '../../sdk/http';
import { matchFirst, matchGroups }   from '../../sdk/html';
import { resolveEmbed, b64decode }   from '../../sdk/embeds';
import type { PrismItem, PrismDetail, PrismWatch } from '../../sdk/types';
```

### Resolvers de embed (`sdk/embeds.ts`)

Para extensiones que obtienen URLs de embed (voe.sx, streamtape, etc.) en lugar de streams directos, usa el resolver compartido:

```typescript
import { resolveEmbed } from '../../sdk/embeds';

// Dentro de watch():
const resolved = await resolveEmbed(serverName, embedUrl, `${BASE}/`);
// resolved es { url, headers? } o null si no se pudo resolver
```

`resolveEmbed` soporta: `voe`, `streamtape`. Para agregar un nuevo servidor, añádelo a `sdk/embeds.ts` — **no** dupliques el código en la extensión.

### Patrón estándar para watch() con embeds

```typescript
export async function watch(url: string): Promise<PrismWatch> {
  // 1. Obtener la página del episodio
  const html = await get(url);

  // 2. Extraer candidatos (pares server → embedUrl)
  const candidates = /* parsear html */;

  // 3. Resolver en paralelo
  const results = await Promise.all(
    candidates.map(async ({ server, embedUrl }) => {
      const resolved = await resolveEmbed(server, embedUrl, `${BASE}/`);
      return { server, embedUrl, resolved };
    }),
  );

  // 4. Streams directos primero, embeds crudos como fallback
  const resolved = results
    .filter(r => r.resolved !== null)
    .map(r => ({ url: r.resolved!.url, quality: r.server, headers: r.resolved!.headers }));
  const fallback = results
    .filter(r => r.resolved === null)
    .map(r => ({ url: r.embedUrl, quality: r.server }));

  return { streams: [...resolved, ...fallback] };
}
```

El fallback de embeds crudos es importante: evita "Sin streams disponibles" cuando el resolver falla, y PrismHub mostrará el error de media_kit en lugar de una pantalla vacía.

---

## Cómo agregar una nueva extensión

1. Crea la carpeta `extensions/nombre/` con `index.ts` y `manifest.json`
2. Pasa el checklist de verificación completo (prueba manual en la app)
3. Ejecuta `npm run build` — debe compilar sin errores
4. El script actualiza `index.json` automáticamente desde los manifests
5. Crea PR con evidencia de que `watch()` retorna un stream reproducible

## Cómo eliminar una extensión muerta

1. Borra la carpeta `extensions/nombre/`
2. Elimina su entrada de `index.json`
3. Elimina el archivo `dist/nombre.js` si existe
4. Documenta en el PR por qué murió (dominio caído, API 403, etc.)

---

## Servidores de embed conocidos

| Servidor | Estado | Método de resolución |
|----------|--------|----------------------|
| voe.sx | Activo | `resolveEmbed('Voe', url, referer)` — soporta atob base64 |
| streamtape.com | Activo | `resolveEmbed('Streamtape', url, referer)` |
| hqq.tv | Sin soporte | Requiere ejecución JS (Cloudflare) — no resoluble sin browser |
| pixeldrain | Activo | URL directa: `https://pixeldrain.com/api/file/{id}?download` |

Para agregar soporte a un nuevo servidor de embed, implementa `resolveXxx()` en `sdk/embeds.ts` y agrégalo al switch de `resolveEmbed()`.

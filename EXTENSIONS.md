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

---

## Capacidades del runtime PrismHub

El runtime de PrismHub provee estas capacidades nativas. Aprovecharlas evita reimplementar lógica frágil en cada extensión.

### CryptoJS (cifrado) — global automático

Algunos sitios cifran las URLs de vídeo (AES, MD5). PrismHub inyecta **CryptoJS v4.x** como global, pero **solo** si tu bundle referencia el identificador `CryptoJS` (optimización de rendimiento: ahorra ~60 KB de parseo en las extensiones que no lo usan).

```typescript
// No se importa nada en runtime; importa solo los TIPOS:
import '../../sdk/crypto'; // registra el global tipado `CryptoJS`

// Dentro de watch():
const decrypted = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Utf8.parse(key), {
  iv: CryptoJS.enc.Hex.parse(iv),
});
const realUrl = decrypted.toString(CryptoJS.enc.Utf8);
```

### Cookies de sesión — persistentes y automáticas

Cada extensión tiene su **propio cookie jar persistente** (sobrevive reinicios). Las cookies que devuelva un `Set-Cookie` se reenvían solas en los siguientes `get()` de esa misma extensión. No hay que gestionarlas a mano.

Esto habilita sitios que firman la sesión antes de servir el vídeo (p. ej. Animepahe): basta con hacer el `get()` previo que establece la cookie, y el `get()` del episodio ya la lleva.

### Streaming HLS con cabeceras — proxy transparente

Cuando `watch()` devuelve un stream `.m3u8` **con `headers`** (p. ej. `Referer`), PrismHub lo enruta por un proxy local que **garantiza** que esas cabeceras lleguen a *cada* segmento, sub-playlist y clave de cifrado. Esto elimina los `403` del CDN que causan buffering infinito.

No requiere nada especial en la extensión: **solo devuelve los `headers` correctos en el stream** y el motor se encarga.

```typescript
return {
  streams: [{
    url: 'https://cdn.example.com/master.m3u8',
    quality: 'Voe',
    headers: { Referer: 'https://voe.sx/' }, // ← el proxy las propaga a los segmentos
  }],
};
```

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
| voe.sx | ✅ Activo | Redirect al espejo + descifra el JSON ofuscado 2024 → mp4/m3u8 (timeout 14s + 1 retry) |
| streamtape.com | ✅ Activo | `resolveStreamtape` — div `ideoolink`/`botlink` → `get_video` (token atado a IP) |
| mixdrop | ✅ Activo | Desempaqueta el `eval` → `MDCore.wurl` → mp4 |
| mp4upload | ✅ Activo | mp4 directo de la página del embed |
| luluvdo (streamwish familia) | ✅ Activo | `resolveGeneric` — desempaqueta el `eval` → m3u8 |
| netu / hqq | ✅ A veces | El genérico extrae el m3u8 si está en claro |
| pixeldrain | ✅ Activo | URL directa: `https://pixeldrain.com/api/file/{id}` |
| streamwish.to | ⚠️ Pendiente | Loader JS (`main.js` ofuscado, anti-bot) — requiere browser |
| filemoon / bysekoze | ⚠️ Parcial | A veces 403/challenge; el genérico lo intenta |
| savefiles / doodstream | ⚠️ 403 | Cloudflare/cookies — pendiente |
| mega.nz | ❌ No | Cifrado client-side (clave en el fragment) — inviable sin browser |

**Resolver genérico:** `resolveEmbed` cae en `resolveGeneric` para cualquier host
desconocido — desempaqueta `eval(p,a,c,k,e,d)` (Dean Edwards) y busca m3u8 firmado,
`file:`/`source:` de jwplayer o mp4. Así muchos hosts de la familia streamwish/filemoon
funcionan **sin código específico**.

Para agregar soporte explícito a un servidor, implementa `resolveXxx()` en
`sdk/embeds.ts` y agrégalo al dispatcher de `resolveEmbed()` (antes del fallback genérico).

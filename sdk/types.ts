// ─── Prism+ SDK — Tipos públicos ─────────────────────────────────────────────
// Contrato entre extensiones y apps cliente (PrismHub u otras).
// Todos los campos opcionales tienen compatibilidad hacia atrás garantizada.

/**
 * Categoría del contenido de la extensión.
 * El cliente usa este valor para mostrar el icono/sección correcta y
 * para filtrar búsquedas por tipo de media.
 */
export type MediaType =
  | 'anime'        // Animación japonesa / donghua
  | 'manga'        // Cómics japoneses, manhwa, manhua, webtoon
  | 'novel'        // Light novels, web novels, libros de texto
  | 'movie'        // Películas
  | 'series'       // Series de TV, dramas, doramas
  | 'documentary'  // Documentales
  | 'live'         // Canales de TV en vivo, IPTV
  | 'video'        // Contenido de vídeo general (YouTube, etc.)
  | 'music'        // Vídeos musicales, MVs
  | 'podcast'      // Podcasts con vídeo o audio
  | 'other';       // Cualquier otro tipo no listado

/** Estado de publicación del contenido */
export type ContentStatus = 'ongoing' | 'completed' | 'upcoming' | 'hiatus';

// ─── Paginación ──────────────────────────────────────────────────────────────

/**
 * Resultado paginado — versión enriquecida para latest() y search().
 * Permite al cliente saber si hay más páginas sin hacer un fetch extra.
 * Retrocompatible: las extensiones pueden seguir retornando PrismItem[] directamente.
 */
export interface PrismPage<T = PrismItem> {
  items:   T[];
  /** false = no hay más páginas, true = puede haber más */
  hasMore: boolean;
  /** Total de resultados si la API lo provee */
  total?:  number;
}

// ─── Listas ──────────────────────────────────────────────────────────────────

/** Ítem de lista — retornado por latest() y search() */
export interface PrismItem {
  title: string;
  url: string;
  cover?: string;
  description?: string;
  tags?: string[];
  /** Texto de actualización reciente (ej: "Cap. 123", "Ep. 5") */
  update?: string;
  /** Headers HTTP para cargar la portada (Referer, Cookie, etc.) */
  headers?: Record<string, string>;
  /** Año de estreno */
  year?: number;
  /** Puntuación de 0 a 10 */
  rating?: number;
  /** Tipo de media del ítem (sobreescribe el tipo de la extensión si es mixto) */
  type?: MediaType;
}

// ─── Detalle ─────────────────────────────────────────────────────────────────

/** Episodio, capítulo, película o track */
export interface PrismEpisode {
  title: string;
  url: string;
  /** Miniatura del episodio */
  thumbnail?: string;
  /** Duración en segundos */
  duration?: number;
  /** Fecha de estreno — ISO 8601 (YYYY-MM-DD) */
  airDate?: string;
  /** Número de episodio dentro de la temporada */
  number?: number;
}

/** Temporada o grupo de episodios dentro de un detalle */
export interface PrismSeason {
  title: string;
  episodes: PrismEpisode[];
  /** Año de la temporada */
  year?: number;
  cover?: string;
}

/** Resultado completo de detail() */
export interface PrismDetail {
  title: string;
  cover?: string;
  description?: string;
  /** Lista plana de episodios (para contenido sin temporadas) */
  episodes: PrismEpisode[];
  /** Temporadas — para series con múltiples temporadas */
  seasons?: PrismSeason[];
  /** Géneros del contenido */
  genres?: string[];
  /** Estado de publicación */
  status?: ContentStatus;
  /** Año de estreno */
  year?: number;
  /** Puntuación de 0 a 10 */
  rating?: number;
  /** Metadatos adicionales clave-valor (Estado, Estudio, Director, etc.) */
  extra?: Record<string, string>;
  /** Headers HTTP globales para portada y recursos del detalle */
  headers?: Record<string, string>;
}

// ─── Reproducción ─────────────────────────────────────────────────────────────

/**
 * Resultado de watch() para extensiones de tipo manga/cómic.
 * Retorna las URLs de las páginas en orden de lectura.
 * El build wrapper pasa este objeto sin modificar a PrismHub.
 */
export interface PrismMangaWatch {
  /** URLs de las páginas del capítulo en orden */
  urls: string[];
  /** Headers HTTP para cargar las imágenes (Referer, Cookie, etc.) */
  headers?: Record<string, string>;
}

/** Stream de vídeo, página de imagen o torrent */
export interface PrismStream {
  url: string;
  /** Etiqueta de calidad (1080p, 720p, Page 1, etc.) */
  quality?: string;
  /** Nombre para mostrar en el selector de fuente */
  label?: string;
  /** Headers HTTP necesarios (Referer, Cookie, Authorization, etc.) */
  headers?: Record<string, string>;
  /** MIME type del stream (application/x-mpegURL, video/mp4, etc.) */
  mimeType?: string;
}

/** Pista de subtítulos */
export interface PrismSubtitle {
  label: string;
  url: string;
  /** Código de idioma BCP-47 (es, en, ja, etc.) */
  lang?: string;
}

/** Resultado de watch() — streams de vídeo o páginas de imagen */
export interface PrismWatch {
  streams: PrismStream[];
  subtitles?: PrismSubtitle[];
  /** Headers globales aplicados a todos los streams */
  headers?: Record<string, string>;
  /**
   * URL de la página del episodio en el sitio (ej: animeflv.net/ver/xxx).
   * El cliente la carga en un WebView oculto y captura el stream del player
   * que el propio sitio reproduce — fallback universal cuando los resolvers
   * nativos no logran extraer el stream directo.
   */
  pageUrl?: string;
  /**
   * Razón por la que streams[] está vacío — ayuda al cliente a mostrar
   * un mensaje útil en vez de un error genérico.
   * Ejemplos: "region_blocked", "premium_required", "js_eval_required"
   */
  reason?: string;
}

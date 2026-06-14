// ─── Tipos del contrato público de extensiones Prism+ ───────────────────────
// Estos tipos definen exactamente qué debe retornar cada función.
// PrismHub (Dart) parsea estos campos en MediaItem, MediaDetail y WatchData.

/** Ítem de lista — retornado por latest() y search() */
export interface PrismItem {
  title: string;
  url: string;
  cover?: string;
  description?: string;
  tags?: string[];
}

/** Episodio o capítulo dentro de un detalle */
export interface PrismEpisode {
  title: string;
  url: string;
}

/** Resultado completo de detail() */
export interface PrismDetail {
  title: string;
  cover?: string;
  description?: string;
  episodes: PrismEpisode[];
  /** Pares clave-valor para metadata extra: Estado, Año, Estudio, etc. */
  extra?: Record<string, string>;
}

/** Stream de video o URL de imagen de página */
export interface PrismStream {
  url: string;
  quality?: string;
  /** Headers HTTP necesarios para reproducir/cargar (ej. Referer, Cookie) */
  headers?: Record<string, string>;
}

/** Pista de subtítulos */
export interface PrismSubtitle {
  label: string;
  url: string;
  lang?: string;
}

/** Resultado de watch() — streams de video o páginas de imagen */
export interface PrismWatch {
  streams: PrismStream[];
  subtitles?: PrismSubtitle[];
}

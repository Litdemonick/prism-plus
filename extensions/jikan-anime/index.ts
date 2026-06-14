import { getJson } from '../../sdk/http';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

// ─── Jikan v4 — API pública de MyAnimeList ───────────────────────────────────
// Docs: https://docs.api.jikan.moe
// Sin auth — límite 3 req/s, 60 req/min.

const BASE = 'https://api.jikan.moe/v4';

/** Últimos animes en emisión (ordenados por popularidad) */
export async function latest(page: number): Promise<PrismItem[]> {
  const data = await getJson<JikanList>(
    `${BASE}/top/anime?page=${page}&filter=airing&limit=20`,
  );
  return data.data.map(mapItem);
}

/** Búsqueda por título */
export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const data = await getJson<JikanList>(
    `${BASE}/anime?q=${encodeURIComponent(keyword)}&page=${page}&limit=20&sfw=true`,
  );
  return data.data.map(mapItem);
}

/** Detalle completo con episodios */
export async function detail(url: string): Promise<PrismDetail> {
  const [anime, eps] = await Promise.all([
    getJson<{ data: JikanAnime }>(`${BASE}/anime/${url}/full`),
    getJson<JikanEpisodeList>(`${BASE}/anime/${url}/episodes`),
  ]);

  const a = anime.data;

  return {
    title: a.title,
    cover: a.images?.jpg?.large_image_url,
    description: a.synopsis ?? undefined,
    episodes: eps.data.map(e => ({
      title: e.title ? `Ep. ${e.mal_id} — ${e.title}` : `Episodio ${e.mal_id}`,
      url: `${url}/ep/${e.mal_id}`,
    })),
    extra: {
      Estado: a.status ?? '',
      Tipo: a.type ?? '',
      Episodios: String(a.episodes ?? '?'),
      Duración: a.duration ?? '',
      Calificación: a.score ? `${a.score} / 10` : 'N/A',
      Estudio: a.studios?.[0]?.name ?? '',
      Temporada: a.season && a.year ? `${capitalize(a.season)} ${a.year}` : '',
      Géneros: a.genres?.map(g => g.name).join(', ') ?? '',
    },
  };
}

/**
 * Jikan es solo un índice de metadatos — no provee streams de video.
 * Esta extensión sirve para navegar y descubrir anime.
 * Para reproducción usa una extensión de streaming complementaria.
 */
export async function watch(_url: string): Promise<PrismWatch> {
  return { streams: [] };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapItem(a: JikanAnime): PrismItem {
  return {
    title: a.title,
    url: String(a.mal_id),
    cover: a.images?.jpg?.image_url,
    description: a.synopsis ?? undefined,
    tags: a.genres?.map(g => g.name),
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Tipos internos de la API Jikan ──────────────────────────────────────────

interface JikanAnime {
  mal_id: number;
  title: string;
  synopsis?: string | null;
  status?: string;
  type?: string;
  episodes?: number | null;
  score?: number | null;
  duration?: string;
  season?: string;
  year?: number | null;
  images?: { jpg?: { image_url?: string; large_image_url?: string } };
  genres?: Array<{ name: string }>;
  studios?: Array<{ name: string }>;
}

interface JikanList {
  data: JikanAnime[];
}

interface JikanEpisode {
  mal_id: number;
  title?: string | null;
}

interface JikanEpisodeList {
  data: JikanEpisode[];
}

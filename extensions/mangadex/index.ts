import { getJson } from '../../sdk/http';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

const API = 'https://api.mangadex.org';
const COVERS = 'https://uploads.mangadex.org/covers';

interface MDRelationship {
  type: string;
  attributes?: { fileName?: string };
}

interface MDMangaAttributes {
  title: Record<string, string>;
  description: Record<string, string>;
}

interface MDManga {
  id: string;
  attributes: MDMangaAttributes;
  relationships: MDRelationship[];
}

interface MDChapterAttributes {
  chapter: string | null;
  title: string | null;
  translatedLanguage: string;
}

interface MDChapter {
  id: string;
  attributes: MDChapterAttributes;
}

interface MDAtHome {
  baseUrl: string;
  chapter: { hash: string; data: string[] };
}

function coverUrl(mangaId: string, fileName: string): string {
  return `${COVERS}/${mangaId}/${fileName}.256.jpg`;
}

function titleOf(attrs: MDMangaAttributes): string {
  const t = attrs.title;
  return t['en'] ?? t[Object.keys(t)[0]] ?? 'Unknown';
}

function mapItem(item: MDManga): PrismItem | null {
  const rel = item.relationships.find(r => r.type === 'cover_art');
  if (!rel?.attributes?.fileName) return null;
  return {
    title: titleOf(item.attributes),
    url: item.id,
    cover: coverUrl(item.id, rel.attributes.fileName),
  };
}

// MangaDex v5 requiere contentRating[] en todas las queries de manga.
// Sin él la API retorna HTTP 400 aunque el resto de params sean válidos.
// Los brackets se pre-encodean (%5B%5D) para evitar doble-codificación de Dart/Dio.
const RATINGS = 'contentRating%5B%5D=safe&contentRating%5B%5D=suggestive&contentRating%5B%5D=erotica';
const INCLUDES = 'includes%5B%5D=cover_art';

export async function latest(page: number): Promise<PrismItem[]> {
  const offset = (page - 1) * 30;
  const data = await getJson<{ data: MDManga[] }>(
    `${API}/manga?order%5BlatestUploadedChapter%5D=desc&limit=30&offset=${offset}&${INCLUDES}&${RATINGS}`,
  );
  return data.data.flatMap(item => {
    const mapped = mapItem(item);
    return mapped ? [mapped] : [];
  });
}

export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const offset = (page - 1) * 30;
  const data = await getJson<{ data: MDManga[] }>(
    `${API}/manga?title=${encodeURIComponent(keyword)}&limit=30&offset=${offset}&${INCLUDES}&${RATINGS}&order%5Brelevance%5D=desc`,
  );
  return data.data.flatMap(item => {
    const mapped = mapItem(item);
    return mapped ? [mapped] : [];
  });
}

export async function detail(mangaId: string): Promise<PrismDetail> {
  const [mangaRes, chapRes] = await Promise.all([
    getJson<{ data: MDManga }>(`${API}/manga/${mangaId}?${INCLUDES}&${RATINGS}`),
    getJson<{ data: MDChapter[] }>(
      `${API}/manga/${mangaId}/feed?order%5Bvolume%5D=asc&order%5Bchapter%5D=asc&limit=500&translatedLanguage%5B%5D=en&${RATINGS}`,
    ),
  ]);

  const manga = mangaRes.data;
  const rel = manga.relationships.find(r => r.type === 'cover_art');
  const cover = rel?.attributes?.fileName
    ? coverUrl(mangaId, rel.attributes.fileName)
    : undefined;

  const desc = manga.attributes.description;
  const description = desc['en'] ?? desc[Object.keys(desc)[0]] ?? '';

  const episodes = chapRes.data.map(ch => {
    const num = ch.attributes.chapter;
    const t = ch.attributes.title;
    const label = num
      ? `Chapter ${num}${t ? ` — ${t}` : ''}`
      : (t ?? 'Chapter');
    return { title: label, url: ch.id };
  });

  return { title: titleOf(manga.attributes), cover, description, episodes };
}

export async function watch(chapterId: string): Promise<PrismWatch> {
  const data = await getJson<MDAtHome>(`${API}/at-home/server/${chapterId}`);
  const { baseUrl, chapter: { hash, data: pages } } = data;
  return {
    streams: pages.map((filename, i) => ({
      url: `${baseUrl}/data/${hash}/${filename}`,
      quality: `Page ${i + 1}`,
    })),
  };
}

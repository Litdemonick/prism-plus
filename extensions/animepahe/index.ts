import { getJson, get } from '../../sdk/http';
import { matchFirst } from '../../sdk/html';
import { unpackAllInHtml } from '../../sdk/unpack';
import { createCache, TTL } from '../../sdk/cache';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

const BASE  = 'https://animepahe.ru';
const KWIK  = 'https://kwik.si';
const CACHE = createCache();

// ─── Tipos API ────────────────────────────────────────────────────────────────

interface PaheAiringItem  { anime_title: string; anime_session: string; snapshot: string }
interface PaheAiringRes   { data: PaheAiringItem[] }
interface PaheSearchItem  { title: string; session: string; poster: string }
interface PaheSearchRes   { data: PaheSearchItem[] }
interface PaheEpisode     { episode: number; session: string }
interface PaheEpisodeRes  { data: PaheEpisode[]; total: number; last_page: number }

interface PaheLink {
  kwik:     string;
  audio:    string;
  fansub:   string;
}
interface PaheLinksRes { data: Record<string, PaheLink> }

// ─── Extensión ────────────────────────────────────────────────────────────────

export async function latest(page: number): Promise<PrismItem[]> {
  const key  = `latest:${page}`;
  const hit  = CACHE.get<PrismItem[]>(key);
  if (hit) return hit;

  const data = await getJson<PaheAiringRes>(`${BASE}/api?m=airing&page=${page}`);
  const result = data.data.map(item => ({
    title: item.anime_title,
    url:   item.anime_session,
    cover: item.snapshot,
  }));
  CACHE.set(key, result, TTL.LIST);
  return result;
}

export async function search(keyword: string, _page: number): Promise<PrismItem[]> {
  const key  = `search:${keyword}`;
  const hit  = CACHE.get<PrismItem[]>(key);
  if (hit) return hit;

  const data = await getJson<PaheSearchRes>(
    `${BASE}/api?m=search&q=${encodeURIComponent(keyword)}`,
  );
  const result = data.data.map(item => ({
    title: item.title,
    url:   item.session,
    cover: item.poster,
  }));
  CACHE.set(key, result, TTL.LIST);
  return result;
}

export async function detail(session: string): Promise<PrismDetail> {
  const key = `detail:${session}`;
  const hit = CACHE.get<PrismDetail>(key);
  if (hit) return hit;

  const [html, epData] = await Promise.all([
    get(`${BASE}/anime/${session}`),
    getJson<PaheEpisodeRes>(`${BASE}/api?m=release&id=${session}&sort=episode_asc`),
  ]);

  const title =
    matchFirst(html, /<span[^>]*class="[^"]*user-select-none[^"]*"[^>]*>([^<]+)<\/span>/i) ||
    matchFirst(html, /<h1[^>]*>([^<]+)<\/h1>/i);
  const cover = matchFirst(html, /href="(https:\/\/i\.animepahe\.ru\/posters[^"]+)"/i);
  const description = matchFirst(
    html,
    /<div[^>]*class="[^"]*anime-synopsis[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ).replace(/<[^>]*>/g, '').trim();

  const episodes = epData.data.map(ep => ({
    title: `Episode ${ep.episode}`,
    url:   `${session};${ep.session}`,
  }));

  const result: PrismDetail = { title, cover: cover || undefined, description, episodes };
  CACHE.set(key, result, TTL.DETAIL);
  return result;
}

export async function watch(url: string): Promise<PrismWatch> {
  // url = "animeSession;episodeSession" (guardado por detail())
  const [animeSession, episodeSession] = url.split(';');
  if (!episodeSession) return { streams: [] };

  // 1. Obtener links de kwik.si desde la API de animepahe
  const linksData = await getJson<PaheLinksRes>(
    `${BASE}/api?m=links&id=${animeSession}&session=${episodeSession}&p=kwik`,
  );

  // La respuesta es un objeto clave=calidad → {kwik, audio, fansub}
  const entries = Object.entries(linksData.data ?? {});
  if (entries.length === 0) return { streams: [] };

  const streams: PrismWatch['streams'] = [];

  for (const [quality, link] of entries) {
    const kwikUrl = link.kwik;
    if (!kwikUrl) continue;

    try {
      const m3u8 = await resolveKwik(kwikUrl);
      if (m3u8) {
        streams.push({
          url:      m3u8,
          quality,
          label:    `${quality} ${link.audio === 'jpn' ? '(Sub)' : '(Dub)'}`,
          mimeType: 'application/x-mpegURL',
          headers:  { Referer: `${KWIK}/` },
        });
      }
    } catch {
      // Si una calidad falla, continuamos con las demás
    }
  }

  return { streams, headers: { Referer: `${KWIK}/` } };
}

// ─── Resolución de kwik.si ────────────────────────────────────────────────────

async function resolveKwik(kwikUrl: string): Promise<string | null> {
  // kwik.si requiere Referer de animepahe para servir el embed
  const html = await get(kwikUrl, {
    Referer:                `${BASE}/`,
    'Accept':               'text/html,application/xhtml+xml',
    'Accept-Language':      'en-US,en;q=0.9',
    'Sec-Fetch-Dest':       'iframe',
  });

  // Desempaquetar todos los scripts P.A.C.K.E.R. del HTML
  const unpacked = unpackAllInHtml(html);

  for (const code of unpacked) {
    // Buscar la URL del stream m3u8 en el código desempaquetado
    // Formato típico: source='https://...m3u8' o file:"https://...m3u8"
    const m3u8 =
      matchFirst(code, /source\s*=\s*'([^']+\.m3u8[^']*)'/i) ||
      matchFirst(code, /source\s*=\s*"([^"]+\.m3u8[^"]*)"/i) ||
      matchFirst(code, /file\s*:\s*"([^"]+\.m3u8[^"]*)"/i)   ||
      matchFirst(code, /file\s*:\s*'([^']+\.m3u8[^']*)'/i)   ||
      matchFirst(code, /"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/i);

    if (m3u8) {
      // Algunos streams incluyen headers extra después del pipe: url|Referer=...
      return m3u8.split('|')[0].trim();
    }
  }

  // Fallback: buscar m3u8 directamente en el HTML sin desempaquetar
  const direct = matchFirst(html, /https?:\/\/[^\s"']+\.m3u8[^\s"']*/i);
  return direct || null;
}

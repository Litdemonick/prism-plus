import { matchFirst, matchGroups, stripTags, decodeEntities } from '../../sdk/html';
import { resolveEmbed } from '../../sdk/embeds';
import type { PrismDetail, PrismItem, PrismWatch, PrismEpisode } from '../../sdk/types';

// sendMessage("request", ...) usa el dio de PrismHub (con UA, cookies y redirecciones),
// a diferencia de fetch() que usa http.Client básico.
declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://wwv.animeytx.net';

// Sin Referer, un pedido directo se distingue fácil de una navegación real
// del sitio (todo link interno del propio wwv.animeytx.net manda Referer) —
// más aún en /?s= (búsqueda), la ruta que WAFs/anti-bot suelen vigilar más
// de cerca que el listado normal.
async function _get(url: string): Promise<string> {
  const raw = await sendMessage(
    'request',
    JSON.stringify([url, { method: 'get', headers: { Referer: `${BASE}/` } }]),
  );
  try { return JSON.parse(raw); } catch { return raw; }
}

// ─── Listado (directorio + búsqueda comparten la misma card) ──────────────────

// El cover viene lazy-loaded: <img src="data:image/svg+xml;base64,PLACEHOLDER"
// data-src="https://real-cover.jpg">. Hay que preferir data-src siempre que
// esté — si no, se termina guardando el placeholder base64 como portada.
function _parseCards(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  const seen = new Set<string>();
  const re = /<a href="https?:\/\/[^"]*\/tv\/([a-z0-9-]+)\/?"[^>]*title="([^"]*)"[\s\S]{0,500}?<img\b[^>]*\bsrc="([^"]+)"(?:[^>]*\bdata-src="([^"]+)")?/g;
  for (const m of html.matchAll(re)) {
    const slug = m[1];
    if (seen.has(slug)) continue;
    seen.add(slug);
    items.push({
      title: decodeEntities(m[2]),
      url: slug,
      cover: m[4] || m[3],
    });
  }
  return items;
}

// /tv/page/N/ (catálogo alfabético) tiene pocas páginas reales — se agotaba
// rápido y terminaba en "sin más datos". /anime/page/N/ ("Anime reciente",
// el que usa el sitio para su propio browse) es el equivalente al
// /directorio de jkanime: mismas cards que /tv/ y búsqueda (article.bs con
// link directo a /tv/{slug}/), pero con paginación real y profunda (17+
// páginas confirmadas en vivo).
export async function latest(page: number): Promise<PrismItem[]> {
  const html = await _get(page <= 1 ? `${BASE}/anime/` : `${BASE}/anime/page/${page}/`);
  return _parseCards(html);
}

// URLSearchParams no existe en el QuickJS de PrismHub — arma la query a mano.
export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const query = `s=${encodeURIComponent(keyword)}${page > 1 ? `&paged=${page}` : ''}`;
  const html = await _get(`${BASE}/?${query}`);
  return _parseCards(html);
}

// ─── Detalle ────────────────────────────────────────────────────────────────

function _parseEpisodes(html: string): PrismEpisode[] {
  const episodes: PrismEpisode[] = [];
  // .eplister ul li > a > .epl-num + .epl-title — vienen del más nuevo al más
  // viejo (recién publicado primero), por eso se invierte al final.
  const re = /<a href="(https?:\/\/[^"]+)"><div class="epl-num">([^<]*)<\/div><div class="epl-title">([^<]*)<\/div>/g;
  for (const m of html.matchAll(re)) {
    const number = m[2].trim();
    episodes.push({
      title: `Capítulo ${number}`,
      url: m[1].replace(`${BASE}/`, '').replace(/\/$/, ''),
      number: Number(number) || undefined,
    });
  }
  return episodes.reverse();
}

// Los items del feed (latest) llegan como "ep:{slug-de-episodio}" — hay que
// resolver primero cuál es la serie real. La propia página del episodio
// trae el link "Lista" (todos los capítulos) que apunta a /tv/{slug}/.
async function _resolveSeriesSlug(episodeSlug: string): Promise<string> {
  const html = await _get(`${BASE}/anime/${episodeSlug}/`);
  const listaM = /<div class="nvs nvsc"><a href=['"]([^'"]*\/tv\/([a-z0-9-]+)\/?)['"]/.exec(html);
  return listaM ? listaM[2] : episodeSlug;
}

export async function detail(url: string): Promise<PrismDetail> {
  const slug = url.indexOf('ep:') === 0
    ? await _resolveSeriesSlug(url.slice(3))
    : url;
  const html = await _get(`${BASE}/tv/${slug}/`);

  const title =
    matchFirst(html, /<h1[^>]*>([^<]+)<\/h1>/i) || slug.replace(/-/g, ' ');
  const cover = matchFirst(html, /property="og:image"\s+content="([^"]+)"/i);
  const description = stripTags(
    matchFirst(html, /itemprop="description"[^>]*>([\s\S]*?)<\/div>/i) || '',
  ).trim();
  const genres = matchGroups(
    html,
    /<a[^>]+href="[^"]*\/genres\/[^"]*"[^>]*>([^<]+)<\/a>/gi,
  ).map(g => g[0]);

  const episodes = _parseEpisodes(html);

  return { title, cover, description, episodes, genres };
}

// ─── Reproducción ───────────────────────────────────────────────────────────

// El decodificador base64 nativo (atob) no existe en el QuickJS de PrismHub.
function _b64decode(s: string): string {
  const T = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let r = '';
  s = s.replace(/[^A-Za-z0-9+/]/g, '');
  for (let i = 0; i < s.length; i += 4) {
    const a = T.indexOf(s[i]);
    const b = T.indexOf(s[i + 1]);
    const c = T.indexOf(s[i + 2]);
    const d = T.indexOf(s[i + 3]);
    if (a < 0 || b < 0) break;
    r += String.fromCharCode((a << 2) | (b >> 4));
    if (c >= 0) r += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    if (d >= 0) r += String.fromCharCode(((c & 3) << 6) | d);
  }
  return r;
}

interface _Mirror { name: string; iframeSrc: string; }

// Algunos mirrors (Omega, Alpha vistos en vivo) traen el src relativo
// ("/new/redirector.php?...") en vez de absoluto — sin esto, tanto
// resolveEmbed como el fallback a URL cruda quedan con un path roto.
function _absolutize(src: string): string {
  if (src.indexOf('http') === 0) return src;
  if (src.indexOf('//') === 0) return `https:${src}`;
  return `${BASE}${src.indexOf('/') === 0 ? '' : '/'}${src}`;
}

// El selector de servidores no trae los embeds directo en el HTML: cada
// <option> es un iframe completo codificado en base64 (name + src ofuscados
// para que el scraping básico no los vea). Se decodifica cada uno acá.
// OJO: el src viene con comillas simples O dobles según el mirror — hay que
// aceptar ambas o se pierden la mayoría de los servidores.
function _parseMirrors(html: string): _Mirror[] {
  const mirrors: _Mirror[] = [];
  const re = /<option value="([A-Za-z0-9+/=]{20,})"\s+data-index="\d+">\s*([^<]*)<\/option>/g;
  for (const m of html.matchAll(re)) {
    try {
      const decoded = _b64decode(m[1]);
      const srcM = /<iframe[^>]+src=['"]([^'"]+)['"]/i.exec(decoded);
      if (srcM) {
        mirrors.push({
          name: m[2].trim() || 'Servidor',
          iframeSrc: _absolutize(decodeEntities(srcM[1])),
        });
      }
    } catch {}
  }
  return mirrors;
}

// Algunos mirrors no son un embed directo: son un wrapper "mytsumi" con una
// página intermedia antes de llegar al contenido real. Hay (al menos) TRES
// variantes distintas vistas en vivo:
//   1. mytsumi.com/multiplayer/options.php?server=X&value=ID — disclaimer de
//      ads ("Algunos reproductores tienen publicidad..."), UN solo botón
//      "Aceptar".
//   2. mytsumi.com/multiplayer/multi.php?server=multi&sub=IDsub&lat=IDlat —
//      selector de idioma, DOS botones ("Sub Español" / "Latino").
//   3. old.mytsumi.com/players/options.php?server=moon&value=ID — el botón
//      ya apunta DIRECTO al embed real, sin capa intermedia.
// En los tres casos el patrón es el mismo: <a href="..."><button>Label</button></a>.
// Si el resultado es a su vez otro mytsumi, se expande recursivo (la
// variante 2 necesita esto dos veces: multi.php → contenedor.php → array).
// Si hay más de un link (variante 2, un idioma por botón), se prefija el
// nombre de cada servidor con la etiqueta del botón para no perder esa
// opción — sin esto, el idioma quedaba fijo en el que ganara la carrera.
async function _expandMytsumi(iframeSrc: string, depth = 0): Promise<_Mirror[]> {
  if (depth > 3) return []; // por si dos wrappers se referencian entre sí
  const serverM = /[?&]server=([a-zA-Z0-9]+)/.exec(iframeSrc);
  const fallbackName = serverM ? serverM[1] : 'Servidor';

  const html = await _get(iframeSrc);

  // Ya trae el array de servidores reales.
  const tabsM = /const\s+videoTabs\s*=\s*(\[[\s\S]*?\]);/.exec(html);
  if (tabsM) {
    try {
      const tabs = JSON.parse(tabsM[1]) as { tab_name: string; url: string }[];
      const parsed = tabs
        .filter(t => t.url && t.tab_name.toLowerCase() !== 'mytsumi')
        .map(t => ({ name: t.tab_name, iframeSrc: _absolutize(t.url) }));
      if (parsed.length > 0) return parsed;
    } catch {}
  }

  const linkRe = /<a href=['"]([^'"]+)['"]>\s*<button[^>]*>([^<]*)<\/button>/gi;
  const links = [...html.matchAll(linkRe)]
    .map(m => ({ href: _absolutize(decodeEntities(m[1])), label: m[2].trim() }))
    .filter(l => l.href.indexOf('mytsumi.com') !== -1);

  if (links.length > 0) {
    const results: _Mirror[] = [];
    const prefix = links.length > 1;
    for (const link of links) {
      const expanded = await _expandMytsumi(link.href, depth + 1);
      for (const e of expanded) {
        results.push(prefix ? { name: `${link.label} ${e.name}`, iframeSrc: e.iframeSrc } : e);
      }
    }
    if (results.length > 0) return results;
  }

  // Ninguna de las anteriores: ya es el embed final.
  return [{ name: fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1), iframeSrc }];
}

export async function watch(url: string): Promise<PrismWatch> {
  const episodeUrl = url.indexOf('http') === 0 ? url : `${BASE}/${url}/`;
  const html = await _get(episodeUrl);

  let rawMirrors = _parseMirrors(html);

  // Sin opciones en el <select> (algunos episodios solo traen el iframe por
  // defecto, sin selector de servidores) — usar el que carga de entrada.
  if (rawMirrors.length === 0) {
    const defaultM = /data-litespeed-src="([^"]+)"/i.exec(html) ||
      /<iframe[^>]+src=['"]([^'"]+)['"]/i.exec(html);
    if (defaultM) rawMirrors = [{ name: 'Default', iframeSrc: _absolutize(decodeEntities(defaultM[1])) }];
  }

  // Expandir wrappers "mytsumi" a sus servidores reales (Moon, Mega, OK...);
  // los demás mirrors (Mega, Netu, etc. directos del <select>) se dejan igual.
  // Cualquier URL de mytsumi.com se intenta expandir — _expandMytsumi ya
  // resuelve sola cuál de sus variantes es (ver comentario ahí arriba).
  const mirrors: _Mirror[] = [];
  for (const m of rawMirrors) {
    if (m.iframeSrc.indexOf('mytsumi.com') !== -1) {
      const expanded = await _expandMytsumi(m.iframeSrc);
      if (expanded.length > 0) { mirrors.push(...expanded); continue; }
    }
    mirrors.push(m);
  }

  const resolved = (
    await Promise.all(
      mirrors.map(async (mirror) => {
        try {
          const res = await resolveEmbed(mirror.name, mirror.iframeSrc, `${BASE}/`);
          if (res && res.url) {
            return { url: res.url, quality: mirror.name, headers: res.headers, ok: true };
          }
        } catch {}
        // Sin resolver nativo (o el resolver no encontró nada) — dejar la URL
        // cruda del embed para que el WebView sniffer de PrismHub la intente
        // igual. Casi nunca reproduce sola (ej. Moon pasó a ser un frontend
        // SPA propio que ya no se puede scrapear con regex), así que se marca
        // ok:false para no priorizarla sobre una que sí se resolvió de verdad.
        return { url: mirror.iframeSrc, quality: mirror.name, ok: false };
      }),
    )
  ).filter((s): s is NonNullable<typeof s> => s !== null);

  // Primero los mirrors resueltos a una URL directa (m3u8/mp4) — antes se
  // forzaba "Moon" siempre primero sin importar si en verdad se pudo
  // resolver, lo que rompía la reproducción apenas Moon cambiaba de motor
  // (confirmado en vivo: su nuevo frontend es una SPA sin nada scrapeable).
  // Entre los resueltos, Moon sigue siendo la preferencia del usuario.
  resolved.sort((a, b) => {
    if (a.ok !== b.ok) return a.ok ? -1 : 1;
    // El nombre puede venir prefijado con el idioma (ej. "Latino Moon"), así
    // que se busca "moon" como substring, no como nombre exacto.
    const aMoon = (a.quality || '').toLowerCase().includes('moon') ? 0 : 1;
    const bMoon = (b.quality || '').toLowerCase().includes('moon') ? 0 : 1;
    return aMoon - bMoon;
  });

  const streams = resolved.map(({ ok: _ok, ...s }) => s);
  return { streams, pageUrl: episodeUrl };
}

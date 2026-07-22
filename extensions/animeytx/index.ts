import { matchFirst, matchGroups, stripTags, decodeEntities } from '../../sdk/html';
import { resolveEmbed } from '../../sdk/embeds';
import type { PrismDetail, PrismItem, PrismWatch, PrismEpisode } from '../../sdk/types';

// sendMessage("request", ...) usa el dio de PrismHub (con UA, cookies y redirecciones),
// a diferencia de fetch() que usa http.Client básico.
declare function sendMessage(channel: string, data: string): Promise<string>;

async function _get(url: string): Promise<string> {
  const raw = await sendMessage('request', JSON.stringify([url, { method: 'get', headers: {} }]));
  try { return JSON.parse(raw); } catch { return raw; }
}

const BASE = 'https://wwv.animeytx.net';

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

// Algunos mirrors no son un embed directo: son un wrapper "mytsumi" que
// primero muestra un disclaimer ("Algunos reproductores tienen
// publicidad...") y recién al aceptar lleva al contenido real. Hay (al
// menos) DOS variantes distintas vistas en vivo, con dominio/ruta diferente:
//   1. mytsumi.com/multiplayer/options.php?server=multi&value=ID — el botón
//      "Aceptar" apunta a otro mytsumi ("contenedor.php?id=ID"), página que
//      trae un array `const videoTabs = [{"tab_name":"Moon","url":"..."},
//      ...]` con VARIOS servidores reales.
//   2. old.mytsumi.com/players/options.php?server=moon&value=ID — acá el
//      botón "Aceptar" ya apunta DIRECTO al embed real (ej. filemoon.to),
//      sin capa intermedia ni array de servidores.
// En ambos casos alcanza con: pedir el wrapper, sacar el href de "Aceptar",
// y si ESE resultado es a su vez otro mytsumi con array de servidores,
// expandirlo; si no, ya es el embed final.
async function _expandMytsumi(iframeSrc: string): Promise<_Mirror[]> {
  const serverM = /[?&]server=([a-zA-Z0-9]+)/.exec(iframeSrc);
  const fallbackName = serverM ? serverM[1] : 'Servidor';

  const html = await _get(iframeSrc);
  const acceptM = /class="play">[\s\S]*?<a href=['"]([^'"]+)['"]/i.exec(html);
  if (!acceptM) return [];
  const acceptHref = _absolutize(decodeEntities(acceptM[1]));

  // Variante 1: el "Aceptar" lleva a otro mytsumi con el array de servidores.
  if (acceptHref.indexOf('mytsumi.com') !== -1) {
    const html2 = await _get(acceptHref);
    const tabsM = /const\s+videoTabs\s*=\s*(\[[\s\S]*?\]);/.exec(html2);
    if (tabsM) {
      try {
        const tabs = JSON.parse(tabsM[1]) as { tab_name: string; url: string }[];
        const parsed = tabs
          .filter(t => t.url && t.tab_name.toLowerCase() !== 'mytsumi')
          .map(t => ({ name: t.tab_name, iframeSrc: _absolutize(t.url) }));
        if (parsed.length > 0) return parsed;
      } catch {}
    }
  }

  // Variante 2 (o variante 1 sin array reconocible): el href ya es el embed final.
  return [{ name: fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1), iframeSrc: acceptHref }];
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

  // Expandir wrappers "mytsumi" a sus servidores reales (Moon, Alpha, Mega...);
  // los demás mirrors (Mega, Netu, etc. directos del <select>) se dejan igual.
  const mirrors: _Mirror[] = [];
  for (const m of rawMirrors) {
    if (m.iframeSrc.indexOf('mytsumi.com/multiplayer/options.php') !== -1) {
      const expanded = await _expandMytsumi(m.iframeSrc);
      if (expanded.length > 0) { mirrors.push(...expanded); continue; }
    }
    mirrors.push(m);
  }

  const streams = (
    await Promise.all(
      mirrors.map(async (mirror) => {
        try {
          const res = await resolveEmbed(mirror.name, mirror.iframeSrc, `${BASE}/`);
          if (res && res.url) return { url: res.url, quality: mirror.name, headers: res.headers };
        } catch {}
        // Sin resolver nativo — dejar la URL cruda del embed para que el
        // WebView sniffer de PrismHub la intente igual.
        return { url: mirror.iframeSrc, quality: mirror.name };
      }),
    )
  ).filter((s): s is NonNullable<typeof s> => s !== null);

  // Moon es el servidor default más confiable (a pedido del usuario) — se
  // fuerza siempre primero, sin depender del orden en que la página lo liste.
  streams.sort((a, b) => {
    const aMoon = (a.quality || '').toLowerCase() === 'moon' ? 0 : 1;
    const bMoon = (b.quality || '').toLowerCase() === 'moon' ? 0 : 1;
    return aMoon - bMoon;
  });

  return { streams, pageUrl: episodeUrl };
}

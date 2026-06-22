import { matchFirst, matchGroups, stripTags } from '../../sdk/html';
import { resolveEmbed } from '../../sdk/embeds';
import type { PrismDetail, PrismItem, PrismWatch, PrismStream } from '../../sdk/types';

// sendMessage("request", ...) usa el dio de PrismHub (con UA, cookies y redirecciones),
// a diferencia de fetch() que usa http.Client básico.
declare function sendMessage(channel: string, data: string): Promise<string>;

async function _get(url: string, headers: Record<string, string> = {}): Promise<string> {
  const raw = await sendMessage('request', JSON.stringify([url, { method: 'get', headers }]));
  try { return JSON.parse(raw); } catch { return raw; }
}

async function _post<T>(url: string, token: string): Promise<T> {
  const raw = await sendMessage('request', JSON.stringify([url, {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json',
    },
    data: '_token=' + encodeURIComponent(token),
  }]));
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as T; } catch (e) {
      throw e;
    }
  }
  return raw as T;
}

interface _EpItem { id: number; number: number; title: string; }
interface _EpPage { data: _EpItem[]; last_page: number; total: number; current_page?: number; }

// ─── JKAnime ──────────────────────────────────────────────────────────────────
const BASE = 'https://jkanime.net';

interface JKServer {
  remote: string | null;
  server: string;
  lang: number;   // 0=SUB, 1=LAT, 2=CAST
  slug: string;
}

// Dedup solo para search (evita el mismo resultado en páginas distintas).
// latest() NO usa dedup inter-página: cada página contiene el mismo anime con
// diferente episodio — filtrarlos vaciaría páginas 2, 3... dando "no hay datos".
const _searchSeen = new Map<string, Set<string>>();

export async function latest(page: number): Promise<PrismItem[]> {
  // Page 1: home (recientes). Page 2+: directorio catalog — uses ?p= pagination.
  // Sin slash antes de ?p= para evitar que el servidor redirija y descarte el parámetro.
  const url = page === 1 ? BASE + '/' : `${BASE}/directorio?p=${page - 1}`;
  const html = await _get(url);
  return _parseCards(html);
}

export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  if (page === 1) _searchSeen.delete(keyword);
  if (!_searchSeen.has(keyword)) _searchSeen.set(keyword, new Set());
  const seen = _searchSeen.get(keyword)!;
  const html = await _get(`${BASE}/buscar/${encodeURIComponent(keyword)}/?page=${page}`);
  const cards = _parseCards(html);
  const fresh = cards.filter(c => !seen.has(c.url));
  fresh.forEach(c => seen.add(c.url));
  return fresh;
}

export async function detail(url: string): Promise<PrismDetail> {
  const slug = _toSlug(url);
  const html = await _get(`${BASE}/${slug}/`);

  const title =
    matchFirst(html, /<h1[^>]*>([^<]+)<\/h1>/i) ||
    matchFirst(html, /<title>([^|<]+)/i) ||
    slug;

  const cover =
    matchFirst(html, /property="og:image"\s+content="([^"]+)"/i) ||
    matchFirst(html, /class="card-img-top"\s+src="([^"]+)"/i) || '';

  const description = stripTags(
    matchFirst(html, /class="[^"]*sinopsis[^"]*"[^>]*>([\s\S]*?)<\/(?:div|p)>/i) ||
    matchFirst(html, /class="[^"]*descripci[^"]*"[^>]*>([\s\S]*?)<\/(?:div|p)>/i) || ''
  ).trim();

  // data-anime y csrf-token para la API de episodios — múltiples patrones
  const animeId =
    matchFirst(html, /data-anime="(\d+)"/i) ||
    matchFirst(html, /data-id="(\d+)"/i) ||
    matchFirst(html, /"anime_id"\s*:\s*(\d+)/i) ||
    matchFirst(html, /animeId\s*=\s*(\d+)/i);

  const token =
    matchFirst(html, /name="csrf-token"\s+content="([^"]+)"/i) ||
    matchFirst(html, /content="([^"]+)"\s+name="csrf-token"/i) ||
    matchFirst(html, /"csrf[_-]token"\s*:\s*"([^"]+)"/i);

  const episodes: PrismEpisode[] = [];

  if (animeId && token) {
    const allEps: _EpItem[] = [];
    let lastPage = 1;

    // Página 1 primero — para obtener last_page
    try {
      const first = await _post<_EpPage>(`${BASE}/ajax/episodes/${animeId}/1`, token);
      if (first && Array.isArray(first.data)) {
        allEps.push(...first.data);
        lastPage = first.last_page || 1;
      }
    } catch {}

    // Páginas restantes en paralelo (batches de 10 para no saturar)
    if (lastPage > 1) {
      const remaining = Array.from({ length: lastPage - 1 }, (_, i) => i + 2);
      const BATCH = 10;
      for (let i = 0; i < remaining.length; i += BATCH) {
        const batch = remaining.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map(p =>
            _post<_EpPage>(`${BASE}/ajax/episodes/${animeId}/${p}`, token)
              .catch(() => null),
          ),
        );
        for (const res of results) {
          if (res && Array.isArray(res.data)) allEps.push(...res.data);
        }
      }
    }

    for (const ep of allEps) {
      episodes.push({ title: ep.title, url: `${slug}/${ep.number}`, number: ep.number });
    }
    episodes.sort((a, b) => (a.number || 0) - (b.number || 0));
  }

  const genres = matchGroups(
    html,
    /<a[^>]+href="[^"]*\/genero\/[^"]*"[^>]*>([^<]+)<\/a>/gi,
  ).map(g => g[0]);

  return { title, cover, description, episodes, genres };
}

type PrismEpisode = { title: string; url: string; number?: number };

// Servidores que solo funcionan con JS en el browser — dio nunca puede extraer su stream.
// Para estos, saltamos directo al WebView sniffer sin perder tiempo con HTTP scraping.
const _JS_ONLY_HOSTS = [
  'voe.sx', 'voe.',
  'streamwish', 'sfastwish', 'wishfast', 'swdyu',
  'vidhide', 'filelions',
  'filemoon', 'moonplayer',
  'mixdrop', 'mxdrop',
];

// URLs internas de jkanime que son embeds propios (desu, magi, desuka, etc.),
// no URLs de episodio. Se detectan por el path después del dominio.
function _isJkInternalEmbed(url: string): boolean {
  if (url.indexOf('jkanime.net') === -1) return false;
  // URLs de episodio tienen formato: /anime-slug/numero/
  // URLs de embed propio tienen paths como /desu/hash, /magi/hash, /desuka/hash, etc.
  const path = url.replace(/^https?:\/\/jkanime\.net/, '').replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean);
  // Episodio: partes[0]=slug, partes[1]=numero → segundo segmento es número
  if (parts.length === 2 && /^\d+$/.test(parts[1])) return false;
  // Si el primer segmento es un nombre de servidor conocido → embed interno
  const knownEmbeds = ['desu', 'magi', 'desuka', 'embed', 'player', 'desudesuka'];
  return knownEmbeds.some(e => parts[0] === e || url.indexOf('desudesuka') !== -1);
}

export async function watch(url: string): Promise<PrismWatch> {
  // Fast-path A: embed URL externo (dominio != jkanime.net)
  if (url.indexOf('http') === 0 && url.indexOf('jkanime.net') === -1) {
    const uLow = url.toLowerCase();
    // Para servidores JS-only, ir directo al WebView sniffer sin intentar dio
    const isJsOnly = _JS_ONLY_HOSTS.some(h => uLow.indexOf(h) !== -1);
    if (!isJsOnly) {
      const name = _guessServerName(url);
      const stream = await _resolveEmbedDio(name, url, `${BASE}/`);
      if (stream) return { streams: [stream], pageUrl: '' };
    }
    // No se pudo resolver con dio (o es JS-only) → dejar que el WebView sniffer lo intente
    return { streams: [], pageUrl: url };
  }

  // Fast-path B: embed interno de jkanime (desu/magi/desuka) — NO es URL de episodio
  if (_isJkInternalEmbed(url)) {
    const uLow = url.toLowerCase();
    const isDesu = uLow.indexOf('/desu') !== -1 || uLow.indexOf('desudesuka') !== -1;
    const isMagi = uLow.indexOf('/magi') !== -1;
    if (isDesu) {
      const stream = await _resolveDesu(url, `${BASE}/`, 'Desu');
      if (stream) return { streams: [stream], pageUrl: '' };
    } else if (isMagi) {
      const stream = await _resolveMagi(url, `${BASE}/`, 'Magi');
      if (stream) return { streams: [stream], pageUrl: '' };
    }
    return { streams: [], pageUrl: url };
  }

  const episodeUrl =
    url.indexOf('http') === 0
      ? url
      : `${BASE}/${url.replace(/\/+$/, '')}/`;

  const html = await _get(episodeUrl);

  const m =
    /(?:var|let|const)\s+servers\s*=\s*(\[[\s\S]*?\]);/.exec(html) ||
    /(?:var|let|const)\s+video\s*=\s*(\[[\s\S]*?\]);/.exec(html);

  if (!m) {
    return { streams: [], pageUrl: episodeUrl };
  }

  let servers: JKServer[];
  try {
    servers = JSON.parse(m[1]) as JKServer[];
  } catch {
    return { streams: [], pageUrl: episodeUrl };
  }

  if (!Array.isArray(servers) || servers.length === 0) {
    return { streams: [], pageUrl: episodeUrl };
  }

  // SUB primero, luego LAT, luego CAST
  servers.sort((a, b) => (a.lang || 0) - (b.lang || 0));

  // Resolver todos en paralelo
  const resolved = await Promise.all(
    servers.map(s => _resolveServer(s, episodeUrl)),
  );

  // Direct streams (mp4/m3u8) antes que embeds crudos
  const direct = resolved.filter((s): s is PrismStream => s !== null && _isDirect(s.url));
  const embeds = resolved.filter((s): s is PrismStream => s !== null && !_isDirect(s.url));

  const streams = [...direct, ...embeds];

  // Mega siempre al final
  const isMega = (u: string) => u.indexOf('mega.nz') !== -1 || u.indexOf('mega.co.nz') !== -1;
  const ordered = [
    ...streams.filter(s => !isMega(s.url)),
    ...streams.filter(s => isMega(s.url)),
  ];

  return { streams: ordered, pageUrl: episodeUrl };
}

// ─── Resolver de servidor ──────────────────────────────────────────────────────

async function _resolveServer(
  server: JKServer,
  pageUrl: string,
): Promise<PrismStream | null> {
  let raw = '';
  if (server.remote) {
    try { raw = _b64decode(server.remote); } catch { raw = ''; }
  }
  if (!raw && server.slug) {
    raw = server.slug.indexOf('http') === 0
      ? server.slug
      : `${BASE}${server.slug}`;
  }
  if (!raw) return null;

  raw = _resolveRedirect(raw);

  const name = server.server || 'Embed';
  const langSuffix = server.lang === 1 ? ' LAT' : server.lang === 2 ? ' CAST' : '';
  const label = `${name}${langSuffix}`;
  const nameLow = name.toLowerCase();

  // Mega: URL directa (se abre en WebView)
  if (raw.indexOf('mega.nz') !== -1 || raw.indexOf('mega.co.nz') !== -1) {
    return { url: raw, quality: label };
  }

  // Desu (servidor propio de jkanime)
  if (nameLow === 'desu' || raw.indexOf('desudesuka') !== -1 || raw.indexOf('desu.') !== -1) {
    const r = await _resolveDesu(raw, pageUrl, label);
    if (r) return r;
    return { url: raw, quality: label };
  }

  // Magi (servidor propio de jkanime)
  if (nameLow === 'magi' || raw.indexOf('magi') !== -1) {
    const r = await _resolveMagi(raw, pageUrl, label);
    if (r) return r;
    return { url: raw, quality: label };
  }

  // Voe — custom resolver usando dio
  if (nameLow === 'voe' || raw.indexOf('voe.sx') !== -1 || raw.indexOf('voe.') !== -1) {
    const r = await _resolveVoeDio(raw, label);
    if (r) return r;
    return { url: raw, quality: label };
  }

  // Streamtape — custom resolver usando dio
  if (nameLow === 'streamtape' || raw.indexOf('streamtape') !== -1 || raw.indexOf('stape') !== -1) {
    const r = await _resolveStreamtapeDio(raw, label);
    if (r) return r;
    return { url: raw, quality: label };
  }

  // Streamwish / sfastwish / wishfast / vidhide / filelions
  if (
    nameLow === 'streamwish' ||
    raw.indexOf('streamwish') !== -1 ||
    raw.indexOf('sfastwish') !== -1 ||
    raw.indexOf('wishfast') !== -1 ||
    raw.indexOf('vidhide') !== -1 ||
    raw.indexOf('filelions') !== -1 ||
    raw.indexOf('swdyu') !== -1
  ) {
    const r = await _resolveStreamwishDio(raw, label);
    if (r) return r;
    return { url: raw, quality: label };
  }

  // Mp4Upload
  if (raw.indexOf('mp4upload') !== -1) {
    try {
      const res = await resolveEmbed('Mp4Upload', raw, `${BASE}/`);
      if (res && res.url) return { url: res.url, quality: label, headers: res.headers };
    } catch {}
    return null;
  }

  // Mixdrop y mirrors (nombre "Mixdrop" del servidor puede tener dominio espejo)
  if (nameLow === 'mixdrop' || raw.indexOf('mixdrop') !== -1 || raw.indexOf('mxdrop') !== -1) {
    try {
      const res = await resolveEmbed('Mixdrop', raw, `${BASE}/`);
      if (res && res.url) return { url: res.url, quality: label, headers: res.headers };
    } catch {}
    return { url: raw, quality: label };
  }

  // Doodstream y mirrors
  if (nameLow === 'doodstream' || nameLow === 'dood' ||
      raw.indexOf('dood') !== -1 || raw.indexOf('ds2play') !== -1 || raw.indexOf('ds2video') !== -1) {
    try {
      const res = await resolveEmbed('Doodstream', raw, `${BASE}/`);
      if (res && res.url) return { url: res.url, quality: label, headers: res.headers };
    } catch {}
    return null;  // doodstream mirrors suelen fallar DNS
  }

  // Intentar con resolveEmbed del SDK como resolver genérico
  const serverName = _guessServerName(raw) || name;
  try {
    const res = await resolveEmbed(serverName, raw, `${BASE}/`);
    if (res && res.url) return { url: res.url, quality: label, headers: res.headers };
  } catch {}

  // Fallback: URL cruda para hosts que el WebView sniffer puede manejar
  const rawLow = raw.toLowerCase();
  if (
    rawLow.indexOf('yourupload') !== -1 ||
    rawLow.indexOf('dood') !== -1 ||
    rawLow.indexOf('ok.ru') !== -1 ||
    rawLow.indexOf('mixdrop') !== -1 ||
    rawLow.indexOf('filemoon') !== -1
  ) {
    return { url: raw, quality: label };
  }

  return null;
}

// ─── Resolvers con dio (_get) ─────────────────────────────────────────────────

// Dispatcher unificado: usa _get (dio) primero para embed externos.
// Llamado desde el fast-path de watch() cuando switchServer envía una URL de embed.
async function _resolveEmbedDio(
  name: string,
  url: string,
  referer: string,
): Promise<PrismStream | null> {
  const label = name;
  const u = url.toLowerCase();

  if (u.indexOf('voe') !== -1) return _resolveVoeDio(url, label);
  if (u.indexOf('streamtape') !== -1 || u.indexOf('stape') !== -1) return _resolveStreamtapeDio(url, label);
  if (u.indexOf('streamwish') !== -1 || u.indexOf('sfastwish') !== -1 ||
      u.indexOf('wishfast') !== -1 || u.indexOf('vidhide') !== -1) return _resolveStreamwishDio(url, label);
  if (u.indexOf('mp4upload') !== -1) {
    try {
      const res = await resolveEmbed('Mp4Upload', url, referer);
      if (res && res.url) return { url: res.url, quality: label, headers: res.headers };
    } catch {}
    return null;
  }
  // Genérico con SDK
  try {
    const res = await resolveEmbed(name, url, referer);
    if (res && res.url) return { url: res.url, quality: label, headers: res.headers };
  } catch {}
  return null;
}

// Voe (2024+): formato encrypted JSON en <script type="application/json">
async function _resolveVoeDio(url: string, label: string): Promise<PrismStream | null> {
  try {
    let html = await _get(url, { 'Referer': BASE + '/' });
    if (!html) return null;

    // Seguir redirección JS al dominio espejo
    const redir = /window\.location(?:\.href)?\s*=\s*['"](https?:\/\/[^'"]+)['"]/.exec(html);
    if (redir) {
      const mirror = await _get(redir[1], { 'Referer': 'https://voe.sx/' });
      if (mirror) html = mirror;
    }

    // Formato 2024: JSON cifrado en <script type="application/json">["..."]</script>
    const jsonScript = /<script[^>]*type=["']application\/json["'][^>]*>\s*\[\s*"([^"]+)"\s*\]\s*<\/script>/.exec(html);
    if (jsonScript) {
      const decoded = _voeDecode(jsonScript[1]);
      if (decoded) {
        const src = /"source"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(decoded);
        if (src) return { url: src[1].replace(/\\\//g, '/'), quality: label };
        const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(decoded.replace(/\\\//g, '/'));
        if (m3u8) return { url: m3u8[1], quality: label };
        const mp4 = /"direct_access_url"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(decoded);
        if (mp4) return { url: mp4[1].replace(/\\\//g, '/'), quality: label };
      }
    }

    // Fallbacks para páginas voe más antiguas
    let m = /\bhls["']?\s*:\s*["']([^"']+)["']/.exec(html);
    if (m) return { url: m[1], quality: label };

    // atob() decode fallback
    const atobM = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
    if (atobM) {
      try {
        const dec = _b64decode(atobM[1]);
        const hls = /['"]hls['"]\s*:\s*['"]([^'"]+)['"]/.exec(dec);
        if (hls) return { url: hls[1], quality: label };
      } catch {}
    }

    m = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/.exec(html);
    if (m) return { url: m[0], quality: label };
  } catch {}
  return null;
}

// Streamtape (2024+): div oculto con get_video URL
async function _resolveStreamtapeDio(url: string, label: string): Promise<PrismStream | null> {
  try {
    const html = await _get(url, { 'Referer': BASE + '/' });
    if (!html) return null;

    // Div oculto con URL get_video
    const div = /id=["'](?:ideoolink|botlink|robotlink)["'][^>]*>\s*(\/\/?[^<]*get_video[^<]*)</.exec(html);
    if (div) {
      let path = div[1].trim();
      if (path.startsWith('//')) path = 'https:' + path;
      else if (path.startsWith('/')) path = 'https:/' + path;
      if (!/[?&]stream=/.test(path)) path += '&stream=1';
      return { url: path, quality: label, headers: { 'Referer': 'https://streamtape.com/' } };
    }

    // Obfuscated robotlink concat
    const robot = /robotlink['"]\)[^'"]+(\/\/?streamtape[^'"]+)['"]/i.exec(html);
    if (robot) {
      const p = robot[1].startsWith('//') ? 'https:' + robot[1] : robot[1];
      return { url: p + '&stream=1', quality: label, headers: { 'Referer': 'https://streamtape.com/' } };
    }

    let m = /(https?:\/\/streamtape\.[a-z]+\/get_video[^"'\s<>]+)/.exec(html);
    if (m) return { url: m[1], quality: label, headers: { 'Referer': 'https://streamtape.com/' } };

    m = /(\/\/streamtape\.[a-z]+\/get_video[^"'\s<>]+)/.exec(html);
    if (m) return { url: 'https:' + m[1], quality: label, headers: { 'Referer': 'https://streamtape.com/' } };
  } catch {}
  return null;
}

// Streamwish / sfastwish / wishfast / vidhide (motor open-source streamwish)
async function _resolveStreamwishDio(url: string, label: string): Promise<PrismStream | null> {
  try {
    const hostM = /^https?:\/\/([^/]+)/.exec(url);
    const host = hostM ? hostM[1] : null;
    if (!host) return null;

    const hdrs = { 'Referer': 'https://' + host + '/' };

    // Intentar API JSON: /api/file/{id}?json=1
    const idM = /\/(?:e|f|d|v)\/([A-Za-z0-9]+)/.exec(url);
    if (idM) {
      const id = idM[1];
      try {
        const json = await _get(
          'https://' + host + '/api/file/' + id + '?json=1',
          { ...hdrs, 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
        );
        if (json) {
          const fileM = /"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/.exec(json);
          if (fileM) return { url: fileM[1].replace(/\\\//g, '/'), quality: label, headers: hdrs };
          const mp4M = /"file"\s*:\s*"([^"]+\.mp4[^"]*)"/.exec(json);
          if (mp4M) return { url: mp4M[1].replace(/\\\//g, '/'), quality: label, headers: hdrs };
        }
      } catch {}
    }

    // Fallback: scraping HTML del embed
    const html = await _get(url, hdrs);
    if (!html) return null;

    // Buscar en eval(p,a,c,k) desempaquetado
    const unpacked = _unpackEval(html);
    const full = (html + '\n' + unpacked).replace(/\\\//g, '/');

    const m3u8 = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(full);
    if (m3u8) return { url: m3u8[1], quality: label, headers: hdrs };

    // JW Player file/source/src
    const file = /(?:file|source|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/i.exec(full);
    if (file) return { url: file[1], quality: label, headers: hdrs };

    // atob
    const atobM = /\batob\s*\(\s*['"]([A-Za-z0-9+/=]{20,})['"]\s*\)/.exec(html);
    if (atobM) {
      try {
        const dec = _b64decode(atobM[1]);
        const src = /(https?:[^"'\s\\]+\.m3u8[^"'\s\\]*)/.exec(dec.replace(/\\\//g, '/'));
        if (src) return { url: src[1], quality: label, headers: hdrs };
      } catch {}
    }

    const mp4s = full.match(/https?:[^"'\s\\]+\.mp4[^"'\s\\]*/g) ?? [];
    const real = mp4s.find((u: string) => !/\.(?:css|js|jpg|png|woff)/.test(u));
    if (real) return { url: real, quality: label, headers: hdrs };
  } catch {}
  return null;
}

// ─── Resolvers Desu / Magi ─────────────────────────────────────────────────────

async function _resolveDesu(
  url: string,
  referer: string,
  label: string,
): Promise<PrismStream | null> {
  try {
    const hdrs = { 'Referer': referer || `${BASE}/` };
    const html = await _get(url, hdrs);
    const stream =
      matchFirst(html, /"url"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i) ||
      matchFirst(html, /"file"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i) ||
      matchFirst(html, /"url"\s*:\s*"(https?:\/\/[^"]+\.mp4[^"]*)"/i) ||
      matchFirst(html, /<source[^>]+src="(https?:\/\/[^"]+\.m3u8[^"]*)"/i);
    // Incluir Referer en el stream para que libmpv/CDN lo acepte
    if (stream) return { url: stream, quality: label, headers: hdrs };
  } catch {}
  return null;
}

async function _resolveMagi(
  url: string,
  referer: string,
  label: string,
): Promise<PrismStream | null> {
  try {
    const hdrs = { 'Referer': referer || `${BASE}/` };
    const html = await _get(url, hdrs);
    const stream =
      matchFirst(html, /<source[^>]+src="(https?:\/\/[^"]+\.m3u8[^"]*)"/i) ||
      matchFirst(html, /<source[^>]+src="(https?:\/\/[^"]+\.mp4[^"]*)"/i) ||
      matchFirst(html, /source\s*:\s*['"]?(https?:\/\/[^'">\s]+\.m3u8)/i);
    if (stream) return { url: stream, quality: label, headers: hdrs };
  } catch {}
  return null;
}

// ─── Helpers de criptografía (Voe 2024) ──────────────────────────────────────

function _rot13(s: string): string {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

function _voeDecode(raw: string): string | null {
  try {
    let r = _rot13(raw);
    for (const p of ['@$', '^^', '#&', '~@', '%?', '*~', '!!', '`']) {
      r = r.split(p).join('');
    }
    const step3 = _b64decode(r);
    let shifted = '';
    for (let i = 0; i < step3.length; i++) {
      shifted += String.fromCharCode(step3.charCodeAt(i) - 3);
    }
    const reversed = shifted.split('').reverse().join('');
    return _b64decode(reversed);
  } catch {
    return null;
  }
}

// Desempaqueta eval(function(p,a,c,k,e,d){...}) de Dean Edwards
function _unpackEval(html: string): string {
  let out = '';
  const re = /eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]*?\.split\('\|'\)[^)]*\)\)/g;
  for (const m of html.matchAll(re)) {
    const inner = /\}\s*\(\s*'(.*?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'(.*?)'\.split\('\|'\)/s.exec(m[0]);
    if (!inner) continue;
    let payload = inner[1];
    const radix = parseInt(inner[2], 10);
    const count = parseInt(inner[3], 10);
    const words = inner[4].split('|');
    payload = payload.split("\\'").join("'");
    const enc = (n: number): string =>
      (n < radix ? '' : enc(Math.floor(n / radix))) +
      ((n = n % radix) > 35 ? String.fromCharCode(n + 29) : n.toString(36));
    const dict: Record<string, string> = {};
    for (let i = count - 1; i >= 0; i--) dict[enc(i)] = words[i] || enc(i);
    out += '\n' + payload.replace(/\b\w+\b/g, (w) => dict[w] ?? w);
  }
  return out;
}

// ─── Helpers generales ───────────────────────────────────────────────────────

function _isDirect(url: string): boolean {
  const u = url.toLowerCase();
  return u.indexOf('.m3u8') !== -1 || u.indexOf('.mp4') !== -1 ||
    u.indexOf('.mkv') !== -1 || u.indexOf('.ts') !== -1;
}

function _resolveRedirect(url: string): string {
  if (url.indexOf('/jkokru.php') !== -1) {
    const id = _urlParam(url, 'u');
    return id ? `http://ok.ru/videoembed/${id}` : url;
  }
  if (url.indexOf('/jkvmixdrop.php') !== -1) {
    const id = _urlParam(url, 'u');
    return id ? `https://mixdrop.ag/e/${id}` : url;
  }
  if (url.indexOf('/jksw.php') !== -1) {
    const id = _urlParam(url, 'u');
    return id ? `https://sfastwish.com/e/${id}` : url;
  }
  if (url.indexOf('/jk.php') !== -1) {
    const path = _urlParam(url, 'u');
    return path ? `${BASE}/${path}` : url;
  }
  return url;
}

function _urlParam(url: string, name: string): string {
  const re = new RegExp('[?&]' + name + '=([^&#]+)');
  const m = re.exec(url);
  return m ? decodeURIComponent(m[1]) : '';
}

// Base64 decode puro sin atob (para QuickJS)
function _b64decode(s: string): string {
  const T = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let r = '';
  s = s.replace(/-/g, '+').replace(/_/g, '/');
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

function _guessServerName(url: string): string {
  const u = url.toLowerCase();
  if (u.indexOf('voe') !== -1) return 'Voe';
  if (u.indexOf('streamtape') !== -1 || u.indexOf('stape') !== -1) return 'Streamtape';
  if (u.indexOf('mixdrop') !== -1 || u.indexOf('mxdrop') !== -1) return 'Mixdrop';
  if (u.indexOf('mp4upload') !== -1) return 'Mp4Upload';
  if (u.indexOf('dood') !== -1 || u.indexOf('ds2play') !== -1 || u.indexOf('ds2video') !== -1) return 'Doodstream';
  if (u.indexOf('streamwish') !== -1 || u.indexOf('sfastwish') !== -1 ||
      u.indexOf('wishfast') !== -1 || u.indexOf('vidhide') !== -1) return 'Streamwish';
  if (u.indexOf('filemoon') !== -1 || u.indexOf('moonplayer') !== -1) return 'Filemoon';
  if (u.indexOf('yourupload') !== -1 || u.indexOf('yupload') !== -1) return 'YourUpload';
  if (u.indexOf('hqq') !== -1 || u.indexOf('netu') !== -1) return 'Netu';
  if (u.indexOf('mega.nz') !== -1 || u.indexOf('mega.co.nz') !== -1) return 'Mega';
  return 'Embed';
}

function _toSlug(url: string): string {
  if (url.indexOf('http') !== 0) return url.replace(/\/+$/, '');
  return url
    .replace(/^https?:\/\/jkanime\.net\//, '')
    .replace(/\/+$/, '');
}

const _NAV_SLUGS = new Set([
  'genero','directorio','buscar','ajax','tag','temporada',
  'anime','ver','episodio','wp-content','wp-includes',
  // páginas de categoría de jkanime (no son animes)
  'serie','pelicula','especial','ova','ona','music','peli','especiales','cortos',
]);

function _isNavSlug(s: string): boolean {
  return !s || s.length < 3 || _NAV_SLUGS.has(s) || /[?&#]/.test(s);
}

// Extrae el primer segmento de un path tipo "slug" o "slug/23" → "slug"
function _firstSegment(path: string): string {
  return path.split('/')[0];
}

function _parseCards(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  if (!html) return items;

  const seen = new Set<string>();

  // ── Estrategia A: img.card-img-top (home page — recientes) ───────────────
  const imgRe = /<img\b[^>]*>/gi;
  let imgM: RegExpExecArray | null;
  while ((imgM = imgRe.exec(html)) !== null) {
    const tag = imgM[0];
    if (tag.indexOf('card-img-top') === -1) continue;

    // Cover: data-animepic > data-setbg (jkanime) > data-src > src
    // jkanime usa <div data-setbg="URL"> en lugar de <img src="URL">;
    // buscamos en ±500 chars alrededor del <img>
    const setbgNearM = /\bdata-setbg=["'](https?:\/\/[^"']{10,})["']/i.exec(
      html.slice(Math.max(0, imgM.index - 200), imgM.index + tag.length + 500),
    );
    const animePicM = /\bdata-animepic=["']([^"']+)["']/i.exec(tag);
    const dataSrcM  = /\bdata-src=["']([^"']+)["']/i.exec(tag);
    const srcM      = /\bsrc=["']([^"']+)["']/i.exec(tag);
    const srcVal    = srcM && srcM[1] && !/data:image|\.gif$|placeholder/i.test(srcM[1]) ? srcM[1] : '';
    const cover = (setbgNearM && setbgNearM[1]) ||
                  (animePicM  && animePicM[1])   ||
                  (dataSrcM   && dataSrcM[1])    ||
                  srcVal;

    // Slug: buscar el ÚLTIMO href de anime (no de categoría) en los 700 chars
    // antes de la imagen. El más cercano = el del <a> que envuelve este card.
    const pos = imgM.index;
    const beforeImg = html.slice(Math.max(0, pos - 700), pos);
    const allHrefs = [...beforeImg.matchAll(/href=["']https?:\/\/jkanime\.net\/([a-z0-9][a-z0-9-]{1,80}(?:\/\d+)?)\/["']/gi)];
    // Filtrar slugs de navegación/categoría y tomar el último válido
    const validHrefs = allHrefs.filter(m => !_isNavSlug(_firstSegment(m[1])));
    if (validHrefs.length === 0) continue;
    const hrefM = validHrefs[validHrefs.length - 1];
    const slug = _firstSegment(hrefM[1]);
    if (seen.has(slug)) continue;
    seen.add(slug);

    // Título: alt del img > heading/link en los 500 chars después del img > slug
    let title = '';
    const altM = /\balt=["']([^"']{2,})["']/i.exec(tag);
    if (altM && altM[1].trim().length > 1) {
      title = altM[1].trim();
    } else {
      const afterImg = html.slice(pos + tag.length, pos + tag.length + 500);
      // <h4/5/6><a href="...">TÍTULO</a></h4/5/6>
      const hLinkM = /<h[4-6][^>]*>\s*<a[^>]*>([^<]{2,80})<\/a>/i.exec(afterImg);
      // <h4/5/6>TÍTULO</h4/5/6>
      const hPlainM = /<h[4-6][^>]*>([^<]{2,80})<\/h[4-6]>/i.exec(afterImg);
      // class="card-title" o "anime-title"
      const cardTitleM = /class="[^"]*(?:card-title|anime-title)[^"]*"[^>]*>([^<]{2,80})</i.exec(afterImg);
      title = (hLinkM  && hLinkM[1].trim())  ||
              (hPlainM && hPlainM[1].trim())  ||
              (cardTitleM && cardTitleM[1].trim()) ||
              slug.replace(/-/g, ' ');
    }

    items.push({ title, url: slug, cover });
  }

  // ── Estrategia B: resultados de búsqueda y directorio (estructura diferente) ────
  // Soporta hrefs absolutos (https://jkanime.net/slug/) Y relativos (/slug/)
  // ya que el directorio usa rutas relativas mientras la búsqueda usa absolutas.
  if (items.length === 0) {
    const hrefRe = /href=["'](?:https?:\/\/jkanime\.net)?\/([a-z0-9][a-z0-9-]{1,80})\/["']/gi;
    let hrefMatch: RegExpExecArray | null;
    while ((hrefMatch = hrefRe.exec(html)) !== null) {
      const slug = hrefMatch[1];
      if (_isNavSlug(slug)) continue;
      if (seen.has(slug)) continue;

      const pos = hrefMatch.index;
      // Ventana ajustada: 600 antes + 800 después (evita capturar otro card)
      const ctx = html.slice(Math.max(0, pos - 600), pos + 800);

      // Imagen: jkanime usa <div data-setbg="URL"> para el poster (no <img>)
      // También intentamos <img> con atributos lazy-load como fallback.
      let cover = '';

      // 1) data-setbg (patrón principal de jkanime)
      const setbgM = /\bdata-setbg=["'](https?:\/\/[^"']{10,})["']/i.exec(ctx);
      if (setbgM) {
        cover = setbgM[1];
      }

      // 2) background-image inline (misma info que data-setbg, usada cuando JS la aplica)
      if (!cover) {
        const bgM = /background-image:\s*url\(['"]?(https?:\/\/[^'")\s]{10,})['"]?\)/i.exec(ctx);
        if (bgM) cover = bgM[1];
      }

      // 3) Fallback <img> con atributos lazy-load
      if (!cover) {
        const imgCtxRe = /<img\b[^>]*>/gi;
        let imgCtxM: RegExpExecArray | null;
        while ((imgCtxM = imgCtxRe.exec(ctx)) !== null) {
          const t = imgCtxM[0];
          const s = /\b(?:data-lazy-src|data-lazy|data-original|data-src|src)=["']([^"']{20,})["']/i.exec(t);
          if (s && !/\.gif$|data:image|\.js$|\.css$|\.svg$|logo|icon|sprite/i.test(s[1])) {
            cover = s[1];
            break;
          }
        }
      }

      // Título: alt de imagen real > texto del link > headings > slug humanizado
      let title = '';
      // 1) alt de la imagen (si no es decorativo)
      const altM = /<img\b[^>]*\balt=["']([^"']{2,80})["'][^>]*>/i.exec(ctx);
      if (altM && !/logo|icon|banner|avatar/i.test(altM[1])) title = altM[1].trim();
      // 2) texto directamente dentro del <a href="...slug...">TEXTO</a>
      if (!title) {
        const linkEndCtx = html.slice(pos, pos + hrefMatch[0].length + 300);
        const linkTextM = /href=["'][^"']+["'][^>]*>([^<]{2,80})</i.exec(linkEndCtx);
        if (linkTextM) title = linkTextM[1].trim().replace(/\s+/g, ' ');
      }
      // 3) headings y spans de título en el contexto
      if (!title) {
        // <h4/5/6><a>TÍTULO</a> — estructura más común en jkanime
        const hLinkM = /<h[4-6][^>]*>\s*<a[^>]*>([^<]{2,80})<\/a>/i.exec(ctx);
        const hPlainM = /<h[2-6][^>]*>([^<]{2,80})<\/h[2-6]>/i.exec(ctx);
        const spanM = /class="[^"]*(?:title|name|anime)[^"]*"[^>]*>([^<]{2,80})</i.exec(ctx);
        title = (hLinkM  && hLinkM[1].trim())  ||
                (hPlainM && hPlainM[1].trim())  ||
                (spanM   && spanM[1].trim())    ||
                slug.replace(/-/g, ' ');
      }

      // Solo incluir si tiene imagen — filtra enlaces de navegación falsos positivos
      if (!cover) continue;
      seen.add(slug);
      items.push({ title, url: slug, cover });
    }
  }

  return items;
}

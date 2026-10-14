import type {
  PrismDetail,
  PrismEpisode,
  PrismItem,
  PrismMangaWatch,
} from '../../sdk/types';

declare function sendMessage(channel: string, data: string): Promise<string>;

// ─── La API ─────────────────────────────────────────────────────────────────
//
// MangaDex tiene API pública y documentada, así que acá no se raspa una sola
// línea de HTML: todo sale de JSON. Eso hace que la extensión no se rompa
// cuando el sitio cambia su diseño, que es lo que suele matar a las demás.
//
// Todo lo de abajo está medido contra la red antes de escribirlo (2026-08-09):
// las cuatro llamadas que hacen falta contestan, las portadas y las páginas
// bajan sin ninguna cabecera especial, y hay 246.949 capítulos en español.
const API = 'https://api.mangadex.org';
const PORTADAS = 'https://uploads.mangadex.org/covers';

/** Cuántas obras trae cada tanda. El tope de la API es 100. */
const POR_PAGINA = 32;

async function _get<T = unknown>(
  ruta: string,
  params: Record<string, string | string[] | undefined> = {},
): Promise<T> {
  const partes: string[] = [];
  for (const [clave, valor] of Object.entries(params)) {
    if (valor === undefined) continue;
    // Los parámetros de lista van REPETIDOS, no separados por coma:
    // `contentRating[]=safe&contentRating[]=suggestive`. Con coma la API
    // devuelve 400.
    if (Array.isArray(valor)) {
      for (const v of valor) {
        if (v) partes.push(`${encodeURIComponent(clave)}=${encodeURIComponent(v)}`);
      }
    } else {
      partes.push(`${encodeURIComponent(clave)}=${encodeURIComponent(valor)}`);
    }
  }
  const url = `${API}${ruta}${partes.length ? `?${partes.join('&')}` : ''}`;
  const pedir = async (): Promise<T> => {
    const crudo = await sendMessage(
      'request',
      JSON.stringify([url, { method: 'get', headers: { Accept: 'application/json' } }]),
    );
    const r = JSON.parse(crudo) as T & {
      result?: string;
      errors?: { status?: number }[];
    };
    // Solo lo que es de un momento (429, 5xx). Un 404 —capítulo borrado— no se
    // reintenta: sigue de largo y la app avisa que no tiene páginas.
    const estado = r?.result === 'error' ? Number(r.errors?.[0]?.status ?? 0) : 0;
    if (estado === 429 || estado >= 500) throw new Error('MangaDex no respondió');
    return r;
  };
  // ── Un reintento, y uno solo ─────────────────────────────────────────────
  //
  // Medido en el banco (2026-10-13): 1 de 123 capítulos falló con un corte de
  // red de un momento. Se espera un segundo —el tope de la API es por
  // segundo— y se intenta otra vez; si vuelve a fallar, el error sube tal
  // cual. Cuando anda, no agrega ninguna demora.
  try {
    return await pedir();
  } catch {
    await new Promise((r) => setTimeout(r, 1000));
    return pedir();
  }
}

// ─── Contenido para adultos ─────────────────────────────────────────────────
//
// MangaDex clasifica CADA obra con una de cuatro etiquetas, así que no hay que
// adivinar nada: se le pide directamente lo que se quiere ver.
//
// Fuera de la Zona +18 van las dos primeras. `suggestive` es el equivalente de
// «ecchi»: sugerente pero no explícito, que es el techo acordado para lo que
// puede aparecer en el Inicio.
const _APTO = ['safe', 'suggestive'];
const _TODO = ['safe', 'suggestive', 'erotica', 'pornographic'];

function _clasificacion(filtro?: Record<string, string[]>): string[] {
  return filtro?.['adulto']?.[0] === 'si' ? _TODO : _APTO;
}

/** Los idiomas de los capítulos que se quieren ver. */
function _idiomas(filtro?: Record<string, string[]>): string[] {
  const elegido = filtro?.['idioma']?.[0];
  if (elegido) return elegido === 'es' ? ['es', 'es-la'] : [elegido];
  // Sin elegir, el español en sus dos variantes: es como se publica en
  // MangaDex y pedir solo una deja fuera la mitad del catálogo traducido.
  return ['es', 'es-la'];
}

// ─── Piezas sueltas de la respuesta ─────────────────────────────────────────

type Rel = { id: string; type: string; attributes?: Record<string, unknown> };
type Obra = { id: string; attributes: Record<string, any>; relationships?: Rel[] };

/** El título, con el idioma que haya. */
function _titulo(a: Record<string, any>): string {
  const t = a?.title ?? {};
  const alt: Record<string, string>[] = a?.altTitles ?? [];
  return (
    t.es ??
    t['es-la'] ??
    t.en ??
    Object.values(t)[0] ??
    alt.map((x) => x.es ?? x['es-la'] ?? x.en)[0] ??
    'Sin título'
  ) as string;
}

/** La descripción, con el idioma que haya. */
function _descripcion(a: Record<string, any>): string | undefined {
  const d = a?.description ?? {};
  return (d.es ?? d['es-la'] ?? d.en ?? Object.values(d)[0]) as string | undefined;
}

/**
 * La portada.
 *
 * La API no devuelve la dirección armada: da el nombre del archivo dentro de
 * la relación `cover_art`, y hay que juntarlo con el id de la obra. El sufijo
 * `.512.jpg` pide la versión reducida — la original pesa varios megas y en una
 * grilla de veinte tarjetas eso se nota.
 */
function _portada(m: Obra): string | undefined {
  const rel = (m.relationships ?? []).find((r) => r.type === 'cover_art');
  const archivo = rel?.attributes?.['fileName'] as string | undefined;
  return archivo ? `${PORTADAS}/${m.id}/${archivo}.512.jpg` : undefined;
}

// La API misma trae `contentRating` por obra (safe/suggestive/erotica/
// pornographic) — hasta ahora acá solo se usaba para PEDIR ('contentRating[]='
// en la URL), nunca se devolvía. Solo erotica/pornographic marcan `adult:
// true`; 'suggestive' es el escalón de abajo (más laxo que "Ecchi" en otros
// sitios) y queda sin marcar — el resto de las señales de la app (filtro,
// géneros) lo siguen cubriendo igual si corresponde.
function _esAdulto(rating: unknown): boolean | undefined {
  return rating === 'erotica' || rating === 'pornographic' ? true : undefined;
}

function _item(m: Obra, actualizacion?: string): PrismItem {
  const a = m.attributes ?? {};
  return {
    title: _titulo(a),
    url: m.id,
    cover: _portada(m),
    update: actualizacion,
    year: typeof a.year === 'number' ? a.year : undefined,
    adult: _esAdulto(a.contentRating),
  };
}

/** Pide las obras por id, con su portada. */
async function _obrasPorId(ids: string[]): Promise<Map<string, Obra>> {
  const mapa = new Map<string, Obra>();
  if (!ids.length) return mapa;
  const r = await _get<{ data?: Obra[] }>('/manga', {
    limit: String(Math.min(ids.length, 100)),
    'ids[]': ids,
    'includes[]': ['cover_art'],
    // Sin esto la API aplica su clasificación por defecto y descarta obras que
    // YA venían en la lista de capítulos: quedaban tarjetas sin título.
    'contentRating[]': _TODO,
  });
  for (const m of r.data ?? []) mapa.set(m.id, m);
  return mapa;
}

// ─── Lo último ──────────────────────────────────────────────────────────────

/**
 * Los capítulos recién subidos, que es lo que el sitio muestra en su portada
 * bajo «Latest Updates».
 *
 * ── Por qué por CAPÍTULO y no por obra ─────────────────────────────────────
 *
 * Se puede pedir obras ordenadas por «último capítulo subido», y sería una
 * sola llamada. Pero eso da la obra sin decir QUÉ capítulo salió, y lo que uno
 * quiere ver en «lo último» es justamente eso: que hay un capítulo nuevo y
 * cuál. Pidiendo capítulos se puede poner «Cap. 70» debajo de la portada.
 *
 * Cuesta una llamada más —los capítulos no traen la portada de su obra— y son
 * dos peticiones en vez de una. Vale la pena por el dato.
 *
 * ── includeExternalUrl=0, y no es opcional ─────────────────────────────────
 *
 * Buena parte del catálogo popular no está alojado en MangaDex: son enlaces a
 * la web del editor. Esos capítulos vienen con `pages: 0` y su servidor de
 * imágenes contesta 404 — medido con One Piece, que es TODO externo. Sin este
 * parámetro, el usuario abre un capítulo del Inicio y no ve nada.
 */
export async function latest(page: number): Promise<PrismItem[]> {
  // Se piden 100 capítulos —el tope de la API— para quedarse con ~30 obras.
  //
  // Medido: pidiendo 32 salían solo 6 obras distintas. No es un error de la
  // API: cuando un grupo sube una serie entera de golpe, veinte capítulos
  // seguidos son de la misma obra, y al quedarse con uno por obra la fila
  // quedaba casi vacía. Pidiendo el tope hay margen de sobra para que
  // aparezcan obras distintas.
  const PIDE = 100;

  // Una obra puede tener varios capítulos nuevos seguidos. Se queda el primero
  // —el más reciente— y los demás se descartan: si no, la fila mostraría la
  // misma portada cuatro veces.
  const orden: string[] = [];
  const capDe = new Map<string, string>();

  // ── Se insiste hasta juntar una fila decente ───────────────────────────
  //
  // Cien capítulos NO son cien obras. Con un grupo subiendo una serie entera
  // de golpe, y encima filtrando por idioma, una tanda puede dejar diez obras
  // distintas mientras la portada del sitio muestra el doble. Dos tandas
  // alcanzan de sobra, y se corta apenas hay suficientes: lo normal es que la
  // primera baste y la segunda no llegue a pedirse.
  const OBJETIVO = 24;
  for (let tanda = 0; tanda < 2; tanda++) {
    const r = await _get<{ data?: Obra[] }>('/chapter', {
      limit: String(PIDE),
      offset: String((Math.max(0, page - 1) * 2 + tanda) * PIDE),
      'order[readableAt]': 'desc',
      // ── Sin filtrar por idioma, y es a propósito ────────────────────────
      //
      // Esta sección es «Últimas actualizaciones» tal como la publica el
      // sitio, y el sitio la muestra con TODOS los idiomas mezclados: en su
      // portada conviven banderas de México, Vietnam, Reino Unido, Indonesia y
      // Finlandia. Filtrando a español se veía otra lista — comprobado
      // comparando contra la portada: sin filtro, el primer resultado es
      // exactamente el primero que muestra la web.
      //
      // MangaDex es una extensión multiidioma; recortarla a uno solo acá sería
      // decidir por el usuario justo en la sección que promete ser «lo que
      // acaba de salir». Para elegir idioma está el filtro, que sí manda en el
      // catálogo y en la búsqueda.
      'contentRating[]': _APTO,
      includeExternalUrl: '0',
      'includes[]': ['manga'],
    });
    const capitulos = r.data ?? [];
    for (const c of capitulos) {
      const obra = (c.relationships ?? []).find((x) => x.type === 'manga');
      if (!obra || capDe.has(obra.id)) continue;
      const n = c.attributes?.chapter;
      capDe.set(obra.id, n ? `Cap. ${n}` : 'Nuevo');
      orden.push(obra.id);
    }
    // Ya alcanza, o el sitio se quedó sin capítulos que dar.
    if (orden.length >= OBJETIVO || capitulos.length < PIDE) break;
  }

  // El tope de `/manga?ids[]=` es 100, y de acá salen como mucho ~30, pero se
  // recorta igual: si algún día sube el tope de capítulos, esto no revienta.
  const obras = await _obrasPorId(orden.slice(0, 100));
  // En el orden en que llegaron los capítulos, no en el que conteste la
  // segunda llamada: lo primero es lo más reciente y ese es todo el sentido.
  return orden
    .map((id) => {
      const m = obras.get(id);
      return m ? _item(m, capDe.get(id)) : null;
    })
    .filter((x): x is PrismItem => x !== null);
}

// ─── Catálogo y búsqueda ────────────────────────────────────────────────────

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  const texto = keyword.trim();
  const orden = filter?.['orden']?.[0] || 'followedCount';
  const r = await _get<{ data?: Obra[] }>('/manga', {
    limit: String(POR_PAGINA),
    offset: String(Math.max(0, page - 1) * POR_PAGINA),
    title: texto || undefined,
    // Buscando por texto manda la relevancia; sin texto, lo que se eligió.
    [texto ? 'order[relevance]' : `order[${orden}]`]: 'desc',
    'contentRating[]': _clasificacion(filter),
    'includes[]': ['cover_art'],
    'includedTags[]': filter?.['genero']?.filter(Boolean),
    'status[]': filter?.['estado']?.filter(Boolean),
    'publicationDemographic[]': filter?.['demografia']?.filter(Boolean),
    'originalLanguage[]': filter?.['tipo']?.filter(Boolean),
    // Que exista traducido al idioma que se pide: sin esto el catálogo
    // devuelve obras que después no tienen ni un capítulo que leer.
    //
    // ── Salvo buscando un NOMBRE ─────────────────────────────────────────
    //
    // Quien escribe el nombre sabe qué quiere, y lo tiene que encontrar.
    // Medido (2026-10-14): 4 de 7 obras del propio «lo último» no aparecían
    // buscándolas por su nombre exacto, por no tener capítulos en español.
    // La ficha ya muestra entonces el idioma más completo, avisado. Solo se
    // acota si el usuario eligió OTRO idioma a propósito.
    'availableTranslatedLanguage[]':
      texto && (filter?.['idioma']?.[0] ?? 'es') === 'es'
        ? undefined
        : _idiomas(filter),
  });
  return (r.data ?? []).map((m) => _item(m));
}

// ─── Filtros ────────────────────────────────────────────────────────────────
//
// Los identificadores de género y de formato son los reales de la API, leídos
// de `/manga/tag` (77 etiquetas en cuatro grupos). Van escritos acá y no se
// piden en vivo a propósito: son fijos, y pedirlos sumaría una llamada cada
// vez que alguien abre el panel de filtros.
//
// Las etiquetas se muestran en ESPAÑOL aunque la API las nombre en inglés: son
// las que ve el usuario, y además es lo que permite que PrismHub las reconozca
// y las ofrezca en la barra de filtros del Inicio junto a las de las demás
// extensiones.
const _GENEROS: Record<string, string> = {
  '': 'Todos',
  '391b0423-d847-456f-aff0-8b0cfc03066b': 'Acción',
  '87cc87cd-a395-47af-b27a-93258283bbc6': 'Aventura',
  '4d32cc48-9f00-4cca-9b5a-a839f0764984': 'Comedia',
  'b9af3a63-f058-46de-a9a0-e0c13906197a': 'Drama',
  'cdc58593-87dd-415e-bbc0-2ec27bf404cc': 'Fantasía',
  '423e2eae-a7a2-4a8b-ac03-a8351462d71d': 'Romance',
  '256c8bd9-4904-4360-bf4f-508a76d67183': 'Ciencia Ficción',
  'ee968100-4191-4968-93d3-f82d72be7e46': 'Misterio',
  '3b60b75c-a2d7-4860-ab56-05f391bb889c': 'Psicológico',
  'cdad7e68-1419-41dd-bdce-27753074a640': 'Horror',
  '07251805-a27e-4d59-b488-f0bfbec15168': 'Thriller',
  '69964a64-2f90-4d33-beeb-f3ed2875eb4c': 'Deportes',
  '33771934-028e-4cb3-8744-691e866a923e': 'Histórico',
  'ace04997-f6bd-436e-b261-779182193d3d': 'Isekai',
  'f8f62932-27da-4fe4-8ee1-6779a8c5edba': 'Tragedia',
  'e5301a23-ebd9-49dd-a0cb-2add944c7fe9': 'Recuentos de la vida',
  '50880a9d-5440-4732-9afb-8f457127e836': 'Mecha',
  '5ca48985-9a9d-4bd8-be29-80dc0303db72': 'Crimen',
  '7064a261-a137-4d3a-8848-2d385de3a99c': 'Superhéroes',
  'acc803a4-c95a-4c22-86fc-eb6b582d82a2': 'Wuxia',
  'c8cbe35b-1b2b-4a3f-9c37-db84c4514856': 'Medicina',
  '81c836c9-914a-4eca-981a-560dad663e73': 'Chicas mágicas',
  'b1e97889-25b4-4258-b28b-cd7f4d28ea9b': 'Filosófico',
  '5920b825-4181-4a17-beeb-9918b0ff7a30': 'Boys Love',
  'a3c67850-4684-404e-9b7f-c69850ee5da6': 'Girls Love',
};

// El «tipo» sale del idioma ORIGINAL de la obra, que es como se distingue de
// verdad un manga de un manhwa o un manhua. MangaDex no tiene un campo
// «tipo», pero este dato dice exactamente lo mismo y no hay que adivinarlo.
const _TIPOS: Record<string, string> = {
  '': 'Todos',
  ja: 'Manga',
  ko: 'Manhwa',
  zh: 'Manhua',
};

const _ESTADOS: Record<string, string> = {
  '': 'Todos',
  ongoing: 'En emisión',
  completed: 'Finalizado',
  hiatus: 'Pausado',
  cancelled: 'Cancelado',
};

const _DEMOGRAFIAS: Record<string, string> = {
  '': 'Todas',
  shounen: 'Shounen',
  shoujo: 'Shoujo',
  seinen: 'Seinen',
  josei: 'Josei',
};

// Los idiomas con más traducciones, medidos sobre el catálogo. La lista corta
// a propósito: MangaDex tiene más de cuarenta y la mayoría con un puñado de
// obras, así que llenarían el panel sin aportar.
const _IDIOMAS: Record<string, string> = {
  es: 'Español',
  en: 'Inglés',
  'pt-br': 'Portugués (Brasil)',
  ja: 'Japonés',
  ko: 'Coreano',
  zh: 'Chino',
  fr: 'Francés',
  ru: 'Ruso',
  de: 'Alemán',
  it: 'Italiano',
  id: 'Indonesio',
  vi: 'Vietnamita',
};

const _ORDENES: Record<string, string> = {
  followedCount: 'Popularidad',
  latestUploadedChapter: 'Actualización',
  rating: 'Valoración',
  createdAt: 'Novedad',
  title: 'Título',
};

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    // Primero y con `adultOption`: es la marca con la que PrismHub reconoce
    // una puerta a contenido para adultos. Con ella manda siempre el valor
    // seguro desde el Inicio y desde el buscador normal, y solo la abre dentro
    // de la Zona +18.
    adulto: {
      title: 'Contenido adulto',
      options: { no: 'No', si: 'Sí' },
      default: 'no',
      adultOption: 'si',
      min: 1,
      max: 1,
    },
    idioma: {
      title: 'Idioma',
      options: _IDIOMAS,
      default: 'es',
      min: 1,
      max: 1,
    },
    tipo: { title: 'Tipo', options: _TIPOS, default: '', min: 1, max: 1 },
    genero: { title: 'Género', options: _GENEROS, default: '', min: 1, max: 1 },
    estado: { title: 'Estado', options: _ESTADOS, default: '', min: 1, max: 1 },
    demografia: {
      title: 'Demografía',
      options: _DEMOGRAFIAS,
      default: '',
      min: 1,
      max: 1,
    },
    orden: {
      title: 'Ordenar por',
      options: _ORDENES,
      default: 'followedCount',
      min: 1,
      max: 1,
    },
  };
}

// ─── Detalle ────────────────────────────────────────────────────────────────

const _ESTADO_PRISM: Record<string, PrismDetail['status']> = {
  ongoing: 'ongoing',
  completed: 'completed',
  hiatus: 'hiatus',
  cancelled: 'completed',
};

/**
 * La ficha de una obra, con todos sus capítulos.
 *
 * Los capítulos vienen paginados de a 100 y una obra larga tiene cientos, así
 * que se pide de a tandas hasta juntarlos todos. Con tope: una obra con
 * capítulos en veinte idiomas puede tener miles, y bajarlos todos para mostrar
 * una lista sería castigar al usuario por abrir la ficha.
 */
export async function detail(url: string): Promise<PrismDetail> {
  const id = url.trim();
  const r = await _get<{ data?: Obra }>(`/manga/${id}`, {
    'includes[]': ['cover_art', 'author'],
  });
  const m = r.data;
  const a = m?.attributes ?? {};

  const generos: string[] = [];
  for (const t of (a.tags ?? []) as Obra[]) {
    const nombre = _GENEROS[t.id] ?? (t.attributes?.name?.en as string | undefined);
    if (nombre) generos.push(nombre);
  }

  const autor = (m?.relationships ?? []).find((x) => x.type === 'author');
  const extra: Record<string, string> = {};
  if (autor?.attributes?.['name']) extra['Autor'] = String(autor.attributes['name']);
  const original = a.originalLanguage as string | undefined;
  if (original && _TIPOS[original]) extra['Tipo'] = _TIPOS[original];
  if (a.publicationDemographic) extra['Demografía'] = String(a.publicationDemographic);

  const episodios = await _capitulos(id);
  // ── Sin nada que leer: decirlo ──────────────────────────────────────────
  //
  // Hay obras cuyos capítulos están TODOS en la web del editor, no en
  // MangaDex (medido: 8 de cada 120 populares). La API no deja sacarlas del
  // catálogo —su filtro de «capítulos disponibles» las cuenta igual—, así que
  // la ficha lo explica en vez de quedar vacía sin motivo.
  const descripcion = _descripcion(a);
  const sinCapitulos = m && !episodios.length
    ? 'MangaDex no aloja los capítulos de esta obra: están en la web del editor.'
    : undefined;

  return {
    title: m ? _titulo(a) : 'Sin título',
    cover: m ? _portada(m) : undefined,
    description: sinCapitulos
      ? (descripcion ? `${sinCapitulos}\n\n${descripcion}` : sinCapitulos)
      : descripcion,
    genres: generos.length ? generos : undefined,
    status: _ESTADO_PRISM[a.status as string],
    year: typeof a.year === 'number' ? a.year : undefined,
    extra: Object.keys(extra).length ? extra : undefined,
    episodes: episodios,
    adult: _esAdulto(a.contentRating),
  };
}

// ── De a 500, hasta 5.000 entradas ──────────────────────────────────────
//
// Antes se pedía de a 100 y se frenaba a las 5 tandas: con varios grupos
// subiendo el mismo capítulo, 500 entradas no alcanzan ni para la mitad de una
// obra larga. Medido (2026-10-13): Berserk mostraba 191 de 403 capítulos,
// Yāo Shén Jì 337 de 710, Martial Peak 397 de 3.227. 500 es el tope de la
// API: Berserk pasa de 10 pedidos a 2 y tarda lo mismo (1,3 s).
const _POR_TANDA = 500;
const _TOPE_DE_ENTRADAS = 5000;

type Capitulo = { id: string; attributes: Record<string, any> };

async function _capitulos(id: string): Promise<PrismEpisode[]> {
  // ── Primero en español; si no hay, UN solo idioma ───────────────────────
  //
  // «Últimas actualizaciones» trae todos los idiomas, como el sitio, así que
  // hay fichas sin nada en español. Antes se pedían todos los idiomas juntos y
  // quedaban mezclados capítulo a capítulo (medido: One Piece en portugués,
  // catalán y árabe intercalados; Jujutsu Kaisen en azerí y kazajo). Ahora se
  // elige uno: el que tenga más capítulos, salvo que el inglés —el más leído
  // después del español— tenga al menos la mitad. Sin esa condición One Piece
  // salía en inglés con 1 solo capítulo habiendo idiomas con más de 250.
  const enEspanol = await _entradas(id, _idiomas());
  if (enEspanol.length) return _lista(enEspanol, false);

  const todas = await _entradas(id, undefined);
  const porIdioma = new Map<string, Capitulo[]>();
  for (const c of todas) {
    const idioma = String(c.attributes?.translatedLanguage ?? '');
    if (!porIdioma.has(idioma)) porIdioma.set(idioma, []);
    porIdioma.get(idioma)!.push(c);
  }
  // Se cuentan capítulos DISTINTOS, no entradas: diez grupos subiendo el
  // capítulo 1 no hacen una traducción más completa.
  const distintos = (l: Capitulo[]) =>
    new Set(l.map((c) => c.attributes?.chapter ?? c.id)).size;
  let elegido: Capitulo[] | undefined;
  let mejor = 0;
  for (const lista of porIdioma.values()) {
    const n = distintos(lista);
    if (n > mejor) {
      mejor = n;
      elegido = lista;
    }
  }
  const ingles = porIdioma.get('en');
  if (ingles && distintos(ingles) * 2 >= mejor) elegido = ingles;
  return _lista(elegido ?? [], true);
}

/** Las entradas del feed con páginas, en orden de capítulo. */
async function _entradas(
  id: string,
  idiomas: string[] | undefined,
): Promise<Capitulo[]> {
  const salida: Capitulo[] = [];
  for (let offset = 0; offset < _TOPE_DE_ENTRADAS; offset += _POR_TANDA) {
    const r = await _get<{ data?: Capitulo[] }>(`/manga/${id}/feed`, {
      limit: String(_POR_TANDA),
      offset: String(offset),
      'translatedLanguage[]': idiomas,
      'order[chapter]': 'asc',
      'order[volume]': 'asc',
      // Mismo motivo que en latest: los externos no se pueden leer acá.
      includeExternalUrl: '0',
      'contentRating[]': _TODO,
    });
    const tanda = r.data ?? [];
    // Sin páginas no hay nada que abrir. Pasa con capítulos recién creados
    // que todavía no tienen las imágenes subidas.
    for (const c of tanda) if (c.attributes?.pages) salida.push(c);
    if (tanda.length < _POR_TANDA) break;
  }
  return salida;
}

function _lista(entradas: Capitulo[], conIdioma: boolean): PrismEpisode[] {
  const salida: PrismEpisode[] = [];
  const vistos = new Set<string>();
  let sinTitulo = 0;
  for (const c of entradas) {
    const at = c.attributes ?? {};
    // ── Sin repetidos ──────────────────────────────────────────────────────
    //
    // El mismo capítulo lo pueden haber subido varios grupos; se queda el
    // primero. La clave es el NÚMERO solo, sin el volumen: un grupo sube el
    // capítulo 1 sin volumen y otro como «volumen 1», y con el volumen en la
    // clave salían los dos (medido en Berserk, caps. 91 y 99). Un oneshot no
    // tiene número: se reconoce por su título, así el mismo oneshot de dos
    // grupos sale una vez y dos oneshots distintos salen los dos.
    const clave = at.chapter
      ? `c${Number(at.chapter)}`
      : `o${String(at.title ?? '').trim().toLowerCase() || c.id}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    // Dos oneshots sin título son obras distintas (medido: dos grupos, 9 y 12
    // páginas): se numeran para que no parezcan el mismo repetido.
    const oneshots = at.chapter || at.title ? 0 : ++sinTitulo;
    const numero = at.chapter
      ? `Capítulo ${at.chapter}`
      : oneshots > 1 ? `Oneshot ${oneshots}` : 'Oneshot';
    let nombre = at.title ? `${numero}: ${at.title}` : numero;
    // Cuando la lista NO es la de español, se dice en qué idioma está. Abrir
    // un capítulo y encontrarse otro idioma sin aviso es peor que saberlo
    // antes de tocar.
    if (conIdioma && at.translatedLanguage) {
      nombre = `${nombre} [${String(at.translatedLanguage).toUpperCase()}]`;
    }
    salida.push({
      title: nombre,
      url: c.id,
      number: at.chapter ? Number(at.chapter) : undefined,
      airDate:
        typeof at.publishAt === 'string' ? at.publishAt.slice(0, 10) : undefined,
    });
  }
  return salida;
}

// ─── Lectura ────────────────────────────────────────────────────────────────

/**
 * Las páginas de un capítulo.
 *
 * MangaDex reparte las imágenes entre varios servidores y dice cuál toca en
 * `/at-home/server`: no hay una dirección fija que se pueda armar sola. La
 * respuesta trae el servidor, un hash y la lista de archivos, y con esas tres
 * cosas se arma cada página.
 *
 * Medido: las imágenes bajan con 200 y sin ninguna cabecera especial — ni
 * Referer hace falta.
 */
export async function watch(url: string): Promise<PrismMangaWatch> {
  const r = await _get<{
    baseUrl?: string;
    chapter?: { hash?: string; data?: string[]; dataSaver?: string[] };
  }>(`/at-home/server/${url.trim()}`);
  const base = r.baseUrl;
  const hash = r.chapter?.hash;
  const paginas = r.chapter?.data ?? [];
  if (!base || !hash || !paginas.length) {
    // Devolver una lista vacía es mejor que inventar direcciones: la app
    // avisa que el capítulo no tiene páginas en vez de mostrar huecos rotos.
    return { urls: [] };
  }
  return { urls: paginas.map((p) => `${base}/data/${hash}/${p}`) };
}

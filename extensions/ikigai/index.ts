import type { PrismItem, PrismDetail, PrismMangaWatch } from '../../sdk/types';

// sendMessage("request", ...) usa el dio de PrismHub (con UA, cookies y redirecciones),
// a diferencia de fetch() que usa http.Client básico.
declare function sendMessage(channel: string, data: string): Promise<string>;

const BASE = 'https://visorikigai.gettocaboca.com';
// Los capítulos NO se leen en el mismo dominio que el catálogo: el visor vive
// aparte. Confirmado mirando la navegación real del sitio.
const LECTOR = 'https://viralikigai.radiot.space';

// El sitio es Qwik con render en servidor, así que el HTML ya viene armado y se
// puede leer sin ejecutar JavaScript. Eso deja marcas <!--qv ...--> entre medio
// del marcado; ninguna de las expresiones de acá depende de ellas.
async function _html(url: string): Promise<string> {
  return sendMessage(
    'request',
    JSON.stringify([url, { method: 'get', headers: { Referer: BASE + '/' } }]),
  );
}

function _decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function _stripTags(s: string): string {
  return _decode(s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '));
}

// OJO: la URL de la portada NO se toca.
//
// Pasan por un redimensionador y van FIRMADAS, y la firma cubre la ruta entera
// — incluido el tramo "rs:fill:<ancho>:<alto>". Cambiar ese tamaño para pedir
// una imagen más grande invalida la firma y el CDN responde 403: en la app se
// veía la tarjeta con el logo de relleno en vez de la portada. Comprobado
// pidiendo la misma imagen con el tamaño original (200) y con uno cambiado
// (403). Se usa tal cual viene; las del catálogo ya vienen a 300x400.

// ─── Catálogo ────────────────────────────────────────────────────────────────

// Cada tarjeta del catálogo es un <a href="/series/slug/"> que envuelve la
// portada y el título. Se recorre por enlace en vez de por clase de CSS: las
// clases son utilitarias (Tailwind) y cambian con cualquier retoque de diseño,
// mientras que la forma de la URL es estable.
function _itemsDe(html: string): PrismItem[] {
  const items: PrismItem[] = [];
  const vistos = new Set<string>();
  // Se recorre por POSICION del enlace y se toma una ventana hacia adelante, en
  // vez de exigir que el </a> cierre dentro del trozo. Las tarjetas del sitio
  // son largas (figura + portada + titulo + etiquetas) y con la forma anterior
  // solo entraban 12 de 26; el resto se perdia en silencio.
  const re = /href="\/series\/([a-z0-9-]+)\/"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const slug = m[1];
    if (vistos.has(slug)) continue;
    const dentro = html.slice(m.index, m.index + 1200);

    const img = /<img[^>]+src="([^"]+)"[^>]*>/.exec(dentro);
    // Las miniaturas de 80x110 son las listas de "Tendencias" del menú
    // desplegable, no resultados del catálogo. Sin descartarlas, cada búsqueda
    // arrastraba las mismas tres series populares.
    if (img && /rs:fill:80:110/.test(img[1])) continue;

    const alt = /<img[^>]+alt="([^"]*)"/.exec(dentro);
    const titulo = alt ? _decode(alt[1]) : _stripTags(dentro).slice(0, 120);
    if (!titulo) continue;

    vistos.add(slug);
    items.push({
      title: titulo,
      url: slug,
      cover: img ? _decode(img[1]) : undefined,
    });
  }
  return items;
}

function _consulta(
  page: number,
  filter?: Record<string, string[]>,
  extra?: Record<string, string>,
): string {
  const partes: string[] = [];
  const uno = (k: string) => filter?.[k]?.[0] ?? '';

  // Comics Y novelas. La extension se declara "mixedReading": PrismHub resuelve
  // el lector POR OBRA a partir del tipo que devuelve detail(), asi que una
  // novela abre con el lector de texto y un comic con el de paginas, sin que
  // esta extension aparezca en los filtros de video.
  const tipo = uno('tipo');
  if (tipo) partes.push(`tipos[]=${encodeURIComponent(tipo)}`);

  const genero = uno('genero');
  if (genero) partes.push(`generos[]=${encodeURIComponent(genero)}`);

  const ordenar = extra?.['ordenar'] ?? uno('ordenar');
  if (ordenar) partes.push(`ordenar=${encodeURIComponent(ordenar)}`);
  const direccion = extra?.['direccion'] ?? uno('direccion');
  if (direccion) partes.push(`direccion=${encodeURIComponent(direccion)}`);

  partes.push(`pagina=${page}`);
  return `${BASE}/series/?${partes.join('&')}`;
}

export async function latest(page: number): Promise<PrismItem[]> {
  const html = await _html(
    _consulta(page, undefined, { ordenar: 'last_chapter_date', direccion: 'desc' }),
  );
  return _itemsDe(html);
}

// ─── Búsqueda ────────────────────────────────────────────────────────────────

// El sitio NO busca en el servidor: se descarga el catálogo entero (~2,8 MB) y
// filtra en el navegador. Acá no se hace eso a propósito — son datos móviles, y
// además ese endpoint depende del identificador del build, que cambia en cada
// despliegue del sitio y dejaría la extensión rota sin aviso.
//
// En su lugar se recorren páginas del catálogo y se filtra por título. Se cortan
// las vueltas apenas hay suficientes resultados o una página viene vacía, así
// que una búsqueda que acierta rápido no paga el costo de las demás.
// Cuantas paginas del catalogo se miran como maximo, y de a cuantas por vez.
//
// En fila, cada pagina es un viaje de ida y vuelta: ocho ya se sentian lentas y
// cubrian ~160 obras de ~5300, o sea que buscar algo que no estuviera en las
// primeras paginas devolvia "sin resultados" aunque el sitio SI lo tuviera
// (reportado en vivo buscando "amigo").
//
// Pidiendolas de a seis en paralelo, treinta paginas cuestan cinco viajes en
// vez de treinta: se cubren ~600 obras en menos tiempo del que antes tardaban
// ocho. Sigue sin ser el catalogo completo —para eso haria falta el indice
// entero del sitio, 2,8 MB— pero cambia bastante lo que se encuentra.
const PAGINAS_BUSQUEDA = 30;
const PAGINAS_POR_TANDA = 6;
const RESULTADOS_OBJETIVO = 24;

function _normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    // Sin quitar acentos, buscar "leyenda escarlata" no encontraba nada con
    // títulos que llevan tilde. Se comparan las dos partes ya normalizadas.
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function search(
  keyword: string,
  page: number,
  filter?: Record<string, string[]>,
): Promise<PrismItem[]> {
  // Sin texto es simplemente el catálogo con los filtros puestos, paginado por
  // el propio sitio.
  if (!keyword || !keyword.trim()) {
    return _itemsDe(await _html(_consulta(page, filter)));
  }

  const buscado = _normalizar(keyword);
  const encontrados: PrismItem[] = [];
  const vistos = new Set<string>();

  for (let p = 1; p <= PAGINAS_BUSQUEDA; p += PAGINAS_POR_TANDA) {
    const tanda: number[] = [];
    for (let k = p; k < p + PAGINAS_POR_TANDA && k <= PAGINAS_BUSQUEDA; k++) {
      tanda.push(k);
    }

    // Una pagina que falla no tira la busqueda: devuelve cadena vacia y se
    // sigue con las demas.
    const htmls = await Promise.all(
      tanda.map(async (k) => {
        try {
          return await _html(_consulta(k, filter));
        } catch {
          return '';
        }
      }),
    );

    let huboItems = false;
    for (const html of htmls) {
      if (!html) continue;
      const lote = _itemsDe(html);
      if (lote.length > 0) huboItems = true;
      for (const it of lote) {
        if (vistos.has(it.url)) continue;
        vistos.add(it.url);
        if (_normalizar(it.title).includes(buscado)) encontrados.push(it);
      }
    }

    // Ninguna pagina de la tanda trajo nada: se acabo el catalogo.
    if (!huboItems) break;
    if (encontrados.length >= RESULTADOS_OBJETIVO) break;
  }

  // Alfabetico: con varias paginas llegando a destiempo, el orden en que
  // terminan las peticiones no deberia decidir como se ven los resultados.
  encontrados.sort((a, b) => a.title.localeCompare(b.title, 'es'));

  // La paginación la resuelve esta función, no el sitio: el llamador pide
  // página 2 esperando los siguientes resultados de SU búsqueda.
  const porPagina = 24;
  const desde = (page - 1) * porPagina;
  return encontrados.slice(desde, desde + porPagina);
}

// ─── Filtros ─────────────────────────────────────────────────────────────────

// Los identificadores de género son fijos del sitio. Van escritos acá porque el
// panel de filtros se arma con JavaScript y no aparece en el HTML servido; los
// que están son los que el propio sitio enlaza en su menú.
const GENEROS: Record<string, string> = {
  '': 'Todos',
  '906397904327999491': 'Acción',
  '906409527934582787': 'Adulto',
  '906397904061530115': 'Aventura',
  '906409351330037763': 'Boys Love',
  '906398112851165187': 'Comedia',
  '906397903933407235': 'Drama',
  '906397894348570627': 'Fantasía',
  '906397894527549443': 'Romance',
  '906397894408372227': 'Shoujo',
  '906409351272792067': '+18',
};

export async function createFilter(): Promise<Record<string, unknown>> {
  return {
    // Sin "Manga": el menu del sitio enlaza ?tipos[]=manga pero el catalogo no
    // tiene ninguna serie con ese tipo, asi que elegirlo llevaba a una lista
    // vacia. Novela va antes que Comic porque los comics son ~5300 de las
    // ~5700 series: su primera pagina es identica a la de "Todos" y no deja
    // ver que el filtro hizo algo.
    tipo: {
      title: 'Tipo',
      options: { '': 'Todos', novel: 'Novela', comic: 'Cómic' },
      default: '',
      min: 1,
      max: 1,
    },
    genero: { title: 'Género', options: GENEROS, default: '', min: 1, max: 1 },
    ordenar: {
      title: 'Ordenar por',
      options: {
        last_chapter_date: 'Actualización reciente',
        name: 'Nombre',
        created_at: 'Más nuevos',
        view_count: 'Más vistos',
        bookmark_count: 'Más guardados',
        rating_count: 'Mejor valorados',
      },
      default: 'last_chapter_date',
      min: 1,
      max: 1,
    },
    direccion: {
      title: 'Orden',
      options: { desc: 'Descendente', asc: 'Ascendente' },
      default: 'desc',
      min: 1,
      max: 1,
    },
  };
}

// ─── Detalle ─────────────────────────────────────────────────────────────────

export async function detail(slug: string): Promise<PrismDetail> {
  const url = `${BASE}/series/${encodeURIComponent(slug)}/`;
  const completo = await _html(url);

  // TODO lo que se lee de la ficha sale de <main>, no de la página entera.
  //
  // La cabecera trae un menú con un enlace a CADA género del sitio y tarjetas
  // de "Tendencias" con su estado. Leyendo el documento completo, cualquier
  // obra devolvía los diez géneros del menú y el estado de otra serie — daba
  // igual cuál se abriera. Recortar a <main> deja solo lo de esta obra.
  const iniMain = completo.indexOf('<main');
  const finMain = completo.lastIndexOf('</main>');
  const html =
    iniMain !== -1 && finMain > iniMain ? completo.slice(iniMain, finMain) : completo;

  // El <title> vive en la cabecera del documento, fuera del recorte de <main>.
  const tituloCrudo = /<title[^>]*>([\s\S]*?)<\/title>/.exec(completo);
  const title = tituloCrudo
    ? _decode(tituloCrudo[1]).replace(/\s*\|\s*Ikigai Mangas\s*$/i, '')
    : slug;

  const desc = /<meta[^>]+name="description"[^>]+content="([^"]*)"/.exec(completo);
  const description = desc ? _decode(desc[1]) : '';

  // La portada de la ficha es la primera imagen del redimensionador que no sea
  // una miniatura de menú.
  let cover: string | undefined;
  const imgs = html.match(/https:\/\/image\d?\.ikigaimangas\.cloud\/[^"'\s]+/g) || [];
  for (const u of imgs) {
    if (/rs:fill:80:110/.test(u)) continue;
    cover = u;
    break;
  }

  // Capítulos: cada uno es un enlace a /capitulo/<id>/. Se conserva el ORDEN de
  // aparición y después se invierte, porque la ficha los lista del más nuevo al
  // más viejo y el lector espera el orden de lectura.
  const episodes: { title: string; url: string; number?: number }[] = [];
  const vistos = new Set<string>();
  // Igual que en el catalogo: por posicion, no por <a>...</a>. Las tarjetas de
  // capitulo llevan miniatura, contadores y fecha, asi que nunca cerraban
  // dentro de una ventana corta — de 25 capitulos entraban 2.
  const reCap = /href="\/capitulo\/(\d+)\/"/g;
  let m: RegExpExecArray | null;
  while ((m = reCap.exec(html)) !== null) {
    const id = m[1];
    if (vistos.has(id)) continue;
    const texto = _stripTags(html.slice(m.index, m.index + 500));
    // "Primer Capítulo" y "Último Capítulo" son los botones de atajo de la
    // ficha, no entradas de la lista: apuntan a capítulos que ya están más
    // abajo y colarlos duplicaría el primero y el último.
    if (/^(primer|último|ultimo)\s+cap/i.test(texto)) continue;
    vistos.add(id);
    const num = /cap[íi]tulo\s*([\d.]+)/i.exec(texto);
    // La ventana trae de yapa los "me gusta", las vistas y la fecha. Se corta en
    // el encabezado del capitulo para que el titulo no salga con esa cola.
    const enc = /(cap[íi]tulo\s*[\d.]+(?:\s*:\s*[^<]{1,60})?)/i.exec(texto);
    episodes.push({
      title: enc ? enc[1].trim() : `Capítulo ${num ? num[1] : episodes.length + 1}`,
      url: id,
      number: num ? Number(num[1]) : undefined,
    });
  }
  // Orden de lectura: del 1 en adelante. Antes se invertía a ciegas la lista de
  // la página, y como esa lista no siempre viene en el mismo sentido el
  // resultado quedaba del último al primero. Ordenar por el número del
  // capítulo no depende de cómo los liste el sitio.
  //
  // Los que no traen número (extras, especiales) van al final en el orden en
  // que aparecían, para no perderlos ni meterlos en medio de la numeración.
  episodes.sort((a, b) => {
    if (a.number == null && b.number == null) return 0;
    if (a.number == null) return 1;
    if (b.number == null) return -1;
    return a.number - b.number;
  });

  // Los géneros son enlaces al catálogo filtrado, y el NOMBRE está en el texto
  // del propio enlace. Antes se traducía el id contra la tabla GENEROS, que
  // solo tiene los diez que el sitio enlaza en su menú: las obras con géneros
  // fuera de esa lista —Histórico, Tragedia, Josei, Sobrenatural— los perdían.
  // Leyendo el texto aparecen todos, sin depender de ninguna tabla.
  const genres: string[] = [];
  const reGen = /href="\/series\/\?[^"]*generos\[\]=\d+"[^>]*>([^<]{1,40})</g;
  while ((m = reGen.exec(html)) !== null) {
    const nombre = _decode(m[1]);
    if (nombre && !genres.includes(nombre)) genres.push(nombre);
  }

  // El estado sale del texto de la ficha. Se busca por palabra suelta para no
  // depender de mayúsculas ni del marcado que lo rodea.
  const plano = _stripTags(html);
  const status = /\bcompleta\b/i.test(plano)
    ? 'completed'
    : /\bhiatus\b/i.test(plano)
    ? 'hiatus'
    : /\ben curso\b/i.test(plano)
    ? 'ongoing'
    : undefined;

  // Tipo de ESTA obra, para que PrismHub elija el lector correcto. La ficha lo
  // muestra como etiqueta junto al titulo. Ante la duda se devuelve 'manga':
  // es la enorme mayoria del catalogo, y equivocarse hacia el lector de
  // paginas se nota al instante, mientras que abrir un comic como texto
  // mostraria una pantalla vacia sin ninguna pista de por que.
  const esNovela = /(^|>)\s*Novela\s*(<|$)/i.test(html) ||
      /-novela\/?$/i.test(slug) ||
      /\bnovela\b/i.test(title);
  const type = esNovela ? 'fikushon' : 'manga';

  return { title, cover, description, episodes, genres, status, type };
}

// ─── Lectura ─────────────────────────────────────────────────────────────────

/// Capitulo de novela: parrafos de texto.
///
/// PrismHub tiene dos lectores y elige por el tipo que devolvio detail(). Este
/// es el que espera el de texto: una lista de bloques y un titulo.
interface IkigaiTextoWatch {
  content: string[];
  title: string;
}

// Saca los parrafos del cuerpo del capitulo.
//
// Se recorta a <main> antes de mirar nada: la cabecera y el pie traen menus,
// avisos y tarjetas de "Tendencias", y sin recortar se colaban como si fueran
// parte del capitulo.
function _parrafosDe(html: string): string[] {
  const ini = html.indexOf('<main');
  const fin = html.lastIndexOf('</main>');
  const cuerpo = ini !== -1 && fin > ini ? html.slice(ini, fin) : html;

  // Fuera los <script>/<style>: su contenido no son etiquetas, asi que al
  // quitar solo las etiquetas quedaria el codigo suelto mezclado con el texto.
  const limpio = cuerpo
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  const parrafos: string[] = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(limpio)) !== null) {
    // <br> como corte de linea, no pegado a la palabra siguiente.
    const texto = _stripTags(m[1].replace(/<br\s*\/?>/gi, '\n'));
    if (texto.length > 0) parrafos.push(texto);
  }
  return parrafos;
}

export async function watch(
  chapterId: string,
): Promise<PrismMangaWatch | IkigaiTextoWatch> {
  // forceSetNsfw: sin esto, un capítulo marcado +18 devuelve una pantalla de
  // aviso en vez de las páginas, aunque el usuario ya lo haya permitido en la
  // app. userHasLogin=false evita el cartel de "iniciá sesión para guardar tu
  // progreso", que mete imágenes que no son del capítulo.
  const url =
    `${LECTOR}/capitulo/${encodeURIComponent(chapterId)}/` +
    `?forceSetTheme=dark&forceSetNsfw=true&userHasLogin=false`;
  const html = await _html(url);

  // Las páginas viven en image3 con una ruta limpia: /series/<id>/<cap>/01.webp.
  // Las portadas del resto de la interfaz salen de image2 y SIEMPRE llevan un
  // "rs:fill" — ese es el rasgo que las separa, no el número de host, para que
  // un cambio de CDN no rompa la extensión.
  const urls: string[] = [];
  const vistos = new Set<string>();
  const re = /https:\/\/image\d?\.ikigaimangas\.cloud\/[^"'\s\\]+?\.(?:webp|jpg|jpeg|png)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const u = _decode(m[0]);
    if (/rs:fill/.test(u)) continue;
    if (!/\/series\/\d+\/\d+\//.test(u)) continue;
    if (vistos.has(u)) continue;
    vistos.add(u);
    urls.push(u);
  }

  // El orden importa: las páginas están numeradas en el nombre del archivo.
  // Las páginas están numeradas en el nombre del archivo (01.webp, 02.webp…).
  // Alguna carpeta trae sobrantes sin numerar —vi un "pa_-_copia.webp"— y con
  // el orden anterior se colaban ADELANTE, porque un nombre sin número valía 0
  // y quedaba antes que la página 1. Ahora se van al final: si es un sobrante
  // no molesta, y si resulta ser una página de verdad no se pierde.
  // Se toma el ULTIMO grupo de digitos antes de la extension, no el nombre
  // entero: hay capitulos cuyas paginas se llaman "0_01.webp", "1_02.webp".
  // Exigiendo que el nombre fuera solo numeros, ninguna daba resultado y el
  // orden quedaba librado a como viniera el HTML — funcionaba de casualidad.
  const numeroDe = (u: string): number | null => {
    const nombre = u.slice(u.lastIndexOf('/') + 1);
    const m2 = /(\d+)\.[a-z]+$/.exec(nombre);
    return m2 ? Number(m2[1]) : null;
  };
  urls.sort((a, b) => {
    const na = numeroDe(a);
    const nb = numeroDe(b);
    if (na == null && nb == null) return 0;
    if (na == null) return 1;
    if (nb == null) return -1;
    return na - nb;
  });

  // Sin paginas es una novela: el mismo capitulo, pero en texto.
  //
  // Se decide por lo que TRAE el capitulo y no por el tipo de la obra, porque
  // watch() solo recibe el id del capitulo — no sabe de que obra viene. Ademas
  // asi funciona igual si alguna obra estuviera mal clasificada en el sitio.
  if (urls.length === 0) {
    const parrafos = _parrafosDe(html);
    if (parrafos.length > 0) {
      const tit = /<title[^>]*>([\s\S]*?)<\/title>/.exec(html);
      const titulo = tit
        ? _decode(tit[1]).replace(/\s*\|\s*Ikigai Mangas\s*$/i, '')
        : 'Capítulo';
      return { content: parrafos, title: titulo };
    }
  }

  // Referer del lector: el CDN puede rechazar pedidos sin él.
  return { urls, headers: { Referer: LECTOR + '/' } };
}

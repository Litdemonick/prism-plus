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

/**
 * «Nuevos Capitulos» de la portada, pestana General.
 *
 * ── Por que no alcanzaba con ordenar el catalogo ─────────────────────────────
 *
 * `latest()` pedia /series/?ordenar=last_chapter_date, o sea el CATALOGO
 * ordenado por fecha del ultimo capitulo. Se parece pero no es lo mismo: el
 * sitio tiene su propia seccion «Nuevos Capitulos» en la portada, con su lista
 * curada, sus obras fijadas arriba y el numero de capitulo de cada una. Lo que
 * mostraba el Home no coincidia con lo que se ve al entrar a la pagina.
 *
 * ── Como se encuentra la seccion ────────────────────────────────────────────
 *
 * El rotulo lleva `id="new-chapters-heading"`, que es un ancla del propio sitio
 * —la usan sus pestanas— asi que es un punto fijo y no una clase de estilo que
 * cambie con un rediseño. Despues del rotulo vienen las pestanas y enseguida la
 * primera `<ul class="grid`, que es el panel de General.
 *
 * OJO con el `<ul>`: hay otro identico mas arriba, en la seccion de tendencias,
 * y los dos paneles comparten el MISMO id (`trends-tab-all-content`) porque el
 * sitio lo repite. Por eso se busca desde el rotulo hacia adelante y no por id:
 * buscando por id se enganchaba la seccion de tendencias, que trae lo mas visto.
 *
 * Medido en vivo: ocho items, los mismos ocho que muestra la pagina.
 */
function _nuevosCapitulos(html: string): PrismItem[] {
  const cab = html.indexOf('new-chapters-heading');
  if (cab < 0) return [];
  const desde = html.indexOf('<ul class="grid', cab);
  if (desde < 0) return [];
  const hasta = html.indexOf('</ul>', desde);
  const frag = hasta > desde ? html.slice(desde, hasta) : html.slice(desde);

  const items: PrismItem[] = [];
  // El titulo se toma del `alt` de la portada y no del `<h2>`: el `<h2>` trae
  // comentarios del framework en medio del texto (`<!--t=9y-->`), y limpiarlos
  // es mas fragil que leer un atributo.
  const re =
    /href="(\/series\/[^"]+\/)"[\s\S]{0,400}?<img src="([^"]+)"\s+alt="([^"]*)"/g;
  for (const m of frag.matchAll(re)) {
    // El numero de capitulo esta despues de la imagen, en un `Cap. <!--…-->45`.
    const resto = frag.slice(frag.indexOf(m[0]) + m[0].length);
    const cap = /Cap\.\s*(?:<!--[^>]*-->)?\s*([\d.]+)/.exec(resto.slice(0, 900));
    items.push({
      title: _decode(m[3]),
      url: `${BASE}${m[1]}`,
      cover: m[2],
      update: cap ? `Cap. ${cap[1]}` : undefined,
    });
  }
  return items;
}

export async function latest(page: number): Promise<PrismItem[]> {
  // Pagina 1: la seccion de la portada, que es lo que la gente mira al entrar.
  // De la 2 en adelante sigue por el catalogo ordenado por fecha: la portada no
  // se pagina, y cortarse en seco seria peor que continuar con algo parecido.
  if (page <= 1) {
    try {
      const nuevos = _nuevosCapitulos(await _html(BASE));
      if (nuevos.length) return nuevos;
    } catch {
      // La portada no contesto: se sigue por el catalogo, como hacia antes.
    }
  }
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
// Cuantos resultados por el principio del titulo alcanzan para no pagar el
// recorrido largo. Ver donde se usa.
const RESULTADOS_SUFICIENTES = 5;
// A partir de cuantos caracteres se considera que la busqueda es especifica.
// Ver donde se usa.
const LARGO_ESPECIFICO = 8;

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

// ─── Buscar por el principio del titulo, en TODO el catalogo ────────────────
//
// El recorrido de mas abajo mira las primeras 600 obras de ~5740: el 11 % del
// catalogo. Alcanzaba para lo popular y fallaba con todo lo demas — buscar
// "Señoritas sabrosas x4", que EXISTE, no devolvia nada. Peor todavia: como el
// tramo recorrido depende del orden, y el orden depende de los filtros, la
// misma busqueda encontraba la obra desde el buscador general y no desde el de
// la extension. Encontrar o no encontrar salia a suerte.
//
// El sitio no tiene busqueda en el servidor (se baja el catalogo entero y
// filtra en el navegador), pero SI permite pedirlo ordenado por nombre. Y ese
// orden es exacto por codigo de caracter: mayusculas, despues minusculas,
// despues los signos de apertura. Eso permite ir directo al tramo del abecedario
// donde caeria lo buscado, en vez de recorrer el catalogo de punta a punta:
// trece pedidos en lugar de doscientos ochenta y siete.
//
// Cubre lo que la gente escribe de verdad —el titulo desde el principio— y el
// recorrido de siempre queda para los casos en que se busca por una palabra
// del medio.

// Tope de paginas para la binaria. 400 x 20 = 8000 obras, con el catalogo en
// ~5740: sobra para que crezca sin tocar esto. Una pagina vacia se trata como
// "mas alla del final", asi que pasarse no rompe nada.
const TOPE_PAGINAS = 400;
// Paginas que se leen alrededor del punto encontrado. La binaria deja el corte
// entre dos paginas y lo buscado puede quedar de cualquier lado; ademas el
// orden del sitio es sobre el titulo CRUDO y aca se compara ya decodificado
// («Querida Julie» con comillas tipograficas no cae donde uno diria). La
// ventana absorbe esas diferencias.
const VENTANA = 3;
// Pedir el catalogo por nombre devuelve DOS primeras paginas que no siguen el
// abecedario: la 1 va de "!Quiero comerme tus guisantes!" a "La Nueva Bebé" y
// la 2 de "La Princesa Demonio" a «Yo... no quiero trabajar más», y recien la 3
// empieza el orden de verdad ("#Short", "A Mi Amable...") y ya no se corta.
//
// Esas cuarenta obras no vuelven a aparecer mas adelante: son las unicas que no
// se pueden encontrar por abecedario. Ahi vive "john wick en el murim", que la
// primera version de esto no encontraba. Se leen siempre, son dos pedidos.
const PRIMERA_ORDENADA = 3;
const PAGINAS_SUELTAS = [1, 2];

function _pagCache(): Map<string, Promise<PrismItem[]>> {
  return new Map();
}

// Primera pagina cuyo primer titulo ya es >= al prefijo buscado.
async function _paginaDelPrefijo(
  prefijo: string,
  filter: Record<string, string[]> | undefined,
  pagina: (n: number) => Promise<PrismItem[]>,
): Promise<number> {
  // Arranca en la 3 a proposito: ver PAGINAS_SUELTAS.
  let lo = PRIMERA_ORDENADA;
  let hi = TOPE_PAGINAS;
  while (lo < hi) {
    const medio = (lo + hi) >> 1;
    const items = await pagina(medio);
    // Vacia = pasamos el final del catalogo, hay que volver hacia atras.
    if (items.length === 0 || items[0].title >= prefijo) hi = medio;
    else lo = medio + 1;
  }
  return lo;
}

async function _porPrincipioDelTitulo(
  keyword: string,
  filter: Record<string, string[]> | undefined,
  cache: Map<string, Promise<PrismItem[]>>,
): Promise<PrismItem[]> {
  const pagina = (n: number): Promise<PrismItem[]> => {
    const clave = String(n);
    let p = cache.get(clave);
    if (!p) {
      p = (async () => {
        try {
          return _itemsDe(
            await _html(_consulta(n, filter, { ordenar: 'name', direccion: 'asc' })),
          );
        } catch {
          return [];
        }
      })();
      cache.set(clave, p);
    }
    return p;
  };

  // El orden del sitio distingue mayusculas de minusculas y pone TODAS las
  // mayusculas antes que las minusculas. Quien escribe "señoritas" en minuscula
  // caeria en el tramo equivocado y no encontraria "Señoritas sabrosas x4", asi
  // que se prueban las dos variantes de la primera letra.
  const inicial = keyword.slice(0, 1);
  const variantes = [...new Set([
    inicial.toUpperCase() + keyword.slice(1),
    inicial.toLowerCase() + keyword.slice(1),
  ])];

  const buscado = _normalizar(keyword);
  const salida: PrismItem[] = [];
  const vistos = new Set<string>();
  const recoger = (items: PrismItem[]) => {
    for (const it of items) {
      if (vistos.has(it.url)) continue;
      vistos.add(it.url);
      if (_normalizar(it.title).startsWith(buscado)) salida.push(it);
    }
  };

  recoger((await Promise.all(PAGINAS_SUELTAS.map(pagina))).flat());

  for (const prefijo of variantes) {
    const centro = await _paginaDelPrefijo(prefijo, filter, pagina);
    const lote = await Promise.all(
      Array.from({ length: VENTANA * 2 }, (_, k) => centro - VENTANA + k)
        .filter((n) => n >= PRIMERA_ORDENADA && n <= TOPE_PAGINAS)
        .map(pagina),
    );
    for (const items of lote) recoger(items);
    // La segunda variante (la otra caja de la primera letra) son otros trece
    // pedidos. Solo vale la pena si la primera no encontro nada: si alguien
    // escribio bien la mayuscula, ya esta.
    if (salida.length > 0) break;
  }
  return salida;
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

  // Primero por el principio del titulo, que cubre el catalogo entero. Lo que
  // salga de aca va adelante: es lo que mas se parece a lo que se escribio.
  try {
    for (const it of await _porPrincipioDelTitulo(keyword, filter, _pagCache())) {
      if (vistos.has(it.url)) continue;
      vistos.add(it.url);
      encontrados.push(it);
    }
  } catch {
    // Que falle el atajo no puede dejar sin buscar: sigue el recorrido de abajo.
  }
  const porPrefijo = encontrados.length;

  // Con suficientes resultados por el principio del titulo se corta aca.
  //
  // El recorrido de abajo son treinta pedidos mas, y sirve para un solo caso:
  // buscar por una palabra del MEDIO del titulo. Si el atajo ya trajo varios,
  // esa vuelta larga agrega poco y cuesta mucho — la busqueda general del app
  // le da a cada extension quince segundos y despues la corta, asi que pasarse
  // no es "un poco mas lento", es no aparecer.
  //
  // El umbral no es cero: con uno o dos resultados puede faltar lo que el
  // usuario buscaba, y ahi si conviene pagar el recorrido.
  //
  // Y tampoco alcanza con contar. El caso mas comun es escribir un titulo
  // entero —"Señoritas sabrosas x4"— y que aparezcan las dos versiones que
  // existen: dos resultados, o sea por debajo del umbral, y sin embargo ya
  // esta encontrado lo que se buscaba. Gastar treinta pedidos mas ahi es
  // regalar cuatro segundos para no sumar nada. Con ocho caracteres o mas la
  // busqueda ya es especifica, y todo lo que sale del atajo empieza como se
  // escribio, asi que un acierto es un acierto de verdad.
  const especifica = buscado.length >= LARGO_ESPECIFICO;
  if (porPrefijo >= RESULTADOS_SUFICIENTES || (porPrefijo > 0 && especifica)) {
    encontrados.sort((a, b) => a.title.localeCompare(b.title, 'es'));
    const porPagina0 = 24;
    return encontrados.slice((page - 1) * porPagina0, (page - 1) * porPagina0 + porPagina0);
  }

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

  // Alfabetico, pero SIN mezclar los dos grupos: lo que empieza como se escribio
  // va primero. Si alguien busca "Señoritas sabrosas x4", esa obra tiene que
  // quedar arriba y no perdida entre las que apenas comparten una palabra.
  //
  // Dentro de cada grupo, alfabetico: con varias paginas llegando a destiempo,
  // el orden en que terminan las peticiones no deberia decidir como se ven los
  // resultados.
  const abc = (a: PrismItem, b: PrismItem) => a.title.localeCompare(b.title, 'es');
  const cabeza = encontrados.slice(0, porPrefijo).sort(abc);
  const resto = encontrados.slice(porPrefijo).sort(abc);
  encontrados.length = 0;
  encontrados.push(...cabeza, ...resto);

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

// Recorta el HTML al contenedor donde el sitio pone el texto del capitulo.
//
// Recortar a <main> no alcanzaba ni de lejos. Dentro de <main> tambien estan el
// panel de ajustes del lector y un <article class="sr-only"> con texto para
// lectores de pantalla, y entre los dos suman TREINTA parrafos que se colaban
// antes del capitulo: "Lee el ultimo comic ... en Ikigai Mangas", "Un webtoon
// es un tipo de comic digital...", "Modo noche", "Barra flotante", "Vista
// previa". El capitulo de verdad recien empezaba en el parrafo 31.
//
// El sitio marca el cuerpo con la clase "prose" (el contenedor de tipografia de
// Tailwind). Es el unico elemento de la pagina que contiene el texto de la obra
// y nada mas, asi que se busca ese y se descarta todo lo de afuera.
function _cuerpoDelCapitulo(html: string): string | null {
  const abre = /<div[^>]*\bclass="[^"]*\bprose\b[^"]*"[^>]*>/i.exec(html);
  if (!abre) return null;

  // Hay que contar los <div> anidados: cortar en el primer </div> dejaria el
  // capitulo a la mitad en cuanto el texto traiga cualquier bloque adentro.
  let nivel = 1;
  let i = abre.index + abre[0].length;
  const desde = i;
  const re = /<\/?div\b/gi;
  re.lastIndex = i;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    nivel += m[0][1] === '/' ? -1 : 1;
    if (nivel === 0) return html.slice(desde, m.index);
    i = re.lastIndex;
  }
  // Sin cierre a la vista: mejor lo que hay que nada.
  return html.slice(desde);
}

// Saca los parrafos del cuerpo del capitulo. Devuelve vacio si la pagina no
// trae el contenedor del texto — o sea, si no es un capitulo de novela.
function _parrafosDe(html: string): string[] {
  const cuerpo = _cuerpoDelCapitulo(html);
  if (cuerpo === null) return [];

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

  if (urls.length > 0) {
    // Referer del lector: el CDN puede rechazar pedidos sin él.
    return { urls, headers: { Referer: LECTOR + '/' } };
  }

  // Sin paginas puede ser una novela: el mismo capitulo, pero en texto.
  //
  // Se decide por lo que TRAE el capitulo y no por el tipo de la obra, porque
  // watch() solo recibe el id del capitulo — no sabe de que obra viene. Ademas
  // asi funciona igual si alguna obra estuviera mal clasificada en el sitio.
  //
  // Lo que NO puede pasar es caer aca por descarte. Antes bastaba con no
  // encontrar imagenes para devolver texto, y como el texto se sacaba de todo
  // <main> siempre habia algo que devolver: un comic cuyo capitulo no trajera
  // paginas devolvia treinta parrafos de la interfaz del sitio, con la forma
  // del lector de TEXTO. El lector de paginas recibia entonces una lista de
  // urls nula y la app se caia con "type 'Null' is not a subtype of type
  // 'List<dynamic>'" (visto en "La Creadora de Escandalos Ha Regresado").
  // Ahora el texto sale solo del contenedor del capitulo, que un comic no
  // tiene, asi que ese caso llega al error de abajo en vez de mentir.
  const parrafos = _parrafosDe(html);
  if (parrafos.length > 0) {
    const tit = /<title[^>]*>([\s\S]*?)<\/title>/.exec(html);
    const titulo = tit
      ? _decode(tit[1]).replace(/\s*\|\s*Ikigai Mangas\s*$/i, '')
      : 'Capítulo';
    return { content: parrafos, title: titulo };
  }

  // Ni paginas ni texto. Pasa cuando el sitio publica el capitulo en la lista
  // pero todavia no subio el contenido. Se avisa con un motivo entendible en
  // vez de abrir un lector vacio o devolver una forma que no corresponde.
  throw new Error(
    'Este capítulo no tiene contenido publicado todavía. ' +
      'Probá con otro capítulo o volvé más tarde.',
  );
}

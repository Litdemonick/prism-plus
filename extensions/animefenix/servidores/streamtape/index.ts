// ─── StreamTape ⚡ nativo ─────────────────────────────────────────────────────
//
// Medido el 2026-08-04 sobre 60 episodios: **60 botones**, está en todos.
// Sobre 5 episodios sueltos resolvió 4, y las 4 reprodujeron (206 video/mp4).
// El que falló era el embed en sí, no el resolver.
//
//   embed   https://streamtape.com/e/LVkoae9DDxTRzV2/onepiece…
//   sale    https://streamtape.com/get_video?id=…&token=…&stream=1
//   tarda   ~540 ms
//   se abre 206 video/mp4
//
// ── Los señuelos, que es todo el asunto de este servidor ────────────────────
//
// El embed trae divs ocultos (`ideoolink`, `botlink`, `robotlink`) con una
// dirección `get_video` de aspecto perfecto… y un token FALSO. Pedirla devuelve
// `{"status":500,"msg":"Sorry, error on our side!"}` — que es exactamente el
// "servidor no disponible" que se veía. Un navegador nunca ve ese token porque
// más abajo el JS pisa el innerHTML de los divs:
//
//   getElementById('botlink').innerHTML =
//     '//streamtape.' + ('xyzacom/get_video?id=..&token=..').substring(4);
//
// Y ahí está la segunda trampa. Esas líneas son cuatro, todas con el token
// bueno, pero dos arman una dirección ROTA: le meten un carácter de más en
// alguna parte. Medido sobre cinco cargas seguidas del MISMO embed, el corte y
// el carácter sobrante se mueven en cada una:
//
//   /streamtape.com/get_video?bid=…     ← sobra una "b" en el id
//   //streamtape.com/get_videobid=…     ← se comió el "?"
//   /strebamtape.com/get_video?id=…     ← sobra una "b" en el dominio
//
// O sea que no alcanza con buscar "la que tenga get_video?": hay que hacer la
// cuenta de cada una y comprobar la forma ENTERA. Como el sobrante cae en un
// lugar distinto cada vez, la única comprobación que aguanta es exigir la forma
// exacta `//<mismo host del embed>/get_video?…` y que el id coincida con el que
// ya viene en la dirección del embed — ese es el dato que los señuelos no pueden
// falsificar, porque el carácter que les sobra los corre.
//
// La cuenta se hace a mano en vez de ejecutar el JS: son un puñado de
// `substring` sobre literales, no hace falta un intérprete, y así no se corre
// código del servidor adentro de la extensión.
//
// El token va atado a la IP que cargó el embed, así que se reproduce desde la
// misma máquina. Devuelve un mp4 directo, no hace falta navegador.

import { pedir, type ServidorResuelto } from '../comun';

/** `//host/…` o `/host/…` → `https://host/…`, y se asegura `&stream=1`. */
function normalizar(path: string): string {
  let out = path.trim();
  if (out.indexOf('//') === 0) out = `https:${out}`;
  else if (out.indexOf('/') === 0) out = `https:/${out}`;
  if (!/[?&]stream=/.test(out)) out += '&stream=1';
  return out;
}

/**
 * Resuelve las concatenaciones `"prefijo" + ('resto').substring(n)…` del embed
 * y devuelve la primera que arme una dirección bien formada.
 */
function desdeElJs(html: string, embedUrl: string): string | null {
  // El prefijo se ancla en que EMPIEZA CON BARRA, no en su contenido: el corte
  // se mueve en cada carga y llegó a quedar en '//str', que no tiene ni el
  // nombre del host ni el del endpoint. Lo que sobre de más lo filtra después
  // la comprobación de la forma.
  const armados =
    /(["'])(\/{1,2}[^"']*)\1\s*\+\s*(?:(["'])\3\s*\+\s*)?\(\s*(["'])([^"']+)\4\s*\)((?:\s*\.\s*substring\(\s*\d+\s*(?:,\s*\d+\s*)?\))+)/g;
  const recortes = /\.\s*substring\(\s*(\d+)\s*(?:,\s*(\d+)\s*)?\)/g;

  const host = (/^https?:\/\/([^/]+)/.exec(embedUrl) || ['', ''])[1].replace(/^www\./, '');
  // Sin host no hay con qué comparar, y sin comparación entra cualquier señuelo.
  if (!host) return null;

  // El id del archivo ya lo sabemos: viene en la dirección del embed (/e/<id>/…).
  const idEmbed = (/\/[ev]\/([A-Za-z0-9_-]+)/.exec(embedUrl) || ['', ''])[1];

  const candidatos: string[] = [];
  let m: RegExpExecArray | null;
  armados.lastIndex = 0;
  while ((m = armados.exec(html)) !== null) {
    let resto = m[5];
    recortes.lastIndex = 0;
    let r: RegExpExecArray | null;
    while ((r = recortes.exec(m[6])) !== null) {
      resto =
        r[2] === undefined
          ? resto.substring(parseInt(r[1], 10))
          : resto.substring(parseInt(r[1], 10), parseInt(r[2], 10));
    }
    candidatos.push(m[2] + resto);
  }
  if (!candidatos.length) return null;

  // Estructura mínima: `//<host del embed>/get_video?…&token=…`.
  const bienFormados = candidatos.filter((c) => {
    const forma = /^\/\/([^/]+)\/get_video\?/.exec(c);
    return !!forma && forma[1].replace(/^www\./, '') === host && c.indexOf('token=') !== -1;
  });

  // El id exacto. Esto atrapa al señuelo que corrompe la query (`?ib=` en vez
  // de `?id=`, medido en vivo), donde la estructura sigue pareciendo correcta.
  if (idEmbed) {
    const conElId = bienFormados.filter((c) => c.indexOf(`id=${idEmbed}&`) !== -1);
    if (conElId.length) return normalizar(conElId[0]);
  }

  // Red de seguridad por si el id no se pudo sacar del embed: el enlace bueno lo
  // arman DOS líneas distintas y sale idéntico las dos veces, mientras que cada
  // señuelo es único. El que se repite, gana.
  for (const c of bienFormados) {
    if (bienFormados.filter((o) => o === c).length > 1) {
      console.log('[af] streamtape: elegido por repetición, sin id en el embed');
      return normalizar(c);
    }
  }

  console.log(
    `[af] streamtape: ${candidatos.length} candidato(s) en el JS, ninguno confiable ` +
      `(id esperado: ${idEmbed || 'desconocido'})`,
  );
  return null;
}

export async function resolver(url: string, referer: string): Promise<ServidorResuelto | null> {
  const html = await pedir(url, referer);
  if (!html) return null;

  const headers = { Referer: 'https://streamtape.com/' };

  // Lo que ejecutaría el navegador. Es el único camino que da un token bueno.
  const delJs = desdeElJs(html, url);
  if (delJs) return { url: delJs, headers };

  // Respaldo: el div tal cual. Hoy trae el señuelo, pero si algún día vuelven a
  // servirlo sin JS —o aparece un clon que no copió la ofuscación— esto lo
  // levanta igual. Va DESPUÉS del JS justamente por eso.
  const div =
    /id=["'](?:ideoolink|botlink|robotlink)["'][^>]*>\s*(\/\/?[^<]*get_video\?[^<]*)</.exec(html);
  if (div) {
    console.log('[af] streamtape: sin JS utilizable, se usa el div (puede ser señuelo)');
    return { url: normalizar(div[1].trim()), headers };
  }

  // Respaldos de formatos antiguos.
  let m = /(https?:\/\/streamtape\.[a-z]+\/get_video\?[^"'\s<>]+)/.exec(html);
  if (m) return { url: normalizar(m[1]), headers };
  m = /(\/\/streamtape\.[a-z]+\/get_video\?[^"'\s<>]+)/.exec(html);
  if (m) return { url: normalizar(m[1]), headers };

  console.log('[af] streamtape: no se encontró ninguna URL get_video en el embed');
  return null;
}

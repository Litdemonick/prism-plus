// ─── Prism+ Vigilante diario ─────────────────────────────────────────────────
// Una vez por día, lee el resultado de `live-test --profundo` (que además abre
// un episodio y baja el primer pedazo del vídeo) y lleva la cuenta de cuántos
// días SEGUIDOS lleva fallando cada extensión.
//
// A los DOS días seguidos abre un aviso (Issue) para revisarla a mano. Uno
// solo por extensión, nunca uno por día: si ya hay uno abierto, solo se le
// agrega un comentario cuando el motivo CAMBIA. Cuando vuelve a andar, se
// cierra solo.
//
// No marca nada inestable ni toca index.json: eso lo hace `health-check`, con
// sus propias reglas. Esto es solo para enterarse de lo que la app todavía
// muestra pero ya no reproduce.
//
// ── Para que no se acumule nada ──────────────────────────────────────────────
//  · La cuenta vive en `.vigilante-state.json`, que NO está en el repo: el
//    workflow la guarda en la caché de Actions (se reemplaza en cada corrida).
//  · El informe de cada día va como adjunto de la corrida, con borrado
//    automático a los 7 días. Nunca entra al repo.
//  · Issues: como mucho uno abierto por extensión.
//
// Uso:
//   node scripts/vigilante-diario.mjs <informe.json>            decide y muestra
//   node scripts/vigilante-diario.mjs <informe.json> --aplicar  además abre/cierra
//       los avisos (necesita GITHUB_TOKEN y GITHUB_REPOSITORY, como en Actions)
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const STATE_FILE = join(ROOT, '.vigilante-state.json');
const RESUMEN_FILE = join(ROOT, 'vigilante-resumen.md');
const ETIQUETA = 'vigilante';
const DIAS_PARA_AVISAR = 2;

const informePath = process.argv[2];
const APLICAR = process.argv.includes('--aplicar');
if (!informePath || !existsSync(informePath)) {
  console.error('❌  Falta el informe de live-test (--json=...)');
  process.exit(1);
}
// ── Discreción: lo marcado +18 no se publica ─────────────────────────────────
// Los avisos son públicos. Las extensiones marcadas `nsfw` en el índice (las
// mixtas también) no se nombran ni en los avisos ni en el resumen.
const indice = JSON.parse(readFileSync(join(ROOT, 'index.json'), 'utf8'));
const listaIndice = Array.isArray(indice) ? indice : indice.extensions || Object.values(indice);
const reservadas = new Set(listaIndice.filter((e) => e?.nsfw).map((e) => e.package));
const informe = JSON.parse(readFileSync(informePath, 'utf8')).filter((r) => !reservadas.has(r.package));

// «Protegida» o «no verificable» no es que esté rota: el sitio no deja entrar
// al robot (dirección de un centro de datos) y desde un aparato normal anda.
// Ese día no cuenta, ni para un lado ni para el otro.
const NO_SE_PUEDE_COMPROBAR = new Set(['protected', 'unverifiable']);
const estado = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {};

// ── El freno de siempre: si falla más de la mitad, es el entorno ─────────────
// Mismo criterio que health-check: ocho sitios distintos no se rompen a la vez;
// se cayó la red del robot. Ese día no cuenta, ni para un lado ni para el otro.
const conProblema = (r) => {
  if (!r.ok) return r.reason || 'no pasó las comprobaciones';
  const video = (r.checks || []).find(
    (c) => !c.ok && (c.name === 'watch — el vídeo arranca' || c.name === 'watch — el episodio abre'),
  );
  return video ? `${video.name}: ${video.detail}` : null;
};
const fallan = informe.filter((r) => conProblema(r) && !NO_SE_PUEDE_COMPROBAR.has(r.reason));
const diaDelEntorno = informe.length >= 4 && fallan.length > informe.length / 2;

const nuevoEstado = {};
const abrir = [];
const comentar = [];
const cerrar = [];
const lineas = [];

for (const r of informe) {
  const previo = estado[r.package] || { dias: 0, motivo: null, avisado: false };
  if (diaDelEntorno) {
    nuevoEstado[r.package] = previo;
    continue;
  }
  if (!r.ok && NO_SE_PUEDE_COMPROBAR.has(r.reason)) {
    nuevoEstado[r.package] = previo;
    lineas.push(`| ⏸️ | ${r.name} | no se pudo comprobar desde el robot |`);
    continue;
  }
  const motivo = conProblema(r);
  if (!motivo) {
    if (previo.avisado) cerrar.push({ package: r.package, name: r.name });
    nuevoEstado[r.package] = { dias: 0, motivo: null, avisado: false };
    lineas.push(`| ✅ | ${r.name} | anda |`);
    continue;
  }
  const dias = previo.dias + 1;
  const sigue = { dias, motivo, avisado: previo.avisado };
  if (dias >= DIAS_PARA_AVISAR && !previo.avisado) {
    abrir.push({ package: r.package, name: r.name, motivo, dias });
    sigue.avisado = true;
  } else if (previo.avisado && previo.motivo !== motivo) {
    comentar.push({ package: r.package, name: r.name, motivo, dias });
  }
  nuevoEstado[r.package] = sigue;
  lineas.push(`| ${dias >= DIAS_PARA_AVISAR ? '⛔' : '⚠️'} | ${r.name} | ${dias} día(s): ${motivo.replace(/\|/g, '/')} |`);
}

writeFileSync(STATE_FILE, JSON.stringify(nuevoEstado, null, 2) + '\n');
const resumen = [
  `## Vigilante diario — ${new Date().toISOString().slice(0, 10)}`,
  '',
  diaDelEntorno
    ? `🛑 Fallaron ${fallan.length} de ${informe.length}: es el entorno del robot, hoy no cuenta.`
    : `${informe.length - fallan.length}/${informe.length} andan de punta a punta (hasta el primer pedazo del vídeo).`,
  '',
  '| | extensión | estado |',
  '|---|---|---|',
  ...lineas,
  '',
].join('\n');
writeFileSync(RESUMEN_FILE, resumen);
console.log(resumen);
console.log(`Avisos a abrir: ${abrir.length} · a comentar: ${comentar.length} · a cerrar: ${cerrar.length}`);

if (!APLICAR) process.exit(0);

// ── Abrir, comentar y cerrar avisos en GitHub ────────────────────────────────
const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;
if (!TOKEN || !REPO) {
  console.error('❌  --aplicar necesita GITHUB_TOKEN y GITHUB_REPOSITORY');
  process.exit(1);
}
async function api(ruta, opciones = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${ruta}`, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`${opciones.method || 'GET'} ${ruta} → HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}
// La etiqueta, por si todavía no existe (si ya está, GitHub contesta 422).
try {
  await api('/labels', {
    method: 'POST',
    body: JSON.stringify({ name: ETIQUETA, color: 'd93f0b', description: 'Lo abrió el vigilante diario' }),
  });
} catch (_) {}
const marca = (pkg) => `<!-- vigilante:${pkg} -->`;
const abiertos = await api(`/issues?state=open&labels=${ETIQUETA}&per_page=100`);
const abiertoDe = (pkg) => abiertos.find((i) => (i.body || '').includes(marca(pkg)));

for (const a of abrir) {
  const ya = abiertoDe(a.package);
  const texto = `Lleva **${a.dias} días seguidos** sin poder reproducir.\n\n> ${a.motivo}\n\nLo detectó el vigilante diario: abre el primer episodio y baja el primer pedazo del vídeo, como la app.`;
  if (ya) {
    await api(`/issues/${ya.number}/comments`, { method: 'POST', body: JSON.stringify({ body: texto }) });
  } else {
    await api('/issues', {
      method: 'POST',
      body: JSON.stringify({ title: `${a.name}: no reproduce`, labels: [ETIQUETA], body: `${marca(a.package)}\n${texto}` }),
    });
  }
  console.log(`⛔  aviso abierto: ${a.name}`);
}
for (const c of comentar) {
  const ya = abiertoDe(c.package);
  if (!ya) continue;
  await api(`/issues/${ya.number}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body: `Cambió el motivo (día ${c.dias}):\n\n> ${c.motivo}` }),
  });
}
for (const c of cerrar) {
  const ya = abiertoDe(c.package);
  if (!ya) continue;
  await api(`/issues/${ya.number}/comments`, { method: 'POST', body: JSON.stringify({ body: 'Volvió a andar: se cierra solo.' }) });
  await api(`/issues/${ya.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed' }) });
  console.log(`✅  aviso cerrado: ${c.name}`);
}

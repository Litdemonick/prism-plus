// ─── Prism+ Studio — frontend ──────────────────────────────────────────────────

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const api = {
  async get(path) { return (await fetch('/api/' + path)).json(); },
  async post(path, body) {
    return (await fetch('/api/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    })).json();
  },
  async del(path) { return (await fetch('/api/' + path, { method: 'DELETE' })).json(); },
};

function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = '.3s'; }, 3200);
  setTimeout(() => t.remove(), 3600);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ── Navegación ──
$$('#nav button').forEach((b) => b.addEventListener('click', () => {
  $$('#nav button').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  const v = b.dataset.view;
  $$('.view').forEach((s) => (s.hidden = s.dataset.view !== v));
  if (v === 'keys') loadKeys();
}));

// ── Estado de llave (sidebar) ──
async function loadKeyStatus() {
  const k = await api.get('keystatus');
  const dot = k.hasPrivate ? 'var(--ok)' : 'var(--warn)';
  const txt = k.hasPrivate ? 'Llave de firma lista' : 'Sin llave — generala';
  $('#keyStatus').innerHTML =
    `<div class="row"><span class="dot" style="background:${dot}"></span><span>${txt}</span></div>` +
    (k.publicHex ? `<div class="hex">pub: ${k.publicHex.slice(0, 24)}…</div>` : '');
  return k;
}

async function loadKeys() {
  const k = await loadKeyStatus();
  $('#keyDetail').innerHTML = k.hasPrivate
    ? `<div class="badge ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Llave privada presente</div>
       <p class="hint" style="margin-top:12px">Llave pública embebida en PrismHub:</p>
       <div class="console" style="max-height:none">${esc(k.publicHex)}</div>`
    : `<div class="badge warn">⚠️ No hay llave todavía</div>
       <p class="hint" style="margin-top:10px">Generá el par una vez. La privada queda en <code>.keys/</code> (gitignored) y la pública se commitea.</p>`;
  $('#btnKeygen').style.display = k.hasPrivate ? 'none' : '';
}

// ── Listado de extensiones ──
const TYPE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="M2 12.5 11.17 16.7a2 2 0 0 0 1.66 0L22 12.5"/></svg>`;

function badge(cls, label) { return `<span class="badge ${cls}">${label}</span>`; }

async function loadExtensions() {
  const grid = $('#grid');
  grid.innerHTML = `<div class="empty"><div class="spinner"></div><p style="margin-top:10px">Cargando…</p></div>`;
  const { extensions } = await api.get('extensions');
  if (!extensions.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      ${TYPE_ICON}<p>No hay extensiones. Creá una con "Nueva extensión".</p></div>`;
    return;
  }
  grid.innerHTML = extensions.map((e) => {
    const sign = e.signed ? badge('ok', '🔏 Firmada')
      : e.built ? badge('warn', '○ Sin firmar') : badge('err', '○ Sin compilar');
    const cat = e.inCatalog ? badge('ok', '✓ Catálogo') : badge('warn', '⏳ Local');
    return `<div class="card">
      <div class="head">
        <div class="ico">${e.icon ? `<img src="${esc(e.icon)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{innerHTML:'${'★'}'}))"/>` : TYPE_ICON}</div>
        <div>
          <div class="title">${esc(e.title)}</div>
          <div class="pkg">${esc(e.package || e.name)}</div>
        </div>
      </div>
      <div class="badges">
        ${badge('type', esc(e.type || '—'))}
        ${badge('ver', 'v' + esc(e.version || '?'))}
        ${cat} ${sign}
      </div>
      <div class="foot">
        <button class="btn" onclick="testExt('${e.name}','${esc(e.title)}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 3 14 9-14 9V3z"/></svg> Probar</button>
        <button class="btn" onclick="editExt('${e.name}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> Editar</button>
        <button class="btn danger" onclick="delExt('${e.name}','${esc(e.title)}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      </div>
    </div>`;
  }).join('');
}

// ── CRUD ──
const TEMPLATE = `import { get } from '../../sdk/http';
import { matchFirst } from '../../sdk/html';
import type { PrismDetail, PrismItem, PrismWatch } from '../../sdk/types';

const BASE = 'https://mifuente.com';

export async function latest(page: number): Promise<PrismItem[]> {
  const html = await get(\`\${BASE}/?page=\${page}\`);
  // TODO: parsear las cards
  return [];
}

export async function search(keyword: string, page: number): Promise<PrismItem[]> {
  const html = await get(\`\${BASE}/search?q=\${encodeURIComponent(keyword)}\`);
  return [];
}

export async function detail(url: string): Promise<PrismDetail> {
  const html = await get(\`\${BASE}/anime/\${url}\`);
  return { title: '', cover: '', description: '', episodes: [] };
}

export async function watch(url: string): Promise<PrismWatch> {
  const pageUrl = \`\${BASE}/ver/\${url}\`;
  const html = await get(pageUrl);
  // pageUrl = fallback universal (page-sniff por WebView en PrismHub)
  return { streams: [], pageUrl };
}
`;

let editing = null;

function openModal(title) { $('#modalTitle').textContent = title; $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; editing = null; }

$('#btnNew').addEventListener('click', () => {
  editing = null;
  $('#fName').value = ''; $('#fName').disabled = false;
  $('#fPackage').value = 'io.prismhub.';
  $('#fTitle').value = ''; $('#fVersion').value = '1.0.0';
  $('#fType').value = 'anime'; $('#fWeb').value = ''; $('#fIcon').value = '';
  $('#fDesc').value = ''; $('#fSource').value = TEMPLATE;
  openModal('Nueva extensión');
});

window.editExt = async (name) => {
  const { manifest, source } = await api.get('extension?name=' + encodeURIComponent(name));
  editing = name;
  $('#fName').value = name; $('#fName').disabled = true;
  $('#fPackage').value = manifest?.package ?? '';
  $('#fTitle').value = manifest?.name ?? '';
  $('#fVersion').value = manifest?.version ?? '1.0.0';
  $('#fType').value = manifest?.type ?? 'anime';
  $('#fWeb').value = manifest?.webSite ?? '';
  $('#fIcon').value = manifest?.icon ?? '';
  $('#fDesc').value = manifest?.description ?? '';
  $('#fSource').value = source ?? '';
  openModal('Editar — ' + name);
};

window.delExt = async (name, title) => {
  if (!confirm(`¿Borrar la extensión "${title}"? Se elimina la carpeta y se quita del catálogo.`)) return;
  await api.del('extension?name=' + encodeURIComponent(name));
  toast(`"${title}" borrada`, 'ok');
  loadExtensions();
};

$('#modalSave').addEventListener('click', async () => {
  const name = $('#fName').value.trim();
  if (!name) return toast('Falta el slug', 'err');
  const manifest = {
    name: $('#fTitle').value.trim() || name,
    package: $('#fPackage').value.trim(),
    version: $('#fVersion').value.trim() || '1.0.0',
    author: 'PrismHub',
    type: $('#fType').value,
    icon: $('#fIcon').value.trim(),
    description: $('#fDesc').value.trim(),
    lang: 'es',
    webSite: $('#fWeb').value.trim(),
    license: 'MIT',
  };
  const r = await api.post('extension', { name, manifest, source: $('#fSource').value });
  if (r.ok) { toast('Guardada. Compilá en "Publicar" para firmar.', 'ok'); closeModal(); loadExtensions(); }
  else toast(r.error || 'Error al guardar', 'err');
});

$('#modalClose').addEventListener('click', closeModal);
$('#modalCancel').addEventListener('click', closeModal);
$('#btnReload').addEventListener('click', loadExtensions);

// ── Test ──
function stepView(name, step) {
  if (!step) return '';
  const ok = step.ok;
  const pill = ok ? badge('ok', '✓ OK') : badge('err', '✗ Falló');
  let body = '';
  if (step.error) body = `<div class="body" style="color:var(--err)">${esc(step.error)}</div>`;
  else if (name === 'detail') {
    body = `<div class="body">${esc(step.title || '')} · ${step.episodes} episodios</div>`;
  } else if (name === 'watch') {
    body = `<div class="body">type: ${esc(step.type || '')}<br>url: ${esc((step.url || '').slice(0, 80))}</div>
      ${step.servers?.length ? `<div class="chips">${step.servers.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>` : ''}
      ${step.pageUrl ? `<div class="chips"><span class="chip">page-sniff: ${esc(step.pageUrl.slice(0, 50))}</span></div>` : ''}`;
  } else {
    body = `<div class="body">${step.count} resultados</div>`;
    if (step.sample?.length) {
      body += `<div class="thumbs">${step.sample.map((i) =>
        `<div class="thumb">${i.cover ? `<img src="${esc(i.cover)}" onerror="this.style.display='none'"/>` : ''}
          <span>${esc(i.title || i.url || '')}</span></div>`).join('')}</div>`;
    }
  }
  const label = { latest: 'latest()', search: 'search()', detail: 'detail()', watch: 'watch()' }[name];
  return `<div class="test-step"><div class="sh">${label}<span class="pill">${pill}</span></div>${body}</div>`;
}

window.testExt = async (name, title) => {
  $('#testTitle').textContent = 'Probar — ' + title;
  $('#testHint').textContent = 'Ejecutando latest, search, detail y watch contra la fuente real…';
  $('#testResults').innerHTML = `<div class="empty"><div class="spinner"></div><p style="margin-top:10px">Probando ${esc(title)}…</p></div>`;
  $('#testModal').hidden = false;
  const r = await api.post('test', { name });
  if (!r.ok && r.error) {
    $('#testResults').innerHTML = `<div class="test-step"><div class="sh" style="color:var(--err)">${esc(r.error)}</div></div>`;
    $('#testHint').textContent = 'No se pudo correr la prueba.';
    return;
  }
  const s = r.steps || {};
  const allOk = ['latest', 'search', 'detail', 'watch'].every((k) => s[k]?.ok);
  $('#testHint').innerHTML = allOk
    ? '<span style="color:var(--ok)">✓ Todo funciona — lista para publicar.</span>'
    : '<span style="color:var(--warn)">Algunas funciones fallaron — revisá abajo.</span>';
  $('#testResults').innerHTML = ['latest', 'search', 'detail', 'watch'].map((k) => stepView(k, s[k])).join('');
};
$('#testClose').addEventListener('click', () => ($('#testModal').hidden = true));

// ── Build / Publish ──
$('#btnBuild').addEventListener('click', async (ev) => {
  const b = ev.currentTarget; b.disabled = true;
  $('#pubConsole').textContent = 'Compilando y firmando…';
  const r = await api.post('build');
  $('#pubConsole').textContent = r.output || '(sin salida)';
  toast(r.ok ? 'Compilado y firmado ✓' : 'Falló la compilación', r.ok ? 'ok' : 'err');
  b.disabled = false; loadExtensions(); loadKeyStatus();
});

$('#btnGitStatus').addEventListener('click', async () => {
  const r = await api.get('gitstatus');
  $('#pubConsole').textContent = r.output?.trim() || '(sin cambios pendientes)';
});

$('#btnPublish').addEventListener('click', async (ev) => {
  if (!confirm('¿Subir los cambios a GitHub (main)?')) return;
  const b = ev.currentTarget; b.disabled = true;
  $('#pubConsole').textContent = 'Publicando…';
  const r = await api.post('publish', { message: $('#commitMsg').value });
  $('#pubConsole').textContent = r.output || '(sin salida)';
  toast(r.ok ? 'Publicado ✓' : 'Falló el push', r.ok ? 'ok' : 'err');
  b.disabled = false;
});

$('#btnKeygen').addEventListener('click', async (ev) => {
  if (!confirm('¿Generar el par de llaves? La privada queda en .keys/ — respaldala.')) return;
  const b = ev.currentTarget; b.disabled = true;
  const r = await api.post('keygen');
  toast(r.ok ? 'Llaves generadas ✓' : 'Error', r.ok ? 'ok' : 'err');
  b.disabled = false; loadKeys();
});

// Tab en el textarea inserta 2 espacios
$('#fSource').addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const t = e.target, s = t.selectionStart;
    t.value = t.value.slice(0, s) + '  ' + t.value.slice(t.selectionEnd);
    t.selectionStart = t.selectionEnd = s + 2;
  }
});

// ── Init ──
loadKeyStatus();
loadExtensions();

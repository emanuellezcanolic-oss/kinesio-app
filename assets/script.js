// ══════════════════════════════════════════════════════════════
//  MoveMetrics v12 -- JavaScript completo
// ══════════════════════════════════════════════════════════════

// ── API KEY MANAGER ──
// La key se guarda en localStorage del navegador.
// Nunca queda expuesta en el código fuente.
function getApiKey() {
  return localStorage.getItem('mm_api_key') || '';
}
function saveApiKey(key) {
  localStorage.setItem('mm_api_key', key.trim());
}
function clearApiKey() {
  localStorage.removeItem('mm_api_key');
}
function hasApiKey() {
  return !!getApiKey();
}

function showApiKeyModal() {
  const existing = getApiKey();
  const modal = document.createElement('div');
  modal.id = 'api-key-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)';
  modal.innerHTML = `
    <div style="background:#0f0f0f;border:1px solid rgba(57,255,122,.25);border-radius:16px;padding:32px 28px;width:100%;max-width:420px;margin:16px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#39FF7A;letter-spacing:.12em;margin-bottom:8px;text-transform:uppercase">∧ MoveMetrics</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:6px;color:#f0f0f0">API Key de Anthropic</div>
      <div style="font-size:13px;color:#888;margin-bottom:20px;line-height:1.6">
        Ingresá tu API Key para generar informes con IA.<br>
        Se guarda <b style="color:#f0f0f0">solo en tu navegador</b> -- nunca se sube a ningún servidor.
      </div>
      <input id="api-key-input" type="password"
        placeholder="sk-ant-api03-..."
        value="${existing}"
        style="width:100%;background:#141414;border:1px solid rgba(57,255,122,.2);border-radius:8px;color:#f0f0f0;padding:10px 14px;font-size:13px;font-family:'JetBrains Mono',monospace;outline:none;margin-bottom:8px;box-sizing:border-box"
      >
      <div style="font-size:11px;color:#3a3a3a;margin-bottom:16px;font-family:'JetBrains Mono',monospace">
        Obtené tu key gratis en console.groq.com → API Keys
      </div>
      <div style="display:flex;gap:10px">
        <button onclick="
          const k=document.getElementById('api-key-input').value.trim();
          if(!k){alert('Ingresá una API Key');return;}
          saveApiKey(k);
          document.getElementById('api-key-modal').remove();
          showSaveToast();
        " style="flex:1;background:#39FF7A;color:#000;border:none;border-radius:8px;padding:11px;font-weight:700;font-size:13px;cursor:pointer">
          Guardar y continuar
        </button>
        ${existing ? `<button onclick="document.getElementById('api-key-modal').remove()" style="background:#1c1c1c;color:#888;border:1px solid #252525;border-radius:8px;padding:11px 16px;font-size:13px;cursor:pointer">Cancelar</button>` : ''}
      </div>
      ${existing ? `<div style="text-align:center;margin-top:12px"><button onclick="clearApiKey();document.getElementById('api-key-input').value=''" style="background:none;border:none;color:#3a3a3a;font-size:11px;cursor:pointer;text-decoration:underline">Borrar key guardada</button></div>` : ''}
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('api-key-input')?.focus(), 100);
}

// ── DATOS GLOBALES ──
let atletas = JSON.parse(localStorage.getItem('mm_v12_atletas') || '[]');
let cur = null;
let fvChart = null, radarChart = null, movRadarChart = null, dashFvChart = null;
let fvRowCount = 0;
let _pendingPhoto = null;
let _lastFvEj = null;
let kineState = { bodyZones: {}, tests: {}, form: {} };

// ── CONSTANTES ──
const VMP_REF = {
  sentadilla: 0.32, 'press-banca': 0.18, 'peso-muerto': 0.14,
  'bench-pull': 0.53, 'hip-thrust': 0.24, 'media-sent': 0.33,
  'military-press': 0.20, dominadas: 0.22
};

const STR_NORMS = {
  sentadilla:   { name: 'Sentadilla',    red: 1.0,  amber: 1.5 },
  'press-banca':{ name: 'Press Banca',   red: 0.75, amber: 1.25 },
  'peso-muerto':{ name: 'Peso Muerto',   red: 1.25, amber: 2.0 },
  'hip-thrust': { name: 'Hip Thrust',    red: 1.0,  amber: 2.0 }
};

const RUGBY = {
  pilares:       { n:'Pilares (1/3)',      tipo:'Forward', squat:[155,165,175], vert:[35,37.5,40], horiz:[2.10,2.20,2.30], sp10:[1.75,1.70,1.65] },
  hooker:        { n:'Hooker (2)',         tipo:'Forward', squat:[145,155,165], vert:[35,37.5,40], horiz:[2.15,2.25,2.30], sp10:[1.74,1.69,1.64] },
  '2da-linea':   { n:'2da Línea (4/5)',   tipo:'Forward', squat:[130,140,150], vert:[40,42.5,45], horiz:[2.25,2.30,2.40], sp10:[1.72,1.67,1.62] },
  '3ras-lineas': { n:'3ras Líneas (6/7/8)',tipo:'Forward',squat:[135,145,155], vert:[45,47.5,50], horiz:[2.40,2.45,2.50], sp10:[1.68,1.63,1.58] },
  'medio-scrum': { n:'Medio Scrum (9)',   tipo:'Back',    squat:[120,130,140], vert:[47.5,50,52.5],horiz:[2.30,2.40,2.45],sp10:[1.63,1.58,1.53] },
  apertura:      { n:'Apertura (10)',      tipo:'Back',    squat:[125,135,145], vert:[47.5,50,52.5],horiz:[2.35,2.45,2.50],sp10:[1.62,1.57,1.52] },
  centros:       { n:'Centros (12/13)',    tipo:'Back',    squat:[125,135,145], vert:[47.5,50,52.5],horiz:[2.35,2.45,2.50],sp10:[1.62,1.57,1.52] },
  'wing-fb':     { n:'Wings/FB (11/14/15)',tipo:'Back',   squat:[120,130,140], vert:[50,52.5,55],  horiz:[2.40,2.50,2.55],sp10:[1.58,1.53,1.48] }
};

const SPRINT_NORMS = {
  Rugby:   { Forward:{ sp10:[1.78,1.72,1.65], sp30:[4.50,4.35,4.20], ttest:[9.8,9.5,9.2]  },
             Back:   { sp10:[1.70,1.63,1.57], sp30:[4.25,4.10,3.95], ttest:[9.5,9.2,8.9]  } },
  Fútbol:  { general:{ sp10:[1.75,1.70,1.65], sp30:[4.30,4.20,4.10], ttest:[9.6,9.3,9.0]  } },
  Básquet: { general:{ sp10:[1.80,1.74,1.68], sp30:[4.45,4.30,4.15], ttest:[9.9,9.6,9.3]  } }
};

const SALTOS_DEF = [
  { key:'bj',  label:'Broad Jump',     icon:'🏃', unit:'cm', type:'bilateral', desc:'Salto horizontal' },
  { key:'cmj', label:'CMJ',             icon:'⬆️', unit:'cm', type:'bilateral', desc:'Countermovement Jump' },
  { key:'dj',  label:'Drop Jump',       icon:'⬇️', unit:'cm', type:'bilateral', r2key:'dj-r0', desc:'RSI' },
  { key:'sh',  label:'Simple Hop',      icon:'🦵', unit:'cm', type:'unilateral', desc:'Hop for distance · LSI' },
  { key:'3h',  label:'3 Hop',           icon:'🦘', unit:'cm', type:'unilateral', desc:'Triple Hop · LSI' },
  { key:'djb', label:'DJ Unilateral',   icon:'🦘', unit:'cm', type:'unilateral', desc:'Drop Jump unilateral' }
];

const ORTHO_TESTS = {
  subacro: [
    { id:'neer',    name:'Neer',            sub:'Compresión subacromial',   ref:'Sn 0.72 / Sp 0.66' },
    { id:'hawkins', name:'Hawkins-Kennedy', sub:'Compresión subacromial',   ref:'Sn 0.83 / Sp 0.56 -- DESCARTAR RC' },
    { id:'yocum',   name:'Yocum',           sub:'Espacio subacromial',      ref:'Sn 0.78 / Sp 0.61' }
  ],
  manguito: [
    { id:'jobe',        name:'Jobe (Empty Can)',   sub:'Supraespinoso',          ref:'Sn 0.69 / Sp 0.66' },
    { id:'patte',       name:'Patte',              sub:'Infraespinoso/Red. menor',ref:'Sn 0.92 / Sp 0.30' },
    { id:'gerber',      name:'Gerber (Lift-off)',  sub:'Subescapular',           ref:'Sn 0.79 / Sp 0.89' },
    { id:'painful-arc', name:'Arco doloroso',      sub:'60-120° = RC',           ref:'LR+ 3.44 -- CONFIRMAR RC' }
  ],
  biceps: [
    { id:'speed',       name:'Speed',           sub:'Tendón bíceps proximal', ref:'Sn 0.69 / Sp 0.56' },
    { id:'yergason',    name:'Yergason',        sub:'Tendón bíceps / SLAP',   ref:'Sn 0.43 / Sp 0.79' },
    { id:'apprehension',name:'Apprehension',    sub:'Inestabilidad anterior', ref:'Sn 0.72 / Sp 0.96' },
    { id:'obrien',      name:"O'Brien (SLAP)",  sub:'Labrum superior',        ref:'Sn 0.47 / Sp 0.89' }
  ],
  ligamentos: [
    { id:'lachman',    name:'Lachman',           sub:'LCA -- Gold standard',  ref:'Sn 0.86 / Sp 0.91' },
    { id:'cajon-ant',  name:'Cajón anterior',    sub:'LCA',                  ref:'Sn 0.54 / Sp 0.72' },
    { id:'cajon-post', name:'Cajón posterior',   sub:'LCP',                  ref:'Sn 0.90 / Sp 0.99' },
    { id:'pivot-shift',name:'Pivot Shift',       sub:'LCA rotacional',       ref:'Sn 0.28 / Sp 0.98' },
    { id:'lelli',      name:'Lelli (Palanca)',   sub:'LCA -- alta Sn agudo',  ref:'Sn 1.00 / Sp 0.97' },
    { id:'valgo-est',  name:'Stress valgo 0°/30°',sub:'LLI',                ref:'Laxitud LLI' },
    { id:'varo-est',   name:'Stress varo 0°/30°', sub:'LLE',                ref:'Laxitud LLE' }
  ],
  meniscos: [
    { id:'mcmurray', name:'McMurray', sub:'Menisco medial/lateral', ref:'Sn 0.70 / Sp 0.71' },
    { id:'apley',    name:'Apley',    sub:'Menisco',                ref:'Sn 0.61 / Sp 0.70' },
    { id:'thessaly', name:'Thessaly', sub:'Menisco -- carga',        ref:'Sn 0.89 / Sp 0.97' }
  ],
  funcionales: [
    { id:'single-leg', name:'Single Leg Squat', sub:'Control motor rodilla', ref:'Valgo >10° = positivo' },
    { id:'step-down',  name:'Step-Down',        sub:'Control motor rodilla', ref:'Valgo dinámico' },
    { id:'ratio-iq',   name:'Ratio I/Q (HHD)',  sub:'<0.60 = déficit',       ref:'Valkyria / PushPull' }
  ],
  tobillo: [
    { id:'drawer-tob',  name:'Anterior Drawer', sub:'ATFL',          ref:'Sn 0.73 / Sp 0.60' },
    { id:'talar-tilt',  name:'Talar Tilt',      sub:'CFL',           ref:'Sn 0.50 / Sp 0.88' },
    { id:'thompson',    name:'Thompson',         sub:'Tendón Aquiles',ref:'Sn 0.96 / Sp 0.93' }
  ],
  lumbar: [
    { id:'slr',        name:'SLR (Lasègue)', sub:'L4-S1 · Pos <60°',    ref:'Sn 0.91 / Sp 0.26' },
    { id:'slump',      name:'SLUMP test',    sub:'Tensión dural',        ref:'Sn 0.84 / Sp 0.83' },
    { id:'aslr',       name:'ASLR',          sub:'Estabilidad lumbopélv',ref:'Estabilidad TP' },
    { id:'slr-cruzado',name:'SLR cruzado',   sub:'Hernia grave',         ref:'Sn 0.29 / Sp 0.88' }
  ],
  cadera: [
    { id:'fadir',         name:'FADIR',        sub:'FAI / Labrum',       ref:'Sn 0.96 / Sp 0.10' },
    { id:'faber',         name:'FABER (Patrick)',sub:'Articulación SI / Cápsula',ref:'Sn 0.57 / Sp 0.71' },
    { id:'trendelenburg', name:'Trendelenburg', sub:'Glúteo medio',       ref:'Sn 0.73 / Sp 0.77' },
    { id:'ober',          name:'Ober',          sub:'Banda iliotibial',   ref:'Tensión IT band' },
    { id:'thomas',        name:'Thomas',        sub:'Acortamiento psoas', ref:'Sn 0.89 / Sp 0.91' }
  ]
};

// ══════════════════════════════════════════════════════
//  NAVEGACIÓN
// ══════════════════════════════════════════════════════

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.mn-btn').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
  const navMap = { atletas: 0, tests: 1, ajustes: 2 };
  const idx = navMap[id];
  if (idx !== undefined) {
    document.querySelectorAll('.nav-item')[idx]?.classList.add('active');
    document.querySelectorAll('.mn-btn')[idx]?.classList.add('active');
  }
}

function showProfileTab(tab, btn) {
  const tabs = ['dashboard','kinesio','fuerza','saltos','movilidad','velocidad','fms','fatiga','video','historial'];
  tabs.forEach(t => document.getElementById('ptab-' + t)?.classList.toggle('hidden', t !== tab));
  document.querySelectorAll('#profile-tab-bar .ptab').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
  if (tab === 'dashboard')  renderDashboard();
  if (tab === 'historial')  renderHistorial();
  if (tab === 'kinesio')    initKinesio();
  if (tab === 'fuerza')     renderFVHist();
  if (tab === 'saltos')     renderSimetriasTabla();
  if (tab === 'movilidad') {
    setTimeout(redrawGauges, 60);
    const amPanel = document.getElementById('adulto-mayor-tests');
    if (amPanel && cur) {
      amPanel.classList.toggle('hidden', cur.deporte !== 'Adulto Mayor');
      if (cur.deporte === 'Adulto Mayor') {
        if (cur.sitToStand) document.getElementById('sts-reps').value = cur.sitToStand;
        if (cur.unipodal)   document.getElementById('unipodal-seg').value = cur.unipodal;
        if (cur.tug)        document.getElementById('tug-seg').value = cur.tug;
        if (cur.dist6min)   document.getElementById('dist6min-m').value = cur.dist6min;
      }
    }
  }
}

function openModal(id)  { document.getElementById(id).classList.add('open');    document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal').forEach(m =>
    m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); })
  );
});

// ══════════════════════════════════════════════════════
//  PERSISTENCIA
// ══════════════════════════════════════════════════════

function saveData() {
  localStorage.setItem('mm_v12_atletas', JSON.stringify(atletas));
  showSaveToast();
}

function showSaveToast() {
  const t = document.getElementById('save-toast');
  if (!t) return;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.style.opacity = '0', 2000);
}

// ══════════════════════════════════════════════════════
//  ATLETAS CRUD
// ══════════════════════════════════════════════════════

function setSvc(v) {
  document.getElementById('s-servicio').value = v;
  document.getElementById('svc-rend').className = 'btn btn-full ' + (v === 'rendimiento' ? 'btn-neon' : 'btn-ghost');
  document.getElementById('svc-kine').className = 'btn btn-full ' + (v === 'kinesio'     ? 'btn-neon' : 'btn-ghost');
}

function checkRugby() {
  const d = document.getElementById('s-deporte').value;
  document.getElementById('rugby-sec').classList.toggle('hidden', d !== 'Rugby');
}

function previewFormPhoto(input) {
  if (!input.files.length) return;
  const reader = new FileReader();
  reader.onload = e => {
    _pendingPhoto = e.target.result;
    const prev = document.getElementById('form-photo-prev');
    if (prev) { prev.innerHTML = ''; const img = document.createElement('img'); img.src = _pendingPhoto; img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:12px'; prev.appendChild(img); }
  };
  reader.readAsDataURL(input.files[0]);
}

function updateProfilePhoto(input) {
  if (!input.files.length || !cur) return;
  const reader = new FileReader();
  reader.onload = e => {
    cur.foto = e.target.result;
    atletas = atletas.map(a => a.id === cur.id ? cur : a);
    saveData();
    renderProfileHero();
    renderAtletas();
  };
  reader.readAsDataURL(input.files[0]);
}

function prepNewAtleta() {
  document.getElementById('form-title').textContent = 'Nuevo atleta';
  document.getElementById('edit-id').value = '';
  ['s-nombre','s-edad','s-peso','s-talla','s-pierna','s-lesion','s-email'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['s-sexo','s-deporte','s-nivel','s-objetivo','s-puesto'].forEach(id => {
    const el = document.getElementById(id); if (el) el.selectedIndex = 0;
  });
  document.getElementById('rugby-sec').classList.add('hidden');
  setSvc('rendimiento');
  const prev = document.getElementById('form-photo-prev'); if (prev) prev.innerHTML = '👤';
  _pendingPhoto = null;
}

function editAtletaById(id) {
  const s = atletas.find(a => a.id === id); if (!s) return;
  cur = s;
  document.getElementById('form-title').textContent = 'Editar atleta';
  document.getElementById('edit-id').value = s.id;
  ['nombre','edad','peso','talla','pierna','lesion','email'].forEach(k => {
    const el = document.getElementById('s-' + k); if (el) el.value = s[k] || '';
  });
  setSvc(s.servicio || 'rendimiento');
  ['sexo','deporte','nivel','objetivo','puesto'].forEach(k => {
    const el = document.getElementById('s-' + k); if (el && s[k]) el.value = s[k];
  });
  document.getElementById('rugby-sec').classList.toggle('hidden', s.deporte !== 'Rugby');
  const prev = document.getElementById('form-photo-prev');
  if (prev) {
    if (s.foto) { prev.innerHTML = ''; const img = document.createElement('img'); img.src = s.foto; img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:12px'; prev.appendChild(img); }
    else prev.innerHTML = '👤';
  }
  _pendingPhoto = null;
  openModal('modal-atleta-form');
}

function saveAtleta() {
  const nombre = document.getElementById('s-nombre').value.trim();
  if (!nombre) { alert('Ingresá el nombre'); return; }
  const eid = +document.getElementById('edit-id').value || null;
  const existing = eid ? atletas.find(a => a.id === eid) : null;
  const data = {
    id:       eid || Date.now(),
    nombre,
    edad:     document.getElementById('s-edad').value,
    sexo:     document.getElementById('s-sexo').value,
    peso:     document.getElementById('s-peso').value,
    talla:    document.getElementById('s-talla').value,
    pierna:   document.getElementById('s-pierna').value,
    servicio: document.getElementById('s-servicio').value,
    deporte:  document.getElementById('s-deporte').value,
    puesto:   document.getElementById('s-puesto').value,
    nivel:    document.getElementById('s-nivel').value,
    objetivo: document.getElementById('s-objetivo').value,
    lesion:   document.getElementById('s-lesion').value,
    email:    document.getElementById('s-email').value,
    foto:     _pendingPhoto || existing?.foto || null,
    creado:   existing?.creado || new Date().toISOString(),
    evals:    existing?.evals || {},
    evalsByDate: existing?.evalsByDate || {},
    kinesio:  existing?.kinesio || null
  };
  _pendingPhoto = null;
  if (eid) atletas = atletas.map(a => a.id === eid ? data : a);
  else atletas.push(data);
  if (!eid || cur?.id === eid) cur = data;
  saveData();
  closeModal('modal-atleta-form');
  renderAtletas();
  if (cur?.id === data.id) renderProfileHero();
}

function deleteAtleta(id, ev) {
  ev?.stopPropagation();
  if (!confirm('¿Eliminar este atleta y todos sus datos?')) return;
  atletas = atletas.filter(a => a.id !== id);
  if (cur?.id === id) { cur = null; showPage('atletas'); }
  saveData(); renderAtletas();
}

function selectAtleta(id) {
  cur = atletas.find(a => a.id === id);
  if (!cur) return;
  document.getElementById('sb-atleta-info').textContent = cur.nombre;
  document.getElementById('tests-atleta-indicator').textContent = cur.nombre;
  document.getElementById('profile-hero-area').style.display = 'block';
  renderProfileHero();
  showPage('tests');
  showProfileTab('dashboard', document.querySelector('.ptab'));
}

function renderAtletas() {
  const grid = document.getElementById('atletas-grid');
  document.getElementById('atletas-count').textContent =
    atletas.length + ' atleta' + (atletas.length !== 1 ? 's' : '') + ' registrado' + (atletas.length !== 1 ? 's' : '');
  if (!atletas.length) {
    grid.innerHTML = [
      '<div style="grid-column:1/-1;text-align:center;padding:100px 20px">',
      '<div style="width:80px;height:80px;border-radius:20px;background:rgba(57,255,122,.06);',
      'border:1px solid rgba(57,255,122,.12);display:flex;align-items:center;',
      'justify-content:center;font-size:32px;margin:0 auto 24px">&#128100;</div>',
      '<div style="font-size:32px;font-weight:800;letter-spacing:.08em;color:#fff;margin-bottom:10px">SIN ATLETAS</div>',
      '<p style="font-size:13px;color:rgba(255,255,255,.3);line-height:1.8">',
      'Crea tu primer atleta para comenzar.</p></div>'
    ].join('');
    return;
  }
  grid.innerHTML = atletas.map(s => {
    const evalCount = Object.keys(s.evals || {}).length;
    const hasInjury = s.lesion || (s.kinesio && Object.values(s.kinesio.bodyZones || {}).some(z => !z.recuperado));
    const photoHtml = s.foto
      ? `<img src="${s.foto}" style="width:40px;height:40px;border-radius:10px;object-fit:cover;border:1px solid var(--border2);flex-shrink:0">`
      : `<div class="athlete-av-sm">${s.nombre.charAt(0)}</div>`;
    return `<div class="athlete-card ${hasInjury ? 'has-injury' : ''}" onclick="selectAtleta(${s.id})">
      <div class="athlete-card-inner">
        <div class="flex mb-12" style="align-items:flex-start;gap:14px">
          ${photoHtml}
          <div style="flex:1;min-width:0">
            <div style="font-size:16px;font-weight:800;margin-bottom:3px;color:#fff;letter-spacing:-.3px">${s.nombre}</div>
            <div style="font-size:11px;color:rgba(255,255,255,.4);margin-bottom:4px">${s.deporte || 'Sin deporte'}${s.puesto ? ' · ' + s.puesto : ''} · ${s.edad || '?'} años · ${s.peso || '?'} kg</div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:10px;font-weight:700;color:var(--neon);font-family:var(--mono)">${s.servicio === 'kinesio' ? '🏥 KINESIO' : '⚡ RENDIMIENTO'}</span>
              ${s.lesion ? `<span style="font-size:10px;color:var(--amber)">· 📌 ${s.lesion}</span>` : ''}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end">
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();editAtletaById(${s.id})" style="padding:4px 8px;font-size:10px;opacity:.5">✏️</button>
            <button class="btn btn-red btn-sm"   onclick="deleteAtleta(${s.id},event)" style="padding:4px 8px;font-size:10px;opacity:.5">🗑️</button>
          </div>
        </div>
        <div style="height:1px;background:rgba(255,255,255,.05);margin-bottom:12px"></div>
        <div style="display:flex;gap:6px;align-items:center;justify-content:space-between">
          <div style="display:flex;gap:5px">
            <span class="tag ${s.nivel === 'elite' ? 'tag-g' : s.nivel === 'semi-pro' ? 'tag-b' : 'tag-y'}">${s.nivel || '--'}</span>
            <span class="tag" style="background:rgba(255,255,255,.05);color:rgba(255,255,255,.4)">${evalCount} eval</span>
          </div>
          ${hasInjury ? '<span style="font-size:9px;font-family:var(--mono);color:var(--red);font-weight:700">● LESIÓN ACTIVA</span>' : '<span style="font-size:9px;font-family:var(--mono);color:rgba(57,255,122,.4)">● ACTIVO</span>'}
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterAtletas(q) {
  const f = atletas.filter(s =>
    s.nombre.toLowerCase().includes(q.toLowerCase()) ||
    (s.deporte || '').toLowerCase().includes(q.toLowerCase())
  );
  const grid = document.getElementById('atletas-grid');
  grid.innerHTML = f.map(s => `
    <div class="athlete-card" onclick="selectAtleta(${s.id})">
      <div class="flex gap-12"><div class="athlete-av-sm">${s.nombre.charAt(0)}</div>
      <div><div style="font-size:14px;font-weight:700">${s.nombre}</div><div style="font-size:11px;color:var(--text2)">${s.deporte || '--'}</div></div></div>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════
//  PROFILE HERO
// ══════════════════════════════════════════════════════

function renderProfileHero() {
  if (!cur) return;
  const s = cur;
  document.getElementById('tests-atleta-indicator').textContent = s.nombre;
  // Avatar
  const av = document.getElementById('profile-av-lg');
  if (av) {
    if (s.foto) { av.innerHTML = `<img src="${s.foto}"><div class="profile-av-edit">✏️</div>`; }
    else { av.textContent = s.nombre.charAt(0); av.innerHTML += '<div class="profile-av-edit">✏️</div>'; }
  }
  document.getElementById('profile-meta').textContent =
    `${s.deporte || '--'}${s.puesto ? ' · ' + s.puesto : ''} · ${s.edad || '?'} años · ${s.peso || '?'} kg · ${s.talla || '?'} cm`;
  const tags = document.getElementById('profile-tags');
  if (tags) tags.innerHTML = [
    `<span class="tag tag-g">${s.objetivo || '--'}</span>`,
    `<span class="tag tag-b">${s.nivel || '--'}</span>`,
    s.lesion ? `<span class="tag tag-y">📌 ${s.lesion}</span>` : ''
  ].join(' ');
  // Fuerza relativa KPI
  const frkpi = document.getElementById('fuerza-rel-kpi');
  if (frkpi && s.lastFV?.oneRM && s.peso) {
    const ratio = (s.lastFV.oneRM / +s.peso).toFixed(2);
    const normKey = Object.keys(STR_NORMS).find(k => s.lastFV.ejercicio?.toLowerCase().includes(STR_NORMS[k].name.toLowerCase().split(' ')[0].toLowerCase()));
    const norm = STR_NORMS[normKey];
    const color = norm ? (+ratio >= norm.amber ? 'var(--neon)' : +ratio >= norm.red ? 'var(--amber)' : 'var(--red)') : 'var(--neon)';
    const label = norm ? (+ratio >= norm.amber ? 'Elite' : +ratio >= norm.red ? 'Moderado' : 'Déficit') : '--';
    frkpi.innerHTML = `<div style="text-align:right"><div class="il">Fuerza Relativa</div><div style="font-family:var(--mono);font-size:22px;font-weight:800;color:${color};text-shadow:0 0 12px ${color}">${ratio}×PC</div><span class="tag" style="background:${color}22;color:${color}">${label}</span></div>`;
  } else if (frkpi) frkpi.innerHTML = '';
  // Stats
  const lastSp = getLastEval('sprint');
  const evalTotal = Object.keys(s.evals || {}).length;
  const statsRow = document.getElementById('profile-stats-row');
  if (statsRow) statsRow.innerHTML = `
    <div class="kpi ${s.lastCMJ >= 40 ? 'kpi-green' : s.lastCMJ >= 30 ? '' : s.lastCMJ ? 'kpi-red' : ''}">
      <div class="kpi-label">CMJ último</div>
      <div class="kpi-val">${s.lastCMJ ? s.lastCMJ.toFixed(1) : '--'}</div>
      <div class="kpi-sub">cm altura</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">1RM estimado</div>
      <div class="kpi-val">${s.lastFV?.oneRM ? s.lastFV.oneRM.toFixed(0) : '--'}</div>
      <div class="kpi-sub">${s.lastFV?.ejercicio || '--'}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">10m sprint</div>
      <div class="kpi-val">${lastSp?.sp10 || '--'}</div>
      <div class="kpi-sub">segundos</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Evaluaciones</div>
      <div class="kpi-val">${evalTotal}</div>
      <div class="kpi-sub">registros</div>
    </div>`;
  // Kinesio badge en tab
  const kineTab = document.getElementById('tab-kinesio');
  if (kineTab) {
    const activeZones = Object.values(s.kinesio?.bodyZones || {}).filter(z => !z.recuperado).length;
    kineTab.textContent = activeZones ? `🏥 Kinesio 🔴${activeZones}` : '🏥 Kinesio';
    kineTab.classList.toggle('kine-active', activeZones > 0);
  }
}

function getLastEval(type) {
  if (!cur) return null;
  return Object.entries(cur.evals || {})
    .filter(([k]) => k.startsWith(type + '_'))
    .map(([, v]) => v)
    .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))[0] || null;
}

// ══════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════

function renderDashboard() {
  if (!cur) return;
  renderRadar();
  renderDashSemaforos();
  renderDashFV();
  renderDashFatiga();
  renderDashTimeline();
}

function renderRadar() {
  const s = cur; if (!s) return;
  const esAdultoMayor = s.deporte === 'Adulto Mayor';

  // ── Helpers de score ──
  const sp      = getLastEval('sprint');
  const lastSal = getLastEval('saltos');
  const lastMov = getLastEval('movilidad') || s;

  // FUERZA: promedio de fuerza relativa de todos los ejercicios F-V registrados
  const fvEvals = Object.entries(s.evals || {})
    .filter(([k]) => k.startsWith('fv_'))
    .map(([,v]) => v)
    .filter(v => v.oneRM && s.peso);
  const fzaScores = fvEvals.map(v => {
    const ratio = v.oneRM / +s.peso;
    const nk = Object.keys(STR_NORMS).find(k => v.ejercicio?.toLowerCase().includes(STR_NORMS[k].name.toLowerCase().split(' ')[0].toLowerCase()));
    const norm = nk ? STR_NORMS[nk] : { red: 1.0, amber: 1.5 };
    return Math.min(100, (ratio / norm.amber) * 100);
  });
  const fuerzaS = fzaScores.length ? fzaScores.reduce((a,b)=>a+b,0)/fzaScores.length : 0;

  // MOVILIDAD: promedio tobillo (Lunge), cadera (TROM), hombro (TROM)
  const lungeAvg   = ((+s.lungeD||0)+(+s.lungeI||0))/2;
  const tromCadAvg = ((+s.tromCadD||0)+(+s.tromCadI||0))/2;
  const tromHomAvg = ((+s.tromHomD||0)+(+s.tromHomI||0))/2;
  const movScores  = [lungeAvg?Math.min(100,lungeAvg/50*100):null, tromCadAvg?Math.min(100,tromCadAvg/120*100):null, tromHomAvg?Math.min(100,tromHomAvg/150*100):null].filter(v=>v!==null);
  const movilS     = movScores.length ? movScores.reduce((a,b)=>a+b,0)/movScores.length : 0;

  // VELOCIDAD: 10m sprint (deportista) o TUG (adulto mayor)
  let velS = 0;
  if (esAdultoMayor) {
    const tug = s.tug || null; // segundos -- referencia: <10s normal, <12s límite
    velS = tug ? Math.min(100, (12/tug)*100) : 0;
  } else {
    velS = sp?.sp10 ? Math.min(100, (1.80/sp.sp10)*100) : 0;
  }

  // RESISTENCIA: VO2max estimado o 6MWT (adulto mayor)
  let resS = 0;
  if (esAdultoMayor) {
    const dist6min = s.dist6min || null; // metros -- referencia: >500m bueno
    resS = dist6min ? Math.min(100, dist6min/600*100) : 0;
  } else {
    const lastFat = getLastEval('fatiga');
    resS = lastFat?.hrv ? Math.min(100, lastFat.hrv/80*100) : 0;
  }

  let labels, actual, ideal, targets;

  if (esAdultoMayor) {
    // ── ADULTO MAYOR: salud funcional ──
    const equilibrioS = s.unipodal ? Math.min(100, s.unipodal/30*100) : 0; // seg apoyo unipodal -- ref 30s
    const stsS        = s.sitToStand ? Math.min(100, s.sitToStand/15*100) : 0; // reps en 30s -- ref 15 reps
    labels  = ['Fuerza\n(Sit-to-Stand)', 'Velocidad\n(TUG)', 'Movilidad\n(Tobillo/Cadera)', 'Resistencia\n(6MWT)', 'Equilibrio\n(Unipodal)'];
    actual  = [stsS, velS, movilS, resS, equilibrioS];
    ideal   = [75, 75, 75, 75, 75];
    targets = ['fuerza','velocidad','movilidad','fatiga','fms'];
  } else {
    // ── DEPORTISTA: rendimiento ──
    labels  = ['Fuerza\n(F-V rel.)', 'Velocidad\n(Sprint)', 'Movilidad\n(Tobillo/Cad/Hom)', 'Resistencia\n(HRV)', 'Potencia\n(CMJ)'];
    const cmjS = s.lastCMJ ? Math.min(100, s.lastCMJ/60*100) : 0;
    actual  = [fuerzaS, velS, movilS, resS, cmjS];
    ideal   = [80, 80, 75, 70, 80];
    targets = ['fuerza','velocidad','movilidad','fatiga','saltos'];
  }

  const tag = document.getElementById('radar-obj-tag');
  if (tag) tag.textContent = esAdultoMayor ? 'Adulto Mayor' : (s.objetivo||'Rendimiento');

  const ctx = document.getElementById('radar-chart'); if (!ctx) return;
  if (radarChart) radarChart.destroy();
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: { labels, datasets: [
      { label:'Referencia', data:ideal, backgroundColor:'rgba(77,158,255,.06)', borderColor:'rgba(77,158,255,.25)', borderWidth:1.5, pointRadius:2 },
      { label:'Actual',     data:actual, backgroundColor:'rgba(57,255,122,.10)', borderColor:'rgba(57,255,122,.8)', borderWidth:2, pointRadius:5, pointBackgroundColor:'#39FF7A', pointHoverRadius:8 }
    ]},
    options: { responsive:true, animation:{ duration:700 },
      plugins:{ legend:{ display:false },
        tooltip:{ callbacks:{ label: ctx => ' ' + ctx.dataset.label + ': ' + ctx.raw.toFixed(0) + '%' } } },
      scales:{ r:{ beginAtZero:true, max:100,
        grid:{ color:'rgba(255,255,255,.05)' },
        angleLines:{ color:'rgba(255,255,255,.06)' },
        pointLabels:{ color:'rgba(255,255,255,.5)', font:{ size:10, weight:'600' } },
        ticks:{ display:false } } },
      onClick:(e, els) => {
        if (els.length && targets) {
          const t = targets[els[0].index];
          if (t) { const btn = document.querySelector('[onclick*="showProfileTab(\''+t+'\')"]'); showProfileTab(t, btn); }
        }
      }
    }
  });
}

function renderDashSemaforos() {
  const s = cur; const area = document.getElementById('dash-semaforos'); if (!area) return;
  if (!s?.lastFV || !s.peso) { area.innerHTML = '<p style="font-size:12px;color:var(--text3)">Realizá un perfil F-V para ver los semáforos.</p>'; return; }
  let html = '';
  Object.entries(STR_NORMS).forEach(([key, norm]) => {
    const fvEntries = Object.entries(s.evals || {}).filter(([k]) => k.startsWith('fv_' + key + '_')).map(([, v]) => v).sort((a, b) => new Date(b.fecha||0) - new Date(a.fecha||0));
    if (!fvEntries.length) return;
    const fv = fvEntries[0]; if (!fv.oneRM) return;
    const ratio = (fv.oneRM / +s.peso).toFixed(2);
    const color = +ratio >= norm.amber ? 'var(--neon)' : +ratio >= norm.red ? 'var(--amber)' : 'var(--red)';
    const pct = Math.min(100, (+ratio / (norm.amber * 1.2)) * 100);
    const label = +ratio >= norm.amber ? 'Elite' : +ratio >= norm.red ? 'Moderado' : 'Déficit';
    html += `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div style="font-size:12px;font-weight:700">${norm.name}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-family:var(--mono);font-size:16px;font-weight:800;color:${color}">${ratio}×PC</span>
          <span class="tag" style="background:${color}22;color:${color}">${label}</span>
        </div>
      </div>
      <div class="prog-wrap"><div class="prog-bar" style="width:${pct.toFixed(0)}%;background:${color}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);font-family:var(--mono);margin-top:2px">
        <span>🔴 &lt;${norm.red}</span><span>🟡 ${norm.red}-${norm.amber}</span><span>🟢 &gt;${norm.amber}</span>
      </div></div>`;
  });
  area.innerHTML = html || '<p style="font-size:12px;color:var(--text3)">Sin datos de fuerza.</p>';
  const fuelFR = document.getElementById('fv-fuerza-rel');
  if (fuelFR) fuelFR.innerHTML = html;
}

function renderDashFV() {
  const s = cur; if (!s?.lastFV) return;
  const fv = s.lastFV; if (!fv.a || !fv.b || !fv.cargas) return;
  const ctx = document.getElementById('dash-fv-chart'); if (!ctx) return;
  if (dashFvChart) dashFvChart.destroy();
  const minC = Math.min(...fv.cargas) * 0.9, maxC = Math.max(...fv.cargas) * 1.1;
  const curvX = [], curvY = [];
  for (let i = 0; i <= 25; i++) { const x = minC + (maxC - minC) * i / 25; curvX.push(+x.toFixed(1)); curvY.push(Math.max(0, +(fv.a + fv.b * x).toFixed(4))); }
  dashFvChart = new Chart(ctx, { type:'line',
    data:{ labels:curvX, datasets:[
      { label:'Curva F-V', data:curvY, borderColor:'#39FF7A', backgroundColor:'rgba(57,255,122,.04)', borderWidth:2, pointRadius:0, tension:0 },
      { label:'Datos', data:fv.cargas.map((c,i)=>({x:c,y:fv.vmps[i]})), borderColor:'#4D9EFF', backgroundColor:'#4D9EFF', type:'scatter', pointRadius:5, showLine:false, xAxisID:'x' }
    ]},
    options:{ responsive:true, plugins:{ legend:{ display:false } },
      scales:{ x:{ type:'linear', grid:{color:'rgba(255,255,255,.03)'}, ticks:{color:'#444',font:{family:'JetBrains Mono',size:9}} },
               y:{ grid:{color:'rgba(255,255,255,.03)'}, ticks:{color:'#444',font:{family:'JetBrains Mono',size:9}} } } }
  });
  const stats = document.getElementById('dash-fv-stats');
  if (stats) stats.innerHTML = `<div class="flex" style="gap:8px;flex-wrap:wrap">
    <span class="tag tag-g">${fv.ejercicio || '--'}</span>
    <span class="tag tag-b">V₀: ${fv.V0?.toFixed(3) || '--'} m/s</span>
    <span class="tag tag-b">1RM≈ ${fv.oneRM?.toFixed(1) || '--'} kg</span>
    <span class="tag ${fv.r2 >= 0.99 ? 'tag-g' : fv.r2 >= 0.95 ? 'tag-y' : 'tag-r'}">R² = ${fv.r2?.toFixed(4) || '--'}</span>
  </div>`;
}

function renderDashFatiga() {
  const s = cur; const area = document.getElementById('dash-fatiga-mini'); if (!area) return;
  const lastFat = getLastEval('fatiga');
  if (!lastFat) { area.innerHTML = '<p style="font-size:12px;color:var(--text3)">Sin registros de fatiga.</p>'; return; }
  const t = lastFat.hooper?.reduce((a, b) => a + b, 0) || 0;
  const c = t <= 12 ? 'var(--neon)' : t <= 19 ? 'var(--amber)' : 'var(--red)';
  area.innerHTML = `<div class="flex-b"><div><div class="il">HOOPER INDEX</div><div style="font-family:var(--mono);font-size:24px;font-weight:800;color:${c}">${t}</div></div><div style="font-size:11px;color:var(--text2)">${lastFat.fecha || '--'}</div></div>
  <div class="prog-wrap mt-8"><div class="prog-bar" style="width:${Math.min(100,t/28*100).toFixed(0)}%;background:${c}"></div></div>
  <div style="font-size:10px;color:var(--text3);margin-top:4px;font-family:var(--mono)">HRV: ${lastFat.hrv || '--'}ms vs basal ${lastFat.hrvBase || '--'}ms</div>`;
}

function renderDashTimeline() {
  const s = cur; if (!s) return;
  const area = document.getElementById('dash-timeline'); if (!area) return;
  const items = buildTimelineItems().slice(0, 7);
  if (!items.length) { area.innerHTML = '<p style="font-size:12px;color:var(--text3)">Sin evaluaciones aún.</p>'; return; }
  area.innerHTML = '<div class="tl-wrap">' + items.map(it => `
    <div class="tl-item">
      <div class="tl-dot ${it.dotClass}"></div>
      <div class="tl-date">${it.fecha}</div>
      <div class="tl-title">${it.icon} ${it.title}</div>
      <div class="tl-body">${it.detail}</div>
      ${it.statusHtml}
    </div>`).join('') + '</div>';
}

// ══════════════════════════════════════════════════════
//  HISTORIAL -- TIMELINE COLOREADA
// ══════════════════════════════════════════════════════

function buildTimelineItems() {
  if (!cur) return [];
  const items = [];
  Object.entries(cur.evals || {}).forEach(([key, data]) => {
    if (!data?.fecha) return;
    const tipo = key.startsWith('saltos_') ? 'saltos' : key.startsWith('fv_') ? 'fv' : key.startsWith('sprint_') ? 'sprint' :
      key.startsWith('mov_') ? 'movilidad' : key.startsWith('fatiga_') ? 'fatiga' : key.startsWith('fms_') ? 'fms' :
      key.startsWith('kinesio_') ? 'kinesio' : null;
    if (tipo) items.push(buildTLItem(tipo, data, data.fecha));
  });
  return items.filter(Boolean).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

function buildTLItem(tipo, data, fecha) {
  let icon = '📋', title = '', detail = '', status = '', color = 'dot-b', statusCls = '';
  if (tipo === 'saltos') {
    icon = '🦘'; title = 'Saltos';
    const a = data.avg || {}; const parts = [];
    if (a.cmj) parts.push(`CMJ: ${a.cmj.toFixed(1)}cm`);
    if (a.bj)  parts.push(`BJ: ${a.bj.toFixed(1)}cm`);
    if (a.shD && a.shI) {
      const lsi = (Math.min(a.shD, a.shI) / Math.max(a.shD, a.shI) * 100).toFixed(1);
      const asim = ((Math.max(a.shD,a.shI)-Math.min(a.shD,a.shI))/Math.max(a.shD,a.shI)*100).toFixed(1);
      const isCrit = +asim > 15;
      parts.push(`LSI: <span style="color:${isCrit?'var(--red)':'var(--neon)'};font-weight:800">${lsi}%${isCrit?' ⚠️':''}</span>`);
      color = +lsi >= 90 ? 'dot-g' : +lsi >= 80 ? 'dot-y' : 'dot-r';
    }
    detail = parts.join(' · ') || 'Sin datos';
    status = color === 'dot-g' ? '🟢 Simétrico' : color === 'dot-r' ? '🔴 Asimetría' : '🟡 Moderado';
    statusCls = color === 'dot-g' ? 'tl-s-g' : color === 'dot-r' ? 'tl-s-r' : 'tl-s-y';
  } else if (tipo === 'fv') {
    icon = '📈'; title = `F-V -- ${data.ejercicio || '--'}`;
    const r = data.r2; color = r >= 0.99 ? 'dot-g' : r >= 0.95 ? 'dot-y' : 'dot-r';
    detail = `V₀: ${data.V0?.toFixed(3)||'--'} · 1RM≈${data.oneRM?.toFixed(0)||'--'} kg · R²: ${data.r2?.toFixed(4)||'--'}`;
    if (data.oneRM && cur?.peso) { const fr = (data.oneRM / +cur.peso).toFixed(2); const frc = +fr>=1.5?'var(--neon)':+fr>=1.0?'var(--amber)':'var(--red)'; detail += ` · <span style="color:${frc};font-family:var(--mono)">${fr}×PC</span>`; }
    status = r >= 0.99 ? '🟢 Alta fiabilidad' : r >= 0.95 ? '🟡 Aceptable' : '🔴 Baja fiabilidad';
    statusCls = r >= 0.99 ? 'tl-s-g' : r >= 0.95 ? 'tl-s-y' : 'tl-s-r';
  } else if (tipo === 'sprint') {
    icon = '🏃'; title = 'Sprint & COD';
    detail = `10m: ${data.sp10||'--'}s · 30m: ${data.sp30||'--'}s · T-Test: ${data.ttest||'--'}s`;
    color = 'dot-b';
  } else if (tipo === 'movilidad') {
    icon = '📐'; title = 'Movilidad';
    const ld = data.lungeD, li = data.lungeI;
    const ok = ld && li && ld > 40 && li > 40 && Math.abs(ld - li) <= 5;
    color = ok ? 'dot-g' : (ld && ld < 35 ? 'dot-r' : 'dot-y');
    detail = `Lunge D/I: ${ld||'--'}°/${li||'--'}° · TROM Cad D: ${data.tromCadD||'--'}°`;
    status = ok ? '🟢 Normal' : ld && ld < 35 ? '🔴 Déficit tobillo' : '🟡 Revisar';
    statusCls = ok ? 'tl-s-g' : ld && ld < 35 ? 'tl-s-r' : 'tl-s-y';
  } else if (tipo === 'fatiga') {
    icon = '⚡'; title = 'Fatiga diaria';
    const t = data.hooper?.reduce((a, b) => a + b, 0) || 0;
    color = t <= 12 ? 'dot-g' : t <= 19 ? 'dot-y' : 'dot-r';
    detail = `Hooper: ${t} · HRV: ${data.hrv||'--'}ms`;
    status = t <= 12 ? '🟢 Óptimo' : t <= 19 ? '🟡 Moderado' : '🔴 Sobrecarga';
    statusCls = t <= 12 ? 'tl-s-g' : t <= 19 ? 'tl-s-y' : 'tl-s-r';
  } else if (tipo === 'fms') {
    icon = '🎯'; title = 'FMS -- Calidad Movimiento';
    const ohsY = (data.ohs?.criterios || []).filter(v => v === 'si').length;
    const pct = ohsY / (data.ohs?.criterios?.length || 4) * 100;
    color = pct >= 80 ? 'dot-g' : pct >= 50 ? 'dot-y' : 'dot-r';
    detail = `OHS: ${ohsY}/${data.ohs?.criterios?.length||4} criterios · Valgo D: ${data.sd?.valgoD||'--'}°`;
    status = pct >= 80 ? '🟢 Buena calidad' : pct >= 50 ? '🟡 Compensaciones' : '🔴 Déficits';
    statusCls = pct >= 80 ? 'tl-s-g' : pct >= 50 ? 'tl-s-y' : 'tl-s-r';
  } else if (tipo === 'kinesio') {
    icon = '🏥'; title = 'Evaluación Kinesiológica';
    const zonas = Object.values(data.zonas || {});
    const posTests = (data.testsPositivos || []).length;
    const eva = data.eva || 0;
    color = eva >= 7 ? 'dot-r' : eva >= 4 ? 'dot-y' : 'dot-g';
    detail = `${data.motivo || 'Consulta kinesiológica'}${zonas.length ? ' · ' + zonas.length + ' zona(s)' : ''}${posTests ? ' · ' + posTests + ' test(s) positivo(s)' : ''}`;
    if (data.dx) detail += ` · Dx: ${data.dx}`;
    status = eva >= 7 ? `🔴 Dolor severo (EVA ${eva})` : eva >= 4 ? `🟡 Moderado (EVA ${eva})` : `🟢 Leve (EVA ${eva})`;
    statusCls = eva >= 7 ? 'tl-s-r' : eva >= 4 ? 'tl-s-y' : 'tl-s-g';
  }
  return { fecha, icon, title, detail, dotClass: color, statusHtml: status ? `<span class="tl-status ${statusCls}">${status}</span>` : '' };
}

function renderHistorial() {
  const el = document.getElementById('historial-timeline'); if (!el || !cur) return;
  const items = buildTimelineItems();
  if (!items.length) {
    el.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text3)"><div style="font-size:40px;margin-bottom:12px">📊</div><div style="font-size:16px;font-weight:700">Sin evaluaciones aún</div><p style="font-size:13px;margin-top:6px">Empezá cargando datos en cualquier módulo</p></div>';
    return;
  }
  el.innerHTML = '<div class="tl-wrap">' + items.map(it => `
    <div class="tl-item">
      <div class="tl-dot ${it.dotClass}"></div>
      <div class="tl-date">${it.fecha}</div>
      <div class="tl-title">${it.icon} ${it.title}</div>
      <div class="tl-body">${it.detail}</div>
      ${it.statusHtml}
    </div>`).join('') + '</div>';
}

// ══════════════════════════════════════════════════════
//  F-V MODULE
// ══════════════════════════════════════════════════════

function addFVRow() {
  fvRowCount++;
  const wrap = document.getElementById('fv-rows-wrap');
  const row = document.createElement('div');
  row.className = 'fv-data-row';
  row.style.cssText = 'display:grid;grid-template-columns:60px 1fr 1fr 24px;gap:6px;margin-bottom:6px;align-items:center';
  row.innerHTML = `<span style="font-family:var(--mono);font-size:10px;color:var(--text3)">Par ${fvRowCount}</span>
    <input class="inp inp-mono fv-carga" type="number" step=".5" placeholder="60" style="font-size:12px">
    <input class="inp inp-mono fv-vmp"   type="number" step=".001" placeholder="0.650" style="font-size:12px">
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text3);font-size:16px;cursor:pointer;padding:2px;line-height:1">×</button>`;
  wrap.appendChild(row);
}

function onFvEjChange() {
  const newEj = document.getElementById('fv-ej')?.value;
  if (_lastFvEj && _lastFvEj !== newEj) {
    const pairs = [...document.querySelectorAll('.fv-data-row')]
      .map(r => ({ c: +r.querySelector('.fv-carga').value, v: +r.querySelector('.fv-vmp').value }))
      .filter(p => p.c > 0 && p.v > 0);
    if (pairs.length >= 3 && cur) { calcFV(); setTimeout(() => { document.getElementById('fv-rows-wrap').innerHTML = ''; fvRowCount = 0; for (let i = 0; i < 5; i++) addFVRow(); document.getElementById('fv-output').classList.add('hidden'); }, 200); }
  }
  _lastFvEj = newEj;
  renderFVHist();
}

function calcFV() {
  if (!cur) { alert('Seleccioná un atleta'); return; }
  const rows = [...document.querySelectorAll('.fv-data-row')];
  const pairs = rows.map(r => ({ c: +r.querySelector('.fv-carga').value, v: +r.querySelector('.fv-vmp').value })).filter(p => p.c > 0 && p.v > 0);
  if (pairs.length < 3) { alert('Mínimo 3 pares carga/VMP'); return; }
  const cargas = pairs.map(p => p.c), vmps = pairs.map(p => p.v);
  const n = cargas.length;
  const sumX = cargas.reduce((a,b)=>a+b,0), sumY = vmps.reduce((a,b)=>a+b,0);
  const sumXY = cargas.reduce((s,x,i)=>s+x*vmps[i],0), sumX2 = cargas.reduce((s,x)=>s+x*x,0);
  const b = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
  const a = sumY/n - b*sumX/n;
  const meanY = sumY/n;
  const ssTot = vmps.reduce((s,y)=>s+(y-meanY)**2,0);
  const ssRes = cargas.reduce((s,x,i)=>s+(vmps[i]-(a+b*x))**2,0);
  const r2 = 1 - ssRes/ssTot;
  const F0 = b < 0 ? (-a/b) : null;
  const V0 = a;
  const Pmax = F0 && V0 ? (F0*V0/4) : null;
  const ejId = document.getElementById('fv-ej').value;
  const vmpRef = VMP_REF[ejId] || 0.18;
  const oneRM = b < 0 ? ((vmpRef-a)/b) : null;
  const fiab = r2 >= 0.99 ? 'Alta' : r2 >= 0.95 ? 'Aceptable' : 'Baja';
  const r2Color = r2 >= 0.99 ? 'var(--neon)' : r2 >= 0.95 ? 'var(--amber)' : 'var(--red)';
  const ejName = document.getElementById('fv-ej').options[document.getElementById('fv-ej').selectedIndex].text;
  // Chart
  document.getElementById('fv-output').classList.remove('hidden');
  const minC = Math.min(...cargas)*0.9, maxC = Math.max(...cargas)*1.1;
  const curvX = [], curvY = [];
  for (let i=0;i<=30;i++){const x=minC+(maxC-minC)*i/30;curvX.push(+x.toFixed(1));curvY.push(Math.max(0,+(a+b*x).toFixed(4)));}
  const ctx = document.getElementById('fv-chart').getContext('2d');
  if (fvChart) fvChart.destroy();
  fvChart = new Chart(ctx, { type:'line',
    data:{ labels:curvX, datasets:[
      { label:'Curva F-V', data:curvY, borderColor:'#39FF7A', backgroundColor:'rgba(57,255,122,.04)', borderWidth:2, pointRadius:0, tension:0 },
      { label:'Datos', data:cargas.map((c,i)=>({x:c,y:vmps[i]})), borderColor:'#4D9EFF', backgroundColor:'#4D9EFF', type:'scatter', pointRadius:6, showLine:false, xAxisID:'x' }
    ]},
    options:{ responsive:true, plugins:{ legend:{ labels:{ color:'#666', font:{ family:'JetBrains Mono', size:10 } } } },
      scales:{ x:{type:'linear',grid:{color:'rgba(255,255,255,.03)'},ticks:{color:'#444',font:{family:'JetBrains Mono',size:9}},title:{display:true,text:'Carga (kg)',color:'#555'}},
               y:{grid:{color:'rgba(255,255,255,.03)'},ticks:{color:'#444',font:{family:'JetBrains Mono',size:9}},title:{display:true,text:'VMP (m/s)',color:'#555'}} } }
  });
  const badge = document.getElementById('fv-r2-badge');
  badge.textContent = `R² = ${r2.toFixed(4)} -- ${fiab}`;
  badge.className = 'tag ' + (r2>=0.99?'tag-g':r2>=0.95?'tag-y':'tag-r');
  document.getElementById('fv-res-table').innerHTML = `
    <div class="flex-b mb-8"><span style="font-size:12px;color:var(--text2)">Ejercicio</span><span style="font-family:var(--mono);font-weight:700">${ejName}</span></div>
    <div class="flex-b mb-8"><span style="font-size:12px;color:var(--text2)">V₀</span><span style="font-family:var(--mono);font-weight:700;color:var(--neon)">${V0.toFixed(4)} m/s</span></div>
    ${F0?`<div class="flex-b mb-8"><span style="font-size:12px;color:var(--text2)">F₀ (VMP=0)</span><span style="font-family:var(--mono);font-weight:700;color:var(--blue)">${F0.toFixed(1)} kg</span></div>`:''}
    ${Pmax?`<div class="flex-b mb-8"><span style="font-size:12px;color:var(--text2)">Pmax estimada</span><span style="font-family:var(--mono);font-weight:700;color:var(--amber)">${Pmax.toFixed(1)} W</span></div>`:''}
    ${oneRM?`<div class="flex-b mb-8"><span style="font-size:12px;color:var(--text2)">1RM (VMP ${vmpRef})</span><span style="font-family:var(--mono);font-weight:700;color:var(--purple)">${oneRM.toFixed(1)} kg</span></div>`:''}
    <div class="flex-b"><span style="font-size:12px;color:var(--text2)">Fórmula</span><span style="font-family:var(--mono);font-size:11px">VMP = ${V0.toFixed(3)} + ${b.toFixed(5)}×C</span></div>`;
  const pcts = [100,95,90,85,80,75,70,65,60,55,50];
  document.getElementById('fv-pct-table').innerHTML = pcts.map(p => {
    const load = oneRM ? (oneRM*p/100) : null; const vmp = load ? (a+b*load) : null; const ok = vmp && vmp > 0;
    return `<tr><td class="mono-cell">${p}%</td><td class="mono-cell">${load?load.toFixed(1):'--'}</td><td class="mono-cell" style="color:${ok?'var(--neon)':'var(--text3)'}">${ok?vmp.toFixed(3):'--'}</td></tr>`;
  }).join('');
  // Save
  const evalIdx = document.getElementById('fv-eval-num')?.value || '0';
  const fechaFV = document.getElementById('fv-fecha').value || new Date().toISOString().split('T')[0];
  if (!cur.evals) cur.evals = {};
  cur.evals['fv_' + ejId + '_' + evalIdx] = { a, b, r2, F0, V0, Pmax, oneRM, vmpRef, ejercicio:ejName, ejId, fecha:fechaFV, cargas, vmps };
  if (!cur.evalsByDate) cur.evalsByDate = {};
  if (!cur.evalsByDate[fechaFV]) cur.evalsByDate[fechaFV] = {};
  cur.evalsByDate[fechaFV][ejId] = { a, b, r2, F0, V0, Pmax, oneRM, cargas, vmps, ejercicio:ejName };
  cur.lastFV = { a, b, r2, F0, V0, Pmax, oneRM, vmpRef, ejercicio:ejName, ejId, cargas, vmps };
  if (oneRM) cur.last1RM = oneRM;
  atletas = atletas.map(a => a.id === cur.id ? cur : a);
  saveData();
  renderDashSemaforos();
  renderProfileHero();
}

function renderFVHist() {
  if (!cur) return;
  const ejId = document.getElementById('fv-ej')?.value || 'sentadilla';
  const ejName = document.getElementById('fv-ej')?.options[document.getElementById('fv-ej')?.selectedIndex]?.text || ejId;
  const titleEl = document.getElementById('fv-hist-title');
  if (titleEl) titleEl.textContent = ejName;
  const area = document.getElementById('fv-hist-table'); if (!area) return;
  const entries = Object.entries(cur.evals || {})
    .filter(([k]) => k.startsWith('fv_' + ejId + '_'))
    .map(([k, v]) => ({ evalN: +k.split('_').slice(-1)[0]+1, ...v }))
    .sort((a, b) => new Date(b.fecha||0) - new Date(a.fecha||0));
  if (!entries.length) { area.innerHTML = '<p style="font-size:12px;color:var(--text3)">Sin historial para este ejercicio.</p>'; return; }
  area.innerHTML = `<table class="data-table"><thead><tr><th>Eval #</th><th>Fecha</th><th>1RM (kg)</th><th>Fza.Rel.</th><th>R²</th><th>V₀ m/s</th></tr></thead><tbody>` +
    entries.map(e => {
      const fr = e.oneRM && cur.peso ? (e.oneRM/+cur.peso).toFixed(2) : '--';
      const frC = fr !== '--' ? (+fr>=1.5?'var(--neon)':+fr>=1.0?'var(--amber)':'var(--red)') : 'var(--text3)';
      return `<tr><td class="mono-cell">${e.evalN}ra</td><td>${e.fecha||'--'}</td><td class="mono-cell text-neon">${e.oneRM?.toFixed(1)||'--'}</td><td class="mono-cell" style="color:${frC}">${fr}×PC</td><td class="mono-cell ${e.r2>=0.99?'text-neon':e.r2>=0.95?'text-amber':'text-red'}">${e.r2?.toFixed(4)||'--'}</td><td class="mono-cell">${e.V0?.toFixed(3)||'--'}</td></tr>`;
    }).join('') + '</tbody></table>';
}

// ══════════════════════════════════════════════════════
//  SALTOS
// ══════════════════════════════════════════════════════

function buildSaltosGrid() {
  const grid = document.getElementById('saltos-grid'); if (!grid) return;
  grid.innerHTML = SALTOS_DEF.map(def => {
    if (def.type === 'bilateral') {
      const r2id = def.r2key || (def.key + '-r2');
      return `<div class="card">
        <div class="card-header"><h3>${def.icon} ${def.label}</h3><span class="tag tag-b">${def.desc}</span></div>
        <div class="card-body">
          <div class="ig"><label class="il">Rep 1</label><input class="inp inp-mono" type="number" step=".1" id="${def.key}-r1" placeholder="0" oninput="calcSalto('${def.key}','${r2id}')"></div>
          <div class="ig"><label class="il">Rep 2${def.r2key ? ' (Rep 0)' : ''}</label><input class="inp inp-mono" type="number" step=".1" id="${r2id}" placeholder="0" oninput="calcSalto('${def.key}','${r2id}')"></div>
          <div style="background:var(--bg4);border:1px solid var(--border);border-radius:var(--r);padding:12px;text-align:center;margin-top:8px">
            <div class="il mb-4">Promedio</div>
            <div id="${def.key}-avg" style="font-family:var(--mono);font-size:28px;font-weight:800;color:var(--neon)">--</div>
            <div style="font-size:10px;color:var(--text3)">cm</div>
          </div>
          ${def.key === 'bj' ? `<div class="ig mt-8"><label class="il">Peso corporal (kg)</label><input class="inp inp-mono" type="number" id="bj-pc" placeholder="75" oninput="calcImpulso()"></div><div style="font-size:12px;color:var(--text2);margin-top:4px">Impulso: <span id="bj-imp" style="font-family:var(--mono);color:var(--neon)">--</span> AU</div>` : ''}
          <div id="${def.key}-mejora" style="text-align:center;margin-top:6px"></div>
        </div>
      </div>`;
    } else {
      return `<div class="card">
        <div class="card-header"><h3>${def.icon} ${def.label}</h3><span class="tag tag-y">${def.desc}</span></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <div style="font-size:10px;font-weight:700;color:var(--neon);margin-bottom:8px;font-family:var(--mono)">DERECHA</div>
              <div class="ig"><label class="il">Rep 1</label><input class="inp inp-mono" type="number" step=".1" id="${def.key}-d-r1" placeholder="0" oninput="calcSimetriaHop('${def.key}')"></div>
              <div class="ig"><label class="il">Rep 2</label><input class="inp inp-mono" type="number" step=".1" id="${def.key}-d-r2" placeholder="0" oninput="calcSimetriaHop('${def.key}')"></div>
              <div style="background:var(--bg4);border:1px solid var(--border);border-radius:var(--r);padding:10px;text-align:center"><div class="il mb-4">Avg D</div><div id="${def.key}-d-avg" style="font-family:var(--mono);font-size:22px;font-weight:800;color:var(--neon)">--</div></div>
            </div>
            <div>
              <div style="font-size:10px;font-weight:700;color:var(--blue);margin-bottom:8px;font-family:var(--mono)">IZQUIERDA</div>
              <div class="ig"><label class="il">Rep 1</label><input class="inp inp-mono" type="number" step=".1" id="${def.key}-i-r1" placeholder="0" oninput="calcSimetriaHop('${def.key}')"></div>
              <div class="ig"><label class="il">Rep 2</label><input class="inp inp-mono" type="number" step=".1" id="${def.key}-i-r2" placeholder="0" oninput="calcSimetriaHop('${def.key}')"></div>
              <div style="background:var(--bg4);border:1px solid var(--border);border-radius:var(--r);padding:10px;text-align:center"><div class="il mb-4">Avg I</div><div id="${def.key}-i-avg" style="font-family:var(--mono);font-size:22px;font-weight:800;color:var(--blue)">--</div></div>
            </div>
          </div>
          <div style="background:var(--bg4);border:1px solid var(--border2);border-radius:var(--r);padding:12px;text-align:center;margin-top:10px">
            <div class="il mb-4">LSI -- Simetría</div>
            <div id="${def.key}-sim" style="font-family:var(--mono);font-size:28px;font-weight:800">--</div>
            <div id="${def.key}-sim-st" style="font-size:11px;color:var(--text3);margin-top:2px"></div>
          </div>
          <div id="${def.key}-mejora" style="text-align:center;margin-top:6px"></div>
        </div>
      </div>`;
    }
  }).join('');
}

function calcSalto(key, r2id) {
  const r1 = +document.getElementById(key + '-r1')?.value || 0;
  const r2 = +document.getElementById(r2id)?.value || 0;
  const avg = r1 && r2 ? (r1+r2)/2 : r1 || r2;
  const el = document.getElementById(key + '-avg');
  if (el) { el.textContent = avg ? avg.toFixed(1) : '--'; el.dataset.val = avg || ''; }
  if (key === 'bj') calcImpulso();
  if (key === 'cmj' && cur) { cur.lastCMJ = avg || null; atletas = atletas.map(a => a.id===cur.id?cur:a); saveData(); }
  checkMejoraSalto(key, avg);
}

function calcImpulso() {
  const avg = parseFloat(document.getElementById('bj-avg')?.dataset.val) || 0;
  const pc = +document.getElementById('bj-pc')?.value || 0;
  const el = document.getElementById('bj-imp');
  if (el && avg && pc) el.textContent = ((avg/100)*pc).toFixed(2);
}

function calcSimetriaHop(key) {
  const dr1 = +document.getElementById(key+'-d-r1')?.value||0, dr2 = +document.getElementById(key+'-d-r2')?.value||0;
  const ir1 = +document.getElementById(key+'-i-r1')?.value||0, ir2 = +document.getElementById(key+'-i-r2')?.value||0;
  const avgD = dr1&&dr2?(dr1+dr2)/2:dr1||dr2, avgI = ir1&&ir2?(ir1+ir2)/2:ir1||ir2;
  const elD = document.getElementById(key+'-d-avg'), elI = document.getElementById(key+'-i-avg');
  if (elD) { elD.textContent = avgD?avgD.toFixed(1):'--'; elD.dataset.val = avgD||''; }
  if (elI) { elI.textContent = avgI?avgI.toFixed(1):'--'; elI.dataset.val = avgI||''; }
  if (avgD && avgI) {
    const mayor = Math.max(avgD,avgI), menor = Math.min(avgD,avgI);
    const lsi = (menor/mayor*100).toFixed(1);
    const asim = ((mayor-menor)/mayor*100).toFixed(1);
    const isCrit = +asim > 15;
    const c = +lsi>=90?'var(--neon)':+lsi>=85?'var(--amber)':'var(--red)';
    const el = document.getElementById(key+'-sim');
    if (el) { el.textContent = lsi+'%'; el.style.color = c; el.style.textShadow = isCrit?'0 0 12px rgba(255,68,68,.6)':'none'; }
    const st = document.getElementById(key+'-sim-st');
    if (st) { st.innerHTML = +lsi>=90?'✓ Simétrico (LSI ≥90%)':+lsi>=85?`⚠️ Asimetría leve (${asim}%)`:`<b style="color:var(--red)">🔴 ASIMETRÍA CRÍTICA: ${asim}% -- SUPERA EL 15%</b>`; st.style.color=c; }
    if (isCrit) { const card = el?.closest('.card'); if (card) { card.style.borderColor='rgba(255,68,68,.4)'; card.style.boxShadow='0 0 20px rgba(255,68,68,.15)'; } }
  }
  renderSimetriasTabla();
}

function checkMejoraSalto(key, curVal) {
  if (!cur || !curVal) return;
  const evalIdx = +document.getElementById('saltos-eval-num')?.value || 0;
  const el = document.getElementById(key+'-mejora');
  if (evalIdx === 0) { if (el) el.innerHTML = ''; return; }
  const prev = cur.evals?.['saltos_'+(evalIdx-1)]?.avg?.[key];
  if (!prev || !el) return;
  const pct = ((curVal-prev)/prev*100).toFixed(1);
  const color = +pct>=0?'var(--neon)':'var(--red)';
  el.innerHTML = `<span class="tag" style="background:${color}22;color:${color}">${+pct>0?'+':''}${pct}% vs eval anterior</span>`;
}

function renderSimetriasTabla() {
  const area = document.getElementById('simetrias-tabla'); if (!area) return;
  const uniDef = SALTOS_DEF.filter(d => d.type === 'unilateral');
  const rows = uniDef.map(def => {
    const dAvg = parseFloat(document.getElementById(def.key+'-d-avg')?.dataset.val||'')||0;
    const iAvg = parseFloat(document.getElementById(def.key+'-i-avg')?.dataset.val||'')||0;
    if (!dAvg && !iAvg) return null;
    const mayor = Math.max(dAvg,iAvg), menor = Math.min(dAvg,iAvg);
    const lsi = mayor?(menor/mayor*100).toFixed(1):'--';
    const asim = mayor?((mayor-menor)/mayor*100).toFixed(1):'--';
    const c = +lsi>=90?'var(--neon)':+lsi>=85?'var(--amber)':'var(--red)';
    const isCrit = asim!=='--'&&+asim>15;
    return `<tr>
      <td>${def.icon} ${def.label}</td>
      <td class="mono-cell">${dAvg?dAvg.toFixed(1):'--'} cm</td>
      <td class="mono-cell">${iAvg?iAvg.toFixed(1):'--'} cm</td>
      <td class="mono-cell" style="color:${c};font-weight:800;${isCrit?'text-shadow:0 0 8px rgba(255,68,68,.5)':''}">${lsi}%</td>
      <td class="mono-cell" style="color:${c}">${asim}%</td>
      <td><span class="tag" style="background:${c}22;color:${c}">${+lsi>=90?'✓ OK':+lsi>=85?'⚠️ Leve':'🔴 CRÍTICA'}</span></td>
    </tr>`;
  }).filter(Boolean);
  if (!rows.length) { area.innerHTML = '<p style="font-size:12px;color:var(--text3)">Completá datos bilaterales de saltos para ver la tabla.</p>'; return; }
  area.innerHTML = `<table class="data-table"><thead><tr><th>Test</th><th>Derecha</th><th>Izquierda</th><th>LSI %</th><th>Asim. %</th><th>Estado</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function saveSaltos() {
  if (!cur) { alert('Seleccioná un atleta'); return; }
  const evalIdx = document.getElementById('saltos-eval-num').value;
  const avg = {};
  SALTOS_DEF.forEach(def => {
    if (def.type === 'bilateral') {
      const v = parseFloat(document.getElementById(def.key+'-avg')?.dataset.val||'');
      if (!isNaN(v) && v) avg[def.key] = v;
    } else {
      const d = parseFloat(document.getElementById(def.key+'-d-avg')?.dataset.val||'');
      const i = parseFloat(document.getElementById(def.key+'-i-avg')?.dataset.val||'');
      if (!isNaN(d) && d) avg[def.key+'D'] = d;
      if (!isNaN(i) && i) avg[def.key+'I'] = i;
    }
  });
  const fecha = document.getElementById('saltos-fecha').value || new Date().toISOString().split('T')[0];
  if (!cur.evals) cur.evals = {};
  cur.evals['saltos_'+evalIdx] = { avg, fecha };
  if (!cur.evalsByDate) cur.evalsByDate = {};
  if (!cur.evalsByDate[fecha]) cur.evalsByDate[fecha] = {};
  cur.evalsByDate[fecha].saltos = avg;
  if (avg.cmj) cur.lastCMJ = avg.cmj;
  atletas = atletas.map(a => a.id===cur.id?cur:a);
  saveData();
  renderProfileHero();
}

// ══════════════════════════════════════════════════════
//  MOVILIDAD
// ══════════════════════════════════════════════════════

function onMov() {
  const ld=+document.getElementById('lunge-d')?.value||0, li=+document.getElementById('lunge-i')?.value||0;
  const riD=+document.getElementById('cad-ri-d')?.value||0, reD=+document.getElementById('cad-re-d')?.value||0;
  const riI=+document.getElementById('cad-ri-i')?.value||0, reI=+document.getElementById('cad-re-i')?.value||0;
  const tromCadD=riD+reD, tromCadI=riI+reI;
  const riHD=+document.getElementById('hom-ri-d')?.value||0, reHD=+document.getElementById('hom-re-d')?.value||0;
  const riHI=+document.getElementById('hom-ri-i')?.value||0, reHI=+document.getElementById('hom-re-i')?.value||0;
  const tromHomD=riHD+reHD, tromHomI=riHI+reHI;
  const semL = v => !v?'':v<35?`<span style="color:var(--red)">🔴 ${v}° -- déficit</span>`:v<=40?`<span style="color:var(--amber)">🟡 ${v}° -- límite</span>`:`<span style="color:var(--neon)">🟢 ${v}° -- normal</span>`;
  let lr = `<div class="flex mt-8" style="gap:12px;flex-wrap:wrap">${ld?semL(ld):''}${li?semL(li):''}</div>`;
  if (ld&&li) { const d=Math.abs(ld-li); lr+=`<div style="font-size:11px;margin-top:6px;color:${d>5?'var(--amber)':'var(--neon)'}">Asimetría: ${d}°${d>5?' ⚠️ >5° significativo':' ✓'}</div>`; }
  document.getElementById('lunge-result').innerHTML = lr;
  const semC = v => v>90?`<span style="color:var(--neon)">🟢 ${v}°</span>`:v>=80?`<span style="color:var(--amber)">🟡 ${v}°</span>`:`<span style="color:var(--red)">🔴 ${v}°</span>`;
  document.getElementById('cad-result').innerHTML = tromCadD||tromCadI?`<div class="flex mt-8" style="gap:12px">${tromCadD?`<div>D: ${semC(tromCadD)}</div>`:''}${tromCadI?`<div>I: ${semC(tromCadI)}</div>`:''}</div>`:'';
  const semH = v => v>120?`<span style="color:var(--neon)">🟢 ${v}°</span>`:v>=100?`<span style="color:var(--amber)">🟡 ${v}°</span>`:`<span style="color:var(--red)">🔴 ${v}°</span>`;
  const gird = tromHomD&&tromHomI?Math.abs(tromHomD-tromHomI):null;
  document.getElementById('hom-result').innerHTML = (tromHomD||tromHomI)?`<div class="flex mt-8" style="gap:12px">${tromHomD?`<div>D: ${semH(tromHomD)}</div>`:''}${tromHomI?`<div>I: ${semH(tromHomI)}</div>`:''}</div>${gird!==null?`<div style="font-size:11px;margin-top:6px;color:${gird>=18?'var(--red)':'var(--neon)'}">GIRD: ${gird}°${gird>=18?' ⚠️ Significativo (≥18°)':' ✓ Normal'}</div>`:''}`:'';
  drawGauge('g-ld',ld,0,60,'lunge'); drawGauge('g-li',li,0,60,'lunge');
  drawGauge('g-tcd',tromCadD,0,120,'trom'); drawGauge('g-tci',tromCadI,0,120,'trom');
  const colors = { ld:ld<35?'var(--red)':ld<=40?'var(--amber)':'var(--neon)', li:li<35?'var(--red)':li<=40?'var(--amber)':'var(--neon)',
    tcd:tromCadD<80?'var(--red)':tromCadD<90?'var(--amber)':'var(--neon)', tci:tromCadI<80?'var(--red)':tromCadI<90?'var(--amber)':'var(--neon)' };
  if (ld) { const e=document.getElementById('gv-ld'); if(e){e.textContent=ld;e.style.color=colors.ld;} }
  if (li) { const e=document.getElementById('gv-li'); if(e){e.textContent=li;e.style.color=colors.li;} }
  if (tromCadD) { const e=document.getElementById('gv-tcd'); if(e){e.textContent=tromCadD;e.style.color=colors.tcd;} }
  if (tromCadI) { const e=document.getElementById('gv-tci'); if(e){e.textContent=tromCadI;e.style.color=colors.tci;} }
  if (cur) { cur.lungeD=ld;cur.lungeI=li;cur.tromCadD=tromCadD;cur.tromCadI=tromCadI;cur.tromHomD=tromHomD;cur.tromHomI=tromHomI; }
  renderMovSemaforos(ld,li,tromCadD,tromCadI,tromHomD,tromHomI);
}

function renderMovSemaforos(ld,li,tcd,tci,thd,thi) {
  const area = document.getElementById('mov-semaforos'); if (!area) return;
  const items = [
    { lbl:'Lunge D',     val:ld,  t1:35, t2:40,  max:60,  unit:'°', c:'var(--neon)' },
    { lbl:'Lunge I',     val:li,  t1:35, t2:40,  max:60,  unit:'°', c:'var(--blue)'  },
    { lbl:'TROM Cad D',  val:tcd, t1:80, t2:90,  max:120, unit:'°', c:'var(--neon)' },
    { lbl:'TROM Cad I',  val:tci, t1:80, t2:90,  max:120, unit:'°', c:'var(--blue)'  },
    { lbl:'TROM Hom D',  val:thd, t1:100,t2:120, max:150, unit:'°', c:'var(--neon)' },
    { lbl:'TROM Hom I',  val:thi, t1:100,t2:120, max:150, unit:'°', c:'var(--blue)'  }
  ];
  area.innerHTML = items.map(item => {
    if (!item.val) return `<div class="card mb-8"><div class="card-body" style="padding:10px 14px"><div style="font-size:11px;font-weight:700;color:var(--text3)">${item.lbl}: --</div></div></div>`;
    const c = item.val<item.t1?'var(--red)':item.val<item.t2?'var(--amber)':'var(--neon)';
    const pct = Math.min(100, item.val/item.max*100);
    const st = item.val<item.t1?'🔴 Déficit':item.val<item.t2?'🟡 Límite':'🟢 Normal';
    return `<div class="card mb-8" style="border-color:${c}44">
      <div class="card-body" style="padding:10px 14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:11px;font-weight:700">${item.lbl}</span>
          <span style="font-family:var(--mono);font-size:18px;font-weight:800;color:${c}">${item.val}${item.unit}</span>
        </div>
        <div class="prog-wrap"><div class="prog-bar" style="width:${pct.toFixed(0)}%;background:${c}"></div></div>
        <div style="font-size:10px;color:${c};margin-top:4px">${st}</div>
      </div>
    </div>`;
  }).join('');
}

function drawMovRadar(ld,li,tcd,tci,thd,thi) {
  const scores=[Math.min(100,ld/60*100),Math.min(100,li/60*100),Math.min(100,tcd/120*100),Math.min(100,tci/120*100),Math.min(100,thd/150*100),Math.min(100,thi/150*100)];
  const ideal=[67,67,75,75,80,80];
  const ctx=document.getElementById('mov-radar'); if(!ctx)return;
  if(movRadarChart)movRadarChart.destroy();
  movRadarChart=new Chart(ctx,{type:'radar',
    data:{labels:['Lunge D','Lunge I','TROM Cad D','TROM Cad I','TROM Hom D','TROM Hom I'],datasets:[
      {label:'Óptimo',data:ideal,backgroundColor:'rgba(77,158,255,.06)',borderColor:'rgba(77,158,255,.3)',borderWidth:1.5,pointRadius:2},
      {label:'Actual',data:scores,backgroundColor:'rgba(57,255,122,.1)',borderColor:'rgba(57,255,122,.7)',borderWidth:2,pointRadius:4,pointBackgroundColor:'#39FF7A'}
    ]},
    options:{responsive:true,plugins:{legend:{display:false}},
      scales:{r:{beginAtZero:true,max:100,grid:{color:'rgba(255,255,255,.04)'},angleLines:{color:'rgba(255,255,255,.04)'},pointLabels:{color:'#555',font:{size:9}},ticks:{display:false}}}}
  });
}

function drawGauge(id,value,min,max,type){
  const c=document.getElementById(id); if(!c)return;
  const ctx=c.getContext('2d'); const W=c.width,H=c.height;
  ctx.clearRect(0,0,W,H); const cx=W/2,cy=H-6,r=Math.min(W*.44,H*.84);
  const st=Math.PI,en=2*Math.PI;
  let zones;
  if(type==='lunge') zones=[{t:35/60,c:'rgba(255,68,68,.4)'},{t:40/60,c:'rgba(255,176,32,.4)'},{t:1,c:'rgba(57,255,122,.4)'}];
  else zones=[{t:80/120,c:'rgba(255,68,68,.4)'},{t:90/120,c:'rgba(255,176,32,.4)'},{t:1,c:'rgba(57,255,122,.4)'}];
  let prev=st;
  zones.forEach(z=>{const ang=st+z.t*(en-st);ctx.beginPath();ctx.arc(cx,cy,r,prev,ang);ctx.lineWidth=10;ctx.strokeStyle=z.c;ctx.stroke();prev=ang;});
  if(value>0){
    const norm=Math.max(0,Math.min(1,(value-min)/(max-min)));const ang=st+norm*(en-st);
    const nc=type==='lunge'?(value<35?'#FF4444':value<=40?'#FFB020':'#39FF7A'):(value<80?'#FF4444':value<90?'#FFB020':'#39FF7A');
    ctx.beginPath();ctx.moveTo(cx-Math.cos(ang)*6,cy-Math.sin(ang)*6);ctx.lineTo(cx+Math.cos(ang)*(r*.82),cy+Math.sin(ang)*(r*.82));
    ctx.lineWidth=2;ctx.strokeStyle=nc;ctx.lineCap='round';ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,4,0,Math.PI*2);ctx.fillStyle=nc;ctx.fill();
  }
}

function redrawGauges(){
  const ld=+document.getElementById('lunge-d')?.value||0,li=+document.getElementById('lunge-i')?.value||0;
  const riD=+document.getElementById('cad-ri-d')?.value||0,reD=+document.getElementById('cad-re-d')?.value||0;
  const riI=+document.getElementById('cad-ri-i')?.value||0,reI=+document.getElementById('cad-re-i')?.value||0;
  drawGauge('g-ld',ld,0,60,'lunge'); drawGauge('g-li',li,0,60,'lunge');
  drawGauge('g-tcd',riD+reD,0,120,'trom'); drawGauge('g-tci',riI+reI,0,120,'trom');
}

function saveMov(){
  if(!cur)return;
  const evalIdx=document.getElementById('mov-eval-num').value;
  const ld=+document.getElementById('lunge-d')?.value||null,li=+document.getElementById('lunge-i')?.value||null;
  const riD=+document.getElementById('cad-ri-d')?.value||0,reD=+document.getElementById('cad-re-d')?.value||0;
  const riI=+document.getElementById('cad-ri-i')?.value||0,reI=+document.getElementById('cad-re-i')?.value||0;
  const riHD=+document.getElementById('hom-ri-d')?.value||0,reHD=+document.getElementById('hom-re-d')?.value||0;
  const riHI=+document.getElementById('hom-ri-i')?.value||0,reHI=+document.getElementById('hom-re-i')?.value||0;
  const fecha=new Date().toISOString().split('T')[0];
  const movData={lungeD:ld,lungeI:li,tromCadD:riD+reD||null,tromCadI:riI+reI||null,tromHomD:riHD+reHD||null,tromHomI:riHI+reHI||null,fecha};
  if(!cur.evals)cur.evals={};
  cur.evals['mov_'+evalIdx]=movData;
  if(!cur.evalsByDate)cur.evalsByDate={};
  if(!cur.evalsByDate[fecha])cur.evalsByDate[fecha]={};
  cur.evalsByDate[fecha].movilidad=movData;
  cur.lungeD=ld;cur.lungeI=li;cur.tromCadD=riD+reD;cur.tromCadI=riI+reI;cur.tromHomD=riHD+reHD;cur.tromHomI=riHI+reHI;
  atletas=atletas.map(a=>a.id===cur.id?cur:a);saveData();
}

// ══════════════════════════════════════════════════════
//  VELOCIDAD / SPRINT
// ══════════════════════════════════════════════════════

function calcSprintBench(){
  const sp10=+document.getElementById('sp-10')?.value||0;
  const sp30=+document.getElementById('sp-30')?.value||0;
  const d505=+document.getElementById('sp-505d')?.value||0,i505=+document.getElementById('sp-505i')?.value||0;
  if(d505&&i505){const a=Math.abs(d505-i505)/Math.max(d505,i505)*100;const c=a>10?'var(--red)':a>5?'var(--amber)':'var(--neon)';document.getElementById('sp-505-asim').innerHTML=`<div style="margin-top:8px;font-size:12px;color:${c}">Asimetría 505: ${a.toFixed(1)}% ${a>10?'🔴':a>5?'⚠️':'✓'}</div>`;}
  const area=document.getElementById('sprint-bench-area'); if(!cur||!area)return;
  const deporte=cur.deporte||'',puesto=cur.puesto||'';
  const rd=RUGBY[puesto];
  const norms=SPRINT_NORMS[deporte]?.[rd?.tipo||'general']||SPRINT_NORMS[deporte]?.general;
  if(!norms){area.innerHTML='<div class="card"><div class="card-body" style="font-size:12px;color:var(--text3)">Sin benchmarks para este deporte. Disponibles: Rugby, Fútbol, Básquet.</div></div>';return;}
  const cats=['Amateur','Competitivo','Elite'];
  let html=`<div class="card"><div class="card-header"><h3>Benchmark -- ${deporte}${puesto?' · '+puesto:''}</h3></div><div class="card-body">`;
  if(sp10&&norms.sp10){
    html+=`<div class="mb-12"><div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:8px;font-family:var(--mono);text-transform:uppercase">10m Sprint · ${sp10}s</div>`;
    norms.sp10.forEach((ref,i)=>{const delta=(sp10-ref).toFixed(2);const b=sp10<=ref;const c=b?'var(--neon)':i===2?'var(--red)':'var(--amber)';html+=`<div class="flex-b mb-4"><span style="font-size:11px;color:var(--text2)">${cats[i]}: ${ref}s</span><span style="font-family:var(--mono);color:${c};font-size:11px;font-weight:700">${b?'✓ ':'+'}${delta}s</span></div><div class="prog-wrap"><div class="prog-bar" style="width:${Math.min(100,ref/sp10*100).toFixed(0)}%;background:${c}"></div></div>`;});
    const eliteRef=norms.sp10[2];
    html+=`<div style="margin-top:8px;padding:10px;background:var(--bg4);border-radius:var(--r);border:1px solid var(--border)"><div style="font-size:11px;font-weight:700;margin-bottom:4px">${sp10<=eliteRef?'✅ Supera el estándar elite':'Distancia al nivel elite'}</div><div style="font-family:var(--mono);color:${sp10<=eliteRef?'var(--neon)':'var(--amber)'};font-size:20px;font-weight:800">${sp10<=eliteRef?'−':'+'} ${Math.abs(sp10-eliteRef).toFixed(2)}s</div></div></div>`;
  }
  html+='</div></div>';area.innerHTML=html;
}

function saveSprint(){
  if(!cur)return;
  const evalIdx=document.getElementById('sprint-eval-num').value;
  const fecha=document.getElementById('sprint-fecha').value||new Date().toISOString().split('T')[0];
  if(!cur.evals)cur.evals={};
  cur.evals['sprint_'+evalIdx]={sp10:+document.getElementById('sp-10').value||null,sp20:+document.getElementById('sp-20').value||null,sp30:+document.getElementById('sp-30').value||null,vmax:+document.getElementById('sp-vmax').value||null,ttest:+document.getElementById('sp-ttest').value||null,d505:+document.getElementById('sp-505d').value||null,i505:+document.getElementById('sp-505i').value||null,fecha};
  atletas=atletas.map(a=>a.id===cur.id?cur:a);saveData();
}

// ══════════════════════════════════════════════════════
//  FMS -- CALIDAD DE MOVIMIENTO
// ══════════════════════════════════════════════════════

function loadSlot(input,slotId){
  if(!input.files.length)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const slot=document.getElementById(slotId); if(!slot)return;
    let img=slot.querySelector('img');
    if(!img){img=document.createElement('img');slot.appendChild(img);}
    img.src=e.target.result;img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit';
    slot.style.border='1px solid var(--neon)';
    const txt=slot.querySelector('div');if(txt)txt.style.display='none';
  };
  reader.readAsDataURL(input.files[0]);
}

function setFMS(btn,type){
  btn.parentElement.querySelectorAll('.fms-btn').forEach(b=>{b.classList.remove('yes','no');});
  btn.classList.add(type);
  ['ohs','sd'].forEach(id=>{
    const container=document.getElementById(id+'-checks');if(!container)return;
    const yesCount=container.querySelectorAll('.fms-btn.yes').length;
    const total=container.querySelectorAll('.fms-check').length;
    const scored=[...container.querySelectorAll('.fms-check')].filter(r=>r.querySelector('.fms-btn.yes')||r.querySelector('.fms-btn.no')).length;
    const scoreEl=document.getElementById(id+'-score');
    if(scoreEl&&scored>0){
      const pct=(yesCount/total*100).toFixed(0);
      const c=+pct>=80?'var(--neon)':+pct>=50?'var(--amber)':'var(--red)';
      scoreEl.innerHTML=`<div style="display:flex;align-items:center;gap:10px;padding:10px;background:${c}11;border:1px solid ${c}33;border-radius:var(--r)"><div style="font-family:var(--mono);font-size:22px;font-weight:800;color:${c}">${yesCount}/${total}</div><div style="font-size:12px;color:${c};font-weight:700">${+pct>=80?'✅ Buena calidad':+pct>=50?'⚠️ Compensaciones':'🔴 Déficits significativos'}</div></div>`;
    }
  });
}

function calcValgo(){
  const d=+document.getElementById('valgo-d')?.value||0,i=+document.getElementById('valgo-i')?.value||0;
  const el=document.getElementById('valgo-result');if(!el)return;
  const parts=[];
  if(d)parts.push(`D: <b style="color:${d>10?'var(--red)':'var(--neon)'}">${d}°</b> ${d>10?'⚠️ >10°':''}`);
  if(i)parts.push(`I: <b style="color:${i>10?'var(--red)':'var(--neon)'}">${i}°</b> ${i>10?'⚠️ >10°':''}`);
  el.innerHTML=`<div style="font-size:12px;margin-top:8px">${parts.join(' · ')}</div>`;
}

function saveFMS(){
  if(!cur)return;
  const ohsCriterios=[...document.getElementById('ohs-checks')?.querySelectorAll('.fms-btn.yes,.fms-btn.no')||[]].map(b=>b.classList.contains('yes')?'si':'no');
  const sdCriterios=[...document.getElementById('sd-checks')?.querySelectorAll('.fms-btn.yes,.fms-btn.no')||[]].map(b=>b.classList.contains('yes')?'si':'no');
  const fecha=new Date().toISOString().split('T')[0];
  if(!cur.evals)cur.evals={};
  cur.evals['fms_'+fecha]={fecha,ohs:{criterios:ohsCriterios,obs:document.getElementById('ohs-obs')?.value},sd:{criterios:sdCriterios,valgoD:+document.getElementById('valgo-d')?.value||0,valgoI:+document.getElementById('valgo-i')?.value||0,obs:document.getElementById('sd-obs')?.value}};
  atletas=atletas.map(a=>a.id===cur.id?cur:a);saveData();
}

// ══════════════════════════════════════════════════════
//  FATIGA
// ══════════════════════════════════════════════════════

function buildHooperFields(){
  const c=document.getElementById('hooper-fields');if(!c||c.innerHTML)return;
  const items=[['fat-h-sueno','Calidad del sueño'],['fat-h-estres','Nivel de estrés'],['fat-h-fatiga','Fatiga general'],['fat-h-doms','Dolor muscular (DOMS)']];
  items.forEach(([id,lbl])=>{
    c.innerHTML+=`<div style="margin-bottom:16px">
      <div class="flex-b" style="margin-bottom:6px"><span style="font-size:12px;font-weight:600">${lbl}</span><span id="${id}-val" style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--neon)">4</span></div>
      <input class="hooper-slider" type="range" min="1" max="7" value="4" id="${id}" oninput="document.getElementById('${id}-val').textContent=this.value;calcFatiga()">
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);font-family:var(--mono)"><span>1 Muy bueno</span><span>7 Muy malo</span></div>
    </div>`;
  });
  c.innerHTML+=`<div style="background:var(--bg4);border:1px solid var(--border);border-radius:var(--r);padding:12px;text-align:center;margin-top:4px">
    <div class="il mb-4">Índice de Hooper</div>
    <div id="hooper-total" style="font-family:var(--mono);font-size:28px;font-weight:800;color:var(--neon)">16</div>
    <div id="hooper-status" style="font-size:11px;color:var(--text2);margin-top:4px">--</div>
  </div>`;
}

function calcFatiga(){
  const ids=['fat-h-sueno','fat-h-estres','fat-h-fatiga','fat-h-doms'];
  const vals=ids.map(id=>+document.getElementById(id)?.value||4);
  const total=vals.reduce((a,b)=>a+b,0);
  const hc=total<=12?'var(--neon)':total<=19?'var(--amber)':'var(--red)';
  const el=document.getElementById('hooper-total'),st=document.getElementById('hooper-status');
  if(el){el.textContent=total;el.style.color=hc;}
  if(st)st.textContent=total<=12?'✅ Estado óptimo':total<=16?'🟡 Fatiga moderada':total<=19?'🟠 Fatiga alta':'🔴 Sobrecarga severa';
  const hrv=+document.getElementById('fat-hrv')?.value||0,base=+document.getElementById('fat-hrv-base')?.value||0;
  const hrvEl=document.getElementById('hrv-result');
  if(hrv&&base&&hrvEl){const pct=((hrv-base)/base*100).toFixed(1);const c=+pct>=-5?'var(--neon)':+pct>=-10?'var(--amber)':'var(--red)';hrvEl.innerHTML=`<div style="font-size:12px;color:${c};margin-top:6px;font-family:var(--mono)">${pct}% vs basal ${+pct>=-5?'✅ Recuperado':+pct>=-10?'⚠️ Reducido':'🔴 Suprimido'}</div>`;}
  const vmax=+document.getElementById('fat-vmax')?.value||0,vfin=+document.getElementById('fat-vfin')?.value||0;
  const velEl=document.getElementById('fat-vel-result');
  if(vmax&&vfin&&velEl){const loss=((vmax-vfin)/vmax*100).toFixed(1);const c=+loss<=20?'var(--neon)':+loss<=30?'var(--amber)':'var(--red)';velEl.innerHTML=`<div style="font-size:12px;color:${c};margin-top:6px">Pérdida: <span style="font-family:var(--mono);font-weight:700">${loss}%</span> ${+loss<=20?'✅ ≤20%':+loss<=30?'⚠️ 20-30%':'🔴 >30%'}</div>`;}
  let score=100;score-=(total-4)*3.5;
  if(hrv&&base){const p=(hrv-base)/base*100;if(p<-10)score-=20;else if(p<-5)score-=10;}
  if(vmax&&vfin){const l=(vmax-vfin)/vmax*100;if(l>30)score-=20;else if(l>20)score-=10;}
  score=Math.max(0,Math.min(100,Math.round(score)));
  const circ=document.getElementById('fat-ring-circle'),sc=document.getElementById('fat-score'),lb=document.getElementById('fat-label'),rc=document.getElementById('fat-rec');
  const rc_=score>=80?'var(--neon)':score>=60?'var(--amber)':'var(--red)';
  if(circ){circ.style.strokeDashoffset=238.8*(1-score/100);circ.style.stroke=rc_;}
  if(sc){sc.textContent=score;sc.style.color=rc_;}
  if(lb){lb.textContent=score>=80?'✅ Listo para entrenar':score>=60?'⚠️ Precaución':'🔴 Recuperación';lb.style.color=rc_;}
  if(rc)rc.textContent=score>=80?'Podés realizar la sesión planificada.':score>=60?'Reducí volumen un 20-30%. Priorizá técnica.':'Descanso activo. No entrenamiento intenso hoy.';
}

function saveFatiga(){
  if(!cur){alert('Seleccioná un atleta');return;}
  const fecha=document.getElementById('fat-fecha').value||new Date().toISOString().split('T')[0];
  const hooper=['fat-h-sueno','fat-h-estres','fat-h-fatiga','fat-h-doms'].map(id=>+document.getElementById(id)?.value||4);
  if(!cur.evals)cur.evals={};
  cur.evals['fatiga_'+fecha]={hooper,hrv:+document.getElementById('fat-hrv')?.value||null,hrvBase:+document.getElementById('fat-hrv-base')?.value||null,fecha};
  atletas=atletas.map(a=>a.id===cur.id?cur:a);saveData();
}

// ══════════════════════════════════════════════════════
//  KINESIO MODULE
// ══════════════════════════════════════════════════════

function initKinesio(){
  if(!cur)return;
  kineState=cur.kinesio?JSON.parse(JSON.stringify(cur.kinesio)):{bodyZones:{},tests:{},form:{}};
  // Wire up all body zones
  document.querySelectorAll('.body-zone').forEach(el=>{
    el.onclick=null;
    el.addEventListener('click',()=>onBodyZoneClick(el));
    const zid=el.dataset.zone;
    el.classList.remove('lesionada','recuperado');
    if(kineState.bodyZones[zid]){
      el.classList.add(kineState.bodyZones[zid].recuperado?'recuperado':'lesionada');
    }
  });
  // Build test panels
  buildOrthoPanels();
  renderBodyZonesList();
  restoreKineForm();
  updateEVA();
  setBodyView('front');
  if(!document.getElementById('kine-fecha').value){document.getElementById('kine-fecha').value=new Date().toISOString().split('T')[0];}
}

function buildOrthoPanels(){
  buildOrthoPanel('tp-subacro',   ORTHO_TESTS.subacro);
  buildOrthoPanel('tp-manguito',  ORTHO_TESTS.manguito);
  buildOrthoPanel('tp-biceps',    ORTHO_TESTS.biceps);
  buildOrthoPanel('tp-ligamentos',ORTHO_TESTS.ligamentos);
  buildOrthoPanel('tp-meniscos',  ORTHO_TESTS.meniscos);
  buildOrthoPanel('tp-funcionales',ORTHO_TESTS.funcionales);
  buildOrthoPanel('tp-tobillo',   ORTHO_TESTS.tobillo);
  buildOrthoPanel('tp-lumbar',    ORTHO_TESTS.lumbar);
  buildOrthoPanel('tp-cadera',    ORTHO_TESTS.cadera);
  // ROM panels
  buildROMPanel('tp-rom-hombro',  [['Flexión','flex-hb'],['Extensión','ext-hb'],['Abducción','abd-hb'],['RI','ri-hb'],['RE','re-hb'],['Aducción H.','aducc-hb']]);
  buildROMPanel('tp-rom-rodilla', [['Flexión','flex-rod'],['Extensión','ext-rod']],true);
  buildROMPanel('tp-rom-tobillo', [['Dorsiflexión','df-tob'],['Flex. plantar','fp-tob'],['Inversión','inv-tob'],['Eversión','ev-tob']]);
  buildROMPanel('tp-rom-cadera',  [['Flexión','flex-cad'],['Extensión','ext-cad'],['RI','ri-cad'],['RE','re-cad'],['Abducción','abd-cad'],['Aducción','aduc-cad']]);
  buildROMColPanel();
}

function buildOrthoPanel(containerId,tests){
  const el=document.getElementById(containerId); if(!el||el.innerHTML)return;
  el.innerHTML=tests.map(t=>`
    <div class="ortho-test" id="ortho-row-${t.id}">
      <div style="flex:1">
        <div class="ortho-name">${t.name}</div>
        <div class="ortho-sub">${t.sub}</div>
        <div class="ortho-ref">${t.ref}</div>
      </div>
      <div class="ortho-btns">
        <button class="ot-btn" id="otb-pos-${t.id}" onclick="setOrthoTest('${t.id}','pos')">+ POS</button>
        <button class="ot-btn" id="otb-neg-${t.id}" onclick="setOrthoTest('${t.id}','neg')">- NEG</button>
      </div>
    </div>
    <div class="ortho-obs-row" id="ortho-obs-${t.id}">
      <input class="inp" placeholder="Observaciones (lado, grado, dolor...)" style="font-size:11px;padding:5px 8px" id="ortho-obs-inp-${t.id}" oninput="if(kineState.tests['${t.id}'])kineState.tests['${t.id}'].obs=this.value">
    </div>`).join('');
  // Restore saved states
  tests.forEach(t=>{
    if(kineState.tests[t.id]?.result){
      const r=kineState.tests[t.id].result;
      document.getElementById('otb-'+r+'-'+t.id)?.classList.add(r);
      const obs=document.getElementById('ortho-obs-'+t.id);if(obs)obs.classList.add('visible');
      const obsInp=document.getElementById('ortho-obs-inp-'+t.id);if(obsInp&&kineState.tests[t.id].obs)obsInp.value=kineState.tests[t.id].obs;
    }
  });
}

function buildROMPanel(containerId,fields,hasValgo=false){
  const el=document.getElementById(containerId);if(!el||el.innerHTML)return;
  el.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
    ${fields.map(([label,id])=>`
    <div>
      <div class="il mb-4" style="margin-bottom:3px">${label}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        <input class="inp inp-mono" type="number" id="rom-act-${id}" placeholder="Act°" style="font-size:11px;padding:5px">
        <input class="inp inp-mono" type="number" id="rom-pas-${id}" placeholder="Pas°" style="font-size:11px;padding:5px">
      </div>
    </div>`).join('')}
  </div>
  <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);font-family:var(--mono);margin-top:6px;padding:4px 6px;background:var(--bg4);border-radius:4px">
    <span>Activo (Act)</span><span>Pasivo (Pas)</span>
  </div>
  ${hasValgo?`<div class="ig mt-8"><label class="il">Valgo dinámico Step-Down D/I</label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <input class="inp inp-mono" type="number" id="valgo-rod-d" placeholder="D (°)" oninput="checkValgoRod()">
      <input class="inp inp-mono" type="number" id="valgo-rod-i" placeholder="I (°)" oninput="checkValgoRod()">
    </div>
    <div id="valgo-rod-result" style="font-size:11px;margin-top:4px"></div>
  </div>`:''}`;
}

function buildROMColPanel(){
  const el=document.getElementById('tp-rom-columna');if(!el||el.innerHTML)return;
  const fields=[['Flexión (Schober)','flex-col'],['Extensión','ext-col'],['Flex. lat. D','flatd-col'],['Flex. lat. I','flati-col'],['Rotación D','rotd-col'],['Rotación I','roti-col']];
  el.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
    ${fields.map(([label,id])=>`
    <div>
      <div class="il mb-4" style="margin-bottom:3px">${label}</div>
      <input class="inp inp-mono" type="number" id="rom-act-${id}" placeholder="°" style="font-size:11px;padding:5px;width:100%">
    </div>`).join('')}
  </div>`;
}

function checkValgoRod(){
  const d=+document.getElementById('valgo-rod-d')?.value||0,i=+document.getElementById('valgo-rod-i')?.value||0;
  const el=document.getElementById('valgo-rod-result');if(!el)return;
  const parts=[];
  if(d)parts.push(`D: <b style="color:${d>10?'var(--red)':'var(--neon)'}">${d}°</b>${d>10?' ⚠️>10°':''}`);
  if(i)parts.push(`I: <b style="color:${i>10?'var(--red)':'var(--neon)'}">${i}°</b>${i>10?' ⚠️>10°':''}`);
  el.innerHTML=parts.join(' · ');
}

function setOrthoTest(id,result){
  if(!kineState.tests[id])kineState.tests[id]={};
  if(kineState.tests[id].result===result){
    kineState.tests[id].result=null;
    document.getElementById('otb-pos-'+id)?.classList.remove('pos');
    document.getElementById('otb-neg-'+id)?.classList.remove('neg');
    document.getElementById('ortho-obs-'+id)?.classList.remove('visible');
    const row=document.getElementById('ortho-row-'+id);if(row)row.style.background='';
  }else{
    kineState.tests[id].result=result;
    document.getElementById('otb-pos-'+id)?.classList.toggle('pos',result==='pos');
    document.getElementById('otb-neg-'+id)?.classList.toggle('neg',result==='neg');
    document.getElementById('ortho-obs-'+id)?.classList.add('visible');
    const row=document.getElementById('ortho-row-'+id);
    if(row)row.style.background=result==='pos'?'rgba(255,68,68,.06)':'rgba(57,255,122,.04)';
  }
  updateKinePositivos();
}

function updateKinePositivos(){
  const allTests=[...ORTHO_TESTS.subacro,...ORTHO_TESTS.manguito,...ORTHO_TESTS.biceps,...ORTHO_TESTS.ligamentos,...ORTHO_TESTS.meniscos,...ORTHO_TESTS.funcionales,...ORTHO_TESTS.tobillo,...ORTHO_TESTS.lumbar,...ORTHO_TESTS.cadera];
  const positivos=Object.entries(kineState.tests).filter(([,v])=>v.result==='pos').map(([id,v])=>{
    const t=allTests.find(x=>x.id===id);return t?{name:t.name,sub:t.sub,obs:v.obs}:null;
  }).filter(Boolean);
  const card=document.getElementById('kine-positivos-card'),list=document.getElementById('kine-positivos-list');
  if(!card||!list)return;
  if(positivos.length){
    card.style.display='block';
    list.innerHTML=positivos.map(p=>`
      <div style="padding:6px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div><span style="font-size:12px;font-weight:700;color:var(--red)">+ ${p.name}</span><span style="font-size:11px;color:var(--text2);margin-left:8px">${p.sub}</span>${p.obs?`<div style="font-size:10px;color:var(--text3);margin-top:2px">${p.obs}</div>`:''}</div>
        <span class="tag tag-r">POSITIVO</span>
      </div>`).join('');
  }else card.style.display='none';
}

function onBodyZoneClick(el){
  const zid=el.dataset.zone,zlabel=el.dataset.label,panel=el.dataset.panel;
  if(kineState.bodyZones[zid]&&!kineState.bodyZones[zid].recuperado){
    kineState.bodyZones[zid].recuperado=true;
    el.classList.remove('lesionada');el.classList.add('recuperado');
  }else if(kineState.bodyZones[zid]?.recuperado){
    delete kineState.bodyZones[zid];
    el.classList.remove('lesionada','recuperado');
  }else{
    kineState.bodyZones[zid]={label:zlabel,eva:0,recuperado:false};
    el.classList.add('lesionada');
    if(panel)showKinePanel(panel,zlabel);
  }
  renderBodyZonesList();
  updateEVA();
}

function showKinePanel(panel,label){
  document.querySelectorAll('.kine-panel').forEach(p=>p.classList.add('hidden'));
  const el=document.getElementById('tests-panel-'+panel);
  if(el){el.classList.remove('hidden');document.getElementById('kine-zona-label').textContent=label+' -- Tests activos';el.scrollIntoView({behavior:'smooth',block:'start'});}
}

function renderBodyZonesList(){
  const el=document.getElementById('body-zones-list');if(!el)return;
  const zones=Object.entries(kineState.bodyZones);
  if(!zones.length){el.innerHTML='<div style="font-size:9px;color:var(--text3);font-family:var(--mono);text-align:center">Sin zonas marcadas</div>';return;}
  el.innerHTML='<div style="display:flex;flex-wrap:wrap;justify-content:center">'+
    zones.map(([zid,z])=>`<span class="zone-chip ${z.recuperado?'recup':'lesion'}" onclick="onBodyZoneClick(document.getElementById('z-${zid}'))">
      ${z.recuperado?'✓':'🔴'} ${z.label}
      ${!z.recuperado?`<span style="font-size:8px;text-decoration:underline;cursor:pointer" onclick="event.stopPropagation();showKinePanel('${document.getElementById('z-'+zid)?.dataset?.panel||''}','${z.label}')">TESTS</span>`:'<span style="font-size:8px">RECUPERADO</span>'}
    </span>`).join('')+'</div>';
}

function setBodyView(view){
  document.getElementById('body-front').style.display=view==='front'?'flex':'none';
  document.getElementById('body-back').style.display=view==='back'?'flex':'none';
  document.getElementById('btn-front').className='btn btn-sm '+(view==='front'?'btn-neon':'btn-ghost');
  document.getElementById('btn-back').className='btn btn-sm '+(view==='back'?'btn-neon':'btn-ghost');
}

function updateEVA(){
  const val=+document.getElementById('kine-eva')?.value||0;
  const el=document.getElementById('eva-val');const lbl=document.getElementById('eva-label');
  const labels=['Sin dolor','Muy leve','Leve','Molesto','Moderado','Significativo','Intenso','Muy intenso','Severo','Muy severo','Insoportable'];
  if(el){el.textContent=val;el.className='eva-display '+(val<=3?'eva-0-3':val<=6?'eva-4-6':'eva-7-10');}
  if(lbl)lbl.textContent=labels[val]||'';
  // Update last zone EVA
  const lastZone=Object.keys(kineState.bodyZones).slice(-1)[0];
  if(lastZone&&kineState.bodyZones[lastZone])kineState.bodyZones[lastZone].eva=val;
}

function setKineTrat(val){
  document.getElementById('kine-trat-si').classList.toggle('yes',val==='si');
  document.getElementById('kine-trat-no').classList.toggle('yes',val==='no');
  if(!kineState.form)kineState.form={};
  kineState.form.tratPrevio=val;
}

function toggleEstudio(e){
  const btn=document.getElementById('est-'+e);if(!btn)return;
  btn.classList.toggle('yes');
  if(!kineState.form)kineState.form={};
  if(!kineState.form.estudios)kineState.form.estudios=[];
  const idx=kineState.form.estudios.indexOf(e);
  if(idx===-1)kineState.form.estudios.push(e);
  else kineState.form.estudios.splice(idx,1);
}

function restoreKineForm(){
  const f=kineState.form||{};
  const fields={'kine-motivo':'motivo','kine-mecanismo':'mecanismo','kine-medico':'medico','kine-dx':'dx','kine-trat-cual':'trat_cual','kine-deporte-prev':'deporte_prev','kine-act-actual':'act_actual','kine-frec':'frec','kine-horas':'horas','kine-obj-det':'obj_det','kine-antec-obs':'antec_obs','kine-dolor-mov':'dolor_mov'};
  Object.entries(fields).forEach(([id,key])=>{const el=document.getElementById(id);if(el&&f[key])el.value=f[key];});
  if(f.eva!==undefined){const e=document.getElementById('kine-eva');if(e){e.value=f.eva;updateEVA();}}
  if(f.estudios)f.estudios.forEach(e=>{const btn=document.getElementById('est-'+e);if(btn)btn.classList.add('yes');});
  if(f.tratPrevio)setKineTrat(f.tratPrevio);
  if(f.antecedentes)f.antecedentes.forEach(a=>{const cb=document.querySelector(`.kine-antec[value="${a}"]`);if(cb)cb.checked=true;});
  if(f.objetivos)f.objetivos.forEach(o=>{const cb=document.querySelector(`.kine-objetivo[value="${o}"]`);if(cb)cb.checked=true;});
}

function saveKinesio(){
  if(!cur){alert('Seleccioná un atleta');return;}
  const form=kineState.form||{};
  const textFields={'kine-motivo':'motivo','kine-mecanismo':'mecanismo','kine-medico':'medico','kine-dx':'dx','kine-trat-cual':'trat_cual','kine-deporte-prev':'deporte_prev','kine-act-actual':'act_actual','kine-frec':'frec','kine-horas':'horas','kine-obj-det':'obj_det','kine-antec-obs':'antec_obs','kine-dolor-mov':'dolor_mov'};
  Object.entries(textFields).forEach(([id,key])=>{const el=document.getElementById(id);if(el)form[key]=el.value;});
  form.eva=+document.getElementById('kine-eva')?.value||0;
  form.antecedentes=[...document.querySelectorAll('.kine-antec:checked')].map(cb=>cb.value);
  form.objetivos=[...document.querySelectorAll('.kine-objetivo:checked')].map(cb=>cb.value);
  form.fecha=document.getElementById('kine-fecha')?.value;
  kineState.form=form;
  cur.kinesio=JSON.parse(JSON.stringify(kineState));
  const allTests=[...ORTHO_TESTS.subacro,...ORTHO_TESTS.manguito,...ORTHO_TESTS.biceps,...ORTHO_TESTS.ligamentos,...ORTHO_TESTS.meniscos,...ORTHO_TESTS.funcionales,...ORTHO_TESTS.tobillo,...ORTHO_TESTS.lumbar,...ORTHO_TESTS.cadera];
  if(!cur.evals)cur.evals={};
  cur.evals['kinesio_'+(form.fecha||Date.now())]={fecha:form.fecha,motivo:form.motivo,eva:form.eva,zonas:Object.fromEntries(Object.entries(kineState.bodyZones).filter(([,v])=>!v.recuperado)),testsPositivos:Object.entries(kineState.tests).filter(([,v])=>v.result==='pos').map(([id])=>{const t=allTests.find(x=>x.id===id);return t?t.name:id;}),dx:form.dx};
  cur.lesionesActivas=Object.entries(kineState.bodyZones).filter(([,v])=>!v.recuperado).map(([,v])=>v.label);
  if(cur.lesionesActivas.length)cur.lesion=cur.lesionesActivas.join(', ');
  atletas=atletas.map(a=>a.id===cur.id?cur:a);
  saveData();
  renderProfileHero();
}

// ══════════════════════════════════════════════════════
//  INFORME IA + PDF
// ══════════════════════════════════════════════════════

function openInformeIA(){
  if(!cur){alert('Seleccioná un atleta');return;}
  openModal('modal-informe');
  regenerarInforme();
}

async function regenerarInforme(){
  const s=cur;if(!s)return;
  document.getElementById('informe-sub').textContent=`Analizando datos de ${s.nombre}...`;
  document.getElementById('informe-loading').classList.remove('hidden');
  document.getElementById('informe-editor-wrap').classList.add('hidden');

  // ── Datos esenciales compactos ──
  const sal=getLastEval('saltos');
  const sp=getLastEval('sprint');
  const fv=s.lastFV?{ej:s.lastFV.ejercicio,oneRM:s.lastFV.oneRM?.toFixed(1),V0:s.lastFV.V0?.toFixed(3),Pmax:s.lastFV.Pmax?.toFixed(0),r2:s.lastFV.r2?.toFixed(4)}:null;
  const ftRel=s.lastFV?.oneRM&&s.peso?(s.lastFV.oneRM/+s.peso).toFixed(2):null;
  const normKey=fv?Object.keys(STR_NORMS).find(k=>fv.ej?.toLowerCase().includes(STR_NORMS[k].name.toLowerCase().split(' ')[0].toLowerCase())):null;
  const norm=normKey?STR_NORMS[normKey]:null;
  const frSt=ftRel&&norm?(+ftRel>=norm.amber?'🟢 ELITE':+ftRel>=norm.red?'🟡 MODERADO':'🔴 DÉFICIT'):'--';
  // LSI Simple Hop
  const lsi=sal?.avg?.shD&&sal?.avg?.shI?((Math.min(sal.avg.shD,sal.avg.shI)/Math.max(sal.avg.shD,sal.avg.shI))*100).toFixed(1):null;
  // Kinesio compacto
  const kine=s.kinesio?{
    zonas:Object.values(s.kinesio.bodyZones||{}).filter(z=>!z.recuperado).map(z=>`${z.label}(EVA${z.eva||0})`).join(', ')||'--',
    positivos:Object.entries(s.kinesio.tests||{}).filter(([,v])=>v.result==='pos').map(([id])=>{const allT=[...ORTHO_TESTS.subacro,...ORTHO_TESTS.manguito,...ORTHO_TESTS.biceps,...ORTHO_TESTS.ligamentos,...ORTHO_TESTS.meniscos,...ORTHO_TESTS.funcionales,...ORTHO_TESTS.tobillo,...ORTHO_TESTS.lumbar,...ORTHO_TESTS.cadera];return allT.find(x=>x.id===id)?.name||id;}).join(', ')||'--',
    dx:s.kinesio.form?.dx||'--',
    eva:s.kinesio.form?.eva??'--'
  }:null;

  const prompt=`Kinesiólogo/preparador físico experto. Informe clínico deportivo conciso en español rioplatense.

ATLETA: ${s.nombre}, ${s.edad||'?'}a, ${s.peso||'?'}kg, ${s.talla||'?'}cm
DEPORTE: ${s.deporte||'--'}${s.puesto?' ('+s.puesto+')':''} | Nivel: ${s.nivel||'--'} | Enfoque: ${s.servicio==='kinesio'?'Kinesio':'Rendimiento'}
${s.lesion?'LESIÓN: '+s.lesion:''}

DATOS CLAVE:
• F-V: ${fv?`${fv.ej} | 1RM: ${fv.oneRM}kg | V0: ${fv.V0}m/s | Pmax: ${fv.Pmax}W | R²: ${fv.r2}`:'Sin datos'}
• Fuerza relativa: ${ftRel||'--'}×PC ${frSt}${norm?` (ref: <${norm.red} déf, >${norm.amber} elite)`:''}
• Saltos: CMJ ${sal?.avg?.cmj?.toFixed(1)||'--'}cm | BJ ${sal?.avg?.bj?.toFixed(1)||'--'}cm | LSI Hop: ${lsi||'--'}%${lsi&&+lsi<90?' ⚠️':''}
• Movilidad: Lunge D/I ${s.lungeD||'--'}°/${s.lungeI||'--'}° | TROM Cad D/I ${s.tromCadD||'--'}°/${s.tromCadI||'--'}°
• Sprint: 10m ${sp?.sp10||'--'}s | 30m ${sp?.sp30||'--'}s | T-Test ${sp?.ttest||'--'}s
${kine?`• Kinesio: Zonas ${kine.zonas} | Tests+ ${kine.positivos} | Dx ${kine.dx} | EVA ${kine.eva}/10`:''}

Generá el informe con ESTE FORMATO EXACTO (usá los emojis como encabezados, sin texto introductorio):

📋 RESUMEN EJECUTIVO
[3 líneas: estado actual con valores, diagnóstico funcional]

📊 TABLA COMPARATIVA
[Tabla texto con columnas: VARIABLE | VALOR | REFERENCIA | ESTADO
Incluir: 1RM/PC, CMJ, LSI, Lunge, TROM. Usá | para separar columnas]

💪 FORTALEZAS
[2-3 puntos con valores concretos]

⚠️ ÁREAS DE MEJORA
[2-3 déficits con valores y umbral de referencia]

📅 PLAN DE ACCIÓN
[3 prescripciones específicas con parámetros: ejercicio, series×reps, intensidad]

🔁 RE-EVALUACIÓN
[Plazo y criterio de alta o progresión]`;

  try{
    const API_KEY = getApiKey();
    if (!API_KEY) {
      document.getElementById('informe-loading').classList.add('hidden');
      document.getElementById('informe-sub').textContent = 'Necesitás configurar tu API Key primero';
      showApiKeyModal();
      return;
    }
    const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({model:'llama-3.1-8b-instant',max_tokens:800,messages:[{role:'system',content:'Sos un kinesiólogo deportivo argentino. Respondé en español rioplatense, técnico y conciso.'},{role:'user',content:prompt}]})
    });
    const data=await res.json();
    if(data.error){throw new Error(data.error.message);}
    const txt=data.choices?.[0]?.message?.content||data.error?.message||'Error al generar el informe.';
    document.getElementById('informe-text').value=txt;
    document.getElementById('informe-loading').classList.add('hidden');
    document.getElementById('informe-editor-wrap').classList.remove('hidden');
    document.getElementById('informe-sub').textContent='Editá y exportá el informe';
  }catch(e){
    document.getElementById('informe-loading').classList.add('hidden');
    document.getElementById('informe-sub').textContent='Error: '+e.message;
    console.error('IA error:',e);
  }
}

function exportarPDF(){
  const{jsPDF}=window.jspdf;if(!jsPDF){alert('Error al cargar jsPDF');return;}
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const s=cur;if(!s){alert('Sin atleta');return;}
  const prof=document.getElementById('prof-nombre')?.value||'Lic. Emanuel Lezcano';
  const inst=document.getElementById('prof-inst')?.value||'MOVE Centro de Evaluación';
  const texto=document.getElementById('informe-text')?.value||'Sin informe';
  const fecha=new Date().toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'});
  // Fondo negro
  doc.setFillColor(0,0,0);doc.rect(0,0,210,297,'F');
  // Header
  doc.setFillColor(8,8,8);doc.rect(0,0,210,44,'F');
  doc.setDrawColor(57,255,122);doc.setLineWidth(0.4);doc.line(0,44,210,44);
  doc.setTextColor(57,255,122);doc.setFontSize(18);doc.setFont('courier','bold');doc.text('MOVEMETRICS',14,20);
  doc.setTextColor(50,50,50);doc.setFontSize(7);doc.setFont('courier','normal');doc.text('PLATAFORMA DEPORTIVO-CLÍNICA v12',14,27);doc.text('INFORME ANALÍTICO PROFESIONAL',14,33);
  doc.setTextColor(120,120,120);doc.setFontSize(8);doc.text(prof,196,18,{align:'right'});doc.text(inst,196,24,{align:'right'});doc.text(fecha,196,30,{align:'right'});
  // Atleta box
  doc.setFillColor(12,12,12);doc.roundedRect(14,50,182,36,2,2,'F');
  doc.setDrawColor(57,255,122);doc.setLineWidth(0.3);doc.roundedRect(14,50,182,36,2,2,'S');
  doc.setTextColor(57,255,122);doc.setFontSize(15);doc.setFont('courier','bold');doc.text(s.nombre,20,61);
  doc.setTextColor(160,160,160);doc.setFontSize(8.5);doc.setFont('courier','normal');
  doc.text(`${s.deporte||'--'}${s.puesto?' · '+s.puesto:''} · ${s.edad||'?'} años · ${s.peso||'?'}kg · ${s.talla||'?'}cm`,20,68);
  doc.text(`Objetivo: ${s.objetivo||'--'} · Nivel: ${s.nivel||'--'} · ${s.servicio==='kinesio'?'Kinesiología':'Rendimiento'}`,20,74);
  if(s.lesion){doc.setTextColor(255,176,32);doc.text(`Lesión: ${s.lesion}`,20,80);}
  // KPIs
  const kpis=[['CMJ',s.lastCMJ?s.lastCMJ.toFixed(1)+'cm':'--'],['1RM',s.lastFV?.oneRM?s.lastFV.oneRM.toFixed(0)+'kg':'--'],['Fza.Rel.',s.lastFV&&s.peso?(s.lastFV.oneRM/+s.peso).toFixed(2)+'×PC':'--'],['R²',s.lastFV?.r2?.toFixed(4)||'--']];
  kpis.forEach(([lbl,val],i)=>{const x=14+i*46;doc.setFillColor(15,15,15);doc.roundedRect(x,92,42,20,1.5,1.5,'F');doc.setTextColor(50,50,50);doc.setFontSize(7);doc.setFont('courier','normal');doc.text(lbl.toUpperCase(),x+3,99);doc.setTextColor(57,255,122);doc.setFontSize(10);doc.setFont('courier','bold');doc.text(val,x+3,108);});
  // Charts
  const radarCanvas=document.getElementById('radar-chart');if(radarCanvas){try{const img=radarCanvas.toDataURL('image/png');doc.addImage(img,'PNG',14,118,86,70);}catch(e){}}
  const fvCanvas=document.getElementById('fv-chart')||document.getElementById('dash-fv-chart');if(fvCanvas){try{const img=fvCanvas.toDataURL('image/png');doc.addImage(img,'PNG',106,118,90,70);}catch(e){}}
  // Contenido
  doc.setTextColor(210,210,210);const lines=doc.splitTextToSize(texto,182);
  let y=198;
  lines.forEach(line=>{
    if(y>275){doc.addPage();doc.setFillColor(0,0,0);doc.rect(0,0,210,297,'F');y=20;}
    const isSec=line.startsWith('📋')||line.startsWith('💪')||line.startsWith('⚠️')||line.startsWith('🎯')||line.startsWith('📅')||line.startsWith('🔁');
    if(isSec){doc.setFont('courier','bold');doc.setFontSize(10);doc.setTextColor(57,255,122);y+=2;}
    else{doc.setFont('courier','normal');doc.setFontSize(8.5);doc.setTextColor(200,200,200);}
    doc.text(line,14,y);y+=isSec?6:5;
  });
  // Página Kinesio
  if(s.kinesio&&(Object.keys(s.kinesio.bodyZones||{}).length||Object.values(s.kinesio.tests||{}).some(t=>t.result==='pos'))){
    doc.addPage();doc.setFillColor(0,0,0);doc.rect(0,0,210,297,'F');
    doc.setFillColor(8,8,8);doc.rect(0,0,210,34,'F');doc.setDrawColor(57,255,122);doc.setLineWidth(0.4);doc.line(0,34,210,34);
    doc.setTextColor(57,255,122);doc.setFontSize(14);doc.setFont('courier','bold');doc.text('EVALUACIÓN KINESIOLÓGICA',14,18);
    doc.setTextColor(100,100,100);doc.setFontSize(8);doc.setFont('courier','normal');doc.text(`${s.nombre} · ${new Date().toLocaleDateString('es-AR')}`,14,26);
    let ky=44;
    const zonas=Object.entries(s.kinesio.bodyZones||{}).filter(([,v])=>!v.recuperado);
    if(zonas.length){doc.setFillColor(20,5,5);doc.roundedRect(14,ky,182,8+zonas.length*7,2,2,'F');doc.setDrawColor(255,68,68);doc.setLineWidth(0.3);doc.roundedRect(14,ky,182,8+zonas.length*7,2,2,'S');doc.setTextColor(255,68,68);doc.setFontSize(9);doc.setFont('courier','bold');doc.text('ZONAS LESIONADAS',18,ky+7);doc.setFont('courier','normal');doc.setFontSize(8.5);doc.setTextColor(200,150,150);zonas.forEach(([,z],i)=>{doc.text(`• ${z.label}  EVA: ${z.eva||'--'}/10`,22,ky+7+7*(i+1));});ky+=14+zonas.length*7;}
    const posTests=Object.entries(s.kinesio.tests||{}).filter(([,v])=>v.result==='pos');
    const allTests=[...ORTHO_TESTS.subacro,...ORTHO_TESTS.manguito,...ORTHO_TESTS.biceps,...ORTHO_TESTS.ligamentos,...ORTHO_TESTS.meniscos,...ORTHO_TESTS.funcionales,...ORTHO_TESTS.tobillo,...ORTHO_TESTS.lumbar,...ORTHO_TESTS.cadera];
    if(posTests.length){ky+=6;doc.setFillColor(20,5,5);doc.roundedRect(14,ky,182,10+posTests.length*9,2,2,'F');doc.setDrawColor(255,68,68);doc.setLineWidth(0.3);doc.roundedRect(14,ky,182,10+posTests.length*9,2,2,'S');doc.setTextColor(255,68,68);doc.setFontSize(9);doc.setFont('courier','bold');doc.text('TESTS ORTOPÉDICOS POSITIVOS',18,ky+8);ky+=12;posTests.forEach(([id,v])=>{const t=allTests.find(x=>x.id===id);if(!t)return;doc.setFont('courier','bold');doc.setFontSize(8.5);doc.setTextColor(255,100,100);doc.text(`+ ${t.name}`,18,ky);doc.setFont('courier','normal');doc.setTextColor(150,150,150);const subt=` -- ${t.sub}${v.obs?' -- '+v.obs:''}`;doc.text(subt,18+doc.getTextWidth(`+ ${t.name}`),ky);ky+=7;});}
  }
  // Footer
  const total=doc.getNumberOfPages();
  for(let i=1;i<=total;i++){doc.setPage(i);doc.setFillColor(6,6,6);doc.rect(0,286,210,11,'F');doc.setDrawColor(57,255,122);doc.setLineWidth(0.2);doc.line(0,286,210,286);doc.setTextColor(50,50,50);doc.setFontSize(7);doc.setFont('courier','normal');doc.text(`MOVEMETRICS v12 · ${prof} · ${inst}`,14,292);doc.text(`${i} / ${total}`,196,292,{align:'right'});}
  doc.save(`MoveMetrics_${s.nombre.replace(/\s/g,'_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

function exportAllData(){
  const blob=new Blob([JSON.stringify(atletas,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download='movemetrics_data_'+new Date().toISOString().split('T')[0]+'.json';a.click();URL.revokeObjectURL(url);
}


// ══════════════════════════════════════════════════════
//  VIDEO SALTO -- Módulo de salto vertical por video
// ══════════════════════════════════════════════════════

let videoState = {
  takeoffTime: null,
  landingTime: null,
  fps: 60,
  duration: 0
};

function getFps() {
  const sel = document.getElementById('video-fps');
  if (!sel) return 60;
  if (sel.value === 'custom') {
    return parseFloat(document.getElementById('video-fps-custom').value) || 60;
  }
  return parseFloat(sel.value) || 60;
}

function onFpsChange() {
  const sel = document.getElementById('video-fps');
  const customInp = document.getElementById('video-fps-custom');
  if (sel.value === 'custom') {
    customInp.style.display = 'block';
  } else {
    customInp.style.display = 'none';
  }
  const fps = getFps();
  videoState.fps = fps;
  const ms = (1000 / fps).toFixed(2);
  const el = document.getElementById('frame-duration-display');
  if (el) el.textContent = ms + ' ms';
  // Recalculate if markers already set
  if (videoState.takeoffTime !== null && videoState.landingTime !== null) {
    calcVideoJump();
  }
}

function loadVideo(input) {
  if (!input.files.length) return;
  const file = input.files[0];
  const url = URL.createObjectURL(file);
  const video = document.getElementById('video-player');
  const wrap = document.getElementById('video-player-wrap');
  const uploadArea = document.getElementById('video-upload-area');
  video.src = url;
  video.load();
  wrap.style.display = 'block';
  uploadArea.style.display = 'none';
  video.addEventListener('loadedmetadata', () => {
    videoState.duration = video.duration;
    document.getElementById('vid-time-tot').textContent = video.duration.toFixed(3) + 's';
    const totalFrames = Math.floor(video.duration * getFps());
    document.getElementById('vid-frame-tot').textContent = totalFrames;
    updateVideoUI();
  });
  video.addEventListener('timeupdate', updateVideoUI);
}

function handleVideoDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('video/')) return;
  const input = document.getElementById('video-file-inp');
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  loadVideo(input);
}

function updateVideoUI() {
  const video = document.getElementById('video-player');
  if (!video) return;
  const fps = getFps();
  const currentFrame = Math.round(video.currentTime * fps);
  const totalFrames = Math.floor(video.duration * fps);
  document.getElementById('vid-frame-num').textContent = currentFrame;
  document.getElementById('vid-time-cur').textContent = video.currentTime.toFixed(3) + 's';
  const scrubber = document.getElementById('video-scrubber');
  if (scrubber && video.duration) {
    scrubber.value = Math.round((video.currentTime / video.duration) * 1000);
  }
  // Update marker bars
  if (videoState.takeoffTime !== null && video.duration) {
    const pct = (videoState.takeoffTime / video.duration * 100).toFixed(2);
    const bar = document.getElementById('bar-takeoff');
    if (bar) { bar.style.left = pct + '%'; bar.style.display = 'block'; }
  }
  if (videoState.landingTime !== null && video.duration) {
    const pct = (videoState.landingTime / video.duration * 100).toFixed(2);
    const bar = document.getElementById('bar-landing');
    if (bar) { bar.style.left = pct + '%'; bar.style.display = 'block'; }
  }
}

function jumpFrames(n) {
  const video = document.getElementById('video-player');
  if (!video) return;
  video.pause();
  document.getElementById('play-btn').textContent = '▶';
  const fps = getFps();
  const frameDuration = 1 / fps;
  let newTime = video.currentTime + n * frameDuration;
  newTime = Math.max(0, Math.min(video.duration, newTime));
  video.currentTime = newTime;
  setTimeout(updateVideoUI, 50);
}

function scrubVideo(val) {
  const video = document.getElementById('video-player');
  if (!video || !video.duration) return;
  video.currentTime = (val / 1000) * video.duration;
}

function togglePlay() {
  const video = document.getElementById('video-player');
  const btn = document.getElementById('play-btn');
  if (!video) return;
  if (video.paused) { video.play(); btn.textContent = '⏸'; }
  else { video.pause(); btn.textContent = '▶'; }
}

function markTakeoff() {
  const video = document.getElementById('video-player');
  if (!video || !video.src) { alert('Cargá un video primero'); return; }
  video.pause();
  document.getElementById('play-btn').textContent = '▶';
  videoState.takeoffTime = video.currentTime;
  const fps = getFps();
  const frame = Math.round(video.currentTime * fps);
  document.getElementById('takeoff-frame-display').textContent = video.currentTime.toFixed(3) + 's';
  document.getElementById('takeoff-time-display').textContent = 'Frame ' + frame;
  document.getElementById('btn-takeoff').style.background = 'rgba(57,255,122,.15)';
  document.getElementById('btn-takeoff').style.borderColor = 'rgba(57,255,122,.4)';
  updateVideoUI();
  if (videoState.landingTime !== null) calcVideoJump();
}

function markLanding() {
  const video = document.getElementById('video-player');
  if (!video || !video.src) { alert('Cargá un video primero'); return; }
  if (videoState.takeoffTime === null) { alert('Marcá primero el Despegue'); return; }
  if (video.currentTime <= videoState.takeoffTime) { alert('El aterrizaje debe ser DESPUÉS del despegue'); return; }
  video.pause();
  document.getElementById('play-btn').textContent = '▶';
  videoState.landingTime = video.currentTime;
  const fps = getFps();
  const frame = Math.round(video.currentTime * fps);
  document.getElementById('landing-frame-display').textContent = video.currentTime.toFixed(3) + 's';
  document.getElementById('landing-time-display').textContent = 'Frame ' + frame;
  document.getElementById('btn-landing').style.background = 'rgba(255,59,59,.15)';
  document.getElementById('btn-landing').style.borderColor = 'rgba(255,59,59,.4)';
  updateVideoUI();
  calcVideoJump();
}

function calcVideoJump() {
  if (videoState.takeoffTime === null || videoState.landingTime === null) return;
  const fps = getFps();
  const t = videoState.landingTime - videoState.takeoffTime; // seconds
  const tMs = Math.round(t * 1000);
  const frames = Math.round(t * fps);
  // h = g * t^2 / 8  (caída libre con tiempo de vuelo completo)
  const g = 9.81;
  const hMeters = (g * t * t) / 8;
  const hCm = hMeters * 100;

  // Status
  const c = hCm >= 40 ? 'var(--neon)' : hCm >= 30 ? 'var(--amber)' : 'var(--red)';
  const label = hCm >= 40 ? '🟢 Excelente' : hCm >= 30 ? '🟡 Moderado' : '🔴 Bajo';

  document.getElementById('video-result-card').style.display = 'block';
  document.getElementById('video-height-display').textContent = hCm.toFixed(1);
  document.getElementById('video-height-display').style.color = c;
  document.getElementById('video-height-display').style.textShadow = `0 0 30px ${c}`;
  document.getElementById('video-flight-ms').textContent = tMs;
  document.getElementById('video-flight-frames').textContent = frames;
  document.getElementById('video-fps-used').textContent = fps;
  const badge = document.getElementById('video-result-badge');
  badge.textContent = label;
  badge.className = 'tag ' + (hCm >= 40 ? 'tag-g' : hCm >= 30 ? 'tag-y' : 'tag-r');

  // Compare with manual CMJ if exists
  if (cur && cur.lastCMJ) {
    const diff = (hCm - cur.lastCMJ).toFixed(1);
    const sign = diff >= 0 ? '+' : '';
    document.getElementById('video-vs-manual').style.display = 'block';
    document.getElementById('video-vs-cmj').textContent = cur.lastCMJ.toFixed(1) + 'cm (' + sign + diff + 'cm)';
    document.getElementById('video-vs-cmj').style.color = diff >= 0 ? 'var(--neon)' : 'var(--red)';
  }

  // Store result for saving
  videoState.result = { hCm: +hCm.toFixed(1), tMs, frames, fps, takeoff: videoState.takeoffTime, landing: videoState.landingTime };
}

function clearMarkers() {
  videoState.takeoffTime = null;
  videoState.landingTime = null;
  videoState.result = null;
  ['takeoff-frame-display','takeoff-time-display'].forEach(id => { const e=document.getElementById(id); if(e) e.textContent='--'; });
  ['landing-frame-display','landing-time-display'].forEach(id => { const e=document.getElementById(id); if(e) e.textContent='--'; });
  document.getElementById('btn-takeoff').style.cssText = '';
  document.getElementById('btn-landing').style.cssText = '';
  document.getElementById('video-result-card').style.display = 'none';
  document.getElementById('video-vs-manual').style.display = 'none';
  ['bar-takeoff','bar-landing'].forEach(id => { const e=document.getElementById(id); if(e) e.style.display='none'; });
}

function saveVideoSalto() {
  if (!cur) { alert('Seleccioná un atleta'); return; }
  if (!videoState.result) { alert('Calculá un salto primero'); return; }
  const fecha = new Date().toISOString().split('T')[0];
  if (!cur.evals) cur.evals = {};
  cur.evals['video_' + fecha + '_' + Date.now()] = {
    ...videoState.result,
    fecha,
    tipo: 'video-salto'
  };
  // Also update lastCMJ if higher or not set
  if (!cur.lastCMJ || videoState.result.hCm > cur.lastCMJ) {
    cur.lastCMJ = videoState.result.hCm;
  }
  atletas = atletas.map(a => a.id === cur.id ? cur : a);
  saveData();
  renderProfileHero();
  showSaveToast();
}


function saveFuncTests() {
  if (!cur) return;
  const sts  = +document.getElementById('sts-reps')?.value||null;
  const uni  = +document.getElementById('unipodal-seg')?.value||null;
  const tug  = +document.getElementById('tug-seg')?.value||null;
  const d6m  = +document.getElementById('dist6min-m')?.value||null;
  if (sts)  cur.sitToStand = sts;
  if (uni)  cur.unipodal   = uni;
  if (tug)  cur.tug        = tug;
  if (d6m)  cur.dist6min   = d6m;
  atletas = atletas.map(a => a.id === cur.id ? cur : a);
  saveData();
  renderRadar();
}


// ========================================================
//  GONIOMETRO INTERACTIVO
// ========================================================

let goniometroActivo = false, goniometroCongelado = false;
let anguloActual = 0, anguloCongelado = 0, goniometroCtx = null;
let testEnCurso = null, anguloMax = 60, anguloOffset = 0, calibrado = false;

function iniciarGoniometro(testId, testNombre, maxAngulo) {
  if (!cur) { alert('Selecciona un atleta'); return; }
  testEnCurso = testId; anguloMax = maxAngulo;
  document.getElementById('goniometro-title').textContent = 'Goniometro -- ' + testNombre;
  goniometroActivo = true; goniometroCongelado = false;
  anguloActual = 0; calibrado = false; anguloOffset = 0;
  document.getElementById('lectura-actual').textContent = '0.0deg';
  document.getElementById('lectura-estado').textContent = 'En vivo';
  document.getElementById('goniometro-angulo').textContent = '0.0';
  document.getElementById('btn-congelar-gonio').textContent = 'Congelar';
  document.getElementById('btn-congelar-gonio').className = 'btn btn-outline btn-sm';
  const canvas = document.getElementById('goniometro-canvas');
  if (canvas) { goniometroCtx = canvas.getContext('2d'); dibujarGoniometro(0); }
  actualizarFlecha(0);
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    document.getElementById('goniometro-estado').textContent = 'Toca para activar sensor';
    const sheet = document.querySelector('#modal-goniometro .modal-sheet');
    const handler = () => {
      DeviceOrientationEvent.requestPermission().then(state => {
        if (state === 'granted') { window.addEventListener('deviceorientation', manejarOrientacion); document.getElementById('goniometro-estado').textContent = 'Sensor activo'; }
      }).catch(console.error);
      sheet.removeEventListener('click', handler);
    };
    sheet.addEventListener('click', handler);
  } else {
    window.addEventListener('deviceorientation', manejarOrientacion);
    document.getElementById('goniometro-estado').textContent = 'Sensor activo';
  }
  openModal('modal-goniometro');
}

function manejarOrientacion(event) {
  if (!goniometroActivo || goniometroCongelado) return;
  let angulo = event.beta || 0;
  if (!calibrado) { anguloOffset = angulo; calibrado = true; }
  angulo = Math.round((angulo - anguloOffset) * 10) / 10;
  angulo = Math.max(-10, Math.min(anguloMax + 10, angulo));
  anguloActual = angulo;
  document.getElementById('goniometro-angulo').textContent = angulo.toFixed(1);
  document.getElementById('lectura-actual').textContent = angulo.toFixed(1) + 'deg';
  dibujarGoniometro(angulo);
  actualizarFlecha(angulo);
}

function dibujarGoniometro(angulo) {
  if (!goniometroCtx) return;
  const canvas = document.getElementById('goniometro-canvas');
  const ctx = goniometroCtx;
  const w = canvas.width, h = canvas.height, cx = w/2, cy = h/2, radio = w * 0.38;
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath(); ctx.arc(cx, cy, radio, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(57,255,122,.15)'; ctx.lineWidth = 1; ctx.stroke();
  if (Math.abs(angulo) > 0) {
    ctx.beginPath();
    const startA = -Math.PI / 2;
    const endA = startA + (angulo * Math.PI / 180);
    ctx.arc(cx, cy, radio * 0.6, startA, endA);
    ctx.strokeStyle = '#39FF7A'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
  }
  for (let i = 0; i <= anguloMax; i += 15) {
    const rad = (i - 90) * Math.PI / 180;
    const x1 = cx + (radio - 6) * Math.cos(rad), y1 = cy + (radio - 6) * Math.sin(rad);
    const x2 = cx + radio * Math.cos(rad), y2 = cy + radio * Math.sin(rad);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(57,255,122,.35)'; ctx.lineWidth = 1; ctx.stroke();
    if (i % 30 === 0) {
      ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(57,255,122,.6)'; ctx.textAlign = 'center';
      ctx.fillText(i + 'deg', cx + (radio + 14) * Math.cos(rad), cy + (radio + 14) * Math.sin(rad) + 3);
    }
  }
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI); ctx.fillStyle = '#39FF7A'; ctx.fill();
}

function actualizarFlecha(angulo) {
  const f = document.getElementById('goniometro-flecha');
  if (f) f.style.transform = 'translateX(-50%) rotate(' + angulo + 'deg)';
}

function toggleCongelarGonio() {
  const btn = document.getElementById('btn-congelar-gonio');
  if (goniometroCongelado) {
    goniometroCongelado = false;
    btn.textContent = 'Congelar'; btn.className = 'btn btn-outline btn-sm';
    document.getElementById('lectura-estado').textContent = 'En vivo';
  } else {
    goniometroCongelado = true; anguloCongelado = anguloActual;
    btn.textContent = 'Descongelar'; btn.className = 'btn btn-neon btn-sm';
    document.getElementById('lectura-estado').textContent = 'Congelado ' + anguloCongelado.toFixed(1) + 'deg';
  }
}

function reiniciarGoniometro() {
  goniometroCongelado = false; anguloActual = 0; calibrado = false; anguloOffset = 0;
  document.getElementById('btn-congelar-gonio').textContent = 'Congelar';
  document.getElementById('btn-congelar-gonio').className = 'btn btn-outline btn-sm';
  document.getElementById('lectura-estado').textContent = 'En vivo';
  document.getElementById('goniometro-angulo').textContent = '0.0';
  document.getElementById('lectura-actual').textContent = '0.0deg';
  dibujarGoniometro(0); actualizarFlecha(0);
}

function confirmarGoniometro() {
  if (!cur || !testEnCurso) return;
  const val = Math.abs(goniometroCongelado ? anguloCongelado : anguloActual);
  const inputMap = {
    'tobillo-d':'lunge-d','tobillo-i':'lunge-i',
    'cadera-ri-d':'cad-ri-d','cadera-re-d':'cad-re-d',
    'cadera-ri-i':'cad-ri-i','cadera-re-i':'cad-re-i',
    'hombro-ri-d':'hom-ri-d','hombro-re-d':'hom-re-d',
    'hombro-ri-i':'hom-ri-i','hombro-re-i':'hom-re-i',
  };
  const inputId = inputMap[testEnCurso];
  if (inputId) {
    const inp = document.getElementById(inputId);
    if (inp) { inp.value = val.toFixed(1); inp.dispatchEvent(new Event('input')); }
  }
  atletas = atletas.map(a => a.id === cur.id ? cur : a);
  saveData(); detenerGoniometro(); closeModal('modal-goniometro');
}

function detenerGoniometro() {
  goniometroActivo = false;
  window.removeEventListener('deviceorientation', manejarOrientacion);
}

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  renderAtletas();
  buildSaltosGrid();
  buildHooperFields();
  for (let i = 0; i < 5; i++) addFVRow();
  _lastFvEj = document.getElementById('fv-ej')?.value || null;
  const today = new Date().toISOString().split('T')[0];
  ['fv-fecha','saltos-fecha','sprint-fecha','fat-fecha','kine-fecha'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = today;
  });
  ['g-ld','g-li','g-tcd','g-tci'].forEach(id => drawGauge(id, 0, 0, 100, 'lunge'));
  // Ctrl+S
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (cur) saveData(); }
  });
});

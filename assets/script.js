// ══════════════════════════════════════════════════════════════
//  MoveMetrics v12 -- JavaScript completo
// ══════════════════════════════════════════════════════════════

// ── API KEY MANAGER ──
function getApiKey() { return localStorage.getItem('mm_api_key') || ''; }
function saveApiKey(key) { localStorage.setItem('mm_api_key', key.trim()); }
function clearApiKey() { localStorage.removeItem('mm_api_key'); }
function hasApiKey() { return !!getApiKey(); }

// ── DATOS GLOBALES ──
let atletas = JSON.parse(localStorage.getItem('mm_v12_atletas') || '[]');
let cur = null;
let fvChart = null, radarChart = null, movRadarChart = null, dashFvChart = null;
let fvRowCount = 0;
let _pendingPhoto = null;
let _lastFvEj = null;
let kineState = { bodyZones: {}, tests: {}, form: {} };

// ── GONIÓMETRO GLOBALES ──
let goniometroActivo = false;
let goniometroCongelado = false;
let anguloActual = 0;
let anguloCongelado = 0;
let goniometroCanvas = null;
let goniometroCtx = null;
let testEnCurso = null;
let anguloOffset = 0;
let calibrado = false;

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
  const tabs = ['dashboard','kinesio','fuerza','saltos','movilidad','velocidad','fms','fatiga','historial'];
  tabs.forEach(t => document.getElementById('ptab-' + t)?.classList.toggle('hidden', t !== tab));
  document.querySelectorAll('#profile-tab-bar .ptab').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'historial') renderHistorial();
  if (tab === 'kinesio') initKinesio();
  if (tab === 'fuerza') renderFVHist();
  if (tab === 'saltos') renderSimetriasTabla();
  if (tab === 'movilidad') setTimeout(redrawGauges, 60);
}

function openModal(id) { document.getElementById(id).classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }

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
  document.getElementById('svc-kine').className = 'btn btn-full ' + (v === 'kinesio' ? 'btn-neon' : 'btn-ghost');
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
    id: eid || Date.now(),
    nombre,
    edad: document.getElementById('s-edad').value,
    sexo: document.getElementById('s-sexo').value,
    peso: document.getElementById('s-peso').value,
    talla: document.getElementById('s-talla').value,
    pierna: document.getElementById('s-pierna').value,
    servicio: document.getElementById('s-servicio').value,
    deporte: document.getElementById('s-deporte').value,
    puesto: document.getElementById('s-puesto').value,
    nivel: document.getElementById('s-nivel').value,
    objetivo: document.getElementById('s-objetivo').value,
    lesion: document.getElementById('s-lesion').value,
    email: document.getElementById('s-email').value,
    foto: _pendingPhoto || existing?.foto || null,
    creado: existing?.creado || new Date().toISOString(),
    evals: existing?.evals || {},
    evalsByDate: existing?.evalsByDate || {},
    kinesio: existing?.kinesio || null
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
  document.getElementById('atletas-count').textContent = atletas.length + ' atleta' + (atletas.length !== 1 ? 's' : '');
  if (!atletas.length) {
    grid.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text3)">👤 No hay atletas. Hacé click en "+ Nuevo atleta"</div>';
    return;
  }
  grid.innerHTML = atletas.map(s => {
    const evalCount = Object.keys(s.evals || {}).length;
    const hasInjury = s.lesion || (s.kinesio && Object.values(s.kinesio.bodyZones || {}).some(z => !z.recuperado));
    const photoHtml = s.foto ? `<img src="${s.foto}" style="width:40px;height:40px;border-radius:10px;object-fit:cover;">` : `<div class="athlete-av-sm">${s.nombre.charAt(0)}</div>`;
    return `<div class="athlete-card ${hasInjury ? 'has-injury' : ''}" onclick="selectAtleta(${s.id})">
      <div class="flex" style="gap:12px">
        ${photoHtml}
        <div style="flex:1">
          <div style="font-weight:700">${s.nombre}</div>
          <div style="font-size:11px;color:var(--text2)">${s.deporte || 'Sin deporte'} · ${s.edad || '?'} años</div>
        </div>
        <div style="display:flex;gap:5px">
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();editAtletaById(${s.id})">✏️</button>
          <button class="btn btn-red btn-sm" onclick="deleteAtleta(${s.id},event)">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterAtletas(q) {
  const f = atletas.filter(s => s.nombre.toLowerCase().includes(q.toLowerCase()));
  const grid = document.getElementById('atletas-grid');
  grid.innerHTML = f.map(s => `<div class="athlete-card" onclick="selectAtleta(${s.id})"><div class="flex"><div class="athlete-av-sm">${s.nombre.charAt(0)}</div><div>${s.nombre}</div></div></div>`).join('');
}

// ══════════════════════════════════════════════════════
//  PROFILE HERO
// ══════════════════════════════════════════════════════

function renderProfileHero() {
  if (!cur) return;
  const s = cur;
  document.getElementById('tests-atleta-indicator').textContent = s.nombre;
  const av = document.getElementById('profile-av-lg');
  if (av) {
    if (s.foto) av.innerHTML = `<img src="${s.foto}"><div class="profile-av-edit">✏️</div>`;
    else { av.textContent = s.nombre.charAt(0); av.innerHTML += '<div class="profile-av-edit">✏️</div>'; }
  }
  document.getElementById('profile-meta').textContent = `${s.deporte || '—'} · ${s.edad || '?'} años · ${s.peso || '?'} kg`;
}

function getLastEval(type) {
  if (!cur) return null;
  return Object.entries(cur.evals || {})
    .filter(([k]) => k.startsWith(type + '_'))
    .map(([, v]) => v)
    .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))[0] || null;
}

// ══════════════════════════════════════════════════════
//  GONIÓMETRO DIGITAL
// ══════════════════════════════════════════════════════

function iniciarGoniometro(testId, testNombre, anguloMaximo) {
  if (!cur) { alert('Seleccioná un atleta primero'); return; }
  testEnCurso = testId;
  window.anguloMaxActual = anguloMaximo || 60;
  document.getElementById('goniometro-title').textContent = `📐 ${testNombre}`;
  goniometroActivo = true;
  goniometroCongelado = false;
  anguloActual = 0;
  calibrado = false;
  anguloOffset = 0;
  document.getElementById('lectura-actual').textContent = '0.0°';
  document.getElementById('lectura-estado').innerHTML = '🔓 En vivo';
  document.getElementById('goniometro-angulo').textContent = '0.0';
  if (!goniometroCanvas) {
    goniometroCanvas = document.getElementById('goniometro-canvas');
    if (goniometroCanvas) {
      goniometroCanvas.width = 250;
      goniometroCanvas.height = 250;
      goniometroCtx = goniometroCanvas.getContext('2d');
    }
  }
  dibujarGoniometro(0);
  actualizarFlecha(0);
  solicitarPermisoSensor();
  openModal('modal-goniometro');
}
function solicitarPermisoSensor() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    document.getElementById('goniometro-estado').innerHTML = '⚠️ Toca para activar sensor';
    const modalSheet = document.querySelector('#modal-goniometro .modal-sheet');
    const handler = () => {
      DeviceOrientationEvent.requestPermission().then(permissionState => {
        if (permissionState === 'granted') {
          window.addEventListener('deviceorientation', manejarOrientacion);
          document.getElementById('goniometro-estado').innerHTML = '🟢 Sensor activo';
        }
      }).catch(console.error);
      modalSheet.removeEventListener('click', handler);
    };
    modalSheet.addEventListener('click', handler);
  } else {
    window.addEventListener('deviceorientation', manejarOrientacion);
    document.getElementById('goniometro-estado').innerHTML = '🟢 Sensor activo';
  }
}
 function manejarOrientacion(event) {
  if (!goniometroActivo) return;
  let angulo = event.beta || 0;
  if (!calibrado) { anguloOffset = angulo; calibrado = true; }
  angulo = angulo - anguloOffset;
  const maximo = window.anguloMaxActual || 60;
  angulo = Math.max(-10, Math.min(maximo, angulo));
  if (!goniometroCongelado) {
    anguloActual = Math.round(angulo * 10) / 10;
    document.getElementById('goniometro-angulo').textContent = anguloActual.toFixed(1);
    document.getElementById('lectura-actual').textContent = anguloActual.toFixed(1) + '°';
    dibujarGoniometro(anguloActual);
    actualizarFlecha(anguloActual);
  }
}

function calibrarGoniometro() {
  calibrado = false;
  anguloOffset = 0;
  anguloActual = 0;
  document.getElementById('goniometro-angulo').textContent = '0.0';
  document.getElementById('lectura-actual').textContent = '0.0°';
  dibujarGoniometro(0);
  actualizarFlecha(0);
  showToast('📐 Goniómetro calibrado a 0°');
}

function dibujarGoniometro(angulo) {
  if (!goniometroCtx) return;
  const canvas = goniometroCanvas;
  const ctx = goniometroCtx;
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  const radio = w * 0.42;
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  ctx.arc(cx, cy, radio, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(57,255,122,.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  const maximo = window.anguloMaxActual || 60;
  for (let i = 0; i <= maximo; i += 10) {
    const rad = (i * Math.PI) / 180;
    const esPrincipal = i % 10 === 0;
    const largo = esPrincipal ? 12 : 6;
    const x1 = cx + (radio - largo) * Math.sin(rad);
    const y1 = cy + (radio - largo) * Math.cos(rad);
    const x2 = cx + radio * Math.sin(rad);
    const y2 = cy + radio * Math.cos(rad);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = esPrincipal ? 'rgba(57,255,122,.7)' : 'rgba(57,255,122,.3)';
    ctx.stroke();
    if (esPrincipal && i !== 0) {
      ctx.font = 'bold 9px "JetBrains Mono"';
      ctx.fillStyle = 'rgba(57,255,122,.6)';
      const tx = cx + (radio + 15) * Math.sin(rad);
      const ty = cy + (radio + 12) * Math.cos(rad);
      ctx.fillText(i + '°', tx - 4, ty + 3);
    }
  }
}

function actualizarFlecha(angulo) {
  const flecha = document.getElementById('goniometro-flecha');
  if (flecha) flecha.style.transform = `translateX(-50%) rotate(${-angulo}deg)`;
}

function toggleCongelar() {
  if (!goniometroActivo) return;
  const btn = document.getElementById('btn-congelar');
  const estadoSpan = document.getElementById('lectura-estado');
  if (goniometroCongelado) {
    goniometroCongelado = false;
    btn.textContent = '🔒 Congelar ángulo';
    btn.className = 'btn btn-neon btn-full';
    estadoSpan.innerHTML = '🔓 En vivo';
  } else {
    goniometroCongelado = true;
    anguloCongelado = anguloActual;
    btn.textContent = '🔓 Descongelar';
    btn.className = 'btn btn-outline btn-full';
    estadoSpan.innerHTML = '🔒 Congelado';
  }
}

function reiniciarGoniometro() {
  if (!goniometroActivo) return;
  goniometroCongelado = false;
  anguloActual = 0;
  document.getElementById('btn-congelar').textContent = '🔒 Congelar ángulo';
  document.getElementById('btn-congelar').className = 'btn btn-neon btn-full';
  document.getElementById('lectura-estado').innerHTML = '🔓 En vivo';
  document.getElementById('goniometro-angulo').textContent = '0.0';
  document.getElementById('lectura-actual').textContent = '0.0°';
  dibujarGoniometro(0);
  actualizarFlecha(0);
}

function confirmarGoniometro() {
  if (!cur || !testEnCurso) { alert('Error'); return; }
  const anguloFinal = goniometroCongelado ? anguloCongelado : anguloActual;
  const mapeo = {
    'tobillo-d': { campo: 'lungeD', inputId: 'lunge-d' },
    'tobillo-i': { campo: 'lungeI', inputId: 'lunge-i' },
    'cadera-ri-d': { campo: 'cadRiD', inputId: 'cad-ri-d' },
    'cadera-re-d': { campo: 'cadReD', inputId: 'cad-re-d' },
    'cadera-ri-i': { campo: 'cadRiI', inputId: 'cad-ri-i' },
    'cadera-re-i': { campo: 'cadReI', inputId: 'cad-re-i' },
    'hombro-ri-d': { campo: 'homRiD', inputId: 'hom-ri-d' },
    'hombro-re-d': { campo: 'homReD', inputId: 'hom-re-d' },
    'hombro-ri-i': { campo: 'homRiI', inputId: 'hom-ri-i' },
    'hombro-re-i': { campo: 'homReI', inputId: 'hom-re-i' }
  };
  const testInfo = mapeo[testEnCurso];
  if (testInfo) {
    cur[testInfo.campo] = anguloFinal;
    const inputField = document.getElementById(testInfo.inputId);
    if (inputField) inputField.value = anguloFinal;
    atletas = atletas.map(a => a.id === cur.id ? cur : a);
    saveData();
    showToast(`✓ ${testInfo.campo}: ${anguloFinal.toFixed(1)}° guardado`);
    if (typeof onMov === 'function') onMov();
  }
  detenerGoniometro();
  closeModal('modal-goniometro');
}

function detenerGoniometro() {
  goniometroActivo = false;
  goniometroCongelado = false;
  window.removeEventListener('deviceorientation', manejarOrientacion);
}

// ══════════════════════════════════════════════════════
//  MOVILIDAD
// ══════════════════════════════════════════════════════

function onMov() {
  const ld = +document.getElementById('lunge-d')?.value || 0;
  const li = +document.getElementById('lunge-i')?.value || 0;
  const riD = +document.getElementById('cad-ri-d')?.value || 0;
  const reD = +document.getElementById('cad-re-d')?.value || 0;
  const riI = +document.getElementById('cad-ri-i')?.value || 0;
  const reI = +document.getElementById('cad-re-i')?.value || 0;
  const tromCadD = riD + reD;
  const tromCadI = riI + reI;
  const riHD = +document.getElementById('hom-ri-d')?.value || 0;
  const reHD = +document.getElementById('hom-re-d')?.value || 0;
  const riHI = +document.getElementById('hom-ri-i')?.value || 0;
  const reHI = +document.getElementById('hom-re-i')?.value || 0;
  const tromHomD = riHD + reHD;
  const tromHomI = riHI + reHI;
  
  // Actualizar TROM en pantalla
  const tromCadDElem = document.getElementById('trom-cad-d');
  if (tromCadDElem) tromCadDElem.textContent = tromCadD || '—';
  const tromCadIElem = document.getElementById('trom-cad-i');
  if (tromCadIElem) tromCadIElem.textContent = tromCadI || '—';
  const tromHomDElem = document.getElementById('trom-hom-d');
  if (tromHomDElem) tromHomDElem.textContent = tromHomD || '—';
  const tromHomIElem = document.getElementById('trom-hom-i');
  if (tromHomIElem) tromHomIElem.textContent = tromHomI || '—';
  
  const semL = v => !v ? '' : v < 35 ? `🔴 ${v}° déficit` : v <= 40 ? `🟡 ${v}° límite` : `🟢 ${v}° normal`;
  let lr = `<div class="flex mt-8" style="gap:12px">${ld ? semL(ld) : ''}${li ? semL(li) : ''}</div>`;
  if (ld && li) { const d = Math.abs(ld - li); lr += `<div>Asimetría: ${d}° ${d > 5 ? '⚠️' : '✓'}</div>`; }
  document.getElementById('lunge-result').innerHTML = lr;
  
  const semC = v => v > 90 ? `🟢 ${v}°` : v >= 80 ? `🟡 ${v}°` : `🔴 ${v}°`;
  document.getElementById('cad-result').innerHTML = (tromCadD || tromCadI) ? `<div>D: ${semC(tromCadD)} I: ${semC(tromCadI)}</div>` : '';
  
  const semH = v => v > 120 ? `🟢 ${v}°` : v >= 100 ? `🟡 ${v}°` : `🔴 ${v}°`;
  document.getElementById('hom-result').innerHTML = (tromHomD || tromHomI) ? `<div>D: ${semH(tromHomD)} I: ${semH(tromHomI)}</div>` : '';
  
  drawGauge('g-ld', ld, 0, 60, 'lunge');
  drawGauge('g-li', li, 0, 60, 'lunge');
  drawGauge('g-tcd', tromCadD, 0, 120, 'trom');
  drawGauge('g-tci', tromCadI, 0, 120, 'trom');
  
  if (cur) { cur.lungeD = ld; cur.lungeI = li; cur.tromCadD = tromCadD; cur.tromCadI = tromCadI; }
}

function drawGauge(id, value, min, max, type) {
  const c = document.getElementById(id);
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H - 6, r = Math.min(W * 0.44, H * 0.84);
  const st = Math.PI, en = 2 * Math.PI;
  let zones;
  if (type === 'lunge') zones = [{ t: 35 / 60, c: '#FF4444' }, { t: 40 / 60, c: '#FFB020' }, { t: 1, c: '#39FF7A' }];
  else zones = [{ t: 80 / 120, c: '#FF4444' }, { t: 90 / 120, c: '#FFB020' }, { t: 1, c: '#39FF7A' }];
  let prev = st;
  zones.forEach(z => {
    const ang = st + z.t * (en - st);
    ctx.beginPath();
    ctx.arc(cx, cy, r, prev, ang);
    ctx.lineWidth = 10;
    ctx.strokeStyle = z.c;
    ctx.stroke();
    prev = ang;
  });
  if (value > 0) {
    const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const ang = st + norm * (en - st);
    const nc = type === 'lunge' ? (value < 35 ? '#FF4444' : value <= 40 ? '#FFB020' : '#39FF7A') : (value < 80 ? '#FF4444' : value < 90 ? '#FFB020' : '#39FF7A');
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(ang) * 6, cy - Math.sin(ang) * 6);
    ctx.lineTo(cx + Math.cos(ang) * (r * 0.82), cy + Math.sin(ang) * (r * 0.82));
    ctx.lineWidth = 2;
    ctx.strokeStyle = nc;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = nc;
    ctx.fill();
  }
}

function redrawGauges() {
  const ld = +document.getElementById('lunge-d')?.value || 0;
  const li = +document.getElementById('lunge-i')?.value || 0;
  drawGauge('g-ld', ld, 0, 60, 'lunge');
  drawGauge('g-li', li, 0, 60, 'lunge');
}

function saveMov() {
  if (!cur) return;
  const fecha = new Date().toISOString().split('T')[0];
  if (!cur.evals) cur.evals = {};
  cur.evals['mov_' + fecha] = { lungeD: cur.lungeD, lungeI: cur.lungeI, fecha };
  atletas = atletas.map(a => a.id === cur.id ? cur : a);
  saveData();
  showToast('✓ Movilidad guardada');
}

// ══════════════════════════════════════════════════════
//  DASHBOARD (versión simplificada para que funcione)
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
  const s = cur;
  const labels = ['Fuerza', 'Velocidad', 'Movilidad', 'Resistencia', 'Potencia'];
  const actual = [50, 50, 50, 50, 50];
  const ideal = [80, 80, 80, 80, 80];
  const ctx = document.getElementById('radar-chart');
  if (!ctx) return;
  if (radarChart) radarChart.destroy();
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: { labels, datasets: [{ label: 'Actual', data: actual, backgroundColor: 'rgba(57,255,122,.1)', borderColor: '#39FF7A' }] },
    options: { responsive: true, scales: { r: { beginAtZero: true, max: 100 } } }
  });
}

function renderDashSemaforos() { const a = document.getElementById('dash-semaforos'); if (a) a.innerHTML = '<p>Cargá datos F-V</p>'; }
function renderDashFV() { const a = document.getElementById('dash-fv-chart'); if (a) a.innerHTML = '<canvas></canvas>'; }
function renderDashFatiga() { const a = document.getElementById('dash-fatiga-mini'); if (a) a.innerHTML = '<p>Sin datos</p>'; }
function renderDashTimeline() { const a = document.getElementById('dash-timeline'); if (a) a.innerHTML = '<p>Sin evaluaciones</p>'; }
function renderHistorial() { const a = document.getElementById('historial-timeline'); if (a) a.innerHTML = '<p>Sin historial</p>'; }
function renderSimetriasTabla() { const a = document.getElementById('simetrias-tabla'); if (a) a.innerHTML = '<p>Completá saltos</p>'; }
function renderFVHist() { const a = document.getElementById('fv-hist-table'); if (a) a.innerHTML = '<p>Sin historial</p>'; }
function buildSaltosGrid() { const g = document.getElementById('saltos-grid'); if (g) g.innerHTML = '<div class="card"><div class="card-body">Completá los saltos</div></div>'; }
function buildHooperFields() { const h = document.getElementById('hooper-fields'); if (h) h.innerHTML = '<div>Hooper Index</div>'; }
function addFVRow() { const w = document.getElementById('fv-rows-wrap'); if (w) w.innerHTML += '<div class="fv-data-row">...</div>'; }
function calcFV() { alert('Función F-V en desarrollo'); }
function onFvEjChange() {}
function initKinesio() { alert('Kinesio en desarrollo'); }
function saveKinesio() { alert('Guardar Kinesio'); }
function saveFMS() { alert('Guardar FMS'); }
function saveSaltos() { alert('Guardar Saltos'); }
function saveSprint() { alert('Guardar Sprint'); }
function saveFatiga() { alert('Guardar Fatiga'); }
function openInformeIA() { alert('Informe IA en desarrollo'); }
function exportAllData() { alert('Exportar datos'); }

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  renderAtletas();
  buildSaltosGrid();
  buildHooperFields();
  for (let i = 0; i < 3; i++) addFVRow();
  const today = new Date().toISOString().split('T')[0];
  ['fv-fecha', 'saltos-fecha', 'sprint-fecha', 'fat-fecha', 'kine-fecha'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = today;
  });
  ['g-ld', 'g-li', 'g-tcd', 'g-tci'].forEach(id => drawGauge(id, 0, 0, 100, 'lunge'));
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); }));
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (cur) saveData(); } });
});

// ── GLOBALS (compartidos entre módulos) ──
// cur, atletas, kineState, etc. se definen en app.js
// Este archivo asume que app.js ya fue cargado

function loadVMPVideo(input) {
  if (!input.files.length) return;
  const url = URL.createObjectURL(input.files[0]);
  const video = document.getElementById('vmp-video');
  const wrap  = document.getElementById('vmp-player-wrap');
  const area  = document.getElementById('vmp-upload-area');
  video.src = url; video.load();
  wrap.style.display = 'block'; area.style.display = 'none';
  video.addEventListener('loadedmetadata', () => {
    const fps = getVMPFps();
    const tot = Math.floor(video.duration * fps);
    document.getElementById('vmp-frame-tot').textContent = tot;
    document.getElementById('vmp-time-cur').textContent = '0.000s';
    resizeVMPCanvas();
    document.getElementById('btn-vmp-start').disabled = false;
    document.getElementById('vmp-tracking-status').textContent = 'Listo';
    document.getElementById('vmp-tracking-status').className = 'tag tag-g';
    updateVMPRefTable();
  });
  video.addEventListener('timeupdate', updateVMPFrameInfo);
}

function resizeVMPCanvas() {
  const video  = document.getElementById('vmp-video');
  const canvas = document.getElementById('vmp-canvas');
  canvas.width  = video.videoWidth  || video.offsetWidth;
  canvas.height = video.videoHeight || video.offsetHeight;
  redrawVMPCanvas();
}

function getVMPFps() {
  return parseFloat(document.getElementById('vmp-fps')?.value || 60);
}

function updateVMPFrameInfo() {
  const video = document.getElementById('vmp-video');
  const fps   = getVMPFps();
  const frame = Math.round(video.currentTime * fps);
  const tot   = Math.floor(video.duration * fps);
  document.getElementById('vmp-frame-cur').textContent  = frame;
  document.getElementById('vmp-frame-tot').textContent  = tot;
  document.getElementById('vmp-time-cur').textContent   = video.currentTime.toFixed(3) + 's';
  document.getElementById('vmp-points-count').textContent = vmpState.points.length;
  const scrub = document.getElementById('vmp-scrubber');
  if (scrub && video.duration) scrub.value = Math.round((video.currentTime / video.duration) * 1000);
  redrawVMPCanvas();
}

function vmpJump(n) {
  const video = document.getElementById('vmp-video');
  if (!video || !video.src) return;
  video.pause(); document.getElementById('vmp-play-btn').textContent = '▶';
  const fps = getVMPFps();
  video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + n / fps));
  setTimeout(updateVMPFrameInfo, 50);
}

function vmpTogglePlay() {
  const video = document.getElementById('vmp-video');
  const btn   = document.getElementById('vmp-play-btn');
  if (!video) return;
  if (video.paused) { video.play(); btn.textContent = '⏸'; }
  else { video.pause(); btn.textContent = '▶'; }
}

function vmpScrub(val) {
  const video = document.getElementById('vmp-video');
  if (!video || !video.duration) return;
  video.currentTime = (val / 1000) * video.duration;
}

function onVmpConfig() {
  vmpState.ejercicio = document.getElementById('vmp-ejercicio')?.value || 'sentadilla';
  vmpState.carga     = parseFloat(document.getElementById('vmp-carga')?.value) || null;
  updateVMPRefTable();
}

function setVMPFase(fase) {
  vmpState.fase = fase;
  ['prop','exc','todo'].forEach(f => {
    const btn = document.getElementById('fase-btn-' + f);
    if (btn) {
      btn.className = 'btn btn-ghost btn-sm';
      btn.style.cssText = 'flex:1;font-size:10px';
    }
  });
  const map = { propulsiva:'prop', excentrica:'exc', completo:'todo' };
  const active = document.getElementById('fase-btn-' + map[fase]);
  if (active) {
    active.style.background = 'rgba(57,255,122,.1)';
    active.style.borderColor = 'rgba(57,255,122,.3)';
    active.style.color = 'var(--neon)';
  }
}

// ── CALIBRACION ──
function iniciarCalibracion() {
  const video = document.getElementById('vmp-video');
  if (!video || !video.src) { alert('Carga un video primero'); return; }
  vmpState.calibrating = true;
  vmpState.calPoints = [];
  const canvas = document.getElementById('vmp-canvas');
  document.getElementById('vmp-mode-badge').textContent = 'Calibrando -- marca 2 puntos';
  document.getElementById('vmp-mode-badge').className = 'tag tag-y';
  document.getElementById('vmp-instructions-body').innerHTML =
    '<div style="font-size:12px;color:var(--amber);line-height:1.8">' +
    '<b>Calibracion:</b><br>' +
    '1. Hace clic en el punto A (ej: placa inferior de la barra)<br>' +
    '2. Hace clic en el punto B (ej: placa superior, 5cm arriba)<br>' +
    '3. Ingresa la distancia real entre esos 2 puntos en cm<br>' +
    '<b style="color:var(--neon)">Tip:</b> Usa las placas del disco como referencia (ej: 45cm de diametro)</div>';
  canvas.onclick = handleVMPCalibrationClick;
}

function handleVMPCalibrationClick(e) {
  const canvas = document.getElementById('vmp-canvas');
  const video  = document.getElementById('vmp-video');
  const rect   = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top)  * scaleY;
  vmpState.calPoints.push({ x, y });
  redrawVMPCanvas();
  if (vmpState.calPoints.length === 2) {
    const distPx = Math.hypot(
      vmpState.calPoints[1].x - vmpState.calPoints[0].x,
      vmpState.calPoints[1].y - vmpState.calPoints[0].y
    );
    const cmInput = document.getElementById('vmp-escala-cm');
    const cm = parseFloat(cmInput?.value) || parseFloat(prompt('Distancia real entre los 2 puntos (cm):', '45') || '0');
    if (cm > 0) {
      vmpState.scalePxPerCm = distPx / cm;
      vmpState.calibrating = false;
      canvas.onclick = null;
      document.getElementById('vmp-mode-badge').textContent = 'Calibrado: ' + (distPx/cm).toFixed(1) + ' px/cm';
      document.getElementById('vmp-mode-badge').className = 'tag tag-g';
      if (cmInput) cmInput.value = cm;
      document.getElementById('vmp-instructions-body').innerHTML =
        '<div style="font-size:12px;color:var(--neon);line-height:1.8">Calibracion lista!<br>' +
        'Escala: <b>' + vmpState.scalePxPerCm.toFixed(2) + ' px/cm</b><br>' +
        'Ahora marca el inicio de la fase propulsiva y hace clic en la barra.</div>';
    } else {
      vmpState.calPoints = [];
    }
  }
}

// ── TRACKING ──
function startVMPTracking() {
  const video = document.getElementById('vmp-video');
  if (!video || !video.src) { alert('Carga un video primero'); return; }
  if (!vmpState.scalePxPerCm) {
    if (!confirm('Sin calibracion la escala sera estimada (menos preciso). Continuar?')) return;
    vmpState.scalePxPerCm = 5; // fallback: 5px por cm
  }
  vmpState.tracking = true;
  vmpState.points   = [];
  document.getElementById('btn-vmp-start').disabled = true;
  document.getElementById('btn-vmp-stop').disabled  = false;
  document.getElementById('vmp-tracking-status').textContent = 'Tracking activo';
  document.getElementById('vmp-tracking-status').className   = 'tag tag-r';
  document.getElementById('vmp-mode-badge').textContent      = 'Hace clic en la barra en cada frame';
  document.getElementById('vmp-mode-badge').className        = 'tag tag-r';
  video.pause();
  const canvas = document.getElementById('vmp-canvas');
  canvas.onclick     = handleVMPTrackingClick;
  canvas.onmousedown = handleVMPMouseDown;
  canvas.onmousemove = handleVMPMouseMove;
  canvas.onmouseup   = handleVMPMouseUp;
  // Touch support
  canvas.ontouchstart = handleVMPTouchStart;
  canvas.ontouchmove  = handleVMPTouchMove;
  canvas.ontouchend   = handleVMPTouchEnd;
}

function stopVMPTracking() {
  vmpState.tracking = false;
  const canvas = document.getElementById('vmp-canvas');
  canvas.onclick = canvas.onmousedown = canvas.onmousemove =
  canvas.onmouseup = canvas.ontouchstart = canvas.ontouchmove = canvas.ontouchend = null;
  document.getElementById('btn-vmp-start').disabled = false;
  document.getElementById('btn-vmp-stop').disabled  = true;
  document.getElementById('vmp-tracking-status').textContent = 'Procesando...';
  calcVMPResult();
}

function getCanvasPoint(e, canvas) {
  const rect   = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const src = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * scaleX,
    y: (src.clientY - rect.top)  * scaleY
  };
}

function handleVMPTrackingClick(e) {
  if (!vmpState.tracking) return;
  const canvas = document.getElementById('vmp-canvas');
  const video  = document.getElementById('vmp-video');
  const pt = getCanvasPoint(e, canvas);
  const fps = getVMPFps();
  vmpState.points.push({ x: pt.x, y: pt.y, t: video.currentTime, frame: Math.round(video.currentTime * fps) });
  vmpState.lastMarker = { x: pt.x, y: pt.y };
  updateVMPPointsTable();
  redrawVMPCanvas();
  // Auto-advance 1 frame
  vmpJump(1);
}

function handleVMPMouseDown(e) {
  if (!vmpState.tracking || !vmpState.lastMarker) return;
  vmpState.isDragging = true;
}
function handleVMPMouseMove(e) {
  if (!vmpState.isDragging) return;
  const canvas = document.getElementById('vmp-canvas');
  const pt = getCanvasPoint(e, canvas);
  vmpState.lastMarker = { x: pt.x, y: pt.y };
  redrawVMPCanvas();
}
function handleVMPMouseUp(e) {
  if (!vmpState.isDragging) return;
  vmpState.isDragging = false;
  handleVMPTrackingClick(e);
}
function handleVMPTouchStart(e) { e.preventDefault(); handleVMPMouseDown(e); }
function handleVMPTouchMove(e)  { e.preventDefault(); handleVMPMouseMove(e); }
function handleVMPTouchEnd(e)   { e.preventDefault(); handleVMPMouseUp(e);   }

function undoLastVMPPoint() {
  if (vmpState.points.length) vmpState.points.pop();
  updateVMPPointsTable();
  redrawVMPCanvas();
}

function clearVMPTracking() {
  vmpState.points = []; vmpState.calPoints = [];
  vmpState.tracking = false; vmpState.calibrating = false;
  vmpState.scalePxPerCm = null; vmpState.lastMarker = null;
  vmpState.result = null;
  document.getElementById('vmp-result-card').style.display = 'none';
  document.getElementById('btn-vmp-start').disabled = false;
  document.getElementById('btn-vmp-stop').disabled  = true;
  document.getElementById('vmp-tracking-status').textContent = 'Limpiado';
  document.getElementById('vmp-tracking-status').className   = 'tag tag-y';
  updateVMPPointsTable();
  redrawVMPCanvas();
  if (vmpState.velocityChart) { vmpState.velocityChart.destroy(); vmpState.velocityChart = null; }
}

// ── DIBUJO CANVAS ──
function redrawVMPCanvas() {
  const canvas = document.getElementById('vmp-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Calibration points
  vmpState.calPoints.forEach((pt, i) => {
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,176,32,.8)'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center'; ctx.fillText(String.fromCharCode(65+i), pt.x, pt.y + 4);
  });
  if (vmpState.calPoints.length === 2) {
    ctx.beginPath();
    ctx.moveTo(vmpState.calPoints[0].x, vmpState.calPoints[0].y);
    ctx.lineTo(vmpState.calPoints[1].x, vmpState.calPoints[1].y);
    ctx.strokeStyle = 'rgba(255,176,32,.6)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);
  }

  // Tracking path
  if (vmpState.points.length > 0) {
    ctx.beginPath();
    ctx.moveTo(vmpState.points[0].x, vmpState.points[0].y);
    vmpState.points.forEach(pt => ctx.lineTo(pt.x, pt.y));
    ctx.strokeStyle = 'rgba(57,255,122,.5)'; ctx.lineWidth = 2;
    ctx.setLineDash([]); ctx.stroke();
    // Dots
    vmpState.points.forEach((pt, i) => {
      ctx.beginPath(); ctx.arc(pt.x, pt.y, i === 0 ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#39FF7A' : 'rgba(57,255,122,.6)'; ctx.fill();
    });
    // Last marker highlight
    if (vmpState.lastMarker) {
      ctx.beginPath(); ctx.arc(vmpState.lastMarker.x, vmpState.lastMarker.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#39FF7A'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
}

// ── TABLA DE PUNTOS ──
function updateVMPPointsTable() {
  const el = document.getElementById('vmp-points-table');
  if (!el) return;
  document.getElementById('vmp-points-count').textContent = vmpState.points.length;
  if (!vmpState.points.length) {
    el.innerHTML = '<div style="color:var(--text3);text-align:center;padding:12px">Sin puntos aun</div>';
    return;
  }
  el.innerHTML = '<table style="width:100%;border-collapse:collapse">' +
    '<tr style="color:var(--text2);border-bottom:1px solid rgba(255,255,255,.05)">' +
    '<th style="text-align:left;padding:3px 6px">#</th><th>Frame</th><th>Y(px)</th><th>T(s)</th></tr>' +
    vmpState.points.slice(-8).map((pt, i, arr) => {
      const idx = vmpState.points.length - arr.length + i;
      return '<tr style="border-bottom:1px solid rgba(255,255,255,.03)">' +
        '<td style="padding:3px 6px;color:var(--text2)">' + (idx+1) + '</td>' +
        '<td style="text-align:center;color:var(--neon)">' + pt.frame + '</td>' +
        '<td style="text-align:center;color:var(--amber)">' + Math.round(pt.y) + '</td>' +
        '<td style="text-align:center;color:var(--text2)">' + pt.t.toFixed(3) + '</td></tr>';
    }).join('') + '</table>';
}

// ── CALCULO VMP ──
function calcVMPResult() {
  const pts = vmpState.points;
  if (pts.length < 2) {
    alert('Necesitas al menos 2 puntos para calcular la VMP');
    document.getElementById('vmp-tracking-status').textContent = 'Pocos puntos';
    document.getElementById('vmp-tracking-status').className = 'tag tag-r';
    return;
  }

  const scale = vmpState.scalePxPerCm || 5; // px/cm
  const velocities = [];
  const times = [];

  for (let i = 1; i < pts.length; i++) {
    const dy  = (pts[i-1].y - pts[i].y) / scale; // cm -- invertido (Y crece hacia abajo)
    const dt  = pts[i].t - pts[i-1].t;            // segundos
    if (dt > 0) {
      const v = (dy / 100) / dt; // m/s (convertir cm a m)
      velocities.push(v);
      times.push(pts[i].t);
    }
  }

  // Filtrar solo velocidades positivas (fase propulsiva) si corresponde
  let filteredVel = velocities;
  if (vmpState.fase === 'propulsiva') {
    filteredVel = velocities.filter(v => v > 0.05);
  }
  if (!filteredVel.length) filteredVel = velocities;

  const vmp   = filteredVel.reduce((a,b) => a+b, 0) / filteredVel.length;
  const vpico = Math.max(...velocities);
  const romPx = Math.abs(pts[pts.length-1].y - pts[0].y);
  const romCm = romPx / scale;
  const tMs   = Math.round((pts[pts.length-1].t - pts[0].t) * 1000);

  vmpState.result = {
    vmp:   +vmp.toFixed(3),
    vpico: +vpico.toFixed(3),
    romCm: +romCm.toFixed(1),
    tMs,
    ejercicio: vmpState.ejercicio,
    carga: vmpState.carga,
    velocities,
    times,
    fecha: new Date().toISOString().split('T')[0]
  };

  // Mostrar resultados
  const ref  = VMP_REFS[vmpState.ejercicio] || VMP_REFS['sentadilla'];
  const zona = vmp >= ref.z1 ? { label:'Alta velocidad (> 1RM estimado)', c:'var(--neon)' }
             : vmp >= ref.z2 ? { label:'Potencia-velocidad', c:'var(--blue)' }
             : vmp >= ref.z3 ? { label:'Potencia-fuerza', c:'var(--amber)' }
             : vmp >= ref.z4 ? { label:'Fuerza-velocidad', c:'var(--red)' }
             : { label:'Zona de fuerza maxima', c:'var(--red)' };

  document.getElementById('vmp-result-card').style.display = 'block';
  document.getElementById('vmp-result-vmp').textContent    = vmp.toFixed(2);
  document.getElementById('vmp-result-vmp').style.color    = zona.c;
  document.getElementById('vmp-result-vpico').textContent  = vpico.toFixed(2);
  document.getElementById('vmp-result-rom').textContent    = romCm.toFixed(0);
  document.getElementById('vmp-result-tiempo').textContent = tMs;
  document.getElementById('vmp-result-badge').textContent  = zona.label;
  document.getElementById('vmp-result-badge').style.background = zona.c + '22';
  document.getElementById('vmp-result-badge').style.color      = zona.c;

  document.getElementById('vmp-tracking-status').textContent = 'Calculado!';
  document.getElementById('vmp-tracking-status').className   = 'tag tag-g';

  // Preview F-V integration
  if (vmpState.carga) {
    document.getElementById('vmp-fv-preview').innerHTML =
      '<b style="color:var(--neon)">' + vmpState.carga + ' kg</b> @ ' +
      '<b style="color:var(--neon)">' + vmp.toFixed(2) + ' m/s</b>' +
      ' -- Punto F-V listo para agregar al perfil';
  }

  // Ref compare
  document.getElementById('vmp-ref-compare').innerHTML =
    '<div style="font-family:var(--mono);font-size:9px;color:var(--text2);text-transform:uppercase;margin-bottom:4px">' +
    'Zonas de entrenamiento -- ' + ref.label + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px">' +
    '<span style="color:var(--neon)">Alta vel: > ' + ref.z1 + ' m/s</span>' +
    '<span style="color:var(--blue)">Pot-vel: > ' + ref.z2 + ' m/s</span>' +
    '<span style="color:var(--amber)">Pot-fza: > ' + ref.z3 + ' m/s</span>' +
    '<span style="color:var(--red)">Fza-vel: > ' + ref.z4 + ' m/s</span>' +
    '</div>';

  renderVMPVelocityChart(times, velocities);
}

// ── GRAFICO VELOCIDAD ──
function renderVMPVelocityChart(times, velocities) {
  const ctx = document.getElementById('vmp-velocity-chart');
  if (!ctx) return;
  if (vmpState.velocityChart) vmpState.velocityChart.destroy();
  vmpState.velocityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: times.map(t => t.toFixed(2) + 's'),
      datasets: [{
        label: 'Velocidad (m/s)',
        data: velocities,
        borderColor: '#39FF7A',
        backgroundColor: 'rgba(57,255,122,.08)',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#39FF7A',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 400 },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#555', font: { size: 9 } } },
        y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#555', font: { size: 9 } },
             beginAtZero: false }
      }
    }
  });
}

// ── TABLA DE REFERENCIAS ──
function updateVMPRefTable() {
  const el  = document.getElementById('vmp-ref-table');
  if (!el) return;
  const ej  = document.getElementById('vmp-ejercicio')?.value || 'sentadilla';
  const ref = VMP_REFS[ej] || VMP_REFS['sentadilla'];
  el.innerHTML =
    '<div style="font-family:var(--mono);font-size:9px;color:var(--text2);text-transform:uppercase;margin-bottom:8px">' + ref.label + '</div>' +
    '<table style="width:100%;font-size:11px;border-collapse:collapse">' +
    '<tr><td style="color:var(--neon);padding:3px 0">Alta velocidad</td><td style="text-align:right;font-family:var(--mono)">> ' + ref.z1 + ' m/s</td><td style="padding-left:8px;font-size:9px;color:var(--text2)">~10-30% 1RM</td></tr>' +
    '<tr><td style="color:var(--blue);padding:3px 0">Potencia-vel</td><td style="text-align:right;font-family:var(--mono)">' + ref.z2 + '-' + ref.z1 + ' m/s</td><td style="padding-left:8px;font-size:9px;color:var(--text2)">~30-50% 1RM</td></tr>' +
    '<tr><td style="color:var(--amber);padding:3px 0">Potencia-fza</td><td style="text-align:right;font-family:var(--mono)">' + ref.z3 + '-' + ref.z2 + ' m/s</td><td style="padding-left:8px;font-size:9px;color:var(--text2)">~50-70% 1RM</td></tr>' +
    '<tr><td style="color:var(--red);padding:3px 0">Fuerza-vel</td><td style="text-align:right;font-family:var(--mono)">' + ref.z4 + '-' + ref.z3 + ' m/s</td><td style="padding-left:8px;font-size:9px;color:var(--text2)">~70-85% 1RM</td></tr>' +
    '<tr><td style="color:#cc4444;padding:3px 0">Fuerza max</td><td style="text-align:right;font-family:var(--mono)">< ' + ref.z4 + ' m/s</td><td style="padding-left:8px;font-size:9px;color:var(--text2)">>85% 1RM</td></tr>' +
    '</table>';
}

// ── GUARDAR EN F-V ──
function saveVMPResult() {
  if (!cur) { alert('Selecciona un atleta'); return; }
  if (!vmpState.result) { alert('Calcula la VMP primero'); return; }
  const r  = vmpState.result;
  const ej = r.ejercicio || 'sentadilla';
  const fecha = r.fecha || new Date().toISOString().split('T')[0];
  if (!cur.evals) cur.evals = {};
  const key = 'vmp_' + ej + '_' + Date.now();
  cur.evals[key] = {
    tipo: 'vmp-video',
    ejercicio: ej,
    carga: r.carga,
    vmp: r.vmp,
    vpico: r.vpico,
    romCm: r.romCm,
    tMs: r.tMs,
    fecha
  };
  // Tambien actualizar lastFV si hay carga para integrar al perfil
  if (r.carga && r.vmp) {
    if (!cur.lastFV) cur.lastFV = {};
    if (!cur.lastFV.vmpPoints) cur.lastFV.vmpPoints = [];
    cur.lastFV.vmpPoints.push({ carga: r.carga, vmp: r.vmp, ej });
    cur.lastFV.ultimoVMP = r.vmp;
  }
  atletas = atletas.map(a => a.id === cur.id ? cur : a);
  saveData();
  showSaveToast();
  document.getElementById('vmp-fv-preview').innerHTML =
    '<span style="color:var(--neon)">Guardado en el perfil del atleta!</span>';
}


// ========================================================
//  VIDEO JUMP MODAL -- Reutilizable para cualquier test
//  Se invoca con: abrirVideoJump('cmj') -> escribe en cmj-r1
// ========================================================

let vjState = {
  targetKey: null,
  calMode: 'auto',
  calFactor: null,
  fpsPreset: null,   // key del test destino (sj, cmj, abk, dj, djb)
  targetField: null, // id del input destino
  takeoff: null,
  landing: null,
  fps: 60
};

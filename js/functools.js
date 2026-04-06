// ── GLOBALS (compartidos entre módulos) ──
// cur, atletas, kineState, etc. se definen en app.js
// Este archivo asume que app.js ya fue cargado

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


// ========================================================
//  VMP -- ENCODER DE BARRA POR VIDEO
//  Tracking semi-automatico de barra desde video lateral
// ========================================================

const VMP_REFS = {
  'sentadilla':     { z1: 1.00, z2: 0.75, z3: 0.50, z4: 0.35, label: 'Squat', unit: 'm/s' },
  'press-banca':    { z1: 0.80, z2: 0.60, z3: 0.40, z4: 0.25, label: 'Press Banca', unit: 'm/s' },
  'peso-muerto':    { z1: 0.70, z2: 0.50, z3: 0.35, z4: 0.20, label: 'Peso Muerto', unit: 'm/s' },
  'remo-invertido': { z1: 0.75, z2: 0.55, z3: 0.38, z4: 0.22, label: 'Remo Invertido', unit: 'm/s' }
};

let vmpState = {
  tracking: false,
  calibrating: false,
  points: [],
  calPoints: [],
  scalePxPerCm: null,
  fps: 60,
  fase: 'propulsiva',
  ejercicio: 'sentadilla',
  carga: null,
  velocityChart: null,
  isDragging: false,
  lastMarker: null,
  result: null
};

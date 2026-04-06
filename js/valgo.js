// ── GLOBALS (compartidos entre módulos) ──
// cur, atletas, kineState, etc. se definen en app.js
// Este archivo asume que app.js ya fue cargado

function loadValgoVideo(input) {
  if (!input.files.length) return;
  const url = URL.createObjectURL(input.files[0]);
  const v   = document.getElementById('valgo-video');
  v.src = url; v.load();
  document.getElementById('valgo-player-wrap').style.display = 'block';
  document.getElementById('valgo-upload-area').style.display = 'none';
  v.addEventListener('loadedmetadata', () => {
    const fps = valgoState.fps;
    document.getElementById('valgo-frame-tot').textContent = Math.floor(v.duration * fps);
    updateValgoFrameInfo();
    initValgoCanvas();
  });
  v.addEventListener('timeupdate', updateValgoFrameInfo);
}

function initValgoCanvas() {
  const v = document.getElementById('valgo-video');
  const c = document.getElementById('valgo-canvas');
  if (!c || !v) return;
  c.width  = v.videoWidth  || 640;
  c.height = v.videoHeight || 360;
  valgoState.ctx = c.getContext('2d');
  c.onclick     = handleValgoClick;
  c.ontouchstart = (e) => { e.preventDefault(); handleValgoClick(e.touches[0], c); };
  redrawValgoCanvas();
}

function updateValgoFrameInfo() {
  const v = document.getElementById('valgo-video');
  if (!v || !v.duration) return;
  const fps = valgoState.fps;
  document.getElementById('valgo-frame-cur').textContent = Math.round(v.currentTime * fps);
  document.getElementById('valgo-time-cur').textContent  = v.currentTime.toFixed(3) + 's';
  const s = document.getElementById('valgo-scrubber');
  if (s) s.value = Math.round((v.currentTime / v.duration) * 1000);
}

function setValgoFps(fps, btn) {
  valgoState.fps = fps;
  document.querySelectorAll('#valgo-fps-btns button').forEach(b => b.className = 'btn btn-ghost btn-sm');
  if (btn) btn.className = 'btn btn-neon btn-sm';
  document.getElementById('valgo-fps').value = fps;
}

function valgoJump(n) {
  const v = document.getElementById('valgo-video');
  if (!v || !v.src) return;
  v.pause(); document.getElementById('valgo-play-btn').textContent = 'Play';
  v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + n / valgoState.fps));
  setTimeout(() => { updateValgoFrameInfo(); redrawValgoCanvas(); }, 40);
}

function valgoTogglePlay() {
  const v = document.getElementById('valgo-video');
  const btn = document.getElementById('valgo-play-btn');
  if (!v) return;
  if (v.paused) { v.play(); btn.textContent = 'Pausa'; }
  else          { v.pause(); btn.textContent = 'Play'; redrawValgoCanvas(); }
}

function valgoScrub(val) {
  const v = document.getElementById('valgo-video');
  if (!v || !v.duration) return;
  v.currentTime = (val / 1000) * v.duration;
}

function setValgoMode(mode) {
  valgoState.mode = mode;
  const b1 = document.getElementById('valgo-btn-linea1');
  const b2 = document.getElementById('valgo-btn-linea2');
  if (b1) { b1.className = mode === 'linea1' ? 'btn btn-neon btn-full btn-sm' : 'btn btn-ghost btn-full btn-sm'; b1.style.fontSize = '11px'; }
  if (b2) { b2.className = mode === 'linea2' ? 'btn btn-neon btn-full btn-sm' : 'btn btn-ghost btn-full btn-sm'; b2.style.fontSize = '11px'; }
  const info = document.getElementById('valgo-mode-info');
  if (info) {
    if (mode === 'linea1') info.textContent = 'Linea 1 activa -- traza el eje del FEMUR. Clic en punto proximal y luego en punto distal (centro de rodilla).';
    else info.textContent = 'Linea 2 activa -- traza el eje de la TIBIA. Clic en centro de rodilla y luego en punto distal (tobillo).';
  }
}

function setValgoColor(color, el) {
  valgoState.color = color;
  document.querySelectorAll('[id^="vc-"]').forEach(e => e.style.border = '2px solid transparent');
  if (el) el.style.border = '2px solid #fff';
  redrawValgoCanvas();
}

function handleValgoClick(e) {
  const canvas = document.getElementById('valgo-canvas');
  const video  = document.getElementById('valgo-video');
  if (!canvas || !video) return;
  // Pause video when user clicks to draw
  video.pause();
  document.getElementById('valgo-play-btn').textContent = 'Play';
  const rect   = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const src = e.touches ? e.touches[0] : e;
  const x = (src.clientX - rect.left)  * scaleX;
  const y = (src.clientY - rect.top)   * scaleY;
  const line = valgoState.mode === 'linea1' ? valgoState.linea1 : valgoState.linea2;
  if (line.length >= 2) {
    // Replace the line
    line.length = 0;
  }
  line.push({ x, y });
  redrawValgoCanvas();
  if (valgoState.linea1.length === 2 && valgoState.linea2.length === 2) {
    calcValgoAngle();
    // Auto-switch mode
    if (valgoState.mode === 'linea1') setValgoMode('linea2');
  } else if (valgoState.linea1.length === 1 && valgoState.mode === 'linea1') {
    // keep mode
  } else if (valgoState.linea1.length === 2 && valgoState.mode === 'linea1') {
    setValgoMode('linea2');
  }
}

function undoValgoPoint() {
  if (valgoState.mode === 'linea2' && valgoState.linea2.length > 0) {
    valgoState.linea2.pop();
  } else if (valgoState.linea1.length > 0) {
    valgoState.linea1.pop();
    setValgoMode('linea1');
  }
  redrawValgoCanvas();
  if (valgoState.linea1.length < 2 || valgoState.linea2.length < 2) {
    document.getElementById('valgo-result-card').style.display = 'none';
  }
}

function clearValgoLines() {
  valgoState.linea1 = []; valgoState.linea2 = []; valgoState.angle = null;
  setValgoMode('linea1');
  redrawValgoCanvas();
  document.getElementById('valgo-result-card').style.display = 'none';
}

function redrawValgoCanvas() {
  const canvas = document.getElementById('valgo-canvas');
  const video  = document.getElementById('valgo-video');
  if (!canvas || !video) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw video frame
  if (!video.paused || video.currentTime > 0) {
    try { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); } catch(e) {}
  }
  const color = valgoState.color;
  const lw    = parseInt(document.getElementById('valgo-line-width')?.value || 2);

  // Draw linea1 (Femur) -- solid
  drawValgoLine(ctx, valgoState.linea1, color, lw, 'FEMUR', [10, 0]);

  // Draw linea2 (Tibia) -- dashed
  drawValgoLine(ctx, valgoState.linea2, '#4D9EFF', lw, 'TIBIA', [6, 4]);

  // Draw angle arc if both lines complete
  if (valgoState.linea1.length === 2 && valgoState.linea2.length === 2 && valgoState.angle !== null) {
    drawValgoAngleArc(ctx);
  }
}

function drawValgoLine(ctx, pts, color, lw, label, dash) {
  if (pts.length === 0) return;
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = lw;
  ctx.setLineDash(dash);
  ctx.lineCap     = 'round';
  // Draw points
  pts.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5 + lw, 0, Math.PI * 2);
    ctx.fill();
    // Point label
    ctx.font = 'bold ' + (10 + lw) + 'px monospace';
    ctx.fillText(label + (i+1), p.x + 8, p.y - 6);
  });
  // Draw line if 2 points
  if (pts.length === 2) {
    // Extend line visually
    const dx = pts[1].x - pts[0].x;
    const dy = pts[1].y - pts[0].y;
    const len = Math.sqrt(dx*dx + dy*dy);
    const ext = 30;
    const ux = dx/len, uy = dy/len;
    ctx.beginPath();
    ctx.moveTo(pts[0].x - ux*ext, pts[0].y - uy*ext);
    ctx.lineTo(pts[1].x + ux*ext, pts[1].y + uy*ext);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawValgoAngleArc(ctx) {
  // Find intersection point (use linea1[1] = linea2[0] if they share knee point)
  // Otherwise use midpoint
  const l1 = valgoState.linea1;
  const l2 = valgoState.linea2;
  const kneeX = (l1[1].x + l2[0].x) / 2;
  const kneeY = (l1[1].y + l2[0].y) / 2;
  const angle = valgoState.angle;
  const r = 40;
  // Draw arc
  const ang1 = Math.atan2(l1[0].y - kneeY, l1[0].x - kneeX);
  const ang2 = Math.atan2(l2[1].y - kneeY, l2[1].x - kneeX);
  const c = angle < 5 ? '#39FF7A' : angle < 10 ? '#FFB020' : '#FF4444';
  ctx.strokeStyle = c;
  ctx.lineWidth   = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(kneeX, kneeY, r, ang1, ang2);
  ctx.stroke();
  // Angle label
  ctx.fillStyle = c;
  ctx.font = 'bold 18px monospace';
  ctx.fillText(angle.toFixed(1) + 'deg', kneeX + r + 6, kneeY + 6);
}

function calcValgoAngle() {
  const l1 = valgoState.linea1;
  const l2 = valgoState.linea2;
  if (l1.length < 2 || l2.length < 2) return;
  // Vector of each line
  const v1x = l1[1].x - l1[0].x, v1y = l1[1].y - l1[0].y;
  const v2x = l2[1].x - l2[0].x, v2y = l2[1].y - l2[0].y;
  const dot  = v1x*v2x + v1y*v2y;
  const mag1 = Math.sqrt(v1x*v1x + v1y*v1y);
  const mag2 = Math.sqrt(v2x*v2x + v2y*v2y);
  const cosA = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  const angleDeg = Math.acos(cosA) * (180 / Math.PI);
  // Valgo angle = deviation from 180 (straight leg)
  const valgoAngle = Math.abs(180 - angleDeg);
  valgoState.angle = valgoAngle;
  // Show result
  const c = valgoAngle < 5 ? 'var(--neon)' : valgoAngle < 10 ? 'var(--amber)' : 'var(--red)';
  const label = valgoAngle < 5 ? 'Normal' : valgoAngle < 10 ? 'Valgo leve' : 'Valgo critico';
  document.getElementById('valgo-result-card').style.display = 'block';
  document.getElementById('valgo-angle-display').textContent = valgoAngle.toFixed(1);
  document.getElementById('valgo-angle-display').style.color = c;
  const badge = document.getElementById('valgo-result-badge');
  badge.textContent = label;
  badge.style.background = c.replace('var(', '').replace(')', '') + '22';
  badge.style.color = c;
  const interp = document.getElementById('valgo-interp');
  if (interp) {
    const test = document.getElementById('valgo-test-type')?.value || 'test';
    interp.innerHTML =
      '<div style="font-family:var(--mono);font-size:10px;color:var(--text2);margin-bottom:4px">' + test + '</div>' +
      (valgoAngle < 5 ? '<span style="color:var(--neon)">Sin valgo dinamico significativo. Patron de movimiento correcto.</span>'
      : valgoAngle < 10 ? '<span style="color:var(--amber)">Valgo leve detectado. Monitorear y trabajar activacion de gluteo medio.</span>'
      : '<span style="color:var(--red);font-weight:700">Valgo critico > 10deg. Riesgo aumentado de lesion LCA. Intervenir con ejercicios correctivos.</span>');
  }
  redrawValgoCanvas();
}

function saveValgoResult() {
  if (!cur || !valgoState.angle) return;
  const test  = document.getElementById('valgo-test-type')?.value || 'test';
  const fecha = new Date().toISOString().split('T')[0];
  if (!cur.evals) cur.evals = {};
  cur.evals['valgo_' + Date.now()] = {
    tipo: 'valgo', test, angulo: +valgoState.angle.toFixed(1), fecha
  };
  atletas = atletas.map(a => a.id === cur.id ? cur : a);
  saveData();
  showSaveToast();
}

function captureValgoImage() {
  const canvas = document.getElementById('valgo-canvas');
  if (!canvas) return;
  redrawValgoCanvas();
  const link = document.createElement('a');
  link.download = 'valgo_' + (cur?.nombre || 'atleta') + '_' + new Date().toISOString().split('T')[0] + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}


// ══════════════════════════════════════════════════════
//  SEGUIMIENTO DE LESION

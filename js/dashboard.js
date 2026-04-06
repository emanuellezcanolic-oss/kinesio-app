// ── GLOBALS (compartidos entre módulos) ──
// cur, atletas, kineState, etc. se definen en app.js
// Este archivo asume que app.js ya fue cargado

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

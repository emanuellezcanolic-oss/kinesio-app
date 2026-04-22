// ══════════════════════════════════════════════════════════════
//  planillas.js — Herramientas de las planillas Tecni 2026 y Evaluaciones
//  Integración quirúrgica — no modifica ningún archivo existente
// ══════════════════════════════════════════════════════════════

// ════════════════════════════════════════
//  ENCODER SMITH — Multi-ejercicio
//  Fuente: "Test encoder Smith" de Planilla evaluaciones
// ════════════════════════════════════════

const SMITH_EJERCICIOS = [
  { id: 'sq',   label: 'Sentadilla',    vmpRM: 0.32 },
  { id: 'pb',   label: 'Press Banca',   vmpRM: 0.18 },
  { id: 'remo', label: 'Remo Horizontal', vmpRM: 0.53 },
];

let _smithData = {}; // { sq: {kg, vmp}, pb: {...}, remo: {...} }

function initSmith() {
  const tbody = document.getElementById('smith-rows');
  if (!tbody || tbody.children.length > 0) return;
  SMITH_EJERCICIOS.forEach(ej => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border)';
    tr.innerHTML = `
      <td style="padding:6px 4px;font-size:12px;font-weight:600;color:var(--text2)">${ej.label}</td>
      <td style="padding:4px">
        <input class="inp inp-mono" type="number" step=".5" id="smith-kg-${ej.id}"
          placeholder="70" style="font-size:12px;padding:6px 8px" oninput="calcSmith()">
      </td>
      <td style="padding:4px">
        <input class="inp inp-mono" type="number" step=".001" id="smith-vmp-${ej.id}"
          placeholder="0.420" style="font-size:12px;padding:6px 8px" oninput="calcSmith()">
      </td>
      <td style="font-family:var(--mono);font-size:12px;color:var(--amber);padding:6px 4px;white-space:nowrap" id="smith-rm-${ej.id}">—</td>
      <td style="font-family:var(--mono);font-size:12px;color:var(--neon);padding:6px 4px;white-space:nowrap" id="smith-fr-${ej.id}">—</td>
    `;
    tbody.appendChild(tr);
  });
}

function calcSmith() {
  const pc = cur?.peso ? +cur.peso : null;
  let html = '';

  SMITH_EJERCICIOS.forEach(ej => {
    const kg  = parseFloat(document.getElementById('smith-kg-' + ej.id)?.value);
    const vmp = parseFloat(document.getElementById('smith-vmp-' + ej.id)?.value);
    const rmEl = document.getElementById('smith-rm-' + ej.id);
    const frEl = document.getElementById('smith-fr-' + ej.id);

    if (isNaN(kg) || isNaN(vmp) || kg <= 0 || vmp <= 0) {
      if (rmEl) rmEl.textContent = '—';
      if (frEl) frEl.textContent = '—';
      return;
    }

    // Estimación RM via constantes matemáticas de la planilla
    // VMP = a + b*kg  →  kg_RM = (vmpRM - a) / b
    // Aproximación directa de la planilla: usar relación VMP/carga lineal
    // Con un solo punto usamos la referencia de la hoja: a ≈ VMP_máx teórica
    // La planilla usa: RM estimado = kg / (1 - (vmpRM - vmp) * k)
    // Usamos método de Gonzalez-Badillo (1RM por regresión de la pendiente)
    // Con 1 punto: RM = kg / (%RM/100) donde %RM se estima por VMP
    // Aproximación: pendiente media encoder ~-0.006 (sentadilla), usar tabla VMP→%RM
    const slope = _smithGetSlope(ej.id);
    const intercept = vmp - slope * kg; // a = VMP - b*carga
    const rmKg = slope < 0 ? ((ej.vmpRM - intercept) / slope) : null;

    _smithData[ej.id] = { kg, vmp, rmKg };

    if (rmEl) rmEl.textContent = rmKg ? rmKg.toFixed(1) + ' kg' : '—';
    if (frEl && rmKg && pc) {
      const fr = (rmKg / pc).toFixed(2);
      frEl.textContent = fr + '×PC';
      const norm = { sq: [1.0, 1.5], pb: [0.75, 1.25], remo: [0.8, 1.2] }[ej.id] || [1.0, 1.5];
      frEl.style.color = +fr >= norm[1] ? 'var(--neon)' : +fr >= norm[0] ? 'var(--amber)' : 'var(--red)';
    } else if (frEl) {
      frEl.textContent = rmKg ? rmKg.toFixed(1) + ' kg' : '—';
    }
  });

  // Tabla % RM
  renderSmithPctTable();
}

function _smithGetSlope(id) {
  // Pendientes características por ejercicio de la planilla
  const slopes = { sq: -0.00546, pb: -0.01164, remo: -0.0123 };
  return slopes[id] || -0.007;
}

function addSmithPair(ejId) {
  // Para multi-punto: abrir mini-modal
  // Simple: agregar fila extra con segundo punto para mejor regresión
  const wrap = document.getElementById('smith-extra-' + ejId);
  if (!wrap) return;
  const i = wrap.children.length;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:6px;margin-bottom:4px';
  div.innerHTML = `
    <input class="inp inp-mono" type="number" step=".5" placeholder="kg"
      style="flex:1;font-size:11px;padding:5px 7px" oninput="calcSmithMulti('${ejId}')">
    <input class="inp inp-mono" type="number" step=".001" placeholder="VMP"
      style="flex:1;font-size:11px;padding:5px 7px" oninput="calcSmithMulti('${ejId}')">
    <button onclick="this.parentElement.remove();calcSmithMulti('${ejId}')"
      style="background:none;border:none;color:var(--text3);font-size:14px;cursor:pointer;padding:2px 4px">×</button>
  `;
  wrap.appendChild(div);
}

function calcSmithMulti(ejId) {
  const wrap = document.getElementById('smith-extra-' + ejId);
  if (!wrap) return;
  const rows = [...wrap.querySelectorAll('div')];
  const pairs = rows.map(r => {
    const inps = r.querySelectorAll('input');
    return { kg: +inps[0].value, vmp: +inps[1].value };
  }).filter(p => p.kg > 0 && p.vmp > 0);

  // También el par principal
  const kgMain  = parseFloat(document.getElementById('smith-kg-' + ejId)?.value);
  const vmpMain = parseFloat(document.getElementById('smith-vmp-' + ejId)?.value);
  if (!isNaN(kgMain) && kgMain > 0 && !isNaN(vmpMain) && vmpMain > 0) {
    pairs.unshift({ kg: kgMain, vmp: vmpMain });
  }

  if (pairs.length < 2) return;

  const ej = SMITH_EJERCICIOS.find(e => e.id === ejId);
  const n = pairs.length;
  const sumX  = pairs.reduce((s, p) => s + p.kg,  0);
  const sumY  = pairs.reduce((s, p) => s + p.vmp, 0);
  const sumXY = pairs.reduce((s, p) => s + p.kg * p.vmp, 0);
  const sumX2 = pairs.reduce((s, p) => s + p.kg * p.kg,  0);
  const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const a = sumY / n - b * sumX / n;

  const rmKg  = b < 0 ? ((ej.vmpRM - a) / b) : null;
  const meanY = sumY / n;
  const ssTot = pairs.reduce((s, p) => s + (p.vmp - meanY) ** 2, 0);
  const ssRes = pairs.reduce((s, p) => s + (p.vmp - (a + b * p.kg)) ** 2, 0);
  const r2    = ssTot > 0 ? +(1 - ssRes / ssTot).toFixed(4) : 0;

  _smithData[ejId] = { kg: kgMain, vmp: vmpMain, rmKg, a, b, r2, multi: true };

  const rmEl = document.getElementById('smith-rm-' + ejId);
  const frEl = document.getElementById('smith-fr-' + ejId);
  if (rmEl) rmEl.textContent = rmKg ? rmKg.toFixed(1) + ' kg (' + (r2 * 100).toFixed(1) + '% R²)' : '—';
  const pc = cur?.peso ? +cur.peso : null;
  if (frEl && rmKg && pc) {
    const fr = (rmKg / pc).toFixed(2);
    frEl.textContent = fr + '×PC';
    const norm = { sq: [1.0, 1.5], pb: [0.75, 1.25], remo: [0.8, 1.2] }[ejId] || [1.0, 1.5];
    frEl.style.color = +fr >= norm[1] ? 'var(--neon)' : +fr >= norm[0] ? 'var(--amber)' : 'var(--red)';
  }

  renderSmithPctTable();
}

function renderSmithPctTable() {
  const tbody = document.getElementById('smith-pct-tbody');
  if (!tbody) return;
  const pcts = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];

  const cols = SMITH_EJERCICIOS.map(ej => {
    const d = _smithData[ej.id];
    const slope = d?.b ?? _smithGetSlope(ej.id);
    const intercept = d ? (d.a ?? (d.vmp - slope * d.kg)) : null;
    return { ej, rm: d?.rmKg, slope, intercept };
  });

  tbody.innerHTML = pcts.map(pct => {
    const cells = cols.map(col => {
      if (!col.rm) return '<td class="mono-cell" style="color:var(--text3)">—</td><td class="mono-cell" style="color:var(--text3)">—</td>';
      const kgLoad = +(col.rm * pct / 100).toFixed(1);
      const vmpE   = col.intercept !== null ? +(col.intercept + col.slope * kgLoad).toFixed(3) : null;
      const vCol   = vmpE && vmpE > 0 ? 'var(--neon)' : 'var(--text3)';
      return `<td class="mono-cell">${kgLoad}</td><td class="mono-cell" style="color:${vCol}">${vmpE && vmpE > 0 ? vmpE : '—'}</td>`;
    }).join('');
    return `<tr><td class="mono-cell" style="color:var(--text2)">${pct}%</td>${cells}</tr>`;
  }).join('');
}

// ════════════════════════════════════════
//  COMPARATIVA PRE / POST F-V
// ════════════════════════════════════════

const PP_PCTS = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30];

function ppAddRow(side) {
  const wrap = document.getElementById('pp-' + side + '-rows');
  if (!wrap) return;
  const row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 20px;gap:4px;margin-bottom:4px';
  row.innerHTML =
    '<input class="inp inp-mono" type="text" inputmode="decimal" placeholder="kg" style="font-size:12px;padding:5px 7px" oninput="ppLiveUpdate()">' +
    '<input class="inp inp-mono" type="text" inputmode="decimal" placeholder="0.650" style="font-size:12px;padding:5px 7px" oninput="ppLiveUpdate()">' +
    '<button onclick="this.closest(\'div\').remove();ppLiveUpdate()" style="background:none;border:none;color:var(--text3);font-size:13px;cursor:pointer;padding:0">×</button>';
  wrap.appendChild(row);
}

function ppGetPairs(side) {
  const wrap = document.getElementById('pp-' + side + '-rows');
  if (!wrap) return [];
  const result = [];
  wrap.querySelectorAll('div').forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs.length < 2) return;
    const kg  = parseFloat(inputs[0].value.trim().replace(',', '.'));
    const vmp = parseFloat(inputs[1].value.trim().replace(',', '.'));
    if (!isNaN(kg) && !isNaN(vmp) && kg > 0 && vmp > 0) result.push({ kg, vmp });
  });
  return result;
}

function ppLinReg(pairs) {
  const n = pairs.length;
  if (n < 2) return null;
  const sX  = pairs.reduce((s, p) => s + p.kg, 0);
  const sY  = pairs.reduce((s, p) => s + p.vmp, 0);
  const sXY = pairs.reduce((s, p) => s + p.kg * p.vmp, 0);
  const sX2 = pairs.reduce((s, p) => s + p.kg * p.kg, 0);
  const den = n * sX2 - sX * sX;
  if (Math.abs(den) < 1e-12) return null;
  const b = (n * sXY - sX * sY) / den;
  const a = sY / n - b * sX / n;
  const mY = sY / n;
  const ss = pairs.reduce((s, p) => s + (p.vmp - mY) ** 2, 0);
  const sr = pairs.reduce((s, p) => s + (p.vmp - (a + b * p.kg)) ** 2, 0);
  const r2 = ss > 0 ? +(1 - sr / ss).toFixed(4) : 1;
  return { a, b, r2 };
}

function ppLiveUpdate() {
  const ejId = document.getElementById('pp-ej-manual')?.value || 'sentadilla';
  const vRef = (typeof VMP_REF !== 'undefined' && VMP_REF[ejId]) ? VMP_REF[ejId] : 0.32;
  const sides = [
    { side: 'pre',  rmEl: document.getElementById('pp-pre-rm'),  r2El: document.getElementById('pp-pre-r2')  },
    { side: 'post', rmEl: document.getElementById('pp-post-rm'), r2El: document.getElementById('pp-post-r2') },
  ];
  sides.forEach(({ side, rmEl, r2El }) => {
    const pairs = ppGetPairs(side);
    if (!rmEl || !r2El) return;
    if (pairs.length < 2) {
      rmEl.textContent = pairs.length ? pairs.length + ' par(es)' : '—';
      r2El.textContent = '—';
      return;
    }
    const r = ppLinReg(pairs);
    if (!r) { rmEl.textContent = '—'; r2El.textContent = '—'; return; }
    const rm = r.b < 0 ? +((vRef - r.a) / r.b).toFixed(1) : null;
    rmEl.textContent = rm ? rm + ' kg' : '— (pendiente +)';
    r2El.textContent = 'R²=' + r.r2;
  });
}

function ppCalcular() {
  const msgEl = document.getElementById('pp-msg');
  const outEl = document.getElementById('prepost-output');

  const ejId  = document.getElementById('pp-ej-manual')?.value || 'sentadilla';
  const vRef  = (typeof VMP_REF !== 'undefined' && VMP_REF[ejId]) ? VMP_REF[ejId] : 0.32;

  const pre  = ppGetPairs('pre');
  const post = ppGetPairs('post');

  // Siempre mostrar conteo
  const preRmEl  = document.getElementById('pp-pre-rm');
  const postRmEl = document.getElementById('pp-post-rm');
  const preR2El  = document.getElementById('pp-pre-r2');
  const postR2El = document.getElementById('pp-post-r2');

  if (preRmEl)  preRmEl.textContent  = pre.length  + ' par(es)';
  if (postRmEl) postRmEl.textContent = post.length + ' par(es)';

  if (pre.length < 3 || post.length < 3) {
    if (msgEl) { msgEl.textContent = '⚠️ Necesitás al menos 3 pares válidos por lado (kg > 0 y VMP > 0).'; msgEl.style.display = 'block'; }
    if (outEl) outEl.style.display = 'none';
    return;
  }
  if (msgEl) msgEl.style.display = 'none';

  const rPre  = ppLinReg(pre);
  const rPost = ppLinReg(post);

  if (!rPre || !rPost) {
    if (msgEl) { msgEl.textContent = '⚠️ No se pudo calcular la regresión. Verificá que los datos tengan variación.'; msgEl.style.display = 'block'; }
    if (outEl) outEl.style.display = 'none';
    return;
  }

  const rm1Pre  = rPre.b  < 0 ? +((vRef - rPre.a)  / rPre.b).toFixed(1)  : null;
  const rm1Post = rPost.b < 0 ? +((vRef - rPost.a) / rPost.b).toFixed(1) : null;

  if (preRmEl)  preRmEl.textContent  = rm1Pre  ? rm1Pre  + ' kg' : '— (b≥0)';
  if (postRmEl) postRmEl.textContent = rm1Post ? rm1Post + ' kg' : '— (b≥0)';
  if (preR2El)  preR2El.textContent  = 'R²=' + rPre.r2;
  if (postR2El) postR2El.textContent = 'R²=' + rPost.r2;

  if (!rm1Pre || !rm1Post) {
    if (msgEl) { msgEl.textContent = '⚠️ La pendiente es positiva — revisá los datos (VMP debe bajar al subir la carga).'; msgEl.style.display = 'block'; }
    if (outEl) outEl.style.display = 'none';
    return;
  }

  // KPIs
  const dRM   = ((rm1Post - rm1Pre) / rm1Pre * 100).toFixed(1);
  const dV0   = ((rPost.a - rPre.a) / Math.abs(rPre.a) * 100).toFixed(1);
  const dPend = ((rPost.b - rPre.b) / Math.abs(rPre.b) * 100).toFixed(1);

  const mkKPI = (label, vPre, vPost, delta, unit, invertGood) => {
    const d  = parseFloat(delta);
    const ok = invertGood ? d < 0 : d > 0;
    const c  = isNaN(d) ? 'var(--text3)' : ok ? 'var(--neon)' : 'var(--red)';
    return `<div style="background:var(--bg4);border:1px solid ${c}33;border-radius:10px;padding:12px;text-align:center">
      <div style="font-family:var(--mono);font-size:9px;color:var(--text2);text-transform:uppercase;margin-bottom:6px">${label}</div>
      <div style="display:flex;justify-content:center;gap:12px;margin-bottom:6px">
        <div><div style="font-size:9px;color:#4D9EFF;font-family:var(--mono)">PRE</div><div style="font-family:var(--mono);font-size:13px;font-weight:700;color:#4D9EFF">${vPre}${unit}</div></div>
        <div><div style="font-size:9px;color:#39FF7A;font-family:var(--mono)">POST</div><div style="font-family:var(--mono);font-size:13px;font-weight:700;color:#39FF7A">${vPost}${unit}</div></div>
      </div>
      <div style="font-family:var(--mono);font-size:22px;font-weight:800;color:${c}">${d > 0 ? '+' : ''}${delta}%</div>
    </div>`;
  };

  document.getElementById('prepost-kpis').innerHTML =
    mkKPI('1RM estimado',   rm1Pre,            rm1Post,            dRM,   ' kg',  false) +
    mkKPI('V₀ (intersec.)', rPre.a.toFixed(4), rPost.a.toFixed(4), dV0,   ' m/s', false) +
    mkKPI('Pendiente (b)',  rPre.b.toFixed(5),  rPost.b.toFixed(5), dPend, '',     true);

  // ── TABLA 1: cargas absolutas coincidentes ──────────────────
  const absBodyEl = document.getElementById('prepost-abs-tbody');
  const absPromEl = document.getElementById('prepost-abs-prom');
  if (absBodyEl) {
    // Cargas que aparecen en ambos lados (coincidencia exacta de kg)
    const preMap  = new Map(pre.map(p  => [p.kg,  p.vmp]));
    const postMap = new Map(post.map(p => [p.kg,  p.vmp]));
    const common  = [...preMap.keys()].filter(kg => postMap.has(kg)).sort((a,b)=>a-b);

    if (common.length === 0) {
      // Si no hay cargas coincidentes, usar regresión para predecir VMP en cargas de PRE
      const allKgs = [...new Set([...pre.map(p=>p.kg), ...post.map(p=>p.kg)])].sort((a,b)=>a-b);
      absBodyEl.innerHTML = allKgs.map(kg => {
        const vPre  = +(rPre.a  + rPre.b  * kg).toFixed(3);
        const vPost = +(rPost.a + rPost.b * kg).toFixed(3);
        const cam   = vPre > 0 ? +((vPost - vPre) / Math.abs(vPre) * 100).toFixed(1) : null;
        const cc    = cam == null ? 'var(--text3)' : cam > 0 ? 'var(--neon)' : 'var(--red)';
        return `<tr>
          <td class="mono-cell" style="font-weight:700;color:var(--text2)">${kg} kg <span style="font-size:9px;color:var(--text3)">(pred)</span></td>
          <td class="mono-cell" style="color:#4D9EFF">${vPre > 0 ? vPre : '—'}</td>
          <td class="mono-cell" style="color:#39FF7A">${vPost > 0 ? vPost : '—'}</td>
          <td class="mono-cell" style="color:${cc};font-weight:700">${cam != null ? (cam>0?'+':'')+cam+'%' : '—'}</td>
        </tr>`;
      }).join('');
      const cams = allKgs.map(kg => {
        const vp = rPre.a + rPre.b * kg, vpo = rPost.a + rPost.b * kg;
        return vp > 0 ? (vpo - vp) / Math.abs(vp) * 100 : null;
      }).filter(v => v != null);
      const prom = cams.length ? (cams.reduce((a,b)=>a+b,0)/cams.length).toFixed(1) : null;
      if (absPromEl) absPromEl.innerHTML = prom ? `Promedio Δ% VMP (regresión): <span style="color:${+prom>0?'var(--neon)':'var(--red)'};font-weight:700">${+prom>0?'+':''}${prom}%</span>` : '';
    } else {
      absBodyEl.innerHTML = common.map(kg => {
        const vPre  = preMap.get(kg);
        const vPost = postMap.get(kg);
        const cam   = vPre > 0 ? +((vPost - vPre) / Math.abs(vPre) * 100).toFixed(1) : null;
        const cc    = cam == null ? 'var(--text3)' : cam > 0 ? 'var(--neon)' : 'var(--red)';
        return `<tr>
          <td class="mono-cell" style="font-weight:700;color:var(--text2)">${kg} kg</td>
          <td class="mono-cell" style="color:#4D9EFF">${vPre}</td>
          <td class="mono-cell" style="color:#39FF7A">${vPost}</td>
          <td class="mono-cell" style="color:${cc};font-weight:700">${cam != null ? (cam>0?'+':'')+cam+'%' : '—'}</td>
        </tr>`;
      }).join('');
      const cams = common.map(kg => {
        const vp = preMap.get(kg), vpo = postMap.get(kg);
        return vp > 0 ? (vpo - vp) / Math.abs(vp) * 100 : null;
      }).filter(v => v != null);
      const prom = cams.length ? (cams.reduce((a,b)=>a+b,0)/cams.length).toFixed(1) : null;
      if (absPromEl) absPromEl.innerHTML = prom ? `Promedio Δ% VMP: <span style="color:${+prom>0?'var(--neon)':'var(--red)'};font-weight:700">${+prom>0?'+':''}${prom}%</span>` : '';
    }
  }

  // ── TABLA 2: % RM → kg → VMP → cam% ────────────────────────
  document.getElementById('prepost-tbody').innerHTML = PP_PCTS.map(pct => {
    const kgPre  = +(rm1Pre  * pct / 100).toFixed(1);
    const kgPost = +(rm1Post * pct / 100).toFixed(1);
    const vPre   = +(rPre.a  + rPre.b  * kgPre).toFixed(3);
    const vPost  = +(rPost.a + rPost.b * kgPost).toFixed(3);
    const cam    = vPre ? +((vPost - vPre) / Math.abs(vPre) * 100).toFixed(1) : null;
    const cc = cam == null ? 'var(--text3)' : cam > 0 ? 'var(--neon)' : 'var(--red)';
    return `<tr>
      <td class="mono-cell" style="font-weight:700;color:var(--text2)">${pct}%</td>
      <td class="mono-cell" style="color:#4D9EFF">${kgPre}</td>
      <td class="mono-cell" style="color:#4D9EFF">${vPre > 0 ? vPre : '—'}</td>
      <td class="mono-cell" style="color:#39FF7A">${kgPost}</td>
      <td class="mono-cell" style="color:#39FF7A">${vPost > 0 ? vPost : '—'}</td>
      <td class="mono-cell" style="color:${cc};font-weight:700">${cam != null ? (cam > 0 ? '+' : '') + cam + '%' : '—'}</td>
    </tr>`;
  }).join('');

  outEl.style.display = 'block';
}

// Mantener compatibilidad con el hook de historial (modo antiguo)
function calcFVPrePost() { ppCalcular(); }
function updatePrePostSelects() {}
function calcPPManual() { ppCalcular(); }
function setPPTab() {}
function addPPRow(side) { ppAddRow(side); }

// ════════════════════════════════════════
//  DJ INCREMENTAL — IQ y RSI
//  Fuente: "Test incremental Dj" de Planilla evaluaciones
// ════════════════════════════════════════

let _djRows = [];

function addDJRow() {
  const tbody = document.getElementById('dj-rows');
  if (!tbody) return;
  const alturas = [0.20, 0.30, 0.40, 0.50, 0.60];
  const i = _djRows.length;
  const defAlt = alturas[i] ?? (0.20 + i * 0.10);
  const tr = document.createElement('tr');
  tr.id = 'dj-row-' + i;
  tr.style.borderBottom = '1px solid var(--border)';
  tr.innerHTML = `
    <td style="padding:4px">
      <input class="inp inp-mono" type="number" step=".05" value="${defAlt}"
        id="dj-drop-${i}" style="font-size:12px;padding:5px 7px" oninput="calcDJ()">
    </td>
    <td style="padding:4px">
      <input class="inp inp-mono" type="number" step=".01" placeholder="0.52"
        id="dj-tv-${i}" style="font-size:12px;padding:5px 7px" oninput="calcDJ()">
    </td>
    <td style="padding:4px">
      <input class="inp inp-mono" type="number" step=".01" placeholder="0.15"
        id="dj-tc-${i}" style="font-size:12px;padding:5px 7px" oninput="calcDJ()">
    </td>
    <td style="font-family:var(--mono);font-size:12px;color:var(--amber);padding:6px 4px" id="dj-iq-${i}">—</td>
    <td style="font-family:var(--mono);font-size:12px;color:var(--neon);padding:6px 4px" id="dj-rsi-${i}">—</td>
    <td style="font-family:var(--mono);font-size:12px;color:var(--blue);padding:6px 4px" id="dj-jh-${i}">—</td>
    <td style="padding:2px">
      <button onclick="removeDJRow(${i})" style="background:none;border:none;color:var(--text3);font-size:14px;cursor:pointer;padding:2px 4px">×</button>
    </td>
  `;
  tbody.appendChild(tr);
  _djRows.push(i);
}

function removeDJRow(i) {
  document.getElementById('dj-row-' + i)?.remove();
  _djRows = _djRows.filter(r => r !== i);
  calcDJ();
}

function calcDJ() {
  let bestRSI = -Infinity, bestIdx = -1;
  const results = [];

  _djRows.forEach(i => {
    const drop = parseFloat(document.getElementById('dj-drop-' + i)?.value);
    const tv   = parseFloat(document.getElementById('dj-tv-' + i)?.value);
    const tc   = parseFloat(document.getElementById('dj-tc-' + i)?.value);
    const iqEl  = document.getElementById('dj-iq-' + i);
    const rsiEl = document.getElementById('dj-rsi-' + i);
    const jhEl  = document.getElementById('dj-jh-' + i);

    if (isNaN(drop) || isNaN(tv) || isNaN(tc) || tv <= 0 || tc <= 0) {
      if (iqEl)  iqEl.textContent  = '—';
      if (rsiEl) rsiEl.textContent = '—';
      if (jhEl)  jhEl.textContent  = '—';
      return;
    }

    const jh  = +(tv * tv * 9.81 / 8).toFixed(4);   // JH = tv² × g / 8 (en m)
    const iq  = +(tv / tc).toFixed(3);               // IQ = TV / TC (Índice de Reactivo)
    const rsi = +(jh / tc).toFixed(4);               // RSI = JH / TC

    if (iqEl)  iqEl.textContent  = iq.toFixed(3);
    if (rsiEl) rsiEl.textContent = rsi.toFixed(4);
    if (jhEl)  jhEl.textContent  = (jh * 100).toFixed(1) + ' cm';

    results.push({ drop, tv, tc, jh, iq, rsi, idx: i });

    if (rsi > bestRSI) { bestRSI = rsi; bestIdx = i; }
  });

  // Highlight mejor altura
  _djRows.forEach(i => {
    const row = document.getElementById('dj-row-' + i);
    if (!row) return;
    row.style.background = i === bestIdx ? 'rgba(57,255,122,.05)' : '';
  });

  // KPIs
  const kpiEl = document.getElementById('dj-kpis');
  if (!kpiEl || results.length === 0) return;

  const best = results.find(r => r.idx === bestIdx);
  const maxIQ  = Math.max(...results.map(r => r.iq));
  const maxJH  = Math.max(...results.map(r => r.jh));

  const mkK = (label, val, unit, c) =>
    `<div style="background:var(--bg4);border:1px solid ${c||'var(--neon)'}33;border-radius:10px;padding:10px;text-align:center">
      <div style="font-family:var(--mono);font-size:9px;color:var(--text2);text-transform:uppercase;margin-bottom:3px">${label}</div>
      <div style="font-family:var(--mono);font-size:20px;font-weight:800;color:${c||'var(--neon)'}"> ${val}</div>
      <div style="font-size:9px;color:var(--text3);margin-top:2px">${unit}</div>
    </div>`;

  kpiEl.innerHTML =
    (best ? mkK('Altura óptima', (best.drop * 100).toFixed(0) + ' cm', 'máx RSI', 'var(--neon)') : '') +
    mkK('RSI máx', bestRSI > 0 ? bestRSI.toFixed(4) : '—', 'JH / TC', 'var(--neon)') +
    mkK('IQ máx', maxIQ.toFixed(3), 'TV / TC — reactivo', 'var(--amber)') +
    mkK('JH máx', (maxJH * 100).toFixed(1) + ' cm', 'altura salto', 'var(--blue)');
}

// ════════════════════════════════════════
//  CMJ CON TIEMPO DE VUELO + CARGA — Perfil F-V polinómico
//  Fuente: "CMJ con tiempo de vuelo" y "My Jump" de Planilla evaluaciones
// ════════════════════════════════════════

let _cmjtvRows = [], _cmjtvCount = 0;

function addCMJTVRow() {
  const tbody = document.getElementById('cmjtv-rows');
  if (!tbody) return;
  const i = _cmjtvCount++;
  const cargas   = [0, 20, 40, 60];
  const defCarga = cargas[_cmjtvRows.length] ?? (_cmjtvRows.length * 20);
  const tr = document.createElement('tr');
  tr.id = 'cmjtv-row-' + i;
  tr.style.borderBottom = '1px solid var(--border)';
  tr.innerHTML = `
    <td style="padding:4px">
      <input class="inp inp-mono" type="number" step="5" value="${defCarga}"
        id="cmjtv-kg-${i}" style="font-size:12px;padding:5px 7px" oninput="calcCMJTV()">
    </td>
    <td style="padding:4px">
      <input class="inp inp-mono" type="number" step=".001" placeholder="0.610"
        id="cmjtv-tv-${i}" style="font-size:12px;padding:5px 7px" oninput="calcCMJTV()">
    </td>
    <td style="font-family:var(--mono);font-size:12px;color:var(--neon);padding:6px 4px" id="cmjtv-jh-${i}">—</td>
    <td style="font-family:var(--mono);font-size:12px;color:var(--blue);padding:6px 4px" id="cmjtv-vd-${i}">—</td>
    <td style="padding:2px">
      <button onclick="removeCMJTVRow(${i})" style="background:none;border:none;color:var(--text3);font-size:14px;cursor:pointer;padding:2px 4px">×</button>
    </td>
  `;
  tbody.appendChild(tr);
  _cmjtvRows.push(i);
}

function removeCMJTVRow(i) {
  document.getElementById('cmjtv-row-' + i)?.remove();
  _cmjtvRows = _cmjtvRows.filter(r => r !== i);
  calcCMJTV();
}

function calcCMJTV() {
  const mc = parseFloat(document.getElementById('cmjtv-mc')?.value) || 80;
  const pairs = [];

  _cmjtvRows.forEach(i => {
    const kg = parseFloat(document.getElementById('cmjtv-kg-' + i)?.value);
    const tv = parseFloat(document.getElementById('cmjtv-tv-' + i)?.value);
    const jhEl = document.getElementById('cmjtv-jh-' + i);
    const vdEl = document.getElementById('cmjtv-vd-' + i);

    if (isNaN(tv) || tv <= 0) {
      if (jhEl) jhEl.textContent = '—';
      if (vdEl) vdEl.textContent = '—';
      return;
    }

    const jh  = +(tv * tv * 9.81 / 8 * 100).toFixed(1);  // cm
    const vd  = +(tv * 9.81 / 2).toFixed(3);              // m/s (velocidad de despegue desde TV)

    if (jhEl) jhEl.textContent = jh + ' cm';
    if (vdEl) vdEl.textContent = vd + ' m/s';

    if (!isNaN(kg)) pairs.push({ kg, jh: jh / 100, tv, vd });
  });

  if (pairs.length < 2) {
    document.getElementById('cmjtv-results').style.display = 'none';
    return;
  }

  // Regresión lineal JH (m) vs carga adicional (kg) — planilla "CMJ con tiempo de vuelo"
  const n    = pairs.length;
  const sumX = pairs.reduce((s, p) => s + p.kg, 0);
  const sumY = pairs.reduce((s, p) => s + p.jh, 0);
  const sumXY= pairs.reduce((s, p) => s + p.kg * p.jh, 0);
  const sumX2= pairs.reduce((s, p) => s + p.kg * p.kg, 0);
  const b    = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const a    = sumY / n - b * sumX / n;

  const meanY = sumY / n;
  const ssTot = pairs.reduce((s, p) => s + (p.jh - meanY) ** 2, 0);
  const ssRes = pairs.reduce((s, p) => s + (p.jh - (a + b * p.kg)) ** 2, 0);
  const r2    = ssTot > 0 ? +(1 - ssRes / ssTot).toFixed(4) : 1;

  // JH a carga 0 = a (pendiente)
  const jh0   = +(a * 100).toFixed(1);  // cm sin carga
  // Carga óptima (donde JH = 50% del JH0 según criterio de Morin)
  const kgOpt  = b < 0 ? +((0.5 * a - a) / b).toFixed(1) : null;

  document.getElementById('cmjtv-results').style.display = 'block';

  const mkK = (label, val, unit, c) =>
    `<div style="background:var(--bg4);border:1px solid ${c||'var(--neon)'}33;border-radius:10px;padding:10px;text-align:center">
      <div style="font-family:var(--mono);font-size:9px;color:var(--text2);text-transform:uppercase;margin-bottom:3px">${label}</div>
      <div style="font-family:var(--mono);font-size:20px;font-weight:800;color:${c||'var(--neon)'}"> ${val}</div>
      <div style="font-size:9px;color:var(--text3);margin-top:2px">${unit}</div>
    </div>`;

  document.getElementById('cmjtv-kpis').innerHTML =
    mkK('JH sin carga', jh0, 'cm — TV²×g/8', 'var(--neon)') +
    mkK('R²', r2, r2 >= 0.95 ? '✓ Buen ajuste' : 'Revisar datos', r2 >= 0.95 ? 'var(--neon)' : 'var(--amber)') +
    (kgOpt && kgOpt > 0 ? mkK('Carga óptima (50% JH)', kgOpt, 'kg extra', 'var(--amber)') : '') +
    mkK('Pendiente', b.toFixed(4), 'm/kg — slope', 'var(--blue)');

  // Tabla prescripción por %
  const pcts = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const maxKg = kgOpt && kgOpt > 0 ? kgOpt * 2 : 60;
  let thtml = `<thead><tr style="border-bottom:1px solid var(--border)">
    <th style="text-align:left;padding:5px;font-size:9px;color:var(--text3)">% Carga</th>
    <th style="text-align:left;padding:5px;font-size:9px;color:var(--text3)">Carga extra (kg)</th>
    <th style="text-align:left;padding:5px;font-size:9px;color:var(--neon)">JH estimado (cm)</th>
  </tr></thead><tbody>`;
  pcts.forEach(pct => {
    const kg  = +(maxKg * pct / 100).toFixed(1);
    const jhE = +((a + b * kg) * 100).toFixed(1);
    const c   = jhE >= jh0 * 0.9 ? 'var(--neon)' : jhE >= jh0 * 0.7 ? 'var(--amber)' : 'var(--red)';
    thtml += `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:5px;font-family:var(--mono);color:var(--text2)">${pct}%</td>
      <td style="padding:5px;font-family:var(--mono)">${kg}</td>
      <td style="padding:5px;font-family:var(--mono);font-weight:700;color:${c}">${jhE > 0 ? jhE : '—'}</td>
    </tr>`;
  });
  thtml += '</tbody>';
  document.getElementById('cmjtv-pct-table').innerHTML = thtml;
}

// ════════════════════════════════════════
//  ASIMETRÍAS DE EQUIPO — Hop Simple, Triple, CMJ
//  Fuente: "Asimetrías" de Planilla evaluaciones
// ════════════════════════════════════════

let _asiRows = [], _asiCount = 0;
const ASI_TESTS = [
  { id: 'hop1',  label: 'Hop Simple (cm)', unit: 'cm' },
  { id: 'hop3',  label: 'Hop Triple (cm)', unit: 'cm' },
  { id: 'cmj',   label: 'CMJ (cm)',         unit: 'cm' },
];

function initAsiRows(n) {
  for (let i = 0; i < n; i++) addAsiRow();
}

function addAsiRow() {
  const tbody = document.getElementById('asi-rows');
  if (!tbody) return;
  const i = _asiCount++;
  const tr = document.createElement('tr');
  tr.id = 'asi-row-' + i;
  tr.style.borderBottom = '1px solid var(--border)';

  const cols = ASI_TESTS.map(t => `
    <td style="padding:3px">
      <input class="inp inp-mono" type="number" step=".5" placeholder="200"
        id="asi-${t.id}-d-${i}" style="font-size:11px;padding:4px 6px;width:60px" oninput="calcAsi(${i})">
    </td>
    <td style="padding:3px">
      <input class="inp inp-mono" type="number" step=".5" placeholder="205"
        id="asi-${t.id}-i-${i}" style="font-size:11px;padding:4px 6px;width:60px" oninput="calcAsi(${i})">
    </td>
    <td style="font-family:var(--mono);font-size:11px;padding:4px" id="asi-${t.id}-lsi-${i}">—</td>
  `).join('');

  tr.innerHTML = `
    <td style="padding:6px 4px;font-family:var(--mono);font-size:11px;color:var(--text2)">${i + 1}</td>
    ${cols}
    <td style="padding:2px">
      <button onclick="removeAsiRow(${i})" style="background:none;border:none;color:var(--text3);font-size:13px;cursor:pointer;padding:2px 4px">×</button>
    </td>
  `;
  tbody.appendChild(tr);
  _asiRows.push(i);
}

function removeAsiRow(i) {
  document.getElementById('asi-row-' + i)?.remove();
  _asiRows = _asiRows.filter(r => r !== i);
  renderAsiResumen();
}

function calcAsi(i) {
  ASI_TESTS.forEach(t => {
    const d   = parseFloat(document.getElementById('asi-' + t.id + '-d-' + i)?.value);
    const izq = parseFloat(document.getElementById('asi-' + t.id + '-i-' + i)?.value);
    const lsiEl = document.getElementById('asi-' + t.id + '-lsi-' + i);
    if (!lsiEl) return;
    if (isNaN(d) || isNaN(izq) || d <= 0 || izq <= 0) { lsiEl.textContent = '—'; lsiEl.style.color = 'var(--text3)'; return; }
    const lsi = +(Math.min(d, izq) / Math.max(d, izq) * 100).toFixed(1);
    const c   = lsi >= 90 ? 'var(--neon)' : lsi >= 85 ? 'var(--amber)' : 'var(--red)';
    lsiEl.textContent = lsi + '%';
    lsiEl.style.color = c;
  });
  renderAsiResumen();
}

function renderAsiResumen() {
  const el = document.getElementById('asi-resumen');
  if (!el) return;

  ASI_TESTS.forEach(t => {
    const lsis = _asiRows.map(i => {
      const d   = parseFloat(document.getElementById('asi-' + t.id + '-d-' + i)?.value);
      const izq = parseFloat(document.getElementById('asi-' + t.id + '-i-' + i)?.value);
      if (isNaN(d) || isNaN(izq) || d <= 0 || izq <= 0) return null;
      return Math.min(d, izq) / Math.max(d, izq) * 100;
    }).filter(v => v !== null);

    const avgEl = document.getElementById('asi-avg-' + t.id);
    const minEl = document.getElementById('asi-min-' + t.id);
    const pctEl = document.getElementById('asi-pct-' + t.id);
    if (!lsis.length) {
      if (avgEl) avgEl.textContent = '—';
      if (minEl) minEl.textContent = '—';
      if (pctEl) pctEl.textContent = '—';
      return;
    }
    const avg = +(lsis.reduce((a, b) => a + b, 0) / lsis.length).toFixed(1);
    const min = +Math.min(...lsis).toFixed(1);
    const pctBelow90 = +(lsis.filter(v => v < 90).length / lsis.length * 100).toFixed(0);

    if (avgEl) { avgEl.textContent = avg + '%'; avgEl.style.color = avg >= 90 ? 'var(--neon)' : avg >= 85 ? 'var(--amber)' : 'var(--red)'; }
    if (minEl) { minEl.textContent = min + '%'; minEl.style.color = min >= 90 ? 'var(--neon)' : min >= 85 ? 'var(--amber)' : 'var(--red)'; }
    if (pctEl) { pctEl.textContent = pctBelow90 + '% del equipo < 90%'; pctEl.style.color = +pctBelow90 <= 20 ? 'var(--neon)' : +pctBelow90 <= 50 ? 'var(--amber)' : 'var(--red)'; }
  });
}

// ════════════════════════════════════════
//  INIT — corre inmediatamente después de que el DOM esté listo
// ════════════════════════════════════════

let _planillasInitDone = false;

function initPlanillas() {
  if (_planillasInitDone) return;
  _planillasInitDone = true;

  initSmith();

  // DJ: 4 alturas por defecto
  for (let i = 0; i < 4; i++) addDJRow();

  // CMJ TV: 4 cargas por defecto
  for (let i = 0; i < 4; i++) addCMJTVRow();

  // Asimetrías: 8 jugadores por defecto
  initAsiRows(8);

  // PrePost manual: 5 filas por lado + modo manual activo
  for (let i = 0; i < 5; i++) { addPPRow('pre'); addPPRow('post'); }
  setPPTab('manual');
}

// Ejecutar después de que el DOM esté completamente cargado
// Usar setTimeout(0) garantiza que corre después del parser HTML
// incluso si DOMContentLoaded ya disparó
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPlanillas);
} else {
  setTimeout(initPlanillas, 0);
}

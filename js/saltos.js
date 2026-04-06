// ── GLOBALS (compartidos entre módulos) ──
// cur, atletas, kineState, etc. se definen en app.js
// Este archivo asume que app.js ya fue cargado

function boscoZScore(key, val, sexo) {
  const norm = BOSCO_NORMS[key];
  if (!norm || !val) return null;
  const n = sexo === 'F' ? norm.female : norm.male;
  return +((val - n.mean) / n.sd).toFixed(2);
}

function boscoBadge(key, val, sexo) {
  const z = boscoZScore(key, val, sexo);
  if (z === null) return '';
  const label = z >= 1.5 ? 'Elite' : z >= 0.5 ? 'Alto' : z >= -0.5 ? 'Promedio' : z >= -1.5 ? 'Bajo' : 'Muy bajo';
  const c = z >= 1 ? 'var(--neon)' : z >= 0 ? 'var(--blue)' : z >= -1 ? 'var(--amber)' : 'var(--red)';
  return `<span class="tag" style="background:${c}22;color:${c}">${label} (z=${z>0?'+':''}${z})</span>`;
}

function calcBoscoIndices() {
  const sj  = parseFloat(document.getElementById('sj-avg')?.dataset.val  || '') || 0;
  const cmj = parseFloat(document.getElementById('cmj-avg')?.dataset.val || '') || 0;
  const abk = parseFloat(document.getElementById('abk-avg')?.dataset.val || '') || 0;
  const el  = document.getElementById('bosco-indices');
  if (!el) return;
  if (!sj && !cmj && !abk) { el.innerHTML = ''; return; }
  let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-top:12px">';

  // Indice elasticidad (CEA lento): ((CMJ-SJ)/SJ)*100
  if (sj && cmj) {
    const ie = ((cmj - sj) / sj * 100).toFixed(1);
    const c  = +ie >= 15 ? 'var(--neon)' : +ie >= 8 ? 'var(--amber)' : 'var(--red)';
    html += `<div style="background:var(--bg4);border:1px solid ${c}44;border-radius:10px;padding:12px;text-align:center">
      <div style="font-family:var(--mono);font-size:9px;color:var(--text2);text-transform:uppercase;margin-bottom:4px">Indice Elasticidad</div>
      <div style="font-family:var(--mono);font-size:24px;font-weight:800;color:${c}">${ie}%</div>
      <div style="font-size:10px;color:var(--text2);margin-top:3px">CMJ - SJ / SJ · CEA lento</div>
      <div style="font-size:10px;margin-top:4px;color:${c}">${+ie>=15?'Excelente uso elastico':+ie>=8?'Buen uso elastico':'Deficit elastico'}</div>
    </div>`;
  }

  // Indice coordinacion de brazos: ((ABK-CMJ)/CMJ)*100
  if (cmj && abk) {
    const ib = ((abk - cmj) / cmj * 100).toFixed(1);
    let interpBraz = '', cBraz = '';
    if (+ib < 10)      { interpBraz = 'Mala coordinacion de brazos'; cBraz = 'var(--red)'; }
    else if (+ib <= 20){ interpBraz = 'Buen aprovechamiento de brazos'; cBraz = 'var(--neon)'; }
    else               { interpBraz = 'Deficit CEA -- dependencia excesiva brazos'; cBraz = 'var(--amber)'; }
    html += `<div style="background:var(--bg4);border:1px solid ${cBraz}44;border-radius:10px;padding:12px;text-align:center">
      <div style="font-family:var(--mono);font-size:9px;color:var(--text2);text-transform:uppercase;margin-bottom:4px">Coord. de Brazos</div>
      <div style="font-family:var(--mono);font-size:24px;font-weight:800;color:${cBraz}">${ib}%</div>
      <div style="font-size:10px;color:var(--text2);margin-top:3px">ABK - CMJ / CMJ</div>
      <div style="font-size:10px;margin-top:4px;color:${cBraz}">${interpBraz}</div>
    </div>`;
  }

  // Potencia Bosco (formula de Bosco et al. 1983)
  if (cmj && cur?.peso) {
    const h = cmj / 100;
    const P = Math.pow(4.9, 0.5) * +cur.peso * Math.pow(h, 0.5);
    html += `<div style="background:var(--bg4);border:1px solid rgba(77,158,255,.3);border-radius:10px;padding:12px;text-align:center">
      <div style="font-family:var(--mono);font-size:9px;color:var(--text2);text-transform:uppercase;margin-bottom:4px">Potencia mecanica</div>
      <div style="font-family:var(--mono);font-size:24px;font-weight:800;color:var(--blue)">${P.toFixed(1)}</div>
      <div style="font-size:10px;color:var(--text2);margin-top:3px">kgm/s -- Formula Bosco 1983</div>
    </div>`;
  }

  // RSI si hay DJ
  const djAvg = parseFloat(document.getElementById('dj-avg')?.dataset.val || '') || 0;
  const djTc  = parseFloat(document.getElementById('dj-tc')?.value || '') || 0;
  if (djAvg && djTc) {
    const rsi = (djAvg / 100 / (djTc / 1000)).toFixed(2);
    const cRsi = +rsi >= 2.5 ? 'var(--neon)' : +rsi >= 1.5 ? 'var(--amber)' : 'var(--red)';
    html += `<div style="background:var(--bg4);border:1px solid ${cRsi}44;border-radius:10px;padding:12px;text-align:center">
      <div style="font-family:var(--mono);font-size:9px;color:var(--text2);text-transform:uppercase;margin-bottom:4px">RSI Modificado</div>
      <div style="font-family:var(--mono);font-size:24px;font-weight:800;color:${cRsi}">${rsi}</div>
      <div style="font-size:10px;color:var(--text2);margin-top:3px">h(m) / Tc(s) -- DJ reactivo</div>
      <div style="font-size:10px;margin-top:4px;color:${cRsi}">${+rsi>=2.5?'Elite reactivo':+rsi>=1.5?'Promedio reactivo':'Bajo reactivo'}</div>
    </div>`;
  }

  html += '</div>';
  el.innerHTML = html;
}

function calcMultiSalto15() {
  const reps  = +document.getElementById('ms15-reps')?.value  || 0;
  const avgH  = +document.getElementById('ms15-r1')?.value    || 0;
  const peso  = cur?.peso ? +cur.peso : (+document.getElementById('bj-pc')?.value || 0);
  const el    = document.getElementById('ms15-avg');
  const elPot = document.getElementById('ms15-pot');
  if (el) { el.textContent = avgH ? avgH.toFixed(1) : '--'; el.dataset.val = avgH || ''; }
  if (elPot && avgH && peso) {
    // Formula Bosco potencia anaerobia: P = (4*h*m*g*n) / (4*t*n - Pi*tv)
    // Simplificada: P = sqrt(4.9) * m * sqrt(h/100)
    const P = Math.pow(4.9, 0.5) * peso * Math.pow(avgH / 100, 0.5);
    elPot.textContent = P.toFixed(1) + ' kgm/s';
    const sexo  = cur?.sexo || 'M';
    const norms = BOSCO_NORMS.ms15;
    const n     = sexo === 'F' ? norms.female : norms.male;
    const z     = ((P - n.mean) / n.sd).toFixed(2);
    const c     = +z >= 1 ? 'var(--neon)' : +z >= 0 ? 'var(--blue)' : +z >= -1 ? 'var(--amber)' : 'var(--red)';
    elPot.style.color = c;
  }
  calcBoscoIndices();
}

function buildSaltosGrid() {
  const grid = document.getElementById('saltos-grid'); if (!grid) return;
  const sexo = cur?.sexo || 'M';
  const vert = SALTOS_DEF.filter(d => d.cat === 'vertical');
  const horiz = SALTOS_DEF.filter(d => d.cat === 'horizontal');

  let html = '';

  // ── SECCION VERTICALES ──
  html += `<div style="grid-column:1/-1">
    <div style="font-family:var(--mono);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--neon);margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(57,255,122,.1)">
      Saltos verticales -- Bateria Bosco
    </div>
  </div>`;

  vert.forEach(def => {
    if (def.key === 'ms15') {
      // Multisalto 15s -- card especial
      html += `<div class="card">
        <div class="card-header"><h3>Multi-salto 15s</h3><span class="tag tag-y">Potencia anaerob. alactica</span></div>
        <div class="card-body">
          <div class="grid-2" style="gap:10px">
            <div class="ig"><label class="il">Altura media (cm)</label>
              <input class="inp inp-mono" type="number" step=".1" id="ms15-r1" placeholder="27" oninput="calcMultiSalto15()">
            </div>
            <div class="ig"><label class="il">N reps en 15s</label>
              <input class="inp inp-mono" type="number" id="ms15-reps" placeholder="20" oninput="calcMultiSalto15()">
            </div>
          </div>
          <div style="background:var(--bg4);border-radius:10px;padding:12px;text-align:center;margin-top:8px">
            <div style="font-family:var(--mono);font-size:9px;color:var(--text2);text-transform:uppercase;margin-bottom:4px">Potencia</div>
            <div id="ms15-pot" style="font-family:var(--mono);font-size:22px;font-weight:800;color:var(--neon)">--</div>
            <div style="font-size:9px;color:var(--text3);margin-top:2px">Formula Bosco et al. 1983</div>
          </div>
          <div style="display:none;font-family:var(--mono);font-size:9px" id="ms15-avg" data-val=""></div>
          <div style="font-size:11px;color:var(--text2);margin-top:8px;line-height:1.6">
            Ref. Bosco (2004): Varones ${BOSCO_NORMS.ms15.male.mean}±${BOSCO_NORMS.ms15.male.sd} · Mujeres ${BOSCO_NORMS.ms15.female.mean}±${BOSCO_NORMS.ms15.female.sd} kgm/s
          </div>
        </div>
      </div>`;
      return;
    }

    if (def.key === 'dj') {
      html += `<div class="card">
        <div class="card-header"><h3>Drop Jump</h3><span class="tag tag-r">Fuerza reflejo-elastico-explosiva</span></div>
        <div class="card-body">
          <div class="ig"><label class="il">Altura de caida (cm)</label>
            <select class="inp" id="dj-altura">
              <option value="20">20 cm</option><option value="40" selected>40 cm</option>
              <option value="60">60 cm</option><option value="80">80 cm</option>
            </select>
          </div>
          <div class="grid-2" style="gap:8px">
            <div class="ig"><label class="il">Rep 1 (cm)</label><input class="inp inp-mono" type="number" step=".1" id="dj-r1" placeholder="0" oninput="calcSalto('dj','dj-r2')"></div>
            <div class="ig"><label class="il">Rep 2 (cm)</label><input class="inp inp-mono" type="number" step=".1" id="dj-r2" placeholder="0" oninput="calcSalto('dj','dj-r2')"></div>
          </div>
          <div class="ig mt-8"><label class="il">Tiempo de contacto (ms)</label>
            <input class="inp inp-mono" type="number" id="dj-tc" placeholder="200" oninput="calcBoscoIndices()">
            <div style="font-size:9px;color:var(--text3);margin-top:2px">Ref: BDJ &lt;200ms · CDJ hasta 250ms</div>
          </div>
          <div style="background:var(--bg4);border-radius:10px;padding:12px;text-align:center;margin-top:8px">
            <div style="display:flex;justify-content:space-around">
              <div><div style="font-family:var(--mono);font-size:9px;color:var(--text2);margin-bottom:3px">ALTURA</div>
                <div id="dj-avg" style="font-family:var(--mono);font-size:22px;font-weight:800;color:var(--neon)" data-val="">--</div></div>
              <div><div style="font-family:var(--mono);font-size:9px;color:var(--text2);margin-bottom:3px">RSI mod.</div>
                <div id="dj-rsi-display" style="font-family:var(--mono);font-size:22px;font-weight:800;color:var(--blue)">--</div></div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">
            <button class="btn btn-ghost btn-sm" onclick="abrirVideoJump('dj','dj-r1')" style="font-size:10px">🎬 Video Rep 1</button>
            <button class="btn btn-ghost btn-sm" onclick="abrirVideoJump('dj','dj-r2')" style="font-size:10px">🎬 Video Rep 2</button>
          </div>
          <div id="dj-mejora" style="text-align:center;margin-top:6px"></div>
        </div>
      </div>`;
      return;
    }

    // SJ, CMJ, ABK
    const unitLabel = def.unit;
    const norm = BOSCO_NORMS[def.key];
    const normLine = norm ? `Ref. Bosco (2004): V=${norm.male.mean}±${norm.male.sd} · M=${norm.female.mean}±${norm.female.sd} cm` : '';
    html += `<div class="card">
      <div class="card-header"><h3>${def.label}</h3><span class="tag tag-b" style="font-size:9px">${def.desc}</span></div>
      <div class="card-body">
        <div class="grid-2" style="gap:8px">
          <div class="ig"><label class="il">Rep 1</label><input class="inp inp-mono" type="number" step=".1" id="${def.key}-r1" placeholder="0" oninput="calcSalto('${def.key}','${def.key}-r2')"></div>
          <div class="ig"><label class="il">Rep 2</label><input class="inp inp-mono" type="number" step=".1" id="${def.key}-r2" placeholder="0" oninput="calcSalto('${def.key}','${def.key}-r2')"></div>
        </div>
        <div style="background:var(--bg4);border-radius:10px;padding:12px;text-align:center;margin-top:8px">
          <div style="font-family:var(--mono);font-size:9px;color:var(--text2);margin-bottom:4px">PROMEDIO</div>
          <div id="${def.key}-avg" style="font-family:var(--mono);font-size:32px;font-weight:800;color:var(--neon)" data-val="">--</div>
          <div style="font-size:10px;color:var(--text3)">${unitLabel}</div>
          <div id="${def.key}-badge" style="margin-top:6px"></div>
        </div>
        ${normLine ? `<div style="font-size:10px;color:var(--text3);margin-top:6px;font-family:var(--mono)">${normLine}</div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">
          <button class="btn btn-ghost btn-sm" onclick="abrirVideoJump('${def.key}','${def.key}-r1')" style="font-size:10px">🎬 Video Rep 1</button>
          <button class="btn btn-ghost btn-sm" onclick="abrirVideoJump('${def.key}','${def.key}-r2')" style="font-size:10px">🎬 Video Rep 2</button>
        </div>
        <div id="${def.key}-mejora" style="text-align:center;margin-top:6px"></div>
      </div>
    </div>`;
  });

  // ── INDICES BOSCO ──
  html += `<div style="grid-column:1/-1" id="bosco-indices"></div>`;

  // ── SECCION HORIZONTALES ──
  html += `<div style="grid-column:1/-1;margin-top:8px">
    <div style="font-family:var(--mono);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--blue);margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(77,158,255,.15)">
      Saltos horizontales -- Hop Tests
    </div>
  </div>`;

  horiz.forEach(def => {
    if (def.type === 'bilateral') {
      html += `<div class="card">
        <div class="card-header"><h3>Broad Jump</h3><span class="tag tag-b">Salto horizontal bilateral</span></div>
        <div class="card-body">
          <div class="grid-2" style="gap:8px">
            <div class="ig"><label class="il">Rep 1 (cm)</label><input class="inp inp-mono" type="number" step=".1" id="bj-r1" placeholder="0" oninput="calcSalto('bj','bj-r2')"></div>
            <div class="ig"><label class="il">Rep 2 (cm)</label><input class="inp inp-mono" type="number" step=".1" id="bj-r2" placeholder="0" oninput="calcSalto('bj','bj-r2')"></div>
          </div>
          <div style="background:var(--bg4);border-radius:10px;padding:12px;text-align:center;margin-top:8px">
            <div style="font-family:var(--mono);font-size:9px;color:var(--text2);text-transform:uppercase;margin-bottom:4px">Promedio</div>
            <div id="bj-avg" style="font-family:var(--mono);font-size:32px;font-weight:800;color:var(--neon)" data-val="">--</div>
            <div style="font-size:10px;color:var(--text3)">cm</div>
          </div>
          <div style="background:var(--bg4);border-radius:8px;padding:8px 12px;margin-top:8px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:10px;color:var(--text2)">Ratio vs altura (ref: &gt;1.3x altura)</span>
            <span id="bj-ratio" style="font-family:var(--mono);font-size:13px;font-weight:700;color:var(--neon)">--</span>
          </div>
          <div style="font-size:10px;color:var(--text3);margin-top:6px;font-family:var(--mono)">
            Ref: Elite &gt;200cm (V) / &gt;170cm (M) -- Activo &gt;165cm (V) / &gt;140cm (M)
          </div>
          <div id="bj-mejora" style="text-align:center;margin-top:6px"></div>
        </div>
      </div>`;
    } else if (def.key === 'sideh') {
      const normM = SIDEHOP_NORMS.male.min;
      const normF = SIDEHOP_NORMS.female.min;
      html += `<div class="card">
        <div class="card-header"><h3>Side Hop Test</h3><span class="tag tag-y">Gustavsson et al.</span></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <div style="font-size:10px;font-weight:700;color:var(--neon);margin-bottom:6px;font-family:var(--mono)">DERECHA</div>
              <div class="ig"><label class="il">Reps 30s</label><input class="inp inp-mono" type="number" id="sideh-d-r1" placeholder="0" oninput="calcSideHop()"></div>
              <div style="background:var(--bg4);border-radius:8px;padding:8px;text-align:center">
                <div id="sideh-d-avg" style="font-family:var(--mono);font-size:20px;font-weight:800;color:var(--neon)" data-val="">--</div>
                <div id="sideh-d-norm" style="font-size:10px;margin-top:2px"></div>
              </div>
            </div>
            <div>
              <div style="font-size:10px;font-weight:700;color:var(--blue);margin-bottom:6px;font-family:var(--mono)">IZQUIERDA</div>
              <div class="ig"><label class="il">Reps 30s</label><input class="inp inp-mono" type="number" id="sideh-i-r1" placeholder="0" oninput="calcSideHop()"></div>
              <div style="background:var(--bg4);border-radius:8px;padding:8px;text-align:center">
                <div id="sideh-i-avg" style="font-family:var(--mono);font-size:20px;font-weight:800;color:var(--blue)" data-val="">--</div>
                <div id="sideh-i-norm" style="font-size:10px;margin-top:2px"></div>
              </div>
            </div>
          </div>
          <div style="background:var(--bg4);border-radius:8px;padding:10px;text-align:center;margin-top:8px">
            <div id="sideh-sim" style="font-family:var(--mono);font-size:22px;font-weight:800">--</div>
            <div id="sideh-sim-st" style="font-size:10px;color:var(--text3);margin-top:2px"></div>
          </div>
          <div style="font-size:10px;color:var(--text3);margin-top:6px;font-family:var(--mono)">
            Norma Gustavsson et al.: Varones min ${normM} reps · Mujeres min ${normF} reps
          </div>
        </div>
      </div>`;
    } else {
      const lowerLabel = def.lowerIsBetter ? 'Menor es mejor' : 'LSI';
      html += `<div class="card">
        <div class="card-header"><h3>${def.label}</h3><span class="tag tag-y">${def.desc}</span></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <div style="font-size:10px;font-weight:700;color:var(--neon);margin-bottom:6px;font-family:var(--mono)">DERECHA</div>
              <div class="ig"><label class="il">Rep 1</label><input class="inp inp-mono" type="number" step=".01" id="${def.key}-d-r1" placeholder="0" oninput="calcSimetriaHop('${def.key}')"></div>
              <div class="ig"><label class="il">Rep 2</label><input class="inp inp-mono" type="number" step=".01" id="${def.key}-d-r2" placeholder="0" oninput="calcSimetriaHop('${def.key}')"></div>
              <div style="background:var(--bg4);border-radius:8px;padding:8px;text-align:center"><div id="${def.key}-d-avg" style="font-family:var(--mono);font-size:20px;font-weight:800;color:var(--neon)" data-val="">--</div></div>
            </div>
            <div>
              <div style="font-size:10px;font-weight:700;color:var(--blue);margin-bottom:6px;font-family:var(--mono)">IZQUIERDA</div>
              <div class="ig"><label class="il">Rep 1</label><input class="inp inp-mono" type="number" step=".01" id="${def.key}-i-r1" placeholder="0" oninput="calcSimetriaHop('${def.key}')"></div>
              <div class="ig"><label class="il">Rep 2</label><input class="inp inp-mono" type="number" step=".01" id="${def.key}-i-r2" placeholder="0" oninput="calcSimetriaHop('${def.key}')"></div>
              <div style="background:var(--bg4);border-radius:8px;padding:8px;text-align:center"><div id="${def.key}-i-avg" style="font-family:var(--mono);font-size:20px;font-weight:800;color:var(--blue)" data-val="">--</div></div>
            </div>
          </div>
          <div style="background:var(--bg4);border:1px solid rgba(57,255,122,.1);border-radius:8px;padding:10px;text-align:center;margin-top:8px">
            <div style="font-size:9px;color:var(--text3);font-family:var(--mono);margin-bottom:3px">LSI -- Simetria</div>
            <div id="${def.key}-sim" style="font-family:var(--mono);font-size:24px;font-weight:800">--</div>
            <div id="${def.key}-sim-st" style="font-size:10px;margin-top:3px"></div>
          </div>
          <div id="${def.key}-norm-badge" style="text-align:center;margin-top:6px"></div>
          <div id="${def.key}-mejora" style="text-align:center;margin-top:4px"></div>
        </div>
      </div>`;
    }
  });

  grid.innerHTML = html;
}

function calcSalto(key, r2id) {
  const r1 = +document.getElementById(key + '-r1')?.value || 0;
  const r2 = +document.getElementById(r2id)?.value || 0;
  const avg = r1 && r2 ? (r1+r2)/2 : r1 || r2;
  const el = document.getElementById(key + '-avg');
  if (el) { el.textContent = avg ? avg.toFixed(1) : '--'; el.dataset.val = avg || ''; }
  // RSI display for DJ
  if (key === 'dj') {
    const tc = +document.getElementById('dj-tc')?.value || 0;
    const rsiEl = document.getElementById('dj-rsi-display');
    if (rsiEl && avg && tc) {
      const rsi = (avg / 100 / (tc / 1000)).toFixed(2);
      rsiEl.textContent = rsi;
      rsiEl.style.color = +rsi >= 2.5 ? 'var(--neon)' : +rsi >= 1.5 ? 'var(--amber)' : 'var(--red)';
    }
  }
  // Bosco z-score badge
  const sexo = cur?.sexo || 'M';
  const badge = document.getElementById(key + '-badge');
  if (badge && avg) badge.innerHTML = boscoBadge(key, avg, sexo);
  // Update lastCMJ
  if (key === 'cmj' && cur) { cur.lastCMJ = avg || null; atletas = atletas.map(a => a.id===cur.id?cur:a); saveData(); }
  checkMejoraSalto(key, avg);
  calcBoscoIndices();
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
  const decimals = key === 't6h' ? 2 : 1;
  if (elD) { elD.textContent = avgD?avgD.toFixed(decimals):'--'; elD.dataset.val = avgD||''; }
  if (elI) { elI.textContent = avgI?avgI.toFixed(decimals):'--'; elI.dataset.val = avgI||''; }
  if (avgD && avgI) {
    const def = SALTOS_DEF.find(d => d.key === key);
    const norm = HOP_NORMS[key];
    const lowerIsBetter = def?.lowerIsBetter || false;
    // LSI: para tests donde menor es mejor (tiempo), la pierna "mejor" es la mas rapida (menor valor)
    let lsi;
    if (lowerIsBetter) {
      const mejor = Math.min(avgD, avgI);
      const peor  = Math.max(avgD, avgI);
      lsi = (mejor / peor * 100).toFixed(1); // LSI = mejor/peor (al reves)
    } else {
      const mayor = Math.max(avgD, avgI);
      const menor = Math.min(avgD, avgI);
      lsi = (menor / mayor * 100).toFixed(1);
    }
    const lsiNum = +lsi;
    const lsi_rts = norm?.lsi_rts || 90;
    const c = lsiNum >= lsi_rts ? 'var(--neon)' : lsiNum >= 85 ? 'var(--amber)' : 'var(--red)';
    const el = document.getElementById(key+'-sim');
    if (el) { el.textContent = lsi+'%'; el.style.color = c; }
    const st = document.getElementById(key+'-sim-st');
    if (st) {
      const rtsOk = lsiNum >= lsi_rts;
      st.innerHTML = rtsOk
        ? '<span style="color:var(--neon)">LSI ≥' + lsi_rts + '% -- Apto retorno al deporte</span>'
        : lsiNum >= 85
          ? '<span style="color:var(--amber)">LSI ' + lsi + '% -- Deficit leve (RTS ≥' + lsi_rts + '%)</span>'
          : '<span style="color:var(--red);font-weight:700">LSI ' + lsi + '% -- NO APTO RTS (requiere ≥' + lsi_rts + '%)</span>';
    }
    // Highlight card if below RTS threshold
    const card = el?.closest('.card');
    if (card) {
      card.style.borderColor = !rtsOk ? 'rgba(255,59,59,.3)' : '';
      card.style.boxShadow   = !rtsOk ? '0 0 20px rgba(255,59,59,.1)' : '';
    }
    // Norma absoluta
    const sexo = cur?.sexo || 'M';
    const n = norm ? (sexo === 'F' ? norm.female : norm.male) : null;
    if (n) {
      const val = (avgD + avgI) / 2;
      const z = ((val - n.mean) / n.sd).toFixed(2);
      const zLabel = +z >= 1 ? 'Elite' : +z >= 0 ? 'Promedio' : +z >= -1 ? 'Bajo' : 'Muy bajo';
      const zC = +z >= 0.5 ? 'var(--neon)' : +z >= -0.5 ? 'var(--amber)' : 'var(--red)';
      const normEl = document.getElementById(key+'-norm-badge');
      if (normEl) normEl.innerHTML = '<span class="tag" style="background:' + zC + '22;color:' + zC + '">' + zLabel + ' (z=' + (z>0?'+':'') + z + ')</span>';
    }
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
    const norm = HOP_NORMS[def.key];
    const lsi_rts = norm?.lsi_rts || 90;
    const rtsOk = +lsi >= lsi_rts;
    const unit = def.unit || 'cm';
    return '<tr>' +
      '<td style="font-weight:600">' + def.label + '</td>' +
      '<td class="mono-cell">' + (dAvg?dAvg.toFixed(def.lowerIsBetter?2:1):'--') + ' ' + unit + '</td>' +
      '<td class="mono-cell">' + (iAvg?iAvg.toFixed(def.lowerIsBetter?2:1):'--') + ' ' + unit + '</td>' +
      '<td class="mono-cell" style="color:' + c + ';font-weight:800">' + lsi + '%</td>' +
      '<td class="mono-cell" style="font-size:9px;color:var(--text2)">&ge;' + lsi_rts + '%</td>' +
      '<td><span class="tag" style="background:' + c + '22;color:' + c + '">' + (rtsOk ? 'APTO RTS' : +lsi>=85 ? 'Deficit leve' : 'NO APTO RTS') + '</span></td>' +
      '</tr>';
  }).filter(Boolean);
  if (!rows.length) { area.innerHTML = '<p style="font-size:12px;color:var(--text3)">Completá datos bilaterales de saltos para ver la tabla.</p>'; return; }
  area.innerHTML = `<table class="data-table"><thead><tr><th>Test</th><th>Derecha</th><th>Izquierda</th><th>LSI %</th><th>Asim. %</th><th>Estado</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}


function calcSideHop() {
  const vD = +document.getElementById('sideh-d-r1')?.value || 0;
  const vI = +document.getElementById('sideh-i-r1')?.value || 0;
  const sexo = cur?.sexo || 'M';
  const norm = SIDEHOP_NORMS[sexo === 'F' ? 'female' : 'male'];
  const dEl  = document.getElementById('sideh-d-avg');
  const iEl  = document.getElementById('sideh-i-avg');
  if (dEl) { dEl.textContent = vD || '--'; dEl.dataset.val = vD || ''; }
  if (iEl) { iEl.textContent = vI || '--'; iEl.dataset.val = vI || ''; }
  const evalNorm = (v, el) => {
    if (!el || !v) return;
    const pass = v >= norm.min;
    const c = pass ? 'var(--neon)' : 'var(--red)';
    el.innerHTML = `<span style="color:${c}">${pass ? 'APRUEBA' : 'NO APRUEBA'} (min ${norm.min})</span>`;
  };
  evalNorm(vD, document.getElementById('sideh-d-norm'));
  evalNorm(vI, document.getElementById('sideh-i-norm'));
  if (vD && vI) {
    const mayor = Math.max(vD,vI), menor = Math.min(vD,vI);
    const lsi = (menor/mayor*100).toFixed(1);
    const c = +lsi>=90?'var(--neon)':+lsi>=85?'var(--amber)':'var(--red)';
    const simEl = document.getElementById('sideh-sim');
    const simSt = document.getElementById('sideh-sim-st');
    if (simEl) { simEl.textContent = lsi + '%'; simEl.style.color = c; }
    if (simSt) simSt.innerHTML = `<span style="color:${c}">${+lsi>=90?'Simetrico':+lsi>=85?'Asimetria leve':'ASIMETRIA CRITICA'}</span>`;
  }
  renderSimetriasTabla();
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

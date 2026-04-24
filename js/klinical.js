// ── GLOBALS (compartidos entre módulos) ──
// cur, atletas, kineState, etc. se definen en app.js
// Este archivo asume que app.js ya fue cargado

function toggleSheetSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function initKlinicalSheet(panel) {
  // Build content based on which sheet opened
  if (panel === 'codo') { initCodoSheet(); return; }
  if (panel === 'hombro' || panel === 'munieca') initHombroSheet();
  if (panel === 'rodilla' || panel === 'cadera' || panel === 'gluteo') initRodillaSheet();
  if (panel === 'tobillo' || panel === 'pantorrilla' || panel === 'pie') initTobilloSheet();
  if (panel === 'cervical') { initCervicalSheet(); return; }
  if (panel === 'lumbar' || panel === 'lumbar-post' || panel === 'dorsal') initLBPSheet();
  if (panel === 'ingle') initGroinSheet();
}

function initHombroSheet() {
  buildHombroROM();
  buildHombroTests();
  buildHombroFuerza();
  buildASES();
  buildWORC();
  buildDASH();
}

function initRodillaSheet() {
  buildRodillaSPF();
  buildRodillaLCA();
  buildRodillaMenisco();
  buildHopRTP();
  buildVISAP();
}

function initTobilloSheet() {
  buildTobilloLig();
  buildSEBT();
  buildCAIT2();
  buildFAAM2();
  buildVISAA();
}

function initLBPSheet() {
  buildStartBack();
}

function initGroinSheet() {
  buildDoha();
  buildHAGOS();
}

// ── TAB SWITCHERS ──
function showHTab(tab, btn) {
  ['obs','rom','tests','fuerza','cuest'].forEach(t => {
    const el = document.getElementById('htab-' + t); if(el) el.style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('#sheet-hombro .btn').forEach(b => {
    if(b.id && b.id.startsWith('htab-')) { b.className = 'btn btn-ghost btn-sm'; b.style.whiteSpace='nowrap'; b.style.fontSize='10px'; }
  });
  if(btn) { btn.className = 'btn btn-neon btn-sm'; btn.style.whiteSpace='nowrap'; btn.style.fontSize='10px'; }
}
function showRTab(tab, btn) {
  ['spf','lca','lig','men','cuest','rtp'].forEach(t => {
    const el = document.getElementById('rtab-' + t); if(el) el.style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('#sheet-rodilla .btn').forEach(b => {
    if(b.id && b.id.startsWith('rtab-')) { b.className = 'btn btn-ghost btn-sm'; b.style.whiteSpace='nowrap'; b.style.fontSize='10px'; }
  });
  if(btn) { btn.className = 'btn btn-neon btn-sm'; btn.style.whiteSpace='nowrap'; btn.style.fontSize='10px'; }
}
function showTTab(tab, btn) {
  ['lig','func','tcuest','tvisa'].forEach(t => {
    const el = document.getElementById('ttab-' + t); if(el) el.style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('#sheet-tobillo .btn').forEach(b => {
    if(b.id && b.id.startsWith('ttab-')) { b.className = 'btn btn-ghost btn-sm'; b.style.whiteSpace='nowrap'; b.style.fontSize='10px'; }
  });
  if(btn) { btn.className = 'btn btn-neon btn-sm'; btn.style.whiteSpace='nowrap'; btn.style.fontSize='10px'; }
}
function setFAAMTab2(tab, btn) {
  document.getElementById('faam-avd-sheet').style.display = tab === 'avd' ? 'block' : 'none';
  document.getElementById('faam-dep-sheet').style.display = tab === 'dep' ? 'block' : 'none';
  document.querySelectorAll('#faam-avd-btn, #faam-dep-btn').forEach(b => b.className = 'btn btn-ghost btn-sm');
  if(btn) btn.className = 'btn btn-neon btn-sm';
}

// ── BUILDERS ──
function buildHombroROM() {
  const c = document.getElementById('hombro-rom-fields'); if(!c || c.innerHTML) return;
  c.innerHTML = ROM_HOMBRO.map(m => `
    <div class="card mb-8">
      <div class="card-header"><h3>${m.label}</h3><span class="tag tag-b">Ref: ${m.ref}</span></div>
      <div class="card-body">
        <div class="grid-2" style="gap:8px">
          <div class="ig"><label class="il">Activo D (°)</label><input class="inp inp-mono" type="number" id="rom-${m.id}-act-d" placeholder="0" oninput="calcTROMSheet()"></div>
          <div class="ig"><label class="il">Activo I (°)</label><input class="inp inp-mono" type="number" id="rom-${m.id}-act-i" placeholder="0" oninput="calcTROMSheet()"></div>
          <div class="ig"><label class="il">Pasivo D (°)</label><input class="inp inp-mono" type="number" id="rom-${m.id}-pas-d" placeholder="0"></div>
          <div class="ig"><label class="il">Pasivo I (°)</label><input class="inp inp-mono" type="number" id="rom-${m.id}-pas-i" placeholder="0"></div>
        </div>
      </div>
    </div>
  `).join('');
}

function calcTROMSheet() {
  const riD = +document.getElementById('rom-ri-act-d')?.value||0;
  const reD = +document.getElementById('rom-re-act-d')?.value||0;
  const riI = +document.getElementById('rom-ri-act-i')?.value||0;
  const reI = +document.getElementById('rom-re-act-i')?.value||0;
  const tD = riD+reD, tI = riI+reI;
  const elD = document.getElementById('hombro-trom-d'), elI = document.getElementById('hombro-trom-i');
  if(elD){ elD.textContent = tD>0?tD+'°':'—'; elD.style.color=tD>=90?'var(--neon)':tD>=80?'var(--amber)':'var(--red)'; }
  if(elI){ elI.textContent = tI>0?tI+'°':'—'; elI.style.color=tI>=90?'var(--neon)':tI>=80?'var(--amber)':'var(--red)'; }
  const elG = document.getElementById('hombro-gird-result');
  if(elG && tD>0 && tI>0) {
    const diff = Math.abs(tD-tI);
    const c = diff>=18?'var(--red)':diff>=10?'var(--amber)':'var(--neon)';
    elG.innerHTML = `Diferencia TROM: <span style="color:${c};font-weight:700">${diff}°</span> ${diff>=18?'⚠️ GIRD ≥18° significativo':'✓ Normal'}`;
  }
}

function buildHombroTests() {
  const c = document.getElementById('hombro-tests-rapidos'); if(!c || c.innerHTML) return;
  c.innerHTML = HOMBRO_TESTS.map(t => `
    <div class="card mb-8">
      <div class="card-header"><h3>${t.name}</h3><span class="tag ${t.tag}" style="font-size:9px">${t.sub}</span></div>
      <div class="card-body">
        <div class="grid-2" style="gap:8px">
          <div><div class="il mb-4">D</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
          <div><div class="il mb-4">I</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
        </div>
        <div class="ig mt-8"><label class="il">EVA D</label><input type="range" class="eva-slider" min="0" max="10" value="0" oninput="this.nextElementSibling.textContent=this.value"><span style="font-family:var(--mono);font-size:14px;display:block;text-align:center">0</span></div>
      </div>
    </div>
  `).join('');
}

function buildHombroFuerza() {
  const c = document.getElementById('hombro-fuerza-fields'); if(!c || c.innerHTML) return;
  c.innerHTML = FUERZA_HOMBRO.map(m => `
    <div class="card mb-8">
      <div class="card-header"><h3>${m.label}</h3><span class="tag tag-b">${m.angulo}</span></div>
      <div class="card-body">
        <div class="grid-2" style="gap:8px">
          <div class="ig"><label class="il">D (N)</label><input class="inp inp-mono" type="number" step="0.1" id="fuerza-${m.id}-d" placeholder="0.0" oninput="calcHombroAsimetria()"></div>
          <div class="ig"><label class="il">I (N)</label><input class="inp inp-mono" type="number" step="0.1" id="fuerza-${m.id}-i" placeholder="0.0" oninput="calcHombroAsimetria()"></div>
        </div>
      </div>
    </div>
  `).join('');
}

function calcHombroAsimetria() {
  const results = FUERZA_HOMBRO.map(m => {
    const d = +document.getElementById('fuerza-'+m.id+'-d')?.value||0;
    const i = +document.getElementById('fuerza-'+m.id+'-i')?.value||0;
    if(!d&&!i) return null;
    const mayor = Math.max(d,i), menor = Math.min(d,i);
    const asim = mayor>0?((mayor-menor)/mayor*100).toFixed(1):0;
    const c = +asim>=20?'var(--red)':+asim>=15?'var(--amber)':'var(--neon)';
    return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px">${m.label}</span><span style="font-family:var(--mono);color:${c}">${asim}%</span></div>`;
  }).filter(Boolean);
  const el = document.getElementById('hombro-asimetria-result');
  if(el) el.innerHTML = results.length ? results.join('')+'<div style="font-size:9px;color:var(--text3);margin-top:4px">MDC: 15–20% · CPG 2025</div>' : 'Completá valores para calcular asimetría';
}

function buildASES() {
  const c = document.getElementById('ases-actividades-list'); if(!c || c.innerHTML) return;
  c.innerHTML = ASES_ITEMS.map((act,i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:12px;flex:1">${act}</span>
      <div style="display:flex;gap:4px;margin-left:8px">
        ${[0,1,2,3].map(v=>`<button class="ot-btn" style="min-width:28px;font-size:10px" onclick="selectASES(this,${i},${v})">${v}</button>`).join('')}
      </div>
    </div>
  `).join('');
}
function selectASES(btn, idx, val) {
  btn.parentElement.querySelectorAll('.ot-btn').forEach(b=>{ b.className='ot-btn'; b.style.minWidth='28px'; b.style.fontSize='10px'; });
  btn.classList.add('pos'); asesVals[idx]=val; calcASES2();
}
function calcASES2() {
  const dolor = +document.querySelector('#htab-cuest .eva-slider')?.value||0;
  const pain = (10-dolor)/10*50;
  const filled = asesVals.filter(v=>v!==null);
  const func = filled.length===10?(filled.reduce((a,b)=>a+b,0)/30*50):null;
  const total = func!==null?Math.round(pain+func):null;
  const el = document.getElementById('ases-total'); if(el) el.textContent = total!==null?total:'—';
}

function buildWORC() {
  const c = document.getElementById('worc-fields-sheet'); if(!c || c.innerHTML) return;
  worcVals = new Array(21).fill(0);
  let idx = 0;
  c.innerHTML = WORC_SECTIONS.map(sec => `
    <div style="margin-bottom:10px">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text3);margin-bottom:6px">${sec.d}</div>
      ${sec.items.map(item => {
        const i = idx++;
        return `<div style="padding:6px 0;border-bottom:1px solid var(--border)">
          <div style="font-size:11px;margin-bottom:4px">${item}</div>
          <input type="range" class="eva-slider" min="0" max="100" value="0"
            oninput="worcVals[${i}]=+this.value;document.getElementById('wv-${i}').textContent=this.value;calcWORC2()">
          <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3)">
            <span>Sin síntomas</span><span id="wv-${i}" style="font-family:var(--mono)">0</span><span>Máximos</span>
          </div>
        </div>`;
      }).join('')}
    </div>
  `).join('');
}
function calcWORC2() {
  const sum = worcVals.reduce((a,b)=>a+b,0);
  const pct = ((2100-sum)/2100*100).toFixed(1);
  const el = document.getElementById('worc-total-sheet'); if(el) el.textContent = sum;
  const ep = document.getElementById('worc-pct-sheet'); if(ep) ep.textContent = pct+'% función';
}

function buildDASH() {
  const c = document.getElementById('dash-fields-sheet'); if(!c || c.innerHTML) return;
  c.innerHTML = DASH_ITEMS.map((item,i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:11px;flex:1">${item}</span>
      <div style="display:flex;gap:3px;margin-left:6px">
        ${[1,2,3,4,5].map(v=>`<button class="ot-btn" style="min-width:22px;font-size:10px;padding:3px"
          onclick="selectDASH(this,${i},${v})">${v}</button>`).join('')}
      </div>
    </div>
  `).join('');
}
function selectDASH(btn, idx, val) {
  btn.parentElement.querySelectorAll('.ot-btn').forEach(b=>{b.className='ot-btn';b.style.minWidth='22px';b.style.fontSize='10px';b.style.padding='3px';});
  btn.classList.add('pos'); dashVals[idx]=val;
  const filled = dashVals.filter(v=>v!==null);
  if(filled.length===21){
    const score = ((filled.reduce((a,b)=>a+b,0)/filled.length-1)/4*100).toFixed(1);
    const el = document.getElementById('dash-total-sheet'); if(el) el.textContent=score;
  }
}

function calcSPADI() {
  const sliders = document.querySelectorAll('#spadi-body .eva-slider');
  if(sliders.length>=2){
    const d=+sliders[0].value, dis=+sliders[1].value;
    const total=((d+dis)/2).toFixed(1);
    const el=document.getElementById('spadi-total');if(el)el.textContent=total;
  }
}

function checkHombroRedFlags() {
  const cbs = document.querySelectorAll('.hombro-redflag');
  const any = [...cbs].some(c=>c.checked);
  const el = document.getElementById('hombro-redflag-alert'); if(el) el.style.display=any?'block':'none';
}

function buildRodillaSPF() {
  const c = document.getElementById('rodilla-spf-fields'); if(!c || c.innerHTML) return;
  c.innerHTML = SPF_TESTS.map(t => `
    <div class="card mb-8">
      <div class="card-header"><h3>${t.name}</h3><span class="tag tag-r">Provocativo</span></div>
      <div class="card-body">
        <div class="grid-2" style="gap:8px">
          <div><div class="il mb-4">D</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
          <div><div class="il mb-4">I</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
        </div>
        ${t.hasValgo?`
        <div class="grid-2" style="gap:8px;margin-top:8px">
          <div class="ig"><label class="il">Valgo dinámico D (°) — &gt;10° = positivo</label>
            <input class="inp inp-mono" type="number" id="valgo-spf-d" placeholder="0" oninput="checkValgoSPF('d')">
            <div id="valgo-spf-d-alert" style="display:none;font-size:11px;color:var(--amber);margin-top:3px">⚠️ Valgo &gt;10° — disfunción control motor</div>
          </div>
          <div class="ig"><label class="il">Valgo dinámico I (°)</label>
            <input class="inp inp-mono" type="number" id="valgo-spf-i" placeholder="0" oninput="checkValgoSPF('i')">
            <div id="valgo-spf-i-alert" style="display:none;font-size:11px;color:var(--amber);margin-top:3px">⚠️ Valgo &gt;10°</div>
          </div>
        </div>`:''}
      </div>
    </div>
  `).join('');
}
function checkValgoSPF(side) {
  const val = +document.getElementById('valgo-spf-'+side)?.value;
  const alert = document.getElementById('valgo-spf-'+side+'-alert'); if(alert) alert.style.display=val>10?'block':'none';
}

function buildRodillaLCA() {
  const c = document.getElementById('rodilla-lca-fields'); if(!c || c.innerHTML) return;
  c.innerHTML = LCA_TESTS.map(t => `
    <div class="card mb-8">
      <div class="card-header"><h3>${t.name}</h3><span class="tag tag-r" style="font-size:9px">${t.sub}</span></div>
      <div class="card-body">
        <div class="grid-2" style="gap:8px">
          <div><div class="il mb-4">D</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
          <div><div class="il mb-4">I</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
        </div>
        ${t.hasGrado?`<div class="ig mt-8"><label class="il">Grado</label><select class="inp" style="font-size:12px">${t.opciones.map(o=>`<option>${o}</option>`).join('')}</select></div>`:''}
      </div>
    </div>
  `).join('');
}

function buildRodillaMenisco() {
  const c = document.getElementById('rodilla-menisco-fields'); if(!c || c.innerHTML) return;
  c.innerHTML = MENISCO_TESTS.map(t => `
    <div class="card mb-8">
      <div class="card-header"><h3>${t.name}</h3><span class="tag tag-y" style="font-size:9px">${t.sub}</span></div>
      <div class="card-body">
        <div class="grid-2" style="gap:8px">
          <div><div class="il mb-4">D — Medial</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
          <div><div class="il mb-4">D — Lateral</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
        </div>
      </div>
    </div>
  `).join('') + `<div class="card">
    <div class="card-header"><h3>Síntomas mecánicos</h3></div>
    <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
      <label style="display:flex;justify-content:space-between;font-size:12px">Ruido articular (clic/crepitación)<input type="checkbox" style="accent-color:var(--neon);width:18px;height:18px"></label>
      <label style="display:flex;justify-content:space-between;font-size:12px">Bloqueo articular<input type="checkbox" style="accent-color:var(--neon);width:18px;height:18px"></label>
      <div class="ig mt-4"><label class="il">Descripción</label><textarea class="inp" rows="2" placeholder="Localización, situación en que aparece..."></textarea></div>
    </div>
  </div>`;
}

function calcRatioIQ(side) {
  const cuad = +document.getElementById('cuad-'+side)?.value||0;
  const isq  = +document.getElementById('isq-'+side)?.value||0;
  const el = document.getElementById('ratio-iq-'+side); if(!cuad || !el) return;
  const ratio = (isq/cuad).toFixed(2);
  const rc = +ratio>=0.6?'var(--neon)':'var(--red)';
  el.innerHTML = `Ratio ${side.toUpperCase()}: <span style="font-family:var(--mono);color:${rc};font-weight:700">${ratio}</span> ${+ratio<0.6?'⚠️ <0.60 (déficit)':'✓ Normal'}`;
}

function buildHopRTP() {
  const c = document.getElementById('hop-tests-rtp'); if(!c || c.innerHTML) return;
  const tests = ['Single hop','Triple hop','6m hop (tiempo)','Cross-over triple hop'];
  c.innerHTML = tests.map((t,i) => `
    <div style="padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:12px;font-weight:600;margin-bottom:6px">${t}</div>
      <div class="grid-2" style="gap:6px">
        <div class="ig"><label class="il">Miembro lesionado</label><input class="inp inp-mono" type="number" step="0.1" id="hop-les-${i}" placeholder="0" oninput="calcLSISheet(${i})"></div>
        <div class="ig"><label class="il">Contralateral</label><input class="inp inp-mono" type="number" step="0.1" id="hop-con-${i}" placeholder="0" oninput="calcLSISheet(${i})"></div>
      </div>
      <div id="lsi-sheet-${i}" style="font-size:12px;color:var(--text3);margin-top:4px">LSI: completá ambos lados</div>
    </div>
  `).join('');
}
function calcLSISheet(i) {
  const les = +document.getElementById('hop-les-'+i)?.value;
  const con = +document.getElementById('hop-con-'+i)?.value;
  const el = document.getElementById('lsi-sheet-'+i); if(!les || !con || !el) return;
  const lsi = (les/con*100).toFixed(1);
  const c = +lsi>=90?'var(--neon)':+lsi>=80?'var(--amber)':'var(--red)';
  el.innerHTML = `LSI: <span style="font-family:var(--mono);font-weight:700;color:${c}">${lsi}%</span> ${+lsi>=90?'✓ Criterio RTP':'⚠️ No alcanza RTP (≥90%)'}`;
}

function buildVISAP() {
  const c = document.getElementById('visap-fields'); if(!c || c.innerHTML) return;
  visapVals = new Array(8).fill(null);
  c.innerHTML = VISAP_ITEMS.map((item,i) => `
    <div style="padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:12px;margin-bottom:6px">${i+1}. ${item.q}</div>
      <input type="range" class="eva-slider" min="0" max="10" value="0"
        oninput="visapVals[${i}]=+this.value;this.nextElementSibling.textContent=this.value;calcVISAP()">
      <div style="font-family:var(--mono);font-size:14px;text-align:center;color:var(--neon)">0</div>
    </div>
  `).join('');
}
function calcVISAP() {
  const total = visapVals.reduce((a,b)=>a+(b||0),0);
  const el = document.getElementById('visap-total'); if(el){ el.textContent=total; el.style.color=total>=80?'var(--neon)':total>=60?'var(--amber)':'var(--red)'; }
}

function buildTobilloLig() {
  const c = document.getElementById('tobillo-lig-fields'); if(!c || c.innerHTML) return;
  c.innerHTML = TOBILLO_LIG.map(t => `
    <div class="card mb-8">
      <div class="card-header"><h3>${t.name}</h3><span class="tag tag-r" style="font-size:9px">${t.sub}</span></div>
      <div class="card-body">
        <div class="grid-2" style="gap:8px">
          <div><div class="il mb-4">D</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
          <div><div class="il mb-4">I</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
        </div>
      </div>
    </div>
  `).join('');
}

function calcDropNavicular(side) {
  const desc = +document.getElementById('nav-desc-'+side)?.value||0;
  const carg = +document.getElementById('nav-carg-'+side)?.value||0;
  const drop = carg - desc;
  const el = document.getElementById('nav-result-'+side); if(!el) return;
  const c = drop>10?'var(--red)':drop>6?'var(--amber)':'var(--neon)';
  el.innerHTML = `Drop ${side.toUpperCase()}: <span style="font-family:var(--mono);font-weight:700;color:${c}">${drop}mm</span> ${drop>10?'⚠️ Pronación excesiva':drop>6?'⚠️ Límite':'✓ Normal'}`;
}

function calcLungeTob() {
  const d = +document.getElementById('tob-lunge-d')?.value;
  const i = +document.getElementById('tob-lunge-i')?.value;
  const getS = v => !v?'':`<span style="color:${v<35?'var(--red)':v<=40?'var(--amber)':'var(--neon)'}">${v<35?'🔴 <35°':v<=40?'🟡 35–40°':'🟢 >40°'}</span>`;
  const elD = document.getElementById('tob-lunge-d-sema'); if(elD) elD.innerHTML=getS(d);
  const elI = document.getElementById('tob-lunge-i-sema'); if(elI) elI.innerHTML=getS(i);
  const elA = document.getElementById('tob-lunge-asim');
  if(elA && d && i) {
    const diff = Math.abs(d-i);
    const c = diff>5?'var(--amber)':'var(--neon)';
    elA.innerHTML = `Asimetría: <span style="font-family:var(--mono);font-weight:700;color:${c}">${diff}°</span> ${diff>5?'⚠️ >5° clínicamente significativo':'✓ Simétrico'}`;
  }
}

function calcCadencia() {
  const val = +document.getElementById('cadencia-actual')?.value;
  const el = document.getElementById('cadencia-result'); if(!val||!el) return;
  const c = val>=170&&val<=180?'var(--neon)':val>=160?'var(--amber)':'var(--red)';
  el.innerHTML = `<span style="color:${c};font-weight:700">${val<170?'⚠️':'✓'} ${val} pasos/min</span><br>
    <span style="font-size:10px;color:var(--text3)">+5%: ${Math.round(val*1.05)} · +10%: ${Math.round(val*1.10)} · Objetivo: 170–180</span>`;
}

function buildSEBT() {
  const c = document.getElementById('sebt-sheet-fields'); if(!c || c.innerHTML) return;
  c.innerHTML = SEBT_DIRS.map(dir => `
    <div style="margin-bottom:8px">
      <div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:4px">${dir}</div>
      <div class="grid-2" style="gap:6px">
        <div class="ig"><label class="il">D (cm)</label><input class="inp inp-mono" type="number" placeholder="0"></div>
        <div class="ig"><label class="il">I (cm)</label><input class="inp inp-mono" type="number" placeholder="0"></div>
      </div>
    </div>
  `).join('');
}

function buildCAIT2() {
  const c = document.getElementById('cait-sheet-fields'); if(!c || c.innerHTML) return;
  caitVals2 = new Array(9).fill(null);
  c.innerHTML = CAIT_ITEMS2.map((item,i) => `
    <div style="padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:12px;font-weight:600;margin-bottom:6px">${i+1}. ${item.q}</div>
      ${item.ops.map((op,j) => `
        <label style="display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer;font-size:11px">
          <input type="radio" name="cait2-${i}" value="${item.vals[j]}" onchange="caitVals2[${i}]=${item.vals[j]};calcCAIT2()">
          ${op}
        </label>
      `).join('')}
    </div>
  `).join('');
}
function calcCAIT2() {
  const filled = caitVals2.filter(v=>v!==null);
  if(filled.length===9){
    const total = caitVals2.reduce((a,b)=>a+b,0);
    const el = document.getElementById('cait-sheet-total');
    const interp = document.getElementById('cait-sheet-interp');
    if(el){ el.textContent=total; el.style.color=total<=27?'var(--red)':'var(--neon)'; }
    if(interp) interp.innerHTML=`<span style="color:${total<=27?'var(--red)':'var(--neon)'}">${total<=27?'⚠️ IAC sugerida':'✓ Sin IAC'}</span>`;
  }
}

function buildFAAM2() {
  const avd = document.getElementById('faam-avd-sheet'); if(!avd || avd.innerHTML) return;
  faamAvdVals = new Array(21).fill(null);
  faamDepVals = new Array(8).fill(null);
  avd.innerHTML = FAAM_AVD_ITEMS.map((item,i) => `
    <div style="padding:6px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:11px;margin-bottom:4px">${item}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        ${[4,3,2,1,0].map((v,j)=>`<button class="ot-btn" style="flex:1;min-width:55px;font-size:10px"
          onclick="this.parentElement.querySelectorAll('.ot-btn').forEach(b=>{b.className='ot-btn';b.style='flex:1;min-width:55px;font-size:10px'});this.classList.add('pos');faamAvdVals[${i}]=${v};calcFAAM2('avd')"
          >${['Sin dif.','Ligera','Moder.','Extrema','Impos.'][j]}</button>`).join('')}
      </div>
    </div>
  `).join('');
  const dep = document.getElementById('faam-dep-sheet');
  dep.innerHTML = FAAM_DEP_ITEMS.map((item,i) => `
    <div style="padding:6px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:11px;margin-bottom:4px">${item}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        ${[4,3,2,1,0].map((v,j)=>`<button class="ot-btn" style="flex:1;font-size:10px"
          onclick="this.parentElement.querySelectorAll('.ot-btn').forEach(b=>{b.className='ot-btn';b.style.flex='1';b.style.fontSize='10px'});this.classList.add('pos');faamDepVals[${i}]=${v};calcFAAM2('dep')"
          >${['Sin dif.','Ligera','Moder.','Extrema','Impos.'][j]}</button>`).join('')}
      </div>
    </div>
  `).join('');
}
function calcFAAM2(type) {
  if(type==='avd'){
    const filled = faamAvdVals.filter(v=>v!==null);
    const max = filled.length*4; const sum = filled.reduce((a,b)=>a+b,0);
    const el = document.getElementById('faam-avd-sheet-total');
    if(el) el.textContent = filled.length===21?(sum/max*100).toFixed(1)+'%':sum+'/'+max;
  } else {
    const filled = faamDepVals.filter(v=>v!==null);
    const max = filled.length*4; const sum = filled.reduce((a,b)=>a+b,0);
    const el = document.getElementById('faam-dep-sheet-total');
    if(el) el.textContent = filled.length===8?(sum/max*100).toFixed(1)+'%':sum+'/'+max;
  }
}

function buildVISAA() {
  const c = document.getElementById('visaa-fields'); if(!c || c.innerHTML) return;
  visaaVals = new Array(8).fill(null);
  c.innerHTML = VISAA_ITEMS.map((item,i) => `
    <div style="padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:12px;margin-bottom:6px">${i+1}. ${item.q}</div>
      <input type="range" class="eva-slider" min="0" max="10" value="0"
        oninput="visaaVals[${i}]=+this.value;this.nextElementSibling.textContent=this.value;calcVISAA()">
      <div style="font-family:var(--mono);font-size:14px;text-align:center;color:var(--teal)">0</div>
    </div>
  `).join('');
}
function calcVISAA() {
  const total = visaaVals.reduce((a,b)=>a+(b||0),0);
  const el = document.getElementById('visaa-total');
  if(el){ el.textContent=total; el.style.color=total>=75?'var(--neon)':total>=50?'var(--amber)':'var(--red)'; }
}

function buildStartBack() {
  const c = document.getElementById('startback-sheet-fields'); if(!c || c.innerHTML) return;
  startbackVals = new Array(9).fill(null);
  c.innerHTML = STARTBACK_ITEMS.map((item,i) => `
    <div style="padding:6px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:11px;margin-bottom:4px">${i+1}. ${item}</div>
      <div style="display:flex;gap:10px">
        ${i<8?
          `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="radio" name="sb2-${i}" onchange="startbackVals[${i}]=0;calcStartBack2()"> No</label>
           <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="radio" name="sb2-${i}" onchange="startbackVals[${i}]=1;calcStartBack2()"> Sí</label>` :
          `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="radio" name="sb2-${i}" onchange="startbackVals[${i}]=0;calcStartBack2()"> Ninguna/Poca</label>
           <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="radio" name="sb2-${i}" onchange="startbackVals[${i}]=1;calcStartBack2()"> Moderada/Mucha</label>`
        }
      </div>
    </div>
  `).join('');
}
function calcStartBack2() {
  const filled = startbackVals.filter(v=>v!==null);
  if(filled.length<9) return;
  const total = startbackVals.reduce((a,b)=>a+b,0);
  const sub = startbackVals.slice(4).reduce((a,b)=>a+b,0);
  let grupo, c;
  if(total<=3){ grupo='Bajo riesgo'; c='var(--neon)'; }
  else if(sub<=3){ grupo='Medio riesgo'; c='var(--amber)'; }
  else { grupo='Alto riesgo'; c='var(--red)'; }
  const el=document.getElementById('startback-sheet-result'); if(el){ el.textContent=grupo; el.style.color=c; }
}

function buildDoha() {
  const c = document.getElementById('doha-entidades-sheet'); if(!c || c.innerHTML) return;
  c.innerHTML = DOHA_ENTS.map(e => `
    <div class="card mb-8" style="border-color:${e.color}44">
      <div class="card-header" style="cursor:pointer" onclick="toggleSheetSection('doha-${e.id}-body')">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:10px;height:10px;border-radius:50%;background:${e.color}"></div>
          <h3>${e.label}</h3>
        </div>
        <span style="font-size:12px;color:var(--text3)">▼</span>
      </div>
      <div id="doha-${e.id}-body" style="display:none">
        <div class="card-body">
          <div style="font-size:11px;color:var(--text2);margin-bottom:6px"><strong>Criterios:</strong> ${e.crit}</div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:10px">Confiabilidad: ${e.kappa}</div>
          ${e.tests.map(t => `
            <div class="card mb-6" style="border-color:${e.color}33">
              <div class="card-body" style="padding:10px">
                <div style="font-size:12px;font-weight:600;margin-bottom:6px">${t}</div>
                <div class="grid-2" style="gap:6px">
                  <div><div class="il mb-4">D</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
                  <div><div class="il mb-4">I</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
                </div>
                <div class="grid-2" style="gap:6px;margin-top:6px">
                  <div class="ig"><label class="il">EVA D</label><input type="range" class="eva-slider" min="0" max="10" value="0" oninput="this.nextElementSibling.textContent=this.value"><span style="font-family:var(--mono);font-size:13px;text-align:center;display:block">0</span></div>
                  <div class="ig"><label class="il">EVA I</label><input type="range" class="eva-slider" min="0" max="10" value="0" oninput="this.nextElementSibling.textContent=this.value"><span style="font-family:var(--mono);font-size:13px;text-align:center;display:block">0</span></div>
                </div>
              </div>
            </div>
          `).join('')}
          <div class="ig"><label class="il">Clasificación</label>
            <select class="inp" style="font-size:12px" id="doha-class-${e.id}">
              <option value="">— No presente —</option>
              <option value="1">1° — Entidad primaria</option>
              <option value="2">2° — Entidad secundaria</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function buildHAGOS() {
  const c = document.getElementById('hagos-sheet-fields'); if(!c || c.innerHTML) return;
  const dom = ['Síntomas','Dolor','Función AVD','Función deporte','Participación física','Calidad de vida'];
  c.innerHTML = dom.map(d => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:12px">${d}</span>
      <div style="display:flex;align-items:center;gap:6px">
        <input class="inp inp-mono" type="number" min="0" max="100" placeholder="0–100" style="width:70px">
        <span style="font-size:10px;color:var(--text3)">pts</span>
      </div>
    </div>
  `).join('') + '<div style="font-size:9px;color:var(--text3);margin-top:6px">0 = máximos síntomas · 100 = sin síntomas</div>';
}

function toggleOT(btn, type) {
  const siblings = btn.parentElement.querySelectorAll('.ot-btn');
  siblings.forEach(b => b.classList.remove('pos','neg'));
  btn.classList.add(type);
}

function saveKlinicalSheet(type) {
  if(!cur) return;
  if(!cur.klinical) cur.klinical = {};
  cur.klinical[type] = cur.klinical[type] || {};
  cur.klinical[type].fecha = new Date().toISOString().split('T')[0];
  // Save specific values based on type
  if(type==='rodilla') {
    cur.klinical.rodilla.kujala = +document.getElementById('kujala-input')?.value || null;
    cur.klinical.rodilla.visap = visapVals.reduce((a,b)=>a+(b||0),0);
  }
  if(type==='tobillo') {
    const caitTotal = caitVals2.filter(v=>v!==null).length===9 ? caitVals2.reduce((a,b)=>a+b,0) : null;
    cur.klinical.tobillo.cait = caitTotal;
    cur.klinical.tobillo.visaa = visaaVals.reduce((a,b)=>a+(b||0),0);
  }
  if(type==='codo') {
    cur.klinical.codo.pfgsD = +document.getElementById('pfgs-d')?.value || null;
    cur.klinical.codo.pfgsI = +document.getElementById('pfgs-i')?.value || null;
    cur.klinical.codo.gripD = +document.getElementById('grip-max-d')?.value || null;
    cur.klinical.codo.gripI = +document.getElementById('grip-max-i')?.value || null;
    cur.klinical.codo.prtee = calcPRTEEScore();
    cur.klinical.codo.qdash = calcCodoQDASH();
  }
  if(type==='cervical') {
    const ndiScore = cxNdiVals.filter(v=>v!==null).length===10 ? cxNdiVals.reduce((a,b)=>a+b,0) : null;
    const psfsAvg = cxPsfsVals.filter(v=>v!==null).length ? +(cxPsfsVals.filter(v=>v!==null).reduce((a,b)=>a+b,0)/cxPsfsVals.filter(v=>v!==null).length).toFixed(1) : null;
    cur.klinical.cervical.ndi = ndiScore;
    cur.klinical.cervical.psfs = psfsAvg;
    cur.klinical.cervical.nprs = +document.getElementById('cx-nprs')?.value || null;
    cur.klinical.cervical.clasificacion = document.querySelector('input[name="cx-clasificacion"]:checked')?.value || null;
    const nfeT = +document.getElementById('cx-nfe-tiempo')?.value || null;
    cur.klinical.cervical.nfe = nfeT;
    const cfrtD = +document.getElementById('cfrt-d')?.value || null;
    const cfrtI = +document.getElementById('cfrt-i')?.value || null;
    cur.klinical.cervical.cfrtD = cfrtD;
    cur.klinical.cervical.cfrtI = cfrtI;
  }
  atletas = atletas.map(a => a.id===cur.id ? cur : a);
  saveData();
  showSaveToast();
}

// ══════════════════════════════════════════════════════
//  CODO SHEET
// ══════════════════════════════════════════════════════

const CODO_ROM = [
  { id:'flex-codo',  label:'Flexión codo',         ref:'0–145°',  mdc:'5°' },
  { id:'ext-codo',   label:'Extensión codo',        ref:'0°',      mdc:'5°' },
  { id:'sup-codo',   label:'Supinación antebrazo',  ref:'0–90°',   mdc:'ICC 0.86–0.98' },
  { id:'pron-codo',  label:'Pronación antebrazo',   ref:'0–90°',   mdc:'ICC 0.86–0.98' },
  { id:'flex-mun',   label:'Flexión muñeca',        ref:'0–80°',   mdc:'MDC90 ~5°' },
  { id:'ext-mun',    label:'Extensión muñeca',      ref:'0–70°',   mdc:'MDC90 ~5°' },
  { id:'dev-rad',    label:'Desv. radial muñeca',   ref:'0–20°',   mdc:'MDC90 ~5°' },
  { id:'dev-cub',    label:'Desv. cubital muñeca',  ref:'0–40°',   mdc:'MDC90 ~5°' }
];

const PRTEE_DOLOR = [
  'En su peor momento',
  'Al cerrar el puño',
  'Al dar la mano',
  'Al girar un picaporte o perilla',
  'Al cargar una bolsa o maletín'
];
const PRTEE_ACTIV = [
  'Girar una perilla o llave',
  'Cargar una bolsa pesada',
  'Levantar una taza llena hacia la boca',
  'Empujar una puerta pesada',
  'Sostener un plato lleno',
  'Retorcer una toalla'
];
const PRTEE_USUAL = [
  'Actividades personales (vestirse, higiene)',
  'Trabajo del hogar',
  'Trabajo / empleo',
  'Actividades recreativas o deportivas'
];

const QDASH_ITEMS = [
  'Abrir una jarra apretada o nuevo',
  'Tareas domésticas pesadas (limpiar pisos, paredes)',
  'Cargar una bolsa de compras',
  'Lavar la espalda',
  'Usar un cuchillo para cortar alimentos',
  'Actividades que requieren esfuerzo (golf, martillar)',
  'Actividad social (interferencia del hombro/brazo)',
  'Dificultad con el trabajo (limitación en el trabajo)',
  'Hormigueo (agujas) en brazo, hombro o mano',
  'Dificultad para dormir por dolor en brazo/hombro/mano',
  'Sensación de debilidad en brazo, hombro o mano'
];

let prteeDolorVals = new Array(5).fill(null);
let prteeActivVals = new Array(6).fill(null);
let prteeUsualVals = new Array(4).fill(null);
let codoQDashVals  = new Array(11).fill(null);

function showCTab(tab, btn) {
  ['obs','rom','tests','fuerza','esc'].forEach(t => {
    const el = document.getElementById('ctab-' + t); if(el) el.style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('#sheet-codo .btn').forEach(b => {
    if(b.id && b.id.startsWith('ctab-')) { b.className = 'btn btn-ghost btn-sm'; b.style.whiteSpace='nowrap'; b.style.fontSize='10px'; }
  });
  if(btn) { btn.className = 'btn btn-neon btn-sm'; btn.style.whiteSpace='nowrap'; btn.style.fontSize='10px'; }
}

function initCodoSheet() {
  buildCodoROM();
  buildCodoTests();
  buildCodoPRTEE();
  buildCodoQDASH();
}

function buildCodoROM() {
  const c = document.getElementById('codo-rom-fields'); if(!c || c.innerHTML) return;
  c.innerHTML = CODO_ROM.map(m => `
    <div class="card mb-8">
      <div class="card-header"><h3>${m.label}</h3><span class="tag tag-b" style="font-size:9px">Ref: ${m.ref} · ${m.mdc}</span></div>
      <div class="card-body">
        <div class="grid-2" style="gap:8px">
          <div class="ig"><label class="il">Activo D (°)</label><input class="inp inp-mono" type="number" id="crom-${m.id}-act-d" placeholder="0" oninput="calcCodoROM('${m.id}')"></div>
          <div class="ig"><label class="il">Activo I (°)</label><input class="inp inp-mono" type="number" id="crom-${m.id}-act-i" placeholder="0" oninput="calcCodoROM('${m.id}')"></div>
          <div class="ig"><label class="il">Pasivo D (°)</label><input class="inp inp-mono" type="number" id="crom-${m.id}-pas-d" placeholder="0"></div>
          <div class="ig"><label class="il">Pasivo I (°)</label><input class="inp inp-mono" type="number" id="crom-${m.id}-pas-i" placeholder="0"></div>
        </div>
        <div id="crom-${m.id}-result" style="font-family:var(--mono);font-size:11px;margin-top:6px;color:var(--text3)"></div>
      </div>
    </div>
  `).join('');
}

function calcCodoROM(id) {
  const d = +document.getElementById('crom-'+id+'-act-d')?.value||0;
  const i = +document.getElementById('crom-'+id+'-act-i')?.value||0;
  const el = document.getElementById('crom-'+id+'-result');
  if(!el || (!d && !i)) return;
  const diff = Math.abs(d-i);
  const c = diff>=20?'var(--red)':diff>=10?'var(--amber)':'var(--neon)';
  el.innerHTML = `Asimetría: <span style="color:${c};font-weight:700">${diff}°</span> ${diff>=10?'⚠️ Clínicamente relevante':'✓'}`;
}

function buildCodoTests() {
  _buildCodoTestGroup('codo-tests-lateral',    CODO_TESTS_LATERAL);
  _buildCodoTestGroup('codo-tests-medial',     CODO_TESTS_MEDIAL);
  _buildCodoTestGroup('codo-tests-neural',     CODO_TESTS_NEURAL);
}

function _buildCodoTestGroup(containerId, tests) {
  const c = document.getElementById(containerId); if(!c || c.innerHTML) return;
  c.innerHTML = tests.map(t => `
    <div class="card mb-8">
      <div class="card-header"><h3>${t.name}</h3><span class="tag ${t.tag}" style="font-size:9px">${t.sub}</span></div>
      <div class="card-body">
        <div style="font-size:10px;color:var(--text3);font-family:var(--mono);margin-bottom:8px">${t.ref}</div>
        <div class="grid-2" style="gap:8px">
          <div><div class="il mb-4">D</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
          <div><div class="il mb-4">I</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
        </div>
        <div class="ig mt-8"><label class="il">EVA D</label><input type="range" class="eva-slider" min="0" max="10" value="0" oninput="this.nextElementSibling.textContent=this.value"><span style="font-family:var(--mono);font-size:14px;display:block;text-align:center">0</span></div>
      </div>
    </div>
  `).join('');
}

function calcCodoFuerza() {
  const calcAsim = (d, i, elId, mcid) => {
    const el = document.getElementById(elId); if(!el) return;
    if(!d || !i) { el.textContent = 'Ingresá ambos lados'; el.style.color='var(--text3)'; return; }
    const asim = Math.abs(d-i)/Math.max(d,i)*100;
    const diff = Math.abs(d-i);
    const c = asim>=20?'var(--red)':asim>=10?'var(--amber)':'var(--neon)';
    const label = asim>=20?'⚠️ Déficit significativo':asim>=10?'⚡ Déficit leve':'✓ Simétrico';
    el.innerHTML = `D: <strong>${d}</strong> kg · I: <strong>${i}</strong> kg · Asimetría: <span style="color:${c};font-weight:700">${asim.toFixed(1)}%</span> · Δ ${diff.toFixed(1)} kg ${mcid?'(MCID '+mcid+'kg)':''} — <span style="color:${c}">${label}</span>`;
  };
  const pD = +document.getElementById('pfgs-d')?.value||0;
  const pI = +document.getElementById('pfgs-i')?.value||0;
  calcAsim(pD, pI, 'pfgs-result', 7);
  const gD = +document.getElementById('grip-max-d')?.value||0;
  const gI = +document.getElementById('grip-max-i')?.value||0;
  calcAsim(gD, gI, 'grip-max-result', null);
  const ppD = +document.getElementById('ppt-d')?.value||0;
  const ppI = +document.getElementById('ppt-i')?.value||0;
  const pptEl = document.getElementById('ppt-result'); if(pptEl && ppD && ppI) {
    const ratio = Math.min(ppD,ppI)/Math.max(ppD,ppI);
    const bilat = (ppD+ppI)/2;
    const c = ratio<0.7?'var(--red)':ratio<0.85?'var(--amber)':'var(--neon)';
    pptEl.innerHTML = `D: <strong>${ppD}</strong> · I: <strong>${ppI}</strong> kg/cm² · Ratio: <span style="color:${c};font-weight:700">${ratio.toFixed(2)}</span> ${ratio<0.7?'⚠️ Asimetría marcada — posible sensibilización':'✓'}`;
  }
}

function buildCodoPRTEE() {
  const buildList = (items, prefix, containerId) => {
    const c = document.getElementById(containerId); if(!c || c.innerHTML) return;
    c.innerHTML = items.map((item, i) => `
      <div style="padding:6px 0;border-bottom:1px solid var(--border)">
        <div style="font-size:11px;margin-bottom:5px">${item}</div>
        <div style="display:flex;gap:3px;flex-wrap:wrap">
          ${[0,1,2,3,4,5,6,7,8,9,10].map(v=>`<button class="ot-btn" style="min-width:24px;font-size:10px;padding:2px 4px"
            onclick="selectPRTEE(this,'${prefix}',${i},${v})">${v}</button>`).join('')}
        </div>
      </div>
    `).join('');
  };
  buildList(PRTEE_DOLOR, 'dolor', 'prtee-dolor-list');
  buildList(PRTEE_ACTIV, 'activ', 'prtee-activ-list');
  buildList(PRTEE_USUAL, 'usual', 'prtee-usual-list');
}

function selectPRTEE(btn, prefix, idx, val) {
  btn.parentElement.querySelectorAll('.ot-btn').forEach(b => {
    b.className = 'ot-btn'; b.style.minWidth='24px'; b.style.fontSize='10px'; b.style.padding='2px 4px';
  });
  btn.classList.add('pos');
  if(prefix==='dolor') prteeDolorVals[idx]=val;
  else if(prefix==='activ') prteeActivVals[idx]=val;
  else if(prefix==='usual') prteeUsualVals[idx]=val;
  const score = calcPRTEEScore();
  const el = document.getElementById('prtee-total');
  const eb = document.getElementById('prtee-breakdown');
  const ei = document.getElementById('prtee-interp');
  if(score !== null && el) {
    const dolorFilled = prteeDolorVals.filter(v=>v!==null);
    const funcFilled = [...prteeActivVals,...prteeUsualVals].filter(v=>v!==null);
    const pSub = dolorFilled.length===5 ? dolorFilled.reduce((a,b)=>a+b,0) : null;
    const fSub = funcFilled.length===10 ? funcFilled.reduce((a,b)=>a+b,0)/2 : null;
    el.textContent = score;
    const c = score<=20?'var(--neon)':score<=50?'var(--amber)':'var(--red)';
    el.style.color = c;
    if(eb) eb.textContent = `Dolor: ${pSub??'—'} · Función: ${fSub??'—'}`;
    if(ei) ei.textContent = score<=20?'✓ Leve — buen pronóstico':score<=50?'⚡ Moderado — supervisar':score<=75?'⚠️ Severo — plan intensivo':'🔴 Muy severo';
  }
}

function calcPRTEEScore() {
  const dFilled = prteeDolorVals.filter(v=>v!==null);
  const aFilled = prteeActivVals.filter(v=>v!==null);
  const uFilled = prteeUsualVals.filter(v=>v!==null);
  if(dFilled.length<5 || aFilled.length<6 || uFilled.length<4) return null;
  const pain = dFilled.reduce((a,b)=>a+b,0);
  const func = ([...prteeActivVals,...prteeUsualVals].reduce((a,b)=>a+b,0))/2;
  return Math.round(pain + func);
}

function buildCodoQDASH() {
  const c = document.getElementById('codo-qdash-list'); if(!c || c.innerHTML) return;
  codoQDashVals = new Array(11).fill(null);
  c.innerHTML = QDASH_ITEMS.map((item,i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:11px;flex:1">${item}</span>
      <div style="display:flex;gap:3px;margin-left:6px">
        ${[1,2,3,4,5].map(v=>`<button class="ot-btn" style="min-width:22px;font-size:10px;padding:3px"
          onclick="selectCodoQDASH(this,${i},${v})">${v}</button>`).join('')}
      </div>
    </div>
  `).join('');
}

function selectCodoQDASH(btn, idx, val) {
  btn.parentElement.querySelectorAll('.ot-btn').forEach(b=>{b.className='ot-btn';b.style.minWidth='22px';b.style.fontSize='10px';b.style.padding='3px';});
  btn.classList.add('pos');
  codoQDashVals[idx]=val;
  const score = calcCodoQDASH();
  if(score !== null) {
    const el = document.getElementById('codo-qdash-total');
    if(el) { el.textContent=score; el.style.color=score<=20?'var(--neon)':score<=50?'var(--amber)':'var(--red)'; }
  }
}

function calcCodoQDASH() {
  const filled = codoQDashVals.filter(v=>v!==null);
  if(filled.length < 11) return null;
  return +((filled.reduce((a,b)=>a+b,0)/filled.length - 1)/4*100).toFixed(1);
}

function checkCodoRedFlags() {
  const cbs = document.querySelectorAll('.codo-redflag');
  const any = [...cbs].some(c=>c.checked);
  const el = document.getElementById('codo-redflag-alert'); if(el) el.style.display=any?'block':'none';
}

// ══════════════════════════════════════════════════════
//  CERVICAL SHEET
// ══════════════════════════════════════════════════════

let cxNdiVals = new Array(10).fill(null);
let cxPsfsVals = [null, null, null];
const ccftState = {};

function showCXTab(tab, btn) {
  ['obs','rom','tests','motor','esc'].forEach(t => {
    const el = document.getElementById('cxtab-' + t); if(el) el.style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('#sheet-cervical .btn').forEach(b => b.classList.remove('btn-neon'));
  if(btn) btn.classList.add('btn-neon');
}

function initCervicalSheet() {
  buildCXROM();
  buildCXTests();
  buildCXMyotomas();
  buildCXReflejos();
  buildNDI();
  buildCXPSFS();
}

function buildCXROM() {
  const c = document.getElementById('cx-rom-fields'); if(!c || c.innerHTML) return;
  c.innerHTML = CERVICAL_ROM.map(r => `
    <div class="card mb-8">
      <div class="card-header" style="padding:8px 12px"><h3 style="font-size:12px">${r.label}</h3><span class="tag tag-b" style="font-size:9px">Ref: ${r.ref}</span></div>
      <div class="card-body" style="padding:8px 12px">
        <div class="grid-2" style="gap:8px">
          <div class="ig"><label class="il">Activo (°)</label><input class="inp inp-mono" type="number" id="cx-rom-${r.id}-act" placeholder="${r.ref}" style="text-align:center"></div>
          <div class="ig"><label class="il">Pasivo (°)</label><input class="inp inp-mono" type="number" id="cx-rom-${r.id}-pas" placeholder="${r.ref}" style="text-align:center"></div>
        </div>
        <div style="font-size:9px;color:var(--text3);font-family:var(--mono);margin-top:4px">MDC: ${r.mdc}</div>
      </div>
    </div>
  `).join('');
}

function buildCXTests() {
  _buildCervTestGroup('cx-tests-radicular',   CERVICAL_TESTS_RADICULAR);
  _buildCervTestGroup('cx-tests-headache',    CERVICAL_TESTS_HEADACHE);
  _buildCervTestGroup('cx-tests-estabilidad', CERVICAL_TESTS_ESTABILIDAD);
}

function _buildCervTestGroup(containerId, tests) {
  const c = document.getElementById(containerId); if(!c || c.innerHTML) return;
  c.innerHTML = tests.map(t => `
    <div class="card mb-8">
      <div class="card-header"><h3>${t.name}</h3><span class="tag ${t.tag}" style="font-size:9px">${t.sub}</span></div>
      <div class="card-body">
        <div style="font-size:10px;color:var(--text3);font-family:var(--mono);margin-bottom:8px">${t.ref}</div>
        <div class="grid-2" style="gap:8px">
          <div><div class="il mb-4">D</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
          <div><div class="il mb-4">I</div><div style="display:flex;gap:6px"><button class="ot-btn" onclick="toggleOT(this,'pos')">+ POS</button><button class="ot-btn" onclick="toggleOT(this,'neg')">– NEG</button></div></div>
        </div>
        <div class="ig mt-8"><label class="il">EVA / NRS D</label><input type="range" class="eva-slider" min="0" max="10" value="0" oninput="this.nextElementSibling.textContent=this.value"><span style="font-family:var(--mono);font-size:14px;display:block;text-align:center">0</span></div>
      </div>
    </div>
  `).join('');
}

function calcCFRT() {
  const d = +document.getElementById('cfrt-d')?.value || 0;
  const i = +document.getElementById('cfrt-i')?.value || 0;
  const el = document.getElementById('cfrt-result'); if(!el) return;
  if(!d && !i) { el.textContent = 'Ingresá valores — positivo: <32° o diferencia >10°'; el.style.color='var(--text3)'; return; }
  const diff = Math.abs(d - i);
  const posD = d > 0 && d < 32;
  const posI = i > 0 && i < 32;
  const posAsym = diff > 10;
  if(posD || posI || posAsym) {
    const reasons = [];
    if(posD) reasons.push(`D: ${d}° < 32°`);
    if(posI) reasons.push(`I: ${i}° < 32°`);
    if(posAsym) reasons.push(`Asimetría: ${diff}°`);
    el.innerHTML = `<span style="color:var(--red)">⚠️ POSITIVO — ${reasons.join(' · ')}</span><br><span style="font-size:10px;color:var(--text3)">Sugestivo cefalea cervicogénica C1-C2</span>`;
  } else {
    el.innerHTML = `<span style="color:var(--neon)">✓ NEGATIVO — D:${d}° I:${i}° (ambos ≥32°, dif. ${diff}°)</span>`;
  }
}

function toggleCCFT(btn, type, level) {
  const siblings = btn.parentElement.querySelectorAll('.ot-btn');
  siblings.forEach(b => { b.classList.remove('btn-neon','btn-danger'); });
  btn.classList.add(type === 'ok' ? 'btn-neon' : 'btn-danger');
  ccftState[level] = type;
  _updateCCFTResult();
}

function _updateCCFTResult() {
  const levels = [22, 24, 26, 28, 30];
  const el = document.getElementById('ccft-result'); if(!el) return;
  const tested = levels.filter(l => ccftState[l]);
  if(!tested.length) { el.textContent='Testear niveles progresivamente'; el.style.color='var(--text3)'; return; }
  const maxOK = levels.filter(l => ccftState[l] === 'ok').reduce((a,b) => Math.max(a,b), 0);
  const firstFail = levels.find(l => ccftState[l] === 'fail');
  if(!firstFail) {
    el.innerHTML = `<span style="color:var(--neon)">✓ Aprobó hasta ${maxOK} mmHg</span><br><span style="font-size:10px;color:var(--text3)">Continuar si hay niveles sin testear</span>`;
  } else {
    el.innerHTML = `<span style="color:var(--amber)">Falla en ${firstFail} mmHg${maxOK ? ' · Aprobó hasta '+maxOK+' mmHg' : ''}</span><br><span style="font-size:10px;color:var(--text3)">Disfunción flexores profundos · Indica NPMCI</span>`;
  }
}

function calcCXNFE() {
  const t = +document.getElementById('cx-nfe-tiempo')?.value || 0;
  const sexo = document.getElementById('cx-nfe-sexo')?.value || 'M';
  const el = document.getElementById('cx-nfe-result'); if(!el) return;
  if(!t) { el.textContent='Ingresá el tiempo'; el.style.color='var(--text3)'; return; }
  const norm = sexo === 'M' ? 39 : 29;
  if(t >= norm) {
    el.innerHTML = `<span style="color:var(--neon)">✓ Normal — ${t}s (ref ≥${norm}s)</span>`;
  } else {
    el.innerHTML = `<span style="color:var(--red)">⚠️ Déficit — ${t}s / ref ≥${norm}s · Déficit: ${norm-t}s</span><br><span style="font-size:10px;color:var(--text3)">Disfunción flexores profundos cervicales</span>`;
  }
}

function buildCXMyotomas() {
  const c = document.getElementById('cx-myotomas-fields'); if(!c || c.innerHTML) return;
  c.innerHTML = CX_MYOTOMAS.map(m => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
      <div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--neon);min-width:28px">${m.nivel}</div>
      <div style="font-size:11px;color:var(--text2);flex:1">${m.mov}</div>
      <select class="inp inp-mono" id="${m.id}-d" style="width:60px;padding:3px 6px;font-size:11px">
        <option>5/5</option><option>4+</option><option>4/5</option><option>4-</option><option>3/5</option><option>2/5</option><option>1/5</option><option>0/5</option>
      </select>
      <select class="inp inp-mono" id="${m.id}-i" style="width:60px;padding:3px 6px;font-size:11px">
        <option>5/5</option><option>4+</option><option>4/5</option><option>4-</option><option>3/5</option><option>2/5</option><option>1/5</option><option>0/5</option>
      </select>
    </div>
  `).join('') + '<div style="display:flex;justify-content:flex-end;gap:16px;padding-top:4px"><span style="font-size:10px;color:var(--text3)">← D &nbsp;&nbsp; I →</span></div>';
}

function buildCXReflejos() {
  const c = document.getElementById('cx-reflejos-fields'); if(!c || c.innerHTML) return;
  c.innerHTML = CX_REFLEJOS.map(r => `
    <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:11px;font-weight:600;flex:1">${r.nombre} <span style="font-family:var(--mono);font-size:10px;color:var(--text3)">${r.nivel}</span></div>
      <div style="display:flex;gap:4px">
        <span style="font-size:10px;color:var(--text3);align-self:center;margin-right:2px">D</span>
        <button class="ot-btn" style="font-size:9px;padding:3px 6px" onclick="toggleOT(this,'pos')">↑ Hiper</button>
        <button class="ot-btn" style="font-size:9px;padding:3px 6px" onclick="toggleOT(this,'neg')">= Normal</button>
        <button class="ot-btn" style="font-size:9px;padding:3px 6px" onclick="toggleOT(this,'absent')">↓ Hipo</button>
      </div>
      <div style="display:flex;gap:4px">
        <span style="font-size:10px;color:var(--text3);align-self:center;margin-right:2px">I</span>
        <button class="ot-btn" style="font-size:9px;padding:3px 6px" onclick="toggleOT(this,'pos')">↑ Hiper</button>
        <button class="ot-btn" style="font-size:9px;padding:3px 6px" onclick="toggleOT(this,'neg')">= Normal</button>
        <button class="ot-btn" style="font-size:9px;padding:3px 6px" onclick="toggleOT(this,'absent')">↓ Hipo</button>
      </div>
    </div>
  `).join('');
}

function buildNDI() {
  const c = document.getElementById('ndi-fields'); if(!c || c.innerHTML) return;
  cxNdiVals = new Array(10).fill(null);
  c.innerHTML = NDI_ITEMS.map((item, i) => `
    <div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border)">
      <div style="font-size:11px;font-weight:600;margin-bottom:6px">${i+1}. ${item}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        ${[0,1,2,3,4,5].map(v => `<button class="ot-btn" style="font-size:10px;padding:3px 8px" onclick="selectNDI(this,${i},${v})">${v}</button>`).join('')}
      </div>
    </div>
  `).join('');
}

function selectNDI(btn, idx, val) {
  const siblings = btn.parentElement.querySelectorAll('.ot-btn');
  siblings.forEach(b => b.classList.remove('btn-neon'));
  btn.classList.add('btn-neon');
  cxNdiVals[idx] = val;
  calcNDI();
}

function calcNDI() {
  const filled = cxNdiVals.filter(v => v !== null);
  const totalEl = document.getElementById('ndi-total');
  const interpEl = document.getElementById('ndi-interp');
  if(filled.length < 10) {
    if(totalEl) { totalEl.textContent = `${filled.length}/10`; totalEl.style.color='var(--text3)'; }
    return;
  }
  const score = cxNdiVals.reduce((a,b) => a+b, 0);
  const pct = score * 2;
  if(totalEl) {
    totalEl.textContent = score;
    totalEl.style.color = score <= 4 ? 'var(--neon)' : score <= 14 ? 'var(--amber)' : 'var(--red)';
  }
  if(interpEl) {
    const cat = score <= 4 ? 'Sin discapacidad (0–8%)' : score <= 14 ? 'Discapacidad leve (10–28%)' : score <= 24 ? 'Discapacidad moderada (30–48%)' : score <= 34 ? 'Discapacidad severa (50–64%)' : 'Discapacidad completa (>64%)';
    interpEl.textContent = `${cat} · ${pct}% · MCID ≥7.5 pts de mejora`;
  }
}

function buildCXPSFS() {
  const c = document.getElementById('cx-psfs-fields'); if(!c || c.innerHTML) return;
  cxPsfsVals = [null, null, null];
  c.innerHTML = [1,2,3].map(n => `
    <div class="ig mb-8">
      <label class="il">Actividad ${n}</label>
      <input class="inp" type="text" id="cx-psfs-act-${n}" placeholder="Ej: Mirar al costado al manejar..." style="margin-bottom:6px">
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        ${[0,1,2,3,4,5,6,7,8,9,10].map(v => `<button class="ot-btn" style="font-size:10px;padding:2px 6px" onclick="selectCXPSFS(this,${n-1},${v})">${v}</button>`).join('')}
      </div>
    </div>
  `).join('');
}

function selectCXPSFS(btn, idx, val) {
  const siblings = btn.parentElement.querySelectorAll('.ot-btn');
  siblings.forEach(b => b.classList.remove('btn-neon'));
  btn.classList.add('btn-neon');
  cxPsfsVals[idx] = val;
  const filled = cxPsfsVals.filter(v => v !== null);
  const el = document.getElementById('cx-psfs-result'); if(!el) return;
  if(!filled.length) { el.textContent='Promedio PSFS: —'; el.style.color='var(--text3)'; return; }
  const avg = (filled.reduce((a,b) => a+b, 0) / filled.length).toFixed(1);
  el.innerHTML = `<span style="color:${avg>=5?'var(--neon)':avg>=3?'var(--amber)':'var(--red)'}">Promedio PSFS: ${avg}/10</span> <span style="font-size:10px;color:var(--text3)">(${filled.length}/3 actividades · MCID ≥2 pts)</span>`;
}

function updateCXClasif(radio) {
  const hints = {
    npmd: '📋 NPMD — Déficit de Movilidad: manipulación/movilización cervical + ejercicios de ROM. ROM limitado, dolor local. Buena respuesta a tto manual.',
    npmci: '⚡ NPMCI — Coordinación/WAD: CCFT + entrenamiento estabilizadores profundos. Sensibilización central posible. Evitar manipulación en WAD agudo.',
    npha: '🧠 NPHA — Cefalea Cervicogénica: movilización/manipulación C1-C2 + CFRT para seguimiento. CFRT+ confirma. Distinguir de migraña (sin aura ni autonomía).',
    nprp: '⚠️ NPRP — Radiculopatía: tracción cervical + ejercicios + educación. Derivar si déficit motor progresivo. Cluster Spurling+Distracción+ULNT1 confirma.'
  };
  const el = document.getElementById('cx-clasif-hint'); if(!el) return;
  el.textContent = hints[radio.value] || '';
  el.style.display = 'block';
}

function checkCXRedFlags() {
  const cbs = document.querySelectorAll('.cx-redflag');
  const any = [...cbs].some(c => c.checked);
  const el = document.getElementById('cx-redflag-alert'); if(el) el.style.display = any ? 'block' : 'none';
}

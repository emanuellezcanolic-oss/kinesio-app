// ── GLOBALS (compartidos entre módulos) ──
// cur, atletas, kineState, etc. se definen en app.js
// Este archivo asume que app.js ya fue cargado

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
  buildOrthoPanel('tp-subacro',           ORTHO_TESTS.subacro);
  buildOrthoPanel('tp-manguito',          ORTHO_TESTS.manguito);
  buildOrthoPanel('tp-biceps',            ORTHO_TESTS.biceps);
  buildOrthoPanel('tp-ligamentos',        ORTHO_TESTS.ligamentos);
  buildOrthoPanel('tp-meniscos',          ORTHO_TESTS.meniscos);
  buildOrthoPanel('tp-funcionales',       ORTHO_TESTS.funcionales);
  buildOrthoPanel('tp-tobillo',           ORTHO_TESTS.tobillo);
  buildOrthoPanel('tp-lumbar',            ORTHO_TESTS.lumbar);
  buildOrthoPanel('tp-cadera',            ORTHO_TESTS.cadera);
  buildOrthoPanel('tp-doha-aductores',    ORTHO_TESTS.dohaAductores);
  buildOrthoPanel('tp-doha-psoas',        ORTHO_TESTS.dohaPsoas);
  buildOrthoPanel('tp-doha-inguinal',     ORTHO_TESTS.dohaInguinal);
  buildOrthoPanel('tp-doha-complementarios', ORTHO_TESTS.dohaComplementarios);
  buildOrthoPanel('tp-cervical-neural',   ORTHO_TESTS.cervicalNeural);
  buildOrthoPanel('tp-cervical-articular',ORTHO_TESTS.cervicalArticular);
  buildOrthoPanel('tp-cervical-muscular', ORTHO_TESTS.cervicalMuscular);
  buildOrthoPanel('tp-codo-lateral',      ORTHO_TESTS.codoLateral);
  buildOrthoPanel('tp-codo-medial',       ORTHO_TESTS.codoMedial);
  buildOrthoPanel('tp-codo-ligamentos',   ORTHO_TESTS.codoLigamentos);
  buildOrthoPanel('tp-patelo',            ORTHO_TESTS.patelo);
  buildOrthoPanel('tp-tendones-rodilla',  ORTHO_TESTS.tendonesRodilla);
  buildOrthoPanel('tp-pie',               ORTHO_TESTS.pie);
  buildOrthoPanel('tp-muneca',            ORTHO_TESTS.muneca);
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
  const allTests=[...ORTHO_TESTS.subacro,...ORTHO_TESTS.manguito,...ORTHO_TESTS.biceps,...ORTHO_TESTS.ligamentos,...ORTHO_TESTS.meniscos,...ORTHO_TESTS.funcionales,...ORTHO_TESTS.tobillo,...ORTHO_TESTS.lumbar,...ORTHO_TESTS.cadera,...ORTHO_TESTS.dohaAductores,...ORTHO_TESTS.dohaPsoas,...ORTHO_TESTS.dohaInguinal,...ORTHO_TESTS.dohaComplementarios,...ORTHO_TESTS.cervicalNeural,...ORTHO_TESTS.cervicalArticular,...ORTHO_TESTS.cervicalMuscular,...ORTHO_TESTS.codoLateral,...ORTHO_TESTS.codoMedial,...ORTHO_TESTS.codoLigamentos,...ORTHO_TESTS.patelo,...ORTHO_TESTS.tendonesRodilla,...ORTHO_TESTS.pie,...ORTHO_TESTS.muneca];
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
  // Map panel names to clinical sheets
  const SHEET_MAP = {
    'hombro': 'sheet-hombro',
    'rodilla': 'sheet-rodilla',
    'tobillo': 'sheet-tobillo',
    'lumbar': 'sheet-lbp',
    'lumbar-post': 'sheet-lbp',
    'dorsal': 'sheet-lbp',
    'cervical': 'sheet-cervical',
    'cadera': 'sheet-rodilla',
    'gluteo': 'sheet-rodilla',
    'ingle': 'sheet-groin',
    'pantorrilla': 'sheet-tobillo',
    'pie': 'sheet-tobillo',
    'codo': 'sheet-codo',
    'munieca': 'sheet-hombro'
  };
  const sheetId = SHEET_MAP[panel];
  if(sheetId){
    openModal(sheetId);
    // Reinit sheet content
    initKlinicalSheet(panel);
    return;
  }
  // Fallback to old behavior
  document.querySelectorAll('.kine-panel').forEach(p=>p.classList.add('hidden'));
  const el=document.getElementById('tests-panel-'+panel);
  if(el){el.classList.remove('hidden');document.getElementById('kine-zona-label')&&(document.getElementById('kine-zona-label').textContent=label+' -- Tests activos');el.scrollIntoView({behavior:'smooth',block:'start'});}
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
  const allTests=[...ORTHO_TESTS.subacro,...ORTHO_TESTS.manguito,...ORTHO_TESTS.biceps,...ORTHO_TESTS.ligamentos,...ORTHO_TESTS.meniscos,...ORTHO_TESTS.funcionales,...ORTHO_TESTS.tobillo,...ORTHO_TESTS.lumbar,...ORTHO_TESTS.cadera,...ORTHO_TESTS.dohaAductores,...ORTHO_TESTS.dohaPsoas,...ORTHO_TESTS.dohaInguinal,...ORTHO_TESTS.dohaComplementarios,...ORTHO_TESTS.cervicalNeural,...ORTHO_TESTS.cervicalArticular,...ORTHO_TESTS.cervicalMuscular,...ORTHO_TESTS.codoLateral,...ORTHO_TESTS.codoMedial,...ORTHO_TESTS.codoLigamentos,...ORTHO_TESTS.patelo,...ORTHO_TESTS.tendonesRodilla,...ORTHO_TESTS.pie,...ORTHO_TESTS.muneca];
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

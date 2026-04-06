// ══════════════════════════════════════════════════════════════
//  MoveMetrics v12 -- JavaScript completo (CORREGIDO)
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

// Exponer funciones de API key globalmente
window.saveApiKey = saveApiKey;
window.clearApiKey = clearApiKey;

function showApiKeyModal() {
  const existing = getApiKey();
  const modal = document.createElement('div');
  modal.id = 'api-key-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)';
  modal.innerHTML = `
    <div style="background:#0f0f0f;border:1px solid rgba(57,255,122,.25);border-radius:16px;padding:32px 28px;width:100%;max-width:420px;margin:16px">
      <div style="font-family:"JetBrains Mono",monospace;font-size:11px;color:#39FF7A;letter-spacing:.12em;margin-bottom:8px;text-transform:uppercase">∧ MoveMetrics</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:6px;color:#f0f0f0">API Key de Groq</div>
      <div style="font-size:13px;color:#888;margin-bottom:20px;line-height:1.6">
        Ingresá tu API Key para generar informes con IA.<br>
        Se guarda <b style="color:#f0f0f0">solo en tu navegador</b> -- nunca se sube a ningún servidor.
      </div>
      <input id="api-key-input" type="password"
        placeholder="gsk_..."
        value="${existing}"
        style="width:100%;background:#141414;border:1px solid rgba(57,255,122,.2);border-radius:8px;color:#f0f0f0;padding:10px 14px;font-size:13px;font-family:"JetBrains Mono",monospace;outline:none;margin-bottom:8px;box-sizing:border-box"
      >
      <div style="font-size:11px;color:#3a3a3a;margin-bottom:16px;font-family:"JetBrains Mono",monospace">
        Obtené tu key gratis en console.groq.com → API Keys
      </div>
      <div style="display:flex;gap:10px">
        <button id="api-key-save-btn" style="flex:1;background:#39FF7A;color:#000;border:none;border-radius:8px;padding:11px;font-weight:700;font-size:13px;cursor:pointer">
          Guardar y continuar
        </button>
        ${existing ? `<button id="api-key-cancel-btn" style="background:#1c1c1c;color:#888;border:1px solid #252525;border-radius:8px;padding:11px 16px;font-size:13px;cursor:pointer">Cancelar</button>` : ''}
      </div>
      ${existing ? `<div style="text-align:center;margin-top:12px"><button id="api-key-clear-btn" style="background:none;border:none;color:#3a3a3a;font-size:11px;cursor:pointer;text-decoration:underline">Borrar key guardada</button></div>` : ''}
    </div>`;
  document.body.appendChild(modal);
  
  // Bind eventos después de agregar al DOM
  const saveBtn = document.getElementById('api-key-save-btn');
  if (saveBtn) {
    saveBtn.onclick = function() {
      const k = document.getElementById('api-key-input').value.trim();
      if (!k) { alert('Ingresá una API Key'); return; }
      saveApiKey(k);
      document.getElementById('api-key-modal').remove();
      showSaveToast();
    };
  }
  const cancelBtn = document.getElementById('api-key-cancel-btn');
  if (cancelBtn) {
    cancelBtn.onclick = function() {
      document.getElementById('api-key-modal').remove();
    };
  }
  const clearBtn = document.getElementById('api-key-clear-btn');
  if (clearBtn) {
    clearBtn.onclick = function() {
      clearApiKey();
      const inp = document.getElementById('api-key-input');
      if (inp) inp.value = '';
    };
  }
  
  setTimeout(() => document.getElementById('api-key-input')?.focus(), 100);
}

// Exponer showApiKeyModal globalmente
window.showApiKeyModal = showApiKeyModal;

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

// ── BATERIA COMPLETA BOSCO ──
const SALTOS_DEF = [
  // Verticales bilaterales
  { key:'sj',   label:'SJ',             icon:'', unit:'cm', type:'bilateral',  cat:'vertical',   desc:'Squat Jump -- fuerza explosiva pura' },
  { key:'cmj',  label:'CMJ',            icon:'', unit:'cm', type:'bilateral',  cat:'vertical',   desc:'Countermovement Jump -- fuerza elastico-explosiva' },
  { key:'abk',  label:'Abalakov',       icon:'', unit:'cm', type:'bilateral',  cat:'vertical',   desc:'CMJ con brazos -- coordin. neuromotora' },
  { key:'dj',   label:'Drop Jump',      icon:'', unit:'cm', type:'bilateral',  cat:'vertical',   desc:'DJ 20-40cm -- fuerza reflejo-elastico-explosiva', hasRSI:true },
  { key:'ms15', label:'Multi-salto 15s',icon:'', unit:'W/kg',type:'bilateral', cat:'vertical',   desc:'Potencia anaerob. alactica -- 15 segundos' },
  // Horizontales unilaterales
  { key:'bj',   label:'Broad Jump',     icon:'', unit:'cm', type:'bilateral',  cat:'horizontal', desc:'Salto horizontal bilateral' },
  { key:'sh',   label:'Single Hop',     icon:'', unit:'cm', type:'unilateral', cat:'horizontal', desc:'Hop for distance -- LSI' },
  { key:'3h',   label:'Triple Hop',     icon:'', unit:'cm', type:'unilateral', cat:'horizontal', desc:'Triple Hop for distance -- LSI' },
  { key:'ch',   label:'Cross-over Hop', icon:'', unit:'cm', type:'unilateral', cat:'horizontal', desc:'Cross-over 3 saltos -- LSI' },
  { key:'t6h',  label:'Timed 6m Hop',   icon:'', unit:'s',  type:'unilateral', cat:'horizontal', desc:'6 metros -- tiempo -- LSI', lowerIsBetter:true },
  { key:'djb',  label:'DJ Unilateral',  icon:'', unit:'cm', type:'unilateral', cat:'vertical',   desc:'Drop Jump unilateral -- LSI + RSI', hasRSI:true },
  { key:'sideh',label:'Side Hop',       icon:'', unit:'reps',type:'unilateral',cat:'horizontal', desc:'Saltos laterales 30s -- Gustavsson' }
];

// Normas Bosco (Garrido-Chamorro, EFDeportes 2004, N=765 deportistas alto nivel)
const BOSCO_NORMS = {
  sj:  { male:{ mean:34.49, sd:5.13 }, female:{ mean:26.31, sd:4.47 } },
  cmj: { male:{ mean:39.23, sd:5.58 }, female:{ mean:29.47, sd:10.86 } },
  abk: { male:{ mean:47.20, sd:10.23 }, female:{ mean:33.49, sd:5.30 } },
  ms15:{ male:{ mean:38.18, sd:15.43 }, female:{ mean:32.61, sd:11.57 } }
};

// Normas Side Hop -- Gustavsson et al. (2006)
const SIDEHOP_NORMS = { male:{ min:55 }, female:{ min:41 } };

// Normas Hop Tests -- LSI return to sport (Limb Symmetry Index)
// Referencia: Noyes et al. 1991, Moksnes & Risberg 2009, Reid et al. 2007
const HOP_NORMS = {
  sh:  {
    lsi_rts: 90,   // % LSI minimo para retorno al deporte
    lsi_elite: 95, // % LSI atletas elite
    // Valores absolutos referencia (cm) -- adultos activos
    male:   { mean: 165, sd: 20 },
    female: { mean: 135, sd: 18 }
  },
  '3h': {
    lsi_rts: 90,
    lsi_elite: 95,
    male:   { mean: 490, sd: 55 },
    female: { mean: 400, sd: 48 }
  },
  ch: {
    lsi_rts: 90,
    lsi_elite: 95,
    male:   { mean: 480, sd: 52 },
    female: { mean: 385, sd: 45 }
  },
  t6h: {
    lsi_rts: 90,
    lsi_elite: 95,
    lowerIsBetter: true,
    // Menor tiempo = mejor -- LSI se calcula al reves
    male:   { mean: 2.1, sd: 0.3 },  // segundos
    female: { mean: 2.4, sd: 0.3 }
  },
  djb: {
    lsi_rts: 90,
    lsi_elite: 95,
    male:   { mean: 28, sd: 6 },
    female: { mean: 22, sd: 5 }
  }
};

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
  ],
  dohaAductores: [
    { id:'doha-squeeze-0',    name:'Squeeze test 0 deg',         sub:'Aductores -- ingle atletica',         ref:'Sn 0.78 / Sp 0.50 -- cadera 0 grados' },
    { id:'doha-squeeze-45',   name:'Squeeze test 45 deg',        sub:'Aductores -- mas especifico',         ref:'Sn 0.56 / Sp 0.73 -- cadera 45 grados' },
    { id:'doha-squeeze-90',   name:'Squeeze test 90 deg',        sub:'Aductores / gracilis',                ref:'Complementario -- 90 grados rodilla' },
    { id:'doha-aduct-dolor',  name:'Palpacion aductor largo',    sub:'Proximal -- Criterio Doha obligatorio',ref:'Sn 0.90 -- punto de mayor dolor' },
    { id:'doha-aduct-resist', name:'Resistencia aductores',      sub:'Contraccion isometrica 0-45 deg',     ref:'Criterio Doha -- dolor reproducible' },
    { id:'doha-aduct-estir',  name:'Estiramiento aductor',       sub:'Abduccion pasiva maxima',             ref:'Criterio complementario Doha' }
  ],
  dohaPsoas: [
    { id:'doha-psoas-dolor',  name:'Palpacion iliopsoas',        sub:'Tendon distal / vientre -- Doha',     ref:'Criterio obligatorio ingle anterior' },
    { id:'doha-psoas-resist', name:'Resistencia flexion cadera', sub:'Isometrica supino 90 deg -- Doha',    ref:'Dolor reproducible = positivo Doha' },
    { id:'doha-psoas-estir',  name:'Estiramiento psoas',         sub:'Thomas modificado -- extension pasiva',ref:'Criterio complementario Doha' },
    { id:'doha-stork',        name:'Stork test (Flamingo)',      sub:'SIJ / Psoas bajo carga',              ref:'Sn 0.17 / Sp 0.79 -- SIJ loading' },
    { id:'doha-flex-activa',  name:'Flexion activa cadera',      sub:'Hip flexion pain provocation',        ref:'Criterio Doha -- ingle anterior' }
  ],
  dohaInguinal: [
    { id:'doha-ing-dolor',    name:'Palpacion canal inguinal',   sub:'Anillo inguinal superficial -- Doha', ref:'Criterio obligatorio hernia deportiva' },
    { id:'doha-ing-resist',   name:'Resistencia abd + flex',     sub:'Contraccion combinada -- Doha',       ref:'Criterio Doha inguinal' },
    { id:'doha-valsalva',     name:'Valsalva / tos provocada',   sub:'Aumento presion intraabdominal',      ref:'Hernia inguinal / deportiva' },
    { id:'doha-gibbon',       name:'Gibbon (inguinal sling)',     sub:'Canal inguinal bajo carga',           ref:'Sn 0.99 / Sp 0.99 -- hernia deportiva' }
  ],
  dohaComplementarios: [
    { id:'doha-pubis',        name:'Palpacion pubis',            sub:'Symphysis pubis -- osteitis pubis',   ref:'Criterio complementario Doha' },
    { id:'doha-rectus',       name:'Palpacion recto abdominal',  sub:'Insercion pubica -- Doha',            ref:'Criterio complementario abdomen bajo' },
    { id:'doha-cadera-rom',   name:'Dolor ROM cadera activo',    sub:'RI / RE bajo carga -- FAI asociado',  ref:'Descartar FAI concomitante' },
    { id:'doha-posterior',    name:'Dolor posterior cadera',     sub:'Gluteo / isquion -- diferencial',     ref:'Descartar tendinopatia isquiosural' }
  ],
  cervicalNeural: [
    { id:'spurling',          name:'Spurling',                   sub:'Compresion raiz nerviosa cervical',   ref:'Sn 0.50 / Sp 0.86 -- LR+ 3.5' },
    { id:'distraccion-cx',    name:'Distraccion cervical',       sub:'Alivio = compresion discal / facet',  ref:'Sn 0.44 / Sp 0.90 -- complementa Spurling' },
    { id:'valsalva-cx',       name:'Valsalva cervical',          sub:'Hernia discal / lesion ocupante',     ref:'Aumento presion intradiscal' },
    { id:'ultt1',             name:'ULTT1 (brachial tension)',   sub:'Tension neural miembro superior',     ref:'Sn 0.97 / Sp 0.22 -- descartar compresion' },
    { id:'ultt2',             name:'ULTT2 (mediano / radial)',   sub:'Tension nervio mediano / radial',     ref:'Diferencia > 10 deg = positivo' },
    { id:'roos',              name:'Roos (EAST)',                 sub:'Desfiladero toracico',                ref:'3 min -- parestesias = positivo' }
  ],
  cervicalArticular: [
    { id:'flexion-rot',       name:'Flexion-Rotation test',      sub:'C1-C2 -- cervicogenico',              ref:'Sn 0.91 / Sp 0.90 -- cefalea cervicogenica' },
    { id:'alar-lig',          name:'Alar ligament test',         sub:'Estabilidad alar -- trauma',          ref:'Sn 0.27 / Sp 0.64 -- post whiplash' },
    { id:'sharp-purser',      name:'Sharp-Purser',                sub:'Inestabilidad C0-C2',                 ref:'Sn 0.69 / Sp 0.96 -- AR / trauma' },
    { id:'ppivm-cx',          name:'PPIVM cervical',              sub:'Movilidad intervertebral pasiva',     ref:'Hipomovil / hipermovil por segmento' }
  ],
  cervicalMuscular: [
    { id:'deep-flex-cx',      name:'Deep Neck Flexor test',      sub:'Resistencia flexores profundos',      ref:'< 38 mmHg = deficit -- Stabilizer' },
    { id:'cranio-cx',         name:'Craniocervical flexion test', sub:'Longus colli activation',             ref:'5 niveles: 10-22-26-30 mmHg' },
    { id:'fuerza-cx-lat',     name:'Fuerza lateral cervical',    sub:'HHD o escala manual',                 ref:'Asimetria > 10% = significativa' }
  ],
  codoLateral: [
    { id:'cozen',             name:'Cozen',                      sub:'Epicondilalgia lateral',              ref:'Sn 0.84 / Sp 0.75 -- extension muneca resist.' },
    { id:'mill',              name:'Mill',                       sub:'Epicondilalgia lateral',              ref:'Sn 0.53 / Sp 0.69 -- estiramiento extensores' },
    { id:'maudsley',          name:'Maudsley (dedo medio)',      sub:'ECRB -- epicondilo lateral',          ref:'Extension dedo medio con resistencia' },
    { id:'chair-test',        name:'Chair lifting test',         sub:'Epicondilalgia lateral funcional',    ref:'Dolor al levantar silla con carga' }
  ],
  codoMedial: [
    { id:'golfer-elbow',      name:'Golfer elbow test',          sub:'Epicondilalgia medial',               ref:'Sn 0.64 / Sp 0.69 -- flexion muneca resist.' },
    { id:'valgus-codo',       name:'Stress valgo codo',          sub:'LCU (cubital colateral)',             ref:'Valgus en 20-30 deg flexion -- lanzadores' },
    { id:'milking',           name:'Milking maneuver',            sub:'LCU -- atletas overhead',             ref:'Sn 0.76 -- lanzadores / overhead' }
  ],
  codoLigamentos: [
    { id:'tinel-cubital',     name:'Tinel cubital tunnel',       sub:'Nervio cubital',                      ref:'Parestesias 4-5 dedo = positivo' },
    { id:'elbow-flex-test',   name:'Elbow flexion test',         sub:'Nervio cubital -- compresion',        ref:'Sn 0.75 / Sp 0.99 -- flexion max 3 min' },
    { id:'lateral-pivot-codo',name:'Lateral pivot shift codo',   sub:'LUCL -- inestabilidad lateral',       ref:'Sn 0.38 / Sp 1.0' }
  ],
  patelo: [
    { id:'clarke',            name:'Clarke (Grind test)',        sub:'Articulacion patelofemoral',          ref:'Baja especificidad -- usar en contexto' },
    { id:'zohlen',            name:'Zohlen test',                sub:'Compresion patelar activa',           ref:'Dolor al contraer cuad con compresion' },
    { id:'patela-tilt',       name:'Patellar tilt test',         sub:'Retinaculopatia lateral',             ref:'< 0 deg tilt = tension retinacular' },
    { id:'jsign',             name:'J-sign (patellar glide)',    sub:'Tracking patelar -- VMO',             ref:'J-sign = disfuncion VMO / PFPS' },
    { id:'apprehension-pat',  name:'Patella apprehension',       sub:'Inestabilidad / luxacion patelar',    ref:'Sn 0.39 / Sp 0.93 -- luxacion recurrente' }
  ],
  tendonesRodilla: [
    { id:'single-decline',    name:'Single Leg Decline Squat',   sub:'Carga excentrica tendon patelar',    ref:'Gold standard funcional tendinopatia' },
    { id:'royal-london',      name:'Royal London Hop test',       sub:'Tendinopatia patelar funcional',     ref:'VAS > 3/10 = positivo' },
    { id:'arc-patelar',       name:'Arc test patelar',            sub:'Tendinopatia -- palpacion en ext.',  ref:'Sn 0.78 -- extension completa' },
    { id:'quad-tendon',       name:'Tendon cuadricipital',        sub:'Insercion proximal patelar',         ref:'Polo superior -- adultos > 40' }
  ],
  pie: [
    { id:'thompson-aq',       name:'Thompson (Aquiles)',          sub:'Ruptura tendon de Aquiles',          ref:'Sn 0.96 / Sp 0.93 -- squeeze pantorrilla' },
    { id:'arc-aquiles',       name:'Arc sign Aquiles',            sub:'Insercion vs midportion',            ref:'Desaparece en dorsiflexion = insercion' },
    { id:'windlass',          name:'Windlass test',               sub:'Fascia plantar',                     ref:'Sn 0.32 / Sp 1.0 -- fasciitis plantar' },
    { id:'too-many-toes',     name:'Too many toes sign',          sub:'PTTD -- tibial posterior',           ref:'Valgo pie / colapso arco medial' },
    { id:'single-heel-rise',  name:'Single heel rise',            sub:'Tibial posterior / Aquiles fuerza',  ref:'< 25 reps o asimetria = deficit' },
    { id:'mulder',            name:'Mulder click (Morton)',       sub:'Neuroma de Morton',                  ref:'Click + dolor = neuroma interdigital' }
  ],
  muneca: [
    { id:'finkelstein',       name:'Finkelstein',                 sub:'De Quervain -- 1er compartimento',   ref:'Sn 0.89 / Sp 0.14 -- muy sensible' },
    { id:'phalen',            name:'Phalen',                      sub:'Tunel carpiano -- mediano',          ref:'Sn 0.68 / Sp 0.73 -- 60 seg flexion max' },
    { id:'tinel-carpo',       name:'Tinel carpo',                 sub:'Nervio mediano -- tunel carpiano',   ref:'Sn 0.50 / Sp 0.77 -- percusion' },
    { id:'durkan',            name:'Durkan (compresion directa)', sub:'Tunel carpiano -- mas especifico',   ref:'Sn 0.87 / Sp 0.90' },
    { id:'tfcc-grind',        name:'TFCC grind test',             sub:'Complejo triangular fibrocartilago', ref:'Dolor ulnar en rotacion + carga' },
    { id:'watson',            name:'Watson (scaphoid shift)',      sub:'Inestabilidad escafoides / SL',      ref:'Sn 0.69 / Sp 0.64 -- clunk = positivo' }
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

// Exponer showPage globalmente
window.showPage = showPage;

function showProfileTab(tab, btn) {
  const tabs = ['dashboard','kinesio','fuerza','saltos','movilidad','velocidad','fms','fatiga','video','vmp','historial'];
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

// Exponer showProfileTab globalmente
window.showProfileTab = showProfileTab;

function openModal(id)  { document.getElementById(id).classList.add('open');    document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }

// Exponer funciones de modal globalmente
window.openModal = openModal;
window.closeModal = closeModal;

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

// Exponer funciones de persistencia globalmente
window.saveData = saveData;
window.showSaveToast = showSaveToast;

// ══════════════════════════════════════════════════════
//  ATLETAS CRUD
// ══════════════════════════════════════════════════════

function setSvc(v) {
  document.getElementById('s-servicio').value = v;
  document.getElementById('svc-rend').className = 'btn btn-full ' + (v === 'rendimiento' ? 'btn-neon' : 'btn-ghost');
  document.getElementById('svc-kine').className = 'btn btn-full ' + (v === 'kinesio'     ? 'btn-neon' : 'btn-ghost');
}

// Exponer setSvc globalmente
window.setSvc = setSvc;

function checkRugby() {
  const d = document.getElementById('s-deporte').value;
  document.getElementById('rugby-sec').classList.toggle('hidden', d !== 'Rugby');
}

window.checkRugby = checkRugby;

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

window.previewFormPhoto = previewFormPhoto;

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

window.updateProfilePhoto = updateProfilePhoto;

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

window.prepNewAtleta = prepNewAtleta;

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

window.editAtletaById = editAtletaById;

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

window.saveAtleta = saveAtleta;

function deleteAtleta(id, ev) {
  ev?.stopPropagation();
  if (!confirm('¿Eliminar este atleta y todos sus datos?')) return;
  atletas = atletas.filter(a => a.id !== id);
  if (cur?.id === id) { cur = null; showPage('atletas'); }
  saveData(); renderAtletas();
}

window.deleteAtleta = deleteAtleta;

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

window.selectAtleta = selectAtleta;

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

window.renderAtletas = renderAtletas;

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

window.filterAtletas = filterAtletas;

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

window.renderProfileHero = renderProfileHero;

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

window.renderDashboard = renderDashboard;

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

window.renderHistorial = renderHistorial;

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

window.addFVRow = addFVRow;

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

window.onFvEjChange = onFvEjChange;

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
    return `<td><td class="mono-cell">${p}%</td><td class="mono-cell">${load?load.toFixed(1):'--'}</td><td class="mono-cell" style="color:${ok?'var(--neon)':'var(--text3)'}">${ok?vmp.toFixed(3):'--'}</td></tr>`;
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

window.calcFV = calcFV;

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

window.renderFVHist = renderFVHist;

// ══════════════════════════════════════════════════════
//  SALTOS
// ══════════════════════════════════════════════════════

// ── BOSCO CALCULATIONS ──
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

window.calcMultiSalto15 = calcMultiSalto15;

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

window.buildSaltosGrid = buildSaltosGrid;

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

window.calcSalto = calcSalto;

function calcImpulso() {
  const avg = parseFloat(document.getElementById('bj-avg')?.dataset.val) || 0;
  const pc = +document.getElementById('bj-pc')?.value || 0;
  const el = document.getElementById('bj-imp');
  if (el && avg && pc) el.textContent = ((avg/100)*pc).toFixed(2);
}

window.calcImpulso = calcImpulso;

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

window.calcSimetriaHop = calcSimetriaHop;

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

window.renderSimetriasTabla = renderSimetriasTabla;

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

window.calcSideHop = calcSideHop;

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

window.saveSaltos = saveSaltos;

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

window.onMov = onMov;

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

window.redrawGauges = redrawGauges;

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

window.saveMov = saveMov;

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

window.calcSprintBench = calcSprintBench;

function saveSprint(){
  if(!cur)return;
  const evalIdx=document.getElementById('sprint-eval-num').value;
  const fecha=document.getElementById('sprint-fecha').value||new Date().toISOString().split('T')[0];
  if(!cur.evals)cur.evals={};
  cur.evals['sprint_'+evalIdx]={sp10:+document.getElementById('sp-10').value||null,sp20:+document.getElementById('sp-20').value||null,sp30:+document.getElementById('sp-30').value||null,vmax:+document.getElementById('sp-vmax').value||null,ttest:+document.getElementById('sp-ttest').value||null,d505:+document.getElementById('sp-505d').value||null,i505:+document.getElementById('sp-505i').value||null,fecha};
  atletas=atletas.map(a=>a.id===cur.id?cur:a);saveData();
}

window.saveSprint = saveSprint;

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

window.loadSlot = loadSlot;

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

window.setFMS = setFMS;

function calcValgo(){
  const d=+document.getElementById('valgo-d')?.value||0,i=+document.getElementById('valgo-i')?.value||0;
  const el=document.getElementById('valgo-result');if(!el)return;
  const parts=[];
  if(d)parts.push(`D: <b style="color:${d>10?'var(--red)':'var(--neon)'}">${d}°</b> ${d>10?'⚠️ >10°':''}`);
  if(i)parts.push(`I: <b style="color:${i>10?'var(--red)':'var(--neon)'}">${i}°</b> ${i>10?'⚠️ >10°':''}`);
  el.innerHTML=`<div style="font-size:12px;margin-top:8px">${parts.join(' · ')}</div>`;
}

window.calcValgo = calcValgo;

function saveFMS(){
  if(!cur)return;
  const ohsCriterios=[...document.getElementById('ohs-checks')?.querySelectorAll('.fms-btn.yes,.fms-btn.no')||[]].map(b=>b.classList.contains('yes')?'si':'no');
  const sdCriterios=[...document.getElementById('sd-checks')?.querySelectorAll('.fms-btn.yes,.fms-btn.no')||[]].map(b=>b.classList.contains('yes')?'si':'no');
  const fecha=new Date().toISOString().split('T')[0];
  if(!cur.evals)cur.evals={};
  cur.evals['fms_'+fecha]={fecha,ohs:{criterios:ohsCriterios,obs:document.getElementById('ohs-obs')?.value},sd:{criterios:sdCriterios,valgoD:+document.getElementById('valgo-d')?.value||0,valgoI:+document.getElementById('valgo-i')?.value||0,obs:document.getElementById('sd-obs')?.value}};
  atletas=atletas.map(a=>a.id===cur.id?cur:a);saveData();
}

window.saveFMS = saveFMS;

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

window.buildHooperFields = buildHooperFields;

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

window.calcFatiga = calcFatiga;

function saveFatiga(){
  if(!cur){alert('Seleccioná un atleta');return;}
  const fecha=document.getElementById('fat-fecha').value||new Date().toISOString().split('T')[0];
  const hooper=['fat-h-sueno','fat-h-estres','fat-h-fatiga','fat-h-doms'].map(id=>+document.getElementById(id)?.value||4);
  if(!cur.evals)cur.evals={};
  cur.evals['fatiga_'+fecha]={hooper,hrv:+document.getElementById('fat-hrv')?.value||null,hrvBase:+document.getElementById('fat-hrv-base')?.value||null,fecha};
  atletas=atletas.map(a=>a.id===cur.id?cur:a);saveData();
}

window.saveFatiga = saveFatiga;

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

window.initKinesio = initKinesio;

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

window.setOrthoTest = setOrthoTest;

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
    'cervical': 'sheet-lbp',
    'cadera': 'sheet-rodilla',
    'gluteo': 'sheet-rodilla',
    'ingle': 'sheet-groin',
    'pantorrilla': 'sheet-tobillo',
    'pie': 'sheet-tobillo',
    'codo': 'sheet-hombro',
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

window.saveKinesio = saveKinesio;

// ══════════════════════════════════════════════════════
//  INFORME IA + PDF
// ══════════════════════════════════════════════════════

function openInformeIA(){
  if(!cur){alert('Seleccioná un atleta');return;}
  openModal('modal-informe');
  regenerarInforme();
}

window.openInformeIA = openInformeIA;

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
    positivos:Object.entries(s.kinesio.tests||{}).filter(([,v])=>v.result==='pos').map(([id])=>{const allT=[...ORTHO_TESTS.subacro,...ORTHO_TESTS.manguito,...ORTHO_TESTS.biceps,...ORTHO_TESTS.ligamentos,...ORTHO_TESTS.meniscos,...ORTHO_TESTS.funcionales,...ORTHO_TESTS.tobillo,...ORTHO_TESTS.lumbar,...ORTHO_TESTS.cadera,...ORTHO_TESTS.dohaAductores,...ORTHO_TESTS.dohaPsoas,...ORTHO_TESTS.dohaInguinal,...ORTHO_TESTS.dohaComplementarios,...ORTHO_TESTS.cervicalNeural,...ORTHO_TESTS.cervicalArticular,...ORTHO_TESTS.cervicalMuscular,...ORTHO_TESTS.codoLateral,...ORTHO_TESTS.codoMedial,...ORTHO_TESTS.codoLigamentos,...ORTHO_TESTS.patelo,...ORTHO_TESTS.tendonesRodilla,...ORTHO_TESTS.pie,...ORTHO_TESTS.muneca];return allT.find(x=>x.id===id)?.name||id;}).join(', ')||'--',
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

window.regenerarInforme = regenerarInforme;

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
    const allTests=[...ORTHO_TESTS.subacro,...ORTHO_TESTS.manguito,...ORTHO_TESTS.biceps,...ORTHO_TESTS.ligamentos,...ORTHO_TESTS.meniscos,...ORTHO_TESTS.funcionales,...ORTHO_TESTS.tobillo,...ORTHO_TESTS.lumbar,...ORTHO_TESTS.cadera,...ORTHO_TESTS.dohaAductores,...ORTHO_TESTS.dohaPsoas,...ORTHO_TESTS.dohaInguinal,...ORTHO_TESTS.dohaComplementarios,...ORTHO_TESTS.cervicalNeural,...ORTHO_TESTS.cervicalArticular,...ORTHO_TESTS.cervicalMuscular,...ORTHO_TESTS.codoLateral,...ORTHO_TESTS.codoMedial,...ORTHO_TESTS.codoLigamentos,...ORTHO_TESTS.patelo,...ORTHO_TESTS.tendonesRodilla,...ORTHO_TESTS.pie,...ORTHO_TESTS.muneca];
    if(posTests.length){ky+=6;doc.setFillColor(20,5,5);doc.roundedRect(14,ky,182,10+posTests.length*9,2,2,'F');doc.setDrawColor(255,68,68);doc.setLineWidth(0.3);doc.roundedRect(14,ky,182,10+posTests.length*9,2,2,'S');doc.setTextColor(255,68,68);doc.setFontSize(9);doc.setFont('courier','bold');doc.text('TESTS ORTOPÉDICOS POSITIVOS',18,ky+8);ky+=12;posTests.forEach(([id,v])=>{const t=allTests.find(x=>x.id===id);if(!t)return;doc.setFont('courier','bold');doc.setFontSize(8.5);doc.setTextColor(255,100,100);doc.text(`+ ${t.name}`,18,ky);doc.setFont('courier','normal');doc.setTextColor(150,150,150);const subt=` -- ${t.sub}${v.obs?' -- '+v.obs:''}`;doc.text(subt,18+doc.getTextWidth(`+ ${t.name}`),ky);ky+=7;});}
  }
  // Footer
  const total=doc.getNumberOfPages();
  for(let i=1;i<=total;i++){doc.setPage(i);doc.setFillColor(6,6,6);doc.rect(0,286,210,11,'F');doc.setDrawColor(57,255,122);doc.setLineWidth(0.2);doc.line(0,286,210,286);doc.setTextColor(50,50,50);doc.setFontSize(7);doc.setFont('courier','normal');doc.text(`MOVEMETRICS v12 · ${prof} · ${inst}`,14,292);doc.text(`${i} / ${total}`,196,292,{align:'right'});}
  doc.save(`MoveMetrics_${s.nombre.replace(/\s/g,'_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

window.exportarPDF = exportarPDF;

function exportAllData(){
  const blob=new Blob([JSON.stringify(atletas,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download='movemetrics_data_'+new Date().toISOString().split('T')[0]+'.json';a.click();URL.revokeObjectURL(url);
}

window.exportAllData = exportAllData;

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

window.onFpsChange = onFpsChange;

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

window.loadVideo = loadVideo;

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

window.handleVideoDrop = handleVideoDrop;

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

window.jumpFrames = jumpFrames;

function scrubVideo(val) {
  const video = document.getElementById('video-player');
  if (!video || !video.duration) return;
  video.currentTime = (val / 1000) * video.duration;
}

window.scrubVideo = scrubVideo;

function togglePlay() {
  const video = document.getElementById('video-player');
  const btn = document.getElementById('play-btn');
  if (!video) return;
  if (video.paused) { video.play(); btn.textContent = '⏸'; }
  else { video.pause(); btn.textContent = '▶'; }
}

window.togglePlay = togglePlay;

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

window.markTakeoff = markTakeoff;

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

window.markLanding = markLanding;

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

window.clearMarkers = clearMarkers;

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

window.saveVideoSalto = saveVideoSalto;

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

window.saveFuncTests = saveFuncTests;

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

window.iniciarGoniometro = iniciarGoniometro;

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

window.toggleCongelarGonio = toggleCongelarGonio;

function reiniciarGoniometro() {
  goniometroCongelado = false; anguloActual = 0; calibrado = false; anguloOffset = 0;
  document.getElementById('btn-congelar-gonio').textContent = 'Congelar';
  document.getElementById('btn-congelar-gonio').className = 'btn btn-outline btn-sm';
  document.getElementById('lectura-estado').textContent = 'En vivo';
  document.getElementById('goniometro-angulo').textContent = '0.0';
  document.getElementById('lectura-actual').textContent = '0.0deg';
  dibujarGoniometro(0); actualizarFlecha(0);
}

window.reiniciarGoniometro = reiniciarGoniometro;

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

window.confirmarGoniometro = confirmarGoniometro;

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

window.loadVMPVideo = loadVMPVideo;

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

window.vmpJump = vmpJump;

function vmpTogglePlay() {
  const video = document.getElementById('vmp-video');
  const btn   = document.getElementById('vmp-play-btn');
  if (!video) return;
  if (video.paused) { video.play(); btn.textContent = '⏸'; }
  else { video.pause(); btn.textContent = '▶'; }
}

window.vmpTogglePlay = vmpTogglePlay;

function vmpScrub(val) {
  const video = document.getElementById('vmp-video');
  if (!video || !video.duration) return;
  video.currentTime = (val / 1000) * video.duration;
}

window.vmpScrub = vmpScrub;

function onVmpConfig() {
  vmpState.ejercicio = document.getElementById('vmp-ejercicio')?.value || 'sentadilla';
  vmpState.carga     = parseFloat(document.getElementById('vmp-carga')?.value) || null;
  updateVMPRefTable();
}

window.onVmpConfig = onVmpConfig;

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

window.setVMPFase = setVMPFase;

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

window.iniciarCalibracion = iniciarCalibracion;

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

window.startVMPTracking = startVMPTracking;

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

window.stopVMPTracking = stopVMPTracking;

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

window.undoLastVMPPoint = undoLastVMPPoint;

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

window.clearVMPTracking = clearVMPTracking;

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
        '<td style="text-align:center;color:var(--text2)">' + pt.t.toFixed(3) + '</td>' +
        '</tr>';
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

window.saveVMPResult = saveVMPResult;

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

function abrirVideoJump(key, field) {
  vjState.targetKey  = key;
  vjState.targetField = field || (key + '-r1');
  vjState.takeoff = null;
  vjState.landing = null;
  // Reset UI
  const ids = ['vj-takeoff-disp','vj-landing-disp','vj-result-area'];
  ids.forEach(id => { const e = document.getElementById(id); if(e) e.innerHTML = ''; });
  const v = document.getElementById('vj-video');
  if (v) { v.src = ''; v.load(); }
  document.getElementById('vj-player-wrap').style.display = 'none';
  document.getElementById('vj-upload-area').style.display = 'block';
  document.getElementById('vj-btn-takeoff').style.background = '';
  document.getElementById('vj-btn-landing').style.background = '';
  document.getElementById('vj-modal-title').textContent = 'Video Salto -- ' + key.toUpperCase();
  openModal('modal-vj');
}

window.abrirVideoJump = abrirVideoJump;

function loadVJVideo(input) {
  if (!input.files.length) return;
  const url = URL.createObjectURL(input.files[0]);
  const v   = document.getElementById('vj-video');
  v.src = url; v.load();
  document.getElementById('vj-player-wrap').style.display = 'block';
  document.getElementById('vj-upload-area').style.display = 'none';
  v.addEventListener('loadedmetadata', () => {
    const fps = getVJFps();
    document.getElementById('vj-frame-tot').textContent = Math.floor(v.duration * fps);
    updateVJFrameInfo();
  });
  v.addEventListener('timeupdate', updateVJFrameInfo);
}

window.loadVJVideo = loadVJVideo;

function getVJFps() {
  // FPS de grabacion (real)
  return parseFloat(document.getElementById('vj-fps-grab')?.value || 240);
}

function getVJFpsRepro() {
  // FPS de reproduccion del video (normalmente 30)
  return parseFloat(document.getElementById('vj-fps-repro')?.value || 30);
}

function setVJMode(mode) {
  document.getElementById('vj-mode-auto').style.display     = mode === 'auto'     ? 'block' : 'none';
  document.getElementById('vj-mode-calibrar').style.display = mode === 'calibrar' ? 'block' : 'none';
  document.getElementById('vj-mode-btn-auto').style.background = mode === 'auto' ? 'rgba(57,255,122,.15)' : '';
  document.getElementById('vj-mode-btn-auto').style.borderColor = mode === 'auto' ? 'rgba(57,255,122,.3)' : '';
  document.getElementById('vj-mode-btn-auto').style.color = mode === 'auto' ? 'var(--neon)' : '';
  document.getElementById('vj-mode-btn-cal').style.background = mode === 'calibrar' ? 'rgba(255,176,32,.15)' : '';
  document.getElementById('vj-mode-btn-cal').style.borderColor = mode === 'calibrar' ? 'rgba(255,176,32,.3)' : '';
  document.getElementById('vj-mode-btn-cal').style.color = mode === 'calibrar' ? 'var(--amber)' : '';
  vjState.calMode = mode;
}

window.setVJMode = setVJMode;

function vjCalibrar() {
  const hReal  = parseFloat(document.getElementById('vj-cal-altura')?.value) || 0;
  const tVideo = parseFloat(document.getElementById('vj-cal-tvideo')?.value) || 0;
  const el     = document.getElementById('vj-cal-result');
  if (!el) return;
  if (!hReal || !tVideo) { el.textContent = 'Ingresa los valores para calibrar'; el.style.color = 'var(--text2)'; return; }
  // From h = g*t²/8 -> t_real = sqrt(8*h/g)
  const tReal  = Math.sqrt(8 * (hReal/100) / 9.81);
  const factor = tReal / (tVideo/1000);
  vjState.calFactor = factor;
  el.textContent = 'Factor calibrado: ' + factor.toFixed(4) + ' -- t_real = t_video x ' + factor.toFixed(4);
  el.style.color = 'var(--neon)';
}

window.vjCalibrar = vjCalibrar;

// Presets: { grab, repro, factor, label, tip }
const VJ_PRESETS = [
  { id:'n30',  grab:30,  repro:30,  factor:1.0,   label:'30 fps',        tip:'Video normal -- mas preciso' },
  { id:'n60',  grab:60,  repro:60,  factor:1.0,   label:'60 fps',        tip:'Video normal 60fps' },
  { id:'s120', grab:120, repro:30,  factor:0.25,  label:'Slow 120fps',   tip:'Slow mo 120fps -- reproduce a 30fps' },
  { id:'s240', grab:240, repro:30,  factor:0.125, label:'Slow 240fps',   tip:'iPhone Slo-Mo 240fps -- reproduce a 30fps' },
  { id:'s480', grab:480, repro:30,  factor:0.0625,label:'Slow 480fps',   tip:'Super slow mo 480fps' },
  { id:'s960', grab:960, repro:30,  factor:0.03125,label:'Slow 960fps',  tip:'Ultra slow mo 960fps' },
];

function setVJFps(presetId, btn) {
  const preset = VJ_PRESETS.find(p => p.id === presetId);
  if (!preset) return;
  vjState.fpsPreset = preset;
  document.querySelectorAll('#vj-fps-btns button').forEach(b => {
    b.className = 'btn btn-ghost btn-sm';
    b.style.fontSize = '10px';
  });
  if (btn) { btn.className = 'btn btn-neon btn-sm'; btn.style.fontSize = '10px'; }
  const tipEl = document.getElementById('vj-fps-tip');
  if (tipEl) {
    tipEl.textContent = preset.tip;
    tipEl.style.color = preset.factor === 1.0 ? 'var(--neon)' : 'var(--amber)';
  }
}

window.setVJFps = setVJFps;

function getVJFps() {
  return vjState.fpsPreset ? vjState.fpsPreset.grab : 30;
}

function getVJFpsRepro() {
  return vjState.fpsPreset ? vjState.fpsPreset.repro : 30;
}

function getVJSlowFactor() {
  return vjState.fpsPreset ? vjState.fpsPreset.factor : 1.0;
}

function vjUpdateFpsInfo() {}

function updateVJFrameInfo() {
  const v   = document.getElementById('vj-video');
  if (!v || !v.duration) return;
  const fps = getVJFps();
  document.getElementById('vj-frame-cur').textContent = Math.round(v.currentTime * fps);
  document.getElementById('vj-time-cur').textContent  = v.currentTime.toFixed(3) + 's';
  const s = document.getElementById('vj-scrubber');
  if (s) s.value = Math.round((v.currentTime / v.duration) * 1000);
}

function vjJump(n) {
  const v = document.getElementById('vj-video');
  if (!v || !v.src) return;
  v.pause(); document.getElementById('vj-play-btn').textContent = 'Play';
  v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + n / getVJFps()));
  setTimeout(updateVJFrameInfo, 40);
}

window.vjJump = vjJump;

function vjTogglePlay() {
  const v   = document.getElementById('vj-video');
  const btn = document.getElementById('vj-play-btn');
  if (!v) return;
  if (v.paused) { v.play(); btn.textContent = 'Pausa'; }
  else          { v.pause(); btn.textContent = 'Play'; }
}

window.vjTogglePlay = vjTogglePlay;

function vjScrub(val) {
  const v = document.getElementById('vj-video');
  if (!v || !v.duration) return;
  v.currentTime = (val / 1000) * v.duration;
}

window.vjScrub = vjScrub;

function vjMarkTakeoff() {
  const v = document.getElementById('vj-video');
  if (!v || !v.src) { alert('Carga un video primero'); return; }
  v.pause(); document.getElementById('vj-play-btn').textContent = 'Play';
  vjState.takeoff = v.currentTime;
  const fpsR = getVJFpsRepro();
  document.getElementById('vj-takeoff-disp').textContent =
    v.currentTime.toFixed(3) + 's  (frame ' + Math.round(v.currentTime * fpsR) + ')';
  document.getElementById('vj-btn-takeoff').style.background = 'rgba(57,255,122,.2)';
  if (vjState.landing !== null) calcVJJump();
}

window.vjMarkTakeoff = vjMarkTakeoff;

function vjMarkLanding() {
  const v = document.getElementById('vj-video');
  if (!v || !v.src) { alert('Carga un video primero'); return; }
  if (vjState.takeoff === null) { alert('Marca primero el Despegue'); return; }
  if (v.currentTime <= vjState.takeoff) { alert('El aterrizaje debe ser despues del despegue'); return; }
  v.pause(); document.getElementById('vj-play-btn').textContent = 'Play';
  vjState.landing = v.currentTime;
  const fpsR = getVJFpsRepro();
  document.getElementById('vj-landing-disp').textContent =
    v.currentTime.toFixed(3) + 's  (frame ' + Math.round(v.currentTime * fpsR) + ')';
  document.getElementById('vj-btn-landing').style.background = 'rgba(255,59,59,.2)';
  calcVJJump();
}

window.vjMarkLanding = vjMarkLanding;

function calcVJJump() {
  if (vjState.takeoff === null || vjState.landing === null) return;
  const tVideo  = vjState.landing - vjState.takeoff;
  const factor  = getVJSlowFactor();
  const tReal   = tVideo * factor;
  const fps     = getVJFps();
  const fpsRep  = getVJFpsRepro();
  const tMs     = Math.round(tReal * 1000);
  const hCm     = ((9.81 * tReal * tReal) / 8) * 100;
  const frames  = Math.round(tVideo * fpsRep);
  const c = hCm >= 40 ? 'var(--neon)' : hCm >= 30 ? 'var(--amber)' : 'var(--red)';
  document.getElementById('vj-result-area').innerHTML =
    '<div style="background:var(--dark4);border-radius:10px;padding:16px;text-align:center;margin-top:12px">' +
    '<div style="font-family:var(--mono);font-size:9px;color:var(--text2);text-transform:uppercase;margin-bottom:6px">Altura calculada</div>' +
    '<div style="font-family:var(--mono);font-size:52px;font-weight:800;color:' + c + ';line-height:1;text-shadow:0 0 20px ' + c + '33">' + hCm.toFixed(1) + '</div>' +
    '<div style="font-size:13px;color:var(--text2);margin-top:4px">cm</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">' +
    '<div style="background:rgba(57,255,122,.05);border-radius:6px;padding:8px;text-align:center">' +
    '<div style="font-family:var(--mono);font-size:8px;color:var(--text3);text-transform:uppercase;margin-bottom:2px">Tiempo de vuelo</div>' +
    '<div style="font-family:var(--mono);font-size:18px;font-weight:800;color:' + c + '">' + tMs + ' ms</div></div>' +
    '<div style="background:rgba(77,158,255,.05);border-radius:6px;padding:8px;text-align:center">' +
    '<div style="font-family:var(--mono);font-size:8px;color:var(--text3);text-transform:uppercase;margin-bottom:2px">Frames de vuelo</div>' +
    '<div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--blue)">' + frames + ' @ ' + fps + 'fps</div></div>' +
    '</div></div>';
  vjState.resultCm = hCm;
}

function confirmarVJResult() {
  if (!vjState.resultCm) { alert('Calcula el salto primero'); return; }
  const h = +vjState.resultCm.toFixed(1);
  // Write to the correct input (rep1 or specified field)
  const inp = document.getElementById(vjState.targetField);
  if (inp) {
    inp.value = h;
    inp.dispatchEvent(new Event('input'));
  }
  // Also trigger calcSalto
  const key = vjState.targetKey;
  if (key) {
    // find r2id
    const r2inp = document.getElementById(key + '-r2');
    calcSalto(key, key + '-r2');
  }
  closeModal('modal-vj');
  showSaveToast();
}

window.confirmarVJResult = confirmarVJResult;

function vjClearMarkers() {
  vjState.takeoff = null; vjState.landing = null; vjState.resultCm = null;
  document.getElementById('vj-takeoff-disp').textContent = '';
  document.getElementById('vj-landing-disp').textContent = '';
  document.getElementById('vj-result-area').innerHTML   = '';
  document.getElementById('vj-btn-takeoff').style.background = '';
  document.getElementById('vj-btn-landing').style.background = '';
}

window.vjClearMarkers = vjClearMarkers;

// ========================================================
//  VALGO DE RODILLA -- Analizador de angulo sobre video
//  Dos lineas sobre frame congelado -> angulo automatico
// ========================================================

let valgoState = {
  fps: 30,
  color: '#39FF7A',
  mode: 'linea1',     // 'linea1' | 'linea2'
  linea1: [],         // max 2 puntos
  linea2: [],         // max 2 puntos
  ctx: null,
  angle: null
};

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

window.loadValgoVideo = loadValgoVideo;

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

window.setValgoFps = setValgoFps;

function valgoJump(n) {
  const v = document.getElementById('valgo-video');
  if (!v || !v.src) return;
  v.pause(); document.getElementById('valgo-play-btn').textContent = 'Play';
  v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + n / valgoState.fps));
  setTimeout(() => { updateValgoFrameInfo(); redrawValgoCanvas(); }, 40);
}

window.valgoJump = valgoJump;

function valgoTogglePlay() {
  const v = document.getElementById('valgo-video');
  const btn = document.getElementById('valgo-play-btn');
  if (!v) return;
  if (v.paused) { v.play(); btn.textContent = 'Pausa'; }
  else          { v.pause(); btn.textContent = 'Play'; redrawValgoCanvas(); }
}

window.valgoTogglePlay = valgoTogglePlay;

function valgoScrub(val) {
  const v = document.getElementById('valgo-video');
  if (!v || !v.duration) return;
  v.currentTime = (val / 1000) * v.duration;
}

window.valgoScrub = valgoScrub;

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

window.setValgoMode = setValgoMode;

function setValgoColor(color, el) {
  valgoState.color = color;
  document.querySelectorAll('[id^="vc-"]').forEach(e => e.style.border = '2px solid transparent');
  if (el) el.style.border = '2px solid #fff';
  redrawValgoCanvas();
}

window.setValgoColor = setValgoColor;

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

window.undoValgoPoint = undoValgoPoint;

function clearValgoLines() {
  valgoState.linea1 = []; valgoState.linea2 = []; valgoState.angle = null;
  setValgoMode('linea1');
  redrawValgoCanvas();
  document.getElementById('valgo-result-card').style.display = 'none';
}

window.clearValgoLines = clearValgoLines;

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

window.saveValgoResult = saveValgoResult;

function captureValgoImage() {
  const canvas = document.getElementById('valgo-canvas');
  if (!canvas) return;
  redrawValgoCanvas();
  const link = document.createElement('a');
  link.download = 'valgo_' + (cur?.nombre || 'atleta') + '_' + new Date().toISOString().split('T')[0] + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

window.captureValgoImage = captureValgoImage;

// ══════════════════════════════════════════════════════
//  SEGUIMIENTO DE LESION
// ══════════════════════════════════════════════════════

function setLesEstado(estado) {
  ['agudo','subagudo','cronico','readap'].forEach(e => {
    const btn = document.getElementById('les-est-' + e);
    if (btn) btn.classList.remove('yes');
  });
  const btn = document.getElementById('les-est-' + estado);
  if (btn) btn.classList.add('yes');
  if (!cur) return;
  if (!cur.lesionSeguimiento) cur.lesionSeguimiento = {};
  cur.lesionSeguimiento.estado = estado;
}

window.setLesEstado = setLesEstado;

function updateRTSPercent() {
  const cbs = document.querySelectorAll('.les-rts-cb');
  const total = cbs.length;
  const checked = [...cbs].filter(c => c.checked).length;
  const pct = Math.round(checked / total * 100);
  const c = pct >= 80 ? 'var(--neon)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
  const tag1 = document.getElementById('les-rts-pct');
  const tag2 = document.getElementById('les-rts-pct2');
  const bar  = document.getElementById('les-rts-bar');
  if (tag1) { tag1.textContent = pct + '%'; tag1.style.background = c + '22'; tag1.style.color = c; }
  if (tag2) tag2.textContent = checked + ' / ' + total;
  if (bar)  { bar.style.width = pct + '%'; bar.style.background = c; }
}

window.updateRTSPercent = updateRTSPercent;

function updateLesDias() {
  const dias    = +document.getElementById('les-dias')?.value    || 0;
  const diasRTS = +document.getElementById('les-dias-rts')?.value || 0;
  const display = document.getElementById('les-timeline-display');
  const bar     = document.getElementById('les-prog-bar');
  const dot     = document.getElementById('les-prog-dot');
  const mid     = document.getElementById('les-dias-mid');
  const rtsLbl  = document.getElementById('les-rts-label');
  if (!display) return;
  if (dias > 0 || diasRTS > 0) {
    display.style.display = 'block';
    const maxDays = diasRTS || 90;
    const pct = diasRTS ? Math.min(100, (dias / diasRTS) * 100) : 0;
    const c = pct >= 80 ? 'var(--neon)' : pct >= 40 ? 'var(--amber)' : 'var(--red)';
    if (bar) bar.style.width = pct + '%';
    if (dot) { dot.style.left = 'calc(' + pct + '% - 8px)'; dot.style.background = c; dot.style.boxShadow = '0 0 10px ' + c; }
    if (mid) mid.textContent = 'Día ' + Math.round(maxDays / 2);
    if (rtsLbl) rtsLbl.textContent = 'RTS día ' + diasRTS;
  } else {
    display.style.display = 'none';
  }
}

window.updateLesDias = updateLesDias;

function saveLesionSeguimiento() {
  if (!cur) return;
  const data = {
    tipo:      document.getElementById('les-tipo')?.value       || '',
    estructura:document.getElementById('les-estructura')?.value || '',
    etapa:     document.getElementById('les-etapa')?.value      || '',
    dias:      +document.getElementById('les-dias')?.value      || 0,
    diasRTS:   +document.getElementById('les-dias-rts')?.value  || 0,
    obs:       document.getElementById('les-obs')?.value        || '',
    rtsChecks: [...document.querySelectorAll('.les-rts-cb')].map(c => c.checked),
    fecha:     new Date().toISOString().split('T')[0]
  };
  // Preserve estado from state
  const estadoBtn = ['agudo','subagudo','cronico','readap'].find(e =>
    document.getElementById('les-est-' + e)?.classList.contains('yes')
  );
  data.estado = estadoBtn || '';
  if (!cur.lesionSeguimiento) cur.lesionSeguimiento = {};
  Object.assign(cur.lesionSeguimiento, data);
  // Update main lesion field
  if (data.tipo && data.estructura) cur.lesion = data.tipo + ' — ' + data.estructura;
}

window.saveLesionSeguimiento = saveLesionSeguimiento;

function restoreLesionSeguimiento() {
  const d = cur?.lesionSeguimiento;
  if (!d) return;
  const fields = ['les-tipo','les-estructura','les-etapa','les-dias','les-dias-rts','les-obs'];
  const keys   = ['tipo','estructura','etapa','dias','diasRTS','obs'];
  fields.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el && d[keys[i]] !== undefined) el.value = d[keys[i]];
  });
  if (d.estado) setLesEstado(d.estado);
  if (d.rtsChecks) {
    const cbs = [...document.querySelectorAll('.les-rts-cb')];
    d.rtsChecks.forEach((v, i) => { if (cbs[i]) cbs[i].checked = v; });
  }
  updateRTSPercent();
  updateLesDias();
}

window.restoreLesionSeguimiento = restoreLesionSeguimiento;

// ══════════════════════════════════════════════════════
//  SHEETS CLÍNICOS — Hombro, Rodilla, Tobillo, LBP, Groin
// ══════════════════════════════════════════════════════

const HOMBRO_TESTS = [
  { id:'hawkins', name:'Hawkins-Kennedy', sub:'DESCARTAR RC (LR− 0.25) · Sn 0.83', tag:'tag-b' },
  { id:'neer',    name:'Neer impingement', sub:'Compresión subacromial · Sn 0.72', tag:'tag-b' },
  { id:'jobe',    name:'Empty Can (Jobe)', sub:'Supraespinoso · Sn 0.69', tag:'tag-r' },
  { id:'patte',   name:'Patte', sub:'Infraespinoso / Redondo menor · Sn 0.92', tag:'tag-r' },
  { id:'gerber',  name:'Gerber (Lift-off)', sub:'Subescapular · Sn 0.79', tag:'tag-r' },
  { id:'obrien',  name:"O'Brien (SLAP)", sub:'Labrum superior · Sn 0.47', tag:'tag-y' },
  { id:'apprehension', name:'Apprehension / Relocation', sub:'Inestabilidad GH anterior · Sn 0.72', tag:'tag-y' },
];
const ROM_HOMBRO = [
  { id:'flex', label:'Flexión', ref:'170–180°' },
  { id:'abd', label:'Abducción', ref:'170–180°' },
  { id:'ri', label:'RI', ref:'60–90°' },
  { id:'re', label:'RE', ref:'80–90°' },
  { id:'hadd', label:'Aducción Horiz.', ref:'30–40°' },
];
const FUERZA_HOMBRO = [
  { id:'ri-f', label:'RI', angulo:'0° neutro' },
  { id:'re-f', label:'RE', angulo:'0° neutro' },
  { id:'abd-f', label:'Abducción', angulo:'90°' },
  { id:'flex-f', label:'Flexión', angulo:'90°' },
];
const LCA_TESTS = [
  { id:'lachman', name:'Lachman', sub:'Gold standard LCA · Sn 0.86 / Sp 0.91', hasGrado:false },
  { id:'cajon-ant', name:'Cajón anterior', sub:'LCA · Sn 0.54', hasGrado:false },
  { id:'cajon-post', name:'Cajón posterior', sub:'LCP · Sn 0.90', hasGrado:false },
  { id:'pivot-shift', name:'Pivot Shift', sub:'LCA rotacional · Sp 0.98', hasGrado:true, opciones:['0 — Neg','I — Desliz.','II — Clunk','III — Clunk marcado'] },
  { id:'lelli', name:'Signo de palanca (Lelli)', sub:'Alta Sn aguda (Sn 1.0)', hasGrado:false },
];
const MENISCO_TESTS = [
  { id:'mcmurray', name:'McMurray', sub:'Menisco medial/lateral · Sn 0.70' },
  { id:'apley', name:'Apley', sub:'Menisco · Sn 0.61' },
  { id:'thessaly', name:'Thessaly (carga)', sub:'Menisco · Sn 0.89' },
];
const SPF_TESTS = [
  { id:'step-down', name:'Step-Down test', sub:'Control motor rodilla', hasValgo:true },
  { id:'sls', name:'Single Leg Squat (SLS)', sub:'Control motor · valgo dinámico', hasValgo:false },
];
const TOBILLO_LIG = [
  { id:'drawer-tob', name:'Anterior Drawer', sub:'ATFL · Sn 0.73 / Sp 0.60' },
  { id:'talar-tilt', name:'Talar Tilt', sub:'CFL · Sn 0.50 / Sp 0.88' },
  { id:'thompson', name:'Thompson', sub:'Tendón Aquiles · Sn 0.96' },
];
const ASES_ITEMS = [
  'Ponerse un abrigo','Dormir sobre el lado afectado','Lavarse la espalda',
  'Limpiarse tras la micción','Peinarse','Llegar a una balda alta',
  'Levantar 4.5kg por encima del hombro','Lanzar una pelota por encima',
  'Realizar su trabajo habitual','Realizar su deporte habitual'
];
const WORC_SECTIONS = [
  { d:'Síntomas físicos', items:['¿Cuánto dolor en su hombro?','¿Cuánta debilidad?','¿Inestabilidad?','¿Ruidos/clic?','¿Rigidez?','¿Pérdida de movimiento?'] },
  { d:'Deporte/Recreación', items:['¿Dif. actividades sobre la cabeza?','¿Dif. actividades de empuje?','¿Dif. lanzar/cargar objetos?','¿Dif. actividades recreativas?'] },
  { d:'Trabajo', items:['¿Dif. trabajar igual que antes?','¿Limitación en volumen de trabajo?','¿Dif. rendimiento laboral?','¿Afectó su trabajo?'] },
  { d:'Estilo de vida', items:['¿Afecta actividades con familia?','¿Dif. dormir?','¿Limita AVD?'] },
  { d:'Estado emocional', items:['¿Preocupa que empeore?','¿Desanimado?','¿Incertidumbre?','¿Miedo a lesionarse?'] },
];
const DASH_ITEMS = [
  'Abrir frasco apretado','Escribir','Girar una llave','Preparar una comida',
  'Empujar puerta pesada','Colocar algo en estante alto','Tareas del hogar pesadas',
  'Actividad en jardín','Tender la cama','Llevar bolsas de compras',
  'Cargar objeto pesado >5kg','Cambiar bombilla en el techo',
  'Lavarse/secarse el cabello','Lavarse la espalda','Ponerse un pullover',
  'Usar un cuchillo para comer','Actividades recreativas poco esfuerzo',
  'Actividades con algo de impacto','Moverse libremente con brazos/hombros',
  'Transporte (viajar, conducir)','Actividad sexual'
];
const VISAP_ITEMS = [
  { q:'¿Tiene dolor en el tendón patelar durante la mañana?', max:10 },
  { q:'¿Tiene dolor en el tendón patelar durante actividad?', max:10 },
  { q:'¿Puede hacer sentadillas completas?', max:10 },
  { q:'¿Tiene dolor al saltar?', max:10 },
  { q:'¿Puede realizar su deporte sin dolor?', max:10 },
  { q:'¿Puede saltar sin dolor?', max:10 },
  { q:'¿Puede hacer actividades de la vida diaria sin dolor?', max:10 },
  { q:'¿Puede hacer actividades deportivas sin restricción?', max:10 },
];
const VISAA_ITEMS = [
  { q:'¿Tiene dolor durante / después de levantarse por la mañana?', max:10 },
  { q:'¿Tiene dolor al hacer estiramiento del tendón de Aquiles?', max:10 },
  { q:'¿Tiene dolor al caminar en terreno llano?', max:10 },
  { q:'¿Tiene dolor al bajar escaleras a un ritmo normal?', max:10 },
  { q:'¿Tiene dolor al hacer un solo salto a máxima altura?', max:10 },
  { q:'¿Cuántas repeticiones de elevación de talón puede hacer sin dolor?', max:10 },
  { q:'¿Durante cuánto tiempo puede practicar su deporte?', max:10 },
  { q:'¿Puede practicar su deporte al nivel habitual?', max:10 },
];
const CAIT_ITEMS2 = [
  { q:'Tengo dolor en mi tobillo', ops:['Nunca (5)','Al deporte (4)','Al correr irr. (3)','Al correr plano (2)','Al caminar irr. (1)','Al caminar plano (0)'], vals:[5,4,3,2,1,0] },
  { q:'Siento inestabilidad en mi tobillo', ops:['Nunca (4)','A veces deporte (3)','Frecuente deporte (2)','A veces AVD (1)','Frecuente AVD (0)'], vals:[4,3,2,1,0] },
  { q:'En giros bruscos siento inestabilidad', ops:['Nunca (3)','A veces corriendo (2)','A menudo corriendo (1)','Al caminar (0)'], vals:[3,2,1,0] },
  { q:'Bajando escaleras siento inestabilidad', ops:['Nunca (3)','Si voy rápido (2)','Ocasionalmente (1)','Siempre (0)'], vals:[3,2,1,0] },
  { q:'Inestabilidad apoyado en una pierna', ops:['Nunca (2)','En punta de pie (1)','Pie plano (0)'], vals:[2,1,0] },
  { q:'Inestabilidad al saltar de lado', ops:['Nunca (3)','Saltos peq. lado (2)','Saltos peq. punto (1)','Cualquier salto (0)'], vals:[3,2,1,0] },
  { q:'Inestabilidad al correr terreno irregular', ops:['Nunca (4)','Correr irr. (3)','Trotar irr. (2)','Caminar irr. (1)','Caminar plano (0)'], vals:[4,3,2,1,0] },
  { q:'Cuando el tobillo comienza a torcerse puedo...', ops:['Detenerlo inmediatamente (3)','A menudo (2)','Algunas veces (1)','Nunca (0)'], vals:[3,2,1,0] },
  { q:'Después de torcerse, recupera en...', ops:['Inmediatamente (3)','Menos 1 día (2)','1-2 días (1)','Más 2 días (0)'], vals:[3,2,1,0] },
];
const FAAM_AVD_ITEMS = [
  'Estar de pie','Caminar en terreno llano','Caminar sin zapatos',
  'Caminar cuesta arriba','Caminar cuesta abajo','Subir escaleras','Bajar escaleras',
  'Caminar terreno irregular','Subir/bajar bordillos','Ponerse en cuclillas',
  'Ponerse de puntillas','Comenzar a andar','Andar 5 min o menos',
  'Caminar 10 min','Caminar 15 min o más','Tareas domésticas',
  'Actividades vida diaria','Cuidado personal','Trabajo liviano',
  'Trabajo moderado','Trabajo pesado'
];
const FAAM_DEP_ITEMS = [
  'Correr','Saltar','Aterrizar de saltos','Paradas y arranques rápidos',
  'Lateralidad y cambios de dirección','Actividades poco esfuerzo',
  'Actividades esfuerzo normal','Capacidad de actividad con normalidad'
];
const DOHA_ENTS = [
  { id:'aductor', label:'Aductor-relacionado', color:'var(--blue)', crit:'Palpación aductores + dolor en resistencia de aducción', kappa:'κ = 0.40–0.52',
    tests:['Palpación músculo aductor largo','Resistencia aducción (0°/45°/90°)','Squeeze test 0° y 45°'] },
  { id:'inguinal', label:'Inguinal-relacionado', color:'var(--teal)', crit:'Dolor canal inguinal + sensibilidad. Sin hernia palpable.', kappa:'κ = 0.44–0.52',
    tests:['Palpación canal inguinal','Dolor con contracción abdominal','Valsalva / tos'] },
  { id:'iliopsoas', label:'Iliopsoas-relacionado', color:'#A78BFA', crit:'Palpación iliopsoas + dolor en flexión resistida cadera.', kappa:'κ = 0.57–0.65 (mejor)',
    tests:['Palpación iliopsoas','Flexión resistida cadera','Estiramiento flexores'] },
  { id:'pubico', label:'Púbico-relacionado', color:'var(--amber)', crit:'Sensibilidad en sínfisis púbica y hueso adyacente.', kappa:'κ = 0.12 (baja)',
    tests:['Palpación sínfisis púbica','Palpación rama púbica'] },
  { id:'cadera', label:'Cadera-relacionado', color:'var(--red)', crit:'Sospecha cadera como fuente (ROM doloroso/limitado).', kappa:'κ = 0.62',
    tests:['FADIR (FAI/Labrum)','FABER (cápsula post.)','ROM pasivo cadera'] },
];
const STARTBACK_ITEMS = [
  'Mi dolor se ha extendido a la pierna/s en las últimas 2 semanas',
  'He tenido dolor en el hombro/cuello en las últimas 2 semanas',
  'Solo he caminado distancias cortas por mi dolor de espalda',
  'Me he vestido más despacio de lo habitual por el dolor',
  'No es seguro ser físicamente activo con esta condición',
  'Los pensamientos preocupantes han estado rondando mi mente',
  'Siento que mi espalda no mejorará pronto',
  'En general, no he disfrutado las cosas que solía disfrutar',
  '¿Cuánto se ha sentido molesto por su dolor de espalda?',
];
const SEBT_DIRS = ['Anterior','Posteromedial','Posterolateral'];

// State for clinical sheets
let worcVals = new Array(21).fill(0);
let asesVals = new Array(10).fill(null);
let dashVals = new Array(21).fill(null);
let visapVals = new Array(8).fill(null);
let visaaVals = new Array(8).fill(null);
let caitVals2 = new Array(9).fill(null);
let faamAvdVals = new Array(21).fill(null);
let faamDepVals = new Array(8).fill(null);
let startbackVals = new Array(9).fill(null);

function toggleSheetSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

window.toggleSheetSection = toggleSheetSection;

function initKlinicalSheet(panel) {
  // Build content based on which sheet opened
  if (panel === 'hombro' || panel === 'codo' || panel === 'munieca') initHombroSheet();
  if (panel === 'rodilla' || panel === 'cadera' || panel === 'gluteo') initRodillaSheet();
  if (panel === 'tobillo' || panel === 'pantorrilla' || panel === 'pie') initTobilloSheet();
  if (panel === 'lumbar' || panel === 'lumbar-post' || panel === 'dorsal' || panel === 'cervical') initLBPSheet();
  if (panel === 'ingle') initGroinSheet();
}

window.initKlinicalSheet = initKlinicalSheet;

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

window.showHTab = showHTab;

function showRTab(tab, btn) {
  ['spf','lca','lig','men','cuest','rtp'].forEach(t => {
    const el = document.getElementById('rtab-' + t); if(el) el.style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('#sheet-rodilla .btn').forEach(b => {
    if(b.id && b.id.startsWith('rtab-')) { b.className = 'btn btn-ghost btn-sm'; b.style.whiteSpace='nowrap'; b.style.fontSize='10px'; }
  });
  if(btn) { btn.className = 'btn btn-neon btn-sm'; btn.style.whiteSpace='nowrap'; btn.style.fontSize='10px'; }
}

window.showRTab = showRTab;

function showTTab(tab, btn) {
  ['lig','func','tcuest','tvisa'].forEach(t => {
    const el = document.getElementById('ttab-' + t); if(el) el.style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('#sheet-tobillo .btn').forEach(b => {
    if(b.id && b.id.startsWith('ttab-')) { b.className = 'btn btn-ghost btn-sm'; b.style.whiteSpace='nowrap'; b.style.fontSize='10px'; }
  });
  if(btn) { btn.className = 'btn btn-neon btn-sm'; btn.style.whiteSpace='nowrap'; btn.style.fontSize='10px'; }
}

window.showTTab = showTTab;

function setFAAMTab2(tab, btn) {
  document.getElementById('faam-avd-sheet').style.display = tab === 'avd' ? 'block' : 'none';
  document.getElementById('faam-dep-sheet').style.display = tab === 'dep' ? 'block' : 'none';
  document.querySelectorAll('#faam-avd-btn, #faam-dep-btn').forEach(b => b.className = 'btn btn-ghost btn-sm');
  if(btn) btn.className = 'btn btn-neon btn-sm';
}

window.setFAAMTab2 = setFAAMTab2;

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

window.calcTROMSheet = calcTROMSheet;

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

window.calcHombroAsimetria = calcHombroAsimetria;

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

window.selectASES = selectASES;
window.calcASES2 = calcASES2;

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

window.calcWORC2 = calcWORC2;

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

window.selectDASH = selectDASH;

function calcSPADI() {
  const sliders = document.querySelectorAll('#spadi-body .eva-slider');
  if(sliders.length>=2){
    const d=+sliders[0].value, dis=+sliders[1].value;
    const total=((d+dis)/2).toFixed(1);
    const el=document.getElementById('spadi-total');if(el)el.textContent=total;
  }
}

window.calcSPADI = calcSPADI;

function checkHombroRedFlags() {
  const cbs = document.querySelectorAll('.hombro-redflag');
  const any = [...cbs].some(c=>c.checked);
  const el = document.getElementById('hombro-redflag-alert'); if(el) el.style.display=any?'block':'none';
}

window.checkHombroRedFlags = checkHombroRedFlags;

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

window.checkValgoSPF = checkValgoSPF;

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

window.calcRatioIQ = calcRatioIQ;

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

window.calcLSISheet = calcLSISheet;

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

window.calcVISAP = calcVISAP;

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

window.calcDropNavicular = calcDropNavicular;

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

window.calcLungeTob = calcLungeTob;

function calcCadencia() {
  const val = +document.getElementById('cadencia-actual')?.value;
  const el = document.getElementById('cadencia-result'); if(!val||!el) return;
  const c = val>=170&&val<=180?'var(--neon)':val>=160?'var(--amber)':'var(--red)';
  el.innerHTML = `<span style="color:${c};font-weight:700">${val<170?'⚠️':'✓'} ${val} pasos/min</span><br>
    <span style="font-size:10px;color:var(--text3)">+5%: ${Math.round(val*1.05)} · +10%: ${Math.round(val*1.10)} · Objetivo: 170–180</span>`;
}

window.calcCadencia = calcCadencia;

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

window.calcCAIT2 = calcCAIT2;

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

window.calcFAAM2 = calcFAAM2;

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

window.calcVISAA = calcVISAA;

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

window.calcStartBack2 = calcStartBack2;

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

window.toggleOT = toggleOT;

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
  atletas = atletas.map(a => a.id===cur.id ? cur : a);
  saveData();
  showSaveToast();
}

window.saveKlinicalSheet = saveKlinicalSheet;

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
// ========================================================
// INFORME AVANZADO v2 - Selección de tests, audiencia y evolución
// ========================================================
// Dependencias: app.js, atletas.js, dashboard.js, saltos.js
// ========================================================

// ── CONFIGURACIÓN DEL INFORME ──
let informeConfig = {
  audiencia: 'paciente', // 'paciente', 'medico', 'entrenador'
  testsSeleccionados: {
    calidadMovimiento: true,
    movilidad: true,
    saltos: true,
    simetria: true,
    fuerzaRelativa: true,
    evolutivos: false,
    imagenes: true
  },
  compararCon: null,
  incluirRecomendaciones: true,
  incluirPlanAccion: true
};

// ── TESTS DISPONIBLES ──
const TESTS_DISPONIBLES = {
  calidadMovimiento: { nombre: 'Calidad de Movimiento (OHS)', icono: '🎯', default: true },
  movilidad: { nombre: 'Movilidad Articular', icono: '📐', default: true },
  saltos: { nombre: 'Saltos Verticales (SJ/CMJ/Abalakov)', icono: '🦘', default: true },
  simetria: { nombre: 'Simetría Funcional (Hop Tests)', icono: '⚖️', default: true },
  fuerzaRelativa: { nombre: 'Perfil de Fuerza Relativa', icono: '💪', default: true },
  evolutivos: { nombre: 'Comparativa Evolutiva', icono: '📈', default: false },
  fvCurve: { nombre: 'Curva Fuerza-Velocidad', icono: '📊', default: false },
  fatiga: { nombre: 'Estado de Fatiga (Hooper)', icono: '⚡', default: false }
};

// ── PLANTILLAS POR AUDIENCIA ──
const PLANTILLAS_AUDIENCIA = {
  paciente: {
    tono: 'motivador',
    nivelTecnico: 'bajo',
    destacar: ['logros', 'mejoras', 'recomendaciones'],
    evitar: ['terminologia medica compleja', 'porcentajes de riesgo'],
    intro: '¡Hola! Este es tu informe personalizado. Vamos a ver cómo está tu cuerpo y qué podemos hacer para que rindas mejor y te sientas genial.'
  },
  medico: {
    tono: 'tecnico',
    nivelTecnico: 'alto',
    destacar: ['hallazgos clinicos', 'asimetrias', 'factores riesgo', 'valores numericos'],
    evitar: ['lenguaje motivacional excesivo'],
    intro: 'Informe clínico-deportivo con datos objetivos de la evaluación funcional del atleta.'
  },
  entrenador: {
    tono: 'operativo',
    nivelTecnico: 'medio',
    destacar: ['cargas entrenamiento', 'objetivos semanales', 'test clave', 'progresion'],
    evitar: ['jerga medica innecesaria'],
    intro: 'Análisis de rendimiento para optimizar la planificación del entrenamiento.'
  }
};

// ── REFERENCIAS PARA SEMAFOROS ──
const REFERENCIAS_INFORME = {
  sj: { bajo: 25, normal: 35, elite: 45, unidad: 'cm' },
  cmj: { bajo: 30, normal: 40, elite: 55, unidad: 'cm' },
  abk: { bajo: 35, normal: 45, elite: 60, unidad: 'cm' },
  bj: { bajo: 160, normal: 200, elite: 240, unidad: 'cm' },
  lunge: { deficit: 35, limite: 40, optimo: 50, unidad: '°' },
  tromCad: { deficit: 70, limite: 85, optimo: 100, unidad: '°' },
  tromHom: { deficit: 120, limite: 140, optimo: 160, unidad: '°' }
};

// ========================================================
// MODAL DE CONFIGURACIÓN DEL INFORME
// ========================================================

function mostrarConfiguracionInforme() {
  console.log("🟢 Abriendo configuración de informe");
  
  if (!cur) { 
    alert('Seleccioná un atleta primero'); 
    return; 
  }
  
  // Cerrar modal existente si hay
  const modalExistente = document.getElementById('modal-config-informe');
  if (modalExistente) modalExistente.remove();
  
  const modal = document.createElement('div');
  modal.id = 'modal-config-informe';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)';
  
  const testsHtml = Object.entries(TESTS_DISPONIBLES).map(([key, test]) => `
    <label style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer">
      <input type="checkbox" id="test-${key}" ${informeConfig.testsSeleccionados[key] ? 'checked' : ''} 
        onchange="informeConfig.testsSeleccionados['${key}']=this.checked">
      <span style="font-size:20px">${test.icono}</span>
      <div>
        <div style="font-weight:600;font-size:14px">${test.nombre}</div>
        <div style="font-size:10px;color:rgba(255,255,255,.4)">Incluir en el informe</div>
      </div>
    </label>
  `).join('');

  const fechasPrevias = obtenerFechasEvaluacionesParaComparativa();
  
  modal.innerHTML = `
    <div style="background:#0f0f0f;border:1px solid rgba(57,255,122,.25);border-radius:20px;width:100%;max-width:600px;max-height:90vh;overflow-y:auto">
      <div style="padding:24px">
        <div style="font-family:monospace;font-size:11px;color:#39FF7A;margin-bottom:8px">MOVEMETRICS</div>
        <div style="font-size:22px;font-weight:800;margin-bottom:20px">Configurar Informe</div>
        
        <!-- Audiencia -->
        <div style="margin-bottom:24px">
          <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:#39FF7A">👤 ¿Para quién es este informe?</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button id="audiencia-paciente" class="btn ${informeConfig.audiencia === 'paciente' ? 'btn-neon' : 'btn-ghost'}" style="flex:1">🏃 Paciente</button>
            <button id="audiencia-medico" class="btn ${informeConfig.audiencia === 'medico' ? 'btn-neon' : 'btn-ghost'}" style="flex:1">🩺 Médico</button>
            <button id="audiencia-entrenador" class="btn ${informeConfig.audiencia === 'entrenador' ? 'btn-neon' : 'btn-ghost'}" style="flex:1">📋 Entrenador</button>
          </div>
        </div>
        
        <!-- Tests a incluir -->
        <div style="margin-bottom:24px">
          <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:#4D9EFF">📋 Seleccioná los tests</div>
          <div style="background:rgba(255,255,255,.03);border-radius:12px;padding:12px">
            ${testsHtml}
          </div>
        </div>
        
        <!-- Comparativa evolutiva -->
        <div style="margin-bottom:24px">
          <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:#FFB020">📊 Comparativa evolutiva</div>
          <div style="background:rgba(255,255,255,.03);border-radius:12px;padding:12px">
            <label style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
              <input type="checkbox" id="comparar-evolutivo" ${informeConfig.compararCon ? 'checked' : ''}>
              <span>Comparar con evaluación anterior</span>
            </label>
            <div id="select-fecha-evolutivo" style="display:${informeConfig.compararCon ? 'block' : 'none'}">
              <select id="fecha-evolutiva" class="inp" style="width:100%">
                <option value="">Seleccionar fecha</option>
                ${fechasPrevias.map(f => `<option value="${f.fecha}" ${informeConfig.compararCon === f.fecha ? 'selected' : ''}>${f.fecha} - ${f.tests.join(', ')}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        
        <!-- Botones -->
        <div style="display:flex;gap:12px;margin-top:20px">
          <button id="btn-generar-informe" class="btn btn-neon" style="flex:1">📄 Generar Informe</button>
          <button id="btn-cerrar-config" class="btn btn-ghost">Cancelar</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  console.log("✅ Modal agregado al DOM");
  
  // Bind eventos
  document.getElementById('audiencia-paciente')?.addEventListener('click', () => {
    informeConfig.audiencia = 'paciente';
    document.querySelectorAll('#modal-config-informe .btn').forEach(b => {
      if (b.id?.startsWith('audiencia-')) b.className = 'btn btn-ghost';
    });
    document.getElementById('audiencia-paciente').className = 'btn btn-neon';
  });
  
  document.getElementById('audiencia-medico')?.addEventListener('click', () => {
    informeConfig.audiencia = 'medico';
    document.querySelectorAll('#modal-config-informe .btn').forEach(b => {
      if (b.id?.startsWith('audiencia-')) b.className = 'btn btn-ghost';
    });
    document.getElementById('audiencia-medico').className = 'btn btn-neon';
  });
  
  document.getElementById('audiencia-entrenador')?.addEventListener('click', () => {
    informeConfig.audiencia = 'entrenador';
    document.querySelectorAll('#modal-config-informe .btn').forEach(b => {
      if (b.id?.startsWith('audiencia-')) b.className = 'btn btn-ghost';
    });
    document.getElementById('audiencia-entrenador').className = 'btn btn-neon';
  });
  
  const chkComparar = document.getElementById('comparar-evolutivo');
  if (chkComparar) {
    chkComparar.addEventListener('change', (e) => {
      const selectDiv = document.getElementById('select-fecha-evolutivo');
      if (selectDiv) selectDiv.style.display = e.target.checked ? 'block' : 'none';
      if (!e.target.checked) informeConfig.compararCon = null;
    });
  }
  
  const selectFecha = document.getElementById('fecha-evolutiva');
  if (selectFecha) {
    selectFecha.addEventListener('change', (e) => {
      informeConfig.compararCon = e.target.value || null;
    });
  }
  
  document.getElementById('btn-generar-informe')?.addEventListener('click', () => {
    console.log("🟢 Generando informe...");
    modal.remove();
    generarInformePersonalizado();
  });
  
  document.getElementById('btn-cerrar-config')?.addEventListener('click', () => {
    modal.remove();
  });
}
// ── OBTENER FECHAS DE EVALUACIONES ──
function obtenerFechasEvaluacionesParaComparativa() {
  if (!cur) return [];
  const fechas = [];
  Object.entries(cur.evals || {}).forEach(([key, data]) => {
    if (data?.fecha) {
      const fecha = data.fecha;
      const existing = fechas.find(f => f.fecha === fecha);
      const tipo = key.split('_')[0];
      const tipoNombre = {
        'fv': 'F-V', 'saltos': 'Saltos', 'sprint': 'Sprint',
        'mov': 'Movilidad', 'fatiga': 'Fatiga', 'fms': 'FMS'
      }[tipo] || tipo;
      
      if (existing) {
        if (!existing.tests.includes(tipoNombre)) existing.tests.push(tipoNombre);
      } else {
        fechas.push({ fecha, tests: [tipoNombre] });
      }
    }
  });
  return fechas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

// ========================================================
// GENERAR INFORME PERSONALIZADO
// ========================================================

async function generarInformePersonalizado() {
  console.log("🟢 Generando informe personalizado...");
  
  if (!cur) { 
    alert('Seleccioná un atleta primero'); 
    return; 
  }
  
  // Obtener datos previos si hay comparativa
  let datosPrevios = null;
  if (informeConfig.compararCon) {
    datosPrevios = obtenerDatosPorFecha(informeConfig.compararCon);
  }
  
  const contenido = construirInformeTexto(datosPrevios);
  function obtenerDatosPorFecha(fecha) {
  if (!cur || !cur.evalsByDate || !cur.evalsByDate[fecha]) return null;
  const data = cur.evalsByDate[fecha];
  return {
    fecha,
    saltos: data.saltos || null,
    movilidad: data.movilidad || null,
    fuerza: Object.values(cur.evals || {}).find(e => e.fecha === fecha && (e.ejercicio || e.oneRM)) || null
  };
}
  // Crear un modal simple para mostrar el resultado
  const modal = document.createElement('div');
  modal.id = 'modal-informe-resultado';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:10001;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)';
  
  modal.innerHTML = `
    <div style="background:#0f0f0f;border:1px solid rgba(57,255,122,.25);border-radius:20px;width:100%;max-width:800px;max-height:90vh;overflow-y:auto">
      <div style="padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div class="modal-title" style="font-size:20px">📄 Informe Personalizado</div>
          <button id="close-informe-modal" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer">×</button>
        </div>
        <textarea id="informe-resultado-text" class="inp" rows="20" style="font-family:monospace;font-size:11px;background:#0a0a0a;width:100%">${contenido}</textarea>
        <div style="display:flex;gap:12px;margin-top:16px">
          <button id="exportar-pdf-resultado" class="btn btn-neon">📄 Exportar PDF</button>
          <button id="copiar-texto-resultado" class="btn btn-ghost">📋 Copiar texto</button>
          <button id="cerrar-informe-modal" class="btn btn-ghost">Cerrar</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Bind eventos
  document.getElementById('close-informe-modal')?.addEventListener('click', () => modal.remove());
  document.getElementById('cerrar-informe-modal')?.addEventListener('click', () => modal.remove());
  
  document.getElementById('copiar-texto-resultado')?.addEventListener('click', () => {
    const texto = document.getElementById('informe-resultado-text')?.value;
    if (texto) {
      navigator.clipboard.writeText(texto);
      showSaveToast();
    }
  });
  
  document.getElementById('exportar-pdf-resultado')?.addEventListener('click', () => {
    exportarPDFPersonalizado(contenido);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function exportarPDFPersonalizado(texto) {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) { alert('Error al cargar jsPDF'); return; }
  
  const s = cur;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, 210, 297, 'F');
  
  doc.setFillColor(8, 8, 8);
  doc.rect(0, 0, 210, 44, 'F');
  doc.setDrawColor(57, 255, 122);
  doc.setLineWidth(0.4);
  doc.line(0, 44, 210, 44);
  
  doc.setTextColor(57, 255, 122);
  doc.setFontSize(18);
  doc.setFont('courier', 'bold');
  doc.text('MOVEMETRICS', 14, 20);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont('courier', 'normal');
  doc.text('INFORME PERSONALIZADO', 14, 27);
  doc.text(`Audiencia: ${informeConfig.audiencia === 'paciente' ? 'Deportista' : informeConfig.audiencia === 'medico' ? 'Médico' : 'Entrenador'}`, 14, 33);
  
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.text(s?.nombre || 'Atleta', 196, 18, { align: 'right' });
  doc.text(new Date().toLocaleDateString('es-AR'), 196, 24, { align: 'right' });
  
  const lines = doc.splitTextToSize(texto, 182);
  let y = 58;
  
  for (const line of lines) {
    if (y > 275) {
      doc.addPage();
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, 210, 297, 'F');
      y = 20;
    }
    
    if (line.startsWith('# ')) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(57, 255, 122);
      y += 4;
    } else if (line.startsWith('## ')) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(77, 158, 255);
      y += 3;
    } else if (line.startsWith('### ')) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 176, 32);
      y += 2;
    } else {
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
    }
    
    doc.text(line, 14, y);
    y += (line.startsWith('#') ? 7 : line.startsWith('##') ? 6 : line.startsWith('###') ? 5 : 4.5);
  }
  
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(6, 6, 6);
    doc.rect(0, 286, 210, 11, 'F');
    doc.setDrawColor(57, 255, 122);
    doc.setLineWidth(0.2);
    doc.line(0, 286, 210, 286);
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(7);
    doc.setFont('courier', 'normal');
    doc.text('MOVEMETRICS v12 · INFORME PERSONALIZADO', 14, 292);
    doc.text(`${i} / ${total}`, 196, 292, { align: 'right' });
  }
  
  doc.save(`MoveMetrics_${s?.nombre?.replace(/\s/g, '_') || 'informe'}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ========================================================
// CONSTRUIR TEXTO DEL INFORME
// ========================================================

function construirInformeTexto(datosPrevios) {
  const s = cur;
  const plantilla = PLANTILLAS_AUDIENCIA[informeConfig.audiencia];
  const tests = informeConfig.testsSeleccionados;
  const esComparativo = datosPrevios !== null;
  
  const lineas = [];
  
  // Header
  lineas.push(`# INFORME DE EVALUACIÓN FUNCIONAL\n`);
  lineas.push(`**Atleta:** ${s.nombre}`);
  lineas.push(`**Deporte:** ${s.deporte || '--'}${s.puesto ? ` · ${s.puesto}` : ''}`);
  lineas.push(`**Fecha:** ${new Date().toLocaleDateString('es-AR')}`);
  if (esComparativo) lineas.push(`**Comparativa con:** ${datosPrevios.fecha}`);
  lineas.push(`**Audiencia:** ${plantilla.audiencia === 'paciente' ? 'Deportista' : plantilla.audiencia === 'medico' ? 'Médico' : 'Entrenador'}`);
  lineas.push(`\n---\n`);
  
  // Introducción
  lineas.push(`## 📋 Introducción\n`);
  lineas.push(`${plantilla.intro}\n`);
  
  // ============================================================
  // 1. CALIDAD DE MOVIMIENTO
  // ============================================================
  if (tests.calidadMovimiento) {
    const fmsData = getLastEval('fms');
    const ohsCriterios = fmsData?.ohs?.criterios || [];
    const ohsScore = ohsCriterios.filter(c => c === 'si').length;
    const ohsTotal = 4;
    const ohsPct = (ohsScore / ohsTotal * 100).toFixed(0);
    
    lineas.push(`## 🎯 1. Calidad de Movimiento\n`);
    lineas.push(`### Sentadilla Overhead (OHS)`);
    lineas.push(`**Puntuación:** ${ohsScore}/${ohsTotal} (${ohsPct}%)\n`);
    lineas.push(`| Criterio | Estado |`);
    lineas.push(`|----------|--------|`);
    lineas.push(`| Rodillas alineadas con los pies (25%) | ${ohsCriterios[0] === 'si' ? '✅ CUMPLE' : '❌ NO CUMPLE'} |`);
    lineas.push(`| Fémur debajo de la horizontal (25%) | ${ohsCriterios[1] === 'si' ? '✅ CUMPLE' : '❌ NO CUMPLE'} |`);
    lineas.push(`| Torso paralelo a la tibia (25%) | ${ohsCriterios[2] === 'si' ? '✅ CUMPLE' : '❌ NO CUMPLE'} |`);
    lineas.push(`| Barra alineada con los pies (25%) | ${ohsCriterios[3] === 'si' ? '✅ CUMPLE' : '❌ NO CUMPLE'} |`);
    
    if (plantilla.audiencia === 'paciente') {
      if (ohsPct >= 75) lineas.push(`\n✅ **¡Muy bien!** Tu calidad de movimiento es excelente.`);
      else if (ohsPct >= 50) lineas.push(`\n🟡 **Buen trabajo!** Hay pequeños detalles que podemos ajustar.`);
      else lineas.push(`\n🔴 **Área de oportunidad.** Podemos mejorar tu patrón de movimiento.`);
    }
    lineas.push(`\n---\n`);
  }
  
  // ============================================================
  // 2. MOVILIDAD ARTICULAR
  // ============================================================
  if (tests.movilidad) {
    const lungeD = s.lungeD || 0;
    const lungeI = s.lungeI || 0;
    const tromCadD = s.tromCadD || 0;
    const tromCadI = s.tromCadI || 0;
    const tromHomD = s.tromHomD || 0;
    const tromHomI = s.tromHomI || 0;
    
    const getEstado = (val, ref) => {
      if (!val) return '--';
      if (val >= ref.optimo) return '🟢 Óptimo';
      if (val >= ref.limite) return '🟡 Límite';
      return '🔴 Déficit';
    };
    
    lineas.push(`## 📐 2. Movilidad Articular\n`);
    
    lineas.push(`### Tobillo (Lunge Test)`);
    lineas.push(`| Lado | Valor | Estado |`);
    lineas.push(`|------|-------|--------|`);
    lineas.push(`| Derecho | ${lungeD || '--'}° | ${getEstado(lungeD, REFERENCIAS_INFORME.lunge)} |`);
    lineas.push(`| Izquierdo | ${lungeI || '--'}° | ${getEstado(lungeI, REFERENCIAS_INFORME.lunge)} |`);
    if (lungeD && lungeI) {
      const asim = Math.abs(lungeD - lungeI);
      lineas.push(`\n**Asimetría:** ${asim}° ${asim > 5 ? '⚠️ Significativa (>5°)' : '✓ Normal'}`);
    }
    
    lineas.push(`\n### Cadera (TROM)`);
    lineas.push(`| Lado | Valor | Estado |`);
    lineas.push(`|------|-------|--------|`);
    lineas.push(`| Derecho | ${tromCadD || '--'}° | ${getEstado(tromCadD, REFERENCIAS_INFORME.tromCad)} |`);
    lineas.push(`| Izquierdo | ${tromCadI || '--'}° | ${getEstado(tromCadI, REFERENCIAS_INFORME.tromCad)} |`);
    
    lineas.push(`\n### Hombro (TROM)`);
    lineas.push(`| Lado | Valor | Estado |`);
    lineas.push(`|------|-------|--------|`);
    lineas.push(`| Derecho | ${tromHomD || '--'}° | ${getEstado(tromHomD, REFERENCIAS_INFORME.tromHom)} |`);
    lineas.push(`| Izquierdo | ${tromHomI || '--'}° | ${getEstado(tromHomI, REFERENCIAS_INFORME.tromHom)} |`);
    
    lineas.push(`\n---\n`);
  }
  
  // ============================================================
  // 3. SALTABILIDAD
  // ============================================================
  if (tests.saltos) {
    const saltoData = getLastEval('saltos');
    const sj = saltoData?.avg?.sj || 0;
    const cmj = saltoData?.avg?.cmj || 0;
    const abk = saltoData?.avg?.abk || 0;
    const bj = saltoData?.avg?.bj || 0;
    
    const getSemaforo = (val, ref) => {
      if (!val) return { color: '⚪', texto: 'Sin datos' };
      if (val >= ref.elite) return { color: '🟢', texto: 'Elite' };
      if (val >= ref.normal) return { color: '🟡', texto: 'Normal' };
      return { color: '🔴', texto: 'Bajo' };
    };
    
    lineas.push(`## 🦘 3. Saltabilidad\n`);
    lineas.push(`### Saltos Verticales - Batería Bosco\n`);
    lineas.push(`| Prueba | Valor | Referencia | Estado |`);
    lineas.push(`|--------|-------|------------|--------|`);
    
    const sjEst = getSemaforo(sj, REFERENCIAS_INFORME.sj);
    lineas.push(`| SJ (fuerza explosiva) | ${sj || '--'} cm | >${REFERENCIAS_INFORME.sj.elite} (Elite) | ${sjEst.color} ${sjEst.texto} |`);
    
    const cmjEst = getSemaforo(cmj, REFERENCIAS_INFORME.cmj);
    lineas.push(`| CMJ (fuerza elástica) | ${cmj || '--'} cm | >${REFERENCIAS_INFORME.cmj.elite} (Elite) | ${cmjEst.color} ${cmjEst.texto} |`);
    
    const abkEst = getSemaforo(abk, REFERENCIAS_INFORME.abk);
    lineas.push(`| Abalakov (coordinación) | ${abk || '--'} cm | >${REFERENCIAS_INFORME.abk.elite} (Elite) | ${abkEst.color} ${abkEst.texto} |`);
    
    if (sj && cmj) {
      const ie = ((cmj - sj) / sj * 100).toFixed(1);
      const ieColor = ie >= 15 ? '🟢' : ie >= 8 ? '🟡' : '🔴';
      lineas.push(`\n**Índice de Elasticidad:** ${ie}% ${ieColor}`);
    }
    
    if (bj) {
      const bjEst = getSemaforo(bj, REFERENCIAS_INFORME.bj);
      lineas.push(`\n### Salto Horizontal (Broad Jump)`);
      lineas.push(`**Promedio:** ${bj} cm → ${bjEst.color} ${bjEst.texto}`);
      if (s.peso) {
        const au = (bj / 100) * s.peso;
        lineas.push(`**Unidades de salto (AU):** ${au.toFixed(1)} kg·m`);
      }
    }
    
    // Comparativa evolutiva
    if (esComparativo && datosPrevios?.saltos?.cmj && cmj) {
      const mejora = cmj - datosPrevios.saltos.cmj;
      const flecha = mejora > 0 ? '⬆️' : mejora < 0 ? '⬇️' : '➡️';
      lineas.push(`\n### 📈 Evolución CMJ`);
      lineas.push(`**Anterior (${datosPrevios.fecha}):** ${datosPrevios.saltos.cmj.toFixed(1)} cm`);
      lineas.push(`**Actual:** ${cmj.toFixed(1)} cm`);
      lineas.push(`**Cambio:** ${flecha} ${mejora > 0 ? '+' : ''}${mejora.toFixed(1)} cm`);
    }
    
    lineas.push(`\n---\n`);
  }
  
  // ============================================================
  // 4. SIMETRÍA FUNCIONAL
  // ============================================================
  if (tests.simetria) {
    const saltoData = getLastEval('saltos');
    const hopTests = [
      { key: 'sh', nombre: 'Single Hop', unidad: 'cm', umbral: 90 },
      { key: '3h', nombre: 'Triple Hop', unidad: 'cm', umbral: 90 },
      { key: 't6h', nombre: 'Timed 6m Hop', unidad: 's', umbral: 90, lowerIsBetter: true }
    ];
    
    let hayDatos = false;
    const filas = [];
    
    for (const test of hopTests) {
      const valD = saltoData?.avg?.[`${test.key}D`] || 0;
      const valI = saltoData?.avg?.[`${test.key}I`] || 0;
      
      if (valD && valI) {
        hayDatos = true;
        const mayor = Math.max(valD, valI);
        const menor = Math.min(valD, valI);
        const lsi = (menor / mayor * 100).toFixed(1);
        const cumple = lsi >= test.umbral;
        filas.push(`| ${test.nombre} | ${valD}${test.unidad} | ${valI}${test.unidad} | ${lsi}% | ${cumple ? '✅ APTO' : '🔴 NO APTO'} |`);
      }
    }
    
    if (hayDatos) {
      lineas.push(`## ⚖️ 4. Simetría Funcional\n`);
      lineas.push(`| Test | Derecha | Izquierda | LSI | Estado RTS |`);
      lineas.push(`|------|---------|-----------|-----|------------|`);
      filas.forEach(f => lineas.push(f));
      lineas.push(`\n*Criterio RTS (Retorno al Deporte): LSI ≥ 90%*\n`);
    }
    
    lineas.push(`---\n`);
  }
  
  // ============================================================
  // 5. PERFIL DE FUERZA RELATIVA
  // ============================================================
  if (tests.fuerzaRelativa && s.lastFV?.oneRM && s.peso) {
    const fr = (s.lastFV.oneRM / s.peso).toFixed(2);
    let nivel = '', color = '';
    if (fr >= 1.5) { nivel = 'Alto'; color = '🟢'; }
    else if (fr >= 1.0) { nivel = 'Medio'; color = '🟡'; }
    else { nivel = 'Bajo'; color = '🔴'; }
    
    lineas.push(`## 💪 5. Perfil de Fuerza Relativa\n`);
    lineas.push(`**Ejercicio:** ${s.lastFV.ejercicio || 'Sentadilla'}`);
    lineas.push(`**1RM Estimado:** ${s.lastFV.oneRM.toFixed(0)} kg`);
    lineas.push(`**Peso corporal:** ${s.peso} kg`);
    lineas.push(`**Fuerza Relativa:** ${fr} × PC → ${color} **${nivel}**\n`);
    lineas.push(`| Nivel | Rango |`);
    lineas.push(`|-------|-------|`);
    lineas.push(`| Alto | >1.5× PC |`);
    lineas.push(`| Medio | 1.0-1.5× PC |`);
    lineas.push(`| Bajo | <1.0× PC |`);
    
    if (esComparativo && datosPrevios?.fuerza?.oneRM) {
      const frPrev = (datosPrevios.fuerza.oneRM / s.peso).toFixed(2);
      const mejora = (fr - frPrev).toFixed(2);
      const flecha = mejora > 0 ? '⬆️' : mejora < 0 ? '⬇️' : '➡️';
      lineas.push(`\n### 📈 Evolución`);
      lineas.push(`**Anterior (${datosPrevios.fecha}):** ${frPrev} × PC`);
      lineas.push(`**Actual:** ${fr} × PC`);
      lineas.push(`**Cambio:** ${flecha} ${mejora > 0 ? '+' : ''}${mejora} × PC`);
    }
    
    lineas.push(`\n---\n`);
  }
  
  // ============================================================
  // 6. PLAN DE ACCIÓN
  // ============================================================
  if (informeConfig.incluirPlanAccion) {
    lineas.push(`## 📋 6. Plan de Acción\n`);
    lineas.push(`| Prioridad | Área | Acción | Frecuencia |`);
    lineas.push(`|-----------|------|--------|------------|`);
    
    // Recomendaciones basadas en datos
    if ((s.lungeD || 0) < 40 || (s.lungeI || 0) < 40) {
      lineas.push(`| Alta | Movilidad tobillo | Dorsiflexiones con banda y lunges | Diaria, 3×30\" |`);
    }
    
    const saltoData = getLastEval('saltos');
    const shD = saltoData?.avg?.shD || 0;
    const shI = saltoData?.avg?.shI || 0;
    if (shD && shI && Math.abs(shD - shI) / Math.max(shD, shI) * 100 > 10) {
      const piernaDebil = shD < shI ? 'derecha' : 'izquierda';
      lineas.push(`| Alta | Asimetría funcional | Trabajo unilateral pierna ${piernaDebil} | 2-3 veces/semana |`);
    }
    
    if (s.lastFV?.oneRM && s.peso && (s.lastFV.oneRM / s.peso) < 1.0) {
      lineas.push(`| Media | Fuerza máxima | Sentadilla 3-5 rep al 80-85% | 2 veces/semana |`);
    }
    
    lineas.push(`\n---\n`);
  }
  
  // ============================================================
  // 7. CIERRE
  // ============================================================
  lineas.push(`## 🔄 7. Próximos Pasos\n`);
  if (plantilla.audiencia === 'paciente') {
    lineas.push(`¡Excelente trabajo! Cada evaluación es un paso más hacia tu mejor versión deportiva.\n`);
    lineas.push(`**Te recomendamos:**`);
    lineas.push(`1. Compartí este informe con tu entrenador`);
    lineas.push(`2. Seguí las recomendaciones personalizadas`);
    lineas.push(`3. Realizá una nueva evaluación en 4-6 semanas`);
  } else if (plantilla.audiencia === 'medico') {
    lineas.push(`**Recomendaciones clínicas:**`);
    lineas.push(`- Reevaluar en 6-8 semanas`);
    lineas.push(`- Monitorear asimetrías >10%`);
  } else {
    lineas.push(`**Planificación sugerida:**`);
    lineas.push(`- Microciclo 1-2: Enfocar áreas priorizadas`);
    lineas.push(`- Reevaluación programada para 4-6 semanas`);
  }
  
  lineas.push(`\n---\n`);
  lineas.push(`*Informe generado por MoveMetrics v12*`);
  lineas.push(`**THE MOVE CLUB** — ${new Date().toLocaleDateString('es-AR')}`);
  
  return lineas.join('\n');
}

// ========================================================
// MODAL Y EXPORTACIÓN
// ========================================================

function crearModalInformeAvanzado() {
  if (document.getElementById('modal-informe-avanzado')) return;
  
  const modal = document.createElement('div');
  modal.id = 'modal-informe-avanzado';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-sheet" style="max-width:800px;width:90%">
      <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-family:'Bebas Neue',sans-serif;font-size:28px">📄 Informe Personalizado</h2>
        <button class="close" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer">×</button>
      </div>
      <div id="informe-avanzado-loading" style="padding:40px;text-align:center">
        <div class="dots" style="justify-content:center"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        <div style="margin-top:16px;color:rgba(255,255,255,.4)">Generando informe...</div>
      </div>
      <div id="informe-avanzado-content" style="display:none">
        <textarea id="informe-avanzado-text" class="inp" rows="20" style="font-family:monospace;font-size:11px;background:#0a0a0a"></textarea>
        <div style="display:flex;gap:12px;margin-top:16px">
          <button id="exportar-pdf-avanzado" class="btn btn-neon">📄 Exportar PDF</button>
          <button id="copiar-texto" class="btn btn-ghost">📋 Copiar texto</button>
          <button id="reconfigurar-informe" class="btn btn-ghost">⚙️ Reconfigurar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('close')) {
      closeModal('modal-informe-avanzado');
    }
  });
  
  document.getElementById('exportar-pdf-avanzado')?.addEventListener('click', () => {
    exportarPDFAvanzado();
  });
  
  document.getElementById('copiar-texto')?.addEventListener('click', () => {
    const texto = document.getElementById('informe-avanzado-text')?.value;
    if (texto) {
      navigator.clipboard.writeText(texto);
      showSaveToast();
    }
  });
  
  document.getElementById('reconfigurar-informe')?.addEventListener('click', () => {
    closeModal('modal-informe-avanzado');
    mostrarConfiguracionInforme();
  });
}

function exportarPDFAvanzado() {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) { alert('Error al cargar jsPDF'); return; }
  
  const s = cur;
  const texto = document.getElementById('informe-avanzado-text')?.value;
  if (!texto) { alert('No hay contenido para exportar'); return; }
  
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // Fondo negro
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, 210, 297, 'F');
  
  // Header
  doc.setFillColor(8, 8, 8);
  doc.rect(0, 0, 210, 44, 'F');
  doc.setDrawColor(57, 255, 122);
  doc.setLineWidth(0.4);
  doc.line(0, 44, 210, 44);
  
  doc.setTextColor(57, 255, 122);
  doc.setFontSize(18);
  doc.setFont('courier', 'bold');
  doc.text('MOVEMETRICS', 14, 20);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont('courier', 'normal');
  doc.text('INFORME PERSONALIZADO', 14, 27);
  doc.text(`Audiencia: ${informeConfig.audiencia === 'paciente' ? 'Deportista' : informeConfig.audiencia === 'medico' ? 'Médico' : 'Entrenador'}`, 14, 33);
  
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.text(s?.nombre || 'Atleta', 196, 18, { align: 'right' });
  doc.text(new Date().toLocaleDateString('es-AR'), 196, 24, { align: 'right' });
  
  // Contenido
  const lines = doc.splitTextToSize(texto, 182);
  let y = 58;
  
  for (const line of lines) {
    if (y > 275) {
      doc.addPage();
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, 210, 297, 'F');
      y = 20;
    }
    
    if (line.startsWith('# ')) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(57, 255, 122);
      y += 4;
    } else if (line.startsWith('## ')) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(77, 158, 255);
      y += 3;
    } else if (line.startsWith('### ')) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 176, 32);
      y += 2;
    } else if (line.includes('|')) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
    } else {
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
    }
    
    doc.text(line, 14, y);
    y += (line.startsWith('#') ? 7 : line.startsWith('##') ? 6 : line.startsWith('###') ? 5 : 4.5);
  }
  
  // Footer
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(6, 6, 6);
    doc.rect(0, 286, 210, 11, 'F');
    doc.setDrawColor(57, 255, 122);
    doc.setLineWidth(0.2);
    doc.line(0, 286, 210, 286);
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(7);
    doc.setFont('courier', 'normal');
    doc.text('MOVEMETRICS v12 · INFORME PERSONALIZADO', 14, 292);
    doc.text(`${i} / ${total}`, 196, 292, { align: 'right' });
  }
  
  doc.save(`MoveMetrics_${s?.nombre?.replace(/\s/g, '_') || 'informe'}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ========================================================
// INTEGRACIÓN CON EL SISTEMA EXISTENTE
// ========================================================

// Agregar botón en el perfil del atleta
function agregarBotonInformeAvanzado() {
  const toolbar = document.querySelector('#profile-hero-area .flex-b, .profile-toolbar');
  if (toolbar && !document.getElementById('btn-informe-avanzado')) {
    const btn = document.createElement('button');
    btn.id = 'btn-informe-avanzado';
    btn.className = 'btn btn-neon';
    btn.innerHTML = '📄 Informe Personalizado';
    btn.style.marginLeft = 'auto';
    btn.addEventListener('click', mostrarConfiguracionInforme);
    toolbar.appendChild(btn);
  }
}

// Hookear selectAtleta original
if (typeof window.selectAtleta === 'function') {
  const originalSelectAtleta = window.selectAtleta;
  window.selectAtleta = function(id) {
    originalSelectAtleta(id);
    setTimeout(agregarBotonInformeAvanzado, 100);
  };
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
  crearModalInformeAvanzado();
  if (cur) setTimeout(agregarBotonInformeAvanzado, 500);
});

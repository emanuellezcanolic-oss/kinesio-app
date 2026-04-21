// ══════════════════════════════════════════════════════════════
//  MoveMetrics v12 -- JavaScript completo
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

function showApiKeyModal() {
  const existing = getApiKey();
  const modal = document.createElement('div');
  modal.id = 'api-key-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)';
  modal.innerHTML = `
    <div style="background:#0f0f0f;border:1px solid rgba(57,255,122,.25);border-radius:16px;padding:32px 28px;width:100%;max-width:420px;margin:16px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#39FF7A;letter-spacing:.12em;margin-bottom:8px;text-transform:uppercase">∧ MoveMetrics</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:6px;color:#f0f0f0">API Key de Anthropic</div>
      <div style="font-size:13px;color:#888;margin-bottom:20px;line-height:1.6">
        Ingresá tu API Key para generar informes con IA.<br>
        Se guarda <b style="color:#f0f0f0">solo en tu navegador</b> -- nunca se sube a ningún servidor.
      </div>
      <input id="api-key-input" type="password"
        placeholder="sk-ant-api03-..."
        value="${existing}"
        style="width:100%;background:#141414;border:1px solid rgba(57,255,122,.2);border-radius:8px;color:#f0f0f0;padding:10px 14px;font-size:13px;font-family:'JetBrains Mono',monospace;outline:none;margin-bottom:8px;box-sizing:border-box"
      >
      <div style="font-size:11px;color:#3a3a3a;margin-bottom:16px;font-family:'JetBrains Mono',monospace">
        Obtené tu key gratis en console.groq.com → API Keys
      </div>
      <div style="display:flex;gap:10px">
        <button onclick="
          const k=document.getElementById('api-key-input').value.trim();
          if(!k){alert('Ingresá una API Key');return;}
          saveApiKey(k);
          document.getElementById('api-key-modal').remove();
          showSaveToast();
        " style="flex:1;background:#39FF7A;color:#000;border:none;border-radius:8px;padding:11px;font-weight:700;font-size:13px;cursor:pointer">
          Guardar y continuar
        </button>
        ${existing ? `<button onclick="document.getElementById('api-key-modal').remove()" style="background:#1c1c1c;color:#888;border:1px solid #252525;border-radius:8px;padding:11px 16px;font-size:13px;cursor:pointer">Cancelar</button>` : ''}
      </div>
      ${existing ? `<div style="text-align:center;margin-top:12px"><button onclick="clearApiKey();document.getElementById('api-key-input').value=''" style="background:none;border:none;color:#3a3a3a;font-size:11px;cursor:pointer;text-decoration:underline">Borrar key guardada</button></div>` : ''}
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('api-key-input')?.focus(), 100);
}

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

function showProfileTab(tab, btn) {
  const tabs = ['dashboard','kinesio','fuerza','saltos','movilidad','velocidad','fms','fatiga','video','vmp','historial'];
  tabs.forEach(t => document.getElementById('ptab-' + t)?.classList.toggle('hidden', t !== tab));
  document.querySelectorAll('#profile-tab-bar .ptab').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
  if (tab === 'dashboard')  renderDashboard();
  if (tab === 'historial')  renderHistorial();
  if (tab === 'kinesio')    initKinesio();
  if (tab === 'fuerza')     renderFVHist();
  if (tab === 'saltos')     { renderSimetriasTabla(); }
  if (tab === 'fuerza')     { initFVTools(); updatePrePostSelects(); initPlanillas(); }
  if (tab === 'saltos')     { initPlanillas(); }
  if (tab === 'velocidad')  { initTrineo(); buildIFTRefTable(); }
  if (tab === 'fatiga')     { }
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

function openModal(id)  { document.getElementById(id).classList.add('open');    document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }
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

// ══════════════════════════════════════════════════════
//  ATLETAS CRUD
// ══════════════════════════════════════════════════════

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

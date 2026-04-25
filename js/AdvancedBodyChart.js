// AdvancedBodyChart.js  — v1.0
// Reemplaza el body chart simple. Renderiza dentro de #advanced-body-chart.
// Escribe en kineState.bodyZones (misma API que el chart anterior).
// Llama openModal(sheetId) + initKlinicalSheet(panel) al clic en zona activa.

(function () {
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// ZONE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

// articular zones: id, label, panel (para clinical sheet), view, shape
// shape: 'ellipse' cx cy rx ry  |  'rect' x y w h rx
//        'path' d
const ART_ZONES = {
  front: [
    { id:'cabeza',      label:'Cabeza',           panel:'cervical',  shape:'ellipse', cx:100,cy:28,rx:22,ry:26 },
    { id:'cervical',    label:'Cervical',          panel:'cervical',  shape:'rect',    x:89, y:53,w:22,h:18,rx:4 },
    { id:'hombro-d',    label:'Hombro D',          panel:'hombro',    shape:'ellipse', cx:50, cy:75,rx:13,ry:11 },
    { id:'hombro-i',    label:'Hombro I',          panel:'hombro',    shape:'ellipse', cx:150,cy:75,rx:13,ry:11 },
    { id:'codo-d',      label:'Codo D',            panel:'codo',      shape:'ellipse', cx:39, cy:142,rx:10,ry:10 },
    { id:'codo-i',      label:'Codo I',            panel:'codo',      shape:'ellipse', cx:161,cy:142,rx:10,ry:10 },
    { id:'munieca-d',   label:'Muñeca D',          panel:'hombro',    shape:'ellipse', cx:36, cy:196,rx:9, ry:8  },
    { id:'munieca-i',   label:'Muñeca I',          panel:'hombro',    shape:'ellipse', cx:164,cy:196,rx:9, ry:8  },
    { id:'torso',       label:'Torso / Pectoral',  panel:'hombro',    shape:'rect',    x:60, y:67,w:80,h:52,rx:3 },
    { id:'abdomen',     label:'Abdomen',           panel:'lumbar',    shape:'rect',    x:64, y:122,w:72,h:44,rx:3 },
    { id:'lumbar',      label:'Lumbar',            panel:'lumbar',    shape:'rect',    x:70, y:166,w:60,h:24,rx:3 },
    { id:'cadera-d',    label:'Cadera D',          panel:'cadera',    shape:'ellipse', cx:76, cy:200,rx:18,ry:14 },
    { id:'cadera-i',    label:'Cadera I',          panel:'cadera',    shape:'ellipse', cx:124,cy:200,rx:18,ry:14 },
    { id:'ingle-d',     label:'Ingle D',           panel:'ingle',     shape:'ellipse', cx:82, cy:220,rx:12,ry:9  },
    { id:'ingle-i',     label:'Ingle I',           panel:'ingle',     shape:'ellipse', cx:118,cy:220,rx:12,ry:9  },
    { id:'rodilla-d',   label:'Rodilla D',         panel:'rodilla',   shape:'ellipse', cx:72, cy:280,rx:13,ry:12 },
    { id:'rodilla-i',   label:'Rodilla I',         panel:'rodilla',   shape:'ellipse', cx:128,cy:280,rx:13,ry:12 },
    { id:'tobillo-d',   label:'Tobillo D',         panel:'tobillo',   shape:'ellipse', cx:71, cy:374,rx:12,ry:8  },
    { id:'tobillo-i',   label:'Tobillo I',         panel:'tobillo',   shape:'ellipse', cx:129,cy:374,rx:12,ry:8  },
    { id:'pie-d',       label:'Pie D',             panel:'tobillo',   shape:'ellipse', cx:72, cy:400,rx:16,ry:9  },
    { id:'pie-i',       label:'Pie I',             panel:'tobillo',   shape:'ellipse', cx:128,cy:400,rx:16,ry:9  },
  ],
  back: [
    { id:'cervical-post',   label:'Cervical Post',  panel:'cervical', shape:'ellipse', cx:100,cy:45,rx:18,ry:16 },
    { id:'hombro-d-post',   label:'Hombro D Post',  panel:'hombro',   shape:'ellipse', cx:52, cy:75,rx:13,ry:11 },
    { id:'hombro-i-post',   label:'Hombro I Post',  panel:'hombro',   shape:'ellipse', cx:148,cy:75,rx:13,ry:11 },
    { id:'dorsal',          label:'Dorsal',         panel:'lumbar',   shape:'rect',    x:65, y:72,w:70,h:55,rx:3 },
    { id:'lumbar-post',     label:'Lumbar Post',    panel:'lumbar',   shape:'rect',    x:68, y:130,w:64,h:30,rx:3 },
    { id:'gluteo-d',        label:'Glúteo D',       panel:'gluteo',   shape:'ellipse', cx:78, cy:185,rx:20,ry:20 },
    { id:'gluteo-i',        label:'Glúteo I',       panel:'gluteo',   shape:'ellipse', cx:122,cy:185,rx:20,ry:20 },
    { id:'isquio-d',        label:'Isquiotibial D', panel:'rodilla',  shape:'rect',    x:60, y:215,w:23,h:55,rx:4 },
    { id:'isquio-i',        label:'Isquiotibial I', panel:'rodilla',  shape:'rect',    x:117,y:215,w:23,h:55,rx:4 },
    { id:'rodilla-post-d',  label:'Rodilla Post D', panel:'rodilla',  shape:'ellipse', cx:72, cy:282,rx:13,ry:12 },
    { id:'rodilla-post-i',  label:'Rodilla Post I', panel:'rodilla',  shape:'ellipse', cx:128,cy:282,rx:13,ry:12 },
    { id:'gemelo-d',        label:'Gemelo D',       panel:'tobillo',  shape:'rect',    x:61, y:300,w:22,h:60,rx:4 },
    { id:'gemelo-i',        label:'Gemelo I',       panel:'tobillo',  shape:'rect',    x:117,y:300,w:22,h:60,rx:4 },
    { id:'talon-d',         label:'Talón D',        panel:'tobillo',  shape:'ellipse', cx:71, cy:378,rx:13,ry:9  },
    { id:'talon-i',         label:'Talón I',        panel:'tobillo',  shape:'ellipse', cx:129,cy:378,rx:13,ry:9  },
  ],
  lat_d: [
    { id:'cervical-lat-d',  label:'Cervical Lat D', panel:'cervical', shape:'ellipse', cx:100,cy:45,rx:16,ry:15 },
    { id:'dorsal-lat-d',    label:'Dorsal Lat D',   panel:'lumbar',   shape:'rect',    x:72, y:70,w:56,h:50,rx:3 },
    { id:'lumbar-lat-d',    label:'Lumbar Lat D',   panel:'lumbar',   shape:'rect',    x:72, y:128,w:50,h:28,rx:3 },
    { id:'cadera-lat-d',    label:'Cadera Lat D',   panel:'cadera',   shape:'ellipse', cx:96, cy:185,rx:22,ry:18 },
    { id:'tfl-d',           label:'TFL / Banda IT D',panel:'cadera',  shape:'rect',    x:82, y:210,w:20,h:65,rx:4 },
    { id:'ciatico-d',       label:'Nervio Ciático D',panel:'rodilla', shape:'rect',    x:85, y:200,w:12,h:70,rx:3 },
    { id:'rodilla-lat-d',   label:'Rodilla Lat D',  panel:'rodilla',  shape:'ellipse', cx:97, cy:286,rx:16,ry:14 },
    { id:'tobillo-lat-d',   label:'Tobillo Lat D',  panel:'tobillo',  shape:'ellipse', cx:95, cy:374,rx:13,ry:9  },
  ],
  lat_i: [
    { id:'cervical-lat-i',  label:'Cervical Lat I', panel:'cervical', shape:'ellipse', cx:100,cy:45,rx:16,ry:15 },
    { id:'dorsal-lat-i',    label:'Dorsal Lat I',   panel:'lumbar',   shape:'rect',    x:72, y:70,w:56,h:50,rx:3 },
    { id:'lumbar-lat-i',    label:'Lumbar Lat I',   panel:'lumbar',   shape:'rect',    x:72, y:128,w:50,h:28,rx:3 },
    { id:'cadera-lat-i',    label:'Cadera Lat I',   panel:'cadera',   shape:'ellipse', cx:104,cy:185,rx:22,ry:18 },
    { id:'tfl-i',           label:'TFL / Banda IT I',panel:'cadera',  shape:'rect',    x:98, y:210,w:20,h:65,rx:4 },
    { id:'ciatico-i',       label:'Nervio Ciático I',panel:'rodilla', shape:'rect',    x:103,y:200,w:12,h:70,rx:3 },
    { id:'rodilla-lat-i',   label:'Rodilla Lat I',  panel:'rodilla',  shape:'ellipse', cx:103,cy:286,rx:16,ry:14 },
    { id:'tobillo-lat-i',   label:'Tobillo Lat I',  panel:'tobillo',  shape:'ellipse', cx:105,cy:374,rx:13,ry:9  },
  ]
};

const MUS_ZONES = {
  front: [
    { id:'m-trapecio-ant',  label:'Trapecio Ant',   panel:'hombro',  shape:'path', d:'M80,55 Q100,48 120,55 Q115,72 100,74 Q85,72 80,55Z' },
    { id:'m-deltoides-d',   label:'Deltoides D',    panel:'hombro',  shape:'ellipse', cx:52, cy:74,rx:12,ry:10 },
    { id:'m-deltoides-i',   label:'Deltoides I',    panel:'hombro',  shape:'ellipse', cx:148,cy:74,rx:12,ry:10 },
    { id:'m-pectoral-d',    label:'Pectoral D',     panel:'hombro',  shape:'path', d:'M66,68 Q82,64 100,68 L97,112 Q78,116 64,108 Q58,92 66,68Z' },
    { id:'m-pectoral-i',    label:'Pectoral I',     panel:'hombro',  shape:'path', d:'M134,68 Q118,64 100,68 L103,112 Q122,116 136,108 Q142,92 134,68Z' },
    { id:'m-biceps-d',      label:'Bíceps D',       panel:'hombro',  shape:'rect',    x:40, y:84,w:18,h:45,rx:8 },
    { id:'m-biceps-i',      label:'Bíceps I',       panel:'hombro',  shape:'rect',    x:142,y:84,w:18,h:45,rx:8 },
    { id:'m-abdomen',       label:'Recto Abdominal',panel:'lumbar',  shape:'rect',    x:86, y:112,w:28,h:50,rx:4 },
    { id:'m-oblicuo-d',     label:'Oblicuo D',      panel:'lumbar',  shape:'path', d:'M66,112 Q83,108 86,162 Q68,158 60,140 Q54,122 66,112Z' },
    { id:'m-oblicuo-i',     label:'Oblicuo I',      panel:'lumbar',  shape:'path', d:'M134,112 Q117,108 114,162 Q132,158 140,140 Q146,122 134,112Z' },
    { id:'m-cuadriceps-d',  label:'Cuádriceps D',   panel:'rodilla', shape:'rect',    x:62, y:186,w:24,h:80,rx:8 },
    { id:'m-cuadriceps-i',  label:'Cuádriceps I',   panel:'rodilla', shape:'rect',    x:114,y:186,w:24,h:80,rx:8 },
    { id:'m-tibial-d',      label:'Tibial Ant D',   panel:'tobillo', shape:'rect',    x:63, y:294,w:16,h:65,rx:6 },
    { id:'m-tibial-i',      label:'Tibial Ant I',   panel:'tobillo', shape:'rect',    x:121,y:294,w:16,h:65,rx:6 },
    { id:'m-aductor-d',     label:'Aductor D',      panel:'cadera',  shape:'path', d:'M90,190 Q100,186 100,230 Q88,220 86,200Z' },
    { id:'m-aductor-i',     label:'Aductor I',      panel:'cadera',  shape:'path', d:'M110,190 Q100,186 100,230 Q112,220 114,200Z' },
  ],
  back: [
    { id:'m-trapecio',      label:'Trapecio',       panel:'hombro',  shape:'path', d:'M72,50 Q100,40 128,50 L138,95 Q100,82 62,95 Z' },
    { id:'m-deltoides-d-p', label:'Deltoides D Post',panel:'hombro', shape:'ellipse', cx:52, cy:74,rx:12,ry:10 },
    { id:'m-deltoides-i-p', label:'Deltoides I Post',panel:'hombro', shape:'ellipse', cx:148,cy:74,rx:12,ry:10 },
    { id:'m-infraesp-d',    label:'Infraespinoso D', panel:'hombro', shape:'path', d:'M65,84 Q80,78 100,82 L98,110 Q76,112 62,106 Z' },
    { id:'m-infraesp-i',    label:'Infraespinoso I', panel:'hombro', shape:'path', d:'M135,84 Q120,78 100,82 L102,110 Q124,112 138,106 Z' },
    { id:'m-lumbares',      label:'Erectores Lumbares',panel:'lumbar',shape:'rect', x:84,y:128,w:32,h:38,rx:4 },
    { id:'m-gluteo-mayor-d',label:'Glúteo Mayor D',  panel:'gluteo', shape:'ellipse', cx:78, cy:185,rx:21,ry:20 },
    { id:'m-gluteo-mayor-i',label:'Glúteo Mayor I',  panel:'gluteo', shape:'ellipse', cx:122,cy:185,rx:21,ry:20 },
    { id:'m-isquio-d',      label:'Isquiotibiales D',panel:'rodilla',shape:'rect',    x:60,y:215,w:24,h:55,rx:8 },
    { id:'m-isquio-i',      label:'Isquiotibiales I',panel:'rodilla',shape:'rect',    x:116,y:215,w:24,h:55,rx:8 },
    { id:'m-gemelo-d',      label:'Gemelo D',        panel:'tobillo',shape:'rect',    x:61,y:296,w:22,h:60,rx:8 },
    { id:'m-gemelo-i',      label:'Gemelo I',        panel:'tobillo',shape:'rect',    x:117,y:296,w:22,h:60,rx:8 },
    { id:'m-triceps-d',     label:'Tríceps D',       panel:'codo',   shape:'rect',    x:38,y:86,w:16,h:44,rx:6 },
    { id:'m-triceps-i',     label:'Tríceps I',       panel:'codo',   shape:'rect',    x:146,y:86,w:16,h:44,rx:6 },
  ],
  lat_d: [
    { id:'m-tfl-d',         label:'TFL D',           panel:'cadera', shape:'rect',   x:82,y:165,w:22,h:55,rx:5 },
    { id:'m-vasto-lat-d',   label:'Vasto Lateral D', panel:'rodilla',shape:'rect',   x:78,y:220,w:22,h:55,rx:7 },
    { id:'m-bicepsfem-d',   label:'Bíceps Fem D',    panel:'rodilla',shape:'rect',   x:104,y:215,w:20,h:55,rx:7 },
    { id:'m-perone-d',      label:'Peroneos D',      panel:'tobillo',shape:'rect',   x:104,y:296,w:16,h:60,rx:6 },
  ],
  lat_i: [
    { id:'m-tfl-i',         label:'TFL I',           panel:'cadera', shape:'rect',   x:96,y:165,w:22,h:55,rx:5 },
    { id:'m-vasto-lat-i',   label:'Vasto Lateral I', panel:'rodilla',shape:'rect',   x:100,y:220,w:22,h:55,rx:7 },
    { id:'m-bicepsfem-i',   label:'Bíceps Fem I',    panel:'rodilla',shape:'rect',   x:76,y:215,w:20,h:55,rx:7 },
    { id:'m-perone-i',      label:'Peroneos I',      panel:'tobillo',shape:'rect',   x:80,y:296,w:16,h:60,rx:6 },
  ]
};

// Neural: dermatomes mapped as body regions + peripheral nerves
const NEURAL_ZONES = {
  front: [
    { id:'n-c5-d',   label:'C5 D',   panel:'cervical', color:'#e040fb', shape:'path', d:'M48,62 L36,140 L52,142 L66,80Z' },
    { id:'n-c5-i',   label:'C5 I',   panel:'cervical', color:'#e040fb', shape:'path', d:'M152,62 L164,140 L148,142 L134,80Z' },
    { id:'n-c6-d',   label:'C6 D (Pulgar)',panel:'cervical',color:'#ce93d8',shape:'path',d:'M36,148 L28,200 L40,202 L50,150Z' },
    { id:'n-c6-i',   label:'C6 I (Pulgar)',panel:'cervical',color:'#ce93d8',shape:'path',d:'M164,148 L172,200 L160,202 L150,150Z' },
    { id:'n-c7-d',   label:'C7 D',   panel:'cervical', color:'#ba68c8', shape:'ellipse',cx:32,cy:182,rx:8,ry:12 },
    { id:'n-c7-i',   label:'C7 I',   panel:'cervical', color:'#ba68c8', shape:'ellipse',cx:168,cy:182,rx:8,ry:12 },
    { id:'n-l3-d',   label:'L3 D',   panel:'lumbar',   color:'#81d4fa', shape:'rect', x:62,y:215,w:22,h:30,rx:3 },
    { id:'n-l3-i',   label:'L3 I',   panel:'lumbar',   color:'#81d4fa', shape:'rect', x:116,y:215,w:22,h:30,rx:3 },
    { id:'n-l4-d',   label:'L4 D',   panel:'lumbar',   color:'#4fc3f7', shape:'rect', x:62,y:246,w:22,h:30,rx:3 },
    { id:'n-l4-i',   label:'L4 I',   panel:'lumbar',   color:'#4fc3f7', shape:'rect', x:116,y:246,w:22,h:30,rx:3 },
    { id:'n-l5-d',   label:'L5 D',   panel:'lumbar',   color:'#29b6f6', shape:'rect', x:63,y:294,w:16,h:65,rx:4 },
    { id:'n-l5-i',   label:'L5 I',   panel:'lumbar',   color:'#29b6f6', shape:'rect', x:121,y:294,w:16,h:65,rx:4 },
    { id:'n-s1-d',   label:'S1 D (Pie Lat)',panel:'lumbar',color:'#0288d1',shape:'ellipse',cx:64,cy:396,rx:14,ry:8 },
    { id:'n-s1-i',   label:'S1 I (Pie Lat)',panel:'lumbar',color:'#0288d1',shape:'ellipse',cx:136,cy:396,rx:14,ry:8 },
  ],
  back: [
    { id:'n-c5-d-p', label:'C5 D Post',panel:'cervical',color:'#e040fb',shape:'path',d:'M50,62 L38,138 L54,140 L66,80Z' },
    { id:'n-c5-i-p', label:'C5 I Post',panel:'cervical',color:'#e040fb',shape:'path',d:'M150,62 L162,138 L146,140 L134,80Z' },
    { id:'n-ciatico-d',label:'Ciático D',panel:'rodilla',color:'#ffcc02',shape:'rect',x:75,y:200,w:14,h:80,rx:4 },
    { id:'n-ciatico-i',label:'Ciático I',panel:'rodilla',color:'#ffcc02',shape:'rect',x:111,y:200,w:14,h:80,rx:4 },
    { id:'n-s1-d-p', label:'S1 D Post',panel:'lumbar',color:'#0288d1',shape:'ellipse',cx:66,cy:375,rx:13,ry:9 },
    { id:'n-s1-i-p', label:'S1 I Post',panel:'lumbar',color:'#0288d1',shape:'ellipse',cx:134,cy:375,rx:13,ry:9 },
    { id:'n-l4-d-p', label:'L4 D Post',panel:'lumbar',color:'#4fc3f7',shape:'rect',x:62,y:294,w:14,h:65,rx:4 },
    { id:'n-l4-i-p', label:'L4 I Post',panel:'lumbar',color:'#4fc3f7',shape:'rect',x:124,y:294,w:14,h:65,rx:4 },
  ],
  lat_d: [
    { id:'n-ciatico-lat-d',label:'Ciático Lat D',panel:'rodilla',color:'#ffcc02',shape:'rect',x:90,y:206,w:14,h:80,rx:4 },
  ],
  lat_i: [
    { id:'n-ciatico-lat-i',label:'Ciático Lat I',panel:'rodilla',color:'#ffcc02',shape:'rect',x:96,y:206,w:14,h:80,rx:4 },
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// BODY SILHOUETTE SVG PATHS (shared for all layers, same viewBox 200x440)
// ─────────────────────────────────────────────────────────────────────────────
const BODY_PATHS = {
  front: `
    <ellipse cx="100" cy="28" rx="22" ry="26" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <rect x="92" y="52" width="16" height="15" rx="4" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M66 67 Q55 72 52 92 L50 162 Q53 170 100 170 Q147 170 150 162 L148 92 Q145 72 134 67 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M52 70 L34 138 L50 140 L65 80 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M148 70 L166 138 L150 140 L135 80 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M34 148 L26 198 L44 200 L50 148 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M166 148 L174 198 L156 200 L150 148 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M50 168 L52 185 L100 185 L148 185 L150 168 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M70 188 L60 272 L84 274 L90 188 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M130 188 L140 272 L116 274 L110 188 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M60 290 L58 374 L84 374 L82 290 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M140 290 L142 374 L116 374 L118 290 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <ellipse cx="72" cy="388" rx="15" ry="8" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <ellipse cx="128" cy="388" rx="15" ry="8" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <ellipse cx="70" cy="404" rx="18" ry="8" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <ellipse cx="130" cy="404" rx="18" ry="8" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
  `,
  back: `
    <ellipse cx="100" cy="28" rx="22" ry="26" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <rect x="92" y="52" width="16" height="15" rx="4" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M66 67 Q55 72 52 92 L50 162 Q53 170 100 170 Q147 170 150 162 L148 92 Q145 72 134 67 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M52 70 L34 138 L50 140 L65 80 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M148 70 L166 138 L150 140 L135 80 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M34 148 L26 198 L44 200 L50 148 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M166 148 L174 198 L156 200 L150 148 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M50 168 L52 185 L100 185 L148 185 L150 168 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M70 188 L60 272 L84 274 L90 188 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M130 188 L140 272 L116 274 L110 188 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M60 290 L58 374 L84 374 L82 290 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M140 290 L142 374 L116 374 L118 290 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <ellipse cx="72" cy="388" rx="15" ry="8" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <ellipse cx="128" cy="388" rx="15" ry="8" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <ellipse cx="70" cy="404" rx="18" ry="8" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <ellipse cx="130" cy="404" rx="18" ry="8" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <line x1="98" y1="52" x2="98" y2="162" stroke="#2a2a2a" stroke-width="0.7" stroke-dasharray="3 3"/>
  `,
  lat_d: `
    <ellipse cx="100" cy="28" rx="18" ry="26" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <rect x="94" y="53" width="14" height="15" rx="3" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M82 66 Q76 72 74 92 L74 162 Q82 170 118 170 Q126 170 126 162 L126 92 Q124 72 118 66 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M126 70 L140 130 L128 135 L124 80 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M140 140 L145 198 L130 198 L126 145 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M76 168 L74 188 L124 188 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M80 190 L74 275 L100 278 L110 188 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M74 292 L70 374 L100 374 L100 292 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <ellipse cx="84" cy="387" rx="16" ry="8" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <ellipse cx="80" cy="403" rx="18" ry="8" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
  `,
  lat_i: `
    <ellipse cx="100" cy="28" rx="18" ry="26" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <rect x="92" y="53" width="14" height="15" rx="3" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M118 66 Q124 72 126 92 L126 162 Q118 170 82 170 Q74 170 74 162 L74 92 Q76 72 82 66 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M74 70 L60 130 L72 135 L76 80 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M60 140 L55 198 L70 198 L74 145 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M124 168 L126 188 L76 188 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M120 190 L126 275 L100 278 L90 188 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <path d="M126 292 L130 374 L100 374 L100 292 Z" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <ellipse cx="116" cy="387" rx="16" ry="8" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
    <ellipse cx="120" cy="403" rx="18" ry="8" fill="#1c1c1c" stroke="#333" stroke-width="1.2"/>
  `
};

// ─────────────────────────────────────────────────────────────────────────────
// SHEET MAP  (zone panel → modal id, matching existing kline.js SHEET_MAP)
// ─────────────────────────────────────────────────────────────────────────────
const SHEET_MAP = {
  hombro:'sheet-hombro', cervical:'sheet-cervical', lumbar:'sheet-lumbar',
  rodilla:'sheet-rodilla', tobillo:'sheet-tobillo', codo:'sheet-codo',
  cadera:'sheet-rodilla', gluteo:'sheet-rodilla', ingle:'sheet-groin',
  pantorrilla:'sheet-tobillo', pie:'sheet-tobillo', munieca:'sheet-hombro',
  dorsal:'sheet-lumbar'
};

// ─────────────────────────────────────────────────────────────────────────────
// REAL ANATOMY OVERRIDE — replaces front/back zone arrays with rnbh SVG paths
// ─────────────────────────────────────────────────────────────────────────────
(function injectAnatomy(){
  const A = window.ANATOMY_ZONES;
  if (!A) { console.warn('[ABC] ANATOMY_ZONES missing — falling back to geometric'); return; }
  const NEON_BY_LAYER = { art:'#39FF7A', mus:'#ff8a40', neu:'#4fc3f7' };
  function toShape(z){
    return {
      id: z.id, label: z.label, panel: z.panel,
      shape:'paths', paths: z.paths, slug: z.slug, side: z.side, layers: z.layers,
      view: z.view
    };
  }
  // ARTICULAR: only zones with 'art' layer
  ART_ZONES.front = A.front.filter(z => z.layers.includes('art')).map(toShape);
  ART_ZONES.back  = A.back .filter(z => z.layers.includes('art')).map(toShape);
  // MUSCULAR: only zones with 'mus' layer
  MUS_ZONES.front = A.front.filter(z => z.layers.includes('mus')).map(toShape);
  MUS_ZONES.back  = A.back .filter(z => z.layers.includes('mus')).map(toShape);
  // NEURAL stays geometric for now (rnbh has no nerve overlay)
  // BODY_PATHS overlay disabled for new viewBox (anatomy paths form the body)
  BODY_PATHS.front_anatomy = '';
  BODY_PATHS.back_anatomy  = '';
})();

// ─────────────────────────────────────────────────────────────────────────────
// ABC — main object
// ─────────────────────────────────────────────────────────────────────────────
const ABC = window.ABC = {
  state: { view:'front', layer:'articular', neuralSub:'derma', hovered:null },
  _longPressTimer: null,
  _lastTap: 0,

  // ── init ──────────────────────────────────────────────────────────────────
  init() {
    const root = document.getElementById('advanced-body-chart');
    if (!root) return;
    root.innerHTML = '';

    // Inject styles
    this._injectStyles();

    // Build layout
    root.innerHTML = `
      <div class="abc-wrap">
        <!-- Layer + view controls -->
        <div class="abc-controls">
          <div class="abc-ctrl-group">
            <span class="abc-ctrl-label">CAPA</span>
            <button class="abc-layer-btn active" data-layer="articular" onclick="ABC.setLayer('articular',this)">🦴 Articular</button>
            <button class="abc-layer-btn" data-layer="muscular"  onclick="ABC.setLayer('muscular',this)">💪 Muscular</button>
            <button class="abc-layer-btn" data-layer="neural"    onclick="ABC.setLayer('neural',this)">⚡ Neural</button>
          </div>
          <div class="abc-ctrl-group">
            <span class="abc-ctrl-label">VISTA</span>
            <button class="abc-view-btn active" data-view="front"  onclick="ABC.setView('front',this)">Frente</button>
            <button class="abc-view-btn" data-view="back"   onclick="ABC.setView('back',this)">Posterior</button>
            <button class="abc-view-btn" data-view="lat_d"  onclick="ABC.setView('lat_d',this)">Lat D</button>
            <button class="abc-view-btn" data-view="lat_i"  onclick="ABC.setView('lat_i',this)">Lat I</button>
          </div>
          <div class="abc-legend">
            <span class="abc-leg-dot" style="background:#ff4444"></span><span>Activo</span>
            <span class="abc-leg-dot" style="background:#39FF7A"></span><span>Recuperado</span>
            <span class="abc-leg-dot abc-leg-ring"></span><span>Historial</span>
          </div>
        </div>

        <!-- SVG canvas -->
        <div class="abc-canvas-wrap">
          <div class="abc-view-label" id="abc-view-label">VISTA FRONTAL</div>
          <svg id="abc-svg" class="abc-svg" viewBox="0 0 200 440" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="abc-glow-red">
                <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#ff4444" flood-opacity="0.9"/>
              </filter>
              <filter id="abc-glow-green">
                <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#39FF7A" flood-opacity="0.9"/>
              </filter>
              <filter id="abc-glow-amber">
                <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#FFB020" flood-opacity="0.9"/>
              </filter>
              <filter id="abc-glow-hover">
                <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#fff" flood-opacity="0.5"/>
              </filter>
            </defs>
            <g id="abc-body"></g>
            <g id="abc-zones"></g>
            <g id="abc-history-markers"></g>
          </svg>
        </div>

        <!-- Zone info strip -->
        <div class="abc-info-strip" id="abc-info-strip">
          <span id="abc-info-text" style="color:var(--text3);font-size:10px">Tocá una zona · Clic derecho o pulsación larga → opciones</span>
        </div>

        <!-- Active zones list -->
        <div class="abc-zones-list" id="abc-zones-list"></div>
      </div>

      <!-- Context menu -->
      <div class="abc-ctx-menu" id="abc-ctx-menu" style="display:none">
        <div class="abc-ctx-header" id="abc-ctx-header">Zona</div>
        <button class="abc-ctx-item" id="abc-ctx-mark"    onclick="ABC._ctxMark()">🔴 Marcar dolor activo</button>
        <button class="abc-ctx-item" id="abc-ctx-recover" onclick="ABC._ctxRecover()" style="display:none">✅ Marcar recuperado</button>
        <button class="abc-ctx-item" id="abc-ctx-sheet"   onclick="ABC._ctxSheet()">🔬 Abrir Tests</button>
        <button class="abc-ctx-item" id="abc-ctx-history" onclick="ABC._ctxHistory()">📅 Registrar antecedente</button>
        <button class="abc-ctx-item" id="abc-ctx-delete"  onclick="ABC._ctxDelete()" style="display:none;color:var(--red)">🗑️ Eliminar</button>
        <button class="abc-ctx-item abc-ctx-cancel"       onclick="ABC._closeCtx()">✕ Cancelar</button>
      </div>

      <!-- History form popover -->
      <div class="abc-hist-form" id="abc-hist-form" style="display:none">
        <div class="abc-hist-title" id="abc-hist-title">Antecedente — Zona</div>
        <label class="abc-hist-label">Fecha</label>
        <input class="abc-hist-inp" type="date" id="abc-hist-fecha">
        <label class="abc-hist-label">Nota</label>
        <textarea class="abc-hist-inp" id="abc-hist-nota" rows="3" placeholder="Diagnóstico, mecanismo, tratamiento..."></textarea>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-neon btn-sm" onclick="ABC._saveHistory()" style="flex:1">Guardar</button>
          <button class="btn btn-ghost btn-sm" onclick="ABC._closeHistForm()" style="flex:1">Cancelar</button>
        </div>
      </div>
    `;

    this.render();
    this._loadHistoryFromEvals();
    document.addEventListener('click', e => {
      if (!e.target.closest('#abc-ctx-menu') && !e.target.closest('#abc-svg'))
        this._closeCtx();
      if (!e.target.closest('#abc-hist-form') && !e.target.closest('#abc-ctx-menu'))
        this._closeHistForm();
    });
  },

  // ── render ─────────────────────────────────────────────────────────────────
  render() {
    this._renderBody();
    this._renderZones();
    this._renderHistory();
    this._renderZonesList();
    this._updateViewLabel();
  },

  _renderBody() {
    const g = document.getElementById('abc-body');
    if (!g) return;
    const svg = document.getElementById('abc-svg');
    const v = this.state.view;
    const useAnatomy = (v === 'front' || v === 'back') && window.ANATOMY_ZONES;
    if (useAnatomy) {
      svg.setAttribute('viewBox', window.ANATOMY_ZONES.viewBox); // 0 0 724 1448
      g.innerHTML = ''; // anatomy paths are the body
      // back: translate -724 0 on zones group
      const zonesG = document.getElementById('abc-zones');
      const histG  = document.getElementById('abc-history-markers');
      const tx = (v === 'back') ? 'translate(-724 0)' : '';
      if (zonesG) zonesG.setAttribute('transform', tx);
      if (histG)  histG.setAttribute('transform', tx);
    } else {
      svg.setAttribute('viewBox', '0 0 200 440');
      g.innerHTML = BODY_PATHS[v] || BODY_PATHS.front;
      const zonesG = document.getElementById('abc-zones');
      const histG  = document.getElementById('abc-history-markers');
      if (zonesG) zonesG.removeAttribute('transform');
      if (histG)  histG.removeAttribute('transform');
    }
  },

  _renderZones() {
    const g = document.getElementById('abc-zones');
    if (!g) return;
    const { view, layer } = this.state;
    const zoneSet = (layer === 'articular' ? ART_ZONES :
                     layer === 'muscular'  ? MUS_ZONES : NEURAL_ZONES)[view] || [];

    g.innerHTML = zoneSet.map(z => {
      const state = kineState?.bodyZones?.[z.id];
      const hist  = this._getHistory(z.id);
      const isActive    = state && !state.recuperado;
      const isRecovered = state?.recuperado;
      const isHistOnly  = !state && hist;

      let fill   = isActive    ? 'rgba(255,68,68,0.35)'  :
                   isRecovered ? 'rgba(57,255,122,0.25)' :
                   isHistOnly  ? 'rgba(255,176,32,0.15)' :
                   layer === 'neural' ? `${z.color || '#4fc3f7'}22` :
                   'rgba(255,255,255,0.04)';
      let stroke = isActive    ? '#ff4444' :
                   isRecovered ? '#39FF7A' :
                   isHistOnly  ? '#FFB020' :
                   layer === 'neural' ? (z.color || '#4fc3f7') :
                   '#444';
      let strokeW  = (isActive || isRecovered || isHistOnly) ? 1.5 : 0.6;
      let filter   = isActive ? 'url(#abc-glow-red)' : isRecovered ? 'url(#abc-glow-green)' : '';
      let opacity  = 1;

      const shapeEl = this._buildShape(z, fill, stroke, strokeW);

      return `<g class="abc-zone" data-id="${z.id}" data-label="${z.label}" data-panel="${z.panel || ''}"
                 style="cursor:pointer" ${filter ? `filter="${filter}"` : ''}
                 onmouseenter="ABC._onHover('${z.id}','${z.label}')"
                 onmouseleave="ABC._onLeave()"
                 onclick="ABC._onClick(event,'${z.id}','${z.label}','${z.panel||''}')"
                 oncontextmenu="ABC._onRightClick(event,'${z.id}','${z.label}','${z.panel||''}')"
                 ontouchstart="ABC._onTouchStart(event,'${z.id}','${z.label}','${z.panel||''}')"
                 ontouchend="ABC._onTouchEnd(event)">
               ${shapeEl}
               ${isHistOnly ? `<${z.shape==='ellipse'?'ellipse':'rect'} ${this._histDotAttr(z)} fill="none" stroke="#FFB020" stroke-width="2" stroke-dasharray="3 2"/>` : ''}
             </g>`;
    }).join('');
  },

  _buildShape(z, fill, stroke, sw) {
    const base = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" rx="${z.rx||0}"`;
    if (z.shape === 'ellipse')
      return `<ellipse cx="${z.cx}" cy="${z.cy}" rx="${z.rx}" ry="${z.ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    if (z.shape === 'rect')
      return `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="${z.rx||3}" ${base}/>`;
    if (z.shape === 'path')
      return `<path d="${z.d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    if (z.shape === 'paths') {
      // anatomy multi-path zone — scale strokeW for big viewBox
      const sw2 = Math.max(sw * 1.5, 1.2);
      return (z.paths||[]).map(d =>
        `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw2}" vector-effect="non-scaling-stroke"/>`
      ).join('');
    }
    return '';
  },

  _histDotAttr(z) {
    if (z.shape === 'ellipse') return `cx="${z.cx}" cy="${z.cy}" rx="${z.rx}" ry="${z.ry}"`;
    if (z.shape === 'rect')    return `x="${z.x-1}" y="${z.y-1}" width="${z.w+2}" height="${z.h+2}" rx="${z.rx||3}"`;
    if (z.shape === 'paths') return ''; // skip overlay; main shape already highlighted
    return '';
  },

  _renderHistory() {
    const g = document.getElementById('abc-history-markers');
    if (!g) return;
    const hist = cur?.kinesio?.history || {};
    const { view, layer } = this.state;
    const zoneSet = (layer === 'articular' ? ART_ZONES :
                     layer === 'muscular'  ? MUS_ZONES : NEURAL_ZONES)[view] || [];
    const dots = [];
    zoneSet.forEach(z => {
      const h = hist[z.id];
      if (!h) return;
      let cx, cy, r = 3.5;
      if (z.shape === 'paths' && z.paths && z.paths[0]) {
        const m = z.paths[0].match(/^[Mm]\s*([\d.\-]+)[\s,]+([\d.\-]+)/);
        if (m) { cx = parseFloat(m[1]); cy = parseFloat(m[2]); r = 10; }
      }
      if (cx == null) {
        cx = z.cx || (z.x != null ? z.x + z.w/2 : 100);
        cy = z.cy || (z.y != null ? z.y + z.h/2 : 220);
      }
      dots.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFB020" stroke="#000" stroke-width="1" opacity="0.85" title="${h.nota||''}"/>`);
    });
    g.innerHTML = dots.join('');
  },

  _renderZonesList() {
    const el = document.getElementById('abc-zones-list');
    if (!el) return;
    const zones = Object.entries(kineState?.bodyZones || {});
    if (!zones.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="abc-zl-title">Zonas marcadas</div>' +
      zones.map(([id, z]) => `
        <div class="abc-zl-item ${z.recuperado ? 'abc-zl-rec' : 'abc-zl-act'}">
          <span class="abc-zl-dot"></span>
          <span class="abc-zl-label">${z.label}</span>
          ${z.recuperado ? '<span class="abc-zl-badge">✅</span>' : `<span class="abc-zl-eva">EVA ${z.eva||0}</span>`}
          <button class="abc-zl-del" onclick="ABC._deleteZone('${id}')">✕</button>
        </div>
      `).join('');
  },

  _updateViewLabel() {
    const el = document.getElementById('abc-view-label');
    if (!el) return;
    const labels = { front:'VISTA FRONTAL', back:'VISTA POSTERIOR', lat_d:'LATERAL DERECHO', lat_i:'LATERAL IZQUIERDO' };
    el.textContent = labels[this.state.view] || '';
  },

  // ── interactions ──────────────────────────────────────────────────────────
  _onClick(e, id, label, panel) {
    e.stopPropagation();
    this._closeCtx();
    const zones = kineState?.bodyZones || {};
    if (!zones[id]) {
      // Mark as active pain
      kineState.bodyZones[id] = { label, eva: 0, recuperado: false };
      this._showInfo(`🔴 ${label} — marcado como dolor activo`);
    } else if (!zones[id].recuperado) {
      // Already active → open clinical sheet
      this._openSheet(panel, label);
      return;
    } else {
      // Recovered → delete
      delete kineState.bodyZones[id];
      this._showInfo(`${label} — eliminado`);
    }
    this.render();
    renderBodyZonesList && renderBodyZonesList();
  },

  _onRightClick(e, id, label, panel) {
    e.preventDefault();
    e.stopPropagation();
    this._showCtx(e.clientX, e.clientY, id, label, panel);
  },

  _onTouchStart(e, id, label, panel) {
    this._longPressTimer = setTimeout(() => {
      const t = e.touches[0];
      this._showCtx(t.clientX, t.clientY, id, label, panel);
    }, 600);
  },

  _onTouchEnd(e) {
    clearTimeout(this._longPressTimer);
  },

  _onHover(id, label) {
    this.state.hovered = id;
    this._showInfo(`${label}`);
    const g = document.querySelector(`[data-id="${id}"]`);
    if (g) g.style.filter = 'url(#abc-glow-hover)';
  },

  _onLeave() {
    if (this.state.hovered) {
      const g = document.querySelector(`[data-id="${this.state.hovered}"]`);
      if (g) {
        const zone = kineState?.bodyZones?.[this.state.hovered];
        g.style.filter = zone && !zone.recuperado ? 'url(#abc-glow-red)' :
                         zone?.recuperado ? 'url(#abc-glow-green)' : '';
      }
    }
    this.state.hovered = null;
    this._showInfo('');
  },

  _showInfo(txt) {
    const el = document.getElementById('abc-info-text');
    if (el) el.textContent = txt || 'Tocá una zona · Clic derecho o pulsación larga → opciones';
  },

  // ── context menu ──────────────────────────────────────────────────────────
  _ctxZone: null,

  _showCtx(x, y, id, label, panel) {
    this._ctxZone = { id, label, panel };
    const m = document.getElementById('abc-ctx-menu');
    const header = document.getElementById('abc-ctx-header');
    const btnMark    = document.getElementById('abc-ctx-mark');
    const btnRecover = document.getElementById('abc-ctx-recover');
    const btnDelete  = document.getElementById('abc-ctx-delete');
    const state = kineState?.bodyZones?.[id];

    if (header) header.textContent = label;
    if (btnMark)    btnMark.style.display    = state ? 'none' : '';
    if (btnRecover) btnRecover.style.display = (state && !state.recuperado) ? '' : 'none';
    if (btnDelete)  btnDelete.style.display  = state ? '' : 'none';

    // Position
    const rect = document.getElementById('advanced-body-chart').getBoundingClientRect();
    m.style.left = Math.min(x - rect.left, rect.width - 180) + 'px';
    m.style.top  = (y - rect.top + 4) + 'px';
    m.style.display = 'block';
  },

  _closeCtx() {
    const m = document.getElementById('abc-ctx-menu');
    if (m) m.style.display = 'none';
  },

  _ctxMark() {
    const { id, label } = this._ctxZone || {};
    if (!id) return;
    kineState.bodyZones[id] = { label, eva: 0, recuperado: false };
    this._closeCtx(); this.render();
    renderBodyZonesList && renderBodyZonesList();
  },

  _ctxRecover() {
    const { id } = this._ctxZone || {};
    if (!id || !kineState.bodyZones[id]) return;
    kineState.bodyZones[id].recuperado = true;
    this._closeCtx(); this.render();
    renderBodyZonesList && renderBodyZonesList();
  },

  _ctxSheet() {
    const { panel, label } = this._ctxZone || {};
    this._closeCtx();
    if (panel) this._openSheet(panel, label);
  },

  _ctxHistory() {
    const { id, label } = this._ctxZone || {};
    this._closeCtx();
    this._showHistForm(id, label);
  },

  _ctxDelete() {
    const { id } = this._ctxZone || {};
    if (!id) return;
    delete kineState.bodyZones[id];
    this._closeCtx(); this.render();
    renderBodyZonesList && renderBodyZonesList();
  },

  _deleteZone(id) {
    delete kineState.bodyZones[id];
    this.render();
    renderBodyZonesList && renderBodyZonesList();
  },

  // ── history form ──────────────────────────────────────────────────────────
  _histZone: null,

  _showHistForm(id, label) {
    this._histZone = { id, label };
    const f = document.getElementById('abc-hist-form');
    const t = document.getElementById('abc-hist-title');
    const d = document.getElementById('abc-hist-fecha');
    const n = document.getElementById('abc-hist-nota');
    if (t) t.textContent = `Antecedente — ${label}`;
    if (d) d.value = new Date().toISOString().split('T')[0];
    if (n) n.value = '';
    if (f) f.style.display = 'block';
  },

  _closeHistForm() {
    const f = document.getElementById('abc-hist-form');
    if (f) f.style.display = 'none';
    this._histZone = null;
  },

  _saveHistory() {
    const { id, label } = this._histZone || {};
    if (!id) return;
    const fecha = document.getElementById('abc-hist-fecha')?.value;
    const nota  = document.getElementById('abc-hist-nota')?.value || '';
    if (!cur) return;
    if (!cur.kinesio) cur.kinesio = {};
    if (!cur.kinesio.history) cur.kinesio.history = {};
    cur.kinesio.history[id] = { label, fecha, nota };
    this._closeHistForm();
    this.render();
    this._showInfo(`📅 Antecedente guardado: ${label}`);
  },

  _getHistory(id) {
    return cur?.kinesio?.history?.[id] || null;
  },

  // ── load history from evals ───────────────────────────────────────────────
  _loadHistoryFromEvals() {
    if (!cur?.evals) return;
    const hist = cur.kinesio?.history || {};
    cur.evals.forEach(ev => {
      if (!ev.zonas) return;
      Object.entries(ev.zonas).forEach(([id, z]) => {
        if (!hist[id]) {
          hist[id] = { label: z.label || id, fecha: ev.fecha || '', nota: '(historial auto)' };
        }
      });
    });
    if (cur.kinesio && Object.keys(hist).length) {
      cur.kinesio.history = hist;
    }
  },

  // ── open clinical sheet ───────────────────────────────────────────────────
  _openSheet(panel, label) {
    const sheetId = SHEET_MAP[panel];
    if (sheetId && typeof openModal === 'function') {
      openModal(sheetId);
      if (typeof initKlinicalSheet === 'function') initKlinicalSheet(panel);
    } else {
      // fallback: switch to tests tab and scroll
      if (typeof showKineTab === 'function') showKineTab('tests', document.getElementById('kstab-tests'));
      const panelEl = document.getElementById('tests-panel-' + panel);
      document.querySelectorAll('.kine-panel').forEach(p => p.classList.add('hidden'));
      if (panelEl) {
        panelEl.classList.remove('hidden');
        panelEl.scrollIntoView({ behavior: 'smooth' });
        const lbl = document.getElementById('kine-zona-label');
        if (lbl) lbl.textContent = label + ' — Tests activos';
      }
    }
  },

  // ── layer / view setters ──────────────────────────────────────────────────
  setLayer(layer, btn) {
    this.state.layer = layer;
    document.querySelectorAll('.abc-layer-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.render();
  },

  setView(view, btn) {
    this.state.view = view;
    document.querySelectorAll('.abc-view-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.render();
  },

  // ── styles ────────────────────────────────────────────────────────────────
  _injectStyles() {
    if (document.getElementById('abc-styles')) return;
    const s = document.createElement('style');
    s.id = 'abc-styles';
    s.textContent = `
      .abc-wrap { position:relative; display:flex; flex-direction:column; gap:12px; background:#000; border-radius:8px; padding:16px; border:1px solid #1e1e1e; }
      .abc-controls { display:flex; flex-wrap:wrap; gap:12px; align-items:center; padding-bottom:10px; border-bottom:1px solid #1e1e1e; }
      .abc-ctrl-group { display:flex; align-items:center; gap:4px; }
      .abc-ctrl-label { font-family:var(--mono); font-size:8px; text-transform:uppercase; letter-spacing:.12em; color:#555; margin-right:4px; }
      .abc-layer-btn, .abc-view-btn {
        padding:4px 12px; font-size:10px; font-family:var(--mono); font-weight:700;
        text-transform:uppercase; letter-spacing:.06em; border-radius:3px; cursor:pointer;
        background:#111; color:#666; border:1px solid #222; transition:all .15s;
      }
      .abc-layer-btn.active, .abc-view-btn.active { background:var(--neon); color:#000; border-color:var(--neon); }
      .abc-layer-btn:hover, .abc-view-btn:hover { border-color:#555; color:#ccc; }
      .abc-legend { display:flex; align-items:center; gap:6px; font-size:9px; color:#555; font-family:var(--mono); margin-left:auto; }
      .abc-leg-dot { display:inline-block; width:8px; height:8px; border-radius:50%; }
      .abc-leg-ring { background:transparent; border:2px dashed #FFB020; }
      .abc-canvas-wrap { display:flex; justify-content:center; position:relative; }
      .abc-svg { width:200px; height:440px; display:block; background:#000; border-radius:4px; }
      .abc-view-label { position:absolute; top:8px; left:50%; transform:translateX(-50%); font-family:var(--mono); font-size:8px; letter-spacing:.14em; color:#333; text-transform:uppercase; pointer-events:none; }
      .abc-info-strip { font-family:var(--mono); font-size:10px; color:var(--text3); min-height:18px; text-align:center; }
      .abc-zones-list { display:flex; flex-direction:column; gap:4px; }
      .abc-zl-title { font-family:var(--mono); font-size:8px; text-transform:uppercase; letter-spacing:.1em; color:#444; margin-bottom:4px; }
      .abc-zl-item { display:flex; align-items:center; gap:6px; padding:5px 10px; border-radius:3px; font-size:11px; background:#0e0e0e; }
      .abc-zl-act .abc-zl-dot { width:6px; height:6px; border-radius:50%; background:#ff4444; flex-shrink:0; }
      .abc-zl-rec .abc-zl-dot { width:6px; height:6px; border-radius:50%; background:#39FF7A; flex-shrink:0; }
      .abc-zl-label { flex:1; color:#ccc; }
      .abc-zl-eva { font-family:var(--mono); font-size:9px; color:#FFB020; }
      .abc-zl-badge { font-size:10px; }
      .abc-zl-del { background:none; border:none; color:#444; cursor:pointer; font-size:10px; padding:0 2px; }
      .abc-zl-del:hover { color:#ff4444; }
      /* Context menu */
      .abc-ctx-menu { position:absolute; z-index:9999; background:#0e0e0e; border:1px solid var(--neon); border-radius:6px; min-width:180px; box-shadow:0 8px 32px rgba(0,0,0,.8); overflow:hidden; }
      .abc-ctx-header { padding:7px 14px; font-family:var(--mono); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--neon); border-bottom:1px solid #1e1e1e; }
      .abc-ctx-item { display:block; width:100%; padding:8px 14px; background:none; border:none; text-align:left; font-size:11px; color:#ccc; cursor:pointer; font-family:var(--mono); }
      .abc-ctx-item:hover { background:#1a1a1a; color:#fff; }
      .abc-ctx-cancel { color:#555 !important; border-top:1px solid #1a1a1a; margin-top:2px; }
      /* History form */
      .abc-hist-form { position:absolute; z-index:9998; background:#0e0e0e; border:1px solid var(--border); border-radius:8px; padding:16px; width:260px; left:50%; top:50%; transform:translate(-50%,-50%); box-shadow:0 12px 40px rgba(0,0,0,.9); }
      .abc-hist-title { font-family:var(--mono); font-size:11px; font-weight:700; color:var(--neon); margin-bottom:12px; text-transform:uppercase; letter-spacing:.06em; }
      .abc-hist-label { font-size:9px; font-family:var(--mono); text-transform:uppercase; color:#555; letter-spacing:.08em; display:block; margin-bottom:4px; }
      .abc-hist-inp { width:100%; box-sizing:border-box; background:#181818; border:1px solid #2a2a2a; border-radius:4px; color:#ccc; padding:6px 8px; font-size:11px; font-family:var(--mono); margin-bottom:10px; }
      .abc-hist-inp:focus { outline:none; border-color:var(--neon); }
      /* Zone hover */
      .abc-zone:hover > * { opacity:.85; }
      .abc-zone { transition: filter .12s; }
    `;
    document.head.appendChild(s);
  }
};

})();

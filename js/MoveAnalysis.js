// MoveAnalysis.js — análisis de movimiento por video usando MediaPipe Pose
// Templates: sentadilla bipodal/unipodal, lunge, CMJ
// Vistas: front | side_l | side_r | back
// Output: ángulos por frame + flags asimetría/forma + KPIs

(function(){
'use strict';

// MediaPipe landmark indices (33 points, BlazePose)
const L = {
  NOSE:0, L_EYE:2, R_EYE:5, L_EAR:7, R_EAR:8,
  L_SHOULDER:11, R_SHOULDER:12, L_ELBOW:13, R_ELBOW:14,
  L_WRIST:15, R_WRIST:16,
  L_HIP:23, R_HIP:24, L_KNEE:25, R_KNEE:26,
  L_ANKLE:27, R_ANKLE:28, L_HEEL:29, R_HEEL:30,
  L_FOOT:31, R_FOOT:32
};

// 2D angle from 3 landmarks (degrees, 0-180)
function angle2D(a, b, c){
  if (!a || !b || !c) return null;
  const v1x = a.x - b.x, v1y = a.y - b.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const dot = v1x*v2x + v1y*v2y;
  const m1 = Math.hypot(v1x,v1y), m2 = Math.hypot(v2x,v2y);
  if (m1*m2 === 0) return null;
  const cos = Math.max(-1, Math.min(1, dot/(m1*m2)));
  return Math.acos(cos) * 180 / Math.PI;
}

// All useful joint angles for one frame
function allAngles(lm){
  return {
    knee_l:    angle2D(lm[L.L_HIP],      lm[L.L_KNEE],     lm[L.L_ANKLE]),
    knee_r:    angle2D(lm[L.R_HIP],      lm[L.R_KNEE],     lm[L.R_ANKLE]),
    hip_l:     angle2D(lm[L.L_SHOULDER], lm[L.L_HIP],      lm[L.L_KNEE]),
    hip_r:     angle2D(lm[L.R_SHOULDER], lm[L.R_HIP],      lm[L.R_KNEE]),
    ankle_l:   angle2D(lm[L.L_KNEE],     lm[L.L_ANKLE],    lm[L.L_FOOT]),
    ankle_r:   angle2D(lm[L.R_KNEE],     lm[L.R_ANKLE],    lm[L.R_FOOT]),
    elbow_l:   angle2D(lm[L.L_SHOULDER], lm[L.L_ELBOW],    lm[L.L_WRIST]),
    elbow_r:   angle2D(lm[L.R_SHOULDER], lm[L.R_ELBOW],    lm[L.R_WRIST]),
    shoulder_l:angle2D(lm[L.L_HIP],      lm[L.L_SHOULDER], lm[L.L_ELBOW]),
    shoulder_r:angle2D(lm[L.R_HIP],      lm[L.R_SHOULDER], lm[L.R_ELBOW]),
    // line-tilts (degrees from horizontal, signed)
    pelvis_tilt:    lineTilt(lm[L.L_HIP],      lm[L.R_HIP]),
    shoulder_tilt:  lineTilt(lm[L.L_SHOULDER], lm[L.R_SHOULDER]),
    trunk_lean:     trunkLeanLateral(midpoint(lm[L.L_HIP],lm[L.R_HIP]), midpoint(lm[L.L_SHOULDER],lm[L.R_SHOULDER])),
    // valgus index = knee X relative to hip-ankle line (signed, frontal view)
    valgus_l:  valgusIndex(lm[L.L_HIP], lm[L.L_KNEE], lm[L.L_ANKLE]),
    valgus_r:  valgusIndex(lm[L.R_HIP], lm[L.R_KNEE], lm[L.R_ANKLE])
  };
}

function midpoint(a,b){ return a&&b ? {x:(a.x+b.x)/2, y:(a.y+b.y)/2, z:((a.z||0)+(b.z||0))/2} : null; }
// desviación de la horizontal en grados, normalizada a -90..90 (sin importar dirección de la línea)
function lineTilt(a,b){
  if (!a||!b) return null;
  let t = Math.atan2(b.y-a.y, b.x-a.x) * 180 / Math.PI;
  while (t >  90) t -= 180;
  while (t < -90) t += 180;
  return t;
}
// inclinación tronco lateral (frente/dorso): desviación lateral del eje vertical, signo +derecha/-izquierda
function trunkLeanLateral(hip, shoulder){
  if (!hip || !shoulder) return null;
  const dx = shoulder.x - hip.x;
  const dy = shoulder.y - hip.y; // canvas y aumenta hacia abajo
  return Math.atan2(dx, -dy) * 180 / Math.PI;
}
// valgus: lateral deviation of knee from hip-ankle line (positive = medial = valgo)
function valgusIndex(hip, knee, ankle){
  if (!hip||!knee||!ankle) return null;
  const t = (knee.y - hip.y) / (ankle.y - hip.y);
  const expectedX = hip.x + t*(ankle.x - hip.x);
  return knee.x - expectedX; // sign depends on side L/R
}

// ── Templates ────────────────────────────────────────────────────────────
// Each template: { name, view_required[], analyze(angles_per_frame) → {kpis,flags} }

function lower(arr, v){ return arr.filter(x => x != null).reduce((a,b)=> Math.min(a,b), v); }
function upper(arr, v){ return arr.filter(x => x != null).reduce((a,b)=> Math.max(a,b), v); }
function avg(arr){ const c = arr.filter(x=>x!=null); return c.length ? c.reduce((a,b)=>a+b,0)/c.length : null; }

const TEMPLATES = {

  squat_bipodal: {
    name:'Sentadilla bipodal',
    analyze(frames, view){
      const flags = [];
      const kpis = {};
      const kneeL = frames.map(f => f.knee_l);
      const kneeR = frames.map(f => f.knee_r);
      kpis['Profundidad rodilla IZQ'] = lower(kneeL, 999).toFixed(0)+'°';
      kpis['Profundidad rodilla DER'] = lower(kneeR, 999).toFixed(0)+'°';
      const minL = lower(kneeL,999), minR = lower(kneeR,999);
      const asym = Math.abs(minL - minR);
      kpis['Asimetría profundidad'] = asym.toFixed(1)+'°';
      if (asym > 8) flags.push({lvl:'red', msg:`Asimetría profundidad rodilla ${asym.toFixed(0)}° (>8°)`});
      else if (asym > 4) flags.push({lvl:'amber', msg:`Asimetría leve profundidad ${asym.toFixed(1)}°`});

      if (view === 'front' || view === 'back'){
        // valgus dynamics
        const vL = frames.map(f => f.valgus_l).filter(x=>x!=null);
        const vR = frames.map(f => f.valgus_r).filter(x=>x!=null);
        const maxValL = Math.max(...vL.map(Math.abs));
        const maxValR = Math.max(...vR.map(Math.abs));
        kpis['Valgo máx IZQ'] = maxValL.toFixed(3);
        kpis['Valgo máx DER'] = maxValR.toFixed(3);
        if (maxValL > 0.04) flags.push({lvl:'red', msg:'Valgo dinámico rodilla IZQ marcado'});
        else if (maxValL > 0.02) flags.push({lvl:'amber', msg:'Valgo leve rodilla IZQ'});
        if (maxValR > 0.04) flags.push({lvl:'red', msg:'Valgo dinámico rodilla DER marcado'});
        else if (maxValR > 0.02) flags.push({lvl:'amber', msg:'Valgo leve rodilla DER'});

        // pelvis/shoulder tilt
        const pelvT = avg(frames.map(f => f.pelvis_tilt));
        const shouT = avg(frames.map(f => f.shoulder_tilt));
        if (pelvT != null && Math.abs(pelvT) > 4) flags.push({lvl:'amber', msg:`Inclinación pélvica ${pelvT.toFixed(1)}°`});
        if (shouT != null && Math.abs(shouT) > 4) flags.push({lvl:'amber', msg:`Caída de hombro ${shouT.toFixed(1)}°`});
      }
      if (view === 'side_l' || view === 'side_r'){
        const trunk = frames.map(f => f.trunk_lean).filter(x=>x!=null);
        const maxLean = Math.max(...trunk.map(Math.abs));
        kpis['Máx inclin. tronco'] = maxLean.toFixed(0)+'°';
        if (maxLean > 45) flags.push({lvl:'red', msg:`Tronco muy adelantado ${maxLean.toFixed(0)}°`});
        else if (maxLean > 30) flags.push({lvl:'amber', msg:`Tronco adelantado ${maxLean.toFixed(0)}°`});
      }

      // depth classification
      const deepest = Math.min(minL, minR);
      kpis['Profundidad'] = deepest < 90 ? '✅ Completa' : deepest < 110 ? '⚠ Parcial' : '❌ Cuarto';

      return { kpis, flags };
    }
  },

  squat_unipodal_l: {
    name:'Sentadilla unipodal IZQ',
    analyze(frames, view){
      const flags = [];
      const kpis = {};
      const knee = frames.map(f => f.knee_l);
      kpis['Profundidad'] = lower(knee, 999).toFixed(0)+'°';
      const minK = lower(knee, 999);
      kpis['Clasificación'] = minK < 100 ? '✅ Buena' : minK < 120 ? '⚠ Limitada' : '❌ Muy limitada';

      if (view === 'front' || view === 'back'){
        const v = frames.map(f => f.valgus_l).filter(x=>x!=null);
        const maxV = Math.max(...v.map(Math.abs));
        kpis['Valgo máx'] = maxV.toFixed(3);
        if (maxV > 0.05) flags.push({lvl:'red', msg:'Valgo dinámico marcado (valgo importante)'});
        else if (maxV > 0.025) flags.push({lvl:'amber', msg:'Valgo dinámico leve'});

        // Trendelenburg: pelvis drop hacia lado contralateral (DER cae)
        const pelvT = avg(frames.map(f => f.pelvis_tilt));
        if (pelvT != null){
          kpis['Tilt pélvico medio'] = pelvT.toFixed(1)+'°';
          if (Math.abs(pelvT) > 5) flags.push({lvl:'red', msg:`Trendelenburg (caída cadera contralateral) ${pelvT.toFixed(1)}°`});
          else if (Math.abs(pelvT) > 3) flags.push({lvl:'amber', msg:'Tilt pélvico leve (Trendelenburg compensado)'});
        }
      }
      if (view === 'side_l' || view === 'side_r'){
        const trunk = frames.map(f=>f.trunk_lean).filter(x=>x!=null);
        const maxLean = Math.max(...trunk.map(Math.abs));
        kpis['Inclin. tronco'] = maxLean.toFixed(0)+'°';
        if (maxLean > 35) flags.push({lvl:'amber', msg:`Tronco compensa ${maxLean.toFixed(0)}°`});
      }
      return { kpis, flags };
    }
  },

  squat_unipodal_r: {
    name:'Sentadilla unipodal DER',
    analyze(frames, view){
      // reuse logic mirrored
      const t = TEMPLATES.squat_unipodal_l.analyze(
        frames.map(f => ({...f, knee_l: f.knee_r, valgus_l: f.valgus_r, pelvis_tilt: -f.pelvis_tilt})),
        view
      );
      return t;
    }
  },

  lunge: {
    name:'Zancada',
    analyze(frames, view){
      const flags = [];
      const kpis = {};
      const minL = lower(frames.map(f=>f.knee_l), 999);
      const minR = lower(frames.map(f=>f.knee_r), 999);
      kpis['Rodilla adelante (mín)'] = Math.min(minL,minR).toFixed(0)+'°';
      const asym = Math.abs(minL - minR);
      kpis['Asimetría'] = asym.toFixed(1)+'°';
      if (asym > 10) flags.push({lvl:'red', msg:`Asimetría grande ${asym.toFixed(0)}°`});
      const trunk = frames.map(f=>f.trunk_lean).filter(x=>x!=null);
      if (trunk.length){
        const maxL = Math.max(...trunk.map(Math.abs));
        kpis['Máx tronco'] = maxL.toFixed(0)+'°';
        if (maxL > 25) flags.push({lvl:'amber', msg:`Tronco proyectado ${maxL.toFixed(0)}°`});
      }
      return { kpis, flags };
    }
  },

  cmj: {
    name:'Salto CMJ',
    analyze(frames, view){
      const flags = [];
      const kpis = {};
      // detect minimum knee (countermovement) and landing
      const allK = frames.map(f => Math.min(f.knee_l||999, f.knee_r||999));
      const minK = Math.min(...allK);
      kpis['Pre-stretch profundidad'] = minK.toFixed(0)+'°';
      if (minK > 110) flags.push({lvl:'amber', msg:'Pre-stretch poco profundo (>110°)'});
      // landing valgus check
      if (view === 'front'){
        const vL = Math.max(...frames.map(f => Math.abs(f.valgus_l||0)));
        const vR = Math.max(...frames.map(f => Math.abs(f.valgus_r||0)));
        if (Math.max(vL,vR) > 0.05) flags.push({lvl:'red', msg:'Valgo en aterrizaje'});
      }
      return { kpis, flags };
    }
  },

  free: {
    name:'Análisis libre',
    analyze(frames, view){
      const kpis = {};
      ['knee_l','knee_r','hip_l','hip_r','elbow_l','elbow_r'].forEach(k => {
        const arr = frames.map(f => f[k]).filter(x=>x!=null);
        if (arr.length){
          kpis[k+' min']  = Math.min(...arr).toFixed(0)+'°';
          kpis[k+' max']  = Math.max(...arr).toFixed(0)+'°';
        }
      });
      return { kpis, flags: [] };
    }
  },

  // ── TESTS CIENTÍFICOS ─────────────────────────────────────────────────

  // Overhead Squat — Cook FMS scoring 0-3
  // Ref: Cook G. Movement (2010). Criterios sobre frame de máx flexión.
  ohs: {
    name:'Overhead Squat (FMS)',
    analyze(frames, view){
      const kpis = {}, flags = [];
      const minK = Math.min(...frames.map(f => Math.min(f.knee_l||999, f.knee_r||999)));
      const maxLean = Math.max(...frames.map(f => Math.abs(f.trunk_lean||0)));
      const asym = Math.abs(lower(frames.map(f=>f.knee_l),999) - lower(frames.map(f=>f.knee_r),999));
      let score = 3;
      if (minK > 90) score--;             // sin profundidad completa
      if (maxLean > 30) score--;          // tronco muy adelantado
      if (asym > 8) score--;              // asimetría marcada
      if (view === 'front'){
        const valg = Math.max(...frames.map(f=>Math.max(Math.abs(f.valgus_l||0),Math.abs(f.valgus_r||0))));
        if (valg > 0.04) score = Math.min(score,1);
      }
      score = Math.max(0,score);
      kpis['Score FMS'] = score+'/3';
      kpis['Profundidad mín rodilla'] = minK.toFixed(0)+'°';
      kpis['Inclin. tronco máx'] = maxLean.toFixed(0)+'°';
      kpis['Asimetría'] = asym.toFixed(1)+'°';
      const lvl = score===3?'green':score>=2?'amber':'red';
      flags.push({lvl, msg:`Score FMS Overhead Squat: ${score}/3 — ${score===3?'óptimo':score===2?'compensaciones leves':score===1?'disfunción':'no logra'}`});
      return { kpis, flags };
    }
  },

  // Step Down Test — Park 2013, 5 criterios bilaterales
  // Ref: Park JS et al. JESF 2013. Trunk, pelvis, knee position, knee valgus, balance.
  step_down: {
    name:'Step Down (Park)',
    analyze(frames, view){
      const kpis = {}, flags = [];
      const valgL = Math.max(...frames.map(f=>Math.abs(f.valgus_l||0)));
      const valgR = Math.max(...frames.map(f=>Math.abs(f.valgus_r||0)));
      const pelvT = Math.max(...frames.map(f=>Math.abs(f.pelvis_tilt||0)));
      const shouT = Math.max(...frames.map(f=>Math.abs(f.shoulder_tilt||0)));
      const trunkLean = Math.max(...frames.map(f=>Math.abs(f.trunk_lean||0)));
      const minK = Math.min(...frames.map(f=>Math.min(f.knee_l||999,f.knee_r||999)));

      // 5 criterios Park
      const errs = [];
      if (trunkLean > 15) errs.push('Tronco no neutro');
      if (pelvT > 5) errs.push('Caída pélvica (Trendelenburg)');
      if (Math.max(valgL,valgR) > 0.04) errs.push('Valgo dinámico rodilla');
      if (shouT > 5) errs.push('Hombros desnivelados');
      if (minK > 100) errs.push('No alcanza profundidad');
      const score = 5 - errs.length;
      kpis['Score'] = score+'/5';
      kpis['Profundidad'] = minK.toFixed(0)+'°';
      kpis['Valgo IZQ'] = valgL.toFixed(3);
      kpis['Valgo DER'] = valgR.toFixed(3);
      kpis['Tilt pélvico'] = pelvT.toFixed(1)+'°';
      flags.push({lvl: score>=4?'green':score>=3?'amber':'red', msg:`Park Score: ${score}/5 — ${score>=4?'buena calidad':'requiere intervención'}`});
      errs.forEach(e => flags.push({lvl:'amber', msg:e}));
      return { kpis, flags };
    }
  },

  // Landing Error Scoring System — Padua 2009. 17 criterios drop-jump.
  // Implementación pragmática: detecta frame de IC (initial contact) por descenso brusco de pies
  drop_jump_less: {
    name:'Drop Jump LESS',
    analyze(frames, view){
      const kpis = {}, flags = [];
      // detectar IC = frame donde tobillos llegan a su Y máxima (más abajo en pantalla)
      let icIdx = 0, maxY = -Infinity;
      frames.forEach((f,i) => {
        const lm = f._lm; if (!lm) return;
        const ay = ((lm[L.L_ANKLE]?.y||0) + (lm[L.R_ANKLE]?.y||0))/2;
        if (ay > maxY){ maxY = ay; icIdx = i; }
      });
      const ic = frames[icIdx]; if (!ic){ kpis['Error']='Sin frames'; return {kpis,flags}; }

      const errors = [];
      // 1. Knee flexion at IC < 30° → error
      const kf = Math.min(ic.knee_l||180, ic.knee_r||180);
      if (kf > 150) errors.push('Poca flexión rodilla en IC');
      // 2. Hip flexion at IC < 30°
      const hf = Math.min(ic.hip_l||180, ic.hip_r||180);
      if (hf > 150) errors.push('Poca flexión cadera en IC');
      // 3. Trunk flexion < 30°
      if (Math.abs(ic.trunk_lean||0) < 10) errors.push('Tronco erecto (sin flexión)');
      // 4. Knee valgus at IC
      if (Math.max(Math.abs(ic.valgus_l||0), Math.abs(ic.valgus_r||0)) > 0.04) errors.push('Valgo dinámico en IC');
      // 5. Lateral trunk flexion
      if (Math.abs(ic.shoulder_tilt||0) > 5) errors.push('Inclinación lateral tronco');
      // 6. Asymmetric landing
      const asy = Math.abs((ic.knee_l||0)-(ic.knee_r||0));
      if (asy > 10) errors.push('Aterrizaje asimétrico');
      // 7. Feet rotation (proxy: pelvis_tilt)
      if (Math.abs(ic.pelvis_tilt||0) > 5) errors.push('Pelvis no nivelada');

      // After-IC: max knee flexion (depth)
      const post = frames.slice(icIdx, icIdx+15);
      const maxFlex = Math.min(...post.map(f=>Math.min(f.knee_l||180,f.knee_r||180)));
      // 8. Knee flexion displacement < 45°
      if ((kf - maxFlex) < 45) errors.push('Absorción insuficiente (<45° flexión rodilla)');
      // 9. Trunk flexion displacement
      const maxTrunk = Math.max(...post.map(f=>Math.abs(f.trunk_lean||0)));
      if ((maxTrunk - Math.abs(ic.trunk_lean||0)) < 20) errors.push('Tronco no absorbe');

      const score = errors.length;
      const risk = score >= 6 ? 'ALTO RIESGO ACL' : score >= 4 ? 'Riesgo moderado' : 'Bajo riesgo';
      kpis['LESS Score'] = score + '/17';
      kpis['Riesgo'] = risk;
      kpis['Frame IC'] = icIdx;
      kpis['Flex rodilla IC'] = kf.toFixed(0)+'°';
      kpis['Flex rodilla máx'] = maxFlex.toFixed(0)+'°';
      flags.push({lvl: score>=6?'red':score>=4?'amber':'green', msg:`LESS: ${score} errores · ${risk}`});
      errors.forEach(e => flags.push({lvl:'amber', msg:e}));
      return { kpis, flags };
    }
  },

  // Tuck Jump Assessment — Myer 2008. 10 criterios sobre múltiples saltos consecutivos.
  tuck_jump: {
    name:'Tuck Jump (Myer)',
    analyze(frames, view){
      const kpis = {}, flags = [];
      const errors = [];
      // 1. Lower extremity valgus at landing
      const maxVal = Math.max(...frames.map(f=>Math.max(Math.abs(f.valgus_l||0),Math.abs(f.valgus_r||0))));
      if (maxVal > 0.04) errors.push('Valgo en aterrizaje');
      // 2. Thighs do not reach parallel (peak height)
      const maxKneeFlex = Math.min(...frames.map(f=>Math.min(f.knee_l||180,f.knee_r||180)));
      if (maxKneeFlex > 100) errors.push('Muslos no llegan a paralelo');
      // 3. Foot placement not shoulder-width (proxy: pelvis distance vs ankle distance)
      const lastFr = frames[frames.length-1]; const lm = lastFr?._lm;
      if (lm){
        const hipW = Math.abs(lm[L.L_HIP].x - lm[L.R_HIP].x);
        const ankW = Math.abs(lm[L.L_ANKLE].x - lm[L.R_ANKLE].x);
        if (Math.abs(ankW - hipW) > 0.06) errors.push('Pies fuera de ancho hombros');
      }
      // 4. Foot contact symmetry (compare ankle Y at peaks)
      const askL = frames.map(f => f._lm?.[L.L_ANKLE]?.y||0);
      const askR = frames.map(f => f._lm?.[L.R_ANKLE]?.y||0);
      const diff = Math.abs(Math.max(...askL) - Math.max(...askR));
      if (diff > 0.03) errors.push('Aterrizaje asimétrico pies');
      // 5. Excessive landing noise (proxy: low knee flex absorption)
      if ((180 - maxKneeFlex) < 60) errors.push('Aterrizaje rígido (poca absorción)');
      // 6. Pause between jumps (skip - requiere análisis temporal)
      // 7. Trunk position lateral
      const maxShouT = Math.max(...frames.map(f=>Math.abs(f.shoulder_tilt||0)));
      if (maxShouT > 5) errors.push('Inclinación tronco lateral');
      // 8. Technique decline over time (skip - simplificado)

      const score = errors.length;
      kpis['Tuck Jump errores'] = score + '/8';
      kpis['Valgo máx'] = maxVal.toFixed(3);
      kpis['Profundidad rodilla'] = maxKneeFlex.toFixed(0)+'°';
      flags.push({lvl: score>=4?'red':score>=2?'amber':'green', msg:`Tuck Jump: ${score}/8 errores ${score>=4?'(alto riesgo)':''}`});
      errors.forEach(e => flags.push({lvl:'amber', msg:e}));
      return { kpis, flags };
    }
  },

  // Single Hop — Noyes 1991. Distancia se mide manualmente, este analiza calidad técnica
  hop_test_l: {
    name:'Single Hop IZQ',
    analyze(frames, view){
      return TEMPLATES._hop_analyze(frames, view, 'L');
    }
  },
  hop_test_r: {
    name:'Single Hop DER',
    analyze(frames, view){
      return TEMPLATES._hop_analyze(frames, view, 'R');
    }
  },
  // FMS items adicionales (Cook 2010, scoring 0-3)
  inline_lunge: { name:'In-Line Lunge', analyze(frames,view){
    const f={},k={};const lean=Math.max(...frames.map(x=>Math.abs(x.trunk_lean||0)));
    const minK=Math.min(...frames.map(x=>Math.min(x.knee_l||180,x.knee_r||180)));
    const asym=Math.abs(lower(frames.map(x=>x.knee_l),999)-lower(frames.map(x=>x.knee_r),999));
    let s=3; if(lean>20)s--; if(minK>100)s--; if(asym>10)s--;
    k['Score FMS']=Math.max(0,s)+'/3'; k['Tronco máx']=lean.toFixed(0)+'°'; k['Asim rodilla']=asym.toFixed(1)+'°';
    return {kpis:k, flags:[{lvl:s>=2?'green':'amber',msg:`In-Line Lunge: ${Math.max(0,s)}/3`}]};
  }},
  hurdle_step: { name:'Hurdle Step', analyze(frames,view){
    const k={};const maxHip=Math.max(...frames.map(x=>180-(x.hip_l||180)));
    const lean=Math.max(...frames.map(x=>Math.abs(x.trunk_lean||0)));
    let s=3; if(maxHip<60)s--; if(lean>15)s--;
    k['Score FMS']=Math.max(0,s)+'/3'; k['Flex cadera máx']=maxHip.toFixed(0)+'°';
    return {kpis:k, flags:[{lvl:s>=2?'green':'amber',msg:`Hurdle Step: ${Math.max(0,s)}/3`}]};
  }},
  aslr: { name:'Active SLR', analyze(frames,view){
    const k={};const maxHip=Math.max(...frames.map(x=>180-Math.min(x.hip_l||180,x.hip_r||180)));
    let s=3; if(maxHip<70)s--; if(maxHip<50)s--;
    k['Score FMS']=Math.max(0,s)+'/3'; k['Flex cadera máx']=maxHip.toFixed(0)+'°';
    return {kpis:k, flags:[{lvl:s>=2?'green':'amber',msg:`ASLR: ${Math.max(0,s)}/3`}]};
  }},
  shoulder_mob: { name:'Shoulder Mobility', analyze(frames,view){
    const k={}; const sl=Math.min(...frames.map(x=>x.shoulder_l||180));
    const sr=Math.min(...frames.map(x=>x.shoulder_r||180));
    k['Hombro IZQ mín']=sl.toFixed(0)+'°'; k['Hombro DER mín']=sr.toFixed(0)+'°';
    return {kpis:k, flags:[{lvl:'green',msg:'Distancia puños = medir manualmente con cinta'}]};
  }},
  pushup: { name:'Trunk Stab Push-up', analyze(frames,view){
    const k={};const trunkRange=Math.max(...frames.map(x=>Math.abs(x.trunk_lean||0)))-Math.min(...frames.map(x=>Math.abs(x.trunk_lean||0)));
    let s=3; if(trunkRange>10)s--; if(trunkRange>20)s--;
    k['Score FMS']=Math.max(0,s)+'/3'; k['Variación tronco']=trunkRange.toFixed(0)+'°';
    return {kpis:k, flags:[{lvl:s>=2?'green':'amber',msg:`Push-up estabilidad: ${Math.max(0,s)}/3`}]};
  }},
  ybalance: { name:'Y-Balance', analyze(frames,view){
    const k={}; k['Anterior reach']='medir manual cm';
    k['Posterolateral']='medir manual cm'; k['Posteromedial']='medir manual cm';
    return {kpis:k, flags:[{lvl:'green',msg:'Y-Balance: distancias en cm. Composite = (A+PM+PL)/(3×leg_length)×100'}]};
  }},
  triple_hop_l: { name:'Triple Hop IZQ', analyze(f,v){return TEMPLATES._hop_analyze(f,v,'L');}},
  triple_hop_r: { name:'Triple Hop DER', analyze(f,v){return TEMPLATES._hop_analyze(f,v,'R');}},
  pistol_l: { name:'Pistol IZQ', analyze(f,v){return TEMPLATES.squat_unipodal_l.analyze(f,v);}},
  pistol_r: { name:'Pistol DER', analyze(f,v){return TEMPLATES.squat_unipodal_r.analyze(f,v);}},

  _hop_analyze(frames, view, side){
    const kpis = {}, flags = [];
    const ksuf = side === 'L' ? 'knee_l' : 'knee_r';
    const vsuf = side === 'L' ? 'valgus_l' : 'valgus_r';
    const minK = Math.min(...frames.map(f=>f[ksuf]||180));
    const maxV = Math.max(...frames.map(f=>Math.abs(f[vsuf]||0)));
    const lean = Math.max(...frames.map(f=>Math.abs(f.trunk_lean||0)));
    kpis['Profundidad rodilla'] = minK.toFixed(0)+'°';
    kpis['Valgo máx aterrizaje'] = maxV.toFixed(3);
    kpis['Inclin. tronco máx'] = lean.toFixed(0)+'°';
    if (maxV > 0.05) flags.push({lvl:'red', msg:'Valgo en aterrizaje'});
    if (lean > 25) flags.push({lvl:'amber', msg:'Tronco compensa lateralmente'});
    flags.push({lvl:'green', msg:'Distancia: medirla manualmente y registrar LSI vs lado contralateral'});
    return { kpis, flags };
  }
};

// ── Pose detector setup ────────────────────────────────────────────────
let poseLandmarker = null;
let poseReady = false;

async function initPose(){
  if (poseReady) return;
  MA._setStatus('Cargando MediaPipe…');
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.10/+esm');
    const { PoseLandmarker, FilesetResolver } = mod;
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.10/wasm'
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.6,
      minPosePresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
      outputSegmentationMasks: false
    });
    poseReady = true;
    MA._setStatus('MediaPipe listo. Subí video y dale Analizar.');
  } catch(e){
    console.error('[MA] init error', e);
    MA._setStatus('Error cargando MediaPipe: '+e.message);
  }
}

// ── Main module ─────────────────────────────────────────────────────────
const MA = window.MA = {
  _video: null,
  _canvas: null,
  _ctx: null,
  _frames: [],
  _last: null,
  _stream: null,

  loadVideo(file){
    if (!file) return;
    const v = document.getElementById('ma-video');
    v.src = URL.createObjectURL(file);
    v.load();
    document.getElementById('ma-analyze-btn').disabled = false;
    this._setStatus('Video listo. Dale ▶ Analizar.');
    this._stopWebcam();
  },

  async useWebcam(){
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({ video:{ width:1280, height:720 } });
      const v = document.getElementById('ma-video');
      v.srcObject = this._stream;
      await v.play();
      this._setStatus('Webcam activa. Live tracking ON');
      this._liveLoop();
    } catch(e){ alert('No se pudo abrir webcam: '+e.message); }
  },

  _stopWebcam(){
    if (this._stream){ this._stream.getTracks().forEach(t=>t.stop()); this._stream=null; }
  },

  async analyze(){
    if (!poseReady) await initPose();
    if (!poseReady) return;
    const v = document.getElementById('ma-video');
    if (!v.duration || isNaN(v.duration)){ alert('Video no cargado'); return; }
    this._video = v; this._setupCanvas();
    this._frames = [];

    const fps = 10;
    const total = Math.floor(v.duration * fps);
    let frame = 0;
    this._setStatus(`Procesando 0/${total}…`);
    v.pause();
    v.currentTime = 0;
    await new Promise(r => v.onseeked = r);

    const tick = async () => {
      if (frame >= total){ this._finish(); return; }
      const t = frame / fps;
      v.currentTime = t;
      await new Promise(r => { v.onseeked = r; });
      const key = Math.round(v.currentTime * 30);
      let lm = this._overrides && this._overrides[key];
      if (!lm){
        const result = poseLandmarker.detectForVideo(v, performance.now());
        if (result?.landmarks?.[0]) lm = result.landmarks[0];
      }
      if (lm){
        const a = allAngles(lm);
        a._t = t; a._lm = lm;
        this._frames.push(a);
        this._draw(lm);
      }
      frame++;
      this._setStatus(`Procesando ${frame}/${total}…`);
      setTimeout(tick, 0);
    };
    tick();
  },

  _liveLoop(){
    if (!this._stream) return;
    const v = document.getElementById('ma-video');
    this._video = v; this._setupCanvas();
    const loop = async () => {
      if (!this._stream) return;
      if (!poseReady){ await initPose(); }
      if (poseReady && v.readyState >= 2){
        const result = poseLandmarker.detectForVideo(v, performance.now());
        if (result?.landmarks?.[0]) this._draw(result.landmarks[0]);
      }
      requestAnimationFrame(loop);
    };
    loop();
  },

  _setupCanvas(){
    const c = document.getElementById('ma-canvas');
    const v = document.getElementById('ma-video');
    this._canvas = c; this._ctx = c.getContext('2d');
    this._video = v;
    this._overrides = this._overrides || {};
    this._fitCanvas();
    if (!this._evtBound){
      window.addEventListener('resize', () => this._fitCanvas(), { passive:true });
      // pause/play → toggle edit mode + run pose on current frame
      v.addEventListener('pause', () => this._enterEditMode());
      v.addEventListener('play',  () => this._exitEditMode());
      v.addEventListener('seeked', () => this._onSeeked());
      // edit drag
      c.style.pointerEvents = 'none'; // default canvas no clicks (lo manejamos via overlay div)
      // overlay invisible div for events
      let ov = document.getElementById('ma-edit-ov');
      if (!ov){
        ov = document.createElement('div');
        ov.id = 'ma-edit-ov';
        ov.style.cssText = 'position:absolute;inset:0;cursor:crosshair;display:none';
        c.parentElement.appendChild(ov);
        ov.addEventListener('mousedown', e => this._dragStart(e));
        ov.addEventListener('mousemove', e => this._dragMove(e));
        ov.addEventListener('mouseup',   e => this._dragEnd(e));
        ov.addEventListener('mouseleave',e => this._dragEnd(e));
        // touch
        ov.addEventListener('touchstart', e => { e.preventDefault(); this._dragStart(e.touches[0]); }, {passive:false});
        ov.addEventListener('touchmove',  e => { e.preventDefault(); this._dragMove(e.touches[0]); }, {passive:false});
        ov.addEventListener('touchend',   e => this._dragEnd(e));
      }
      // wheel scrub: mouse wheel sobre video = step ±1 frame
      const wrap = v.parentElement;
      wrap.addEventListener('wheel', e => {
        if (!v.duration) return;
        e.preventDefault();
        v.pause();
        const dir = Math.sign(e.deltaY);
        v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + dir/30));
      }, { passive:false });
      // drag scrub horizontal sobre video (cuando NO está en edit mode)
      let scrubbing = false, sx = 0, st = 0;
      wrap.addEventListener('mousedown', e => {
        if (this._editMode) return;
        scrubbing = true; sx = e.clientX; st = v.currentTime; v.pause();
      });
      window.addEventListener('mousemove', e => {
        if (!scrubbing || !v.duration) return;
        const dx = e.clientX - sx;
        const w = wrap.clientWidth || 1;
        v.currentTime = Math.max(0, Math.min(v.duration, st + (dx / w) * v.duration));
      });
      window.addEventListener('mouseup', () => scrubbing = false);

      this._evtBound = true;
      this._injectStepControls();
    }
  },

  _injectStepControls(){
    if (document.getElementById('ma-steps')) return;
    const html = `
      <div id="ma-steps" style="display:flex;gap:6px;justify-content:center;align-items:center;padding:6px;background:var(--bg1);border-top:1px solid var(--border);font-size:11px">
        <button class="btn btn-ghost btn-sm" onclick="MA.stepFrame(-5)">⏪ -5</button>
        <button class="btn btn-ghost btn-sm" onclick="MA.stepFrame(-1)">◀ -1</button>
        <button class="btn btn-neon btn-sm" onclick="MA.togglePlay()">⏯ Play/Pause</button>
        <button class="btn btn-ghost btn-sm" onclick="MA.stepFrame(1)">▶ +1</button>
        <button class="btn btn-ghost btn-sm" onclick="MA.stepFrame(5)">⏩ +5</button>
        <span style="flex:1"></span>
        <button class="btn btn-ghost btn-sm" onclick="MA.detectCurrentFrame()" title="Re-detectar pose en frame actual">🔄 Re-detectar</button>
      </div>`;
    const wrap = this._video.parentElement;
    wrap.insertAdjacentHTML('afterend', html);
  },

  togglePlay(){
    const v = this._video;
    if (v.paused) v.play(); else v.pause();
  },

  stepFrame(n){
    const v = this._video;
    v.pause();
    const fps = 30; // approx
    v.currentTime = Math.max(0, Math.min(v.duration||1e6, v.currentTime + n/fps));
  },

  async detectCurrentFrame(){
    if (!poseReady){ await initPose(); }
    if (!poseReady) return;
    const v = this._video;
    const result = poseLandmarker.detectForVideo(v, performance.now());
    if (result?.landmarks?.[0]){
      this._lastLm = result.landmarks[0];
      const key = this._frameKey();
      delete this._overrides[key]; // forzar re-detect
      this._draw(this._lastLm);
    }
  },

  _frameKey(){
    return Math.round(this._video.currentTime * 30);
  },

  async _enterEditMode(){
    this._editMode = true;
    const ov = document.getElementById('ma-edit-ov');
    if (ov) ov.style.display = 'block';
    // detect pose en frame actual si no hay override
    const key = this._frameKey();
    if (this._overrides[key]){
      this._lastLm = this._overrides[key];
    } else if (poseReady){
      const r = poseLandmarker.detectForVideo(this._video, performance.now());
      if (r?.landmarks?.[0]) this._lastLm = r.landmarks[0];
    }
    if (this._lastLm) this._draw(this._lastLm);
  },

  _exitEditMode(){
    this._editMode = false;
    this._dragIdx = null;
    const ov = document.getElementById('ma-edit-ov');
    if (ov) ov.style.display = 'none';
  },

  _onSeeked(){
    const key = this._frameKey();
    if (this._overrides[key]){
      this._lastLm = this._overrides[key];
      this._draw(this._lastLm);
    } else if (this._editMode && poseReady){
      const r = poseLandmarker.detectForVideo(this._video, performance.now());
      if (r?.landmarks?.[0]){ this._lastLm = r.landmarks[0]; this._draw(this._lastLm); }
    }
  },

  _dragStart(e){
    if (!this._editMode || !this._lastLm || !this._lastDraw) return;
    const c = this._canvas;
    const rect = c.getBoundingClientRect();
    const px = (e.clientX - rect.left), py = (e.clientY - rect.top);
    const o = this._lastDraw.o;
    let best = -1, bestD = 25*25; // 25px radius
    this._lastLm.forEach((p,i) => {
      if (!p) return;
      const x = o.dx + p.x*o.dw, y = o.dy + p.y*o.dh;
      const d = (px-x)*(px-x) + (py-y)*(py-y);
      if (d < bestD){ bestD = d; best = i; }
    });
    if (best >= 0){ this._dragIdx = best; this._dragMove(e); }
  },

  _dragMove(e){
    if (!this._editMode || this._dragIdx == null || !this._lastLm) return;
    const c = this._canvas;
    const rect = c.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const o = this._lastDraw.o;
    const nx = (px - o.dx) / o.dw, ny = (py - o.dy) / o.dh;
    this._lastLm[this._dragIdx] = { ...this._lastLm[this._dragIdx], x:nx, y:ny };
    this._draw(this._lastLm);
  },

  _dragEnd(){
    if (this._dragIdx == null) return;
    // persistir override en el frame actual
    const key = this._frameKey();
    this._overrides[key] = this._lastLm.map(p => p ? {...p} : p);
    this._dragIdx = null;
    this._draw(this._lastLm);
  },

  // calcula área DISPLAYED del video (cuenta letterboxing por object-fit:contain)
  _fitCanvas(){
    const v = this._video, c = this._canvas;
    if (!v || !c) return;
    const cw = v.clientWidth, ch = v.clientHeight;
    const vw = v.videoWidth || 1280, vh = v.videoHeight || 720;
    c.width = cw; c.height = ch;
    const vAR = vw/vh, cAR = cw/ch;
    let dw, dh, dx, dy;
    if (vAR > cAR){ dw = cw; dh = cw/vAR; dx = 0; dy = (ch-dh)/2; }
    else          { dh = ch; dw = ch*vAR; dy = 0; dx = (cw-dw)/2; }
    c._off = { dx, dy, dw, dh };
  },

  _draw(lm){
    const ctx = this._ctx; if (!ctx) return;
    this._fitCanvas();
    const o = this._canvas._off || { dx:0, dy:0, dw:this._canvas.width, dh:this._canvas.height };
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    const X = p => o.dx + p.x * o.dw;
    const Y = p => o.dy + p.y * o.dh;
    this._lastLm = lm;
    this._lastDraw = { o, X, Y };

    // arcos angulares (pie slice estilo) en articulaciones clave
    const JOINTS = [
      [L.L_HIP,L.L_KNEE,L.L_ANKLE, '#39FF7A'],
      [L.R_HIP,L.R_KNEE,L.R_ANKLE, '#39FF7A'],
      [L.L_SHOULDER,L.L_HIP,L.L_KNEE, '#5dd4ff'],
      [L.R_SHOULDER,L.R_HIP,L.R_KNEE, '#5dd4ff'],
      [L.L_SHOULDER,L.L_ELBOW,L.L_WRIST, '#ffb020'],
      [L.R_SHOULDER,L.R_ELBOW,L.R_WRIST, '#ffb020']
    ];
    JOINTS.forEach(([a,b,c,col]) => this._drawAngleArc(lm[a],lm[b],lm[c],col,X,Y));

    // skeleton lines
    const PAIRS = [
      [11,13],[13,15],[12,14],[14,16], [11,12],[11,23],[12,24],[23,24],
      [23,25],[25,27],[24,26],[26,28], [27,31],[28,32],[27,29],[28,30]
    ];
    // skeleton: línea sutil con leve glow
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(57,255,122,.6)'; ctx.shadowBlur = 4;
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(57,255,122,.95)';
    PAIRS.forEach(([a,b]) => {
      const A = lm[a], B = lm[b]; if (!A||!B) return;
      ctx.beginPath();
      ctx.moveTo(X(A), Y(A)); ctx.lineTo(X(B), Y(B));
      ctx.stroke();
    });
    ctx.shadowBlur = 0;

    // landmarks: pequeños y limpios. Cara: solo nariz (skip 1-10).
    const SKIP_FACE = new Set([1,2,3,4,5,6,7,8,9,10]);
    const editing = this._editMode;
    lm.forEach((p,i) => {
      if(!p) return;
      if (SKIP_FACE.has(i)) return; // ojos/orejas/boca fuera
      ctx.beginPath();
      ctx.arc(X(p), Y(p), editing ? 6.5 : 2.2, 0, Math.PI*2);
      ctx.fillStyle = editing ? (this._dragIdx === i ? '#ffb020' : '#fff') : 'rgba(255,255,255,.95)';
      ctx.fill();
      if (editing){ ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.stroke(); }
    });

    if (editing){
      ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#ffb020';
      ctx.fillText('✎ EDIT MODE — arrastrá puntos para corregir', 10, 22);
    }
  },

  // dibuja arco angular tipo pie slice con label grande
  _drawAngleArc(A,B,C,col,X,Y){
    if (!A||!B||!C) return;
    const ctx = this._ctx;
    const ang = angle2D(A,B,C); if (ang==null) return;
    const a1 = Math.atan2(Y(A)-Y(B), X(A)-X(B));
    const a2 = Math.atan2(Y(C)-Y(B), X(C)-X(B));
    const r = Math.hypot(X(A)-X(B), Y(A)-Y(B)) * 0.55;
    // fill pie slice
    ctx.beginPath();
    ctx.moveTo(X(B), Y(B));
    // detect angular direction (short way)
    let start = a1, end = a2;
    let diff = end - start;
    while (diff > Math.PI)  diff -= 2*Math.PI;
    while (diff < -Math.PI) diff += 2*Math.PI;
    ctx.arc(X(B), Y(B), r, start, start+diff, diff < 0);
    ctx.closePath();
    ctx.fillStyle = col + '22';
    ctx.fill();
    ctx.strokeStyle = col + 'cc'; ctx.lineWidth = 1.2; ctx.stroke();
    // label compacto con bg pill
    const midA = start + diff/2;
    const lx = X(B) + Math.cos(midA) * (r*0.6);
    const ly = Y(B) + Math.sin(midA) * (r*0.6);
    const txt = `${Math.round(ang)}°`;
    ctx.font = '600 12px ui-monospace,SFMono-Regular,Menlo,monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(txt).width;
    ctx.fillStyle = 'rgba(0,0,0,.78)';
    this._roundRect(lx - tw/2 - 5, ly - 9, tw + 10, 18, 4);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.fillText(txt, lx, ly);
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  },

  _roundRect(x,y,w,h,r){
    const ctx = this._ctx;
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  },

  _finish(){
    const ex = document.getElementById('ma-exercise').value;
    const view = document.getElementById('ma-view').value;
    const tpl = TEMPLATES[ex] || TEMPLATES.free;
    const result = tpl.analyze(this._frames, view);
    // filtrar KPIs/flags no aplicables a la vista
    const filtered = this._filterByView(result, view);
    this._last = { exercise: ex, view, ts: new Date().toISOString(), kpis: filtered.kpis, flags: filtered.flags, framesCount: this._frames.length };
    this._renderResults(filtered);
    this._setStatus(`Analizado. ${this._frames.length} frames procesados.`);
  },

  _filterByView(result, view){
    const isLateral = view === 'side_l' || view === 'side_r';
    const isFrontal = view === 'front' || view === 'back';
    const out = { kpis:{}, flags: result.flags.slice() };
    Object.entries(result.kpis).forEach(([k,v]) => {
      const kl = k.toLowerCase();
      // valgo, asimetría rodillas, tilt pélvico/hombros = SOLO frontal/posterior
      if (isLateral && (kl.includes('valgo') || kl.includes('tilt') || kl.includes('caída') || kl.includes('trendelenburg') || kl.includes('asim'))) return;
      // tronco lean = SOLO lateral (en frontal mide inclinación lateral, no es relevante)
      if (isFrontal && (kl.includes('tronco') || kl.includes('inclin'))) return;
      out.kpis[k] = v;
    });
    out.flags = result.flags.filter(f => {
      const ml = (f.msg||'').toLowerCase();
      if (isLateral && (ml.includes('valgo') || ml.includes('trendelenburg') || ml.includes('hombro') || ml.includes('pelvi'))) return false;
      if (isFrontal && ml.includes('tronco')) return false;
      return true;
    });
    return out;
  },

  _renderResults(res){
    document.getElementById('ma-results').style.display = 'block';
    const kpisEl = document.getElementById('ma-kpis');
    kpisEl.innerHTML = Object.entries(res.kpis).map(([k,v]) => `
      <div style="padding:8px 10px;background:var(--bg1);border:1px solid var(--border);border-radius:5px">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">${k}</div>
        <div style="font-size:15px;color:var(--text);font-weight:700;font-family:var(--mono);margin-top:2px">${v}</div>
      </div>`).join('');
    const flagsEl = document.getElementById('ma-flags');
    if (!res.flags.length){
      flagsEl.innerHTML = '<div style="padding:8px;background:rgba(57,255,122,.1);border:1px solid var(--neon);border-radius:5px;color:var(--neon);font-size:12px">✅ Sin alertas. Patrón motor correcto.</div>';
    } else {
      flagsEl.innerHTML = res.flags.map(f => {
        const c = f.lvl === 'red' ? 'var(--red)' : f.lvl === 'amber' ? 'var(--amber)' : 'var(--neon)';
        const ic = f.lvl === 'red' ? '🔴' : f.lvl === 'amber' ? '🟡' : '🟢';
        return `<div style="padding:6px 10px;background:rgba(0,0,0,.3);border-left:3px solid ${c};border-radius:3px;margin-bottom:4px;font-size:12px;color:var(--text)">${ic} ${f.msg}</div>`;
      }).join('');
    }
    this._drawChart();
  },

  _drawChart(){
    const c = document.getElementById('ma-chart');
    const ctx = c.getContext('2d');
    const w = c.width = c.clientWidth;
    const h = c.height = 160;
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0,0,w,h);
    if (!this._frames.length) return;
    const series = [
      { key:'knee_l', col:'#39FF7A', label:'Rodilla IZQ' },
      { key:'knee_r', col:'#FF4060', label:'Rodilla DER' }
    ];
    const all = this._frames.flatMap(f => [f.knee_l, f.knee_r]).filter(x=>x!=null);
    if (!all.length) return;
    const min = Math.min(...all), max = Math.max(...all);
    const pad = 24;
    series.forEach(s => {
      ctx.strokeStyle = s.col; ctx.lineWidth = 2; ctx.beginPath();
      this._frames.forEach((f,i) => {
        const v = f[s.key]; if (v==null) return;
        const x = pad + (i/(this._frames.length-1)) * (w-pad*2);
        const y = h - pad - ((v-min)/(max-min)) * (h-pad*2);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.stroke();
    });
    ctx.fillStyle = '#888'; ctx.font = '10px monospace';
    ctx.fillText(`${min.toFixed(0)}°`, 4, h-pad);
    ctx.fillText(`${max.toFixed(0)}°`, 4, pad+8);
    ctx.fillText('Rodilla IZQ', pad+4, 14);
    ctx.fillStyle = '#FF4060';
    ctx.fillText('Rodilla DER', pad+90, 14);
  },

  save(){
    if (!this._last){ alert('Nada que guardar'); return; }
    if (!cur) return;
    if (!Array.isArray(cur.movimiento)) cur.movimiento = [];
    cur.movimiento.push({ ...this._last, frames: this._frames.map(f => ({...f, _lm:undefined})) });
    if (typeof saveAtletas === 'function') saveAtletas();
    alert('Análisis guardado en historia del atleta.');
  },

  // ── snapshot frame → FMS slot ──────────────────────────────────────────
  snapshot(){
    const v = this._video || document.getElementById('ma-video');
    if (!v || !v.videoWidth){ alert('Cargá un video primero.'); return; }
    const dest = document.getElementById('ma-snap-dest').value;
    const overlay = document.getElementById('ma-snap-overlay').checked;
    const view = document.getElementById('ma-view').value;
    const ex = document.getElementById('ma-exercise').value;

    // composite a tamaño video real
    const tmp = document.createElement('canvas');
    tmp.width = v.videoWidth; tmp.height = v.videoHeight;
    const tx = tmp.getContext('2d');
    tx.drawImage(v, 0, 0, tmp.width, tmp.height);
    if (overlay && this._lastLm){
      this._drawSkeletonRaw(tx, this._lastLm, tmp.width, tmp.height);
    }
    const dataUrl = tmp.toDataURL('image/jpeg', 0.92);
    this._pasteToSlot(dest, dataUrl);

    // calcular y mostrar data del frame actual
    const a = this._lastLm ? allAngles(this._lastLm) : null;
    const data = this._extractRelevantData(a, view);
    this._renderSnapData(dest, data, view);
    this._persistSnap(dest, ex, view, dataUrl, data);

    const slot = document.getElementById(dest);
    if (slot) slot.scrollIntoView({behavior:'smooth', block:'center'});
    const slotLabel = (document.getElementById('ma-snap-dest')?.options[document.getElementById('ma-snap-dest').selectedIndex]?.text) || dest;
    this._setStatus(`✓ ${slotLabel} · ${Object.keys(data).length} medidas`);
  },

  // sincroniza dropdown vista con destino slot elegido
  _syncViewFromDest(slotId){
    const v = document.getElementById('ma-view'); if (!v) return;
    const s = (slotId || '').toLowerCase();
    let nv = null;
    if (s.includes('frente') || s.includes('-fd') || s.includes('-fi')) nv = 'front';
    else if (s.includes('perfil') || s.includes('-pd')) nv = 'side_r';
    else if (s.includes('-pi')) nv = 'side_l';
    if (nv){ v.value = nv; this._setStatus(`Vista auto: ${v.options[v.selectedIndex].text}`); }
  },

  // según vista, qué métricas son relevantes
  _extractRelevantData(a, view){
    if (!a) return {};
    const r = {};
    const fix1 = x => x==null ? '—' : x.toFixed(1);
    if (view === 'side_l' || view === 'side_r'){
      r['Flex rodilla L']  = fix1(a.knee_l)+'°';
      r['Flex rodilla R']  = fix1(a.knee_r)+'°';
      r['Flex cadera L']   = fix1(a.hip_l)+'°';
      r['Flex cadera R']   = fix1(a.hip_r)+'°';
      r['Inclin. tronco']  = fix1(a.trunk_lean)+'°';
      r['Flex tobillo L']  = fix1(a.ankle_l)+'°';
      r['Flex tobillo R']  = fix1(a.ankle_r)+'°';
    } else if (view === 'front' || view === 'back'){
      r['Flex rodilla L']  = fix1(a.knee_l)+'°';
      r['Flex rodilla R']  = fix1(a.knee_r)+'°';
      r['Asim. rodillas']  = fix1(Math.abs((a.knee_l||0)-(a.knee_r||0)))+'°';
      r['Valgo L']         = a.valgus_l!=null ? a.valgus_l.toFixed(3) : '—';
      r['Valgo R']         = a.valgus_r!=null ? a.valgus_r.toFixed(3) : '—';
      r['Tilt pélvico']    = fix1(a.pelvis_tilt)+'°';
      r['Tilt hombros']    = fix1(a.shoulder_tilt)+'°';
    }
    return r;
  },

  _renderSnapData(slotId, data, view){
    const slot = document.getElementById(slotId); if (!slot) return;
    const parent = slot.parentElement;
    let box = parent.querySelector('.snap-data-box');
    if (!box){ box = document.createElement('div'); box.className='snap-data-box'; parent.appendChild(box); }
    if (!Object.keys(data).length){ box.innerHTML = '<i>Sin pose detectada en este frame</i>'; return; }
    box.innerHTML = `<b style="color:var(--neon)">📐 ${view.toUpperCase()}</b><br>` +
      Object.entries(data).map(([k,v]) => `<span style="color:var(--text3)">${k}:</span> <b>${v}</b>`).join(' · ');
  },

  _persistSnap(slotId, ex, view, dataUrl, data){
    if (typeof cur === 'undefined' || !cur) return;
    if (!cur.fmsAI) cur.fmsAI = {};
    if (!cur.fmsAI[slotId]) cur.fmsAI[slotId] = {};
    cur.fmsAI[slotId] = { exercise: ex, view, ts: new Date().toISOString(), data, /* img omit por tamaño */ };
    try { if (typeof saveAtletas === 'function') saveAtletas(); } catch(e){}
  },

  _pasteToSlot(slotId, dataUrl){
    const slot = document.getElementById(slotId);
    if (!slot){ console.warn('[MA] slot not found', slotId); return; }
    let img = slot.querySelector('img');
    if (!img){ img = document.createElement('img'); slot.appendChild(img); }
    img.src = dataUrl;
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit';
    slot.style.border = '1px solid var(--neon)';
    const txt = slot.querySelector('div'); if (txt) txt.style.display = 'none';
  },

  _drawSkeletonRaw(ctx, lm, w, h){
    const PAIRS = [
      [11,13],[13,15],[12,14],[14,16],[11,12],[11,23],[12,24],[23,24],
      [23,25],[25,27],[24,26],[26,28],[27,31],[28,32],[27,29],[28,30]
    ];
    ctx.lineCap='round';
    ctx.shadowColor = 'rgba(57,255,122,.7)'; ctx.shadowBlur = 6;
    ctx.lineWidth = Math.max(2, w/600); ctx.strokeStyle = '#39FF7A';
    PAIRS.forEach(([a,b]) => {
      const A=lm[a],B=lm[b]; if(!A||!B) return;
      ctx.beginPath();
      ctx.moveTo(A.x*w, A.y*h); ctx.lineTo(B.x*w, B.y*h);
      ctx.stroke();
    });
    ctx.shadowBlur = 0;
    const SKIP = new Set([1,2,3,4,5,6,7,8,9,10]);
    lm.forEach((p,i)=>{ if(!p||SKIP.has(i)) return;
      ctx.beginPath(); ctx.arc(p.x*w, p.y*h, Math.max(3, w/400), 0, Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
    });
    // angle arcs
    [[L.L_HIP,L.L_KNEE,L.L_ANKLE,'#39FF7A'],[L.R_HIP,L.R_KNEE,L.R_ANKLE,'#39FF7A']].forEach(([a,b,c,col])=>{
      const A=lm[a],B=lm[b],C=lm[c]; if(!A||!B||!C) return;
      const ang = angle2D(A,B,C); if (ang==null) return;
      const a1=Math.atan2((A.y-B.y)*h,(A.x-B.x)*w), a2=Math.atan2((C.y-B.y)*h,(C.x-B.x)*w);
      const r=Math.hypot((A.x-B.x)*w,(A.y-B.y)*h)*0.55;
      let d=a2-a1; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
      ctx.beginPath(); ctx.moveTo(B.x*w,B.y*h);
      ctx.arc(B.x*w,B.y*h,r,a1,a1+d,d<0); ctx.closePath();
      ctx.fillStyle=col+'33'; ctx.fill();
      ctx.strokeStyle=col; ctx.lineWidth=2; ctx.stroke();
      const mid=a1+d/2;
      const lx=B.x*w+Math.cos(mid)*r*0.6, ly=B.y*h+Math.sin(mid)*r*0.6;
      ctx.font = `bold ${Math.max(14,w/50)}px monospace`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='#000'; ctx.fillText(`${Math.round(ang)}°`, lx+1, ly+1);
      ctx.fillStyle='#fff'; ctx.fillText(`${Math.round(ang)}°`, lx, ly);
    });
    ctx.textAlign='start'; ctx.textBaseline='alphabetic';
  },

  exportJSON(){
    if (!this._last) return;
    const data = JSON.stringify({ ...this._last, frames: this._frames }, null, 2);
    const blob = new Blob([data], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `move-analysis-${Date.now()}.json`;
    a.click();
  },

  _setStatus(s){
    const el = document.getElementById('ma-status');
    if (el) el.textContent = s;
  }
};

// Lazy init pose when tab opens
document.addEventListener('DOMContentLoaded', () => {
  // pre-warm: don't auto-init, esperar al primer uso
});

})();

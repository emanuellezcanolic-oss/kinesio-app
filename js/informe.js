// ── GLOBALS (compartidos entre módulos) ──
// cur, atletas, kineState, etc. se definen en app.js
// Este archivo asume que app.js ya fue cargado

function openInformeIA(){
  if(!cur){alert('Seleccioná un atleta');return;}
  openModal('modal-informe');
  regenerarInforme();
}

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

function exportarPDF(){
  const{jsPDF}=window.jspdf;if(!jsPDF){alert('Error al cargar jsPDF');return;}
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const s=cur;if(!s){alert('Sin atleta');return;}

  const prof  = document.getElementById('prof-nombre')?.value||'Lic. Emanuel Lezcano';
  const inst  = document.getElementById('prof-inst')?.value||'MOVE Centro de Evaluación';
  const texto = document.getElementById('informe-text')?.value||'';
  const fecha = new Date().toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'});

  // ── Palette ──────────────────────────────────────────────
  const BG    =[0,0,0];
  const DARK  =[10,10,10];
  const SURF  =[18,18,18];
  const SURF2 =[26,26,26];
  const GREEN =[57,255,122];
  const WHITE =[255,255,255];
  const LGRAY =[200,200,200];
  const MGRAY =[110,110,110];
  const DGRAY =[40,40,40];
  const RED   =[255,60,60];
  const AMBER =[255,176,32];
  const W=210, ML=14, CW=182;

  // ── Primitives ───────────────────────────────────────────
  const fill =(c)=>doc.setFillColor(...c);
  const draw =(c)=>doc.setDrawColor(...c);
  const txt  =(c)=>doc.setTextColor(...c);
  const F    =(x,y,w,h)=>{ doc.rect(x,y,w,h,'F'); };
  const R    =(x,y,w,h,r=2)=>{ doc.roundedRect(x,y,w,h,r,r,'F'); };
  const RS   =(x,y,w,h,r=2)=>{ doc.roundedRect(x,y,w,h,r,r,'S'); };
  const lw   =(n)=>doc.setLineWidth(n);

  const bgPage=()=>{ fill(BG); F(0,0,W,297); };

  // Full-width section band — matches "EVALUACIONES REALIZADAS" style
  const sectionBand=(title,y,h=20)=>{
    fill(DARK); F(0,y,W,h);
    fill(GREEN); F(0,y,4,h);                          // left accent bar
    fill(SURF2); F(4,y,W-4,0.4);                      // top hairline
    doc.setFont('helvetica','bolditalic');
    doc.setFontSize(22);
    txt(WHITE);
    doc.text(title.toUpperCase(),ML+4,y+h-5);
    return y+h;
  };

  // Numbered green badge (01, 02 …)
  const badge=(n,x,y,size=11)=>{
    fill(GREEN); R(x,y,size,size,1.5);
    doc.setFont('helvetica','bold');
    doc.setFontSize(7);
    txt(BG);
    doc.text(String(n).padStart(2,'0'),x+size/2,y+size/2+2.2,{align:'center'});
  };

  // Thin progress bar with fill %
  const progressBar=(x,y,w,h,pct,color)=>{
    fill(DGRAY); F(x,y,w,h);
    if(pct>0){ fill(color); F(x,y,Math.min(w,w*pct/100),h); }
  };

  // Traffic-light trio
  const trafficLight=(x,y,state)=>{
    const r=2.5;
    const cols=['red','amber','green'];
    const on ={red:RED, amber:AMBER, green:GREEN};
    const off={red:[50,20,20], amber:[50,40,10], green:[10,40,20]};
    cols.forEach((c,i)=>{
      fill(state===c?on[c]:off[c]);
      doc.circle(x+i*8,y,r,'F');
    });
  };

  // ── PAGE 1 ───────────────────────────────────────────────
  bgPage();

  // ---- HEADER BAND ----------------------------------------
  fill(DARK); F(0,0,W,50);
  fill(GREEN); F(0,48,W,0.6);

  // Brand
  doc.setFont('helvetica','bolditalic');
  doc.setFontSize(30);
  txt(WHITE);
  doc.text('MOVEMETRICS',ML,26);

  // Green square accent before brand
  fill(GREEN); F(ML-5,18,3,3);

  // Sub-brand
  doc.setFont('helvetica','normal');
  doc.setFontSize(6.5);
  txt(MGRAY);
  doc.text('PLATAFORMA DEPORTIVO-CLÍNICA  ·  INFORME ANALÍTICO PROFESIONAL',ML,33);

  // Pro info right
  doc.setFontSize(7.5);
  txt(MGRAY);
  doc.text(prof ,W-ML,20,{align:'right'});
  doc.text(inst ,W-ML,27,{align:'right'});
  doc.text(fecha,W-ML,34,{align:'right'});

  let y=56;

  // ---- ATHLETE BLOCK --------------------------------------
  fill(SURF); R(ML,y,CW,32,2);
  draw(GREEN); lw(0.3); RS(ML,y,CW,32,2);

  // Green left accent strip inside box
  fill(GREEN); F(ML,y,3,32);

  doc.setFont('helvetica','bold');
  doc.setFontSize(17);
  txt(WHITE);
  doc.text(s.nombre,ML+8,y+11);

  doc.setFont('helvetica','normal');
  doc.setFontSize(8);
  txt(LGRAY);
  doc.text(`${s.deporte||'--'}${s.puesto?' · '+s.puesto:''} · ${s.edad||'?'} años · ${s.peso||'?'} kg · ${s.talla||'?'} cm`,ML+8,y+19);
  doc.text(`Objetivo: ${s.objetivo||'--'}  ·  Nivel: ${s.nivel||'--'}  ·  ${s.servicio==='kinesio'?'Kinesiología':'Rendimiento'}`,ML+8,y+26);

  if(s.lesion){
    doc.setFont('helvetica','bold');
    doc.setFontSize(7.5);
    txt(AMBER);
    doc.text(`⚠  LESIÓN: ${s.lesion}`,W-ML-4,y+19,{align:'right'});
  }
  y+=38;

  // ---- KPI STRIP ------------------------------------------
  const cmjVal  = s.lastCMJ||0;
  const oneRM   = s.lastFV?.oneRM||0;
  const fzaRel  = (oneRM&&s.peso)?(oneRM/+s.peso):0;
  const r2Val   = s.lastFV?.r2||0;

  const kpiDefs=[
    { lbl:'CMJ',     val: cmjVal?cmjVal.toFixed(1)+' cm':'--',  pct: Math.min(cmjVal/50*100,100),
      st: cmjVal>=35?'green':cmjVal>=28?'amber':cmjVal?'red':'off' },
    { lbl:'1RM',     val: oneRM?oneRM.toFixed(0)+' kg':'--',     pct: Math.min(oneRM/200*100,100),
      st: oneRM?'green':'off' },
    { lbl:'FZA REL', val: fzaRel?fzaRel.toFixed(2)+'×PC':'--', pct: Math.min(fzaRel/2*100,100),
      st: fzaRel>=1.5?'green':fzaRel>=1.0?'amber':fzaRel?'red':'off' },
    { lbl:'R²',      val: r2Val?r2Val.toFixed(4):'--',           pct: r2Val*100,
      st: r2Val>=0.98?'green':r2Val>=0.95?'amber':r2Val?'red':'off' },
  ];

  const stColor={green:GREEN, amber:AMBER, red:RED, off:DGRAY};
  const kW=43, kH=26, kGap=4;

  kpiDefs.forEach(({lbl,val,pct,st},i)=>{
    const kx=ML+i*(kW+kGap);
    const sc=stColor[st];

    fill(SURF); R(kx,y,kW,kH,2);
    // status top border
    fill(sc); F(kx,y,kW,1.8);

    doc.setFont('helvetica','normal');
    doc.setFontSize(6.5);
    txt(MGRAY);
    doc.text(lbl,kx+4,y+7);

    doc.setFont('helvetica','bold');
    doc.setFontSize(12);
    txt(sc===DGRAY?MGRAY:sc);
    doc.text(val,kx+4,y+16);

    progressBar(kx+4,y+20,kW-8,1.8,pct,sc);

    // Traffic light
    if(st!=='off') trafficLight(kx+kW-13,y+8,st);
  });
  y+=kH+8;

  // ---- CHARTS STRIP ---------------------------------------
  const radarC = document.getElementById('radar-chart');
  const fvC    = document.getElementById('fv-chart')||document.getElementById('dash-fv-chart');
  if(radarC||fvC){
    try{
      if(radarC&&fvC){
        doc.addImage(radarC.toDataURL('image/png'),'PNG',ML,y,88,68);
        doc.addImage(fvC.toDataURL('image/png'),'PNG',ML+92,y,90,68);
      } else if(radarC){
        doc.addImage(radarC.toDataURL('image/png'),'PNG',ML,y,CW,68);
      } else {
        doc.addImage(fvC.toDataURL('image/png'),'PNG',ML,y,CW,68);
      }
      y+=74;
    }catch(e){}
  }

  // ── AI TEXT PAGES ────────────────────────────────────────
  if(texto.trim()){
    doc.addPage(); bgPage();

    // Page header
    fill(DARK); F(0,0,W,30);
    fill(GREEN); F(0,28,W,0.5);
    doc.setFont('helvetica','bolditalic');
    doc.setFontSize(20);
    txt(WHITE);
    doc.text('INFORME ANALÍTICO',ML,20);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7.5);
    txt(MGRAY);
    doc.text(`${s.nombre}  ·  ${fecha}`,W-ML,20,{align:'right'});

    // Parse emoji-headed sections
    const SMAP={
      '📋':'RESUMEN EJECUTIVO',
      '📊':'ANÁLISIS COMPARATIVO',
      '💪':'FORTALEZAS',
      '⚠️':'ÁREAS DE MEJORA',
      '📅':'PLAN DE ACCIÓN',
      '🔁':'RE-EVALUACIÓN',
      '🎯':'OBJETIVOS',
    };
    const sections=[];
    let cur_sec=null, cur_lines=[];
    texto.split('\n').forEach(line=>{
      const key=Object.keys(SMAP).find(e=>line.trimStart().startsWith(e));
      if(key){
        if(cur_sec) sections.push({title:cur_sec,body:cur_lines.join('\n').trim()});
        cur_sec=SMAP[key]; cur_lines=[];
      } else {
        cur_lines.push(line);
      }
    });
    if(cur_sec) sections.push({title:cur_sec,body:cur_lines.join('\n').trim()});

    let ay=36;

    const ensureSpace=(need)=>{
      if(ay+need>278){ doc.addPage(); bgPage(); ay=14; }
    };

    if(sections.length===0){
      // plain text fallback
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); txt(LGRAY);
      doc.splitTextToSize(texto,CW).forEach(ln=>{
        ensureSpace(6);
        doc.text(ln,ML,ay); ay+=5.5;
      });
    } else {
      sections.forEach((sec,idx)=>{
        const bodyLines=doc.splitTextToSize(sec.body,CW-16);
        const secH=22+bodyLines.length*5.4+10;
        ensureSpace(secH);

        // Section band
        fill(DARK); F(0,ay,W,20);
        fill(GREEN); F(0,ay,4,20);
        badge(idx+1,ML+2,ay+4.5);
        doc.setFont('helvetica','bolditalic');
        doc.setFontSize(15);
        txt(WHITE);
        doc.text(sec.title.toUpperCase(),ML+16,ay+13);
        ay+=20;

        // Body box
        const bH=bodyLines.length*5.4+8;
        fill(SURF); R(ML,ay,CW,bH,2);
        // left accent
        fill(GREEN); F(ML,ay,2,bH);

        doc.setFont('helvetica','normal');
        doc.setFontSize(8.5);
        let ty=ay+7;
        bodyLines.forEach(ln=>{
          const isBullet=ln.trim().startsWith('•')||ln.trim().startsWith('-')||ln.trim().match(/^\d+\./);
          txt(isBullet?WHITE:LGRAY);
          doc.text(ln,ML+6,ty);
          ty+=5.4;
        });
        ay+=bH+6;
      });
    }
  }

  // ── KINESIO PAGE ─────────────────────────────────────────
  const hasKinesio=s.kinesio&&(
    Object.keys(s.kinesio.bodyZones||{}).length||
    Object.values(s.kinesio.tests||{}).some(t=>t.result==='pos')
  );
  if(hasKinesio){
    doc.addPage(); bgPage();
    let ky=0;
    ky=sectionBand('EVALUACIÓN KINESIOLÓGICA',ky,28);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); txt(MGRAY);
    doc.text(`${s.nombre}  ·  ${new Date().toLocaleDateString('es-AR')}`,ML,ky+6);
    ky+=14;

    const zonas=Object.entries(s.kinesio.bodyZones||{}).filter(([,v])=>!v.recuperado);
    if(zonas.length){
      ky=sectionBand('ZONAS COMPROMETIDAS',ky,18);
      ky+=4;
      zonas.forEach(([,z])=>{
        fill(SURF); R(ML,ky,CW,12,1.5);
        fill(RED); F(ML,ky,3,12);
        doc.setFont('helvetica','bold'); doc.setFontSize(9); txt(WHITE);
        doc.text(z.label,ML+7,ky+8);
        const evaVal=z.eva||0;
        const evaColor=evaVal>=7?RED:evaVal>=4?AMBER:GREEN;
        txt(evaColor);
        doc.text(`EVA ${evaVal}/10`,W-ML-4,ky+8,{align:'right'});
        progressBar(ML+7,ky+10,CW-14,1.5,evaVal*10,evaColor);
        ky+=16;
      });
      ky+=4;
    }

    const allTests=[...ORTHO_TESTS.subacro,...ORTHO_TESTS.manguito,...ORTHO_TESTS.biceps,...ORTHO_TESTS.ligamentos,...ORTHO_TESTS.meniscos,...ORTHO_TESTS.funcionales,...ORTHO_TESTS.tobillo,...ORTHO_TESTS.lumbar,...ORTHO_TESTS.cadera,...ORTHO_TESTS.dohaAductores,...ORTHO_TESTS.dohaPsoas,...ORTHO_TESTS.dohaInguinal,...ORTHO_TESTS.dohaComplementarios,...ORTHO_TESTS.cervicalNeural,...ORTHO_TESTS.cervicalArticular,...ORTHO_TESTS.cervicalMuscular,...ORTHO_TESTS.codoLateral,...ORTHO_TESTS.codoMedial,...ORTHO_TESTS.codoLigamentos,...ORTHO_TESTS.patelo,...ORTHO_TESTS.tendonesRodilla,...ORTHO_TESTS.pie,...ORTHO_TESTS.muneca];
    const posTests=Object.entries(s.kinesio.tests||{}).filter(([,v])=>v.result==='pos');
    if(posTests.length){
      ky=sectionBand('TESTS ORTOPÉDICOS POSITIVOS',ky,18);
      ky+=4;
      posTests.forEach(([id,v],pi)=>{
        const t=allTests.find(x=>x.id===id); if(!t)return;
        if(ky>270){doc.addPage();bgPage();ky=14;}
        fill(SURF); R(ML,ky,CW,14,1.5);
        fill(RED); F(ML,ky,3,14);
        badge(pi+1,ML+5,ky+1.5,11);
        doc.setFont('helvetica','bold'); doc.setFontSize(8.5); txt(RED);
        doc.text(`+ ${t.name}`,ML+20,ky+7);
        if(t.sub||v.obs){
          doc.setFont('helvetica','normal'); doc.setFontSize(7.5); txt(MGRAY);
          const sub=`${t.sub||''}${v.obs?' — '+v.obs:''}`;
          doc.text(sub,ML+20,ky+12);
        }
        ky+=18;
      });
    }
  }

  // ── FOOTER ALL PAGES ─────────────────────────────────────
  const total=doc.getNumberOfPages();
  for(let i=1;i<=total;i++){
    doc.setPage(i);
    fill(DARK); F(0,285,W,12);
    fill(GREEN); F(0,285,W,0.4);
    // Green dot before page num
    fill(GREEN); doc.circle(W-ML-5,291,1.2,'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); txt(DGRAY);
    doc.text(`MOVEMETRICS  ·  ${prof}  ·  ${inst}`,ML,291);
    txt(GREEN);
    doc.text(`${i} / ${total}`,W-ML,291,{align:'right'});
  }

  doc.save(`MoveMetrics_${s.nombre.replace(/\s/g,'_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

function exportAllData(){
  const blob=new Blob([JSON.stringify(atletas,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download='movemetrics_data_'+new Date().toISOString().split('T')[0]+'.json';a.click();URL.revokeObjectURL(url);
}


// ══════════════════════════════════════════════════════
//  VIDEO SALTO -- Módulo de salto vertical por video
// ══════════════════════════════════════════════════════

let videoState = {
  takeoffTime: null,
  landingTime: null,
  fps: 60,
  duration: 0
};

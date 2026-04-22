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
[Tabla con columnas: VARIABLE | VALOR | REFERENCIA | ESTADO — usá exactamente este formato de pipes para cada fila, incluyendo fila separadora con guiones]

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

// ── Helper: generate athletic dark background via HTML Canvas ────────────────
function _genBg(variant='page'){
  const PW=630,PH=891; // A4 at ~72dpi×3
  const cv=document.createElement('canvas');cv.width=PW;cv.height=PH;
  const ctx=cv.getContext('2d');

  // Base: pure black
  ctx.fillStyle='#000000';ctx.fillRect(0,0,PW,PH);

  if(variant==='cover'){
    // Dramatic radial gradient - dark center, black edges
    const g=ctx.createRadialGradient(PW*0.5,PH*0.28,0,PW*0.5,PH*0.3,PW*0.85);
    g.addColorStop(0,'rgba(22,22,22,1)');
    g.addColorStop(0.45,'rgba(10,10,10,1)');
    g.addColorStop(1,'rgba(0,0,0,1)');
    ctx.fillStyle=g;ctx.fillRect(0,0,PW,PH);

    // Green top glow strip
    const gg=ctx.createLinearGradient(0,0,0,PH*0.22);
    gg.addColorStop(0,'rgba(57,255,122,0.06)');
    gg.addColorStop(1,'rgba(57,255,122,0)');
    ctx.fillStyle=gg;ctx.fillRect(0,0,PW,PH*0.22);

    // Diagonal speed lines (athletic feel)
    ctx.save();ctx.globalAlpha=0.035;ctx.strokeStyle='#39FF7A';ctx.lineWidth=1;
    for(let i=-PH;i<PW+PH;i+=38){
      ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+PH*0.5,PH);ctx.stroke();
    }
    ctx.restore();

    // Bottom fade to black
    const bf=ctx.createLinearGradient(0,PH*0.72,0,PH);
    bf.addColorStop(0,'rgba(0,0,0,0)');bf.addColorStop(1,'rgba(0,0,0,0.7)');
    ctx.fillStyle=bf;ctx.fillRect(0,PH*0.72,PW,PH*0.28);

  } else {
    // Content pages: subtle dark radial + barely-visible grid
    const g=ctx.createRadialGradient(PW*0.5,PH*0.4,0,PW*0.5,PH*0.4,PW*0.75);
    g.addColorStop(0,'rgba(14,14,14,1)');
    g.addColorStop(1,'rgba(0,0,0,1)');
    ctx.fillStyle=g;ctx.fillRect(0,0,PW,PH);

    // Very faint diagonal lines
    ctx.save();ctx.globalAlpha=0.018;ctx.strokeStyle='#39FF7A';ctx.lineWidth=1;
    for(let i=-PH;i<PW+PH;i+=52){
      ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+PH*0.4,PH);ctx.stroke();
    }
    ctx.restore();
  }

  // Vignette
  const vg=ctx.createRadialGradient(PW/2,PH/2,PH*0.3,PW/2,PH/2,PH*0.8);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.55)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,PW,PH);

  return cv.toDataURL('image/jpeg',0.88);
}

// ── Helper: render a markdown pipe-table as a real visual table ──────────────
function _pdfRenderTable(doc,lines,x,y,w,colors){
  const {BG,SURF,SURF2,GREEN,WHITE,LGRAY,MGRAY,DGRAY}=colors;
  const COL_H=7, ROW_H=6.5;
  // parse rows — skip separator lines (only dashes/pipes)
  const rows=lines
    .map(l=>l.split('|').map(c=>c.trim()).filter((_,i,a)=>i>0&&i<a.length-1))
    .filter(r=>r.length>0 && !r.every(c=>/^-+$/.test(c)));
  if(!rows.length)return y;
  const nCols=rows[0].length;
  const cw=w/nCols;
  // header row
  rows.forEach((row,ri)=>{
    const isHeader=ri===0;
    const bg=isHeader?[30,30,30]:(ri%2===0?SURF:[20,20,20]);
    doc.setFillColor(...bg);
    doc.rect(x,y,w,isHeader?COL_H:ROW_H,'F');
    if(isHeader){doc.setFillColor(...GREEN);doc.rect(x,y,w,0.6,'F');}
    row.forEach((cell,ci)=>{
      doc.setFont('helvetica',isHeader?'bold':'normal');
      doc.setFontSize(isHeader?7.5:7);
      doc.setTextColor(...(isHeader?WHITE:LGRAY));
      // status coloring
      if(!isHeader){
        const up=cell.toUpperCase();
        if(up.includes('ELITE')||up.includes('ÓPTIMO')||up.includes('NORMAL'))doc.setTextColor(...GREEN);
        else if(up.includes('MODERADO')||up.includes('LEVE'))doc.setTextColor(...[255,176,32]);
        else if(up.includes('DÉFICIT')||up.includes('BAJO')||up.includes('RIESGO'))doc.setTextColor(...[255,60,60]);
      }
      doc.text(cell,x+ci*cw+2,y+(isHeader?COL_H:ROW_H)-2,{maxWidth:cw-3});
    });
    y+=isHeader?COL_H:ROW_H;
  });
  // bottom border
  doc.setDrawColor(...GREEN);doc.setLineWidth(0.3);
  doc.line(x,y,x+w,y);
  return y+3;
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
  const MGRAY =[100,100,100];
  const DGRAY =[38,38,38];
  const RED   =[255,60,60];
  const AMBER =[255,176,32];
  const W=210, ML=14, CW=182;
  const PAL   ={BG,DARK,SURF,SURF2,GREEN,WHITE,LGRAY,MGRAY,DGRAY,RED,AMBER};

  const fill =(c)=>doc.setFillColor(...c);
  const draw =(c)=>doc.setDrawColor(...c);
  const txt  =(c)=>doc.setTextColor(...c);
  const F    =(x,y,w,h)=>doc.rect(x,y,w,h,'F');
  const R    =(x,y,w,h,r=2)=>doc.roundedRect(x,y,w,h,r,r,'F');
  const lw   =(n)=>doc.setLineWidth(n);

  // Pre-render backgrounds once
  const _bgCover=_genBg('cover');
  const _bgPage =_genBg('page');
  const bgPage=(cover=false)=>{
    doc.addImage(cover?_bgCover:_bgPage,'JPEG',0,0,W,297);
  };

  // SECTION BAND — full-width dark band with thick green left bar
  const sectionBand=(title,y,h=28)=>{
    fill([6,6,6]); F(0,y,W,h);
    fill(GREEN); F(0,y,10,h);                   // 10mm green left bar
    fill(GREEN); F(10,y,W-10,0.4);              // hairline top
    fill(GREEN); F(10,y+h-0.4,W-10,0.4);       // hairline bottom
    doc.setFont('helvetica','bolditalic');
    doc.setFontSize(22);
    txt(WHITE);
    doc.text(title.toUpperCase(),ML+8,y+h-8);
    return y+h;
  };

  // BADGE — green square with number
  const badge=(n,x,y,size=14)=>{
    fill(GREEN); R(x,y,size,size,2);
    doc.setFont('helvetica','bold');
    doc.setFontSize(8.5);
    txt(BG);
    doc.text(String(n).padStart(2,'0'),x+size/2,y+size/2+3,{align:'center'});
  };

  // PROGRESS BAR
  const bar=(x,y,w,h,pct,color)=>{
    fill(DGRAY);F(x,y,w,h);
    if(pct>0){fill(color);F(x,y,w*Math.min(pct,100)/100,h);}
  };

  // TRAFFIC LIGHT
  const tlight=(x,y,state)=>{
    [{k:'red',c:RED,off:[60,18,18]},{k:'amber',c:AMBER,off:[55,42,10]},{k:'green',c:GREEN,off:[12,45,22]}]
      .forEach(({k,c,off},i)=>{fill(state===k?c:off);doc.circle(x+i*8,y,3,'F');});
  };

  // ── PAGE 1 ───────────────────────────────────────────────
  bgPage(true);

  // HEADER — left green mega bar + branding
  fill(GREEN);F(0,0,8,60);                       // thick left green bar
  fill([6,6,6]);F(8,0,W-8,60);                  // dark header bg (right of bar)
  fill(GREEN);F(8,58,W-8,0.8);                  // bottom green line
  doc.setFont('helvetica','bolditalic');doc.setFontSize(36);txt(WHITE);
  doc.text('MOVEMETRICS',ML+4,36);
  doc.setFont('helvetica','normal');doc.setFontSize(6.5);txt(MGRAY);
  doc.text('PLATAFORMA DEPORTIVO-CLÍNICA  ·  INFORME ANALÍTICO PROFESIONAL',ML+4,46);
  doc.setFontSize(7.5);txt([80,80,80]);
  doc.text(prof ,W-ML,22,{align:'right'});
  doc.text(inst ,W-ML,30,{align:'right'});
  doc.text(fecha,W-ML,38,{align:'right'});

  let y=66;

  // ATHLETE BLOCK
  fill(SURF);R(ML,y,CW,30,2);
  draw(GREEN);lw(0.3);doc.roundedRect(ML,y,CW,30,2,2,'S');
  fill(GREEN);F(ML,y,4,30);
  doc.setFont('helvetica','bold');doc.setFontSize(17);txt(WHITE);
  doc.text(s.nombre,ML+9,y+10);
  doc.setFont('helvetica','normal');doc.setFontSize(8);txt(LGRAY);
  doc.text(`${s.deporte||'--'}${s.puesto?' · '+s.puesto:''} · ${s.edad||'?'} años · ${s.peso||'?'} kg · ${s.talla||'?'} cm`,ML+9,y+18);
  doc.text(`Objetivo: ${s.objetivo||'--'}  ·  Nivel: ${s.nivel||'--'}  ·  ${s.servicio==='kinesio'?'Kinesiología':'Rendimiento'}`,ML+9,y+25);
  if(s.lesion){doc.setFont('helvetica','bold');doc.setFontSize(7.5);txt(AMBER);doc.text(`⚠ LESION: ${s.lesion}`,W-ML-3,y+18,{align:'right'});}
  y+=36;

  // KPI STRIP
  const cmjV =s.lastCMJ||0, rmV=s.lastFV?.oneRM||0;
  const frV  =(rmV&&s.peso)?rmV/+s.peso:0, r2V=s.lastFV?.r2||0;
  const kpiDefs=[
    {lbl:'CMJ',     val:cmjV?cmjV.toFixed(1)+' cm':'--', pct:Math.min(cmjV/50*100,100), st:cmjV>=35?'green':cmjV>=28?'amber':cmjV?'red':'off'},
    {lbl:'1RM',     val:rmV ?rmV.toFixed(0)+' kg' :'--', pct:Math.min(rmV/200*100,100),  st:rmV?'green':'off'},
    {lbl:'FZA REL', val:frV ?frV.toFixed(2)+'xPC' :'--', pct:Math.min(frV/2*100,100),    st:frV>=1.5?'green':frV>=1?'amber':frV?'red':'off'},
    {lbl:'R²',      val:r2V ?r2V.toFixed(4)        :'--', pct:r2V*100,                    st:r2V>=0.98?'green':r2V>=0.95?'amber':r2V?'red':'off'},
  ];
  const stC={green:GREEN,amber:AMBER,red:RED,off:DGRAY};
  const kW=43,kH=28,kGap=4;
  kpiDefs.forEach(({lbl,val,pct,st},i)=>{
    const kx=ML+i*(kW+kGap), sc=stC[st];
    fill(SURF);R(kx,y,kW,kH,2);
    fill(sc);F(kx,y,kW,2);
    doc.setFont('helvetica','normal');doc.setFontSize(6.5);txt(MGRAY);doc.text(lbl,kx+4,y+8);
    doc.setFont('helvetica','bold');doc.setFontSize(13);txt(sc===DGRAY?MGRAY:sc);doc.text(val,kx+4,y+18);
    bar(kx+4,y+22,kW-8,2,pct,sc);
    if(st!=='off')tlight(kx+kW-14,y+9,st);
  });
  y+=kH+6;

  // CHARTS
  const rC=document.getElementById('radar-chart');
  const fC=document.getElementById('fv-chart')||document.getElementById('dash-fv-chart');
  if(rC||fC){
    try{
      if(rC&&fC){doc.addImage(rC.toDataURL('image/png'),'PNG',ML,y,88,66);doc.addImage(fC.toDataURL('image/png'),'PNG',ML+92,y,90,66);}
      else if(rC){doc.addImage(rC.toDataURL('image/png'),'PNG',ML,y,CW,66);}
      else{doc.addImage(fC.toDataURL('image/png'),'PNG',ML,y,CW,66);}
      y+=72;
    }catch(e){}
  }

  // ── AI PAGES ─────────────────────────────────────────────
  if(texto.trim()){
    doc.addPage();bgPage();
    // Page mini-header
    fill(DARK);F(0,0,W,26);fill(GREEN);F(0,24,W,0.5);
    doc.setFont('helvetica','bolditalic');doc.setFontSize(18);txt(WHITE);doc.text('INFORME ANALÍTICO',ML,17);
    doc.setFont('helvetica','normal');doc.setFontSize(7);txt(MGRAY);doc.text(`${s.nombre}  ·  ${fecha}`,W-ML,17,{align:'right'});

    const SMAP={'📋':'RESUMEN EJECUTIVO','📊':'ANÁLISIS COMPARATIVO','💪':'FORTALEZAS','⚠️':'ÁREAS DE MEJORA','📅':'PLAN DE ACCIÓN','🔁':'RE-EVALUACIÓN','🎯':'OBJETIVOS'};
    const sections=[];let cs=null,cl=[];
    texto.split('\n').forEach(line=>{
      const k=Object.keys(SMAP).find(e=>line.trimStart().startsWith(e));
      if(k){if(cs)sections.push({title:cs,lines:cl});cs=SMAP[k];cl=[];}
      else if(line.trim())cl.push(line);
    });
    if(cs)sections.push({title:cs,lines:cl});

    let ay=32;
    const need=(n)=>{if(ay+n>276){doc.addPage();bgPage();ay=14;}};

    (sections.length?sections:[{title:'ANÁLISIS',lines:texto.split('\n').filter(l=>l.trim())}])
    .forEach((sec,idx)=>{
      // detect if body is a markdown table
      const isTable=sec.lines.some(l=>l.includes('|'));

      // section band (shorter for content pages)
      need(20);
      fill(DARK);F(0,ay,W,20);
      fill(GREEN);F(0,ay,10,20);
      badge(idx+1,ML+2,ay+3);
      doc.setFont('helvetica','bolditalic');doc.setFontSize(14);txt(WHITE);
      doc.text(sec.title.toUpperCase(),ML+20,ay+13);
      ay+=20;

      if(isTable){
        // render as visual table
        const tableLines=sec.lines.filter(l=>l.includes('|'));
        need(tableLines.length*7+8);
        ay=_pdfRenderTable(doc,tableLines,ML,ay,CW,PAL);
      } else {
        // text body box
        const bodyText=sec.lines.join('\n');
        const wrapped=doc.splitTextToSize(bodyText,CW-12);
        const bH=wrapped.length*5.4+8;
        need(bH+4);
        fill(SURF);R(ML,ay,CW,bH,2);
        fill(GREEN);F(ML,ay,3,bH);
        doc.setFont('helvetica','normal');doc.setFontSize(8.5);
        let ty=ay+7;
        wrapped.forEach(ln=>{
          const isBullet=/^\s*[•\-\*]/.test(ln)||/^\s*\d+[\.\)]/.test(ln);
          txt(isBullet?WHITE:LGRAY);
          doc.text(ln,ML+6,ty);
          ty+=5.4;
        });
        ay+=bH+4;
      }
      ay+=3; // section gap
    });
  }

  // ── KINESIO PAGE ─────────────────────────────────────────
  if(s.kinesio&&(Object.keys(s.kinesio.bodyZones||{}).length||Object.values(s.kinesio.tests||{}).some(t=>t.result==='pos'))){
    doc.addPage();bgPage();
    let ky=sectionBand('EVALUACIÓN KINESIOLÓGICA',0,28);
    doc.setFont('helvetica','normal');doc.setFontSize(7.5);txt(MGRAY);
    doc.text(`${s.nombre}  ·  ${new Date().toLocaleDateString('es-AR')}`,ML,ky+7);
    ky+=16;

    const zonas=Object.entries(s.kinesio.bodyZones||{}).filter(([,v])=>!v.recuperado);
    if(zonas.length){
      ky=sectionBand('ZONAS COMPROMETIDAS',ky,20);ky+=4;
      zonas.forEach(([,z])=>{
        fill(SURF);R(ML,ky,CW,13,1.5);fill(RED);F(ML,ky,3,13);
        doc.setFont('helvetica','bold');doc.setFontSize(9);txt(WHITE);doc.text(z.label,ML+7,ky+9);
        const ev=z.eva||0,ec=ev>=7?RED:ev>=4?AMBER:GREEN;
        txt(ec);doc.text(`EVA ${ev}/10`,W-ML-4,ky+9,{align:'right'});
        bar(ML+7,ky+11,CW-14,1.5,ev*10,ec);
        ky+=17;
      });ky+=4;
    }

    const allTests=[...ORTHO_TESTS.subacro,...ORTHO_TESTS.manguito,...ORTHO_TESTS.biceps,...ORTHO_TESTS.ligamentos,...ORTHO_TESTS.meniscos,...ORTHO_TESTS.funcionales,...ORTHO_TESTS.tobillo,...ORTHO_TESTS.lumbar,...ORTHO_TESTS.cadera,...ORTHO_TESTS.dohaAductores,...ORTHO_TESTS.dohaPsoas,...ORTHO_TESTS.dohaInguinal,...ORTHO_TESTS.dohaComplementarios,...ORTHO_TESTS.cervicalNeural,...ORTHO_TESTS.cervicalArticular,...ORTHO_TESTS.cervicalMuscular,...ORTHO_TESTS.codoLateral,...ORTHO_TESTS.codoMedial,...ORTHO_TESTS.codoLigamentos,...ORTHO_TESTS.patelo,...ORTHO_TESTS.tendonesRodilla,...ORTHO_TESTS.pie,...ORTHO_TESTS.muneca];
    const posTests=Object.entries(s.kinesio.tests||{}).filter(([,v])=>v.result==='pos');
    if(posTests.length){
      ky=sectionBand('TESTS POSITIVOS',ky,20);ky+=4;
      posTests.forEach(([id,v],pi)=>{
        const t=allTests.find(x=>x.id===id);if(!t)return;
        if(ky>268){doc.addPage();bgPage();ky=14;}
        fill(SURF);R(ML,ky,CW,15,1.5);fill(RED);F(ML,ky,3,15);
        badge(pi+1,ML+5,ky+0.5,13);
        doc.setFont('helvetica','bold');doc.setFontSize(8.5);txt(RED);doc.text(`+ ${t.name}`,ML+22,ky+7);
        if(t.sub||v.obs){doc.setFont('helvetica','normal');doc.setFontSize(7);txt(MGRAY);doc.text(`${t.sub||''}${v.obs?' — '+v.obs:''}`,ML+22,ky+12);}
        ky+=18;
      });
    }
  }

  // ── FOOTER ───────────────────────────────────────────────
  const total=doc.getNumberOfPages();
  for(let i=1;i<=total;i++){
    doc.setPage(i);
    fill(DARK);F(0,284,W,13);fill(GREEN);F(0,284,W,0.5);
    fill(GREEN);doc.circle(W-ML-5,291,1.4,'F');
    doc.setFont('helvetica','normal');doc.setFontSize(6.5);txt(DGRAY);
    doc.text(`MOVEMETRICS  ·  ${prof}  ·  ${inst}`,ML,291);
    txt(GREEN);doc.text(`${i} / ${total}`,W-ML,291,{align:'right'});
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

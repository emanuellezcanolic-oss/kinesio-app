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

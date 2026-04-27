// VideoCompare.js — sincroniza 2 videos, detecta pose en frame actual de c/u,
// genera tabla comparativa con diff por métrica.
// Reusa MA poseLandmarker si está cargado.

(function(){
'use strict';

const VC = window.VC = {
  _last: { A:null, B:null },
  _syncing: false,

  load(side, file){
    if (!file) return;
    const v = document.getElementById('vc-video-'+side.toLowerCase());
    v.src = URL.createObjectURL(file);
    v.load();
    if (!this._bound) this._bind();
  },

  _bind(){
    ['a','b'].forEach(k => {
      const v = document.getElementById('vc-video-'+k);
      v.addEventListener('seeking', () => this._onSeek(k));
      v.addEventListener('play',    () => this._onPlay(k));
      v.addEventListener('pause',   () => this._onPause(k));
      // wheel scrub
      v.parentElement.addEventListener('wheel', e => {
        if (!v.duration) return;
        e.preventDefault();
        v.pause();
        v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + Math.sign(e.deltaY)/30));
      }, { passive:false });
    });
    this._bound = true;
  },

  _onSeek(src){
    if (!document.getElementById('vc-sync').checked) return;
    if (this._syncing) return;
    const va = document.getElementById('vc-video-a');
    const vb = document.getElementById('vc-video-b');
    const master = src === 'a' ? va : vb;
    const slave  = src === 'a' ? vb : va;
    if (!master.duration || !slave.duration) return;
    this._syncing = true;
    const ratio = master.currentTime / master.duration;
    slave.currentTime = ratio * slave.duration;
    setTimeout(() => this._syncing = false, 50);
  },

  _onPlay(src){
    if (!document.getElementById('vc-sync').checked) return;
    const other = document.getElementById('vc-video-'+(src==='a'?'b':'a'));
    if (other.paused) other.play().catch(()=>{});
  },
  _onPause(src){
    if (!document.getElementById('vc-sync').checked) return;
    const other = document.getElementById('vc-video-'+(src==='a'?'b':'a'));
    if (!other.paused) other.pause();
  },

  async detect(side){
    // espera que MA tenga poseLandmarker cargado
    if (!window.MA){ alert('Cargá primero el módulo Análisis AI.'); return; }
    if (!window._poseReady){ /* try via MA */ }
    const v = document.getElementById('vc-video-'+side.toLowerCase());
    if (!v.videoWidth){ alert('Cargá video '+side); return; }

    const lm = await this._detect(v);
    if (!lm){ alert('Pose no detectada en '+side); return; }
    this._last[side] = { lm, ts: v.currentTime };
    this._draw(side, lm);
  },

  async _detect(v){
    // dynamic import of MediaPipe via existing MA pipeline
    const { PoseLandmarker, FilesetResolver } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.10/+esm');
    if (!this._lm){
      const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.10/wasm');
      this._lm = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task', delegate:'GPU' },
        runningMode:'VIDEO', numPoses:1
      });
    }
    const r = this._lm.detectForVideo(v, performance.now());
    return r?.landmarks?.[0] || null;
  },

  _draw(side, lm){
    const c = document.getElementById('vc-canvas-'+side.toLowerCase());
    const v = document.getElementById('vc-video-'+side.toLowerCase());
    c.width = v.clientWidth; c.height = v.clientHeight;
    const ctx = c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);
    // fit
    const cw=c.width, ch=c.height, vw=v.videoWidth||1, vh=v.videoHeight||1;
    const vAR=vw/vh, cAR=cw/ch;
    let dw,dh,dx,dy;
    if (vAR>cAR){dw=cw;dh=cw/vAR;dx=0;dy=(ch-dh)/2;} else {dh=ch;dw=ch*vAR;dy=0;dx=(cw-dw)/2;}
    const X = p => dx + p.x*dw, Y = p => dy + p.y*dh;
    const SKIP = new Set([1,2,3,4,5,6,7,8,9,10]);
    const PAIRS = [[11,13],[13,15],[12,14],[14,16],[11,12],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,31],[28,32],[27,29],[28,30]];
    ctx.lineWidth = 2; ctx.strokeStyle='#c084fc'; ctx.lineCap='round';
    ctx.shadowColor='rgba(0,0,0,.6)'; ctx.shadowBlur=3;
    PAIRS.forEach(([a,b])=>{const A=lm[a],B=lm[b]; if(!A||!B) return;
      ctx.beginPath(); ctx.moveTo(X(A),Y(A)); ctx.lineTo(X(B),Y(B)); ctx.stroke();
    });
    ctx.shadowBlur=0;
    ctx.fillStyle='#fff';
    lm.forEach((p,i)=>{ if(!p||SKIP.has(i)) return;
      ctx.beginPath(); ctx.arc(X(p),Y(p),2.5,0,Math.PI*2); ctx.fill();
    });
  },

  async compare(){
    // si no hay detect previo, hacerlos ahora
    if (!this._last.A) await this.detect('A');
    if (!this._last.B) await this.detect('B');
    const A = this._last.A, B = this._last.B;
    if (!A || !B){ alert('Detectá pose en ambos videos primero.'); return; }
    // calcular ángulos via función exportada de MA si existe, sino inline
    const aA = this._allAngles(A.lm);
    const aB = this._allAngles(B.lm);
    this._renderTable(aA, aB);
  },

  _allAngles(lm){
    const ang = (a,b,c) => {
      if(!a||!b||!c) return null;
      const v1x=a.x-b.x,v1y=a.y-b.y, v2x=c.x-b.x,v2y=c.y-b.y;
      const dot=v1x*v2x+v1y*v2y;
      const m1=Math.hypot(v1x,v1y), m2=Math.hypot(v2x,v2y);
      if (m1*m2===0) return null;
      return Math.acos(Math.max(-1,Math.min(1,dot/(m1*m2)))) * 180/Math.PI;
    };
    const tilt = (a,b) => {
      if(!a||!b) return null;
      let t = Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
      while(t>90)t-=180; while(t<-90)t+=180;
      return t;
    };
    const L_={SHOULDER_L:11,SHOULDER_R:12,ELBOW_L:13,ELBOW_R:14,WRIST_L:15,WRIST_R:16,
      HIP_L:23,HIP_R:24,KNEE_L:25,KNEE_R:26,ANKLE_L:27,ANKLE_R:28,FOOT_L:31,FOOT_R:32};
    return {
      'Flex rodilla IZQ':   ang(lm[L_.HIP_L], lm[L_.KNEE_L], lm[L_.ANKLE_L]),
      'Flex rodilla DER':   ang(lm[L_.HIP_R], lm[L_.KNEE_R], lm[L_.ANKLE_R]),
      'Flex cadera IZQ':    ang(lm[L_.SHOULDER_L], lm[L_.HIP_L], lm[L_.KNEE_L]),
      'Flex cadera DER':    ang(lm[L_.SHOULDER_R], lm[L_.HIP_R], lm[L_.KNEE_R]),
      'Flex tobillo IZQ':   ang(lm[L_.KNEE_L], lm[L_.ANKLE_L], lm[L_.FOOT_L]),
      'Flex tobillo DER':   ang(lm[L_.KNEE_R], lm[L_.ANKLE_R], lm[L_.FOOT_R]),
      'Flex codo IZQ':      ang(lm[L_.SHOULDER_L], lm[L_.ELBOW_L], lm[L_.WRIST_L]),
      'Flex codo DER':      ang(lm[L_.SHOULDER_R], lm[L_.ELBOW_R], lm[L_.WRIST_R]),
      'Tilt pelvis':        tilt(lm[L_.HIP_L], lm[L_.HIP_R]),
      'Tilt hombros':       tilt(lm[L_.SHOULDER_L], lm[L_.SHOULDER_R])
    };
  },

  _renderTable(aA, aB){
    const el = document.getElementById('vc-table'); if (!el) return;
    const keys = Object.keys(aA);
    const fmt = v => v==null ? '—' : v.toFixed(1)+'°';
    const rows = keys.map(k => {
      const va = aA[k], vb = aB[k];
      const d = (va!=null && vb!=null) ? (vb-va) : null;
      const dCol = d==null ? 'var(--text3)' : Math.abs(d) < 3 ? 'var(--neon)' : Math.abs(d) < 8 ? 'var(--amber)' : 'var(--red)';
      const dStr = d==null ? '—' : (d>=0?'+':'') + d.toFixed(1)+'°';
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-size:12px">${k}</td>
        <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--mono);color:var(--text2)">${fmt(va)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--mono);color:var(--text2)">${fmt(vb)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--mono);font-weight:700;color:${dCol}">${dStr}</td>
      </tr>`;
    }).join('');
    el.innerHTML = `
      <div style="background:var(--bg1);border:1px solid #c084fc;border-radius:6px;overflow:hidden">
        <div style="padding:10px 14px;background:rgba(192,132,252,.1);font-weight:700;color:#c084fc;font-size:13px">📊 Tabla comparativa — diferencias entre A y B</div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:var(--bg2)">
              <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--text3);text-transform:uppercase">Métrica</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--text3);text-transform:uppercase">Video A</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--text3);text-transform:uppercase">Video B</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--text3);text-transform:uppercase">Δ (B−A)</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="padding:6px 10px;font-size:9px;color:var(--text3);border-top:1px solid var(--border)">Δ verde &lt; 3° · amber 3-8° · rojo &gt; 8°</div>
      </div>
    `;
  }
};

})();

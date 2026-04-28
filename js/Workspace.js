// Workspace.js — orquestador unificado
// 1 video A + canvas (skeleton+drawing) + opcional video B (compare)
// Reusa MA, EX, VC pero los apunta a elementos compartidos.

(function(){
'use strict';

const EX_OPTS = `
<optgroup label="Básicos">
  <option value="squat_bipodal">Sentadilla bipodal</option>
  <option value="squat_unipodal_l">Sentadilla unipodal IZQ</option>
  <option value="squat_unipodal_r">Sentadilla unipodal DER</option>
  <option value="lunge">Zancada</option>
  <option value="cmj">Salto CMJ</option>
</optgroup>
<optgroup label="Tests científicos">
  <option value="ohs">Overhead Squat (Cook FMS)</option>
  <option value="step_down">Step Down 5-criteria (Park 2013)</option>
  <option value="drop_jump_less">Drop Jump LESS (Padua 2009)</option>
  <option value="tuck_jump">Tuck Jump (Myer 2008)</option>
  <option value="hop_test_l">Single Hop IZQ (Noyes)</option>
  <option value="hop_test_r">Single Hop DER (Noyes)</option>
  <option value="inline_lunge">In-Line Lunge (FMS)</option>
  <option value="hurdle_step">Hurdle Step (FMS)</option>
  <option value="aslr">Active SLR (FMS)</option>
  <option value="shoulder_mob">Shoulder Mobility (FMS)</option>
  <option value="pushup">Trunk Stab Push-up (FMS)</option>
  <option value="ybalance">Y-Balance (Plisky)</option>
  <option value="triple_hop_l">Triple Hop IZQ</option>
  <option value="triple_hop_r">Triple Hop DER</option>
  <option value="pistol_l">Pistol Squat IZQ</option>
  <option value="pistol_r">Pistol Squat DER</option>
</optgroup>
<option value="free">Análisis libre</option>
`;

const WS = window.WS = {
  _videoA: null, _videoB: null,
  _compareOn: false,
  _scrubbing: false,

  init(){
    if (this._initd) return;
    // poblar dropdown ejercicios (puede haber 1 o 2 en DOM, llenar todos)
    document.querySelectorAll('select#ma-exercise').forEach(s => {
      if (!s.options.length) s.innerHTML = EX_OPTS;
    });

    this._videoA = document.getElementById('ws-video-a');
    this._videoB = document.getElementById('ws-video-b');

    // patch MA → usar elementos compartidos ws-*
    if (window.MA){
      MA._video  = this._videoA;
      MA._canvas = document.getElementById('ws-skel-a');
      MA._ctx    = MA._canvas.getContext('2d');
      // redefinir _setupCanvas para apuntar siempre a ws-*
      const origFit = MA._fitCanvas;
      MA._setupCanvas = function(){
        this._video  = document.getElementById('ws-video-a');
        this._canvas = document.getElementById('ws-skel-a');
        this._ctx    = this._canvas.getContext('2d');
        this._overrides = this._overrides || {};
        this._fitCanvas && this._fitCanvas();
        if (!this._evtBound){
          window.addEventListener('resize', () => this._fitCanvas && this._fitCanvas(), { passive:true });
          this._video.addEventListener('pause', () => this._enterEditMode && this._enterEditMode());
          this._video.addEventListener('play',  () => this._exitEditMode && this._exitEditMode());
          this._video.addEventListener('seeked', () => this._onSeeked && this._onSeeked());
          this._evtBound = true;
        }
      };
    }

    // patch EX → ws-* elementos
    if (window.EX){
      const _origInit = EX.init;
      EX.init = function(){
        if (this._initd) return;
        this._video  = document.getElementById('ws-video-a');
        this._canvas = document.getElementById('ws-draw-a');
        this._ctx    = this._canvas.getContext('2d');
        if (!this._video || !this._canvas) return;
        this._bindEvents && this._bindEvents();
        this._loadFromAtleta && this._loadFromAtleta();
        this._setTool && this._setTool('select', null);
        this._initd = true;
      };
      EX.init();
    }

    // VC: mantiene sus videos vc-* (legacy hidden) pero "Compare" también usa ws-video-a/b
    // patch VC para detectar B desde ws-video-b
    if (window.VC){
      const _origDetect = VC.detect;
      VC.detect = async function(side){
        const vid = side === 'A' ? document.getElementById('ws-video-a') : document.getElementById('ws-video-b');
        if (!vid?.videoWidth){ alert('Cargá video '+side); return; }
        const lm = await this._detect(vid);
        if (!lm){ alert('Pose no detectada en '+side); return; }
        this._last[side] = { lm, ts: vid.currentTime };
        // dibujar al canvas correcto
        const cId = side === 'A' ? 'ws-skel-a' : 'ws-skel-b';
        this._drawTo(cId, vid, lm);
      };
      VC._drawTo = function(canvasId, video, lm){
        const c = document.getElementById(canvasId); if (!c) return;
        c.width = video.clientWidth; c.height = video.clientHeight;
        const ctx = c.getContext('2d');
        ctx.clearRect(0,0,c.width,c.height);
        const cw=c.width, ch=c.height, vw=video.videoWidth||1, vh=video.videoHeight||1;
        const vAR=vw/vh, cAR=cw/ch;
        let dw,dh,dx,dy;
        if (vAR>cAR){dw=cw;dh=cw/vAR;dx=0;dy=(ch-dh)/2;} else {dh=ch;dw=ch*vAR;dy=0;dx=(cw-dw)/2;}
        const X = p=>dx+p.x*dw, Y = p=>dy+p.y*dh;
        const SKIP=new Set([1,2,3,4,5,6,7,8,9,10]);
        const PAIRS=[[11,13],[13,15],[12,14],[14,16],[11,12],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,31],[28,32],[27,29],[28,30]];
        ctx.lineWidth=2; ctx.strokeStyle=canvasId.endsWith('-b')?'#c084fc':'#39FF7A'; ctx.lineCap='round';
        ctx.shadowColor='rgba(0,0,0,.6)'; ctx.shadowBlur=3;
        PAIRS.forEach(([a,b])=>{const A=lm[a],B=lm[b];if(!A||!B)return;
          ctx.beginPath();ctx.moveTo(X(A),Y(A));ctx.lineTo(X(B),Y(B));ctx.stroke();});
        ctx.shadowBlur=0; ctx.fillStyle='#fff';
        lm.forEach((p,i)=>{if(!p||SKIP.has(i))return;
          ctx.beginPath();ctx.arc(X(p),Y(p),2.5,0,Math.PI*2);ctx.fill();});
      };
    }

    // bind frame info + sync scrub si compare on
    this._videoA.addEventListener('timeupdate', () => this._updateInfo());
    this._videoA.addEventListener('seeking', () => this._syncSlave('A'));
    this._videoA.addEventListener('play', () => this._mirrorPlay('A',true));
    this._videoA.addEventListener('pause', () => this._mirrorPlay('A',false));
    this._videoB.addEventListener('seeking', () => this._syncSlave('B'));
    this._videoB.addEventListener('play', () => this._mirrorPlay('B',true));
    this._videoB.addEventListener('pause', () => this._mirrorPlay('B',false));

    // wheel scrub global sobre stages
    document.getElementById('ws-stage-a').addEventListener('wheel', e => this._wheelScrub(e, this._videoA), { passive:false });
    document.getElementById('ws-stage-b').addEventListener('wheel', e => this._wheelScrub(e, this._videoB), { passive:false });

    this._initd = true;
  },

  _wheelScrub(e, v){
    if (!v || !v.duration) return;
    e.preventDefault();
    v.pause();
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + Math.sign(e.deltaY)/30));
  },

  _syncSlave(src){
    if (!this._compareOn) return;
    if (!document.getElementById('ws-sync')?.checked) return;
    if (this._scrubbing) return;
    this._scrubbing = true;
    const master = src === 'A' ? this._videoA : this._videoB;
    const slave  = src === 'A' ? this._videoB : this._videoA;
    if (master.duration && slave.duration){
      slave.currentTime = (master.currentTime / master.duration) * slave.duration;
    }
    setTimeout(() => this._scrubbing = false, 60);
  },

  _mirrorPlay(src, playing){
    if (!this._compareOn) return;
    if (!document.getElementById('ws-sync')?.checked) return;
    const other = src === 'A' ? this._videoB : this._videoA;
    if (playing && other.paused) other.play().catch(()=>{});
    if (!playing && !other.paused) other.pause();
  },

  loadVideo(side, file){
    this.init();
    if (!file) return;
    const v = side === 'A' ? this._videoA : this._videoB;
    v.src = URL.createObjectURL(file);
    v.load();
    if (side === 'A'){
      // sincronizar src a videos legacy ocultos para que MA/EX no rompan
      ['ma-video','ex-video','vc-video-a'].forEach(id => {
        const el = document.getElementById(id); if (el) { el.src = v.src; }
      });
      const btn = document.getElementById('ma-analyze-btn'); if (btn) btn.disabled = false;
    } else {
      const el = document.getElementById('vc-video-b'); if (el) el.src = v.src;
    }
  },

  toggleCompare(){
    this._compareOn = !this._compareOn;
    const wrap = document.getElementById('ws-stage-b-wrap');
    const view = document.getElementById('ws-viewport');
    const loadB = document.getElementById('ws-load-b-btn');
    const accCmp = document.getElementById('ws-compare-results-acc');
    const tog = document.getElementById('ws-compare-toggle');
    wrap.style.display = this._compareOn ? '' : 'none';
    view.style.gridTemplateColumns = this._compareOn ? '1fr 1fr' : '1fr';
    loadB.style.display = this._compareOn ? '' : 'none';
    accCmp.style.display = this._compareOn ? '' : 'none';
    tog.textContent = this._compareOn ? '📊 Cerrar Comparar' : '📊 Activar Comparar';
    document.getElementById('ws-label-a').textContent = this._compareOn ? '📹 Video A — antes / referencia' : '📹 Video A';
  },

  detectB(){ if (window.VC) VC.detect('B'); },
  compareNow(){ if (window.VC) VC.compare(); },

  step(n){
    const v = this._videoA; if (!v) return;
    v.pause();
    v.currentTime = Math.max(0, Math.min(v.duration||1e6, v.currentTime + n/30));
  },

  togglePlay(){
    const v = this._videoA; if (!v) return;
    if (v.paused) v.play(); else v.pause();
    setTimeout(() => {
      const b = document.getElementById('ws-play-btn');
      if (b) b.textContent = v.paused ? '▶ Play' : '⏸ Pause';
    }, 50);
  },

  _updateInfo(){
    const el = document.getElementById('ws-frame-info'); if (!el) return;
    const v = this._videoA; if (!v?.duration) { el.textContent = '—'; return; }
    el.textContent = `t=${v.currentTime.toFixed(2)}s · frame≈${Math.round(v.currentTime*30)} / ${Math.round(v.duration*30)}`;
  },

  // captura unificada → composite video + skel + draw → FMS slot
  captureToFMS(){
    const dest = document.getElementById('suite-snap-dest').value;
    const v = this._videoA;
    if (!v?.videoWidth){ alert('Cargá video A primero'); return; }
    const tmp = document.createElement('canvas');
    tmp.width = v.videoWidth; tmp.height = v.videoHeight;
    const tx = tmp.getContext('2d');
    tx.drawImage(v, 0, 0, tmp.width, tmp.height);
    // dibujar skeleton AI si hay último landmark
    if (window.MA?._lastLm){
      try { MA._drawSkeletonRaw(tx, MA._lastLm, tmp.width, tmp.height); } catch(e){}
    }
    // dibujar anotaciones EX del frame actual
    if (window.EX){
      const k = EX._frameKey ? EX._frameKey() : Math.round(v.currentTime*30);
      const annos = EX._annotations?.[k] || [];
      annos.forEach(a => { try { EX._drawAnnotRaw(tx, a, tmp.width, tmp.height); } catch(e){} });
    }
    // si compare on, mosaico A|B
    let dataUrl;
    if (this._compareOn && this._videoB?.videoWidth){
      const w = tmp.width; const h = tmp.height;
      const composite = document.createElement('canvas');
      composite.width = w*2 + 20; composite.height = h;
      const ctx = composite.getContext('2d');
      ctx.fillStyle='#000'; ctx.fillRect(0,0,composite.width,composite.height);
      ctx.drawImage(tmp, 0, 0);
      ctx.drawImage(this._videoB, w+20, 0, w, h);
      ctx.fillStyle='#5dd4ff'; ctx.font='bold 28px monospace'; ctx.fillText('A', 14, 36);
      ctx.fillStyle='#c084fc'; ctx.fillText('B', w+34, 36);
      dataUrl = composite.toDataURL('image/jpeg', 0.92);
    } else {
      dataUrl = tmp.toDataURL('image/jpeg', 0.92);
    }
    this._pasteToSlot(dest, dataUrl);
    this._scroll(dest);
  },

  uploadImage(file){
    if (!file) return;
    const dest = document.getElementById('suite-snap-dest').value;
    const r = new FileReader();
    r.onload = e => { this._pasteToSlot(dest, e.target.result); this._scroll(dest); };
    r.readAsDataURL(file);
  },

  _pasteToSlot(slotId, dataUrl){
    const slot = document.getElementById(slotId); if (!slot) return;
    let img = slot.querySelector('img');
    if (!img){ img = document.createElement('img'); slot.appendChild(img); }
    img.src = dataUrl;
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit';
    slot.style.border = '1px solid var(--neon)';
    const txt = slot.querySelector('div'); if (txt) txt.style.display = 'none';
  },
  _scroll(slotId){
    const s = document.getElementById(slotId);
    if (s) s.scrollIntoView({behavior:'smooth', block:'center'});
  }
};

// init cuando cargue DOM
if (document.readyState !== 'loading') WS.init();
else document.addEventListener('DOMContentLoaded', () => WS.init());

})();

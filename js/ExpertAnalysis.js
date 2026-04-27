// ExpertAnalysis.js — toolkit estilo Kinovea para análisis manual de video
// Herramientas: línea, ángulo, marcador, rectángulo, círculo, calibración
// Persistencia: anotaciones por frame en cur.expertAnno
// Snapshot: composite video+overlay → JPEG dataURL

(function(){
'use strict';

const COLORS = ['#5dd4ff','#39FF7A','#FFB020','#FF4060','#c084fc','#fff'];

const EX = window.EX = {
  _video:null, _canvas:null, _ctx:null,
  _tool:'select',
  _annotations: {}, // frameKey → [annot...]
  _drawing: null,    // anotación en construcción
  _calibration: null, // { p1, p2, realCm } → pxPerCm
  _mirror: false,
  _grid: false,
  _selectedColor: '#5dd4ff',
  _undoStack: [],

  init(){
    if (this._initd) return;
    this._video = document.getElementById('ex-video');
    this._canvas = document.getElementById('ex-canvas');
    this._ctx = this._canvas.getContext('2d');
    if (!this._video || !this._canvas) return;
    this._bindEvents();
    this._loadFromAtleta();
    this._setTool('select', null);
    this._initd = true;
  },

  loadVideo(file){
    this.init();
    if (!file) return;
    const v = this._video;
    v.src = URL.createObjectURL(file);
    v.load();
    v.addEventListener('loadedmetadata', () => { this._fitCanvas(); this._render(); }, { once:true });
  },

  fromAI(){
    this.init();
    const aiV = document.getElementById('ma-video');
    if (!aiV?.src){ alert('Primero subí un video al análisis AI.'); return; }
    this._video.src = aiV.src;
    this._video.load();
  },

  setTool(btn){
    const tool = btn?.dataset?.tool || (typeof btn === 'string' ? btn : 'select');
    this._setTool(tool, btn);
  },
  _setTool(tool, btn){
    this._tool = tool;
    document.querySelectorAll('.ex-tool[data-tool]').forEach(b => b.classList.remove('active'));
    if (btn && btn.dataset?.tool) btn.classList.add('active');
    else {
      const m = document.querySelector(`.ex-tool[data-tool="${tool}"]`);
      if (m) m.classList.add('active');
    }
    this._drawing = null;
    this._canvas.style.cursor = tool === 'select' ? 'pointer' : 'crosshair';
  },

  _bindEvents(){
    const v = this._video, c = this._canvas;
    v.addEventListener('loadedmetadata', () => this._fitCanvas());
    v.addEventListener('seeked', () => this._render());
    v.addEventListener('timeupdate', () => this._updateInfo());
    window.addEventListener('resize', () => { this._fitCanvas(); this._render(); });

    // wheel scrub
    v.parentElement.addEventListener('wheel', e => {
      if (!v.duration) return;
      e.preventDefault();
      v.pause();
      v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + Math.sign(e.deltaY)/30));
    }, { passive:false });

    c.addEventListener('mousedown', e => this._onDown(e));
    c.addEventListener('mousemove', e => this._onMove(e));
    c.addEventListener('mouseup',   e => this._onUp(e));
    c.addEventListener('contextmenu', e => { e.preventDefault(); this._cancelDrawing(); });
  },

  _fitCanvas(){
    const v = this._video, c = this._canvas;
    const cw = v.clientWidth, ch = v.clientHeight;
    const vw = v.videoWidth || 1280, vh = v.videoHeight || 720;
    c.width = cw; c.height = ch;
    const vAR = vw/vh, cAR = cw/ch;
    let dw, dh, dx, dy;
    if (vAR > cAR){ dw = cw; dh = cw/vAR; dx = 0; dy = (ch-dh)/2; }
    else          { dh = ch; dw = ch*vAR; dy = 0; dx = (cw-dw)/2; }
    this._off = { dx, dy, dw, dh, vw, vh };
  },

  _frameKey(){ return Math.round(this._video.currentTime * 30); },

  _updateInfo(){
    const el = document.getElementById('ex-frame-info');
    if (el) el.textContent = `t=${this._video.currentTime.toFixed(2)}s · frame=${this._frameKey()}`;
  },

  _eventCoord(e){
    const rect = this._canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  },
  // pixel canvas → coord en píxeles del video original (independiente del display)
  _toVideoCoord(p){
    const o = this._off;
    return { x: (p.x - o.dx) / o.dw, y: (p.y - o.dy) / o.dh };
  },
  _toCanvasCoord(p){
    const o = this._off;
    return { x: o.dx + p.x * o.dw, y: o.dy + p.y * o.dh };
  },

  _onDown(e){
    const cp = this._eventCoord(e);
    const vp = this._toVideoCoord(cp);
    const t = this._tool;
    if (t === 'select'){ /* TODO: picking */ return; }
    if (t === 'line' || t === 'rect' || t === 'circle' || t === 'calibrate'){
      this._drawing = { type:t, points:[vp], color:this._selectedColor, frame:this._frameKey() };
    } else if (t === 'angle'){
      if (!this._drawing) this._drawing = { type:'angle', points:[vp], color:this._selectedColor, frame:this._frameKey() };
      else {
        this._drawing.points.push(vp);
        if (this._drawing.points.length >= 3){
          this._commitDrawing();
        }
      }
    } else if (t === 'marker'){
      const txt = prompt('Texto del marcador:', '');
      if (txt != null){
        this._drawing = { type:'marker', points:[vp], text:txt, color:this._selectedColor, frame:this._frameKey() };
        this._commitDrawing();
      }
    }
    this._render();
  },

  _onMove(e){
    if (!this._drawing) return;
    const cp = this._eventCoord(e);
    const vp = this._toVideoCoord(cp);
    const d = this._drawing;
    if (d.type === 'line' || d.type === 'rect' || d.type === 'circle' || d.type === 'calibrate'){
      d.points[1] = vp;
    } else if (d.type === 'angle' && d.points.length < 3){
      d.points[d.points.length] = vp;
      d.points.length = Math.min(d.points.length, 3);
      // mantener cursor en últimos
      if (d.points.length === 1) d.points[1] = vp;
      else if (d.points.length === 2) d.points[2] = vp;
    }
    this._render();
  },

  _onUp(e){
    const d = this._drawing; if (!d) return;
    if (d.type === 'line' || d.type === 'rect' || d.type === 'circle'){
      this._commitDrawing();
    } else if (d.type === 'calibrate'){
      // pedir distancia real
      const cm = parseFloat(prompt('Distancia real entre los 2 puntos (cm):', '50'));
      if (cm && cm > 0){
        const o = this._off;
        const p1 = { x: d.points[0].x * o.vw, y: d.points[0].y * o.vh };
        const p2 = { x: d.points[1].x * o.vw, y: d.points[1].y * o.vh };
        const distPx = Math.hypot(p2.x-p1.x, p2.y-p1.y);
        this._calibration = { pxPerCm: distPx / cm, refCm: cm };
        document.getElementById('ex-cal-info').textContent = `${this._calibration.pxPerCm.toFixed(2)} px/cm · ref=${cm}cm`;
      }
      this._drawing = null;
      this._render();
    }
  },

  _commitDrawing(){
    const d = this._drawing; if (!d) return;
    const k = d.frame;
    if (!this._annotations[k]) this._annotations[k] = [];
    this._annotations[k].push(d);
    this._undoStack.push({ frame:k, idx:this._annotations[k].length-1 });
    this._drawing = null;
    this._persist();
    this._render();
    this._renderList();
  },

  _cancelDrawing(){ this._drawing = null; this._render(); },

  undo(){
    const last = this._undoStack.pop(); if (!last) return;
    if (this._annotations[last.frame]){
      this._annotations[last.frame].splice(last.idx, 1);
      if (!this._annotations[last.frame].length) delete this._annotations[last.frame];
    }
    this._persist(); this._render(); this._renderList();
  },

  clearFrame(){
    delete this._annotations[this._frameKey()];
    this._persist(); this._render(); this._renderList();
  },

  clearAll(){
    if (!confirm('Borrar TODAS las anotaciones?')) return;
    this._annotations = {}; this._undoStack = [];
    this._persist(); this._render(); this._renderList();
  },

  // ── render ─────────────────────────────────────────────────────────────
  _render(){
    const ctx = this._ctx; if (!ctx) return;
    this._fitCanvas();
    const c = this._canvas;
    ctx.save();
    ctx.clearRect(0, 0, c.width, c.height);
    if (this._mirror){
      ctx.translate(c.width, 0); ctx.scale(-1, 1);
    }
    if (this._grid) this._drawGrid();
    // anotaciones del frame actual
    const k = this._frameKey();
    (this._annotations[k] || []).forEach(a => this._drawAnnot(a));
    if (this._drawing) this._drawAnnot(this._drawing, true);
    ctx.restore();
    // CSS mirror del video real
    this._video.style.transform = this._mirror ? 'scaleX(-1)' : '';
  },

  _drawGrid(){
    const ctx = this._ctx, c = this._canvas;
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 0.6;
    for (let x = 0; x <= c.width; x += 40){
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke();
    }
    for (let y = 0; y <= c.height; y += 40){
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke();
    }
    // línea central X y Y más visibles
    ctx.strokeStyle = 'rgba(93,212,255,.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(c.width/2, 0); ctx.lineTo(c.width/2, c.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, c.height/2); ctx.lineTo(c.width, c.height/2); ctx.stroke();
  },

  _drawAnnot(a, ghost){
    const ctx = this._ctx;
    const pts = a.points.map(p => this._toCanvasCoord(p));
    const col = a.color || '#5dd4ff';
    const dim = ghost ? .55 : 1;
    ctx.globalAlpha = dim;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
    ctx.font = 'bold 13px monospace'; ctx.textBaseline = 'middle';

    if (a.type === 'line' || a.type === 'calibrate'){
      if (pts.length < 2) { this._drawDot(pts[0], col); ctx.globalAlpha=1; return; }
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); ctx.stroke();
      this._drawDot(pts[0], col); this._drawDot(pts[1], col);
      // label distancia
      const o = this._off;
      const dxv = (a.points[1].x - a.points[0].x) * o.vw;
      const dyv = (a.points[1].y - a.points[0].y) * o.vh;
      const distPx = Math.hypot(dxv, dyv);
      const lbl = this._calibration
        ? `${(distPx/this._calibration.pxPerCm).toFixed(1)} cm`
        : `${distPx.toFixed(0)} px`;
      this._labelAt((pts[0].x+pts[1].x)/2, (pts[0].y+pts[1].y)/2 - 14, lbl, col);
    } else if (a.type === 'angle'){
      if (pts.length === 1){ this._drawDot(pts[0], col); ctx.globalAlpha=1; return; }
      ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); ctx.lineTo(pts[1].x,pts[1].y);
      if (pts[2]) ctx.lineTo(pts[2].x,pts[2].y);
      ctx.stroke();
      pts.forEach(p => this._drawDot(p, col));
      if (pts.length === 3){
        const ang = this._angle3(pts[0],pts[1],pts[2]);
        const r = Math.min(40, Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)*0.5);
        const a1 = Math.atan2(pts[0].y-pts[1].y, pts[0].x-pts[1].x);
        const a2 = Math.atan2(pts[2].y-pts[1].y, pts[2].x-pts[1].x);
        let d = a2-a1; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
        ctx.beginPath(); ctx.moveTo(pts[1].x,pts[1].y);
        ctx.arc(pts[1].x,pts[1].y, r, a1, a1+d, d<0); ctx.closePath();
        ctx.fillStyle = col + '33'; ctx.fill();
        ctx.strokeStyle = col; ctx.stroke();
        const mid = a1 + d/2;
        const lx = pts[1].x + Math.cos(mid)*r*0.6;
        const ly = pts[1].y + Math.sin(mid)*r*0.6;
        this._labelAt(lx, ly, `${ang.toFixed(0)}°`, col);
      }
    } else if (a.type === 'rect'){
      if (pts.length < 2){ this._drawDot(pts[0], col); ctx.globalAlpha=1; return; }
      const x = Math.min(pts[0].x,pts[1].x), y = Math.min(pts[0].y,pts[1].y);
      const w = Math.abs(pts[1].x-pts[0].x), h = Math.abs(pts[1].y-pts[0].y);
      ctx.strokeRect(x,y,w,h);
    } else if (a.type === 'circle'){
      if (pts.length < 2){ this._drawDot(pts[0], col); ctx.globalAlpha=1; return; }
      const r = Math.hypot(pts[1].x-pts[0].x, pts[1].y-pts[0].y);
      ctx.beginPath(); ctx.arc(pts[0].x,pts[0].y, r, 0, Math.PI*2); ctx.stroke();
    } else if (a.type === 'marker'){
      this._drawDot(pts[0], col, 6);
      this._labelAt(pts[0].x + 10, pts[0].y, a.text || '', col);
    }
    ctx.globalAlpha = 1;
  },

  _drawDot(p, col, r=4){
    const ctx = this._ctx;
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
  },
  _labelAt(x,y,txt,col){
    const ctx = this._ctx;
    const w = ctx.measureText(txt).width;
    ctx.fillStyle = 'rgba(0,0,0,.78)';
    this._roundRect(x - w/2 - 5, y - 9, w + 10, 18, 4); ctx.fill();
    ctx.fillStyle = col; ctx.textAlign='center';
    ctx.fillText(txt, x, y);
    ctx.textAlign='start';
  },
  _roundRect(x,y,w,h,r){
    const c = this._ctx;
    c.beginPath();
    c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r);
    c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r);
    c.closePath();
  },
  _angle3(a,b,c){
    const v1x=a.x-b.x,v1y=a.y-b.y, v2x=c.x-b.x,v2y=c.y-b.y;
    const dot=v1x*v2x+v1y*v2y;
    const m1=Math.hypot(v1x,v1y), m2=Math.hypot(v2x,v2y);
    return Math.acos(Math.max(-1,Math.min(1,dot/(m1*m2)))) * 180 / Math.PI;
  },

  // ── controles ──────────────────────────────────────────────────────────
  togglePlay(){ const v=this._video; if(v.paused) v.play(); else v.pause(); },
  step(n){ const v=this._video; v.pause(); v.currentTime = Math.max(0, Math.min(v.duration||1e6, v.currentTime + n/30)); },
  setSpeed(s){ this._video.playbackRate = +s; },
  toggleMirror(){ this._mirror = !this._mirror; this._render(); },
  toggleGrid(){ this._grid = !this._grid; this._render(); },

  // ── persistencia ───────────────────────────────────────────────────────
  _persist(){
    if (typeof cur === 'undefined' || !cur) return;
    cur.expertAnno = this._annotations;
    cur.expertCal = this._calibration;
    try { if (typeof saveAtletas === 'function') saveAtletas(); } catch(e){}
  },
  _loadFromAtleta(){
    if (typeof cur === 'undefined' || !cur) return;
    this._annotations = cur.expertAnno || {};
    this._calibration = cur.expertCal || null;
    if (this._calibration){
      document.getElementById('ex-cal-info').textContent = `${this._calibration.pxPerCm.toFixed(2)} px/cm · ref=${this._calibration.refCm}cm`;
    }
    this._renderList();
  },

  _renderList(){
    const el = document.getElementById('ex-anno-list'); if (!el) return;
    const total = Object.values(this._annotations).reduce((s,arr)=>s+arr.length,0);
    if (!total){ el.innerHTML = ''; return; }
    el.innerHTML = `<div style="font-size:10px;color:var(--text3);font-family:var(--mono);padding:6px 4px"><b style="color:#5dd4ff">${total}</b> anotaciones en <b style="color:#5dd4ff">${Object.keys(this._annotations).length}</b> frames · <a href="#" onclick="EX._exportJSON();return false" style="color:#5dd4ff">📄 export JSON</a></div>`;
  },

  _exportJSON(){
    const data = JSON.stringify({ calibration:this._calibration, annotations:this._annotations }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], {type:'application/json'}));
    a.download = `expert-${Date.now()}.json`; a.click();
  },

  snapshot(){
    const v = this._video; if (!v.videoWidth){ alert('Sin video'); return; }
    const tmp = document.createElement('canvas');
    tmp.width = v.videoWidth; tmp.height = v.videoHeight;
    const tx = tmp.getContext('2d');
    if (this._mirror){ tx.translate(tmp.width,0); tx.scale(-1,1); }
    tx.drawImage(v, 0, 0, tmp.width, tmp.height);
    if (this._mirror){ tx.scale(-1,1); tx.translate(-tmp.width,0); }
    // dibujar anotaciones del frame en coordenadas video reales
    const k = this._frameKey();
    const annos = this._annotations[k] || [];
    annos.forEach(a => this._drawAnnotRaw(tx, a, tmp.width, tmp.height));
    const url = tmp.toDataURL('image/jpeg', 0.92);
    const w = window.open();
    if (w) w.document.write(`<img src="${url}" style="max-width:100%">`);
    else { const a=document.createElement('a'); a.href=url; a.download=`expert-${k}.jpg`; a.click(); }
  },

  _drawAnnotRaw(ctx, a, w, h){
    const pts = a.points.map(p => ({ x:p.x*w, y:p.y*h }));
    const col = a.color || '#5dd4ff';
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3;
    ctx.font = `bold ${Math.max(14,w/55)}px monospace`; ctx.textBaseline='middle';
    if (a.type === 'line' || a.type === 'calibrate'){
      ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); ctx.lineTo(pts[1].x,pts[1].y); ctx.stroke();
    } else if (a.type === 'angle' && pts.length === 3){
      ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); ctx.lineTo(pts[1].x,pts[1].y); ctx.lineTo(pts[2].x,pts[2].y); ctx.stroke();
      const ang = this._angle3(pts[0],pts[1],pts[2]);
      ctx.fillStyle = col; ctx.fillText(`${ang.toFixed(0)}°`, pts[1].x+8, pts[1].y);
    } else if (a.type === 'rect' && pts.length === 2){
      const x=Math.min(pts[0].x,pts[1].x),y=Math.min(pts[0].y,pts[1].y);
      ctx.strokeRect(x,y,Math.abs(pts[1].x-pts[0].x),Math.abs(pts[1].y-pts[0].y));
    } else if (a.type === 'circle' && pts.length === 2){
      ctx.beginPath(); ctx.arc(pts[0].x,pts[0].y, Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y), 0, Math.PI*2); ctx.stroke();
    } else if (a.type === 'marker'){
      ctx.beginPath(); ctx.arc(pts[0].x,pts[0].y, 8, 0, Math.PI*2); ctx.fill();
      if (a.text){ ctx.fillStyle=col; ctx.fillText(a.text, pts[0].x+12, pts[0].y); }
    }
  }
};

// auto-init cuando el video carga datos
document.addEventListener('DOMContentLoaded', () => {
  // lazy: init al primer interact
});

})();

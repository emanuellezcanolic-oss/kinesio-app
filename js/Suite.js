// Suite.js — orquesta MA / EX / VC en mismo card con tabs.
// Maneja captura unificada → FMS slot + upload imagen → FMS slot.

(function(){
'use strict';

const Suite = window.Suite = {
  _mode: 'ai',

  show(mode, btn){
    this._mode = mode;
    document.querySelectorAll('.suite-pane').forEach(p => p.style.display = 'none');
    const pane = document.getElementById('suite-pane-'+mode);
    if (pane) pane.style.display = '';
    document.querySelectorAll('.suite-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    // lazy init expert al entrar
    if (mode === 'expert' && window.EX) EX.init();
  },

  // captura del modo activo → FMS slot
  captureToFMS(){
    const dest = document.getElementById('suite-snap-dest').value;
    if (!dest) return;
    if (this._mode === 'ai'){
      // forzar dest en MA y capturar
      const md = document.getElementById('ma-snap-dest');
      if (md){ md.value = dest; if (window.MA && MA._syncViewFromDest) MA._syncViewFromDest(dest); }
      if (window.MA) MA.snapshot();
    } else if (this._mode === 'expert'){
      this._captureExpertToSlot(dest);
    } else if (this._mode === 'compare'){
      this._captureCompareToSlot(dest);
    }
  },

  _captureExpertToSlot(slotId){
    if (!window.EX) return;
    const v = document.getElementById('ex-video');
    if (!v?.videoWidth){ alert('Cargá video primero en Experto'); return; }
    const tmp = document.createElement('canvas');
    tmp.width = v.videoWidth; tmp.height = v.videoHeight;
    const tx = tmp.getContext('2d');
    tx.drawImage(v, 0, 0, tmp.width, tmp.height);
    // dibujar anotaciones
    const k = EX._frameKey ? EX._frameKey() : 0;
    const annos = EX._annotations?.[k] || [];
    annos.forEach(a => EX._drawAnnotRaw(tx, a, tmp.width, tmp.height));
    this._pasteToSlot(slotId, tmp.toDataURL('image/jpeg', 0.92));
    this._scrollToSlot(slotId);
  },

  _captureCompareToSlot(slotId){
    // capturar A y B en mosaico horizontal
    const va = document.getElementById('vc-video-a');
    const vb = document.getElementById('vc-video-b');
    if (!va?.videoWidth && !vb?.videoWidth){ alert('Cargá videos en Comparar'); return; }
    const w = Math.max(va.videoWidth||0, vb.videoWidth||0);
    const h = Math.max(va.videoHeight||0, vb.videoHeight||0);
    const tmp = document.createElement('canvas');
    tmp.width = w*2 + 20; tmp.height = h;
    const tx = tmp.getContext('2d');
    tx.fillStyle = '#000'; tx.fillRect(0,0,tmp.width,tmp.height);
    if (va.videoWidth) tx.drawImage(va, 0, 0, w, h);
    if (vb.videoWidth) tx.drawImage(vb, w+20, 0, w, h);
    tx.fillStyle = '#5dd4ff'; tx.font = 'bold 28px monospace'; tx.fillText('A', 14, 36);
    tx.fillStyle = '#c084fc'; tx.fillText('B', w+34, 36);
    this._pasteToSlot(slotId, tmp.toDataURL('image/jpeg', 0.92));
    this._scrollToSlot(slotId);
  },

  // upload imagen externa al slot FMS
  uploadImage(file){
    if (!file) return;
    const dest = document.getElementById('suite-snap-dest').value;
    const reader = new FileReader();
    reader.onload = e => { this._pasteToSlot(dest, e.target.result); this._scrollToSlot(dest); };
    reader.readAsDataURL(file);
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

  _scrollToSlot(slotId){
    const s = document.getElementById(slotId);
    if (s) s.scrollIntoView({behavior:'smooth', block:'center'});
  }
};

})();

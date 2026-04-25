// ThreeBodyChart.js — viewer 3D anatomía (Three.js + Z-Anatomy GLB)
// Renderiza dentro de #three-body-chart. Carga body_skin/muscle/skeleton.glb
// desde /assets. Click en malla → identifica nombre → mapea a panel clínico.

(function(){
'use strict';

const ASSET_BASE = 'assets/';
const LAYERS = [
  { id:'skeleton', file:'body_skeleton.glb', label:'🦴 Esqueleto', color:0xeeeede, opacity:1.0 },
  { id:'muscle',   file:'body_muscle.glb',   label:'💪 Músculos',  color:0xb84a3c, opacity:0.92 },
  { id:'skin',     file:'body_skin.glb',     label:'👤 Piel',      color:0xd9b39a, opacity:0.35 },
];

// Mapeo: substring de nombre de malla (Z-Anatomy usa nombres anatómicos en latín/EN)
// → panel clínico de MoveMetrics. Sin match → solo muestra el label.
const MESH_TO_PANEL = [
  // miembro superior
  ['shoulder|deltoid|scapul|clavic|acromio|rotator|supraspinat|infraspinat|subscapul|teres', 'hombro'],
  ['elbow|biceps|triceps|brachi|olecra|radius|ulna(?!r)', 'codo'],
  ['wrist|carpal|hand|finger|metacarp|phalan(?!.*pelvi)', 'hombro'],
  // tronco
  ['cervical|atlas|axis|neck|sternoclei|trapez', 'cervical'],
  ['thoracic|rib|sternum|pectoral|latissimus|abdomin|oblique|rectus.abd', 'lumbar'],
  ['lumbar|lower.back|psoas|quadratus.lumb|erector', 'lumbar'],
  // miembro inferior
  ['hip|pelvi|ilium|ischium|pubis|gluteu|piriform', 'cadera'],
  ['adductor|gracilis|sartorius|groin|inguinal', 'ingle'],
  ['knee|patell|menisc|cruciate|collateral|quadricep|hamstring|biceps.fem|semitend|semimembr', 'rodilla'],
  ['ankle|talus|calcaneus|tibial|fibul|peroneus|gastrocn|soleus|achilles|tendo.calc', 'tobillo'],
  ['foot|tarsal|metatarsal|toe|plantar|halluc', 'tobillo'],
];

const SHEET_MAP_3D = {
  hombro:'sheet-hombro', cervical:'sheet-cervical', lumbar:'sheet-lumbar',
  rodilla:'sheet-rodilla', tobillo:'sheet-tobillo', codo:'sheet-codo',
  cadera:'sheet-rodilla', ingle:'sheet-groin'
};

function meshToPanel(name){
  const n = (name || '').toLowerCase();
  for (const [pat, panel] of MESH_TO_PANEL){
    if (new RegExp(pat, 'i').test(n)) return panel;
  }
  return null;
}

const TBC = window.TBC = {
  scene:null, camera:null, renderer:null, controls:null, raycaster:null,
  mouse:{x:0,y:0}, container:null, root:null,
  layerObjs: {}, // id → THREE.Group
  layerOn:   { skeleton:true, muscle:true, skin:false },
  hovered:   null, selected:null,
  _origMat: new WeakMap(),
  _started:false,

  init(){
    if (this._started) return;
    this.root = document.getElementById('three-body-chart');
    if (!this.root) return;
    if (typeof THREE === 'undefined'){
      this.root.innerHTML = `<div style="padding:24px;color:var(--red);text-align:center">Three.js no cargó. Verificá conexión.</div>`;
      return;
    }
    this._buildUI();
    this._initThree();
    this._loadModels();
    this._bindEvents();
    this._started = true;
  },

  _buildUI(){
    this.root.innerHTML = `
      <div class="tbc-wrap" style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <div class="tbc-controls" style="display:flex;gap:8px;flex-wrap:wrap;padding:10px 12px;background:var(--bg1);border-bottom:1px solid var(--border);align-items:center">
          <span style="color:var(--text3);font-size:10px;letter-spacing:1px;font-weight:600">CAPAS</span>
          ${LAYERS.map(l => `
            <label class="tbc-layer" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:4px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;color:var(--text)">
              <input type="checkbox" ${this.layerOn[l.id]?'checked':''} onchange="TBC.toggleLayer('${l.id}',this.checked)">
              ${l.label}
            </label>
          `).join('')}
          <span style="flex:1"></span>
          <button class="btn btn-ghost btn-sm" onclick="TBC.resetView()" style="font-size:11px">⟳ Reset vista</button>
        </div>
        <div id="tbc-canvas-wrap" style="position:relative;width:100%;height:520px;background:radial-gradient(ellipse at center, #1a1a1a 0%, #050505 100%)">
          <div id="tbc-loading" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:13px;flex-direction:column;gap:8px">
            <div>Cargando modelo 3D…</div>
            <div id="tbc-loading-detail" style="font-size:10px;color:var(--text4)"></div>
          </div>
          <div id="tbc-info" style="position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,0.75);padding:6px 10px;border-radius:5px;color:var(--neon);font-size:11px;display:none;border:1px solid var(--neon);max-width:60%"></div>
          <div id="tbc-tooltip" style="position:absolute;pointer-events:none;background:rgba(0,0,0,0.9);border:1px solid var(--border);color:var(--text);font-size:11px;padding:4px 8px;border-radius:4px;display:none;z-index:10"></div>
        </div>
        <div style="padding:8px 12px;background:var(--bg1);border-top:1px solid var(--border);font-size:10px;color:var(--text3);text-align:center">
          🖱️ arrastrá para rotar · rueda para zoom · clic en estructura para ver panel clínico
        </div>
      </div>
    `;
    this.container = document.getElementById('tbc-canvas-wrap');
  },

  _initThree(){
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.camera = new THREE.PerspectiveCamera(40, w/h, 0.01, 100);
    this.camera.position.set(0, 1.5, 4);
    this.renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding;
    this.container.appendChild(this.renderer.domElement);

    // luces
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(2, 4, 3);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.3);
    rim.position.set(-3, 2, -2);
    this.scene.add(rim);

    // controles
    if (THREE.OrbitControls){
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.target.set(0, 1, 0);
      this.controls.minDistance = 0.5;
      this.controls.maxDistance = 8;
    }

    this.raycaster = new THREE.Raycaster();

    // animate
    const tick = () => {
      requestAnimationFrame(tick);
      if (this.controls) this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    tick();

    window.addEventListener('resize', () => this._onResize());
  },

  _onResize(){
    if (!this.container || !this.renderer) return;
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.camera.aspect = w/h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  },

  _loadModels(){
    if (!THREE.GLTFLoader){
      this._setLoading('GLTFLoader no disponible');
      return;
    }
    const loader = new THREE.GLTFLoader();
    if (THREE.DRACOLoader){
      const draco = new THREE.DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
      loader.setDRACOLoader(draco);
    }
    let pending = LAYERS.length, anyLoaded = false;
    LAYERS.forEach(l => {
      const url = ASSET_BASE + l.file;
      this._setLoading(`Bajando ${l.file}…`);
      loader.load(url,
        (gltf) => {
          const grp = gltf.scene;
          grp.traverse(o => {
            if (o.isMesh){
              this._origMat.set(o, o.material);
              if (o.material && o.material.transparent === undefined){
                o.material.transparent = l.opacity < 1;
                o.material.opacity = l.opacity;
              }
              o.userData.layer = l.id;
            }
          });
          grp.visible = !!this.layerOn[l.id];
          this.scene.add(grp);
          this.layerObjs[l.id] = grp;
          this._fitCameraIfFirst(grp);
          anyLoaded = true;
          if (--pending === 0) this._loadDone(anyLoaded);
        },
        (xhr) => {
          if (xhr.lengthComputable){
            const pct = (xhr.loaded / xhr.total * 100).toFixed(0);
            this._setLoading(`${l.file} ${pct}%`);
          }
        },
        (err) => {
          console.warn('[TBC] no se pudo cargar', url, err);
          if (--pending === 0) this._loadDone(anyLoaded);
        }
      );
    });
  },

  _loadDone(any){
    const ld = document.getElementById('tbc-loading');
    if (any){
      if (ld) ld.style.display = 'none';
    } else {
      if (ld){
        ld.innerHTML = `<div style="color:var(--amber);text-align:center;padding:20px;max-width:90%">
          <div style="font-size:14px;margin-bottom:8px">⚠️ Modelo 3D no encontrado</div>
          <div style="font-size:11px;color:var(--text3);line-height:1.6">Falta exportar Z-Anatomy a GLB.<br>
          Seguí los pasos de Blender que te pasó Claude.<br>
          Los archivos van en: <code>movemetrics/assets/body_skeleton.glb</code> (etc).</div>
        </div>`;
      }
    }
  },

  _fitCameraIfFirst(grp){
    if (this._fitDone) return;
    const box = new THREE.Box3().setFromObject(grp);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 1.6;
    this.camera.position.set(center.x, center.y, center.z + dist);
    if (this.controls){ this.controls.target.copy(center); this.controls.update(); }
    this._fitDone = true;
    this._homePos = this.camera.position.clone();
    this._homeTarget = center.clone();
  },

  _setLoading(txt){
    const d = document.getElementById('tbc-loading-detail');
    if (d) d.textContent = txt;
  },

  _bindEvents(){
    const c = this.renderer.domElement;
    c.addEventListener('mousemove', e => this._onPointer(e, false));
    c.addEventListener('click',     e => this._onPointer(e, true));
  },

  _onPointer(e, isClick){
    const rect = e.target.getBoundingClientRect();
    this.mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const targets = [];
    Object.entries(this.layerObjs).forEach(([id, grp]) => {
      if (this.layerOn[id]) grp.traverse(o => o.isMesh && targets.push(o));
    });
    const hits = this.raycaster.intersectObjects(targets, false);
    if (!hits.length){
      this._clearHover();
      this._hideTooltip();
      return;
    }
    const obj = hits[0].object;
    const name = obj.name || '(sin nombre)';
    if (isClick){
      const panel = meshToPanel(name);
      this._showInfo(name, panel);
      if (panel && SHEET_MAP_3D[panel]){
        const sheetId = SHEET_MAP_3D[panel];
        if (typeof openModal === 'function') openModal(sheetId);
        if (typeof initKlinicalSheet === 'function') initKlinicalSheet(panel);
      }
    } else {
      this._setHover(obj);
      this._showTooltip(e, name);
    }
  },

  _setHover(obj){
    if (this.hovered === obj) return;
    this._clearHover();
    this.hovered = obj;
    if (!this._origMat.has(obj)) this._origMat.set(obj, obj.material);
    obj.material = obj.material.clone();
    obj.material.emissive = new THREE.Color(0x39FF7A);
    obj.material.emissiveIntensity = 0.4;
  },

  _clearHover(){
    if (this.hovered){
      const orig = this._origMat.get(this.hovered);
      if (orig) this.hovered.material = orig;
      this.hovered = null;
    }
  },

  _showTooltip(e, txt){
    const tt = document.getElementById('tbc-tooltip');
    if (!tt) return;
    const rect = this.container.getBoundingClientRect();
    tt.style.left = (e.clientX - rect.left + 12) + 'px';
    tt.style.top  = (e.clientY - rect.top  + 12) + 'px';
    tt.textContent = txt;
    tt.style.display = 'block';
  },
  _hideTooltip(){
    const tt = document.getElementById('tbc-tooltip');
    if (tt) tt.style.display = 'none';
  },

  _showInfo(name, panel){
    const el = document.getElementById('tbc-info');
    if (!el) return;
    el.innerHTML = panel
      ? `<b>${name}</b> → abriendo panel clínico <span style="color:#fff">${panel}</span>`
      : `<b>${name}</b> <span style="color:var(--text3)">(sin panel clínico mapeado)</span>`;
    el.style.display = 'block';
    clearTimeout(this._infoT);
    this._infoT = setTimeout(() => el.style.display='none', 4000);
  },

  toggleLayer(id, on){
    this.layerOn[id] = on;
    if (this.layerObjs[id]) this.layerObjs[id].visible = on;
  },

  resetView(){
    if (this._homePos && this.controls){
      this.camera.position.copy(this._homePos);
      this.controls.target.copy(this._homeTarget);
      this.controls.update();
    }
  }
};

})();

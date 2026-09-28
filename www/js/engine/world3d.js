// Motore grafico 3D dell'esplorazione (three.js), stile "HD-2D":
// ambienti 3D illuminati con ombre, acqua e post-processing, personaggi
// disegnati come sprite in piedi nel mondo. 1 unità = 1 casella.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Person, makeBike, makeScooter, makeVespa, makeHorse, makeDonkey } from './character3d.js';
const MAKE_VEHICLE = { bici:makeBike, monopattino:makeScooter, vespa:makeVespa, cavallo:makeHorse, asino:makeDonkey };

// ---------- util ----------
// Solo su telefoni/tablet (schermo touch o finestra stretta) la camera sta più lontana:
// con il display piccolo la vista ravvicinata rende difficile orientarsi.
export const ZOOM = {
  min:0.55, max:1.8,
  load(){ try { const z = parseFloat(localStorage.getItem('menace_zoom')); return z > 0 ? Math.min(this.max, Math.max(this.min, z)) : 1; } catch { return 1; } },
  save(z){ try { localStorage.setItem('menace_zoom', String(z)); } catch {} },
};
export const MOBILE_ZOOM = ()=>{
  const touch = window.matchMedia?.('(pointer: coarse)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  if (!(touch || small)) return 1;
  return window.innerWidth < window.innerHeight ? 1.6 : 1.25;   // in verticale la vista orizzontale è stretta: più lontano
};
function hash(x, y, s=0){
  let h = (x*374761393 + y*668265263 + s*2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function smoothNoise(x, y, s){
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
  const a = hash(xi,yi,s), b = hash(xi+1,yi,s), c = hash(xi,yi+1,s), d = hash(xi+1,yi+1,s);
  return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v;
}
function fbm(x, y, s=1){ return smoothNoise(x,y,s)*0.55 + smoothNoise(x*2.1,y*2.1,s+7)*0.3 + smoothNoise(x*4.3,y*4.3,s+13)*0.15; }
const C = c=>new THREE.Color(c);
// "vedo attraverso": tutto ciò che sta tra la camera e il giocatore, in un cerchio attorno a lui
// sullo schermo, si trafora a puntini (tetti e muri non lo nascondono più nelle vie strette)
const XRAY = { xrC:{ value:new THREE.Vector2(-1e5, -1e5) }, xrR:{ value:0 }, xrP:{ value:new THREE.Vector2() }, xrF:{ value:new THREE.Vector2(0, -1) }, xrInv:{ value:new THREE.Matrix4() } };
function seeThrough(m){
  m.onBeforeCompile = sh=>{
    Object.assign(sh.uniforms, XRAY);
    sh.fragmentShader = 'uniform vec2 xrC;\nuniform float xrR;\nuniform vec2 xrP;\nuniform vec2 xrF;\nuniform mat4 xrInv;\n' + sh.fragmentShader.replace('void main() {', `void main() {
      {
        vec2 xd = gl_FragCoord.xy - xrC;
        float xq = dot(xd, xd) / max(xrR * xrR, 1.0);
        // solo ciò che sta tra la camera e il giocatore (in pianta) e sopra il suolo: il terreno
        // e le case alle sue spalle restano intere
        vec3 xw = (xrInv * vec4(-vViewPosition, 1.0)).xyz;
        if (xq < 1.0 && xw.y > 0.3 && dot(xw.xz - xrP, xrF) < -0.15){
          float n = fract(sin(dot(floor(gl_FragCoord.xy / 2.0), vec2(12.9898, 78.233))) * 43758.5453);
          if (n < 0.92 - xq * 0.75) discard;
        }
      }`);
  };
  m.customProgramCacheKey = ()=>'xray';
  return m;
}
// stato che appartiene alla mappa costruita (messo da parte insieme al paese quando si entra in casa)
const STASH_KEYS = ['mapGroup', 'map', 'mapName', 'indoor', 'animated', 'lamps', 'windows', 'lampMat', 'winMat', 'roseMat',
  'dynMats', 'W', 'H', 'getCh', 'streets', 'lampLights', 'water', 'weather', 'built', 'mergedCount', '_lampT'];
const mat = (color, o={})=>seeThrough(new THREE.MeshStandardMaterial({ color, roughness:0.85, metalness:0, ...o }));

function canvasTex(w, h, paint, repeat){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat){ t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

// ---------- materiali condivisi (creati una volta sola) ----------
const TEX = {};
function textures(){
  if (TEX.ready) return TEX;
  // coppi lombardi in terracotta
  TEX.roof = canvasTex(128, 128, (g, w, h)=>{
    g.fillStyle = '#a4472e'; g.fillRect(0,0,w,h);
    for (let r=0; r<8; r++) for (let k=0; k<8; k++){
      const x = k*16 + (r%2)*8, y = r*16;
      const tone = 150 + Math.floor(hash(k,r,3)*60);
      g.fillStyle = `rgb(${tone+40},${Math.floor(tone*0.45)},${Math.floor(tone*0.3)})`;
      g.beginPath(); g.ellipse(x+8, y+8, 7, 9, 0, 0, Math.PI*2); g.fill();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y+14, 16, 2);
    }
  }, true);
  // intonaco con macchie di umidità
  TEX.plaster = canvasTex(128, 128, (g, w, h)=>{
    g.fillStyle = '#fff'; g.fillRect(0,0,w,h);
    for (let i=0; i<900; i++){
      const a = hash(i,1,5)*0.07;
      g.fillStyle = `rgba(90,70,40,${a})`;
      g.fillRect(hash(i,2,5)*w, hash(i,3,5)*h, 2+hash(i,4,5)*6, 2+hash(i,5,5)*6);
    }
    const gr = g.createLinearGradient(0, h*0.8, 0, h);
    gr.addColorStop(0, 'rgba(60,50,30,0)'); gr.addColorStop(1, 'rgba(60,50,30,.25)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, true);
  // mattoni rossi (cortine, muretti)
  TEX.brick = canvasTex(128, 128, (g, w, h)=>{
    g.fillStyle = '#8a8076'; g.fillRect(0,0,w,h);
    for (let r=0; r<16; r++) for (let k=0; k<5; k++){
      const x = k*28 - (r%2)*14, y = r*8;
      const t = hash(k,r,9);
      g.fillStyle = `rgb(${140+t*50|0},${58+t*25|0},${40+t*15|0})`;
      g.fillRect(x+1, y+1, 26, 6);
      if (x < 0) g.fillRect(x+1+w, y+1, 26, 6);
    }
  }, true);
  // pietra (chiese, campanili, torri)
  TEX.stone = canvasTex(128, 128, (g, w, h)=>{
    g.fillStyle = '#b9b2a4'; g.fillRect(0,0,w,h);
    for (let r=0; r<8; r++) for (let k=0; k<4; k++){
      const x = k*32 + (r%2)*16, y = r*16, t = hash(k,r,11);
      g.fillStyle = `rgb(${170+t*50|0},${164+t*46|0},${150+t*40|0})`;
      g.fillRect(x+1, y+1, 30, 14);
      if (x+32 > w) g.fillRect(x+1-w, y+1, 30, 14);
    }
  }, true);
  // legno
  TEX.wood = canvasTex(64, 64, (g, w, h)=>{
    g.fillStyle = '#7a5433'; g.fillRect(0,0,w,h);
    for (let i=0; i<8; i++){
      g.fillStyle = `rgba(${40+hash(i,0,4)*40|0},20,5,.35)`;
      g.fillRect(0, i*8, w, 1);
      for (let k=0; k<30; k++){ g.fillStyle='rgba(30,15,5,.15)'; g.fillRect(hash(i,k,6)*w, i*8+hash(k,i,7)*8, 6, 1); }
    }
  }, true);
  // fogliame per siepi
  TEX.leaves = canvasTex(64, 64, (g, w, h)=>{
    g.fillStyle = '#2c5a26'; g.fillRect(0,0,w,h);
    for (let i=0; i<260; i++){
      const t = hash(i,7,12);
      g.fillStyle = `rgb(${30+t*50|0},${80+t*70|0},${25+t*30|0})`;
      g.beginPath(); g.ellipse(hash(i,1,12)*w, hash(i,2,12)*h, 3, 2, hash(i,3,12)*3, 0, Math.PI*2); g.fill();
    }
  }, true);
  TEX.ready = true;
  return TEX;
}

// ---------- terreno: colore per casella ----------
const GROUND_COL = {
  '.':[92,150,62], ',':[70,128,48], 'F':[98,152,66], '=':[88,88,92], ':':[166,160,150],
  '~':[74,66,52], 'B':[74,66,52], '^':[118,112,98], 'w':[150,104,64], 'R':[150,40,48],
  'M':[210,190,160], ' ':[10,12,22],
};
// caselle "oggetto" che poggiano su un pavimento: lo si deduce dai vicini
function floorOf(getCh, x, y){
  const cnt = {};
  for (const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1]]){
    const c = getCh(x+dx, y+dy);
    if (GROUND_COL[c] && c !== '~' && c !== ' ' && c !== 'M') cnt[c] = (cnt[c]||0) + 1;
  }
  let best = '.', n = 0;
  for (const k in cnt) if (cnt[k] > n){ n = cnt[k]; best = k; }
  return best;
}

function paintGroundTexture(map, getCh, W, H, indoor){
  const P = Math.max(8, Math.min(32, Math.floor(4096 / Math.max(W, H))));   // mappe OSM grandi: meno pixel per casella
  return canvasTex(W*P, H*P, (g)=>{
    for (let y=0; y<H; y++) for (let x=0; x<W; x++){
      let ch = getCh(x, y);
      if (!GROUND_COL[ch]) ch = floorOf(getCh, x, y);
      const [r,gg,b] = GROUND_COL[ch];
      g.fillStyle = `rgb(${r},${gg},${b})`;
      g.fillRect(x*P, y*P, P, P);
    }
    // sfuma i confini tra superfici (niente griglia visibile)
    const snap = document.createElement('canvas'); snap.width = W*P; snap.height = H*P;
    snap.getContext('2d').drawImage(g.canvas, 0, 0);
    g.filter = `blur(${Math.max(1, P * 5 / 32)}px)`; g.drawImage(snap, 0, 0); g.filter = 'none';
    // dettagli per casella (disegnati a 32px e scalati)
    const sc = P / 32;
    g.save(); g.scale(sc, sc);
    for (let y=0; y<H; y++) for (let x=0; x<W; x++){
      const ch = getCh(x, y), X = x*32, Y = y*32;
      if (ch === ':'){ // pavé a lisca / cubetti di porfido
        for (let r=0; r<4; r++) for (let k=0; k<4; k++){
          const t = hash(x*4+k, y*4+r, 21);
          g.fillStyle = `rgba(${120+t*60|0},${110+t*50|0},${100+t*45|0},.9)`;
          g.fillRect(X+k*8+(r%2)*4+1, Y+r*8+1, 6, 6);
        }
      } else if (ch === '='){ // asfalto con grana
        for (let i=0; i<30; i++){
          const t = hash(x*31+i, y, 22);
          g.fillStyle = t > .5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.12)';
          g.fillRect(X+hash(i,x,23)*32, Y+hash(i,y,24)*32, 2, 2);
        }
      } else if (ch === '.' || ch === ',' || ch === 'F'){
        for (let i=0; i<26; i++){
          const t = hash(x*37+i, y*11, 25);
          g.fillStyle = t > .6 ? 'rgba(200,230,120,.20)' : 'rgba(20,60,10,.20)';
          g.fillRect(X+hash(i,x,26)*32, Y+hash(i,y,27)*32, 1+t*2, 3);
        }
      } else if (ch === 'w'){ // parquet
        for (let r=0; r<4; r++){
          g.fillStyle = `rgba(60,30,10,${.15+hash(x,y*4+r,28)*.2})`;
          g.fillRect(X, Y+r*8, 32, 1);
          g.fillRect(X+hash(x,r,29)*32, Y+r*8, 1, 8);
        }
      } else if (ch === 'R'){
        g.strokeStyle = 'rgba(240,200,90,.6)'; g.lineWidth = 2;
        g.strokeRect(X+3, Y+3, 26, 26);
      } else if (ch === '^'){
        for (let i=0; i<10; i++){
          g.fillStyle = `rgba(${hash(i,x,30)>.5?255:0},${hash(i,x,30)>.5?255:0},${hash(i,x,30)>.5?255:0},.1)`;
          g.fillRect(X+hash(i,x,31)*32, Y+hash(i,y,32)*32, 5, 3);
        }
      }
    }
    g.restore();
  });
}

// altezza del terreno: alvei incassati, montagne in rilievo
function heightAt(getCh, fx, fy){
  // media pesata delle caselle vicine per rilievi morbidi
  let h = 0, wsum = 0;
  for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++){
    const x = Math.floor(fx + dx*0.5), y = Math.floor(fy + dy*0.5);
    const ch = getCh(x, y);
    let v = 0;
    if (ch === '~') v = -0.45;
    else if (ch === 'B') v = -0.45;
    else if (ch === '^') v = 1.2 + fbm(fx*0.35, fy*0.35, 3) * 2.6;
    const w = dx === 0 && dy === 0 ? 2 : 1;
    h += v * w; wsum += w;
  }
  return h / wsum;
}

// ---------- geometrie di base ----------
function prismRoof(w, d, h, alongX){
  // tetto a capanna: triangolo estruso lungo l'asse più lungo
  const s = new THREE.Shape();
  const span = alongX ? d : w;
  s.moveTo(-span/2 - 0.12, 0); s.lineTo(0, h); s.lineTo(span/2 + 0.12, 0); s.lineTo(-span/2 - 0.12, 0);
  const len = (alongX ? w : d) + 0.24;
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled:false });
  g.translate(0, 0, -len/2);
  if (alongX) g.rotateY(Math.PI/2);
  // UV: planari per la texture dei coppi
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i=0; i<pos.count; i++){
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    uv.setXY(i, (alongX ? x : z) * 1.2, (alongX ? Math.abs(z) : Math.abs(x)) * 1.2 + y);
  }
  g.computeVertexNormals();
  return g;
}

function addBox(group, w, h, d, material, x, y, z, cast=true){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = true;
  group.add(m);
  return m;
}

// ---------- scena ----------
export class World3D {
  constructor(canvas){
    this.canvas = canvas;
    // niente MSAA sul canvas: la scena passa dal post-processing (render target senza MSAA), sul canvas
    // arriva solo un quadrato a tutto schermo, dove l'antialiasing non cambia nulla ma costa memoria e banda
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias:false, powerPreference:'high-performance' });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 16/9, 0.1, 400);
    this.camTarget = new THREE.Vector3();
    this.camPos = new THREE.Vector3();
    this.shake = 0;

    // luci
    this.hemi = new THREE.HemisphereLight(0xcfe6ff, 0x5a6b3a, 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);

    // cielo fisico (Preetham)
    this.sky = new Sky();
    this.sky.scale.setScalar(350);
    const su = this.sky.material.uniforms;
    su.turbidity.value = 4; su.rayleigh.value = 1.4;
    su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.8;
    this.scene.add(this.sky);

    // post-processing: bloom + tilt-shift (effetto diorama) + color grade
    const comp = this.composer = new EffectComposer(r);
    comp.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.35, 0.6, 0.85);
    comp.addPass(this.bloom);
    this.tilt = new ShaderPass({
      uniforms: { tDiffuse:{ value:null }, res:{ value:new THREE.Vector2(1,1) }, amount:{ value:1.0 },
                  tint:{ value:new THREE.Vector3(1,1,1) }, vign:{ value:0.35 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform vec2 res; uniform float amount; uniform vec3 tint; uniform float vign;
        varying vec2 vUv;
        void main(){
          float band = smoothstep(0.3, 0.75, abs(vUv.y - 0.5)) * amount;
          vec2 px = 1.0 / res * band * 2.2;
          vec4 c = texture2D(tDiffuse, vUv) * 0.2;
          c += texture2D(tDiffuse, vUv + vec2( px.x, 0.)) * 0.1;
          c += texture2D(tDiffuse, vUv + vec2(-px.x, 0.)) * 0.1;
          c += texture2D(tDiffuse, vUv + vec2(0.,  px.y)) * 0.1;
          c += texture2D(tDiffuse, vUv + vec2(0., -px.y)) * 0.1;
          c += texture2D(tDiffuse, vUv + px * 1.6) * 0.1;
          c += texture2D(tDiffuse, vUv - px * 1.6) * 0.1;
          c += texture2D(tDiffuse, vUv + vec2(px.x, -px.y) * 1.6) * 0.1;
          c += texture2D(tDiffuse, vUv + vec2(-px.x, px.y) * 1.6) * 0.1;
          c.rgb *= tint;
          // saturazione leggermente aumentata, stile diorama
          float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
          c.rgb = mix(vec3(l), c.rgb, 1.12);
          float d = distance(vUv, vec2(0.5));
          c.rgb *= 1.0 - vign * smoothstep(0.35, 0.85, d);
          gl_FragColor = c;
        }`,
    });
    comp.addPass(this.tilt);
    comp.addPass(new OutputPass());

    this.clock = 0;
    this.zoom = ZOOM.load();
    this.mapGroup = null;
    this.actors = new Map();
    this.animated = [];   // oggetti con update(t)
    this.lamps = [];
    this.windows = [];
    this.water = null;
    this.weather = null;
    this._resize = ()=>this.resize();
    window.addEventListener('resize', this._resize);
  }

  resize(){
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    if (this._w === w && this._h === h) return;
    this._w = w; this._h = h;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    this.tilt.uniforms.res.value.set(w*pr, h*pr);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------- costruzione della mappa ----------
  build(map, mapName, triggers){
    // uscendo da una casa si ritrova il paese già costruito (erano secondi di attesa a ogni porta)
    if (this.stash && this.stash.map === map && this.stash.mapName === mapName){
      this.dispose();
      Object.assign(this, this.stash); this.stash = null;
      this.scene.add(this.mapGroup);
      this.finishScene();
      return;
    }
    if (map.indoor && this.mapGroup && !this.indoor){
      // si entra in una casa: il paese resta da parte, senza i personaggi (si ricreano da soli)
      for (const a of this.actors.values()){ this.mapGroup.remove(a.mesh); a.dispose(); }
      this.actors.clear();
      this.scene.remove(this.mapGroup);
      this.stash = Object.fromEntries(STASH_KEYS.map(k=>[k, this[k]]));
      this.mapGroup = null;
    } else if (!map.indoor && this.stash){
      this.disposeGroup(this.stash.mapGroup); this.stash = null;   // si va altrove: il paese messo da parte non serve più
    }
    this.dispose();
    textures();
    const g = this.mapGroup = new THREE.Group();
    this.scene.add(g);
    this.map = map; this.mapName = mapName;
    this.indoor = !!map.indoor;
    this.animated = []; this.lamps = []; this.windows = [];
    // materiali che cambiano di notte: uno solo per tipo, così si possono fondere le geometrie
    this.lampMat = new THREE.MeshStandardMaterial({ color:0xfff0c0, emissive:0xffc070, emissiveIntensity:0.2 });
    this.winMat = new THREE.MeshStandardMaterial({ color:0x2a3542, roughness:0.2, metalness:0.3, emissive:0xffb35a, emissiveIntensity:0 });
    this.roseMat = new THREE.MeshStandardMaterial({ color:0x3050a0, emissive:0x2040a0, emissiveIntensity:0.3, metalness:0.2, roughness:0.3 });
    this.windows = [this.winMat, this.roseMat];
    this.dynMats = new Set([this.lampMat, this.winMat, this.roseMat]);
    const H = map.tiles.length, W = Math.max(...map.tiles.map(r=>r.length));
    this.W = W; this.H = H;
    const getCh = (x, y)=>{ const r = map.tiles[y]; return (!r || x < 0 || x >= r.length) ? ' ' : r[x]; };
    this.getCh = getCh;

    // terreno a rilievo
    const seg = W * H > 6000 ? 1 : 3;
    const geo = new THREE.PlaneGeometry(W, H, W*seg, H*seg);
    geo.rotateX(-Math.PI/2);
    geo.translate(W/2, 0, H/2);
    const pos = geo.attributes.position;
    for (let i=0; i<pos.count; i++){
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, this.indoor ? 0 : heightAt(getCh, x, z));
    }
    geo.computeVertexNormals();
    const groundTex = paintGroundTexture(map, getCh, W, H, this.indoor);
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map:groundTex, roughness:0.95 }));
    ground.receiveShadow = true;
    g.add(ground);

    if (!this.indoor){
      // pianura che prosegue oltre i bordi della mappa + Prealpi all'orizzonte
      // quattro fasce attorno alla mappa (non coprono l'alveo del fiume)
      const om = mat(0x4f7a38, { roughness:1 }), E = 300;
      for (const [x0, z0, x1, z1] of [[-E, -E, W+E, 0], [-E, H, W+E, H+E], [-E, 0, 0, H], [W, 0, W+E, H]]){
        const o = new THREE.Mesh(new THREE.PlaneGeometry(x1-x0, z1-z0), om);
        o.rotation.x = -Math.PI/2; o.position.set((x0+x1)/2, -0.02, (z0+z1)/2); o.receiveShadow = true;
        g.add(o);
      }
      this.buildBackdrop(g, W, H);
      this.buildWater(g, getCh, W, H);
    }

    this.buildProps(g, getCh, W, H, triggers);
    this.streets = map.streets || [];
    if (this.streets.length) this.buildStreetSigns(g, getCh);
    this.lampLights = [];
    if (this.lamps.length){
      for (let i=0; i<6; i++){ const l = new THREE.PointLight(0xffb870, 0, 10, 1.5); l.position.y = 2; g.add(l); this.lampLights.push(l); }
    }
    this.splitInstances(g);
    this.mergeStatic(g);
    this.freezeStatic(g);

    if (!this.indoor) this.buildWeather(g);
    this.finishScene();
  }

  // luce: cielo e ombre in base all'ora reale, nebbia e sfondo
  finishScene(){
    this.setupLighting(this.W, this.H);
    this.scene.fog = this.indoor ? null : new THREE.Fog(0xbfd6ea, 40, 160);
    this.sky.visible = !this.indoor;
    this.scene.background = this.indoor ? new THREE.Color(0x0b0a10) : null;
  }

  // Erba, alberi e fiori sono InstancedMesh grandi quanto la mappa: la loro sfera di ingombro
  // è sempre nell'inquadratura e si disegnavano tutte le istanze (e di nuovo per le ombre).
  // Divise in blocchi di 16x16 caselle, three.js scarta quelle fuori schermo: stessa scena.
  splitInstances(g){
    const S = 16, m = new THREE.Matrix4(), p = new THREE.Vector3(), c = new THREE.Color();
    const big = [];
    g.traverse(o=>{ if (o.isInstancedMesh && o.count > 64) big.push(o); });
    for (const im of big){
      const parts = new Map();
      for (let i = 0; i < im.count; i++){
        im.getMatrixAt(i, m); p.setFromMatrixPosition(m);
        const k = Math.floor(p.x / S) + ',' + Math.floor(p.z / S);
        if (!parts.has(k)) parts.set(k, []);
        parts.get(k).push(i);
      }
      if (parts.size < 2) continue;
      for (const ids of parts.values()){
        const part = new THREE.InstancedMesh(im.geometry, im.material, ids.length);
        part.castShadow = im.castShadow; part.receiveShadow = im.receiveShadow;
        ids.forEach((i, j)=>{
          im.getMatrixAt(i, m); part.setMatrixAt(j, m);
          if (im.instanceColor){ im.getColorAt(i, c); part.setColorAt(j, c); }
        });
        part.computeBoundingSphere();
        im.parent.add(part);
      }
      im.parent.remove(im); im.dispose();   // dispose() libera solo gli attributi d'istanza: la geometria è condivisa
    }
  }

  // Fonde le mesh statiche con lo stesso materiale in blocchi di 16x16 caselle:
  // le mappe OSM hanno migliaia di pezzi (muri, tetti, finestre) e senza
  // fusione le chiamate di disegno sarebbero decine di migliaia.
  mergeStatic(g){
    g.updateMatrixWorld(true);
    const CH = 16, buckets = new Map(), mats = new Map();
    const keyOf = m=>this.dynMats.has(m) ? m.uuid : [m.type, m.color?.getHex(), m.map?.uuid, m.emissive?.getHex(), m.emissiveIntensity,
      m.roughness, m.metalness, m.transparent, m.opacity, m.side, m.flatShading, m.alphaTest].join('|');
    const wp = new THREE.Vector3();
    g.traverse(o=>{
      if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.material.isShaderMaterial) return;
      for (let p = o; p && p !== g; p = p.parent) if (p.userData.dyn) return;
      if (o.geometry.attributes.position.count > 20000) return;           // il terreno resta com'è
      wp.setFromMatrixPosition(o.matrixWorld);
      const mk = keyOf(o.material);
      const k = mk + '#' + Math.floor(wp.x / CH) + ',' + Math.floor(wp.z / CH) + '#' + o.castShadow + '#' + !!o.geometry.index;
      if (!buckets.has(k)){ buckets.set(k, []); mats.set(k, o.material); }
      buckets.get(k).push(o);
    });
    let merged = 0;
    for (const [k, list] of buckets){
      if (list.length < 2) continue;
      const geos = list.map(o=>{
        const geo = o.geometry.clone();   // gli indici restano: vertici condivisi, meno lavoro per la GPU
        for (const a of Object.keys(geo.attributes)) if (!['position','normal','uv'].includes(a)) geo.deleteAttribute(a);
        if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
        geo.applyMatrix4(o.matrixWorld);
        return geo;
      });
      const mg = mergeGeometries(geos, false);
      geos.forEach(x=>x.dispose());
      if (!mg) continue;
      const mesh = new THREE.Mesh(mg, mats.get(k));
      mesh.castShadow = list[0].castShadow; mesh.receiveShadow = true;
      g.add(mesh);
      for (const o of list){ o.parent.remove(o); o.geometry.dispose(); }
      merged += list.length;
    }
    this.mergedCount = merged;
  }

  // Dopo la fusione restano migliaia di gruppi vuoti (finestre, porte) e oggetti che non si
  // muovono mai: via i primi, matrici calcolate una volta sola per i secondi. three.js non
  // deve più ricomporle e visitarle a ogni fotogramma. Gli oggetti animati (userData.dyn) e le luci restano liberi.
  freezeStatic(g){
    const prune = o=>{
      for (const c of [...o.children]) prune(c);
      if (o !== g && o.type === 'Group' && !o.children.length && !o.userData.dyn) o.parent.remove(o);
    };
    prune(g);
    g.updateMatrixWorld(true);
    const freeze = o=>{
      if (o.userData.dyn || o.isLight) return;          // si muove: il sottoalbero resta automatico
      o.matrixAutoUpdate = false;
      for (const c of o.children) freeze(c);
    };
    for (const c of g.children) freeze(c);
  }

  // cartelli con il nome delle vie (dati OpenStreetMap), accanto alla strada
  buildStreetSigns(g, getCh){
    const walkSide = (x, y)=>{
      for (const [dx, dy] of [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1]]){
        const c = getCh(x + dx, y + dy);
        if ('.,F'.includes(c)) return [x + dx, y + dy];
      }
      return null;
    };
    const pole = mat(0x55595f, { metalness:0.6, roughness:0.4 });
    const placed = [];
    for (const st of this.streets){
      // punto a metà della polilinea più lunga
      let best = null;
      for (const l of st.lines) if (!best || l.length > best.length) best = l;
      const n = best.length > 12 ? [best[Math.floor(best.length * 0.3)], best[Math.floor(best.length * 0.7)]] : [best[Math.floor(best.length / 2)]];
      for (const p of n){
        const spot = walkSide(p[0], p[1]);
        if (!spot || placed.some(q=>Math.hypot(q[0] - spot[0], q[1] - spot[1]) < 6)) continue;
        placed.push(spot);
        const tex = canvasTex(256, 64, (c, w, h)=>{
          c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, w, h);
          c.strokeStyle = '#1d3f7a'; c.lineWidth = 6; c.strokeRect(4, 4, w - 8, h - 8);
          c.fillStyle = '#1d3f7a'; c.textAlign = 'center'; c.textBaseline = 'middle';
          let fs = 30; c.font = `bold ${fs}px Arial, sans-serif`;
          while (c.measureText(st.name).width > w - 20 && fs > 12){ fs--; c.font = `bold ${fs}px Arial, sans-serif`; }
          c.fillText(st.name, w/2, h/2 + 1);
        });
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), new THREE.MeshStandardMaterial({ map:tex, side:THREE.DoubleSide }));
        plate.position.set(spot[0] + 0.5, 1.55, spot[1] + 0.5); plate.rotation.x = -0.25;
        plate.userData.dyn = true;   // texture propria: non si fonde
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), pole);
        post.position.set(spot[0] + 0.5, 0.75, spot[1] + 0.5); post.castShadow = true;
        g.add(plate, post);
      }
    }
  }

  // nome della via più vicina (entro 2,5 caselle) per l'HUD
  streetAt(x, z){
    let best = null, bd = 2.5;
    for (const st of this.streets || []) for (const l of st.lines) for (let i=1; i<l.length; i++){
      const [ax, ay] = l[i-1], [bx, by] = l[i];
      const dx = bx - ax, dy = by - ay, L = dx*dx + dy*dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax - 0.5) * dx + (z - ay - 0.5) * dy) / L));
      const d = Math.hypot(x - ax - 0.5 - t*dx, z - ay - 0.5 - t*dy);
      if (d < bd){ bd = d; best = st.name; }
    }
    return best;
  }

  dispose(){
    if (!this.mapGroup) return;
    this.scene.remove(this.mapGroup);
    this.disposeGroup(this.mapGroup);
    for (const a of this.actors.values()) a.dispose();
    this.actors.clear();
    this.mapGroup = null;
  }
  disposeGroup(group){
    group.traverse(o=>{
      o.geometry?.dispose();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms){ if (m.map && m.map !== TEX.roof && m.map !== TEX.plaster && m.map !== TEX.brick && m.map !== TEX.stone && m.map !== TEX.wood && m.map !== TEX.leaves) m.map.dispose(); m.dispose(); }
    });
  }

  // Campo dei Fiori e il Sacro Monte a nord, colline moreniche attorno
  buildBackdrop(g, W, H){
    const ridge = (cx, cz, len, height, seed, color, rot=0)=>{
      const geo = new THREE.PlaneGeometry(len, height*2.2, 80, 12);
      const p = geo.attributes.position;
      for (let i=0; i<p.count; i++){
        const x = p.getX(i), y = p.getY(i);
        const prof = height * (0.55 + 0.45*fbm(x*0.03 + seed, seed, seed)) * (1 - Math.pow(Math.abs(x)/(len/2), 3));
        const t = (y / (height*2.2)) + 0.5; // 0 basso, 1 alto
        p.setY(i, t * prof);
        p.setZ(i, -t * height * 0.8 + fbm(x*0.1, y*0.1, seed+1) * 2);
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat(color, { roughness:1, flatShading:true }));
      m.position.set(cx, -0.5, cz); m.rotation.y = rot;
      g.add(m);
      return m;
    };
    // Campo dei Fiori (verde scuro, lunga dorsale) con le antenne in vetta
    ridge(W/2 - 10, -55, 190, 30, 4, 0x3b5a3a);
    ridge(W/2 + 40, -95, 260, 55, 9, 0x6c7f95);          // Alpi lontane, azzurrine
    ridge(-50, H/2, 160, 14, 17, 0x4c6d3e, Math.PI/2);    // colline moreniche ovest
    ridge(W + 50, H/2, 160, 12, 23, 0x4c6d3e, -Math.PI/2);
    ridge(W/2, H + 60, 200, 10, 31, 0x55773f, Math.PI);
    // neve sul Monte Rosa all'orizzonte
    const rosa = new THREE.Mesh(new THREE.ConeGeometry(22, 26, 7), mat(0xe9eef7, { flatShading:true, roughness:0.6 }));
    rosa.position.set(W/2 - 70, 8, -120); g.add(rosa);
    for (const [dx, h] of [[-8, 5], [-3, 7], [4, 6]]){
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, h, 5), mat(0xd9d9d9));
      ant.position.set(W/2 - 10 + dx, 30 + h/2 - 2, -62); g.add(ant);
      const blink = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), new THREE.MeshBasicMaterial({ color:0xff3020 }));
      blink.position.set(ant.position.x, ant.position.y + h/2, ant.position.z); g.add(blink);
      blink.userData.dyn = true;
      this.animated.push({ update:(t)=>{ blink.visible = Math.sin(t*2 + dx) > 0; } });
    }
    // il Grand Hotel Campo dei Fiori, palazzone liberty in cima
    const hotel = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 2), mat(0xd9c8a6));
    hotel.position.set(W/2 - 22, 25, -60); g.add(hotel);
  }

  buildWater(g, getCh, W, H){
    let any = false;
    for (let y=0; y<H && !any; y++) for (let x=0; x<W; x++) if (getCh(x,y) === '~' || getCh(x,y) === 'B'){ any = true; break; }
    if (!any) return;
    const geo = new THREE.PlaneGeometry(W, H, 1, 1);
    geo.rotateX(-Math.PI/2); geo.translate(W/2, -0.16, H/2);
    const wm = new THREE.ShaderMaterial({
      transparent:true, fog:true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        light:{ value:1 }, time:{ value:0 }, sunDir:{ value:new THREE.Vector3(0.4,0.8,0.3) },
        deep:{ value:C(0x17444f) }, shallow:{ value:C(0x3b8580) }, skyc:{ value:C(0xcfe3f0) },
      }]),
      vertexShader: `
        varying vec3 vW;
        ${THREE.ShaderChunk.fog_pars_vertex}
        void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz;
          vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
          ${THREE.ShaderChunk.fog_vertex}
        }`,
      fragmentShader: `
        uniform float time, light; uniform vec3 sunDir, deep, shallow, skyc; varying vec3 vW;
        ${THREE.ShaderChunk.fog_pars_fragment}
        float h(vec2 p){ return sin(p.x*3.1 + time*1.7)*0.5 + sin(p.y*2.3 - time*2.3 + p.x)*0.5
                              + sin((p.x+p.y)*5.7 + time*3.1)*0.25; }
        void main(){
          vec2 p = vW.xz + vec2(0., time*0.6);   // corrente dell'Olona verso sud
          float e = 0.05;
          float h0 = h(p);
          vec3 n = normalize(vec3((h0 - h(p+vec2(e,0.))) / e * 0.08, 1.0, (h0 - h(p+vec2(0.,e))) / e * 0.08));
          vec3 v = normalize(cameraPosition - vW);
          float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
          vec3 c = mix(shallow, deep, 0.55 + 0.45*sin(h(p*0.4)));
          c = mix(c, skyc, 0.05 + fr*0.55);
          float spec = pow(max(dot(reflect(-normalize(sunDir), n), v), 0.0), 80.0);
          c += vec3(1.0, 0.95, 0.8) * spec * 1.6;
          float foam = smoothstep(0.9, 1.15, h(p*1.7)) * 0.35;
          c += foam;
          gl_FragColor = vec4(c * light, 0.86);
          ${THREE.ShaderChunk.fog_fragment}
        }`,
    });
    const water = new THREE.Mesh(geo, wm);
    g.add(water);
    this.water = wm;
  }

  buildProps(g, getCh, W, H, triggers){
    const T = textures();
    const visited = new Set();
    const key = (x,y)=>x+','+y;
    const tris = triggers || [];
    const trunkM = mat(0x5b3b24), plasterPal = [0xe8c27a, 0xf1e2c3, 0xe6a680, 0xf3d68b, 0xd9d2bd, 0xe9b98e];

    // --- alberi (istanziati) ---
    const trees = [];
    const pines = [];
    for (let y=0; y<H; y++) for (let x=0; x<W; x++){
      const ch = getCh(x, y);
      if (ch === 'T') trees.push([x, y]);
      if (ch === '^' && hash(x, y, 40) > 0.55) pines.push([x, y]);
    }
    const dummy = new THREE.Object3D();
    if (trees.length){
      const trunkG = new THREE.CylinderGeometry(0.09, 0.14, 0.9, 6); trunkG.translate(0, 0.45, 0);
      const crownG = new THREE.IcosahedronGeometry(0.55, 1);
      const trunks = new THREE.InstancedMesh(trunkG, trunkM, trees.length);
      const crowns = new THREE.InstancedMesh(crownG, mat(0xffffff, { flatShading:true }), trees.length * 3);
      trunks.castShadow = crowns.castShadow = true; crowns.receiveShadow = true;
      const col = new THREE.Color();
      trees.forEach(([x, y], i)=>{
        const s = 0.85 + hash(x,y,41)*0.45, ox = (hash(x,y,42)-.5)*0.3, oz = (hash(x,y,43)-.5)*0.3;
        const gy = this.indoor ? 0 : Math.max(0, heightAt(getCh, x+0.5, y+0.5));
        dummy.position.set(x+0.5+ox, gy, y+0.5+oz); dummy.scale.setScalar(s); dummy.rotation.set(0, hash(x,y,44)*6, 0);
        dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
        for (let k=0; k<3; k++){
          const kx = [0, .22, -.2][k], ky = [1.25, 1.0, 1.05][k], kz = [0, .12, -.15][k], ks = [1, .75, .7][k];
          dummy.position.set(x+0.5+ox+kx*s, gy+ky*s, y+0.5+oz+kz*s);
          dummy.scale.setScalar(s*ks); dummy.updateMatrix();
          crowns.setMatrixAt(i*3+k, dummy.matrix);
          const autumn = (new Date().getMonth() >= 8 && new Date().getMonth() <= 10) ? hash(x,y,45) : 0;
          col.setHSL(0.26 - autumn*0.2 + (hash(x,y,46+k)-.5)*0.04, 0.5, 0.26 + hash(x,y,47+k)*0.1);
          crowns.setColorAt(i*3+k, col);
        }
      });
      g.add(trunks, crowns);
      this.crowns = crowns;
    }
    if (pines.length){
      const pineG = new THREE.ConeGeometry(0.4, 1.5, 7); pineG.translate(0, 0.9, 0);
      const pm = new THREE.InstancedMesh(pineG, mat(0x2d4a2a, { flatShading:true }), pines.length);
      pm.castShadow = true;
      pines.forEach(([x, y], i)=>{
        dummy.position.set(x+0.5+(hash(x,y,50)-.5)*.5, heightAt(getCh, x+0.5, y+0.5) - 0.1, y+0.5+(hash(x,y,51)-.5)*.5);
        dummy.scale.setScalar(0.7 + hash(x,y,52)*0.6); dummy.rotation.set(0,0,0); dummy.updateMatrix();
        pm.setMatrixAt(i, dummy.matrix);
      });
      g.add(pm);
    }

    // --- erba alta (istanziata, ondeggia al vento) ---
    const blades = [];
    const towns = [];
    for (let y=0; y<H; y++) for (let x=0; x<W; x++) if ('12345A'.includes(getCh(x, y))) towns.push([x, y]);
    const nearTown = (x, y)=>towns.some(([tx, ty])=>Math.abs(tx - x) <= 2 && Math.abs(ty - y) <= 2);
    for (let y=0; y<H; y++) for (let x=0; x<W; x++){
      const ch = nearTown(x, y) ? '.' : getCh(x, y);   // niente erba alta dentro i borghi
      const n = ch === ',' ? 14 : 0;
      for (let k=0; k<n; k++) blades.push([x + hash(x*9+k,y,61), y + hash(x,y*9+k,62), ch === ',' ? 1 : 0.5]);
    }
    if (blades.length){
      const bg = new THREE.ConeGeometry(0.035, 0.42, 3, 1, true); bg.translate(0, 0.21, 0);
      const bm = mat(0x7fc04e, { side:THREE.DoubleSide, emissive:0x1a3310 });
      const windU = { value:0 };
      bm.customProgramCacheKey = ()=>'grass';
      bm.onBeforeCompile = sh=>{
        sh.uniforms.time = windU;
        sh.vertexShader = 'uniform float time;\n' + sh.vertexShader.replace('#include <begin_vertex>',
          `#include <begin_vertex>
           vec4 wp = instanceMatrix * vec4(0.,0.,0.,1.);
           float sway = sin(time*2.0 + wp.x*0.8 + wp.z*0.6) * 0.12 * position.y * 2.0;
           transformed.x += sway; transformed.z += sway*0.5;`);
      };
      const im = new THREE.InstancedMesh(bg, bm, blades.length);
      im.receiveShadow = true;
      const col = new THREE.Color();
      blades.forEach(([bx, by, s], i)=>{
        dummy.position.set(bx, 0, by); dummy.scale.set(1, s*(0.8+hash(i,1,63)*0.7), 1);
        dummy.rotation.set((hash(i,2,64)-.5)*.3, hash(i,3,65)*6, 0); dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        col.setHSL(0.25 + (hash(i,4,66)-.5)*.06, 0.5, 0.42 + hash(i,5,67)*0.15);
        im.setColorAt(i, col);
      });
      g.add(im);
      this.animated.push({ update:t=>{ windU.value = t; } });
    }

    // --- fiori ---
    const flowers = [];
    for (let y=0; y<H; y++) for (let x=0; x<W; x++) if (getCh(x,y) === 'F') for (let k=0; k<10; k++) flowers.push([x+hash(x,y*10+k,70), y+hash(x*10+k,y,71), k]);
    if (flowers.length){
      const fm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), mat(0xffffff, { emissive:0x111111 }), flowers.length);
      const pal = [0xff5a7a, 0xffd23f, 0xffffff, 0xb784ff, 0xff8a3c];
      const col = new THREE.Color();
      flowers.forEach(([fx, fy, k], i)=>{
        dummy.position.set(fx, 0.18 + hash(i,0,72)*0.1, fy); dummy.scale.setScalar(1); dummy.rotation.set(0,0,0); dummy.updateMatrix();
        fm.setMatrixAt(i, dummy.matrix); fm.setColorAt(i, col.set(pal[(hash(fx*10|0, fy*10|0, 73)*pal.length)|0]));
      });
      g.add(fm);
    }

    // --- edifici: componenti connesse di muri/porte/chiese ---
    const BUILD = new Set(['#','D','C','d']);
    this.built = (x, y)=>BUILD.has(getCh(x, y));   // facciate addossate a un'altra casa: niente finestre
    for (let y=0; y<H; y++) for (let x=0; x<W; x++){
      if (!BUILD.has(getCh(x,y)) || visited.has(key(x,y))) continue;
      if (this.indoor) continue;
      const cells = []; const stack = [[x,y]]; visited.add(key(x,y));
      while (stack.length){
        const [cx, cy] = stack.pop(); cells.push([cx, cy]);
        for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const nx = cx+dx, ny = cy+dy;
          if (BUILD.has(getCh(nx,ny)) && !visited.has(key(nx,ny))){ visited.add(key(nx,ny)); stack.push([nx,ny]); }
        }
      }
      const xs = cells.map(c=>c[0]), ys = cells.map(c=>c[1]);
      const bx0 = Math.min(...xs), by0 = Math.min(...ys);
      const church = cells.some(([cx,cy])=>getCh(cx,cy) === 'C');
      const color = plasterPal[(hash(bx0, by0, 80)*plasterPal.length)|0];
      // il blocco si divide in rettangoli pieni: i muri disegnati coincidono con le caselle
      // che bloccano il passo (un solo box sul contorno coprirebbe anche strade e cortili)
      const inComp = new Set(cells.map(([cx, cy])=>key(cx, cy))), taken = new Set();
      cells.sort((a, b)=>a[1] - b[1] || a[0] - b[0]);
      for (const [sx, sy] of cells){
        if (taken.has(key(sx, sy))) continue;
        let ex = sx; while (inComp.has(key(ex + 1, sy)) && !taken.has(key(ex + 1, sy))) ex++;
        let ey = sy;
        const rowFree = y=>{ for (let x = sx; x <= ex; x++) if (!inComp.has(key(x, y)) || taken.has(key(x, y))) return false; return true; };
        while (rowFree(ey + 1)) ey++;
        for (let y = sy; y <= ey; y++) for (let x = sx; x <= ex; x++) taken.add(key(x, y));
        const x1 = ex + 1, y1 = ey + 1;
        const doors = [];
        for (let y = sy; y <= ey; y++) for (let x = sx; x <= ex; x++){
          const ch = getCh(x, y);
          if (ch !== 'D' && ch !== 'd') continue;
          // la porta va sul lato da cui si entra davvero
          const side = !BUILD.has(getCh(x, y + 1)) ? 's' : !BUILD.has(getCh(x - 1, y)) ? 'w' : !BUILD.has(getCh(x + 1, y)) ? 'e' : 'n';
          doors.push([x, y, side]);
        }
        const lazzaretto = tris.some(t=>t.type === 'door_event' && t.event === 'lazzaretto' && t.x >= sx && t.x < x1 && t.y >= sy && t.y < y1);
        this.building(g, sx, sy, x1, y1, doors, church && cells.some(([cx, cy])=>getCh(cx, cy) === 'C' && cx >= sx && cx < x1 && cy >= sy && cy < y1), lazzaretto, color);
      }
    }

    // --- oggetti singoli ---
    for (let y=0; y<H; y++) for (let x=0; x<W; x++){
      const ch = getCh(x, y), cx = x + 0.5, cz = y + 0.5;
      switch (ch){
        case 'B': this.bridge(g, x, y, getCh); break;
        case 'E': {
          const m = addBox(g, 0.98, 0.8, 0.98, mat(0xffffff, { map:T.leaves, roughness:1 }), cx, 0.4, cz);
          m.scale.set(1, 0.9 + hash(x,y,90)*0.2, 1);
          break;
        }
        case 'b': {
          addBox(g, 0.9, 0.06, 0.35, mat(0x8a5a32, { map:T.wood }), cx, 0.35, cz);
          addBox(g, 0.9, 0.3, 0.05, mat(0x8a5a32, { map:T.wood }), cx, 0.55, cz - 0.16);
          for (const s of [-0.38, 0.38]) addBox(g, 0.05, 0.35, 0.3, mat(0x2a2a2a, { metalness:0.6, roughness:0.4 }), cx + s, 0.17, cz);
          break;
        }
        case 'P': this.lamp(g, cx, cz); break;
        case 'G': this.gundam(g, cx, cz); break;
        case 'Q': this.fountain(g, cx, cz); break;
        case 'U': {
          addBox(g, 0.7, 0.8, 0.7, mat(0xb9b2a4, { map:T.stone }), cx, 0.4, cz);
          const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.6, 4, 8), mat(0x6f7c5a, { metalness:0.7, roughness:0.35 }));
          f.position.set(cx, 1.3, cz); f.castShadow = true; g.add(f);
          break;
        }
        case 'm': {
          addBox(g, 0.9, 0.7, 0.6, mat(0x8a5a32, { map:T.wood }), cx, 0.35, cz);
          const aw = canvasTex(64, 16, (c2, w2, h2)=>{ for (let i=0;i<8;i++){ c2.fillStyle = i%2?'#fff':'#c0392b'; c2.fillRect(i*8,0,8,h2);} });
          const can = addBox(g, 1.0, 0.05, 0.8, mat(0xffffff, { map:aw }), cx, 1.35, cz);
          can.rotation.x = 0.25;
          for (const s of [-0.45, 0.45]) addBox(g, 0.05, 1.3, 0.05, mat(0x5b3b24), cx + s, 0.65, cz - 0.3);
          break;
        }
        case 'W': this.tower(g, cx, cz); break;
        case '1': case '2': case '3': case '4': case '5': this.village(g, cx, cz, x, y, ch); break;
        case 'A': this.village(g, cx, cz, x, y, 'A'); break;
        case 'S': {
          // santuario del Sacro Monte in vetta
          const gy = Math.max(0, heightAt(getCh, cx, cz));
          addBox(g, 1.4, 1.0, 1.0, mat(0xf0ebe0, { map:T.stone }), cx, gy + 0.5, cz);
          addBox(g, 0.4, 2.0, 0.4, mat(0xf0ebe0, { map:T.stone }), cx + 0.6, gy + 1.0, cz - 0.3);
          const rf = new THREE.Mesh(prismRoof(1.4, 1.0, 0.45, true), mat(0xffffff, { map:T.roof })); rf.position.set(cx, gy + 1.0, cz); rf.castShadow = true; g.add(rf);
          break;
        }
        // arredi interni
        case 'M': addBox(g, 1, y === 0 || getCh(x, y-1) === ' ' ? 2.2 : 0.6, 1, mat(0xe0cfae, { map:T.plaster }), cx, y === 0 ? 1.1 : 0.3, cz); break;
        case 'K': addBox(g, 1, 0.8, 0.8, mat(0x6b4526, { map:T.wood }), cx, 0.4, cz); addBox(g, 1.02, 0.06, 0.85, mat(0xc9a36b), cx, 0.82, cz); break;
        case 'l': {
          addBox(g, 0.9, 0.35, 1.0, mat(0x6b4526, { map:T.wood }), cx, 0.17, cz);
          addBox(g, 0.85, 0.12, 0.95, mat(0xeae6de), cx, 0.4, cz);
          addBox(g, 0.86, 0.1, 0.6, mat(0x3a6ea5), cx, 0.47, cz + 0.17);
          addBox(g, 0.5, 0.1, 0.22, mat(0xffffff), cx, 0.5, cz - 0.3);
          break;
        }
        case 'Z': {
          addBox(g, 0.95, 1.8, 0.45, mat(0x5c3a20, { map:T.wood }), cx, 0.9, cz - 0.25);
          for (let k=0; k<4; k++) for (let j=0; j<5; j++)
            addBox(g, 0.12, 0.3, 0.3, mat([0xa83232, 0x2f5fa8, 0x3f8a3f, 0xd9a032][(k+j)%4]), cx - 0.36 + j*0.18, 0.35 + k*0.42, cz - 0.2, false);
          break;
        }
        case 'O': {
          addBox(g, 0.9, 0.06, 0.9, mat(0x7a5433, { map:T.wood }), cx, 0.72, cz);
          for (const [a,b] of [[-.38,-.38],[.38,-.38],[-.38,.38],[.38,.38]]) addBox(g, 0.07, 0.7, 0.07, mat(0x5b3b24), cx+a, 0.35, cz+b);
          const cand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6), mat(0xfff4d0, { emissive:0xffcc66, emissiveIntensity:2 }));
          cand.position.set(cx, 0.85, cz); g.add(cand);
          break;
        }
        case 'H': {
          addBox(g, 1, 0.9, 0.7, mat(0xefe8da, { map:T.stone }), cx, 0.45, cz);
          const cr = new THREE.Group();
          addBox(cr, 0.06, 0.6, 0.06, mat(0xd4af37, { metalness:1, roughness:0.3, emissive:0x3a2a00 }), 0, 0, 0);
          addBox(cr, 0.35, 0.06, 0.06, mat(0xd4af37, { metalness:1, roughness:0.3, emissive:0x3a2a00 }), 0, 0.12, 0);
          cr.position.set(cx, 1.3, cz); g.add(cr);
          break;
        }
      }
    }

    // interni: luce calda della stanza
    if (this.indoor){
      const pl = new THREE.PointLight(0xffc98a, 18, 14, 1.6);
      pl.position.set(W/2, 3.2, H/2); pl.castShadow = true;
      pl.shadow.mapSize.set(1024, 1024);
      g.add(pl);
    }
  }

  building(g, x0, y0, x1, y1, doors, church, lazzaretto, plasterColor){
    const T = textures();
    const w = x1 - x0, d = y1 - y0, cx = (x0 + x1)/2, cz = (y0 + y1)/2;
    const wallH = church ? 2.6 : lazzaretto ? 1.9 : 1.5 + Math.min(1.2, d * 0.35);
    const wallM = church ? mat(0xf2ede2, { map:T.stone }) : lazzaretto ? mat(0xe9e0cc, { map:T.plaster }) : mat(plasterColor, { map:T.plaster });
    const inset = 0.04;
    addBox(g, w - inset*2, wallH, d - inset*2, wallM, cx, wallH/2, cz);
    // zoccolo in pietra
    addBox(g, w - inset*2 + 0.04, 0.25, d - inset*2 + 0.04, mat(0x8e877b, { map:T.stone }), cx, 0.125, cz, false);
    // cornicione
    addBox(g, w + 0.1, 0.1, d + 0.1, mat(0xe8e0cf), cx, wallH, cz, false);

    // tetto
    const alongX = w >= d;
    const roofH = church ? 1.0 : lazzaretto ? 0.8 : 0.7 + Math.min(w, d) * 0.12;
    const roof = new THREE.Mesh(prismRoof(w, d, roofH, alongX), mat(0xd9cfc6, { map:T.roof, roughness:0.9 }));
    roof.position.set(cx, wallH + 0.05, cz); roof.castShadow = true; roof.receiveShadow = true;
    g.add(roof);

    const south = y1 - inset + 0.005;   // facciata verso la camera
    const shutter = mat(0x3d6b3c, { roughness:0.7 });   // persiane verdi, tipiche del varesotto
    const winM = this.winMat;

    // porte
    for (const [dx, dy, side = 's'] of doors){
      const door = new THREE.Group();
      addBox(door, 0.6, 1.0, 0.06, mat(0x5b3a22, { map:T.wood }), 0, 0.5, 0, false);
      const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 16, 1, false, 0, Math.PI), mat(0x5b3a22, { map:T.wood }));
      arch.rotation.set(Math.PI/2, 0, Math.PI/2); arch.position.set(0, 1.0, 0); door.add(arch);
      addBox(door, 0.8, 0.08, 0.3, mat(0x9a9286, { map:T.stone }), 0, 0.04, 0.12, false);   // gradino
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), mat(0xd4af37, { metalness:1, roughness:0.3 }));
      knob.position.set(0.18, 0.5, 0.05); door.add(knob);
      // sul lato giusto: sud (verso la camera), ovest, est o nord
      const px = side === 'w' ? x0 + inset - 0.005 : side === 'e' ? x1 - inset + 0.005 : dx + 0.5;
      const pz = side === 's' ? south : side === 'n' ? y0 + inset - 0.005 : dy + 0.5;
      const rot = { s:0, n:Math.PI, w:-Math.PI/2, e:Math.PI/2 }[side || 's'];
      door.position.set(px, 0, pz); door.rotation.y = rot;
      g.add(door);
      // lampada sopra la porta
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), this.lampMat);
      lamp.position.set(px + Math.sin(rot) * 0.08, 1.45, pz + Math.cos(rot) * 0.08); g.add(lamp);
    }

    // finestre con persiane su facciata e fianchi
    const doorCols = new Set(doors.filter(d=>(d[2] || 's') === 's').map(([dx])=>dx));
    const floors = wallH > 2.1 ? 2 : 1;
    const addWin = (px, py, pz, rotY)=>{
      const wg = new THREE.Group();
      addBox(wg, 0.32, 0.42, 0.04, winM, 0, 0, 0, false);
      addBox(wg, 0.4, 0.05, 0.08, mat(0xe8e0cf), 0, -0.24, 0.02, false);  // davanzale
      for (const s of [-1, 1]){
        const sh = addBox(wg, 0.16, 0.44, 0.03, shutter, s*0.25, 0, 0.02, false);
        sh.rotation.y = s * 0.35;
      }
      wg.position.set(px, py, pz); wg.rotation.y = rotY;
      g.add(wg);
    };
    for (let c = x0; c < x1; c++){
      for (let f=0; f<floors; f++){
        const py = f === 0 ? 0.95 : 1.8;
        if (f === 0 && doorCols.has(c)) continue;
        if (church || this.built?.(c, y1)) continue;
        addWin(c + 0.5, py, south + 0.01, 0);
      }
    }
    if (!church && d >= 2) for (let r = y0; r < y1; r++){
      if (!this.built?.(x0 - 1, r)) addWin(x0 + inset - 0.01, 1.0, r + 0.5, -Math.PI/2);
      if (!this.built?.(x1, r)) addWin(x1 - inset + 0.01, 1.0, r + 0.5, Math.PI/2);
    }

    if (church){
      // rosone e campanile (San Maurizio)
      const rose = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24), this.roseMat);
      rose.position.set(cx, wallH - 0.6, south + 0.02); g.add(rose);
      const tw = 0.9, th = wallH + 2.6;
      const tx = x1 + 0.1 - tw/2, tz = y0 + tw/2;
      addBox(g, tw, th, tw, mat(0xd9d0bf, { map:T.stone }), tx, th/2, tz);
      addBox(g, tw + 0.1, 0.5, tw + 0.1, mat(0x3a3530), tx, th - 0.5, tz); // cella campanaria
      const spire = new THREE.Mesh(new THREE.ConeGeometry(tw*0.7, 1.1, 4), mat(0xffffff, { map:T.roof }));
      spire.position.set(tx, th + 0.55, tz); spire.rotation.y = Math.PI/4; spire.castShadow = true; g.add(spire);
      const cross = new THREE.Group();
      addBox(cross, 0.05, 0.4, 0.05, mat(0xd4af37, { metalness:1, roughness:0.3 }), 0, 0, 0);
      addBox(cross, 0.22, 0.05, 0.05, mat(0xd4af37, { metalness:1, roughness:0.3 }), 0, 0.08, 0);
      cross.position.set(tx, th + 1.3, tz); g.add(cross);
      // campana che oscilla
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 0.25, 10), mat(0xb08d3c, { metalness:1, roughness:0.35 }));
      bell.position.set(tx, th - 0.5, tz + tw/2 + 0.01); g.add(bell);
      bell.userData.dyn = true;
      this.animated.push({ update:t=>{ bell.rotation.x = Math.sin(t*1.5) * 0.25; } });
    }

    if (lazzaretto){
      // Chiesa del Lazzaretto: portico ad archi sulla facciata e campanile a vela
      const stone = mat(0xd8d0c0, { map:T.stone });
      const n = Math.max(2, Math.round(w * 1.3));
      for (let k=0; k<=n; k++){
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.95, 10), stone);
        col.position.set(x0 + 0.15 + k * (w - 0.3) / n, 0.47, south + 0.45); col.castShadow = true; g.add(col);
      }
      addBox(g, w, 0.12, 0.6, stone, cx, 1.0, south + 0.3);                     // architrave del portico
      const pr = new THREE.Mesh(prismRoof(w + 0.1, 0.62, 0.22, true), mat(0xd9cfc6, { map:T.roof }));
      pr.position.set(cx, 1.06, south + 0.3); pr.castShadow = true; g.add(pr);
      // vela campanaria in cima alla facciata, con campana che oscilla
      addBox(g, 0.55, 0.7, 0.14, stone, cx, wallH + roofH + 0.25, south - 0.1);
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.13, 0.18, 10), mat(0xb08d3c, { metalness:1, roughness:0.35 }));
      bell.position.set(cx, wallH + roofH + 0.25, south - 0.02); g.add(bell);
      bell.userData.dyn = true;
      this.animated.push({ update:t=>{ bell.rotation.x = Math.sin(t*2.2) * 0.35; } });
      const cross = new THREE.Group();
      addBox(cross, 0.04, 0.3, 0.04, mat(0x3a3530), 0, 0, 0); addBox(cross, 0.18, 0.04, 0.04, mat(0x3a3530), 0, 0.06, 0);
      cross.position.set(cx, wallH + roofH + 0.78, south - 0.1); g.add(cross);
      // targa sopra il portale
      const sign = canvasTex(320, 48, (c2, w2, h2)=>{
        c2.fillStyle = '#ece4d2'; c2.fillRect(0,0,w2,h2);
        c2.fillStyle = '#4a3a2a'; c2.font = 'bold 24px Georgia, serif'; c2.textAlign = 'center';
        c2.fillText('CHIESA DEL LAZZARETTO', w2/2, 33);
      });
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(2.4, w - 0.1), 0.3), new THREE.MeshStandardMaterial({ map:sign }));
      sg.position.set(cx, wallH - 0.35, south + 0.02); g.add(sg);
    }
  }

  bridge(g, x, y, getCh){
    const T = textures();
    const horiz = getCh(x-1, y) === '~' || getCh(x+1, y) === '~' ? false : true;
    // ponte: il letto del fiume corre in verticale, il ponte in orizzontale
    const alongX = getCh(x, y-1) === '~' || getCh(x, y+1) === '~' || getCh(x, y-1) === 'B' || getCh(x, y+1) === 'B' ? true : horiz;
    const deck = addBox(g, alongX ? 1.02 : 0.9, 0.12, alongX ? 0.9 : 1.02, mat(0x8a6038, { map:T.wood }), x+0.5, 0.02, y+0.5);
    deck.receiveShadow = true;
    for (const s of [-0.45, 0.45]){
      const rx = alongX ? x+0.5 : x+0.5+s, rz = alongX ? y+0.5+s : y+0.5;
      addBox(g, alongX ? 1.02 : 0.05, 0.05, alongX ? 0.05 : 1.02, mat(0x5b3b24), rx, 0.45, rz);
      addBox(g, 0.06, 0.45, 0.06, mat(0x5b3b24), rx, 0.22, rz);
    }
    addBox(g, alongX ? 0.2 : 0.6, 0.5, alongX ? 0.6 : 0.2, mat(0x8e877b, { map:T.stone }), x+0.5, -0.3, y+0.5, false);
  }

  lamp(g, cx, cz){
    const iron = mat(0x1e2226, { metalness:0.7, roughness:0.4 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 2.0, 8), iron);
    pole.position.set(cx, 1.0, cz); pole.castShadow = true; this.mapGroup.add(pole);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.08, 0.28, 6), this.lampMat);
    head.position.set(cx, 2.1, cz); g.add(head);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.15, 6), iron); cap.position.set(cx, 2.3, cz); g.add(cap);
    // niente luce per ogni lampione: un piccolo gruppo di luci segue quelli vicini (vedi render)
    this.lamps.push({ x:cx, z:cz });
  }

  gundam(g, cx, cz){
    // la statua del Gundam del parco di Vedano: robot bianco-blu-rosso di 3 caselle
    const white = mat(0xeef0f2, { roughness:0.5 }), blue = mat(0x2a4fa8, { roughness:0.5 }), red = mat(0xc7302a, { roughness:0.5 }), yel = mat(0xf2c230, { metalness:0.3, roughness:0.4 });
    const r = new THREE.Group();
    addBox(r, 1.2, 0.2, 1.2, mat(0x8e877b, { map:textures().stone }), 0, 0.1, 0);
    for (const s of [-0.18, 0.18]){
      addBox(r, 0.24, 0.9, 0.3, white, s, 0.65, 0);
      addBox(r, 0.3, 0.2, 0.42, blue, s, 0.3, 0.04);      // piedi
      addBox(r, 0.26, 0.2, 0.32, blue, s, 0.95, 0.02);    // ginocchia
    }
    addBox(r, 0.5, 0.2, 0.32, red, 0, 1.2, 0);           // cintura
    addBox(r, 0.62, 0.55, 0.4, blue, 0, 1.55, 0);        // torace
    addBox(r, 0.3, 0.12, 0.05, yel, 0, 1.65, 0.21);      // prese d'aria
    for (const s of [-0.43, 0.43]){
      addBox(r, 0.26, 0.26, 0.34, white, s, 1.72, 0);    // spalle
      addBox(r, 0.17, 0.6, 0.2, white, s, 1.3, 0);       // braccia
    }
    addBox(r, 0.24, 0.24, 0.26, white, 0, 1.97, 0);      // testa
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.35, 4), yel);
    for (const s of [-1, 1]){ const f = fin.clone(); f.position.set(s*0.1, 2.14, 0.12); f.rotation.z = -s*0.9; r.add(f); }
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.02), new THREE.MeshStandardMaterial({ color:0x9fffd0, emissive:0x40ffa0, emissiveIntensity:1.5 }));
    eye.position.set(0, 1.99, 0.135); r.add(eye);
    const shield = addBox(r, 0.08, 0.6, 0.35, red, -0.6, 1.2, 0.05);
    shield.rotation.x = 0.1;
    r.position.set(cx, 0, cz);
    r.traverse(o=>{ if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
    g.add(r);
    this.dynMats.add(eye.material);
    this.animated.push({ update:t=>{ eye.material.emissiveIntensity = 1 + Math.sin(t*3) * 0.6; } });
  }

  fountain(g, cx, cz){
    const T = textures();
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.35, 20), mat(0xb9b2a4, { map:T.stone }));
    basin.position.set(cx, 0.17, cz); basin.castShadow = true; g.add(basin);
    const wat = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshStandardMaterial({ color:0x5fa9d5, roughness:0.1, metalness:0.2 }));
    wat.rotation.x = -Math.PI/2; wat.position.set(cx, 0.33, cz); g.add(wat);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.7, 10), mat(0xb9b2a4, { map:T.stone }));
    col.position.set(cx, 0.65, cz); g.add(col);
    const drops = [];
    const dm = new THREE.MeshBasicMaterial({ color:0xcdefff, transparent:true, opacity:0.8 });
    for (let i=0; i<16; i++){ const d = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), dm); g.add(d); drops.push(d); }
    drops.forEach(d=>{ d.userData.dyn = true; });
    this.animated.push({ update:t=>{
      drops.forEach((d, i)=>{
        const k = (t*0.9 + i/16) % 1, a = i/16*Math.PI*2;
        d.position.set(cx + Math.cos(a)*k*0.35, 1.0 + k*0.3 - k*k*0.95, cz + Math.sin(a)*k*0.35);
      });
    } });
  }

  tower(g, cx, cz){
    const T = textures();
    addBox(g, 1.0, 3.4, 1.0, mat(0xb9b2a4, { map:T.stone }), cx, 1.7, cz);
    for (const [a,b] of [[-.4,-.4],[.4,-.4],[-.4,.4],[.4,.4],[0,-.4],[0,.4],[-.4,0],[.4,0]])
      addBox(g, 0.18, 0.3, 0.18, mat(0xb9b2a4, { map:T.stone }), cx+a, 3.55, cz+b);   // merli
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshStandardMaterial({ color:0xc0392b, side:THREE.DoubleSide }));
    flag.position.set(cx+0.25, 4.3, cz); g.add(flag);
    addBox(g, 0.03, 1.0, 0.03, mat(0x333333), cx, 3.9, cz);
    flag.userData.dyn = true;
    this.animated.push({ update:t=>{ flag.rotation.y = Math.sin(t*3)*0.3; } });
  }

  // Paesi sulla mappa del mondo: un piccolo borgo in miniatura attorno alla
  // casella d'ingresso, con il monumento che lo distingue e il nome in alto.
  village(g, cx, cz, x, y, kind){
    const T = textures();
    const vg = new THREE.Group();
    vg.position.set(cx, 0, cz);
    const pal = [0xe8c27a, 0xf1e2c3, 0xe6a680, 0xf3d68b, 0xd9d2bd, 0xe9b98e];
    const house = (hx, hz, w, d, h, rot=0)=>{
      const hg = new THREE.Group();
      addBox(hg, w, h, d, mat(pal[(hash(x*7+hx*13|0, y*5+hz*11|0, 120)*pal.length)|0], { map:T.plaster }), 0, h/2, 0);
      const rf = new THREE.Mesh(prismRoof(w, d, Math.min(w, d)*0.45, w >= d), mat(0xd9cfc6, { map:T.roof }));
      rf.position.y = h; rf.castShadow = true; hg.add(rf);
      // finestrella con persiane verdi
      addBox(hg, w*0.25, h*0.3, 0.01, mat(0x3d6b3c), 0, h*0.55, d/2 + 0.005, false);
      hg.position.set(hx, 0, hz); hg.rotation.y = rot;
      vg.add(hg);
    };
    const tree = (tx, tz, s=1)=>{
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.03*s, 0.04*s, 0.25*s, 5), mat(0x5b3b24)); tr.position.set(tx, 0.12*s, tz);
      const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17*s, 0), mat(0x3f7a34, { flatShading:true })); cr.position.set(tx, 0.36*s, tz);
      tr.castShadow = cr.castShadow = true; vg.add(tr, cr);
    };
    const campanile = (bx, bz, h=1.1)=>{
      addBox(vg, 0.18, h, 0.18, mat(0xd9d0bf, { map:T.stone }), bx, h/2, bz);
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 4), mat(0xffffff, { map:T.roof }));
      sp.position.set(bx, h + 0.15, bz); sp.rotation.y = Math.PI/4; sp.castShadow = true; vg.add(sp);
    };

    // anello di case attorno a una piazzetta, con un varco a sud per la strada
    const nHouses = kind === '1' ? 11 : kind === 'A' ? 0 : 7;
    for (let i=0; i<nHouses; i++){
      const a = -Math.PI*0.35 + (i / nHouses) * Math.PI * 1.7 - Math.PI/2 + Math.PI;  // lascia libero il sud
      const r = 0.75 + hash(x, y, 130+i) * 0.35 + (kind === '1' ? 0.25 : 0);
      const w = 0.3 + hash(x, y, 140+i)*0.2, d = 0.28 + hash(x, y, 150+i)*0.14;
      house(Math.cos(a)*r, Math.sin(a)*r, w, d, 0.28 + hash(x, y, 160+i)*0.18, -a + Math.PI/2);
    }
    for (let i=0; i<6; i++){
      const a = hash(x, y, 170+i) * Math.PI*2, r = 1.35 + hash(x, y, 180+i) * 0.5;
      if (Math.sin(a) > 0.6) continue;                                    // non sulla strada d'accesso
      tree(Math.cos(a)*r, Math.sin(a)*r, 0.9 + hash(x, y, 190+i)*0.5);
    }
    // pavé della piazza
    const pz = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), mat(0xb4ab9c, { roughness:1 }));
    pz.rotation.x = -Math.PI/2; pz.position.y = 0.012; pz.receiveShadow = true; vg.add(pz);

    // monumento caratteristico
    if (kind === '1'){            // Varese: campanile del Bernascone e palazzo Estense
      campanile(-0.1, -0.35, 1.6);
      addBox(vg, 0.9, 0.35, 0.3, mat(0xf0d9a8, { map:T.plaster }), 0.35, 0.18, -0.55);
    } else if (kind === '2'){     // Vedano: la Chiesa del Lazzaretto col portico e la vela campanaria
      addBox(vg, 0.5, 0.35, 0.4, mat(0xe9e0cc, { map:T.plaster }), -0.7, 0.18, -0.25);
      const lr = new THREE.Mesh(prismRoof(0.5, 0.4, 0.2, false), mat(0xd9cfc6, { map:T.roof })); lr.position.set(-0.7, 0.35, -0.25); vg.add(lr);
      addBox(vg, 0.16, 0.2, 0.05, mat(0xd8d0c0, { map:T.stone }), -0.7, 0.62, -0.05);
      for (const cx2 of [-0.9, -0.77, -0.63, -0.5]){
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), mat(0xd8d0c0)); c.position.set(cx2, 0.11, -0.02); vg.add(c);
      }
      campanile(0.2, -0.3, 1.0);
    } else if (kind === '3'){     // Castiglione: la Collegiata sul colle
      const hill = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 8, 0, Math.PI*2, 0, Math.PI/2), mat(0x5d8a48));
      hill.scale.set(1, 0.45, 1); hill.position.set(0.25, 0, -0.45); hill.receiveShadow = true; vg.add(hill);
      addBox(vg, 0.5, 0.35, 0.3, mat(0xf2ede2, { map:T.stone }), 0.25, 0.42, -0.45);
      campanile(0.55, -0.55, 1.3);
    } else if (kind === '4'){     // Jerago: il castello con mastio e merli
      addBox(vg, 0.8, 0.35, 0.6, mat(0xb9b2a4, { map:T.stone }), 0, 0.18, -0.45);
      for (const [a, b] of [[-0.4, -0.75], [0.4, -0.75], [-0.4, -0.15], [0.4, -0.15]]){
        const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.6, 8), mat(0xb9b2a4, { map:T.stone }));
        tw.position.set(a, 0.3, b); tw.castShadow = true; vg.add(tw);
      }
      addBox(vg, 0.25, 1.0, 0.25, mat(0xb9b2a4, { map:T.stone }), 0, 0.5, -0.5);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.12), new THREE.MeshStandardMaterial({ color:0xc0392b, side:THREE.DoubleSide }));
      fl.position.set(0.1, 1.15, -0.5); vg.add(fl);
      fl.userData.dyn = true;
      this.animated.push({ update:t=>{ fl.rotation.y = Math.sin(t*3 + x)*0.4; } });
    } else if (kind === '5'){     // Samarate: gli hangar delle officine aeronautiche
      for (const ox of [-0.35, 0.35]){
        const hg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 16, 1, false, 0, Math.PI), mat(0x7d8290, { metalness:0.5, roughness:0.4 }));
        hg.rotation.set(0, 0, Math.PI/2); hg.rotation.set(Math.PI/2, 0, Math.PI/2); hg.position.set(ox, 0, -0.5);
        hg.castShadow = true; vg.add(hg);
      }
      campanile(0.9, 0.1, 0.9);
    } else if (kind === 'A'){     // l'Accademia: palazzo con cortile e torretta
      addBox(vg, 1.3, 0.6, 0.35, mat(0xf1e2c3, { map:T.plaster }), 0, 0.3, -0.45);
      addBox(vg, 0.35, 0.6, 0.9, mat(0xf1e2c3, { map:T.plaster }), -0.5, 0.3, 0);
      addBox(vg, 0.35, 0.6, 0.9, mat(0xf1e2c3, { map:T.plaster }), 0.5, 0.3, 0);
      const rf = new THREE.Mesh(prismRoof(1.3, 0.35, 0.25, true), mat(0xd9cfc6, { map:T.roof })); rf.position.set(0, 0.6, -0.45); vg.add(rf);
      campanile(0, -0.45, 1.2);
    }
    vg.traverse(o=>{ if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
    vg.scale.setScalar(1.35);
    g.add(vg);

    // nome del paese sospeso sopra il borgo
    const name = { '1':'Varese', '2':'Vedano Olona', '3':'Castiglione Olona', '4':'Jerago', '5':'Samarate', 'A':'Accademia' }[kind];
    if (name){
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
      const c = cv.getContext('2d');
      c.font = 'bold 54px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 10; c.strokeStyle = 'rgba(20,16,40,.85)'; c.strokeText(name, 256, 50);
      c.fillStyle = '#ffe9a8'; c.fillText(name, 256, 50);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, depthTest:false }));
      sp.scale.set(2.6, 0.49, 1); sp.position.set(cx, 2.6, cz); sp.renderOrder = 5;
      g.add(sp);
    }
  }

  // ---------- luci giorno/notte legate all'ora reale ----------
  setupLighting(W, H){
    const now = new Date();
    const hr = now.getHours() + now.getMinutes()/60;
    this.hour = hr;
    // elevazione del sole: 0 alle 6 e alle 20, massima alle 13
    const day = Math.max(-0.35, Math.sin(Math.PI * (hr - 6) / 14));
    const elev = this.indoor ? 0.9 : Math.max(0.12, day);
    const az = Math.PI * (hr - 6) / 14;
    const dist = Math.max(W, H);
    const sunPos = new THREE.Vector3(-Math.cos(az) * dist * 0.6, elev * dist, dist * 0.35);
    this.sunOffset = sunPos;
    const s = this.sun;
    const cam = s.shadow.camera;
    const r = Math.max(W, H) * 0.75;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.near = 1; cam.far = dist * 3;
    cam.updateProjectionMatrix();
    s.position.set(W/2, 0, H/2).add(sunPos);
    s.target.position.set(W/2, 0, H/2);

    const night = day < 0.05;
    const dusk = !night && day < 0.35;
    this.night = night && !this.indoor;
    if (this.indoor){
      s.intensity = 0.4; s.color.set(0xffe0b0);
      this.hemi.intensity = 0.55; this.hemi.color.set(0xffe2c0); this.hemi.groundColor.set(0x3a2a20);
      this.renderer.toneMappingExposure = 1.05;
      this.tilt.uniforms.tint.value.set(1.04, 0.98, 0.9);
    } else if (night){
      s.intensity = 1.1; s.color.set(0x9fb4ff);            // luna
      this.hemi.intensity = 0.9; this.hemi.color.set(0x6f82c8); this.hemi.groundColor.set(0x1c2436);
      this.renderer.toneMappingExposure = 1.0;
      this.tilt.uniforms.tint.value.set(0.78, 0.86, 1.12);
    } else if (dusk){
      s.intensity = 2.0; s.color.set(0xffa36b);
      this.hemi.intensity = 0.6; this.hemi.color.set(0xffc8a0); this.hemi.groundColor.set(0x4a3a2a);
      this.renderer.toneMappingExposure = 0.95;
      this.tilt.uniforms.tint.value.set(1.08, 0.96, 0.88);
    } else {
      s.intensity = 2.6; s.color.set(0xfff1d6);
      this.hemi.intensity = 0.9; this.hemi.color.set(0xcfe6ff); this.hemi.groundColor.set(0x5a6b3a);
      this.renderer.toneMappingExposure = 1.0;
      this.tilt.uniforms.tint.value.set(1, 1, 1);
    }
    const su = this.sky.material.uniforms;
    const skySun = new THREE.Vector3().setFromSphericalCoords(1, Math.PI/2 - Math.max(-0.1, day) * 1.2, -az + Math.PI);
    su.sunPosition.value.copy(night ? new THREE.Vector3(0, -1, 0) : skySun);
    this.scene.fog?.color?.set(night ? 0x1a2238 : dusk ? 0xe8b89a : 0xbfd6ea);
    if (this.water){ this.water.uniforms.sunDir.value.copy(sunPos).normalize(); this.water.uniforms.light.value = this.night ? 0.3 : dusk ? 0.75 : 1; }
    const lampOn = this.night || dusk;
    this.lampMat.emissiveIntensity = lampOn ? 3 : 0.2;
    this.lampOn = lampOn;
    for (const w of this.windows) w.emissiveIntensity = lampOn ? 1.4 : 0;
    if (this.night) this.renderer.setClearColor(0x05060c);
  }

  buildWeather(g){
    const now = new Date(), month = now.getMonth();
    const rainy = (((now.getFullYear()*372 + month*31 + now.getDate()) * 2654435761) >>> 0) % 5 === 0;
    const season = month <= 1 || month === 11 ? 'inverno' : month <= 4 ? 'primavera' : month <= 7 ? 'estate' : 'autunno';
    const N = rainy ? 1400 : 260;
    const pos = new Float32Array(N * 3), vel = new Float32Array(N);
    for (let i=0; i<N; i++){ pos[i*3] = Math.random()*30-15; pos[i*3+1] = Math.random()*10; pos[i*3+2] = Math.random()*30-15; vel[i] = 0.5 + Math.random(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const color = rainy ? 0xaac8f0 : { inverno:0xffffff, primavera:0xffbcd6, estate:0xfff2a0, autunno:0xe0903c }[season];
    const pm = new THREE.PointsMaterial({ color, size: rainy ? 0.05 : season === 'estate' ? 0.08 : 0.1, transparent:true, opacity: rainy ? 0.6 : 0.85, depthWrite:false });
    if (season === 'estate' && !rainy) pm.blending = THREE.AdditiveBlending;  // lucciole e pollini
    const pts = new THREE.Points(geo, pm);
    pts.frustumCulled = false;
    g.add(pts);
    if (rainy){ this.hemi.intensity *= 0.7; this.sun.intensity *= 0.35; }
    const fallSpeed = rainy ? 14 : season === 'estate' ? -0.2 : season === 'inverno' ? 0.8 : 1.2;
    this.weather = { pts, pos, vel, fallSpeed, rainy, season };
  }

  // ---------- personaggi 3D ----------
  person(id, who){
    let p = this.actors.get(id);
    if (!p){
      p = new Person(who, id);
      p.mesh = p.root;
      this.mapGroup.add(p.root);
      this.actors.set(id, p);
    }
    p.used = true;
    return p;
  }
  // indicatore sopra la testa (! … ✓) delle missioni
  marker(id, text, x, z, h){
    const key = 'mk:' + id;
    let m = this.actors.get(key);
    if (!m){
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, depthTest:false }));
      sp.scale.set(0.45, 0.45, 1); sp.renderOrder = 10;
      this.mapGroup.add(sp);
      m = { mesh:sp, cv, tex, text:null, dispose(){ tex.dispose(); sp.material.dispose(); } };
      this.actors.set(key, m);
    }
    m.used = true;
    if (m.text !== text){
      m.text = text;
      const c = m.cv.getContext('2d'); c.clearRect(0,0,64,64);
      c.font = 'bold 46px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.65)'; c.fillStyle = text === '✓' ? '#7ee787' : '#ffd76a';
      c.strokeText(text, 32, 34); c.fillText(text, 32, 34);
      m.tex.needsUpdate = true;
    }
    m.mesh.visible = !!text;
    m.mesh.position.set(x, h + 0.25 + Math.sin(this.clock * 3) * 0.06, z);
  }
  // il mezzo su cui si viaggia (id 'ride') o uno parcheggiato da trovare
  vehicle(id, kind){
    let b = this.actors.get(id);
    if (b && b.kind !== kind){ this.mapGroup.remove(b.mesh); this.actors.delete(id); b = null; }
    if (!b){ const g = (MAKE_VEHICLE[kind] || makeBike)(); this.mapGroup.add(g); b = { mesh:g, kind, dispose(){} }; this.actors.set(id, b); }
    b.used = true;
    return b;
  }

  // zoom del giocatore (rotellina, +/-, pizzico): moltiplica la distanza della camera, resta salvato
  setZoom(z){
    this.zoom = Math.min(ZOOM.max, Math.max(ZOOM.min, z));
    ZOOM.save(this.zoom);
    return this.zoom;
  }

  // posizione del giocatore sullo schermo (pixel del render) e distanza dalla camera
  updateXray(focus){
    if (window.__closeup){ XRAY.xrR.value = 0; return; }
    this.camera.updateMatrixWorld();
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const px = p=>{ const v = p.clone().project(this.camera); return new THREE.Vector2((v.x + 1) / 2 * size.x, (v.y + 1) / 2 * size.y); };
    const feet = new THREE.Vector3(focus.x, 0.1, focus.z), head = new THREE.Vector3(focus.x, 1.5, focus.z);
    const a = px(feet), b = px(head);
    XRAY.xrC.value.copy(a).add(b).multiplyScalar(0.5);
    XRAY.xrR.value = Math.max(40, a.distanceTo(b) * 1.15);
    XRAY.xrP.value.set(focus.x, focus.z);
    XRAY.xrF.value.set(focus.x - this.camera.position.x, focus.z - this.camera.position.z).normalize();
    XRAY.xrInv.value.copy(this.camera.matrixWorld);
  }

  beginActors(){ for (const a of this.actors.values()) a.used = false; }
  endActors(){
    for (const [id, a] of this.actors) if (!a.used){ this.mapGroup.remove(a.mesh); a.dispose(); this.actors.delete(id); }
  }

  // palina dell'autobus: palo, cartello blu con la scritta BUS, pensilina con panca
  busStop(id, x, y){
    let b = this.actors.get(id);
    if (!b){
      const grp = new THREE.Group();
      const steel = mat(0x8a9099, { metalness:0.6, roughness:0.4 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), steel); pole.position.set(-0.3, 0.75, -0.25); grp.add(pole);
      const c = document.createElement('canvas'); c.width = 64; c.height = 64;
      const g = c.getContext('2d');
      g.fillStyle = '#1f4fa8'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(4, 4, 56, 56);
      g.fillStyle = '#ffd23f'; g.font = 'bold 24px sans-serif'; g.textAlign = 'center'; g.fillText('BUS', 32, 42);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.03), [steel, steel, steel, steel, new THREE.MeshStandardMaterial({ map:tex }), new THREE.MeshStandardMaterial({ map:tex })]);
      sign.position.set(-0.3, 1.45, -0.25); grp.add(sign);
      // pensilina
      const glass = new THREE.MeshStandardMaterial({ color:0xbfdcf0, transparent:true, opacity:0.35, roughness:0.1 });
      addBox(grp, 0.8, 0.04, 0.4, steel, 0.1, 1.12, -0.3);
      addBox(grp, 0.8, 1.05, 0.02, glass, 0.1, 0.58, -0.48, false);
      for (const sx of [-0.28, 0.48]) addBox(grp, 0.03, 1.12, 0.03, steel, sx, 0.56, -0.47);
      addBox(grp, 0.6, 0.05, 0.18, mat(0x7a5433, { map:textures().wood }), 0.1, 0.34, -0.38);
      grp.position.set(x + 0.5, 0, y + 0.5);
      this.mapGroup.add(grp);
      b = { mesh:grp, dispose(){ tex.dispose(); } };
      this.actors.set(id, b);
    }
    b.used = true;
    return b;
  }

  chest(id, x, y, opened){
    const key = 'chest:' + id;
    let c = this.actors.get(key);
    if (!c){
      const T = textures();
      const grp = new THREE.Group();
      const woodM = mat(0x8a5028, { map:T.wood }), gold = mat(0xd4af37, { metalness:1, roughness:0.3 });
      addBox(grp, 0.6, 0.35, 0.4, woodM, 0, 0.175, 0);
      addBox(grp, 0.62, 0.05, 0.42, gold, 0, 0.35, 0);
      const lid = new THREE.Group();
      addBox(lid, 0.6, 0.16, 0.4, woodM, 0, 0.08, 0.2);
      addBox(lid, 0.08, 0.17, 0.42, gold, 0, 0.08, 0.2);
      lid.position.set(0, 0.35, -0.2); grp.add(lid);
      const glow = new THREE.PointLight(0xffd070, 0, 2);
      glow.position.set(0, 0.6, 0); grp.add(glow);
      grp.position.set(x + 0.5, 0, y + 0.5);
      this.mapGroup.add(grp);
      c = { mesh:grp, lid, glow, used:true, dispose(){} };
      this.actors.set(key, c);
    }
    c.used = true;
    c.lid.rotation.x += ((opened ? -1.9 : 0) - c.lid.rotation.x) * 0.15;
    c.glow.intensity = opened ? 0 : 0.6 + Math.sin(this.clock*3)*0.3;
  }

  // ---------- rendering ----------
  render(dt, focus, opts={}){
    this.resize();
    this.clock += dt;
    const t = this.clock;
    for (const a of this.animated) a.update(t);
    if (this.water) this.water.uniforms.time.value = t;

    // camera che insegue il giocatore con inerzia
    const indoor = this.indoor;
    const tgt = new THREE.Vector3(focus.x, 0.5, focus.z);
    if (indoor && this.W <= 14 && this.H <= 10) tgt.set(this.W/2, 0.5, this.H/2 + 0.5);
    const speedLook = opts.velocity ? new THREE.Vector3(opts.velocity.x, 0, opts.velocity.z).multiplyScalar(0.25) : new THREE.Vector3();
    tgt.add(speedLook);
    const zo = (opts.zoomOut||0) + (this.mapName === 'world' ? 4 : 0);
    const close = window.__closeup;   // solo per gli screenshot di verifica
    const offset = close ? new THREE.Vector3(0, 1.6, 2.6) : indoor ? new THREE.Vector3(0, 6.4, 6.4) : new THREE.Vector3(0, 14 + zo, 8 + zo*0.8);   // ~60° dall'alto: le strade si vedono tra i tetti
    if (!close) offset.multiplyScalar(MOBILE_ZOOM() * this.zoom);   // su telefono la camera si allontana; in più lo zoom del giocatore
    if (window.__closeup) tgt.y = 1.05;
    const k = 1 - Math.exp(-dt * 5);
    if (opts.snap){ this.camTarget.copy(tgt); } else this.camTarget.lerp(tgt, k);
    this.camPos.copy(this.camTarget).add(offset);
    if (this.shake > 0){
      this.shake = Math.max(0, this.shake - dt * 2);
      this.camPos.x += (Math.random()-.5) * this.shake * 0.3;
      this.camPos.y += (Math.random()-.5) * this.shake * 0.3;
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
    this.updateXray(focus);

    // sole che segue la camera per ombre nitide vicino al giocatore
    if (!indoor){
      this.sun.position.copy(this.camTarget).add(this.sunOffset.clone().normalize().multiplyScalar(40));
      this.sun.target.position.copy(this.camTarget);
      const sc = this.sun.shadow.camera;
      sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 120;
      sc.updateProjectionMatrix();
    }

    // luci dei lampioni: le più vicine al giocatore (ricalcolate ogni mezzo secondo)
    if (this.lampLights?.length){
      this._lampT = (this._lampT || 0) - dt;
      if (this._lampT <= 0){
        this._lampT = 0.5;
        const cx = this.camTarget.x, cz = this.camTarget.z;
        const near = this.lamps.map(l=>[l, (l.x - cx) ** 2 + (l.z - cz) ** 2]).sort((a, b)=>a[1] - b[1]).slice(0, this.lampLights.length);
        this.lampLights.forEach((L, i)=>{
          const l = near[i]?.[0];
          if (l) L.position.set(l.x, 2, l.z);
          L.intensity = l && this.lampOn ? 14 : 0;
        });
      }
    }

    // meteo attorno alla camera
    const wz = this.weather;
    if (wz){
      const p = wz.pos, n = p.length / 3;
      for (let i=0; i<n; i++){
        p[i*3+1] -= wz.fallSpeed * wz.vel[i] * dt;
        if (!wz.rainy) p[i*3] += Math.sin(t + i) * dt * 0.3;
        if (p[i*3+1] < 0) p[i*3+1] += 10;
        if (p[i*3+1] > 10) p[i*3+1] -= 10;
      }
      wz.pts.position.set(this.camTarget.x, 0, this.camTarget.z);
      wz.pts.geometry.attributes.position.needsUpdate = true;
    }

    this.composer.render(dt);
  }
}


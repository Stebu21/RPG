// Palco 3D delle battaglie: arena con il fondale della zona, eroi 3D animati,
// mostri come sagome dipinte in piedi nella scena, effetti a particelle,
// luci d'impatto, camera che segue l'azione, bloom e hit-stop sui critici.
// La logica della battaglia resta in screens/battle.js: qui si legge lo stato
// delle unità (timer di animazione, HP) e si scrivono sx/sy/size in pixel
// schermo per popup dei danni e selezione col dito.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Person } from './character3d.js';
import { drawMonster } from './sprites.js';

const rnd = (a, b)=>a + Math.random() * (b - a);
const ease = t=>t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;

// texture morbida per le particelle
function dotTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
// cerchio magico runico sotto chi lancia un incantesimo
function runeTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.translate(128, 128); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 4;
  g.beginPath(); g.arc(0, 0, 120, 0, Math.PI*2); g.stroke();
  g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 100, 0, Math.PI*2); g.stroke();
  g.beginPath(); for (let i=0; i<=6; i++){ const a = i/6*Math.PI*2*2; g.lineTo(Math.cos(a)*100, Math.sin(a)*100); } g.stroke();
  g.font = 'bold 18px serif'; g.textAlign = 'center';
  const R = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒ';
  for (let i=0; i<18; i++){ g.save(); g.rotate(i/18*Math.PI*2); g.fillText(R[i], 0, -104); g.restore(); }
  return new THREE.CanvasTexture(c);
}

const ELEM_COL = {
  fuoco:0xff7a2c, ghiaccio:0x9fdcff, tuono:0xffe95a, acqua:0x57b0f0,
  vento:0xa8f0c0, terra:0xd0a05a, sacro:0xfff2b0, oscurita:0xb06ae8, neutro:0xcfd8ff,
};

export class BattleStage {
  constructor(canvas){
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 2, 0.1, 200);
    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.7, 0.5, 0.8);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.dot = dotTexture(); this.rune = runeTexture();
    this.fx = [];
    this.timeScale = 1; this.stopT = 0;
    this.cam = { pos:new THREE.Vector3(), look:new THREE.Vector3(), shake:0, focus:null, focusT:0, zoom:1 };
  }

  resize(W, H){
    if (this.W === W && this.H === H) return;
    this.W = W; this.H = H;
    this.renderer.setSize(W, H, false);
    this.composer.setSize(W, H);
    this.camera.aspect = W / H; this.camera.updateProjectionMatrix();
  }

  // ---------- costruzione dell'arena ----------
  setup(B, paintBackdrop){
    const s = this.scene;
    while (s.children.length) s.remove(s.children[0]);
    this.fx = [];
    this.B = B;
    // fondale: il dipinto della zona su un semicilindro dietro l'arena
    const bc = document.createElement('canvas'); bc.width = 2048; bc.height = 900;
    this.bgCanvas = bc; this.paintBackdrop = paintBackdrop; this.bgT = 0;
    paintBackdrop(bc.getContext('2d'), bc.width, bc.height, 0);
    this.bgTex = new THREE.CanvasTexture(bc); this.bgTex.colorSpace = THREE.SRGBColorSpace;
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 17, 64, 1, true, Math.PI*0.62, Math.PI*1.12),
      new THREE.MeshBasicMaterial({ map:this.bgTex, side:THREE.BackSide, fog:false }));
    cyl.position.set(0, 2.0, 2); s.add(cyl);   // l'orizzonte dipinto (~62% d'altezza) cade a terra

    // colori ricavati dal dipinto: cielo per la luce, terreno per il suolo
    const px = bc.getContext('2d');
    const pick = (x, y)=>{ const d = px.getImageData(x, y, 1, 1).data; return new THREE.Color(`rgb(${d[0]},${d[1]},${d[2]})`); };
    const sky = pick(1024, 30), ground = pick(1024, 870), horizon = pick(1024, 560);
    s.fog = new THREE.Fog(horizon, 14, 30);
    s.background = sky;

    const gc = document.createElement('canvas'); gc.width = gc.height = 512;
    const g = gc.getContext('2d');
    g.fillStyle = '#' + ground.getHexString(); g.fillRect(0, 0, 512, 512);
    for (let i=0; i<4000; i++){
      const v = Math.random();
      g.fillStyle = v > 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.09)';
      g.fillRect(Math.random()*512, Math.random()*512, 2 + Math.random()*4, 2 + Math.random()*4);
    }
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
    gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(6, 6);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(24, 64), new THREE.MeshStandardMaterial({ map:gt, roughness:1 }));
    floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; s.add(floor);

    // ciuffi d'erba e sassi sparsi per dare profondità al suolo
    const tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.35, 3), new THREE.MeshStandardMaterial({ color:ground.clone().multiplyScalar(1.25) }), 380);
    const rock = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.18, 0), new THREE.MeshStandardMaterial({ color:0x8a8478, flatShading:true }), 26);
    const m = new THREE.Object3D();
    for (let i=0; i<380; i++){
      const a = Math.random()*Math.PI*2, d = rnd(1.5, 14);
      m.position.set(Math.cos(a)*d, 0.15, Math.sin(a)*d - 2); m.rotation.set(rnd(-.3,.3), 0, rnd(-.3,.3)); m.scale.setScalar(rnd(0.6, 1.4));
      m.updateMatrix(); tuft.setMatrixAt(i, m.matrix);
    }
    for (let i=0; i<26; i++){
      const a = Math.random()*Math.PI*2, d = rnd(4.5, 13);
      m.position.set(Math.cos(a)*d, 0.05, Math.sin(a)*d - 3); m.rotation.set(rnd(0,3), rnd(0,3), 0); m.scale.set(rnd(.6,2), rnd(.4,1.2), rnd(.6,2));
      m.updateMatrix(); rock.setMatrixAt(i, m.matrix);
    }
    rock.castShadow = true; rock.receiveShadow = true;
    s.add(tuft, rock);

    // luci
    s.add(new THREE.HemisphereLight(sky.clone().lerp(new THREE.Color(1,1,1), 0.5), ground, 1.1));
    const sun = new THREE.DirectionalLight(0xfff0dd, 2.4);
    sun.position.set(4, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left:-8, right:8, top:8, bottom:-8, near:1, far:30 });
    sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -0.0005;
    s.add(sun);
    if (B.boss){
      const rim = new THREE.PointLight(0xff3050, 30, 12); rim.position.set(-4, 3, -3); s.add(rim);
      this.rim = rim;
    } else this.rim = null;
    // luce d'impatto riutilizzata dagli effetti
    this.impact = new THREE.PointLight(0xffffff, 0, 7, 1.5); s.add(this.impact);

    // anelli di selezione / turno
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 40), new THREE.MeshBasicMaterial({ color:0xffd76a, transparent:true, side:THREE.DoubleSide, blending:THREE.AdditiveBlending, depthWrite:false }));
    this.ring.rotation.x = -Math.PI/2; this.ring.position.y = 0.03; s.add(this.ring);
    this.arrow = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 4), new THREE.MeshBasicMaterial({ color:0x7ec8ff }));
    this.arrow.rotation.x = Math.PI; s.add(this.arrow);
    this.tArrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 4), new THREE.MeshBasicMaterial({ color:0xffd76a }));
    this.tArrow.rotation.x = Math.PI; s.add(this.tArrow);

    // unità
    const eN = B.enemies.length;
    B.enemies.forEach((e, i)=>{
      const h = e.def.boss ? 3.4 : 1.8;
      const cv = document.createElement('canvas');
      drawMonster(cv, { sprite:e.def.sprite, pal:e.pal }, 28);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const mat = new THREE.MeshStandardMaterial({ map:tex, transparent:true, alphaTest:0.3, side:THREE.DoubleSide, roughness:0.7, emissive:0xffffff, emissiveIntensity:0 });
      const geo = new THREE.PlaneGeometry(h, h); geo.translate(0, h/2 - h*0.05, 0);
      const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true;
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(h*0.28, 24), new THREE.MeshBasicMaterial({ color:0, transparent:true, opacity:0.35, depthWrite:false }));
      shadow.rotation.x = -Math.PI/2; shadow.position.y = 0.02;
      const grp = new THREE.Group(); grp.add(mesh, shadow); s.add(grp);
      const spread = eN === 1 ? [0] : eN === 2 ? [-1, 1] : eN === 3 ? [-1.5, 0, 1.5] : [-2.1, -0.7, 0.7, 2.1];
      const zc = spread[i] ?? 0;
      const home = e.def.boss ? new THREE.Vector3(-2.7, 0, -0.6) : new THREE.Vector3(-2.3 - (i % 2) * 0.7, 0, zc * 1.0);
      grp.position.copy(home);
      e.o3 = { grp, mesh, mat, shadow, home, h, dying:false };
      e.tag = document.createElement('div'); e.tag.className = 'enemy-tag';
      e.tag.innerHTML = `<span>${e.name}</span><i><b></b></i>`;
      document.getElementById('battle-pops').appendChild(e.tag);
    });
    B.allies.forEach((a, i)=>{
      const p = new Person(a.def, a.id);
      p.root.scale.setScalar(1.55);
      const home = new THREE.Vector3(2.3 + i * 0.35, 0, -0.9 + i * 1.05);
      p.root.position.copy(home);
      s.add(p.root);
      const aura = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.55, 32), new THREE.MeshBasicMaterial({ color:0xff4d6d, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide }));
      aura.rotation.x = -Math.PI/2; aura.position.y = 0.04; s.add(aura);
      a.o3 = { p, home, aura, walk:0, ko:0, hop:0 };
    });

    // camera: introduzione che parte stretta sui nemici e si allarga
    this.cam.pos.set(-1, 1.6, 4.2); this.cam.look.set(-2.4, 1.2, 0);
    this.cam.focus = null; this.cam.intro = 1.4;
  }

  // ---------- effetti ----------
  unitPos(u, y=0.5){
    if (u.kind === 'enemy') return u.o3.grp.position.clone().add(new THREE.Vector3(0, u.o3.h * y, 0));
    return u.o3.p.root.position.clone().add(new THREE.Vector3(0, 1.7 * y, 0));
  }
  add(obj, life, update){ this.scene.add(obj); this.fx.push({ obj, t:0, life, update }); }

  particles(pos, color, n=40, o={}){
    const geo = new THREE.BufferGeometry();
    const P = new Float32Array(n*3), V = [];
    for (let i=0; i<n; i++){
      P[i*3] = pos.x; P[i*3+1] = pos.y; P[i*3+2] = pos.z;
      const a = Math.random()*Math.PI*2, b = Math.random()*Math.PI - Math.PI/2, sp = rnd(o.min ?? 1, o.max ?? 4);
      V.push(new THREE.Vector3(Math.cos(a)*Math.cos(b)*sp, (o.up ?? 0) + Math.sin(b)*sp, Math.sin(a)*Math.cos(b)*sp));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    const mat = new THREE.PointsMaterial({ color, size:o.size ?? 0.18, map:this.dot, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false });
    const pts = new THREE.Points(geo, mat);
    const life = o.life ?? 0.8;
    this.add(pts, life, (f, dt)=>{
      const a = geo.attributes.position;
      for (let i=0; i<n; i++){
        V[i].y -= (o.grav ?? 3) * dt; V[i].multiplyScalar(1 - (o.drag ?? 1.5) * dt);
        a.setXYZ(i, a.getX(i) + V[i].x*dt, a.getY(i) + V[i].y*dt, a.getZ(i) + V[i].z*dt);
      }
      a.needsUpdate = true;
      mat.opacity = 1 - f.t / life;
    });
  }

  flashLight(pos, color, power=40){
    this.impact.position.copy(pos); this.impact.color.set(color); this.impact.intensity = power;
  }

  // proiettile magico con scia e bagliore, poi esplosione tematica
  spell(user, target, element){
    const color = ELEM_COL[element] ?? ELEM_COL.neutro;
    const to = this.unitPos(target, 0.5);
    const delay = 0.32;
    if (element === 'tuono'){
      setTimeout(()=>this.bolt(to, color), 120);
    } else {
      const from = user.kind === 'enemy' ? this.unitPos(user, 0.6) : this.unitPos(user, 0.75).add(new THREE.Vector3(-0.3, 0, 0));
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color }));
      orb.scale.setScalar(1.3);
      const light = new THREE.PointLight(color, 12, 4); orb.add(light);
      const trail = [];
      this.add(orb, delay, f=>{
        const k = ease(Math.min(1, f.t / delay));
        orb.position.lerpVectors(from, to, k).add(new THREE.Vector3(0, Math.sin(k*Math.PI) * 0.9, 0));
        if (trail.length < 12 && Math.random() < 0.9){
          const tt = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color, transparent:true, blending:THREE.AdditiveBlending }));
          tt.position.copy(orb.position); trail.push(tt);
          this.add(tt, 0.3, g=>{ tt.material.opacity = 1 - g.t/0.3; tt.scale.setScalar(1 - g.t/0.3); });
        }
      });
    }
    setTimeout(()=>this.explode(to, element), delay * 1000);
  }

  explode(pos, element){
    const color = ELEM_COL[element] ?? ELEM_COL.neutro;
    this.flashLight(pos, color, 55);
    this.particles(pos, color, 60, { min:1.5, max:5, grav:1, life:0.7, size:0.22 });
    // onda d'urto
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.35, 40), new THREE.MeshBasicMaterial({ color, transparent:true, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, depthWrite:false }));
    ring.position.copy(pos); ring.lookAt(this.camera.position);
    this.add(ring, 0.45, f=>{ const k = f.t/0.45; ring.scale.setScalar(1 + k*3.2); ring.material.opacity = (1 - k) * 0.7; });
    if (element === 'fuoco'){
      this.particles(pos.clone().setY(0.2), 0xff4010, 50, { min:0.3, max:1.2, up:3, grav:-1, life:1.1, size:0.3 });
    } else if (element === 'ghiaccio'){
      for (let i=0; i<10; i++){
        const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), new THREE.MeshStandardMaterial({ color:0xcff0ff, emissive:0x4aa0ff, emissiveIntensity:1.2, metalness:0.2, roughness:0.1, transparent:true }));
        const v = new THREE.Vector3(rnd(-1,1), rnd(0.5, 2), rnd(-1,1)).multiplyScalar(2.2);
        sh.position.copy(pos); sh.scale.set(0.6, 1.8, 0.6);
        this.add(sh, 0.9, (f, dt)=>{ v.y -= 6*dt; sh.position.addScaledVector(v, dt); sh.rotation.x += dt*6; sh.material.opacity = 1 - f.t/0.9; });
      }
    } else if (element === 'sacro' || element === 'oscurita'){
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 7, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent:true, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, depthWrite:false }));
      pillar.position.set(pos.x, 3.5, pos.z);
      this.add(pillar, 0.7, f=>{ const k = f.t/0.7; pillar.scale.set(1 - k*0.7, 1, 1 - k*0.7); pillar.material.opacity = (1 - k) * 0.8; });
    } else if (element === 'vento'){
      const tor = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.5, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, wireframe:true }));
      tor.position.set(pos.x, 1.3, pos.z); tor.rotation.x = Math.PI;
      this.add(tor, 0.8, (f, dt)=>{ tor.rotation.y += dt*14; tor.material.opacity = 0.6 * (1 - f.t/0.8); });
    } else if (element === 'terra'){
      for (let i=0; i<8; i++){
        const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color:0x8a6a44, flatShading:true }));
        const v = new THREE.Vector3(rnd(-1.5,1.5), rnd(3, 5), rnd(-1.5,1.5));
        rk.position.set(pos.x, 0.1, pos.z); rk.castShadow = true;
        this.add(rk, 1, (f, dt)=>{ v.y -= 12*dt; rk.position.addScaledVector(v, dt); if (rk.position.y < 0.1){ rk.position.y = 0.1; v.set(0,0,0); } });
      }
    }
  }

  bolt(pos, color){
    const pts = [];
    const make = ()=>{
      pts.length = 0;
      let y = 9, x = pos.x + rnd(-1, 1), z = pos.z;
      pts.push(new THREE.Vector3(x, y, z));
      while (y > pos.y){ y -= rnd(0.5, 1.1); x = pos.x + rnd(-0.5, 0.5) * (y - pos.y) / 9 * 3; pts.push(new THREE.Vector3(x, Math.max(y, pos.y), z + rnd(-.2,.2))); }
      return new THREE.BufferGeometry().setFromPoints(pts);
    };
    const line = new THREE.Line(make(), new THREE.LineBasicMaterial({ color, transparent:true }));
    const glow = new THREE.Line(line.geometry, new THREE.LineBasicMaterial({ color:0xffffff, transparent:true }));
    this.add(line, 0.45, f=>{ if (Math.random() < 0.5){ line.geometry.dispose(); line.geometry = make(); glow.geometry = line.geometry; } line.material.opacity = 1 - f.t/0.45; });
    this.add(glow, 0.45, f=>{ glow.material.opacity = 1 - f.t/0.45; });
    this.flashLight(pos, color, 90);
    this.cam.shake = Math.max(this.cam.shake, 0.5);
    setTimeout(()=>this.explode(pos, 'tuono'), 60);
  }

  slash(target, colorHex){
    const pos = this.unitPos(target, 0.5);
    const color = new THREE.Color(colorHex || '#ffffff');
    for (let k=0; k<2; k++){
      const arc = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 40, 1, 0, Math.PI*0.9),
        new THREE.MeshBasicMaterial({ color:k ? 0xffffff : color, transparent:true, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, depthWrite:false }));
      arc.position.copy(pos); arc.lookAt(this.camera.position);
      arc.rotateZ(rnd(-0.6, 0.6) + (k ? 0.3 : 0));
      arc.scale.setScalar(k ? 0.9 : 1.1);
      this.add(arc, 0.32, f=>{ const q = f.t/0.32; arc.rotateZ(0.12); arc.scale.multiplyScalar(1.03); arc.material.opacity = 1 - q; });
    }
    this.particles(pos, color, 26, { min:2, max:6, grav:6, life:0.45, size:0.12 });
    this.flashLight(pos, color, 35);
  }

  heal(target, colorHex){
    const pos = this.unitPos(target, 0);
    const color = new THREE.Color(colorHex || '#a0ffb8');
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ map:this.rune, color, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
    ring.rotation.x = -Math.PI/2; ring.position.copy(pos).setY(0.05);
    this.add(ring, 1.0, (f, dt)=>{ ring.rotation.z += dt*2; ring.material.opacity = Math.sin(f.t/1.0*Math.PI); });
    this.particles(pos.clone().setY(0.3), color, 40, { min:0.2, max:0.8, up:2.2, grav:-0.5, drag:0.5, life:1.1, size:0.16 });
  }

  castCircle(u){
    const pos = this.unitPos(u, 0);
    const color = u.kind === 'enemy' ? 0xff6080 : 0x9ec8ff;
    const c = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map:this.rune, color, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
    c.rotation.x = -Math.PI/2; c.position.copy(pos).setY(0.05);
    this.add(c, 0.9, (f, dt)=>{ c.rotation.z -= dt*3; const k = f.t/0.9; c.scale.setScalar(0.6 + k*0.6); c.material.opacity = Math.sin(k*Math.PI); });
    this.particles(pos.clone().setY(0.2), color, 30, { min:0.1, max:0.5, up:3, grav:-1, drag:0.3, life:0.9, size:0.12 });
  }

  // camera sull'azione: si avvicina al punto tra attaccante e bersaglio
  focus(a, b, strength=1, dur=1.0){
    const pa = this.unitPos(a, 0.5), pb = b ? this.unitPos(b, 0.5) : pa;
    this.cam.focus = pa.clone().lerp(pb, 0.5); this.cam.focusT = dur; this.cam.focusK = strength;
  }
  hitStop(sec=0.1){ this.stopT = sec; }

  // ---------- frame ----------
  frame(dtReal, t, selT){
    const B = this.B;
    if (!B) return;
    if (this.stopT > 0){ this.stopT -= dtReal; }
    const dt = this.stopT > 0 ? dtReal * 0.08 : dtReal;

    // fondale animato (nuvole, stelle) a 10 fps
    this.bgT += dtReal;
    if (this.bgT > 0.1){ this.bgT = 0; this.paintBackdrop(this.bgCanvas.getContext('2d'), 2048, 900, t); this.bgTex.needsUpdate = true; }

    for (const e of B.enemies) this.updateEnemy(e, dt, t);
    for (const a of B.allies) this.updateAlly(a, dt, t);

    // effetti
    for (const f of this.fx){ f.t += dt; f.update?.(f, dt); }
    this.fx = this.fx.filter(f=>{
      if (f.t < f.life) return true;
      this.scene.remove(f.obj); f.obj.geometry?.dispose(); f.obj.material?.dispose();
      return false;
    });
    this.impact.intensity *= Math.max(0, 1 - dt * 8);
    if (this.rim) this.rim.intensity = 25 + Math.sin(t*2) * 10;

    // anelli: turno attivo e bersaglio
    const act = B.readyQueue[0];
    const actAlly = act?.kind === 'ally' && act.cs.hp > 0 && !B.over ? act : null;
    this.arrow.visible = !!actAlly;
    if (actAlly){ this.arrow.position.copy(this.unitPos(actAlly, 1.25)).add(new THREE.Vector3(0, Math.sin(t*5)*0.08, 0)); this.arrow.rotation.y = t*3; }
    this.ring.visible = this.tArrow.visible = !!selT;
    if (selT){
      const p = this.unitPos(selT, 0);
      this.ring.position.set(p.x, 0.04, p.z);
      const sc = selT.kind === 'enemy' ? selT.o3.h * 0.6 : 1;
      this.ring.scale.setScalar(sc * (1 + Math.sin(t*7)*0.06));
      this.ring.material.opacity = 0.7 + Math.sin(t*7)*0.3;
      this.tArrow.position.copy(this.unitPos(selT, selT.kind === 'enemy' ? 1.05 : 1.3)).add(new THREE.Vector3(0, 0.2 + Math.sin(t*6)*0.1, 0));
      this.tArrow.rotation.y = t*3;
    }

    this.updateCamera(dtReal, t);
    this.composer.render(dt);
    this.project();
  }

  updateEnemy(e, dt, t){
    const o = e.o3;
    const dead = e.hp <= 0;
    if (dead && !o.dying){ o.dying = true; this.particles(this.unitPos(e, 0.5), 0xb080ff, 80, { min:1, max:4, grav:-0.5, life:1.2, size:0.2 }); }
    const bob = dead ? 0 : Math.sin(t*1.8 + e.idx*1.4) * 0.06;
    const breathe = 1 + Math.sin(t*2.4 + e.idx) * 0.025;
    // spostamenti: affondo, corsa verso il bersaglio, tremito
    let off = new THREE.Vector3();
    if (e.dashT > 0 && e.dashTarget){
      const p = 1 - e.dashT / e.dashDur;
      const k = p < 0.38 ? ease(p/0.38) : p < 0.58 ? 1 : 1 - ease((p-0.58)/0.42);
      const goal = this.unitPos(e.dashTarget, 0).add(new THREE.Vector3(-1.1, 0, 0)).sub(o.home);
      off.copy(goal).multiplyScalar(k); off.y = Math.sin(Math.min(1, p/0.38)*Math.PI) * 0.4;
    } else if (e.lungeT > 0){
      off.x = Math.sin((1 - e.lungeT/0.42) * Math.PI) * 0.8;
    }
    if (e.shakeT > 0) off.x += (Math.random()*2-1) * e.shakeT * 0.6;
    o.grp.position.copy(o.home).add(off);
    o.mesh.position.y = bob - e.deadT * 0.6;
    o.mesh.scale.set(1/breathe, breathe * (e.castT > 0 ? 1.08 : 1), 1);
    o.mat.emissiveIntensity = e.flashT > 0 ? e.flashT * 3 : e.castT > 0 ? 0.25 : 0;
    o.mat.emissive.set(e.castT > 0 ? 0xff4060 : 0xffffff);
    o.mat.opacity = 1 - e.deadT; o.shadow.material.opacity = 0.35 * (1 - e.deadT);
    o.grp.visible = e.deadT < 1;
    // la sagoma guarda sempre la camera
    o.mesh.rotation.y = Math.atan2(this.camera.position.x - o.grp.position.x, this.camera.position.z - o.grp.position.z);
    if (e.castT > 0 && !e._castFx){ e._castFx = true; this.castCircle(e); }
    if (e.castT <= 0) e._castFx = false;
  }

  updateAlly(a, dt, t){
    const o = a.o3, p = o.p;
    const ko = a.cs.hp <= 0;
    o.ko += ((ko ? 1 : 0) - o.ko) * Math.min(1, dt * 6);
    let pos = o.home.clone(), speed = 0, face = -Math.PI/2 + 0.45;   // girati un po' verso la camera
    if (a.dashT > 0 && a.dashTarget){
      const q = 1 - a.dashT / a.dashDur;
      const k = q < 0.38 ? ease(q/0.38) : q < 0.58 ? 1 : 1 - ease((q-0.58)/0.42);
      const goal = this.unitPos(a.dashTarget, 0).add(new THREE.Vector3(a.dashTarget.kind === 'enemy' ? a.dashTarget.o3.h * 0.35 + 0.5 : 1.1, 0, 0.1));
      goal.y = 0;
      pos.lerp(goal, k);
      speed = q < 0.38 || q > 0.58 ? 6 : 0;
      if (q > 0.58) face = Math.PI/2;              // torna al proprio posto
      o.walk += speed * dt * 0.5;
    } else if (a.lungeT > 0){
      pos.x -= Math.sin((1 - a.lungeT/0.42) * Math.PI) * 0.7;
    }
    if (a.shakeT > 0) pos.x += (Math.random()*2-1) * a.shakeT * 0.4 + a.shakeT * 0.5;
    // vittoria: saltelli
    if (this.B.victory && !ko){ o.hop = Math.abs(Math.sin(t*5 + a.o3.home.z)) * 0.35; face = Math.PI * 0.1; } else o.hop = 0;
    p.update(dt, face, speed, o.walk);
    p.place(pos.x, pos.z, 0, o.hop);

    // pose di combattimento sopra la camminata
    const R = p.arms[1], L = p.arms[0];
    if (a.dashT > 0){
      const q = 1 - a.dashT / a.dashDur;
      if (q > 0.36 && q < 0.62){                    // fendente
        const s = (q - 0.36) / 0.26;
        R.sh.rotation.x = -2.6 + s * 3.4; R.el.rotation.x = -0.4;
        p.torso.rotation.y = -0.6 + s * 1.2;
      }
    } else if (a.lungeT > 0){
      const s = 1 - a.lungeT / 0.42;
      R.sh.rotation.x = -2.4 + s * 3; L.sh.rotation.x = 0.4;
    } else if (a.castT > 0){
      const s = 1 - a.castT / 0.55;
      for (const arm of [L, R]){ arm.sh.rotation.x = -2.2 - Math.sin(s*Math.PI)*0.6; arm.el.rotation.x = -0.2; }
      if (!a._castFx){ a._castFx = true; this.castCircle(a); }
    } else if (this.B.victory && !ko){
      R.sh.rotation.x = -2.9; R.el.rotation.x = -0.3;
    } else if (!ko){
      // guardia: braccia leggermente avanti, ginocchia piegate
      R.sh.rotation.x = -0.3 + Math.sin(t*2 + o.home.z)*0.05; R.el.rotation.x = -0.55;
      L.sh.rotation.x = -0.15; L.el.rotation.x = -0.45;
      for (const l of p.legs){ l.hip.rotation.x = -0.18; l.knee.rotation.x = 0.3; }
    }
    if (a.castT <= 0) a._castFx = false;
    // KO: a terra
    p.body.rotation.x = -o.ko * Math.PI/2 * 0.95;
    p.root.position.y = o.hop + o.ko * 0.12;
    // colpito: lampeggia
    p.root.visible = !(a.flashT > 0 && Math.floor(t*30) % 2);
    // aura del Limite
    const limit = !ko && a.cs.hp / a.st.hp < 0.3;
    o.aura.position.set(pos.x, 0.04, pos.z);
    o.aura.material.opacity = limit ? 0.5 + Math.sin(t*6)*0.3 : 0;
    o.aura.scale.setScalar(1 + Math.sin(t*6)*0.1);
  }

  updateCamera(dt, t){
    const c = this.cam;
    const base = new THREE.Vector3(2.4 + Math.sin(t*0.25)*0.35, 2.1, 6.0);
    let look = new THREE.Vector3(-0.1, 1.1, 0);
    let pos = base;
    if (c.intro > 0){ c.intro -= dt; }
    if (c.focusT > 0 && c.focus){
      c.focusT -= dt;
      const k = Math.min(1, c.focusT * 3) * c.focusK;
      look = look.clone().lerp(c.focus, 0.55 * k);
      pos = base.clone().lerp(c.focus.clone().add(new THREE.Vector3(2.2, 1.4, 4.2)), 0.45 * k);
    }
    if (this.B.victory){ pos = new THREE.Vector3(5.4, 2.0, 4.8); look = new THREE.Vector3(2.4, 1.1, 0); }
    const s = 1 - Math.exp(-dt * (c.intro > 0 ? 1.8 : 4));
    c.pos.lerp(pos, s); c.look.lerp(look, s);
    this.camera.position.copy(c.pos);
    if (c.shake > 0){
      c.shake = Math.max(0, c.shake - dt * 2.5);
      this.camera.position.add(new THREE.Vector3(rnd(-1,1), rnd(-1,1), 0).multiplyScalar(c.shake * 0.15));
    }
    this.camera.lookAt(c.look);
  }

  // coordinate schermo per popup dei danni, tocchi e targhette dei nemici
  project(){
    const W = this.W, H = this.H;
    const toScreen = v=>{ const p = v.clone().project(this.camera); return { x:(p.x+1)/2*W, y:(1-p.y)/2*H }; };
    for (const u of [...this.B.enemies, ...this.B.allies]){
      const feet = toScreen(this.unitPos(u, 0)), head = toScreen(this.unitPos(u, 1));
      u.sx = feet.x; u.sy = feet.y; u.size = Math.max(40, feet.y - head.y);
      u.ox = 0;
      if (u.tag){
        const alive = u.hp > 0;
        u.tag.style.display = alive ? '' : 'none';
        u.tag.style.left = feet.x + 'px'; u.tag.style.top = (feet.y + 6) + 'px';
        const pct = Math.max(0, u.hp / u.maxhp);
        const bar = u.tag.querySelector('b');
        bar.style.width = pct * 100 + '%';
        bar.style.background = pct < 0.25 ? '#e74c3c' : pct < 0.5 ? '#f1b13c' : '#46c46e';
      }
    }
  }
}

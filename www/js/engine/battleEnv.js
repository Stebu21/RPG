// Ambienti 3D delle battaglie, uno per zona della provincia: cielo fisico
// con l'ora giusta, colline a rilievo, monumenti della zona sullo sfondo,
// alberi, erba che ondeggia, acqua, particelle d'atmosfera e luci coerenti.

import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

const rnd = (a, b)=>a + Math.random() * (b - a);
function hash(x, y){ const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
function noise(x, y){
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
  const a = hash(xi, yi), b = hash(xi+1, yi), c = hash(xi, yi+1), d = hash(xi+1, yi+1);
  return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v;
}
const std = (color, o={})=>new THREE.MeshStandardMaterial({ color, roughness:0.85, ...o });

// elev: altezza del sole in gradi (negativa = notte), az: azimut
const AREAS = {
  varese:      { elev:38, az:40, ground:'#5f9a4a', dirt:'#8a7a55', grass:0x86c65a, hills:0x4d7a45, far:0x7f97b4, fog:0xa9c4dc, particles:'pollen', landmark:'varese', trees:0x3f7a34 },
  vedano:      { elev:30, az:55, ground:'#5a9446', dirt:'#7d6e4c', grass:0x7fc052, hills:0x46704a, far:0x7890aa, fog:0xa8c6d8, particles:'pollen', landmark:'lazzaretto', river:true, trees:0x3a7030 },
  castiglione: { elev:12, az:240, ground:'#9a8a4e', dirt:'#9b7d4e', grass:0xc9b35a, hills:0x8a7048, far:0xb08a78, fog:0xf2d8b0, particles:'dust', landmark:'collegiata', trees:0x6a7a34, tint:[1.08, 0.98, 0.86] },
  jerago:      { elev:4,  az:260, ground:'#7a8a44', dirt:'#806a48', grass:0xa8b050, hills:0x6a5060, far:0x9a6a7a, fog:0xf0b890, particles:'leaves', landmark:'castello', trees:0x5a6a30, tint:[1.1, 0.92, 0.84] },
  samarate:    { elev:1,  az:280, ground:'#7a6e4c', dirt:'#5e5446', grass:0x9a9a58, hills:0x4a4458, far:0x5a5470, fog:0xb89080, particles:'sparks', landmark:'hangar', trees:0x4a5a34, tint:[1.0, 0.9, 0.95] },
  sacromonte:  { elev:-20, az:0,  ground:'#3c3450', dirt:'#2c2638', grass:0x5a5a7a, hills:0x2a2240, far:0x3a2a58, fog:0x241a3a, particles:'motes', landmark:'cappelle', trees:0x223040, night:true, tint:[0.85, 0.8, 1.15] },
};

export function areaTint(area){ return (AREAS[area] || AREAS.varese).tint || [1, 1, 1]; }

// terreno: erba con chiazze, sentiero battuto al centro dove si combatte
function groundTexture(A){
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = A.ground; g.fillRect(0, 0, 1024, 1024);
  for (let i=0; i<9000; i++){
    const x = Math.random()*1024, y = Math.random()*1024, n = noise(x/90, y/90);
    g.fillStyle = n > 0.55 ? 'rgba(255,255,210,.07)' : 'rgba(0,20,0,.10)';
    g.fillRect(x, y, 2 + Math.random()*5, 2 + Math.random()*5);
  }
  // arena calpestata: terra battuta ellittica al centro
  const gr = g.createRadialGradient(512, 512, 20, 512, 512, 120);
  gr.addColorStop(0, A.dirt); gr.addColorStop(0.55, A.dirt + 'cc'); gr.addColorStop(1, A.dirt + '00');
  g.save(); g.translate(512, 512); g.scale(1.6, 1); g.translate(-512, -512);
  g.fillStyle = gr; g.beginPath(); g.arc(512, 512, 120, 0, Math.PI*2); g.fill(); g.restore();
  for (let i=0; i<600; i++){       // sassolini nella terra
    const a = Math.random()*Math.PI*2, r = Math.random()*80;
    g.fillStyle = `rgba(${Math.random()>.5?'220,210,190':'40,30,20'},.35)`;
    g.fillRect(512 + Math.cos(a)*r*1.6, 512 + Math.sin(a)*r, 2 + Math.random()*3, 2 + Math.random()*2);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function ridge(len, height, seed, color, flat=true){
  const geo = new THREE.PlaneGeometry(len, height * 2.2, 90, 10);
  const p = geo.attributes.position;
  for (let i=0; i<p.count; i++){
    const x = p.getX(i), y = p.getY(i);
    const prof = height * (0.45 + 0.55 * noise(x * 0.05 + seed, seed)) * (1 - Math.pow(Math.abs(x) / (len/2), 4));
    const t = y / (height * 2.2) + 0.5;
    p.setY(i, t * prof);
    p.setZ(i, -t * height * 0.9 + noise(x * 0.2, y * 0.2 + seed) * 1.5);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, std(color, { roughness:1, flatShading:flat }));
}

export function buildEnvironment(scene, area, boss){
  const A = AREAS[area] || AREAS.varese;
  const upd = [];
  const g = new THREE.Group(); scene.add(g);

  // ---- cielo ----
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - Math.max(A.elev, -5)), THREE.MathUtils.degToRad(A.az));
  if (!A.night){
    const sky = new Sky(); sky.scale.setScalar(300);
    const u = sky.material.uniforms;
    u.turbidity.value = A.elev < 15 ? 7 : 2; u.rayleigh.value = A.elev < 15 ? 2.8 : 2.2;
    u.mieCoefficient.value = A.elev < 15 ? 0.005 : 0.0015; u.mieDirectionalG.value = 0.8;
    // il cielo del modello fisico è molto luminoso: lo si attenua per non sbiancare col bloom
    sky.material.onBeforeCompile = sh=>{ sh.fragmentShader = sh.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( retColor * 0.6, 1.0 );'); };
    u.sunPosition.value.copy(sunDir);
    g.add(sky);
  } else {
    scene.background = new THREE.Color(0x0a0716);
    // stelle e luna
    const N = 1600, P = new Float32Array(N*3);
    for (let i=0; i<N; i++){
      const v = new THREE.Vector3().setFromSphericalCoords(140, rnd(0.05, 1.45), rnd(0, Math.PI*2));
      P.set([v.x, v.y, v.z], i*3);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(P, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color:0xffffff, size:0.6, sizeAttenuation:true, fog:false, transparent:true }));
    g.add(stars);
    upd.push(t=>{ stars.material.opacity = 0.75 + Math.sin(t * 1.3) * 0.15; });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 16), new THREE.MeshBasicMaterial({ color:0xdde4ff, fog:false }));
    moon.position.set(30, 45, -100); g.add(moon);
    // la nube viola di Eterna, che ruota lenta
    const cloud = new THREE.Mesh(new THREE.TorusGeometry(40, 9, 12, 40), new THREE.MeshBasicMaterial({ color:0x7a2ab0, transparent:true, opacity:0.22, fog:false, depthWrite:false }));
    cloud.rotation.x = Math.PI/2; cloud.position.set(0, 40, -30); g.add(cloud);
    upd.push(t=>{ cloud.rotation.z = t * 0.03; cloud.material.opacity = 0.2 + Math.sin(t * 0.7) * 0.05; });
  }
  scene.fog = new THREE.FogExp2(A.fog, A.night ? 0.02 : A.elev < 15 ? 0.014 : 0.009);

  // ---- terreno ----
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ map:groundTexture(A), roughness:1 }));
  floor.rotation.x = -Math.PI/2; floor.receiveShadow = true;   // la texture copre 60 unità, l'arena battuta è al centro
  g.add(floor);
  const outer = new THREE.Mesh(new THREE.RingGeometry(29, 200, 48), std(new THREE.Color(A.ground).multiplyScalar(0.9), { roughness:1 }));
  outer.rotation.x = -Math.PI/2; outer.position.y = -0.01; g.add(outer);

  // ---- colline e montagne a strati (più lontane = più chiare per la foschia) ----
  const r1 = ridge(120, 9, 3, A.hills); r1.position.set(0, -0.5, -32); g.add(r1);
  const r2 = ridge(170, 18, 11, A.far); r2.position.set(10, -1, -55); g.add(r2);
  const r3 = ridge(90, 7, 23, A.hills); r3.position.set(-40, -0.5, -8); r3.rotation.y = Math.PI/2.3; g.add(r3);
  const r4 = ridge(90, 6, 31, A.hills); r4.position.set(42, -0.5, -6); r4.rotation.y = -Math.PI/2.3; g.add(r4);

  // ---- alberi (istanziati) sul fondo e ai lati ----
  const NT = A.night ? 40 : 70;
  const trunkG = new THREE.CylinderGeometry(0.12, 0.2, 1.6, 6); trunkG.translate(0, 0.8, 0);
  const crownG = A.night || area === 'jerago' ? new THREE.ConeGeometry(1.0, 2.8, 7) : new THREE.IcosahedronGeometry(1.1, 1);
  crownG.translate(0, A.night || area === 'jerago' ? 2.8 : 2.4, 0);
  const trunks = new THREE.InstancedMesh(trunkG, std(0x4a3222), NT);
  const crowns = new THREE.InstancedMesh(crownG, std(0xffffff, { flatShading:true }), NT);
  trunks.castShadow = crowns.castShadow = true;
  const m = new THREE.Object3D(), col = new THREE.Color();
  for (let i=0; i<NT; i++){
    let x, z;
    do { const a = rnd(Math.PI*1.05, Math.PI*1.95), d = rnd(11, 26); x = Math.cos(a) * d * 1.3; z = Math.sin(a) * d; } while ((Math.abs(x) < 3 && z > -12) || (Math.abs(x - 3) < 13 && z < -13));   // lascia libera la vista sul monumento
    m.position.set(x, 0, z); m.scale.setScalar(rnd(0.7, 1.4)); m.rotation.y = rnd(0, 6); m.updateMatrix();
    trunks.setMatrixAt(i, m.matrix); crowns.setMatrixAt(i, m.matrix);
    col.set(A.trees).offsetHSL(rnd(-0.03, 0.03), 0, rnd(-0.06, 0.08)); crowns.setColorAt(i, col);
  }
  g.add(trunks, crowns);

  // ---- erba che ondeggia (lontana dal centro dell'arena) ----
  const NB = 2600;
  const bladeG = new THREE.ConeGeometry(0.035, 0.45, 3, 1, true); bladeG.translate(0, 0.22, 0);
  const bladeM = std(A.grass, { side:THREE.DoubleSide, emissive:new THREE.Color(A.grass).multiplyScalar(0.12) });
  const wind = { value:0 };
  bladeM.onBeforeCompile = sh=>{
    sh.uniforms.time = wind;
    sh.vertexShader = 'uniform float time;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wp = instanceMatrix * vec4(0.,0.,0.,1.);
      float sway = sin(time*1.8 + wp.x*0.6 + wp.z*0.4) * 0.14 * position.y * 2.0;
      transformed.x += sway; transformed.z += sway * 0.4;`);
  };
  const blades = new THREE.InstancedMesh(bladeG, bladeM, NB);
  for (let i=0; i<NB; i++){
    let x, z;
    do { x = rnd(-22, 22); z = rnd(-18, 9); } while ((x*x)/30 + (z*z)/9 < 1.3);   // fuori dall'ellisse dell'arena
    m.position.set(x, 0, z); m.rotation.set(rnd(-.25,.25), rnd(0, 6), rnd(-.25,.25)); m.scale.set(1, rnd(0.6, 1.6), 1); m.updateMatrix();
    blades.setMatrixAt(i, m.matrix);
    col.set(A.grass).offsetHSL(rnd(-0.03, 0.03), 0, rnd(-0.1, 0.08)); blades.setColorAt(i, col);
  }
  blades.receiveShadow = true; g.add(blades);
  upd.push(t=>{ wind.value = t; });
  // fiori e sassi
  if (!A.night){
    const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), std(0xffffff, { emissive:0x222222 }), 260);
    const pal = [0xff6a8a, 0xffe060, 0xffffff, 0xb890ff];
    for (let i=0; i<260; i++){
      let x, z; do { x = rnd(-18, 18); z = rnd(-14, 7); } while ((x*x)/30 + (z*z)/9 < 1.3);
      m.position.set(x, rnd(0.2, 0.35), z); m.scale.setScalar(1); m.rotation.set(0,0,0); m.updateMatrix(); fl.setMatrixAt(i, m.matrix);
      fl.setColorAt(i, col.set(pal[i % pal.length]));
    }
    g.add(fl);
  }
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.25, 0), std(0x8a8478, { flatShading:true }), 40);
  for (let i=0; i<40; i++){
    const a = rnd(0, Math.PI*2), d = rnd(4.2, 14);
    m.position.set(Math.cos(a)*d*1.3, 0.05, Math.sin(a)*d - 3); m.rotation.set(rnd(0,3), rnd(0,3), 0); m.scale.set(rnd(.5,2), rnd(.4,1.1), rnd(.5,2)); m.updateMatrix();
    rocks.setMatrixAt(i, m.matrix);
  }
  rocks.castShadow = rocks.receiveShadow = true; g.add(rocks);

  // ---- acqua: il lago di Varese o l'Olona ----
  if (area === 'varese' || A.river){
    const wg = area === 'varese' ? new THREE.CircleGeometry(14, 48) : new THREE.PlaneGeometry(90, 5);
    const water = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color:0x3f86a8, roughness:0.08, metalness:0.6, transparent:true, opacity:0.9 }));
    water.rotation.x = -Math.PI/2;
    if (area === 'varese'){ water.scale.set(2.2, 0.6, 1); water.position.set(-16, 0.02, -24); }
    else { water.position.set(0, 0.02, -14); water.rotation.z = 0.08; }
    g.add(water);
    upd.push(t=>{ water.material.color.setHSL(0.55, 0.45, 0.42 + Math.sin(t*1.5) * 0.02); });
  }

  // ---- monumento della zona sullo sfondo ----
  const stone = std(0xd8d0c0), roof = std(0xa8452e), dark = std(0x4a4040);
  const L = new THREE.Group(); g.add(L);
  const box = (w, h, d, mt, x, y, z)=>{ const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mt); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; L.add(b); return b; };
  const gable = (w, d, h, mt, x, y, z)=>{
    const s = new THREE.Shape(); s.moveTo(-w/2, 0); s.lineTo(0, h); s.lineTo(w/2, 0); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth:d, bevelEnabled:false }); geo.translate(0, 0, -d/2);
    const r = new THREE.Mesh(geo, mt); r.position.set(x, y, z); r.castShadow = true; L.add(r); return r;
  };
  const campanile = (x, z, h)=>{ box(1.4, h, 1.4, stone, x, h/2, z); box(1.6, 0.5, 1.6, dark, x, h - 1, z); const sp = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 4), roof); sp.position.set(x, h + 1.1, z); sp.rotation.y = Math.PI/4; L.add(sp); };
  if (A.landmark === 'varese'){
    campanile(6, -20, 13);                                       // il Bernascone
    box(9, 4, 3, std(0xf0d9a8), -3, 2, -22); gable(9.2, 3.2, 1.4, roof, -3, 4, -22);   // palazzo Estense
  } else if (A.landmark === 'lazzaretto'){
    // Chiesa del Lazzaretto: aula con portico ad archi e campanile a vela
    box(6, 3.6, 5, std(0xe9e0cc), 4, 1.8, -20); gable(6.3, 5.2, 2, roof, 4, 3.6, -20);
    for (let i=0; i<5; i++){ const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 2.4, 10), stone); c.position.set(1.6 + i * 1.2, 1.2, -16.6); c.castShadow = true; L.add(c); }
    box(6, 0.3, 1.6, stone, 4, 2.5, -17.2); gable(6.1, 1.8, 0.6, roof, 4, 2.65, -17.2);
    box(1.6, 2, 0.4, stone, 4, 6.4, -17.6);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 0.5, 10), std(0xb08d3c, { metalness:1, roughness:0.35 }));
    bell.position.set(4, 6.4, -17.3); L.add(bell);
    upd.push(t=>{ bell.rotation.x = Math.sin(t * 2.2) * 0.35; });
  } else if (A.landmark === 'collegiata'){
    // la Collegiata sul colle sopra il borgo
    const hill = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 12, 0, Math.PI*2, 0, Math.PI/2), std(0x8a7a44, { flatShading:true }));
    hill.scale.set(1.4, 0.5, 1); hill.position.set(6, -0.5, -24); L.add(hill);
    box(7, 4, 3.5, stone, 6, 6.5, -24); gable(7.2, 3.7, 2.2, roof, 6, 8.5, -24);
    campanile(10.5, -24.5, 11);
    for (let i=0; i<5; i++){ box(2.2, 2, 2, std(0xc9a070), -8 + i * 2.6, 1, -17 - (i % 2)); gable(2.4, 2.2, 1, roof, -8 + i * 2.6, 2, -17 - (i % 2)); }
  } else if (A.landmark === 'castello'){
    // il castello di Jerago: cinta muraria, torri e mastio
    box(12, 3.5, 1.5, stone, 3, 1.75, -20);
    for (const x of [-3, 9]){ const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 6, 12), stone); tw.position.set(x, 3, -20); tw.castShadow = true; L.add(tw); }
    box(3, 10, 3, stone, 3, 5, -22);
    for (let i=0; i<5; i++) box(0.5, 0.7, 0.5, stone, 1.8 + i * 0.6, 10.3, -20.6);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshStandardMaterial({ color:0xc0392b, side:THREE.DoubleSide }));
    flag.position.set(3.8, 12, -22); L.add(flag); box(0.08, 2.2, 0.08, dark, 3, 11.6, -22);
    upd.push(t=>{ flag.rotation.y = Math.sin(t * 3) * 0.4; });
  } else if (A.landmark === 'hangar'){
    // hangar delle officine aeronautiche, con antenna lampeggiante
    for (const [x, s] of [[-5, 1], [5, 1.3]]){
      // mezza botte con la parte curva verso l'alto e l'asse in profondità
      const hgG = new THREE.CylinderGeometry(3.5 * s, 3.5 * s, 9, 24, 1, false, 0, Math.PI);
      hgG.rotateX(Math.PI/2); hgG.rotateZ(Math.PI/2);
      const hg = new THREE.Mesh(hgG, std(0x8a8f9c, { metalness:0.6, roughness:0.35, side:THREE.DoubleSide }));
      hg.position.set(x, 0, -22); hg.castShadow = true; L.add(hg);
      box(3 * s, 3 * s, 0.2, std(0x2a2a30), x, 1.5 * s, -17.4);   // portellone aperto
    }
    box(0.3, 12, 0.3, dark, 12, 6, -20);
    const blink = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color:0xff3020 })); blink.position.set(12, 12.2, -20); L.add(blink);
    upd.push(t=>{ blink.visible = Math.sin(t * 3) > 0; });
    // un vecchio biplano sulla pista
    const plane = new THREE.Group();
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.2, 4, 10), std(0xb0a070)); fus.rotation.z = Math.PI/2; plane.add(fus);
    for (const y of [0.35, -0.2]){ const w = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 6), std(0xc8b880)); w.position.set(0.6, y, 0); plane.add(w); }
    plane.position.set(-12, 0.9, -12); plane.rotation.y = 0.5; L.add(plane);
  } else if (A.landmark === 'cappelle'){
    // le cappelle del Sacro Monte in fila sul crinale, finestre accese
    for (let i=0; i<6; i++){
      const x = -14 + i * 5.5, y = 2 + i * 1.2, z = -24 - i;
      box(2.4, 2.6, 2.4, std(0xe8e0f0), x, y + 1.3, z); gable(2.6, 2.6, 1.2, roof, x, y + 2.6, z);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), new THREE.MeshBasicMaterial({ color:0xffd27a })); w.position.set(x, y + 1.2, z + 1.21); L.add(w);
    }
    const sant = box(6, 6, 5, std(0xf0ebe0), 16, 10, -34); campanile(20, -34, 16);
  }

  // ---- particelle d'atmosfera ----
  const NP = A.particles === 'sparks' ? 180 : 260;
  const P = new Float32Array(NP * 3), V = [];
  for (let i=0; i<NP; i++){ P.set([rnd(-16, 16), rnd(0, 7), rnd(-14, 6)], i*3); V.push(rnd(0.3, 1)); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(P, 3));
  const pc = { pollen:0xfff2b0, dust:0xffe0a0, leaves:0xe08a3c, sparks:0xffa040, motes:0xc080ff }[A.particles];
  const pm = new THREE.PointsMaterial({ color:pc, size: A.particles === 'leaves' ? 0.14 : 0.08, transparent:true, opacity:0.85, depthWrite:false,
    blending: A.particles === 'leaves' ? THREE.NormalBlending : THREE.AdditiveBlending });
  const pts = new THREE.Points(pg, pm); g.add(pts);
  upd.push((t, dt)=>{
    const a = pg.attributes.position;
    for (let i=0; i<NP; i++){
      let x = a.getX(i), y = a.getY(i), z = a.getZ(i);
      if (A.particles === 'leaves'){ y -= V[i] * dt * 0.8; x += Math.sin(t + i) * dt * 0.8; }
      else if (A.particles === 'sparks'){ y += V[i] * dt * 1.5; x += Math.sin(t * 3 + i) * dt * 0.3; }
      else { y += Math.sin(t * 0.8 + i) * dt * 0.15; x += Math.cos(t * 0.5 + i * 2) * dt * 0.2 * V[i]; }
      if (y < 0) y = 7; if (y > 7) y = 0;
      a.setXYZ(i, x, y, z);
    }
    a.needsUpdate = true;
  });

  // ---- luci ----
  const night = !!A.night, low = A.elev < 15;
  const skyC = night ? new THREE.Color(0x4a4a90) : low ? new THREE.Color(0xffc8a0) : new THREE.Color(0xcfe6ff);
  const hemi = new THREE.HemisphereLight(skyC, new THREE.Color(A.ground), night ? 0.7 : 1.0); g.add(hemi);
  const sun = new THREE.DirectionalLight(night ? 0x9fb0ff : low ? 0xffb070 : 0xfff1d6, night ? 1.2 : low ? 2.4 : 2.8);
  const sp = night ? new THREE.Vector3(6, 10, 4) : sunDir.clone().multiplyScalar(20);
  sp.y = Math.max(sp.y, 5);
  sun.position.copy(sp); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left:-9, right:9, top:9, bottom:-9, near:1, far:50 });
  sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  g.add(sun);
  let rim = null;
  if (boss){
    rim = new THREE.PointLight(0xff3050, 30, 14); rim.position.set(-4, 3, -3); g.add(rim);
  }
  if (night){ const fill = new THREE.PointLight(0x9a60ff, 12, 16); fill.position.set(0, 4, 2); g.add(fill); }

  return {
    rim,
    update(t, dt){ for (const f of upd) f(t, dt); },
  };
}

// Personaggi 3D procedurali: corpo modellato con superfici di rotazione
// (niente cubi), proporzioni realistiche (~6,5 teste), viso con occhi,
// sopracciglia, naso, bocca e orecchie, capelli/barba dal `look` del
// personaggio, camminata con ginocchia e gomiti che si piegano.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SKIN = 0xf0c29a;
const std = (color, o={})=>new THREE.MeshStandardMaterial({ color, roughness:0.75, metalness:0, ...o });

function hashStr(s){ let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; }

// profilo del busto (raggio in funzione dell'altezza): fianchi, vita, petto, spalle
function torsoGeo(h, wide, female){
  const w = wide ? 1.22 : 1;
  const pts = [
    [0.000, 0.00], [0.105*w, 0.00], [0.118*w*(female?1.08:1), 0.06],   // bacino
    [0.100*w*(female?0.92:1), 0.17],                                      // vita
    [0.112*w*(female?1.02:1.02), 0.25], [0.125*w, 0.31],                  // petto
    [0.118*w, 0.36], [0.07, 0.40], [0.042, 0.405],                        // spalle -> collo
  ].map(([r, y])=>new THREE.Vector2(r, y * h));
  const g = new THREE.LatheGeometry(pts, 20);
  g.scale(1, 1, 0.68);  // il busto è più largo che profondo
  return g;
}

function sphere(r, material, sx=1, sy=1, sz=1, seg=16){
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg*0.75)), material);
  m.scale.set(sx, sy, sz); m.castShadow = true;
  return m;
}

// pelle con tatuaggi tribali (onde e punte) per le braccia di Riki
let TATTOO = null;
function tattooTexture(){
  if (TATTOO) return TATTOO;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f0c29a'; g.fillRect(0, 0, 128, 256);
  g.strokeStyle = '#1d2a3a'; g.fillStyle = '#1d2a3a'; g.lineWidth = 7; g.lineCap = 'round';
  for (let k=0; k<3; k++){
    const y0 = 30 + k*78;
    g.beginPath();
    for (let x=0; x<=128; x+=4) g.lineTo(x, y0 + Math.sin(x/128*Math.PI*4 + k) * 14);
    g.stroke();
    for (let i=0; i<4; i++){
      const x = 16 + i*32;
      g.beginPath(); g.moveTo(x - 9, y0 + 22); g.lineTo(x, y0 + 50); g.lineTo(x + 9, y0 + 22); g.closePath(); g.fill();
    }
  }
  TATTOO = new THREE.CanvasTexture(c); TATTOO.colorSpace = THREE.SRGBColorSpace;
  TATTOO.wrapS = THREE.RepeatWrapping;
  return TATTOO;
}

// NPC generici: aspetto deterministico ricavato dall'id
const HAIR = ['#2b1d14', '#4a3020', '#1a1a1a', '#6b4a2a', '#b08050', '#8a8a8a', '#3a2418'];
function npcLook(id){
  const r = k=>hashStr(id + ':' + k);
  const female = r('f') > 0.55;
  return {
    h: r('h') > 0.7 ? 'tall' : r('h') < 0.2 ? 'short' : 'mid',
    build: r('b') > 0.75 ? 'wide' : 'slim',
    hair: HAIR[(r('hc') * HAIR.length) | 0],
    eyes: ['#3b2a1a', '#2e5e8a', '#2e7a4a', '#1a1a1a'][(r('e')*4)|0],
    longHair: female, ponytail: female && r('p') > 0.6,
    beard: !female && r('bd') > 0.7 ? 1 : 0,
    baldTop: !female && r('bt') > 0.85,
    female,
  };
}

// ---------- texture di dettaglio (in scala di grigi: il colore lo dà il materiale) ----------
const TEXC = new Map();
function detailTex(key, size, paint, repeat=1){
  if (TEXC.has(key)) return TEXC.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  let seed = 7; const rnd = ()=>((seed = (seed * 16807) % 2147483647) / 2147483647);
  paint(g, size, rnd);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  TEXC.set(key, t);
  return t;
}
// pelle: pori e piccole variazioni di tono, niente plastica uniforme
const skinDetail = ()=>detailTex('skin', 128, (g, s, rnd)=>{
  g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, s, s);
  for (let i=0; i<2600; i++){ const v = 215 + rnd() * 40 | 0; g.fillStyle = `rgba(${v},${v - 6},${v - 10},.5)`; g.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 2, 1 + rnd() * 2); }
  for (let i=0; i<40; i++){ g.fillStyle = 'rgba(230,190,185,.18)'; g.beginPath(); g.arc(rnd() * s, rnd() * s, 4 + rnd() * 10, 0, Math.PI * 2); g.fill(); }
});
// tessuto: trama fitta di fili chiari e scuri
const weave = ()=>detailTex('weave', 64, (g, s, rnd)=>{
  g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, s, s);
  for (let y=0; y<s; y+=2) for (let x=0; x<s; x+=2){ const v = ((x + y) / 2) % 2 ? 250 : 205; g.fillStyle = `rgb(${v - rnd() * 20 | 0},${v - rnd() * 20 | 0},${v - rnd() * 20 | 0})`; g.fillRect(x, y, 2, 2); }
  for (let i=0; i<30; i++){ g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, rnd() * s, s, 1); }
}, 6);
// capelli: ciocche verticali con riflessi
const strands = ()=>detailTex('hair', 128, (g, s, rnd)=>{
  g.fillStyle = '#b8b8b8'; g.fillRect(0, 0, s, s);
  for (let i=0; i<520; i++){
    const x = rnd() * s, v = 120 + rnd() * 135 | 0;
    g.strokeStyle = `rgba(${v},${v},${v},.8)`; g.lineWidth = 0.6 + rnd() * 1.2;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (rnd() - .5) * 10, s * .3, x + (rnd() - .5) * 10, s * .7, x + (rnd() - .5) * 6, s); g.stroke();
  }
  const hl = g.createLinearGradient(0, 0, 0, s); hl.addColorStop(0.35, 'rgba(255,255,255,0)'); hl.addColorStop(0.5, 'rgba(255,255,255,.35)'); hl.addColorStop(0.65, 'rgba(255,255,255,0)');
  g.fillStyle = hl; g.fillRect(0, 0, s, s);
}, 2);

const SKIN_TONES = ['#f1c7a3', '#e8b48c', '#dca17c', '#c68a62', '#9c6a48', '#f3d2b8'];
const skinMat = (tone, map)=>new THREE.MeshPhysicalMaterial({ color:tone, map:map || skinDetail(), roughness:0.62,
  sheen:0.5, sheenRoughness:0.55, sheenColor:new THREE.Color(0xff9d80), clearcoat:0.06, clearcoatRoughness:0.7 });
const cloth = (color, o={})=>std(color, { map:weave(), roughness:0.92, ...o });
const hairMat = color=>new THREE.MeshPhysicalMaterial({ color, map:strands(), roughness:0.5, sheen:0.35, sheenRoughness:0.4, sheenColor:new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.3) });

// nastro di stoffa che segue una curva sul busto (bavero del gi, revers)
function ribbon(points, width, material){
  const curve = new THREE.CatmullRomCurve3(points), N = 24, pos = [], idx = [];
  for (let i=0; i<=N; i++){
    const t = i / N, p = curve.getPoint(t), tan = curve.getTangent(t);
    const out = new THREE.Vector3(p.x, 0, p.z).normalize();          // verso l'esterno del busto
    const side = new THREE.Vector3().crossVectors(tan, out).normalize().multiplyScalar(width / 2);
    const q = p.clone().addScaledVector(out, 0.004);
    pos.push(q.x - side.x, q.y - side.y, q.z - side.z, q.x + side.x, q.y + side.y, q.z + side.z);
    if (i < N) idx.push(i*2, i*2+1, i*2+2, i*2+1, i*2+3, i*2+2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, material); m.material.side = THREE.DoubleSide;
  return m;
}

// arto affusolato con estremità arrotondate (capsula): le articolazioni combaciano senza "palline"
function limb(len, r0, r1, material, bulge=0.07){
  const pts = [];
  for (let i=0; i<=5; i++){ const a = i / 5 * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(0.0001, r0 * Math.sin(a)), r0 * Math.cos(a) * 0.6)); }
  const N = 12;
  for (let i=1; i<N; i++){ const t = i / N; pts.push(new THREE.Vector2((r0 + (r1 - r0) * t) * (1 + bulge * Math.sin(Math.PI * Math.min(1, t * 1.25))), -t * len)); }
  for (let i=0; i<=5; i++){ const a = i / 5 * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(0.0001, r1 * Math.cos(a)), -len - r1 * Math.sin(a) * 0.6)); }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), material);
  m.castShadow = true;
  return m;
}

// mano: palmo, quattro dita leggermente piegate e pollice
function makeHand(skin, side, scale=1){
  const h = new THREE.Group();
  const palm = sphere(0.021, skin, 1.05, 1.3, 0.55, 12); palm.position.y = -0.024; h.add(palm);
  for (let i=0; i<4; i++){
    const f = new THREE.Group(); f.position.set((i - 1.5) * 0.0085, -0.048, 0.002); f.rotation.x = 0.25 + i * 0.05; h.add(f);
    const len = [0.022, 0.026, 0.025, 0.019][i];
    f.add(limb(len, 0.0048, 0.0042, skin, 0));
  }
  const th = new THREE.Group(); th.position.set(side * 0.017, -0.02, 0.008); th.rotation.set(0.5, 0, side * 0.7); h.add(th);
  th.add(limb(0.02, 0.0056, 0.0048, skin, 0));
  h.scale.setScalar(scale);
  return h;
}

// Fonde le mesh rigide di un gruppo (stesso materiale) in una sola: testa, mani, piedi e busto
// hanno decine di pezzi che non si muovono tra loro. Le parti animate (`keep`) restano libere.
function mergeRigid(root, keep){
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), buckets = new Map();
  const visit = o=>{ for (const c of o.children){ if (keep.has(c)) continue; if (c.isMesh) (buckets.get(c.material) || buckets.set(c.material, []).get(c.material)).push(c); visit(c); } };
  visit(root);
  for (const [material, list] of buckets){
    if (list.length < 2) continue;
    const geos = list.map(m=>{
      const g = m.geometry.index ? m.geometry.clone() : m.geometry.clone();
      if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
      return g;
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach(g=>g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material); mesh.castShadow = true; mesh.receiveShadow = true;
    root.add(mesh);
    for (const m of list){ m.parent.remove(m); m.geometry.dispose(); }
  }
}

export class Person {
  constructor(who, id='npc'){
    const color = typeof who === 'string' ? who : who.color;
    const look = typeof who === 'object' && who.look ? who.look : npcLook(id);
    const female = look.female ?? (look.longHair || look.ponytail) ?? false;
    const H = look.h === 'tall' ? 1.2 : look.h === 'short' ? 1.0 : 1.1;
    const wide = look.build === 'wide';
    this.H = H;

    const tone = look.skin || (typeof who === 'object' && who.look ? SKIN : SKIN_TONES[(hashStr(id + ':s') * SKIN_TONES.length) | 0]);
    const shirt = cloth(color);
    const pants = cloth(0x2d3148);
    const shoe = std(0x3a2618, { roughness:0.45 });
    const sole = std(0x1c1410, { roughness:0.8 });
    const skin = skinMat(tone);
    const hairColor = look.hair || '#2b1d14';
    const hairM = hairMat(hairColor);
    const outfit = look.outfit;
    const inkSkin = look.tattoo ? skinMat(0xffffff, tattooTexture()) : skin;
    // il samurai veste un gi scuro, il mago un soprabito antracite: il colore del personaggio resta nei dettagli
    const coatCol = outfit === 'mage' ? 0x2a2638 : outfit === 'samurai' ? 0x23262e : outfit === 'healer' ? 0xf4f1ea : outfit === 'smith' ? 0x4a4038 : null;
    if (coatCol !== null) shirt.color.set(coatCol);
    const accent = cloth(color, { roughness:0.6 });

    const root = this.root = new THREE.Group();
    const body = this.body = new THREE.Group();   // ruota verso la direzione
    root.add(body);

    // --- gambe ---
    const legLen = H * 0.47, thigh = legLen * 0.52, shin = legLen * 0.48;
    const hipY = legLen + 0.02;
    this.legs = [];
    for (const s of [-1, 1]){
      const hip = new THREE.Group(); hip.position.set(s * 0.055 * (wide ? 1.2 : 1), hipY, 0);
      hip.add(limb(thigh, 0.056 * (wide?1.15:1), 0.041, pants));
      const knee = new THREE.Group(); knee.position.y = -thigh; hip.add(knee);
      knee.add(limb(shin, 0.041, 0.03, pants, 0.1));
      // scarpa: tomaia arrotondata sopra una suola piatta
      const foot = new THREE.Group(); foot.position.set(0, -shin - 0.012, 0.028); knee.add(foot);
      const upper = sphere(0.04, shoe, 0.85, 0.62, 1.7, 14); upper.position.y = 0.012; foot.add(upper);
      const so = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 14), sole); so.scale.set(0.95, 1, 1.9); so.position.set(0, -0.01, 0.004); foot.add(so);
      body.add(hip);
      this.legs.push({ hip, knee });
    }

    // --- busto (pivot sui fianchi, così oscilla col passo) ---
    const torso = this.torso = new THREE.Group(); torso.position.y = hipY - 0.03; body.add(torso);
    const tH = H * 0.33;
    const tr = new THREE.Mesh(torsoGeo(tH / 0.405, wide, female), shirt);
    tr.castShadow = true; torso.add(tr);
    // cintura
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.108 * (wide?1.22:1), 0.012, 6, 24), std(0x3a2618, { roughness:0.4 }));
    belt.rotation.x = Math.PI/2; belt.scale.set(1, 0.68, 1); belt.position.y = 0.035; torso.add(belt);
    const buckle = sphere(0.014, std(0xd4af37, { metalness:1, roughness:0.3 }), 1.4, 1, 0.5);
    buckle.position.set(0, 0.035, 0.078 * (wide?1.22:1)); torso.add(buckle);

    // --- braccia (spalle arrotondate, gomiti, mani con le dita) ---
    const shY = tH * 0.85, shX = 0.122 * (wide ? 1.2 : 1);
    const armLen = H * 0.36, upA = armLen * 0.48, loA = armLen * 0.46;
    const longSleeve = outfit === 'mage' || outfit === 'healer' || outfit === 'bard';
    const upperM = outfit === 'samurai' || look.tattoo ? inkSkin : shirt;
    const lowerM = longSleeve ? shirt : look.tattoo ? inkSkin : skin;
    this.arms = [];
    for (const s of [-1, 1]){
      const sh = new THREE.Group(); sh.position.set(s * shX, shY, 0); sh.rotation.z = s * 0.06;
      const r0 = 0.04 * (wide ? 1.15 : 1);
      const cap = sphere(r0 * 0.88, upperM === inkSkin ? skin : upperM, 0.95, 0.9, 0.92); cap.position.x = -s * 0.012; sh.add(cap);   // deltoide (il tatuaggio resta sulle braccia)
      sh.add(limb(upA, r0, 0.03, upperM, 0.12));
      const el = new THREE.Group(); el.position.y = -upA; sh.add(el);
      el.add(limb(loA, 0.03, 0.022, lowerM, 0.1));
      if (longSleeve){
        const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 6, 14), accent); cuff.rotation.x = Math.PI/2; cuff.position.y = -loA + 0.006; el.add(cuff);
      } else if (!look.tattoo && outfit !== 'samurai'){
        // maniche corte: orlo della maglia sopra il gomito
        const sl = limb(upA * 0.55, r0 * 1.12, 0.036, shirt, 0.05); sh.add(sl);
      }
      const hand = makeHand(skin, -s, wide ? 1.1 : 1); hand.position.y = -loA - 0.004; el.add(hand);
      torso.add(sh);
      this.arms.push({ sh, el, hand });
    }
    this.weaponArm = this.arms[0];   // la mano destra del personaggio

    // --- collo e testa ---
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.037, 0.075, 14), skin);
    neck.position.y = tH + 0.022; neck.castShadow = true; torso.add(neck);
    const head = this.head = new THREE.Group();
    const hr = 0.092;                        // testa ≈ H/7: proporzioni più realistiche
    head.position.y = tH + 0.052 + hr; torso.add(head);
    // cranio modellato: mandibola, zigomi, arcata sopraccigliare, mento
    const skullG = new THREE.SphereGeometry(hr, 32, 24);
    const p = skullG.attributes.position;
    for (let i=0; i<p.count; i++){
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const t = y / hr, front = Math.max(0, z / hr);
      const jaw = t < 0 ? 1 - 0.3 * t * t : 1 - 0.06 * t * t;
      x *= 0.84 * jaw; z *= 0.96 * (t < 0 ? 1 - 0.1 * t * t : 1);
      x *= 1 + 0.06 * Math.exp(-((t + 0.05) ** 2) / 0.02) * front;          // zigomi
      z += hr * 0.05 * Math.exp(-((t - 0.28) ** 2) / 0.01) * front ** 3;     // arcata sopraccigliare
      z += hr * 0.05 * Math.exp(-((t + 0.78) ** 2) / 0.02) * front ** 4;     // mento
      if (front > 0.6 && Math.abs(x) < hr * 0.3 && t > -0.2 && t < 0.2) z -= hr * 0.02 * (1 - Math.abs(x) / (hr * 0.3));   // incavo degli occhi
      y *= 1.14;
      p.setXYZ(i, x, y, z);
    }
    skullG.computeVertexNormals();
    const skull = new THREE.Mesh(skullG, skin); skull.castShadow = true; head.add(skull);

    // occhi: bulbo, iride con anello scuro, pupilla, riflesso, palpebre superiore e inferiore
    const sclera = std(0xf4efe8, { roughness:0.15 });
    const iris = std(look.eyes || '#3b2a1a', { roughness:0.25 });
    const ring = std(0x111111, { roughness:0.4 });
    const pupil = std(0x030303, { roughness:0.05 });
    const browM = hairMat(hairColor);
    const lip = std(new THREE.Color(tone).lerp(new THREE.Color(female ? 0xb8404e : 0x9a4a42), 0.55), { roughness:0.35 });
    this.lids = [];
    for (const s of [-1, 1]){
      const eg = new THREE.Group(); eg.position.set(s * 0.029, 0.012, hr * 0.84); head.add(eg);
      const ball = sphere(0.0125, sclera, 1.2, 0.78, 0.62, 16); eg.add(ball);
      const ri = sphere(0.0072, ring, 1, 1, 0.35, 14); ri.position.z = 0.0068; eg.add(ri);
      const ir = sphere(0.0064, iris, 1, 1, 0.38, 14); ir.position.z = 0.0072; eg.add(ir);
      const pu = sphere(0.0028, pupil, 1, 1, 0.4, 10); pu.position.z = 0.0086; eg.add(pu);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0013, 6, 4), new THREE.MeshBasicMaterial({ color:0xffffff }));
      glint.position.set(0.0022, 0.0026, 0.0096); eg.add(glint);
      // palpebra superiore (si chiude sbattendo le ciglia) e inferiore
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0138, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), skin);
      lid.scale.set(1.2, 0.5, 0.66); lid.position.set(0, 0.0015, 0.0005); lid.rotation.x = 0.35; eg.add(lid);
      lid.userData.open = 0.5; lid.userData.closed = 1.05;
      this.lids.push(lid);
      const lash = new THREE.Mesh(new THREE.TorusGeometry(0.0128, 0.0011, 4, 14, Math.PI), std(0x1a1210));
      lash.scale.set(1.2, 0.72, 1); lash.position.set(0, 0.0012, 0.005); eg.add(lash);
      const low = new THREE.Mesh(new THREE.SphereGeometry(0.0134, 16, 6, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), skin);
      low.scale.set(1.2, 0.8, 0.66); eg.add(low);
      // sopracciglio: due segmenti di pelo, arcuato
      const brow = new THREE.Group(); brow.position.set(s * 0.03, 0.033, hr * 0.94); brow.rotation.set(-0.2, s * 0.25, 0); head.add(brow);
      for (const [bx, by, bz] of [[-0.008, -0.001, s * 0.08], [0.009, 0.001, -s * 0.18]]){
        const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.0034 * (look.beard >= 2 ? 1.3 : 1), 0.013, 3, 6), browM);
        seg.rotation.z = Math.PI / 2 + bz; seg.position.set(bx * s, by, 0); seg.scale.set(0.8, 1, 0.6); brow.add(seg);
      }
      // orecchio: padiglione a conchiglia
      const ear = new THREE.Group(); ear.position.set(s * hr * 0.835, -0.004, -0.004); ear.rotation.y = s * 0.35; head.add(ear);
      const helix = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0035, 6, 14), skin); helix.scale.set(0.8, 1.35, 1); helix.rotation.y = Math.PI / 2; ear.add(helix);
      const lobe = sphere(0.006, skin, 0.6, 1, 0.9); lobe.position.y = -0.014; ear.add(lobe);
      const concha = sphere(0.008, skin, 0.35, 1.1, 0.9); ear.add(concha);
    }
    // naso: dorso, punta, ali e narici
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.009, 0.036, 10), skin);
    bridge.rotation.x = -0.35; bridge.position.set(0, -0.004, hr * 0.965); head.add(bridge);
    const tip = sphere(0.0092, skin, 1.1, 0.9, 1); tip.position.set(0, -0.022, hr * 1.04); head.add(tip);
    for (const s of [-1, 1]){
      const ala = sphere(0.0062, skin, 1, 0.8, 1); ala.position.set(s * 0.0085, -0.025, hr * 1.0); head.add(ala);
      const nos = sphere(0.0025, std(0x2a1510), 1.3, 0.7, 1); nos.position.set(s * 0.0045, -0.029, hr * 1.025); head.add(nos);
    }
    // bocca: labbro superiore ad arco, inferiore più pieno, angoli della bocca
    const upperLip = new THREE.Mesh(new THREE.CapsuleGeometry(0.0038, 0.017, 4, 8), lip);
    upperLip.rotation.z = Math.PI / 2; upperLip.position.set(0, -0.043, hr * 0.9); upperLip.scale.set(0.8, 1, 0.7); head.add(upperLip);
    const lowerLip = new THREE.Mesh(new THREE.CapsuleGeometry(0.0046, 0.013, 4, 8), lip);
    lowerLip.rotation.z = Math.PI / 2; lowerLip.position.set(0, -0.0505, hr * 0.885); lowerLip.scale.set(0.85, 1, 0.75); head.add(lowerLip);
    const seam = new THREE.Mesh(new THREE.CapsuleGeometry(0.0012, 0.02, 2, 6), std(0x3a1a18)); seam.rotation.z = Math.PI / 2; seam.position.set(0, -0.0468, hr * 0.915); head.add(seam);

    // capelli
    const cap = (phiLen=Math.PI*2, thetaStart=0, thetaLen=Math.PI*0.52, grow=1.06)=>{
      const g = new THREE.SphereGeometry(hr * grow, 28, 16, 0, phiLen, thetaStart, thetaLen);
      const m = new THREE.Mesh(g, hairM);
      m.scale.set(0.9, 1.15, 1.0); m.castShadow = true;
      return m;
    };
    // guscio di capelli ricavato dal cranio: dove c'è l'attaccatura si alza di `thick`, altrove resta dentro la testa.
    // line(yaw) = altezza dell'attaccatura (in raggi) attorno alla testa: yaw 0 davanti, ±π dietro
    const shell = (line, thick=0.06, puff=0.03)=>{
      const g = skullG.clone(), q = g.attributes.position;
      for (let i=0; i<q.count; i++){
        const x = q.getX(i), y = q.getY(i), z = q.getZ(i);
        const yaw = Math.atan2(x, z), h = y / (hr * 1.14), edge = h - line(Math.abs(yaw));
        const k = edge > 0 ? 1 + thick * Math.min(1, edge * 6) + puff * Math.max(0, h) : 0.97;
        q.setXYZ(i, x * k, y * k, z * k);
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, hairM); m.castShadow = true; head.add(m);
      return m;
    };
    const smooth = (a, b, t)=>{ const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
    // attaccatura tipica: alta sulla fronte, scende alle tempie, sopra le orecchie, bassa sulla nuca
    const hairline = (front=0.5, temple=0.12, nape=-0.62)=>yaw=>yaw < Math.PI / 2
      ? front + (temple - front) * smooth(0.25, 1.45, yaw)
      : temple + (nape - temple) * smooth(1.75, 2.7, yaw);

    // ciocca: ellissoide allungato con la trama dei capelli
    const lock = (x, y, z, rx, rz, len=0.05, r=0.018)=>{
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), hairM);
      m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.scale.set(1, 1, 0.55); head.add(m);
      return m;
    };
    if (look.hairStyle === 'quiff'){
      // lati rasati (ombra di capelli cortissimi) e sopra ciocche spazzolate all'insù e indietro
      const fade = std(new THREE.Color(tone).lerp(new THREE.Color(hairColor), 0.78), { map:strands(), roughness:1 });
      const sides = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.012, 28, 12, Math.PI*0.78, Math.PI*1.44, Math.PI*0.2, Math.PI*0.36), fade);
      sides.scale.set(0.9, 1.15, 1.0); head.add(sides);
      shell(hairline(0.55, 0.62, 0.55), 0.05, 0.05);    // capelli solo sopra: i lati sono rasati
      for (let i=0; i<7; i++){
        const k = i / 6;
        for (const sx of [-1, 0, 1]){
          lock(sx * 0.02 * (1 - k * 0.3), hr * (1.02 + 0.12 * Math.sin(k * Math.PI) - k * 0.1), hr * (0.62 - k * 1.2),
               -1.0 + k * 0.5 + (sx ? 0.1 : 0), sx * -0.25, 0.045 - k * 0.012, 0.017 - Math.abs(sx) * 0.003);
        }
      }
    } else if (look.hairStyle === 'tied'){
      // capelli lunghi tirati indietro, attaccatura definita, raccolti in un codino da samurai
      shell(hairline(0.52, 0.18, -0.55), 0.07, 0.04);
      // massa di capelli tirata verso la nuca, dove si raccoglie
      const mass = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.7, 24, 14), hairM);
      mass.scale.set(0.95, 0.9, 0.9); mass.position.set(0, hr * 0.35, -hr * 0.5); head.add(mass);
      const knot = sphere(0.028, hairM, 1, 1, 1.15); knot.position.set(0, hr*0.78, -hr*0.8); head.add(knot);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.005, 6, 14), accent);
      tie.position.set(0, hr*0.72, -hr*0.92); tie.rotation.x = 0.5; head.add(tie);
      const pt = limb(0.22, 0.024, 0.008, hairM, 0.15);
      pt.position.set(0, hr*0.7, -hr*0.98); pt.rotation.x = -0.25; head.add(pt);
      this.ponytail = pt;
    } else if (!look.bald){
      if (look.baldTop){
        // stempiato: solo corona laterale e nuca
        const c = cap(Math.PI*2, Math.PI*0.3, Math.PI*0.3); c.rotation.x = -0.35; head.add(c);
      } else if (look.curly){
        const c = cap(); c.rotation.x = -0.25; head.add(c);
        for (let i=0; i<30; i++){
          const a = hashStr('c'+i) * Math.PI*2, b = hashStr('d'+i) * 0.9;
          const ball = sphere(0.02, hairM);
          ball.position.set(Math.sin(a)*Math.sin(b)*hr*0.95, Math.cos(b)*hr*1.08 + 0.005, Math.cos(a)*Math.sin(b)*hr*0.95 - 0.01);
          head.add(ball);
        }
      } else {
        shell(hairline(female ? 0.42 : 0.5, female ? 0.0 : 0.1, female ? -0.8 : -0.6), female ? 0.075 : 0.06, 0.04);
        // frangia di ciocche sulla fronte
        for (let i=0; i<4; i++) lock((i - 1.5) * 0.02, hr * 0.8, hr * 0.5, -1.9 + (i % 2) * 0.15, (i - 1.5) * 0.25, 0.03, 0.014);
      }
      if (look.longHair){
        // capelli lunghi: ciocche che scendono dietro fino alle spalle
        const back = new THREE.Mesh(new THREE.CylinderGeometry(hr*0.9, hr*1.14, 0.2, 24, 4, true, Math.PI*0.32, Math.PI*1.36), hairM);
        back.position.set(0, -0.06, -0.008); back.material.side = THREE.DoubleSide; back.castShadow = true;
        head.add(back);
      }
      if (look.ponytail){
        const pt = limb(0.14, 0.022, 0.01, hairM, 0.15);
        pt.position.set(0, 0.03, -hr*0.95); pt.rotation.x = -0.35; head.add(pt);
        this.ponytail = pt;
      }
    }
    if (look.beard){
      const full = look.beard >= 2;
      const g = new THREE.SphereGeometry(hr * 1.02, 24, 12, Math.PI*0.08, Math.PI*0.84, Math.PI*(full ? 0.62 : 0.66), Math.PI*0.36);
      // barba a pelo corto: sfuma con la pelle se è appena accennata
      const bm = full ? hairMat(hairColor) : std(new THREE.Color(tone).lerp(new THREE.Color(hairColor), 0.6), { map:skinDetail(), roughness:1 });
      const bd = new THREE.Mesh(g, bm); bd.scale.set(0.9, 1.15, 1.02); head.add(bd);
      if (look.beard >= 3){
        // barba lunga che scende sotto il mento, a ciocche
        for (let i=0; i<5; i++){
          const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 4, 8), bm);
          m.position.set((i - 2) * 0.012, -hr * 1.18 - (2 - Math.abs(i - 2)) * 0.008, hr * 0.5); m.rotation.set(0.25, 0, (i - 2) * 0.12); m.scale.z = 0.6;
          head.add(m);
        }
      }
      if (full){
        for (const s of [-1, 1]){
          const mus = new THREE.Mesh(new THREE.CapsuleGeometry(0.0048, 0.016, 3, 6), bm);
          mus.position.set(s * 0.011, -0.037, hr * 0.94); mus.rotation.z = Math.PI / 2 + s * 0.35; head.add(mus);
        }
      }
    }

    const W = wide ? 1.22 : 1;
    if (outfit === 'samurai'){
      // gi incrociato: bavero bianco a V che segue il petto, obi rosso, hakama a pieghe, spallaccio
      // i due lembi scendono dal collo e si incrociano sul petto, il sinistro sopra il destro
      const collarM = cloth(0xe8e2d4);
      for (const sx of [1, -1]){
        const zf = sx > 0 ? 0 : 0.003;
        torso.add(ribbon([
          new THREE.Vector3(sx * 0.042, tH * 1.0, -0.012), new THREE.Vector3(sx * 0.042, tH * 0.94, 0.055 * W),
          new THREE.Vector3(sx * 0.026, tH * 0.72, 0.083 * W + zf), new THREE.Vector3(0, tH * 0.46, 0.088 * W + zf),
          new THREE.Vector3(-sx * 0.05, tH * 0.2, 0.08 * W + zf),
        ], 0.022, collarM));
      }
      belt.material = cloth(0xa8232a, { roughness:0.6 }); belt.scale.set(1.08, 0.72, 2.6);
      buckle.visible = false;
      const hakG = new THREE.CylinderGeometry(0.115 * W, 0.2 * W, legLen * 0.78, 48, 3, true);
      const hp = hakG.attributes.position;
      for (let i=0; i<hp.count; i++){                // pieghe verticali
        const x = hp.getX(i), z = hp.getZ(i), a = Math.atan2(z, x), k = 1 + 0.045 * Math.abs(Math.sin(a * 7));
        hp.setX(i, x * k); hp.setZ(i, z * k);
      }
      hakG.computeVertexNormals();
      const hak = new THREE.Mesh(hakG, cloth(0x1d1f28, { roughness:0.95, side:THREE.DoubleSide }));
      hak.scale.z = 0.8; hak.position.y = hipY - legLen * 0.39; body.add(hak);
      const sode = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 8, 0, Math.PI*2, 0, Math.PI*0.45), std(0x5a2020, { roughness:0.5, metalness:0.3 }));
      sode.scale.set(1, 0.8, 1.1); sode.position.set(0, 0.02, 0); this.arms[0].sh.add(sode);
      for (let k=0; k<3; k++){ const lace = new THREE.Mesh(new THREE.TorusGeometry(0.066 - k * 0.004, 0.0025, 4, 20, Math.PI), std(0xd4af37, { metalness:0.8, roughness:0.4 })); lace.rotation.x = -Math.PI / 2; lace.position.y = 0.012 - k * 0.012; lace.scale.set(1, 1.1, 1); this.arms[0].sh.add(lace); }
      // katana: fodero sul fianco sinistro, lama nella mano destra quando combatte
      const lacquer = std(0x111111, { roughness:0.25, metalness:0.2 });
      const saya = new THREE.Group();
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.62, 10), lacquer); sc.position.y = -0.31; saya.add(sc);
      const tsuka = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.16, 10), std(0xd8cfc0)); tsuka.position.y = 0.08; saya.add(tsuka);
      for (let k=0; k<5; k++){ const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.0135, 0.003, 4, 10), std(0x1a1a22)); wrap.rotation.x = Math.PI / 2; wrap.position.y = 0.02 + k * 0.028; saya.add(wrap); }
      const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 14), std(0xb08d3c, { metalness:1, roughness:0.3 })); saya.add(tsuba);
      saya.position.set(0.13 * W, 0.05, 0.06); saya.rotation.set(1.05, 0, 0.2); torso.add(saya);
      this.sheath = tsuka;
      const sword = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.62, 0.025), std(0xe8eef5, { metalness:1, roughness:0.15, emissive:0x223344, emissiveIntensity:0.3 }));
      blade.position.y = -0.4; sword.add(blade);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.16, 10), std(0xd8cfc0)); sword.add(grip);
      const guard = tsuba.clone(); guard.position.y = -0.085; sword.add(guard);
      sword.position.copy(this.weaponArm.hand.position); sword.position.y -= 0.035; sword.rotation.x = Math.PI/2;
      this.weaponArm.el.add(sword);
      this.sword = sword; sword.visible = false;
    } else if (outfit === 'mage'){
      // soprabito lungo aperto davanti, con colletto alto e orlo nel colore di Ste
      const coatG = new THREE.CylinderGeometry(0.11 * W, 0.17 * W, legLen * 0.72, 40, 3, true, Math.PI*0.14, Math.PI*1.72);
      const cp = coatG.attributes.position;
      for (let i=0; i<cp.count; i++){                // pieghe morbide del tessuto verso l'orlo
        const x = cp.getX(i), z = cp.getZ(i), y = cp.getY(i), a = Math.atan2(z, x), low = 0.5 - y / (legLen * 0.72);
        const k = 1 + 0.03 * low * Math.sin(a * 6);
        cp.setX(i, x * k); cp.setZ(i, z * k);
      }
      coatG.computeVertexNormals();
      const coatM = new THREE.Mesh(coatG, cloth(0x2a2638, { roughness:0.75, side:THREE.DoubleSide }));
      coatM.scale.z = 0.75; coatM.position.y = hipY - legLen * 0.33; body.add(coatM);
      this.coat = coatM;
      const hem = new THREE.Mesh(new THREE.TorusGeometry(0.17 * W, 0.008, 4, 36, Math.PI*1.72), accent);
      hem.rotation.set(Math.PI/2, 0, Math.PI*0.64); hem.scale.set(1, 0.75, 1); hem.position.y = hipY - legLen * 0.69; body.add(hem);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.066, 0.075, 20, 1, true, Math.PI*0.2, Math.PI*1.6), cloth(0x2a2638, { side:THREE.DoubleSide }));
      collar.position.y = tH + 0.03; torso.add(collar);
      for (const sx of [-1, 1]){                     // revers del soprabito
        const rev = new THREE.Mesh(new THREE.BoxGeometry(0.028, tH * 0.42, 0.006), cloth(0x35304a));
        rev.position.set(sx * 0.032, tH * 0.72, 0.08 * W); rev.rotation.set(-0.12, 0, sx * 0.28); torso.add(rev);
      }
      for (let i=0; i<3; i++){ const b = sphere(0.008, std(0xd4af37, { metalness:1, roughness:0.3 })); b.position.set(0.03, tH*(0.3 + i*0.12), 0.082 * W); torso.add(b); }
      // fedora moderno portato indietro, con fascia viola: poggia sulla testa e lascia vedere il ciuffo
      const hat = new THREE.Group();
      const felt = cloth(0x1c1a24, { roughness:0.8 });
      const brimG = new THREE.CylinderGeometry(0.15, 0.15, 0.007, 36);
      const bp = brimG.attributes.position;
      for (let i=0; i<bp.count; i++){ const x = bp.getX(i), z = bp.getZ(i); const r = Math.hypot(x, z); if (r > 0.1) bp.setY(i, bp.getY(i) + (r - 0.1) * 0.35 * (z < 0 ? 1 : -0.4)); }   // tesa rialzata dietro, abbassata davanti
      brimG.computeVertexNormals();
      const brim = new THREE.Mesh(brimG, felt);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.086, 0.08, 28), felt); crown.position.y = 0.042;
      const dent = new THREE.Mesh(new THREE.SphereGeometry(0.058, 18, 6, 0, Math.PI*2, 0, Math.PI/2), felt); dent.scale.y = 0.35; dent.position.y = 0.08;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.087, 0.087, 0.016, 28, 1, true), accent); band.position.y = 0.011;
      hat.add(brim, crown, dent, band);
      hat.position.set(0, hr * 0.98, -0.045); hat.rotation.x = -0.32;
      head.add(hat);
      // bastone moderno: asta in metallo scuro con cristallo luminoso
      const staff = new THREE.Group();
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 1.05, 10), std(0x2c2f38, { metalness:0.8, roughness:0.3 }));
      staff.add(rod);
      for (const y of [0.42, 0.47]){ const r = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 6, 16), std(0xd4af37, { metalness:1, roughness:0.3 })); r.rotation.x = Math.PI/2; r.position.y = y; staff.add(r); }
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), new THREE.MeshStandardMaterial({ color:0xb89cff, emissive:0x7e57ff, emissiveIntensity:1.6, roughness:0.1 }));
      gem.scale.y = 1.6; gem.position.y = 0.58; staff.add(gem);
      staff.position.copy(this.weaponArm.hand.position); staff.position.y -= 0.04; staff.position.z = 0.02;
      this.weaponArm.el.add(staff);
      this.staff = staff; this.gem = gem;
    } else if (outfit === 'fairy'){
      // fata: gonna a petali, due paia di ali trasparenti che battono, coroncina di fiori, bacchetta con la stella
      const skirtG = new THREE.CylinderGeometry(0.1 * W, 0.19 * W, legLen * 0.42, 40, 2, true);
      const sp = skirtG.attributes.position;
      for (let i=0; i<sp.count; i++){ const x = sp.getX(i), z = sp.getZ(i), y = sp.getY(i), a = Math.atan2(z, x); if (y < 0){ const k = 1 + 0.12 * Math.max(0, Math.cos(a * 8)); sp.setX(i, x * k); sp.setZ(i, z * k); sp.setY(i, y - 0.02 * Math.max(0, Math.cos(a * 8))); } }
      skirtG.computeVertexNormals();
      const skirt = new THREE.Mesh(skirtG, cloth(color, { roughness:0.7, side:THREE.DoubleSide }));
      skirt.scale.z = 0.8; skirt.position.y = hipY - legLen * 0.2; body.add(skirt);
      const wingM = new THREE.MeshStandardMaterial({ color:new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.55), emissive:color, emissiveIntensity:0.45, transparent:true, opacity:0.72, side:THREE.DoubleSide, roughness:0.2, depthWrite:false });
      const veinM = new THREE.MeshBasicMaterial({ color:new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.2), transparent:true, opacity:0.8 });
      this.wings = [];
      for (const s of [-1, 1]){
        const pivot = new THREE.Group(); pivot.position.set(s * 0.03, tH * 0.72, -0.07 * W); torso.add(pivot);
        for (const [len, wid, tilt, y] of [[0.42, 0.24, 0.55, 0.05], [0.3, 0.16, -0.35, -0.1]]){
          const w = new THREE.Mesh(new THREE.CircleGeometry(1, 24), wingM);
          w.scale.set(len * 0.5, wid * 0.5, 1); w.position.set(s * len * 0.46, y + Math.sin(tilt) * len * 0.3, 0); w.rotation.z = s * tilt;
          pivot.add(w);
          const vein = new THREE.Mesh(new THREE.BoxGeometry(len * 0.85, 0.004, 0.002), veinM);
          vein.position.copy(w.position); vein.rotation.z = w.rotation.z; pivot.add(vein);
        }
        pivot.rotation.y = s * 0.3;
        this.wings.push({ pivot, s });
      }
      const crown = new THREE.Group();
      for (let i=0; i<9; i++){
        const a = (i / 9) * Math.PI * 2;
        const f = sphere(0.016, std(i % 3 ? 0xffd6ec : 0xfff3a0, { emissive:i % 3 ? 0x552244 : 0x554400, emissiveIntensity:0.4 }), 1, 0.7, 1);
        f.position.set(Math.cos(a) * hr * 0.92, 0, Math.sin(a) * hr * 0.92); crown.add(f);
      }
      crown.position.y = hr * 0.55; crown.rotation.x = -0.18; head.add(crown);
      const wand = new THREE.Group();
      wand.add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.3, 8), std(0xf3e6c8, { roughness:0.4 })));
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), new THREE.MeshStandardMaterial({ color:0xfff4b0, emissive:color, emissiveIntensity:1.4, roughness:0.2 }));
      star.scale.set(1, 1, 0.4); star.position.y = 0.17; wand.add(star);
      wand.position.copy(this.weaponArm.hand.position); wand.position.y -= 0.03; wand.position.z = 0.02;
      this.weaponArm.el.add(wand);
      this.staff = wand; this.gem = star;
    } else if (outfit === 'smith'){
      // fabbro: grembiule di cuoio con tasche, guanti spessi, martello in mano
      const leather = std(0x6b4128, { roughness:0.6 });
      const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.105 * W, 0.15 * W, tH * 0.9 + legLen * 0.55, 24, 1, true, -Math.PI * 0.42, Math.PI * 0.84), std(0x6b4128, { roughness:0.6, side:THREE.DoubleSide }));
      apron.scale.z = 0.95; apron.position.y = hipY - legLen * 0.27 + tH * 0.45 - 0.03; body.add(apron);
      for (const sx of [-1, 1]){ const strap = new THREE.Mesh(new THREE.BoxGeometry(0.014, tH * 0.5, 0.006), leather); strap.position.set(sx * 0.045, tH * 0.78, 0.08 * W); strap.rotation.z = sx * 0.12; torso.add(strap); }
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.01), std(0x543220, { roughness:0.7 })); pocket.position.set(0, 0.0, 0.14 * W); torso.add(pocket);
      for (const a of this.arms){ const glove = sphere(0.03, std(0x3a2618, { roughness:0.8 }), 1, 1.2, 1); glove.position.copy(a.hand.position); glove.position.y += 0.02; a.el.add(glove); }
      const hammer = new THREE.Group();
      // il martello pende dalla mano: testa in basso, ben visibile accanto alla gamba
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.34, 8), std(0x8a5a32, { roughness:0.6 })); handle.position.y = -0.12; hammer.add(handle);
      const headM = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.065, 0.065), std(0x60656e, { metalness:0.9, roughness:0.35 })); headM.position.y = -0.29; hammer.add(headM);
      hammer.position.copy(this.weaponArm.hand.position); hammer.position.y -= 0.03; hammer.position.z = 0.02;
      this.weaponArm.el.add(hammer);
      this.staff = hammer;
    } else if (outfit === 'bard'){
      // bardo: farsetto con mantellina, berretto con la piuma, liuto a tracolla sulla schiena
      const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * W, 0.17 * W, tH * 0.55, 24, 1, true, Math.PI * 0.6, Math.PI * 0.8), cloth(new THREE.Color(color).multiplyScalar(0.55), { side:THREE.DoubleSide }));
      cape.position.y = tH * 0.72; torso.add(cape);
      const beret = new THREE.Group();
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 24), cloth(0x7a1f2b)); cap.scale.set(1, 1, 0.9); beret.add(cap);
      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.2, 8), std(0xf5f0e0, { roughness:0.5 }));
      feather.position.set(0.06, 0.07, -0.02); feather.rotation.z = -0.9; beret.add(feather);
      beret.position.set(0.012, hr * 0.92, -0.01); beret.rotation.z = -0.22; head.add(beret);
      const lute = new THREE.Group();
      const wood = std(0xb07038, { roughness:0.45 });
      const bowl = sphere(0.1, wood, 0.9, 1.2, 0.45); lute.add(bowl);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), std(0x2a1a10)); hole.position.set(0, 0.02, 0.046); lute.add(hole);
      const neckL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.26, 0.02), std(0x5a3418)); neckL.position.y = 0.23; lute.add(neckL);
      const pegbox = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.06, 0.02), std(0x5a3418)); pegbox.position.set(0, 0.38, -0.02); pegbox.rotation.x = -0.6; lute.add(pegbox);
      lute.position.set(0.02, tH * 0.55, -0.12 * W); lute.rotation.set(0, Math.PI, -0.6); torso.add(lute);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.13 * W, 0.006, 4, 24), std(0x3a2618)); strap.position.y = tH * 0.6; strap.rotation.set(Math.PI / 2, 0.6, 0); strap.scale.set(1, 0.7, 1); torso.add(strap);
    } else if (outfit === 'healer'){
      // curatrice: veste bianca lunga con bordo verde, fascia in vita, borsa delle bende, bastone di frassino
      const robeG = new THREE.CylinderGeometry(0.11 * W, 0.19 * W, legLen * 0.86, 40, 3, true);
      const rp = robeG.attributes.position;
      for (let i=0; i<rp.count; i++){ const x = rp.getX(i), z = rp.getZ(i), y = rp.getY(i), a = Math.atan2(z, x), low = 0.5 - y / (legLen * 0.86); const k = 1 + 0.035 * low * Math.sin(a * 7); rp.setX(i, x * k); rp.setZ(i, z * k); }
      robeG.computeVertexNormals();
      const robe = new THREE.Mesh(robeG, cloth(0xf4f1ea, { roughness:0.85, side:THREE.DoubleSide }));
      robe.scale.z = 0.8; robe.position.y = hipY - legLen * 0.4; body.add(robe);
      const hem = new THREE.Mesh(new THREE.TorusGeometry(0.19 * W, 0.009, 4, 40), accent); hem.rotation.x = Math.PI / 2; hem.scale.set(1, 0.8, 1); hem.position.y = hipY - legLen * 0.83; body.add(hem);
      belt.material = accent;
      const emblem = new THREE.Group();
      const red = std(0xc0392b, { roughness:0.5 });
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.05, 0.004), red), h2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.004), red);
      emblem.add(v, h2); emblem.position.set(0, tH * 0.7, 0.088 * W); torso.add(emblem);
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.04), std(0xa87a4a, { roughness:0.7 })); bag.position.set(-0.13 * W, 0.0, 0.03); torso.add(bag);
      const bagStrap = new THREE.Mesh(new THREE.TorusGeometry(0.14 * W, 0.005, 4, 24), std(0x6b4128)); bagStrap.position.y = tH * 0.45; bagStrap.rotation.set(Math.PI / 2, -0.7, 0); bagStrap.scale.set(1, 0.7, 1); torso.add(bagStrap);
      const staff = new THREE.Group();
      staff.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.013, 1.0, 8), std(0xc9a06a, { roughness:0.6 })));
      const top = sphere(0.035, new THREE.MeshStandardMaterial({ color:0xc8ffd8, emissive:0x2ecc71, emissiveIntensity:1.1, roughness:0.2 })); top.position.y = 0.53; staff.add(top);
      for (const s of [-1, 1]){ const leaf = sphere(0.02, std(0x3c9a4a), 1.6, 0.4, 1); leaf.position.set(s * 0.03, 0.49, 0); leaf.rotation.z = s * 0.6; staff.add(leaf); }
      staff.position.copy(this.weaponArm.hand.position); staff.position.y -= 0.04; staff.position.z = 0.02;
      this.weaponArm.el.add(staff);
      this.staff = staff; this.gem = top;
    } else if (outfit === 'botanist'){
      // botanico: cappello di paglia a tesa larga, grembiule verde, borsa con germogli, falcetto alla cintura
      const straw = std(0xe2c27a, { roughness:0.85 });
      const hat = new THREE.Group();
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.008, 36), straw);
      const crownH = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.07, 28), straw); crownH.position.y = 0.038;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.091, 0.091, 0.016, 28, 1, true), cloth(0x2f7a3a)); band.position.y = 0.012;
      hat.add(brim, crownH, band); hat.position.set(0, hr * 0.9, -0.02); hat.rotation.x = -0.1; head.add(hat);
      const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.108 * W, 0.15 * W, tH * 0.55 + legLen * 0.45, 24, 1, true, -Math.PI * 0.4, Math.PI * 0.8), cloth(0x3f8a48, { side:THREE.DoubleSide }));
      apron.position.y = hipY - legLen * 0.22 + tH * 0.2; body.add(apron);
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.05), std(0x8a6038, { roughness:0.7 })); bag.position.set(-0.13 * W, 0.0, 0.02); torso.add(bag);
      for (let i=0; i<3; i++){ const sprout = sphere(0.018, std(0x5fbf4a), 0.6, 1.6, 0.6); sprout.position.set(-0.13 * W + (i - 1) * 0.022, 0.06, 0.02); sprout.rotation.z = (i - 1) * 0.4; torso.add(sprout); }
      const sickle = new THREE.Group();
      sickle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.1, 8), std(0x8a5a32)));
      const blade = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 4, 16, Math.PI * 1.1), std(0xd0d6de, { metalness:0.9, roughness:0.3 })); blade.position.set(0.04, 0.07, 0); sickle.add(blade);
      sickle.position.copy(this.weaponArm.hand.position); sickle.position.y -= 0.03; sickle.position.z = 0.02;
      this.weaponArm.el.add(sickle);
    } else {
      // NPC: colletto della maglia
      const col = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 18), shirt); col.rotation.x = Math.PI / 2; col.scale.set(1, 0.8, 1); col.position.y = tH + 0.0; torso.add(col);
    }

    // meno pezzi da disegnare: ogni parte rigida diventa poche mesh (una per materiale)
    const keep = new Set([...this.lids, this.ponytail, this.gem, this.sheath, ...(this.wings || []).map(w=>w.pivot)].filter(Boolean));
    mergeRigid(this.head, keep);
    for (const l of this.legs){ mergeRigid(l.knee, keep); mergeRigid(l.hip, new Set([l.knee])); }
    for (const a of this.arms){
      mergeRigid(a.hand, keep);
      mergeRigid(a.el, new Set([a.hand, this.sword, this.staff].filter(Boolean)));
      mergeRigid(a.sh, new Set([a.el]));
    }
    mergeRigid(this.torso, new Set([...keep, this.head, ...this.arms.map(a=>a.sh)]));
    if (this.staff) mergeRigid(this.staff, keep);
    if (this.sword) mergeRigid(this.sword, keep);

    root.traverse(o=>{ if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
    root.scale.setScalar(1.25);   // leggibile dalla camera alta

    // ombra di contatto
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), new THREE.MeshBasicMaterial({ color:0, transparent:true, opacity:0.3, depthWrite:false }));
    sh.rotation.x = -Math.PI/2; sh.position.y = 0.015; sh.castShadow = false; sh.receiveShadow = false;
    root.add(sh); this.shadow = sh;

    this.angle = 0; this.phase = 0; this.t = hashStr(id) * 10; this.blink = 2 + hashStr(id+'b') * 3;
  }

  // dir: 'up'|'down'|'left'|'right' oppure angolo; speed in caselle/s
  update(dt, facing, speed, walkPhase){
    this.t += dt;
    const target = typeof facing === 'number' ? facing
      : { down:0, right:Math.PI/2, up:Math.PI, left:-Math.PI/2 }[facing] ?? 0;
    let d = target - this.angle;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.angle += d * Math.min(1, dt * 12);
    this.body.rotation.y = this.angle;

    const amt = Math.min(1, speed / 3);           // ampiezza del passo
    const ph = walkPhase * Math.PI * 2;
    const sw = Math.sin(ph);
    this.legs.forEach((l, i)=>{
      const s = i ? -1 : 1;
      const a = sw * s;
      l.hip.rotation.x = -a * 0.55 * amt; l.hip.rotation.z = 0;
      l.knee.rotation.x = Math.max(0, Math.sin(ph + (i ? Math.PI : 0) + 1.2)) * 0.9 * amt;
    });
    this.arms.forEach((a, i)=>{
      const s = i ? 1 : -1;
      a.sh.rotation.x = -sw * s * 0.5 * amt;
      a.el.rotation.x = -0.25 - amt * 0.35;
    });
    // molleggio, torsione e respiro
    const breath = Math.sin(this.t * 2.2) * 0.008 * (1 - amt);
    this.torso.position.y = this.legs[0].hip.position.y - 0.03 - Math.abs(Math.cos(ph)) * 0.015 * amt;
    this.torso.rotation.y = sw * 0.12 * amt;
    this.torso.rotation.x = amt * 0.08;             // leggero sbilanciamento in avanti
    this.torso.scale.set(1 + breath, 1 + breath * 0.5, 1 + breath);
    this.head.rotation.y = -sw * 0.1 * amt;
    if (this.ponytail) this.ponytail.rotation.set(-0.35 - amt * 0.4, 0, Math.sin(ph) * 0.3 * amt);
    if (this.staff){
      this.staff.rotation.x = -(this.weaponArm.sh.rotation.x + this.weaponArm.el.rotation.x);
      if (this.gem) this.gem.rotation.y += dt * 2;
    }
    // ali delle fate: battito rapido, più ampio quando si cammina
    if (this.wings) for (const w of this.wings) w.pivot.rotation.y = w.s * (0.3 + Math.sin(this.t * 14) * (0.22 + amt * 0.18));
    // battito di ciglia
    this.blink -= dt;
    const closed = this.blink < 0.12;
    for (const l of this.lids) l.scale.y = closed ? l.userData.closed : l.userData.open;
    if (this.blink < 0) this.blink = 2 + Math.random() * 3;
  }

  // in battaglia la katana passa dal fodero alla mano
  setDrawn(on){
    if (this.sword){ this.sword.visible = on; this.sheath.visible = !on; }
  }

  place(x, z, lean=0, hop=0){
    this.root.position.set(x, hop, z);
    this.root.rotation.z = lean;
    this.shadow.position.y = 0.015 - hop / 1.25;
    this.shadow.material.opacity = 0.3 / (1 + hop * 3);
  }

  dispose(){
    this.root.traverse(o=>{ o.geometry?.dispose(); o.material?.dispose?.(); });
  }
}

// monopattino elettrico: pedana, piantone, manubrio, ruotine piene
export function makeScooter(){
  const g = new THREE.Group();
  const deck = std(0x2b2e36, { metalness:0.5, roughness:0.4 }), acc = std(0x33c4a8, { metalness:0.4, roughness:0.3 }), tire = std(0x111111);
  const wheels = [];
  for (const z of [-0.27, 0.27]){ const w = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.025, 8, 18), tire); w.rotation.y = Math.PI/2; w.position.set(0, 0.1, z); g.add(w); wheels.push(w); }
  const d = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.52), deck); d.position.y = 0.12; g.add(d);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.75, 8), acc); stem.position.set(0, 0.48, 0.28); stem.rotation.x = -0.12; g.add(stem);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8), deck); bar.rotation.z = Math.PI/2; bar.position.set(0, 0.85, 0.24); g.add(bar);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color:0xffffff })); led.position.set(0, 0.7, 0.31); g.add(led);
  g.traverse(o=>{ if (o.isMesh) o.castShadow = true; });
  g.userData.wheels = wheels; g.userData.wheelR = 0.075;
  return g;
}

// Vespa: scocca tondeggiante celeste, sella, scudo anteriore, faro
export function makeVespa(){
  const g = new THREE.Group();
  const body = std(0x8fd3e8, { metalness:0.3, roughness:0.25 }), dark = std(0x2a2a2a), chrome = std(0xdddddd, { metalness:1, roughness:0.2 });
  const wheels = [];
  for (const z of [-0.32, 0.34]){ const w = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.04, 8, 18), dark); w.rotation.y = Math.PI/2; w.position.set(0, 0.15, z); g.add(w); wheels.push(w); }
  const rear = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), body); rear.scale.set(0.9, 0.75, 1.3); rear.position.set(0, 0.32, -0.22); g.add(rear);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.36), dark); floor.position.set(0, 0.2, 0.08); g.add(floor);
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.5, 16, 1, false, -Math.PI/2, Math.PI), body);
  shield.position.set(0, 0.45, 0.3); g.add(shield);
  const seat = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 10), std(0x4a2a1a)); seat.rotation.x = Math.PI/2; seat.position.set(0, 0.5, -0.18); g.add(seat);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.42, 8), chrome); bar.rotation.z = Math.PI/2; bar.position.set(0, 0.78, 0.3); g.add(bar);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshStandardMaterial({ color:0xfff6d0, emissive:0xfff0b0, emissiveIntensity:1.5 }));
  lamp.position.set(0, 0.8, 0.36); g.add(lamp);
  g.traverse(o=>{ if (o.isMesh) o.castShadow = true; });
  g.userData.wheels = wheels; g.userData.wheelR = 0.11;
  return g;
}

// bici da città: telaio rosso, ruote a raggi
export function makeBike(){
  const g = new THREE.Group();
  const frame = std(0xc0392b, { metalness:0.5, roughness:0.35 }), tire = std(0x1a1a1a, { roughness:0.8 }), steel = std(0xb0b0b0, { metalness:1, roughness:0.3 });
  const wheels = [];
  for (const z of [-0.26, 0.26]){
    const w = new THREE.Group();
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 8, 24), tire); t.rotation.y = Math.PI/2; w.add(t);
    for (let k=0; k<6; k++){
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.33, 4), steel);
      sp.rotation.x = k * Math.PI / 6; w.add(sp);
    }
    w.position.set(0, 0.19, z); g.add(w); wheels.push(w);
  }
  const bar = (a, b)=>{
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, va.distanceTo(vb), 6), frame);
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), vb.clone().sub(va).normalize());
    g.add(m);
  };
  bar([0,0.19,-0.26], [0,0.42,-0.05]); bar([0,0.19,-0.26], [0,0.2,0.02]); bar([0,0.2,0.02], [0,0.42,-0.05]);
  bar([0,0.42,-0.05], [0,0.44,0.2]); bar([0,0.2,0.02], [0,0.44,0.2]); bar([0,0.19,0.26], [0,0.5,0.22]);
  const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), steel); hb.rotation.z = Math.PI/2; hb.position.set(0, 0.52, 0.22); g.add(hb);
  const seat = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 6), std(0x2a1a10)); seat.scale.set(0.8, 0.35, 1.4); seat.position.set(0, 0.46, -0.06); g.add(seat);
  g.traverse(o=>{ if (o.isMesh) o.castShadow = true; });
  g.userData.wheels = wheels;
  return g;
}

// cavalcature: cavallo baio e asinello grigio. gait(fase, velocità) muove le zampe
// (passo lento da fermi, galoppo in corsa) e fa ondeggiare collo e coda.
function makeMount(o){
  const g = new THREE.Group();
  const coat = std(o.coat, { roughness:0.85 }), dark = std(o.mane, { roughness:0.9 }), hoofM = std(0x2a2420);
  const k = o.scale;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.14 * k, 0.46 * k, 6, 14), coat);
  body.rotation.x = Math.PI / 2; body.position.set(0, 0.66 * k, 0); g.add(body);
  // sella e coperta
  const saddle = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * k, 0.15 * k, 0.2 * k, 14, 1, false, -Math.PI / 2, Math.PI), std(o.saddle));
  saddle.rotation.z = Math.PI / 2; saddle.rotation.y = Math.PI / 2; saddle.position.set(0, 0.72 * k, -0.02 * k); g.add(saddle);
  const neck = new THREE.Group(); neck.position.set(0, 0.72 * k, 0.26 * k); g.add(neck);
  const nk = new THREE.Mesh(new THREE.CapsuleGeometry(0.075 * k, 0.26 * k, 4, 10), coat);
  nk.rotation.x = 0.7; nk.position.set(0, 0.12 * k, 0.08 * k); neck.add(nk);
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.07 * k, 0.2 * k, 4, 10), coat);
  head.rotation.x = 1.9; head.position.set(0, 0.28 * k, 0.24 * k); neck.add(head);
  for (const s of [-1, 1]){
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.025 * k, (o.ears || 0.08) * k, 6), coat);
    ear.position.set(s * 0.04 * k, 0.36 * k + (o.ears || 0.08) * k * 0.4, 0.17 * k); ear.rotation.z = -s * 0.2; neck.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014 * k, 6, 6), std(0x111111));
    eye.position.set(s * 0.06 * k, 0.31 * k, 0.26 * k); neck.add(eye);
  }
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.03 * k, 0.07 * k, 0.3 * k), dark);
  mane.rotation.x = -0.85; mane.position.set(0, 0.2 * k, 0.03 * k); neck.add(mane);
  const tail = new THREE.Group(); tail.position.set(0, 0.7 * k, -0.37 * k); g.add(tail);
  const tl = new THREE.Mesh(new THREE.ConeGeometry(0.045 * k, 0.34 * k, 6), dark);
  tl.position.set(0, -0.15 * k, -0.04 * k); tl.rotation.x = Math.PI - 0.35; tail.add(tl);
  // zampe: anca, ginocchio, zoccolo
  const legs = [];
  for (const [x, z, ph] of [[-1, 1, 0], [1, 1, Math.PI], [-1, -1, Math.PI * 0.5], [1, -1, Math.PI * 1.5]]){
    const hip = new THREE.Group(); hip.position.set(x * 0.08 * k, 0.6 * k, z * 0.24 * k); g.add(hip);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.04 * k, 0.2 * k, 4, 8), coat); up.position.y = -0.13 * k; hip.add(up);
    const knee = new THREE.Group(); knee.position.y = -0.27 * k; hip.add(knee);
    const lo = new THREE.Mesh(new THREE.CapsuleGeometry(0.028 * k, 0.2 * k, 4, 8), coat); lo.position.y = -0.12 * k; knee.add(lo);
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.032 * k, 0.038 * k, 0.05 * k, 8), hoofM); hoof.position.y = -0.26 * k; knee.add(hoof);
    legs.push({ hip, knee, ph, front:z > 0 });
  }
  g.traverse(m=>{ if (m.isMesh) m.castShadow = true; });
  g.userData.wheels = [];
  g.userData.gait = (walk, speed)=>{
    const amt = Math.min(1, speed / 3), t = walk * Math.PI * (speed > 6 ? 2.4 : 3);
    for (const l of legs){
      const a = Math.sin(t + l.ph);
      l.hip.rotation.x = a * 0.55 * amt;
      l.knee.rotation.x = (l.front ? -1 : 1) * Math.max(0, Math.sin(t + l.ph + 1.2)) * 0.8 * amt;
    }
    body.position.y = 0.66 * k + Math.abs(Math.sin(t)) * 0.03 * amt;
    neck.rotation.x = Math.sin(t) * 0.12 * amt + (speed < 0.2 ? 0.35 + Math.sin(performance.now() / 900) * 0.1 : 0);   // fermo: bruca
    tail.rotation.z = Math.sin(performance.now() / 400) * 0.25;
  };
  return g;
}
export const makeHorse = ()=>makeMount({ coat:0x7a4a2a, mane:0x1e140e, saddle:0x3a2416, scale:1.12 });
export const makeDonkey = ()=>makeMount({ coat:0x8f8a84, mane:0x3b3632, saddle:0x6b3a2a, scale:0.88, ears:0.16 });

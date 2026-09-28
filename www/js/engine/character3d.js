// Personaggi 3D procedurali: corpo modellato con superfici di rotazione
// (niente cubi), proporzioni realistiche (~6,5 teste), viso con occhi,
// sopracciglia, naso, bocca e orecchie, capelli/barba dal `look` del
// personaggio, camminata con ginocchia e gomiti che si piegano.

import * as THREE from 'three';

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

// arto affusolato: capsula scalata con pivot in cima
function limb(len, r0, r1, material){
  const pts = [];
  const N = 12;
  for (let i=0; i<=N; i++){
    const t = i/N;
    // estremi arrotondati come una capsula, con muscolo leggermente pronunciato
    const r = (r0 + (r1 - r0) * t) * (0.8 + 0.2 * Math.pow(Math.sin(Math.PI * t), 0.5)) * (1 + 0.08 * Math.sin(Math.PI * t * 1.4));
    pts.push(new THREE.Vector2(i === 0 || i === N ? 0.0001 : r, -t * len));
  }
  const g = new THREE.LatheGeometry(pts, 12);
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  return m;
}

function sphere(r, material, sx=1, sy=1, sz=1, seg=16){
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg*0.75)), material);
  m.scale.set(sx, sy, sz); m.castShadow = true;
  return m;
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

export class Person {
  constructor(who, id='npc'){
    const color = typeof who === 'string' ? who : who.color;
    const look = typeof who === 'object' && who.look ? who.look : npcLook(id);
    const female = look.female ?? (look.longHair || look.ponytail) ?? false;
    const H = look.h === 'tall' ? 1.2 : look.h === 'short' ? 1.0 : 1.1;
    const wide = look.build === 'wide';
    this.H = H;

    const shirt = std(color, { roughness:0.85 });
    const shirtDark = std(new THREE.Color(color).multiplyScalar(0.7), { roughness:0.85 });
    const pants = std(0x2d3148, { roughness:0.9 });
    const shoe = std(0x3a2618, { roughness:0.5 });
    const skin = new THREE.MeshPhysicalMaterial({ color:SKIN, roughness:0.55, sheen:0.4, sheenColor:new THREE.Color(0xffb090) });
    const hairM = std(look.hair || '#2b1d14', { roughness:0.6 });

    const root = this.root = new THREE.Group();
    const body = this.body = new THREE.Group();   // ruota verso la direzione
    root.add(body);

    // --- gambe ---
    const legLen = H * 0.47, thigh = legLen * 0.52, shin = legLen * 0.48;
    const hipY = legLen + 0.02;
    this.legs = [];
    for (const s of [-1, 1]){
      const hip = new THREE.Group(); hip.position.set(s * 0.055 * (wide ? 1.2 : 1), hipY, 0);
      const up = limb(thigh, 0.055 * (wide?1.15:1), 0.042, pants); hip.add(up);
      const knee = new THREE.Group(); knee.position.y = -thigh; hip.add(knee);
      const kj = sphere(0.036, pants); knee.add(kj);                       // rotula: niente buchi al ginocchio
      const lo = limb(shin, 0.043, 0.032, pants); knee.add(lo);
      const foot = sphere(0.045, shoe, 0.85, 0.55, 1.7); foot.position.set(0, -shin + 0.005, 0.03); knee.add(foot);
      body.add(hip);
      this.legs.push({ hip, knee });
    }

    // --- busto (pivot sui fianchi, così oscilla col passo) ---
    const torso = this.torso = new THREE.Group(); torso.position.y = hipY - 0.03; body.add(torso);
    const tH = H * 0.33;
    const tr = new THREE.Mesh(torsoGeo(tH / 0.405, wide, female), shirt);
    tr.castShadow = true; torso.add(tr);
    // cintura
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.108 * (wide?1.22:1), 0.012, 6, 20), std(0x3a2618, { roughness:0.4 }));
    belt.rotation.x = Math.PI/2; belt.scale.set(1, 0.68, 1); belt.position.y = 0.035; torso.add(belt);
    const buckle = sphere(0.014, std(0xd4af37, { metalness:1, roughness:0.3 }), 1.4, 1, 0.5);
    buckle.position.set(0, 0.035, 0.078 * (wide?1.22:1)); torso.add(buckle);

    // --- braccia (spalle arrotondate, gomiti) ---
    const shY = tH * 0.85, shX = 0.122 * (wide ? 1.2 : 1);
    const armLen = H * 0.36, upA = armLen * 0.48, loA = armLen * 0.5;
    const sleeve = look.tattoo ? skin : shirt;
    this.arms = [];
    for (const s of [-1, 1]){
      const sh = new THREE.Group(); sh.position.set(s * shX, shY, 0); sh.rotation.z = s * 0.05;
      const cap = sphere(0.04 * (wide?1.15:1), shirt, 1, 0.9, 0.9); sh.add(cap);                   // deltoide
      const up = limb(upA, 0.04 * (wide?1.15:1), 0.032, sleeve); sh.add(up);
      const el = new THREE.Group(); el.position.y = -upA; sh.add(el);
      const ej = sphere(0.026, skin); el.add(ej);                          // gomito
      const lo = limb(loA, 0.031, 0.025, skin); el.add(lo);
      const hand = sphere(0.03, skin, 0.8, 1.15, 0.6); hand.position.y = -loA - 0.012; el.add(hand);
      if (look.tattoo){ // tatuaggio tribale sull'avambraccio
        const tat = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.006, 4, 12), std(0x1b2a3a));
        tat.rotation.x = Math.PI/2; tat.position.y = -upA*0.4; sh.add(tat);
      }
      torso.add(sh);
      this.arms.push({ sh, el });
    }

    // --- collo e testa ---
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.07, 10), skin);
    neck.position.y = tH + 0.02; neck.castShadow = true; torso.add(neck);
    const head = this.head = new THREE.Group();
    const hr = 0.1;                         // raggio: testa ≈ H/5,8 (leggermente stilizzata)
    head.position.y = tH + 0.05 + hr; torso.add(head);
    // cranio + mandibola: forma ovoidale che si stringe verso il mento
    const skullG = new THREE.SphereGeometry(hr, 24, 18);
    const p = skullG.attributes.position;
    for (let i=0; i<p.count; i++){
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const t = y / hr;                               // -1 mento, +1 sommità
      const jaw = t < 0 ? 1 - 0.28 * t*t : 1;         // mento più stretto
      x *= 0.86 * jaw; z *= 0.95 * (t < 0 ? 1 - 0.12*t*t : 1);
      y *= 1.12;
      if (z > 0 && t < -0.3) z *= 1.04;               // mento leggermente avanti
      p.setXYZ(i, x, y, z);
    }
    skullG.computeVertexNormals();
    const skull = new THREE.Mesh(skullG, skin); skull.castShadow = true; head.add(skull);

    // occhi: sclera, iride, pupilla, riflesso
    const sclera = std(0xfafafa, { roughness:0.2 });
    const iris = std(look.eyes || '#3b2a1a', { roughness:0.3 });
    const pupil = std(0x050505, { roughness:0.1 });
    const lidM = skin;
    for (const s of [-1, 1]){
      const eg = new THREE.Group(); eg.position.set(s * 0.031, 0.008, hr * 0.84); head.add(eg);
      const ball = sphere(0.016, sclera, 1.15, 0.8, 0.6, 12); eg.add(ball);
      const ir = sphere(0.0095, iris, 1, 1, 0.5, 10); ir.position.z = 0.0075; eg.add(ir);
      const pu = sphere(0.0045, pupil, 1, 1, 0.5, 8); pu.position.z = 0.0105; eg.add(pu);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 6, 4), new THREE.MeshBasicMaterial({ color:0xffffff }));
      glint.position.set(0.003, 0.004, 0.012); eg.add(glint);
      const lid = sphere(0.0175, lidM, 1.15, 0.32, 0.62, 12); lid.position.set(0, 0.012, 0.001); eg.add(lid); // palpebra
      this.lids = this.lids || []; this.lids.push(lid);
      // sopracciglio: arco sottile
      const brow = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0035, 4, 10, Math.PI * 0.8), hairM);
      brow.position.set(s * 0.031, 0.03, hr * 0.9); brow.rotation.z = Math.PI * 0.1; brow.scale.set(1, 0.5, 1);
      head.add(brow);
      // orecchie
      const ear = sphere(0.016, skin, 0.45, 1, 0.8, 10); ear.position.set(s * hr * 0.86, 0.0, 0.0); head.add(ear);
    }
    // naso
    const noseG = new THREE.ConeGeometry(0.011, 0.032, 8); noseG.rotateX(-Math.PI * 0.42);
    const nose = new THREE.Mesh(noseG, skin); nose.position.set(0, -0.012, hr * 0.97); head.add(nose);
    const tip = sphere(0.009, skin, 1.2, 0.9, 1); tip.position.set(0, -0.024, hr * 1.03); head.add(tip);
    // bocca: labbra come arco
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0035, 4, 12, Math.PI * 0.75),
      std(female ? 0xc0505a : 0xa35a50, { roughness:0.4 }));
    mouth.position.set(0, -0.042, hr * 0.84); mouth.rotation.z = Math.PI * 1.125; mouth.scale.set(1, 0.5, 1);
    head.add(mouth);

    // capelli
    const cap = (phiLen=Math.PI*2, thetaStart=0, thetaLen=Math.PI*0.52, grow=1.07)=>{
      const g = new THREE.SphereGeometry(hr * grow, 22, 14, 0, phiLen, thetaStart, thetaLen);
      const m = new THREE.Mesh(g, hairM);
      m.scale.set(0.9, 1.14, 1.0); m.castShadow = true;
      return m;
    };
    if (!look.bald){
      if (look.baldTop){
        // stempiato: solo corona laterale e nuca
        const c = cap(Math.PI*2, Math.PI*0.3, Math.PI*0.3); c.rotation.x = -0.35; head.add(c);
      } else if (look.curly){
        const c = cap(); c.rotation.x = -0.25; head.add(c);
        for (let i=0; i<26; i++){
          const a = hashStr('c'+i) * Math.PI*2, b = hashStr('d'+i) * 0.9;
          const ball = sphere(0.022, hairM);
          ball.position.set(Math.sin(a)*Math.sin(b)*hr*0.95, Math.cos(b)*hr*1.05 + 0.005, Math.cos(a)*Math.sin(b)*hr*0.95 - 0.01);
          head.add(ball);
        }
      } else {
        const c = cap(); c.rotation.x = -0.3; head.add(c);
        // frangia/ciuffo sulla fronte
        const fr = sphere(0.04, hairM, 1.6, 0.55, 0.7); fr.position.set(0.012, hr*0.72, hr*0.55); fr.rotation.z = 0.2; head.add(fr);
      }
      if (look.longHair){
        // capelli lunghi: velo che scende dietro fino alle spalle
        const back = new THREE.Mesh(new THREE.CylinderGeometry(hr*0.92, hr*1.12, 0.2, 16, 1, true, Math.PI*0.32, Math.PI*1.36), hairM);
        back.position.set(0, -0.06, -0.008); back.material.side = THREE.DoubleSide; back.castShadow = true;
        head.add(back);
      }
      if (look.ponytail){
        const pt = limb(0.14, 0.022, 0.012, hairM);
        pt.position.set(0, 0.03, -hr*0.95); pt.rotation.x = -0.35; head.add(pt);
        this.ponytail = pt;
      }
    }
    if (look.beard){
      const full = look.beard >= 2;
      const g = new THREE.SphereGeometry(hr * 1.02, 20, 10, Math.PI*0.05, Math.PI*0.9, Math.PI*(full ? 0.52 : 0.6), Math.PI*0.4);
      const bm = std(look.hair || '#2b1d14', { roughness:0.9, transparent:!full, opacity:full ? 1 : 0.55 });
      const bd = new THREE.Mesh(g, bm); bd.scale.set(0.9, 1.14, 1); bd.rotation.y = 0; head.add(bd);
      if (full){
        const mus = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 4, 10, Math.PI*0.8), bm);
        mus.position.set(0, -0.03, hr*0.9); mus.rotation.z = Math.PI*0.1; head.add(mus);
      }
    }

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
      l.hip.rotation.x = -a * 0.55 * amt;
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
    // battito di ciglia
    this.blink -= dt;
    const closed = this.blink < 0.12;
    for (const l of this.lids) l.scale.y = closed ? 0.85 : 0.32;
    if (this.blink < 0) this.blink = 2 + Math.random() * 3;
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

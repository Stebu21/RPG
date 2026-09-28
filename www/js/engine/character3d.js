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
    const outfit = look.outfit;
    const inkSkin = look.tattoo ? new THREE.MeshPhysicalMaterial({ map:tattooTexture(), roughness:0.55, sheen:0.4, sheenColor:new THREE.Color(0xffb090) }) : skin;
    // il samurai veste un gi scuro, il mago un soprabito antracite: il colore del personaggio resta nei dettagli
    const coat = outfit === 'mage' ? std(0x2a2638, { roughness:0.7 }) : outfit === 'samurai' ? std(0x23262e, { roughness:0.9 }) : null;
    if (coat){ shirt.color.copy(coat.color); }
    const accent = std(color, { roughness:0.6 });

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
    const sleeve = outfit === 'samurai' ? inkSkin : look.tattoo ? inkSkin : shirt;
    this.arms = [];
    for (const s of [-1, 1]){
      const sh = new THREE.Group(); sh.position.set(s * shX, shY, 0); sh.rotation.z = s * 0.05;
      const cap = sphere(0.04 * (wide?1.15:1), outfit === 'samurai' ? inkSkin : shirt, 1, 0.9, 0.9); sh.add(cap);   // deltoide
      const up = limb(upA, 0.04 * (wide?1.15:1), 0.032, sleeve); sh.add(up);
      const el = new THREE.Group(); el.position.y = -upA; sh.add(el);
      const ej = sphere(0.026, skin); el.add(ej);                          // gomito
      const lo = limb(loA, 0.031, 0.025, look.tattoo ? inkSkin : skin); el.add(lo);
      const hand = sphere(0.03, skin, 0.8, 1.15, 0.6); hand.position.y = -loA - 0.012; el.add(hand);
      torso.add(sh);
      this.arms.push({ sh, el, hand });
    }
    this.weaponArm = this.arms[0];   // la mano destra del personaggio

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
    if (look.hairStyle === 'quiff'){
      // lati rasati: un velo scuro aderente, sopra un ciuffo spazzolato all'insù
      const sidesG = new THREE.SphereGeometry(hr * 1.02, 22, 10, Math.PI*0.78, Math.PI*1.44, Math.PI*0.25, Math.PI*0.3);
      const sides = new THREE.Mesh(sidesG, std(look.hair || '#2b1d14', { roughness:1, transparent:true, opacity:0.7 }));
      sides.scale.set(0.9, 1.14, 1.0); head.add(sides);
      const top = cap(Math.PI*2, 0, Math.PI*0.3, 1.06); top.rotation.x = -0.2; head.add(top);
      for (let i=0; i<5; i++){
        const q = sphere(0.035, hairM, 1.1, 0.7, 1.5);
        q.position.set((i - 2) * 0.01, hr*0.98 + (2 - Math.abs(i - 2)) * 0.008, hr*0.7 - i*0.018);
        q.rotation.x = -0.75; head.add(q);
      }
    } else if (look.hairStyle === 'tied'){
      // capelli lunghi tirati indietro e legati in una coda da samurai
      const c = cap(Math.PI*2, 0, Math.PI*0.5, 1.07); c.rotation.x = -0.62; head.add(c);   // fronte scoperta
      const knot = sphere(0.03, hairM, 1, 1, 1.1); knot.position.set(0, hr*0.55, -hr*0.95); head.add(knot);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 12), accent);
      tie.position.set(0, hr*0.5, -hr*1.05); head.add(tie);
      const pt = limb(0.2, 0.026, 0.012, hairM);
      pt.position.set(0, hr*0.5, -hr*1.08); pt.rotation.x = -0.25; head.add(pt);
      this.ponytail = pt;
    } else if (!look.bald){
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
      const g = new THREE.SphereGeometry(hr * 1.02, 20, 10, Math.PI*0.08, Math.PI*0.84, Math.PI*(full ? 0.64 : 0.66), Math.PI*0.34);
      const bm = std(look.hair || '#2b1d14', { roughness:0.9, transparent:!full, opacity:full ? 1 : 0.55 });
      const bd = new THREE.Mesh(g, bm); bd.scale.set(0.9, 1.14, 1); bd.rotation.y = 0; head.add(bd);
      if (look.beard >= 3){
        // barba lunga che scende sotto il mento
        const lb = sphere(0.045, bm, 1.1, 1.3, 0.7); lb.position.set(0, -hr*1.05, hr*0.5); head.add(lb);
        const tipB = sphere(0.03, bm, 1, 1.3, 0.7); tipB.position.set(0, -hr*1.35, hr*0.5); head.add(tipB);
      }
      if (full){
        const mus = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 4, 10, Math.PI*0.8), bm);
        mus.position.set(0, -0.03, hr*0.9); mus.rotation.z = Math.PI*0.1; head.add(mus);
      }
    }

    const W = wide ? 1.22 : 1;
    if (outfit === 'samurai'){
      // colletto del gi incrociato a V, obi rosso, hakama ampio, spallaccio
      for (const sx of [-1, 1]){
        const lap = new THREE.Mesh(new THREE.BoxGeometry(0.03, tH * 0.62, 0.012), std(0xe8e2d4));
        lap.position.set(sx * 0.03, tH * 0.72, 0.075 * W); lap.rotation.z = sx * 0.55; torso.add(lap);
      }
      belt.material = std(0xa8232a, { roughness:0.6 }); belt.scale.set(1.08, 0.72, 2.6);
      buckle.visible = false;
      const hak = new THREE.Mesh(new THREE.CylinderGeometry(0.115 * W, 0.2 * W, legLen * 0.78, 18, 1, true), std(0x1d1f28, { roughness:0.95, side:THREE.DoubleSide }));
      hak.scale.z = 0.8; hak.position.y = hipY - legLen * 0.39; body.add(hak);
      const sode = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI*2, 0, Math.PI*0.45), std(0x5a2020, { roughness:0.5, metalness:0.3 }));
      sode.scale.set(1, 0.8, 1.1); sode.position.set(0, 0.02, 0); this.arms[0].sh.add(sode);
      // katana: fodero sul fianco sinistro, lama nella mano destra quando combatte
      const lacquer = std(0x111111, { roughness:0.25, metalness:0.2 });
      const saya = new THREE.Group();
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.62, 8), lacquer); sc.position.y = -0.31; saya.add(sc);
      const tsuka = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.16, 8), std(0xd8cfc0)); tsuka.position.y = 0.08; saya.add(tsuka);
      const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 12), std(0xb08d3c, { metalness:1, roughness:0.3 })); saya.add(tsuba);
      saya.position.set(0.13 * W, 0.05, 0.06); saya.rotation.set(1.05, 0, 0.2); torso.add(saya);
      this.sheath = tsuka;
      const sword = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.62, 0.025), std(0xe8eef5, { metalness:1, roughness:0.15, emissive:0x223344, emissiveIntensity:0.3 }));
      blade.position.y = -0.4; sword.add(blade);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.16, 8), std(0xd8cfc0)); grip.position.y = 0.0; sword.add(grip);
      const guard = tsuba.clone(); guard.position.y = -0.085; sword.add(guard);
      sword.position.copy(this.weaponArm.hand.position); sword.rotation.x = Math.PI/2;
      this.weaponArm.el.add(sword);
      this.sword = sword; sword.visible = false;
    } else if (outfit === 'mage'){
      // soprabito lungo aperto davanti, con colletto alto e orlo nel colore di Ste
      const coatG = new THREE.CylinderGeometry(0.11 * W, 0.17 * W, legLen * 0.72, 22, 1, true, Math.PI*0.14, Math.PI*1.72);
      const coatM = new THREE.Mesh(coatG, std(0x2a2638, { roughness:0.7, side:THREE.DoubleSide }));
      coatM.scale.z = 0.75; coatM.position.y = hipY - legLen * 0.33; body.add(coatM);
      this.coat = coatM;
      const hem = new THREE.Mesh(new THREE.TorusGeometry(0.17 * W, 0.008, 4, 28, Math.PI*1.72), accent);
      hem.rotation.set(Math.PI/2, 0, Math.PI*0.64); hem.scale.set(1, 0.75, 1); hem.position.y = hipY - legLen * 0.69; body.add(hem);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.07, 16, 1, true, Math.PI*0.2, Math.PI*1.6), std(0x2a2638, { side:THREE.DoubleSide }));
      collar.position.y = tH + 0.03; torso.add(collar);
      for (let i=0; i<3; i++){ const b = sphere(0.009, std(0xd4af37, { metalness:1, roughness:0.3 })); b.position.set(0.03, tH*(0.45 + i*0.15), 0.079); torso.add(b); }
      // fedora moderno inclinato indietro, con fascia viola: lascia vedere il ciuffo
      const hat = new THREE.Group();
      const felt = std(0x1c1a24, { roughness:0.8 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.008, 28), felt);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.092, 0.085, 22), felt); crown.position.y = 0.045;
      const dent = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 6, 0, Math.PI*2, 0, Math.PI/2), felt); dent.scale.y = 0.35; dent.position.y = 0.085;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.093, 0.093, 0.018, 22, 1, true), accent); band.position.y = 0.012;
      hat.add(brim, crown, dent, band);
      hat.position.set(0, hr*1.12, -0.05); hat.rotation.x = -0.38;   // portato indietro: il ciuffo spunta sotto la tesa
      head.add(hat);
      // bastone moderno: asta in metallo scuro con cristallo luminoso
      const staff = new THREE.Group();
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 1.05, 8), std(0x2c2f38, { metalness:0.8, roughness:0.3 }));
      staff.add(rod);
      for (const y of [0.42, 0.47]){ const r = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 6, 14), std(0xd4af37, { metalness:1, roughness:0.3 })); r.rotation.x = Math.PI/2; r.position.y = y; staff.add(r); }
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), new THREE.MeshStandardMaterial({ color:0xb89cff, emissive:0x7e57ff, emissiveIntensity:1.6, roughness:0.1 }));
      gem.scale.y = 1.6; gem.position.y = 0.58; staff.add(gem);
      staff.position.copy(this.weaponArm.hand.position); staff.position.y -= 0.02; staff.position.z = 0.02;
      this.weaponArm.el.add(staff);
      this.staff = staff; this.gem = gem;
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
    if (this.staff){
      this.staff.rotation.x = -(this.weaponArm.sh.rotation.x + this.weaponArm.el.rotation.x);
      this.gem.rotation.y += dt * 2;
    }
    // battito di ciglia
    this.blink -= dt;
    const closed = this.blink < 0.12;
    for (const l of this.lids) l.scale.y = closed ? 0.85 : 0.32;
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

// Battaglia ATB in stile Final Fantasy: scena su canvas con party e mostri
// visibili insieme, animazioni (affondo, colpo, magia, KO), comandi e Limit.

import { MONSTERS } from '../data/monsters.js';
import { QUESTS, registerKill } from '../data/quests.js';
import { ABILITIES, STATUS_NAMES } from '../data/abilities.js';
import { CHARACTERS } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { G, statsOf, knownAbilities, gainExp, abilityName } from '../engine/state.js';
import { drawMonster, drawActor, TILE } from '../engine/sprites.js';
import { playMusic, stopMusic, sfx } from '../engine/audio.js';
import { registerScreen, show, currentScreen } from '../engine/ui.js';

const el = document.getElementById('screen-battle');
const zone = document.getElementById('battle-zone');
const canvas = document.getElementById('battle-canvas');
const sceneCtx = canvas.getContext('2d');
const popsEl = document.getElementById('battle-pops');
const logEl = document.getElementById('battle-log');
const cmdPanel = document.getElementById('battle-commands');
const cmdTitle = document.getElementById('cmd-title');
const cmdList = document.getElementById('cmd-list');
const partyEl = document.getElementById('battle-party');
const fxEl = document.getElementById('battle-fx');

let B = null;      // stato battaglia
let raf = 0;
let lastTs = 0;

const ATB_MAX = 100;
const TICK_MS = 60;

function rand(a, b){ return a + Math.random() * (b - a); }

// ---------- setup ----------
function makeEnemy(id, idx){
  const def = MONSTERS[id];
  return {
    kind:'enemy', idx, id,
    name: def.name, def,
    hp: def.hp, maxhp: def.hp,
    atk: def.atk, defn: def.def, mag: def.mag, spr: def.spr, spd: def.spd,
    atb: rand(0, 40), statuses:{}, buffs:{},
    pal: def.pal, moves: def.moves,
    phase2: def.phase2 || null, phased:false,
    // scena
    sprite:null, sx:0, sy:0, size:0,
    ox:0, oy:0, shakeT:0, flashT:0, castT:0, lungeT:0, lungeDir:1, deadT:0,
    dom:null,
  };
}

function makeAlly(charId){
  const cs = G.s.chars[charId];
  const st = statsOf(cs);
  return {
    kind:'ally', id: charId, cs, st,
    def: CHARACTERS[charId],
    name: CHARACTERS[charId].name,
    atb: rand(0, 50), statuses:{}, buffs:{},
    sx:0, sy:0, size:0,
    ox:0, oy:0, shakeT:0, flashT:0, castT:0, lungeT:0, lungeDir:-1, deadT:0,
    dom:null,
  };
}

function aliveEnemies(){ return B.enemies.filter(e=>e.hp > 0); }
function aliveAllies(){ return B.allies.filter(a=>a.cs.hp > 0); }

// ---------- log ----------
function log(msg){ logEl.textContent = msg; }

// ---------- scena ----------
const E_LAYOUT = {
  1: [[0.22, 0.60]],
  2: [[0.17, 0.44], [0.27, 0.74]],
  3: [[0.15, 0.36], [0.25, 0.60], [0.15, 0.82]],
  4: [[0.13, 0.36], [0.27, 0.52], [0.13, 0.68], [0.27, 0.84]],
};
const A_LAYOUT = {
  1: [[0.80, 0.62]],
  2: [[0.78, 0.46], [0.82, 0.74]],
  3: [[0.77, 0.40], [0.80, 0.62], [0.83, 0.84]],
};

function buildScene(){
  const W = zone.clientWidth || 800, H = zone.clientHeight || 360;
  // risoluzione interna dimezzata + upscale pixelato = look da Nintendo DS
  const dpr = 0.5;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  sceneCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sceneCtx.imageSmoothingEnabled = false;
  B.W = W; B.H = H;

  const eLay = E_LAYOUT[Math.min(4, B.enemies.length)] || E_LAYOUT[4];
  B.enemies.forEach((e, i)=>{
    const [fx, fy] = e.def.boss ? [0.24, 0.72] : eLay[i % eLay.length];
    e.sx = W * fx; e.sy = H * fy;
    e.size = e.def.boss ? Math.min(H * 0.72, 280) : Math.min(H * 0.42, 170);
    refreshEnemySprite(e);
  });
  const aLay = A_LAYOUT[Math.min(3, B.allies.length)] || A_LAYOUT[3];
  B.allies.forEach((a, i)=>{
    const [fx, fy] = aLay[i % aLay.length];
    a.sx = W * fx; a.sy = H * fy;
    a.size = Math.min(H * 0.34, 120);
  });
}

function refreshEnemySprite(e){
  const cv = document.createElement('canvas');
  drawMonster(cv, { sprite: e.def.sprite, pal: e.pal }, Math.ceil(e.size / 18) + 2);
  e.sprite = cv;
}

function animate(u, kind, target){
  if (kind === 'lunge'){ u.lungeT = 0.42; }
  else if (kind === 'dash' && target){
    // corsa verso il bersaglio in stile FF9: vai, colpisci, torna
    u.dashT = 0.72; u.dashDur = 0.72;
    const side = u.kind === 'ally' ? 1 : -1;
    u.dashGoal = { x: target.sx + side * target.size * 0.55 - u.sx,
                   y: target.sy - u.sy };
  }
  else if (kind === 'hit'){ u.shakeT = 0.34; u.flashT = 0.26; }
  else if (kind === 'cast'){ u.castT = 0.55; }
}

// ---------- sfondi di battaglia per zona (stile FF9) ----------
function ridge(x, W, H, frac, color, jag=0.05){
  x.fillStyle = color;
  x.beginPath();
  x.moveTo(0, H*0.62);
  for (let i=0; i<=10; i++){
    x.lineTo(W*i/10, H*frac + Math.sin(i*2.7 + frac*40)*H*jag);
  }
  x.lineTo(W, H*0.62);
  x.closePath(); x.fill();
}
function bgSky(x, W, H, top, bottom){
  const g = x.createLinearGradient(0, 0, 0, H*0.62);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  x.fillStyle = g; x.fillRect(0, 0, W, H*0.62);
}
function bgGround(x, W, H, top, bottom){
  const g = x.createLinearGradient(0, H*0.62, 0, H);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  x.fillStyle = g; x.fillRect(0, H*0.62, W, H*0.38);
  x.fillStyle = 'rgba(255,255,255,.06)';
  x.beginPath(); x.ellipse(W*0.5, H*0.78, W*0.42, H*0.16, 0, 0, Math.PI*2); x.fill();
}
function bgSun(x, cx, cy, r, color){
  x.save(); x.shadowColor = color; x.shadowBlur = 22;
  x.fillStyle = color;
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI*2); x.fill();
  x.restore();
}
function bgClouds(x, W, H, t, color){
  x.fillStyle = color;
  for (let i=0; i<3; i++){
    const cx = ((t*(8+i*5) + i*420) % (W+320)) - 160;
    const cy = H*(0.10 + i*0.08);
    x.beginPath();
    x.ellipse(cx, cy, 62+i*16, 15+i*4, 0, 0, Math.PI*2);
    x.ellipse(cx+36, cy+5, 40, 12, 0, 0, Math.PI*2);
    x.fill();
  }
}
function bgTower(x, bx, by, w, h, color, merli=false){
  x.fillStyle = color;
  x.fillRect(bx, by-h, w, h);
  if (merli){
    for (let i=0; i<w; i+=w/4) x.fillRect(bx+i, by-h-5, w/7, 5);
  } else {
    x.beginPath(); x.moveTo(bx-2, by-h); x.lineTo(bx+w/2, by-h-12); x.lineTo(bx+w+2, by-h); x.closePath(); x.fill();
  }
}

const BATTLE_BGS = {
  varese(x, W, H, t){
    bgSky(x, W, H, '#6fb0e8', '#d8ecf8');
    bgSun(x, W*0.80, H*0.13, H*0.055, '#fff4c8');
    bgClouds(x, W, H, t, 'rgba(255,255,255,.8)');
    ridge(x, W, H, 0.34, '#8fa8c4', 0.06);          // Campo dei Fiori
    ridge(x, W, H, 0.46, '#6f8fae', 0.045);
    // lago di Varese in lontananza
    x.fillStyle = 'rgba(165,210,240,.9)';
    x.beginPath(); x.ellipse(W*0.22, H*0.60, W*0.17, H*0.022, 0, 0, Math.PI*2); x.fill();
    // campanile lontano
    bgTower(x, W*0.62, H*0.62, 10, H*0.13, 'rgba(90,100,130,.55)');
    bgGround(x, W, H, '#5d9c50', '#2c5426');
  },
  vedano(x, W, H, t){
    bgSky(x, W, H, '#79b8d8', '#e0eedd');
    bgClouds(x, W, H, t, 'rgba(255,255,255,.7)');
    ridge(x, W, H, 0.38, '#5d8a68', 0.05);
    ridge(x, W, H, 0.48, '#41694a', 0.04);
    // la filanda sull'Olona: capannone e ciminiera
    x.fillStyle = 'rgba(105,80,70,.75)';
    x.fillRect(W*0.68, H*0.50, W*0.16, H*0.12);
    x.beginPath(); x.moveTo(W*0.68, H*0.50); x.lineTo(W*0.76, H*0.44); x.lineTo(W*0.84, H*0.50); x.closePath(); x.fill();
    x.fillRect(W*0.86, H*0.36, W*0.02, H*0.26);
    bgGround(x, W, H, '#4d8a44', '#26461f');
    // il fiume attraversa il campo
    x.fillStyle = 'rgba(70,140,190,.75)';
    x.beginPath();
    x.moveTo(0, H*0.70);
    x.quadraticCurveTo(W*0.4, H*0.66, W, H*0.74);
    x.lineTo(W, H*0.79);
    x.quadraticCurveTo(W*0.4, H*0.71, 0, H*0.755);
    x.closePath(); x.fill();
    x.strokeStyle = `rgba(200,235,255,${0.35+Math.sin(t*2)*0.15})`; x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(0, H*0.725); x.quadraticCurveTo(W*0.4, H*0.685, W, H*0.765); x.stroke();
  },
  castiglione(x, W, H, t){
    bgSky(x, W, H, '#e8a05c', '#f8e3b8');                 // ora dorata sul borgo
    bgSun(x, W*0.30, H*0.20, H*0.06, '#ffe9b0');
    bgClouds(x, W, H, t, 'rgba(255,240,220,.6)');
    ridge(x, W, H, 0.40, '#a8785a', 0.05);
    // il borgo medievale: torri, collegiata, mura
    bgTower(x, W*0.56, H*0.55, 16, H*0.20, 'rgba(110,70,60,.8)');
    bgTower(x, W*0.72, H*0.58, 22, H*0.26, 'rgba(95,60,52,.85)', true);
    bgTower(x, W*0.84, H*0.56, 14, H*0.16, 'rgba(110,70,60,.8)');
    x.fillStyle = 'rgba(120,80,66,.7)';
    x.fillRect(W*0.52, H*0.52, W*0.4, H*0.10);
    bgGround(x, W, H, '#a8894c', '#5c4526');
  },
  jerago(x, W, H, t){
    bgSky(x, W, H, '#d87a50', '#f8d8a0');                 // tramonto sulle colline
    bgSun(x, W*0.68, H*0.24, H*0.07, '#ffd9a0');
    ridge(x, W, H, 0.36, '#8a6a78', 0.06);
    // il castello di Jerago sul colle
    ridge(x, W, H, 0.50, '#5c4a54', 0.05);
    bgTower(x, W*0.18, H*0.44, 18, H*0.16, 'rgba(70,55,66,.95)', true);
    bgTower(x, W*0.26, H*0.44, 14, H*0.12, 'rgba(70,55,66,.95)', true);
    x.fillStyle = 'rgba(70,55,66,.95)';
    x.fillRect(W*0.18, H*0.40, W*0.10, H*0.04);
    bgGround(x, W, H, '#7a8a44', '#3c4a20');
  },
  samarate(x, W, H, t){
    bgSky(x, W, H, '#3c4468', '#c88a68');                 // crepuscolo industriale
    bgSun(x, W*0.24, H*0.34, H*0.05, '#ffb070');
    ridge(x, W, H, 0.46, '#4a4458', 0.03);
    // hangar delle officine aeronautiche + antenna
    x.fillStyle = 'rgba(52,54,72,.9)';
    for (const [hx, hw] of [[0.58, 0.14], [0.74, 0.18]]){
      x.beginPath();
      x.moveTo(W*hx, H*0.62);
      x.lineTo(W*hx, H*0.52);
      x.arc(W*(hx+hw/2), H*0.52, W*hw/2, Math.PI, 0);
      x.lineTo(W*(hx+hw), H*0.62);
      x.closePath(); x.fill();
    }
    x.strokeStyle = 'rgba(52,54,72,.9)'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(W*0.52, H*0.62); x.lineTo(W*0.52, H*0.38); x.stroke();
    x.fillStyle = `rgba(255,80,80,${0.5+Math.sin(t*3)*0.4})`;
    x.beginPath(); x.arc(W*0.52, H*0.375, 3, 0, Math.PI*2); x.fill();
    bgGround(x, W, H, '#8a7a4c', '#3c3420');
  },
  sacromonte(x, W, H, t){
    bgSky(x, W, H, '#1a1030', '#4a2050');                 // notte al santuario
    // stelle
    for (let i=0; i<24; i++){
      const sx = (i*97) % W, sy = (i*53) % (H*0.45);
      x.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(t*2 + i)*0.25})`;
      x.fillRect(sx, sy, 2, 2);
    }
    bgSun(x, W*0.72, H*0.14, H*0.05, '#cdd6ff');          // luna
    // nube viola della strega
    x.fillStyle = `rgba(140,60,180,${0.20 + Math.sin(t*0.8)*0.06})`;
    x.beginPath(); x.ellipse(W*0.5, H*0.16, W*0.32, H*0.08, 0, 0, Math.PI*2); x.fill();
    ridge(x, W, H, 0.34, '#2c2044', 0.07);
    // le cappelle in fila sul crinale
    for (let i=0; i<5; i++){
      bgTower(x, W*(0.15+i*0.16), H*0.47, 12, H*0.07, 'rgba(200,190,220,.35)');
    }
    ridge(x, W, H, 0.50, '#201830', 0.05);
    bgGround(x, W, H, '#3c3050', '#171024');
  },
};

function drawScene(ts, dt){
  if (!B) return;
  const x = sceneCtx, W = B.W, H = B.H;
  const t = ts / 1000;

  // sfondo a tema con la zona della provincia in cui si combatte
  (BATTLE_BGS[B.area] || BATTLE_BGS.varese)(x, W, H, t);
  if (B.boss){
    // vignettatura minacciosa per i boss
    const vg = x.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.95);
    vg.addColorStop(0, 'rgba(40,0,20,0)');
    vg.addColorStop(1, 'rgba(40,0,25,.55)');
    x.fillStyle = vg;
    x.fillRect(0, 0, W, H);
  }

  // aggiorna animazioni
  for (const u of [...B.enemies, ...B.allies]){
    u.lungeT = Math.max(0, u.lungeT - dt);
    u.shakeT = Math.max(0, u.shakeT - dt);
    u.flashT = Math.max(0, u.flashT - dt);
    u.castT = Math.max(0, u.castT - dt);
    u.dashT = Math.max(0, (u.dashT || 0) - dt);
    const dead = u.kind === 'enemy' ? u.hp <= 0 : u.cs.hp <= 0;
    if (u.kind === 'enemy'){
      u.deadT = dead ? Math.min(1, u.deadT + dt * 1.6) : 0;
    }
    if (u.dashT > 0 && u.dashGoal){
      // corsa verso il bersaglio: accelerazione, colpo, ritorno
      const p = 1 - u.dashT / u.dashDur;
      let k;
      if (p < 0.38) k = 1 - Math.pow(1 - p/0.38, 2);
      else if (p < 0.58) k = 1;
      else k = 1 - Math.pow((p - 0.58)/0.42, 1.6);
      u.ox = u.dashGoal.x * k + (u.shakeT > 0 ? (Math.random()*2-1) * u.shakeT * 22 : 0);
      u.oy = u.dashGoal.y * k - Math.sin(Math.min(1, p/0.38) * Math.PI) * 14;
    } else {
      const lp = u.lungeT > 0 ? Math.sin((1 - u.lungeT/0.42) * Math.PI) : 0;
      u.ox = u.lungeDir * lp * Math.min(60, B.W*0.07)
           + (u.shakeT > 0 ? (Math.random()*2-1) * u.shakeT * 22 : 0);
      u.oy = 0;
    }
  }

  // selezione bersaglio attiva?
  const selT = B.targetMode ? targetPool()[B.targetIdx % Math.max(1, targetPool().length)] : null;

  // nemici (ordinati per y per una prospettiva corretta)
  const units = [...B.enemies, ...B.allies].sort((a,b)=>a.sy - b.sy);
  for (const u of units){
    if (u.kind === 'enemy') drawEnemyUnit(x, u, t, selT === u);
    else drawAllyUnit(x, u, t, selT === u);
  }

  // scintille degli incantesimi sopra a tutto
  for (const u of units){
    if (u.castT > 0) drawCast(x, u, t);
  }

  // effetti speciali (proiettili magici, fulmini, fendenti, cure)
  updateFx(x, dt, t);
}

// ---------- effetti speciali delle mosse ----------
const ELEM_FX = {
  fuoco:'#ff8a3c', ghiaccio:'#9fdcff', tuono:'#ffe95a', acqua:'#57b0f0',
  vento:'#a8f0c0', terra:'#d0a05a', sacro:'#fff2b0', oscurita:'#b06ae8', neutro:'#cfd8ff',
};

function spawnFx(fx){ B?.fx?.push({ t:0, ...fx }); }

function fxForSpell(user, target, element){
  const color = ELEM_FX[element] || ELEM_FX.neutro;
  const ty = target.sy - target.size*0.5;
  if (element === 'tuono'){
    spawnFx({ kind:'bolt', x1:target.sx, y1:ty + target.size*0.1, dur:0.30, color });
  } else {
    spawnFx({ kind:'proj', x0:user.sx + user.ox, y0:user.sy - user.size*0.55,
              x1:target.sx, y1:ty, dur:0.34, color });
  }
  spawnFx({ kind:'burst', x1:target.sx, y1:ty, dur:0.5, delay:0.32, color });
}

function updateFx(x, dt, t){
  if (!B.fx) return;
  for (const f of B.fx) f.t += dt;
  B.fx = B.fx.filter(f=>f.t < (f.delay||0) + f.dur);
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (const f of B.fx){
    const lt = f.t - (f.delay||0);
    if (lt < 0) continue;
    const p = Math.min(1, lt / f.dur);
    if (f.kind === 'proj'){
      const px = f.x0 + (f.x1-f.x0)*p;
      const py = f.y0 + (f.y1-f.y0)*p - Math.sin(p*Math.PI)*46;
      x.shadowColor = f.color; x.shadowBlur = 14;
      x.fillStyle = f.color;
      x.beginPath(); x.arc(px, py, 6, 0, Math.PI*2); x.fill();
      // scia
      for (let i=1; i<=4; i++){
        const q = Math.max(0, p - i*0.05);
        const qx = f.x0 + (f.x1-f.x0)*q;
        const qy = f.y0 + (f.y1-f.y0)*q - Math.sin(q*Math.PI)*46;
        x.globalAlpha = 0.5 - i*0.11;
        x.beginPath(); x.arc(qx, qy, 5 - i, 0, Math.PI*2); x.fill();
      }
      x.globalAlpha = 1;
    } else if (f.kind === 'bolt'){
      x.strokeStyle = f.color; x.lineWidth = 3.5;
      x.shadowColor = f.color; x.shadowBlur = 16;
      x.globalAlpha = p < 0.15 ? p/0.15 : 1 - (p-0.15)/0.85;
      x.beginPath();
      let by = -10, bx = f.x1 + 30;
      x.moveTo(bx, by);
      while (by < f.y1){
        by += 22 + Math.random()*14;
        bx = f.x1 + (Math.random()*2-1) * 22 * Math.max(0.1, (f.y1-by)/f.y1);
        x.lineTo(bx, Math.min(by, f.y1));
      }
      x.stroke();
      x.globalAlpha = 1;
    } else if (f.kind === 'burst'){
      for (let i=0; i<10; i++){
        const a = i/10 * Math.PI*2 + (f.x1%7);
        const r = p * 34;
        x.globalAlpha = (1-p) * 0.9;
        x.fillStyle = f.color;
        x.beginPath();
        x.arc(f.x1 + Math.cos(a)*r, f.y1 + Math.sin(a)*r*0.7 - p*10, 3.4*(1-p)+0.8, 0, Math.PI*2);
        x.fill();
      }
      x.globalAlpha = 1;
    } else if (f.kind === 'slash'){
      // fendente ad arco
      x.strokeStyle = '#fff';
      x.shadowColor = f.color || '#fff'; x.shadowBlur = 12;
      x.lineWidth = 4 * (1-p) + 1;
      x.globalAlpha = 1 - p;
      const a0 = -Math.PI*0.85 + p*1.2, a1 = a0 + Math.PI*0.75;
      x.beginPath(); x.arc(f.x1, f.y1, 30 + p*14, a0, a1); x.stroke();
      x.globalAlpha = 1;
    } else if (f.kind === 'heal'){
      for (let i=0; i<7; i++){
        const q = (p + i/7) % 1;
        const hx = f.x1 + Math.sin(i*2.7 + p*6) * 18;
        const hy = f.y1 + 20 - q*54;
        x.globalAlpha = (1-q) * 0.8;
        x.fillStyle = f.color || '#a0ffb8';
        x.beginPath(); x.arc(hx, hy, 2.6, 0, Math.PI*2); x.fill();
        // crocetta di luce
        x.fillRect(hx-4, hy-0.8, 8, 1.6);
        x.fillRect(hx-0.8, hy-4, 1.6, 8);
      }
      x.globalAlpha = 1;
    }
  }
  x.restore();
}

function drawTargetRing(x, u, t){
  const w = u.kind === 'enemy' ? u.size*0.45 : u.size*0.42;
  x.save();
  x.strokeStyle = '#ffd76a';
  x.lineWidth = 3;
  x.shadowColor = '#ffd76a'; x.shadowBlur = 10;
  x.globalAlpha = 0.7 + Math.sin(t*7)*0.3;
  x.beginPath(); x.ellipse(u.sx + u.ox, u.sy + 4, w, w*0.3, 0, 0, Math.PI*2); x.stroke();
  // freccia
  const ay = u.sy - u.size - 14 + Math.sin(t*6)*4;
  x.fillStyle = '#ffd76a';
  x.beginPath(); x.moveTo(u.sx-8, ay); x.lineTo(u.sx+8, ay); x.lineTo(u.sx, ay+10); x.closePath(); x.fill();
  x.restore();
}

function drawEnemyUnit(x, e, t, selected){
  if (e.deadT >= 1) return;
  const bob = e.hp > 0 ? Math.sin(t*1.8 + e.idx*1.4) * 3 : 0;
  if (selected) drawTargetRing(x, e, t);
  x.save();
  x.globalAlpha = 1 - e.deadT;
  const dy = e.deadT * 24 + (e.oy || 0);
  x.drawImage(e.sprite, e.sx + e.ox - e.size/2, e.sy + bob + dy - e.size*0.92, e.size, e.size);
  if (e.flashT > 0){
    x.globalCompositeOperation = 'lighter';
    x.globalAlpha = e.flashT * 2.4;
    x.fillStyle = '#fff';
    x.beginPath(); x.ellipse(e.sx + e.ox, e.sy + bob - e.size*0.45, e.size*0.4, e.size*0.42, 0, 0, Math.PI*2); x.fill();
  }
  x.restore();
  if (e.hp > 0){
    // nome + barra HP
    const bw = Math.max(64, e.size*0.6);
    const bx = e.sx - bw/2, by = e.sy + 12;
    x.fillStyle = 'rgba(8,8,24,.65)';
    x.beginPath(); x.roundRect(bx-6, by-15, bw+12, 26, 8); x.fill();
    x.fillStyle = '#dfe3f5';
    x.font = '11px system-ui, sans-serif';
    x.textAlign = 'center';
    x.fillText(e.name, e.sx, by-4);
    x.fillStyle = 'rgba(255,255,255,.16)';
    x.beginPath(); x.roundRect(bx, by, bw, 5, 3); x.fill();
    const pct = Math.max(0, e.hp/e.maxhp);
    x.fillStyle = pct < 0.25 ? '#e74c3c' : pct < 0.5 ? '#f1b13c' : '#46c46e';
    x.beginPath(); x.roundRect(bx, by, bw*pct, 5, 3); x.fill();
  }
}

function drawAllyUnit(x, a, t, selected){
  const ko = a.cs.hp <= 0;
  const limitOk = !ko && a.cs.hp / a.st.hp < 0.3;
  const active = B.readyQueue[0] === a;
  if (selected) drawTargetRing(x, a, t);
  // aura Limit
  if (limitOk){
    x.save();
    x.globalAlpha = 0.35 + Math.sin(t*6)*0.15;
    x.fillStyle = '#ff6b81';
    x.beginPath(); x.ellipse(a.sx + a.ox, a.sy + 3, a.size*0.34, a.size*0.12, 0, 0, Math.PI*2); x.fill();
    x.restore();
  }
  const breathe = ko ? 0
    : B.victory ? -Math.abs(Math.sin(t*5 + a.sy)) * 8       // saltello di vittoria
    : Math.sin(t*2.2 + a.sy) * 1.6;
  const s = a.size / 64; // drawActor è alto ~64px in scala TILE
  x.save();
  x.translate(a.sx + a.ox, a.sy + breathe + (a.oy || 0));
  if (a.flashT > 0) x.globalAlpha = 0.5 + Math.sin(t*60)*0.5;
  if (ko){
    x.globalAlpha = 0.45;
    x.rotate(-Math.PI/2);
    x.translate(0, 6);
  }
  x.scale(s, s);
  drawActor(x, -TILE/2, -46, a.def, 'left', ko ? 0 : (a.lungeT > 0 || a.dashT > 0 ? (t*3)%1 : 0));
  x.restore();
  // indicatore del turno attivo
  if (active && !ko){
    const ay = a.sy - a.size - 10 + Math.sin(t*5)*3;
    x.fillStyle = '#7ec8ff';
    x.beginPath(); x.moveTo(a.sx-7, ay); x.lineTo(a.sx+7, ay); x.lineTo(a.sx, ay+9); x.closePath(); x.fill();
  }
}

function drawCast(x, u, t){
  const n = 7;
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i=0; i<n; i++){
    const a = t*5 + i * (Math.PI*2/n);
    const r = u.size*0.4 * (1 - u.castT/0.55) + 8;
    const px = u.sx + Math.cos(a) * r;
    const py = u.sy - u.size*0.5 + Math.sin(a) * r * 0.5 - (1 - u.castT/0.55) * 22;
    x.fillStyle = `rgba(160,200,255,${u.castT})`;
    x.shadowColor = '#9ec8ff'; x.shadowBlur = 8;
    x.beginPath(); x.arc(px, py, 3, 0, Math.PI*2); x.fill();
  }
  x.restore();
}

function sceneLoop(ts){
  const dt = Math.min(0.05, (ts - lastTs)/1000 || 0.016);
  lastTs = ts;
  drawScene(ts, dt);
  raf = requestAnimationFrame(sceneLoop);
}

// ---------- danno ----------
function elemMult(def, element){
  if (!element || element === 'neutro') return 1;
  if (def.weak?.includes(element)) return 1.6;
  if (def.resist?.includes(element)) return 0.5;
  return 1;
}

function buffMult(unit, stat){
  const b = unit.buffs[stat];
  return b ? b.mult : 1;
}

function computeDamage(user, target, move){
  const vary = move.vary || 1;
  const v = rand(1 - 0.1*vary, 1 + 0.1*vary);
  const uAtk = user.kind==='ally' ? user.st.atk : user.atk;
  const uMag = user.kind==='ally' ? user.st.mag : user.mag;
  const tDef = (target.kind==='ally' ? target.st.def : target.defn) * buffMult(target,'def');
  const tSpr = target.kind==='ally' ? target.st.spr : target.spr;
  const em = target.kind==='enemy' ? elemMult(target.def, move.element) : 1;
  let dmg, crit = false;
  if (move.type === 'phys'){
    crit = Math.random() < (move.crit || 0.06);
    dmg = (uAtk * buffMult(user,'atk') * 2.2 + (move.power||0) * 1.8) * v * em * (crit ? 1.8 : 1) - tDef * 1.4;
  } else {
    dmg = (uMag * buffMult(user,'atk') * 2.2 + (move.power||0) * 1.8) * v * em - tSpr * 1.2;
  }
  // bilanciamento a favore del party: gli eroi colpiscono più forte, i mostri meno
  dmg *= user.kind === 'ally' ? 1.45 : 0.55;
  return { dmg: Math.max(1, Math.round(dmg)), crit, em };
}

// ---------- effetti visivi ----------
function popDamage(unit, text, cls=''){
  if (!unit || unit.sx === undefined) return;
  const d = document.createElement('div');
  d.className = 'dmg-pop ' + cls;
  d.textContent = text;
  d.style.left = (unit.sx + rand(-12, 12)) + 'px';
  d.style.top = (unit.sy - unit.size*0.8) + 'px';
  popsEl.appendChild(d);
  setTimeout(()=>d.remove(), 950);
}

function flash(color){
  const f = document.createElement('div');
  f.className = 'flash';
  f.style.background = color;
  fxEl.appendChild(f);
  setTimeout(()=>f.remove(), 360);
}

// ---------- pannello del party (in basso, stile FF) ----------
function renderParty(){
  partyEl.innerHTML = '';
  for (const a of B.allies){
    const cs = a.cs, st = a.st;
    const row = document.createElement('div');
    row.className = 'pmember' + (cs.hp<=0 ? ' ko' : '') + (B.readyQueue[0]===a ? ' active' : '');
    const hpPct = Math.max(0, cs.hp/st.hp*100);
    const hpCls = hpPct < 15 ? 'crit' : hpPct < 35 ? 'low' : '';
    const limitOk = cs.hp > 0 && cs.hp/st.hp < 0.3;
    const stTxt = Object.keys(a.statuses).map(s=>STATUS_NAMES[s]).join(' ');
    row.innerHTML = `
      <div class="pm-name">${a.name}${limitOk ? ' <span class="limit-ready">!</span>' : ''}</div>
      <div class="pm-bars">
        <div class="bar hp ${hpCls}"><div style="width:${hpPct}%"></div></div>
        <div class="bar mp"><div style="width:${Math.max(0, cs.mp/st.mp*100)}%"></div></div>
        <div class="bar atb ${a.atb>=ATB_MAX?'full':''}"><div style="width:${Math.min(100, a.atb)}%"></div></div>
      </div>
      <div class="pm-nums">HP ${cs.hp}/${st.hp}<br>MP ${cs.mp}/${st.mp}${stTxt ? '<br>'+stTxt : ''}</div>`;
    row.onclick = ()=>{ if (B.targetMode?.type === 'ally') pickTarget(a); };
    a.dom = row;
    partyEl.appendChild(row);
  }
}

// Aggiorna solo barre e numeri senza ricostruire il DOM (i tap restano stabili)
function updatePartyBars(){
  for (const a of B.allies){
    const row = a.dom;
    if (!row) continue;
    const cs = a.cs, st = a.st;
    row.classList.toggle('ko', cs.hp <= 0);
    row.classList.toggle('active', B.readyQueue[0] === a);
    const hpPct = Math.max(0, cs.hp/st.hp*100);
    const hpBar = row.querySelector('.bar.hp');
    hpBar.classList.toggle('crit', hpPct < 15);
    hpBar.classList.toggle('low', hpPct >= 15 && hpPct < 35);
    hpBar.firstElementChild.style.width = hpPct + '%';
    row.querySelector('.bar.mp').firstElementChild.style.width = Math.max(0, cs.mp/st.mp*100) + '%';
    const atbBar = row.querySelector('.bar.atb');
    atbBar.classList.toggle('full', a.atb >= ATB_MAX);
    atbBar.firstElementChild.style.width = Math.min(100, a.atb) + '%';
    const stTxt = Object.keys(a.statuses).map(s=>STATUS_NAMES[s]).join(' ');
    row.querySelector('.pm-nums').innerHTML = `HP ${cs.hp}/${st.hp}<br>MP ${cs.mp}/${st.mp}${stTxt ? '<br>'+stTxt : ''}`;
    const limitOk = cs.hp > 0 && cs.hp/st.hp < 0.3;
    row.querySelector('.pm-name').innerHTML = `${a.name}${limitOk ? ' <span class="limit-ready">!</span>' : ''}`;
  }
}

// ---------- comandi ----------
let navIdx = 0;
function navButtons(){ return [...cmdList.querySelectorAll('button:not(:disabled)')]; }
function highlightNav(){
  navButtons().forEach((b, i)=>b.classList.toggle('key-sel', i === navIdx));
}
function resetNav(){ navIdx = 0; highlightNav(); }

function showCommands(a){
  B.menuLevel = 'root';
  cmdPanel.classList.remove('hidden');
  cmdTitle.textContent = a.name;
  cmdList.innerHTML = '';
  const mk = (label, cb, dis=false, sub='')=>{
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = label + (sub ? `<small>${sub}</small>` : '');
    b.disabled = dis;
    b.onclick = cb;
    cmdList.appendChild(b);
    return b;
  };
  const limitOk = a.cs.hp / a.st.hp < 0.3;
  if (limitOk){
    const lim = ABILITIES[CHARACTERS[a.id].limit];
    mk(`⚡ ${lim.name}`, ()=>chooseAbility(a, CHARACTERS[a.id].limit)).classList.add('limit-ready');
  }
  mk('Attacca', ()=>chooseAbility(a, 'attacco'));
  mk('Abilità', ()=>showAbilityMenu(a));
  mk('Oggetti', ()=>showItemMenu(a));
  mk('Fuggi', ()=>tryFlee(a), B.boss);
  resetNav();
}

function showAbilityMenu(a){
  B.menuLevel = 'sub';
  cmdTitle.textContent = `${a.name} — abilità`;
  cmdList.innerHTML = '';
  const abs = knownAbilities(a.cs);
  for (const id of abs){
    const ab = ABILITIES[id];
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = `${ab.name}<small>${ab.mp} MP</small>`;
    b.disabled = a.cs.mp < ab.mp;
    b.title = ab.desc || '';
    b.onclick = ()=>chooseAbility(a, id);
    cmdList.appendChild(b);
  }
  const back = document.createElement('button');
  back.className = 'btn btn-dim btn-back-row';
  back.textContent = '◀ Indietro';
  back.onclick = ()=>showCommands(a);
  cmdList.appendChild(back);
  resetNav();
}

function showItemMenu(a){
  B.menuLevel = 'sub';
  cmdTitle.textContent = `${a.name} — oggetti`;
  cmdList.innerHTML = '';
  const usable = Object.keys(G.s.items).filter(id=>G.s.items[id] > 0);
  if (!usable.length){
    const p = document.createElement('div');
    p.style.cssText = 'font-size:12px;color:#9ab;padding:4px';
    p.textContent = 'Nessun oggetto.';
    cmdList.appendChild(p);
  }
  for (const id of usable){
    const it = ITEMS[id];
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = `${it.name}<small>x${G.s.items[id]}</small>`;
    b.onclick = ()=>chooseItem(a, id);
    cmdList.appendChild(b);
  }
  const back = document.createElement('button');
  back.className = 'btn btn-dim btn-back-row';
  back.textContent = '◀ Indietro';
  back.onclick = ()=>showCommands(a);
  cmdList.appendChild(back);
  resetNav();
}

function hideCommands(){ cmdPanel.classList.add('hidden'); }

// ---------- selezione bersaglio ----------
function targetPool(){
  if (!B?.targetMode) return [];
  return B.targetMode.type === 'enemy' ? aliveEnemies() : B.allies;
}

function needTarget(type, cb){
  B.targetMode = { type, cb };
  B.targetIdx = 0;
  log(type === 'enemy' ? 'Scegli un nemico (frecce + Ctrl, o tocca)' : 'Scegli un alleato');
  if (type === 'enemy'){
    const en = aliveEnemies();
    if (en.length === 1){ pickTarget(en[0]); }
  }
}

function pickTarget(t){
  const cb = B.targetMode.cb;
  B.targetMode = null;
  cb(t);
}

function chooseAbility(a, abId){
  const ab = ABILITIES[abId];
  hideCommands();
  const exec = (targets)=>queuePlayerAction(a, abId, targets);
  if (ab.target === 'enemy') needTarget('enemy', t=>exec([t]));
  else if (ab.target === 'enemies') exec(aliveEnemies());
  else if (ab.target === 'ally'){
    if (ab.type === 'revive') {
      const ko = B.allies.filter(x=>x.cs.hp<=0);
      if (!ko.length){ log('Nessun alleato KO!'); showCommands(a); cmdPanel.classList.remove('hidden'); return; }
      needTarget('ally', t=>exec([t]));
    } else needTarget('ally', t=>exec([t]));
  }
  else if (ab.target === 'allies') exec(B.allies);
  else exec([a]); // self
}

function chooseItem(a, itemId){
  hideCommands();
  const it = ITEMS[itemId];
  if (it.type === 'revive'){
    const ko = B.allies.filter(x=>x.cs.hp<=0);
    if (!ko.length){ log('Nessun alleato KO!'); showCommands(a); return; }
  }
  needTarget('ally', t=>queuePlayerAction(a, null, [t], itemId));
}

function tryFlee(a){
  hideCommands();
  a.atb = 0;
  B.readyQueue.shift();
  if (Math.random() < 0.92){
    log('Siete fuggiti!');
    endBattle('flee');
  } else {
    log('Fuga fallita!');
    processQueue();
  }
}

// click/tap sulla scena per scegliere il bersaglio
canvas.addEventListener('pointerdown', e=>{
  if (!B?.targetMode) return;
  const r = canvas.getBoundingClientRect();
  const px = e.clientX - r.left, py = e.clientY - r.top;
  let best = null, bd = 1e9;
  for (const u of targetPool()){
    const d = Math.hypot(px - u.sx, py - (u.sy - u.size*0.45));
    if (d < bd && d < u.size){ bd = d; best = u; }
  }
  if (best) pickTarget(best);
});

// ---------- navigazione tastiera/pad ----------
window.addEventListener('pad-dir', e=>{
  if (currentScreen() !== 'battle' || !B || B.over) return;
  const d = e.detail;
  if (B.targetMode){
    const pool = targetPool();
    if (!pool.length) return;
    if (d === 'up' || d === 'left') B.targetIdx = (B.targetIdx - 1 + pool.length) % pool.length;
    else B.targetIdx = (B.targetIdx + 1) % pool.length;
    sfx('select');
    return;
  }
  if (!cmdPanel.classList.contains('hidden')){
    const btns = navButtons();
    if (!btns.length) return;
    if (d === 'up') navIdx = (navIdx - 1 + btns.length) % btns.length;
    else if (d === 'down') navIdx = (navIdx + 1) % btns.length;
    else return;
    sfx('select');
    highlightNav();
    btns[navIdx].scrollIntoView({ block:'nearest' });
  }
});

window.addEventListener('pad-confirm', ()=>{
  if (currentScreen() !== 'battle' || !B) return;
  if (B.targetMode){
    const pool = targetPool();
    if (pool.length) pickTarget(pool[B.targetIdx % pool.length]);
    return;
  }
  if (!cmdPanel.classList.contains('hidden')){
    navButtons()[navIdx]?.click();
  }
});

window.addEventListener('pad-back', ()=>{
  if (currentScreen() !== 'battle' || !B) return;
  if (B.targetMode){
    // B annulla la mira e torna ai comandi
    const a = B.readyQueue[0];
    B.targetMode = null;
    sfx('cancel');
    if (a?.kind === 'ally') showCommands(a);
    return;
  }
  if (!cmdPanel.classList.contains('hidden') && B.menuLevel === 'sub'){
    sfx('cancel');
    cmdList.querySelector('.btn-back-row')?.click();
  }
});

// ---------- esecuzione azioni ----------
function queuePlayerAction(a, abId, targets, itemId=null){
  B.readyQueue.shift();
  a.atb = 0;
  B.animLock = true;
  if (itemId) execItem(a, itemId, targets[0], ()=>{ B.animLock = false; processQueue(); });
  else execAbility(a, abId, targets, ()=>{ B.animLock = false; processQueue(); });
}

function tickStatusesOnAct(unit){
  // veleno: danno al proprio turno; buff: scala la durata
  if (unit.statuses.veleno){
    const max = unit.kind==='ally' ? unit.st.hp : unit.maxhp;
    const d = Math.max(1, Math.floor(max/16));
    applyDamage(unit, d, false);
    popDamage(unit, d, '');
    log(`${unit.name} soffre per il veleno!`);
  }
  for (const k of Object.keys(unit.buffs)){
    unit.buffs[k].turns--;
    if (unit.buffs[k].turns <= 0) delete unit.buffs[k];
  }
}

function applyDamage(unit, dmg, wake=true){
  if (unit.kind === 'ally'){ unit.cs.hp = Math.max(0, unit.cs.hp - dmg); }
  else { unit.hp = Math.max(0, unit.hp - dmg); }
  if (wake && unit.statuses.sonno){ delete unit.statuses.sonno; }
}

function applyHeal(unit, amount){
  if (unit.kind === 'ally'){ unit.cs.hp = Math.min(unit.st.hp, unit.cs.hp + amount); }
  else { unit.hp = Math.min(unit.maxhp, unit.hp + amount); }
}

function execAbility(user, abId, targets, done){
  const ab = ABILITIES[abId];
  if (user.kind === 'ally' && ab.mp){ user.cs.mp = Math.max(0, user.cs.mp - ab.mp); }
  tickStatusesOnAct(user);
  if (user.kind === 'ally' && user.cs.hp <= 0){ done(); return; } // morto di veleno
  const userName = user.name;
  if (ab.limit){ sfx('limit'); flash('rgba(255,120,160,.5)'); }
  log(abId === 'attacco' ? `${userName} attacca!` : `${userName} usa ${ab.name}!`);
  const singleFoe = targets.length === 1 && targets[0] !== user;
  if (ab.type === 'phys' || ab.type === 'steal'){
    if (singleFoe) animate(user, 'dash', targets[0]);
    else animate(user, 'lunge');
  } else {
    animate(user, 'cast');
  }
  if (ab.type === 'mag'){
    for (const t of targets) fxForSpell(user, t, ab.element);
  } else if (['heal','healall','revive','buff'].includes(ab.type)){
    for (const t of targets){
      spawnFx({ kind:'heal', x1:t.sx, y1:t.sy - t.size*0.5, dur:0.8,
                color: ab.type === 'buff' ? '#ffd76a' : '#a0ffb8' });
    }
  }

  setTimeout(()=>{
    const hits = ab.hits || 1;
    if (ab.type === 'phys' || ab.type === 'mag' || ab.type === 'steal'){
      sfx(ab.type === 'mag' ? 'magic' : 'hit');
      if (ab.type === 'mag') flash('rgba(120,140,255,.30)');
      for (const t of targets){
        if ((t.kind==='enemy' && t.hp<=0) || (t.kind==='ally' && t.cs.hp<=0)) continue;
        let total = 0, anyCrit = false;
        for (let h=0; h<hits; h++){
          const { dmg, crit } = computeDamage(user, t, ab);
          total += dmg; anyCrit = anyCrit || crit;
        }
        applyDamage(t, total);
        animate(t, 'hit');
        if (ab.type !== 'mag'){
          spawnFx({ kind:'slash', x1:t.sx, y1:t.sy - t.size*0.5, dur:0.30,
                    color: ELEM_FX[ab.element] || '#fff' });
        }
        popDamage(t, total, anyCrit ? 'crit' : '');
        if (ab.status && Math.random() < ab.status.chance){
          t.statuses[ab.status.id] = true;
        }
        if (ab.type === 'steal' && t.kind === 'enemy'){
          const loot = Math.floor(t.def.gold * rand(0.3, 0.7));
          G.s.gold += loot;
          log(`${userName} ruba ${loot} oro!`);
        }
      }
    } else if (ab.type === 'heal' || ab.type === 'healall'){
      sfx('heal'); flash('rgba(120,255,160,.25)');
      const userMag = user.kind==='ally' ? user.st.mag : user.mag;
      for (const t of targets){
        if (t.kind==='ally' && t.cs.hp<=0){
          if (ab.revive){ t.cs.hp = Math.floor(t.st.hp * 0.5); popDamage(t, 'Rinato!', 'heal'); }
          continue;
        }
        const amount = Math.round((ab.power||0) + userMag * 1.5);
        applyHeal(t, amount);
        animate(t, 'cast');
        popDamage(t, amount, 'heal');
      }
    } else if (ab.type === 'revive'){
      sfx('heal'); flash('rgba(255,240,160,.35)');
      const t = targets[0];
      if (t.kind==='ally' && t.cs.hp<=0){
        t.cs.hp = Math.floor(t.st.hp * (ab.power || 0.5));
        popDamage(t, 'Rinato!', 'heal');
      } else { log('Non ha effetto...'); }
    } else if (ab.type === 'buff'){
      sfx('magic'); flash('rgba(255,220,120,.25)');
      for (const t of targets){
        if (t.kind==='ally' && t.cs.hp<=0) continue;
        t.buffs[ab.buff.stat] = { mult: ab.buff.mult, turns: ab.buff.turns };
        animate(t, 'cast');
        popDamage(t, (ab.buff.stat==='atk'?'ATK':'DEF')+' ↑', 'heal');
      }
    } else if (ab.type === 'status'){
      sfx('magic');
      for (const t of targets){
        if (ab.status && Math.random() < ab.status.chance){
          t.statuses[ab.status.id] = true;
          popDamage(t, STATUS_NAMES[ab.status.id]+'!', '');
        } else popDamage(t, 'Mancato', '');
      }
    }
    updatePartyBars();
    setTimeout(()=>checkOutcome(done), 480);
  }, 380);
}

function execItem(user, itemId, target, done){
  const it = ITEMS[itemId];
  G.s.items[itemId]--;
  if (G.s.items[itemId] <= 0) delete G.s.items[itemId];
  tickStatusesOnAct(user);
  log(`${user.name} usa ${it.name}!`);
  animate(user, 'cast');
  setTimeout(()=>{
    const cs = target.cs;
    if (it.type === 'heal' && cs.hp > 0){ applyHeal(target, it.power); popDamage(target, it.power, 'heal'); sfx('heal'); }
    else if (it.type === 'mp' && cs.hp > 0){ cs.mp = Math.min(target.st.mp, cs.mp + it.power); popDamage(target, '+'+it.power+' MP', 'heal'); sfx('heal'); }
    else if (it.type === 'full' && cs.hp > 0){ cs.hp = target.st.hp; cs.mp = target.st.mp; popDamage(target, 'MAX!', 'heal'); sfx('heal'); }
    else if (it.type === 'revive' && cs.hp <= 0){ cs.hp = Math.floor(target.st.hp * it.power); popDamage(target, 'Rinato!', 'heal'); sfx('heal'); }
    else if (it.type === 'cure'){ delete target.statuses[it.status]; popDamage(target, 'Curato', 'heal'); sfx('heal'); }
    else { log('Non ha effetto...'); }
    updatePartyBars();
    setTimeout(()=>checkOutcome(done), 380);
  }, 320);
}

// ---------- IA nemica ----------
function enemyAct(e, done){
  tickStatusesOnAct(e);
  if (e.hp <= 0){ done(); return; }
  if (e.statuses.sonno){
    if (Math.random() < 0.4) delete e.statuses.sonno;
    log(`${e.name} dorme...`);
    setTimeout(()=>checkOutcome(done), 500);
    return;
  }
  // fase 2 dei boss finali
  if (e.phase2 && !e.phased && e.hp < e.maxhp * 0.5){
    e.phased = true;
    e.name = e.phase2.name;
    e.pal = e.phase2.pal;
    e.moves = e.phase2.moves;
    refreshEnemySprite(e);
    flash('rgba(200,60,80,.6)'); sfx('limit');
    animate(e, 'cast');
    log(`${e.name} libera il suo vero potere!`);
    setTimeout(done, 900);
    return;
  }
  const pool = [];
  for (const m of e.moves) for (let i=0; i<(m.w||1); i++) pool.push(m);
  const move = pool[Math.floor(Math.random()*pool.length)];
  const targets = move.target === 'enemies' ? aliveAllies()
    : [aliveAllies()[Math.floor(Math.random()*aliveAllies().length)]];
  log(`${e.name}: ${move.name}!`);
  const singleFoe = targets.length === 1;
  if (move.type === 'phys' && singleFoe) animate(e, 'dash', targets[0]);
  else animate(e, move.type === 'phys' ? 'lunge' : 'cast');
  if (move.type === 'mag'){
    for (const t of targets) fxForSpell(e, t, move.element);
  }
  setTimeout(()=>{
    if (move.type === 'status'){
      for (const t of targets){
        if (move.status && Math.random() < move.status.chance){
          t.statuses[move.status.id] = true;
          popDamage(t, STATUS_NAMES[move.status.id]+'!', '');
        } else popDamage(t, 'Mancato', '');
      }
    } else {
      sfx(move.type === 'mag' ? 'magic' : 'hit');
      for (const t of targets){
        if (t.cs.hp <= 0) continue;
        const { dmg, crit } = computeDamage(e, t, move);
        applyDamage(t, dmg);
        animate(t, 'hit');
        if (move.type === 'phys'){
          spawnFx({ kind:'slash', x1:t.sx, y1:t.sy - t.size*0.5, dur:0.30,
                    color: ELEM_FX[move.element] || '#fff' });
        }
        if (move.status && Math.random() < move.status.chance) t.statuses[move.status.id] = true;
        popDamage(t, dmg, crit ? 'crit' : '');
      }
    }
    updatePartyBars();
    setTimeout(()=>checkOutcome(done), 480);
  }, 420);
}

// ---------- flusso ----------
function checkOutcome(elseCb){
  if (!aliveEnemies().length){ victory(); return; }
  if (!aliveAllies().length){ defeat(); return; }
  elseCb?.();
}

function processQueue(){
  if (!B || B.over) return;
  updatePartyBars();
  if (B.animLock) return;
  const next = B.readyQueue[0];
  if (!next) return;
  if (next.kind === 'ally'){
    if (next.cs.hp <= 0){ B.readyQueue.shift(); next.atb = 0; processQueue(); return; }
    if (next.statuses.sonno){
      B.readyQueue.shift(); next.atb = 0;
      if (Math.random() < 0.4) delete next.statuses.sonno;
      log(`${next.name} dorme...`);
      return;
    }
    showCommands(next);
  } else {
    B.readyQueue.shift();
    next.atb = 0;
    B.animLock = true;
    enemyAct(next, ()=>{ B.animLock = false; processQueue(); });
  }
}

function tick(){
  if (!B || B.over) return;
  const choosing = B.readyQueue[0]?.kind === 'ally' && !B.animLock;
  for (const u of [...B.allies, ...B.enemies]){
    const dead = u.kind==='ally' ? u.cs.hp<=0 : u.hp<=0;
    if (dead || u.atb >= ATB_MAX) continue;
    if (B.animLock) continue;
    if (choosing && u.kind === 'enemy') { /* i nemici caricano comunque */ }
    const spd = u.kind==='ally' ? u.st.spd : u.spd;
    u.atb += (4 + spd * 0.35) * (TICK_MS/100) * (u.kind==='ally' ? 1.3 : 1);
    if (u.atb >= ATB_MAX){
      u.atb = ATB_MAX;
      if (!B.readyQueue.includes(u)) B.readyQueue.push(u);
    }
  }
  if (!B.animLock && B.readyQueue.length && cmdPanel.classList.contains('hidden') && !B.targetMode){
    processQueue();
  } else {
    updatePartyBars();
  }
}

// ---------- esiti ----------
function victory(){
  if (B.over) return;
  B.over = true;
  B.victory = true;   // gli eroi festeggiano saltellando
  B.targetMode = null;
  stopMusic();
  sfx('victory');
  hideCommands();
  let exp = 0, gold = 0;
  for (const e of B.enemies){ exp += e.def.exp; gold += e.def.gold; }
  G.s.gold += gold;
  const lines = [`VITTORIA! ${exp} EXP, ${gold} oro.`];
  // avanzamento delle missioni secondarie di caccia
  for (const e of B.enemies){
    for (const prog of registerKill(G.s, e.id)){
      lines.push(`📜 ${prog.name}: ${prog.count}/${prog.need}`);
      if (prog.count >= prog.need) lines.push(`📜 «${prog.name}»: obiettivo raggiunto! Torna dal committente.`);
    }
  }
  for (const id of G.s.party){
    const cs = G.s.chars[id];
    if (cs.hp <= 0) continue;
    const res = gainExp(cs, exp);
    if (res.levels > 0){
      lines.push(`${CHARACTERS[id].name} sale al livello ${cs.level}!`);
      for (const ab of res.learned) lines.push(`✨ ${CHARACTERS[id].name} impara ${abilityName(ab)}!`);
      sfx('levelup');
    }
  }
  for (const id of G.s.reserve){
    const res = gainExp(G.s.chars[id], Math.floor(exp/2));
    if (res.levels > 0) lines.push(`${CHARACTERS[id].name} (riserva) sale al livello ${G.s.chars[id].level}!`);
  }
  // pulizia status di fine battaglia
  for (const id of Object.keys(G.s.chars)){
    const cs = G.s.chars[id];
    if (cs.hp <= 0) cs.hp = 1; // i KO si rialzano con 1 HP a fine scontro
  }
  showResults(lines, ()=>{ B.onWin?.(); });
}

function defeat(){
  if (B.over) return;
  B.over = true;
  hideCommands();
  sfx('die');
  setTimeout(()=>show('gameover'), 900);
}

function endBattle(kind){
  B.over = true;
  hideCommands();
  setTimeout(()=>{ kind==='flee' ? (B.onFlee?.() ?? B.onWin?.()) : B.onWin?.(); }, 500);
}

function showResults(lines, done){
  B.menuLevel = 'root';
  cmdPanel.classList.remove('hidden');
  cmdTitle.textContent = 'Risultato';
  cmdList.innerHTML = '';
  const p = document.createElement('div');
  p.style.cssText = 'font-size:12px;line-height:1.6;padding:2px';
  p.innerHTML = lines.join('<br>');
  cmdList.appendChild(p);
  const b = document.createElement('button');
  b.className = 'btn';
  b.textContent = 'Continua ▶';
  b.onclick = done;
  cmdList.appendChild(b);
  resetNav();
}

// ---------- schermata ----------
registerScreen('battle', {
  el,
  enter(params){
    B = {
      enemies: params.monsterIds.map((id,i)=>makeEnemy(id,i)),
      allies: G.s.party.map(makeAlly),
      boss: !!params.boss,
      area: params.area || 'varese',
      onWin: params.onWin,
      onFlee: params.onFlee,
      readyQueue: [],
      fx: [],
      victory: false,
      animLock: false,
      targetMode: null,
      targetIdx: 0,
      menuLevel: 'root',
      over: false,
      W: 800, H: 360,
    };
    // transizione a vortice in stile FF
    const swirl = document.createElement('div');
    swirl.className = 'battle-swirl';
    el.appendChild(swirl);
    setTimeout(()=>swirl.remove(), 1000);
    hideCommands();
    popsEl.innerHTML = '';
    logEl.textContent = B.boss ? '⚠ Nemico potente!' : 'Nemici in arrivo!';
    renderParty();
    // la scena va costruita quando la schermata è visibile (per le dimensioni)
    requestAnimationFrame(()=>{ buildScene(); });
    playMusic(B.boss ? 'boss' : 'battle');
    clearInterval(B.timer);
    B.timer = setInterval(tick, TICK_MS);
    lastTs = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(sceneLoop);
  },
  exit(){
    if (B?.timer) clearInterval(B.timer);
    cancelAnimationFrame(raf);
  },
});

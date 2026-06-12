// Rendering vettoriale procedurale in stile mobile moderno: tile, eroi, mostri.
// Tutto è disegnato a runtime con gradienti e forme morbide — nessun asset esterno.

export const TILE = 48;

// ---------- utilità colore e forme ----------
function col(c, f){ // schiarisce (f>0) o scurisce (f<0) un colore esadecimale
  let h = String(c).replace('#','');
  if (h.length === 3) h = h.split('').map(x=>x+x).join('');
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return c;
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  const r = Math.round(((n>>16)&255)*(1-p)+t*p);
  const g = Math.round(((n>>8)&255)*(1-p)+t*p);
  const b = Math.round((n&255)*(1-p)+t*p);
  return `rgb(${r},${g},${b})`;
}

function rr(x, cx, cy, w, h, r){ // path rettangolo arrotondato
  x.beginPath();
  x.moveTo(cx+r, cy);
  x.arcTo(cx+w, cy, cx+w, cy+h, r);
  x.arcTo(cx+w, cy+h, cx, cy+h, r);
  x.arcTo(cx, cy+h, cx, cy, r);
  x.arcTo(cx, cy, cx+w, cy, r);
  x.closePath();
}

function ell(x, cx, cy, rx, ry, fill){
  x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
  x.fillStyle = fill; x.fill();
}

function circ(x, cx, cy, r, fill){
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI*2);
  x.fillStyle = fill; x.fill();
}

function lg(x, x0, y0, x1, y1, stops){
  const g = x.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function rg(x, cx, cy, r, stops){
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function srand(seed){ // generatore deterministico per i dettagli dei tile
  let s = (seed >>> 0) || 1;
  return ()=>{ s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
}

// ---------- cache dei tile (pre-renderizzati una volta sola) ----------
const tileCache = new Map();
function tileSprite(key, painter){
  let c = tileCache.get(key);
  if (!c){
    c = document.createElement('canvas');
    c.width = TILE; c.height = TILE;
    painter(c.getContext('2d'));
    tileCache.set(key, c);
  }
  return c;
}
function hashv(tx, ty){ return (((tx|0)*73856093) ^ ((ty|0)*19349663)) >>> 0; }

// ---------- pittori dei tile ----------
function paintGrass(x, v, tall){
  x.fillStyle = lg(x, 0, 0, 0, TILE, tall
    ? [[0,'#3e7c32'],[1,'#346a29']]
    : [[0,'#56a148'],[1,'#4b9040']]);
  x.fillRect(0, 0, TILE, TILE);
  const r = srand(v*977+31);
  const n = tall ? 12 : 6;
  for (let i=0; i<n; i++){
    const bx = 3 + r()*(TILE-6), by = 10 + r()*(TILE-12);
    const h = tall ? 7 + r()*7 : 3.5 + r()*4;
    x.strokeStyle = i%2 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.16)';
    x.lineWidth = 1.6; x.lineCap = 'round';
    x.beginPath(); x.moveTo(bx, by);
    x.quadraticCurveTo(bx+1.5, by-h*0.6, bx + (r()*5-2.5), by-h);
    x.stroke();
  }
  if (tall){ // velo scuro per distinguere la zona incontri
    x.fillStyle = 'rgba(10,30,8,.10)';
    x.fillRect(0, 0, TILE, TILE);
  }
}

function paintRoad(x){
  x.fillStyle = lg(x, 0, 0, 0, TILE, [[0,'#c9ab78'],[1,'#b6976a']]);
  x.fillRect(0, 0, TILE, TILE);
  const r = srand(421);
  for (let i=0; i<7; i++){
    ell(x, 4+r()*40, 4+r()*40, 2.5+r()*2.5, 1.6+r()*1.6,
        i%2 ? 'rgba(255,255,255,.12)' : 'rgba(80,55,25,.14)');
  }
}

function paintPave(x){
  x.fillStyle = lg(x, 0, 0, 0, TILE, [[0,'#a8aebc'],[1,'#959aa9']]);
  x.fillRect(0, 0, TILE, TILE);
  const r = srand(77);
  for (let row=0; row<3; row++){
    const off = row%2 ? -8 : 0;
    for (let cn=0; cn<4; cn++){
      const bx = off + cn*16 + 1, by = row*16 + 1;
      rr(x, bx, by, 14, 14, 4);
      x.fillStyle = `rgba(255,255,255,${.04 + r()*.08})`;
      x.fill();
      x.strokeStyle = 'rgba(40,44,60,.25)'; x.lineWidth = 1; x.stroke();
    }
  }
}

function paintWater(x, f){
  x.fillStyle = lg(x, 0, 0, 0, TILE, [[0,'#2f80c9'],[1,'#1e5da1']]);
  x.fillRect(0, 0, TILE, TILE);
  const ph = (f/4) * Math.PI * 2;
  x.lineWidth = 2; x.lineCap = 'round';
  for (const [row, al] of [[13,.28],[27,.20],[40,.24]]){
    x.strokeStyle = `rgba(255,255,255,${al})`;
    x.beginPath();
    for (let i=0; i<=TILE; i+=4){
      const yy = row + Math.sin((i/TILE)*Math.PI*2 + ph + row) * 2.6;
      i ? x.lineTo(i, yy) : x.moveTo(i, yy);
    }
    x.stroke();
  }
  x.fillStyle = 'rgba(255,255,255,.06)';
  x.fillRect(0, 0, TILE, 9);
}

function paintBridge(x){
  paintWater(x, 0);
  x.fillStyle = lg(x, 0, 6, 0, 42, [[0,'#9a6c38'],[1,'#75502a']]);
  x.fillRect(0, 6, TILE, 36);
  x.strokeStyle = 'rgba(50,30,12,.5)'; x.lineWidth = 1.5;
  for (let i=8; i<TILE; i+=10){
    x.beginPath(); x.moveTo(i, 7); x.lineTo(i, 41); x.stroke();
  }
  x.fillStyle = '#5d3f20';
  x.fillRect(0, 4, TILE, 4); x.fillRect(0, 40, TILE, 4);
  x.fillStyle = 'rgba(255,255,255,.12)';
  x.fillRect(0, 4, TILE, 1.5);
}

function paintMountain(x){
  x.fillStyle = lg(x, 0, 0, 0, TILE, [[0,'#6b6354'],[1,'#534c40']]);
  x.fillRect(0, 0, TILE, TILE);
  // picco secondario
  x.fillStyle = '#5e564a';
  x.beginPath(); x.moveTo(-4, 46); x.lineTo(14, 16); x.lineTo(32, 46); x.closePath(); x.fill();
  // picco principale
  x.fillStyle = lg(x, 0, 6, 0, 46, [[0,'#8d8474'],[1,'#675f51']]);
  x.beginPath(); x.moveTo(8, 46); x.lineTo(30, 5); x.lineTo(52, 46); x.closePath(); x.fill();
  // versante in ombra
  x.fillStyle = 'rgba(30,26,20,.30)';
  x.beginPath(); x.moveTo(30, 5); x.lineTo(52, 46); x.lineTo(30, 46); x.closePath(); x.fill();
  // neve
  x.fillStyle = '#eef2f4';
  x.beginPath(); x.moveTo(24, 16); x.lineTo(30, 5); x.lineTo(36, 16);
  x.lineTo(33, 14); x.lineTo(30, 18); x.lineTo(27, 14); x.closePath(); x.fill();
}

function paintTree(x){
  paintGrass(x, 0, false);
  ell(x, 24, 42, 13, 4.5, 'rgba(0,0,0,.25)');
  x.fillStyle = lg(x, 20, 0, 28, 0, [[0,'#7a5126'],[1,'#5d3c1b']]);
  rr(x, 21, 28, 7, 15, 3); x.fill();
  const leaf = (cx, cy, r)=>{
    x.fillStyle = rg(x, cx-r*0.35, cy-r*0.4, r*1.5, [[0,'#56b246'],[0.6,'#3a8a30'],[1,'#2c6e24']]);
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI*2); x.fill();
  };
  leaf(16, 24, 10); leaf(32, 24, 10); leaf(24, 14, 12);
  ell(x, 19, 11, 4, 2.5, 'rgba(255,255,255,.22)');
}

function paintWall(x){
  x.fillStyle = lg(x, 0, 0, 0, TILE, [[0,'#9b7c5f'],[1,'#7c6048']]);
  x.fillRect(0, 0, TILE, TILE);
  const r = srand(913);
  for (let row=0; row<4; row++){
    const off = row%2 ? -10 : 0;
    for (let cn=0; cn<4; cn++){
      const bx = off + cn*20 + 1, by = row*12 + 1;
      rr(x, bx, by, 18, 10, 2.5);
      x.fillStyle = `rgba(255,235,210,${.05 + r()*.07})`;
      x.fill();
      x.strokeStyle = 'rgba(50,32,18,.35)'; x.lineWidth = 1; x.stroke();
    }
  }
  x.fillStyle = 'rgba(255,255,255,.10)';
  x.fillRect(0, 0, TILE, 3);
}

function paintDoor(x){
  paintWall(x);
  x.fillStyle = 'rgba(30,18,8,.55)';
  rr(x, 8, 8, 32, 40, 14); x.fill();
  x.fillStyle = lg(x, 0, 10, 0, 46, [[0,'#9a6531'],[1,'#5f3b1a']]);
  rr(x, 11, 11, 26, 37, 11); x.fill();
  x.strokeStyle = 'rgba(40,22,8,.6)'; x.lineWidth = 1.5;
  x.beginPath(); x.moveTo(24, 12); x.lineTo(24, 47); x.stroke();
  circ(x, 30, 30, 2.6, '#ffd76a');
}

function paintFlowers(x){
  paintGrass(x, 2, false);
  const flower = (cx, cy, c)=>{
    x.strokeStyle = '#2e6e26'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(cx, cy+3); x.lineTo(cx, cy+8); x.stroke();
    for (let i=0; i<5; i++){
      const a = i/5 * Math.PI*2;
      circ(x, cx + Math.cos(a)*3, cy + Math.sin(a)*3, 2.4, c);
    }
    circ(x, cx, cy, 2, '#fff3c0');
  };
  flower(12, 14, '#ef7d9d'); flower(34, 12, '#ffd166');
  flower(16, 34, '#b58df2'); flower(37, 33, '#f3f3f3');
}

function paintTown(x){
  paintGrass(x, 1, false);
  const house = (bx, by, w, h, roof)=>{
    ell(x, bx+w/2, by+h+2, w*0.55, 3, 'rgba(0,0,0,.22)');
    x.fillStyle = lg(x, 0, by, 0, by+h, [[0,'#efe2c8'],[1,'#cdbb9a']]);
    rr(x, bx, by, w, h, 2); x.fill();
    x.fillStyle = lg(x, 0, by-8, 0, by+2, [[0,'#d2543c'],[1,'#a83b28']]);
    x.beginPath();
    x.moveTo(bx-3, by+1); x.lineTo(bx+w/2, by-9); x.lineTo(bx+w+3, by+1);
    x.closePath(); x.fill();
    // finestra calda
    x.save();
    x.shadowColor = '#ffd87a'; x.shadowBlur = 5;
    x.fillStyle = '#ffd87a';
    x.fillRect(bx+w*0.58, by+h*0.3, w*0.22, h*0.3);
    x.restore();
    x.fillStyle = '#5d3c1b';
    rr(x, bx+w*0.18, by+h*0.4, w*0.2, h*0.6, 2); x.fill();
  };
  house(4, 18, 19, 16);
  house(26, 24, 18, 14);
}

function paintGateS(x){ // porta del Sacro Monte
  x.fillStyle = lg(x, 0, 0, 0, TILE, [[0,'#4c463c'],[1,'#36312a']]);
  x.fillRect(0, 0, TILE, TILE);
  x.fillStyle = rg(x, 24, 26, 26, [[0,'rgba(255,224,130,.95)'],[0.55,'rgba(255,196,80,.5)'],[1,'rgba(255,180,60,0)']]);
  x.fillRect(0, 0, TILE, TILE);
  x.strokeStyle = '#ffd76a'; x.lineWidth = 3; x.lineCap = 'round';
  x.beginPath();
  x.moveTo(12, 44); x.lineTo(12, 22); x.arc(24, 22, 12, Math.PI, 0); x.lineTo(36, 44);
  x.stroke();
  x.fillStyle = 'rgba(20,12,40,.85)';
  x.beginPath();
  x.moveTo(15, 44); x.lineTo(15, 23); x.arc(24, 23, 9, Math.PI, 0); x.lineTo(33, 44);
  x.closePath(); x.fill();
  for (const [sx, sy] of [[8,10],[40,8],[34,38],[10,36]]) circ(x, sx, sy, 1.4, '#ffe9a8');
}

function paintGateA(x){ // porta dell'Accademia
  paintWall(x);
  x.fillStyle = 'rgba(15,18,40,.5)';
  rr(x, 6, 6, 36, 42, 16); x.fill();
  x.fillStyle = lg(x, 0, 8, 0, 48, [[0,'#41599f'],[1,'#222f57']]);
  rr(x, 9, 9, 30, 39, 13); x.fill();
  x.strokeStyle = '#e8c558'; x.lineWidth = 2;
  rr(x, 12, 12, 24, 33, 10); x.stroke();
  x.save();
  x.shadowColor = '#ffe9a8'; x.shadowBlur = 6;
  circ(x, 24, 24, 4.5, '#e8c558');
  x.restore();
}

// ---------- drawTile pubblico ----------
export function drawTile(ctx, ch, x, y, t, tx=0, ty=0){
  let key = ch, painter = null;
  switch(ch){
    case '.': { const v = hashv(tx,ty)&3; key = '.'+v; painter = c=>paintGrass(c, v, false); break; }
    case ',': { const v = hashv(tx,ty)&3; key = ','+v; painter = c=>paintGrass(c, v, true); break; }
    case '~': { const f = Math.floor(t/260)&3; key = '~'+f; painter = c=>paintWater(c, f); break; }
    case '=': painter = paintRoad; break;
    case ':': painter = paintPave; break;
    case 'B': painter = paintBridge; break;
    case '^': painter = paintMountain; break;
    case 'T': painter = paintTree; break;
    case '#': painter = paintWall; break;
    case 'D': painter = paintDoor; break;
    case 'F': painter = paintFlowers; break;
    case '1': case '2': case '3': case '4': case '5': key = 'town'; painter = paintTown; break;
    case 'S': painter = paintGateS; break;
    case 'A': painter = paintGateA; break;
    default:
      ctx.fillStyle = '#0a0c16';
      ctx.fillRect(x, y, TILE, TILE);
      return;
  }
  ctx.drawImage(tileSprite(key, painter), x, y);
}

export const BLOCKED = new Set(['~','^','T','#',' ']);

// ---------- eroi e NPC sulla mappa ----------
// `who` può essere un colore (NPC generici) oppure { color, look } di un personaggio.
// `phase` è la fase di camminata (float, 1 = un ciclo completo); 0 = fermo.
export function drawActor(ctx, x, y, who, dir, phase=0){
  const color = typeof who === 'string' ? who : who.color;
  const look = (typeof who === 'object' && who.look) ? who.look : {};
  const hair = look.hair || '#3b2c20';
  const eyes = look.eyes || '#1d2030';
  const skin = '#f2c99c';
  const sw = Math.sin(phase * Math.PI * 2);       // oscillazione gambe/braccia
  const bob = -Math.abs(sw) * 1.7;                // molleggio del passo
  const cx = x + TILE/2;
  const feet = y + 44;
  const top = y + (look.h === 'tall' ? 3 : look.h === 'short' ? 12 : 7) + bob;
  const headR = look.h === 'short' ? 7 : 8;
  const headCy = top + headR;
  const bodyW = look.build === 'wide' ? 21 : 16;
  const bodyTop = headCy + headR - 2;
  const bodyH = feet - 8 - bodyTop;
  const side = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;

  // ombra (resta a terra, si stringe sul passo)
  ell(ctx, cx, feet, 11 - Math.abs(sw)*1.5, 4, 'rgba(0,0,0,.28)');

  // gambe + scarpe
  const legL = feet - 9 - Math.max(0,  sw) * 2.4;
  const legR = feet - 9 - Math.max(0, -sw) * 2.4;
  ctx.fillStyle = '#2d3148';
  rr(ctx, cx-7 + sw*1.2, legL, 6, feet-2-legL, 2.5); ctx.fill();
  rr(ctx, cx+1 - sw*1.2, legR, 6, feet-2-legR, 2.5); ctx.fill();
  ctx.fillStyle = '#4a3526';
  rr(ctx, cx-7.5 + sw*1.2, feet-4 - Math.max(0,sw)*2.4, 7, 3.4, 1.6); ctx.fill();
  rr(ctx, cx+0.5 - sw*1.2, feet-4 - Math.max(0,-sw)*2.4, 7, 3.4, 1.6); ctx.fill();

  // braccia (oscillano in controfase) + mani
  const armC = look.tattoo ? skin : col(color, -0.2);
  const armY = bodyTop + 2;
  const armH = bodyH * 0.68;
  ctx.fillStyle = armC;
  rr(ctx, cx-bodyW/2-4.2, armY - sw*1.8, 4.5, armH, 2.2); ctx.fill();
  rr(ctx, cx+bodyW/2-0.3, armY + sw*1.8, 4.5, armH, 2.2); ctx.fill();
  circ(ctx, cx-bodyW/2-2, armY - sw*1.8 + armH + 1, 2.2, skin);
  circ(ctx, cx+bodyW/2+2, armY + sw*1.8 + armH + 1, 2.2, skin);
  if (look.tattoo){
    ctx.strokeStyle = 'rgba(40,80,130,.85)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx-bodyW/2-3.8, armY+3 - sw*1.8); ctx.lineTo(cx-bodyW/2-0.4, armY+6 - sw*1.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+bodyW/2+0.1, armY+4 + sw*1.8); ctx.lineTo(cx+bodyW/2+3.5, armY+7 + sw*1.8); ctx.stroke();
  }

  // tunica: corpo con colletto, cintura e orlo
  ctx.fillStyle = lg(ctx, cx-bodyW/2, bodyTop, cx+bodyW/2, bodyTop+bodyH,
    [[0, col(color, 0.22)], [0.5, color], [1, col(color, -0.22)]]);
  rr(ctx, cx-bodyW/2, bodyTop, bodyW, bodyH, 5); ctx.fill();
  // colletto a V
  ctx.fillStyle = col(color, 0.35);
  ctx.beginPath();
  ctx.moveTo(cx-4.5, bodyTop); ctx.lineTo(cx, bodyTop+4.5); ctx.lineTo(cx+4.5, bodyTop);
  ctx.closePath(); ctx.fill();
  // cintura con fibbia
  ctx.fillStyle = 'rgba(35,25,15,.75)';
  rr(ctx, cx-bodyW/2, bodyTop+bodyH*0.58, bodyW, 3.2, 1.5); ctx.fill();
  circ(ctx, cx, bodyTop+bodyH*0.58+1.6, 1.7, '#ffd76a');
  // orlo più scuro
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  rr(ctx, cx-bodyW/2, bodyTop+bodyH-3, bodyW, 3, 2); ctx.fill();
  // luce sulla spalla
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  rr(ctx, cx-bodyW/2+2, bodyTop+1.2, bodyW*0.45, 2.6, 1.5); ctx.fill();

  // testa
  ctx.fillStyle = rg(ctx, cx-2+side*2, headCy-3, headR*1.9, [[0, col(skin, 0.14)], [1, col(skin, -0.07)]]);
  ctx.beginPath(); ctx.arc(cx, headCy, headR, 0, Math.PI*2); ctx.fill();

  // capelli
  const hairHi = col(hair, 0.28);
  if (dir === 'up' && !look.bald){
    ctx.fillStyle = hair;
    ctx.beginPath(); ctx.arc(cx, headCy, headR+0.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = hairHi;
    ctx.beginPath(); ctx.arc(cx-2, headCy-2.5, headR*0.45, 0, Math.PI*2); ctx.fill();
    if (look.longHair){
      ctx.fillStyle = hair;
      rr(ctx, cx-headR+1, headCy, headR*2-2, headR+8, 5); ctx.fill();
      ctx.fillStyle = hairHi;
      rr(ctx, cx-2.5, headCy+2, 1.6, headR+4, 1); ctx.fill();
    }
  } else if (look.bald){
    // rasato: solo un riflesso sulla pelle
    ell(ctx, cx-2.5, headCy-headR*0.5, 2.6, 1.6, 'rgba(255,255,255,.30)');
  } else if (look.baldTop){
    ctx.fillStyle = hair;
    ctx.beginPath(); ctx.arc(cx, headCy, headR+0.4, Math.PI*0.72, Math.PI*1.32); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, headCy, headR+0.4, Math.PI*1.68, Math.PI*0.28); ctx.fill();
    ell(ctx, cx-2.5, headCy-headR*0.55, 2.6, 1.6, 'rgba(255,255,255,.28)');
  } else {
    // calotta con frangia irregolare
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(cx, headCy-0.5, headR+0.8, Math.PI*0.97, Math.PI*2.03);
    ctx.quadraticCurveTo(cx+headR*0.5, headCy-headR*0.2, cx+headR*0.25, headCy-headR*0.45);
    ctx.quadraticCurveTo(cx, headCy-headR*0.1, cx-headR*0.3, headCy-headR*0.45);
    ctx.quadraticCurveTo(cx-headR*0.65, headCy-headR*0.15, cx-headR*0.8, headCy-headR*0.5);
    ctx.closePath(); ctx.fill();
    // riflesso
    ctx.strokeStyle = hairHi; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx-1, headCy-1, headR*0.62, Math.PI*1.15, Math.PI*1.65); ctx.stroke();
    if (look.longHair){
      ctx.fillStyle = hair;
      ctx.beginPath(); // ciocca sinistra
      ctx.moveTo(cx-headR-0.5, headCy-2);
      ctx.quadraticCurveTo(cx-headR-2.5 - sw*0.8, headCy+6, cx-headR-0.5 - sw*0.8, headCy+headR+7);
      ctx.quadraticCurveTo(cx-headR+2.5, headCy+headR+6, cx-headR+2.5, headCy+2);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); // ciocca destra
      ctx.moveTo(cx+headR+0.5, headCy-2);
      ctx.quadraticCurveTo(cx+headR+2.5 + sw*0.8, headCy+6, cx+headR+0.5 + sw*0.8, headCy+headR+7);
      ctx.quadraticCurveTo(cx+headR-2.5, headCy+headR+6, cx+headR-2.5, headCy+2);
      ctx.closePath(); ctx.fill();
    }
  }

  // barba
  if (look.beard && dir !== 'up'){
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(cx, headCy+1.5, headR-0.8, Math.PI*0.12, Math.PI*0.88);
    if (look.beard >= 2) ctx.quadraticCurveTo(cx, headCy+headR+4.5, cx-3, headCy+headR-1);
    ctx.closePath(); ctx.fill();
  }

  // volto
  if (dir !== 'up'){
    const eo = side * 1.8;
    ell(ctx, cx-3+eo, headCy+0.6, 1.9, 2.2, '#fff');
    ell(ctx, cx+3+eo, headCy+0.6, 1.9, 2.2, '#fff');
    circ(ctx, cx-3+eo+side*0.5, headCy+0.8, 1.15, eyes);
    circ(ctx, cx+3+eo+side*0.5, headCy+0.8, 1.15, eyes);
    if (!look.beard){
      ctx.strokeStyle = 'rgba(140,70,50,.6)'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(cx+eo*0.5, headCy+3.4, 1.9, Math.PI*0.2, Math.PI*0.8); ctx.stroke();
    }
  }
}

// Ritratto grande per il menu
export function drawPortrait(canvas, character){
  const S = 140;
  canvas.width = S; canvas.height = S;
  const x = canvas.getContext('2d');
  const look = character.look || {};
  const hair = look.hair || '#3b2c20';
  const eyes = look.eyes || '#1d2030';
  const skin = '#f2c99c';

  // sfondo
  x.fillStyle = rg(x, S/2, S*0.4, S*0.75, [[0, col(character.color, 0.05)], [1, col(character.color, -0.55)]]);
  x.fillRect(0, 0, S, S);
  x.fillStyle = 'rgba(255,255,255,.06)';
  x.beginPath(); x.arc(S/2, S*0.45, S*0.42, 0, Math.PI*2); x.fill();

  const cx = S/2, headR = look.h === 'short' ? 30 : 33, headCy = 58;

  // spalle / busto
  const shW = look.build === 'wide' ? 108 : 88;
  x.fillStyle = lg(x, 0, 96, 0, S, [[0, col(character.color, 0.2)], [1, col(character.color, -0.2)]]);
  rr(x, cx-shW/2, 97, shW, 50, 18); x.fill();
  x.fillStyle = 'rgba(255,255,255,.15)';
  rr(x, cx-shW/2+6, 100, shW-12, 7, 4); x.fill();

  // collo
  x.fillStyle = col(skin, -0.05);
  x.fillRect(cx-8, headCy+headR-8, 16, 18);

  // testa
  x.fillStyle = rg(x, cx-8, headCy-10, headR*1.9, [[0, col(skin, 0.14)], [1, col(skin, -0.07)]]);
  x.beginPath(); x.arc(cx, headCy, headR, 0, Math.PI*2); x.fill();

  // capelli
  x.fillStyle = hair;
  if (look.bald){
    // rasato
  } else if (look.baldTop){
    x.beginPath(); x.arc(cx, headCy, headR+1, Math.PI*0.78, Math.PI*1.18); x.lineTo(cx, headCy); x.fill();
    x.beginPath(); x.arc(cx, headCy, headR+1, Math.PI*1.82, Math.PI*0.22); x.lineTo(cx, headCy); x.fill();
  } else {
    x.beginPath(); x.arc(cx, headCy-2, headR+2.5, Math.PI*0.93, Math.PI*2.07); x.fill();
    if (look.longHair){
      rr(x, cx-headR-6, headCy-10, 13, headR+48, 6); x.fill();
      rr(x, cx+headR-7, headCy-10, 13, headR+48, 6); x.fill();
    }
  }

  // barba
  if (look.beard){
    x.fillStyle = hair;
    x.beginPath();
    x.arc(cx, headCy+6, headR-4, Math.PI*0.12, Math.PI*0.88);
    if (look.beard >= 2) x.lineTo(cx, headCy+headR+12);
    x.closePath(); x.fill();
  }

  // occhi, sopracciglia, bocca
  for (const s of [-1, 1]){
    ell(x, cx+s*12, headCy+2, 5, 6, '#fff');
    circ(x, cx+s*12, headCy+3, 3.4, eyes);
    circ(x, cx+s*11, headCy+1.5, 1.2, '#fff');
    x.strokeStyle = hair === '#3b2c20' ? '#2c2118' : hair;
    x.lineWidth = 2.4; x.lineCap = 'round';
    x.beginPath(); x.moveTo(cx+s*6, headCy-7); x.lineTo(cx+s*17, headCy-8.5); x.stroke();
  }
  x.strokeStyle = 'rgba(150,75,55,.8)'; x.lineWidth = 2;
  x.beginPath(); x.arc(cx, headCy+14, 6.5, Math.PI*0.12, Math.PI*0.88); x.stroke();
  // naso
  x.strokeStyle = 'rgba(120,80,50,.45)'; x.lineWidth = 1.6;
  x.beginPath(); x.moveTo(cx, headCy+4); x.lineTo(cx-2, headCy+9); x.stroke();
}

export function drawChest(ctx, x, y, opened){
  ell(ctx, x+24, y+42, 13, 4, 'rgba(0,0,0,.25)');
  if (opened){
    ctx.fillStyle = lg(ctx, 0, y+18, 0, y+42, [[0,'#6e4f2c'],[1,'#4d361d']]);
    rr(ctx, x+8, y+20, 32, 21, 5); ctx.fill();
    ctx.fillStyle = '#241407';
    rr(ctx, x+11, y+22, 26, 9, 4); ctx.fill();
    ctx.fillStyle = '#8a6334';
    rr(ctx, x+7, y+10, 34, 8, 4); ctx.fill();
  } else {
    ctx.fillStyle = lg(ctx, 0, y+14, 0, y+42, [[0,'#a3743c'],[1,'#6e4a22']]);
    rr(ctx, x+8, y+14, 32, 27, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    rr(ctx, x+10, y+15.5, 28, 6, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(60,36,12,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x+8, y+25); ctx.lineTo(x+40, y+25); ctx.stroke();
    ctx.save();
    ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffd76a';
    rr(ctx, x+21, y+22, 6, 8, 2); ctx.fill();
    ctx.restore();
  }
}

// ---------- mostri (vettoriali) ----------
function shadow(x, S, w=0.34){ ell(x, S/2, S*0.9, S*w, S*0.05, 'rgba(0,0,0,.3)'); }

const MDRAW = {
  slime(x, p, S){
    const u = S/100;
    shadow(x, S);
    x.fillStyle = rg(x, 42*u, 42*u, 70*u, [[0, col(p.a, 0.35)], [0.7, p.a], [1, col(p.a, -0.25)]]);
    x.beginPath();
    x.moveTo(16*u, 86*u);
    x.bezierCurveTo(10*u, 50*u, 28*u, 26*u, 50*u, 26*u);
    x.bezierCurveTo(72*u, 26*u, 90*u, 50*u, 84*u, 86*u);
    // gocce sul fondo
    x.bezierCurveTo(76*u, 90*u, 68*u, 84*u, 60*u, 88*u);
    x.bezierCurveTo(52*u, 92*u, 44*u, 84*u, 36*u, 88*u);
    x.bezierCurveTo(28*u, 92*u, 20*u, 90*u, 16*u, 86*u);
    x.closePath(); x.fill();
    ell(x, 36*u, 40*u, 11*u, 6*u, 'rgba(255,255,255,.4)');
    circ(x, 40*u, 56*u, 4.5*u, '#1d2030'); circ(x, 60*u, 56*u, 4.5*u, '#1d2030');
    circ(x, 38.5*u, 54.5*u, 1.5*u, '#fff'); circ(x, 58.5*u, 54.5*u, 1.5*u, '#fff');
    x.strokeStyle = p.c; x.lineWidth = 2.5*u; x.lineCap = 'round';
    x.beginPath(); x.arc(50*u, 66*u, 7*u, Math.PI*0.15, Math.PI*0.85); x.stroke();
  },
  bird(x, p, S){
    const u = S/100;
    shadow(x, S, 0.28);
    // coda
    x.fillStyle = p.b;
    x.beginPath(); x.moveTo(28*u, 60*u); x.lineTo(8*u, 50*u); x.lineTo(12*u, 64*u); x.closePath(); x.fill();
    // corpo
    x.fillStyle = rg(x, 45*u, 52*u, 45*u, [[0, col(p.a, 0.25)], [1, col(p.a, -0.2)]]);
    ell(x, 48*u, 58*u, 26*u, 21*u, x.fillStyle);
    // ala
    x.fillStyle = p.b;
    x.beginPath();
    x.moveTo(40*u, 50*u);
    x.quadraticCurveTo(20*u, 56*u, 30*u, 74*u);
    x.quadraticCurveTo(46*u, 70*u, 52*u, 60*u);
    x.closePath(); x.fill();
    // testa
    circ(x, 70*u, 38*u, 13*u, col(p.a, 0.1));
    // becco
    x.fillStyle = p.c;
    x.beginPath(); x.moveTo(81*u, 36*u); x.lineTo(94*u, 40*u); x.lineTo(81*u, 44*u); x.closePath(); x.fill();
    circ(x, 72*u, 35*u, 3*u, '#1d2030');
    circ(x, 71*u, 34*u, 1*u, '#fff');
    // zampe
    x.strokeStyle = p.c; x.lineWidth = 2.5*u; x.lineCap = 'round';
    x.beginPath(); x.moveTo(42*u, 78*u); x.lineTo(40*u, 88*u); x.stroke();
    x.beginPath(); x.moveTo(54*u, 78*u); x.lineTo(56*u, 88*u); x.stroke();
  },
  beast(x, p, S){
    const u = S/100;
    shadow(x, S);
    // orecchie
    x.fillStyle = p.b;
    x.beginPath(); x.moveTo(30*u, 32*u); x.lineTo(22*u, 12*u); x.lineTo(42*u, 24*u); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(70*u, 32*u); x.lineTo(78*u, 12*u); x.lineTo(58*u, 24*u); x.closePath(); x.fill();
    // corpo
    x.fillStyle = rg(x, 46*u, 54*u, 55*u, [[0, col(p.a, 0.18)], [1, col(p.a, -0.22)]]);
    ell(x, 50*u, 62*u, 30*u, 24*u, x.fillStyle);
    // testa
    circ(x, 50*u, 38*u, 20*u, col(p.a, 0.05));
    // muso
    ell(x, 50*u, 46*u, 10*u, 7*u, col(p.a, 0.3));
    circ(x, 50*u, 43*u, 3*u, '#1d2030');
    // occhi luminosi
    x.save(); x.shadowColor = p.c; x.shadowBlur = 6*u;
    circ(x, 41*u, 33*u, 3.4*u, p.c); circ(x, 59*u, 33*u, 3.4*u, p.c);
    x.restore();
    // zanne
    x.fillStyle = '#f5f2ea';
    x.beginPath(); x.moveTo(43*u, 50*u); x.lineTo(45*u, 56*u); x.lineTo(47*u, 50*u); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(53*u, 50*u); x.lineTo(55*u, 56*u); x.lineTo(57*u, 50*u); x.closePath(); x.fill();
    // zampe
    ell(x, 30*u, 84*u, 8*u, 5*u, col(p.a, -0.1));
    ell(x, 70*u, 84*u, 8*u, 5*u, col(p.a, -0.1));
  },
  mushroom(x, p, S){
    const u = S/100;
    shadow(x, S, 0.26);
    // gambo
    x.fillStyle = lg(x, 0, 50*u, 0, 88*u, [[0, col(p.c, 0.2)], [1, col(p.c, -0.15)]]);
    rr(x, 38*u, 50*u, 24*u, 38*u, 9*u); x.fill();
    // occhi e bocca sul gambo
    circ(x, 45*u, 64*u, 2.8*u, '#1d2030'); circ(x, 55*u, 64*u, 2.8*u, '#1d2030');
    x.strokeStyle = '#1d2030'; x.lineWidth = 1.8*u; x.lineCap = 'round';
    x.beginPath(); x.arc(50*u, 70*u, 4*u, Math.PI*0.2, Math.PI*0.8); x.stroke();
    // cappella
    x.fillStyle = rg(x, 42*u, 30*u, 50*u, [[0, col(p.a, 0.25)], [1, col(p.a, -0.2)]]);
    x.beginPath();
    x.moveTo(14*u, 50*u);
    x.bezierCurveTo(16*u, 18*u, 84*u, 18*u, 86*u, 50*u);
    x.closePath(); x.fill();
    for (const [sx, sy, r] of [[32,36,5],[55,28,4],[68,40,4.5]]){
      ell(x, sx*u, sy*u, r*u, r*0.75*u, col(p.b || p.c, 0.35));
    }
  },
  human(x, p, S){
    const u = S/100;
    shadow(x, S, 0.26);
    // mantello
    x.fillStyle = lg(x, 0, 26*u, 0, 88*u, [[0, col(p.a, 0.12)], [1, col(p.a, -0.3)]]);
    x.beginPath();
    x.moveTo(50*u, 16*u);
    x.quadraticCurveTo(20*u, 30*u, 26*u, 88*u);
    x.lineTo(74*u, 88*u);
    x.quadraticCurveTo(80*u, 30*u, 50*u, 16*u);
    x.closePath(); x.fill();
    // cappuccio
    circ(x, 50*u, 30*u, 16*u, col(p.a, -0.05));
    // volto in ombra
    circ(x, 50*u, 33*u, 11*u, col(p.b, -0.3));
    x.save(); x.shadowColor = p.c; x.shadowBlur = 5*u;
    circ(x, 45*u, 32*u, 2.4*u, p.c); circ(x, 55*u, 32*u, 2.4*u, p.c);
    x.restore();
    // cintura
    x.fillStyle = p.b;
    rr(x, 32*u, 58*u, 36*u, 5*u, 2*u); x.fill();
    circ(x, 50*u, 60.5*u, 3*u, p.c);
  },
  golem(x, p, S){
    const u = S/100;
    shadow(x, S, 0.4);
    const stone = (bx, by, w, h, r, f)=>{
      x.fillStyle = lg(x, 0, by, 0, by+h, [[0, col(p.a, 0.15+f)], [1, col(p.a, -0.2+f)]]);
      rr(x, bx, by, w, h, r); x.fill();
      x.strokeStyle = 'rgba(20,18,14,.4)'; x.lineWidth = 1.5*u; x.stroke();
    };
    // gambe
    stone(28*u, 70*u, 14*u, 20*u, 5*u, -0.05);
    stone(58*u, 70*u, 14*u, 20*u, 5*u, -0.05);
    // braccia
    stone(8*u, 34*u, 14*u, 34*u, 6*u, 0);
    stone(78*u, 34*u, 14*u, 34*u, 6*u, 0);
    // torso
    stone(24*u, 28*u, 52*u, 44*u, 10*u, 0.05);
    // crepe
    x.strokeStyle = col(p.b, -0.2); x.lineWidth = 1.6*u; x.lineCap = 'round';
    x.beginPath(); x.moveTo(38*u, 44*u); x.lineTo(44*u, 52*u); x.lineTo(40*u, 60*u); x.stroke();
    x.beginPath(); x.moveTo(62*u, 38*u); x.lineTo(58*u, 48*u); x.stroke();
    // testa
    stone(36*u, 10*u, 28*u, 20*u, 6*u, 0.1);
    x.save(); x.shadowColor = p.c; x.shadowBlur = 7*u;
    rr(x, 42*u, 17*u, 6*u, 4*u, 1.5*u); x.fillStyle = p.c; x.fill();
    rr(x, 52*u, 17*u, 6*u, 4*u, 1.5*u); x.fill();
    x.restore();
  },
  ghost(x, p, S){
    const u = S/100;
    x.save();
    x.shadowColor = p.a; x.shadowBlur = 14*u;
    x.fillStyle = rg(x, 45*u, 38*u, 55*u, [[0, 'rgba(255,255,255,.85)'], [0.4, col(p.a, 0.2)], [1, col(p.a, -0.1)]]);
    x.beginPath();
    x.moveTo(22*u, 84*u);
    x.lineTo(22*u, 44*u);
    x.bezierCurveTo(22*u, 20*u, 78*u, 20*u, 78*u, 44*u);
    x.lineTo(78*u, 84*u);
    // fondo ondulato
    x.quadraticCurveTo(70*u, 74*u, 64*u, 84*u);
    x.quadraticCurveTo(57*u, 74*u, 50*u, 84*u);
    x.quadraticCurveTo(43*u, 74*u, 36*u, 84*u);
    x.quadraticCurveTo(29*u, 74*u, 22*u, 84*u);
    x.closePath(); x.fill();
    x.restore();
    ell(x, 40*u, 44*u, 4.5*u, 6.5*u, '#1d2030');
    ell(x, 60*u, 44*u, 4.5*u, 6.5*u, '#1d2030');
    ell(x, 50*u, 60*u, 5*u, 7*u, 'rgba(29,32,48,.8)');
  },
  gargoyle(x, p, S){
    const u = S/100;
    shadow(x, S);
    // ali
    x.fillStyle = lg(x, 0, 20*u, 0, 70*u, [[0, col(p.b, 0.1)], [1, col(p.b, -0.3)]]);
    for (const s of [-1, 1]){
      x.beginPath();
      x.moveTo((50+s*14)*u, 44*u);
      x.quadraticCurveTo((50+s*46)*u, 14*u, (50+s*44)*u, 56*u);
      x.quadraticCurveTo((50+s*32)*u, 48*u, (50+s*26)*u, 58*u);
      x.closePath(); x.fill();
    }
    // corpo
    x.fillStyle = rg(x, 47*u, 50*u, 45*u, [[0, col(p.a, 0.15)], [1, col(p.a, -0.25)]]);
    ell(x, 50*u, 58*u, 20*u, 22*u, x.fillStyle);
    // testa con corna
    circ(x, 50*u, 32*u, 14*u, col(p.a, 0.05));
    x.fillStyle = p.c;
    x.beginPath(); x.moveTo(40*u, 24*u); x.lineTo(34*u, 10*u); x.lineTo(45*u, 20*u); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(60*u, 24*u); x.lineTo(66*u, 10*u); x.lineTo(55*u, 20*u); x.closePath(); x.fill();
    x.save(); x.shadowColor = p.c; x.shadowBlur = 6*u;
    circ(x, 44*u, 30*u, 2.8*u, p.c); circ(x, 56*u, 30*u, 2.8*u, p.c);
    x.restore();
    // zampe accucciate
    ell(x, 36*u, 82*u, 8*u, 6*u, col(p.a, -0.15));
    ell(x, 64*u, 82*u, 8*u, 6*u, col(p.a, -0.15));
  },
  snake(x, p, S){
    const u = S/100;
    shadow(x, S, 0.38);
    // corpo a S
    const grad = lg(x, 10*u, 0, 90*u, 0, [[0, col(p.a, -0.25)], [0.5, col(p.a, 0.15)], [1, col(p.a, -0.1)]]);
    x.strokeStyle = grad; x.lineWidth = 13*u; x.lineCap = 'round';
    x.beginPath();
    x.moveTo(22*u, 84*u);
    x.bezierCurveTo(60*u, 84*u, 76*u, 66*u, 50*u, 56*u);
    x.bezierCurveTo(26*u, 47*u, 34*u, 30*u, 62*u, 30*u);
    x.stroke();
    // testa
    circ(x, 68*u, 28*u, 11*u, col(p.a, 0.18));
    x.save(); x.shadowColor = p.b; x.shadowBlur = 4*u;
    circ(x, 65*u, 25*u, 2.4*u, p.b); circ(x, 73*u, 25*u, 2.4*u, p.b);
    x.restore();
    // lingua
    x.strokeStyle = p.c; x.lineWidth = 1.8*u;
    x.beginPath(); x.moveTo(76*u, 32*u); x.lineTo(86*u, 36*u); x.stroke();
    x.beginPath(); x.moveTo(86*u, 36*u); x.lineTo(90*u, 33*u); x.stroke();
    x.beginPath(); x.moveTo(86*u, 36*u); x.lineTo(89*u, 40*u); x.stroke();
  },
  knight(x, p, S){
    const u = S/100;
    shadow(x, S);
    // gambe corazzate
    x.fillStyle = col(p.a, -0.15);
    rr(x, 36*u, 68*u, 11*u, 20*u, 4*u); x.fill();
    rr(x, 53*u, 68*u, 11*u, 20*u, 4*u); x.fill();
    // spada
    x.strokeStyle = '#d8dce6'; x.lineWidth = 4*u; x.lineCap = 'round';
    x.beginPath(); x.moveTo(82*u, 18*u); x.lineTo(82*u, 64*u); x.stroke();
    x.strokeStyle = p.c; x.lineWidth = 3*u;
    x.beginPath(); x.moveTo(75*u, 60*u); x.lineTo(89*u, 60*u); x.stroke();
    // corazza
    x.fillStyle = lg(x, 0, 34*u, 0, 70*u, [[0, col(p.a, 0.35)], [0.5, p.a], [1, col(p.a, -0.25)]]);
    rr(x, 30*u, 34*u, 40*u, 36*u, 9*u); x.fill();
    x.fillStyle = 'rgba(255,255,255,.2)';
    rr(x, 33*u, 36*u, 34*u, 5*u, 3*u); x.fill();
    // spallacci
    circ(x, 30*u, 38*u, 8*u, col(p.a, 0.1));
    circ(x, 70*u, 38*u, 8*u, col(p.a, 0.1));
    // elmo
    x.fillStyle = lg(x, 0, 10*u, 0, 34*u, [[0, col(p.a, 0.3)], [1, col(p.a, -0.1)]]);
    circ(x, 50*u, 23*u, 13*u, x.fillStyle);
    // visiera luminosa
    x.save(); x.shadowColor = p.c; x.shadowBlur = 7*u;
    rr(x, 41*u, 20*u, 18*u, 4*u, 2*u); x.fillStyle = p.c; x.fill();
    x.restore();
    // pennacchio
    x.strokeStyle = p.b; x.lineWidth = 5*u; x.lineCap = 'round';
    x.beginPath(); x.arc(50*u, 14*u, 10*u, Math.PI*1.1, Math.PI*1.9); x.stroke();
  },
  bug(x, p, S){
    const u = S/100;
    shadow(x, S, 0.3);
    // zampe
    x.strokeStyle = p.c; x.lineWidth = 2.2*u; x.lineCap = 'round';
    for (const [y0, sp] of [[52, 16], [62, 18], [72, 16]]){
      x.beginPath(); x.moveTo(38*u, y0*u); x.lineTo((38-sp)*u, (y0+10)*u); x.stroke();
      x.beginPath(); x.moveTo(62*u, y0*u); x.lineTo((62+sp)*u, (y0+10)*u); x.stroke();
    }
    // addome
    x.fillStyle = rg(x, 46*u, 60*u, 40*u, [[0, col(p.a, 0.2)], [1, col(p.a, -0.2)]]);
    ell(x, 50*u, 64*u, 21*u, 17*u, x.fillStyle);
    x.strokeStyle = col(p.b, -0.15); x.lineWidth = 1.6*u;
    x.beginPath(); x.moveTo(34*u, 58*u); x.quadraticCurveTo(50*u, 64*u, 66*u, 58*u); x.stroke();
    x.beginPath(); x.moveTo(33*u, 66*u); x.quadraticCurveTo(50*u, 72*u, 67*u, 66*u); x.stroke();
    // torace e testa
    ell(x, 50*u, 42*u, 13*u, 11*u, col(p.a, -0.05));
    circ(x, 50*u, 28*u, 9*u, col(p.a, 0.1));
    // occhi composti
    x.save(); x.shadowColor = p.c; x.shadowBlur = 5*u;
    circ(x, 45*u, 26*u, 3.2*u, p.c); circ(x, 55*u, 26*u, 3.2*u, p.c);
    x.restore();
    // antenne
    x.strokeStyle = p.b; x.lineWidth = 1.8*u;
    x.beginPath(); x.moveTo(46*u, 20*u); x.quadraticCurveTo(40*u, 10*u, 34*u, 9*u); x.stroke();
    x.beginPath(); x.moveTo(54*u, 20*u); x.quadraticCurveTo(60*u, 10*u, 66*u, 9*u); x.stroke();
    // riflesso d'ala
    ell(x, 56*u, 58*u, 9*u, 13*u, 'rgba(255,255,255,.14)');
  },
  dragon(x, p, S){
    const u = S/100;
    shadow(x, S, 0.4);
    // ali membranose
    x.fillStyle = lg(x, 0, 10*u, 0, 60*u, [[0, col(p.b, 0.1)], [1, col(p.b, -0.3)]]);
    for (const s of [-1, 1]){
      x.beginPath();
      x.moveTo((50+s*12)*u, 42*u);
      x.lineTo((50+s*46)*u, 8*u);
      x.lineTo((50+s*48)*u, 34*u);
      x.lineTo((50+s*34)*u, 30*u);
      x.lineTo((50+s*38)*u, 52*u);
      x.closePath(); x.fill();
      x.strokeStyle = col(p.b, -0.4); x.lineWidth = 1.4*u;
      x.beginPath(); x.moveTo((50+s*14)*u, 42*u); x.lineTo((50+s*44)*u, 12*u); x.stroke();
    }
    // coda
    x.strokeStyle = col(p.a, -0.1); x.lineWidth = 9*u; x.lineCap = 'round';
    x.beginPath(); x.moveTo(38*u, 74*u); x.bezierCurveTo(16*u, 84*u, 10*u, 70*u, 14*u, 60*u); x.stroke();
    x.fillStyle = p.c;
    x.beginPath(); x.moveTo(16*u, 64*u); x.lineTo(6*u, 56*u); x.lineTo(18*u, 54*u); x.closePath(); x.fill();
    // corpo
    x.fillStyle = rg(x, 46*u, 56*u, 50*u, [[0, col(p.a, 0.18)], [1, col(p.a, -0.25)]]);
    ell(x, 50*u, 62*u, 25*u, 23*u, x.fillStyle);
    // ventre
    ell(x, 50*u, 68*u, 14*u, 14*u, col(p.b, 0.3));
    // collo e testa
    ell(x, 58*u, 36*u, 12*u, 14*u, col(p.a, 0.05));
    rr(x, 60*u, 24*u, 24*u, 13*u, 6*u); x.fillStyle = col(p.a, 0.12); x.fill();
    // narice
    circ(x, 80*u, 30*u, 1.6*u, '#1d2030');
    // corna
    x.fillStyle = p.c;
    x.beginPath(); x.moveTo(62*u, 24*u); x.lineTo(56*u, 10*u); x.lineTo(68*u, 20*u); x.closePath(); x.fill();
    // occhio
    x.save(); x.shadowColor = p.c; x.shadowBlur = 6*u;
    circ(x, 68*u, 28*u, 2.8*u, p.c);
    x.restore();
    // spine dorsali
    x.fillStyle = p.b;
    for (const [sx, sy] of [[34,42],[42,38],[50,40]]){
      x.beginPath(); x.moveTo(sx*u, sy*u); x.lineTo((sx+4)*u, (sy-8)*u); x.lineTo((sx+8)*u, sy*u); x.closePath(); x.fill();
    }
  },
  witch(x, p, S){
    const u = S/100;
    shadow(x, S, 0.3);
    // bastone con globo
    x.strokeStyle = col(p.b, -0.1); x.lineWidth = 2.6*u; x.lineCap = 'round';
    x.beginPath(); x.moveTo(78*u, 36*u); x.lineTo(78*u, 86*u); x.stroke();
    x.save(); x.shadowColor = p.c; x.shadowBlur = 10*u;
    circ(x, 78*u, 30*u, 6*u, p.c);
    x.restore();
    // veste
    x.fillStyle = lg(x, 0, 38*u, 0, 88*u, [[0, col(p.a, 0.15)], [1, col(p.a, -0.3)]]);
    x.beginPath();
    x.moveTo(50*u, 36*u);
    x.quadraticCurveTo(28*u, 56*u, 24*u, 88*u);
    x.lineTo(76*u, 88*u);
    x.quadraticCurveTo(72*u, 56*u, 50*u, 36*u);
    x.closePath(); x.fill();
    // braccia
    x.strokeStyle = col(p.a, -0.05); x.lineWidth = 6*u; x.lineCap = 'round';
    x.beginPath(); x.moveTo(46*u, 46*u); x.quadraticCurveTo(64*u, 48*u, 76*u, 44*u); x.stroke();
    // capelli
    x.fillStyle = p.b;
    rr(x, 36*u, 26*u, 28*u, 26*u, 10*u); x.fill();
    // volto
    circ(x, 50*u, 32*u, 10*u, '#f2cfae');
    x.save(); x.shadowColor = p.c; x.shadowBlur = 5*u;
    circ(x, 46*u, 31*u, 2.2*u, p.c); circ(x, 54*u, 31*u, 2.2*u, p.c);
    x.restore();
    x.strokeStyle = 'rgba(150,60,80,.8)'; x.lineWidth = 1.6*u;
    x.beginPath(); x.arc(50*u, 37*u, 3*u, Math.PI*0.15, Math.PI*0.85); x.stroke();
    // cappello
    x.fillStyle = lg(x, 0, 4*u, 0, 24*u, [[0, col(p.a, 0.1)], [1, col(p.a, -0.25)]]);
    ell(x, 50*u, 23*u, 22*u, 5.5*u, x.fillStyle);
    x.beginPath(); x.moveTo(38*u, 22*u); x.quadraticCurveTo(48*u, -4*u, 60*u, 4*u); x.lineTo(62*u, 22*u); x.closePath(); x.fill();
    x.fillStyle = p.c;
    rr(x, 39*u, 17*u, 23*u, 4*u, 2*u); x.fill();
  },
};

// Disegna un mostro dentro un canvas, scalato (scale ≈ 6 normale, 9 boss).
export function drawMonster(canvas, mon, scale){
  const S = Math.round(scale * 18);
  canvas.width = S; canvas.height = S;
  const x = canvas.getContext('2d');
  x.clearRect(0, 0, S, S);
  const pal = mon.pal || { a:'#888888', b:'#444455', c:'#ccccdd' };
  (MDRAW[mon.sprite] || MDRAW.slime)(x, pal, S);
}

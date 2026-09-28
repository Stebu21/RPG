// Genera le mappe a caselle dei paesi a partire da OpenStreetMap.
// uso: node tools/osm-town.mjs  -> www/js/data/towns_osm.js
//
// Fonti: tools/osm/vedano_baked.js (estratto già in metri, copre Vedano e
// Castiglione) e tools/osm/<paese>.json scaricati da tools/osm-fetch.mjs.
// Dati (c) OpenStreetMap contributors, ODbL.
//
// Legenda prodotta (vedi maps.js): . erba  , prato alto  F fiori  T albero
// = strada  : pavé/marciapiede/piazza  ~ acqua  B ponte  # edificio
// d porta decorativa (chiusa)  D porta vera  C chiesa  W torre  G Gundam
// P lampione  b panchina  E siepe

import { readFile, writeFile, access } from 'node:fs/promises';
import { TOWNS_REMOTE } from './osm-fetch.mjs';

const R = 6371000;
function projector(lat0, lon0){
  const mLat = Math.PI/180 * R, mLon = Math.PI/180 * R * Math.cos(lat0 * Math.PI/180);
  return (lat, lon)=>[(lon - lon0) * mLon, -(lat - lat0) * mLat];
}

// ---------- sorgenti ----------
async function loadBaked(){
  const src = await readFile('tools/osm/vedano_baked.js', 'utf8');
  const window = {};
  new Function('window', src)(window);
  return window.MAP_DATA;
}

// converte la risposta di Overpass nel formato "baked" (metri dal centro)
function fromOverpass(json, lat0, lon0){
  const P = projector(lat0, lon0);
  const out = { roads:[], buildings:[], areas:[], trees:[], shops:[], water:[] };
  const W = { motorway:10, trunk:9, primary:8, secondary:7.5, tertiary:6.8, residential:5.8, unclassified:5.2, service:3.6, pedestrian:6, living_street:5 };
  for (const el of json.elements){
    const t = el.tags || {};
    // le relazioni (multipoligoni, es. Palazzo Estense) usano il primo anello esterno
    const outer = el.type === 'relation' ? el.members?.find(m=>m.role === 'outer' && m.geometry) : null;
    const geom = el.geometry || outer?.geometry;
    const pts = geom ? geom.filter(Boolean).map(g=>P(g.lat, g.lon)) : null;
    const pos = el.type === 'node' ? P(el.lat, el.lon) : el.center ? P(el.center.lat, el.center.lon) : null;
    if (t.highway && pts) out.roads.push({ pts, kind:t.highway, w:W[t.highway] || 2.5, name:t.name || '' });
    else if ((t.building || (el.type === 'relation' && t.name)) && pts) out.buildings.push({ pts, kind:t.building === 'yes' ? (t.amenity === 'place_of_worship' ? 'church' : 'house') : t.building || 'civic', name:t.name || '' });
    else if (t.waterway && pts) out.water.push({ pts, w: t.waterway === 'river' ? 14 : 4 });
    else if ((t.leisure || t.landuse || t.natural) && pts && el.type === 'way')
      out.areas.push({ pts, kind:t.leisure || t.landuse || t.natural, name:t.name || '' });
    else if (t.natural === 'tree' && pos) out.trees.push({ x:pos[0], z:pos[1] });
    if ((t.shop || t.amenity) && pos) out.shops.push({ x:pos[0], z:pos[1], tag:t.shop || t.amenity, name:t.name || '' });
    if (t.amenity === 'place_of_worship' && pts && !t.building) out.buildings.push({ pts, kind:'church', name:t.name || '' });
  }
  return out;
}

// ---------- configurazione dei paesi ----------
// rect: [x0, z0, x1, z1] in metri; roles: edifici con una funzione nel gioco
const TOWNS = {
  vedano: {
    src:'baked', rect:[-620, -680, 940, 1010], tile:6, entry:'north',
    roles:{
      chiesa:     { name:'Chiesa Parrocchiale di San Maurizio', church:true },
      lazzaretto: { name:'Chiesa del Lazzaretto' },
      negozio:    { near:[59, -17] },          // Alimentari in piazza San Rocco
      locanda:    { near:[-223, 29] },         // bar La Pepita, sulla piazza
      casa1:      { near:[-68, 594] },         // Via Pierangelo Monetti 22
      casa2:      { near:[-468, 953] },        // Via Barlassina 6
      casa3:      { near:[855, -607] },        // Via Adua 64
    },
    points:{ gundam:[-585, 420], sanRocco:[53, 1] },
  },
  castiglione: {
    src:'baked', rect:[-1960, 1850, -1240, 2720], tile:6, entry:'east',
    river:'Pista Ciclopedonale della Valle Olona',   // l'Olona scorre accanto alla ciclabile
    roles:{
      collegiata: { name:'Collegiata dei Santi Stefano e Lorenzo', church:true },
      chiesa:     { name:'Chiesa di Villa', church:true },
      casa1:      { name:'Palazzo Branda Castiglioni' },
      casa2:      { name:'Palazzo dei conti Castiglioni di Monteruzzo' },
      locanda:    { name:'Locanda alla Collegiata' },
      negozio:    { near:[-1560, 2395] },
    },
    points:{ piazza:[-1579, 2380] },
  },
  jerago: {
    src:'remote', tile:6, entry:'south', half:[600, 560],
    roles:{
      castello:   { nameRe:/castello/i, tower:true, nearBig:[-327, -367], r:90 },   // accanto a San Giorgio, in alto
      chiesa:     { name:'Chiesa di San Giorgio', church:true, fallbackNear:[80, 0] },
      casa1:      { near:[-120, 60] },
      negozio:    { near:[40, 60] },
      locanda:    { near:[-60, 140] },
    },
    points:{},
  },
  samarate: {
    src:'remote', tile:6, entry:'north', half:[600, 560],
    roles:{
      officina:   { largestKind:/industrial|warehouse|hangar/i, fallbackNear:[250, -200] },
      chiesa:     { nameRe:/chiesa|trinit|parrocchiale/i, church:true, fallbackNear:[0, 0] },
      casa1:      { near:[-150, -80] },
      casa2:      { near:[120, 160] },
      negozio:    { near:[-60, 40] },
      locanda:    { near:[60, 90] },
    },
    points:{},
  },
  varese: {
    src:'remote', tile:6, entry:'south', half:[480, 480],
    roles:{
      chiesa:     { nameRe:/san vittore|basilica/i, church:true, fallbackNear:[0, 0] },
      casa3:      { nameRe:/estense/i, near:[-240, -44] },   // Palazzo Estense: in OSM è solo un "sito", si usa l'edificio più vicino   // Palazzo Estense: in OSM solo come sito
      campanile:  { name:'Campanile di San Vittore', tower:true },
      casa1:      { near:[-200, -150] },
      casa2:      { near:[-60, -200] },
      casa4:      { near:[150, -180] },
      casa5:      { near:[260, -60] },
      negozio:    { near:[60, 40] },
      locanda:    { near:[-80, 90] },
    },
    points:{ accademia:[0, -440] },
  },
};

// ---------- rasterizzazione ----------
function pointInPoly(x, z, pts){
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++){
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function segDist(px, pz, [ax, az], [bx, bz]){
  const dx = bx - ax, dz = bz - az, l2 = dx*dx + dz*dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - ax - t*dx, pz - az - t*dz);
}
const centroid = pts=>{ let x = 0, z = 0; for (const p of pts){ x += p[0]; z += p[1]; } return [x / pts.length, z / pts.length]; };
let seed = 1; const rnd = ()=>((seed = (seed * 16807) % 2147483647) / 2147483647);

function build(name, cfg, data){
  seed = 7 + name.length * 31;
  const T = cfg.tile;
  const [x0, z0, x1, z1] = cfg.rect;
  const W = Math.ceil((x1 - x0) / T), H = Math.ceil((z1 - z0) / T);
  const g = Array.from({ length:H }, ()=>new Array(W).fill('.'));
  const toT = (x, z)=>[Math.floor((x - x0) / T), Math.floor((z - z0) / T)];
  const inside = (tx, ty)=>tx >= 0 && ty >= 0 && tx < W && ty < H;
  const set = (tx, ty, c)=>{ if (inside(tx, ty)) g[ty][tx] = c; };
  const get = (tx, ty)=>inside(tx, ty) ? g[ty][tx] : ' ';
  const inRect = pts=>pts.some(([x, z])=>x >= x0 - 200 && x <= x1 + 200 && z >= z0 - 200 && z <= z1 + 200);
  const fillPoly = (pts, fn)=>{
    let a = [1e9, 1e9, -1e9, -1e9];
    for (const [x, z] of pts) a = [Math.min(a[0], x), Math.min(a[1], z), Math.max(a[2], x), Math.max(a[3], z)];
    const [ta, tb] = toT(a[0], a[1]), [tc, td] = toT(a[2], a[3]);
    const cells = [];
    for (let ty = Math.max(0, tb); ty <= Math.min(H - 1, td); ty++)
      for (let tx = Math.max(0, ta); tx <= Math.min(W - 1, tc); tx++)
        if (pointInPoly(x0 + (tx + 0.5) * T, z0 + (ty + 0.5) * T, pts)) cells.push([tx, ty]);
    if (!cells.length){ const [cx, cz] = centroid(pts); const c = toT(cx, cz); if (inside(...c)) cells.push(c); }
    for (const c of cells) fn(...c);
    return cells;
  };

  // 1) aree: parchi, boschi, prati, acqua, zone pavimentate
  const AREA = { forest:'wood', wood:'wood', scrub:'scrub', park:'park', garden:'garden', grass:'.', village_green:'park', recreation_ground:'park',
    playground:'park', pitch:'.', meadow:',', farmland:',', orchard:'orchard', cemetery:':', industrial:':', commercial:':', retail:':',
    water:'~', swimming_pool:'~', sports_centre:'.', nature_reserve:'wood' };
  for (const a of data.areas || []){
    const k = AREA[a.kind]; if (!k || !inRect(a.pts)) continue;
    fillPoly(a.pts, (tx, ty)=>{
      const r = rnd();
      if (k === 'wood') set(tx, ty, r < 0.55 ? 'T' : '.');
      else if (k === 'scrub') set(tx, ty, r < 0.25 ? 'T' : ',');
      else if (k === 'orchard') set(tx, ty, (tx + ty) % 3 === 0 ? 'T' : '.');
      else if (k === 'park') set(tx, ty, r < 0.08 ? 'T' : r < 0.11 ? 'F' : '.');
      else if (k === 'garden') set(tx, ty, r < 0.2 ? 'F' : '.');
      else set(tx, ty, k);
    });
  }
  // 2) fiume (dal tracciato OSM o accanto alla ciclabile della valle)
  const rivers = [...(data.water || [])];
  if (cfg.river) for (const r of data.roads.filter(r=>r.name === cfg.river)) rivers.push({ pts:r.pts.map(([x, z])=>[x - 18, z]), w:14 });
  for (const rv of rivers){
    if (!inRect(rv.pts)) continue;
    for (let i = 1; i < rv.pts.length; i++) stamp(rv.pts[i-1], rv.pts[i], Math.max(T * 0.9, rv.w / 2), ()=>'~');
  }
  // 3) edifici
  const buildings = [];
  for (const b of data.buildings){
    if (!inRect(b.pts)) continue;
    const cells = fillPoly(b.pts, (tx, ty)=>set(tx, ty, '#'));
    if (cells.length) buildings.push({ ...b, cells, c:centroid(b.pts) });
  }
  // 4) strade: asfalto per le carrabili, pavé per pedonali e piazze, ponti sull'acqua
  const CAR = new Set(['motorway','trunk','primary','secondary','tertiary','residential','unclassified','service','living_street','motorway_link','trunk_link','primary_link','secondary_link']);
  const PED = new Set(['pedestrian','footway','steps','cycleway','path']);
  function stamp(a, b, half, pick){
    const [ta, tb] = toT(Math.min(a[0], b[0]) - half, Math.min(a[1], b[1]) - half);
    const [tc, td] = toT(Math.max(a[0], b[0]) + half, Math.max(a[1], b[1]) + half);
    for (let ty = Math.max(0, tb); ty <= Math.min(H - 1, td); ty++)
      for (let tx = Math.max(0, ta); tx <= Math.min(W - 1, tc); tx++)
        if (segDist(x0 + (tx + 0.5) * T, z0 + (ty + 0.5) * T, a, b) <= half){ const c = pick(g[ty][tx]); if (c) g[ty][tx] = c; }
  }
  const streets = {};
  for (const r of data.roads){
    if (!inRect(r.pts)) continue;
    const car = CAR.has(r.kind), ped = PED.has(r.kind) || r.kind === 'track';
    if (!car && !ped) continue;
    const half = Math.max(T * 0.55, (r.w || 3) / 2 + (car ? 1.5 : 0));
    const ch = car ? '=' : r.kind === 'track' ? null : ':';
    for (let i = 1; i < r.pts.length; i++){
      stamp(r.pts[i-1], r.pts[i], half, cur=>{
        if (cur === '~') return 'B';
        if (!ch) return cur === '#' ? null : cur === 'T' ? '.' : null;   // sterrati: solo sgombra gli alberi
        if (cur === '#' && !car) return null;          // i vicoli pedonali non tagliano gli edifici
        return ch === ':' && cur === '=' ? null : ch;
      });
    }
    if (r.name){
      const tp = r.pts.map(([x, z])=>toT(x, z)).filter(p=>inside(...p));
      if (tp.length) (streets[r.name] ||= []).push(tp);
    }
  }
  // piazze pedonali (aree "pedestrian" con nome Piazza...) già coperte dalle strade con quel tipo

  // 5) alberi OSM singoli
  for (const t of data.trees || []){ const [tx, ty] = toT(t.x, t.z); if (get(tx, ty) === '.') set(tx, ty, 'T'); }

  // 6) edifici: il cartello "C" per le chiese, porte decorative sul lato sud
  // ricostruisci le celle ancora occupate (le strade possono averle tagliate)
  for (const b of buildings) b.cells = b.cells.filter(([tx, ty])=>g[ty][tx] === '#');
  const walk = c=>'.,F=:B'.includes(c);
  function doorOf(b){
    let best = null, bd = 1e9;
    const [cx, cy] = toT(...b.c);
    for (const [tx, ty] of b.cells){
      for (const [dx, dy, pref] of [[0, 1, 0], [1, 0, 3], [-1, 0, 3], [0, -1, 6]]){
        if (!walk(get(tx + dx, ty + dy))) continue;
        const d = Math.abs(tx - cx) + pref + (g[ty + dy]?.[tx + dx] === '=' ? 0 : 1);
        if (d < bd){ bd = d; best = { door:[tx, ty], front:[tx + dx, ty + dy] }; }
      }
    }
    return best;
  }
  for (const b of buildings){
    if (b.cells.length >= 2 && rnd() < 0.7){
      const d = doorOf(b); if (d && d.front[1] > d.door[1]) set(...d.door, 'd');
    }
  }

  // 7) ruoli: chiese, bottega, locanda, case...
  const used = new Set();
  const poi = {};
  const nearest = ([x, z], filter=()=>true)=>{
    let best = null, bd = 1e9;
    for (const b of buildings){ if (!b.cells.length || used.has(b) || !filter(b)) continue; const d = Math.hypot(b.c[0] - x, b.c[1] - z); if (d < bd){ bd = d; best = b; } }
    return best;
  };
  for (const [role, r] of Object.entries(cfg.roles)){
    let b = null;
    if (r.name) b = buildings.find(x=>x.name === r.name && x.cells.length);
    if (!b && r.nameRe) b = buildings.filter(x=>r.nameRe.test(x.name) && x.cells.length).sort((a, c)=>c.cells.length - a.cells.length)[0];
    if (!b && r.nearBig) b = buildings.filter(x=>x.cells.length && !used.has(x) && Math.hypot(x.c[0] - r.nearBig[0], x.c[1] - r.nearBig[1]) < r.r).sort((a, c)=>c.cells.length - a.cells.length)[0];
    if (!b && r.largestKind) b = buildings.filter(x=>r.largestKind.test(x.kind) && x.cells.length).sort((a, c)=>c.cells.length - a.cells.length)[0];
    if (!b) b = nearest(r.near || r.fallbackNear || [0, 0], x=>x.cells.length >= 1);
    if (!b){ console.warn(name, 'ruolo senza edificio:', role); continue; }
    used.add(b);
    // porta vera: via la porta decorativa, se c'era
    for (const [tx, ty] of b.cells) if (g[ty][tx] === 'd') g[ty][tx] = '#';
    const d = doorOf(b);
    if (!d){ console.warn(name, 'nessun accesso per', role); continue; }
    set(...d.door, 'D');
    if (r.church){ const c = b.cells.find(([tx, ty])=>g[ty][tx] === '#' && (tx !== d.door[0] || ty !== d.door[1])); if (c) set(...c, 'C'); }
    if (r.tower) for (const c of [b.cells[0], b.cells[b.cells.length - 1]]) if (g[c[1]][c[0]] === '#') set(...c, 'W');
    poi[role] = { door:d.door, front:d.front, name:b.name };
  }
  for (const [k, p] of Object.entries(cfg.points || {})){ const t = toT(...p); if (inside(...t)) poi[k] = { at:t }; }
  if (poi.gundam){ const [gx, gy] = poi.gundam.at; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (walk(get(gx + dx, gy + dy)) || get(gx+dx, gy+dy) === 'T') set(gx + dx, gy + dy, '.'); set(gx, gy, 'G'); }

  // 8) lampioni e panchine lungo le vie
  for (let ty = 1; ty < H - 1; ty++) for (let tx = 1; tx < W - 1; tx++){
    if (g[ty][tx] !== '.') continue;
    if ('dD'.includes(g[ty - 1][tx]) || 'dD'.includes(g[ty + 1][tx]) || 'dD'.includes(g[ty][tx - 1]) || 'dD'.includes(g[ty][tx + 1])) continue;   // mai davanti a una porta
    const nearRoad = g[ty][tx - 1] === '=' || g[ty][tx + 1] === '=' || g[ty - 1][tx] === '=' || g[ty + 1][tx] === '=';
    if (nearRoad && (tx * 7 + ty * 13) % 23 === 0) g[ty][tx] = 'P';
    else if (!nearRoad && g[ty+1][tx] === ':' && (tx * 5 + ty * 3) % 29 === 0) g[ty][tx] = 'b';
  }

  // 9) ingresso dalla mappa del mondo e bordo di alberi
  const side = cfg.entry;
  const edge = (i)=>side === 'north' ? [i, 0] : side === 'south' ? [i, H - 1] : side === 'east' ? [W - 1, i] : [0, i];
  const inward = side === 'north' ? [0, 1] : side === 'south' ? [0, -1] : side === 'east' ? [-1, 0] : [1, 0];
  const len = side === 'north' || side === 'south' ? W : H;
  // strada più vicina al centro del lato
  let entry = null, bd = 1e9;
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++){
    if (g[ty][tx] !== '=') continue;
    const [ex, ey] = edge(side === 'north' || side === 'south' ? tx : ty);
    const d = Math.abs(ex - tx) + Math.abs(ey - ty) + Math.abs((side === 'north' || side === 'south' ? tx : ty) - len/2) * 0.4;
    if (d < bd){ bd = d; entry = [tx, ty]; }
  }
  const [ex0, ey0] = edge(side === 'north' || side === 'south' ? entry[0] : entry[1]);
  // scava la strada fino al bordo
  for (let [x, y] = [ex0, ey0]; x !== entry[0] || y !== entry[1]; x += inward[0], y += inward[1]){
    if (!inside(x, y)) break;
    for (const o of [-1, 0, 1]){ const px = x + (inward[0] ? 0 : o), py = y + (inward[1] ? 0 : o); if (inside(px, py) && !'D'.includes(g[py][px])) g[py][px] = '='; }
  }
  for (let i = 0; i < W; i++){ g[0][i] = 'T'; g[H - 1][i] = 'T'; }
  for (let i = 0; i < H; i++){ g[i][0] = 'T'; g[i][W - 1] = 'T'; }
  const portals = [];
  for (const o of [-1, 0, 1]){
    const px = ex0 + (inward[0] ? 0 : o), py = ey0 + (inward[1] ? 0 : o);
    if (inside(px, py)){ g[py][px] = '='; portals.push([px, py]); }
  }
  poi.entry = { portals, spawn:[ex0 + inward[0] * 2, ey0 + inward[1] * 2] };

  // 10) caselle libere vicino ai punti di interesse, per NPC, forzieri e mezzi
  const taken = new Set();
  const freeNear = ([x, y], n=6)=>{
    const out = [], seen = new Set([x + ',' + y]), q = [[x, y]];
    while (q.length && out.length < n){
      const [cx, cy] = q.shift();
      const c = get(cx, cy);
      if ((c === '.' || c === ':' || c === '=') && !taken.has(cx + ',' + cy) && Math.hypot(cx - x, cy - y) >= 1.5){ out.push([cx, cy]); taken.add(cx + ',' + cy); }
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const k = (cx + dx) + ',' + (cy + dy);
        if (!seen.has(k) && inside(cx + dx, cy + dy) && '.,F=:BGDdC#P'.includes(get(cx + dx, cy + dy))){ seen.add(k); q.push([cx + dx, cy + dy]); }
      }
    }
    return out;
  };
  for (const p of Object.values(poi)){ const at = p.front || p.at || p.spawn; if (at) p.free = freeNear(at); }
  // le porte vere e la loro casella davanti devono restare libere
  for (const p of Object.values(poi)) if (p.front) taken.add(p.front.join(','));

  // vie: polilinee semplificate per cartelli e HUD
  const streetList = Object.entries(streets).map(([n, lines])=>({ name:n, lines:lines.map(l=>l.filter((p, i)=>i === 0 || i === l.length - 1 || i % 2 === 0)) }));
  return { tiles:g.map(r=>r.join('')), poi, streets:streetList, tile:T };
}

// ---------- main ----------
const baked = await loadBaked();
const out = {};
for (const [name, cfg] of Object.entries(TOWNS)){
  let data = baked;
  if (cfg.src === 'remote'){
    try { await access(`tools/osm/${name}.json`); } catch { console.log(name, ': dati OSM non ancora scaricati, salto'); continue; }
    const t = TOWNS_REMOTE[name];
    data = fromOverpass(JSON.parse(await readFile(`tools/osm/${name}.json`, 'utf8')), t.lat, t.lon);
    cfg.rect = [-cfg.half[0], -cfg.half[1], cfg.half[0], cfg.half[1]];
  }
  out[name] = build(name, cfg, data);
  console.log(name, out[name].tiles[0].length + 'x' + out[name].tiles.length, Object.keys(out[name].poi).join(','));
}
await writeFile('www/js/data/towns_osm.js',
  '// Generato da tools/osm-town.mjs — non modificare a mano.\n// Dati (c) OpenStreetMap contributors, ODbL.\nexport const OSM_TOWNS = ' + JSON.stringify(out) + ';\n');
console.log('scritto www/js/data/towns_osm.js');

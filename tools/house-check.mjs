// Case visitabili e muri: ogni porta dei paesi OSM porta a un interno e ritorno;
// camminando a caso (a piedi, di corsa, a cavallo, in Vespa) non si entra mai nei muri.
// uso: node tools/house-check.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const ROOT = new URL('../www', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };
const server = http.createServer(async (q, r)=>{
  const p = q.url === '/' ? '/index.html' : q.url.split('?')[0];
  try { const d = await readFile(join(ROOT, decodeURIComponent(p))); r.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); r.end(d); }
  catch { r.writeHead(404); r.end(); }
});
await new Promise(r=>server.listen(8776, r));
const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new', args:['--mute-audio', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e=>errors.push(e.message));
page.on('console', m=>{ if (m.type() === 'error') errors.push(m.text()); });
await page.setViewport({ width:1280, height:720 });
await page.goto('http://localhost:8776/', { waitUntil:'networkidle0' });
const wait = ms=>new Promise(r=>setTimeout(r, ms));
const ev = (fn, ...a)=>page.evaluate(fn, ...a);
const skip = async ()=>{ for (let i=0; i<40 && await page.$('#dialog-box:not(.hidden)'); i++){ await page.$eval('#dialog-box', e=>e.click()); await wait(60); } };
const go = (m, x, y)=>ev(async (m, x, y)=>{ const { loadMap } = await import('./js/screens/world.js'); loadMap(m, x, y); }, m, x, y);
const pos = ()=>ev(async ()=>{ const { debugWorld } = await import('./js/screens/world.js'); const p = debugWorld.player(); return [p.px, p.pz]; });

await page.type('#auth-name', 'H' + Date.now() % 10000); await page.type('#auth-pin', '1234');
await page.click('#btn-register'); await page.waitForSelector('#save-box:not(.hidden)');
await page.click('#save-slots button'); await page.waitForSelector('.hero-card'); await page.click('.hero-card[data-hero="ste"]');
await page.waitForSelector('#screen-world:not(.hidden)'); await wait(800); await skip();
// niente incontri casuali durante la prova (uscendo dal paese si finisce sulla mappa del mondo)
await ev(async ()=>{ const { ZONES } = await import('./js/data/monsters.js'); for (const z of Object.values(ZONES)) z.rate = 0; });

// 1) dati: ogni porta ha un interno, l'uscita torna davanti alla porta, su una casella libera
const report = await ev(async ()=>{
  const { MAPS } = await import('./js/data/maps.js');
  const { BLOCKED } = await import('./js/engine/sprites.js');
  const out = {};
  for (const town of ['vedano', 'castiglione', 'jerago', 'samarate', 'varese']){
    const m = MAPS[town]; if (!m?.osm) continue;
    const trig = new Map(m.triggers.map(t=>[t.x + ',' + t.y, t]));
    let doors = 0; const bad = [];
    m.tiles.forEach((row, y)=>[...row].forEach((ch, x)=>{
      if (ch !== 'D') return;
      doors++;
      const t = trig.get(x + ',' + y);
      if (!t || !['portal', 'door_event'].includes(t.type)){ bad.push(`porta senza ingresso ${x},${y}`); return; }
      if (t.type !== 'portal') return;
      const inn = MAPS[t.to.map]; if (!inn){ bad.push(`mappa mancante ${t.to.map}`); return; }
      if (BLOCKED.has(inn.tiles[t.to.y][t.to.x])) bad.push(`ingresso nel muro ${t.to.map}`);
      if (t.to.map.includes('_int_')){
        const ex = inn.triggers.find(e=>e.type === 'portal');
        const [fx, fy] = [ex.to.x, ex.to.y];
        if (BLOCKED.has(m.tiles[fy][fx]) || trig.has(fx + ',' + fy)) bad.push(`uscita bloccata ${t.to.map}`);
        if (Math.abs(fx - x) + Math.abs(fy - y) !== 1) bad.push(`uscita lontana dalla porta ${t.to.map}`);
      }
    }));
    const houses = m.triggers.filter(t=>t.to?.map?.includes('_int_'));
    out[town] = { doors, houses:houses.length, bad:bad.slice(0, 5), nbad:bad.length, sample:houses.filter((_, i)=>i % 97 === 5).slice(0, 3) };
  }
  return out;
});
for (const [town, r] of Object.entries(report)){
  console.log(town, 'porte', r.doors, 'case generate', r.houses, 'problemi', r.nbad, r.bad.join(' | '));
  assert.equal(r.nbad, 0, town);
}

// 2) entrare e uscire davvero da qualche casa di ogni paese, camminando
const step = async (key, ms)=>{ await page.keyboard.down(key); await wait(ms); await page.keyboard.up(key); await wait(150); };
const KEY = { '0,-1':'ArrowUp', '0,1':'ArrowDown', '-1,0':'ArrowLeft', '1,0':'ArrowRight' };
let visited = 0;
for (const [town, r] of Object.entries(report)){
  for (const t of r.sample){
    const exit = await ev(async (mid)=>{ const { MAPS } = await import('./js/data/maps.js'); return MAPS[mid].triggers.find(e=>e.type === 'portal').to; }, t.to.map);
    await go(town, exit.x, exit.y); await wait(700); await skip();
    await step(KEY[`${t.x - exit.x},${t.y - exit.y}`], 700); await skip();
    const inside = await ev(async ()=>(await import('./js/engine/state.js')).G.s.map);
    assert.equal(inside, t.to.map, `non si entra nella casa ${t.to.map}`);
    const name = await page.$eval('#hud-location', e=>e.textContent);
    if (t === r.sample[0]){ await wait(400); await page.screenshot({ path:`tools/h-${town}.png` }); console.log(' dentro:', name); }
    await step('ArrowDown', 1300); await skip();
    const back = await ev(async ()=>{ const { G } = await import('./js/engine/state.js'); return [G.s.map, G.s.x, G.s.y]; });
    assert.deepEqual(back, [town, exit.x, exit.y], `uscita sbagliata da ${t.to.map}`);
    visited++;
  }
}
console.log('case visitate e uscite:', visited);

// 3) camminata casuale: il cerchio del giocatore non tocca mai una casella bloccata
const fuzz = async (town, how, seconds)=>{
  const spawn = await ev(async (town)=>{ const { MAPS } = await import('./js/data/maps.js'); return MAPS[town].spawn; }, town);
  await ev(async (how)=>{
    const { G } = await import('./js/engine/state.js');
    for (const v of ['vespa', 'cavallo']) G.s.items[v] = 1;
    G.s.vehicle = how === 'vespa' || how === 'cavallo' ? how : null;
  }, how);
  await go(town, spawn.x, spawn.y);
  await ev(async ()=>{
    const { debugWorld } = await import('./js/screens/world.js');
    window.__fuzz = { worst:null, n:0, on:true };
    const tick = ()=>{
      const p = debugWorld.player(), mp = debugWorld.map();
      if (mp.osm){
        window.__fuzz.n++;
        const f = debugWorld.follower();
        for (const [who, cx, cz, r] of [['giocatore', p.px, p.pz, 0.27], ['compagno', f.x, f.z, 0.2]])
          for (const [dx, dz] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]]){
            const x = Math.floor(cx + dx), y = Math.floor(cz + dz);
            if (!debugWorld.walkable(x, y)) window.__fuzz.worst = { who, x:cx, z:cz, tile:mp.tiles[y]?.[x], map:mp.name };
          }
      }
      if (window.__fuzz.on) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await wait(600); await skip();
  const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  if (how === 'corsa') await page.keyboard.down('Alt');
  const t0 = Date.now();
  let r = 12345;
  while (Date.now() - t0 < seconds * 1000){
    r = (r * 1103515245 + 12345) % 2147483648;
    const a = keys[r % 4], b = keys[(r >> 8) % 4];
    await page.keyboard.down(a); if (a !== b && (r >> 16) % 3 === 0) await page.keyboard.down(b);
    await wait(250 + (r >> 4) % 500);
    await page.keyboard.up(a); await page.keyboard.up(b);
    await skip();
    // entrato in casa o uscito dal paese: si riparte dall'ingresso
    const osm = await ev(async ()=>{ const { debugWorld } = await import('./js/screens/world.js'); return !!debugWorld.map().osm; });
    if (!osm){ await go(town, spawn.x, spawn.y); await wait(300); await skip(); }
  }
  if (how === 'corsa') await page.keyboard.up('Alt');
  const f = await ev(()=>{ window.__fuzz.on = false; return window.__fuzz; });
  console.log('camminata', town, how, 'controlli', f.n, f.worst ? 'DENTRO IL MURO ' + JSON.stringify(f.worst) : 'ok');
  assert.equal(f.worst, null, `${town} ${how}: il giocatore è entrato in un muro`);
};
for (const [town, how] of [['vedano', 'piedi'], ['vedano', 'corsa'], ['varese', 'vespa'], ['jerago', 'cavallo'], ['samarate', 'corsa']]) await fuzz(town, how, 12);

// 4) corsa con Alt: più veloce che a piedi
const speed = async alt=>{
  await ev(async ()=>{ const { G } = await import('./js/engine/state.js'); G.s.vehicle = null; });
  const sp = await ev(async ()=>{ const { MAPS } = await import('./js/data/maps.js'); return MAPS.vedano.spawn; });
  await go('vedano', sp.x, sp.y); await wait(500); await skip();
  const a = await pos();
  if (alt) await page.keyboard.down('Alt');
  await page.keyboard.down('ArrowRight'); await wait(900); await page.keyboard.up('ArrowRight');
  if (alt) await page.keyboard.up('Alt');
  const b = await pos();
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
};
const walk = await speed(false), run = await speed(true);
console.log('in 0.9 s: a piedi', walk.toFixed(2), 'di corsa', run.toFixed(2));
assert.ok(run > walk * 1.4, 'tenendo Alt non si corre');

// 5) cavalcatura: il cavallo del castello di Jerago
const horse = await ev(async ()=>{ const { MAPS } = await import('./js/data/maps.js'); return MAPS.jerago.triggers.find(t=>t.vehicle === 'cavallo'); });
assert.ok(horse, 'nessun cavallo a Jerago');
await ev(async ()=>{ const { G } = await import('./js/engine/state.js'); delete G.s.items.cavallo; G.s.vehicle = null; });
// ci si mette accanto (su una casella libera) e ci si gira verso il cavallo
await go('jerago', horse.x, horse.y); await wait(300);
const side = await ev(async (hx, hy)=>{ const { debugWorld } = await import('./js/screens/world.js');
  return [[0, 1, 'ArrowUp'], [-1, 0, 'ArrowRight'], [1, 0, 'ArrowLeft'], [0, -1, 'ArrowDown']].find(([dx, dy])=>debugWorld.walkable(hx + dx, hy + dy)); }, horse.x, horse.y);
await go('jerago', horse.x + side[0], horse.y + side[1]); await wait(700); await skip();
await page.screenshot({ path:'tools/h-cavallo-fermo.png' });
await page.keyboard.down(side[2]); await wait(60); await page.keyboard.up(side[2]); await wait(200);
await ev(async ()=>{ const { worldAction } = await import('./js/screens/world.js'); worldAction(); });
await wait(300);
await skip();
assert.equal(await ev(async ()=>(await import('./js/engine/state.js')).G.s.vehicle), 'cavallo');
await page.keyboard.down('ArrowDown'); await wait(700);
await page.screenshot({ path:'tools/h-cavallo.png' });
await page.keyboard.up('ArrowDown');

assert.deepEqual(errors, []);
console.log('HOUSES OK');
await browser.close(); server.close();

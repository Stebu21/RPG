// Indicatore dell'obiettivo principale: meta giusta per ogni tappa della trama, uscite che portano
// davvero fin lì, freccia orientata, colonna di luce sul posto.
// uso: node tools/goal-check.mjs  -> tools/g-*.png
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
await new Promise(r=>server.listen(8782, r));
const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new', args:['--mute-audio', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e=>errors.push(e.message));
await page.setViewport({ width:1280, height:720 });
await page.goto('http://localhost:8782/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.clear()); await page.reload({ waitUntil:'networkidle0' });
const wait = ms=>new Promise(r=>setTimeout(r, ms));
const ev = (fn, ...a)=>page.evaluate(fn, ...a);
const skip = async ()=>{ for (let i=0; i<60 && await page.$('#dialog-box:not(.hidden)'); i++){ await page.$eval('#dialog-box', e=>e.click()); await wait(50); } };
await page.evaluate(()=>{ document.getElementById('auth-name').value = 'G' + Date.now() % 10000; document.getElementById('auth-pin').value = '1234'; document.getElementById('btn-register').click(); });
await page.waitForSelector('#save-box:not(.hidden)');
await page.$eval('#save-slots button', e=>e.click()); await page.waitForSelector('.hero-card'); await page.$eval('.hero-card[data-hero="ste"]', e=>e.click());
await page.waitForSelector('#screen-world:not(.hidden)'); await wait(800); await skip();
await ev(async ()=>{ const { ZONES } = await import('./js/data/monsters.js'); for (const z of Object.values(ZONES)) z.rate = 0; });

// attende che la mappa attuale sia costruita e disegnata (i paesi OSM richiedono qualche secondo)
const ready = ()=>page.waitForFunction(async ()=>{ const W = await import('./js/screens/world.js'); const { G } = await import('./js/engine/state.js'); return W.debugWorld.w3()?.mapName === G.s.map; }, { timeout:30000, polling:200 }).then(()=>wait(600));
const hud = ()=>page.$eval('#hud-objective', e=>({ hidden:e.classList.contains('hidden'), text:e.textContent.trim(), rot:e.querySelector('.obj-arrow').style.transform }));
// segue le uscite indicate fino alla mappa della meta; restituisce le mappe attraversate
const follow = ()=>ev(async ()=>{
  const W = await import('./js/screens/world.js'); const { G } = await import('./js/engine/state.js'); const { MAPS } = await import('./js/data/maps.js');
  const path = [G.s.map];
  for (let i = 0; i < 8; i++){
    const wp = W.goalWaypoint();
    if (!wp) return { path, err:'nessuna indicazione' };
    if (!wp.exit) return { path, goal:wp };
    const t = MAPS[G.s.map].triggers.find(t=>t.type === 'portal' && t.x === wp.x && t.y === wp.y);
    W.loadMap(t.to.map, t.to.x, t.to.y);
    path.push(G.s.map);
  }
  return { path, err:'giro infinito' };
});

// 1) dopo l'intro: si parte dall'Accademia verso il Lazzaretto di Vedano
let st = await ev(async ()=>{ const { G } = await import('./js/engine/state.js'); return [G.s.map, !!G.s.flags.intro_done]; });
console.log('partenza', st);
await wait(600);
let h = await hud();
console.log('HUD:', h.text);
assert.ok(!h.hidden && /Lazzaretto/.test(h.text) && /verso/.test(h.text), 'all’inizio deve indicare l’uscita verso il Lazzaretto');
await page.screenshot({ path:'tools/g-accademia.png' });
let r = await follow();
console.log('percorso:', r.path.join(' → '), r.err || '');
assert.equal(r.goal?.map, 'vedano');
assert.deepEqual(r.path.slice(-1), ['vedano']);

// 2) in paese: freccia verso la chiesa, colonna di luce sul posto
await ready(); await skip();
h = await hud();
console.log('HUD a Vedano:', h.text, h.rot);
assert.ok(/Lazzaretto · \d+ m/.test(h.text), 'distanza in metri');
assert.ok(/autobus/.test(h.text), 'da lontano va suggerito l’autobus');
const beacon = await ev(async ()=>{ const W = (await import('./js/screens/world.js')).debugWorld.w3(); return !!W.actors.get('beacon:goal'); });
assert.ok(beacon, 'manca la colonna di luce');
// freccia: la chiesa è a destra (est) del giocatore? l'angolo lo deve dire
const geo = await ev(async ()=>{ const W = await import('./js/screens/world.js'); const p = W.debugWorld.player(); const g = W.currentGoal(); return { dx:g.x + 0.5 - p.px, dz:g.y + 0.5 - p.pz }; });
const ang = parseFloat(h.rot.match(/-?[\d.]+/)[0]);
assert.ok(Math.abs(ang - Math.atan2(geo.dx, -geo.dz)) < 0.3, 'freccia orientata male');
// vicino alla meta
const near = await ev(async ()=>{ const W = await import('./js/screens/world.js'); const g = W.currentGoal(); const { MAPS } = await import('./js/data/maps.js');
  const lz = MAPS.vedano.triggers.find(t=>t.event === 'lazzaretto'); W.loadMap('vedano', lz.x, lz.y + 3); return g; });
await ready(); await skip();
await page.screenshot({ path:'tools/g-lazzaretto.png' });

// 3) le tappe successive seguono i Sigilli, poi il Sacro Monte, poi niente
for (const [flags, map] of [[['sigillo_alba'], 'castiglione'], [['sigillo_meriggio'], 'jerago'], [['sigillo_vespro'], 'samarate'], [['sigillo_notte'], 'sacromonte']]){
  await ev(async (flags)=>{ const { G } = await import('./js/engine/state.js'); for (const f of flags) G.s.flags[f] = true; }, flags);
  r = await follow();
  console.log(map.padEnd(12), r.path.join(' → '), r.err || '');
  assert.equal(r.goal?.map, map, `dopo ${flags} la meta dovrebbe essere a ${map}`);
}
await ready(); await skip();
await page.screenshot({ path:'tools/g-sacromonte.png' });
await ev(async ()=>{ const { G } = await import('./js/engine/state.js'); G.s.flags.game_done = true; });
await wait(600);
assert.ok((await hud()).hidden, 'a gioco finito l’indicatore sparisce');

assert.deepEqual(errors, []);
console.log('GOAL OK');
await browser.close(); server.close();

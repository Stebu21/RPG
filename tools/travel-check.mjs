// Zoom della visuale (tasti, rotellina, pizzico) e viaggio rapido verso i paesi visitati.
// uso: node tools/travel-check.mjs  -> tools/z-*.png
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
await new Promise(r=>server.listen(8780, r));
const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new', args:['--mute-audio', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e=>errors.push(e.message));
await page.setViewport({ width:1280, height:720 });
await page.goto('http://localhost:8780/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.clear());
await page.reload({ waitUntil:'networkidle0' });
const wait = ms=>new Promise(r=>setTimeout(r, ms));
const ev = (fn, ...a)=>page.evaluate(fn, ...a);
const skip = async ()=>{ for (let i=0; i<40 && await page.$('#dialog-box:not(.hidden)'); i++){ await page.$eval('#dialog-box', e=>e.click()); await wait(60); } };
const go = (m, x, y)=>ev(async (m, x, y)=>{ const { loadMap } = await import('./js/screens/world.js'); loadMap(m, x, y); }, m, x, y);
const zoom = ()=>ev(async ()=>(await import('./js/screens/world.js')).debugWorld.w3().zoom);
const camDist = ()=>ev(async ()=>{ const W = (await import('./js/screens/world.js')).debugWorld.w3(); return W.camera.position.distanceTo(W.camTarget); });
const state = ()=>ev(async ()=>{ const { G } = await import('./js/engine/state.js'); return { map:G.s.map, x:G.s.x, y:G.s.y, visited:Object.keys(G.s.visited || {}) }; });

await page.$eval('#auth-name', e=>e.value = 'Z' + Date.now() % 10000); await page.$eval('#auth-pin', e=>e.value = '1234');
await page.$eval('#btn-register', e=>e.click()); await page.waitForSelector('#save-box:not(.hidden)');
await page.$eval('#save-slots button', e=>e.click()); await page.waitForSelector('.hero-card'); await page.$eval('.hero-card[data-hero="ste"]', e=>e.click());
await page.waitForSelector('#screen-world:not(.hidden)'); await wait(800); await skip();

// 1) zoom con i tasti: - allontana, + avvicina (limiti rispettati)
const sp = await ev(async ()=>(await import('./js/data/maps.js')).MAPS.vedano.spawn);
await go('vedano', sp.x, sp.y); await wait(1500); await skip();
const z0 = await zoom(), d0 = await camDist();
for (let i = 0; i < 4; i++){ await page.keyboard.press('-'); await wait(40); }
await wait(600);
const z1 = await zoom(), d1 = await camDist();
console.log('zoom', z0, '->', z1.toFixed(2), ' distanza camera', d0.toFixed(1), '->', d1.toFixed(1));
assert.ok(z1 > z0 && d1 > d0 * 1.3, 'il tasto - non allontana');
await page.screenshot({ path:'tools/z-lontano.png' });
for (let i = 0; i < 30; i++) await page.keyboard.press('+');
await wait(600);
assert.equal(+(await zoom()).toFixed(2), 0.55, 'zoom minimo');
await page.screenshot({ path:'tools/z-vicino.png' });
// rotellina: in giù allontana
const zw = await zoom();
await page.mouse.move(640, 360); await page.mouse.wheel({ deltaY:300 }); await wait(100);
assert.ok(await zoom() > zw, 'la rotellina non allontana');
// il valore resta salvato sul dispositivo
assert.ok(await ev(()=>parseFloat(localStorage.getItem('menace_zoom'))) > 0);

// 2) pizzico con due dita sul canvas (telefono)
const cdp = await page.createCDPSession();
const touch = (type, pts)=>cdp.send('Input.dispatchTouchEvent', { type, touchPoints:pts.map(([x, y], id)=>({ x, y, id })) });
await ev(async ()=>(await import('./js/screens/world.js')).debugWorld.w3().setZoom(1));
await touch('touchStart', [[600, 360], [680, 360]]);
for (let k = 1; k <= 6; k++) await touch('touchMove', [[600 - k * 25, 360], [680 + k * 25, 360]]);
await touch('touchEnd', []);
const zp = await zoom();
console.log('pizzico (dita che si allargano): zoom 1 ->', zp.toFixed(2));
assert.ok(zp < 0.8, 'il pizzico non avvicina');
await ev(async ()=>(await import('./js/screens/world.js')).debugWorld.w3().setZoom(1));

// 3) viaggio rapido: Vedano visitato, poi Castiglione; dal menu Mappa si torna a Vedano
const sc = await ev(async ()=>(await import('./js/data/maps.js')).MAPS.castiglione.spawn);
await go('castiglione', sc.x, sc.y); await wait(1200); await skip();
let st = await state();
assert.ok(st.visited.includes('vedano') && st.visited.includes('castiglione'), 'paesi visitati non registrati');
assert.ok(!st.visited.includes('samarate'));
await page.keyboard.press(' '); await page.waitForSelector('#screen-menu:not(.hidden)');
await page.$eval('#menu-tabs .tab[data-tab="map"]', e=>e.click()); await wait(200);
const buttons = await page.$$eval('#fast-travel button', b=>b.map(x=>[x.dataset.town, x.disabled]));
console.log('viaggio rapido:', JSON.stringify(buttons));
assert.deepEqual(buttons.map(b=>b[0]).sort(), ['castiglione', 'vedano']);
assert.ok(buttons.find(b=>b[0] === 'castiglione')[1], 'il paese in cui sei non va proposto');
await wait(700); await page.$eval('#fast-travel', e=>e.scrollIntoView()); await page.screenshot({ path:'tools/z-menu.png' });
await page.$eval('#fast-travel button[data-town="vedano"]', e=>e.click());
await wait(1500); await skip();
st = await state();
assert.deepEqual([st.map, st.x, st.y], ['vedano', sp.x, sp.y], 'il viaggio rapido non porta all\'ingresso di Vedano');
assert.ok(await page.$('#screen-world:not(.hidden)'), 'dopo il viaggio si torna a giocare');
await page.screenshot({ path:'tools/z-arrivo.png' });
// un paese mai visitato non si raggiunge
assert.equal(await ev(async ()=>(await import('./js/screens/world.js')).fastTravel('samarate')), false);

// 4) fermate dell'autobus: dall'ingresso di Vedano al Lazzaretto in un attimo
const stops = await ev(async ()=>(await import('./js/data/maps.js')).MAPS.vedano.triggers.filter(t=>t.type === 'stop'));
console.log('fermate a Vedano:', stops.map(s=>s.name).join(' | '));
assert.ok(stops.length >= 6, 'poche fermate');
const from = stops.find(s=>s.name === 'Ingresso del paese'), to = stops.find(s=>s.name === 'Chiesa del Lazzaretto');
// ci si mette accanto alla palina e ci si gira verso di lei
const side = await ev(async (sx, sy)=>{ const { debugWorld } = await import('./js/screens/world.js');
  return [[0, 1, 'ArrowUp'], [-1, 0, 'ArrowRight'], [1, 0, 'ArrowLeft'], [0, -1, 'ArrowDown']].find(([dx, dy])=>debugWorld.walkable(sx + dx, sy + dy)); }, from.x, from.y);
await go('vedano', from.x + side[0], from.y + side[1]); await wait(500); await skip();
await page.keyboard.down(side[2]); await wait(60); await page.keyboard.up(side[2]); await wait(200);
await ev(async ()=>{ const { worldAction } = await import('./js/screens/world.js'); worldAction(); });
await page.waitForSelector('#choice-box:not(.hidden)');
await wait(300); await page.screenshot({ path:'tools/z-fermata.png' });
const choices = await page.$$eval('#choice-box button', b=>b.map(x=>x.textContent));
assert.ok(choices.includes('Chiesa del Lazzaretto') && !choices.includes('Ingresso del paese'), 'destinazioni sbagliate');
await page.evaluate(()=>[...document.querySelectorAll('#choice-box button')].find(b=>b.textContent === 'Chiesa del Lazzaretto').click());
await wait(800);
st = await state();
const far = Math.hypot(st.x - to.x, st.y - to.y);
console.log('scesi a', st.x, st.y, '— distanza dalla fermata del Lazzaretto', far.toFixed(1));
assert.ok(st.map === 'vedano' && far < 3, 'l\'autobus non porta alla fermata scelta');
assert.ok(await page.$('#dialog-box.hidden') && await page.$('#choice-box.hidden'), 'finestre rimaste aperte');
await page.screenshot({ path:'tools/z-lazzaretto.png' });

assert.deepEqual(errors, []);
console.log('TRAVEL OK');
await browser.close(); server.close();

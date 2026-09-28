// Verifica dei paesi OSM: prestazioni, luoghi, mezzi, corsa, HUD, vista mobile.
// uso: node tools/town-check.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { OSM_TOWNS } from '../www/js/data/towns_osm.js';

const ROOT = new URL('../www', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };
const server = http.createServer(async (q, r)=>{
  const p = q.url === '/' ? '/index.html' : q.url.split('?')[0];
  try { const d = await readFile(join(ROOT, decodeURIComponent(p))); r.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); r.end(d); }
  catch { r.writeHead(404); r.end(); }
});
await new Promise(r=>server.listen(8772, r));
const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new', args:['--mute-audio', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e=>errors.push(e.message));
page.on('console', m=>{ if (m.type() === 'error') errors.push(m.text()); });
await page.setViewport({ width:1280, height:720 });
await page.goto('http://localhost:8772/', { waitUntil:'networkidle0' });
const wait = ms=>new Promise(r=>setTimeout(r, ms));
const skip = async ()=>{ for (let i=0; i<40 && await page.$('#dialog-box:not(.hidden)'); i++){ await page.keyboard.press('Enter'); await wait(70); } };
const go = async (m, x, y)=>{ await page.evaluate(async (m, x, y)=>{ const { loadMap } = await import('./js/screens/world.js'); loadMap(m, x, y); }, m, x, y); await wait(1500); await skip(); await wait(500); };
const fps = ()=>page.evaluate(()=>new Promise(res=>{ let n = 0; const t0 = performance.now(); const f = ()=>{ n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); }; requestAnimationFrame(f); }));
const state = src=>page.evaluate(async src=>{ const { G } = await import('./js/engine/state.js'); return new Function('G', src)(G); }, src);

await page.type('#auth-name', 'T' + Date.now() % 10000); await page.type('#auth-pin', '1234');
await page.click('#btn-register'); await page.waitForSelector('#save-box:not(.hidden)');
await page.click('#save-slots button'); await page.waitForSelector('.hero-card'); await page.click('.hero-card[data-hero="ste"]');
await page.waitForSelector('#screen-world:not(.hidden)'); await wait(500); await skip();

const V = OSM_TOWNS.vedano.poi;
const t0 = Date.now();
await go('vedano', ...V.entry.spawn);
console.log('caricamento Vedano ms', Date.now() - t0 - 2000);
console.log('FPS Vedano', await fps());
await page.screenshot({ path:'tools/t-ingresso.png' });
for (const k of ['chiesa', 'lazzaretto', 'casa1', 'casa2', 'casa3', 'negozio']){
  await go('vedano', ...V[k].front);
  await page.screenshot({ path:`tools/t-${k}.png` });
}
await go('vedano', ...V.gundam.free[2]);
await page.screenshot({ path:'tools/t-gundam.png' });
const hud = await page.$eval('#hud-location', e=>e.textContent);
console.log('HUD:', hud);

// mezzo: la bici vicino a piazza San Rocco
const tri = await page.evaluate(async ()=>{ const { MAPS } = await import('./js/data/maps.js'); return MAPS.vedano.triggers.filter(t=>t.type === 'vehicle'); });
const bike = tri.find(t=>t.vehicle === 'bici');
// mettiti sotto il mezzo, guarda in su e premi Ctrl
await go('vedano', bike.x, bike.y + 1);
await page.keyboard.down('ArrowUp'); await wait(60); await page.keyboard.up('ArrowUp'); await wait(200);
await state("");
await page.evaluate(async ()=>{ const { worldAction } = await import('./js/screens/world.js'); worldAction(); });
await wait(300);
const got = await state("return [G.s.items.bici, G.s.vehicle];");
console.log('bici presa:', got);
await skip();
assert.equal(got[1], 'bici', 'mezzo non preso');
// pedala e cambia mezzo con V
await page.keyboard.down('ArrowDown'); await wait(900);
await page.screenshot({ path:'tools/t-bici.png' });
await page.keyboard.up('ArrowDown');
await state("G.s.items.vespa = 1;");
await page.keyboard.press('v'); await wait(100);
assert.equal(await state("return G.s.vehicle;"), 'vespa');
await page.keyboard.down('ArrowLeft'); await wait(900);
await page.screenshot({ path:'tools/t-vespa.png' });
await page.keyboard.up('ArrowLeft');
await page.keyboard.press('v'); await wait(100);
assert.equal(await state("return G.s.vehicle;"), null);

// corsa: con Shift si va più veloci
const speed = async (shift)=>{
  const a = await state("return [G.s.x, G.s.y];");
  if (shift) await page.keyboard.down('Shift');
  await page.keyboard.down('ArrowRight'); await wait(1000); await page.keyboard.up('ArrowRight');
  if (shift) await page.keyboard.up('Shift');
  const b = await state("return [G.s.x, G.s.y];");
  await wait(300);
  return Math.abs(b[0] - a[0]);
};
await go('vedano', ...V.entry.spawn);
const walk = await speed(false);
await go('vedano', ...V.entry.spawn);
const run = await speed(true);
console.log('passi a piedi/di corsa in 1s:', walk, run);

// altri paesi
for (const town of ['castiglione', 'jerago', 'samarate', 'varese']){
  const T = OSM_TOWNS[town]; if (!T) continue;
  const k = Object.keys(T.poi).find(k=>['collegiata','castello','officina','chiesa'].includes(k));
  await go(town, ...T.poi[k].front);
  console.log('FPS', town, await fps());
  await page.screenshot({ path:`tools/t-${town}.png` });
}

// vista da telefono: camera più lontana
await page.setViewport({ width:390, height:780, isMobile:true, hasTouch:true });
await page.reload({ waitUntil:'networkidle0' });
await page.type('#auth-name', 'M' + Date.now() % 10000); await page.type('#auth-pin', '1234');
await page.click('#btn-register'); await page.waitForSelector('#save-box:not(.hidden)');
await page.click('#save-slots button'); await page.waitForSelector('.hero-card'); await page.click('.hero-card[data-hero="riki"]');
await page.waitForSelector('#screen-world:not(.hidden)'); await wait(500); await skip();
await go('vedano', ...V.chiesa.front);
await page.screenshot({ path:'tools/t-mobile.png' });

assert.deepEqual(errors, []);
assert.ok(run > walk, 'la corsa non è più veloce');
console.log('TOWN OK');
await browser.close(); server.close();

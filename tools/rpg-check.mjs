// Verifica dei sistemi RPG: avatar, Lazzaretto, caratteristiche, negozio,
// recupero graduale, autosalvataggio ed esultanze. uso: node tools/rpg-check.mjs
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
await new Promise(r=>server.listen(8770, r));
const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new', args:['--mute-audio'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e=>errors.push(e.message));
await page.setViewport({ width:1280, height:720 });
await page.goto('http://localhost:8770/', { waitUntil:'networkidle0' });
const wait = ms=>new Promise(r=>setTimeout(r, ms));
const skip = async ()=>{ for (let i=0; i<40 && await page.$('#dialog-box:not(.hidden)'); i++){ await page.keyboard.press('Enter'); await wait(70); } };
const go = async (m, x, y)=>{ await page.evaluate(async (m, x, y)=>{ const { loadMap } = await import('./js/screens/world.js'); loadMap(m, x, y); }, m, x, y); await wait(900); await skip(); };
const S = fn=>page.evaluate(async src=>{ const { G } = await import('./js/engine/state.js'); return new Function('G', src)(G); }, fn);

const acct = 'Rpg' + Date.now() % 10000;
await page.type('#auth-name', acct); await page.type('#auth-pin', '1234');
await page.click('#btn-register');
await page.waitForSelector('#save-box:not(.hidden)');
await page.click('#save-slots button');
await page.waitForSelector('.hero-card');
await page.click('.hero-card[data-hero="ste"]');
await page.waitForSelector('#screen-world:not(.hidden)');
await wait(500); await skip();

// avatar da vicino
await go('vedano', 13, 12);
await wait(1500);
await page.evaluate(()=>{ window.__closeup = true; });
await wait(900); await page.screenshot({ path:'tools/rpg-avatar.png' });
await page.evaluate(()=>{ window.__closeup = false; });
// Chiesa del Lazzaretto
await go('vedano', 6, 13); await wait(500);
await page.screenshot({ path:'tools/rpg-lazzaretto.png' });

// autosalvataggio al cambio mappa
const saves = await page.evaluate(async a=>{ const { listSaves } = await import('./js/engine/save.js'); return listSaves(a).map(s=>s?.meta?.label); }, acct);
assert.ok(saves.some(l=>l && l.includes('(auto)')), 'autosalvataggio assente: ' + JSON.stringify(saves));

// recupero graduale
const hp0 = await S("G.s.chars.ste.hp = 5; G.s.chars.ste.mp = 0; return G.s.chars.ste.hp;");
await wait(3000);
const [hp1, mp1] = await S("return [G.s.chars.ste.hp, G.s.chars.ste.mp];");
assert.ok(hp1 > hp0 && mp1 > 0, `nessun recupero: hp ${hp0}->${hp1}, mp ${mp1}`);

// punti caratteristica + equipaggiamento dal menu
await S("G.s.chars.ste.pts = 4; G.s.gear.bastone_cristallo = 1; G.s.gold = 5000;");
const mag0 = await page.evaluate(async ()=>{ const { G, statsOf } = await import('./js/engine/state.js'); return statsOf(G.s.chars.ste).mag; });
await page.keyboard.press('Space'); await wait(400);
await page.evaluate(()=>[...document.querySelectorAll('#menu-content .char-row')].find(r=>r.textContent.includes('Ste'))?.click());
await wait(300);
await page.evaluate(()=>{ const row = [...document.querySelectorAll('.attr-row')].find(r=>r.textContent.startsWith('INT')); row.querySelector('button').click(); });
await wait(200);
await page.evaluate(()=>{ const row = [...document.querySelectorAll('.attr-row')].find(r=>r.textContent.startsWith('Arma')); row.querySelector('button').click(); });
await wait(200);
await page.evaluate(()=>[...document.querySelectorAll('#menu-content .btn')].find(b=>b.textContent === 'EQUIPAGGIA')?.click());
await wait(300);
await page.screenshot({ path:'tools/rpg-menu.png' });
const [mag1, pts, weapon] = await page.evaluate(async ()=>{ const { G, statsOf } = await import('./js/engine/state.js'); const c = G.s.chars.ste; return [statsOf(c).mag, c.pts, c.eq.arma]; });
assert.equal(pts, 3); assert.equal(weapon, 'bastone_cristallo');
assert.ok(mag1 >= mag0 + 2 + 6, `MAG ${mag0} -> ${mag1}`);
await page.keyboard.press('Escape'); await wait(200); await page.keyboard.press('Escape'); await wait(300);

// negozio a reparti: compra un tomo
await go('negozio_vedano', 3, 5);
await page.keyboard.down('ArrowUp'); await wait(450); await page.keyboard.up('ArrowUp'); await wait(400);
const depts = await page.$$eval('#choice-box button', bs=>bs.map(b=>b.textContent));
assert.ok(depts.some(t=>t.includes('Magie')), 'reparti mancanti: ' + depts);
await page.evaluate(()=>[...document.querySelectorAll('#choice-box button')].find(b=>b.textContent.includes('Magie')).click());
await wait(300);
await page.screenshot({ path:'tools/rpg-shop.png' });
await page.evaluate(()=>[...document.querySelectorAll('#choice-box button')].find(b=>b.textContent.includes('Tomo: Gelo')).click());
await wait(200);
const knows = await page.evaluate(async ()=>{ const { G, knownAbilities } = await import('./js/engine/state.js'); return knownAbilities(G.s.chars.ste); });
assert.ok(knows.includes('gelo'), 'tomo non appreso');
for (let i=0; i<3; i++){ await page.keyboard.press('Escape'); await wait(150); }
await skip();

// battaglia vinta: esultanze
await go('vedano', 13, 12);
await S("for (const c of Object.values(G.s.chars)){ c.level = 30; }");
await page.evaluate(async ()=>{
  const { show } = await import('./js/engine/ui.js');
  show('battle', { monsterIds:['lumacone'], boss:false, onWin:()=>show('world',{resume:true}), onFlee:()=>show('world',{resume:true}) });
});
let won = false;
for (let i=0; i<80 && !won; i++){
  await wait(250);
  won = await page.evaluate(()=>{
    if (document.querySelector('#cmd-title')?.textContent === 'Risultato') return true;
    const a = [...document.querySelectorAll('#cmd-list .btn')].find(b=>b.textContent === 'Attacca');
    a?.click();
    return false;
  });
}
assert.ok(won, 'battaglia non vinta');
for (const n of [1, 2, 3]){ await wait(450); await page.screenshot({ path:`tools/rpg-emote${n}.png` }); }

assert.deepEqual(errors, []);
console.log('RPG OK');
await browser.close(); server.close();

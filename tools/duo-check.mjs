// Verifica del duo: scelta dell'eroe, compagno che segue, combo in battaglia,
// migrazione dei salvataggi vecchi. uso: node tools/duo-check.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

// migrazione: un vecchio party senza Ste né Riki torna col duo in testa
const { ensureDuo } = await import('../www/js/engine/state.js');
const old = { party:['fabri','sofy','ste'], reserve:['riki','pasq'] };
ensureDuo(old);
assert.deepEqual(old.party, ['ste','riki','fabri']);
assert.deepEqual(old.reserve.sort(), ['pasq','sofy']);

const ROOT = new URL('../www', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };
const server = http.createServer(async (req, res)=>{
  const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  try { const data = await readFile(join(ROOT, decodeURIComponent(path)));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' }); res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
await new Promise(r=>server.listen(8768, r));
const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new', args:['--mute-audio'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e=>errors.push(e.message));
await page.setViewport({ width:1280, height:720 });
await page.goto('http://localhost:8768/', { waitUntil:'networkidle0' });
const wait = ms=>new Promise(r=>setTimeout(r, ms));
const skip = async ()=>{ for (let i=0; i<40 && await page.$('#dialog-box:not(.hidden)'); i++){ await page.keyboard.press('Enter'); await wait(70); } };

await page.type('#auth-name', 'Duo' + Date.now() % 10000);
await page.type('#auth-pin', '1234');
await page.click('#btn-register');
await page.waitForSelector('#save-box:not(.hidden)');
await page.click('#save-slots button');
await page.waitForSelector('.hero-card');
await page.screenshot({ path:'tools/duo-scelta.png' });
await page.click('.hero-card[data-hero="riki"]');
await page.waitForSelector('#screen-world:not(.hidden)');
await wait(500); await skip();
const st = await page.evaluate(async ()=>{ const { G } = await import('./js/engine/state.js'); return { hero:G.s.hero, party:G.s.party }; });
assert.equal(st.hero, 'riki'); assert.deepEqual(st.party, ['riki','ste']);

// a Vedano, cammina: Ste deve seguire
await page.evaluate(async ()=>{ const { loadMap } = await import('./js/screens/world.js'); loadMap('vedano', 13, 16); });
await wait(800); await skip();
await page.keyboard.down('ArrowUp'); await wait(1100); await page.keyboard.up('ArrowUp');
await page.keyboard.down('ArrowRight'); await wait(500); await page.keyboard.up('ArrowRight');
await wait(700);
await page.screenshot({ path:'tools/duo-segue.png' });

// battaglia: il comando Combo deve comparire e, a carica piena, funzionare
await page.evaluate(async ()=>{
  const { show } = await import('./js/engine/ui.js');
  show('battle', { monsterIds:['lumacone'], boss:false, onWin:()=>show('world',{resume:true}), onFlee:()=>show('world',{resume:true}) });
});
let used = false;
for (let i=0; i<60 && !used; i++){
  await wait(250);
  used = await page.evaluate(()=>{
    const combo = [...document.querySelectorAll('#cmd-list .btn')].find(b=>b.textContent.includes('Combo'));
    if (!combo || combo.disabled) return false;
    combo.click();
    const lama = [...document.querySelectorAll('#cmd-list .btn')].find(b=>b.textContent.includes('Lama Ardente'));
    if (!lama || lama.disabled) return false;
    lama.click();
    return true;
  });
}
assert.ok(used, 'combo mai disponibile');
for (const [ms, n] of [[250,1],[350,2],[450,3]]){ await wait(ms); await page.screenshot({ path:`tools/duo-combo${n}.png` }); }
const logTxt = await page.$eval('#battle-log', e=>e.textContent);
console.log('log:', logTxt);
assert.match(logTxt, /COMBO|vinto|Vittoria|EXP/i);
assert.deepEqual(errors, []);
console.log('DUO OK');
await browser.close(); server.close();

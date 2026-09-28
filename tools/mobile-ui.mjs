// UI da telefono: PIN con lettere, dialoghi e scelte che non coprono i comandi.
// uso: node tools/mobile-ui.mjs  -> tools/mu-*.png
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
await new Promise(r=>server.listen(8774, r));
const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new', args:['--mute-audio'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e=>errors.push(e.message));
const wait = ms=>new Promise(r=>setTimeout(r, ms));
const rect = sel=>page.$eval(sel, e=>{ const r = e.getBoundingClientRect(); return { l:r.left, t:r.top, r:r.right, b:r.bottom, vis:r.width > 0 && getComputedStyle(e).display !== 'none' }; });
const overlap = (a, b)=>a.vis && b.vis && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
const CONTROLS = ['#dpad', '#btn-action', '#btn-back'];
const checkToast = async tag=>{ const t = await rect('#autosave-toast'); for (const c of CONTROLS) assert.ok(!overlap(t, await rect(c)), `${tag}: l'avviso di salvataggio copre ${c}`); };

for (const [w, h, tag] of [[390, 780, 'port'], [800, 380, 'land']]){
  await page.setViewport({ width:w, height:h, isMobile:true, hasTouch:true });
  await page.goto('http://localhost:8774/', { waitUntil:'networkidle0' });
  await page.evaluate(()=>localStorage.clear());
  // PIN con lettere: registrazione, uscita, di nuovo dentro
  const name = 'Mob' + tag;
  await page.type('#auth-name', name); await page.type('#auth-pin', 'ciao');
  await page.click('#btn-register'); await page.waitForSelector('#save-box:not(.hidden)');
  await page.click('#btn-logout'); await wait(200);
  await page.$eval('#auth-name', e=>e.value = ''); await page.$eval('#auth-pin', e=>e.value = '');
  await page.type('#auth-name', name); await page.type('#auth-pin', 'ciao');
  await page.click('#btn-login');
  await page.waitForSelector('#save-box:not(.hidden)', { timeout:3000 });
  const inputmode = await page.$eval('#auth-pin', e=>e.getAttribute('inputmode'));
  assert.equal(inputmode, null, 'il PIN non deve forzare la tastiera numerica');

  await page.click('#save-slots button'); await page.waitForSelector('.hero-card'); await page.click('.hero-card[data-hero="ste"]');
  await page.waitForSelector('#screen-world:not(.hidden)'); await wait(900);
  // dialogo d'apertura del Rettore: non deve coprire i comandi
  await page.waitForSelector('#dialog-box:not(.hidden)');
  await page.screenshot({ path:`tools/mu-dialog-${tag}.png` });
  const dlg = await rect('#dialog-box');
  for (const c of CONTROLS) assert.ok(!overlap(dlg, await rect(c)), `${tag}: il dialogo copre ${c}`);
  for (let i=0; i<30 && await page.$('#dialog-box:not(.hidden)'); i++){ await page.tap('#dialog-box'); await wait(60); }

  // negozio: dialogo + lista di scelte
  await page.evaluate(async ()=>{ const { loadMap } = await import('./js/screens/world.js'); loadMap('negozio_vedano', 3, 5); });
  await wait(800);
  await page.evaluate(()=>{ const { Input } = window; });
  await page.keyboard.down('ArrowUp'); await wait(450); await page.keyboard.up('ArrowUp'); await wait(400);
  await page.waitForSelector('#choice-box:not(.hidden)');
  await page.screenshot({ path:`tools/mu-shop-${tag}.png` });
  await page.evaluate(async ()=>{ const { autosave } = await import('./js/screens/world.js'); document.getElementById('autosave-toast').classList.remove('hidden'); });
  await checkToast(tag);
  const ch = await rect('#choice-box'), dl = await rect('#dialog-box');
  for (const c of CONTROLS){ const r = await rect(c); assert.ok(!overlap(ch, r), `${tag}: le scelte coprono ${c}`); assert.ok(!overlap(dl, r), `${tag}: il dialogo del negozio copre ${c}`); }
  assert.ok(!overlap(ch, dl), `${tag}: scelte e dialogo si sovrappongono`);
}
assert.deepEqual(errors, []);
console.log('MOBILE UI OK');
await browser.close(); server.close();

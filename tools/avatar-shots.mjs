// Ritratti ravvicinati dei personaggi (per lavorare sugli avatar): tools/av-<tag>-*.png
// uso: node tools/avatar-shots.mjs [tag]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import puppeteer from 'puppeteer-core';

const tag = process.argv[2] || 'now';
const ROOT = new URL('../www', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };
const server = http.createServer(async (q, r)=>{
  const p = q.url === '/' ? '/index.html' : q.url.split('?')[0];
  try { const d = await readFile(join(ROOT, decodeURIComponent(p))); r.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); r.end(d); }
  catch { r.writeHead(404); r.end(); }
});
await new Promise(r=>server.listen(8781, r));
const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new', args:['--mute-audio', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];
const wait = ms=>new Promise(r=>setTimeout(r, ms));
for (const hero of ['ste', 'riki']){
  const page = await browser.newPage();
  page.on('pageerror', e=>errors.push(e.message));
  await page.setViewport({ width:1000, height:760 });
  await page.goto('http://localhost:8781/', { waitUntil:'networkidle0' });
  await page.evaluate(()=>localStorage.clear()); await page.reload({ waitUntil:'networkidle0' });
  await page.evaluate(()=>{ document.getElementById('auth-name').value = 'Av' + Date.now() % 10000; document.getElementById('auth-pin').value = '1234'; document.getElementById('btn-register').click(); });
  await page.waitForSelector('#save-box:not(.hidden)');
  await page.$eval('#save-slots button', e=>e.click()); await page.waitForSelector('.hero-card');
  await page.$eval(`.hero-card[data-hero="${hero}"]`, e=>e.click());
  await page.waitForSelector('#screen-world:not(.hidden)'); await wait(800);
  for (let i=0; i<40 && await page.$('#dialog-box:not(.hidden)'); i++){ await page.$eval('#dialog-box', e=>e.click()); await wait(50); }
  // Piazza di Vedano di giorno: luce naturale; si resta fermi finché il compagno si affianca
  await page.evaluate(async ()=>{
    const { loadMap, debugWorld } = await import('./js/screens/world.js'); const { MAPS } = await import('./js/data/maps.js');
    const sp = MAPS.vedano.spawn;
    loadMap('vedano', sp.x, sp.y + 3);
  });
  await wait(2500);
  for (let i=0; i<40 && await page.$('#dialog-box:not(.hidden)'); i++){ await page.$eval('#dialog-box', e=>e.click()); await wait(50); }
  await wait(1200);
  await page.evaluate(()=>{ window.__closeup = true; }); await wait(900);
  await page.screenshot({ path:`tools/av-${tag}-${hero}.png` });
  await page.evaluate(()=>{ window.__closeup = false; }); await wait(700);
  if (hero === 'ste'){
    // un abitante di Vedano, accanto al giocatore
    await page.evaluate(async ()=>{ const { loadMap } = await import('./js/screens/world.js'); const { MAPS } = await import('./js/data/maps.js');
      const t = MAPS.vedano.triggers.find(t=>t.npc === 'vedano_passante2'); loadMap('vedano', t.x + 1, t.y); });
    await wait(1800); await page.evaluate(()=>{ window.__closeup = true; }); await wait(900);
    await page.screenshot({ path:`tools/av-${tag}-npc.png` });
    await page.evaluate(()=>{ window.__closeup = false; }); await wait(500);
  }
  await page.evaluate(async ()=>(await import('./js/screens/world.js')).debugWorld.w3().setZoom(0.55)); await wait(900);
  await page.screenshot({ path:`tools/av-${tag}-${hero}-gioco.png` });
  await page.close();
}
console.log(errors.length ? errors : 'ok');
await browser.close(); server.close();

// Screenshot di verifica visiva: mondo, menu e battaglia.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = new URL('../www', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };

const server = http.createServer(async (req, res)=>{
  const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  try {
    const data = await readFile(join(ROOT, path));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
await new Promise(r=>server.listen(8766, r));

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--mute-audio','--window-size=1000,560'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 560 });
await page.goto('http://localhost:8766/', { waitUntil: 'networkidle0' });

await page.type('#auth-name', 'Shot');
await page.type('#auth-pin', '1234');
await page.screenshot({ path: 'tools/shot-title.png' });
await page.click('#btn-register');
await page.waitForSelector('#save-box:not(.hidden)');
await page.click('#save-slots button');
await page.waitForSelector('#hero-box:not(.hidden) .hero-card');
await page.click('.hero-card[data-hero="ste"]');
await page.waitForSelector('#screen-world:not(.hidden)');
// chiudi intro
for (let i = 0; i < 20; i++){
  const open = await page.$('#dialog-box:not(.hidden)');
  if (!open) break;
  await page.keyboard.press('Enter');
  await new Promise(r=>setTimeout(r, 100));
}
// qualche passo per vedere la mappa
for (let i = 0; i < 3; i++){
  await page.keyboard.down('ArrowDown');
  await new Promise(r=>setTimeout(r, 180));
  await page.keyboard.up('ArrowDown');
}
await new Promise(r=>setTimeout(r, 300));
await page.screenshot({ path: 'tools/shot-world.png' });

// menu (ritratto)
await page.keyboard.press('Space');
await new Promise(r=>setTimeout(r, 300));
await page.evaluate(()=>document.querySelector('#menu-content .char-row')?.click());
await new Promise(r=>setTimeout(r, 300));
await page.screenshot({ path: 'tools/shot-menu.png' });
await page.keyboard.press('Alt'); // indietro
await page.keyboard.press('Alt'); // chiude il menu
await new Promise(r=>setTimeout(r, 300));

// città (Varese) per vedere gli edifici
await page.evaluate(async ()=>{
  const { MAPS } = await import('./js/data/maps.js');
  const { loadMap } = await import('./js/screens/world.js');
  const m = MAPS.varese.tiles;
  outer: for (let y=2; y<m.length; y++) for (let x=2; x<m[y].length; x++){
    if (m[y][x] === ':'){ loadMap('varese', x, y); break outer; }
  }
});
await new Promise(r=>setTimeout(r, 400));
for (let i = 0; i < 15; i++){
  const open = await page.$('#dialog-box:not(.hidden)');
  if (!open) break;
  await page.keyboard.press('Enter');
  await new Promise(r=>setTimeout(r, 100));
}
await page.screenshot({ path: 'tools/shot-town.png' });

// mappa del mondo + tab mappa
await page.evaluate(async ()=>{
  const { loadMap } = await import('./js/screens/world.js');
  loadMap('world', 28, 20);
});
await new Promise(r=>setTimeout(r, 400));
await page.screenshot({ path: 'tools/shot-overworld.png' });
await page.keyboard.press('Space');
await new Promise(r=>setTimeout(r, 300));
await page.evaluate(()=>document.querySelector('#menu-tabs .tab[data-tab="map"]')?.click());
await new Promise(r=>setTimeout(r, 300));
await page.screenshot({ path: 'tools/shot-map.png' });
await page.keyboard.press('Alt');
await new Promise(r=>setTimeout(r, 300));

// battaglia
await page.evaluate(async ()=>{
  const { show } = await import('./js/engine/ui.js');
  show('battle', { monsterIds:['lumacone','corvo'], boss:false, onWin:()=>show('world',{resume:true}), onFlee:()=>show('world',{resume:true}) });
});
await page.waitForSelector('#battle-commands:not(.hidden)', { timeout: 8000 });
await new Promise(r=>setTimeout(r, 600));
await page.screenshot({ path: 'tools/shot-battle.png' });

// scena con mira attiva
await page.evaluate(()=>{
  const btn = [...document.querySelectorAll('#cmd-list .btn')].find(b=>b.textContent.includes('Attacca'));
  btn?.click();
});
await new Promise(r=>setTimeout(r, 250));
await page.screenshot({ path: 'tools/shot-target.png' });

console.log('Screenshot salvati.');
await browser.close();
server.close();

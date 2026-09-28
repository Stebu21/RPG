// Screenshot mirato: bici attiva sull'overworld.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = 'C:/Users/StefanoBulgheroni/Documents/Stefano/RPG/www';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };
const server = http.createServer(async (req, res)=>{
  const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  try {
    const data = await readFile(join(ROOT, path));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
await new Promise(r=>server.listen(8767, r));

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--mute-audio','--window-size=1000,560'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 560 });
page.on('pageerror', e=>console.log('PAGEERROR:', e.message));
await page.goto('http://localhost:8767/', { waitUntil: 'networkidle0' });
await page.type('#auth-name', 'Bici');
await page.type('#auth-pin', '1234');
await page.click('#btn-register');
await page.waitForSelector('#save-box:not(.hidden)');
await page.click('#save-slots button');
await page.waitForSelector('#hero-box:not(.hidden) .hero-card');
await page.click('.hero-card[data-hero="ste"]');
await page.waitForSelector('#screen-world:not(.hidden)');
for (let i = 0; i < 20; i++){
  if (!await page.$('#dialog-box:not(.hidden)')) break;
  await page.keyboard.press('Enter');
  await new Promise(r=>setTimeout(r, 100));
}
await page.evaluate(async ()=>{
  const { G } = await import('./js/engine/state.js');
  const { loadMap } = await import('./js/screens/world.js');
  G.s.items.bici = 1; G.s.items.scarpe = 1;
  G.s.flags.bici_on = true;
  loadMap('world', 31, 19);   // sulla strada: niente incontri casuali
});
await new Promise(r=>setTimeout(r, 400));
// qualche passo in bici lungo la strada
for (let i = 0; i < 3; i++){
  await page.keyboard.down('ArrowDown');
  await new Promise(r=>setTimeout(r, 150));
  await page.keyboard.up('ArrowDown');
}
await new Promise(r=>setTimeout(r, 250));
await page.screenshot({ path: 'C:/Users/StefanoBulgheroni/Documents/Stefano/RPG/tools/shot-bici.png' });
console.log('OK bici');
await browser.close();
server.close();

// Battaglia su viewport da telefono (verticale e orizzontale): tools/mb-*.png
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join } from 'node:path'; import puppeteer from 'puppeteer-core';
const ROOT = new URL('../www', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };
const server = http.createServer(async (q, r)=>{ const p = q.url === '/' ? '/index.html' : q.url.split('?')[0]; try { const d = await readFile(join(ROOT, p)); r.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); r.end(d); } catch { r.writeHead(404); r.end(); } });
await new Promise(r=>server.listen(8773, r));
const b = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new', args:['--mute-audio'] });
const page = await b.newPage(); const errs = []; page.on('pageerror', e=>errs.push(e.message));
const wait = ms=>new Promise(r=>setTimeout(r, ms));
for (const [w, h, tag] of [[390, 780, 'port'], [780, 390, 'land']]){
  await page.setViewport({ width:w, height:h, isMobile:true, hasTouch:true });
  await page.goto('http://localhost:8773/', { waitUntil:'networkidle0' });
  await page.type('#auth-name', 'MB' + tag + Date.now()%1000); await page.type('#auth-pin', '1234'); await page.click('#btn-register');
  await page.waitForSelector('#save-box:not(.hidden)'); await page.click('#save-slots button'); await page.waitForSelector('.hero-card'); await page.click('.hero-card[data-hero="ste"]');
  await page.waitForSelector('#screen-world:not(.hidden)'); await wait(500);
  await page.evaluate(async ()=>{ const { show } = await import('./js/engine/ui.js'); show('battle', { monsterIds:['lumacone','corvo'], boss:false, area:'vedano', onWin:()=>{}, onFlee:()=>{} }); });
  await wait(2800);
  const z = await page.$eval('#battle-zone', e=>[e.clientWidth, e.clientHeight]);
  console.log(tag, 'zona battaglia', z);
  await page.screenshot({ path:`tools/mb-${tag}.png` });
}
console.log(errs.join('\n') || 'ok'); await b.close(); server.close();

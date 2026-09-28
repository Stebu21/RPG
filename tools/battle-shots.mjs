// Screenshot delle battaglie in ogni zona (+ un boss e un attacco a metà).
// uso: node tools/battle-shots.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = new URL('../www', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };
const server = http.createServer(async (q, r)=>{
  const p = q.url === '/' ? '/index.html' : q.url.split('?')[0];
  try { const d = await readFile(join(ROOT, decodeURIComponent(p))); r.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); r.end(d); }
  catch { r.writeHead(404); r.end(); }
});
await new Promise(r=>server.listen(8771, r));
const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new', args:['--mute-audio'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e=>errors.push(e.message));
await page.setViewport({ width:1280, height:720 });
await page.goto('http://localhost:8771/', { waitUntil:'networkidle0' });
const wait = ms=>new Promise(r=>setTimeout(r, ms));
await page.type('#auth-name', 'B' + Date.now() % 10000); await page.type('#auth-pin', '1234');
await page.click('#btn-register'); await page.waitForSelector('#save-box:not(.hidden)');
await page.click('#save-slots button'); await page.waitForSelector('.hero-card'); await page.click('.hero-card[data-hero="riki"]');
await page.waitForSelector('#screen-world:not(.hidden)'); await wait(500);

const fight = async (area, ids, boss=false)=>{
  await page.evaluate(async (area, ids, boss)=>{
    const { show } = await import('./js/engine/ui.js');
    show('battle', { monsterIds:ids, boss, area, onWin:()=>show('world',{resume:true}), onFlee:()=>show('world',{resume:true}) });
  }, area, ids, boss);
  await wait(2600);
};
for (const [area, ids] of [['varese', ['lumacone','corvo']], ['vedano', ['lumacone']], ['castiglione', ['corvo','lumacone']], ['jerago', ['lumacone']], ['samarate', ['corvo']], ['sacromonte', ['corvo','lumacone']]]){
  await fight(area, ids);
  await page.screenshot({ path:`tools/b-${area}.png` });
}
await fight('vedano', ['boss_golem'], true);
await page.screenshot({ path:'tools/b-boss.png' });
// attacco a metà animazione
await page.evaluate(()=>[...document.querySelectorAll('#cmd-list .btn')].find(b=>b.textContent === 'Attacca')?.click());
await wait(380);
await page.screenshot({ path:'tools/b-attack.png' });
console.log(errors.length ? 'ERRORI:\n' + errors.join('\n') : 'ok');
await browser.close(); server.close();

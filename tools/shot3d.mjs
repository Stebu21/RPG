// Screenshot del mondo 3D: Vedano (giorno), interno, mondo, e test di fisica.
// uso: node tools/shot3d.mjs [ora]   (es. 21 per la notte)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = new URL('../www', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };
const server = http.createServer(async (req, res)=>{
  const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  try { const data = await readFile(join(ROOT, decodeURIComponent(path)));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' }); res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
await new Promise(r=>server.listen(8767, r));
const hour = process.argv[2] ? +process.argv[2] : null;

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--mute-audio', '--window-size=1280,720', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e=>errors.push(e.message));
page.on('console', m=>{ if (m.type() === 'error') errors.push(m.text()); });
await page.setViewport({ width: 1280, height: 720 });
if (hour !== null) await page.evaluateOnNewDocument(h=>{
  const R = Date; const off = (()=>{ const d = new R(); const t = new R(d); t.setHours(h, 0, 0, 0); return t - d; })();
  globalThis.Date = class extends R { constructor(...a){ super(...(a.length ? a : [R.now() + off])); } static now(){ return R.now() + off; } };
}, hour);
await page.goto('http://localhost:8767/', { waitUntil: 'networkidle0' });
const wait = ms=>new Promise(r=>setTimeout(r, ms));
const skipDialogs = async ()=>{
  for (let i = 0; i < 30; i++){
    if (!await page.$('#dialog-box:not(.hidden)')) break;
    await page.keyboard.press('Enter'); await wait(80);
  }
};

await page.type('#auth-name', 'Shot3d' + Date.now() % 10000);
await page.type('#auth-pin', '1234');
await page.click('#btn-register');
await page.waitForSelector('#save-box:not(.hidden)');
await page.click('#save-slots button');
await page.waitForSelector('#screen-world:not(.hidden)');
await wait(500); await skipDialogs();

const go = async (map, x, y)=>{
  await page.evaluate(async (m, x, y)=>{ const { loadMap } = await import('./js/screens/world.js'); loadMap(m, x, y); }, map, x, y);
  await wait(900); await skipDialogs(); await wait(400);
};
const tag = hour !== null ? '-h' + hour : '';

await go('vedano', 13, 12);
await page.screenshot({ path: `tools/3d-vedano${tag}.png` });

// fisica: cammina in diagonale verso la piazza e contro un muro
await page.keyboard.down('ArrowUp'); await page.keyboard.down('ArrowLeft');
await wait(900);
await page.keyboard.up('ArrowLeft'); await wait(500); await page.keyboard.up('ArrowUp');
await wait(300);
const pos = await page.evaluate(async ()=>{ const { G } = await import('./js/engine/state.js'); return [G.s.x, G.s.y, G.s.map]; });
console.log('dopo movimento:', pos);
// partiti da (13,12): la diagonale su-sinistra deve spostare su entrambi gli assi senza attraversare muri
if (!(pos[0] < 13 && pos[1] < 12 && pos[2] === 'vedano')) { console.error('FISICA KO'); process.exitCode = 1; }
await page.screenshot({ path: `tools/3d-vedano2${tag}.png` });

// primo piano dei personaggi: camera ravvicinata
await go('vedano', 11, 9);
await page.evaluate(()=>{ window.__closeup = true; });
await wait(600);
await page.screenshot({ path: `tools/3d-closeup${tag}.png` });
await page.evaluate(()=>{ window.__closeup = false; });
// in bici lungo la via
await page.evaluate(async ()=>{ const { G } = await import('./js/engine/state.js'); G.s.items.bici = 1; G.s.flags.bici_on = true; });
await go('vedano', 13, 16);
await page.keyboard.down('ArrowUp'); await wait(700); await page.keyboard.up('ArrowUp'); await wait(100);
await page.screenshot({ path: `tools/3d-bici${tag}.png` });
await page.evaluate(async ()=>{ const { G } = await import('./js/engine/state.js'); G.s.flags.bici_on = false; });
await go('vedano', 20, 6);
await page.screenshot({ path: `tools/3d-parco${tag}.png` });
await go('vedano', 6, 12);
await page.screenshot({ path: `tools/3d-filanda${tag}.png` });

await go('chiesa_vedano', 4, 7);
await page.screenshot({ path: `tools/3d-chiesa${tag}.png` });
await go('world', 31, 18);
await page.screenshot({ path: `tools/3d-world${tag}.png` });

console.log(errors.length ? 'ERRORI:\n' + errors.join('\n') : 'nessun errore');
await browser.close(); server.close();

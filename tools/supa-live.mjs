// Prova dal vivo col Supabase vero: accesso con l'account di prova da un "dispositivo" vuoto.
// Si usa 127.0.0.2 perché su localhost il gioco resta offline di proposito (vedi js/config.js).
// uso: node tools/supa-live.mjs
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
await new Promise(r=>server.listen(8779, '127.0.0.2', r));
const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new', args:['--mute-audio'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e=>errors.push(e.message));
await page.goto('http://127.0.0.2:8779/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.clear());
await page.reload({ waitUntil:'networkidle0' });
await page.type('#auth-name', 'ProvaClaude'); await page.type('#auth-pin', 'prova123');
await page.click('#btn-login');
await page.waitForSelector('#save-box:not(.hidden)', { timeout:15000 });
const slots = await page.$$eval('.save-slot', b=>b.map(x=>x.textContent));
console.log(slots);
assert.match(slots[1], /test/, 'la partita online non è arrivata');
assert.deepEqual(errors, []);
console.log('SUPABASE LIVE OK');
await browser.close(); server.close();

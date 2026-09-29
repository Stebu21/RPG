// Anteprima dei ritratti 2D dei personaggi (menu e scelta dell'eroe): tools/portraits.png
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = new URL('../www/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const server = http.createServer(async (q, r)=>{
  if (q.url === '/p'){ r.writeHead(200, { 'Content-Type':'text/html' }); r.end('<!doctype html><body></body>'); return; }
  try { const p = q.url.split('?')[0]; const d = await readFile(join(ROOT, p)); r.writeHead(200, { 'Content-Type':{ '.js':'text/javascript' }[extname(p)] || 'application/octet-stream' }); r.end(d); }
  catch { r.writeHead(404); r.end(); }
}).listen(8792);
const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new' });
const page = await browser.newPage();
page.on('pageerror', e=>console.log('errore pagina:', e.message));
await page.goto('http://localhost:8792/p');
const png = await page.evaluate(async ()=>{
  const { drawPortrait } = await import('/js/engine/sprites.js');
  const { CHARACTERS } = await import('/js/data/characters.js');
  const ids = Object.keys(CHARACTERS), out = document.createElement('canvas'); out.width = 140 * ids.length; out.height = 140;
  const g = out.getContext('2d');
  ids.forEach((id, i)=>{ const c = document.createElement('canvas'); drawPortrait(c, CHARACTERS[id]); g.drawImage(c, i * 140, 0); });
  return out.toDataURL('image/png');
});
await writeFile(new URL('./portraits.png', import.meta.url), Buffer.from(png.split(',')[1], 'base64'));
await browser.close(); server.close();
console.log('tools/portraits.png');

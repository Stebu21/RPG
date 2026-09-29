// ritratto 2D ingrandito di un personaggio: node tools/render-one.mjs pasq -> tools/portrait-<id>.png
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
const ROOT = new URL('../www/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), id = process.argv[2] || 'pasq';
const server = http.createServer(async (q, r)=>{ if (q.url === '/p'){ r.writeHead(200, { 'Content-Type':'text/html' }); r.end('<!doctype html><body></body>'); return; }
  try { const d = await readFile(join(ROOT, q.url.split('?')[0])); r.writeHead(200, { 'Content-Type':'text/javascript' }); r.end(d); } catch { r.writeHead(404); r.end(); } }).listen(8794);
const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new' });
const page = await browser.newPage(); await page.goto('http://localhost:8794/p');
const png = await page.evaluate(async id=>{ const { drawPortrait } = await import('/js/engine/sprites.js'); const { CHARACTERS } = await import('/js/data/characters.js');
  const c = document.createElement('canvas'); drawPortrait(c, CHARACTERS[id]); const o = document.createElement('canvas'); o.width = o.height = 420; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, 420, 420); return o.toDataURL('image/png'); }, id);
await writeFile(new URL(`./portrait-${id}.png`, import.meta.url), Buffer.from(png.split(',')[1], 'base64'));
await browser.close(); server.close(); console.log('ok', id);

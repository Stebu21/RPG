// Anteprima dall'alto delle mappe generate da OSM: tools/osm/prev-<paese>.png
import { writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import { OSM_TOWNS } from '../www/js/data/towns_osm.js';

const COL = { '.':'#5d9a4a', ',':'#7fae55', 'F':'#d98ec0', 'T':'#2c6a24', '=':'#555a62', ':':'#b8ae9e', '~':'#2e6fb2', 'B':'#8a5a2b',
  '#':'#c9885a', 'd':'#6b3a22', 'D':'#ffd700', 'C':'#ffffff', 'W':'#888', 'G':'#00e5ff', 'P':'#fff29a', 'b':'#8a6334', 'E':'#1f5a1a' };
const b = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new' });
const page = await b.newPage();
for (const [name, t] of Object.entries(OSM_TOWNS)){
  const png = await page.evaluate((t, COL)=>{
    const s = 4, H = t.tiles.length, W = t.tiles[0].length;
    const c = document.createElement('canvas'); c.width = W*s; c.height = H*s;
    const x = c.getContext('2d');
    t.tiles.forEach((row, y)=>[...row].forEach((ch, i)=>{ x.fillStyle = COL[ch] || '#000'; x.fillRect(i*s, y*s, s, s); }));
    x.font = 'bold 11px sans-serif'; x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 3;
    for (const [k, p] of Object.entries(t.poi)){ const at = p.door || p.at || p.spawn; if (!at) continue; x.strokeText(k, at[0]*s + 4, at[1]*s); x.fillText(k, at[0]*s + 4, at[1]*s);
      x.fillStyle = '#f00'; x.fillRect(at[0]*s - 2, at[1]*s - 2, 8, 8); x.fillStyle = '#fff'; }
    return c.toDataURL().split(',')[1];
  }, t, COL);
  await writeFile(`tools/osm/prev-${name}.png`, Buffer.from(png, 'base64'));
}
await b.close();
console.log('ok');

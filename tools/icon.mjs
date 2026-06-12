// Genera le icone launcher Android disegnandole su canvas (via Chrome headless).
import { writeFile, mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
});
const page = await browser.newPage();

// disegna l'icona a una data dimensione; fg=true disegna solo il soggetto (per le adaptive icon)
async function renderIcon(size, fgOnly){
  return page.evaluate(({size, fgOnly})=>{
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const x = c.getContext('2d');
    const u = size / 100; // unità
    if (!fgOnly){
      const g = x.createLinearGradient(0, 0, 0, size);
      g.addColorStop(0, '#141033'); g.addColorStop(0.65, '#2a1a4e'); g.addColorStop(1, '#0a0a14');
      x.fillStyle = g; x.fillRect(0, 0, size, size);
      // stelle
      x.fillStyle = '#cdd6ff';
      for (let i=0; i<24; i++){
        const sx = (i*37 % 100) * u, sy = (i*53 % 45) * u;
        x.fillRect(sx, sy, u*0.8, u*0.8);
      }
      // monte (Sacro Monte)
      x.fillStyle = '#1d2a45';
      x.beginPath(); x.moveTo(-10*u, 100*u); x.lineTo(30*u, 48*u); x.lineTo(58*u, 78*u);
      x.lineTo(80*u, 58*u); x.lineTo(112*u, 100*u); x.closePath(); x.fill();
      x.fillStyle = '#2c3e60';
      x.beginPath(); x.moveTo(8*u, 100*u); x.lineTo(30*u, 48*u); x.lineTo(52*u, 100*u); x.closePath(); x.fill();
    }
    // clessidra dorata al centro
    const cx = 50*u, top = fgOnly ? 30*u : 34*u, h = fgOnly ? 40*u : 38*u, w = fgOnly ? 26*u : 24*u;
    x.strokeStyle = '#f1c40f'; x.lineWidth = 2.6*u; x.lineJoin = 'round';
    x.beginPath();
    x.moveTo(cx-w/2, top); x.lineTo(cx+w/2, top);
    x.lineTo(cx-w/2, top+h); x.lineTo(cx+w/2, top+h);
    x.lineTo(cx-w/2, top); x.closePath(); x.stroke();
    // sabbia
    x.fillStyle = '#ffe9a8';
    x.beginPath(); x.moveTo(cx-w/2+2.2*u, top+2.2*u); x.lineTo(cx+w/2-2.2*u, top+2.2*u); x.lineTo(cx, top+h*0.42); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(cx-w/2+2.2*u, top+h-2*u); x.lineTo(cx+w/2-2.2*u, top+h-2*u); x.lineTo(cx, top+h*0.7); x.closePath(); x.fill();
    return c.toDataURL('image/png');
  }, {size, fgOnly});
}

const RES = 'android/app/src/main/res';
const sizes = { mdpi:48, hdpi:72, xhdpi:96, xxhdpi:144, xxxhdpi:192 };
const fgSizes = { mdpi:108, hdpi:162, xhdpi:216, xxhdpi:324, xxxhdpi:432 };

await page.setContent('<html></html>');
for (const [dpi, s] of Object.entries(sizes)){
  const dir = `${RES}/mipmap-${dpi}`;
  await mkdir(dir, { recursive: true });
  const data = (await renderIcon(s, false)).split(',')[1];
  await writeFile(`${dir}/ic_launcher.png`, Buffer.from(data, 'base64'));
  await writeFile(`${dir}/ic_launcher_round.png`, Buffer.from(data, 'base64'));
  const fg = (await renderIcon(fgSizes[dpi], true)).split(',')[1];
  await writeFile(`${dir}/ic_launcher_foreground.png`, Buffer.from(fg, 'base64'));
}
console.log('Icone generate.');
await browser.close();

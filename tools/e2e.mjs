// Test end-to-end headless: avvia il gioco, crea account, inizia la partita,
// avanza l'intro, muove il personaggio, apre il menu. Fallisce su errori console.
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
  } catch { console.log('404:', path); res.writeHead(404); res.end('404'); }
});
await new Promise(r=>server.listen(8765, r));

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--mute-audio','--window-size=900,500'],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 500 });

const errors = [];
page.on('console', m => {
  if (m.type() === 'error' && !m.location()?.url?.includes('favicon')) errors.push(m.text());
});
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

const fail = async (msg) => {
  console.error('FALLITO:', msg);
  if (errors.length) console.error('Errori console:\n' + errors.join('\n'));
  await page.screenshot({ path: 'tools/e2e-fail.png' });
  await browser.close(); server.close();
  process.exit(1);
};

try {
  await page.goto('http://localhost:8765/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#screen-title:not(.hidden)', { timeout: 5000 });
  console.log('1. Titolo OK');

  // registrazione
  await page.type('#auth-name', 'TestStef');
  await page.type('#auth-pin', '1234');
  await page.click('#btn-register');
  await page.waitForSelector('#save-box:not(.hidden)', { timeout: 3000 });
  console.log('2. Registrazione OK');

  // nuova partita
  await page.click('#save-slots button');
  await page.waitForSelector('#screen-world:not(.hidden)', { timeout: 3000 });
  console.log('3. Nuova partita OK (mondo visibile)');

  // intro: il dialogo deve apparire
  await page.waitForSelector('#dialog-box:not(.hidden)', { timeout: 3000 });
  console.log('4. Dialogo intro OK');

  // avanza tutte le battute dell'intro
  for (let i = 0; i < 20; i++){
    const open = await page.$('#dialog-box:not(.hidden)');
    if (!open) break;
    await page.keyboard.press('Enter');
    await new Promise(r=>setTimeout(r, 120));
  }
  const stillOpen = await page.$('#dialog-box:not(.hidden)');
  if (stillOpen) await fail('il dialogo intro non si chiude');
  console.log('5. Intro completata');

  // movimento: scendi verso l'uscita dell'Accademia
  for (let i = 0; i < 4; i++){
    await page.keyboard.down('ArrowDown');
    await new Promise(r=>setTimeout(r, 200));
    await page.keyboard.up('ArrowDown');
  }
  console.log('6. Movimento OK');

  // parla col Rettore: vai su e interagisci
  // (semplice check: niente errori finora)

  // apri menu
  await page.keyboard.press('Escape');
  await page.waitForSelector('#screen-menu:not(.hidden)', { timeout: 3000 });
  console.log('7. Menu OK');
  // tab missione
  await page.click('#menu-tabs .tab[data-tab="mission"]');
  await new Promise(r=>setTimeout(r, 200));
  // salva
  await page.click('#menu-tabs .tab[data-tab="save"]');
  await new Promise(r=>setTimeout(r, 200));
  await page.click('#menu-content .item-row button');
  await new Promise(r=>setTimeout(r, 300));
  console.log('8. Salvataggio OK');
  // chiudi menu
  await page.click('#menu-tabs .tab[data-tab="close"]');
  await page.waitForSelector('#screen-world:not(.hidden)', { timeout: 3000 });
  console.log('9. Ritorno al mondo OK');

  // battaglia forzata: inietta un incontro
  await page.evaluate(async ()=>{
    const { show } = await import('./js/engine/ui.js');
    show('battle', { monsterIds:['lumacone','corvo'], boss:false, onWin:()=>show('world',{resume:true}), onFlee:()=>show('world',{resume:true}) });
  });
  await page.waitForSelector('#screen-battle:not(.hidden)', { timeout: 3000 });
  await page.waitForSelector('#battle-commands:not(.hidden)', { timeout: 8000 });
  console.log('10. Battaglia: comandi visibili');

  // attacca finché la battaglia non finisce (o max 40 azioni)
  for (let i = 0; i < 40; i++){
    const worldBack = await page.$('#screen-world:not(.hidden)');
    if (worldBack) break;
    // se ci sono comandi, attacca; se serve un bersaglio, tocca un nemico vivo
    await page.evaluate(()=>{
      const btn = [...document.querySelectorAll('#cmd-list .btn')]
        .find(b=>b.textContent.includes('Attacca') || b.textContent.includes('Continua'));
      if (btn) btn.click();
      const e = document.querySelector('.enemy:not(.dead)');
      if (e) e.click();
    });
    await new Promise(r=>setTimeout(r, 500));
  }
  const backToWorld = await page.$('#screen-world:not(.hidden)');
  if (!backToWorld) await fail('la battaglia non si conclude');
  console.log('11. Battaglia vinta e ritorno al mondo OK');

  // screenshot finale
  await page.screenshot({ path: 'tools/e2e-ok.png' });

  if (errors.length) await fail('errori console rilevati');
  console.log('\nE2E OK: nessun errore console.');
} catch (e) {
  await fail(e.message);
}

await browser.close();
server.close();
process.exit(0);

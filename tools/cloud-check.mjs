// Salvataggi online: finto Supabase in memoria, due "dispositivi" (localStorage svuotato).
// uso: node tools/cloud-check.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const ROOT = new URL('../www', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };
let cloud = true, offline = false;
const db = {}, calls = [];
// stesse risposte delle funzioni in supabase/schema.sql
const RPC = {
  rpg_register({ p_name, p_pin, p_saves }){
    const k = p_name.toLowerCase();
    if (db[k]) return { ok:false, msg:'Questo nome esiste già.' };
    db[k] = { name:p_name, pin:p_pin, saves:p_saves || [null, null, null] };
    return { ok:true, name:p_name };
  },
  rpg_login({ p_name, p_pin }){
    const a = db[p_name.toLowerCase()];
    if (!a) return { ok:false, missing:true, msg:'Account inesistente.' };
    if (a.pin !== p_pin) return { ok:false, msg:'PIN errato.' };
    return { ok:true, name:a.name, saves:a.saves };
  },
  rpg_save({ p_name, p_pin, p_slot, p_data }){
    const a = db[p_name.toLowerCase()];
    if (!a || a.pin !== p_pin) return { ok:false };
    a.saves[p_slot] = p_data; return { ok:true };
  },
};
const server = http.createServer(async (q, r)=>{
  const p = q.url === '/' ? '/index.html' : q.url.split('?')[0];
  if (p === '/js/config.js' && cloud){
    r.writeHead(200, { 'Content-Type':'text/javascript' });
    return r.end(`export const SUPABASE_URL = 'http://localhost:8775/fake'; export const SUPABASE_KEY = 'anon-test';`);
  }
  if (p.startsWith('/fake/rest/v1/rpc/')){
    if (offline){ r.destroy(); return; }
    let body = ''; for await (const c of q) body += c;
    const fn = p.split('/').pop(); calls.push(fn);
    assert.equal(q.headers.apikey, 'anon-test');
    r.writeHead(200, { 'Content-Type':'application/json' });
    return r.end(JSON.stringify(RPC[fn](JSON.parse(body))));
  }
  try { const d = await readFile(join(ROOT, decodeURIComponent(p))); r.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); r.end(d); }
  catch { r.writeHead(404); r.end(); }
});
await new Promise(r=>server.listen(8775, r));
const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new', args:['--mute-audio', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];
let page;
const wait = ms=>new Promise(r=>setTimeout(r, ms));
// ogni "dispositivo" è una scheda nuova; clear = niente dati locali
const device = async (clear=true)=>{
  await page?.close(); page = await browser.newPage(); page.on('pageerror', e=>errors.push(e.message));
  await page.goto('http://localhost:8775/', { waitUntil:'networkidle0' });
  if (clear){ await page.evaluate(()=>localStorage.clear()); await page.reload({ waitUntil:'networkidle0' }); }
};
const auth = async (btn, name, pin)=>{
  await page.$eval('#auth-name', e=>e.value = ''); await page.$eval('#auth-pin', e=>e.value = '');
  await page.type('#auth-name', name); await page.type('#auth-pin', pin);
  await page.click(btn);
  await page.waitForFunction(()=>!document.getElementById('save-box').classList.contains('hidden') || !/Connessione/.test(document.getElementById('auth-msg').textContent));
  return page.$eval('#save-box', e=>!e.classList.contains('hidden'));
};
const skip = async ()=>{ for (let i=0; i<40 && await page.$('#dialog-box:not(.hidden)'); i++){ await page.$eval('#dialog-box', e=>e.click()); await wait(70); } };
const autosave = async ()=>{
  for (let i=0; i<40; i++){
    await skip();
    const ok = await page.evaluate(async ()=>{ const { autosave } = await import('./js/screens/world.js'); autosave(); return !document.getElementById('autosave-toast').classList.contains('hidden'); });
    if (ok) return; await wait(200);
  }
  throw new Error('autosalvataggio mai partito');
};
const slots = ()=>page.$$eval('.save-slot', b=>b.map(x=>x.textContent));

// dispositivo 1: nuovo account, partita, autosalvataggio che va online
await device();
assert.ok(await auth('#btn-register', 'Ale', 'ciao'));
await page.click('#save-slots button'); await page.waitForSelector('.hero-card'); await page.click('.hero-card[data-hero="riki"]');
await page.waitForSelector('#screen-world:not(.hidden)'); await page.waitForSelector('#dialog-box:not(.hidden)', { timeout:4000 }).catch(()=>{}); await skip(); await wait(300);
await autosave();
await wait(300);
assert.ok(calls.includes('rpg_save'), 'il salvataggio non è andato online');
assert.match(db.ale.saves[0].meta.label, /Riki/);

// dispositivo 2: niente in locale, stesso nome e PIN → ritrova la partita
await device();
assert.equal(await auth('#btn-login', 'Ale', 'sbagliato'), false);
assert.match(await page.$eval('#auth-msg', e=>e.textContent), /PIN errato/);
assert.ok(await auth('#btn-login', 'ale', 'ciao'));
assert.match((await slots())[0], /Riki/, 'la partita non compare sul secondo dispositivo');
await page.click('#btn-logout');

// senza rete: si entra con la copia locale
offline = true;
assert.ok(await auth('#btn-login', 'Ale', 'ciao'));
await page.click('#btn-logout');
offline = false;

// account vecchio, creato solo sul dispositivo: al primo accesso online viene caricato
cloud = false; await device();
assert.ok(await auth('#btn-register', 'Vecchio', '1234'));
await page.click('#save-slots button'); await page.waitForSelector('.hero-card'); await page.click('.hero-card[data-hero="ste"]');
await page.waitForSelector('#screen-world:not(.hidden)'); await page.waitForSelector('#dialog-box:not(.hidden)', { timeout:4000 }).catch(()=>{}); await skip(); await wait(300);
await autosave();
assert.equal(db.vecchio, undefined);
cloud = true; await device(false);
assert.ok(await auth('#btn-login', 'Vecchio', '1234'));
assert.match(db.vecchio?.saves?.[0]?.meta?.label || '', /Ste/, 'account locale non portato online');

assert.deepEqual(errors, []);
console.log('CLOUD OK', calls.join(' '));
await browser.close(); server.close();

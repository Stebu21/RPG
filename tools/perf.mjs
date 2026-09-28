// Misura delle prestazioni: FPS senza limite di vsync, draw call, triangoli, tempo di costruzione.
// uso: node tools/perf.mjs [etichetta]   -> tools/perf-<etichetta>.json
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import puppeteer from 'puppeteer-core';

const tag = process.argv[2] || 'now';
const ROOT = new URL('../www', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };
const server = http.createServer(async (q, r)=>{
  const p = q.url === '/' ? '/index.html' : q.url.split('?')[0];
  try { const d = await readFile(join(ROOT, decodeURIComponent(p))); r.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); r.end(d); }
  catch { r.writeHead(404); r.end(); }
});
await new Promise(r=>server.listen(8778, r));
const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new',
  args:['--mute-audio', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit', '--enable-precise-memory-info'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e=>errors.push(e.message));
await page.setViewport({ width:1280, height:720 });
await page.goto('http://localhost:8778/', { waitUntil:'networkidle0' });
const wait = ms=>new Promise(r=>setTimeout(r, ms));
const ev = (fn, ...a)=>page.evaluate(fn, ...a);
const skip = async ()=>{ for (let i=0; i<40 && await page.$('#dialog-box:not(.hidden)'); i++){ await page.$eval('#dialog-box', e=>e.click()); await wait(60); } };
await page.type('#auth-name', 'P' + Date.now() % 10000); await page.type('#auth-pin', '1234');
await page.click('#btn-register'); await page.waitForSelector('#save-box:not(.hidden)');
await page.click('#save-slots button'); await page.waitForSelector('.hero-card'); await page.click('.hero-card[data-hero="ste"]');
await page.waitForSelector('#screen-world:not(.hidden)'); await wait(800); await skip();
await ev(async ()=>{ const { ZONES } = await import('./js/data/monsters.js'); for (const z of Object.values(ZONES)) z.rate = 0; });

// fotogrammi in 3 s (senza vsync) e tempo JS medio per fotogramma
const measure = ()=>ev(()=>new Promise(res=>{
  let n = 0; const t0 = performance.now(); let last = t0; const dts = [];
  const f = t=>{ n++; dts.push(t - last); last = t; if (t - t0 < 3000) requestAnimationFrame(f); else {
    dts.sort((a, b)=>a - b);
    res({ fps:Math.round(n / 3), p95ms:+dts[Math.floor(dts.length * 0.95)].toFixed(1) });
  } };
  requestAnimationFrame(f);
}));
const info = ()=>ev(async ()=>{
  const { debugWorld } = await import('./js/screens/world.js');
  const r = debugWorld.w3().renderer; const i = r.info;
  i.autoReset = false; i.reset();
  await new Promise(res=>requestAnimationFrame(()=>requestAnimationFrame(res)));
  const calls = i.render.calls / 2, tris = i.render.triangles / 2;   // due fotogrammi, tutte le passate
  i.autoReset = true;
  return { calls, tris, geo:i.memory.geometries, tex:i.memory.textures, progs:i.programs.length,
           heapMB:Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6) };
  return { calls:i.render.calls, tris:i.render.triangles, geo:i.memory.geometries, tex:i.memory.textures, progs:i.programs.length,
           heapMB:Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6) };
});
const out = {};
const scenes = [
  ['vedano', async ()=>{ const { MAPS } = await import('./js/data/maps.js'); return ['vedano', ...Object.values(MAPS.vedano.spawn)]; }],
  ['varese', async ()=>['varese', 108, 30]],
  ['samarate', async ()=>{ const { MAPS } = await import('./js/data/maps.js'); return ['samarate', ...Object.values(MAPS.samarate.spawn)]; }],
  ['mondo', async ()=>['world', 31, 19]],
  ['vedano2', async ()=>{ const { MAPS } = await import('./js/data/maps.js'); return ['vedano', ...Object.values(MAPS.vedano.spawn)]; }],
  ['interno', async ()=>{ const { MAPS } = await import('./js/data/maps.js'); const k = Object.keys(MAPS).find(k=>k.startsWith('vedano_int_')); return [k, 5, 5]; }],
  ['uscita', async ()=>{ const { MAPS } = await import('./js/data/maps.js'); return ['vedano', ...Object.values(MAPS.vedano.spawn)]; }],   // si esce di casa: il paese è già pronto
];
for (const [name, where] of scenes){
  const [m, x, y] = await ev(where);
  const prof = process.argv[3] === 'caricamento' && await page.createCDPSession();
  if (prof){ await prof.send('Profiler.enable'); await prof.send('Profiler.setSamplingInterval', { interval:500 }); await prof.send('Profiler.start'); }
  const t0 = Date.now();
  await ev(async (m, x, y)=>{ const { loadMap } = await import('./js/screens/world.js'); loadMap(m, x, y); }, m, x, y);
  // attende che la mappa sia costruita (primo fotogramma dopo il cambio)
  await ev(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const build = Date.now() - t0;
  if (prof){
    const { profile } = await prof.send('Profiler.stop');
    // tempo totale (proprio + chiamate) per funzione
    const byId = new Map(profile.nodes.map(n=>[n.id, n])), tot = new Map(), total = profile.samples.length;
    const sub = nd=>{ let h = nd.hitCount || 0; for (const c of nd.children || []) h += sub(byId.get(c)); nd.tot = h; return h; };
    sub(profile.nodes[0]);
    for (const nd of profile.nodes){ const f = nd.callFrame; if (!f.url.includes('/js/')) continue; const k = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`; tot.set(k, Math.max(tot.get(k) || 0, nd.tot)); }
    console.log([...tot].sort((a, b)=>b[1] - a[1]).slice(0, 16).map(([k, v])=>`  ${(v / total * 100).toFixed(1)}%  ${k}`).join(String.fromCharCode(10)));
  }
  await wait(1000); await skip();
  const idle = await measure();
  // tempo JS dentro W3.render (scena + post-processing, lato CPU) e nel resto del fotogramma
  idle.cpu = await ev(async ()=>{
    const { debugWorld } = await import('./js/screens/world.js');
    const W = debugWorld.w3(); const orig = W.render.bind(W); let t = 0, n = 0;
    W.render = (...a)=>{ const t0 = performance.now(); orig(...a); t += performance.now() - t0; n++; };
    await new Promise(r=>setTimeout(r, 1500));
    W.render = orig;
    return +(t / n).toFixed(2);
  });
  await page.keyboard.down('ArrowRight'); const walk = await measure(); await page.keyboard.up('ArrowRight');
  if (process.argv[3] === 'oggetti') console.log(await ev(async ()=>{
    const { debugWorld } = await import('./js/screens/world.js');
    const acc = {}; let empty = 0;
    debugWorld.w3().scene.traverse(o=>{ const k = o.isInstancedMesh ? 'InstancedMesh' : o.type; acc[k] = (acc[k] || 0) + 1; if (o.type === 'Group' && !o.children.length) empty++; });
    const why = {};
    debugWorld.w3().mapGroup.traverse(o=>{
      if (!o.isMesh || o.isInstancedMesh) return;
      let dyn = false; for (let p = o; p; p = p.parent) if (p.userData.dyn) dyn = true;
      const k = dyn ? 'dyn' : o.geometry.attributes.position.count > 20000 ? 'grande' : o.material.isShaderMaterial ? 'shader' : Array.isArray(o.material) ? 'multi' : (o.material.map ? 'tex ' : '') + o.material.type + ' v' + (o.geometry.attributes.position.count > 400 ? '>400' : '<=400');
      why[k] = (why[k] || 0) + 1;
    });
    return JSON.stringify({ ...acc, gruppiVuoti:empty, mesh:why });
  }));
  if (process.argv[3] === 'profilo'){
    // funzioni con più tempo proprio in 2 s di gioco
    const cdp = await page.createCDPSession();
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval:200 });
    await cdp.send('Profiler.start'); await wait(2000);
    const { profile } = await cdp.send('Profiler.stop');
    const self = new Map(), total = profile.samples.length;
    for (const nd of profile.nodes){
      const f = nd.callFrame, k = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`;
      self.set(k, (self.get(k) || 0) + (nd.hitCount || 0));
    }
    console.log([...self].sort((a, b)=>b[1] - a[1]).slice(0, 18).map(([k, v])=>`  ${(v / total * 100).toFixed(1)}%  ${k}`).join(String.fromCharCode(10)));
  }
  out[name] = { build, idle, walk, ...(await info()) };
  if (process.argv[3] === 'dettagli') console.log(await ev(async ()=>{
    // triangoli per tipo di oggetto (istanze comprese) e chi proietta ombre
    const { debugWorld } = await import('./js/screens/world.js');
    const W = debugWorld.w3(), acc = {};
    W.scene.traverse(o=>{
      if (!o.isMesh || !o.visible) return;
      const g = o.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
      const k = (o.isInstancedMesh ? 'inst:' : '') + (o.material.type || '?') + (o.castShadow ? ' [ombra]' : '') + (o.material.name ? ' ' + o.material.name : '');
      acc[k] = acc[k] || { n:0, tris:0 }; acc[k].n++; acc[k].tris += t;
    });
    return Object.entries(acc).sort((a, b)=>b[1].tris - a[1].tris).slice(0, 12).map(([k, v])=>`${k}: ${v.n} mesh, ${Math.round(v.tris / 1000)}k tri`).join(String.fromCharCode(10));
  }));
  console.log(name.padEnd(9), JSON.stringify(out[name]));
}
await writeFile(`tools/perf-${tag}.json`, JSON.stringify(out, null, 1));
if (errors.length) console.log('errori', errors);
await browser.close(); server.close();

// Anteprima degli avatar 3D dei personaggi: Chrome headless, un fotogramma per personaggio,
// di fronte e di tre quarti da dietro. Salva tools/avatars.png.
// uso: node tools/render-avatars.mjs
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = new URL('../www/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const PAGE = `<!doctype html><script type="importmap">{ "imports": { "three": "/js/vendor/three/three.module.js", "three/addons/": "/js/vendor/three/addons/" } }</script><body style="margin:0;background:#88a"></body>`;
const server = http.createServer(async (q, r)=>{
  if (q.url === '/av'){ r.writeHead(200, { 'Content-Type':'text/html' }); r.end(PAGE); return; }
  try { const p = q.url.split('?')[0]; const d = await readFile(join(ROOT, p)); r.writeHead(200, { 'Content-Type':{ '.js':'text/javascript', '.html':'text/html' }[extname(p)] || 'application/octet-stream' }); r.end(d); }
  catch { r.writeHead(404); r.end(); }
}).listen(8791);
const browser = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new', args:['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', e=>console.log('errore pagina:', e.message));
await page.goto('http://localhost:8791/av');
const png = await page.evaluate(async ()=>{
  const THREE = await import('three');
  const { Person } = await import('/js/engine/character3d.js');
  const { CHARACTERS } = await import('/js/data/characters.js');
  const ids = Object.keys(CHARACTERS), W = 200, H = 280;
  const renderer = new THREE.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true });
  renderer.setSize(W * ids.length, H * 2);
  const out = document.createElement('canvas'); out.width = W * ids.length; out.height = H * 2; const g = out.getContext('2d');
  for (const [i, id] of ids.entries()){
    for (const [row, ang] of [[0, 0.35], [1, Math.PI + 0.6]]){
      const scene = new THREE.Scene(); scene.background = new THREE.Color(0x9aa8c8);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
      const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(2, 4, 3); scene.add(sun);
      const p = new Person(CHARACTERS[id], id);
      p.update(0.3, ang, 0, 0);
      scene.add(p.root);
      const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 50); cam.position.set(0, 1.0, 4.2); cam.lookAt(0, 0.8, 0);
      renderer.setSize(W, H); renderer.render(scene, cam);
      g.drawImage(renderer.domElement, i * W, row * H);
      g.fillStyle = '#fff'; g.font = 'bold 14px sans-serif'; g.fillText(CHARACTERS[id].name + ' — ' + CHARACTERS[id].className, i * W + 6, row * H + 18);
    }
  }
  return out.toDataURL('image/png');
});
await writeFile(new URL('./avatars.png', import.meta.url), Buffer.from(png.split(',')[1], 'base64'));
await browser.close(); server.close();
console.log('tools/avatars.png');

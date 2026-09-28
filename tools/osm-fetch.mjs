// Scarica da OpenStreetMap (Overpass) vie, edifici, aree e alberi dei paesi
// che non sono nell'estratto di Vedano. Riprova finché il server risponde.
// uso: node tools/osm-fetch.mjs   -> tools/osm/<paese>.json
// Dati (c) OpenStreetMap contributors, ODbL.
import { writeFile, access } from 'node:fs/promises';

export const TOWNS_REMOTE = {
  jerago:   { lat:45.7053, lon:8.7978, dLat:0.0055, dLon:0.0080 },
  samarate: { lat:45.6264, lon:8.7839, dLat:0.0055, dLon:0.0080 },
  varese:   { lat:45.8177, lon:8.8267, dLat:0.0045, dLon:0.0065 },
};
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

async function fetchTown(name, t){
  const bb = `${t.lat - t.dLat},${t.lon - t.dLon},${t.lat + t.dLat},${t.lon + t.dLon}`;
  const q = `[out:json][timeout:120];
(
  way["highway"](${bb});
  way["building"](${bb});
  way["leisure"](${bb});
  way["landuse"](${bb});
  way["natural"~"^(water|wood|scrub|tree_row)$"](${bb});
  way["waterway"](${bb});
  node["natural"="tree"](${bb});
  nwr["amenity"~"^(place_of_worship|bar|cafe|restaurant|pharmacy|post_office|townhall|school)$"](${bb});
  nwr["shop"](${bb});
  nwr["historic"](${bb});
);
out center geom tags;`;
  for (let attempt = 0; attempt < 12; attempt++){
    for (const m of MIRRORS){
      try {
        const r = await fetch(m, { method:'POST', headers:{ 'User-Agent':'RPG-map-builder/1.0 (personal game)', 'Accept':'application/json',
          'Content-Type':'application/x-www-form-urlencoded' }, body:'data=' + encodeURIComponent(q), signal:AbortSignal.timeout(150000) });
        const txt = await r.text();
        if (r.ok && txt.startsWith('{')){
          const j = JSON.parse(txt);
          if (j.elements?.length){ await writeFile(`tools/osm/${name}.json`, txt); console.log(name, 'ok', j.elements.length); return; }
        }
        console.log(name, m, r.status);
      } catch (e){ console.log(name, m, e.message); }
    }
    await new Promise(r=>setTimeout(r, 30000));
  }
  console.log(name, 'RINUNCIO');
}

// solo se lanciato direttamente (il generatore importa soltanto TOWNS_REMOTE)
if (process.argv[1]?.endsWith('osm-fetch.mjs')) for (const [name, t] of Object.entries(TOWNS_REMOTE)){
  try { await access(`tools/osm/${name}.json`); console.log(name, 'già scaricato'); continue; } catch {}
  await fetchTown(name, t);
}

import {scenePaintings,detailPaintings} from '../src/painted_assets.js';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {buildAssetTransport} from './asset_transport.mjs';
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
await build({
  entryPoints: [path.join(root, 'src/bootstrap.js')],
  bundle: true, format: 'iife', target: 'es2020', outfile: path.join(dist, 'app.js'),
  logLevel: 'warning', sourcemap: false, minify: true,
});
const copy = (rel) => {
  const src = path.join(root, rel), dst = path.join(dist, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
};
const cssText = ['style.css', 'folio.css'].map(n => fs.readFileSync(path.join(root, 'src', n), 'utf8')).join('\n');
fs.writeFileSync(path.join(dist, 'style.css'), cssText);
const cssHash = createHash('sha256').update(cssText).digest('hex').slice(0, 8);
const appHash = createHash('sha256').update(fs.readFileSync(path.join(dist, 'app.js'))).digest('hex').slice(0, 8);
const htmlText = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8')
  .replace('<link rel="stylesheet" href="./style.css">', `<link rel="stylesheet" href="./style.css?v=${cssHash}">`)
  .replace('<script src="./app.js"></script>', `<script src="./app.js?v=${appHash}"></script>`);
fs.writeFileSync(path.join(dist, 'index.html'), htmlText);
const zones = ['rural','town','city','rail','future'];
const vehicles = ['rickshaw','car','green_train','hsr','harmony','rocket','future_metro'];
const textures = ['cloud.png','glow.png','star.png','smoke.png','shadow.png','grain.png','ink.png','seal.png'];
copy('assets/fonts/shanhe-titles.woff');
copy('assets/fonts/note-handwriting.woff');
for(const family of ['mashanzheng','zcoolqingkehuangyou']){
  fs.copyFileSync(path.join(root,'assets','sources','lettering',family+'-OFL.txt'),path.join(dist,'assets','fonts',family+'-OFL.txt'));
}
for (const f of zones) copy(`assets/zones/${f}.glb`);
for (const f of vehicles) copy(`assets/vehicles/${f}.glb`);
const plates=new Set([...scenePaintings,...detailPaintings].map(name=>name+'.webp'));
for(const name of [...zones,'earth'])plates.add('folio-'+name+'.webp');
plates.add('book-cover.webp');
for(const file of fs.readdirSync(path.join(root,'assets/audio/dialogue')))copy('assets/audio/dialogue/'+file);
for (const f of plates) copy(`assets/painted/${f}`);
// This build directory may still hold the scene additions from earlier local tests.
for(const f of fs.readdirSync(path.join(dist,'assets','painted'))){
  if(f.endsWith('.webp')&&!plates.has(f))fs.unlinkSync(path.join(dist,'assets','painted',f));
}

for (const f of ['grass_bermuda_01','weed_plant_02','rural_broadleaf']) fs.rmSync(path.join(dist,'assets','vegetation',f+'.glb'),{force:true});
for (const f of textures) copy(`assets/textures/${f}`);
for(const f of ['earth.jpg','clouds.jpg','CLOUDS-CREDIT.txt','EARTH-CREDIT.txt'])copy(`assets/earth/${f}`);
buildAssetTransport(dist);
const total = fs.readdirSync(path.join(dist,'assets','zones')).reduce((a,f)=>a+fs.statSync(path.join(dist,'assets','zones',f)).size,0);
console.log('H5 built to dist · zones', (total/1048576).toFixed(1)+'MB');

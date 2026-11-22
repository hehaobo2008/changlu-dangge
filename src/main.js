import { route, crossings, routeIndex, crossingAt, hermite, travelTime, progressAtTime, travelLength, glide, arrivalCurve, sampleArrival } from './journey.js';
import { railway } from './rail_traffic.js';
import { futureMetro } from './future_metro.js';
import {scenes,vesselMark,streetLightAir} from './family_scenes.js';
import { letters, endingText, familyNote } from './letters.js';
import { createTicketView } from './tickets.js';
import { openBook,printFirstPage } from './opening.js';
import { frameIslandMap } from './overview.js';
import { fillHomeTickets } from './homecoming.js';
import { setupTitlePage, titleProgress, titleReady, resetNarration, enterChapter, afterTicket, updateSubtitles, updateInterlude, updatePaperTags, chapterIdentity, playAlbum, stopAlbum } from './narration.js';
import { pages } from './story.js';
import { createEarthEnding, DURATION as EARTH_END } from './earth/ending.js';
// 《山河织路》 — interactive 3D scroll. Five connected miniature landscapes.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Soundscape } from './audio.js';
import {loadAssetURL} from './asset_transport.js';
import {AssetTextureLoader,waitForAssetTextures} from './asset_loaders.js';
import { makePaperPipeline } from './paper.js';
import { applyWater } from './water.js';
import { loadPaintings, PaintedSky, illustrate } from './illustration.js';
import { stageLandscapes } from './painted_scenes.js';
import { prepareWoodland } from './woodland.js';
import { studioSky, rainOnAvenue, villagePond, passingRain, finishMasonry, paintSurfaces } from './surface.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const isTouch = matchMedia('(pointer: coarse)').matches;
const isMobile = innerWidth < 820 || isTouch;
const q = new URLSearchParams(location.search);
const captureMode = q.get('capture') === '1';
const lowQuality = isMobile && !q.get('high');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = motionQuery.matches;
motionQuery.addEventListener('change', e => { reducedMotion = e.matches; });
const ENTRY = [.1, .315, .545, .79, .937];
let preferences = {};
try {
  const current = localStorage.getItem('shanhe.knocks');
  if (current) preferences = JSON.parse(current) || {};
  else preferences.sound = JSON.parse(localStorage.getItem('shanhe.preferences') || '{}')?.sound === true;
} catch {}
if (typeof preferences !== 'object') preferences = {};
function savePreferences() {
  try { localStorage.setItem('shanhe.knocks', JSON.stringify({ sound: state.sound, memories:[...state.collected], quotes:[...state.kept], wish:state.replyDraft, speed:state.speed, skipRead:state.skipRead, hinted:state.hinted })); } catch {}
}

const SPACING = 420;
const ZONES = [
  { id: 'rural', label: '田埂晨', num: '壹', year: '1983', center: 0, file: 'rural.glb', start: 0.045, end: 0.215 },
  { id: 'town', label: '街市暮', num: '贰', year: '1996', center: -420, file: 'town.glb', start: 0.25, end: 0.43 },
  { id: 'city', label: '城夜雨', num: '叁', year: '2008', center: -840, file: 'city.glb', start: 0.47, end: 0.65 },
  { id: 'rail', label: '山河速', num: '肆', year: '2023', center: -1260, file: 'rail.glb', start: 0.69, end: 0.86 },
  { id: 'future', label: '星河远', num: '伍', year: '2049', center: -1680, file: 'future.glb', start: 0.90, end: 1.0 },
];

const PALETTES = [
  { name:'rural', top:'#95b4bf', bot:'#ffdcaf', sun:'#ffd099', fog:'#d9cdb0', fogNear:29, fogFar:275,
    sunDir:[.84,.24,-.49], sunInt:3.15, hemi:.66, fill:.23, fillColor:'#afc8d4', exp:1.10,
    ink:.43, bloom:.11, stars:0, clouds:.40, waterDeep:'#284d45', waterShallow:'#818c5d' },
  { name:'town', top:'#b69da9', bot:'#f9bc82', sun:'#ffb174', fog:'#cfa69f', fogNear:39, fogFar:235,
    sunDir:[-.82,.33,-.48], sunInt:3.80, hemi:.48, fill:.18, fillColor:'#b8c4db', exp:1.06,
    ink:.45, bloom:.13, stars:0, clouds:.46, waterDeep:'#344e4d', waterShallow:'#859e83' },
  { name:'city', top:'#25375d', bot:'#596684', sun:'#a6c9ff', fog:'#455474', fogNear:29, fogFar:267,
    sunDir:[.55,.65,-.53], sunInt:.84, hemi:.33, fill:.11, fillColor:'#9faccc', exp:1.10,
    ink:.32, bloom:.24, stars:0, clouds:.24, waterDeep:'#101f31', waterShallow:'#334a63' },
  { name:'rail', top:'#819cab', bot:'#f5be91', sun:'#ffb579', fog:'#c6b4a4', fogNear:66, fogFar:398,
    sunDir:[.75,.23,-.62], sunInt:3.15, hemi:.60, fill:.23, fillColor:'#b5d9e2', exp:1.04,
    ink:.39, bloom:.075, stars:0, clouds:.52, waterDeep:'#294e54', waterShallow:'#8f9275' },
  { name:'future', top:'#384666', bot:'#dda69a', sun:'#ffc2a0', fog:'#847f92', fogNear:70, fogFar:325,
    sunDir:[-.82,.18,-.53], sunInt:1.68, hemi:.56, fill:.28, fillColor:'#9ab8c6', exp:1.12,
    ink:.31, bloom:.23, stars:.22, clouds:.18, waterDeep:'#254857', waterShallow:'#638683' },
];
const OVERVIEW_PAL = { name: 'overview', top: '#f3ecdf', bot: '#e7dcc6', sun: '#ffd9a0', fog: '#ece2cf', fogNear: 760, fogFar: 4200,
  sunDir: [-0.45, .5, -0.42], sunInt: 2.45, hemi: 1.55, fill: .7, fillColor: '#fff6e5', exp: 1.2,
  ink: .72, bloom: .2, stars: 0, clouds: 0, waterDeep: '#4e6a5a', waterShallow: '#9ab09c' };

const OVERVIEW_POSE = { pos: [900, 700, 600], look: [0, 0, -820], fov: 42 };
const OVERVIEW_POSE_PORTRAIT = { pos: [-341, 3192, -57], look: [0, 20, -900], fov: 48 };
function overviewPose() { return innerWidth / innerHeight < .85 ? OVERVIEW_POSE_PORTRAIT : OVERVIEW_POSE; }
// ---------------------------------------------------------------- UI helpers
const el=Object.fromEntries(['loading','loadFill','loadPct','landing','startBtn','hud','chapter','chNum','chYear','chTitle','chLine','chSetting','mailFrom','mailAction','letterPages','prevLetter','nextLetter','launchSignal','cardTitle','cardBody','cardIndex','keepLetter','cardClose','tlFill','timeline','scrollHint','overviewBtn','soundBtn','soundTxt','infoBtn','info','infoClose','overview','ovLabels','ovBack','ink','wishInput','launchBtn','skipFinale','endCard','endWish','againBtn','endOverviewBtn','toast','world','autoBtn','autoTxt','homeBtn','travelMeta','journeyPct','collectedTxt','memoryBtn','landingSoundBtn','replyQuote','endSource','endQuote','endReply','endRecipient'].map(id=>[id,$('#'+id)]));
el.card=$('#ticketLayer');
const boardingReturn=$('#boardingReturn');

const state = {
  mode: 'loading', // loading landing prologue approach travel overview finale ended
  progress: 0, target: 0, chapter: -1, chapterShown: false,
  jumping: null, started: false, finaleShown: false, ended: false,
  voidMix: 1, time: 0, mouse: new THREE.Vector2(), look: new THREE.Vector2(),
  kept:new Set((Array.isArray(preferences.quotes)?preferences.quotes:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<4)),
  speed:[.65,1,1.8].includes(preferences.speed)?preferences.speed:1,skipRead:preferences.skipRead===true,hinted:preferences.hinted===true,
  keptLetter: null, delivered: 0, reading: 0, replyDraft: '', wish: '', sound: preferences.sound === true, ready: false, frozen: false,
  auto: false, modal: null, autoPages:true, presented:new Set(), watchingFor:-1, watchingTime:0, arrival:null, storyStop:null, routeVelocity:0, glideSpeed:0, metreSpeed:0, braking:null, pendingLaunch:null, introTime:0, approach:null,
  collected: new Set((Array.isArray(preferences.memories) ? preferences.memories : []).filter(i => Number.isInteger(i) && i >= 0 && i < 5)),
};

let earthEnding=null;
let previousMode = null;
function hidden(node, value) {
  if (node.classList.contains('hidden') !== value) node.classList.toggle('hidden', value);
  node.inert = value || !!state.modal;
}
function syncUIState(force = false) {
  if (!force && previousMode === state.mode) return;
  const wasLanding = previousMode === 'landing';
  previousMode = state.mode;
  document.body.dataset.mode = state.mode;
  hidden(el.landing, state.mode !== 'landing');
  $('#prologue').hidden = $('#prologue').inert = state.mode !== 'prologue';
  document.body.classList.toggle('ticket-reading',state.modal===el.card);
  paper.paperPass.uniforms.readingFocus.value=state.modal===el.card?1:0;
  hidden(el.hud, !['travel'].includes(state.mode));
  hidden(el.timeline, state.mode !== 'travel');
  hidden(el.travelMeta, state.mode !== 'travel');
  updateBoardingReturn();
  hidden(el.overview, state.mode !== 'overview');
  el.endCard.classList.toggle('show', state.mode === 'ended');
  el.endCard.inert = state.mode !== 'ended' || !!state.modal;
  if (wasLanding !== (state.mode === 'landing')) resizeViewport();
}
let panelReturnFocus = null;
function closePanels(restoreFocus=true){
  const wasOpen=state.modal,resume=state.resumeAfterTicket;
  if(wasOpen===el.card&&state.mode==='travel')afterTicket(state.reading);
  el.info.classList.remove('show');el.info.inert=true;$('#detailPanel').classList.remove('show');$('#detailPanel').inert=true;tickets.hide();
  state.modal=null;state.arrival=null;state.storyStop=null;state.braking=null;state.glideSpeed=state.metreSpeed=0;state.target=state.progress;
  state.resumeAfterTicket=false;el.infoBtn.setAttribute('aria-expanded','false');syncUIState(true);
  if(restoreFocus&&wasOpen===el.card){
    if(resume&&state.mode==='travel'&&state.progress<.996)setAuto(true);
  }
  if(restoreFocus&&wasOpen){
    const focus=wasOpen===el.card&&!boardingReturn.hidden?boardingReturn:
      panelReturnFocus?.isConnected&&!panelReturnFocus.closest('[inert]')&&!el.card.contains(panelReturnFocus)?panelReturnFocus:el.memoryBtn;
    focus?.focus({preventScroll:true});
  }
}
function openPanel(panel,focusTarget){
  const returnFocus=document.activeElement;
  cancelArrival();closePanels(false);setAuto(false);
  clearTimeout(showToast._t);el.toast.classList.remove('show');
  state.modal=panel;panelReturnFocus=returnFocus;panel.classList.add('show');panel.inert=false;
  el.infoBtn.setAttribute('aria-expanded',String(panel===el.info));syncUIState(true);
  (focusTarget||panel.querySelector('button,input'))?.focus({preventScroll:true});
}
function setAuto(on) {
  if(state.auto===!!on)return;
  state.auto = !!on;
  el.autoBtn.setAttribute('aria-pressed', String(state.auto));
  el.autoBtn.setAttribute('aria-label', state.auto ? '暂停自动漫游' : '开始自动漫游');
  el.autoTxt.textContent = state.auto ? '暂停漫游' : '自动漫游';
  el.autoBtn.querySelector('use').setAttribute('href', state.auto ? '#i-pause' : '#i-play');
}
function routePixelRatio(width,height,step=0){
  const native=Math.min(devicePixelRatio,lowQuality?1.5:2);
  const budget=captureMode||q.has('high')?native:Math.min(native,Math.sqrt(2073600/(width*height)));
  return budget*Math.pow(.80,step);
}
function resizeViewport() {
  const width = Math.max(1, el.world.clientWidth), height = Math.max(1, el.world.clientHeight);
  const ratio=earthEnding?.active?earthEnding.pixelRatio:routePixelRatio(width,height,qualityStep);
  const size=renderer.getSize(new THREE.Vector2());
  if(size.x===width && size.y===height && renderer.getPixelRatio()===ratio)return;
  renderer.setDrawingBufferSize(width,height,ratio);
  camera.aspect = width / height; camera.updateProjectionMatrix();
  paper.setSize(width, height);
  earthEnding?.resize(width,height);
  if (state.mode === 'overview') frameOverview();
}

// ---------------------------------------------------------------- renderer
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(routePixelRatio(innerWidth,innerHeight));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.environment = studioSky(renderer);
scene.environmentIntensity = .46;
scene.background = new THREE.Color('#efe6d5');
const camera = new THREE.PerspectiveCamera(44, innerWidth / innerHeight, 0.1, 4000);
camera.position.set(70, 82, 310);

const paper = makePaperPipeline(renderer, scene, camera, {
  ink: .9, grain: .055, bloomStrength: .35, paper: '#f3ecdf',
});
if (lowQuality) paper.bloom.enabled = false;

// ---------------------------------------------------------------- sky
const texLoader = new AssetTextureLoader();
const glowTex = texLoader.load('/assets/textures/glow.png');
const starTex = texLoader.load('/assets/textures/star.png');
const smokeTex = texLoader.load('/assets/textures/smoke.png');
const shadowTex = texLoader.load('/assets/textures/shadow.png');

const sky = new PaintedSky(scene);
let animateScenery, trains,metro;

// ---------------------------------------------------------------- lights
const hemi = new THREE.HemisphereLight('#f4efe2', '#6b5b45', 1.4);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffd9a8', 2.4);
sun.castShadow = true;
sun.shadow.autoUpdate = false;
sun.shadow.mapSize.set(lowQuality ? 1024 : 2048, lowQuality ? 1024 : 2048);
sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 420;
sun.shadow.bias = -0.00015; sun.shadow.normalBias = .31;
scene.add(sun); scene.add(sun.target);
const fill = new THREE.DirectionalLight('#cfe0e8', .55);
scene.add(fill); scene.add(fill.target);

// Island silhouettes during aerial views.
const islandShadows = new THREE.Group();
scene.add(islandShadows);
const islandShadowByZone = {};
for (const z of ZONES) {
  const m = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: .28, depthWrite: false, color: '#3b2a18' });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(430, 430), m);
  p.rotation.x = -Math.PI / 2; p.position.set(0, -28, z.center); p.userData.noNormal = true;
  islandShadows.add(p);
  islandShadowByZone[z.id] = p;
}
islandShadows.visible = false;

// ---------------------------------------------------------------- water + zones
const water = applyWater(scene, 'all'); // created once; no water meshes yet, but materials ready
// applyWater already traversed empty scene; we will re-apply after zones load via helper below.
const waterSet = water;
// A quieter version of the water shader is local to the morning pond.
const ruralPondMat = waterSet.pondMat.clone();
ruralPondMat.uniforms.uRipple.value = .84;
let waterApplied = false;
function applyWaterToZones() {
  if (waterApplied) return;
  for (const [id, data] of Object.entries(zones)) {
    data.group?.traverse(o => {
      if (o.isMesh && o.material && o.material.name === 'Water') {
        const isPaddy = o.name.includes('Paddy') || o.name.includes('Terrace');
        o.material = isPaddy ? waterSet.paddyMat : id === 'rural' ? ruralPondMat : id === 'rail' ? waterSet.riverMat : waterSet.pondMat;
        o.receiveShadow = false;
      }
    });
  }
  waterApplied = true;
}

const zones = {};
const fx = [];
const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder);
let loadedCount = 0;
const totalAssets = ZONES.length + 7 + 1;
function bumpLoad() {
  loadedCount++;
  const pct = Math.min(80, Math.round(loadedCount / totalAssets * 80));
  if (el.loadFill) el.loadFill.style.width = pct + '%';
  if (el.loadPct) el.loadPct.textContent = pct + '%';
  $('.load-line').setAttribute('aria-valuenow', String(pct));
  $('#loadStatus').textContent = `正在铺开五页旧纸 · ${loadedCount} / ${totalAssets}`;
  titleProgress(pct);
}
async function loadAsset(url) {
  const asset=await gltfLoader.loadAsync(await loadAssetURL(url));
  bumpLoad();return asset;
}

async function loadWorld() {
  const tasks = ZONES.map(z => loadAsset('/assets/zones/' + z.file).then(g => ({ z, g })));
  const [zoneResults, rick, train, carG, hsr, rocket, harmony, paintings, metroAsset] = await Promise.all([
    Promise.all(tasks),
    loadAsset('/assets/vehicles/rickshaw.glb'),
    loadAsset('/assets/vehicles/green_train.glb'),
    loadAsset('/assets/vehicles/car.glb'),
    loadAsset('/assets/vehicles/hsr.glb'),
    loadAsset('/assets/vehicles/rocket.glb'),
    loadAsset('/assets/vehicles/harmony.glb'),
    loadPaintings().then(plates => { bumpLoad(); return plates; }),
    loadAsset('/assets/vehicles/future_metro.glb'),
  ]);
  sky.plates=paintings;
  for (const { z, g } of zoneResults) {
    if (!g) { zones[z.id] = { spec: z, group: null, lights: [], smoke: [] }; continue; }
    const group = g.scene;
    group.position.z = z.center;
    scene.add(group);
    const data = { spec: z, group, lights: [], smoke: [] };
    group.updateMatrixWorld(true);
    group.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true;
        if (o.material) o.material.envMapIntensity = .6;
        const mat=o.material;
        if(mat.name==='Overhead conductors'){
          o.userData.noNormal=true;o.castShadow=false;o.receiveShadow=false;
        }
        if(mat.name.startsWith('Q leaves ')){
          o.userData.noNormal=true;
          mat.transparent=false;mat.depthWrite=true;mat.alphaTest=.36;mat.forceSinglePass=true;
          if(mat.map) mat.map.anisotropy=4;
        }
        if(mat.name.startsWith('Port nursery glazing')){
          mat.depthWrite=false;mat.forceSinglePass=true;o.userData.noNormal=true;o.castShadow=false;
        }
        if(!mat.userData.stageCoating){
          if (z.id==='town' && ['Matte','Stone','Rough'].includes(mat.name)) finishMasonry(mat,mat.name==='Matte');
          if (['CityConcrete','RailConcrete','RailRock','F_Matte','F_White'].includes(mat.name)) finishMasonry(mat,false);
          paintSurfaces(mat,z.id,paintings);mat.userData.stageCoating=true;
        }
        if(z.id==='future' && /^Emis(Cyan|Warm)$/.test(mat.name)) mat.emissiveIntensity=.52;
        if (['Branch_foliage','Harvest_panicles'].includes(mat.name)) {
          mat.transparent=false; mat.alphaTest=.34; mat.depthWrite=true;
          mat.forceSinglePass=true; o.userData.noNormal=true;
          if(mat.map) mat.map.anisotropy=4;
        }
        const windowPower = {CityWarm:.52, CityCool:.28, CityPale:.42, SignsNeon:1.0,
          WinWarm:.65, WinPale:.48, ShopGlow:.56, NeonPink:1.70, NeonCyan:1.38};
        if (windowPower[mat.name]!==undefined) mat.emissiveIntensity=windowPower[mat.name];
        // The original night-like glowing panes and lanterns fight the morning light.
        if (z.id === 'rural' && o.material) {
          if (['GlassWarm', 'PaperWarm', 'Lantern'].includes(o.material.name)) {
            o.material.emissiveIntensity = 0;
          }
          if (o.material.name === 'GlassWarm') o.material.color.set('#746d59');
          if (o.material.name === 'PaperWarm') o.material.color.set('#c9bfa4');
        }
      }
      if (o.name && o.name.startsWith('FX_')) {
        const wp = new THREE.Vector3();
        o.getWorldPosition(wp);
        if (o.name.startsWith('FX_Light')) data.lights.push(wp);
        else if (o.name.startsWith('FX_Smoke')) data.smoke.push(wp);
        else if (o.name.startsWith('FX_Fireflies') && z.id !== 'rural') data.fireflies = wp;
      }
    });
    // glows at lamp anchors
    for (const p of data.lights) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: .5,
        depthWrite: false, color: '#ffd9a0', blending: THREE.AdditiveBlending, fog: false }));
      s.position.copy(p); s.scale.set(7, 7, 1); s.userData.noNormal = true;
      scene.add(s); data.glowSprites = data.glowSprites || []; data.glowSprites.push(s);
    }
    // smoke
    for (const p of data.smoke) {
      for (let i = 0; i < 5; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: .24,
          depthWrite: false, color: '#cfc6b6', fog: true }));
        s.position.copy(p).add(new THREE.Vector3((Math.random() - .5) * 2, Math.random() * 2, (Math.random() - .5) * 2));
        s.scale.set(5, 5, 1); s.userData.noNormal = true;
        s.userData.smoke = { base: p.clone(), phase: Math.random() * 8, speed: .7 + Math.random() * .5, sway: Math.random() * 6 };
        scene.add(s); data.smokeSprites = data.smokeSprites || []; data.smokeSprites.push(s);
      }
    }
    // fireflies
    if (data.fireflies) {
      const n = 60, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i*3] = data.fireflies.x + (Math.random() - .5) * 42;
        pos[i*3+1] = data.fireflies.y + Math.random() * 5;
        pos[i*3+2] = data.fireflies.z + (Math.random() - .5) * 42;
      }
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const fm = new THREE.PointsMaterial({ size: .5, map: starTex, transparent: true, opacity: .7, depthWrite: false,
        color: '#ffd98a', blending: THREE.AdditiveBlending, sizeAttenuation: true });
      const points = new THREE.Points(fg, fm); points.userData.noNormal = true; scene.add(points);
      data.fireflyPoints = points;
    }
    zones[z.id] = data;
    fx.push(...data.lights.map(p => ({ p, zone: z.id })));
  }
  applyWaterToZones();
  paper.prepareWoodland=prepareWoodland(zones);
  animateScenery=stageLandscapes(zones,paintings,shadowTex,ruralGround,ruralWalkable);
  zones.rural.pond=villagePond(lowQuality);zones.rural.group.add(zones.rural.pond);
  streetLightAir(zones.city.group);
  zones.city.asphalt=[];
  zones.city.group.traverse(o=>{if(o.isMesh && o.material?.name==='Rain darkened asphalt') zones.city.asphalt.push(o);});
  zones.city.road = rainOnAvenue(lowQuality,paintings.puddles);
  zones.city.rain = passingRain(lowQuality);
  zones.city.group.add(zones.city.road,zones.city.rain);
  for (const [id, from, to, tint, power, spread] of [
    ['future',[128,8,58],[102,35,80],'#ffe0ac',3200,.53],
    ['future',[82,13,88],[104,39,80],'#b2e3fb',4100,.57],
    ['future',[129,14,83],[119,52,89],'#ffc17b',6200,.43],
    ['future',[42,2,-19],[31,14,-12],'#eca968',630,.62],
    ['future',[51,2,9],[39,22,14],'#91d3dc',1050,.57],
    ['future',[128,6,46],[127,3,49],'#ffd39e',82,.93],
    ['city',[-9,20,-9],[1,16,5],'#c4dce3',530,.78],
    ['city',[-4,11.18,2.4],[-2.5,.12,-4.2],'#f7c58e',340,.65],
    ['city',[4,11.18,2.4],[2,.12,1],'#b8d7dd',260,.64],
  ]) {
    const group=zones[id].group;
    const lamp=new THREE.SpotLight(tint,power,125,spread,.64,2);
    lamp.position.set(from[0],from[1],-from[2]); lamp.target.position.set(to[0],to[1],-to[2]);
    group.add(lamp,lamp.target);
  }

  // rickshaw in the rural
  if (rick) {
    const r = rick.scene;
    // The shafts face along the road toward the village.
    r.position.set(2.2, .11, 52); r.rotation.y = 0;
    r.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    r.name='Village flatbed cart';scene.add(r); zones.rural.vehicle = r;
    const contact = new THREE.Group();
    for (const [dx,dz,sx,sz] of [[-.95,0,.5,.42],[.95,0,.5,.42],[-.52,-1.18,.28,.28],[.52,-1.18,.28,.28]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(sx,sz),
        new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,opacity:.28,depthWrite:false,color:'#30281e'}));
      m.rotation.x=-Math.PI/2; m.position.set(2.2+dx,.13,52+dz);
      contact.add(m);
    }
    contact.userData.noNormal = true; scene.add(contact); zones.rural.contact = contact;
  }
  // green train on the city viaduct
  if (train) {
    const tg = new THREE.Group(); tg.add(train.scene);
    tg.position.set(-91.5, 13.855, -845); tg.rotation.y = -Math.PI / 2;
    tg.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      if (/^TrainGreen/.test(o.material?.name || '')) {
        o.material.emissive = new THREE.Color('#3f7d4a');
        o.material.emissiveIntensity = .07;
      }
      if (o.material?.name==='TrainWarm') o.material.emissiveIntensity=.62;
      if (o.material?.name==='TrainCool') o.material.emissiveIntensity=.34;
    });
    scene.add(tg); zones.city.train = tg;
  }
  // 1990s car in the town
  if (carG) {
    const cg = new THREE.Group(); cg.add(carG.scene);
    cg.position.set(4.6, .05, -456.4); cg.rotation.y = 0.1238 + Math.PI;
    cg.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(cg); zones.town.car = cg;
  }
  // high-speed train on the rail bridge
  if (hsr) {
    const hg = new THREE.Group(); hg.add(hsr.scene);
    hg.position.set(2.4, 32.9975, -1260);
    hg.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(hg); zones.rail.hsr = hg;
  }
  const second=new THREE.Group(); second.add(harmony.scene);
  second.position.set(-2.4,32.9975,-1260);second.rotation.y=Math.PI;
  second.traverse(o=>{if(o.isMesh) o.castShadow=o.receiveShadow=true;});
  scene.add(second);zones.rail.harmony=second;
  // heavy-lift rocket at the future pad (PAD=(102,80) local, base z=7)
  if (rocket) {
    const rg = new THREE.Group(); rg.add(rocket.scene);
    vesselMark(rg);
    rg.position.set(102, 7, -1760); rg.scale.setScalar(1);
    rg.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(rg); zones.future.rocket = rg;
  }
  zones.future.group.add(metroAsset.scene);
  metroAsset.scene.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;if(o.material?.name==='Metro smoked glazing')o.userData.noNormal=true;}});
  metro=futureMetro(metroAsset.scene);zones.future.metro=metro.root;
  for(const [chapter,data] of Object.entries(zones)) {
    for(const object of [data.group,data.vehicle,data.train,data.car,data.hsr,data.harmony,data.rocket])
      object?.traverse(o=>{if(o.isMesh && o.material) illustrate(o.material,chapter);});
  }
  trains=railway(zones);
}

// ---------------------------------------------------------------- camera sampling
function sampleFov(t) {
  const KEYS = route;
  let i = 0; while (i < KEYS.length-1 && KEYS[i+1].p < t) i++;
  const a = KEYS[i], b = KEYS[Math.min(KEYS.length-1, i+1)];
  const u = b.p === a.p ? 0 : clamp((t - a.p)/(b.p - a.p), 0, 1);
  return a.fov + (b.fov - a.fov) * smooth(u);
}

// ---------------------------------------------------------------- palette/light updates
let paletteCur = {
  fog: new THREE.Color(PALETTES[0].fog), fogNear: PALETTES[0].fogNear, fogFar: PALETTES[0].fogFar,
  exp: PALETTES[0].exp, ink: PALETTES[0].ink, bloom: PALETTES[0].bloom,
  sunInt: PALETTES[0].sunInt, hemi: PALETTES[0].hemi, fill: PALETTES[0].fill,
};
let paletteTarget = PALETTES[0];
const flightPalette = {name:'crossing',sunDir:[0,0,0]};
const tint = new THREE.Color();
const warmPaper = new THREE.Color('#f4efe2');
const lightDirection = new THREE.Vector3();
const colourFields = ['fog','top','bot','sun','fillColor','waterDeep','waterShallow'];
for(const field of colourFields) flightPalette[field]=new THREE.Color();
function flightLight({from,to,blend}) {
  const a=PALETTES[from], b=PALETTES[to];
  for(const field of colourFields) flightPalette[field].set(a[field]).lerp(tint.set(b[field]),blend);
  for(const field of ['fogNear','fogFar','exp','ink','bloom','sunInt','hemi','fill'])
    flightPalette[field]=THREE.MathUtils.lerp(a[field],b[field],blend);
  for(let i=0;i<3;i++) flightPalette.sunDir[i]=THREE.MathUtils.lerp(a.sunDir[i],b.sunDir[i],blend);
  return flightPalette;
}
function setPaletteTarget(p) { paletteTarget = p; }
function updatePalette(dt) {
  const k = 1 - Math.exp(-dt * 1.8);
  paletteCur.fog.lerp(tint.set(paletteTarget.fog), k);
  paletteCur.fogNear = damp(paletteCur.fogNear, paletteTarget.fogNear, 1.8, dt);
  paletteCur.fogFar = damp(paletteCur.fogFar, paletteTarget.fogFar, 1.8, dt);
  paletteCur.exp = damp(paletteCur.exp, paletteTarget.exp, 1.8, dt);
  paletteCur.ink = damp(paletteCur.ink, paletteTarget.ink, 1.8, dt);
  paletteCur.bloom = damp(paletteCur.bloom, paletteTarget.bloom, 1.8, dt);
  paletteCur.sunInt = damp(paletteCur.sunInt, paletteTarget.sunInt, 1.8, dt);
  paletteCur.hemi = damp(paletteCur.hemi, paletteTarget.hemi, 1.8, dt);
  paletteCur.fill = damp(paletteCur.fill, paletteTarget.fill, 1.8, dt);
  if (!scene.fog) scene.fog = new THREE.Fog(paletteCur.fog, paletteCur.fogNear, paletteCur.fogFar);
  scene.fog.color.copy(paletteCur.fog);
  scene.fog.near = paletteCur.fogNear; scene.fog.far = paletteCur.fogFar;
  scene.background.copy(paletteCur.fog);
  renderer.toneMappingExposure = paletteCur.exp;
  const reflection = name=>name==='city'?.22:name==='future'?.33:.58;
  const c=state.crossing;
  const strength=c ? THREE.MathUtils.lerp(reflection(PALETTES[c.from].name),reflection(PALETTES[c.to].name),c.blend) : reflection(paletteTarget.name);
  scene.environmentIntensity=damp(scene.environmentIntensity,strength,2,dt);
  paper.paperPass.uniforms.ink.value = paletteCur.ink;
  paper.bloom.strength = paletteCur.bloom;
  hemi.intensity = paletteCur.hemi;
  sun.intensity = paletteCur.sunInt;
  fill.intensity = paletteCur.fill;
  sun.color.lerp(tint.set(paletteTarget.sun), k);
  fill.color.lerp(tint.set(paletteTarget.fillColor), k);
  hemi.color.lerp(tint.set(paletteTarget.top).lerp(warmPaper,.18),k);
  // water sun
  const sd = lightDirection.fromArray(paletteTarget.sunDir).normalize();
  for(const mat of [waterSet.pondMat,waterSet.paddyMat,waterSet.riverMat,ruralPondMat]){
    const u=mat.uniforms;
    u.uSunDir.value.lerp(sd,k); u.uSun.value.copy(sun.color);
    u.uDeep.value.lerp(tint.set(paletteTarget.waterDeep),k);
    u.uShallow.value.lerp(tint.set(paletteTarget.waterShallow),k);
    u.uSky.value.lerp(tint.set(paletteTarget.bot),k);
  }
}

// ---------------------------------------------------------------- progress / camera
function chapterAt(t) {
  if (t >= 1) return ZONES.length - 1;
  if (t < 0.045) return -1;
  for (let i = 0; i < ZONES.length; i++) {
    if (t >= ZONES[i].start && t < ZONES[i].end) return i;
  }
  return -1;
}
function isWideView(){return state.mode==='overview';}
function currentPalette() {
  if (isWideView()) return OVERVIEW_PAL;
  if (state.mode === 'landing') return PALETTES[0];
  if (state.crossing) return flightLight(state.crossing);
  return PALETTES[routeIndex(state.progress)];
}

const walkBuildings = [
  [-7.8,-49,8,5,Math.PI/2], [-24,2,9.5,7,.05], [-40,5,7.2,6,.16],
  [-14,24,8,6.2,.95], [-35,26,6.4,5.4,-.12], [-7,43,7.4,6,1.45],
  [-29,47,10,7.2,.04], [-45,49,6.8,5.4,.2], [-16,61,8.2,6,-1.5],
  [-40,70,7,5.6,.05], [-118,42,6,5,-.12], [82,33,7,5.6,.15],
];
function ruralWalkable(x, z) {
  const y = -z;
  if (Math.abs(x)>154 || Math.abs(y)>144) return false;
  // Buildings are blocked while their courtyards remain accessible.
  for (const [bx,by,w,d,a] of walkBuildings) {
    const dx=x-bx, dy=y-by, c=Math.cos(a), s=Math.sin(a);
    const lx=dx*c+dy*s, ly=-dx*s+dy*c;
    if (Math.abs(lx)<w/2+.35 && Math.abs(ly)<d/2+.35) return false;
  }
  // The pond cannot be walked across; its dry rim remains usable.
  if (((x-48)/24.5)**2 + ((y-38)/15.5)**2 < 1) return false;
  if(y>3 && y<24 && Math.abs(y-17-.03*(x-48))>1.02 && Math.abs(x-48-1.6*Math.sin((y-17)*.14))<2.6*Math.min(1,(y-2)/8)) return false;
  // Keep the observer outside the cart bed and wheels.
  if (Math.abs(x-2.2)<1.25 && y > -53.4 && y < -50.9) return false;
  if (Math.abs(x+3)<1.58 && Math.abs(y+46.1)<.79) return false;
  return true;
}
function ruralGround(x, y) {
  const road = 3*Math.sin((y+145)/52)+1.2*Math.sin((y+20)/19);
  const flat = Math.max(0,1-Math.abs(x-road)/22);
  const base = .18*Math.sin(x*.08)*Math.cos(y*.07)+.09*Math.sin((x-y)*.17);
  let hill = x < -50 ? Math.pow(Math.min(1,(-x-50)/85),1.65)*15 : 0;
  hill *= clamp((y+80)/60,0,1)*clamp((120-y)/45,0,1);
  let edge = y > 105 ? Math.pow((y-105)/45,2)*3 : y < -115 ? Math.pow((-y-115)/35,2)*2 : 0;
  const original = (base+hill+edge)*(1-flat)+.02*flat;
  const radius = Math.hypot((x-48)/25,(y-38)/16);
  let t=clamp((radius-.86)/.28,0,1); t=t*t*(3-2*t);
  let level=-.28*(1-t)+original*t;
  if(y>2 && y<29){
    const dx=Math.abs(x-48-1.6*Math.sin((y-17)*.14)),w=Math.min(1,(y-2)/8)*2.65;
    level=Math.min(level,-.39+(original+.39)*smooth((dx-w)/1.7));
  }
  // The walkable surface is the bridge deck while crossing its barrel.
  const bx=x-48,by=y-17;
  if(Math.abs(by-.03*bx)<1.11 && Math.abs(bx)<4.53)
    level=Math.max(level,.22+1.12*Math.sqrt(Math.max(0,1-(bx/4.5)**2)));
  return level;
}
function updateCamera(dt) {
  if (state.mode === 'landing') {
    const drift = reducedMotion ? 0 : Math.sin(state.time * .07) * .31;
    camera.position.set(4.6+drift,2.38,61.6);
    camera.fov = camera.aspect < 1.2 ? 54 : 48; camera.updateProjectionMatrix();
    state.camLook = new THREE.Vector3(-4.2,2.7,45.1);
    camera.lookAt(state.camLook);
    return;
  }
  if (state.mode === 'overview') return;
  if (state.mode === 'approach') {
    const trip=state.approach,u=smooth(trip.elapsed/trip.duration);
    camera.position.copy(trip.from).lerp(trip.to,u);
    camera.position.y+=12*Math.sin(Math.PI*u);
    state.camLook=trip.wideLook.clone().lerp(trip.look,u);
    camera.lookAt(state.camLook);camera.fov=THREE.MathUtils.lerp(46,trip.fov,u);
    framePortraitWalk(state.progress,u);
    camera.updateProjectionMatrix();return;
  }
  if (state.mode === 'finale') return;
  const t = state.progress;
  const p = hermite('pos', t);
  const l = hermite('look', t);
  const fov = sampleFov(t) + (camera.aspect<.8?5:0);
  // mouse parallax
  const par = reducedMotion ? 0 : 1;
  const mx = state.look.x * par, my = state.look.y * par;
  const target = new THREE.Vector3(l[0] + mx * 4.2, l[1] + my * 2.6, l[2]);
  camera.position.set(p[0], p[1], p[2]);
  camera.fov = damp(camera.fov, fov, 6, dt); camera.updateProjectionMatrix();
  camera.lookAt(target);
  framePortraitWalk(t);
  state.camLook = target;
}

// Leave space below the subject for the chapter text on a tall screen.
function framePortraitWalk(progress, blend = 1) {
  if (camera.aspect >= .95) return;
  const ground = 1 - (crossingAt(progress)?.mist || 0);
  const port = 1 - smooth((progress - .94) / .035);
  camera.rotateX(-.072 * smooth((.95 - camera.aspect) / .5) * ground * port * blend);
}

function updateZoneVisibility() {
  const show = new Set();
  if (isWideView()) { ZONES.forEach(z => show.add(z.id)); }
  else if (state.mode === 'landing' || state.mode === 'prologue') { show.add('rural'); }
  else if (['travel','approach'].includes(state.mode)) {
    if(state.crossing){
      show.add(ZONES[state.crossing.from].id);
      show.add(ZONES[state.crossing.to].id);
    }else show.add(ZONES[routeIndex(state.progress)].id);
  } else if (state.mode === 'finale' || state.mode === 'ended') { show.add('future'); }
  for (const z of ZONES) {
    const d = zones[z.id];
    if (d?.group) {
      const active=show.has(z.id);
      d.group.visible=active;
      for(const group of [d.smokeSprites,d.glowSprites]) if(group) for(const sprite of group) sprite.visible=active;
      if(d.fireflyPoints) d.fireflyPoints.visible=active;
    }
    islandShadowByZone[z.id].visible = show.has(z.id) && (isWideView() || state.voidMix > .002);
  }
  const all = isWideView();
  if(zones.rural?.pond) zones.rural.pond.visible=show.has('rural') && !all && state.progress>.142 && camera.position.y<50 && Math.abs(camera.position.z)<165;
  if (zones.rural?.vehicle) zones.rural.vehicle.visible = all || show.has('rural');
  if (zones.rural?.contact) zones.rural.contact.visible = show.has('rural') && !all;
  if (zones.city?.train) zones.city.train.visible = all || show.has('city');
  if(zones.city?.road){
    const wet=show.has('city')&&!all&&camera.position.y<55 && Math.abs(camera.position.z-zones.city.spec.center)<160;
    zones.city.road.visible=wet;
    for(const surface of zones.city.asphalt) surface.visible=!wet;
  }
  if(zones.city?.rain) zones.city.rain.visible=zones.city.road.visible&&camera.position.y<24&&!reducedMotion;
  if (zones.town?.car) zones.town.car.visible = all || show.has('town');
  if (zones.rail?.hsr) zones.rail.hsr.visible = zones.rail.harmony.visible = all || show.has('rail');
  if (zones.future?.rocket) zones.future.rocket.visible = all || show.has('future') || state.mode === 'finale' || state.mode === 'ended';
}

let shadowElapsed = 0, lastShadowView = '';
let mapDistance=2000;
function updateSkyLights(dt) {
  const ov=isWideView();
  const far=state.mode==='overview'?Math.ceil(mapDistance+1200):ov?6000:4000;
  if(camera.far!==far){camera.far=far;camera.updateProjectionMatrix();}
  const crossing=state.mode==='travel' ? crossingAt(state.progress) : null;
  state.crossing=crossing;
  state.voidMix=ov?1:crossing?.mist||0;
  const p = currentPalette();
  const shadowExtent = routeIndex(state.progress) === 0 && ['travel','prologue'].includes(state.mode) && state.voidMix < .5 ? 32 : 80;
  if (sun.shadow.camera.right !== shadowExtent) {
    sun.shadow.camera.left = sun.shadow.camera.bottom = -shadowExtent;
    sun.shadow.camera.right = sun.shadow.camera.top = shadowExtent;
    sun.shadow.camera.updateProjectionMatrix();
  }
  sun.shadow.normalBias = shadowExtent === 32 ? .095 : .21;
  setPaletteTarget(p);
  updatePalette(dt);
  if(crossing) sky.setPalette(PALETTES[crossing.from],PALETTES[crossing.to],crossing.blend);
  else sky.setPalette(p);
  sky.update(camera,state.voidMix,ov,crossing ? ZONES[crossing.from].center-SPACING/2 : undefined);
  // lights follow the camera look point
  const look = state.camLook || new THREE.Vector3(0, 5, state.progress < .5 ? 0 : -1000);
  const sd = lightDirection.fromArray(p.sunDir).normalize();
  sun.target.position.set(look.x, look.y, look.z);
  sun.position.set(look.x + sd.x * 190, look.y + sd.y * 190, look.z + sd.z * 190);
  sun.target.updateMatrixWorld();
  fill.position.set(look.x - sd.x * 80 + 30, look.y + 60, look.z - sd.z * 80 + 40);
  fill.target.position.copy(look); fill.target.updateMatrixWorld();
  const shadowView = ov ? 'map' : crossing ? 'flight'+crossing.from : p.name;
  shadowElapsed += dt;
  if (shadowView !== lastShadowView || shadowElapsed >= (crossing ? .085 : .05)) {
    sun.shadow.needsUpdate = true; shadowElapsed = 0; lastShadowView = shadowView;
  }
  if (state.mode==='overview') {
    scene.background.copy(new THREE.Color('#f3ecdf'));
    if (scene.fog) {
      scene.fog.color.set('#efe6d5');
      scene.fog.near = mapDistance+400;
      scene.fog.far = mapDistance+2800;
    }
    hemi.intensity=1.05;
    renderer.toneMappingExposure=1.05;
  }else if(state.mode==='approach'){
    const high=1-smooth(state.approach.elapsed/state.approach.duration);
    scene.fog.near+=130*high;scene.fog.far+=370*high;
  }else if(crossing){
    scene.fog.near=THREE.MathUtils.lerp(paletteCur.fogNear,85,crossing.mist);
    scene.fog.far=THREE.MathUtils.lerp(paletteCur.fogFar,560,crossing.mist);
    scene.fog.color.lerp(tint.set(p.bot),.23*crossing.mist);
    hemi.intensity+=.15*crossing.mist;
  }else if(state.mode==='finale'){
    const clearSky=smooth((finale.t-2.0)/3.5);
    scene.fog.near+=clearSky*520; scene.fog.far+=clearSky*3000;
  }
  islandShadows.visible = true;
  islandShadows.children.forEach((m) => m.material.opacity = ov ? .32 : state.voidMix*.19);
}

// ---------------------------------------------------------------- ambient animation
function updateAmbient(dt) {
  waterSet.pondMat.uniforms.uTime.value = state.time;
  waterSet.paddyMat.uniforms.uTime.value = state.time;
  ruralPondMat.uniforms.uTime.value = state.time;
  waterSet.riverMat.uniforms.uTime.value = state.time;
  if(zones.rural?.pond) zones.rural.pond.material.uniforms.time.value=state.time;
  animateScenery?.(reducedMotion ? 0 : state.time,camera);
  const city = zones.city;
  if(city?.road) city.road.material.uniforms.time.value=city.rain.material.uniforms.time.value=state.time;
  trains?.update(dt,state.mode,state.progress,reducedMotion);
  metro?.update(dt,state.mode,state.progress,reducedMotion);
  // smoke
  for (const z of Object.values(zones)) {
    if (!z.group.visible || !z.smokeSprites) continue;
    for (const s of z.smokeSprites) {
      const sm = s.userData.smoke;
      const t = state.time * sm.speed + sm.phase;
      s.position.set(sm.base.x + Math.sin(t * .7) * 1.6, sm.base.y + (t * 2.2) % 26, sm.base.z + Math.cos(t * .5) * 1.2);
      s.material.opacity = .22 * (1 - ((t * 2.2) % 26) / 26);
      s.scale.setScalar(4 + ((t * 2.2) % 26) * .45);
    }
  }
  // fireflies
  for (const z of Object.values(zones)) {
    if (z.fireflyPoints) z.fireflyPoints.rotation.y = state.time * .04;
  }
  // lamp glows
  for (const z of Object.values(zones)) {
    if (z.glowSprites) for (const s of z.glowSprites) s.material.opacity = .38 + Math.sin(state.time * 1.3 + s.position.x) * .08;
  }
}

// ---------------------------------------------------------------- UI functions

function setChapterUI(idx, visible) {
  if (idx < 0) { el.chapter.classList.remove('show'); return; }
  if (state.uiChapter !== idx) {
    state.uiChapter = idx;
    const chapter = ZONES[idx], letter = letters[idx];
    el.chNum.textContent = chapter.num;
    const who = chapterIdentity(idx);
    el.chYear.textContent = `${who.stamp} · ${who.place}`;

    el.chTitle.textContent = chapter.label;
    el.chLine.textContent = letter.routeLine;
    el.chSetting.textContent = letter.setting;
    $$('#timeline .tl-marks button').forEach((b, i) => {
      b.classList.toggle('active', i === idx);
      if (i === idx) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  }
  if (visible && state.introChapter !== idx && (state.mode === 'travel' || state.mode === 'approach')) {
    state.introChapter = idx;
    enterChapter(idx);
    // 直接在中央出现，不从左下角滑过去；离开中央时再用过渡沉到左下。
    el.chapter.style.transition='none';el.chapter.classList.add('intro');void el.chapter.offsetWidth;el.chapter.style.transition='';
    clearTimeout(setChapterUI._intro);
    setChapterUI._intro = setTimeout(() => el.chapter.classList.remove('intro'), reducedMotion ? 1600 : 2800);
  }
  el.chapter.classList.toggle('show', !!visible);
}
function showToast(msg) {
  el.toast.textContent = msg; el.toast.classList.add('show');
  clearTimeout(showToast._t); showToast._t = setTimeout(() => el.toast.classList.remove('show'), 2200);
}
const intro=$('#prologue');
let book=null,printedAtBoot=false;
function refreshFirstPage(){
  const picture=$('#bookPicture');
  resizeViewport();
  if(printedAtBoot && picture.width===canvas.width && picture.height===canvas.height){
    printedAtBoot=false;return;
  }
  printedAtBoot=false;
  updateCamera(2);updateSkyLights(8);updateZoneVisibility();updateAmbient(0);
  paper.render();printFirstPage(picture,canvas);
}
function disposeOpening(){book?.dispose();book=null;}
function finishPrologue(){
  if(!state.hinted){state.hinted=true;savePreferences();showToast(isTouch?'轻滑前行 · 轻点路上的圆点看细节':'↑ ↓ 前行 · R 操作旧物 · F 看细节');}
  if(state.mode!=='prologue')return;
  disposeOpening();state.mode='travel';state.progress=state.target=ENTRY[0];state.glideSpeed=0;
  state.look.set(0,0);state.mouse.set(0,0);updateCamera(2);syncUIState(true);canvas.focus({preventScroll:true});
}
function playPrologue(dt){
  state.introTime+=dt;
  updateCamera(dt);
  book?.update(state.introTime);
  if(!reducedMotion && state.introTime>=11.0)finishPrologue();
}
function startExperience(quick=false){
  if(!state.ready||state.started)return;
  resetLetters();state.started=true;state.progress=state.target=ENTRY[0];
  state.mode=quick===true?'travel':'prologue';state.introTime=0;state.look.set(0,0);syncUIState(true);
  if(state.sound){audio.init();audio.motif(false);}
  if(state.mode==='prologue'){
    book=openBook(intro,reducedMotion,refreshFirstPage);
    $('#skipIntro').firstChild.textContent=reducedMotion?'进入长卷 ':'跳过引入 ';
    updateCamera(2);playPrologue(0);intro.focus({preventScroll:true});
  }
}
$('#skipIntro').addEventListener('click',finishPrologue);
function approachIsland(idx) {
  if(!state.ready)return;
  if(!state.started) startExperience(true);
  closePanels(false);setAuto(false);disposeFinale();
  const p=ENTRY[idx],pose=overviewPose();
  const look=new THREE.Vector3(...hermite('look',p)),to=new THREE.Vector3(...hermite('pos',p));
  const wideLook=look.clone().lerp(new THREE.Vector3(0,12,ZONES[idx].center),.42);
  const bearing=new THREE.Vector3(...pose.pos).sub(new THREE.Vector3(...pose.look)).normalize();
  const from=wideLook.clone().addScaledVector(bearing,camera.aspect<1?235:208);
  from.y=Math.max(from.y,wideLook.y+89);
  state.glideSpeed=0;state.progress=state.target=p;state.jumping=null;state.finaleShown=false;state.look.set(0,0);
  state.chapter=idx;state.watchingFor=-1;state.watchingTime=0;inputDirection=0;trains?.reset();
  state.approach={from,to,wideLook,look,elapsed:0,duration:2.05,fov:sampleFov(p)+(camera.aspect<.8?5:0)};
  state.mode=reducedMotion?'travel':'approach';
  syncUIState(true);setChapterUI(idx,false);audio.setChapter(idx);updateCamera(0);
  if(reducedMotion) canvas.focus({preventScroll:true});
}
function jumpTo(t) {
  state.glideSpeed=0;
  cancelArrival();
  closePanels(false); setAuto(false);
  el.toast.classList.remove('show');
  disposeFinale();
  state.finaleShown = false;
  inputDirection=0;
  state.mode = 'travel';
  state.look.set(0, 0);
  const from=state.progress,to=clamp(t,0,1),fromTime=travelTime(from),toTime=travelTime(to);
  const duration=clamp(Math.abs(toTime-fromTime)/28,1.1,18);
  state.jumping = {from,to,fromTime,toTime,t:0,dur:reducedMotion ? .01 : duration};
  syncUIState(true);
}
function enterOverview() {
  if(!state.ready)return;
  cancelArrival();
  if (state.mode === 'overview') return;
  if (state.mode === 'finale' || state.mode === 'ended') disposeFinale();
  closePanels(false); setAuto(false);
  state.overviewOrigin = state.mode;
  state.returnProgress = state.progress;
  state.mode = 'overview';
  el.overview.classList.remove('hidden');
  el.hud.classList.add('hidden'); el.timeline.classList.add('hidden'); el.chapter.classList.remove('show');
  el.scrollHint.classList.remove('show');
  buildOverviewLabels();
  syncUIState(true);
  frameOverview();updateSkyLights(1);updateZoneVisibility();updateAmbient(0);
  el.toast.classList.remove('show');
  el.ovBack.textContent = state.overviewOrigin === 'landing' ? '返回封面 →' : state.overviewOrigin === 'ended' ? '返回尾声 →' : '回到路上 →';
  el.ovBack.focus({ preventScroll: true });
}
function exitOverview(toTravel = false) {
  state.mode = toTravel ? 'travel' : state.overviewOrigin || 'travel';
  el.overview.classList.add('hidden');
  el.hud.classList.remove('hidden'); el.timeline.classList.remove('hidden');
  el.scrollHint.classList.add('show');
  syncUIState(true);
  if (state.mode === 'landing') $('#landingOverviewBtn').focus({ preventScroll: true });
  else if (state.mode === 'travel') el.overviewBtn.focus({ preventScroll: true });
  else if (state.mode === 'ended') {
    earthEnding.begin();finale.t=EARTH_END;earthEnding.update(EARTH_END);renderFrame();
    el.endOverviewBtn.focus({ preventScroll: true });
  }
}
function buildOverviewLabels() {
  el.ovLabels.innerHTML = '';
  for (const z of ZONES) {
    const b = document.createElement('button');
    b.className = 'ov-label'; b.type = 'button';
    const zi = ZONES.indexOf(z);
    b.innerHTML = `<i></i><b>${z.num} · ${z.label}</b><em>${z.year}</em><small>${letters[zi].cue} · ${pages[zi].ride}</small>`;
    b.addEventListener('click', () => approachIsland(ZONES.indexOf(z)));
    b.dataset.zone = z.id;
    el.ovLabels.appendChild(b);
  }
  state.ovLabels = [...el.ovLabels.querySelectorAll('.ov-label')];
}
function frameOverview() {
  const w=el.world.clientWidth,h=el.world.clientHeight;
  state.camLook=frameIslandMap(camera,ZONES,w,h);
  mapDistance=camera.position.distanceTo(state.camLook);
  camera.far=Math.ceil(mapDistance+1200);camera.updateProjectionMatrix();
  state.ovLabels.forEach((button,i)=>{
    const z=ZONES[i];
    const anchor=new THREE.Vector3(0,w<=h?10:74,z.center).project(camera);
    const x=(anchor.x+1)*w/2,y=(1-anchor.y)*h/2;
    if(w<=h){
      const left=Math.max(14,w*.09);
      button.style.left=left+'px';
      button.style.setProperty('--map-leader',Math.max(6,x-left-button.offsetWidth-8)+'px');
    }else button.style.left=x+'px';
    button.style.top=y+'px';
  });
}

// Intersect the common island base plane so the scenery is also a touch target.
const mapRay=new THREE.Raycaster(),mapPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const mapPoint=new THREE.Vector3();
function islandAtPointer(e){
  const r=canvas.getBoundingClientRect();
  mapRay.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);
  if(!mapRay.ray.intersectPlane(mapPlane,mapPoint)||Math.abs(mapPoint.x)>160)return -1;
  return ZONES.findIndex(z=>Math.abs(mapPoint.z-z.center)<=155);
}
function showLetter(idx,{reading=false,archive=false,stop=false}={}) {
  state.reading=idx;
  tickets.show(idx,{reading,archive,stop,canLaunch:idx===4 && state.progress>=.97});
  if(idx===4) prepareReply();
  document.querySelector('#archiveYears').hidden=!archive;$('#returnScene').hidden=!archive;
  $$('#archiveYears button').forEach((b,i)=>{b.disabled=i>state.delivered&&!state.collected.has(i);b.setAttribute('aria-current',String(i===idx));});
  updateLetterPages();updateKeepButton(idx);
}
function updateLetterPages(){
  el.letterPages.hidden=state.delivered===0&&state.collected.size<2;
  el.prevLetter.disabled=state.reading===0;el.nextLetter.disabled=state.reading>=4||state.reading>=state.delivered&&!state.collected.has(state.reading+1);
}
function offeredLetter(){return Math.min(routeIndex(state.progress),state.delivered);}
function updateBoardingReturn(){
  const hide=state.mode!=='travel'||!!state.modal||state.progress<.97||!state.presented.has(4);
  if(boardingReturn.hidden!==hide)boardingReturn.hidden=hide;
}
function updateMail(){
  if(state.mode!=='travel')return;
  updateBoardingReturn();
  const p=state.progress;let through=0;
  if(p>=.270)through=1;if(p>=.504)through=2;
  if(p>=.715)through=3;
  if(p>=.930)through=4;
  if(through>state.delivered){state.delivered=through;if(state.modal===el.card)updateLetterPages();}
  const idx=offeredLetter();
  el.mailFrom.textContent=letters[idx].title;
  el.mailAction.textContent='翻阅票夹';
  el.memoryBtn.setAttribute('aria-label','翻阅票夹，'+letters[idx].distance);
}
const ticketStops=[.128,.342,.572,.812,1];
const islandEnds=[.200,.405,.629,.847,1.001];
function holdForTicket(){return state.storyStop?.phase==='ticket';}
function guideToTicket(){
  if(!state.autoPages||state.mode!=='travel'||state.modal||state.jumping||state.storyStop)return;
  const idx=routeIndex(state.progress),stop=ticketStops[idx];
  if(state.presented.has(idx)||state.progress>=islandEnds[idx]||(idx<4&&state.skipRead&&state.collected.has(idx)))return;
  const here=travelTime(state.progress),remaining=travelTime(stop)-here,speed=Math.max(0,state.glideSpeed);
  const movingForward=state.target>state.progress+.000001;
  // Start braking BEFORE the queued destination reaches the stop. Reserve almost
  // four seconds of travel so the first half of the slowdown remains visible.
  if((movingForward&&(remaining<=speed*1.9+2||state.target>=stop))||remaining<=.00001){
    const resume=state.auto;setAuto(false);
    state.storyStop={idx,p:Math.max(stop,state.progress),phase:'approach',resume,
      curve:arrivalCurve(here,speed,Math.max(0,remaining))};
    state.target=state.storyStop.p;
    if(remaining<=.00001)state.storyStop.curve.elapsed=state.storyStop.curve.duration;
  }
}
function cancelArrival(){
  if(el.card.contains(document.activeElement)&&state.modal!==el.card)el.memoryBtn.focus({preventScroll:true});
  state.arrival=null;
  if(state.modal!==el.card)tickets.hide();
  $('#storyNotice').textContent='';
}
function beginArrival(idx,{coasting=false}={}){
  const approach=coasting?state.storyStop:null,speed=state.glideSpeed,metreSpeed=state.metreSpeed;
  const resume=state.storyStop?.resume??state.auto;
  state.presented.add(idx);state.delivered=Math.max(state.delivered,idx);
  openPanel(el.card,$('#ticketFront'));
  state.arrival={idx,shownAt:state.time};
  state.storyStop=approach?{...approach,phase:'revealing'}:{idx,p:state.progress,phase:'ticket',resume};
  if(idx===4&&state.progress>=.996)state.finaleShown=true;
  state.braking=null;state.target=approach?.p??state.progress;
  state.glideSpeed=approach?speed:0;state.metreSpeed=approach?metreSpeed:0;
  state.resumeAfterTicket=resume;inputDirection=0;touch=null;
  el.card.style.setProperty('--ticket-reveal-duration',(approach?Math.max(.3,approach.curve.duration-approach.curve.elapsed):1.1)+'s');
  ticketOrigin(idx);showLetter(idx,{stop:true});
  el.card.setAttribute('role','dialog');el.card.setAttribute('aria-modal','true');el.card.setAttribute('aria-labelledby','ticketLabel');
  $('#storyNotice').textContent=letters[idx].frontLabel+'已展开。'+$('#ticketFlipHint').textContent;
  $('#ticketFront').focus({preventScroll:true});
}
function shelveArrival(){
  if(state.modal===el.card)fileTicket();
  if(state.modal===el.card){closePanels();return;}
  cancelArrival();
}
function presentAlongRoute(){
  const stop=state.storyStop,notice=$('#stopNotice');
  notice.classList.toggle('show',stop?.phase==='approach'&&!state.modal);
  if(stop?.phase==='approach'&&stop.curve.duration-stop.curve.elapsed<=1.5&&state.mode==='travel'&&!state.modal){
    notice.classList.remove('show');beginArrival(stop.idx,{coasting:stop.curve.elapsed<stop.curve.duration});
  }
}
function continueFromTicket(distance=2.28){
  if(!state.arrival||state.arrival.idx===4||state.modal!==el.card||state.storyStop?.phase==='revealing')return false;
  if(!reducedMotion&&state.time-state.arrival.shownAt<1.05)return false;
  closePanels();setAuto(false);inputDirection=0;
  advanceByInput(Math.min(2.28,Math.max(.5,distance)));
  return true;
}
function markTicketRead(idx){
  if(!state.collected.has(idx)){state.collected.add(idx);savePreferences();updateCollection();}
}
function readTicket(idx){
  if(state.modal===el.card){
    audio.handleObject(idx);tickets.setSide(true);el.card.setAttribute('aria-labelledby','cardTitle');markTicketRead(idx);$('#cardTitle').focus({preventScroll:true});return;
  }
  openCard(idx,true);
}
function openCard(which,reading=true){
  if(state.mode!=='travel'||state.modal)return;
  const idx=Number.isInteger(which)?which:offeredLetter();
  const resume=state.auto,speed=state.metreSpeed||state.glideSpeed;
  state.presented.add(idx);
  state.target=state.progress;state.jumping=null;inputDirection=0;
  openPanel(el.card,reading?$('#cardTitle'):$('#ticketFront'));
  showLetter(idx,{reading,archive:true});
  el.card.setAttribute('role','dialog');el.card.setAttribute('aria-modal','true');el.card.setAttribute('aria-labelledby',reading?'cardTitle':'ticketLabel');
  // Discard queued wheel distance, but carry the real velocity into a finite, gentle stop.
  state.braking=reducedMotion?null:{distance:travelTime(state.progress),speed,elapsed:0,duration:1.6};
  state.resumeAfterTicket=resume;
  if(reading)markTicketRead(idx);
  (reading?$('#cardTitle'):$('#ticketFront')).focus({preventScroll:true});
}
function updateCollection(){
  el.collectedTxt.textContent='票根 '+state.collected.size+' / 5';
  const memoryTxt=$('#memoryTxt');if(memoryTxt)memoryTxt.textContent='旧册子 '+state.collected.size+'/5';
  $$('#timeline button[data-ch]').forEach((b,i)=>b.classList.toggle('collected',state.collected.has(i)));
}
function updateKeepButton(idx){
  const kept=state.kept.has(idx);
  el.keepLetter.setAttribute('aria-pressed',String(kept));el.keepLetter.textContent=kept?'已留住 · 取出':'留住这句话';
}
function resetLetters(){
  resetNarration();state.uiChapter=-1;state.introChapter=-1;
  cancelArrival();state.storyStop=null;state.braking=null;state.routeVelocity=state.glideSpeed=state.metreSpeed=0;
  state.keptLetter=[...state.kept].at(-1)??null;state.presented.clear();state.watchingFor=-1;state.watchingTime=0;state.resumeAfterTicket=false;
  state.delivered=0;state.reading=0;trains?.reset();metro?.reset();inputDirection=0;state.replyDraft=typeof preferences.wish==='string'?preferences.wish.slice(0,24):'';state.wish='';state.pendingLaunch=null;
}
function prepareReply(){
  const kept=state.keptLetter===null?null:letters[state.keptLetter];
  el.replyQuote.hidden=!kept;el.replyQuote.textContent=kept?'留住的那句话：'+kept.excerpt:'';
  el.wishInput.value=state.replyDraft;
  $$('[data-wish]').forEach((button,i)=>button.dataset.wish=button.textContent=letters[4].replies[i]);
}
function homeTicketPages(){
  return letters.map((letter,i)=>({year:ZONES[i].year,words:i===4?(state.wish||letter.backText):letter.backText}));
}
const tickets=createTicketView({letters,zones:ZONES,onFlip:readTicket,onClose:shelveArrival,
  onSwipe:distance=>continueFromTicket(distance),
  onDrag:distance=>{if(!state.modal)advanceByInput(distance)},onDragStart:()=>{if(!state.modal){setAuto(false);state.jumping=null;inputDirection=0;}},onLaunch:launchFinale});

// ---------------------------------------------------------------- audio (original procedural soundscape)
const audio = new Soundscape((on) => {
  state.sound = on;
  el.soundBtn.classList.toggle('muted', !on);
  el.soundTxt.textContent = on ? '声音开' : '声音关';
  el.soundBtn.setAttribute('aria-label', on ? '关闭声音' : '开启声音');
  el.soundBtn.setAttribute('aria-pressed', String(on));
  el.landingSoundBtn.setAttribute('aria-pressed', String(on));
  el.landingSoundBtn.querySelector('span').textContent = on ? '声音已开启' : '开启声音';
  const titleSound=$('#titleSoundBtn');if(titleSound){titleSound.setAttribute('aria-pressed',String(on));titleSound.querySelector('span').textContent=on?'声音已开启':'开启声音 · 建议戴耳机';}
  savePreferences();
}, state.sound);
function toggleSound() { audio.init(); audio.toggle(); }
// Apply saved preference without creating an AudioContext before a gesture.
audio.onChange(state.sound);

// ---------------------------------------------------------------- events
let inputDirection=0,lastWheelAt=-Infinity,entryWheelPixels=0;
function advanceByInput(metres) {
  if (!metres||state.modal||holdForTicket()) return;
  if(state.storyStop?.phase==='approach'){
    if(metres>0)return;
    state.storyStop=null;state.target=state.progress;
  }
  const direction=Math.sign(metres), here=travelTime(state.progress);
  const queued=direction===inputDirection ? travelTime(state.target) : here;
  inputDirection=direction;
  state.target=progressAtTime(clamp(queued+metres,here-13,here+13));
}
addEventListener('wheel', (e) => {
  if(!state.ready||e.ctrlKey)return;
  const now=performance.now(),fresh=now-lastWheelAt>170;lastWheelAt=now;
  const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
  if(state.modal){
    if(state.modal!==el.card||!state.arrival)return;
    // Let the text panel and message input keep their own native scrolling.
    const target=e.target instanceof Element?e.target:null;
    if(target?.closest('input,textarea,select'))return;
    const textPanel=target?.closest('#ticketBack');
    if(textPanel&&((pixels>0&&textPanel.scrollTop+textPanel.clientHeight<textPanel.scrollHeight-2)||(pixels<0&&textPanel.scrollTop>0)))return;
    e.preventDefault();
    if(pixels>0&&fresh)continueFromTicket(pixels*.019);
    return;
  }
  if(holdForTicket())return;
  if(state.mode==='landing'){
    entryWheelPixels=Math.max(0,(fresh?0:entryWheelPixels)+pixels);
    if(entryWheelPixels>=20){entryWheelPixels=0;startExperience();}
    return;
  }
  if(state.mode!=='travel')return;
  e.preventDefault();setAuto(false);state.jumping=null;advanceByInput(pixels*.019);
}, {passive:false});

let touch = null;
canvas.addEventListener('pointerdown', (e) => {
  if (!state.ready||state.modal||holdForTicket()) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (state.mode === 'overview') {
    const idx=islandAtPointer(e);
    if(idx>=0) touch={mapIsland:idx,id:e.pointerId,x:e.clientX,y:e.clientY};
    return;
  }
  setAuto(false); state.jumping = null;
  inputDirection=0;
  canvas.setPointerCapture(e.pointerId);
  touch = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, lookX: state.look.x, lookY: state.look.y, moved: 0, scrolling: state.mode === 'travel' };
});
addEventListener('pointermove', (e) => {
  if(state.mode==='overview'){
    if(e.pointerType==='mouse'){
      const idx=e.target===canvas?islandAtPointer(e):-1;
      canvas.classList.toggle('over-island',idx>=0);
      state.ovLabels.forEach((b,i)=>b.classList.toggle('over-island',i===idx));
    }
    return;
  }
  state.mouse.set((e.clientX / innerWidth - .5) * 2, (e.clientY / innerHeight - .5) * 2);
  if (!touch||state.modal||holdForTicket()) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  touch.moved = Math.max(touch.moved, Math.abs(dx) + Math.abs(dy));
  if (state.mode === 'travel') {
    state.look.x = clamp(touch.lookX - dx / innerWidth * 2, -1, 1);
    if (e.pointerType === 'mouse') state.look.y = clamp(touch.lookY - dy / innerHeight * 1.2, -.8, .8);
    if (e.pointerType !== 'mouse') {
      advanceByInput((touch.lastY - e.clientY) * .034);
      touch.lastY = e.clientY;
    }
  }
}, { passive: true });
addEventListener('pointerup', e => {
  if(state.mode==='landing'&&touch&&e.pointerType==='touch'){
    const rise=touch.y-e.clientY;
    if(rise>40 && rise>Math.abs(touch.x-e.clientX))startExperience();
  }
  if(state.mode==='overview'&&touch?.id===e.pointerId&&e.target===canvas
    && Math.hypot(e.clientX-touch.x,e.clientY-touch.y)<10 && islandAtPointer(e)===touch.mapIsland)
    approachIsland(touch.mapIsland);
  if(state.mode==='travel'&&state.crossing&&touch&&touch.y-e.clientY>Math.min(180,innerHeight*.25))approachIsland(state.crossing.to);
  touch=null;
});
addEventListener('pointercancel', () => { touch = null; });

addEventListener('keydown', (e) => {
  if (!state.ready || e.isComposing || e.keyCode === 229) return;
  if(state.arrival && e.key==='Escape'){
    e.preventDefault();shelveArrival();return;
  }
  if(state.mode==='prologue'){if(e.key==='Escape'){e.preventDefault();finishPrologue();}return;}
  if (e.key === 'Escape') {
    if (state.modal) closePanels();
    else if (state.mode === 'overview') exitOverview();
    return;
  }
  if (state.modal) {
    if(state.arrival&&['ArrowDown','PageDown'].includes(e.key)&&!e.target.closest('input,textarea,select')){
      const panel=e.target.closest('#ticketBack');
      if(panel&&panel.scrollTop+panel.clientHeight<panel.scrollHeight-2){
        e.preventDefault();panel.scrollBy(0,e.key==='PageDown'?panel.clientHeight*.85:40);return;
      }
      if(!e.repeat){e.preventDefault();continueFromTicket();}return;
    }
    if(state.modal===el.card&&!tickets.back&&(e.key.toLowerCase()==='r'||e.key.toLowerCase()==='f'||e.key===' '&&e.target===$('#ticketFront'))){e.preventDefault();tickets.operate();return;}
    if (e.key === 'Tab') {
      const stops = [...state.modal.querySelectorAll('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')].filter(node => !node.disabled && !node.closest('[inert]') && node.getAttribute('tabindex')!=='-1' && node.getClientRects().length);
      const first = stops[0], last = stops.at(-1);
      if (e.shiftKey && (document.activeElement === first||!stops.includes(document.activeElement))) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
    return;
  }
  if (e.target.closest('input,textarea,select,[contenteditable="true"]') || e.ctrlKey || e.altKey || e.metaKey) return;
  if (state.arrival && e.key.toLowerCase() === 'r') { e.preventDefault(); openCard(state.arrival.idx); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('button,a')) return;
  if (state.mode === 'landing' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startExperience(); return; }
  if (state.mode === 'travel') {
    if(e.key.toLowerCase()==='f'){showDetail(routeIndex(state.progress),0);return;}
    if (['ArrowDown','PageDown',' ','ArrowUp','PageUp','Home','End'].includes(e.key)) { setAuto(false); state.jumping = null; }
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { advanceByInput(4.5); e.preventDefault(); }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { advanceByInput(-4.5); e.preventDefault(); }
    if (e.key === 'Home') { approachIsland(0); }
    if (e.key === 'End') { approachIsland(4); }
  }
  if (e.key === 'm' || e.key === 'M') toggleSound();
});
el.startBtn.addEventListener('click', startExperience);
el.overviewBtn.addEventListener('click', () => { audio.sfx('click'); state.mode === 'overview' ? exitOverview() : enterOverview(); });
el.ovBack.addEventListener('click', () => { audio.sfx('click'); exitOverview(); });
el.soundBtn.addEventListener('click', toggleSound);
el.landingSoundBtn.addEventListener('click', toggleSound);
$('#titleSoundBtn').addEventListener('click', toggleSound);
setupTitlePage(isTouch);
el.infoBtn.addEventListener('click', () => { audio.sfx('click'); openPanel(el.info, el.infoClose); });
$('#landingInfoBtn').addEventListener('click', () => openPanel(el.info, el.infoClose));
$('#landingOverviewBtn').addEventListener('click', enterOverview);
el.infoClose.addEventListener('click', () => closePanels());
let scrimTouch=null;
let scrimSwiped=false;
$('#ticketScrim').addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')scrimTouch={id:e.pointerId,y:e.clientY};});
$('#ticketScrim').addEventListener('pointerup',e=>{
  scrimSwiped=scrimTouch?.id===e.pointerId&&Math.abs(scrimTouch.y-e.clientY)>12;
  if(scrimSwiped&&scrimTouch.y-e.clientY>40){e.preventDefault();continueFromTicket();}
  scrimTouch=null;
});
$('#ticketScrim').addEventListener('pointercancel',()=>scrimTouch=null);
$('#ticketScrim').addEventListener('click',()=>{if(!scrimSwiped&&state.modal===el.card)closePanels();});
function turnLetter(by) {
  const accessible=letters.map((_,i)=>i).filter(i=>i<=state.delivered||state.collected.has(i));
  const idx=accessible[clamp(accessible.indexOf(state.reading)+by,0,accessible.length-1)];
  showLetter(idx,{reading:tickets.back,archive:true});if(tickets.back)markTicketRead(idx);
  if (by > 0 && el.nextLetter.disabled) el.prevLetter.focus({preventScroll:true});
  if (by < 0 && el.prevLetter.disabled) el.nextLetter.focus({preventScroll:true});
}
el.prevLetter.addEventListener('click', () => turnLetter(-1));
el.nextLetter.addEventListener('click', () => turnLetter(1));
el.keepLetter.addEventListener('click', () => {
  const idx = state.reading;
  if(state.kept.has(idx))state.kept.delete(idx);else state.kept.add(idx);
  state.keptLetter=[...state.kept].at(-1)??null;savePreferences();
  updateKeepButton(idx);
});
el.memoryBtn.addEventListener('click',()=>openCard(offeredLetter(),false));
boardingReturn.addEventListener('click',()=>openCard(4,false));
// Finish a touch tap explicitly: some Chromium touch sequences omit the
// compatibility click after a ticket is swiped away. openCard is idempotent.
let memoryPress=null;
el.memoryBtn.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')memoryPress={id:e.pointerId,x:e.clientX,y:e.clientY};});
el.memoryBtn.addEventListener('pointerup',e=>{
  const start=memoryPress;memoryPress=null;
  if(start?.id===e.pointerId&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<9){e.preventDefault();openCard(offeredLetter(),false);}
});
el.memoryBtn.addEventListener('pointercancel',()=>memoryPress=null);
el.autoBtn.addEventListener('click', () => { if (state.mode === 'travel' && !state.modal) { setAuto(!state.auto); if (state.auto) showToast('自动漫游中 · 手动操作可暂停'); } });
el.homeBtn.addEventListener('click', () => {
  cancelArrival();
  closePanels(false);setAuto(false);disposeFinale();disposeOpening();
  state.started = false; state.mode = 'landing'; state.progress = 0; state.target = 0;
  state.jumping = null; state.finaleShown = false; state.chapter = -1;
  el.endCard.classList.remove('show'); el.endCard.inert = true;
  el.chapter.classList.remove('show');
  syncUIState(true); el.startBtn.focus({ preventScroll: true });
});
el.wishInput.addEventListener('input', () => {
  state.replyDraft=el.wishInput.value;preferences.wish=state.replyDraft;savePreferences();
});
$$('[data-wish]').forEach(button => button.addEventListener('click', () => {
  el.wishInput.value = button.dataset.wish;
  state.replyDraft = el.wishInput.value;preferences.wish=state.replyDraft;savePreferences();
  el.wishInput.focus();
}));
$('#fullscreenBtn').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else showToast('当前浏览器暂不支持全屏');
  } catch { showToast('请在浏览器中开启全屏浏览'); }
});
addEventListener('fullscreenchange', () => $('#fullscreenBtn').setAttribute('aria-label', document.fullscreenElement ? '退出全屏' : '进入全屏'));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { state.resumeAfterTicket=false;setAuto(false); audio.suspend(); }
  else { last = performance.now(); audio.resume(); }
});
el.timeline.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-ch]');
  if (!b) return;
  audio.sfx('click');
  const i = Number(b.dataset.ch);
  const z = ZONES[i];
  approachIsland(i);
});
el.againBtn.addEventListener('click', () => resetExperience());
el.endOverviewBtn.addEventListener('click', () => { el.endCard.classList.remove('show'); el.endCard.inert = true; enterOverview(); });
el.wishInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229 && !el.launchBtn.parentElement.hidden) launchFinale(); });

const viewportObserver = new ResizeObserver(resizeViewport);
viewportObserver.observe(el.world);

// ---------------------------------------------------------------- finale
let finale = {t:0,active:false};
function disposeFinale(){
  stopAlbum();el.endCard.classList.remove('album-wait');
  earthEnding?.reset();
  finale={t:0,active:false};
  el.launchSignal.hidden=true;
  $('#homecoming').hidden=true;
  audio.stopLaunch();
}
function launchFinale(skipFlight=false){
  if(state.mode!=='travel'||state.reading!==4)return;
  state.wish=state.replyDraft.trim();$('#earthWish').textContent=state.wish;$('#earthWish').hidden=!state.wish;
  if(state.progress<.9999){state.pendingLaunch=skipFlight;jumpTo(1);return;}
  closePanels(false);setAuto(false);disposeFinale();
  state.look.set(0,0);updateCamera(0);updateSkyLights(0);updateZoneVisibility();
  el.chapter.classList.remove('show');
  state.mode='finale';state.ended=false;finale.active=true;
  earthEnding.begin();
  if(reducedMotion||skipFlight){showEnd();renderFrame();return;}
  audio.sfx('whoosh');audio.launch();syncUIState(true);
}
function updateFinale(dt){
  if(!finale.active)return;
  finale.t=Math.min(EARTH_END,finale.t+dt);
  earthEnding.update(finale.t);
  if(!captureMode&&finale.t>=EARTH_END)showEnd();
}
function showEnd(){
  if(state.mode==='ended')return;
  if(!earthEnding.active)earthEnding.begin();
  finale.t=EARTH_END;finale.active=false;earthEnding.update(EARTH_END);
  state.mode='ended';state.ended=true;
  el.launchSignal.hidden=true;$('#homecoming').hidden=true;
  const letter=state.keptLetter===null?null:letters[state.keptLetter];
  el.endSource.textContent='留住的那句话';el.endQuote.textContent=letter?letter.excerpt:'';
  el.endSource.parentElement.hidden=!letter;
  el.endRecipient.textContent='旅途留言';el.endWish.textContent=state.wish;el.endReply.hidden=!state.wish;
  $('#endAnswer').textContent=endingText;$('#endTitle').textContent=familyNote;
  const kept=$('#keptLines');kept.replaceChildren();
  for(const idx of [...state.kept].sort()){const line=document.createElement('p');line.textContent=letters[idx].sender+'　'+letters[idx].excerpt;kept.append(line);}
  el.endSource.parentElement.hidden=true;
  audio.motif(true);
  el.endCard.dataset.ending='earth';
  fillHomeTickets($('#endTickets'),homeTicketPages(),true);
  el.endCard.classList.add('show');
  el.hud.classList.add('hidden');el.timeline.classList.add('hidden');el.chapter.classList.remove('show');
  closePanels(false);syncUIState(true);
  if(captureMode||(navigator.webdriver&&!q.has('title'))){$('#endRecord summary').focus({preventScroll:true});return;}
  el.endCard.classList.add('album-wait');
  playAlbum(()=>{el.endCard.classList.remove('album-wait');$('#endRecord summary').focus({preventScroll:true});},reducedMotion);
}
function renderFrame(){
  if(earthEnding?.active&&['finale','ended'].includes(state.mode))earthEnding.render();
  else paper.render();
}
function resetExperience(){
  disposeFinale();disposeOpening();closePanels(false);setAuto(false);
  state.started=false;state.jumping=null;state.finaleShown=false;state.ended=false;state.chapter=-1;
  startExperience();
}

// ---------------------------------------------------------------- main loop
function tick(dt, draw = true) {
  if(!reducedMotion && state.mode!=='prologue')state.time+=dt;
  if(earthEnding?.active&&['finale','ended'].includes(state.mode)){
    if(!earthEnding.inOrbit){updateSkyLights(dt);updateZoneVisibility();updateAmbient(dt);}
    if(state.mode==='finale')updateFinale(dt);
    else earthEnding.update(EARTH_END);
    document.body.classList.add('dark-scene');document.body.classList.remove('island-flight');
    syncUIState();if(draw)renderFrame();return;
  }
  if(state.mode==='prologue'){
    playPrologue(dt);
    if(state.mode==='prologue')return;
  }
  if(state.mode==='approach'){
    state.approach.elapsed+=dt;updateCamera(dt);
    if(state.approach.elapsed>=state.approach.duration){
      state.mode='travel';state.approach=null;syncUIState(true);canvas.focus({preventScroll:true});
    }
  }
  if (state.auto && state.mode === 'travel' && !state.modal && !state.storyStop) {
    state.target=progressAtTime(travelTime(state.target)+dt*3.65*state.speed);
  }
  guideToTicket();
  if (state.mode === 'travel' || state.mode === 'landing') {
    const previousProgress=state.progress;
    if(state.modal){
      if(state.storyStop?.phase==='revealing'){
        const stop=state.storyStop,[distance,speed,done]=sampleArrival(stop.curve,dt);
        state.progress=done?stop.p:progressAtTime(distance);state.glideSpeed=done?0:speed;
        if(done){state.target=stop.p;stop.phase='ticket';}
      }else if(state.braking){
        const b=state.braking;b.elapsed=Math.min(b.duration,b.elapsed+dt);
        const u=b.elapsed/b.duration,distance=b.distance+b.speed*b.duration*(u-u*u*u+u*u*u*u/2);
        state.progress=progressAtTime(clamp(distance,0,travelLength));state.target=state.progress;
        if(u>=1)state.braking=null;
      }
    } else if(state.storyStop?.phase==='approach'){
      const stop=state.storyStop,[distance,speed,done]=sampleArrival(stop.curve,dt);
      state.progress=done?stop.p:progressAtTime(distance);state.glideSpeed=done?0:speed;
    } else if (holdForTicket()) {
      state.target=state.progress;state.glideSpeed=0;
    } else if (state.jumping) {
      state.jumping.t += dt;
      const u = clamp(state.jumping.t / state.jumping.dur, 0, 1);
      const e = smooth(u);
      const trip=state.jumping;
      state.progress = u>=1 ? trip.to : progressAtTime(THREE.MathUtils.lerp(trip.fromTime,trip.toTime,e));
      state.target = state.progress;
      if (u >= 1) state.jumping = null;
    } else if (state.progress!==state.target || state.glideSpeed!==0) {
      const targetDistance=travelTime(state.target);
      const [distance,speed]=glide(travelTime(state.progress),targetDistance,state.glideSpeed,dt);
      const settled=Math.abs(distance-targetDistance)<.00001 && Math.abs(speed)<.00005;
      state.progress=settled ? state.target : progressAtTime(distance);
      state.glideSpeed=settled ? 0 : speed;
    }
    state.routeVelocity=dt>0?(state.progress-previousProgress)/dt:0;
    state.metreSpeed=dt>0?(travelTime(state.progress)-travelTime(previousProgress))/dt:0;
    state.progress = clamp(state.progress, 0, 1);
    const ci = chapterAt(state.progress);
    if (ci !== state.chapter) {
      state.chapter = ci;
      setChapterUI(ci, ci >= 0);
      if (ci >= 0) audio.setChapter(ci);
    }
    setChapterUI(state.chapter, state.chapter >= 0 && state.voidMix < .55 && state.mode !== 'overview');
    updateCamera(dt);
    // finale trigger
    if (state.progress < .993) state.finaleShown = false;
    const approachingEnd = state.jumping ? state.jumping.to > .996 : state.target > .996;
    if (travelLength-travelTime(state.progress)<.045 && approachingEnd && state.mode === 'travel' && !state.modal && !state.storyStop && !state.finaleShown) {
      state.progress=state.target=1; state.glideSpeed=0;
      state.finaleShown=true;setAuto(false);
      if(state.pendingLaunch!==null){const skip=state.pendingLaunch;state.pendingLaunch=null;state.reading=4;launchFinale(skip);}
      else if(!state.arrival||state.arrival.idx!==4)beginArrival(4);
    }
  } else if (state.mode === 'finale') {
    updateFinale(dt);
  }
  updateSkyLights(dt);
  updateZoneVisibility();
  updateAmbient(dt);
  camera.updateMatrixWorld();
  updateMail();presentAlongRoute(dt);updateLandmarks();
  {
    const travelling=state.mode==='travel'&&!state.modal;
    updateSubtitles(dt,!travelling||!!state.crossing||state.jumping!==null&&state.jumping!==undefined);
    updateInterlude(state.crossing,travelling&&!state.jumping);
    updatePaperTags(camera,zones,routeIndex(state.progress),travelling&&!state.crossing);
  }
  const darkChapter=i=>i===2 || i===4;
  const crossing=state.crossing;
  const night=crossing ? THREE.MathUtils.lerp(+darkChapter(crossing.from),+darkChapter(crossing.to),crossing.blend) : +darkChapter(state.chapter);
  const darkScene = (night>.5 || state.mode==='finale') && state.mode!=='landing' && state.mode!=='overview';
  document.body.classList.toggle('dark-scene', darkScene);
  document.body.classList.toggle('island-flight',!!crossing);
  if(crossing) document.body.style.setProperty('--flight-night',(night*100).toFixed(1)+'%');
  // HUD progress
  el.tlFill.style.width = (state.progress * 100).toFixed(2) + '%';
  const percent = String(Math.round(state.progress * 100)).padStart(2, '0') + '%';
  if (el.journeyPct.textContent !== percent) el.journeyPct.textContent = percent;
  syncUIState();
  el.scrollHint.classList.toggle('show', state.mode === 'travel' && !state.modal && state.progress < .121);
  if(draw) renderFrame();
  if (state.mode==='travel' && !touch && !isTouch && !reducedMotion) {
    state.look.x = damp(state.look.x, state.mouse.x * .5, 1.5, dt);
    state.look.y = damp(state.look.y, state.mouse.y * .5, 1.5, dt);
  }
}

let slowSeconds=0,qualityStep=0;
function adaptQuality(seconds){
  if(captureMode||q.has('high')||document.hidden||state.modal||state.frozen||qualityStep>=2)return;
  if(!['travel','prologue','overview','approach'].includes(state.mode))return;
  slowSeconds=Math.max(0,slowSeconds+(seconds>1/27?Math.min(seconds,.5):-seconds*.55));if(slowSeconds<2.5)return;
  qualityStep++;slowSeconds=0;paper.bloom.enabled=false;
  document.body.dataset.quality='economy';zones.city?.group.traverse(o=>{if(o.userData.optionalLight)o.visible=false;});resizeViewport();
}
let last = performance.now();
function raf(now) {
  const elapsed=(now-last)/1000;const dt=Math.min(.15,elapsed);last=now;if(state.ready)adaptQuality(elapsed);
  if (state.ready && !state.frozen && !document.hidden) tick(dt);
  requestAnimationFrame(raf);
}

// ---------------------------------------------------------------- boot
// Warm exactly the lighting and colour target used by the next visible islands.
// compileAsync polls the GPU without blocking input or the loading screen.
async function prepareVisibleMaterials(){
  const view=new THREE.Scene();
  view.fog=scene.fog;
  view.environment=scene.environment;
  // Reference the visible roots for compilation only. Keep their live parents and transforms.
  view.children=scene.children.filter(child=>child.visible);
  const previous=renderer.getRenderTarget();
  renderer.setRenderTarget(paper.composer.readBuffer);
  try{await renderer.compileAsync(view,camera);}
  finally{renderer.setRenderTarget(previous);}
}

async function waitForPreviewDraw(){
  const gl=renderer.getContext(),fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);
  if(!fence)throw Error('无法准备场景画面');
  gl.flush();
  try{
    let result;
    do{
      await new Promise(resolve=>setTimeout(resolve,16));
      if(gl.isContextLost())throw Error('场景画面准备中断');
      result=gl.clientWaitSync(fence,0,0);
    }while(result===gl.TIMEOUT_EXPIRED);
    if(result===gl.WAIT_FAILED)throw Error('场景画面准备中断');
  }finally{gl.deleteSync(fence);}
}

async function prepareRoute() {
  // A real preview draw uploads the meshes and textures as well as linking the
  // exact light/material combinations used when two neighbouring islands meet.
  const originalOutput=paper.composer.renderToScreen;
  paper.composer.renderToScreen=false;
  paper.setSize(112,Math.max(48,Math.min(184,Math.round(112/camera.aspect))));
  const samples = [.10,.186,.206,.214,.235,.315,.411,.455,.545,.635,.672,.7148,.715,.79,.854,.890,.95];
  const prepared=new Set();
  try {
    $('#loadStatus').textContent='准备开场 · 五幕展卷';
    state.mode='overview';state.progress=ENTRY[0];
    state.camLook=frameIslandMap(camera,ZONES,innerWidth,innerHeight);updateSkyLights(1);updateZoneVisibility();updateAmbient(0);
    await prepareVisibleMaterials();
    paper.render();
    await waitForPreviewDraw();
    state.mode='travel';
    for (const [i,p] of samples.entries()) {
      state.progress=p;
      const percent=80+Math.round(19*(i+1)/samples.length);
      el.loadFill.style.width=percent+'%'; el.loadPct.textContent=percent+'%';titleProgress(percent);
      $('.load-line').setAttribute('aria-valuenow',String(percent));
      $('#loadStatus').textContent='准备沿途画面 · '+ZONES[routeIndex(p)].label;
      await new Promise(done=>requestAnimationFrame(done));
      updateCamera(1);updateSkyLights(1);updateZoneVisibility();updateAmbient(0);
      // A nose just inside a tunnel is insufficient to prepare coach materials.
      if(p===.545 || p===.79) trains.update(p===.545?12:6,state.mode,p,false);
      const islands=ZONES.filter(z=>zones[z.id].group.visible).map(z=>z.id).join('/');
      if(!prepared.has(islands)){
        await prepareVisibleMaterials();
        prepared.add(islands);
      }
      const uncull=[];
      if([.206,.411,.635,.715,.854].includes(p)) scene.traverseVisible(o=>{
        if((o.isMesh||o.isSprite||o.isPoints) && o.frustumCulled){o.frustumCulled=false;uncull.push(o);}
      });
      try{paper.render();}finally{for(const o of uncull)o.frustumCulled=true;}
      await waitForPreviewDraw();
    }
  }finally{
    const size=renderer.getSize(new THREE.Vector2());
    paper.composer.renderToScreen=originalOutput;paper.setSize(size.x,size.y);
    renderer.setRenderTarget(null);
    state.mode='travel';state.progress=state.target=ENTRY[0];trains?.reset();metro?.reset();
    updateCamera(1);updateSkyLights(8);updateZoneVisibility();updateAmbient(0);
  }
}
async function boot() {
  await loadWorld();
  await waitForAssetTextures();
  if(!window.__EARTH_PREVIEW_ONLY){
    $('#loadStatus').textContent='准备星河尽头的回望';
    earthEnding=await createEarthEnding({renderer,scene,camera,paper,sky,rocket:zones.future.rocket,
      port:zones.future.group,cloudAtlas:sky.plates['launch-vapour'],glowTexture:glowTex});
  }
  await prepareRoute();
  // Draw the real first page at travel resolution before accepting input.
  // The loading text covers it until the book and its viewport are ready.
  resizeViewport();updateCamera(2);updateSkyLights(8);updateZoneVisibility();
  updateAmbient(0);updateCollection();
  paper.render();printFirstPage($('#bookPicture'),canvas);printedAtBoot=true;
  await waitForPreviewDraw();
  state.ready=true;window.__ready=true;
  el.loadFill.style.width = '100%'; el.loadPct.textContent = '100%';
  $('.load-line').setAttribute('aria-valuenow','100');
  titleProgress(100);
  const openTheBook=()=>{
    if(state.started)return;
    el.loading.inert=true;
    el.loading.classList.add('hidden');
    startExperience();
    // The closed cover is already on the title page; open it straight away.
    state.introTime=4.7;playPrologue(0);
  };
  last=performance.now();requestAnimationFrame(raf);
  // 自动化测试与截图（capture=1、webdriver）直接翻开；加 ?title=1 可在自动化里查看扉页。
  if(captureMode||q.has('autostart')||(navigator.webdriver&&!q.has('title')))openTheBook();
  else titleReady(openTheBook);
}
export const ready = boot();

// deterministic capture / inspection API
window.__changlu = {
  state, scene, camera, renderer, paper, sky, zones, waterSet,
  render:renderFrame,
  get ending(){return earthEnding},
  get activeCamera(){return earthEnding?.active?earthEnding.camera:camera},
  setProgress(t, instant = true) { state.glideSpeed=0; state.progress = clamp(t, 0, 1); state.target = state.progress; if (instant) { state.jumping = null; } },
  freeze(v = true) { state.frozen = !!v; },
  advance(dt = 1 / 24) { tick(dt); },
  scrollTo(p) { state.target = clamp(p, 0, 1); },
  showCard() { openCard(); },
  receiveLetter(){if(state.mode==='travel' && !state.modal && !state.arrival) beginArrival(offeredLetter());},
  hideCard() { closePanels(); },
  soundInfo() { return audio.info(); },
  info() { const cv = {}; for (const k of Object.keys(zones)) cv[k] = !!zones[k]?.group?.visible; return { progress: state.progress, mode: state.mode, chapter: state.chapter, voidMix: state.voidMix, cam: camera.position.toArray(), look: state.camLook?.toArray?.(), visible: cv }; },
  settle(steps = 60) {
    const ci = chapterAt(state.progress);
    if (ci !== state.chapter) {
      state.chapter = ci;
      setChapterUI(ci, ci >= 0);
      if (ci >= 0) audio.setChapter(ci);
    }
    for (let i = 0; i < steps; i++) { updateCamera(.1); updateSkyLights(.1); }
    updateZoneVisibility(); updateAmbient(0); camera.updateMatrixWorld(); updateMail();
    paper.render();
  },
  step(dt) { tick(dt, false); },
  start: () => state.mode==='prologue'?finishPrologue():startExperience(true),
  prologue: () => startExperience(),
  automaticLetters(on=true){state.autoPages=on;if(!on){state.storyStop=null;cancelArrival();}},
  overview: enterOverview,
  exitOverview,
  launch: () => { state.mode='travel';state.reading=4;state.progress=state.target=1;launchFinale(); },
  showEnd,
  photo(id) {
    const poses = {
      rural: { p: .09 }, town: { p: .31 }, city: { p: .56 }, rail: { p: .79 }, future: { p: .96 },
      overview: null,
    };
    document.body.classList.add('photo');
    if (id === 'overview') { enterOverview(); document.querySelectorAll('#hud,#timeline,#chapter,.ov-head,.ov-foot').forEach(e => e.style.display = 'none'); return; }
    state.mode = 'travel'; const t = poses[id]?.p ?? .09; this.setProgress(t); state.chapter = chapterAt(t); tick(0.001);
  },
  resumeUI() { document.body.classList.remove('photo'); location.reload(); },
};

// Keep the object origin in world space so replay, portrait and free look share the same pick-up.
function ticketOrigin(idx){
  const zone=zones[ZONES[idx].id];if(!zone)return;
  const point=zone.group.localToWorld(new THREE.Vector3(...scenes[idx].points[1]));
  if(idx===4&&state.progress>.986)point.set(102,25,-1760);
  point.project(camera);
  el.card.style.setProperty('--pick-x',(clamp(point.x,-.88,.88)*innerWidth*.5)+'px');
  el.card.style.setProperty('--pick-y',(-clamp(point.y,-.82,.82)*innerHeight*.5)+'px');
}
function fileTicket(){
  if(reducedMotion)return;
  const from=$('#ticketRotor').getBoundingClientRect(),to=el.memoryBtn.getBoundingClientRect();
  if(!from.width||!to.width)return;
  const stub=document.createElement('span');stub.className='filed-stub';stub.textContent=letters[state.reading].cue;
  document.body.append(stub);stub.style.left=from.left+from.width*.5+'px';stub.style.top=from.top+from.height*.5+'px';
  stub.animate([{transform:'translate(-50%,-50%) rotate(-5deg)',opacity:1},{transform:'translate('+ (to.left+to.width/2-from.left-from.width/2)+'px,'+(to.top+to.height/2-from.top-from.height/2)+'px) scale(.16) rotate(14deg)',opacity:.1}],{duration:440,easing:'ease-in'}).finished.finally(()=>stub.remove());
}
let detailChapter=0,detailIndex=0;
function showDetail(idx,n){
  if(state.mode!=='travel'||state.modal&&state.modal!==$('#detailPanel'))return;
  detailChapter=idx;detailIndex=n;
  const panel=$('#detailPanel'),s=scenes[idx];panel.dataset.kind=letters[idx].kind;panel.dataset.spot=String(n);
  $('#detailYear').textContent=ZONES[idx].year+' · '+ZONES[idx].label;$('#detailTitle').textContent=s.spots[n];$('#detailStory').textContent=s.stories[n];
  if(state.modal!==panel)openPanel(panel,$('#detailClose'));
}
const landmarkButtons=$$('#landmarks button');
const worldPoint=new THREE.Vector3();
function updateLandmarks(){
  const idx=routeIndex(state.progress),zone=zones[ZONES[idx].id],s=scenes[idx];
  const active=state.mode==='travel'&&!state.crossing&&!state.modal&&zone;
  landmarkButtons.forEach((b,i)=>{
    if(!active){b.hidden=true;return;}
    zone.group.localToWorld(worldPoint.fromArray(s.points[i]));
    const dist=worldPoint.distanceTo(camera.position);worldPoint.project(camera);
    b.hidden=dist>(s.reach??42)||worldPoint.z>=1||worldPoint.z<=-1||Math.abs(worldPoint.x)>.88||worldPoint.y>.76||worldPoint.y<-.43;
    if(!b.hidden){b.style.left=((1+worldPoint.x)*50)+'%';b.style.top=((1-worldPoint.y)*50)+'%';b.setAttribute('aria-label',s.spots[i]);b.title=s.spots[i];}
  });
}
landmarkButtons.forEach((b,n)=>b.addEventListener('click',()=>showDetail(routeIndex(state.progress),n)));
$('#detailBtn').onclick=()=>showDetail(routeIndex(state.progress),0);
$('#detailNext').onclick=()=>showDetail(detailChapter,1-detailIndex);$('#detailClose').onclick=()=>closePanels();
$('#travelSpeed').value=String(state.speed);$('#travelSpeed').onchange=e=>{state.speed=Number(e.target.value);savePreferences();};
$('#skipRead').checked=state.skipRead;$('#skipRead').onchange=e=>{state.skipRead=e.target.checked;savePreferences();};
for(const [idx,z] of ZONES.entries()){
  const b=document.createElement('button');b.type='button';b.textContent=z.year;b.setAttribute('aria-label',z.year+' · '+letters[idx].cue);
  b.onclick=()=>showLetter(idx,{archive:true});$('#archiveYears').append(b);
}
$('#returnScene').onclick=()=>{const idx=state.reading;closePanels(false);approachIsland(idx);};
canvas.addEventListener('dblclick',()=>{if(state.mode==='travel'&&!state.modal&&state.crossing)approachIsland(state.crossing.to);});

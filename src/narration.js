// 叙事层的界面：扉页、底部字幕、间章、人物纸签、结尾立体书。
// 只操作 DOM，不改动三维场景；main.js 在合适的时机调用这里的函数。
import * as THREE from 'three';
import { ASSET } from './assets.js';
import { titlePage, pages, subtitles, interludes, paperTags, albumEnding } from './story.js';
import { letters } from './letters.js';
import { albumIslands } from './album_images.js';

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ZONE_IDS = ['rural', 'town', 'city', 'rail', 'future'];
const YEARS = ['1983', '1996', '2008', '2023', '2049'];

// ------------------------------------------------------------------ 扉页
export function setupTitlePage(isTouch) {
  const root = $('#loading');
  root.querySelectorAll('[data-art]').forEach((img) => { img.src = ASSET('/assets/painted/' + img.dataset.art + '.webp'); });
  if (isTouch) {
    const guide = root.querySelector('.tp-guide');
    guide.replaceChildren(...titlePage.touchGuide.map(([k, v]) => {
      const li = document.createElement('li'); li.innerHTML = `<kbd>${k}</kbd><span>${v}</span>`; return li;
    }));
  }
}
export function titleProgress(pct) {
  const items = document.querySelectorAll('#loading .tp-papers li');
  items.forEach((li, i) => li.classList.toggle('lit', pct >= (i + 1) * 19));
}
export function titleReady(onOpen) {
  const btn = $('#openBook');
  btn.disabled = false; btn.classList.add('ready');
  btn.querySelector('span').textContent = '翻开册子';
  $('#loading').classList.add('is-ready');
  btn.addEventListener('click', onOpen, { once: true });
  btn.focus({ preventScroll: true });
}

// ------------------------------------------------------------------ 字幕
const sub = { queue: [], line: null, left: 0, gap: 0, chapter: -1, entered: new Set(), after: new Set(), el: null };
function subtitleNode() { return sub.el || (sub.el = $('#subtitle')); }
function lineDuration(text) { return clamp(1.9 + text.length * 0.15, 2.6, 5); }
export function resetNarration() {
  sub.queue = []; sub.line = null; sub.left = 0; sub.chapter = -1; sub.entered.clear(); sub.after.clear();
  subtitleNode()?.classList.remove('show');
  tagCache.clear();
}
export function enterChapter(idx) {
  if (idx === sub.chapter) return;
  sub.chapter = idx;
  sub.queue = []; sub.line = null; sub.left = 0;
  subtitleNode()?.classList.remove('show');
  if (idx < 0 || sub.entered.has(idx)) return;
  sub.entered.add(idx);
  sub.queue.push(...subtitles[idx].enter);
  sub.gap = 1.1;
}
export function afterTicket(idx) {
  if (sub.after.has(idx) || idx !== sub.chapter) return;
  sub.after.add(idx);
  sub.queue.push(...subtitles[idx].after);
  sub.gap = Math.max(sub.gap, .6);
}
export function updateSubtitles(dt, paused) {
  const node = subtitleNode(); if (!node) return;
  if (paused) { node.classList.remove('show'); return; }
  if (sub.line) {
    sub.left -= dt;
    if (sub.left <= 0) { sub.line = null; node.classList.remove('show'); sub.gap = .45; }
    else { node.classList.add('show'); return; }
  }
  if (sub.gap > 0) { sub.gap -= dt; return; }
  const next = sub.queue.shift(); if (!next) return;
  sub.line = next; sub.left = lineDuration(next);
  node.querySelector('span').textContent = next;
  node.classList.add('show');
}

// ------------------------------------------------------------------ 间章
let interludeShown = -1;
export function updateInterlude(crossing, active) {
  const node = $('#interlude'); if (!node) return;
  if (!active || !crossing || Math.abs(crossing.to - crossing.from) !== 1) { node.style.opacity = '0'; node.classList.remove('show'); return; }
  const idx = Math.min(crossing.from, crossing.to);
  if (idx !== interludeShown) {
    interludeShown = idx;
    const it = interludes[idx];
    node.querySelector('small').textContent = it.span;
    node.querySelector('b').textContent = it.gap;
    node.querySelector('p').innerHTML = it.lines.map((l) => `<span>${l}</span>`).join('');
  }
  // mist 在跨岛的中段升到 1：书页就在镜头升到云上时翻开。
  const o = clamp((crossing.mist - .3) / .45, 0, 1);
  node.style.opacity = o.toFixed(3);
  node.classList.toggle('show', o > .02);
}

// ------------------------------------------------------------------ 身份条
export function chapterIdentity(idx) {
  const p = pages[idx];
  return { stamp: p.stamp, place: p.place };
}

// ------------------------------------------------------------------ 人物纸签
const tagCache = new Map();
const tagPoint = new THREE.Vector3();
function figure(zones, idx, name) {
  const key = idx + '/' + name;
  if (!tagCache.has(key)) {
    const group = zones[ZONE_IDS[idx]]?.group;
    const obj = group?.getObjectByName('Figure / ' + name) || null;
    let h = 1.7; obj?.traverse((o) => { if (o.isSprite) h = o.scale.y; });
    tagCache.set(key, obj ? { obj, h } : null);
  }
  return tagCache.get(key);
}
export function updatePaperTags(camera, zones, idx, active) {
  const host = $('#paperTags'); if (!host) return;
  const nodes = host.children;
  const list = active && idx >= 0 ? paperTags[idx] : [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i], tag = list[i];
    const f = tag && figure(zones, idx, tag.figure);
    if (!f) { node.classList.remove('show'); continue; }
    f.obj.getWorldPosition(tagPoint); tagPoint.y += f.h + .22;
    const dist = tagPoint.distanceTo(camera.position);
    tagPoint.project(camera);
    const onScreen = tagPoint.z < 1 && tagPoint.z > -1 && Math.abs(tagPoint.x) < .86 && tagPoint.y < .82 && tagPoint.y > -.5;
    const near = dist < 24 && dist > 2.2;
    if (!onScreen || !near) { node.classList.remove('show'); continue; }
    if (node.dataset.key !== idx + tag.figure) {
      node.dataset.key = idx + tag.figure;
      node.querySelector('small').textContent = tag.who;
      node.querySelector('span').textContent = tag.line;
    }
    node.style.left = ((1 + tagPoint.x) * 50).toFixed(2) + '%';
    node.style.top = ((1 - tagPoint.y) * 50).toFixed(2) + '%';
    node.style.setProperty('--near', clamp((24 - dist) / 10, .55, 1).toFixed(2));
    node.classList.add('show');
  }
}

// ------------------------------------------------------------------ 结尾立体书
let albumTimers = [];
export function playAlbum(onDone, reducedMotion = false) {
  const root = $('#albumEnd');
  albumTimers.forEach(clearTimeout); albumTimers = [];
  const stage = root.querySelector('.album-islands');
  if (!stage.childElementCount) buildAlbum(stage, root);
  root.hidden = false; root.removeAttribute('aria-hidden');
  root.className = 'album-end';
  void root.offsetWidth;
  const steps = reducedMotion
    ? [[0, 'open rise line papers'], [2600, 'open rise line papers close']]
    : [[60, 'open'], [900, 'open rise'], [2700, 'open rise line'], [4300, 'open rise line papers'], [7600, 'open rise line papers close']];
  for (const [ms, cls] of steps) albumTimers.push(setTimeout(() => { root.className = 'album-end ' + cls; }, ms));
  const finish = () => {
    albumTimers.forEach(clearTimeout); albumTimers = [];
    root.className = 'album-end ' + 'open rise line papers close leaving';
    albumTimers.push(setTimeout(() => { root.hidden = true; root.setAttribute('aria-hidden', 'true'); root.className = 'album-end'; }, 900));
    root.removeEventListener('click', finish);
    onDone();
  };
  albumTimers.push(setTimeout(finish, reducedMotion ? 4200 : 10200));
  root.addEventListener('click', finish);
  root.querySelector('.album-skip').onclick = (e) => { e.stopPropagation(); finish(); };
}
export function stopAlbum() {
  albumTimers.forEach(clearTimeout); albumTimers = [];
  const root = $('#albumEnd'); if (!root) return;
  root.hidden = true; root.setAttribute('aria-hidden', 'true'); root.className = 'album-end';
}
function buildAlbum(stage, root) {
  root.querySelector('.album-kicker').textContent = albumEnding.kicker;
  root.querySelector('.album-title').textContent = albumEnding.title;
  root.querySelector('.album-note').textContent = albumEnding.note;
  root.querySelector('.album-closing').textContent = albumEnding.closing;
  // 高度 = 回家要多久（对数刻度）：一刻钟最低，三天航程最高。
  const logMin = Math.log(15), logMax = Math.log(4320);
  const points = [];
  pages.forEach((p, i) => {
    const lift = (Math.log(p.minutes) - logMin) / (logMax - logMin);
    const x = 10 + i * 20, y = 80 - lift * 62;
    points.push([x, y]);
    const fig = document.createElement('figure');
    fig.className = 'album-island'; fig.style.setProperty('--x', x + '%'); fig.style.setProperty('--y', y + '%'); fig.style.setProperty('--i', i);
    fig.innerHTML = `<img alt="" src="${albumIslands[ZONE_IDS[i]]}"><figcaption><b>${YEARS[i]}</b><span>${letters[i].cue}</span><em>${p.ride}</em></figcaption>`;
    stage.append(fig);
  });
  const svg = root.querySelector('.album-line');
  const d = points.map(([x, y], i) => {
    if (!i) return `M${x} ${y}`;
    const [px, py] = points[i - 1], mx = (px + x) / 2;
    return `C${mx} ${py} ${mx} ${y} ${x} ${y}`;
  }).join(' ');
  svg.querySelector('path').setAttribute('d', d);
  const strip = root.querySelector('.album-papers');
  letters.forEach((l, i) => {
    const s = document.createElement('span'); s.style.setProperty('--i', i); s.textContent = l.cue;
    strip.append(s);
  });
}

const screen=document.querySelector('#loading');
const meter=screen.querySelector('[role=progressbar]'),pct=document.querySelector('#loadPct');
const guides=[...screen.querySelector('.charge-guide').children];
const fast=new URLSearchParams(location.search).get('quickIntro')==='1';
let real=0,start=0,done=false,resolve,frame;
function paint(now){
  const elapsed=(now-start)/1000;
  const value=Math.floor(Math.min(real,(fast?1:Math.min(1,elapsed/10))*100));
  meter.setAttribute('aria-valuenow',value);pct.textContent=value+'%';
  screen.style.setProperty('--charge',value+'%');
  const phase=elapsed<3.5?0:elapsed<7?1:2;
  guides.forEach((g,i)=>g.classList.toggle('lit',i===phase));
  if(done&&value<100){const s=document.querySelector('#loadStatus');if(s&&s.textContent!=='画卷已备 · 即将翻册')s.textContent='画卷已备 · 即将翻册';}
  if(value===100&&done){screen.classList.add('charged');setTimeout(resolve,fast?0:260);return;}
  if(!screen.classList.contains('hidden'))frame=requestAnimationFrame(paint);
}
export function beginLoading(){cancelAnimationFrame(frame);start=performance.now();done=false;real=0;paint(start);}
export function loadingProgress(value){real=Math.max(real,value);}
export function finishLoading(){real=100;done=true;return new Promise(r=>{resolve=r;});}


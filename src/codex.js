import acts from './story.json' with { type:'json' };
import { letters } from './letters.js';
import { objectTicket } from './object_tickets.js';
import { railwayTicket } from './rail_ticket.js';
import { ASSET } from './assets.js';
import { printFirstPage } from './opening.js';
import { animateSpreadTurn, animateMultiTurn } from './page_curl.js';

const ids=['rural','town','city','rail','future'];
const places=['山河村','山河县东街','长路里站','山河大桥','星河港'];
const tabLabels=['1983 田埂晨','1996 街市暮','2008 城夜雨','2023 山河速','2049 星河远','终章'];
const shortTabs=['1983','1996','2008','2023','2049','终'];
const get=id=>document.getElementById(id);
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function element(tag,text,cls){
  const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el;
}
function control(text,click,cls){const el=element('button',text,cls);el.type='button';el.onclick=click;return el;}

export function createCodex({audio,dialogue,visited,kept,completed,wish,unmute,close,scene,enter,again,map}){
  const root=get('codex'),spread=root.querySelector('.codex-spread'),left=get('folioImage'),image=left.querySelector('img'),plate=left.querySelector('canvas');
  const right=get('folioContent'),nav=get('bookmarks');
  const leftPane=spread.querySelector('.folio-left'),rightPane=spread.querySelector('.folio-right');
  let page=0,busy=false,earth=null,start=null,activeTurn=null;
  function available(i){return i===5?completed():visited.has(i);}

  function snapshotSpread(single){
    const stack=document.createElement('div');
    stack.className='curl-outgoing'+(single?' single':'');
    const cl=leftPane.cloneNode(true),cr=rightPane.cloneNode(true);
    cl.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
    cr.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
    cr.scrollTop=rightPane.scrollTop;
    stack.append(cl,cr);
    spread.append(stack);
    return {stack,left:cl,right:cr};
  }

  function change(to,animate=true){
    if(busy||to===null||!available(to))return;
    const old=page;dialogue.stop();
    if(activeTurn){activeTurn.cancel();activeTurn=null;}
    if(!animate||to===old||reduced()){
      page=to;render();
      if(!root.contains(document.activeElement))nav.children[page]?.focus({preventScroll:true});
      return;
    }
    const single=getComputedStyle(spread).display!=='grid';
    const snap=snapshotSpread(single);
    page=to;render();
    audio.pageTurn(0);
    activeTurn=animateSpreadTurn({
      host:spread,
      outgoingLeft:snap.left,
      outgoingRight:snap.right,
      outgoingStack:snap.stack,
      reverse:to<old,
      duration:660,
      singlePage:single,
      reduced:reduced(),
    });
    activeTurn.promise.finally(()=>{activeTurn=null;});
    if(!root.contains(document.activeElement))nav.children[page]?.focus({preventScroll:true});
  }

  function next(by){let n=page+by;while(n>=0&&n<=5&&!available(n))n+=by;return n>=0&&n<=5?n:null;}
  function render(){
    const end=page===5,a=acts[page],l=letters[page];
    root.dataset.page=page;right.replaceChildren();right.parentElement.scrollTop=0;spread.scrollTop=0;
    nav.replaceChildren(...tabLabels.map((label,i)=>{
      const b=document.createElement('button');b.type='button';
      b.onclick=()=>change(i);
      const full=element('span',label,'tab-full'),compact=element('span',shortTabs[i],'tab-short');
      b.append(full,compact);
      b.disabled=!available(i);b.setAttribute('aria-label',label);b.setAttribute('aria-current',i===page?'page':'false');return b;
    }));
    get('folioPrev').disabled=next(-1)===null;get('folioNext').disabled=next(1)===null;
    const yearEl=get('folioYear');yearEl.textContent=end?'':places[page];yearEl.hidden=end;
    get('folioTitle').textContent=end?'终章 · 地球与留字':acts[page].label.slice(0,4)+' · '+a.title;
    left.disabled=end;left.title=end?'':'点击画面进入'+a.title;image.hidden=false;plate.hidden=true;
    if(end){
      image.src=earth||ASSET('/assets/painted/folio-earth.webp');image.alt='从轨道回望地球';
      right.append(element('h3','五件旧物 · 五句留字'));
      for(const [i,item] of letters.entries()){const p=element('p',item.excerpt,'home-line');p.prepend(element('small',acts[i].label.slice(0,4)+' · '+item.sender+(kept.has(i)?' · 已留住':'')));right.append(p);}
      if(wish())right.append(element('blockquote',wish()));
      right.append(control('再走一程',again,'ink-button'),control('五岛展卷',map,'ink-button'));return;
    }
    image.src=ASSET('/assets/painted/folio-'+ids[page]+'.webp');image.alt=a.title+'开场实景';
    left.setAttribute('aria-label','进入'+a.title);

    const artifact=document.createElement('div');
    artifact.className='folio-artifact '+l.kind;
    artifact.setAttribute('role','img');
    artifact.setAttribute('aria-label',a.object);
    artifact.innerHTML=(l.rail?railwayTicket(l.rail,page===3):objectTicket(l.kind))
      .replace(/id="([^"]+)"/g,'id="folio-$1"')
      .replace(/url\(#([^)]+)\)/g,'url(#folio-$1)');
    right.append(artifact,element('h3',a.object),element('p',a.story),element('blockquote',a.quote));

    const transcript=element('details','','transcript');transcript.append(element('summary','沿途对白 · 文本与配音'),element('small',a.cast,'cast-line'));
    for(const [who,words] of a.dialogue){const p=element('p',words);p.prepend(element('b',who+'　'));transcript.append(p);}
    const listen=control('听本幕对白',()=>{if(dialogue.active?.complete){dialogue.stop();return;}audio.init();unmute?.();dialogue.play(page,true,()=>listen.textContent='听本幕对白');listen.textContent='停止播放';},'ink-button');
    transcript.append(listen);right.append(transcript);
  }
  async function zoom(frame,rect,into){
    const copy=document.createElement('canvas');printFirstPage(copy,frame);copy.className='folio-zoom';document.body.append(copy);
    const full={left:'0px',top:'0px',width:innerWidth+'px',height:innerHeight+'px'},small={left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'};
    try{await copy.animate(into?[small,full]:[full,small],{duration:reduced()?100:1100,easing:'cubic-bezier(.45,0,.23,1)',fill:'both'}).finished;}
    finally{copy.remove();}
  }
  async function revisit(){
    if(busy||page===5)return;
    busy=true;dialogue.stop();
    if(activeTurn){activeTurn.cancel();activeTurn=null;}
    try{const frame=scene(page);printFirstPage(plate,frame);image.hidden=true;plate.hidden=false;await zoom(plate,left.getBoundingClientRect(),true);hide();enter(page);}
    finally{busy=false;}
  }
  function hide(){dialogue.stop();if(activeTurn){activeTurn.cancel();activeTurn=null;}root.hidden=true;}
  function open(i){root.hidden=false;page=i;render();get('closeCodex').focus({preventScroll:true});}
  async function rewind(frame,finish){
    if(busy)return;busy=true;
    if(activeTurn){activeTurn.cancel();activeTurn=null;}
    try{
      const snap=document.createElement('canvas');printFirstPage(snap,frame);earth=snap.toDataURL('image/jpeg',.85);
      try{localStorage.setItem('shanhe.yisui.earth',earth);}catch{}
      open(5);root.classList.add('rewinding');
      await zoom(snap,left.getBoundingClientRect(),false);
      const single=getComputedStyle(spread).display!=='grid';
      await animateMultiTurn({
        host:spread,count:5,reverse:true,singlePage:single,audio,reduced:reduced(),
        onStep(step){page=Math.max(0,4-step);render();}
      });
      page=0;render();finish();
    }finally{root.classList.remove('rewinding');busy=false;}
  }
  try{earth=localStorage.getItem('shanhe.yisui.earth');}catch{}
  left.onclick=revisit;
  get('codexOverview').onclick=()=>{if(!busy){hide();map();}};
  get('closeCodex').onclick=()=>{if(!busy){hide();close();}};
  get('folioPrev').onclick=()=>change(next(-1));get('folioNext').onclick=()=>change(next(1));
  root.onkeydown=e=>{
    if(e.key==='Escape'){e.preventDefault();get('closeCodex').click();}
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const n=next(e.key==='ArrowLeft'?-1:1);if(n!==null)change(n);}
    if(e.key==='Tab'){
      const focus=[...root.querySelectorAll('button:not(:disabled),summary,[tabindex="0"]')].filter(b=>b.getClientRects().length);
      if(e.shiftKey&&document.activeElement===focus[0]){e.preventDefault();focus.at(-1)?.focus();}
      if(!e.shiftKey&&document.activeElement===focus.at(-1)){e.preventDefault();focus[0]?.focus();}
    }
  };
  root.addEventListener('touchstart',e=>{start=[e.touches[0].clientX,e.touches[0].clientY];},{passive:true});
  root.addEventListener('touchend',e=>{if(!start)return;const dx=e.changedTouches[0].clientX-start[0],dy=e.changedTouches[0].clientY-start[1];start=null;if(Math.abs(dx)>52&&Math.abs(dx)>1.5*Math.abs(dy)){const n=next(dx<0?1:-1);if(n!==null)change(n);}},{passive:true});
  return {open,hide,rewind};
}

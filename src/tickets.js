import {scenes} from './family_scenes.js';
import {railwayTicket} from './rail_ticket.js';
import {objectTicket,objectRatios} from './object_tickets.js';

// One DOM object moves from an unobtrusive ticket face to a readable reverse.
export function createTicketView({letters,zones,onFlip,onClose,onDrag,onDragStart,onSwipe,onLaunch}){
  const get=id=>document.getElementById(id),root=get('ticketLayer'),rotor=get('ticketRotor');
  let index=0,back=false,visible=false,ignoreClick=false,press=null;
  function layout(){
    if(!visible)return;
    const chrome=['ticketTools','ticketLaunchActions','archiveYears','returnScene'].reduce((height,id)=>height+(get(id)?.offsetHeight||0),0);
    const limit=Math.max(96,innerHeight-36-chrome);
    const rail=!!letters[index].rail;
    const faceHeight=root.clientWidth*(rail?390/620:objectRatios[letters[index].kind]);
    const height=back?Math.min(get('ticketBackContent').scrollHeight+2,limit):Math.min(faceHeight,limit);
    rotor.style.height=height+'px';
  }
  const observer=new ResizeObserver(layout);observer.observe(get('ticketBackContent'));
  addEventListener('resize',layout);
  function actionGrip(){return get('objectTicketFace').querySelector('[data-grip]');}
  function movingGrip(grip){
    // Lift the actual printed stub, including its original lettering.
    const copy=grip.ownerSVGElement.cloneNode(true),box=grip.getBBox();
    copy.setAttribute('viewBox',[box.x,box.y,box.width,box.height].join(' '));
    copy.setAttribute('aria-hidden','true');return copy;
  }
  function flip(){
    if(!visible||back)return;
    if(root.dataset.stop==='true'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const prop=actionGrip(),rect=prop?.getBoundingClientRect();
      if(rect?.width){const token=movingGrip(prop);token.setAttribute('class','moving-print');
        Object.assign(token.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',zIndex:32});document.body.append(token);
        const end=['translate(2px,-70px) rotate(-24deg)','translate(65px,12px) rotate(19deg)','translate(-9px,12px) rotate(-23deg)','translateX(65px)','translateY(-50px)'][index];
        token.animate([{transform:'none',opacity:1},{transform:end,opacity:0}],{duration:490,easing:'ease-out'}).finished.finally(()=>token.remove());
      }
    }
    onFlip(index);
  }
  get('ticketFront').addEventListener('click',e=>{if(ignoreClick){e.preventDefault();ignoreClick=false;return}flip()});
  get('ticketFront').addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&root.dataset.stop!=='true')return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const grip=actionGrip()?.getBoundingClientRect();
    const onProp=!!(grip&&e.clientX>=grip.left-8&&e.clientX<=grip.right+8&&e.clientY>=grip.top-8&&e.clientY<=grip.bottom+8);
    ignoreClick=false;press={onProp,id:e.pointerId,x:e.clientX,y:e.clientY,previousY:e.clientY,dragged:false};
  });
  get('ticketFront').addEventListener('pointermove',e=>{
    if(!press||e.pointerId!==press.id)return;
    if(!press.dragged&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>9){press.dragged=true;onDragStart()}
    if(press.dragged){onDrag((press.previousY-e.clientY)*.034);press.previousY=e.clientY;}
  });
  get('ticketFront').addEventListener('pointerup',e=>{
    if(!press||e.pointerId!==press.id)return;
    const onProp=press.onProp,dx=e.clientX-press.x,dy=e.clientY-press.y,tapped=!press.dragged,swipe=-dy;press=null;ignoreClick=true;
    const gesture=[dy< -26,dx>26,dy>22||Math.abs(dx)>30,dx>26,Math.abs(dx)>30||onProp&&Math.abs(dy)>26][index];
    if(root.dataset.stop==='true'&&!tapped&&gesture&&(onProp||e.pointerType==='mouse'||index!==0)){e.preventDefault();flip();setTimeout(()=>ignoreClick=false,500);return;}
    // Complete touch taps here and suppress a second compatibility click.
    if(tapped){e.preventDefault();flip();}
    // Let the touch sequence finish before making its target inert.
    if(!tapped&&swipe>40)requestAnimationFrame(()=>onSwipe(swipe*.034));
    setTimeout(()=>ignoreClick=false,500);
  });
  get('ticketFront').addEventListener('pointercancel',()=>{press=null;ignoreClick=true;setTimeout(()=>ignoreClick=false,500)});
  get('shelveTicket').addEventListener('click',onClose);
  get('cardClose').addEventListener('click',onClose);
  get('launchBtn').addEventListener('click',()=>onLaunch(false));
  get('wishInput').addEventListener('focus',()=>requestAnimationFrame(()=>{
    if(visible&&back)get('wishInput').scrollIntoView({block:'center',inline:'nearest'});
  }));
  return {
    operate:flip,
    show(idx,{reading=false,archive=false,stop=false,canLaunch=false}={}){
      index=idx;visible=true;back=reading;
      const letter=letters[idx],zone=zones[idx];
      root.dataset.kind=letter.kind;root.dataset.archive=String(archive);root.dataset.stop=String(stop);
      get('objectTicketFace').hidden=!!letter.rail;
      get('objectTicketFace').innerHTML=letter.rail?'':objectTicket(letter.kind,stop);
      get('railTicketFace').hidden=!letter.rail;
      get('railTicketFace').innerHTML=letter.rail?railwayTicket(letter.rail,idx===3):'';
      get('ticketYear').textContent=zone.year+' · '+zone.label;
      get('ticketLabel').textContent=letter.frontLabel;
      get('ticketText').textContent=letter.frontText;
      get('ticketDistance').textContent=letter.distance;
      get('ticketSerial').textContent='SH / 0'+(idx+1);
      get('ticketStub').textContent=idx===0?'家藏':'存根';
      get('cardTitle').textContent=letter.backText;
      get('cardBody').textContent=letter.body;
      get('ticketFront').setAttribute('aria-label',letter.frontLabel+'，'+letter.distance+'。'+(stop?scenes[idx].action:'轻点翻面阅读'));
      get('ticketComposer').hidden=idx!==4;
      get('ticketLaunchActions').hidden=!canLaunch;
      get('cardClose').hidden=canLaunch;
      get('cardClose').parentElement.hidden=canLaunch;
      root.classList.add('show');root.inert=false;
      get('ticketBack').scrollTop=0;
      this.setSide(reading);layout();
      root.classList.remove('arriving');
      if(stop&&!reading){void root.offsetWidth;root.classList.add('arriving');}
    },
    setSide(value){
      back=!!value;root.dataset.side=back?'back':'front';
      const boarding=!get('ticketLaunchActions').hidden;
      get('ticketFront').inert=back;get('ticketBack').inert=!back;
      get('ticketFront').setAttribute('aria-expanded',String(back));
      get('ticketFront').setAttribute('aria-hidden',String(back));get('ticketBack').setAttribute('aria-hidden',String(!back));
      get('shelveTicket').hidden=back||boarding;
      get('shelveTicket').textContent='收好，继续游览';
      layout();
    },
    hide(){visible=false;root.classList.remove('show','arriving');root.inert=true;root.removeAttribute('aria-modal');root.setAttribute('role','group');press=null;},
    layout,
    get visible(){return visible},
    get back(){return back},
    get index(){return index}
  };
}

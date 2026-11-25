import { coverEase, renderCurlFrame } from './page_curl.js';

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));

export function printFirstPage(picture,canvas){
  picture.width=canvas.width;picture.height=canvas.height;
  picture.getContext('2d',{alpha:false}).drawImage(canvas,0,0);
}

export function openBook(intro,reduced,refreshPicture,onOpen){
  const binding=intro.querySelector('.book-binding'),cover=intro.querySelector('.book-cover');
  const leaf=intro.querySelector('.story-leaf'),nextLeft=intro.querySelector('.leaf-back');
  const plate=intro.querySelector('#bookWindow'),next=intro.querySelector('#openFolio');
  const curlCanvas=intro.querySelector('#openingCurl');
  let stage='cover',clock=0,width=0,height=0,w=0,h=0,artW=0,swipeY=null,wheelAt=0,wheelSum=0,wheelUsed=false;

  function phase(name,label){
    stage=intro.dataset.phase=name;clock=0;
    next.textContent=label||'';next.hidden=!label;
  }
  function advance(){
    if(stage==='cover'){onOpen();phase('opening');}
    else if(stage==='background'){onOpen();phase('turning');}
  }
  function click(){advance();}
  function key(e){
    if(intro.hidden||e.repeat||!['Enter',' ','ArrowDown','PageDown'].includes(e.key))return;
    e.preventDefault();advance();
  }
  function wheel(e){
    const now=performance.now();
    if(now-wheelAt>280){wheelSum=0;wheelUsed=false;}
    wheelAt=now;wheelSum=Math.max(0,wheelSum+e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?height:1));
    if(wheelSum>=22&&!wheelUsed){wheelUsed=true;advance();}
    e.preventDefault();
  }
  function down(e){swipeY=e.touches[0].clientY;}
  function up(e){if(swipeY!==null && swipeY-e.changedTouches[0].clientY>35){e.preventDefault();advance();}swipeY=null;}
  const events={click,wheel,touchstart:down,touchend:up};
  window.addEventListener('keydown',key);
  for(const [name,fn] of Object.entries(events))intro.addEventListener(name,fn,{passive:false});
  phase('cover','轻点书封，翻开故事');

  function clearCurl(){
    if(!curlCanvas)return;
    const ctx=curlCanvas.getContext('2d');
    ctx?.clearRect(0,0,curlCanvas.width,curlCanvas.height);
  }

  return {
    update(dt){
      clock+=dt;
      if(width!==intro.clientWidth||height!==intro.clientHeight){
        width=intro.clientWidth;height=intro.clientHeight;
        const portrait=width<height;
        w=Math.min(width*.45,height*(height<430&&!portrait?.80:.54),430);
        const readingHeight=portrait?height*(width<360?.72:width<390?.65:.56):0;
        h=Math.min(height*.76,Math.max(w*1.40,readingHeight));
        artW=Math.min(w*.87,h*.68*width/height);
        binding.style.setProperty('--w',w+'px');binding.style.setProperty('--h',h+'px');
        plate.style.width=artW+'px';plate.style.height=artW*height/width+'px';refreshPicture();
      }

      const coverTime=reduced?.12:1.05;
      const turnTime=reduced?.12:0.96;
      const zoomTime=reduced?.18:1.8;
      if(stage==='opening'&&clock>=coverTime)phase('background','轻点翻至第一幕');
      if(stage==='turning'&&clock>=turnTime)phase('spread');
      if(stage==='spread'&&clock>=2.0)phase('enter');

      const open=stage==='cover'?0:stage==='opening'?coverEase(clock/coverTime):1;
      const turn=stage==='turning'?clamp(clock/turnTime):['spread','enter'].includes(stage)?1:0;
      const zoom=stage==='enter'?coverEase(clock/zoomTime):0;

      const compact=width<height?1.43:1;
      const closedH=Math.min(w*1.40,h);
      const curH=h+(closedH-h)*(1-open);
      binding.style.setProperty('--h',curH+'px');
      const scale=(1+(compact-1)*(1-open))*Math.exp(Math.log(width/artW)*zoom);
      binding.style.transform='translateX('+((zoom-(1-open))*w*.5*scale)+'px) scale('+scale+')';

      const coverLift=Math.sin(open*Math.PI);
      cover.style.transform='perspective('+w*5+'px) rotateY('+(-180*open)+'deg)';
      cover.style.zIndex=open<1?'4':'2';
      cover.style.setProperty('--cover-lift',coverLift.toFixed(3));
      binding.style.setProperty('--under-shadow',(coverLift*(1-turn)).toFixed(3));

      if(stage==='turning'&&!reduced&&curlCanvas&&w>0&&h>0){
        const bleedY=Math.round(h*0.09);
        const spreadW=w*2;
        const dpr=Math.min(devicePixelRatio||1,2);
        const pw=Math.round(spreadW*dpr),ph=Math.round((h+bleedY*2)*dpr);
        if(curlCanvas.width!==pw||curlCanvas.height!==ph){curlCanvas.width=pw;curlCanvas.height=ph;}
        curlCanvas.style.top=(-h*0.5-bleedY)+'px';
        curlCanvas.style.height=(h+bleedY*2)+'px';
        const ctx=curlCanvas.getContext('2d');
        ctx.setTransform(dpr,0,0,dpr,0,0);
        const state=renderCurlFrame(ctx,spreadW,h,turn,{reverse:false,bleedY,skewFactor:0.12,archFactor:0.06});
        const [rt,rb]=state.rightClip,[lt,lb]=state.leftSettle;
        leaf.style.clipPath=`polygon(0 0, ${rt}px 0, ${rb}px 100%, 0 100%)`;
        nextLeft.style.clipPath=`polygon(${lt}px 0, 100% 0, 100% 100%, ${lb}px 100%)`;
      }else if(turn>=1){
        clearCurl();
        leaf.style.clipPath='polygon(0 0, 0 0, 0 100%, 0 100%)';
        leaf.style.visibility='hidden';
        nextLeft.style.clipPath='none';
      }else{
        clearCurl();
        leaf.style.visibility='visible';
        leaf.style.clipPath='none';
        nextLeft.style.clipPath='polygon(100% 0, 100% 0, 100% 100%, 100% 100%)';
      }

      return zoom>=1;
    },
    dispose(){
      clearCurl();
      window.removeEventListener('keydown',key);
      for(const [name,fn] of Object.entries(events))intro.removeEventListener(name,fn);
      plate.firstElementChild.width=plate.firstElementChild.height=1;
      leaf.style.clipPath='';leaf.style.visibility='';nextLeft.style.clipPath='';
      delete intro.dataset.phase;
    }
  };
}

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{const u=clamp(t);return u*u*(3-2*u);};

function cubicBezier(x1,y1,x2,y2){
  const sampleX=t=>((1-3*x2+3*x1)*t+(3*x2-6*x1))*t*t+3*x1*t;
  const sampleDX=t=>(3*(1-3*x2+3*x1)*t+2*(3*x2-6*x1))*t+3*x1;
  const sampleY=t=>((1-3*y2+3*y1)*t+(3*y2-6*y1))*t*t+3*y1*t;
  return x=>{
    const u=clamp(x);
    if(u<=0||u>=1)return u;
    let t=u;
    for(let i=0;i<5;i++){
      const dx=sampleDX(t);
      if(Math.abs(dx)<1e-5)break;
      t=clamp(t-(sampleX(t)-u)/dx);
    }
    return clamp(sampleY(t));
  };
}

export const pageEase=cubicBezier(0.30,0.04,0.16,1.0);
export const coverEase=cubicBezier(0.36,0.02,0.18,1.0);

function range(v,a,b){return smooth((v-a)/(b-a));}

/**
 * Compute bound-book fold geometry and render a curled paper sheet frame
 * onto a 2D canvas of logical page size `w x h` plus `bleedY` above & below.
 */
export function renderCurlFrame(ctx,w,h,progress,{
  reverse=false,
  bleedY=Math.round(h*0.085),
  skewFactor=0.11,
  archFactor=0.056,
  singlePage=false,
  tint='#f6eee0',
  backTint='#ece0ca',
  shade='#231c15',
  clear=true,
}={}){
  if(clear)ctx.clearRect(0,0,w,h+bleedY*2);
  const raw=clamp(progress);
  const u=pageEase(raw);
  if(u<=0.001||u>=0.999){
    const done=u>=0.999,half=w*0.5;
    const endClip=(reverse&&done)||(!reverse&&!done);
    return {
      u,lift:0,
      rightClip:endClip?[half,half]:[0,0],
      leftSettle:endClip?[half,half]:[0,0],
      singleClip:reverse?(done?[w,w]:[0,0]):(done?[0,0]:[w,w]),
    };
  }

  const lift=Math.sin(u*Math.PI);
  const spine=w*.5;
  const topDelay=0.095;
  const uBot=smooth(clamp(u/(1-topDelay*0.45)));
  const uTop=smooth(clamp((u-topDelay)/(1-topDelay)));

  const computeEdge=t=>{
    if(singlePage){
      const peel=w*(1-t);
      const roll=Math.min(peel,Math.max(10,w*0.24*Math.sin(t*Math.PI)));
      return {peel,contact:peel,rim:Math.max(0,peel-roll),roll};
    }
    // Contact line peels across right page [w -> spine] in first ~56%,
    // then settles outward across left page [spine -> 0] in 42%..100%.
    const rightPeel=spine+spine*(1-range(t,0,0.58));
    const leftSettle=spine*(1-range(t,0.42,1.0));
    const contact=t<0.5?rightPeel:leftSettle;
    // Outer curled edge sweeps continuously across the spread.
    const rim=clamp(lerp(rightPeel-spine*0.46*Math.sin(clamp(t/0.58)*Math.PI),Math.max(0,leftSettle-spine*0.30*Math.sin(t*Math.PI)),smooth((t-0.38)/0.24)),0,w);
    return {peel:rightPeel,settle:leftSettle,contact,rim,roll:Math.max(8,contact-rim)};
  };

  const bot=computeEdge(uBot);
  const top=computeEdge(uTop);
  // Subtle perspective skew on top corner lift.
  const arch=lift*h*archFactor*(0.85+0.15*Math.sin(u*Math.PI));
  const y0=bleedY,y1=bleedY+h,ym=bleedY+h*0.5;

  ctx.save();
  if(reverse){ctx.translate(w,0);ctx.scale(-1,1);}

  // 1. Cast shadow under the lifted edge onto the outgoing/right side.
  const rightShW=14+lift*(singlePage?w*0.16:spine*0.22);
  const shadowGrad=ctx.createLinearGradient(bot.contact,ym,Math.min(w,bot.contact+rightShW),ym);
  shadowGrad.addColorStop(0,`rgba(22,20,18,${(0.32*lift).toFixed(3)})`);
  shadowGrad.addColorStop(0.35,`rgba(22,20,18,${(0.14*lift).toFixed(3)})`);
  shadowGrad.addColorStop(1,'rgba(22,20,18,0)');
  ctx.fillStyle=shadowGrad;
  ctx.beginPath();
  ctx.moveTo(top.contact,y0);
  ctx.lineTo(Math.min(w,top.contact+rightShW),y0);
  ctx.lineTo(Math.min(w,bot.contact+rightShW),y1);
  ctx.lineTo(bot.contact,y1);
  ctx.closePath();
  ctx.fill();

  // 2. Shadow cast ahead of the curling tip onto the left/covered page.
  const tipShW=12+lift*(singlePage?w*0.12:spine*0.26);
  const tipMinX=Math.max(0,Math.min(top.rim,bot.rim)-tipShW);
  const tipMaxX=Math.max(top.rim,bot.rim);
  if(tipMaxX>0.5){
    const tipGrad=ctx.createLinearGradient(tipMaxX,ym,tipMinX,ym);
    tipGrad.addColorStop(0,`rgba(22,20,18,${(0.28*lift).toFixed(3)})`);
    tipGrad.addColorStop(0.45,`rgba(22,20,18,${(0.11*lift).toFixed(3)})`);
    tipGrad.addColorStop(1,'rgba(22,20,18,0)');
    ctx.fillStyle=tipGrad;
    ctx.beginPath();
    ctx.moveTo(top.rim,y0-arch*0.2);
    ctx.lineTo(Math.max(0,top.rim-tipShW),y0);
    ctx.lineTo(Math.max(0,bot.rim-tipShW),y1);
    ctx.lineTo(bot.rim,y1+arch*0.2);
    ctx.closePath();
    ctx.fill();
  }

  // 3. Center spine groove darkening during mid-turn (two-page spreads).
  if(!singlePage&&lift>0.05){
    const spW=18+lift*16;
    const spGrad=ctx.createLinearGradient(spine-spW,ym,spine+spW,ym);
    spGrad.addColorStop(0,'rgba(24,20,16,0)');
    spGrad.addColorStop(0.5,`rgba(24,20,16,${(0.24*lift).toFixed(3)})`);
    spGrad.addColorStop(1,'rgba(24,20,16,0)');
    ctx.fillStyle=spGrad;
    ctx.fillRect(spine-spW,y0,spW*2,h);
  }

  // 4. Physical arched turning sheet (rim <-> contact, arching above & below book edges).
  const midTopX=(top.rim+top.contact)*0.5;
  const midBotX=(bot.rim+bot.contact)*0.5;
  const cMidX=(bot.contact+top.contact)*0.5;
  const rMidX=(bot.rim+top.rim)*0.5;
  const xMin=Math.min(top.rim,bot.rim);
  const xMax=Math.max(top.contact,bot.contact);
  if(xMax-xMin>2){
    const cyl=ctx.createLinearGradient(xMin,ym,xMax,ym);
    cyl.addColorStop(0,'#d4c5aa');
    cyl.addColorStop(0.14,backTint);
    cyl.addColorStop(0.48,'#fffaf0');
    cyl.addColorStop(0.78,tint);
    cyl.addColorStop(0.94,'#e5d7be');
    cyl.addColorStop(1,'#cbbba0');

    ctx.beginPath();
    ctx.moveTo(top.contact,y0);
    ctx.quadraticCurveTo(midTopX,y0-arch,top.rim,y0-arch*0.42);
    ctx.quadraticCurveTo(rMidX-lift*w*skewFactor*0.04,ym,bot.rim,y1+arch*0.42);
    ctx.quadraticCurveTo(midBotX,y1+arch,bot.contact,y1);
    ctx.quadraticCurveTo(cMidX,ym,top.contact,y0);
    ctx.closePath();

    ctx.fillStyle=cyl;
    ctx.fill();

    // Crisp illuminated paper-thickness edge along the arched top/outer/bottom silhouette.
    ctx.strokeStyle=`rgba(255,250,240,${(0.72*lift+0.15).toFixed(3)})`;
    ctx.lineWidth=1.15;
    ctx.stroke();

    // Specular highlight ribbon running down the curved roll spine.
    const ribGrad=ctx.createLinearGradient(xMin,ym,xMax,ym);
    ribGrad.addColorStop(0,'rgba(255,250,240,0)');
    ribGrad.addColorStop(0.42,'rgba(255,250,240,0)');
    ribGrad.addColorStop(0.54,`rgba(255,250,240,${(0.55*lift).toFixed(3)})`);
    ribGrad.addColorStop(0.72,'rgba(255,250,240,0)');
    ribGrad.addColorStop(1,'rgba(255,250,240,0)');
    ctx.fillStyle=ribGrad;
    ctx.fill();
  }

  ctx.restore();

  // Map logical peel/reveal bounds back to real canvas coordinates [0..w].
  const mapX=x=>reverse?w-x:x;
  const half=w*0.5;
  if(singlePage){
    const ct=clamp(mapX(top.peel),0,w),cb=clamp(mapX(bot.peel),0,w);
    return {u,lift,singleClip:[ct,cb]};
  }
  const rt=clamp(mapX(top.peel),reverse?0:half,reverse?half:w)- (reverse?0:half);
  const rb=clamp(mapX(bot.peel),reverse?0:half,reverse?half:w)- (reverse?0:half);
  const lt=clamp(mapX(top.settle),reverse?half:0,reverse?w:half)- (reverse?half:0);
  const lb=clamp(mapX(bot.settle),reverse?half:0,reverse?w:half)- (reverse?half:0);
  return {
    u,lift,
    rightClip:[rt,rb],
    leftSettle:[lt,lb],
  };
}

function syncCanvasSize(canvas,w,h,bleedY){
  const dpr=Math.min(devicePixelRatio||1,2);
  const pw=Math.max(1,Math.round(w*dpr)),ph=Math.max(1,Math.round((h+bleedY*2)*dpr));
  if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
  canvas.style.left='0px';
  canvas.style.top=(-bleedY)+'px';
  canvas.style.width=w+'px';
  canvas.style.height=(h+bleedY*2)+'px';
  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return ctx;
}

/**
 * Animate one spread turn in `#codex` using a live outgoing snapshot clipped
 * along the tilted peel crease + an overhanging curved paper curl canvas.
 */
export function animateSpreadTurn({host,outgoingLeft,outgoingRight,outgoingStack,reverse=false,duration=660,singlePage=false,reduced=false}){
  if(reduced||duration<=16){
    outgoingStack?.remove();
    return {promise:Promise.resolve(),cancel(){outgoingStack?.remove();}};
  }
  const w=host.clientWidth,h=host.clientHeight;
  if(!w||!h){outgoingStack?.remove();return {promise:Promise.resolve(),cancel(){outgoingStack?.remove();}};}
  const bleedY=Math.round(h*0.085);
  const canvas=document.createElement('canvas');
  canvas.className='curl-canvas';
  canvas.setAttribute('aria-hidden','true');
  host.append(canvas);
  const ctx=syncCanvasSize(canvas,w,h,bleedY);

  let rafId=0,stopped=false,doneResolve=null;
  const finish=()=>{
    if(stopped)return;
    stopped=true;
    cancelAnimationFrame(rafId);
    canvas.remove();
    outgoingStack?.remove();
    doneResolve?.();
  };

  const promise=new Promise(resolve=>{
    doneResolve=resolve;
    const t0=performance.now();
    const frame=now=>{
      if(stopped)return;
      const p=clamp((now-t0)/duration);
      const state=renderCurlFrame(ctx,w,h,p,{reverse,bleedY,singlePage});
      if(singlePage){
        const [ct,cb]=state.singleClip;
        outgoingStack.style.clipPath=reverse
          ?`polygon(${ct}px 0, 100% 0, 100% 100%, ${cb}px 100%)`
          :`polygon(0 0, ${ct}px 0, ${cb}px 100%, 0 100%)`;
      }else if(!reverse){
        const [rt,rb]=state.rightClip,[lt,lb]=state.leftSettle;
        if(outgoingRight)outgoingRight.style.clipPath=`polygon(0 0, ${rt}px 0, ${rb}px 100%, 0 100%)`;
        if(outgoingLeft)outgoingLeft.style.clipPath=`polygon(0 0, ${lt}px 0, ${lb}px 100%, 0 100%)`;
      }else{
        const [lt,lb]=state.rightClip,[rt,rb]=state.leftSettle;
        if(outgoingLeft)outgoingLeft.style.clipPath=`polygon(${lt}px 0, 100% 0, 100% 100%, ${lb}px 100%)`;
        if(outgoingRight)outgoingRight.style.clipPath=`polygon(${rt}px 0, 100% 0, 100% 100%, ${rb}px 100%)`;
      }
      if(p>=1)finish();
      else rafId=requestAnimationFrame(frame);
    };
    rafId=requestAnimationFrame(frame);
  });

  return {promise,cancel:finish};
}

/**
 * Animate multiple staggered curled pages (used when rewinding Earth -> Spread 0).
 */
export function animateMultiTurn({host,count=5,reverse=true,singlePage=false,onStep,audio,reduced=false}){
  if(reduced){
    onStep?.(count-1);
    return Promise.resolve();
  }
  const w=host.clientWidth,h=host.clientHeight;
  if(!w||!h){onStep?.(count-1);return Promise.resolve();}
  const bleedY=Math.round(h*0.09);
  const canvas=document.createElement('canvas');
  canvas.className='curl-canvas';
  canvas.setAttribute('aria-hidden','true');
  host.append(canvas);
  const ctx=syncCanvasSize(canvas,w,h,bleedY);

  const stagger=420,leafDur=960;
  const total=(count-1)*stagger+leafDur;
  const stepped=new Set();
  for(let i=0;i<count;i++)audio?.pageTurn(i*0.42);

  return new Promise(resolve=>{
    const t0=performance.now();
    const frame=now=>{
      const elapsed=now-t0;
      ctx.clearRect(0,0,w,h+bleedY*2);
      for(let i=0;i<count;i++){
        const local=clamp((elapsed-i*stagger)/leafDur);
        if(local<=0||local>=1)continue;
        if(local>=0.48&&!stepped.has(i)){stepped.add(i);onStep?.(i);}
        renderCurlFrame(ctx,w,h,local,{
          reverse,bleedY,singlePage,
          skewFactor:0.09+((i%3)*0.022),
          archFactor:0.044+((i%3)*0.008),
          clear:false,
        });
      }
      if(elapsed>=total){
        for(let i=0;i<count;i++)if(!stepped.has(i))onStep?.(i);
        canvas.remove();
        resolve();
      }else{
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);
  });
}

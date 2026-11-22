import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

const url=process.env.CAPTURE_URL || new URL('../dist/山河织路-离线单文件.html',import.meta.url).href;
const executablePath=[process.env.CHROME,chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p=>p&&fs.existsSync(p));
const args=['--enable-webgl','--ignore-gpu-blocklist','--disable-gpu-shader-disk-cache'];
if(process.env.CHANGLU_DXGI_LUID)args.push('--use-gl=angle','--use-angle=d3d11','--use-adapter-luid='+process.env.CHANGLU_DXGI_LUID);

async function swipe(page){
  const box=await page.locator('#gl').boundingBox();
  const x=Math.round(box.x+box.width*.70),y=Math.round(box.y+box.height*.65);
  const session=await page.context().newCDPSession(page);
  try{
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let dy=16;dy<=80;dy+=16){
      await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-dy}]});
    }
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }finally{await session.detach();}
}

for(const mobile of process.argv.includes('--mobile-only')?[true]:[false,true]){
  const browser=await chromium.launch({executablePath,args});
  try{
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1536,height:960},
      deviceScaleFactor:mobile?2.75:1.67,hasTouch:mobile,isMobile:mobile});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      window.openingPhases=[];
      const timer=setInterval(()=>{
        const intro=document.querySelector('#prologue');
        if(!intro)return;
        const phase=window.__ready?(intro.dataset.phase||__changlu.state.mode):
          Number(getComputedStyle(intro.querySelector('.book-binding')).opacity)>.99?'cover':'text';
        if(phase!==openingPhases.at(-1))openingPhases.push(phase);
        if(phase==='travel')clearInterval(timer);
      },100);
      function duringLoad(){
        if(!window.__changlu){requestAnimationFrame(duringLoad);return;}
        const state=window.__changlu.state;
        if(!state.ready){
          window.dispatchEvent(new WheelEvent('wheel',{deltaY:120}));
          window.ignoredEarlyWheel=!state.started;
        }
      }
      requestAnimationFrame(duringLoad);
    });
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__ready||window.__error,null,{timeout:150000});
    assert.equal(await page.evaluate(()=>window.__error),null);
    assert.equal(await page.evaluate(()=>window.ignoredEarlyWheel),true,'Loading input must leave the cover usable');
    await page.evaluate(touch=>{
      const probe=window.openingInput={start:0,firstPaint:0,worst:0,gestures:[],phases:openingPhases};
      window.addEventListener(touch?'pointerup':'wheel',e=>probe.gestures.push([Math.round(performance.now()),e.deltaY??e.pointerType,__changlu.state.mode]),{capture:true,passive:true});
      window.addEventListener(touch?'pointerup':'wheel',()=>{
        probe.start=performance.now();
        let previous=probe.start;
        function frame(){
          const current=performance.now();
          probe.worst=Math.max(probe.worst,current-previous);
          previous=current;
          if(!probe.firstPaint && __changlu.state.mode==='prologue' && __changlu.state.introTime>0)probe.firstPaint=current-probe.start;
          if(current-probe.start<1700 || !probe.firstPaint)requestAnimationFrame(frame);
          else probe.done=true;
        }
        requestAnimationFrame(frame);
      },{capture:true,once:true,passive:true});
    },mobile);
    if(mobile)await swipe(page);
    else for(let i=0;i<12;i++)await page.mouse.wheel(0,8);
    try{
      await page.waitForFunction(()=>window.openingInput.done,null,{timeout:15000});
    }catch(error){
      console.error(JSON.stringify(await page.evaluate(()=>({mode:__changlu.state.mode,introTime:__changlu.state.introTime,hidden:document.hidden,wall:performance.now()-openingInput.start,probe:openingInput}))));
      throw error;
    }
    const result=await page.evaluate(()=>{
      const {firstPaint,worst}=openingInput,gl=__changlu.renderer.getContext();
      const ext=gl.getExtension('WEBGL_debug_renderer_info');
      return {firstFrameMs:Math.round(firstPaint),worstGapMs:Math.round(worst),
        coverHidden:document.querySelector('#landing').classList.contains('hidden'),
        gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
    });
    assert(result.coverHidden && result.firstFrameMs<2000 && result.worstGapMs<2000,JSON.stringify(result));
    if(process.argv.includes('--natural')){
      await page.waitForFunction(()=>__changlu.state.mode==='travel',null,{timeout:45000});
      const phases=await page.evaluate(()=>openingInput.phases);
      assert(phases.includes('cover')&&phases.includes('spread')&&phases.includes('enter'),JSON.stringify(phases));
    }else await page.locator('#skipIntro').click({timeout:3000});
    if(mobile)await swipe(page);else await page.mouse.wheel(0,120);
    await page.waitForFunction(()=>__changlu.state.mode==='travel'&&__changlu.state.progress>.1001,null,{timeout:3000});
    await page.locator('#infoBtn').click({timeout:3000});
    assert.equal(await page.locator('#infoBtn').getAttribute('aria-expanded'),'true');
    assert.deepEqual(errors,[]);
    console.log(mobile?'Touch':'Trackpad',JSON.stringify(result));
  }finally{await browser.close();}
}

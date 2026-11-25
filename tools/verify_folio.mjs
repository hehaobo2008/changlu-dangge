import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {crossings,travelTime,progressAtTime} from '../src/journey.js';
import acts from '../src/story.json' with {type:'json'};

const root=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(root,'dist'),out=path.join(root,'qa','folio');
fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mp3':'audio/mpeg','.json':'application/json','.webp':'image/webp','.woff':'font/woff'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),file=path.resolve(dist,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(dist+path.sep)||!fs.statSync(file,{throwIfNoEntry:false})?.isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const executablePath=[process.env.CHROME,chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p=>p&&fs.existsSync(p));
const browser=await chromium.launch({executablePath,args:['--enable-webgl','--ignore-gpu-blocklist']});
const entry=[.1,...crossings.map(a=>a[1])], stops=[.128,.342,.572,.812,1],names=['rural','town','city','rail','future'];
try{
 for(const phone of process.argv.includes('--desktop')?[false]:process.argv.includes('--phone')?[true]:[false,true]){
  const context=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1366,height:850},deviceScaleFactor:1,hasTouch:phone,isMobile:phone});
  const page=await context.newPage(),errors=[],prefix=phone?'phone':'desktop';
  page.on('pageerror',e=>{errors.push(e.message);console.error('pageerror',e.message);});
  await page.addInitScript(()=>{window.voiceSamples=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.voiceSamples.push(this);if(window.rejectNextVoice){window.rejectNextVoice=false;return Promise.reject(new Error('Test audio fallback'));}return play.call(this);};});
  await page.addInitScript(()=>{
    window.introFades=[];
    const animate=Element.prototype.animate;
    Element.prototype.animate=function(frames,options){
      if(this.id==='chapter')window.introFades.push({title:this.querySelector('#chTitle').textContent,
        mode:document.body.dataset.mode,from:frames[0].opacity,to:frames.at(-1).opacity});
      return animate.call(this,frames,options);
    };
  });
  const shot=async name=>{await page.screenshot({path:path.join(out,prefix+'-'+name+'.jpg'),type:'jpeg',quality:85});};
  const mode=async v=>page.waitForFunction(v=>window.__changlu?.state.mode===v,v,{timeout:45000});
  const phase=async v=>page.waitForFunction(v=>document.getElementById('prologue').dataset.phase===v,v,{timeout:45000});
  const click=async id=>page.locator(id)[phone?'tap':'click']({timeout:7000});
  const step=async seconds=>page.evaluate(sec=>{const a=__changlu;for(let t=0;t<sec;t+=.05)a.step(.05);a.render();},seconds);
  const place=async p=>page.evaluate(p=>{const a=__changlu;a.setProgress(p);a.settle(15);a.step(0);a.render();},p);
  async function checkIntro(stage){
    const box=await page.locator('#chapter').evaluate(el=>{
      const {x,y,width,height}=el.getBoundingClientRect(),heading=el.querySelector('h2').getBoundingClientRect();
      const panel=getComputedStyle(el,'::before');
      return {cx:x+width/2-innerWidth/2,cy:y+height/2-innerHeight/2,heading:heading.x+heading.width/2-innerWidth/2,
        compact:el.dataset.compact,panel:panel.content,bar:parseFloat(panel.borderLeftWidth),bg:parseFloat(panel.opacity)};
    });
    assert.equal(box.compact,String(stage==='corner'));
    assert.equal(box.bar,0);
    assert.notEqual(box.panel,'none');
    if(stage==='corner'){assert(box.bg>.85&&box.cx<0&&box.cy>0,JSON.stringify(box));return;}
    if(stage==='moving'){assert(box.bg>.05&&box.bg<.98,JSON.stringify(box));return;}
    if(stage==='center')assert(box.bg<.05&&[box.cx,box.cy,box.heading].every(n=>Math.abs(n)<2),JSON.stringify(box));
  }
  const url=phone?pathToFileURL(path.join(dist,'山河织路-离线单文件.html')).href:'http://127.0.0.1:'+server.address().port+'/';
  if(phone)await context.route(/^https?:/,route=>route.abort());
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1700);await shot('loading');
  await page.waitForFunction(()=>window.__ready||window.__error,null,{timeout:180000});
  assert.equal(await page.evaluate(()=>window.__error),null);await phase('cover');await page.waitForTimeout(400);await shot('cover');
  const coverBox=await page.locator('.book-cover').boundingBox();
  assert(coverBox&&Math.abs(coverBox.x+coverBox.width/2-(phone?390:1366)/2)<20&&Math.abs(coverBox.y+coverBox.height/2-(phone?844:850)/2)<20,'Cover not centered: '+JSON.stringify(coverBox));
  console.log(prefix,'loaded');
  if(phone)await click('#openFolio');else await page.keyboard.press('Enter');
  await phase('background');await shot('background');
  if(phone)await click('#openFolio');else await page.keyboard.press('Space');
  if(!phone){await page.waitForTimeout(420);await shot('turning');}
  await phase('spread');await shot('spread');await mode('travel');await page.waitForTimeout(500);await shot('entry-0');
  if(!phone){await page.mouse.wheel(0,130);await page.waitForFunction(()=>__changlu.state.progress>.1001);}
  if(phone){assert.equal(await page.locator('#hud .hud-actions>button:visible').count(),4);await click('#moreBtn');await shot('more');await click('[data-tool=infoBtn]');await click('#infoClose');}
  assert.equal(await page.locator('#detailBtn,#detailPanel,#encounter,#actionProp,#ticketFlipHint,#skipFinale,#folioEnter,#ticketReverseBrand,#cardIndex,#keepLetter,#letterPages,#prevLetter,#nextLetter,#collectedTxt,#chNum,#skipLoad,#skipIntro,#stopNotice').count(),0);
  await page.evaluate(()=>{__changlu.freeze();__changlu.automaticLetters(false);});
  for(let i=0;i<5;i++){
    if(i){await click('#timeline [data-ch="'+i+'"]');await step(2.4);}
    await place(entry[i]);await page.waitForTimeout(840);await checkIntro('center');await shot('entry-'+i);
    assert.match((await page.locator('#chYear').innerText()).trim(),/^\d{4}$/);
    if(!phone){
      const png=await page.evaluate(()=>{__changlu.render();return document.querySelector('#gl').toDataURL('image/webp',.9).split(',')[1];});
      fs.writeFileSync(path.join(out,'frame-'+names[i]+'.webp'),Buffer.from(png,'base64'));
    }
    if(i===1||i===2)await click('#soundBtn');
    if(i===1)assert.equal(await page.locator('#soundBtn').getAttribute('aria-pressed'),'false');
    if(i===3)await page.evaluate(()=>{window.rejectNextVoice=true;});
    await place(progressAtTime(travelTime(entry[i])+5));await checkIntro('moving');if(i===0)await shot('moving-0');
    await place(progressAtTime(travelTime(entry[i])+10.5));await checkIntro('corner');
    await page.waitForFunction(()=>!document.querySelector('#captions').hidden);
    if(i===3){
      const firstCue=await page.locator('#captions span').innerText();
      await page.waitForFunction(first=>!document.querySelector('#captions').hidden&&document.querySelector('#captions span').textContent!==first,firstCue);
    }else await page.waitForFunction(()=>window.voiceSamples.at(-1)?.currentTime>.25);
    await shot('dialogue-'+i);
    if(phone&&i===0){
      for(const [width,height] of [[844,390],[568,320],[320,568]]){
        await page.setViewportSize({width,height});
        await place(entry[0]);await checkIntro('center');
        await place(progressAtTime(travelTime(entry[0])+10.5));
        const clear=await page.evaluate(()=>{
          const rect=s=>document.querySelector(s).getBoundingClientRect();
          const panel=rect('#chapter'),caption=rect('#captions');
          const apart=!caption.height||panel.bottom+5<caption.top||panel.right+8<caption.left;
          return panel.bottom+5<rect('.tl-line').top&&apart;
        });
        assert(clear,'Chapter panel must clear the captions and timeline at '+width+'×'+height);
        if(width===568)await shot('landscape-corner');
      }
      await page.setViewportSize({width:390,height:844});await place(progressAtTime(travelTime(entry[0])+10.5));
    }
    await click('#memoryBtn');await mode('codex');assert.equal(await page.locator('#codex').getAttribute('data-page'),String(i));
    assert.equal(await page.locator('.detail-tags,.folio-object,#folioEnter').count(),0);
    if(i===0){
      assert.equal(await page.locator('#folioYear').innerText(),'山河村');
      assert.equal(await page.locator('#closeCodex').innerText(),'退出');
      assert.equal(await page.locator('#codexOverview').isVisible(),true);
      if(!phone){
        const arrowAligned=await page.evaluate(()=>{
          const box=s=>document.querySelector(s).getBoundingClientRect();
          const spread=box('.codex-spread'),prev=box('#folioPrev'),next=box('#folioNext');
          const midY=spread.top+spread.height/2;
          return Math.abs(prev.top+prev.height/2-midY)<12&&Math.abs(next.top+next.height/2-midY)<12&&prev.right<spread.left&&next.left>spread.right;
        });
        assert(arrowAligned,'Codex prev/next arrows must sit cleanly centered beside book spread');
      }
    }
    const artBox=await page.locator('.folio-artifact svg').boundingBox();assert(artBox&&artBox.height>40);
    await shot('folio-'+i);
    if(!phone&&i===1){await click('#folioPrev');await page.waitForTimeout(260);await shot('codex-turn');await page.waitForTimeout(550);await click('#folioNext');await page.waitForTimeout(750);}
    if(i===0){await click('.transcript summary');await click('.transcript button');await page.waitForFunction(()=>voiceSamples.at(-1)?.currentTime>.3);}
    await click('#closeCodex');
    await place(stops[i]);await page.evaluate(()=>__changlu.automaticLetters(true));await step(4.1);
    await page.waitForTimeout(1350);await shot('ticket-'+i);
    assert.equal(await page.locator('#shelveTicket').isVisible(),i<4);
    if(i===1){
      const grip=page.locator('#ticketFront [data-grip]');
      assert.equal(await grip.getAttribute('fill'),'transparent');
      assert.equal(await page.locator('#ticketFront svg text').evaluateAll(ts=>ts.filter(t=>t.textContent.replace(/\s/g,'')==='副券').length),1);
    }else if(i===4){
      assert.equal(await page.locator('#ticketFront [data-grip]').count(),0);
      assert.equal((await page.locator('#launchBtn').innerText()).trim(),'点亮归途');
      const bpText=await page.locator('#ticketFront').innerText();
      assert(!bpText.includes('稻种培育任务')&&!bpText.includes('三天航程'),'Unexpected suffix on boarding pass: '+bpText);
    }
    if(!phone)await page.keyboard.press('r');else await click('#ticketFront');
    assert.equal(await page.locator('#ticketLayer').getAttribute('data-side'),'back');await page.waitForTimeout(500);await shot('letter-'+i);
    if(i<4){
      if(i===0)assert.equal((await page.locator('#cardClose').innerText()).trim(),'继续游览');
      await click('#cardClose');await page.evaluate(()=>__changlu.automaticLetters(false));
    }
    else{await page.locator('#wishInput').fill('愿稻穗在月面抽绿');await click('#launchBtn');await step(26);}
  }
  const fades=await page.evaluate(()=>introFades.filter(f=>f.mode==='travel'&&f.from===0&&f.to===1).map(f=>f.title));
  assert.deepEqual([...new Set(fades)],acts.map(act=>act.title));
  await mode('ended');await page.waitForTimeout(1200);await shot('earth');await click('#closeEarth');await page.waitForTimeout(1800);await shot('rewind');await mode('codex');
  assert.equal(await page.locator('#codex').getAttribute('data-page'),'0');await click('#bookmarks button:last-child');await page.waitForTimeout(550);await shot('final');assert((await page.locator('#folioContent').innerText()).includes('愿稻穗在月面抽绿'));
  await page.keyboard.press('ArrowLeft');await click('#folioImage');await mode('travel');await step(.05);
  assert.equal(await page.evaluate(()=>__changlu.state.chapter),4);assert.deepEqual(errors,[]);
  console.log(prefix,'five acts, five tickets, rewind, re-entry OK');await context.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}


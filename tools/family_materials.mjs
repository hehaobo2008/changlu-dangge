// Text and images for the story manuscript, five boards and two print layouts.
import fs from 'node:fs';
import acts from '../src/story.json' with {type:'json'};
import {letters,endingText,familyNote} from '../src/letters.js';
import {scenes} from '../src/family_scenes.js';

const title='山河织路 · 一穗千里';
const figures=['rural','town','city','rail','future'];
const years=acts.map(act=>act.label.slice(0,4));
const plate=i=>'../assets/painted/folio-'+figures[i]+'.webp';
const detail=(i,j)=>'../assets/painted/'+acts[i].details[j].image+'.webp';
const screen=name=>'../qa/family/'+name+'.jpg';
const save=(name,content)=>fs.writeFileSync(new URL('../docs/'+name,import.meta.url),content.trim()+'\n');
const roles=acts.map((act,i)=>'| '+years[i]+' | '+act.title+' | '+act.cast+' | '+act.object+' |').join('\n');
const opening='1983 年秋，山河村的周桂芳收稻时挑出抗风老晚稻留种，把字条塞进考上县城中学的女儿林穗书包里。\n\n后来林穗在县粮油店工作安家，把家乡好米带进县城。女儿宁宁考入江城农学院研究老稻种，毕业后在云岭试验站培育出高产抗倒伏的“山河稻”。\n\n2049 年，这脉稻种入选月面广寒站种植实验：五十九岁的宁宁守地面温室做对照，二十四岁的女儿小满登星河号赴月种植。';
const dialogue=lines=>lines.map(([who,line])=>'**'+who+'**　'+line).join('\n\n');
const chapters=acts.map((act,i)=>{
  const letter=letters[i],scene=scenes[i];
  return `## 第${['一','二','三','四','五'][i]}幕　${act.title}

${act.heading}　｜　${act.cast}

### 入场与沿途

${act.intro}

收至左下角后显示「${act.line}」

路程题签　${act.label}

### 沿途对白

${dialogue(act.dialogue)}

### 旧物与纸背

**${act.object}**　${scene.drag}，翻面读字。

正面　${act.front}

背面　${letter.sender}留给${letter.to}：「${act.quote}」

${act.story}`;
}).join('\n\n');

save('一穗千里-剧情与互动稿.md',`# ${title}

## 四代人的稻种

周桂芳留下晚稻种，把便笺塞进女儿林穗的书包。林穗在县城粮油店工作安家，女儿宁宁考入江城农学院将老稻种改良为“山河稻”。到了宁宁送女儿小满登船的那天，同一脉稻种分作两份，一份留在地球温室做对照，一份前往月面广寒站。

| 年份 | 幕名 | 人物 | 随身旧物 |
| --- | --- | --- | --- |
${roles}

## 开卷

加载时，书名随进度点亮，以星空山海柔雾画面为底。轻点书封翻开第 1 页，也可按回车。左页为“四代人与一脉稻种”人物时间导览：

- **周桂芳（外婆）**：1983 山河村 · 种田选穗留种
- **林穗（妈妈）**：1996 县城东街 · 县粮油店工作安家
- **宁宁（女儿）**：2008—2023 · 农学院育种，改良“山河稻”
- **小满（外孙女）**：2049 星河港 · 科研员，携新稻登月

右页为总背景交代：

${opening}

再翻一页，以弧形拟真翻页揭开田埂晨景与第一幕引言，随后场景放大进入山河村。每幕的时间、地点和背景介绍在画面中央渐显，滑动后平滑收至左下角模糊底层，换作一句凝练短题。可用滚轮、轻滑、方向键或自动漫游前行。沿途双人对白在漫游与书中统一使用同一段录音与文本，全程带同步字幕。漫游中遇见的五件旧物可按提示操作或按 R 翻看背面故事。

${chapters}

## 月地之间与收卷

小满扫码登船后，可以在登船牌背面留白，或留下最多 24 字。票面也备有三句可选留言。

${letters[4].replies.map(line=>'- '+line).join('\n')}

星河号升空，镜头离开星港、转向地球。画面上出现「${familyNote}」与「${endingText}」，已填写的留言也随之出现。继续滑动或轻点「收卷入书」，书页从终章连翻五页倒翻回第 1 幕。

书内有五个年代和一个终章。左页实景可进入该幕场景，右页静态陈列重要旧物、背景故事与本幕对白。终章「五件旧物 · 五句留字」把五句纸背留字依年代排在一起，标出沿途留住的句子，并收录登船前写下的话。可选「再走一程」或「五岛展卷」。`);

const mast='<div class="mast"><b>山河织路</b><span>一穗千里</span></div>';
const photo=(url,alt)=>'<img src="'+url+'" alt="'+alt+'">';
const fig=(url,label)=>'<figure>'+photo(url,label)+'<figcaption>'+label+'</figcaption></figure>';
const credits='五幕的场景、票面与交互由项目制作。透明人物插画采用 AI 辅助绘制。列车沿用《轨上清风》的原模型。地球地表采用 NASA Blue Marble，云层来自 Solar System Scope / INOVE。';

const style=`*{box-sizing:border-box}html,body{margin:0;color:#332f29;background:#dfd8ca;font-family:"Microsoft YaHei",sans-serif}article,section.board{background:#f5eee1;position:relative;overflow:hidden;break-after:page}.mast{display:flex;align-items:center;gap:1em;color:#8b442f;border-bottom:1px solid #a49277;padding-bottom:.55em}.mast b{font:600 1.25em SimSun,serif;letter-spacing:.15em}.mast span,small{font-family:Arial,"Microsoft YaHei",sans-serif;letter-spacing:.09em}.mast span{font-size:.6em}h1,h2,h3,blockquote{font-family:KaiTi,STKaiti,SimSun,serif;font-weight:500}h1,h2,h3,p,figure,blockquote{margin:0}h1{font-size:3.8em;line-height:1.14}h2{font-size:2.2em;line-height:1.22;margin:.45em 0 .43em}h3{font-size:1.25em}p{line-height:1.75}img{display:block;width:100%;height:100%;object-fit:cover}figure{min-width:0}figcaption{font-size:.72em;margin-top:.55em;color:#775d48}small{font-size:.63em;color:#8d5239}blockquote{font-size:1.43em;line-height:1.4;color:#81442f;margin:1em 0}.split{display:grid;grid-template-columns:1.4fr 1fr;gap:1.18em}.pair{display:grid;grid-template-columns:1fr 1fr;gap:.9em}.cells{display:grid;grid-template-columns:repeat(5,1fr);gap:.6em}.cells b{font-family:Georgia,serif;color:#934932}.cells p{font-size:.78em;line-height:1.68}.page-foot{position:absolute;bottom:4%;left:5.3%;right:5.3%;border-top:1px solid #c9bba6;padding-top:.52em;font-size:.55em;color:#796c5d;display:flex;justify-content:space-between}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}`;
const html=(title,css,body)=>'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>'+title+'</title><style>'+style+css+'</style><body>'+body+'</body></html>';
const foot=(name,i)=>'<footer class="page-foot"><span>'+name+'</span><span>一穗千里　/　'+i+'</span></footer>';
const page=(i,title,content,cls='')=>'<section class="board '+cls+'">'+mast+'<h2>'+title+'</h2>'+content+foot('数字媒体设计 · 融合',i)+'</section>';
const css='@page{size:2400px 1500px;margin:0}.board{width:2400px;height:1500px;padding:82px 125px;font-size:43px}.board figure img{height:580px}.board .pair figure img{height:536px}.board .cells figure img{height:370px}.cells{margin:1.2em 0}.cells article{background:none;overflow:visible}.cells h3{margin:.3em 0}.board .scene-sheet,.board .close-sheet{display:grid;grid-template-columns:1.55fr 1fr;gap:54px}.board .scene-sheet img{height:850px}.board .scene-sheet .inset{height:335px;margin-bottom:26px}.board .hero{width:100%;height:650px}.board .endshot{height:735px}.board .blurb{max-width:43em}.tiny{font-size:.7em;color:#76614c}.board .cells img{height:335px}.board .cells .detail-strip{height:175px;margin-top:8px}.board .cells small{display:block;margin-top:1em}';
const boards=[
  page(1,'田埂上留的一把种',`<div class="scene-sheet"><div>${photo(plate(0),'秋晨的山河村')}</div><div>${photo(detail(0,1),'田埂上的留种人').replace('<img','<img class="inset"')}<blockquote>最饱的谷留着做种。</blockquote><p>1983 年，林穗带着外婆的便笺去县城念书。六十六年后，小满带着同一脉稻秧前往月面。四代人的路，从山河村的一个秋晨展开。</p></div></div>`),
  page(2,'六十六年，五段路',`<div class="cells">${acts.map((a,i)=>`<div>${photo(plate(i),a.title)}${photo(detail(i,0),a.details[0].name).replace('<img','<img class="detail-strip"')}<small>${a.label}</small><h3>${a.title}</h3><p>${a.line}</p></div>`).join('')}</div>`),
  page(3,'翻过票面，读见家书',`<div class="pair">${fig(screen('front-1'),'1996 · 沿齿线撕下电影副券')}${fig(screen('back-4'),'2049 · 在登船牌背面留下自己的话')}</div><div class="cells">${scenes.map((s,i)=>`<div><small>${years[i]}</small><h3>${s.action}</h3><p>${acts[i].object}</p></div>`).join('')}</div>`),
  page(4,'桥上与江心',`<div class="pair">${acts[3].details.map((d,j)=>fig(detail(3,j),d.name)).join('')}</div><blockquote>“${acts[3].quote}”</blockquote><p class="blurb">宁宁从高铁上看见江心的渡船。林穗在船上抬起头，桥上的两列车正好在夕阳里相遇。</p>`),
  page(5,'当稻秧离开地球',`<div class="scene-sheet"><div>${photo(screen('earth'),'离开星港，回望地球')}</div><div><small>2049 · 星河号</small><blockquote>“${acts[4].quote}”</blockquote><p>镜头回望地球，登船时写下的话浮现在星球上方。再翻开图鉴，便能从外婆的留种便笺，一路读到小满的登船牌。</p><p class="tiny" style="margin-top:1.5em">离线交互网页　<span data-offline-size></span><br>WebGL 2 · 桌面与触屏</p></div></div>`)
];
save('boards.html',html(title+' · 设计展板',css,boards.join('\n')));


const pdfCss='article{width:210mm;height:297mm;padding:14mm 15mm;font-size:14px}figure img{height:58mm}.hero{height:94mm;margin:7mm 0}.rows{display:grid;gap:3mm}.row{display:grid;grid-template-columns:20mm 1fr;gap:3mm;align-items:baseline;padding-bottom:2mm;border-bottom:1px solid #dbcdb7}.row b{color:#93563c}.row p{font-size:12px}.note{background:#ede4d3;padding:4mm;margin-top:4mm}.pair img{height:44mm}.work-note{margin-top:6mm}.work-note h3{margin:.4em 0}.work-note p{font-size:13px}@page{size:A4;margin:0}';

const rows=acts.map((a,i)=>`<div class="row"><b>${years[i]}</b><div><h3>${a.title}</h3><p>${a.line}　${a.object}</p></div></div>`).join('');
const design=[
  `<article>${mast}<h2>一穗千里</h2><small>一家四代的归途 · 1983—2049</small>${photo(plate(0),'山河村秋晨').replace('<img','<img class="hero"')}<p>外婆周桂芳把老晚稻留种，把字条塞进女儿林穗的书包；女儿宁宁考入农学院改良出高产抗倒伏“山河稻”；六十六年后，宁宁守在星河港温室做对照培育，小满带着另一份稻秧乘星河号赴月种植。五件纸上旧物记下了每一程。</p><blockquote>${familyNote}</blockquote><div class="rows">${rows}</div>${foot('设计说明',1)}</article>`,
  `<article>${mast}<h2>从纸上读到路上</h2><div class="pair">${fig(detail(0,1),'山河村 · 田埂上挑选谷种')}${fig(detail(4,0),'星河港 · 发射场旁的育苗温室')}</div><div class="work-note"><h3>翻开书页</h3><p>第 1 页左页列出四代人物时间导览，右页交代总背景；再以拟真翻页揭开实景进入第一幕。每幕背景介绍在画面中央渐显，滑动后平滑收至左下角模糊底层并换作短题。</p><h3>听对白，读旧物</h3><p>漫游与书中统一播放同一套双人对白并同步显示字幕。沿途遇见的五件旧物分别展开折角、撕券、剪票、刷证与扫码，观众可翻面读故事并留住喜爱的句子。</p><h3>地球与留字</h3><p>星河号离台后回望地球。观众在登船牌上留下的话随画面出现，收卷后连翻五页入书，终章将它和五件旧物上的留字收在一起。</p></div><div class="pair" style="margin-top:7mm">${fig(screen('front-1'),'沿齿线撕下副券')}${fig(screen('record'),'终章 · 五件旧物与留字')}</div><div class="note"><h3>画面与声音</h3><p>${credits} 漫游声场、翻页声与人物对白按场景切换。</p></div>${foot('设计说明',2)}</article>`
];
save('design.html',html(title+' · 设计说明',pdfCss,design.join('\n')));

const flowCss='@page{size:A4 landscape;margin:0}article{width:297mm;height:210mm;padding:11mm 14mm;font-size:16px}.cells{margin:7mm 0}.cells img{height:36mm}.cells h3{margin:2mm 0}.cells p{margin-top:1mm}.line{border-top:1px solid #ae8d74;padding-top:4mm;margin-top:4mm}';
const stops=acts.map((a,i)=>`<div>${photo(plate(i),a.title)}<small>${years[i]}</small><h3>${a.title}</h3><p>${a.object}<br>${scenes[i].drag}</p></div>`).join('');
save('flow.html',html(title+' · 交互流程',flowCss,`<article>${mast}<h2>从翻书到收卷</h2><p>轻点书封 → 阅读人物导览与总背景 → 拟真翻至田埂晨景 → 书页放大，开始漫游</p><div class="cells">${stops}</div><p class="line">每幕听沿途对白、操作旧物并翻面留字。在书中可重听同一段本幕对白，或从左页进入任意一幕。</p><p class="line">登船前留字 → 星河号升空 → 回望地球 → 五页连翻入书 → 终章回读五句留字和自己的留言</p>${foot('交互流程',1)}</article>`));

export const familyNote = '饭在灶上，早点回来吃饭。';
export const endingText = '从田埂到星河，都记着回家吃饭。';
const replies = ['等我回来吃饭','给家里留盏灯','稻子熟了，一起尝尝'];
export const letters = [
  {kind:'note',sender:'外婆',to:'妈妈',title:'灶上温着饭',distance:'走田埂 · 一刻钟',
   setting:'1983 年秋晨。外婆把碗扣在锅沿，压住给妈妈的字条。',routeLine:'放学顺着炊烟走，一刻钟到家。',
   cue:'灶边字条',frontLabel:'外婆的灶边字条',frontText:familyNote,backLabel:'碗底留字 · 外婆',backText:familyNote,
   body:'天刚亮，外婆把新米倒进铁锅。那年妈妈十二岁，背起书包去上学，外婆把字条压在搪瓷碗下。梁上挂着一只红绳布袋，里头是留给来年的稻种。',excerpt:familyNote},
  {kind:'ticket',sender:'妈妈',to:'外婆',title:'散场以后',distance:'骑车二十里 · 一小时',
   setting:'1996 年的县城，东街电影院亮起了晚场的灯。',routeLine:'县城成了远方，门后的灯一直亮着。',
   cue:'东街电影票',frontLabel:'东街电影院 · 晚场',frontText:'电影入场券\n伍排　壹座',backLabel:'电影票背的蓝字 · 妈妈',backText:'散场我就回，给我留门。',
   body:'妈妈领到工钱，牵着六岁的我去看七点半的电影。自行车横梁上挂着网兜饭盒。开场铃响，她向售票员借了一支蓝笔，在副券背面给外婆留话。',excerpt:'散场我就回，给我留门。'},
  {kind:'train',rail:{serial:'B019786',gate:'2',from:'长路里站',to:'江城站',fromRoman:'Changluli',toRoman:'Jiangcheng',service:'K1986',departure:'2008年09月01日 21:47开',seat:'06车 072号',fare:'72.0',className:'硬座',code:'CL20080901 061986072'},
   sender:'宁宁',to:'妈妈',title:'开学的夜车',distance:'绿皮夜车 · 一整夜',setting:'2008 年开学夜。妈妈把红伞往我的编织袋那边挪了挪。',routeLine:'雨落了一站又一站，饭盒还是温的。',
   cue:'绿皮车票',frontLabel:'铁路客票 · 学生硬座',frontText:'长路里 → 江城\n21:47　硬座',backLabel:'剪口旁的铅笔字 · 宁宁',backText:'妈，过年我回家。',
   body:'开学那天落着雨。妈妈往我的编织袋里塞进两罐咸菜、一饭盒饺子，外婆又塞了一小袋稻种。车开以后，我趴在小桌板上写字，邻座剥花生的声音响了一夜。',excerpt:'妈，过年我回家。'},
  {kind:'express',rail:{serial:'E012023',gate:'A3',from:'云岭站',to:'长路里站',fromRoman:'Yunling',toRoman:'Changluli',service:'G2023',departure:'2023年10月18日 17:46开',seat:'05车 08F号',fare:'18.0',className:'二等座',code:'YL20231018 05202308F'},
   sender:'宁宁',to:'妈妈',title:'赶得上晚饭',distance:'高铁过江 · 四十分钟',setting:'周三下班。五点四十六的车，落日还挂在桥塔边。',routeLine:'四十分钟后，就轮到我系上围裙。',
   cue:'高铁报销凭证',frontLabel:'电子客票 · 报销凭证',frontText:'云岭 → 长路里\n刷证进站',backLabel:'报销凭证背面 · 宁宁',backText:'别做饭，今晚我来。',
   body:'我刷证进站，还是打印了一张凭证，夹进外婆交给我的旧册子。过江时给妈妈发了条消息。到家，蓝围裙还挂在老地方，桌上已经摆好三双筷子。',excerpt:'别做饭，今晚我来。'},
  {kind:'boarding',sender:'宁宁',to:'妈妈',title:'把稻种带去月面',distance:'月地之间 · 三天航程',setting:'2049 年黎明。育苗温室旁，星河号正在等最后一位乘员。',routeLine:'我把家装进行李，也把归期写在票背。',
   cue:'星河号登船牌',frontLabel:'星河港 · 月面广寒站',frontText:'地球 → 月面广寒站\n2049.09.01　06:30',backLabel:'登船牌上的归期 · 宁宁',backText:'等月亮上的稻子熟了，回家煮给你吃。',
   body:'六点半登船。我摸了摸口袋里的红绳布袋，这是外婆留下的那一脉稻种。三天后抵达广寒站，我要在那里种下第一盘秧苗。',excerpt:'等月亮上的稻子熟了，回家煮给你吃。',replies}
];

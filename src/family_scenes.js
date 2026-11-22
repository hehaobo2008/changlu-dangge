import * as THREE from 'three';

// Landmarks use island-local coordinates. The second point is also the ticket pickup.
export const scenes = [
  {points:[[-3.3,2.7,49],[7.1,1,20]], action:'掀盖取字条',drag:'向上掀开锅盖',spots:['供销合作社','田埂上的稻子'],stories:['外婆用攒下的粮票换了半斤盐。走出供销社，熟悉的田埂一直通到家门口。','外婆每年都从田里挑出最饱满的一把谷子，留给来年。']},
  {points:[[-4.98,3.8,-35],[-.85,1.1,-51.5]],action:'撕下副券',drag:'向右撕下副券',spots:['东街副食','车铃响过东街'],stories:['散场回家要经过东街副食。妈妈攥着两张票，停下来给我买了一块糖。','从东街骑到家有二十里，车把上挂着的饭盒一路轻轻响。']},
  {points:[[9.48,1.65,23.9],[1.2,15.5,-5]],action:'在票边剪口',drag:'按下检票钳',spots:['雨里的红伞','高架上的绿皮车'],stories:['伞总往编织袋那边偏。我上车才发现，妈妈的半边袖子全湿了。','绿皮车从街上驶过。我隔着车窗望回去，寻找雨里那把红伞。']},
  {reach:105,points:[[-25,2,9.4],[-6.83,31.47,0]],action:'刷证进站',drag:'把证件移过感应区',spots:['桥下的船','山河大桥'],stories:['外婆从前坐船过江。今天，我在火车上往下望，还能看见江面上小小的船影。','如今只消一顿饭的工夫，我就能从江的这一边赶回妈妈身边。']},
  {reach:110,points:[[127,8,-42],[102,25,-80]],action:'扫描登船牌',drag:'让登船牌穿过光带',spots:['港口的温室','星河号'],stories:['从家乡带出来的稻种，终于在港口的温室里抽出了新叶。','我收好登船牌，抬头再看一眼星河号。三天以后，地球就成了窗外那盏灯。']}
];

export function vesselMark(rocket){
  const c=document.createElement('canvas');c.width=180;c.height=700;
  const g=c.getContext('2d');g.textAlign='center';g.fillStyle='#973c32';
  g.beginPath();g.moveTo(30,97);g.quadraticCurveTo(80,70,146,20);g.lineTo(97,95);g.lineTo(69,86);g.closePath();g.fill();
  g.fillStyle='#263f50';g.font='600 103px "Microsoft YaHei",sans-serif';
  [...'星河号'].forEach((s,i)=>g.fillText(s,90,235+i*122));
  g.font='bold 23px sans-serif';g.fillText('XINGHE',90,558);g.fillRect(22,588,136,4);g.fillText('SH · 001',90,634);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.22,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  for(const bearing of [.28,Math.PI+.28]){
    const geo=new THREE.CylinderGeometry(2.633,2.633,9.9,20,1,true,bearing-.43,.86);
    const m=new THREE.Mesh(geo,mat);m.name='星河号 · 船体标识';m.position.y=27.0;m.userData.noNormal=true;rocket.add(m);
  }
}
// Airborne particles scatter a little light inside the streetlamp's beam; the
// silhouette fades at both ends rather than producing a hard polygonal cone.
export function streetLightAir(group){
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{shade:{value:new THREE.Color('#f8bf72')}},
    vertexShader:'varying vec2 st;void main(){st=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 st;uniform vec3 shade;void main(){float f=sin(st.y*3.14159);gl_FragColor=vec4(shade,.035*f*f);}'});
  const geometry=new THREE.ConeGeometry(1.55,6,16,1,true);
  for(const [x,z] of [[9.4,18],[-7.55,6.1]]){
    const cone=new THREE.Mesh(geometry,material);cone.position.set(x,3.85,z);cone.name='Rain in streetlight';cone.userData.noNormal=cone.userData.optionalLight=true;group.add(cone);
  }
}



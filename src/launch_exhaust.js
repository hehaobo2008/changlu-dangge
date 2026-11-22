import * as THREE from 'three';
import {flightPose,smooth} from './earth/choreography.js';

// Native model coordinates use three twin-nozzle boosters around a five-bell core.
function nozzles(){
  const bells=[[0,0,.88,1]];
  for(let i=0;i<4;i++){
    const a=Math.PI*(.25+i*.5);
    bells.push([1.48*Math.cos(a),-1.48*Math.sin(a),.84,1]);
  }
  for(let i=0;i<3;i++){
    const a=Math.PI/2+i*Math.PI*2/3;
    for(const side of [-1,1]){
      bells.push([4.25*Math.cos(a)-side*.72*Math.sin(a),
        -4.25*Math.sin(a)-side*.72*Math.cos(a),.66,.82]);
    }
  }
  return bells;
}

function engineFlame(rocket){
  const positions=[],sections=[],indices=[];
  const tongues=nozzles().map(n=>[...n,0]);
  // The separate bright roots disappear into a common turbulent tail.
  tongues.push([0,0,3.7,1,1],[0,0,2.65,.73,2]);
  for(const [x,z,r,strength,layer] of tongues){
    const start=positions.length/3, sides=18, rows=22;
    for(let i=0;i<=rows;i++)for(let j=0;j<=sides;j++){
      const t=i/rows, a=2*Math.PI*j/sides;
      const radius=r*(layer?(.62+.60*Math.sin(t*Math.PI))*(1-.75*t):1-.77*t);
      const gather=layer?1:1-.54*t;
      positions.push(x*gather+Math.cos(a)*radius,-(layer?2.6+t*37:t*14)*strength,z*gather+Math.sin(a)*radius);
      sections.push(t,a,x+z*1.71,layer);
      if(i<rows && j<sides){
        const k=start+i*(sides+1)+j;
        indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);
      }
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('section',new THREE.Float32BufferAttribute(sections,4));geometry.setIndex(indices);
  const material=new THREE.ShaderMaterial({
    uniforms:{time:{value:0},power:{value:0},stretch:{value:1}},transparent:true,depthWrite:false,
    side:THREE.DoubleSide,forceSinglePass:true,
    vertexShader:`attribute vec4 section;varying vec4 plume; varying vec3 eye;varying float altitude;
      uniform float time,power,stretch;
      void main(){plume=section;vec3 p=position;
        float t=section.x,a=section.y;
        float flow=sin(3.*a+t*16.-time*8.+section.z)+.47*sin(7.*a-t*22.+time*11.);
        p.xz+=vec2(cos(a),sin(a))*(.12+.91*t)*flow*t;
        p.y*=(.25+.75*power)*mix(1.,stretch,step(.5,section.w))*(1.+t*.07*flow);
        vec3 world=(modelMatrix*vec4(p,1.)).xyz;altitude=world.y;eye=cameraPosition-world;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`varying vec4 plume;varying vec3 eye;varying float altitude;uniform float time,power;
      void main(){float t=plume.x,a=plume.y;
        float streak=.5+.5*sin(7.*a+3.*sin(3.*a+13.*t-time*6.)+t*31.-time*9.+plume.z);
        float melt=smoothstep(.02,1.,t+.14*streak);
        vec3 hot=mix(vec3(3.85,2.18,.98),vec3(2.35,.68,.125),melt);
        vec3 gas=mix(vec3(2.85,.96,.19),vec3(1.12,.17,.029),melt);
        float outer=step(.5,plume.w)*(1.-step(1.5,plume.w));
        float root=plume.w<.5?1.:smoothstep(0.,.15,t);
        float edge=smoothstep(0.,.54,abs(dot(normalize(eye),vec3(cos(a),0.,sin(a)))));
        float opacity=root*pow(max(0.,1.-t),.69)*mix(.90,.40,outer)*(.52+.48*streak)*edge;
        gl_FragColor=vec4(mix(hot,gas,outer),opacity*power*smoothstep(6.4,7.05,altitude));
      }`
  });
  const jets=new THREE.Mesh(geometry,material);
  jets.name='Engine exhaust';jets.userData.noNormal=true;rocket.add(jets);
  return jets;
}

function exhaustCloud(atlas,pad){
  const quad=new THREE.PlaneGeometry(1,1);
  const g=new THREE.InstancedBufferGeometry();
  g.index=quad.index;g.setAttribute('position',quad.attributes.position);g.setAttribute('uv',quad.attributes.uv);
  const specs=[];
  let seed=3091;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(const [kind,count,start,end] of [['mist',12,0,1.7],['apron',54,.55,4.1],['trail',42,1.7,7.0]]){
    for(let i=0;i<count;i++)specs.push({kind,birth:start+(end-start)*(i+.28*rand())/count,
      a:Math.PI*2*rand(),speed:7+rand()*7,roll:(rand()-.5)*.64,
      variant:Math.floor(rand()*8),width:.74+rand()*.48,depth:0});
  }
  const attribute=()=>new THREE.InstancedBufferAttribute(new Float32Array(specs.length*4),4).setUsage(THREE.DynamicDrawUsage);
  const pose=attribute(),style=attribute(),surface=attribute();
  g.setAttribute('puff',pose);g.setAttribute('style',style);g.setAttribute('surface',surface);g.instanceCount=0;
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{atlas:{value:atlas},padLight:{value:0}},
    vertexShader:`attribute vec4 puff,style,surface;varying vec2 st;varying vec3 light;varying vec3 local;
      void main(){
        vec2 q=position.xy;float a=style.x;
        q=mat2(cos(a),sin(a),-sin(a),cos(a))*q;
        vec4 center=modelViewMatrix*vec4(puff.xyz,1.);
        vec2 offset=q*puff.w*vec2(1.,style.y);
        center.xy+=offset;gl_Position=projectionMatrix*center;
        local=puff.xyz+vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0])*offset.x
          +vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1])*offset.y;
        st=(vec2(mod(style.z,4.),floor(style.z/4.))+mix(vec2(.008),vec2(.992),uv))/vec2(4.,2.);
        light=vec3(surface.x,surface.y,style.w);
      }`,
    fragmentShader:`uniform sampler2D atlas;uniform float padLight;varying vec2 st;varying vec3 light;varying vec3 local;
      void main(){vec4 puff=texture2D(atlas,st);
        float alpha=puff.a*light.z*smoothstep(-.60,.65,local.y);if(alpha<.008)discard;
        float fold=smoothstep(.32,.80,puff.r);
        vec3 cool=mix(vec3(.072,.091,.114),vec3(.56,.65,.71),fold);
        vec3 lit=mix(vec3(.38,.19,.093),vec3(2.37,1.18,.42),fold);
        float spill=padLight*exp(-dot(local.xz,local.xz)*.0030-abs(local.y-3.)*.060);
        gl_FragColor=vec4(mix(cool,lit,clamp(spill+.26*light.x,0.,1.))*light.y,alpha);
      }`});
  const cloud=new THREE.Mesh(g,m);cloud.name='Ground vapour and rising exhaust';cloud.userData.noNormal=true;
  cloud.frustumCulled=false;pad.add(cloud);
  const active=[],forward=new THREE.Vector3();
  return {
    update(t,camera){
      active.length=0;camera.getWorldDirection(forward);
      m.uniforms.padLight.value=1.2*smooth(.4,1.32,t)*(1-smooth(3.2,5.4,t));
      for(const p of specs){
        const age=t-p.birth,trail=p.kind==='trail',mist=p.kind==='mist',life=trail?2.6:mist?3.4:6.2;
        if(age<=0||age>=life)continue;
        const height=trail?flightPose(p.birth).rocket-7:0;
        const distance=trail?2.3+age*3:2.4+p.speed*(1-Math.exp(-age*.40))*3.2;
        p.x=Math.cos(p.a)*distance+(trail?0:age*1.5);
        p.z=Math.sin(p.a)*distance*(trail?.85:.64);
        p.y=Math.max(.8,height-(trail?age*3.3:0))+(trail?0:age*(mist?1.0:1.65));
        p.size=(trail?8+age*10:mist?3+age*3.8:7.4+age*7.4)*p.width;
        p.aspect=trail?1.24:mist?.64:.74+age*.042;
        if(p.kind==='apron'){
          // Two low streams spill beyond the platform and fold back into larger banks.
          const side=Math.cos(p.a)>.04?1:-1,flow=1-Math.exp(-age*.63);
          p.x=side*(3+flow*(p.speed*3.5+(side>0?8:0)))+age*1.3;
          p.z=Math.sin(p.a)*(3+flow*12)+Math.sin(age*1.4+p.a)*age;
          p.y=1+Math.pow(flow,2)*(3.3+p.speed*.40)+Math.max(0,age-1.35)*1.7;
          p.size=(6.3+age*9.2)*p.width;p.aspect=.61+flow*.43;
        }
        p.heat=(mist?.17:trail?.88:1)*Math.exp(-age*(trail?1.8:.70))*(1-smooth(3.6,6.5,t));
        p.alpha=(mist?.44:trail?.60:.90)*smooth(0,trail?.20:.38,age)*(1-smooth(life*.54,life,age));
        p.angle=p.roll*(.6+age*.42);
        p.depth=p.x*forward.x+p.y*forward.y+p.z*forward.z;
        active.push(p);
      }
      active.sort((a,b)=>b.depth-a.depth);
      active.forEach((p,i)=>{
        pose.setXYZW(i,p.x,p.y,p.z,p.size);style.setXYZW(i,p.angle,p.aspect,p.variant,p.alpha);
        surface.setXYZW(i,p.heat,.90+p.width*.10,0,0);
      });
      g.instanceCount=active.length;pose.needsUpdate=style.needsUpdate=surface.needsUpdate=true;
    },
    mesh:cloud
  };
}

export function launchExhaust(rocket,port,atlas){
  const jets=engineFlame(rocket),pad=new THREE.Group();
  pad.name='Pad ignition';pad.position.set(102,7,-80);port.add(pad);
  const cloud=exhaustCloud(atlas,pad);
  const lamp=new THREE.PointLight('#ff9b4b',0,150,1.8);pad.add(lamp);
  const hinges=['lower','upper'].flatMap((name,level)=>{
    const pivot=port.getObjectByName('Service_hinge_'+name);
    return pivot?[{pivot,level,closed:pivot.quaternion.clone()}]:[];
  });
  const up=new THREE.Vector3(0,1,0),turn=new THREE.Quaternion();
  const passenger=port.getObjectByName('宁宁登船');
  function reset(){
    if(passenger)passenger.visible=true;
    jets.visible=cloud.mesh.visible=false;cloud.mesh.geometry.instanceCount=0;lamp.intensity=0;
    for(const {pivot,closed} of hinges)pivot.quaternion.copy(closed);
  }
  reset();
  return {reset,update(t,camera,fade){
    if(passenger)passenger.visible=false;
    hinges.forEach(({pivot,closed,level})=>{
      const openness=smooth(.02+level*.12,1.22+level*.18,t);
      pivot.quaternion.copy(closed).multiply(turn.setFromAxisAngle(up,1.30*openness));
    });
    const power=smooth(.44,1.35,t)*fade;
    jets.visible=power>.001;cloud.mesh.visible=t>0&&fade>0;
    jets.material.uniforms.time.value=t;jets.material.uniforms.power.value=power;
    jets.material.uniforms.stretch.value=1+smooth(1.8,5.8,t)*.85;
    lamp.position.set(0,3.6+Math.min(60,rocket.position.y-7)*.55,1.6);
    lamp.intensity=5200*power*(1-smooth(3.55,5.3,t))*(1+.065*Math.sin(t*13.5));
    if(cloud.mesh.visible)cloud.update(t,camera);
  }};
}


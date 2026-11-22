function ease(t,start,end){
  const u=Math.min(1,Math.max(0,(t-start)/(end-start)));
  return u*u*(3-2*u);
}

// Copy immediately after a WebGL draw, before the browser discards its drawing
// buffer. The book animates one printed frame and the same camera resumes in place.
export function printFirstPage(picture,canvas){
  picture.width=canvas.width;picture.height=canvas.height;
  picture.getContext('2d',{alpha:false}).drawImage(canvas,0,0);
}

export function openBook(intro,reducedMotion,refreshPicture){
  const binding=intro.querySelector('.book-binding'),cover=intro.querySelector('.book-cover');
  const words=intro.querySelector('.intro-lines'),plate=intro.querySelector('#bookWindow');
  let width=0,height=0,w,h,artW;
  function size(){
    width=intro.clientWidth;height=intro.clientHeight;
    w=Math.min(width*.425,height*.49,384);h=w*1.34;
    artW=Math.min(w*.86,h*.68*width/height);
    binding.style.setProperty('--w',w+'px');binding.style.setProperty('--h',h+'px');
    plate.style.width=artW+'px';plate.style.height=(artW*height/width)+'px';
    refreshPicture();
  }
  return {
    update(t){
      if(width!==intro.clientWidth || height!==intro.clientHeight)size();
      const open=reducedMotion?1:ease(t,5.1,7.55);
      const zoom=reducedMotion?0:ease(t,7.95,10.95);
      const coverSize=width<height?1.55:1;
      const scale=(1+(coverSize-1)*(1-open))*Math.exp(Math.log(width/artW)*zoom);
      const originX=-w*.5*((1-open)+zoom)*scale;
      binding.style.transform='translateX('+originX+'px) scale('+scale+')';
      binding.style.opacity=String(ease(t,3.45,4.6));
      cover.style.transform='perspective('+Math.round(w*4.6)+'px) rotateY('+(-180*open)+'deg)';
      words.style.opacity=String(ease(t,0,.7)*(1-ease(t,3.05,3.8)));
      intro.dataset.phase=t<3.8?'text':open<.01?'cover':zoom===0?'spread':'enter';
    },
    dispose(){
      const picture=plate.firstElementChild;
      picture.width=picture.height=1;
      delete intro.dataset.phase;
    }
  };
}

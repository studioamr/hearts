/* HEARTS — sprites: los stickers reales de André (assets/*.png) */
(function(){
const imgs={}, cache={};

// precarga todos los stickers; reintenta si el server tira la conexión
function loadOne(a, tries){
  return new Promise(res=>{
    const im=new Image();
    im.onload=()=>{ imgs[a.id]=im; res(); };
    im.onerror=()=>{
      if(tries>0) setTimeout(()=>loadOne(a,tries-1).then(res), 250+Math.random()*400);
      else res();
    };
    im.src='assets/'+a.id+'.png?v=7'+(tries<3?'&r='+tries:'');
  });
}
function load(animals){
  return Promise.all(animals.map(a=>loadOne(a,3)));
}

// canvas con el sticker a tamaño nativo (para UI: roster, market, lobby)
function spriteCanvas(an){
  if(cache[an.id]) return cache[an.id];
  const cv=document.createElement('canvas');
  const im=imgs[an.id];
  if(im){ cv.width=im.width; cv.height=im.height; cv.getContext('2d').drawImage(im,0,0); }
  else { cv.width=90; cv.height=110; return cv; } // sin cachear: puede llegar después
  cache[an.id]=cv;
  return cv;
}

// dibuja en el juego: centrado en cx, apoyado en bottomY, altura h (aspecto nativo)
// pose (opcional) anima el sticker estilo Brawl Stars:
//  - moving+run: trote juguetón (brinquito + inclinación + rebote)
//  - air+vy:     salto (se estira con la velocidad, se inclina)
//  - crouch:     agachado (aplastado y ancho)
//  - land 0..1:  aplastón al aterrizar
//  - idle+t:     respiración en reposo
//  - atk 0..1:   embestida del golpe (lunge al frente)
//  - flash 0..1: destello blanco al recibir daño
//  - spawn 0..1: pop elástico al aparecer
function drawAnimal(ctx,an,cx,bottomY,h,flip,pose){
  const im=imgs[an.id]; if(!im) return;
  const w=h*(im.width/im.height);
  let rot=0, sx=1, sy=1, dy=0, flash=0;
  if(pose){
    if(pose.crouch){
      sy=0.62; sx=1.16;
    } else if(pose.air){
      const k=Math.max(-1,Math.min(1,(pose.vy||0)/700));
      sy=1+0.15*Math.abs(k); sx=1-0.10*Math.abs(k);
      rot=0.12*k;
    } else if(pose.moving){
      dy=-Math.abs(Math.sin(pose.run))*h*0.085;
      rot=Math.sin(pose.run)*0.11;
      sy=1+Math.sin(pose.run*2)*0.05;
    } else if(pose.idle){
      sy=1+Math.sin((pose.t||0)*3.2)*0.028;
      sx=1-Math.sin((pose.t||0)*3.2)*0.018;
    }
    if(pose.atk){ rot+=0.22*pose.atk; sx*=1+0.12*pose.atk; dy+=h*0.02*pose.atk; }
    if(pose.land){ sy*=1-0.30*pose.land; sx*=1+0.28*pose.land; }
    if(pose.spawn){
      const k=1-pose.spawn;                       // 0->1 al aparecer
      const s=k<1?(1+Math.sin(k*Math.PI*1.5)*0.35*(1-k)):1; // rebote elástico
      sx*=Math.max(0.2,s*k+0.2*(1-k)); sy*=Math.max(0.2,s);
    }
    flash=pose.flash||0;
  }
  ctx.save();
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  if(flash>0.05) ctx.filter=`brightness(${1+1.8*flash}) saturate(${1-0.6*flash})`;
  ctx.translate(cx,bottomY+dy);
  ctx.rotate(rot*(flip?-1:1));
  ctx.scale(sx*(flip?-1:1),sy);
  ctx.drawImage(im,-w/2,-h,w,h);
  ctx.restore();
}

window.Sprites={ load, spriteCanvas, drawAnimal };
})();

/* HEARTS — armas: carga los PNG de assets/weapons y los dibuja (UI + en partida) */
(function(){
const imgs={}, cache={};
function loadOne(w, tries){
  return new Promise(res=>{
    const im=new Image();
    im.onload=()=>{ imgs[w.id]=im; res(); };
    im.onerror=()=>{ if(tries>0) setTimeout(()=>loadOne(w,tries-1).then(res),250); else res(); };
    im.src='assets/weapons/'+w.id+'.png?v=1'+(tries<3?'&r='+tries:'');
  });
}
function load(){ return Promise.all(DATA.WEAPONS.map(w=>loadOne(w,3))); }
function ready(id){ return !!imgs[id]; }

// canvas a tamaño nativo para la UI (tienda)
function canvas(id){
  if(cache[id]) return cache[id];
  const im=imgs[id]; const cv=document.createElement('canvas');
  if(im){ cv.width=im.width; cv.height=im.height; cv.getContext('2d').drawImage(im,0,0); cache[id]=cv; }
  else { cv.width=80; cv.height=80; }
  return cv;
}
// dibuja el arma centrada en (x,y) con altura h, volteada y rotada (para la partida)
function draw(ctx,id,x,y,h,flip,angle){
  const im=imgs[id]; if(!im) return;
  const k=h/im.height, w=im.width*k;
  ctx.save(); ctx.translate(x,y);
  if(flip) ctx.scale(-1,1);
  if(angle) ctx.rotate(angle);
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  ctx.drawImage(im,-w/2,-h/2,w,h);
  ctx.restore();
}
window.WEAP={ load, ready, canvas, draw };
})();

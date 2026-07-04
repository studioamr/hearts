/* HEARTS — mapart: texturas y piezas extraídas de los mapas de André (assets/maps/) */
(function(){
const img={};
const FILES={
  bgBros:'bg_bros.png', bgFall:'bg_fall.png',
  bgFallDesierto:'bg_fall_desierto.png', bgBrosDesierto:'bg_bros_desierto.png',
  bgFallNieve:'bg_fall_nieve.png',
  pyramid:'pyramid.png', bomb:'bomb.png', boom:'boom.png', crate:'crate.png',
  torch:'torch.png', skull:'skull.png',
  wallTop:'wall_top.png', wallLeft:'wall_left.png', wallCorner:'wall_corner.png', wallGold:'wall_gold.png',
  grassA0:'grass_a0.png', grassA1:'grass_a1.png', grassA2:'grass_a2.png',
  grassB0:'grass_b0.png', grassB1:'grass_b1.png', grassB2:'grass_b2.png',
  bush0:'bush0.png', bush1:'bush1.png', bush2:'bush2.png', bush3:'bush3.png',
  solid0:'solid0.png', solid1:'solid1.png', solid2:'solid2.png', solid3:'solid3.png', solid4:'solid4.png',
};
function loadOne(key, tries){
  return new Promise(res=>{
    const im=new Image();
    im.onload=()=>{ img[key]=im; res(); };
    im.onerror=()=>{ if(tries>0) setTimeout(()=>loadOne(key,tries-1).then(res),250+Math.random()*400); else res(); };
    im.src='assets/maps/'+FILES[key]+'?v=2'+(tries<3?'&r='+tries:'');
  });
}
function load(){ return Promise.all(Object.keys(FILES).map(k=>loadOne(k,3))); }

// glow de antorcha (radial parpadeante)
function torchGlow(ctx,x,y,time,seed,r){
  const f=0.75+0.25*Math.sin(time*9+seed*2.7);
  const rad=(r||34)*f;
  const g=ctx.createRadialGradient(x,y,2,x,y,rad);
  g.addColorStop(0,'rgba(255,190,80,0.40)');
  g.addColorStop(0.5,'rgba(255,140,40,0.16)');
  g.addColorStop(1,'rgba(255,120,20,0)');
  ctx.fillStyle=g;
  ctx.beginPath(); ctx.arc(x,y,rad,0,7); ctx.fill();
}
// cascada animada: rayas de espuma bajando dentro de un rect
function waterfall(ctx,rect,time){
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x,rect.y,rect.w,rect.h); ctx.clip();
  for(let i=0;i<8;i++){
    const x=rect.x+((i*0.131+0.06)%1)*rect.w;
    const len=26+(i%3)*14;
    const y=rect.y+((time*(200+i*17)+i*97)%(rect.h+len))-len;
    ctx.fillStyle=`rgba(255,255,255,${0.10+(i%3)*0.04})`;
    ctx.fillRect(x,y,3,len);
  }
  // espuma al pie
  for(let i=0;i<5;i++){
    const x=rect.x+((i*0.23+time*0.13)%1)*rect.w;
    const y=rect.y+rect.h-6-Math.abs(Math.sin(time*3+i*2))*8;
    ctx.fillStyle='rgba(255,255,255,0.22)';
    ctx.fillRect(x,y,4,3);
  }
  ctx.restore();
}
// luciérnagas flotando (profundidad/vida)
function makeFireflies(n,W,H){
  const list=[];
  for(let i=0;i<n;i++) list.push({x:Math.random()*W,y:Math.random()*H*0.8,s:Math.random()*6.3,v:8+Math.random()*10});
  return {
    draw(ctx,time){
      list.forEach((f,i)=>{
        const x=f.x+Math.sin(time*0.5+f.s)*22, y=f.y+Math.sin(time*0.33+f.s*2)*16;
        const a=0.25+0.25*Math.sin(time*2.2+f.s);
        ctx.fillStyle=`rgba(190,255,150,${a})`;
        ctx.fillRect(x,y,2,2);
      });
    }
  };
}
// viñeta para profundidad
function vignette(ctx,W,H){
  const g=ctx.createRadialGradient(W/2,H/2,H*0.45,W/2,H/2,H*0.85);
  g.addColorStop(0,'rgba(0,0,0,0)');
  g.addColorStop(1,'rgba(0,0,10,0.34)');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
}
// sombra elíptica bajo personajes/objetos
function shadow(ctx,x,y,w){
  ctx.fillStyle='rgba(10,14,8,0.30)';
  ctx.beginPath(); ctx.ellipse(x,y,w,w*0.32,0,0,7); ctx.fill();
}

// corazón pixel (pickup del battle royale)
const HEART_PX=[[1,0],[2,0],[4,0],[5,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
  [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[1,3],[2,3],[3,3],[4,3],[5,3],
  [2,4],[3,4],[4,4],[3,5]];
function drawHeart(ctx,x,y,s,t){
  const p=1+0.10*Math.sin((t||0)*5+x*0.1);
  ctx.save();
  ctx.translate(x,y);
  // glow
  const g=ctx.createRadialGradient(0,0,2,0,0,14*s);
  g.addColorStop(0,'rgba(255,80,70,.35)'); g.addColorStop(1,'rgba(255,80,70,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,14*s,0,7); ctx.fill();
  ctx.scale(s*p,s*p);
  ctx.fillStyle='#e8281e';
  HEART_PX.forEach(([a,b])=>ctx.fillRect((a-3)*2-1,(b-2.5)*2-1,2.2,2.2));
  ctx.fillStyle='rgba(255,255,255,.85)'; ctx.fillRect(-4,-4,2.2,2.2);
  ctx.restore();
}

window.MAPART={ load, img, torchGlow, waterfall, makeFireflies, vignette, shadow, drawHeart };
})();

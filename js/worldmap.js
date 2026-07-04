/* HEARTS — worldmap: mapa-mundo pixel del lobby (la trayectoria del torneo)
   Concepto tipo mapa de RPG clásico: océano, continente con los 4 biomas y la ruta. */
(function(){
const CW=208, CH=160, PX=4;              // grid de celdas, 4px c/u => 832x640
let drawn=false;

function rng(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }

function draw(canvas){
  if(drawn) return;
  drawn=true;
  canvas.width=CW*PX; canvas.height=CH*PX;
  const ctx=canvas.getContext('2d');
  const r=rng(20260704);

  // ---- anclas de bioma (la trayectoria: selva SW → desierto E → nieve N → volcán centro) ----
  const A={
    selva:  {x:56, y:116, rad:46},
    desierto:{x:154,y:116, rad:42},
    nieve:  {x:154,y:40,  rad:40},
    volcan: {x:56, y:40,  rad:36},
  };
  const anchors=Object.keys(A).map(k=>({id:k,...A[k]}));
  // puentes para conectar el continente + islitas decorativas
  const isles=[
    {x:104,y:78,rad:30},{x:104,y:118,rad:22},{x:104,y:40,rad:22},
    {x:56,y:78,rad:20},{x:154,y:78,rad:20},
    {x:16,y:150,rad:7},{x:196,y:150,rad:7},{x:14,y:14,rad:6},{x:196,y:12,rad:6},
  ];

  // ---- máscara de tierra (metaballs con ruido) ----
  const land=new Array(CW*CH).fill(0);
  const noise=[]; for(let i=0;i<CW*CH;i++) noise.push(r());
  function field(x,y){
    let f=0;
    anchors.forEach(a=>{
      const d=Math.hypot(x-a.x,y-a.y);
      f+=Math.max(0,1-d/a.rad);
    });
    isles.forEach(a=>{
      const d=Math.hypot(x-a.x,y-a.y);
      f+=Math.max(0,1-d/a.rad);
    });
    const nl=noise[((y>>2)*CW+(x>>2))%noise.length]||0; // ruido suave
    return f+nl*0.26;
  }
  const elev=new Array(CW*CH).fill(0);
  for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){
    const f=field(x,y);
    elev[y*CW+x]=f;
    if(f>0.72) land[y*CW+x]=1;
  }
  const isLand=(x,y)=>x>=0&&x<CW&&y>=0&&y<CH&&land[y*CW+x]===1;
  function nearLand(x,y,d){
    for(let j=-d;j<=d;j++)for(let i=-d;i<=d;i++) if(isLand(x+i,y+j)) return true;
    return false;
  }
  function shade(hex,k){ // k>0 aclara, k<0 oscurece
    const n=parseInt(hex.slice(1),16);
    let R=(n>>16)&255,G=(n>>8)&255,B=n&255;
    if(k>0){ R+= (255-R)*k; G+=(255-G)*k; B+=(255-B)*k; }
    else { R*=1+k; G*=1+k; B*=1+k; }
    return 'rgb('+(R|0)+','+(G|0)+','+(B|0)+')';
  }

  // bioma por celda = ancla más cercana (ponderada por radio)
  function biomeOf(x,y){
    let best=null,bd=1e9;
    anchors.forEach(a=>{
      const d=Math.hypot(x-a.x,y-a.y)/a.rad;
      if(d<bd){bd=d;best=a.id;}
    });
    return best;
  }

  const COLS={
    oceano1:'#27406e', oceano2:'#203560', costa:'#e8d9a8', playa2:'#d9c48a',
    selva1:'#3f7d3a', selva2:'#356b31', selva3:'#2c5a28',
    desierto1:'#dcb46a', desierto2:'#cfa051',
    nieve1:'#eef4f8', nieve2:'#d8e6ee',
    volcan1:'#6a5a52', volcan2:'#5a4a44',
  };

  // ---- celdas ----
  for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){
    const px=x*PX, py=y*PX;
    if(!isLand(x,y)){
      // sombra que proyecta el continente sobre el mar (luz desde el NO)
      if(isLand(x-2,y-2)||isLand(x-1,y-2)){
        ctx.fillStyle='#16274a'; ctx.fillRect(px,py,PX,PX); continue;
      }
      // agua somera turquesa alrededor de la costa
      if(nearLand(x,y,2)){
        ctx.fillStyle=(noise[y*CW+x]<0.5)?'#3a5f9e':'#33558f';
        ctx.fillRect(px,py,PX,PX);
        continue;
      }
      const deep=(noise[((y>>3)*CW+(x>>3))%noise.length]<0.5);
      ctx.fillStyle=deep?COLS.oceano2:COLS.oceano1;
      ctx.fillRect(px,py,PX,PX);
      continue;
    }
    // costa (tierra que toca agua)
    const coast=!isLand(x+1,y)||!isLand(x-1,y)||!isLand(x,y+1)||!isLand(x,y-1);
    if(coast){
      ctx.fillStyle=(noise[y*CW+x]<0.5)?COLS.costa:COLS.playa2;
      ctx.fillRect(px,py,PX,PX);
      continue;
    }
    const b=biomeOf(x,y);
    const n=noise[y*CW+x];
    let col;
    if(b==='selva') col=n<0.33?COLS.selva1:(n<0.66?COLS.selva2:COLS.selva3);
    else if(b==='desierto') col=n<0.5?COLS.desierto1:COLS.desierto2;
    else if(b==='nieve') col=n<0.5?COLS.nieve1:COLS.nieve2;
    else col=n<0.5?COLS.volcan1:COLS.volcan2;
    // relieve: tierras altas más claras, laderas SE en sombra
    const ev=elev[y*CW+x];
    let k=0;
    if(ev>1.5) k=0.16; else if(ev>1.2) k=0.08;
    const cliff = !isLand(x+1,y+1)||!isLand(x+1,y)||!isLand(x,y+1);
    if(cliff) k-=0.18;
    const litN = isLand(x,y-1)&&elev[(y-1)*CW+x]<ev-0.06; // cara norte iluminada
    if(litN) k+=0.10;
    ctx.fillStyle=k===0?col:shade(col,k);
    ctx.fillRect(px,py,PX,PX);
  }

  // olas en el mar
  for(let i=0;i<160;i++){
    const x=Math.floor(r()*CW), y=Math.floor(r()*CH);
    if(!isLand(x,y)&&!isLand(x+1,y)){
      ctx.fillStyle='rgba(255,255,255,.35)';
      ctx.fillRect(x*PX,y*PX+1,PX*2,1.5);
    }
  }
  // témpanos cerca de la nieve
  for(let i=0;i<14;i++){
    const x=CW*0.55+r()*(CW*0.43), y=3+r()*14;
    if(!isLand(Math.floor(x),Math.floor(y))){
      ctx.fillStyle='rgba(238,246,250,.9)';
      ctx.beginPath(); ctx.ellipse(x*PX,y*PX,(3+r()*5)*PX*0.6,PX*1.1,0,0,7); ctx.fill();
    }
  }

  // ---- decoración por bioma ----
  function inBiome(id,minR){ // punto aleatorio dentro del bioma
    const a=A[id];
    for(let t=0;t<40;t++){
      const ang=r()*6.28, d=r()*a.rad*(minR||0.75);
      const x=Math.round(a.x+Math.cos(ang)*d), y=Math.round(a.y+Math.sin(ang)*d);
      if(isLand(x,y)&&biomeOf(x,y)===id) return [x*PX,y*PX];
    }
    return null;
  }
  // árboles de selva
  for(let i=0;i<26;i++){
    const p=inBiome('selva'); if(!p) continue;
    const [x,y]=p;
    ctx.fillStyle='rgba(10,20,10,.30)'; ctx.beginPath(); ctx.ellipse(x+3,y+3,6,2.4,0,0,7); ctx.fill();
    ctx.fillStyle='#2c5a28'; ctx.beginPath(); ctx.arc(x,y-4,5,0,7); ctx.fill();
    ctx.fillStyle='#4f9448'; ctx.beginPath(); ctx.arc(x-2,y-6,3.4,0,7); ctx.fill();
    ctx.fillStyle='#5a3a1a'; ctx.fillRect(x-1,y-2,2,5);
  }
  // dunas y cactus
  for(let i=0;i<14;i++){
    const p=inBiome('desierto'); if(!p) continue;
    const [x,y]=p;
    if(i%3===0){ ctx.fillStyle='#3f7d3a'; ctx.fillRect(x,y-6,3,8); ctx.fillRect(x-3,y-4,3,2); ctx.fillRect(x+3,y-3,3,2); }
    else { ctx.strokeStyle='#b8894a'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(x,y,6,Math.PI*1.1,Math.PI*1.9); ctx.stroke(); }
  }
  // montañas nevadas
  for(let i=0;i<9;i++){
    const p=inBiome('nieve'); if(!p) continue;
    const [x,y]=p;
    const w=10+r()*10;
    ctx.fillStyle='rgba(20,30,40,.28)'; ctx.beginPath(); ctx.ellipse(x+4,y+7,w*0.9,3,0,0,7); ctx.fill();
    ctx.fillStyle='#8ea6b4';
    ctx.beginPath(); ctx.moveTo(x-w,y+6); ctx.lineTo(x,y-w); ctx.lineTo(x+w,y+6); ctx.fill();
    ctx.fillStyle='#f6fafc';
    ctx.beginPath(); ctx.moveTo(x-w*0.4,y-w*0.35); ctx.lineTo(x,y-w); ctx.lineTo(x+w*0.4,y-w*0.35); ctx.fill();
  }
  // volcanes con lava
  for(let i=0;i<3;i++){
    const p=inBiome('volcan',0.6); if(!p) continue;
    const [x,y]=p;
    const w=12+r()*8;
    ctx.fillStyle='rgba(20,10,10,.32)'; ctx.beginPath(); ctx.ellipse(x+5,y+9,w*0.95,3.4,0,0,7); ctx.fill();
    ctx.fillStyle='#4a3a34';
    ctx.beginPath(); ctx.moveTo(x-w,y+8); ctx.lineTo(x,y-w*0.9); ctx.lineTo(x+w,y+8); ctx.fill();
    ctx.fillStyle='#ff7a2a'; ctx.fillRect(x-3,y-w*0.9,6,3);
    ctx.strokeStyle='rgba(255,122,42,.8)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x,y-w*0.9+3); ctx.lineTo(x-4,y+2); ctx.stroke();
    // humo
    ctx.fillStyle='rgba(200,190,180,.5)';
    ctx.beginPath(); ctx.arc(x+3,y-w*0.9-6,4,0,7); ctx.arc(x+8,y-w*0.9-11,3,0,7); ctx.fill();
  }
  // grietas de lava en zona volcánica
  for(let i=0;i<5;i++){
    const p=inBiome('volcan'); if(!p) continue;
    const [x,y]=p;
    ctx.strokeStyle='rgba(232,60,30,.7)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+6,y+7); ctx.lineTo(x+3,y+14); ctx.stroke();
  }
  // ríos: de la nieve al mar
  ctx.strokeStyle='#3f6ea8'; ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo((A.nieve.x-10)*PX, (A.nieve.y+12)*PX);
  ctx.quadraticCurveTo(104*PX, 88*PX, (A.selva.x+22)*PX, (A.selva.y-6)*PX);
  ctx.stroke();

  // ---- LA TRAYECTORIA DEL TORNEO ----
  const route=['selva','desierto','nieve','volcan'];
  const pts=route.map(k=>[A[k].x*PX, A[k].y*PX]);
  ctx.setLineDash([8,7]);
  ctx.strokeStyle='rgba(255,220,90,.85)'; ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++){
    const [x0,y0]=pts[i-1], [x1,y1]=pts[i];
    ctx.quadraticCurveTo((x0+x1)/2+(i%2?50:-50),(y0+y1)/2,x1,y1);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // marcadores numerados
  const names={selva:'JUNGLE',desierto:'DESERT',nieve:'NORTH',volcan:'VOLCANIC'};
  pts.forEach(([x,y],i)=>{
    ctx.fillStyle='rgba(10,10,14,.75)';
    ctx.beginPath(); ctx.arc(x,y,13,0,7); ctx.fill();
    ctx.strokeStyle='#ffd34d'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(x,y,13,0,7); ctx.stroke();
    ctx.fillStyle='#ffd34d'; ctx.font='bold 14px "Space Mono"'; ctx.textAlign='center';
    ctx.fillText(String(i+1),x,y+5);
    ctx.font='bold 9px "Space Mono"';
    ctx.strokeStyle='rgba(0,0,0,.8)'; ctx.lineWidth=3;
    ctx.strokeText(names[route[i]],x,y+26); ctx.fillText(names[route[i]],x,y+26);
  });
  // corazón meta en el volcán
  if(window.MAPART) MAPART.drawHeart(ctx,pts[3][0],pts[3][1]-24,1.3,1);

  // nubes con sombra en el suelo (profundidad)
  for(let i=0;i<6;i++){
    const x=r()*CW*PX, y=r()*CH*PX*0.8, w=30+r()*26;
    ctx.fillStyle='rgba(6,10,20,.16)';
    ctx.beginPath(); ctx.ellipse(x+20,y+30,w,9,0,0,7); ctx.ellipse(x+42,y+24,20,8,0,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.16)';
    ctx.beginPath(); ctx.ellipse(x,y,w,9,0,0,7); ctx.ellipse(x+22,y-6,20,8,0,0,7); ctx.fill();
  }
  // oscurecer para que la UI del lobby respire
  ctx.fillStyle='rgba(12,14,20,.34)';
  ctx.fillRect(0,0,CW*PX,CH*PX);
  const vg=ctx.createRadialGradient(CW*PX/2,CH*PX/2,200,CW*PX/2,CH*PX/2,560);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,10,.45)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,CW*PX,CH*PX);
}

window.WORLDMAP={ draw };
})();

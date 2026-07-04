/* HEARTS FALL — arqueros battle royale: mueres y sueltas tus corazones */
(function(){
const W=832,H=640;
const GRAV=1500, RUN=265, JUMP=-565;

// fondos de arena (estilo TowerFall) por ecosistema
const BACKDROPS={};
['selva','desierto','nieve','volcan'].forEach(e=>{ const im=new Image(); im.onload=()=>BACKDROPS[e]=im; im.src='assets/maps/'+e+'.png?v=1'; });

function start(canvas, players, cfg, onEnd, eco){
  const ctx=canvas.getContext('2d');
  const K=window.KIT;
  const M=window.MAPART;
  const layout=THEMES.getFallLayout(eco||'selva',(cfg&&cfg.variant)||0);
  const PLATS=layout.plats;
  const tf=THEMES.makeTFRender(layout.arena||'selva',layout);
  const parts=K.particles();
  const WRAP=!!layout.wrap, WRAPY=!!layout.wrapY;
  function wrapEnt(o){
    if(!WRAP) return;
    if(o.x<-10) o.x+=W+20; else if(o.x>W+10) o.x-=W+20;
    if(WRAPY){ if(o.y>H+24) o.y-=H+48; else if(o.y<-24) o.y+=H+48; }
  }
  const DUR=cfg.duration||60, MIN=cfg.minAlive||2;

  const ents=players.map((p,i)=>{
    const st=p.animal.stats;
    const sp=layout.spawns[i%layout.spawns.length];
    p.koRound=false;
    const wd=(p.weapon&&p.weapon.kind)?p.weapon:DATA.byWeapon['bow_wood'];
    const pw=p.animal.power||'';
    let spd=RUN*(1+(st.vel-5)*0.05);
    if(pw==='dash') spd*=1.32;
    const jit = i>=layout.spawns.length ? (Math.random()-0.5)*80 : 0;  // evita apilar cuando hay muchos
    return { p, x:sp[0]+jit, y:sp[1], vx:0, vy:0, w:pw==='slippery'?24:30, h:42,
      onG:false, jumps:1, face:i%2?-1:1,
      weap:wd, ammo: wd.kind==='bow'? wd.ammo : 0, cd:0, swing:0, drawT:0, kx:0,
      pow:pw, dj:pw==='doublejump', healT:0,
      jumpMul:0.86+(st.vel-3)*0.035, gravMul:0.9+(st.def-3)*0.03,  // ligeros saltan/flotan, pesados caen
      dead:false, shield:pw==='shield', wings:false, boots:false,
      spd, think:Math.random()*0.3, mvx:0, wantJump:false, wantShootDir:null,
      inv:1.2, runPh:Math.random()*6, landT:0, crouch:false, crouchT:0 };
  });
  const espd=e=>(e.pow==='berserk'&&e.p.hp<=1)? e.spd*1.4 : e.spd;
  const MAXA=6;
  const arrows=[], hearts=[], chests=[], floats=[], stuck=[], corpses=[];
  // cuerpo que se cae con la inercia de la flecha, se acuesta y se desvanece
  function addCorpse(e,dir,by){
    let kx = dir ? dir.vx*0.32 : (by? Math.sign(e.x-by.x)*260 : (Math.random()-.5)*200);
    kx=Math.max(-460,Math.min(460,kx));
    corpses.push({a:e.p.animal, x:e.x, y:e.y, vx:kx, vy:-205-Math.random()*70,
      rot:0, spin:(kx>=0?1:-1)*(4+Math.random()*3), face:e.face, t:0.9, land:false});
  }
  function stickArrow(x,y,ang){
    stuck.push({x,y,ang:ang||0});
    if(stuck.length>14) stuck.shift();
  }
  let time=0, over=false, endTimer=0, raf=null, sudden=0, chestT=4;
  function spawnChest(){
    if(chests.length>=2) return;
    const sp=layout.spawns[Math.floor(Math.random()*layout.spawns.length)];
    if(living().some(e=>Math.abs(e.x-sp[0])<80&&Math.abs(e.y-sp[1])<80)) return;
    if(chests.some(ch=>Math.abs(ch.x-sp[0])<40)) return;
    chests.push({x:sp[0],y:sp[1],t:0});
  }
  function say(x,y,txt,col){ floats.push({x,y,txt,col:col||'#ffd34d',t:1.2}); }
  function openChest(ch,e){
    chests.splice(chests.indexOf(ch),1);
    SFX.powerup(); parts.spawn(ch.x,ch.y-10,'#ffd34d',14,200);
    const fx=['corazon','escudo','alas','botas','carcaj'][Math.floor(Math.random()*5)];
    if(fx==='corazon'){ e.p.hp++; hudRefresh(); say(ch.x,ch.y-24,'+1 ♥','#ff8a80'); SFX.coin(); }
    else if(fx==='escudo'){ e.shield=true; say(ch.x,ch.y-24,'ESCUDO','#9ce8ff'); }
    else if(fx==='alas'){ e.wings=true; say(ch.x,ch.y-24,'ALAS','#f2ede2'); }
    else if(fx==='botas'){ e.boots=true; say(ch.x,ch.y-24,'BOTAS DE SALTO','#9dff8a'); }
    else if(e.weap.kind==='bow'){ e.ammo=Math.min(MAXA,e.ammo+2); say(ch.x,ch.y-24,'+2 FLECHAS','#ffd34d'); }
    else { e.p.hp++; hudRefresh(); say(ch.x,ch.y-24,'+1 ♥','#ff8a80'); SFX.coin(); }
  }
  // tormenta: los corazones cobrados llueven como botín
  for(let i=0;i<(cfg.rain||0);i++){
    hearts.push({x:60+(i/(cfg.rain))* (W-120)+Math.random()*30, y:-20-Math.random()*160,
      vx:(Math.random()-.5)*60, vy:40, onG:false, t:Math.random()*6});
  }

  function hudRefresh(){ K.updateHudPlayers(players, p=>!p.koRound); }
  function dropHearts(x,y,n){
    for(let i=0;i<n;i++){
      hearts.push({x:x+(Math.random()-.5)*20, y:y-30,
        vx:(Math.random()-.5)*340, vy:-200-Math.random()*180, onG:false, t:Math.random()*6});
    }
  }
  function kill(e,by,dir){
    if(e.dead||e.inv>0) return;
    if(e.shield){
      e.shield=false; e.inv=1.2;
      parts.spawn(e.x,e.y-e.h/2,'#9ce8ff',18,240);
      say(e.x,e.y-e.h-14,'¡ESCUDO ROTO!','#9ce8ff');
      SFX.hit(); return;
    }
    parts.spawn(e.x,e.y-e.h/2,'#ff5a4d',24,280);
    SFX.ko(); K.shake(10);
    // sueltas tus flechas al piso (recuperables) y pierdes tus poderes
    for(let i=0;i<e.ammo;i++) stickArrow(e.x+(Math.random()-.5)*50, e.y-4, Math.PI/2);
    e.ammo=0; e.wings=false; e.boots=false;
    // sueltas UN corazón como botín y quedas fuera hasta la siguiente ronda
    if(e.p.hp>0){ e.p.hp--; dropHearts(e.x,e.y-8,1); }
    addCorpse(e,dir,by);   // el mono sale volando con la flecha y se acuesta
    e.dead=true; e.p.koRound=true; SFX.die();
    // ROBAVIDAS: quien mata con este poder gana un corazón
    if(by&&by.pow==='lifesteal'&&!by.dead&&by.p.hp<12){
      by.p.hp++; parts.spawn(by.x,by.y-by.h*0.6,'#ff5a4d',12,180);
      say(by.x,by.y-by.h-16,'ROBAVIDAS +1 ♥','#ff5a4d');
    }
    hudRefresh();
  }
  function shoot(e,dx,dy){
    if(e.weap.kind!=='bow') return;
    if(e.ammo<=0||e.cd>0) return;
    e.ammo--; e.cd=e.weap.cd; e.drawT=0.16;
    const sp=e.weap.arrowSpeed||720, n=Math.hypot(dx,dy)||1;
    const ox=e.x+dx/n*22, oy=e.y-e.h*0.55+dy/n*22;
    const spread=(e.pow==='triple')?[-0.2,0,0.2]:[0];   // TRIPLE FLECHA: abanico de 3
    spread.forEach(a=>{
      const cs=Math.cos(a), sn=Math.sin(a);
      const vx=(dx/n)*cs-(dy/n)*sn, vy=(dx/n)*sn+(dy/n)*cs;
      arrows.push({x:ox,y:oy,vx:vx*sp,vy:vy*sp,owner:e,t:3,grace:0.09,tint:e.weap.tint});
    });
    SFX.arrow();
  }
  // espada: golpe cuerpo a cuerpo al frente
  function melee(e){
    if(e.weap.kind!=='sword'||e.cd>0) return;
    e.cd=e.weap.cd; e.swing=0.24; SFX.arrow(); K.shake(4);
    const rng=e.weap.range||60;
    parts.spawn(e.x+e.face*rng*0.6, e.y-e.h*0.55, e.weap.tint, 10, 220);
    living().forEach(o=>{
      if(o===e||o.dead) return;
      const dx=o.x-e.x;
      if(Math.sign(dx)!==e.face && Math.abs(dx)>16) return;
      const d=Math.hypot(dx,(o.y-o.h/2)-(e.y-e.h/2));
      if(d<=rng){ o.kx=e.face*(e.weap.knock||300); o.vy=-160; kill(o,e); }
    });
  }
  const active=()=>ents.filter(e=>!e.dead);
  const living=active;

  const jumpV=e=>JUMP*(e.boots?1.24:1)*(e.jumpMul||1);
  function physics(e,dt){
    e.vy+=GRAV*(e.gravMul||1)*dt;
    if(e.wings&&e.vy>300) e.vy=300; // planeo con alas
    e.vx=e.mvx+(e.kx||0);
    e.kx=(e.kx||0)*Math.pow(0.02,dt);   // el empuje de espada se disipa
    if(Math.abs(e.kx)<8) e.kx=0;
    const oy=e.y;
    e.x+=e.vx*dt; e.y+=e.vy*dt;
    wrapEnt(e);
    e.onG=false;
    PLATS.forEach(pl=>{
      const L=e.x-e.w/2,R=e.x+e.w/2,T=e.y-e.h,B=e.y;
      if(R<pl.x||L>pl.x+pl.w||B<pl.y||T>pl.y+pl.h) return;
      if(pl.solid&&pl.wall){
        const px1=pl.x+pl.w-L, px2=R-pl.x, py1=pl.y+pl.h-T, py2=B-pl.y;
        const m=Math.min(px1,px2,py1,py2);
        if(m===px1)e.x=pl.x+pl.w+e.w/2;
        else if(m===px2)e.x=pl.x-e.w/2;
        else if(m===py1){e.y=pl.y+pl.h+e.h;e.vy=Math.max(0,e.vy);}
        else {e.y=pl.y;e.vy=0;e.onG=true;}
      } else {
        if(e.vy>=0 && oy<=pl.y+2){ e.y=pl.y; e.vy=0; e.onG=true; }
      }
    });
    if(e.onG) e.jumps=(e.wings||e.dj)?2:1;
    if(!WRAPY&&e.y>H+60) kill(e,null);
  }
  function heartPhysics(h,dt){
    h.t+=dt;
    if(!h.onG){
      h.vy+=900*dt;
      h.x+=h.vx*dt; h.y+=h.vy*dt;
      if(h.x<20){h.x=20;h.vx*=-0.5;} if(h.x>W-20){h.x=W-20;h.vx*=-0.5;}
      for(const pl of PLATS){
        if(h.vy>0&&h.x>pl.x&&h.x<pl.x+pl.w&&h.y>pl.y&&h.y<pl.y+pl.h+10){
          h.y=pl.y;
          if(Math.abs(h.vy)>140){ h.vy*=-0.4; h.vx*=0.6; }
          else { h.vy=0; h.onG=true; }
          break;
        }
      }
      if(WRAP){ if(h.x<-8)h.x+=W+16; else if(h.x>W+8)h.x-=W+16; }
      if(h.y>H+20){ if(WRAPY){h.y-=H+40;} else {h.y=30;h.vy=100;h.x=100+Math.random()*(W-200);} }
    }
  }

  function botThink(e){
    const foes=living().filter(o=>o!==e);
    // corazón cercano: prioridad de botín
    let heartT=null,hd=260;
    hearts.forEach(h=>{ const d=Math.abs(h.x-e.x)+Math.abs(h.y-(e.y-20))*0.6; if(d<hd){hd=d;heartT=h;} });
    chests.forEach(ch=>{ const d=Math.abs(ch.x-e.x)+Math.abs(ch.y-(e.y-20))*0.6; if(d<hd+60){hd=d;heartT=ch;} });
    if(e.weap.kind==='bow'&&e.ammo===0){ // sin munición: prioridad total a recuperar flechas
      let sd=1e9,st=null;
      stuck.forEach(sa=>{ const d=Math.abs(sa.x-e.x)+Math.abs(sa.y-(e.y-20))*0.6; if(d<sd){sd=d;st=sa;} });
      if(st){ hd=0; heartT=st; }
    }
    const tg=foes.length?foes.reduce((a,b)=>Math.abs(a.x-e.x)<Math.abs(b.x-e.x)?a:b):null;
    const inc=arrows.find(a=>a.owner!==e&&Math.hypot(a.x-e.x,a.y-(e.y-e.h/2))<130&&Math.sign(a.vx)===Math.sign(e.x-a.x));
    if(inc&&e.onG){
      const r=Math.random();
      if(r<0.45) e.wantJump=true;
      else if(r<0.8) e.crouchT=0.35;
    }
    const scared=e.p.hp<=1; // último corazón: sobrevive y saquea
    if(scared&&tg&&Math.abs(tg.x-e.x)<150&&!heartT){ e.mvx=-Math.sign(tg.x-e.x)*espd(e); e.face=tg.x<e.x?-1:1; return; }
    const goHeart = heartT&&(scared||(e.weap.kind==='bow'&&Math.random()<0.65)||!tg);
    const target = goHeart ? {x:heartT.x,y:heartT.y-10,h:20} : tg;
    if(!target){ e.mvx=0; return; }
    const dx=target.x-e.x, dy=(target.y-(target.h||42)/2)-(e.y-e.h/2);
    if(Math.abs(dx)>40) e.mvx=Math.sign(dx)*espd(e)*0.85;
    else if(Math.random()<0.35) e.mvx=(Math.random()<0.5?-1:1)*espd(e)*0.6;
    else e.mvx=0;
    if(dy<-60&&e.onG&&Math.random()<0.6) e.wantJump=true;
    if(dy<-60&&!e.onG&&e.vy>80&&e.jumps>0&&Math.random()<0.5) e.wantJump=true;
    if(Math.random()<0.08&&e.onG) e.wantJump=true;
    e.face=dx<0?-1:1;
    if(tg&&e.ammo>0&&e.cd<=0&&Math.random()<0.3){
      const fdx=tg.x-e.x, fdy=(tg.y-tg.h/2)-(e.y-e.h/2);
      if(Math.abs(fdy)<38) e.wantShootDir=[Math.sign(fdx)||1,(Math.random()-.5)*0.4];
      else if(Math.abs(fdx)<38) e.wantShootDir=[(Math.random()-.5)*0.4,Math.sign(fdy)||1];
    }
  }

  let last=performance.now();
  function frame(now){
    const dt=Math.max(0,Math.min(0.03,(now-last)/1000)); last=now; time+=dt;
    const me=ents.find(e=>!e.p.bot);

    if(!over){
      if(me&&!me.dead){
        const msp=espd(me);
        me.mvx=0;
        if(K.keys.has('ArrowLeft')||K.keys.has('KeyA')){me.mvx=-msp;me.face=-1;}
        if(K.keys.has('ArrowRight')||K.keys.has('KeyD')){me.mvx=msp;me.face=1;}
        const dn=K.keys.has('ArrowDown')||K.keys.has('KeyS');
        me.crouch = dn && me.onG;
        if(me.crouch) me.mvx*=0.25;
        if(K.tap('Space')||K.tap('KeyZ')||K.tap('KeyK')){
          if(me.onG||me.jumps>0){ if(!me.onG)me.jumps--; me.vy=jumpV(me); SFX.jump(); }
        }
        if(K.tap('KeyX')||K.tap('KeyJ')){
          if(me.weap.kind==='sword') melee(me);
          else {
            const up=K.keys.has('ArrowUp')||K.keys.has('KeyW');
            if(me.crouch) shoot(me, me.face, 0);
            else shoot(me, up||dn?0:me.face, up?-1:dn?1:0);
          }
        }
      }
      ents.forEach(e=>{
        if(e.dead||!e.p.bot) return;
        e.think-=dt;
        if(e.think<=0){ e.think=0.18+Math.random()*0.12; botThink(e); }
        if(e.wantJump){ e.wantJump=false;
          if(e.onG||e.jumps>0){ if(!e.onG)e.jumps--; e.vy=jumpV(e); } }
        if(e.weap.kind==='sword'){
          if(e.cd<=0){
            const foe=living().find(o=>o!==e && Math.sign(o.x-e.x)===e.face && Math.hypot(o.x-e.x,(o.y-o.h/2)-(e.y-e.h/2))<(e.weap.range+8));
            if(foe) melee(e);
          }
        } else if(e.wantShootDir){ shoot(e,e.wantShootDir[0],e.wantShootDir[1]); e.wantShootDir=null; }
      });
      ents.forEach(e=>{
        if(e.dead) return;
        e.inv=Math.max(0,e.inv-dt); e.cd=Math.max(0,e.cd-dt);
        e.swing=Math.max(0,e.swing-dt); e.drawT=Math.max(0,e.drawT-dt);
        e.crouchT=Math.max(0,e.crouchT-dt);
        // REGENERACIÓN: recupera un corazón cada cierto tiempo
        if(e.pow==='heal'){ e.healT+=dt; if(e.healT>=6&&e.p.hp<10){ e.healT=0; e.p.hp++; hudRefresh();
          parts.spawn(e.x,e.y-e.h*0.6,'#9dff8a',8,120); say(e.x,e.y-e.h-14,'+1 ♥','#9dff8a'); } }
        // recuperar flechas clavadas (como en TowerFall)
        for(let i=stuck.length-1;i>=0;i--){
          const sa=stuck[i];
          if(e.ammo<MAXA&&Math.abs(sa.x-e.x)<22&&sa.y>e.y-e.h-10&&sa.y<e.y+12){
            stuck.splice(i,1); e.ammo++; SFX.click();
            parts.spawn(sa.x,sa.y,'#ffd34d',4,80);
          }
        }
        if(e.p.bot) e.crouch=e.crouchT>0&&e.onG;
        if(e.crouch&&e.p.bot) e.mvx*=0.25;
        const wasG=e.onG;
        physics(e,dt);
        e.landT=Math.max(0,e.landT-dt);
        if(e.onG&&!wasG){ e.landT=0.14; parts.spawn(e.x,e.y,'#c9c2b8',5,90); }
        if(e.onG&&Math.abs(e.vx)>30){
          e.runPh+=dt*12;
          if(Math.random()<dt*5) parts.spawn(e.x-e.face*10,e.y-2,'#a89e90',1,45);
        }
        // abrir cofres
        for(let i=chests.length-1;i>=0;i--){
          const ch=chests[i];
          if(Math.abs(ch.x-e.x)<26&&ch.y>e.y-e.h-14&&ch.y<e.y+12){ openChest(ch,e); }
        }
        // recoger corazones
        for(let i=hearts.length-1;i>=0;i--){
          const h=hearts[i];
          if(Math.abs(h.x-e.x)<22&&h.y>e.y-e.h-12&&h.y<e.y+10){
            hearts.splice(i,1); e.p.hp++;
            SFX.coin(); parts.spawn(h.x,h.y,'#ff8a80',8,140);
            hudRefresh();
          }
        }
      });
      // stomps
      ents.forEach(a=>{ if(a.dead)return;
        ents.forEach(b=>{
          if(a===b||b.dead) return;
          const bh=b.crouch?b.h*0.62:b.h;
          if(a.vy>180 && Math.abs(a.x-b.x)<26 && a.y>b.y-bh-6 && a.y<b.y-bh+18){
            kill(b,a); a.vy=JUMP*0.7;
          }
        });
      });
      for(let i=arrows.length-1;i>=0;i--){
        const a=arrows[i];
        a.t-=dt; a.grace-=dt;
        a.vy+=(Math.abs(a.vx)>Math.abs(a.vy)?260:0)*dt;
        a.x+=a.vx*dt; a.y+=a.vy*dt;
        if(WRAP){ if(a.x<-8)a.x+=W+16; else if(a.x>W+8)a.x-=W+16;
          if(WRAPY){ if(a.y>H+8)a.y-=H+16; else if(a.y<-8)a.y+=H+16; } }
        let dead=a.t<=0||(!WRAP&&(a.x<10||a.x>W-10))||(!WRAPY&&a.y<6);
        let stuckNow=false;
        if(!dead) PLATS.forEach(pl=>{ if(a.x>pl.x&&a.x<pl.x+pl.w&&a.y>pl.y&&a.y<pl.y+pl.h){dead=true;stuckNow=true;} });
        if(!dead) for(const e of ents){
          if(e.dead) continue;
          if(e===a.owner&&a.grace>0) continue;
          const eh=e.crouch?e.h*0.62:e.h;
          if(Math.abs(a.x-e.x)<e.w/2+4 && a.y>e.y-eh-4 && a.y<e.y+4){
            if(e.crouch&&e.ammo<MAXA){ // ¡dodge-catch de TowerFall!
              e.ammo++; say(e.x,e.y-e.h-16,'¡ATRAPADA!','#ffd34d');
              SFX.powerup(); parts.spawn(a.x,a.y,'#ffd34d',8,140);
            } else {
              kill(e,a.owner,{vx:a.vx,vy:a.vy});   // se cae con la comba de la flecha
            }
            dead=true; break;
          }
        }
        if(dead){
          if(stuckNow&&a.owner) stickArrow(a.x,a.y,Math.atan2(a.vy,a.vx));
          else parts.spawn(a.x,a.y,'#ffd34d',5,120);
          arrows.splice(i,1);
        }
      }
      hearts.forEach(h=>heartPhysics(h,dt));
      // cuerpos: vuelan con la inercia de la flecha, aterrizan y se acuestan
      for(let i=corpses.length-1;i>=0;i--){ const c=corpses[i]; c.t-=dt;
        if(c.t<=0){ corpses.splice(i,1); continue; }
        if(!c.land){
          c.vy+=GRAV*dt; c.x+=c.vx*dt; c.y+=c.vy*dt; c.vx*=Math.pow(0.06,dt); c.rot+=c.spin*dt;
          if(WRAP){ if(c.x<-12)c.x+=W+24; else if(c.x>W+12)c.x-=W+24; }
          for(const pl of PLATS){ if(c.vy>0&&c.x>pl.x&&c.x<pl.x+pl.w&&c.y>=pl.y-2&&c.y<pl.y+26){ c.y=pl.y; c.land=true; break; } }
          if(c.y>H-6){ c.y=H-6; c.land=true; }
          if(c.land) parts.spawn(c.x,c.y,'#c9c2b8',6,90);
        } else { const tgt=(c.spin>=0?1:-1)*Math.PI/2; c.rot+=(tgt-c.rot)*Math.min(1,dt*12); }
      }
      chestT-=dt; if(chestT<=0){ chestT=9; spawnChest(); }
      // muerte súbita al final del tiempo
      if(time>DUR-15){
        sudden-=dt;
        if(sudden<=0){ sudden=1.6;
          const l=living();
          const tg=l[Math.floor(Math.random()*l.length)];
          if(tg) arrows.push({x:tg.x+(Math.random()-.5)*60,y:24,vx:0,vy:520,owner:null,t:4,grace:0});
        }
      }
      if(time>DUR || active().length<=MIN){ over=true; endTimer=1.1; }
    } else {
      endTimer-=dt;
      if(endTimer<=0){
        // los que quedan barren los corazones sueltos
        const act=active();
        while(hearts.length&&act.length){
          for(const e of act){ if(!hearts.length)break; hearts.pop(); e.p.hp++; }
        }
        hudRefresh();
        cancelAnimationFrame(raf); onEnd(); return;
      }
    }

    parts.update(dt);
    draw();
    raf=requestAnimationFrame(frame);
  }

  function draw(){
    ctx.save(); K.applyShake(ctx);
    const bd=BACKDROPS[eco||'selva'];
    if(bd){   // fondo atmosférico estilo TowerFall (cubre la arena)
      const s=Math.max(W/bd.width,H/bd.height), bw=bd.width*s, bh=bd.height*s;
      ctx.drawImage(bd,(W-bw)/2,(H-bh)/2,bw,bh);
      ctx.fillStyle='rgba(6,8,16,.40)'; ctx.fillRect(0,0,W,H);   // oscurece para que resalten plataformas
    } else {
      tf.bg(ctx,time);
    }
    tf.blocks(ctx,time);
    // cofres del tesoro (estilo TowerFall)
    chests.forEach(ch=>{
      ch.t+=0.016;
      const gl=0.5+0.5*Math.sin(ch.t*3);
      M.shadow(ctx,ch.x,ch.y+2,14);
      ctx.fillStyle='#8a5a1a'; ctx.fillRect(ch.x-13,ch.y-18,26,18);
      ctx.fillStyle='#ffd34d'; ctx.fillRect(ch.x-13,ch.y-18,26,7);
      ctx.fillStyle='#c9952a'; ctx.fillRect(ch.x-13,ch.y-11,26,2);
      ctx.fillStyle='#5a3a10'; ctx.fillRect(ch.x-2,ch.y-12,5,6);
      ctx.fillStyle=`rgba(255,240,150,${0.5*gl})`; ctx.fillRect(ch.x-13,ch.y-18,26,3);
      if(gl>0.85){ ctx.fillStyle='#fff'; ctx.fillRect(ch.x+6,ch.y-22,3,3); }
    });
    // flechas clavadas (recógelas para recargar)
    stuck.forEach(sa=>{
      ctx.save(); ctx.translate(sa.x,sa.y); ctx.rotate(sa.ang);
      ctx.strokeStyle='#c9b890'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(6,0); ctx.stroke();
      ctx.fillStyle='#ffd34d';
      ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(4,-4); ctx.lineTo(4,4); ctx.fill();
      ctx.restore();
      const gl=0.4+0.3*Math.sin(time*4+sa.x);
      ctx.fillStyle=`rgba(255,211,77,${gl*0.4})`;
      ctx.beginPath(); ctx.arc(sa.x,sa.y,8,0,7); ctx.fill();
    });
    // corazones sueltos
    hearts.forEach(h=>M.drawHeart(ctx,h.x,h.y-8,1.1,time+h.t));
    // flechas
    arrows.forEach(a=>{
      const ang=Math.atan2(a.vy,a.vx);
      const col=a.tint||(a.owner?'#ffd34d':'#9ce8ff');
      ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(ang);
      ctx.strokeStyle=a.owner?'#e8d9b0':'#9ce8ff'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(-14,0); ctx.lineTo(8,0); ctx.stroke();
      ctx.fillStyle=col;
      ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(6,-4); ctx.lineTo(6,4); ctx.fill();
      ctx.restore();
    });
    // cuerpos caídos (animación de muerte: vuelan, se acuestan y se desvanecen)
    corpses.forEach(c=>{
      ctx.save(); ctx.globalAlpha=Math.min(1,c.t*2.2);
      if(c.land) M.shadow(ctx,c.x,c.y+2,14);
      ctx.translate(c.x,c.y-18); ctx.rotate(c.rot);
      Sprites.drawAnimal(ctx,c.a,0,18,46,c.face<0,{air:!c.land,vy:c.land?0:180,t:0,spawn:0});
      ctx.restore(); ctx.globalAlpha=1;
    });
    // personajes
    ents.forEach(e=>{
      if(e.dead) return;
      if(e.onG) M.shadow(ctx,e.x,e.y+2,15);
      const recoil=Math.max(0,(e.cd-0.2)/0.12);
      if(e.shield){
        ctx.fillStyle='rgba(156,232,255,.18)';
        ctx.beginPath(); ctx.arc(e.x,e.y-e.h/2,32,0,7); ctx.fill();
        ctx.strokeStyle='rgba(200,244,255,.7)'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(e.x,e.y-e.h/2,32,0,7); ctx.stroke();
      }
      if(e.wings){ // alitas que aletean
        const fl=e.onG?0.2:Math.sin(time*18)*0.55;
        ctx.fillStyle='rgba(242,237,226,.9)';
        ctx.save(); ctx.translate(e.x,e.y-e.h*0.62);
        ctx.save(); ctx.rotate(-0.5-fl);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-17,-7); ctx.lineTo(-13,3); ctx.fill(); ctx.restore();
        ctx.save(); ctx.rotate(0.5+fl); ctx.scale(-1,1);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-17,-7); ctx.lineTo(-13,3); ctx.fill(); ctx.restore();
        ctx.restore();
      }
      if(e.boots&&e.onG){ ctx.fillStyle='rgba(157,255,138,.7)';
        ctx.fillRect(e.x-9,e.y-3,6,3); ctx.fillRect(e.x+3,e.y-3,6,3); }
      Sprites.drawAnimal(ctx,e.p.animal,e.x,e.y,46,e.face<0,
        {moving:e.onG&&Math.abs(e.vx)>30, run:e.runPh, air:!e.onG, vy:e.vy,
         idle:e.onG&&Math.abs(e.vx)<=30, t:time+e.runPh,
         crouch:e.crouch, land:e.landT/0.14, atk:-recoil*0.6,
         spawn:e.inv>0?e.inv/1.5:0});
      // arma equipada en la mano
      if(window.WEAP && WEAP.ready(e.weap.id) && e.inv<0.9){
        const hy=e.y-e.h*0.5-(e.crouch?e.h*0.18:0);
        if(e.weap.kind==='bow'){
          const pull=e.drawT>0?e.drawT/0.16:0;               // retroceso al disparar
          WEAP.draw(ctx,e.weap.id, e.x+e.face*(12-pull*3), hy, 30, e.face<0, 0);
        } else {
          const sw=e.swing>0 ? 1-(e.swing/0.24) : 0;         // 0→1 progreso del tajo
          const rest=-0.5, ang=e.swing>0 ? (-1.3+sw*2.6) : rest;
          WEAP.draw(ctx,e.weap.id, e.x+e.face*(15+sw*6), hy-3, 36, e.face<0, e.face<0?-ang:ang);
        }
      }
      ctx.fillStyle=e.p.color; ctx.font='bold 11px "Space Mono"'; ctx.textAlign='center';
      ctx.strokeStyle='rgba(0,0,0,.6)'; ctx.lineWidth=3;
      const nm='♥'+e.p.hp;   // sin nombre (estorbaba); solo la vida
      ctx.strokeText(nm,e.x,e.y-e.h-12); ctx.fillText(nm,e.x,e.y-e.h-12);
      for(let i=0;i<Math.min(6,e.ammo);i++){ ctx.fillStyle='#ffd34d'; ctx.fillRect(e.x-21+i*8,e.y-e.h-8,5,3); }
    });
    parts.draw(ctx);
    // textos flotantes de los cofres
    for(let i=floats.length-1;i>=0;i--){
      const f=floats[i]; f.t-=0.016; f.y-=0.7;
      if(f.t<=0){ floats.splice(i,1); continue; }
      ctx.globalAlpha=Math.min(1,f.t*2);
      ctx.fillStyle=f.col; ctx.font='bold 12px "Space Mono"'; ctx.textAlign='center';
      ctx.strokeStyle='rgba(0,0,0,.7)'; ctx.lineWidth=3;
      ctx.strokeText(f.txt,f.x,f.y); ctx.fillText(f.txt,f.x,f.y);
      ctx.globalAlpha=1;
    }
    // timer
    ctx.fillStyle='rgba(20,25,35,.75)'; ctx.fillRect(376,4,80,26);
    ctx.fillStyle=time>DUR-15?'#ff8a80':'#e8f2f8';
    ctx.font='bold 14px "Space Mono"'; ctx.textAlign='center';
    ctx.fillText(Math.max(0,Math.ceil(DUR-time))+'s',416,22);
    if(time>DUR-15){ ctx.fillStyle='#ff8a80'; ctx.font='bold 13px "Space Mono"';
      ctx.fillText('¡MUERTE SÚBITA!',W/2,48); }
    const meE=ents.find(e=>!e.p.bot);
    if(meE&&meE.dead&&!over){
      ctx.fillStyle='rgba(10,10,14,.55)'; ctx.fillRect(0,72,W,54);
      ctx.fillStyle='#f2ede2'; ctx.font='900 22px Archivo, sans-serif'; ctx.textAlign='center';
      ctx.fillText('CAÍSTE — REGRESAS LA SIGUIENTE RONDA',W/2,100);
      ctx.fillStyle='#b7b1a4'; ctx.font='bold 11px "Space Mono"';
      ctx.fillText('viendo el final de la ronda · te quedan ♥'+meE.p.hp,W/2,120);
    }
    ctx.restore();
  }

  raf=requestAnimationFrame(frame);
  return { stop(){ cancelAnimationFrame(raf); } };
}

window.TOWERFALL={ start,
  title:'HEARTS FALL',
  mapNames:{selva:'THORNWOOD',desierto:'MIRAGE',nieve:'FROSTFANG KEEP',volcan:'TOWERFORGE'},
  desc:'3 flechas: recupéralas del suelo. Agáchate para ATRAPARLAS. Cofres: alas, botas, escudo (se combinan).',
  controls:'FLECHAS/WASD mover · ESPACIO saltar · X/J disparar (+ARRIBA apunta) · ABAJO agacharte/atrapar flechas' };
})();

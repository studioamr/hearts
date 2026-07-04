/* HEARTS — match: battle royale de corazones (8 jugadores, 4 ecosistemas) + kit compartido */
(function(){
const $=s=>document.querySelector(s);

// ---------- KIT compartido ----------
const keys=new Set(), taps=new Set();
window.addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  if(!keys.has(e.code)) taps.add(e.code);
  keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
let shakeMag=0;
window.KIT={
  keys,
  tap(code){ if(taps.has(code)){ taps.delete(code); return true; } return false; },
  shake(m){ shakeMag=Math.max(shakeMag,m); },
  applyShake(ctx){
    if(shakeMag>0.2){
      ctx.translate((Math.random()-.5)*shakeMag,(Math.random()-.5)*shakeMag);
      shakeMag*=0.88;
    }
  },
  particles(){
    const list=[];
    return {
      spawn(x,y,color,n,spd){
        for(let i=0;i<n;i++){
          const a=Math.random()*Math.PI*2, v=spd*(0.4+Math.random()*0.8);
          list.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-60,t:0.5+Math.random()*0.4,color,s:2+Math.random()*3});
        }
      },
      update(dt){
        for(let i=list.length-1;i>=0;i--){
          const p=list[i]; p.t-=dt;
          if(p.t<=0){ list.splice(i,1); continue; }
          p.vy+=500*dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
        }
      },
      draw(ctx){ list.forEach(p=>{ ctx.globalAlpha=Math.min(1,p.t*2); ctx.fillStyle=p.color; ctx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s); }); ctx.globalAlpha=1; }
    };
  },
  updateHudPlayers(players, isAlive){
    const el=$('#hud-players'); el.innerHTML='';
    const alive=players.filter(p=>isAlive(p)&&!p.elim);
    if(players.length>10){   // battle royale grande: contador de vivos + tú
      const c=document.createElement('div'); c.className='hud-p';
      c.innerHTML=`<span class="dot" style="background:#e8c11e"></span>VIVOS ${alive.length}/${players.length}`;
      el.appendChild(c);
      const me=players.find(p=>!p.bot);
      if(me){ const m=document.createElement('div'); m.className='hud-p'+((isAlive(me)&&!me.elim)?'':' dead');
        m.innerHTML=`<span class="dot" style="background:${me.color}"></span>TÚ <b class="hud-hp">♥${me.hp}</b>`; el.appendChild(m); }
      return;
    }
    players.forEach(p=>{
      const d=document.createElement('div');
      d.className='hud-p'+(isAlive(p)&&!p.elim?'':' dead');
      d.innerHTML=`<span class="dot" style="background:${p.color}"></span>${p.bot?p.name:'TÚ'} <b class="hud-hp">♥${p.hp}</b>`;
      el.appendChild(d);
    });
  }
};

// ---------- MATCH: battle royale de corazones ----------
const COLORS=['#e8c11e','#ff5a4d','#4dd2ff','#9dff8a','#c77dff','#ffa64d','#4dffd2','#ff7dc9'];
const ECOS=[
  {id:'selva',   name:'JUNGLE'},
  {id:'desierto',name:'DESERT'},
  {id:'nieve',   name:'NORTH'},
  {id:'volcan',  name:'VOLCANIC'},
];
let current=null;

function startRanked(){
  if(window.TUT) TUT.onRanked();
  const st=DATA.state();
  const an=DATA.byId[st.selected];
  if(!an){ SFX.deny(); UI.toast('Necesitas un animal. Compra uno en el MARKET.'); return; }
  if(st.hearts<DATA.ECON.FEE){ SFX.deny(); UI.toast('Fee de 3 ♥ — no te alcanza. Reclama el bonus diario en tu wallet.'); return; }
  st.hearts-=DATA.ECON.FEE; st.matches++; DATA.save(); UI.updateHearts();

  const players=[{name:st.name||'TÚ', animal:an, bot:false, color:COLORS[0], weapon:DATA.equipped()}];
  const WPOOL=DATA.WEAPONS;
  DATA.randomBots(DATA.ECON.PLAYERS-1, an.id).forEach((b,i)=>players.push({...b, color:COLORS[(i+1)%COLORS.length], weapon:WPOOL[Math.floor(Math.random()*WPOOL.length)]}));
  players.forEach(p=>{ p.hp=DATA.ECON.FEE; p.elim=false; p.koRound=false; });

  current={ players, round:0 };
  $('#hud-pot').textContent=players.length*DATA.ECON.FEE;
  KIT.updateHudPlayers(players,()=>true);
  $('#results').classList.remove('show');
  $('#scoreboard').classList.remove('show');
  UI.show('#screen-game');
  runRound();
}

const aliveList=()=>current.players.filter(p=>!p.elim);

// asigna lugares a los recién eliminados (peor lugar primero)
function eliminate(list){
  const m=current;
  let place=aliveList().length;
  list.forEach(p=>{ if(!p.elim){ p.elim=true; p.place=place--; } });
}

function runRound(){
  const m=current;
  const eco=ECOS[m.round%4];
  // TORMENTA desde la ronda 5: todos pagan (1♥, 2♥ desde la ronda 9).
  // La mitad se QUEMA (sale de la economía) y la otra mitad llueve como botín.
  let rain=0, tax=0;
  if(m.round>=4){
    tax=m.round>=8?2:1;
    const pay=aliveList();
    let cobrado=0;
    pay.forEach(p=>{ const c=Math.min(tax,p.hp); p.hp-=c; cobrado+=c; });
    rain=Math.floor(cobrado/2);
    eliminate(pay.filter(p=>p.hp<=0));
    const me0=m.players[0];
    if(me0.elim || aliveList().length<=1){ showScoreboard(true); return; }
  }
  const parts=aliveList();
  const cfg={ duration:60, minAlive:1, rain };

  const intro=$('#phase-intro');
  const MODE=window.TOWERFALL;
  const tower=MODE.mapNames[eco.id];
  const ROMAN=['I','II','III'];
  $('#intro-kicker').textContent='RONDA '+(m.round+1)+' · '+eco.name+(tax?' · ⛈ TORMENTA −'+tax+'♥':'');
  $('#intro-desc').textContent='girando el azar de arena...';
  $('#intro-go').textContent='?';
  intro.classList.add('show');
  SFX.phase();
  if(window.MUSIC) MUSIC.battle(m.round);

  // ruleta: elige una de las 3 arenas de la torre (como el TowerFall real)
  const variant=Math.floor(Math.random()*3);
  cfg.variant=variant;
  let spins=10+Math.floor(Math.random()*3), i=Math.floor(Math.random()*3);
  const cv=$('#game-canvas');
  const iv=setInterval(()=>{
    $('#intro-name').textContent=tower+' · ARENA '+ROMAN[i%3]; i++;
    SFX.count();
    spins--;
    if(spins<=0){
      clearInterval(iv);
      $('#intro-name').textContent=tower+' · ARENA '+ROMAN[variant];
      $('#intro-desc').textContent=MODE.desc;
      $('#hud-phase').textContent='RONDA '+(m.round+1)+' · '+eco.name+' · '+tower+' '+ROMAN[variant]+(rain?' ⛈':'');
      $('#game-controls').textContent=MODE.controls;
      SFX.go();
      let n=3;
      $('#intro-go').textContent=n;
      const iv2=setInterval(()=>{
        n--;
        if(n>0){ $('#intro-go').textContent=n; SFX.count(); }
        else{
          clearInterval(iv2);
          $('#intro-go').textContent='GO!'; SFX.go();
          setTimeout(()=>{
            intro.classList.remove('show');
            MODE.start(cv, parts, cfg, onRoundEnd, eco.id);
          },350);
        }
      },800);
    }
  },110);
}

function onRoundEnd(){
  const m=current;
  // sin corazones = eliminado del torneo (battle royale hasta que quede 1)
  const outs=m.players.filter(p=>!p.elim&&p.hp<=0).sort((a,b)=>a.hp-b.hp);
  eliminate(outs);
  const me=m.players[0];
  const alive=aliveList();
  const done = me.elim || alive.length<=1;
  showScoreboard(done);
}

function showScoreboard(final){
  const m=current;
  const nextEco = final?null:ECOS[(m.round+1)%4];
  const alive=aliveList();
  let head = final?'FINAL':nextEco.name;
  if(!final&&alive.length===2) head=nextEco.name+' · ¡DUELO 1v1!';
  else if(!final&&m.round+1>=4) head=nextEco.name+' · ⛈';
  $('#sb-eco').textContent = head;
  const rows=$('#sb-rows'); rows.innerHTML='';
  const ranked=m.players.slice().sort((a,b)=>(b.elim?-1:b.hp)-(a.elim?-1:a.hp));
  let list=ranked;
  if(ranked.length>12){                      // muchos jugadores: top 11 + tú
    const top=ranked.slice(0,11);
    const me=ranked.find(p=>!p.bot);
    if(me&&top.indexOf(me)<0) top.push(me);
    list=top;
  }
  list.forEach(p=>{
    const r=document.createElement('div');
    r.className='sb-row'+(p.elim?' out':'');
    const icons=Math.min(8,p.hp);
    r.innerHTML=`<span class="sb-name">${p.bot?p.name:'★ '+p.name}</span>
      <span class="sb-count">${p.hp}</span>
      <span class="sb-hearts">${'<i class="sb-heart"></i>'.repeat(icons)}${p.hp>8?'<b>+'+(p.hp-8)+'</b>':''}</span>`;
    rows.appendChild(r);
  });
  $('#scoreboard').classList.add('show');
  SFX.phase();
  setTimeout(()=>{
    $('#scoreboard').classList.remove('show');
    if(final) finishMatch();
    else { m.round++; runRound(); }
  },3400);
}

function finishMatch(){
  const m=current, st=DATA.state();
  const me=m.players[0];
  const ranked=m.players.slice().sort((a,b)=>(b.elim?-1:b.hp)-(a.elim?-1:a.hp));
  const alive=aliveList();
  const winner = alive.length? alive.sort((a,b)=>b.hp-a.hp)[0] : ranked[0];
  const win = winner===me;
  const place = win ? 1 : (me.place || Math.max(2, ranked.indexOf(me)+1));

  if(win){ st.hearts+=me.hp; st.wins++; st.heartsWon+=me.hp; }
  const xp={1:80,2:45,3:30,4:20}[place]||12;
  st.xp+=xp; DATA.save(); UI.updateHearts();

  // pantalla WINNER (estilo mockup de André)
  $('#results-title').textContent = win?'WINNER':'ELIMINADO';
  $('#results-place').textContent = win?'':place+'º LUGAR';
  $('#results-name').textContent = (winner.bot?winner.name:winner.name)+'  ·  '+winner.animal.name;
  $('#results-hearts').textContent = win ? ('+'+me.hp+' ♥ ganados') : ('-'+DATA.ECON.FEE+' ♥ (fee)');
  $('#results-cash').textContent = win?('≈ +$'+(me.hp*DATA.ECON.MXN_PER_HEART)+' MXN (demo)'):'';
  $('#results-xp').textContent='+'+xp+' XP · LVL '+DATA.level();
  const cvs=$('#results-sprite'), c=cvs.getContext('2d');
  c.clearRect(0,0,cvs.width,cvs.height);
  const sp=Sprites.spriteCanvas(winner.animal);
  c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
  const k=Math.min(150/sp.height,130/sp.width);
  c.drawImage(sp,(cvs.width-sp.width*k)/2,(cvs.height-sp.height*k)/2,sp.width*k,sp.height*k);
  $('#results').classList.add('show');
  if(window.MUSIC){ if(win) MUSIC.winner(); else MUSIC.lobby(); }
  if(win){ SFX.win(); UI.popHeart(); } else SFX.lose();
}

function init(){
  $('#btn-ranked').addEventListener('click',()=>{ SFX.click(); startRanked(); });
  $('#btn-results-lobby').addEventListener('click',()=>{ SFX.click(); $('#results').classList.remove('show'); UI.enterLobby(); });
}

window.MATCH={ init, startRanked };
})();

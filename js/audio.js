/* HEARTS — audio: SFX retro profesionales + música chiptune épica
   Sonidos: Juhani Junkala (CC0) — opengameart.org */
(function(){
let ctx=null;
let muted = localStorage.getItem('hearts-mute')==='1';
function ac(){ if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)(); if(ctx.state==='suspended') ctx.resume(); return ctx; }

// ---------- SFX (buffers) ----------
const FILES=['click','buy','coin','deny','jump','arrow','hit','ko','die','boom','bomb',
             'powerup','phase','count','go','win','lose'];
const bufs={};
function loadSfx(){
  FILES.forEach(n=>{
    fetch('assets/audio/'+n+'.wav?v=1')
      .then(r=>r.arrayBuffer())
      .then(b=>ac().decodeAudioData(b))
      .then(d=>{ bufs[n]=d; })
      .catch(()=>{});
  });
}
let loaded=false;
function play(name,vol,rate){
  if(muted) return;
  try{
    const a=ac();
    if(!loaded){ loaded=true; loadSfx(); }
    const b=bufs[name];
    if(!b) return;
    const s=a.createBufferSource(); s.buffer=b;
    s.playbackRate.value=(rate||1)*(0.96+Math.random()*0.08);
    const g=a.createGain(); g.gain.value=vol||0.5;
    s.connect(g).connect(a.destination);
    s.start();
  }catch(e){}
}

window.SFX={
  click(){ play('click',0.45); },
  buy(){ play('buy',0.55); },
  coin(){ play('coin',0.5,1.05); },
  deny(){ play('deny',0.5); },
  bomb(){ play('bomb',0.45); },
  boom(){ play('boom',0.5); },
  arrow(){ play('arrow',0.4,1.1); },
  jump(){ play('jump',0.32,1.05); },
  hit(){ play('hit',0.5); },
  ko(){ play('ko',0.55); },
  die(){ play('die',0.5); },
  phase(){ play('phase',0.4); },
  win(){ play('win',0.6); },
  lose(){ play('lose',0.55); },
  count(){ play('count',0.45); },
  go(){ play('go',0.5); },
  powerup(){ play('powerup',0.5); },
  thump(){ play('hit',0.28,0.45); },
  mute(m){ muted=m; },
};

// ---------- MÚSICA (épica de fondo, con fade) ----------
const TRACKS={
  lobby:'m_lobby.m4a',
  battle:['m_battle1.m4a','m_battle2.m4a','m_battle3.m4a'],
  win:'m_win.m4a',
};
let el=null, current=null, fadeIv=null;
const VOL=0.32;
function crossTo(src,loop){
  if(muted){ current=src; return; }
  if(current===src&&el&&!el.paused) return;
  current=src;
  clearInterval(fadeIv);
  const old=el;
  if(old){ // fade out del anterior
    fadeIv=setInterval(()=>{
      old.volume=Math.max(0,old.volume-0.06);
      if(old.volume<=0.01){ old.pause(); clearInterval(fadeIv); }
    },50);
  }
  el=new Audio('assets/audio/'+src+'?v=1');
  el.loop=loop!==false;
  el.volume=0;
  el.play().catch(()=>{});
  const nu=el;
  const up=setInterval(()=>{
    nu.volume=Math.min(VOL,nu.volume+0.05);
    if(nu.volume>=VOL) clearInterval(up);
  },60);
}
window.MUSIC={
  lobby(){ crossTo(TRACKS.lobby,true); },
  battle(round){ crossTo(TRACKS.battle[(round||0)%TRACKS.battle.length],true); },
  winner(){ crossTo(TRACKS.win,false); },
  stop(){ if(el){el.pause(); el=null; current=null;} },
  isMuted(){ return muted; },
  toggleMute(){
    muted=!muted;
    localStorage.setItem('hearts-mute',muted?'1':'0');
    window.SFX.mute(muted);
    if(muted){ if(el) el.pause(); }
    else if(current){ const c=current; current=null; crossTo(c,true); }
    return muted;
  },
};
window.SFX.mute(muted);
})();

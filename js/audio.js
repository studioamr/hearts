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

// ---------- MÚSICA ÉPICA SINTETIZADA (orquesta oscura estilo Elden Ring) ----------
// Coro ominoso + cuerdas + timbales + ostinato grave en RE menor, con reverb de sala.
const VOL=0.30;
const N=m=>440*Math.pow(2,(m-69)/12);            // MIDI → Hz
const BPM=76, BEAT=60/BPM, STEP=BEAT/2;          // corcheas
let master=null, mScheduler=null, mMode='lobby', nextT=0, step=0, mIntensity=1;
// progresión LARGA en Re menor (16 compases: A A' B A'') — evita la repetición corta.
// cada entrada: raíz, quinta, acorde, notas del coro
const CH={
  Dm:{root:N(38),fifth:N(45),chord:[N(50),N(53),N(57)],top:[N(57),N(62)]},
  Bb:{root:N(34),fifth:N(41),chord:[N(46),N(50),N(53)],top:[N(53),N(58)]},
  F :{root:N(41),fifth:N(48),chord:[N(53),N(57),N(60)],top:[N(60),N(65)]},
  A :{root:N(33),fifth:N(40),chord:[N(45),N(49),N(52)],top:[N(52),N(57)]},   // V (tensión)
  Gm:{root:N(43),fifth:N(50),chord:[N(55),N(58),N(62)],top:[N(62),N(67)]},   // iv
  C :{root:N(36),fifth:N(43),chord:[N(48),N(52),N(55)],top:[N(55),N(60)]},   // VII
  Am:{root:N(45),fifth:N(52),chord:[N(57),N(60),N(64)],top:[N(64),N(69)]},   // v
};
const PROG=[ CH.Dm,CH.Bb,CH.F,CH.A,  CH.Dm,CH.Gm,CH.C,CH.A,   // A · A'
             CH.Gm,CH.C,CH.F,CH.Dm,   CH.Bb,CH.Gm,CH.A,CH.A ]; // B · A'' (16 compases)
// melodía doliente sobre 128 pasos (16 compases × 8 corcheas) — dos secciones que respiran
const MELODY=[
  // A (compases 1-4)
  {s:0,m:69,d:8},{s:8,m:65,d:4},{s:12,m:67,d:4},{s:16,m:69,d:5},{s:21,m:72,d:3},{s:24,m:69,d:4},{s:28,m:68,d:4},
  // A' (5-8) — variación un poco más alta
  {s:32,m:74,d:8},{s:40,m:70,d:4},{s:44,m:69,d:4},{s:48,m:67,d:4},{s:52,m:65,d:4},{s:56,m:64,d:4},{s:60,m:65,d:4},
  // B (9-12) — puente que sube
  {s:64,m:67,d:4},{s:68,m:70,d:4},{s:72,m:72,d:6},{s:78,m:70,d:2},{s:80,m:69,d:4},{s:84,m:72,d:4},{s:88,m:74,d:8},
  // A'' (13-16) — resolución
  {s:96,m:70,d:4},{s:100,m:69,d:4},{s:104,m:67,d:4},{s:108,m:65,d:4},{s:112,m:69,d:6},{s:118,m:68,d:2},{s:120,m:69,d:8} ];
const LOOP=PROG.length*8;   // pasos totales del ciclo (128)

function setupBus(a){
  if(master) return;
  master=a.createGain(); master.gain.value=0;
  const rev=a.createConvolver();
  const len=(a.sampleRate*2.6)|0, ib=a.createBuffer(2,len,a.sampleRate);
  for(let ch=0;ch<2;ch++){ const d=ib.getChannelData(ch); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.4); }
  rev.buffer=ib;
  const rg=a.createGain(); rg.gain.value=0.55; const dg=a.createGain(); dg.gain.value=0.85;
  master.connect(dg).connect(a.destination);
  master.connect(rev).connect(rg).connect(a.destination);
}
function pad(a,freqs,t,dur,g){ freqs.forEach(f=>{ [-6,0,6].forEach(det=>{
  const o=a.createOscillator(); o.type='sawtooth'; o.frequency.value=f; o.detune.value=det;
  const lp=a.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=0.7;
  lp.frequency.setValueAtTime(480,t); lp.frequency.linearRampToValueAtTime(1600,t+dur*0.5); lp.frequency.linearRampToValueAtTime(560,t+dur);
  const ge=a.createGain(); ge.gain.setValueAtTime(0,t); ge.gain.linearRampToValueAtTime(g/3.2,t+0.6); ge.gain.setValueAtTime(g/3.2,t+dur-0.5); ge.gain.linearRampToValueAtTime(0,t+dur);
  o.connect(lp).connect(ge).connect(master); o.start(t); o.stop(t+dur+0.05);
}); }); }
function choir(a,f,t,dur,g){
  const o=a.createOscillator(); o.type='sawtooth'; o.frequency.value=f;
  const vib=a.createOscillator(); vib.frequency.value=5.2; const vg=a.createGain(); vg.gain.value=f*0.011; vib.connect(vg).connect(o.frequency); vib.start(t); vib.stop(t+dur+0.05);
  const f1=a.createBiquadFilter(); f1.type='bandpass'; f1.frequency.value=850; f1.Q.value=6;
  const f2=a.createBiquadFilter(); f2.type='bandpass'; f2.frequency.value=1250; f2.Q.value=9;
  const mix=a.createGain();
  const ge=a.createGain(); ge.gain.setValueAtTime(0,t); ge.gain.linearRampToValueAtTime(g,t+0.9); ge.gain.setValueAtTime(g,t+dur-0.7); ge.gain.linearRampToValueAtTime(0,t+dur);
  o.connect(f1).connect(mix); o.connect(f2).connect(mix); mix.connect(ge).connect(master);
  o.start(t); o.stop(t+dur+0.05);
}
function bass(a,f,t,dur,g){
  const o=a.createOscillator(); o.type='sawtooth'; o.frequency.value=f;
  const o2=a.createOscillator(); o2.type='square'; o2.frequency.value=f/2;
  const lp=a.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=380;
  const ge=a.createGain(); ge.gain.setValueAtTime(0,t); ge.gain.linearRampToValueAtTime(g,t+0.02); ge.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(lp); o2.connect(lp); lp.connect(ge).connect(master);
  o.start(t); o.stop(t+dur+0.02); o2.start(t); o2.stop(t+dur+0.02);
}
function timp(a,f,t,g){
  const o=a.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(f,t); o.frequency.exponentialRampToValueAtTime(f*0.5,t+0.18);
  const ge=a.createGain(); ge.gain.setValueAtTime(g,t); ge.gain.exponentialRampToValueAtTime(0.0001,t+0.5);
  o.connect(ge).connect(master); o.start(t); o.stop(t+0.55);
  const L=(a.sampleRate*0.18)|0, nb=a.createBuffer(1,L,a.sampleRate), nd=nb.getChannelData(0);
  for(let i=0;i<L;i++) nd[i]=(Math.random()*2-1)*Math.pow(1-i/L,3);
  const ns=a.createBufferSource(); ns.buffer=nb; const nl=a.createBiquadFilter(); nl.type='lowpass'; nl.frequency.value=220;
  const ng=a.createGain(); ng.gain.value=g*0.55; ns.connect(nl).connect(ng).connect(master); ns.start(t);
}
function lead(a,f,t,dur,g){
  const o=a.createOscillator(); o.type='sawtooth'; o.frequency.value=f;
  const vib=a.createOscillator(); vib.frequency.value=5.6; const vg=a.createGain(); vg.gain.value=f*0.008; vib.connect(vg).connect(o.frequency); vib.start(t); vib.stop(t+dur+0.05);
  const lp=a.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2300; lp.Q.value=1.1;
  const ge=a.createGain(); ge.gain.setValueAtTime(0,t); ge.gain.linearRampToValueAtTime(g,t+0.05); ge.gain.setValueAtTime(g,t+dur*0.7); ge.gain.linearRampToValueAtTime(0,t+dur);
  o.connect(lp).connect(ge).connect(master); o.start(t); o.stop(t+dur+0.05);
}
function schedule(a){
  while(nextT < a.currentTime+0.22){
    const s=step%LOOP, bar=(s>>3), e=s&7, P=PROG[bar];
    if(e===0){ pad(a,P.chord,nextT,BEAT*4,0.5*mIntensity);
      P.top.forEach((f,i)=>choir(a,f,nextT,BEAT*4,(mMode==='lobby'?0.10:0.085)*(1-i*0.25)));
      timp(a,P.root,nextT,0.55*mIntensity); }
    if(e===4 && mMode!=='lobby') timp(a,P.root,nextT,0.42*mIntensity);
    if(mMode!=='lobby'){                         // ostinato grave que empuja (batalla/victoria)
      bass(a, e%4===2?P.fifth:(e%2?P.root*2:P.root), nextT, STEP*0.92, 0.22*mIntensity);
      MELODY.forEach(mn=>{ if(mn.s===s) lead(a,N(mn.m),nextT,STEP*mn.d,0.13*mIntensity); });
    } else if(e===0||e===4){ bass(a,P.root,nextT,BEAT*1.4,0.11); }   // lobby: raíz suave
    step++; nextT+=STEP;
  }
}
function startMusic(mode){
  if(muted) return;
  const a=ac(); setupBus(a); mMode=mode;
  mIntensity = mode==='winner'?1.25 : mode==='battle'?1.0 : 0.8;
  if(!mScheduler){ nextT=a.currentTime+0.12; step=0; mScheduler=setInterval(()=>{ try{ if(!muted) schedule(ac()); }catch(e){} },28); }
  master.gain.cancelScheduledValues(a.currentTime);
  master.gain.setTargetAtTime(mode==='lobby'?VOL*0.85:VOL, a.currentTime, 0.7);
}
window.MUSIC={
  lobby(){ startMusic('lobby'); },
  battle(round){ startMusic('battle'); mIntensity=1+((round||0)%3)*0.07; },
  winner(){ startMusic('winner'); },
  stop(){ if(master) master.gain.setTargetAtTime(0,ac().currentTime,0.3); },
  isMuted(){ return muted; },
  toggleMute(){
    muted=!muted; localStorage.setItem('hearts-mute',muted?'1':'0'); window.SFX.mute(muted);
    if(muted){ if(master) master.gain.setTargetAtTime(0,ac().currentTime,0.2); }
    else startMusic(mMode);
    return muted;
  },
};
window.SFX.mute(muted);
window.__music={ get state(){ return ctx&&ctx.state; }, get t(){ return ctx?ctx.currentTime:0; }, get step(){ return step; } };
})();

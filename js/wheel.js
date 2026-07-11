// ============================================================
// 🎡 RULETA estilo PREGUNTADOS (Trivia Crack) — decide el MODO y el
// MAPA de cada ronda de ¡Batalla!. Gajos de color con el ícono en un
// círculo blanco al centro de cada rebanada, puntero arriba, giro con
// desaceleración larga y suave que cae con el ganador DERECHO arriba.
// ============================================================
(function(){
const $=s=>document.querySelector(s);
const tick=()=>{ if(window.SFX){ if(SFX.tick) SFX.tick(); else if(SFX.count) SFX.count(); } };

// spin(title, items, winIdx, opts) → Promise. items: {icon,label,color,used}
function spin(title, items, winIdx, opts={}){
  return new Promise(res=>{
    const back=$('#wheel-back'), box=$('#wheel-box'), wheel=$('#wheel'), rs=$('#wheel-result');
    $('#wheel-title').textContent=title;
    $('#wheel-sub').textContent=opts.sub||'';
    rs.textContent=''; rs.classList.remove('pop');
    const n=items.length, seg=360/n;
    // PIE de colores — el gajo 0 queda centrado ARRIBA (bajo el puntero) gracias a 'from -seg/2'
    const stops=items.map((it,i)=>(it.used?'#33445e':it.color)+' '+(i*seg)+'deg '+((i+1)*seg)+'deg').join(', ');
    wheel.style.transition='none';
    wheel.style.transform='rotate(0deg)';
    wheel.style.background='conic-gradient(from '+(-seg/2)+'deg, '+stops+')';
    // líneas divisorias entre gajos (blancas, como Preguntados)
    let seps=''; for(let i=0;i<n;i++) seps+='<i class="wsep" style="transform:rotate('+(i*seg - seg/2)+'deg)"></i>';
    // BADGES: ícono en círculo blanco al centro de cada gajo (radial → el ganador queda derecho arriba)
    const badgeR = n>7?104:n>5?100:96;
    const badgeSz= n>7?42:n>5?48:58;
    const iconSz = n>7?19:n>5?22:27;
    const badges=items.map((it,i)=>{
      const a=i*seg;
      return '<div class="wl'+(it.used?' used':'')+'" data-i="'+i+'" style="transform:rotate('+a+'deg) translateY(-'+badgeR+'px)">'
        +'<div class="wl-badge" style="width:'+badgeSz+'px;height:'+badgeSz+'px;font-size:'+iconSz+'px">'
        +'<span class="wl-ico">'+it.icon+'</span>'+(it.used?'<span class="wl-x">✕</span>':'')+'</div>'
        +'</div>';
    }).join('');
    wheel.innerHTML=seps+badges+'<div class="wheel-hub"><span>♥</span></div>';
    // foquitos del borde
    let lights=''; const NL=24; for(let i=0;i<NL;i++) lights+='<i class="wlight'+(i%2?' odd':'')+'" style="transform:rotate('+(i*(360/NL))+'deg) translateY(-172px)"></i>';
    $('#wheel-lights').innerHTML=lights;
    box.classList.add('spinning'); box.classList.remove('landed');
    back.classList.add('show');

    // GIRO: 6 vueltas y cae con el gajo ganador ARRIBA (jitter chico para que quede casi derecho)
    const jitter=(Math.random()-0.5)*seg*0.34;
    const turns=6;
    const target=turns*360 - (winIdx*seg) + jitter;
    const DUR=4.4;   // desaceleración LARGA y suave = sensación de ruleta real
    setTimeout(()=>{ wheel.style.transition='transform '+DUR+'s cubic-bezier(.09,.62,.05,1)';
      wheel.style.transform='rotate('+target+'deg)'; },50);

    // tics que se ESPACIAN conforme frena (acompaña la desaceleración)
    let t=60, gap=42; const end=DUR*1000-220;
    while(t<end){ const tt=t; setTimeout(tick,tt); gap*=1.135; t+=gap; }

    setTimeout(()=>{
      box.classList.remove('spinning'); box.classList.add('landed');
      const wl=wheel.querySelector('.wl[data-i="'+winIdx+'"]'); if(wl) wl.classList.add('win');
      rs.textContent=items[winIdx].icon+'  ¡'+items[winIdx].label+'!';
      void rs.offsetWidth; rs.classList.add('pop');
      confettiBurst(box);
      if(window.SFX&&SFX.win) SFX.win();
      setTimeout(()=>{ back.classList.remove('show'); res(); },1050);
    }, DUR*1000+70);
  });
}

// ráfaga de confeti al caer (piezas DOM, se limpian solas)
function confettiBurst(box){
  const colors=['#ffd34d','#ff5a4d','#4dd2ff','#9dff8a','#c77dff','#ff8ac2'];
  for(let i=0;i<30;i++){
    const c=document.createElement('i'); c.className='wconf';
    c.style.background=colors[i%colors.length];
    c.style.left=(50+(Math.random()-0.5)*36)+'%';
    c.style.setProperty('--dx',((Math.random()-0.5)*300)+'px');
    c.style.setProperty('--rot',(Math.random()*720-360)+'deg');
    c.style.animationDelay=(Math.random()*0.18)+'s';
    box.appendChild(c);
    setTimeout(()=>c.remove(),1500);
  }
}
window.WHEEL={ spin };
})();

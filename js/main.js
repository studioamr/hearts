/* HEARTS — arranque */
(function(){
DATA.load();

// 🛟 RED DE SEGURIDAD: el #screen-intro es un rectángulo NEGRO a pantalla completa que solo
// se oculta cuando llegamos a login/lobby. Si CUALQUIER cosa revienta durante el arranque,
// no queremos dejar al jugador atorado en negro sin mensaje → lo sacamos del intro.
function unblackBoot(msg){
  const intro=document.querySelector('#screen-intro');
  if(intro && intro.classList.contains('active')){
    try{ UI.show('#screen-login'); }catch(e){ intro.classList.remove('active'); }
  }
  if(msg){ try{ UI.toast(msg); }catch(e){} }
}
window.addEventListener('error', ()=>unblackBoot());
window.addEventListener('unhandledrejection', ()=>unblackBoot());

function boot(){
  UI.renderRosters();
  UI.initLogin();
  UI.initMarket();
  UI.initWallet();
  UI.initBoard();
  UI.initMute();
  UI.initHelp();
  UI.initChests();
  UI.initParty();
  UI.initTouch();
  UI.initMenu();
  MATCH.init();
  // ENTRADA: si ya tienes SESIÓN, directo a tu cuenta (progreso guardado);
  // si no, la pantalla de LOG IN (roja/azul) — crea tu cuenta o entra.
  if(DATA.session()){ UI.enterLobby(); }
  else UI.show('#screen-login');
}
Promise.all([Sprites.load(DATA.ANIMALS), MAPART.load(), WEAP.load()])
  .then(()=>{ try{ boot(); }catch(e){ console.error('boot',e); try{ UI.show('#screen-login'); }catch(_){ unblackBoot('Hubo un error — recarga la página'); } } })
  .catch(e=>{ console.error('assets',e); try{ boot(); }catch(_){ unblackBoot('Hubo un error al cargar — recarga la página'); } });   // aun si falla el arte, entrar (no quedar en negro)
})();

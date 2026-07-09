/* HEARTS — arranque */
(function(){
DATA.load();
Promise.all([Sprites.load(DATA.ANIMALS), MAPART.load(), WEAP.load()]).then(()=>{
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
  // ENTRADA estilo CLASH ROYALE: directo al juego, sin login que estorbe.
  // Nombre por defecto (se cambia tocando tu placa); si vienes de la landing ya trae el tuyo.
  const st=DATA.state();
  if(!st.name){ st.name='JUGADOR'; DATA.save(); }
  UI.enterLobby();
});
})();

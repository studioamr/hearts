/* HEARTS — datos: roster (los 28 stickers), economía, estado persistente */
(function(){

const ANIMALS = [
  // ---- DEPREDADORES (rojo) ----
  {id:'shark',    name:'TIBURÓN',     side:'pred', price:45, stats:{vel:6,pow:9,def:6}},
  {id:'orca',     name:'ORCA',        side:'pred', price:60, stats:{vel:7,pow:9,def:7}},
  {id:'croc',     name:'COCODRILO',   side:'pred', price:40, stats:{vel:4,pow:8,def:9}},
  {id:'vulture',  name:'BUITRE',      side:'pred', price:28, stats:{vel:7,pow:5,def:4}},
  {id:'lion',     name:'LEÓN',        side:'pred', price:55, stats:{vel:6,pow:8,def:7}},
  {id:'tiger',    name:'TIGRE',       side:'pred', price:50, stats:{vel:8,pow:8,def:5}},
  {id:'wolf',     name:'LOBO',        side:'pred', price:35, stats:{vel:8,pow:7,def:5}},
  {id:'hippo',    name:'HIPOPÓTAMO',  side:'pred', price:44, stats:{vel:3,pow:9,def:9}},
  {id:'bear',     name:'OSO',         side:'pred', price:38, stats:{vel:4,pow:9,def:8}},
  {id:'darkpanda',name:'PANDA NEGRO', side:'pred', price:48, stats:{vel:5,pow:8,def:8}},
  {id:'eagle',    name:'ÁGUILA',      side:'pred', price:42, stats:{vel:9,pow:7,def:4}},
  {id:'otter',    name:'NUTRIA',      side:'pred', price:30, stats:{vel:8,pow:5,def:4}},
  {id:'snake',    name:'SERPIENTE',   side:'pred', price:36, stats:{vel:7,pow:7,def:3}},
  {id:'leopard',  name:'LEOPARDO',    side:'pred', price:58, stats:{vel:9,pow:8,def:5}},
  // ---- PRESAS (azul) ----
  {id:'penguin',  name:'PINGÜINO',    side:'prey', price:15, stats:{vel:5,pow:4,def:6}},
  {id:'seal',     name:'FOCA',        side:'prey', price:16, stats:{vel:4,pow:5,def:7}},
  {id:'toucan',   name:'TUCÁN',       side:'prey', price:22, stats:{vel:7,pow:5,def:4}},
  {id:'chameleon',name:'CAMALEÓN',    side:'prey', price:24, stats:{vel:6,pow:5,def:5}},
  {id:'monkey',   name:'CHANGO',      side:'prey', price:20, stats:{vel:8,pow:5,def:4}},
  {id:'dog',      name:'PERRO',       side:'prey', price:26, stats:{vel:7,pow:6,def:5}},
  {id:'pigeon',   name:'PALOMA',      side:'prey', price:14, stats:{vel:8,pow:3,def:3}},
  {id:'cat',      name:'GATO',        side:'prey', price:28, stats:{vel:8,pow:6,def:4}},
  {id:'mouse',    name:'RATÓN',       side:'prey', price:10, stats:{vel:9,pow:3,def:3}},
  {id:'panda',    name:'PANDA',       side:'prey', price:30, stats:{vel:3,pow:7,def:9}},
  {id:'giraffe',  name:'JIRAFA',      side:'prey', price:18, stats:{vel:6,pow:5,def:5}},
  {id:'elephant', name:'ELEFANTE',    side:'prey', price:32, stats:{vel:3,pow:8,def:9}},
  {id:'platypus', name:'ORNITORRINCO',side:'prey', price:25, stats:{vel:5,pow:5,def:6}},
  {id:'goose',    name:'GANSO',       side:'prey', price:12, stats:{vel:6,pow:4,def:4}},
];

const byId = {}; ANIMALS.forEach(a=>byId[a.id]=a);

// ---- RAREZA + PODER de cada animal (gacha estilo crypto) ----
const RARITY = {
  common:   {key:'common',   name:'COMÚN',      color:'#b8b2a6', rank:0},
  rare:     {key:'rare',     name:'RARO',       color:'#4dd2ff', rank:1},
  epic:     {key:'epic',     name:'ÉPICO',      color:'#c77dff', rank:2},
  legendary:{key:'legendary',name:'LEGENDARIO', color:'#ffd34d', rank:3},
};
// poderes: se activan en el gameplay
const POWERS = {
  lifesteal:  {name:'ROBAVIDAS',    blurb:'Cada kill te da +1 ♥', color:'#ff5a4d'},
  berserk:    {name:'FURIA',        blurb:'Más rápido con 1 ♥ (última vida)', color:'#ff7a3c'},
  triple:     {name:'TRIPLE FLECHA',blurb:'El arco dispara 3 flechas', color:'#ffd34d'},
  shield:     {name:'CAPARAZÓN',    blurb:'Empiezas cada ronda con escudo', color:'#9ce8ff'},
  heal:       {name:'REGENERACIÓN', blurb:'Recuperas ♥ con el tiempo', color:'#9dff8a'},
  dash:       {name:'VELOCIDAD',    blurb:'Corres mucho más rápido', color:'#4dd2ff'},
  slippery:   {name:'ESCURRIDIZO',  blurb:'Más chico: difícil de golpear', color:'#c9c2b8'},
  doublejump: {name:'DOBLE SALTO',  blurb:'Saltas dos veces siempre', color:'#f2ede2'},
};
// asignación por animal (rareza, poder)
const META = {
  orca:{rarity:'legendary',power:'lifesteal'}, lion:{rarity:'legendary',power:'lifesteal'}, eagle:{rarity:'legendary',power:'triple'},
  shark:{rarity:'epic',power:'lifesteal'}, tiger:{rarity:'epic',power:'dash'}, bear:{rarity:'epic',power:'heal'},
  darkpanda:{rarity:'epic',power:'shield'}, leopard:{rarity:'epic',power:'dash'},
  croc:{rarity:'rare',power:'berserk'}, vulture:{rarity:'rare',power:'triple'}, wolf:{rarity:'rare',power:'berserk'},
  hippo:{rarity:'rare',power:'shield'}, snake:{rarity:'rare',power:'slippery'}, chameleon:{rarity:'rare',power:'slippery'},
  cat:{rarity:'rare',power:'dash'}, panda:{rarity:'rare',power:'heal'}, elephant:{rarity:'rare',power:'shield'},
  otter:{rarity:'common',power:'dash'}, penguin:{rarity:'common',power:'shield'}, seal:{rarity:'common',power:'heal'},
  toucan:{rarity:'common',power:'doublejump'}, monkey:{rarity:'common',power:'doublejump'}, dog:{rarity:'common',power:'dash'},
  pigeon:{rarity:'common',power:'doublejump'}, mouse:{rarity:'common',power:'slippery'}, giraffe:{rarity:'common',power:'shield'},
  platypus:{rarity:'common',power:'heal'}, goose:{rarity:'common',power:'doublejump'},
};
ANIMALS.forEach(a=>{ const m=META[a.id]||{rarity:'common',power:'dash'}; a.rarity=m.rarity; a.power=m.power; });
const byRarity=(r)=>ANIMALS.filter(a=>a.rarity===r);

// ---- COFRES (gacha): entre más caro, mejores probabilidades ----
const CHESTS = [
  {id:'wood',   name:'COFRE DE MADERA', price:5,  color:'#b07b3a', odds:{common:82,rare:16,epic:2, legendary:0}},
  {id:'silver', name:'COFRE DE PLATA',  price:15, color:'#c7ccd6', odds:{common:52,rare:34,epic:11,legendary:3}},
  {id:'gold',   name:'COFRE DE ORO',    price:35, color:'#ffd34d', odds:{common:26,rare:38,epic:27,legendary:9}},
  {id:'diamond',name:'COFRE DIAMANTE',  price:80, color:'#7ef0ff', odds:{common:6, rare:30,epic:42,legendary:22}},
];
const byChest={}; CHESTS.forEach(c=>byChest[c.id]=c);
function rollRarity(odds){
  const total=Object.values(odds).reduce((a,b)=>a+b,0);
  let r=Math.random()*total;
  for(const k of ['legendary','epic','rare','common']){ r-=(odds[k]||0); if(r<0) return k; }
  return 'common';
}
// abre un cofre: descuenta monedas, saca un animal random según rareza
function openTreasure(chestId){
  const ch=byChest[chestId]; const st=S;
  if(!ch) return {ok:false,msg:'Cofre inválido'};
  const free = st.freeChest && chestId==='wood';   // primer cofre de madera GRATIS
  if(!free && st.hearts<ch.price) return {ok:false,msg:'No te alcanzan los corazones'};
  if(free){ st.freeChest=false; } else { st.hearts-=ch.price; }
  let rarity=rollRarity(ch.odds);
  let pool=byRarity(rarity);
  while(pool.length===0 && rarity!=='common'){ rarity=({legendary:'epic',epic:'rare',rare:'common'})[rarity]; pool=byRarity(rarity); }
  const animal=pool[Math.floor(Math.random()*pool.length)];
  const dupe=!!st.owned[animal.id];
  const token=mint(animal.id);        // acuña / re-acuña
  if(!st.selected) st.selected=animal.id;
  let refund=0;
  if(dupe && !free){ refund=Math.max(1,Math.round(ch.price*0.4)); st.hearts+=refund; }
  save();
  return {ok:true, animal, rarity, token, dupe, refund, chest:ch, free};
}

// ---- armas: arcos (rango) y espadas (melee); se compran con MONEDAS ----
const WEAPONS = [
  // arco por default (único). Sin espadas ni armería.
  {id:'bow_wood',  name:'ARCO',  kind:'bow',  price:0,  ammo:3, arrowSpeed:720, cd:0.32, tint:'#e8d9b0', blurb:'Tu arco.'},
];
const byWeapon = {}; WEAPONS.forEach(w=>byWeapon[w.id]=w);

// ---- economía ----
const ECON = {
  FEE: 3,
  PLAYERS: 4,
  get POT(){ return this.FEE*this.PLAYERS; },
  MXN_PER_HEART: 5,
  SELL_RATE: 0.7,
  START_HEARTS: 25,
  START_COINS: 60,
  COIN_REWARD: {1:60,2:35,3:22,4:14},   // monedas por lugar en la competitiva
};

// ---- estado ----
const DEFAULT = ()=>({
  name:null,
  hearts:ECON.START_HEARTS,
  coins:ECON.START_COINS,
  owned:{},           // id -> tokenId
  weapons:['bow_wood'],   // armas que posees
  weapon:'bow_wood',      // arma equipada
  selected:null,
  xp:0,
  wins:0, matches:0, heartsWon:0,
  lastDaily:null,
  mintCount:0,
  tut:false,
  freeChest:true,   // el primer cofre (de madera) es gratis para el nuevo usuario
});
let S = DEFAULT();
function load(){
  try{ const raw=localStorage.getItem('hearts-save'); if(raw) S=Object.assign(DEFAULT(),JSON.parse(raw)); }catch(e){}
  // limpia animales que ya no existan en el roster
  Object.keys(S.owned).forEach(id=>{ if(!byId[id]) delete S.owned[id]; });
  if(S.selected && !byId[S.selected]) S.selected=Object.keys(S.owned)[0]||null;
  // armas: siempre posees el arco básico y hay una equipada válida
  if(!Array.isArray(S.weapons)) S.weapons=['bow_wood'];
  if(!S.weapons.includes('bow_wood')) S.weapons.unshift('bow_wood');
  S.weapons=S.weapons.filter(id=>byWeapon[id]);
  if(!byWeapon[S.weapon] || !S.weapons.includes(S.weapon)) S.weapon='bow_wood';
  if(typeof S.coins!=='number') S.coins=ECON.START_COINS;
  return S;
}
// ---- armas: comprar / equipar ----
function buyWeapon(id){
  const w=byWeapon[id]; if(!w) return {ok:false,msg:'Arma inválida'};
  if(S.weapons.includes(id)) return {ok:false,msg:'Ya la tienes'};
  if(S.coins<w.price) return {ok:false,msg:'No te alcanzan las monedas'};
  S.coins-=w.price; S.weapons.push(id); S.weapon=id; save();
  return {ok:true};
}
function equipWeapon(id){ if(S.weapons.includes(id)&&byWeapon[id]){ S.weapon=id; save(); return true; } return false; }
function equipped(){ return byWeapon[S.weapon]||byWeapon['bow_wood']; }
function save(){ localStorage.setItem('hearts-save',JSON.stringify(S)); }
function reset(){ S=DEFAULT(); save(); }

function level(){ return Math.floor(Math.sqrt(S.xp/40))+1; }
function xpForLevel(l){ return 40*(l-1)*(l-1); }
function levelProgress(){
  const l=level();
  const a=xpForLevel(l), b=xpForLevel(l+1);
  return (S.xp-a)/(b-a);
}
function mint(id){
  S.mintCount++;
  const token='#'+String(1000+Math.floor(Math.random()*9000));
  S.owned[id]=token;
  if(!S.selected) S.selected=id;
  save();
  return token;
}

// ---- bots ----
const BOT_NAMES = ['DarkFang99','LaBestiaMX','K1LLERBEE','TlacuacheKing','Sr.Colmillo','NoScopeNina',
  'ElPatron777','GARRAS_DE_ACERO','xX_Cazador_Xx','MorelosGG','DonDepredador','FuriaSalvaje',
  'PixelPuma','ReyDelPantano','Lady_Zarpa','ColmilloNorte','BravoLobo','CACERIA_MX'];
function randomBots(n, excludeAnimal){
  const pool = ANIMALS.filter(a=>a.id!==excludeAnimal);
  const names = BOT_NAMES.slice();
  const bots=[];
  for(let i=0;i<n;i++){
    const a = pool[Math.floor(Math.random()*pool.length)];   // permite repetidos si hay muchos jugadores
    const nm = names.length ? names.splice(Math.floor(Math.random()*names.length),1)[0] : ('Rival'+(i+1));
    bots.push({name:nm, animal:a, bot:true});
  }
  return bots;
}

// leaderboard persistente (generado una vez)
function leaderboard(){
  let board;
  try{ board=JSON.parse(localStorage.getItem('hearts-board')); }catch(e){}
  if(!board){
    board = BOT_NAMES.map(n=>({name:n, animal:ANIMALS[Math.floor(Math.random()*ANIMALS.length)].id,
      hearts: 10+Math.floor(Math.random()*220)})).sort((a,b)=>b.hearts-a.hearts);
    localStorage.setItem('hearts-board',JSON.stringify(board));
  }
  return board;
}

// stats en puntitos (1-5) estilo carta: los DEPREDADORES tienen R más alta que las presas
function statPips(a){
  const clamp=v=>Math.max(1,Math.min(5,v));
  const dif=clamp(Math.round(a.stats.pow/2));
  const spd=clamp(Math.round(a.stats.vel/2));
  const hp =clamp(Math.round(a.stats.def/2));
  const base=clamp(Math.ceil(a.price/12));
  const r = a.side==='pred' ? clamp(base+1) : clamp(base);
  return {dif,spd,hp,r};
}

window.DATA = { ANIMALS, byId, WEAPONS, byWeapon, ECON, RARITY, POWERS, CHESTS, byChest, byRarity, openTreasure,
  state:()=>S, load, save, reset, level, levelProgress, mint, randomBots, leaderboard, BOT_NAMES, statPips, buyWeapon, equipWeapon, equipped };
})();

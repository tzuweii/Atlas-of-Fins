import { BAITS, FISH, FURNITURE, MILESTONES, RARITY, RODS, SPOTS, TIMES } from "./data.js";
import {
  BACKUP_KEY, SAVE_KEY, advanceTime, applyMilestones, baitById, buyBait, buyFurniture, buyRod,
  chooseFish, claimQuest, createInitialState, discoveredCount, fishById, furnitureById, generateCatch,
  getTensionConfig, isUnlocked, migrateState, recordCatch, rodById, sellCatches
} from "./core.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const app = $("#app");
const titleScreen = $("#title-screen");
const gameShell = $("#game-shell");
const content = $("#content-panel");
const modalRoot = $("#modal-root");
const tutorialEl = $("#tutorial");

let state = createInitialState();
let currentView = "fishing";
let journalFilter = "all";
let selectedJournalFish = null;
let shopTab = "rods";
let fishing = { phase: "idle", fish: null, caught: null, timer: null, raf: null, held: false, tension: .38, progress: 0, danger: 0, last: 0 };

class Sound {
  constructor() { this.context = null; this.ambientTimer = null; }
  ensure() {
    if (!state.settings.sound) return null;
    this.context ||= new (window.AudioContext || window.webkitAudioContext)();
    if (this.context.state === "suspended") this.context.resume();
    return this.context;
  }
  tone(frequency = 440, duration = .12, type = "sine", volume = .04, delay = 0) {
    const ctx = this.ensure(); if (!ctx) return;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + .01);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + delay + duration);
    osc.connect(gain).connect(ctx.destination); osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + duration + .02);
  }
  play(name) {
    if (name === "cast") { this.tone(310,.12,"sine",.035); this.tone(520,.16,"sine",.025,.08); }
    if (name === "hook") { this.tone(640,.1,"square",.035); this.tone(880,.14,"sine",.03,.1); }
    if (name === "success") [523,659,784].forEach((n,i)=>this.tone(n,.34,"sine",.04,i*.1));
    if (name === "new") [659,784,1046].forEach((n,i)=>this.tone(n,.48,"triangle",.035,i*.13));
    if (name === "coin") { this.tone(740,.09,"sine",.035); this.tone(990,.15,"sine",.025,.07); }
    if (name === "fail") { this.tone(240,.28,"triangle",.03); }
    if (name === "sleep") [430,380,330].forEach((n,i)=>this.tone(n,.42,"sine",.025,i*.16));
  }
  startAmbient() {
    this.stopAmbient();
    if (!state.settings.sound) return;
    const playPhrase = () => {
      const time = TIMES[state.timeIndex].id;
      const notes = time === "dusk" ? [293, 369, 440] : (time === "night" || state.weather === "rain") ? [220, 277, 330] : [261, 329, 392];
      notes.forEach((note, index) => this.tone(note, 2.8, index === 1 ? "triangle" : "sine", .007, index * .42));
    };
    playPhrase();
    this.ambientTimer = setInterval(playPhrase, 7200);
  }
  stopAmbient() { clearInterval(this.ambientTimer); this.ambientTimer = null; }
}
const sound = new Sound();

function hasSave() { return Boolean(localStorage.getItem(SAVE_KEY) || localStorage.getItem(BACKUP_KEY)); }
function saveGame(showToast = false) {
  try {
    const previous = localStorage.getItem(SAVE_KEY);
    if (previous) localStorage.setItem(BACKUP_KEY, previous);
    state.lastSavedAt = new Date().toISOString();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    if (showToast) toast("航海日誌已妥善收好");
  } catch { if (showToast) toast("無法使用本機存檔，請檢查瀏覽器設定"); }
}
function loadGame() {
  for (const key of [SAVE_KEY, BACKUP_KEY]) {
    try { const raw = localStorage.getItem(key); if (raw) return migrateState(JSON.parse(raw)); } catch { /* try backup */ }
  }
  return createInitialState();
}

function startGame(isNew = false) {
  if (isNew) {
    state = createInitialState();
    localStorage.removeItem(SAVE_KEY); localStorage.removeItem(BACKUP_KEY);
    saveGame();
  } else state = loadGame();
  titleScreen.classList.add("is-hidden");
  gameShell.classList.remove("is-hidden");
  currentView = "fishing";
  syncWorld(); render(); updateTutorial(); sound.startAmbient();
}

function syncWorld() {
  const time = TIMES[state.timeIndex];
  app.dataset.time = time.id; app.dataset.weather = state.weather;
  $("#time-icon").textContent = time.icon; $("#time-label").textContent = `${time.name} · 第 ${state.day} 日`;
  $("#weather-icon").textContent = state.weather === "rain" ? "☂" : "☀";
  $("#weather-label").textContent = state.weather === "rain" ? "細雨" : "晴朗";
  $("#money-label").textContent = state.money.toLocaleString("zh-TW");
  $("#journal-badge").textContent = `${discoveredCount(state)}/20`;
  $("#catch-badge").textContent = state.catchInventory.length;
  $("#sound-button").textContent = state.settings.sound ? "♪" : "×";
  $("#sail-emblem").textContent = state.completedMilestones.includes(20) ? "✦" : "◌";
  const spot = SPOTS.find(item => item.id === state.selectedSpot) || SPOTS[0];
  $("#scene-caption").innerHTML = `<span>${spot.name}</span><small>${time.line}</small>`;
}

function render() {
  syncWorld();
  $$(".nav-button").forEach(button => button.classList.toggle("is-active", button.dataset.view === currentView));
  if (currentView === "fishing") renderFishing();
  if (currentView === "journal") renderJournal();
  if (currentView === "catch") renderCatch();
  if (currentView === "shop") renderShop();
  if (currentView === "home") renderHome();
}

function panelHeading(title, subtitle, actions = "") {
  return `<div class="panel-heading"><div><h2>${title}</h2><p>${subtitle}</p></div>${actions ? `<div class="panel-heading-actions">${actions}</div>` : ""}</div>`;
}

function renderFishing() {
  const rod = rodById(state.equippedRod), bait = baitById(state.equippedBait);
  const fishArea = fishing.phase === "idle" ? `
    <div class="cast-area"><p>${state.baitAmounts[state.equippedBait] ? "選好了嗎？海面正在等著你的下一竿。" : "這種魚餌用完了，去商店補充或換一種吧。"}</p>
      <button class="primary-button cast-button" data-action="cast" ${state.baitAmounts[state.equippedBait] ? "" : "disabled"}>拋下魚線</button></div>` : renderFishingStage();
  content.innerHTML = `${panelHeading("去釣魚", "選擇釣點與裝備，放慢呼吸，感受魚線傳來的動靜。")}
    <div class="fishing-layout"><div class="card fishing-main">
      <span class="section-label">選擇釣點</span><div class="spot-grid">${SPOTS.map(spot => {
        const locked = spot.requires && !state.ownedRods.includes(spot.requires);
        return `<button class="spot-card ${state.selectedSpot === spot.id ? "is-active" : ""}" data-action="spot" data-id="${spot.id}" ${locked ? "disabled" : ""}><span class="spot-icon">${locked ? "⌑" : spot.icon}</span><b>${spot.name}</b><small>${locked ? "需要強化遠投竿" : spot.hint}</small></button>`;
      }).join("")}</div>
      <div class="loadout"><label><span class="section-label">魚竿</span><span class="select-wrap"><select data-action="equip-rod" ${fishing.phase !== "idle" ? "disabled" : ""}>${state.ownedRods.map(id => { const item=rodById(id); return `<option value="${id}" ${id===state.equippedRod?"selected":""}>${item.name}</option>`}).join("")}</select></span><div class="bait-stock">安全區寬度 ${Math.round(rod.tolerance*100)}%</div></label>
      <label><span class="section-label">魚餌</span><span class="select-wrap"><select data-action="equip-bait" ${fishing.phase !== "idle" ? "disabled" : ""}>${BAITS.filter(item=>isUnlocked(item,state)).map(item=>`<option value="${item.id}" ${item.id===state.equippedBait?"selected":""}>${item.name} × ${state.baitAmounts[item.id]||0}</option>`).join("")}</select></span><div class="bait-stock">${bait.description}</div></label></div>${fishArea}
    </div>${renderQuests()}</div>`;
  if (fishing.phase === "reeling") bindReelButton();
}

function renderQuests() {
  return `<aside class="card quest-card"><span class="section-label">第 ${state.day} 日</span><h3>今日的小小目標</h3>${state.currentQuests.map(quest => {
    const complete = quest.progress >= quest.goal;
    return `<div class="quest-item"><div class="quest-top"><span>${quest.claimed ? "✓ " : ""}${quest.text}</span><span>+${quest.reward}</span></div><div class="progress-track"><i style="width:${Math.min(100,quest.progress/quest.goal*100)}%"></i></div>${complete&&!quest.claimed?`<button class="quest-claim" data-action="claim-quest" data-id="${quest.instanceId}">領取獎勵</button>`:`<div class="quiet-note">${Math.floor(quest.progress)} / ${quest.goal}</div>`}</div>`;
  }).join("")}<p class="quiet-note">沒有倒數，也沒有逾期懲罰。想做的時候再做就好。</p></aside>`;
}

function renderFishingStage() {
  if (fishing.phase === "waiting") return `<div class="fishing-stage"><div class="waiting-bobber"><div class="bobber"></div><h3>魚線已入水</h3><p>聽一會兒海浪，魚兒正在靠近……</p></div></div>`;
  if (fishing.phase === "hooked") return `<div class="fishing-stage"><button class="primary-button hook-button" data-action="hook">魚上鉤了！開始收線</button></div>`;
  if (fishing.phase === "failed") return `<div class="fishing-stage"><div class="fishing-result-fail"><h3>牠游回海裡了</h3><p>沒關係，海灣總會留著下一次相遇。</p><button class="secondary-button" data-action="reset-fishing">再拋一竿</button></div></div>`;
  if (fishing.phase === "reeling") {
    const rod = rodById(state.equippedRod), config = getTensionConfig(fishing.fish, rod);
    return `<div class="fishing-stage"><div class="reel-ui"><div class="reel-header"><b>穩住魚線</b><small>${behaviorName(fishing.fish.behavior)} · 按住收線，放開降張力</small></div><div class="tension-wrap"><div class="tension-labels"><span>鬆線</span><span>安全張力</span><span>危險</span></div><div class="tension-bar"><i class="safe-zone" style="left:${config.safeMin*100}%;width:${(config.safeMax-config.safeMin)*100}%"></i><i id="tension-needle" class="tension-needle" style="left:${fishing.tension*100}%"></i></div><div class="catch-progress"><i id="catch-progress-fill" style="width:${fishing.progress*100}%"></i></div><button id="reel-button" class="reel-button" type="button">按住收線</button><p id="danger-text" class="danger-text"></p></div></div></div>`;
  }
  return "";
}

function behaviorName(id){ return ({steady:"平穩型",sprint:"衝刺型",endurance:"耐力型",sway:"擺動型",rare:"稀有型"})[id]; }

function castLine() {
  if (fishing.phase !== "idle" || !state.baitAmounts[state.equippedBait]) return;
  state.baitAmounts[state.equippedBait]--;
  fishing.phase = "waiting"; fishing.fish = chooseFish(state); fishing.progress = 0; fishing.tension = .36; fishing.danger = 0;
  sound.play("cast"); saveGame(); renderFishing();
  if (!state.completedTutorial && state.tutorialStep < 1) { state.tutorialStep = 1; updateTutorial(); }
  const bait = baitById(state.equippedBait);
  fishing.timer = setTimeout(() => { fishing.phase="hooked"; sound.play("hook"); renderFishing(); }, 1400 + Math.random()*1800*bait.bite);
}

function startReeling() {
  if (fishing.phase !== "hooked") return;
  fishing.phase="reeling"; fishing.last=performance.now(); renderFishing();
  fishing.raf=requestAnimationFrame(reelLoop);
}

function bindReelButton() {
  const button=$("#reel-button"); if (!button) return;
  const down=e=>{ e.preventDefault(); fishing.held=true; button.classList.add("is-held"); };
  const up=()=>{ fishing.held=false; button.classList.remove("is-held"); };
  button.addEventListener("pointerdown",down); button.addEventListener("pointerleave",up);
}

function reelLoop(now) {
  if (fishing.phase !== "reeling") return;
  const dt=Math.min(.05,(now-fishing.last)/1000); fishing.last=now;
  const fish=fishing.fish, rod=rodById(state.equippedRod), config=getTensionConfig(fish,rod);
  const t=now/1000;
  let pull = ({steady:.018,sprint:.035,endurance:.025,sway:.04,rare:.052})[fish.behavior];
  pull *= Math.sin(t*(fish.behavior==="sway"?5.2:2.5)) + (fish.behavior==="sprint" && Math.sin(t*1.3)>.75 ? 5 : 1);
  if (fishing.held) fishing.tension += (0.24 + fish.difficulty*.065 + pull - (rod.id==="farcast"&&fish.behavior==="sprint"?.035:0))*dt;
  else fishing.tension -= (0.19 - pull*.2)*dt;
  fishing.tension=Math.max(.035,Math.min(1,fishing.tension));
  const safe=fishing.tension>=config.safeMin&&fishing.tension<=config.safeMax;
  if (fishing.held) fishing.progress += rod.reelSpeed*dt*(safe?1.55:.48)/Math.max(.9,fish.difficulty*.82);
  else fishing.progress -= .012*dt;
  fishing.progress=Math.max(0,Math.min(1,fishing.progress));
  if (fishing.tension>.91) fishing.danger+=dt; else fishing.danger=Math.max(0,fishing.danger-dt*1.8);
  const needle=$("#tension-needle"), fill=$("#catch-progress-fill"), danger=$("#danger-text");
  if(needle) needle.style.left=`${fishing.tension*100}%`; if(fill) fill.style.width=`${fishing.progress*100}%`;
  if(danger) danger.textContent=fishing.danger>.1?`魚線繃得太緊了，先放開一下！ ${Math.max(0,config.breakDelay-fishing.danger).toFixed(1)} 秒`:safe?"很好，就維持這個節奏":"讓張力回到白色安全框內";
  if (fishing.danger>=config.breakDelay) return failCatch();
  if (fishing.progress>=1) return completeCatch();
  fishing.raf=requestAnimationFrame(reelLoop);
}

function failCatch() {
  cancelAnimationFrame(fishing.raf); fishing.held=false; fishing.phase="failed"; sound.play("fail");
  if (!state.completedTutorial) { state.baitAmounts[state.equippedBait]++; toast("教學期間不消耗這次魚餌"); }
  saveGame(); renderFishing();
}

function completeCatch() {
  cancelAnimationFrame(fishing.raf); fishing.held=false;
  const caught=generateCatch(fishing.fish), result=recordCatch(state,caught,state.equippedBait), milestones=applyMilestones(state);
  fishing.caught=caught; fishing.phase="idle"; sound.play(result.isNew?"new":"success");
  if (!state.completedTutorial && state.tutorialStep < 2) state.tutorialStep=2;
  saveGame(); syncWorld(); showCatchModal(fishing.fish,caught,result,milestones); updateTutorial();
}

function resetFishing() { clearFishing(); fishing.phase="idle"; renderFishing(); }
function clearFishing(){ clearTimeout(fishing.timer); cancelAnimationFrame(fishing.raf); fishing.held=false; }

function showCatchModal(fish,caught,result,milestones) {
  const tags=[result.isLengthRecord?"最長紀錄":null,result.isWeightRecord?"最重紀錄":null].filter(Boolean).join(" · ");
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal catch-modal"><div class="catch-hero">${fishArt(fish)}</div>${result.isNew?'<span class="new-ribbon">NEW · 圖鑑新增</span>':`<span class="new-ribbon">${RARITY[fish.rarity].name}</span>`}<h2>${fish.name}</h2><p class="catch-subtitle">${fish.english}</p><p class="modal-copy">${fish.short}</p><div class="catch-stats"><div><small>體長</small><b>${caught.length} cm</b></div><div><small>重量</small><b>${caught.weight} kg</b></div><div><small>售價</small><b>${caught.price} 金幣</b></div></div>${tags?`<div class="record-tag">✦ ${tags}</div>`:""}${result.isNew?`<p class="record-tag">首次發現獎勵已直接收入錢袋</p>`:""}<div class="modal-actions"><button class="soft-button" data-action="modal-journal" data-id="${fish.id}">查看圖鑑</button><button class="primary-button" data-action="close-catch">收進漁獲箱</button></div></div></div>`;
  for(const milestone of milestones) setTimeout(()=>toast(`里程碑「${milestone.name}」完成：${milestone.reward}`,"gold"),500);
}

function renderJournal() {
  const actions=`<div class="completion-ring"><div><small>探索進度</small><b>${discoveredCount(state)} / 20</b></div></div>`;
  const filtered=FISH.filter(f=>journalFilter==="all"||f.rarity===journalFilter||f.spots.includes(journalFilter));
  selectedJournalFish ||= (filtered.find(f=>state.discovered[f.id])||filtered[0])?.id;
  if (!filtered.some(f=>f.id===selectedJournalFish)) selectedJournalFish=filtered[0]?.id;
  const selected=fishById(selectedJournalFish), record=state.discovered[selected?.id];
  content.innerHTML=`${panelHeading("魚類圖鑑","每一次相遇都會在這裡留下紀錄。捕獲三次後，解鎖完整生態筆記。",actions)}<div class="filter-row"><button class="filter-chip ${journalFilter==="all"?"is-active":""}" data-action="journal-filter" data-id="all">全部</button><button class="filter-chip ${journalFilter==="common"?"is-active":""}" data-action="journal-filter" data-id="common">常見</button><button class="filter-chip ${journalFilter==="uncommon"?"is-active":""}" data-action="journal-filter" data-id="uncommon">少見</button><button class="filter-chip ${journalFilter==="rare"?"is-active":""}" data-action="journal-filter" data-id="rare">稀有</button><button class="filter-chip ${journalFilter==="shore"?"is-active":""}" data-action="journal-filter" data-id="shore">近岸</button><button class="filter-chip ${journalFilter==="reef"?"is-active":""}" data-action="journal-filter" data-id="reef">礁石</button><button class="filter-chip ${journalFilter==="deep"?"is-active":""}" data-action="journal-filter" data-id="deep">深水</button></div><div class="journal-layout" style="margin-top:16px"><div class="fish-grid">${filtered.map(fish=>fishCard(fish)).join("")}</div>${selected?fishDetail(selected,record):""}</div>`;
}

function fishCard(fish) {
  const found=state.discovered[fish.id];
  return `<button class="fish-card ${found?"":"is-unknown"} ${selectedJournalFish===fish.id?"is-active":""}" data-action="select-fish" data-id="${fish.id}">${fishArt(fish,!found)}<b>${found?fish.name:"未發現"}</b><small>${found?`${RARITY[fish.rarity].name} · 捕獲 ${found.count} 次`:unknownHint(fish)}</small></button>`;
}
function unknownHint(fish){ return fish.spots.includes("deep")?"深藍水域的神秘剪影":fish.spots.includes("reef")?"礁石間似乎有什麼身影":"近岸水光中的小小身影"; }
function fishDetail(fish,record) {
  if(!record) return `<aside class="card fish-detail"><div class="fish-detail-hero unknown-hero">${fishArt(fish,true)}</div><h3>尚未相遇</h3><p class="fish-detail-copy">${unknownHint(fish)}。試著改變釣點、時段或魚餌，也許下一竿就會認識牠。</p></aside>`;
  const full=record.count>=3;
  return `<aside class="card fish-detail"><div class="fish-detail-hero">${fishArt(fish)}</div><h3>${fish.name}</h3><span class="latin">${fish.english} · ${fish.scientific}</span><span class="rarity-pill" style="background:${RARITY[fish.rarity].color}">${RARITY[fish.rarity].name}</span><p class="fish-detail-copy">${full?fish.detail:fish.short}</p><div class="detail-stats"><div><small>捕獲次數</small><b>${record.count}</b></div><div><small>最長紀錄</small><b>${record.bestLength} cm</b></div><div><small>最重紀錄</small><b>${record.bestWeight} kg</b></div></div>${full?`<div class="fact-box">✦ ${fish.fact}</div><div class="fact-box">推薦：${fish.baits.map(id=>baitById(id).name).join("、")} · ${fish.times.map(id=>TIMES.find(t=>t.id===id).name).join("／")}</div>`:`<div class="fact-box">再捕獲 ${3-record.count} 次，解鎖偏好魚餌、活躍時間與有趣知識。</div>`}</aside>`;
}

function fishArt(fish,silhouette=false) {
  const paths={
    slender:`<path class="body" d="M22 53 Q48 27 91 47 Q106 35 121 28 L116 51 L124 70 Q105 66 91 57 Q47 76 22 53Z"/><path class="fin" d="M56 41 L69 22 L80 45Z"/>`,
    torpedo:`<path class="body" d="M18 53 Q51 22 100 43 L126 25 L119 52 L127 76 L99 61 Q53 82 18 53Z"/><path class="accent" d="M43 41 Q70 30 102 44 Q75 43 47 51Z"/>`,
    round:`<path class="body" d="M21 53 Q42 19 92 33 Q109 38 119 30 L114 51 L122 72 Q105 65 92 69 Q43 83 21 53Z"/><path class="fin" d="M55 33 L71 17 L82 35Z"/>`,
    flat:`<path class="body" d="M22 53 Q43 15 91 27 Q106 31 119 24 L114 50 L121 78 Q103 70 90 75 Q42 91 22 53Z"/><path class="accent" d="M57 30 L75 15 L87 31Z"/>`,
    spiky:`<path class="body" d="M21 56 Q36 25 90 35 L101 24 L105 38 L120 30 L115 52 L123 71 L102 63 Q48 84 21 56Z"/><path class="accent" d="M41 38 L49 18 L59 36 L70 15 L80 37Z"/>`,
    ribbon:`<path class="body" d="M12 52 Q38 25 69 46 Q94 67 126 35 Q108 76 77 61 Q42 43 12 63Z"/><path class="accent" d="M18 49 Q51 15 89 47" fill="none" stroke="var(--fish-b)" stroke-width="8"/>`,
    cephalopod:`<path class="body" d="M38 54 Q43 18 76 21 Q103 25 105 54 Q101 78 71 75 Q43 76 38 54Z"/><path class="fin" d="M47 32 Q26 39 34 62 Q40 71 50 72Z"/><path class="accent" d="M96 64 Q118 73 110 85 M87 69 Q104 86 94 92 M77 72 Q85 91 74 94" fill="none" stroke="var(--fish-b)" stroke-width="5" stroke-linecap="round"/>`,
    mahi:`<path class="body" d="M19 55 Q33 17 91 30 Q109 34 122 23 L116 52 L125 78 L99 62 Q48 81 19 55Z"/><path class="accent" d="M33 38 Q64 16 100 32 L94 43 Q59 34 32 47Z"/><path class="fin" d="M30 39 Q58 13 101 30 L78 25 L50 25Z"/>`,
    winged:`<path class="body" d="M19 53 Q48 28 92 44 L120 27 L114 52 L122 73 L92 60 Q49 76 19 53Z"/><path class="fin" d="M52 45 Q52 9 97 15 L75 46Z"/><path class="accent" d="M53 58 Q54 89 97 84 L75 58Z"/>`,
    glow:`<path class="body" d="M21 53 Q44 25 89 35 Q107 38 119 28 L114 51 L122 74 Q105 66 90 69 Q45 82 21 53Z"/><circle class="accent" cx="48" cy="64" r="3"/><circle class="accent" cx="61" cy="67" r="3"/><circle class="accent" cx="74" cy="67" r="3"/>`
  };
  return `<div class="fish-art ${silhouette?"is-silhouette":""}" style="--fish-a:${fish.colors[0]};--fish-b:${fish.colors[1]}"><svg class="fish-svg" viewBox="0 0 140 105" aria-hidden="true">${paths[fish.shape]||paths.round}<circle class="eye" cx="40" cy="47" r="2.7"/><path class="shine" d="M42 37 Q58 28 76 32"/></svg></div>`;
}

function renderCatch() {
  const total=state.catchInventory.reduce((sum,item)=>sum+item.price,0);
  const actions=state.catchInventory.length?`<button class="primary-button" data-action="sell-all">全部販售 · ${total} 金幣</button>`:"";
  content.innerHTML=`${panelHeading("今日漁獲","漁獲箱會好好保管每次相遇；準備好時，再將牠們交給海灣商店。",actions)}<div class="catch-list">${state.catchInventory.length?state.catchInventory.map(caught=>{const fish=fishById(caught.fishId);return `<article class="card catch-row">${fishArt(fish)}<div><h3>${fish.name}</h3><div class="catch-meta"><span>${RARITY[fish.rarity].name}</span><span>${caught.length} cm</span><span>${caught.weight} kg</span><span>${sizeName(caught.sizeTier)}</span></div></div><div class="sell-one"><b>${caught.price} 金幣</b><button class="soft-button" data-action="sell-one" data-id="${caught.uid}">販售</button></div></article>`}).join(""):`<div class="empty-state"><span>⌁</span><h3>漁獲箱還空著</h3><p>回到甲板，向海灣拋下今天的第一竿吧。</p></div>`}</div>`;
}
function sizeName(tier){return({small:"小型",standard:"標準",large:"大型",record:"紀錄級"})[tier]}

function renderShop() {
  const tabNames={rods:"魚竿",baits:"魚餌",furniture:"船屋家具"};
  let items=[];
  if(shopTab==="rods") items=RODS.map(item=>shopItem(item,"rod"));
  if(shopTab==="baits") items=BAITS.map(item=>shopItem(item,"bait"));
  if(shopTab==="furniture") items=FURNITURE.map(item=>shopItem(item,"furniture"));
  const actions=`<span class="price">● ${state.money.toLocaleString("zh-TW")}</span>`;
  content.innerHTML=`${panelHeading("海灣商店","老闆會替你收好需要的裝備；商品永遠不會限時消失。",actions)}<div class="shop-tabs">${Object.entries(tabNames).map(([id,name])=>`<button class="filter-chip ${shopTab===id?"is-active":""}" data-action="shop-tab" data-id="${id}">${name}</button>`).join("")}</div><div class="shop-grid">${items.join("")}</div>`;
}

function shopItem(item,type) {
  const unlocked=isUnlocked(item,state)&&!item.milestone;
  const owned=type==="rod"?state.ownedRods.includes(item.id):type==="furniture"?state.ownedFurniture.includes(item.id):false;
  const equipped=type==="rod"&&state.equippedRod===item.id;
  const icon=type==="rod"?"╱":type==="bait"?item.icon:item.icon;
  const priceText=type==="bait"?`${item.price} · ${item.amount} 份`:item.price?`${item.price} 金幣`:"初始擁有";
  let button="";
  if(type==="rod") button=owned?`<button class="soft-button" data-action="shop-equip-rod" data-id="${item.id}" ${equipped?"disabled":""}>${equipped?"裝備中":"裝備"}</button>`:`<button class="primary-button" data-action="buy-rod" data-id="${item.id}" ${state.money<item.price?"disabled":""}>購買並裝備</button>`;
  if(type==="bait") button=`<button class="primary-button" data-action="buy-bait" data-id="${item.id}" ${state.money<item.price?"disabled":""}>補充 ${item.amount} 份</button>`;
  if(type==="furniture") button=owned?`<button class="soft-button" data-action="place-furniture" data-id="${item.id}">放置到船屋</button>`:`<button class="primary-button" data-action="buy-furniture" data-id="${item.id}" ${state.money<item.price?"disabled":""}>購買並放置</button>`;
  const lockReason=item.milestone?`發現 ${item.milestone} 種魚後贈送`:item.unlockDiscoveries?`發現 ${item.unlockDiscoveries} 種魚後解鎖`:"尚未解鎖";
  return `<article class="card shop-item"><div class="shop-item-icon">${icon}</div><h3>${item.name}</h3><p>${item.description}</p><div class="price-row"><span class="price">${priceText}</span><span class="item-state">${owned?equipped?"裝備中":"已擁有":type==="bait"?`庫存 ${state.baitAmounts[item.id]||0}`:"可購買"}</span></div>${button}${!unlocked&&!owned?`<div class="lock-cover"><div><span>⌑</span><b>${lockReason}</b></div></div>`:""}</article>`;
}

function renderHome() {
  content.innerHTML=`${panelHeading("我的船屋","外面是未知的海，這裡是永遠為你亮著燈的家。")}
    <div class="home-layout"><div class="cabin-view"><div class="cabin-glow"></div><div class="cabin-window"><i class="window-rain"></i></div>${["sleep","wall","table","light","corner"].map(slot=>{const id=state.placedFurniture[slot],item=furnitureById(id);return `<button class="home-slot slot-${slot} ${item?"":"is-empty"}" data-action="slot" data-id="${slot}" title="${item?item.name:"空插槽"}">${item?`<span>${item.icon}</span>`:""}</button>`}).join("")}</div>
    <aside class="home-side"><div class="card home-card"><span class="section-label">休息一下</span><h3>${TIMES[state.timeIndex].name}的船屋</h3><p>${state.weather==="rain"?"細雨落在窗上，提燈讓木牆顯得更加溫暖。":"光線從舷窗落進來，船身隨著海面緩緩呼吸。"}</p><button class="primary-button sleep-button" data-action="sleep">睡到下一個時段</button></div><div class="card home-card"><span class="section-label">已擁有的家具</span><div class="owned-list">${state.ownedFurniture.map(id=>{const item=furnitureById(id);return `<button class="owned-chip ${state.placedFurniture[item.slot]===id?"is-placed":""}" data-action="place-furniture" data-id="${id}">${item.icon} ${item.name}</button>`}).join("")}</div></div><div class="card home-card"><span class="section-label">圖鑑里程碑</span><div class="milestone-list">${MILESTONES.map(m=>`<div class="milestone-row ${state.completedMilestones.includes(m.count)?"is-done":""}"><i></i><span>${m.count} 種 · ${m.reward}</span></div>`).join("")}</div></div></aside></div>`;
}

function placeFurniture(id) {
  const item=furnitureById(id); if(!item||!state.ownedFurniture.includes(id)) return;
  state.placedFurniture[item.slot]=id; saveGame(); sound.play("coin"); toast(`${item.name}已放進${slotName(item.slot)}`); render();
}
function slotName(id){return({sleep:"睡眠區",wall:"牆面",table:"桌面",light:"照明區",corner:"角落"})[id]}
function showSlotModal(slot){
  const options=state.ownedFurniture.map(furnitureById).filter(item=>item.slot===slot);
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>${slotName(slot)}</h2><p class="modal-copy">選一件已擁有的家具放在這個固定插槽。</p><div class="owned-list">${options.length?options.map(item=>`<button class="owned-chip" data-action="modal-place" data-id="${item.id}">${item.icon} ${item.name}</button>`).join(""):"這個位置還沒有適合的家具，去商店看看吧。"}</div><div class="modal-actions"><button class="soft-button" data-action="close-modal">關閉</button></div></div></div>`;
}

function sleep() {
  advanceTime(state); sound.play("sleep"); saveGame(); syncWorld(); toast(`睡醒時已是${TIMES[state.timeIndex].name}${state.timeIndex===0?`，第 ${state.day} 日`:""}`);
  if(!state.completedTutorial&&state.tutorialStep>=5){state.completedTutorial=true;state.tutorialStep=6;saveGame();toast("教學完成。接下來，照自己的步調探索海灣吧！","gold");}
  renderHome(); updateTutorial();
}

function updateTutorial() {
  if(state.completedTutorial){tutorialEl.classList.add("is-hidden");return;}
  const messages=[
    "清晨好。先看看暖燈與海面，準備好後，在下方選擇「去釣魚」。",
    "已使用免費麵包糰。魚上鉤後，按住收線讓進度前進；張力太高時放開。",
    "第一條魚已登錄！打開「魚類圖鑑」，看看剛認識的新朋友。",
    "接著到「今日漁獲」把魚販售，為下一趟航程準備金幣。",
    "前往「海灣商店」補充任一種魚餌。商品永遠不會限時消失。",
    "最後回到「我的船屋」，使用床鋪切換到下一個時段。"
  ];
  tutorialEl.innerHTML=`<button data-action="dismiss-tutorial" aria-label="暫時隱藏教學">×</button><small>航海教學 · ${Math.min(state.tutorialStep+1,6)} / 6</small><p>${messages[Math.min(state.tutorialStep,5)]}</p>`;
  tutorialEl.classList.remove("is-hidden");
}

function setView(view) {
  if(view!=="fishing"&&fishing.phase!=="idle"){clearFishing(); fishing.phase="idle"; toast("已替你收好魚線");}
  currentView=view;
  if(!state.completedTutorial){
    if(view==="journal"&&state.tutorialStep===2)state.tutorialStep=3;
    if(view==="catch"&&state.tutorialStep===2)state.tutorialStep=3;
  }
  render();updateTutorial();window.scrollTo({top:0,behavior:"smooth"});
}

function sell(ids) {
  const result=sellCatches(state,ids); if(!result.sold)return;
  sound.play("coin");saveGame();toast(`販售 ${result.sold} 份漁獲，獲得 ${result.total} 金幣`);
  if(!state.completedTutorial&&state.tutorialStep<=3)state.tutorialStep=4;
  render();updateTutorial();
}

function toast(message,kind="") {
  const el=document.createElement("div");el.className=`toast ${kind?`is-${kind}`:""}`;el.textContent=message;$("#toast-root").append(el);setTimeout(()=>el.remove(),3200);
}

function showSettings() {
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>聲音與旅程</h2><p class="modal-copy">所有音效皆由瀏覽器即時合成，不使用外部音訊素材。</p><div class="settings-row"><span>操作與捕獲音效</span><button class="toggle ${state.settings.sound?"is-on":""}" data-action="toggle-sound"><i></i></button></div><div class="modal-actions"><button class="soft-button" data-action="close-modal">關閉</button></div></div></div>`;
}
function showMainMenuConfirm() {
  saveGame();modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>回到主選單？</h2><p class="modal-copy">目前進度已自動儲存。海灣會在這裡等你回來。</p><div class="modal-actions"><button class="soft-button" data-action="close-modal">繼續遊玩</button><button class="primary-button" data-action="to-title">回到主選單</button></div></div></div>`;
}

document.addEventListener("click", event => {
  const target=event.target.closest("[data-action]"); if(!target)return;
  const {action,id}=target.dataset;
  if(action==="cast")castLine();
  if(action==="hook")startReeling();
  if(action==="reset-fishing")resetFishing();
  if(action==="spot"){state.selectedSpot=id;saveGame();renderFishing();syncWorld();}
  if(action==="claim-quest"&&claimQuest(state,id)){sound.play("coin");saveGame();toast("今日目標完成，獎勵已收入錢袋");render();}
  if(action==="close-catch"){modalRoot.innerHTML="";render();}
  if(action==="modal-journal"){modalRoot.innerHTML="";selectedJournalFish=id;setView("journal");}
  if(action==="journal-filter"){journalFilter=id;renderJournal();}
  if(action==="select-fish"){selectedJournalFish=id;renderJournal();}
  if(action==="sell-one")sell([id]);
  if(action==="sell-all")sell(state.catchInventory.map(item=>item.uid));
  if(action==="shop-tab"){shopTab=id;renderShop();}
  if(action==="shop-equip-rod"){state.equippedRod=id;saveGame();toast(`已裝備${rodById(id).name}`);renderShop();syncWorld();}
  if(action==="buy-rod"&&buyRod(state,id)){sound.play("coin");saveGame();toast(`買下並裝備了${rodById(id).name}`);render();}
  if(action==="buy-bait"&&buyBait(state,id)){sound.play("coin");if(!state.completedTutorial&&state.tutorialStep===4)state.tutorialStep=5;saveGame();toast(`${baitById(id).name}已放入裝備箱`);render();updateTutorial();}
  if(action==="buy-furniture"&&buyFurniture(state,id)){sound.play("coin");saveGame();toast(`${furnitureById(id).name}已放進船屋`);render();}
  if(action==="place-furniture")placeFurniture(id);
  if(action==="slot")showSlotModal(id);
  if(action==="modal-place"){modalRoot.innerHTML="";placeFurniture(id);}
  if(action==="sleep")sleep();
  if(action==="dismiss-tutorial")tutorialEl.classList.add("is-hidden");
  if(action==="toggle-sound"){state.settings.sound=!state.settings.sound;saveGame();showSettings();syncWorld();if(state.settings.sound){sound.play("coin");sound.startAmbient();}else sound.stopAmbient();}
  if(action==="close-modal")modalRoot.innerHTML="";
  if(action==="to-title"){clearFishing();sound.stopAmbient();modalRoot.innerHTML="";gameShell.classList.add("is-hidden");titleScreen.classList.remove("is-hidden");$("#continue-button").disabled=!hasSave();}
});

content.addEventListener("change",event=>{
  if(event.target.dataset.action==="equip-rod"){state.equippedRod=event.target.value;saveGame();renderFishing();}
  if(event.target.dataset.action==="equip-bait"){state.equippedBait=event.target.value;saveGame();renderFishing();}
});

document.addEventListener("keydown",event=>{
  if(event.code==="Space"&&fishing.phase==="reeling"){event.preventDefault();fishing.held=true;$("#reel-button")?.classList.add("is-held");}
});
document.addEventListener("keyup",event=>{if(event.code==="Space"){fishing.held=false;$("#reel-button")?.classList.remove("is-held");}});
window.addEventListener("pointerup",()=>{fishing.held=false;$("#reel-button")?.classList.remove("is-held");});

$$(".nav-button").forEach(button=>button.addEventListener("click",()=>setView(button.dataset.view)));
$("#continue-button").addEventListener("click",()=>startGame(false));
$("#new-game-button").addEventListener("click",()=>{
  if(hasSave()) modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>展開新旅程？</h2><p class="modal-copy">這會替換目前的航海紀錄與備份存檔。</p><div class="modal-actions"><button class="soft-button" data-action="close-modal">取消</button><button id="confirm-new" class="danger-button">開始新遊戲</button></div></div></div>`,$("#confirm-new").addEventListener("click",()=>{modalRoot.innerHTML="";startGame(true)}); else startGame(true);
});
$("#title-settings-button").addEventListener("click",showSettings);
$("#sound-button").addEventListener("click",()=>{state.settings.sound=!state.settings.sound;saveGame();syncWorld();if(state.settings.sound){sound.play("coin");sound.startAmbient();}else sound.stopAmbient();});
$("#save-button").addEventListener("click",()=>saveGame(true));
$("#menu-button").addEventListener("click",showMainMenuConfirm);
$("#time-chip").addEventListener("click",()=>toast("回到船屋使用床鋪，就能切換到下一個時段"));

setInterval(()=>{ if(!gameShell.classList.contains("is-hidden"))saveGame(); },30000);
setInterval(()=>{
  if(gameShell.classList.contains("is-hidden"))return;
  advanceTime(state);saveGame();syncWorld();sound.startAmbient();
  toast(`潮水慢慢推進，現在是${TIMES[state.timeIndex].name}`);
  if(currentView==="home")renderHome();
},300000);
window.addEventListener("beforeunload",()=>saveGame());
$("#continue-button").disabled=!hasSave();

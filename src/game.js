import { ACHIEVEMENTS, AQUARIUM_CAPACITY_MILESTONES, BAITS, FISH, FURNITURE, MILESTONES, RARITY, RODS, SPOTS, TIMES } from "./data.js";
import {
  BACKUP_KEY, DEV_BACKUP_KEY, DEV_SAVE_KEY, SAVE_KEY, advanceTime, applyMilestones, baitById, buyBait, buyFurniture, buyRod,
  chooseFish, claimAchievement, claimQuest, createDeveloperState, createInitialState, discoveredCount, equipTitle, fishById,
  furnitureById, generateCatch, getAchievementProgress, getActiveBayEvent, getAquariumCapacity, getBayEventHint, getFamiliarity,
  getTensionConfig, getUnclaimedAchievementCount, isUnlocked, migrateState, moveCatchToAquarium,
  isBayEventConditionActive, recordCatch, removeFishFromAquarium, replaceAquariumFish, rodById, sellCatches,
  setAquariumDecoration, swapAquariumFish
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
let activeSaveMode = "normal";
let journalFilter = "all";
let selectedJournalFish = null;
let shopTab = "rods";
let fishing = { phase: "idle", fish: null, caught: null, context: null, timer: null, raf: null, held: false, tension: .38, progress: 0, danger: 0, last: 0 };

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

const DEVELOPER_PASSWORD = "atlas-dev";

function saveKeys(mode = activeSaveMode) {
  return mode === "developer" ? [DEV_SAVE_KEY, DEV_BACKUP_KEY] : [SAVE_KEY, BACKUP_KEY];
}
function hasSave(mode = "normal") {
  const [primaryKey, backupKey] = saveKeys(mode);
  return Boolean(localStorage.getItem(primaryKey) || localStorage.getItem(backupKey));
}
function saveGame(showToast = false) {
  try {
    const [primaryKey, backupKey] = saveKeys();
    const previous = localStorage.getItem(primaryKey);
    if (previous) localStorage.setItem(backupKey, previous);
    state.lastSavedAt = new Date().toISOString();
    localStorage.setItem(primaryKey, JSON.stringify(state));
    if (showToast) toast(activeSaveMode === "developer" ? "開發者測試紀錄已儲存" : "航海日誌已妥善收好");
  } catch { if (showToast) toast("無法使用本機存檔，請檢查瀏覽器設定"); }
}
function loadGame() {
  for (const key of saveKeys()) {
    try { const raw = localStorage.getItem(key); if (raw) return migrateState(JSON.parse(raw)); } catch { /* try backup */ }
  }
  return activeSaveMode === "developer" ? createDeveloperState() : createInitialState();
}

function startGame(isNew = false, mode = "normal") {
  activeSaveMode = mode;
  if (isNew) {
    state = mode === "developer" ? createDeveloperState() : createInitialState();
    const [primaryKey, backupKey] = saveKeys();
    localStorage.removeItem(primaryKey); localStorage.removeItem(backupKey);
    saveGame();
  } else {
    state = loadGame();
    if (!hasSave(mode)) saveGame();
  }
  titleScreen.classList.add("is-hidden");
  gameShell.classList.remove("is-hidden");
  app.classList.toggle("is-developer-mode", mode === "developer");
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
  const unclaimed=getUnclaimedAchievementCount(state);
  $("#journal-badge").textContent = `${discoveredCount(state)}/${FISH.length}${unclaimed?` · ${unclaimed}`:""}`;
  $("#journal-badge").title = unclaimed?`${unclaimed} 項成就獎勵待領取`:"圖鑑探索進度";
  $("#catch-badge").textContent = state.catchInventory.length;
  $("#sound-button").textContent = state.settings.sound ? "♪" : "×";
  $("#sail-emblem").textContent = state.completedMilestones.includes(FISH.length) ? "✺" : state.completedMilestones.includes(20) ? "✦" : "◌";
  $(".brand-mini small").textContent = activeSaveMode === "developer" ? `開發者模式 · ${state.equippedTitle}` : state.equippedTitle;
  const spot = SPOTS.find(item => item.id === state.selectedSpot) || SPOTS[0];
  const bayEvent = getActiveBayEvent(state);
  app.dataset.bayEvent = bayEvent?.id || "";
  $("#scene-caption").innerHTML = `<span>${spot.name}</span><small>${time.line}</small>${bayEvent ? `<em>${bayEvent.icon} ${bayEvent.name}</em>` : ""}`;
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
        return `<button class="spot-card ${state.selectedSpot === spot.id ? "is-active" : ""}" data-action="spot" data-id="${spot.id}" ${locked || fishing.phase !== "idle" ? "disabled" : ""}><span class="spot-icon">${locked ? "⌑" : spot.icon}</span><b>${spot.name}</b><small>${locked ? "需要強化遠投竿" : spot.hint}</small></button>`;
      }).join("")}</div>
      <div class="loadout"><label><span class="section-label">魚竿</span><span class="select-wrap"><select data-action="equip-rod" ${fishing.phase !== "idle" ? "disabled" : ""}>${state.ownedRods.map(id => { const item=rodById(id); return `<option value="${id}" ${id===state.equippedRod?"selected":""}>${item.name}</option>`}).join("")}</select></span><div class="bait-stock">安全區寬度 ${Math.round(rod.tolerance*100)}%</div></label>
      <label><span class="section-label">魚餌</span><span class="select-wrap"><select data-action="equip-bait" ${fishing.phase !== "idle" ? "disabled" : ""}>${BAITS.filter(item=>isUnlocked(item,state)).map(item=>`<option value="${item.id}" ${item.id===state.equippedBait?"selected":""}>${item.name} × ${state.baitAmounts[item.id]||0}</option>`).join("")}</select></span><div class="bait-stock">${bait.description}</div></label></div>${fishArea}
    </div><div class="fishing-side">${renderBayEvent()}${renderQuests()}</div></div>`;
  if (fishing.phase === "reeling") bindReelButton();
}

function renderBayEvent() {
  const event = getActiveBayEvent(state);
  if (!event) return `<aside class="card bay-event-card is-quiet" data-bay-event="quiet"><span class="section-label">今日海況</span><h3>潮聲平穩</h3><p>今天沒有特殊海灣事件。照自己的步調選擇釣點，或整理尚未完成的收藏目標。</p><span class="bay-event-status">平靜日</span></aside>`;
  const current = state.bayEvent;
  const progress = Math.min(event.goal, Math.max(0, Number(current.progress) || 0));
  const complete = Boolean(current.completedAt);
  const activeNow = isBayEventConditionActive(state, event);
  const spots = (event.spotIds || [event.spotId]).map(id => SPOTS.find(item => item.id === id)?.name).filter(Boolean).join("／");
  const times = (event.timeIds || []).map(id => TIMES.find(item => item.id === id)?.name).filter(Boolean).join("／") || "全天";
  const weathers = (event.weatherIds || []).map(id => ({sunny:"晴朗",rain:"細雨"})[id]).filter(Boolean).join("／");
  const conditions = [times, weathers].filter(Boolean).join(" · ");
  const targets = event.fishIds.map(id => fishById(id)?.name).filter(Boolean).join("、");
  const firstCompleted = Boolean(state.bayEventHistory?.[event.id]?.completions);
  const reward = complete ? current.rewardLabel : (firstCompleted ? event.repeatReward.label : event.firstReward.label);
  const status = complete ? `已完成 · ${current.rewardLabel}` : `${activeNow ? "目前生效" : `${conditions}生效`} · 獎勵 ${reward}`;
  return `<aside class="card bay-event-card ${complete ? "is-complete" : ""} ${!complete&&!activeNow ? "is-inactive" : ""}" data-bay-event="${event.id}"><div class="bay-event-heading"><span>${event.icon}</span><div><span class="section-label">海灣事件 · 第 ${state.day} 日</span><h3>${event.name}</h3></div></div><p>${event.description}</p><div class="bay-event-effect"><small>魚群變化 · ${conditions}</small><b>${spots || "指定釣點"} · ${targets}權重 ×${event.fishWeightMultiplier}</b></div><div class="bay-event-objective"><div><span>${complete ? "✓ " : ""}${event.objective}</span><b>${progress} / ${event.goal}</b></div><div class="progress-track"><i style="width:${Math.min(100, progress / event.goal * 100)}%"></i></div><p>${getBayEventHint(state)}</p></div><span class="bay-event-status">${status}</span></aside>`;
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

function currentCatchContext() {
  return {
    spotId: state.selectedSpot,
    timeId: TIMES[state.timeIndex].id,
    weather: state.weather,
    baitId: state.equippedBait,
    rodId: state.equippedRod,
    day: state.day
  };
}

function castLine() {
  if (fishing.phase !== "idle" || !state.baitAmounts[state.equippedBait]) return;
  state.baitAmounts[state.equippedBait]--;
  if (!state.completedTutorial && state.tutorialStep < 1) state.tutorialStep = 1;
  fishing.phase = "waiting"; fishing.fish = chooseFish(state); fishing.context = currentCatchContext(); fishing.progress = 0; fishing.tension = .36; fishing.danger = 0;
  sound.play("cast"); saveGame(); renderFishing(); updateTutorial();
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
  const caught=generateCatch(fishing.fish,fishing.context,state), result=recordCatch(state,caught,fishing.context?.baitId), milestones=applyMilestones(state);
  fishing.caught=caught; fishing.phase="idle"; sound.play(caught.variant==="shimmer"||result.isNew?"new":"success");
  if (!state.completedTutorial && state.tutorialStep < 2) state.tutorialStep=2;
  saveGame(); syncWorld(); showCatchModal(fishing.fish,caught,result,milestones); updateTutorial();
  notifyCompletedAchievements(result.completedAchievements);
  if(result.bayEventUpdate?.completed) setTimeout(()=>toast(`事件完成「${result.bayEventUpdate.event.name}」：${result.bayEventUpdate.reward.label}`,"gold"),420);
}

function resetFishing() { clearFishing(); fishing.phase="idle"; renderFishing(); }
function clearFishing(){ clearTimeout(fishing.timer); cancelAnimationFrame(fishing.raf); fishing.held=false; }

function showCatchModal(fish,caught,result,milestones) {
  const isShimmer=caught.variant==="shimmer";
  const tags=[result.isNew&&isShimmer?"圖鑑新增":null,result.isLengthRecord?"最長紀錄":null,result.isWeightRecord?"最重紀錄":null].filter(Boolean).join(" · ");
  const familiarityText=result.familiarity.nextCount?`${result.record.count} / ${result.familiarity.nextCount}`:"已精通";
  const ribbon=isShimmer?'<span class="new-ribbon is-shimmer">✦ 閃光個體</span>':result.isNew?'<span class="new-ribbon">NEW · 圖鑑新增</span>':`<span class="new-ribbon">${RARITY[fish.rarity].name}</span>`;
  const rewards=[result.isNew?"首次發現獎勵已收入錢袋":null,result.isFirstShimmer?"首次閃光研究獎勵 75 金幣":null].filter(Boolean).join(" · ");
  const eventUpdate=result.bayEventUpdate;
  const eventFeedback=eventUpdate?.updated?`<div class="catch-event ${eventUpdate.completed?"is-complete":""}"><span>${eventUpdate.completed?"事件完成":"海灣事件進度"}</span><b>${eventUpdate.event.name} · ${eventUpdate.progress} / ${eventUpdate.event.goal}</b><small>${eventUpdate.completed?`獲得 ${eventUpdate.reward.label}`:getBayEventHint(state)}</small></div>`:"";
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal catch-modal ${isShimmer?"is-shimmer":""}"><div class="catch-hero">${fishArt(fish,false,caught.variant)}</div>${ribbon}<h2>${fish.name}</h2><p class="catch-subtitle">${fish.english}</p><p class="modal-copy">${fish.short}</p><div class="catch-stats"><div><small>體長</small><b>${caught.length} cm</b></div><div><small>重量</small><b>${caught.weight} kg</b></div><div><small>售價</small><b>${caught.price} 金幣</b></div></div>${tags?`<div class="record-tag">✦ ${tags}</div>`:""}<div class="catch-familiarity ${result.familiarityChanged?"is-level-up":""}"><span>${result.familiarityChanged?"熟悉度提升":"圖鑑熟悉度"}</span><b>${result.familiarity.name}</b><small>${familiarityText}</small></div>${eventFeedback}${rewards?`<p class="record-tag">${rewards}</p>`:""}<div class="modal-actions"><button class="soft-button" data-action="modal-journal" data-id="${fish.id}">查看圖鑑</button><button class="primary-button" data-action="close-catch">收進漁獲箱</button></div></div></div>`;
  for(const milestone of milestones) {
    const aquariumCapacity=AQUARIUM_CAPACITY_MILESTONES.find(item=>item.discoveries===milestone.count)?.capacity;
    const aquariumReward=aquariumCapacity?`${milestone.count===5?"海灣觀察箱":"水族箱擴建至"} ${aquariumCapacity} 格`:"";
    setTimeout(()=>toast(`里程碑「${milestone.name}」完成：${milestone.reward}${aquariumReward?` · ${aquariumReward}`:""}`,"gold"),500);
  }
}

function renderJournal() {
  const unclaimed=getUnclaimedAchievementCount(state);
  const actions=`<div class="journal-heading-actions"><button class="soft-button achievement-open" data-action="show-achievements">收藏成就${unclaimed?`<i>${unclaimed}</i>`:""}</button><div class="completion-ring"><div><small>探索進度</small><b>${discoveredCount(state)} / ${FISH.length}</b></div></div></div>`;
  const filtered=FISH.filter(f=>journalFilter==="all"||f.rarity===journalFilter||f.spots.includes(journalFilter));
  selectedJournalFish ||= (filtered.find(f=>state.discovered[f.id])||filtered[0])?.id;
  if (!filtered.some(f=>f.id===selectedJournalFish)) selectedJournalFish=filtered[0]?.id;
  const selected=fishById(selectedJournalFish), record=state.discovered[selected?.id];
  content.innerHTML=`${panelHeading("魚類圖鑑","每次相遇都會累積熟悉度；捕獲 3 次解鎖生態筆記，5 次留下完整環境紀錄，10 次達成精通。",actions)}<div class="filter-row"><button class="filter-chip ${journalFilter==="all"?"is-active":""}" data-action="journal-filter" data-id="all">全部</button><button class="filter-chip ${journalFilter==="common"?"is-active":""}" data-action="journal-filter" data-id="common">常見</button><button class="filter-chip ${journalFilter==="uncommon"?"is-active":""}" data-action="journal-filter" data-id="uncommon">少見</button><button class="filter-chip ${journalFilter==="rare"?"is-active":""}" data-action="journal-filter" data-id="rare">稀有</button><button class="filter-chip ${journalFilter==="shore"?"is-active":""}" data-action="journal-filter" data-id="shore">近岸</button><button class="filter-chip ${journalFilter==="reef"?"is-active":""}" data-action="journal-filter" data-id="reef">礁石</button><button class="filter-chip ${journalFilter==="deep"?"is-active":""}" data-action="journal-filter" data-id="deep">深水</button></div><div class="journal-layout" style="margin-top:16px"><div class="fish-grid">${filtered.map(fish=>fishCard(fish)).join("")}</div>${selected?fishDetail(selected,record):""}</div>`;
}

function showAchievementsModal() {
  const cards=ACHIEVEMENTS.map(achievement=>{
    const progress=getAchievementProgress(state,achievement),entry=state.achievements[achievement.id];
    const stateText=entry?.claimed?"已領取":entry?"可領取":`${Math.min(progress.current,progress.goal)} / ${progress.goal}`;
    const action=entry&&!entry.claimed?`<button class="achievement-claim" data-action="claim-achievement" data-id="${achievement.id}">領取獎勵</button>`:`<span class="achievement-state">${stateText}</span>`;
    return `<article class="achievement-item ${entry?"is-complete":""} ${entry?.claimed?"is-claimed":""}" data-achievement="${achievement.id}"><div class="achievement-icon">${entry?"✦":"◇"}</div><div class="achievement-copy"><h3>${achievement.name}</h3><p>${achievement.description}</p><div class="achievement-progress"><i style="width:${Math.min(100,progress.current/progress.goal*100)}%"></i></div><small>${achievement.reward.label}</small></div>${action}</article>`;
  }).join("");
  const titles=state.unlockedTitles.map(title=>`<button class="title-chip ${state.equippedTitle===title?"is-equipped":""}" data-action="equip-title" data-id="${title}" ${state.equippedTitle===title?"disabled":""}>${state.equippedTitle===title?"✓ ":""}${title}</button>`).join("");
  const completeCount=ACHIEVEMENTS.filter(item=>state.achievements[item.id]).length;
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal achievement-modal"><div class="achievement-modal-heading"><div><span class="section-label">收藏航程</span><h2>海灣成就</h2><p class="modal-copy">永久保存、沒有期限。完成後再依自己的步調領取即可。</p></div><b>${completeCount} / ${ACHIEVEMENTS.length}</b></div><div class="achievement-list">${cards}</div><div class="title-selector"><span class="section-label">目前稱號</span><div class="title-list">${titles}</div></div><div class="modal-actions"><button class="soft-button" data-action="close-modal">關閉</button></div></div></div>`;
}

function fishCard(fish) {
  const found=state.discovered[fish.id];
  const familiarity=getFamiliarity(found?.count || 0);
  return `<button class="fish-card ${found?"":"is-unknown"} ${found?.caughtShimmer?"has-shimmer":""} ${selectedJournalFish===fish.id?"is-active":""}" data-action="select-fish" data-id="${fish.id}">${found?.caughtShimmer?'<span class="shimmer-mark" title="曾捕獲閃光個體">✦</span>':""}${fishArt(fish,!found)}<b>${found?fish.name:"未發現"}</b><small>${found?`${RARITY[fish.rarity].name} · 捕獲 ${found.count} 次`:unknownHint(fish)}</small>${found?`<span class="familiarity-chip is-${familiarity.id}">${familiarity.name}</span>`:""}</button>`;
}
function unknownHint(fish){ return fish.spots.includes("deep")?"深藍水域的神秘剪影":fish.spots.includes("reef")?"礁石間似乎有什麼身影":"近岸水光中的小小身影"; }
function formatCatchDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return "早期航海紀錄";
  return new Intl.DateTimeFormat("zh-TW", { year:"numeric", month:"short", day:"numeric" }).format(new Date(value));
}
function recordedConditionNames(record) {
  const spots=(record.spots||[]).map(id=>SPOTS.find(item=>item.id===id)?.name).filter(Boolean);
  const times=(record.times||[]).map(id=>TIMES.find(item=>item.id===id)?.name).filter(Boolean);
  const weathers=(record.weathers||[]).map(id=>({sunny:"晴朗",rain:"細雨"})[id]).filter(Boolean);
  if (!spots.length && !times.length && !weathers.length) return `<div class="fact-box">這是舊版留下的早期航海紀錄，下一次相遇後會開始記下環境。</div>`;
  return `<div class="journal-history"><div><small>曾相遇地點</small><b>${spots.join("、")||"尚未記錄"}</b></div><div><small>曾相遇時段</small><b>${times.join("、")||"尚未記錄"}</b></div><div><small>曾相遇天氣</small><b>${weathers.join("、")||"尚未記錄"}</b></div></div>`;
}
function fishDetail(fish,record) {
  if(!record) return `<aside class="card fish-detail"><div class="fish-detail-hero unknown-hero">${fishArt(fish,true)}</div><h3>尚未相遇</h3><p class="fish-detail-copy">${unknownHint(fish)}。試著改變釣點、時段或魚餌，也許下一竿就會認識牠。</p></aside>`;
  const full=record.count>=3;
  const familiarity=getFamiliarity(record.count);
  const progress=familiarity.nextCount?`${record.count} / ${familiarity.nextCount}`:"已完成全部熟悉度階段";
  return `<aside class="card fish-detail"><div class="fish-detail-hero ${record.caughtShimmer?"has-shimmer":""}">${fishArt(fish,false,record.caughtShimmer?"shimmer":"normal")}</div><h3>${fish.name}</h3><span class="latin">${fish.english} · ${fish.scientific}</span><span class="rarity-pill" style="background:${RARITY[fish.rarity].color}">${RARITY[fish.rarity].name}</span>${record.caughtShimmer?`<span class="shimmer-record">✦ 閃光紀錄 ${record.shimmerCount} 次</span>`:""}<div class="familiarity-summary"><span>${familiarity.name}</span><b>${progress}</b></div><p class="fish-detail-copy">${full?fish.detail:fish.short}</p><div class="detail-stats"><div><small>捕獲次數</small><b>${record.count}</b></div><div><small>最長紀錄</small><b>${record.bestLength} cm</b></div><div><small>最重紀錄</small><b>${record.bestWeight} kg</b></div></div><div class="catch-dates"><span>初次：${formatCatchDate(record.firstCaught)}</span><span>最近：${formatCatchDate(record.lastCaught)}</span></div>${full?`<div class="fact-box">✦ ${fish.fact}</div><div class="fact-box">推薦：${fish.baits.map(id=>baitById(id).name).join("、")} · ${fish.times.map(id=>TIMES.find(t=>t.id===id).name).join("／")}</div>`:`<div class="fact-box">再捕獲 ${3-record.count} 次，解鎖偏好魚餌、活躍時間與有趣知識。</div>`}${record.count>=5?recordedConditionNames(record):`<div class="fact-box">再捕獲 ${5-record.count} 次，整理完整的相遇地點、時段與天氣紀錄。</div>`}</aside>`;
}

function fishArt(fish,silhouette=false,variant="normal") {
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
    glow:`<path class="body" d="M21 53 Q44 25 89 35 Q107 38 119 28 L114 51 L122 74 Q105 66 90 69 Q45 82 21 53Z"/><circle class="accent" cx="48" cy="64" r="3"/><circle class="accent" cx="61" cy="67" r="3"/><circle class="accent" cx="74" cy="67" r="3"/>`,
    box:`<path class="body" d="M25 37 Q29 27 43 25 L88 28 Q103 31 109 43 L109 65 Q101 76 86 78 L43 76 Q28 72 24 59Z"/><path class="accent" d="M109 43 L127 29 L121 52 L128 75 L109 65Z"/><circle class="accent" cx="60" cy="42" r="5"/><circle class="accent" cx="78" cy="61" r="6"/>`,
    needle:`<path class="body" d="M12 49 L32 45 Q69 35 105 46 L128 31 L120 51 L128 70 L104 56 Q69 65 32 55 L12 57Z"/><path class="accent" d="M12 49 L2 52 L12 57 L38 53Z"/><path class="fin" d="M72 43 L86 31 L94 45Z"/>`
  };
  return `<div class="fish-art ${silhouette?"is-silhouette":""} ${variant==="shimmer"?"is-shimmer":""}" style="--fish-a:${fish.colors[0]};--fish-b:${fish.colors[1]}"><svg class="fish-svg" viewBox="0 0 140 105" aria-hidden="true">${paths[fish.shape]||paths.round}<circle class="eye" cx="40" cy="47" r="2.7"/><path class="shine" d="M42 37 Q58 28 76 32"/></svg></div>`;
}

function renderCatch() {
  const total=state.catchInventory.reduce((sum,item)=>sum+item.price,0);
  const aquariumCapacity=getAquariumCapacity(state), aquariumFull=state.aquarium.fish.length>=aquariumCapacity;
  const actions=state.catchInventory.length?`<button class="primary-button" data-action="sell-all">全部販售 · ${total} 金幣</button>`:"";
  content.innerHTML=`${panelHeading("今日漁獲","漁獲箱會好好保管每次相遇；可以販售，也能將喜歡的標本放進船屋水族箱。",actions)}<div class="catch-list">${state.catchInventory.length?state.catchInventory.map(caught=>{const fish=fishById(caught.fishId),isShimmer=caught.variant==="shimmer";const aquariumButton=!aquariumCapacity?`<button class="soft-button" disabled title="發現 5 種魚後解鎖">水族箱未解鎖</button>`:aquariumFull?`<button class="soft-button" data-action="show-aquarium-replace" data-id="${caught.uid}">替換展示</button>`:`<button class="soft-button" data-action="move-aquarium" data-id="${caught.uid}">放入水族箱</button>`;return `<article class="card catch-row ${isShimmer?"is-shimmer":""}">${fishArt(fish,false,caught.variant)}<div><h3>${fish.name}${isShimmer?'<span class="inline-shimmer">✦ 閃光</span>':""}</h3><div class="catch-meta"><span>${RARITY[fish.rarity].name}</span><span>${caught.length} cm</span><span>${caught.weight} kg</span><span>${sizeName(caught.sizeTier)}</span></div></div><div class="sell-one"><b>${caught.price} 金幣</b><div class="catch-actions">${aquariumButton}<button class="soft-button" data-action="sell-one" data-id="${caught.uid}">販售</button></div></div></article>`}).join(""):`<div class="empty-state"><span>⌁</span><h3>漁獲箱還空著</h3><p>回到甲板，向海灣拋下今天的第一竿吧。</p></div>`}</div>`;
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

function aquariumChoice(caught, action, extra = "") {
  const fish=fishById(caught.fishId), isShimmer=caught.variant==="shimmer";
  return `<button class="aquarium-choice ${isShimmer?"is-shimmer":""}" data-action="${action}" data-id="${caught.uid}" ${extra}>${fishArt(fish,false,caught.variant)}<span><b>${fish.name}${isShimmer?" · 閃光":""}</b><small>${caught.length} cm · ${caught.weight} kg · ${sizeName(caught.sizeTier)}</small></span></button>`;
}

function renderAquariumPanel() {
  const capacity=getAquariumCapacity(state), found=discoveredCount(state);
  if(!capacity) return `<section class="card aquarium-panel is-locked"><div class="aquarium-heading"><div><span class="section-label">海灣觀察箱</span><h3>船屋還在等待第一座水族箱</h3><p>發現 5 種魚後，會免費加入一座可展示 3 條魚的小型觀察箱。</p></div><b>${found} / 5</b></div><div class="aquarium-unlock-track"><i style="width:${Math.min(100,found/5*100)}%"></i></div></section>`;
  const displayed=state.aquarium.fish;
  const hasShimmerSpecks=state.unlockedAquariumDecor.includes("shimmer_specks");
  const shimmerSpecksActive=state.aquariumDecoration==="shimmer_specks";
  const decorToggle=hasShimmerSpecks?`<button class="aquarium-decor-toggle ${shimmerSpecksActive?"is-active":""}" data-action="toggle-aquarium-decor" title="切換成就裝飾">✦ 光點${shimmerSpecksActive?"開啟":"關閉"}</button>`:"";
  const slots=Array.from({length:capacity},(_,index)=>{
    const caught=displayed[index];
    if(!caught) return `<button class="aquarium-slot is-empty" data-action="open-aquarium-add"><span>＋</span><small>選擇標本</small></button>`;
    const fish=fishById(caught.fishId), isShimmer=caught.variant==="shimmer";
    return `<article class="aquarium-slot has-fish ${isShimmer?"is-shimmer":""}"><button class="aquarium-specimen" data-action="aquarium-view" data-id="${caught.uid}" aria-label="查看${fish.name}標本">${fishArt(fish,false,caught.variant)}<b>${fish.name}</b><small>${caught.length} cm${isShimmer?" · 閃光":""}</small></button><div class="aquarium-controls"><button data-action="aquarium-move" data-id="${index}" data-direction="-1" aria-label="向左移動" ${index===0?"disabled":""}>←</button><button data-action="aquarium-move" data-id="${index}" data-direction="1" aria-label="向右移動" ${index===displayed.length-1?"disabled":""}>→</button><button data-action="aquarium-remove" data-id="${caught.uid}">取回</button></div></article>`;
  }).join("");
  const next=AQUARIUM_CAPACITY_MILESTONES.find(item=>item.discoveries>found);
  return `<section class="card aquarium-panel"><div class="aquarium-heading"><div><span class="section-label">海灣觀察箱</span><h3>把喜歡的相遇留在船屋</h3><p>標本不需餵食，也不會消失；隨時可以免費取回漁獲箱。</p></div><div class="aquarium-heading-status"><b>${displayed.length} / ${capacity}</b>${decorToggle}</div></div><div class="aquarium-tank ${shimmerSpecksActive?"has-shimmer-specks":""}" style="--aquarium-columns:${Math.min(capacity,5)}">${slots}</div>${next?`<p class="quiet-note">發現 ${next.discoveries} 種魚後，水族箱將擴建到 ${next.capacity} 格。</p>`:`<p class="quiet-note">完成型展示箱已解鎖。</p>`}</section>`;
}

function showAquariumSelectionModal() {
  const choices=state.catchInventory.map(caught=>aquariumChoice(caught,"modal-aquarium-add")).join("");
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>選擇展示標本</h2><p class="modal-copy">放入後會從可販售的漁獲箱移至水族箱，之後仍可免費取回。</p><div class="aquarium-choice-list">${choices||'<div class="modal-empty">漁獲箱目前沒有可以展示的魚。</div>'}</div><div class="modal-actions"><button class="soft-button" data-action="close-modal">關閉</button></div></div></div>`;
}

function showAquariumReplaceModal(catchUid) {
  const incoming=state.catchInventory.find(item=>item.uid===catchUid); if(!incoming)return;
  const fish=fishById(incoming.fishId);
  const choices=state.aquarium.fish.map(caught=>aquariumChoice(caught,"modal-aquarium-replace",`data-replace="${caught.uid}" data-incoming="${catchUid}"`)).join("");
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>替換展示標本</h2><p class="modal-copy">選擇要取回漁獲箱的魚，並將「${fish.name}」放到原本的位置。</p><div class="aquarium-choice-list">${choices}</div><div class="modal-actions"><button class="soft-button" data-action="close-modal">取消</button></div></div></div>`;
}

function specimenContext(caught) {
  const context=caught.context||{};
  const spot=SPOTS.find(item=>item.id===context.spotId)?.name||"早期航海紀錄";
  const time=TIMES.find(item=>item.id===context.timeId)?.name||"未記錄";
  const weather=({sunny:"晴朗",rain:"細雨"})[context.weather]||"未記錄";
  const bait=baitById(context.baitId)?.name||"未記錄";
  const rod=rodById(context.rodId)?.name||"未記錄";
  return `<div class="specimen-context"><div><small>捕獲日期</small><b>${formatCatchDate(caught.caughtAt)}</b></div><div><small>地點</small><b>${spot}</b></div><div><small>時段／天氣</small><b>${time} · ${weather}</b></div><div><small>魚餌</small><b>${bait}</b></div><div><small>魚竿</small><b>${rod}</b></div><div><small>航海日</small><b>${context.day?`第 ${context.day} 日`:"未記錄"}</b></div></div>`;
}

function showSpecimenModal(uid) {
  const caught=state.aquarium.fish.find(item=>item.uid===uid); if(!caught)return;
  const fish=fishById(caught.fishId), isShimmer=caught.variant==="shimmer";
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal specimen-modal ${isShimmer?"is-shimmer":""}"><div class="specimen-hero">${fishArt(fish,false,caught.variant)}</div>${isShimmer?'<span class="new-ribbon is-shimmer">✦ 閃光標本</span>':""}<h2>${fish.name}</h2><p class="catch-subtitle">${fish.english}</p><div class="catch-stats"><div><small>體長</small><b>${caught.length} cm</b></div><div><small>重量</small><b>${caught.weight} kg</b></div><div><small>尺寸</small><b>${sizeName(caught.sizeTier)}</b></div></div>${specimenContext(caught)}<div class="modal-actions"><button class="soft-button" data-action="close-modal">關閉</button></div></div></div>`;
}

function finishAquariumAction(result,message) {
  if(!result.ok){toast(({locked:"發現 5 種魚後才會解鎖水族箱",full:"水族箱已滿，請選擇替換標本",missing:"找不到這份漁獲","missing-catch":"找不到要放入的漁獲","missing-aquarium":"找不到要替換的標本","invalid-index":"無法移動這個展示位置"})[result.reason]||"水族箱操作未完成");return false;}
  modalRoot.innerHTML="";sound.play("coin");saveGame();toast(message);render();notifyCompletedAchievements(result.completedAchievements);return true;
}

function renderHome() {
  content.innerHTML=`${panelHeading("我的船屋","外面是未知的海，這裡是永遠為你亮著燈的家。")}
    ${renderAquariumPanel()}<div class="home-layout"><div class="cabin-view"><div class="cabin-glow"></div><div class="cabin-window"><i class="window-rain"></i></div>${["sleep","wall","table","light","corner"].map(slot=>{const id=state.placedFurniture[slot],item=furnitureById(id);return `<button class="home-slot slot-${slot} ${item?"":"is-empty"}" data-action="slot" data-id="${slot}" title="${item?item.name:"空插槽"}">${item?`<span>${item.icon}</span>`:""}</button>`}).join("")}</div>
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
  const previousDay=state.day;
  advanceTime(state); sound.play("sleep"); saveGame(); syncWorld(); toast(`睡醒時已是${TIMES[state.timeIndex].name}${state.timeIndex===0?`，第 ${state.day} 日`:""}`);
  if(state.day!==previousDay){const event=getActiveBayEvent(state);setTimeout(()=>toast(event?`新的海況：${event.name}`:"今天的海灣潮聲平穩",event?"gold":""),360);}
  if(!state.completedTutorial&&state.tutorialStep>=5){state.completedTutorial=true;state.tutorialStep=6;saveGame();toast("教學完成。接下來，照自己的步調探索海灣吧！","gold");}
  renderHome(); updateTutorial();
}

function updateTutorial() {
  if(state.completedTutorial){tutorialEl.classList.add("is-hidden");return;}
  const messages=[
    "清晨好。先看看暖燈與海面，準備好後，點一下下方的「去釣魚」。<button class=\"tutorial-action\" data-action=\"tutorial-go-fishing\" type=\"button\">前往去釣魚</button>",
    "接著按下「拋下魚線」。魚上鉤後，按住收線讓進度前進；張力太高時放開。",
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
  let tutorialAdvanced=false;
  if(!state.completedTutorial){
    if(view==="fishing"&&state.tutorialStep===0){state.tutorialStep=1;tutorialAdvanced=true;}
    if(view==="journal"&&state.tutorialStep===2){state.tutorialStep=3;tutorialAdvanced=true;}
    if(view==="catch"&&state.tutorialStep===2){state.tutorialStep=3;tutorialAdvanced=true;}
  }
  if(tutorialAdvanced)saveGame();
  render();updateTutorial();window.scrollTo({top:0,behavior:"smooth"});
}

function sell(ids) {
  const result=sellCatches(state,ids); if(!result.sold)return;
  sound.play("coin");saveGame();toast(`販售 ${result.sold} 份漁獲，獲得 ${result.total} 金幣`);
  if(!state.completedTutorial&&state.tutorialStep<=3)state.tutorialStep=4;
  render();updateTutorial();
}

function toast(message,kind="") {
  const root=$("#toast-root"),limit=window.innerWidth<=580?2:4;
  while(root.children.length>=limit)root.firstElementChild.remove();
  const el=document.createElement("div");el.className=`toast ${kind?`is-${kind}`:""}`;el.textContent=message;root.append(el);setTimeout(()=>el.remove(),3200);
}

function notifyCompletedAchievements(achievements=[]) {
  achievements.forEach((achievement,index)=>setTimeout(()=>toast(`成就完成「${achievement.name}」：獎勵可在圖鑑領取`,"gold"),index*360));
}

function showSettings() {
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>聲音與旅程</h2><p class="modal-copy">所有音效皆由瀏覽器即時合成，不使用外部音訊素材。</p><div class="settings-row"><span>操作與捕獲音效</span><button class="toggle ${state.settings.sound?"is-on":""}" data-action="toggle-sound"><i></i></button></div><div class="modal-actions"><button class="soft-button" data-action="close-modal">關閉</button></div></div></div>`;
}
function showDeveloperLogin(error = "") {
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal developer-modal"><span class="section-label">測試工具</span><h2>開發者模式</h2><p class="modal-copy">使用獨立測試存檔進入全解鎖旅程，不會覆蓋一般航程。</p><form id="developer-login-form" class="developer-form"><label for="developer-password">開發者密碼</label><input id="developer-password" name="password" type="password" autocomplete="off" required autofocus aria-describedby="developer-login-error"><p id="developer-login-error" class="developer-error" aria-live="polite">${error}</p><div class="modal-actions"><button class="soft-button" data-action="close-modal" type="button">取消</button><button class="primary-button" type="submit">進入測試旅程</button></div></form></div></div>`;
  $("#developer-password")?.focus();
}
function showMainMenuConfirm() {
  saveGame();modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>回到主選單？</h2><p class="modal-copy">目前進度已自動儲存。海灣會在這裡等你回來。</p><div class="modal-actions"><button class="soft-button" data-action="close-modal">繼續遊玩</button><button class="primary-button" data-action="to-title">回到主選單</button></div></div></div>`;
}

document.addEventListener("click", event => {
  const target=event.target.closest("[data-action]"); if(!target)return;
  const {action,id,direction,incoming,replace}=target.dataset;
  if(action==="cast")castLine();
  if(action==="hook")startReeling();
  if(action==="reset-fishing")resetFishing();
  if(action==="spot"){state.selectedSpot=id;saveGame();renderFishing();syncWorld();}
  if(action==="claim-quest"&&claimQuest(state,id)){sound.play("coin");saveGame();toast("今日目標完成，獎勵已收入錢袋");render();}
  if(action==="close-catch"){modalRoot.innerHTML="";render();}
  if(action==="modal-journal"){modalRoot.innerHTML="";selectedJournalFish=id;setView("journal");}
  if(action==="journal-filter"){journalFilter=id;renderJournal();}
  if(action==="select-fish"){selectedJournalFish=id;renderJournal();}
  if(action==="show-achievements")showAchievementsModal();
  if(action==="claim-achievement"){
    const result=claimAchievement(state,id);
    if(result.ok){sound.play("coin");saveGame();render();toast(`已領取「${result.achievement.name}」：${result.reward.label}`,"gold");showAchievementsModal();}
  }
  if(action==="equip-title"&&equipTitle(state,id)){
    saveGame();render();toast(`目前稱號已改為「${id}」`);showAchievementsModal();
  }
  if(action==="sell-one")sell([id]);
  if(action==="sell-all")sell(state.catchInventory.map(item=>item.uid));
  if(action==="move-aquarium"){
    const result=moveCatchToAquarium(state,id);
    finishAquariumAction(result,result.ok?`${fishById(result.caught.fishId).name}已放入水族箱`:"");
  }
  if(action==="show-aquarium-replace")showAquariumReplaceModal(id);
  if(action==="open-aquarium-add")showAquariumSelectionModal();
  if(action==="modal-aquarium-add"){
    const result=moveCatchToAquarium(state,id);
    finishAquariumAction(result,result.ok?`${fishById(result.caught.fishId).name}已放入水族箱`:"");
  }
  if(action==="modal-aquarium-replace"){
    const result=replaceAquariumFish(state,incoming,replace);
    finishAquariumAction(result,result.ok?`${fishById(result.incoming.fishId).name}已換入水族箱`:"");
  }
  if(action==="aquarium-remove"){
    const result=removeFishFromAquarium(state,id);
    finishAquariumAction(result,result.ok?`${fishById(result.caught.fishId).name}已取回漁獲箱`:"");
  }
  if(action==="aquarium-move"){
    const from=Number(id),to=from+Number(direction),result=swapAquariumFish(state,from,to);
    finishAquariumAction(result,"展示順序已調整");
  }
  if(action==="aquarium-view")showSpecimenModal(id);
  if(action==="toggle-aquarium-decor"){
    const next=state.aquariumDecoration==="shimmer_specks"?null:"shimmer_specks";
    if(setAquariumDecoration(state,next)){saveGame();renderHome();toast(next?"水族箱已亮起拾光微粒":"水族箱裝飾已關閉");}
  }
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
  if(action==="tutorial-go-fishing")setView("fishing");
  if(action==="toggle-sound"){state.settings.sound=!state.settings.sound;saveGame();showSettings();syncWorld();if(state.settings.sound){sound.play("coin");sound.startAmbient();}else sound.stopAmbient();}
  if(action==="close-modal")modalRoot.innerHTML="";
  if(action==="to-title"){clearFishing();sound.stopAmbient();modalRoot.innerHTML="";gameShell.classList.add("is-hidden");titleScreen.classList.remove("is-hidden");app.classList.remove("is-developer-mode");$("#continue-button").disabled=!hasSave("normal");}
});

document.addEventListener("submit",event=>{
  if(event.target.id!=="developer-login-form")return;
  event.preventDefault();
  const password=new FormData(event.target).get("password");
  if(password!==DEVELOPER_PASSWORD){showDeveloperLogin("密碼不正確，請再試一次。");return;}
  modalRoot.innerHTML="";
  startGame(false,"developer");
  toast("開發者模式已啟用：全部內容與測試資源已解鎖","gold");
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
$("#continue-button").addEventListener("click",()=>startGame(false,"normal"));
$("#new-game-button").addEventListener("click",()=>{
  if(hasSave("normal")) modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>展開新旅程？</h2><p class="modal-copy">這會替換目前的航海紀錄與備份存檔。</p><div class="modal-actions"><button class="soft-button" data-action="close-modal">取消</button><button id="confirm-new" class="danger-button">開始新遊戲</button></div></div></div>`,$("#confirm-new").addEventListener("click",()=>{modalRoot.innerHTML="";startGame(true,"normal")}); else startGame(true,"normal");
});
$("#developer-mode-button").addEventListener("click",()=>showDeveloperLogin());
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

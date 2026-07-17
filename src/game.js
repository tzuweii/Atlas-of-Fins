import {
  ACHIEVEMENTS, AQUARIUM_CAPACITY_MILESTONES, BAITS, BAY_EVENTS, CHART_REGION_POINTS, CHART_ROUTE_PATHS,
  CHENGYE_ID, COMMISSION_TEMPLATES, CONTENT_VALIDATION, DAILY_GOAL_TEMPLATES, FISH, FURNITURE,
  JOURNAL_ENTRY_TYPE_LABELS, JOURNAL_EVENT_TEMPLATES, MILESTONES,
  LUMINOUS_ARCHIPELAGO_ID, OBSERVATION_SUBJECTS, RARITY, REGIONS, RESEARCH_NODES, RESIDENTS, RODS,
  SHIPS, SHIP_INTERIOR_SCENES, SHIP_LIGHTING, SHIP_SLOT_TYPES, SLEEPING_TIDE_BAY_ID, SPOTS, TIDEGLOW_SOURCES, TIMES, WONDERS,
  fishAssetSrcSet, getFishHabitat, getResidentCommissionTemplates, getRegionFishingSpots, getRegionObservationSpots,
  regionById, resolveFishAsset, residentById, routeById, shipById
} from "./data.js";
import {
  BACKUP_KEY, CHART_VIEW_LIMITS, DEVELOPER_TRAVEL_SCALES, DEV_BACKUP_KEY, DEV_SAVE_KEY, DEV_TEMP_SAVE_KEY,
  SAVE_KEY, SAVE_VERSION, TEMP_SAVE_KEY,
  acceptResidentCommission, activeShip, activeShipSpeed, activeShipFurnitureCatalog, advanceResidentStory, advanceTime,
  applyMilestones, baitById, beginRouteTravel, buyBait, buyRod, buyShip, buyShipFurniture, chooseFish, claimAchievement,
  claimAllCompletedDailyGoals, claimQuest, createDeveloperState, createInitialState, deliverResidentCommission,
  developerArriveTravel, developerClearResidentCommissionHistory, developerCompleteDailyGoals,
  developerCompleteRegionResearch, developerCompleteResidentCommission, developerRecordObservation,
  developerResetChengyeStory, developerResetDailyBoard, developerResetObservations, developerResetRouteState,
  developerDockRegion, developerSetDailyGoal, developerSetRegionEvent, developerSetResidentOffer,
  developerSetTravelScale, developerAdjustTideglow, developerEmitTideglowEvent,
  developerClearActiveShipFurniture, developerEmitJournalEvent, developerFillActiveShipFurniture,
  developerFillJournalArchive, developerResetActiveShipSlots,
  developerRevealShips, developerSetActiveShipLighting, developerSetShipOwned, developerSetShipSpeed, discoveredCount,
  dockAtDestination, dropResidentCommission, equipTitle, filterJournalEntries, fishById,
  furnitureById, generateCatch, getAchievementProgress, getActiveBayEvent, getActiveBayEventState,
  getAquariumCapacity, getBayEventHint, getFamiliarity, getObservationHint,
  getRegionResearchStatus, getResidentStoryStatus, getShipPurchaseState,
  getRouteDurationForState, getTensionConfig, getTravelStatus, getUnclaimedAchievementCount, isUnlocked,
  markJournalEntriesRead, acknowledgeJournalNotices, migrateState, moveCatchToAquarium,
  isBayEventConditionActive, isCurrentSaveSchema, observeAtSpot, recordCatch, removeFishFromAquarium, replaceAquariumFish, rodById, sellCatches,
  normalizeChartView, panChartView, placeShipFurniture, progressTravel, setAquariumDecoration, shipInterior,
  swapAquariumFish, switchActiveShip, collectInvalidInteriorReferences,
  zoomChartView
} from "./core.js";
import { loadStoredState, writeStoredState } from "./persistence/migrations.js";
import { createPortableSave, parsePortableSave } from "./persistence/portable-save.js";
import {
  TEXT_SCALE_OPTIONS, UI_SCALE_OPTIONS, displayScaleValue, normalizeDisplaySettings
} from "./systems/accessibility.js";
import { applyContentValidationGate, renderContentValidationReport } from "./ui/content-error-view.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const app = $("#app");
const titleScreen = $("#title-screen");
const gameShell = $("#game-shell");
const content = $("#content-panel");
const modalRoot = $("#modal-root");
const tutorialEl = $("#tutorial");
const escapeText = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

let state = createInitialState();
let currentView = "fishing";
let activeSaveMode = "normal";
let journalFilter = "all";
let selectedJournalFish = null;
let logbookFilter = { type: "all", value: null };
let selectedLogbookEntryId = null;
let shopTab = "rods";
let chartPointer = null;
let chartSaveTimer = null;
let travelClockTimer = null;
let lastPersistedTravelElapsed = 0;
let preserveBackupOnNextSave = false;
let shouldRewriteLoadedSave = false;
let pendingPortableImport = null;
let shipTransitionTimer = null;
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
      const region = regionById(state.world?.currentRegionId);
      const luminous = region?.musicId === "windglass_current";
      const notes = luminous
        ? (time === "night" || state.weather === "rain" ? [246, 329, 415] : time === "dusk" ? [293, 392, 523] : [329, 440, 554])
        : time === "dusk" ? [293, 369, 440] : (time === "night" || state.weather === "rain") ? [220, 277, 330] : [261, 329, 392];
      notes.forEach((note, index) => this.tone(note, 2.8, luminous && index === 2 ? "triangle" : index === 1 ? "triangle" : "sine", .007, index * .42));
      if (region?.ambientId === "coral_wind_chimes") this.tone(notes[2] * 2, 1.4, "sine", .0035, 1.45);
    };
    playPhrase();
    this.ambientTimer = setInterval(playPhrase, 7200);
  }
  stopAmbient() { clearInterval(this.ambientTimer); this.ambientTimer = null; }
}
const sound = new Sound();

const DEVELOPER_PASSWORD = "atlas-dev";
const PREFERENCES_KEY = "atlas-of-fins.preferences";

function saveKeys(mode = activeSaveMode) {
  return mode === "developer"
    ? [DEV_SAVE_KEY, DEV_BACKUP_KEY, DEV_TEMP_SAVE_KEY]
    : [SAVE_KEY, BACKUP_KEY, TEMP_SAVE_KEY];
}
function gameIsActive() { return !gameShell.classList.contains("is-hidden"); }
function loadPreferences(fallback = state.settings) {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "null");
    return normalizeDisplaySettings(saved || fallback);
  } catch { return normalizeDisplaySettings(fallback); }
}
function savePreferences() {
  try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(normalizeDisplaySettings(state.settings))); }
  catch { /* the active save still retains the same settings */ }
}
function applyDisplaySettings() {
  state.settings = normalizeDisplaySettings(state.settings);
  app.dataset.textScale = state.settings.textScale;
  app.dataset.uiScale = state.settings.uiScale;
  app.style.setProperty("--text-scale", displayScaleValue(TEXT_SCALE_OPTIONS, state.settings.textScale));
  app.style.setProperty("--ui-scale", displayScaleValue(UI_SCALE_OPTIONS, state.settings.uiScale));
}
function persistDisplaySettings() {
  state.settings = normalizeDisplaySettings(state.settings);
  savePreferences();
  applyDisplaySettings();
  if (gameIsActive()) saveGame();
}
function hasSave(mode = "normal") {
  const [primaryKey, backupKey] = saveKeys(mode);
  return Boolean(localStorage.getItem(primaryKey) || localStorage.getItem(backupKey));
}
function saveGame(showToast = false) {
  try {
    const [primaryKey, backupKey, temporaryKey] = saveKeys();
    state.lastSavedAt = new Date().toISOString();
    const result = writeStoredState(localStorage, state, {
      primaryKey,
      backupKey,
      temporaryKey,
      preserveBackup: preserveBackupOnNextSave,
      validate: isCurrentSaveSchema
    });
    if (!result.ok) throw new Error(result.reason);
    preserveBackupOnNextSave = false;
    shouldRewriteLoadedSave = false;
    lastPersistedTravelElapsed = getTravelStatus(state.world)?.elapsedMs || 0;
    if (showToast) toast(activeSaveMode === "developer" ? "開發者測試紀錄已儲存" : "航海日誌已妥善收好");
    return true;
  } catch {
    if (showToast) toast("無法使用本機存檔，請檢查瀏覽器設定");
    return false;
  }
}
function loadGame() {
  const [primaryKey, backupKey, temporaryKey] = saveKeys();
  try {
    const loaded = loadStoredState(localStorage, {
      primaryKey,
      backupKey,
      temporaryKey,
      targetVersion: SAVE_VERSION,
      migrate: migrateState,
      requiresMigration: raw => !isCurrentSaveSchema(raw)
    });
    if (loaded) {
      preserveBackupOnNextSave = loaded.preserveBackupOnWrite;
      shouldRewriteLoadedSave = loaded.shouldRewritePrimary;
      return loaded.state;
    }
  } catch { /* keep the original save untouched and fall back safely */ }
  return activeSaveMode === "developer" ? createDeveloperState() : createInitialState();
}

function startGame(isNew = false, mode = "normal") {
  if (!CONTENT_VALIDATION.ok) {
    renderContentValidationReport(CONTENT_VALIDATION, modalRoot);
    return;
  }
  activeSaveMode = mode;
  journalFilter = "all";
  selectedJournalFish = null;
  logbookFilter = { type: "all", value: null };
  selectedLogbookEntryId = null;
  preserveBackupOnNextSave = false;
  shouldRewriteLoadedSave = false;
  if (isNew) {
    state = mode === "developer" ? createDeveloperState() : createInitialState();
    const [primaryKey, backupKey, temporaryKey] = saveKeys();
    localStorage.removeItem(primaryKey); localStorage.removeItem(backupKey); localStorage.removeItem(temporaryKey);
    saveGame();
  } else {
    state = loadGame();
    const travelUpdate = progressTravel(state, Date.now());
    if (!hasSave(mode) || shouldRewriteLoadedSave || travelUpdate.changed) saveGame();
  }
  state.settings = normalizeDisplaySettings({ ...state.settings, ...loadPreferences(state.settings) });
  savePreferences();
  applyDisplaySettings();
  titleScreen.classList.add("is-hidden");
  gameShell.classList.remove("is-hidden");
  app.classList.toggle("is-developer-mode", mode === "developer");
  currentView = "fishing";
  syncTravelClock(); syncWorld(); render(); updateTutorial(); sound.startAmbient();
  setTimeout(flushJournalNotices,80);
}

function syncWorld() {
  applyDisplaySettings();
  const time = TIMES[state.timeIndex];
  app.dataset.time = time.id; app.dataset.weather = state.weather;
  const sceneRegionId = state.world?.docking?.status === "offshore"
    ? state.world.docking.regionId
    : state.world?.currentRegionId || SLEEPING_TIDE_BAY_ID;
  app.dataset.region = sceneRegionId;
  const currentShip = activeShip(state);
  app.dataset.ship = currentShip.id;
  $(".boat-scene")?.setAttribute("data-ship", currentShip.id);
  $(".boat-scene")?.setAttribute("aria-label", `${currentShip.name}的船身`);
  $("#time-icon").textContent = time.icon; $("#time-label").textContent = `${time.name} · 第 ${state.day} 日`;
  $("#weather-icon").textContent = state.weather === "rain" ? "☂" : "☀";
  $("#weather-label").textContent = state.weather === "rain" ? "細雨" : "晴朗";
  $("#money-label").textContent = state.money.toLocaleString("zh-TW");
  $("#tideglow-label").textContent = (state.tideglow?.total || 0).toLocaleString("zh-TW");
  const unclaimed=getUnclaimedAchievementCount(state);
  $("#journal-badge").textContent = `${discoveredCount(state)}/${FISH.length}${unclaimed?` · ${unclaimed}`:""}`;
  $("#journal-badge").title = unclaimed?`${unclaimed} 項成就獎勵待領取`:"圖鑑探索進度";
  $("#catch-badge").textContent = state.catchInventory.length;
  const journalUnread=state.journal?.unreadEntryIds?.length||0;
  const logbookBadge=$("#logbook-badge");
  if(logbookBadge){logbookBadge.hidden=!journalUnread;logbookBadge.textContent=journalUnread>9?"9+":String(journalUnread);logbookBadge.title=`航海日誌有 ${journalUnread} 篇未讀`;}
  const activeCommission = state.residentCommissions?.active;
  const storyReady = RESIDENTS.some(resident => resident.regionId === state.world?.currentRegionId
    && getResidentStoryStatus(state, resident.id).nextAvailable);
  $("#resident-badge").hidden = !activeCommission && !storyReady;
  $("#resident-badge").textContent = activeCommission
    ? activeCommission.progress >= activeCommission.goal ? "可交付" : "進行中"
    : "新相遇";
  $("#developer-tools-button").hidden = activeSaveMode !== "developer";
  $("#sound-button").textContent = state.settings.sound ? "♪" : "×";
  const luminousSail = Object.values(state.world?.regionProgress || {})
    .some(progress => progress.researchRewardIds?.includes("luminous_sail_pattern"));
  $("#sail-emblem").textContent = luminousSail ? "✧" : state.completedMilestones.includes(30) ? "✺" : state.completedMilestones.includes(20) ? "✦" : "◌";
  $(".brand-mini small").textContent = activeSaveMode === "developer" ? `開發者模式 · ${state.equippedTitle}` : state.equippedTitle;
  const spot = SPOTS.find(item => item.id === state.selectedSpot && item.regionId === state.world?.currentRegionId);
  const bayEvent = isDockedAt(state.world?.currentRegionId) ? getActiveBayEvent(state) : null;
  app.dataset.bayEvent = bayEvent?.id || "";
  const travelStatus = getTravelStatus(state.world);
  const offshoreRegion = state.world?.docking?.status === "offshore" ? regionById(state.world.docking.regionId) : null;
  const currentRegion = regionById(state.world?.currentRegionId);
  $("#world-scene").setAttribute("aria-label", `${regionById(sceneRegionId)?.name || "海上"}景色`);
  const sceneTitle = travelStatus
    ? `航向${regionById(travelStatus.travel.toRegionId)?.name || "遠方海域"}`
    : offshoreRegion ? `${offshoreRegion.name}外海` : spot?.name || currentRegion?.portName || "船屋甲板";
  const sceneLine = travelStatus
    ? `第 ${travelStatus.segment} / ${travelStatus.totalSegments} 段 · ${formatTravelTime(travelStatus.remainingMs)}後抵達外海`
    : offshoreRegion ? "船已收帆，等待你決定何時停泊。"
      : spot?.description || (currentRegion?.id === LUMINOUS_ARCHIPELAGO_ID ? "暖流把碎光送過島鏈，風鈴般的潮聲從遠處傳來。" : time.line);
  $("#scene-caption").innerHTML = `<span>${sceneTitle}</span><small>${sceneLine}</small>${bayEvent ? `<em>${bayEvent.icon} ${bayEvent.name}</em>` : ""}`;
  const chartBadge = $("#chart-badge");
  if (chartBadge) chartBadge.textContent = travelStatus ? `${travelStatus.segment}/${travelStatus.totalSegments}` : offshoreRegion ? "停泊" : "航路";
}

function render() {
  syncWorld();
  $$(".nav-button").forEach(button => button.classList.toggle("is-active", button.dataset.view === currentView));
  if (currentView === "fishing") renderFishing();
  if (currentView === "journal") renderJournal();
  if (currentView === "catch") renderCatch();
  if (currentView === "shop") renderShop();
  if (currentView === "residents") renderResidents();
  if (currentView === "chart") renderChart();
  if (currentView === "home") renderHome();
}

function panelHeading(title, subtitle, actions = "") {
  return `<div class="panel-heading"><div><h2>${title}</h2><p>${subtitle}</p></div>${actions ? `<div class="panel-heading-actions">${actions}</div>` : ""}</div>`;
}

function formatTravelTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil((Number(milliseconds) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function shipMiniature(ship, label = "") {
  return `<span class="ship-miniature is-${ship.silhouette}" aria-hidden="true"><i></i><b></b></span>${label ? `<span class="visually-hidden">${label}</span>` : ""}`;
}

function beginShipTransition(message) {
  clearTimeout(shipTransitionTimer);
  app.classList.remove("is-switching-ship");
  void app.offsetWidth;
  app.classList.add("is-switching-ship");
  saveGame();
  syncWorld();
  render();
  shipTransitionTimer = setTimeout(() => app.classList.remove("is-switching-ship"), 820);
  sound.play("coin");
  toast(message, "gold");
  setTimeout(flushJournalNotices,0);
}

function formatTravelMinutes(milliseconds) {
  if ((Number(milliseconds) || 0) < 60000) return "少於 1 分鐘（測試）";
  const minutes = Math.max(1, Math.round((Number(milliseconds) || 0) / 60000));
  return `約 ${minutes} 分鐘`;
}

function refreshTravelIndicators() {
  const status = getTravelStatus(state.world);
  if (!status) return;
  $$('[data-travel-remaining]').forEach(node => { node.textContent = formatTravelTime(status.remainingMs); });
  $$('[data-travel-segment]').forEach(node => { node.textContent = `${status.segment} / ${status.totalSegments}`; });
  $$('[data-travel-progress]').forEach(node => { node.style.width = `${Math.min(100, status.progress * 100)}%`; });
  const ship = $("#chart-ship-marker");
  if (ship) {
    const position = chartShipPosition();
    ship.style.left = `${position.x}%`;
    ship.style.top = `${position.y}%`;
  }
  syncWorld();
}

function travelClockTick({ forceSave = false } = {}) {
  const result = progressTravel(state, Date.now());
  if (!result.ok) return result;
  if (result.arrived) {
    saveGame();
    syncTravelClock();
    render();
    toast(`已抵達${regionById(result.destinationId)?.name || "目的地"}外海。想準備好時，再按下停泊。`, "gold");
    return result;
  }
  const status = getTravelStatus(state.world);
  if (result.changed && (forceSave || Math.abs((status?.elapsedMs || 0) - lastPersistedTravelElapsed) >= 15000)) saveGame();
  refreshTravelIndicators();
  return result;
}

function syncTravelClock() {
  clearInterval(travelClockTimer);
  travelClockTimer = null;
  const status = getTravelStatus(state.world);
  lastPersistedTravelElapsed = status?.elapsedMs || 0;
  if (status) travelClockTimer = setInterval(() => travelClockTick(), 1000);
}

function renderVoyageStateCard() {
  const status = getTravelStatus(state.world);
  if (status) {
    const destination = regionById(status.travel.toRegionId);
    const voyageShip = shipById(status.travel.shipId) || activeShip(state);
    return `<article class="card voyage-state-card is-traveling"><div class="voyage-ship-heading">${shipMiniature(voyageShip, voyageShip.name)}<span><small>${voyageShip.name}</small><b>${status.route.name}</b></span></div><h3>順著暖流前往${destination?.name || "目的地"}</h3><p>這一航段以 ${status.travel.speedMultiplier?.toFixed(2) || "1.00"}× 航速鎖定。船屋、圖鑑與古海圖都能照常查看。</p><div class="voyage-time"><b data-travel-remaining>${formatTravelTime(status.remainingMs)}</b><span>第 <i data-travel-segment>${status.segment} / ${status.totalSegments}</i> 段</span></div><div class="progress-track voyage-progress"><i data-travel-progress style="width:${status.progress * 100}%"></i></div><button class="soft-button" data-action="open-chart">在古海圖上查看船位</button></article>`;
  }
  if (state.world?.docking?.status === "offshore") {
    const destination = regionById(state.world.docking.regionId);
    return `<article class="card voyage-state-card is-offshore"><span class="section-label">已抵達外海</span><h3>${destination?.name || "目的地"}就在前方</h3><p>船已安靜收帆。沒有倒數，也不會自行進港；準備好後再由你決定停泊。</p><button class="primary-button" data-action="dock-arrival">停泊${destination?.portName ? ` · ${destination.portName}` : ""}</button></article>`;
  }
  const region = regionById(state.world?.currentRegionId);
  return `<article class="card voyage-state-card is-port-preview"><span class="section-label">港口外圍調查</span><h3>${region?.name || "這片海域"}目前沒有可用釣點</h3><p>可以先整理船屋與圖鑑，或從古海圖安全前往其他已完成海域。</p><button class="soft-button" data-action="open-chart">查看航線</button></article>`;
}

function renderFishing() {
  const docked = state.world?.docking?.status === "docked" && state.world.docking.regionId === state.world.currentRegionId;
  const regionSpots = docked ? getRegionFishingSpots(state.world.currentRegionId) : [];
  if (!docked || !regionSpots.length) {
    if (fishing.phase !== "idle") { clearFishing(); fishing.phase = "idle"; }
    content.innerHTML = `${panelHeading("航程甲板", "遠航期間不必守著畫面。可以關閉遊戲，也可以留在船上整理自己的收藏。")}<div class="fishing-layout"><div>${renderVoyageStateCard()}</div><div class="fishing-side">${renderQuests()}</div></div>`;
    return;
  }
  if (!regionSpots.some(spot => spot.id === state.selectedSpot)) state.selectedSpot = regionSpots[0].id;
  const currentRegion = regionById(state.world.currentRegionId);
  const rod = rodById(state.equippedRod), bait = baitById(state.equippedBait);
  const fishArea = fishing.phase === "idle" ? `
    <div class="cast-area"><p>${state.baitAmounts[state.equippedBait] ? "選好了嗎？海面正在等著你的下一竿。" : "這種魚餌用完了，去商店補充或換一種吧。"}</p>
      <button class="primary-button cast-button" data-action="cast" ${state.baitAmounts[state.equippedBait] ? "" : "disabled"}>拋下魚線</button></div>` : renderFishingStage();
  content.innerHTML = `${panelHeading(currentRegion?.id === LUMINOUS_ARCHIPELAGO_ID ? "琉光群島釣行" : "去釣魚", `從${currentRegion?.portName || "港口"}選擇釣點與裝備，放慢呼吸，感受魚線傳來的動靜。`)}
    <div class="fishing-layout"><div class="card fishing-main">
      <span class="section-label">選擇釣點</span><div class="spot-grid">${regionSpots.map(spot => {
        const locked = spot.requires && !state.ownedRods.includes(spot.requires);
        return `<button class="spot-card ${state.selectedSpot === spot.id ? "is-active" : ""}" data-action="spot" data-id="${spot.id}" ${locked || fishing.phase !== "idle" ? "disabled" : ""}><span class="spot-icon">${locked ? "⌑" : spot.icon}</span><b>${spot.name}</b><small>${locked ? "需要強化遠投竿" : spot.hint}</small></button>`;
      }).join("")}</div>
      <div class="loadout"><label><span class="section-label">魚竿</span><span class="select-wrap"><select data-action="equip-rod" ${fishing.phase !== "idle" ? "disabled" : ""}>${state.ownedRods.map(id => { const item=rodById(id); return `<option value="${id}" ${id===state.equippedRod?"selected":""}>${item.name}</option>`}).join("")}</select></span><div class="bait-stock">安全區寬度 ${Math.round(rod.tolerance*100)}%</div></label>
      <label><span class="section-label">魚餌</span><span class="select-wrap"><select data-action="equip-bait" ${fishing.phase !== "idle" ? "disabled" : ""}>${BAITS.filter(item=>isUnlocked(item,state)).map(item=>`<option value="${item.id}" ${item.id===state.equippedBait?"selected":""}>${item.name} × ${state.baitAmounts[item.id]||0}</option>`).join("")}</select></span><div class="bait-stock">${bait.description}</div></label></div>${fishArea}
    </div><div class="fishing-side">${renderObservationPreview()}${renderResearchPanel()}${renderBayEvent()}${renderQuests()}</div></div>`;
  if (fishing.phase === "reeling") bindReelButton();
}

function renderBayEvent() {
  const event = getActiveBayEvent(state);
  if (!event) return `<aside class="card bay-event-card is-quiet" data-bay-event="quiet"><span class="section-label">今日海況</span><h3>潮聲平穩</h3><p>今天沒有特殊海灣事件。照自己的步調選擇釣點，或整理尚未完成的收藏目標。</p><span class="bay-event-status">平靜日</span></aside>`;
  const current = getActiveBayEventState(state);
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
  return `<aside class="card bay-event-card ${complete ? "is-complete" : ""} ${!complete&&!activeNow ? "is-inactive" : ""}" data-bay-event="${event.id}"><div class="bay-event-heading"><span>${event.icon}</span><div><span class="section-label">${regionById(event.regionId)?.name || "海域"}事件 · 第 ${state.day} 日</span><h3>${event.name}</h3></div></div><p>${event.description}</p><div class="bay-event-effect"><small>魚群變化 · ${conditions}</small><b>${spots || "指定釣點"} · ${targets}權重 ×${event.fishWeightMultiplier}</b></div><div class="bay-event-objective"><div><span>${complete ? "✓ " : ""}${event.objective}</span><b>${progress} / ${event.goal}</b></div><div class="progress-track"><i style="width:${Math.min(100, progress / event.goal * 100)}%"></i></div><p>${getBayEventHint(state)}</p></div><span class="bay-event-status">${status}</span></aside>`;
}

function renderQuests() {
  return `<aside class="card quest-card"><span class="section-label">第 ${state.dailyBoard.day} 日</span><h3>今日的小小目標</h3>${state.dailyBoard.entries.map(quest => {
    const complete = quest.progress >= quest.goal;
    return `<div class="quest-item"><div class="quest-top"><span>${quest.claimed ? "✓ " : ""}${quest.text}</span><span>${rewardLabel(quest.reward)}</span></div><div class="progress-track"><i style="width:${Math.min(100,quest.progress/quest.goal*100)}%"></i></div>${complete&&!quest.claimed?`<button class="quest-claim" data-action="claim-quest" data-id="${quest.instanceId}">領取獎勵</button>`:`<div class="quiet-note">${Math.floor(quest.progress)} / ${quest.goal}</div>`}</div>`;
  }).join("")}<p class="quiet-note">沒有倒數，也沒有逾期懲罰。想做的時候再做就好。</p></aside>`;
}

function rewardLabel(reward) {
  if (reward?.label) return reward.label;
  if (reward?.type === "coins") return `${reward.amount} 金幣`;
  if (reward?.type === "bait") return `${baitById(reward.baitId)?.name || "魚餌"} ${reward.amount} 份`;
  return "一份小禮物";
}

function isDockedAt(regionId) {
  return state.world?.currentRegionId === regionId
    && state.world?.docking?.status === "docked"
    && state.world.docking.regionId === regionId;
}

function residentCard(resident) {
  const active = state.residentCommissions.active?.residentId === resident.id ? state.residentCommissions.active : null;
  const offer = state.residentCommissions.offersByResident?.[resident.id];
  const history = state.residentCommissions.history?.[resident.id];
  const anotherActive = state.residentCommissions.active && !active;
  let commission = `<div class="commission-panel"><p class="quiet-note">今天沒有新的提案。放下的委託會等到下一個航海日再更新。</p></div>`;
  if (offer) {
    commission = `<div class="commission-panel"><span class="section-label">今日提案</span><h4>${offer.title}</h4><p>${offer.description}</p><div class="commission-meta"><span>獎勵 ${rewardLabel(offer.reward)}</span><span>0 / ${offer.goal}</span></div><div class="resident-actions"><button class="primary-button" data-action="accept-commission" data-id="${resident.id}" ${anotherActive ? "disabled" : ""}>${anotherActive ? "已有進行中的委託" : "接受委託"}</button></div></div>`;
  }
  if (active) {
    const complete = active.progress >= active.goal;
    commission = `<div class="commission-panel"><span class="section-label">${complete ? "可以交付" : "慢慢進行中"}</span><h4>${active.title}</h4><p>${active.description}</p><div class="commission-meta"><span>獎勵 ${rewardLabel(active.reward)}</span><span>${Math.floor(active.progress)} / ${active.goal}</span></div><div class="progress-track"><i style="width:${Math.min(100,active.progress/active.goal*100)}%"></i></div><div class="resident-actions">${complete ? `<button class="primary-button" data-action="deliver-commission" data-id="${resident.id}">當面交付</button>` : ""}<button class="soft-button" data-action="drop-commission">放下委託</button></div></div>`;
  }
  const dialogue = active ? (active.progress >= active.goal ? resident.dialogue.ready : resident.dialogue.active) : offer ? resident.dialogue.offer : resident.dialogue.greeting;
  const story = getResidentStoryStatus(state, resident.id);
  const storyPanel = story.scenes.length ? `<div class="resident-story-panel ${story.complete ? "is-complete" : ""}"><span class="section-label">港口相遇 · ${story.completedSceneIds.length} / ${story.scenes.length}</span><h4>${story.complete ? "故事留在風棲港" : story.nextAvailable ? story.nextScene.title : "下一頁還在海上"}</h4><p>${story.complete ? "澄野的手繪黑潮生態圖已收進旅程紀念；她仍會在觀測棚整理日常紀錄。" : story.nextAvailable ? "這段相遇已隨你的真實旅程自然亮起。" : "正常釣魚、觀察與研究即可推進；委託次數不影響故事。"}</p></div>` : "";
  const talkLabel = story.nextAvailable ? "繼續這段相遇" : "聊一會兒";
  const journalLink=filterJournalEntries(state.journal,"resident",resident.id).length?`<button class="soft-button" data-action="show-logbook" data-filter="resident" data-id="${resident.id}">居民日誌</button>`:"";
  return `<article class="card resident-card" data-resident="${resident.id}"><div class="resident-heading"><span class="resident-icon">${resident.icon}</span><div><h3>${resident.name}</h3><p>${resident.role} · ${resident.portLocationName}</p></div></div><p class="resident-dialogue">「${dialogue}」</p>${storyPanel}${commission}<div class="resident-actions"><button class="soft-button" data-action="talk-resident" data-id="${resident.id}">${talkLabel}</button>${journalLink}<span class="quiet-note">已完成 ${history?.completions || 0} 次當地委託</span></div></article>`;
}

function renderResidents() {
  const regionId = state.world?.currentRegionId;
  const residents = RESIDENTS.filter(resident => resident.regionId === regionId);
  const docked = isDockedAt(regionId);
  const body = docked && residents.length
    ? `<div class="resident-grid">${residents.map(residentCard).join("")}</div>`
    : docked
      ? `<div class="card resident-empty"><span class="resident-icon">⌂</span><h3>港口居民仍在準備相遇</h3><p class="modal-copy">${regionById(regionId)?.name || "這座港口"}的澄野相遇、研究與當地委託會在 Slice G 接上。現在不會從其他海域遠端出現。</p></div>`
      : `<div class="card resident-empty"><span class="resident-icon">⌂</span><h3>先回港停泊</h3><p class="modal-copy">居民只在自己的港口生活，不會跨海追蹤旅程。回到有效港口後再來聊聊吧。</p></div>`;
  content.innerHTML = `${panelHeading("港口居民", "沒有好感度、連續拜訪或期限。接受後的委託會安靜保留，直到你回來交付或自行放下。")} ${body}`;
}

function renderObservationPreview() {
  const spots = getRegionObservationSpots(state.world?.currentRegionId);
  if (!spots.length) return "";
  const spot = spots[0];
  const subjects = OBSERVATION_SUBJECTS.filter(subject => subject.spotId === spot.id);
  const observed = subjects.filter(subject => state.observations?.recordsById?.[subject.id]);
  const wonders = WONDERS.filter(wonder => wonder.spotId === spot.id && state.observations?.wonderRecordsById?.[wonder.id]);
  const hint = getObservationHint(state.observations, spot.id, {
    timeId: TIMES[state.timeIndex].id,
    weatherId: state.weather
  });
  return `<aside class="card observation-preview" data-observation-spot="${spot.id}"><div class="observation-preview-heading"><span>${spot.icon}</span><div><span class="section-label">特殊觀察點 · ${observed.length} / ${subjects.length}</span><h3>${spot.name}</h3></div></div><p>${spot.description}</p><div class="observation-hint"><b>今天的線索</b><span>${hint}</span></div>${observed.length ? `<div class="observation-record-chips">${observed.map(subject => `<span>${subject.icon} ${subject.name}</span>`).join("")}</div>` : ""}${wonders.length ? `<small>留下的奇景照片：${wonders.map(wonder => wonder.name).join("、")}</small>` : ""}<button class="soft-button" data-action="preview-observation" data-id="${spot.id}">安靜觀察一個時段</button><small>不拋竿、不耗餌，也不需快速點擊；同一時段只留下一次完整觀察。</small></aside>`;
}

function renderResearchPanel() {
  const status = getRegionResearchStatus(state, state.world?.currentRegionId);
  if (!status) return "";
  const completed = new Set(status.completedNodeIds);
  const mainGoal = status.research.mainSpeciesGoal;
  const fullGoal = status.research.fullSpeciesGoal;
  const rewardLine = status.fullComplete
    ? "區域完整 · 徽章與琉光船帆紋樣已收好"
    : status.mainComplete
      ? `主研究完成 · 再遇見 ${Math.max(0, fullGoal - status.speciesCount)} 種可取得完整外觀紀念`
      : `發現 ${Math.min(status.speciesCount, mainGoal)} / ${mainGoal} 種即可完成主研究`;
  return `<aside class="card research-card" data-research-region="${status.research.regionId}"><div class="research-heading"><div><span class="section-label">自然亮起的觀察手冊</span><h3>${status.research.name}</h3></div><b>${status.speciesCount} / ${fullGoal}</b></div><p>${status.research.description}</p><div class="research-nodes">${RESEARCH_NODES.filter(node => node.regionId === status.research.regionId).map(node => `<div class="research-node ${completed.has(node.id) ? "is-done" : ""}" data-research-node="${node.id}"><i>${completed.has(node.id) ? "✓" : "◇"}</i><span><b>${node.name}</b><small>${node.description}</small></span></div>`).join("")}</div><div class="research-reward ${status.mainComplete ? "is-complete" : ""}">${rewardLine}</div>${status.mainComplete ? `<small>${status.research.preview}</small>` : ""}</aside>`;
}

function chartTransform(view = state.chartView) {
  const normalized = normalizeChartView(view);
  return `translate(${normalized.x}%, ${normalized.y}%) scale(${normalized.zoom})`;
}

function chartShipPosition() {
  const status = getTravelStatus(state.world);
  if (status) {
    const from = CHART_REGION_POINTS.find(point => point.regionId === status.travel.fromRegionId);
    const to = CHART_REGION_POINTS.find(point => point.regionId === status.travel.toRegionId);
    const path = CHART_ROUTE_PATHS.find(entry => entry.routeId === status.route.id);
    if (from && to && path) {
      const t = status.progress;
      const inverse = 1 - t;
      return {
        x: inverse * inverse * from.x + 2 * inverse * t * path.controlX + t * t * to.x,
        y: inverse * inverse * from.y + 2 * inverse * t * path.controlY + t * t * to.y
      };
    }
  }
  const locationId = state.world?.docking?.status === "offshore"
    ? state.world.docking.regionId
    : state.world?.currentRegionId;
  return CHART_REGION_POINTS.find(point => point.regionId === locationId) || CHART_REGION_POINTS[0];
}

function chartRegionNode(point) {
  const region = regionById(point.regionId);
  if (!region) return "";
  const current = state.world.docking?.status === "docked" && state.world.docking.regionId === region.id;
  const offshore = state.world.docking?.status === "offshore" && state.world.docking.regionId === region.id;
  const destination = state.world.travel?.toRegionId === region.id;
  const visited = state.world.visitedRegionIds.includes(region.id);
  const preview = region.contentStatus === "route-only" && !visited;
  const statusIcon = current ? "⚓" : offshore ? "◉" : destination ? "➜" : visited ? "✓" : "⌁";
  const statusText = current ? "船隻目前停泊" : offshore ? "船隻位於外海" : destination ? "目前航行目的地" : visited ? "已到訪" : "航線已開放";
  return `<div class="chart-region-node ${current || offshore ? "is-current" : ""} ${preview ? "is-preview" : ""}" style="left:${point.x}%;top:${point.y}%" role="group" aria-label="${region.name}，${statusText}"><span class="chart-region-marker" aria-hidden="true">${point.marker === "harbor" ? "◉" : "◌"}</span><span class="chart-region-copy"><b>${region.name}</b><small>${statusIcon} ${statusText}</small></span>${preview ? '<i class="chart-mist" aria-hidden="true"></i>' : ""}</div>`;
}

function chartRouteMarkup() {
  const entries = CHART_ROUTE_PATHS.map(path => {
    const route = routeById(path.routeId);
    const from = CHART_REGION_POINTS.find(point => point.regionId === route?.fromRegionId);
    const to = CHART_REGION_POINTS.find(point => point.regionId === route?.toRegionId);
    if (!route || !from || !to) return null;
    const status = getTravelStatus(state.world);
    const traveling = status?.route.id === route.id;
    const available = route.status === "available" && state.world.unlockedRouteIds.includes(route.id);
    const familiar = state.world.completedRouteIds.includes(route.id);
    return {
      path: `<path class="chart-route-path ${available ? "is-available" : "is-preview"} ${traveling ? "is-traveling" : ""}" d="M ${from.x} ${from.y} Q ${path.controlX} ${path.controlY} ${to.x} ${to.y}" vector-effect="non-scaling-stroke"/>`,
      label: `<div class="chart-route-label ${available ? "is-available" : "is-preview"}" style="left:${(from.x + to.x + path.controlX) / 3}%;top:${(from.y + to.y + path.controlY) / 3}%">${traveling ? `航行 ${status.segment}/${status.totalSegments}` : familiar ? "✓ 熟悉航線" : available ? "✓ 可航行" : "🔒 測繪中"}</div>`
    };
  }).filter(Boolean);
  return `<svg class="chart-route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${entries.map(entry => entry.path).join("")}</svg>${entries.map(entry => entry.label).join("")}`;
}

function chartDestinationCards() {
  const travelStatus = getTravelStatus(state.world);
  if (travelStatus) {
    const destination = regionById(travelStatus.travel.toRegionId);
    return `<article class="card chart-route-card is-traveling"><span class="section-label">航行中</span><h3>${travelStatus.route.name}</h3><p>正在前往${destination?.name || "目的地"}。關閉遊戲後，航程仍會依真實經過時間推進。</p><div class="voyage-time"><b data-travel-remaining>${formatTravelTime(travelStatus.remainingMs)}</b><span>第 <i data-travel-segment>${travelStatus.segment} / ${travelStatus.totalSegments}</i> 段</span></div><div class="progress-track voyage-progress"><i data-travel-progress style="width:${travelStatus.progress * 100}%"></i></div></article>`;
  }
  if (state.world.docking?.status === "offshore") {
    const destination = regionById(state.world.docking.regionId);
    return `<article class="card chart-route-card is-arrived"><span class="section-label">已抵達外海</span><h3>${destination?.name || "目的地"}</h3><p>這裡沒有倒數或懲罰。準備好迎接港口短景時，再按下停泊。</p><button class="primary-button" data-action="dock-arrival">停泊 · ${destination?.portName || "目的港"}</button></article>`;
  }
  return CHART_ROUTE_PATHS.map(path => {
    const route = routeById(path.routeId);
    if (!route) return "";
    const connected = route.fromRegionId === state.world.currentRegionId || route.toRegionId === state.world.currentRegionId;
    if (!connected) return "";
    const destinationId = route.fromRegionId === state.world.currentRegionId ? route.toRegionId : route.fromRegionId;
    const destination = regionById(destinationId);
    const available = connected && route.status === "available" && state.world.unlockedRouteIds.includes(route.id);
    const familiar = state.world.completedRouteIds.includes(route.id);
    const duration = getRouteDurationForState(state, route.id);
    return `<article class="card chart-route-card ${available ? "is-available" : "is-preview"}" data-route="${route.id}"><span class="section-label">相鄰航線</span><h3>${route.name}</h3><p>${destination?.name || "未知海域"} · ${route.travelSegments} 段航程 · ${formatTravelMinutes(duration)}</p><div class="chart-route-state"><span aria-hidden="true">${available ? "✓" : "🔒"}</span><b>${available ? familiar ? "熟悉航線，可自由往返" : "首次短程航行已開放" : "目前無法從這裡出發"}</b></div><button class="${available ? "primary-button" : "soft-button"}" data-action="prepare-chart-route" data-id="${route.id}" ${available ? "" : "disabled"}>${available ? `準備前往${destination?.name || "目的地"}` : "目前無法出發"}</button></article>`;
  }).join("");
}

function chartCurrentCard() {
  const travelStatus = getTravelStatus(state.world);
  if (travelStatus) {
    const from = regionById(travelStatus.travel.fromRegionId);
    const to = regionById(travelStatus.travel.toRegionId);
    const voyageShip = shipById(travelStatus.travel.shipId) || activeShip(state);
    return `<div class="card chart-current-card"><span class="section-label">目前船位 · ${voyageShip.name}</span><h3>⌁ 暖流航程中</h3><p>${from?.name || "出發地"} → ${to?.name || "目的地"}</p></div>`;
  }
  if (state.world.docking?.status === "offshore") {
    const region = regionById(state.world.docking.regionId);
    return `<div class="card chart-current-card"><span class="section-label">目前船位</span><h3>◉ ${region?.name || "目的地"}外海</h3><p>已收帆，正在等待手動停泊</p></div>`;
  }
  const region = regionById(state.world.currentRegionId);
  const journalLink=filterJournalEntries(state.journal,"region",region?.id).length?`<button class="soft-button chart-journal-link" data-action="show-logbook" data-filter="region" data-id="${region.id}">查看此海域日誌</button>`:"";
  return `<div class="card chart-current-card"><span class="section-label">目前船位 · ${activeShip(state).name}</span><h3>⚓ ${region?.name || "眠潮灣"}</h3><p>${region?.portName || "眠潮泊地"} · 已安全停泊</p>${journalLink}</div>`;
}

function applyChartView() {
  const stage = $("#chart-stage");
  if (stage) stage.style.transform = chartTransform();
  const output = $("#chart-zoom-output");
  if (output) output.textContent = `${Math.round(state.chartView.zoom * 100)}%`;
}

function scheduleChartSave() {
  clearTimeout(chartSaveTimer);
  chartSaveTimer = setTimeout(() => saveGame(), 180);
}

function updateChartView(next, { persist = true } = {}) {
  state.chartView = normalizeChartView(next);
  applyChartView();
  if (persist) scheduleChartSave();
}

function bindChartInteractions() {
  const viewport = $("#chart-viewport");
  if (!viewport) return;
  viewport.addEventListener("wheel", event => {
    event.preventDefault();
    updateChartView(zoomChartView(state.chartView, event.deltaY < 0 ? 1 : -1));
  }, { passive: false });
  viewport.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.target.closest("button")) return;
    chartPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, view: { ...state.chartView } };
    try { viewport.setPointerCapture(event.pointerId); } catch { /* synthetic test pointers are not active browser pointers */ }
    viewport.classList.add("is-dragging");
  });
  viewport.addEventListener("pointermove", event => {
    if (!chartPointer || chartPointer.id !== event.pointerId) return;
    const bounds = viewport.getBoundingClientRect();
    updateChartView(panChartView(
      chartPointer.view,
      (event.clientX - chartPointer.x) / Math.max(1, bounds.width) * 100,
      (event.clientY - chartPointer.y) / Math.max(1, bounds.height) * 100
    ), { persist: false });
  });
  const finish = event => {
    if (!chartPointer || chartPointer.id !== event.pointerId) return;
    chartPointer = null;
    viewport.classList.remove("is-dragging");
    saveGame();
  };
  viewport.addEventListener("pointerup", finish);
  viewport.addEventListener("pointercancel", finish);
}

function renderChart() {
  state.chartView = normalizeChartView(state.chartView);
  const shipPosition = chartShipPosition();
  const travelStatus = getTravelStatus(state.world);
  const chartSubtitle = travelStatus ? "船隻會依真實經過時間沿航線前進；關閉遊戲後，重新開啟仍會回到正確位置。" : state.world.docking?.status === "offshore" ? "船已抵達目的地外海，直到你按下停泊以前都不會自行進港。" : "在航圖桌上確認港口、船位與相鄰海流；已解鎖航線可以安全往返。";
  content.innerHTML = `${panelHeading("古海圖", chartSubtitle)}<div class="chart-layout"><section class="card chart-panel"><div class="chart-toolbar" aria-label="海圖操作"><div class="chart-zoom-controls"><button class="soft-button" data-action="chart-zoom" data-direction="-1" aria-label="縮小海圖">−</button><output id="chart-zoom-output" aria-live="polite">${Math.round(state.chartView.zoom * 100)}%</output><button class="soft-button" data-action="chart-zoom" data-direction="1" aria-label="放大海圖">＋</button><button class="soft-button" data-action="chart-reset">回到船位</button></div><div class="chart-pan-controls" aria-label="平移海圖"><button data-action="chart-pan" data-x="0" data-y="-${CHART_VIEW_LIMITS.panStep}" aria-label="向上移動海圖">↑</button><button data-action="chart-pan" data-x="-${CHART_VIEW_LIMITS.panStep}" data-y="0" aria-label="向左移動海圖">←</button><button data-action="chart-pan" data-x="${CHART_VIEW_LIMITS.panStep}" data-y="0" aria-label="向右移動海圖">→</button><button data-action="chart-pan" data-x="0" data-y="${CHART_VIEW_LIMITS.panStep}" aria-label="向下移動海圖">↓</button></div></div><div id="chart-viewport" class="chart-viewport" tabindex="0" role="application" aria-label="可縮放的古海圖。可用方向鍵平移，加號與減號縮放，數字零回到船位。"><div id="chart-stage" class="chart-stage" style="transform:${chartTransform()}"><div class="chart-paper" aria-hidden="true"><i class="chart-land chart-land-bay"></i><i class="chart-land chart-land-islands"></i><i class="chart-compass">✥</i><i class="chart-water-lines"></i></div>${chartRouteMarkup()}${CHART_REGION_POINTS.map(chartRegionNode).join("")}<div id="chart-ship-marker" class="chart-ship-marker ${travelStatus ? "is-traveling" : ""}" style="left:${shipPosition.x}%;top:${shipPosition.y}%" role="img" aria-label="船隻目前${travelStatus ? "正在航行" : state.world.docking?.status === "offshore" ? "位於目的地外海" : "安全停泊"}"><span aria-hidden="true">▰</span><small>我的船</small></div></div></div><p class="chart-help">滑鼠：拖曳／滾輪 · 鍵盤：方向鍵／＋／−／0 · 觸控：單指拖曳與畫面按鈕。海圖不使用快速晃動或大幅視差。</p></section><aside class="chart-side">${chartCurrentCard()}${chartDestinationCards()}</aside></div>`;
  bindChartInteractions();
}

function showRouteConfirmation(routeId) {
  const route = routeById(routeId);
  if (!route) return;
  const destinationId = route.fromRegionId === state.world.currentRegionId ? route.toRegionId : route.fromRegionId;
  const destination = regionById(destinationId);
  const familiar = state.world.completedRouteIds.includes(route.id);
  const duration = getRouteDurationForState(state, route.id);
  const ship = activeShip(state);
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal route-confirm-modal"><div class="route-ship-preview">${shipMiniature(ship,ship.name)}<span><small>${familiar ? "熟悉航線" : "第一次遠航"}</small><b>${ship.name}</b></span></div><h2>前往${destination?.name || "目的地"}？</h2><p class="modal-copy">${route.name}預計需要${formatTravelMinutes(duration)}，分成 ${route.travelSegments} 段。航程不能瞬間略過，會以目前 ${activeShipSpeed(state).toFixed(2)}× 航速鎖定整段時間；出發後不因切換或讀檔跳變，也可以放心關閉遊戲。</p><div class="route-confirm-notes"><span>✓ 不消耗燃料</span><span>✓ 不會迷航或失敗</span><span>✓ 抵達後由你決定停泊</span></div><div class="modal-actions"><button class="soft-button" data-action="close-modal">再準備一下</button><button class="primary-button" data-action="confirm-chart-route" data-id="${route.id}">沿暖流出發</button></div></div></div>`;
}

function showDockingScene(result) {
  const destination = regionById(result.destinationId);
  const returningHome = result.destinationId === SLEEPING_TIDE_BAY_ID;
  modalRoot.innerHTML = `<div class="modal-backdrop docking-backdrop"><div class="modal docking-modal"><div class="docking-scene-mark" aria-hidden="true">${returningHome ? "⚓" : "◌"}</div><span class="section-label">${result.firstArrival ? "第一次停泊" : "再次靠岸"}</span><h2>${destination?.portName || "港口"}</h2><p class="modal-copy">${returningHome ? "熟悉的燈火穿過薄霧，眠潮灣把返航的船穩穩接回木棧橋。" : "暖色海面托著零散島影，風棲港的繩索輕輕落上船柱。這一刻已記進你的航程。"}</p>${result.firstArrival && result.destinationId === LUMINOUS_ARCHIPELAGO_ID ? '<p class="quiet-note">曬網棚旁，有位戴著大圓盤帽的研究員正低頭修理一枚漂流觀測器。她沒有招手，只先替你把鬆開的纜繩繫好。</p>' : ""}<div class="modal-actions"><button class="primary-button" data-action="close-modal">踏上碼頭</button></div></div></div>`;
}

function showObservationPreview(spotId) {
  const spot = getRegionObservationSpots(state.world?.currentRegionId).find(entry => entry.id === spotId);
  if (!spot) return;
  const result = observeAtSpot(state, spotId);
  if (!result.ok) { toast("需要先在這片海域安全停泊，才能前往觀察點"); return; }
  saveGame(); render(); notifyTideglow(result.tideglowEvents);
  const newNodes = result.researchUpdate?.completedNodes || [];
  const researchNote = newNodes.length ? `<p class="observation-research-note">研究冊亮起：${newNodes.map(node => node.name).join("、")}</p>` : "";
  if (result.kind === "subject") {
    const subject = result.subject;
    modalRoot.innerHTML = `<div class="modal-backdrop observation-backdrop"><div class="modal observation-modal is-discovery"><div class="observation-fish-mark" style="--observe-a:${subject.colors[0]};--observe-b:${subject.colors[1]};--observe-c:${subject.colors[2] || subject.colors[0]}" aria-hidden="true"><i></i><b>${subject.icon}</b></div><span class="section-label">自動記錄 · 正式觀察魚</span><h2>${subject.name}</h2><span class="latin">${subject.english} · ${subject.scientific}</span><p class="modal-copy">${subject.short}</p><div class="observation-note"><p>${subject.detail}</p><a href="${subject.ecologySource.url}" target="_blank" rel="noreferrer">${subject.ecologySource.label}</a></div>${researchNote}<p class="quiet-note">你不需要在牠出現時快速點擊。名字、時段與海況已自動收進觀察簿，牠仍留在自己的礁影裡。</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">安靜看完，再沿岬角回港</button></div></div></div>`;
    sound.play("new");
    return;
  }
  if (result.kind === "wonder") {
    const wonder = result.wonder;
    modalRoot.innerHTML = `<div class="modal-backdrop observation-backdrop"><div class="modal observation-modal is-wonder"><div class="observation-scene-mark" aria-hidden="true">${wonder.icon}</div><span class="section-label">奇景照片 · 不列入完成度</span><h2>${wonder.name}</h2><p class="modal-copy">${wonder.description}</p><div class="observation-note"><p>${wonder.photoCaption}</p></div><p class="quiet-note">奇景沒有未知空格，也不影響區域或世界 100%。只有真正遇見後，這張照片才會留在旅程裡。</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">把照片收進觀察冊</button></div></div></div>`;
    return;
  }
  modalRoot.innerHTML = `<div class="modal-backdrop observation-backdrop"><div class="modal observation-modal"><div class="observation-scene-mark" aria-hidden="true">${spot.icon}</div><span class="section-label">${regionById(spot.regionId)?.name || "群島"} · 完整觀察</span><h2>${result.repeatedPeriod ? "同一片光仍停在礁盤上" : "今天，海只留下潮聲"}</h2><p class="modal-copy">${result.repeatedPeriod ? "這個航海時段已經好好看過一次。沒有漏掉任何需要追趕的身影。" : "沒有遇見新生物，也是一筆真實紀錄。風向、礁影與等待的時間都已被記住。"}</p><p class="quiet-note">${result.hint}</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">沿岬角回港</button></div></div></div>`;
}

function showResidentDialogue(residentId, deliveredDialogue = null) {
  const resident = residentById(residentId);
  if (!resident) return;
  if (!deliveredDialogue) {
    const storyResult = advanceResidentStory(state, residentId);
    if (storyResult.ok) {
      saveGame(); render(); notifyTideglow([storyResult.tideglowEvent]);
      const scene = storyResult.scene;
      modalRoot.innerHTML = `<div class="modal-backdrop resident-story-backdrop"><div class="modal resident-story-modal"><span class="section-label">${scene.locationName} · 港口相遇 ${storyResult.status.completedSceneIds.length} / ${storyResult.status.scenes.length}</span><h2>${scene.title}</h2><div class="resident-story-lines">${scene.lines.map(line => `<p>「${line}」</p>`).join("")}</div>${scene.reward ? `<div class="resident-story-reward"><span>旅程紀念</span><b>${scene.reward.label}</b></div>` : ""}<p class="quiet-note">故事只由旅程、觀察與研究自然推進；居民委託、好感度或拜訪次數都不是門檻。</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">${scene.jointObservation ? "讓礁影繼續安靜" : "和澄野道別"}</button></div></div></div>`;
      return;
    }
  }
  const dialogue = deliveredDialogue || resident.dialogue.greeting;
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal"><span class="section-label">${resident.portLocationName}</span><h2>${resident.name}</h2><p class="modal-copy">「${dialogue}」</p><p class="quiet-note">${resident.role}。居民留在自己的港口生活，不登船，也不會跨海聯絡或追蹤玩家。</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">道別</button></div></div></div>`;
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
    regionId: state.world.currentRegionId,
    spotId: state.selectedSpot,
    timeId: TIMES[state.timeIndex].id,
    weather: state.weather,
    baitId: state.equippedBait,
    rodId: state.equippedRod,
    day: state.day
  };
}

function castLine() {
  const canFishHere = isDockedAt(state.world?.currentRegionId)
    && getRegionFishingSpots(state.world.currentRegionId).some(spot => spot.id === state.selectedSpot);
  if (!canFishHere || fishing.phase !== "idle" || !state.baitAmounts[state.equippedBait]) return;
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
  notifyTideglow(result.tideglowEvents);
  if(result.bayEventUpdate?.completed) setTimeout(()=>toast(`事件完成「${result.bayEventUpdate.event.name}」：${result.bayEventUpdate.reward.label}`,"gold"),420);
  if(result.researchUpdate?.completedNodes?.length) setTimeout(()=>toast(`研究冊亮起：${result.researchUpdate.completedNodes.map(node=>node.name).join("、")}`,"gold"),520);
  if(result.researchUpdate?.rewards?.length) setTimeout(()=>toast(`研究紀念已收好：${result.researchUpdate.rewards.map(reward=>reward.label).join("、")}`,"gold"),720);
}

function resetFishing() { clearFishing(); fishing.phase="idle"; renderFishing(); }
function clearFishing(){ clearTimeout(fishing.timer); cancelAnimationFrame(fishing.raf); fishing.held=false; }

function showCatchModal(fish,caught,result,milestones) {
  const isShimmer=caught.variant==="shimmer";
  const localStamp=result.isNewRegional&&caught.context?.regionId===LUMINOUS_ARCHIPELAGO_ID;
  const tags=[result.isNew&&isShimmer?"圖鑑新增":null,localStamp?"琉光群島印章":null,result.isLengthRecord?"最長紀錄":null,result.isWeightRecord?"最重紀錄":null].filter(Boolean).join(" · ");
  const familiarityText=result.familiarity.nextCount?`${result.record.count} / ${result.familiarity.nextCount}`:"已精通";
  const ribbon=isShimmer?'<span class="new-ribbon is-shimmer">✦ 閃光個體</span>':result.isNew?'<span class="new-ribbon">NEW · 圖鑑新增</span>':localStamp?'<span class="new-ribbon">✓ 琉光群島印章</span>':`<span class="new-ribbon">${RARITY[fish.rarity].name}</span>`;
  const rewards=[result.isNew?"首次發現獎勵已收入錢袋":null,result.isFirstShimmer?"首次閃光研究獎勵 75 金幣":null].filter(Boolean).join(" · ");
  const eventUpdate=result.bayEventUpdate;
  const eventFeedback=eventUpdate?.updated?`<div class="catch-event ${eventUpdate.completed?"is-complete":""}"><span>${eventUpdate.completed?"事件完成":"海灣事件進度"}</span><b>${eventUpdate.event.name} · ${eventUpdate.progress} / ${eventUpdate.event.goal}</b><small>${eventUpdate.completed?`獲得 ${eventUpdate.reward.label}`:getBayEventHint(state)}</small></div>`:"";
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal catch-modal ${isShimmer?"is-shimmer":""}"><div class="catch-hero">${fishArt(fish,false,caught.variant,"scene")}</div>${ribbon}<h2>${fish.name}</h2><p class="catch-subtitle">${fish.english}</p><p class="modal-copy">${fish.short}</p><div class="catch-stats"><div><small>體長</small><b>${caught.length} cm</b></div><div><small>重量</small><b>${caught.weight} kg</b></div><div><small>售價</small><b>${caught.price} 金幣</b></div></div>${tags?`<div class="record-tag">✦ ${tags}</div>`:""}<div class="catch-familiarity ${result.familiarityChanged?"is-level-up":""}"><span>${result.familiarityChanged?"熟悉度提升":"圖鑑熟悉度"}</span><b>${result.familiarity.name}</b><small>${familiarityText}</small></div>${eventFeedback}${rewards?`<p class="record-tag">${rewards}</p>`:""}<div class="modal-actions"><button class="soft-button" data-action="modal-journal" data-id="${fish.id}">查看圖鑑</button><button class="primary-button" data-action="close-catch">收進漁獲箱</button></div></div></div>`;
  for(const milestone of milestones) {
    const aquariumCapacity=AQUARIUM_CAPACITY_MILESTONES.find(item=>item.discoveries===milestone.count)?.capacity;
    const aquariumReward=aquariumCapacity?`${milestone.count===5?"海灣觀察箱":"水族箱擴建至"} ${aquariumCapacity} 格`:"";
    setTimeout(()=>toast(`里程碑「${milestone.name}」完成：${milestone.reward}${aquariumReward?` · ${aquariumReward}`:""}`,"gold"),500);
  }
}

function renderJournal() {
  const unclaimed=getUnclaimedAchievementCount(state);
  const actions=`<div class="journal-heading-actions"><button class="soft-button achievement-open" data-action="show-achievements">收藏成就${unclaimed?`<i>${unclaimed}</i>`:""}</button><div class="completion-ring"><div><small>探索進度</small><b>${discoveredCount(state)} / ${FISH.length}</b></div></div></div>`;
  const filtered=FISH.filter(f=>journalFilter==="all"||f.rarity===journalFilter||f.spots.includes(journalFilter)||Boolean(getFishHabitat(f,journalFilter)));
  selectedJournalFish ||= (filtered.find(f=>state.discovered[f.id])||filtered[0])?.id;
  if (!filtered.some(f=>f.id===selectedJournalFish)) selectedJournalFish=filtered[0]?.id;
  const selected=fishById(selectedJournalFish), record=state.discovered[selected?.id];
  content.innerHTML=`${panelHeading("魚類圖鑑","每次相遇都會累積熟悉度；跨區魚必須在當地實際捕獲，才會蓋上那片海域的印章。",actions)}<div class="filter-row"><button class="filter-chip ${journalFilter==="all"?"is-active":""}" data-action="journal-filter" data-id="all">全部</button><button class="filter-chip ${journalFilter===SLEEPING_TIDE_BAY_ID?"is-active":""}" data-action="journal-filter" data-id="${SLEEPING_TIDE_BAY_ID}">眠潮灣</button><button class="filter-chip ${journalFilter===LUMINOUS_ARCHIPELAGO_ID?"is-active":""}" data-action="journal-filter" data-id="${LUMINOUS_ARCHIPELAGO_ID}">琉光群島</button><button class="filter-chip ${journalFilter==="common"?"is-active":""}" data-action="journal-filter" data-id="common">常見</button><button class="filter-chip ${journalFilter==="uncommon"?"is-active":""}" data-action="journal-filter" data-id="uncommon">少見</button><button class="filter-chip ${journalFilter==="rare"?"is-active":""}" data-action="journal-filter" data-id="rare">稀有</button><button class="filter-chip ${journalFilter==="shore"?"is-active":""}" data-action="journal-filter" data-id="shore">近岸</button><button class="filter-chip ${journalFilter==="reef"?"is-active":""}" data-action="journal-filter" data-id="reef">礁石</button><button class="filter-chip ${journalFilter==="deep"?"is-active":""}" data-action="journal-filter" data-id="deep">深水</button></div><div class="journal-layout" style="margin-top:16px"><div class="fish-grid">${filtered.map(fish=>fishCard(fish)).join("")}</div>${selected?fishDetail(selected,record):""}</div>`;
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
  return `<button class="fish-card ${found?"":"is-unknown"} ${found?.caughtShimmer?"has-shimmer":""} ${selectedJournalFish===fish.id?"is-active":""}" data-action="select-fish" data-id="${fish.id}">${found?.caughtShimmer?'<span class="shimmer-mark" title="曾捕獲閃光個體">✦</span>':""}${fishArt(fish,!found,"normal",found?"journal":"silhouette")}<b>${found?fish.name:"未發現"}</b><small>${found?`${RARITY[fish.rarity].name} · 捕獲 ${found.count} 次`:unknownHint(fish)}</small>${found?`<span class="familiarity-chip is-${familiarity.id}">${familiarity.name}</span>`:""}</button>`;
}
function unknownHint(fish){
  const luminousOnly=Boolean(getFishHabitat(fish,LUMINOUS_ARCHIPELAGO_ID))&&!getFishHabitat(fish,SLEEPING_TIDE_BAY_ID);
  if(luminousOnly)return "琉光群島暖色水光中的陌生剪影";
  return fish.spots.includes("deep")||fish.spots.includes("warm_current_channel")?"深藍水域的神秘剪影":fish.spots.includes("reef")||fish.spots.includes("prism_coral_garden")?"礁石間似乎有什麼身影":"近岸水光中的小小身影";
}

function renderRegionStamps(fish){
  return `<div class="region-stamp-list">${fish.habitats.map(habitat=>{
    const region=regionById(habitat.regionId);
    const earned=state.world?.regionProgress?.[habitat.regionId]?.discoveredFishIds?.includes(fish.id);
    return `<span class="region-stamp ${earned?"is-earned":""}" data-region-stamp="${habitat.regionId}">${earned?"✓":"◇"} ${region?.name||"未知海域"}${earned?"印章":"尚未記錄"}</span>`;
  }).join("")}</div>`;
}
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
  if(!record) return `<aside class="card fish-detail"><div class="fish-detail-hero unknown-hero">${fishArt(fish,true,"normal","silhouette")}</div><h3>尚未相遇</h3><p class="fish-detail-copy">${unknownHint(fish)}。試著改變釣點、時段或魚餌，也許下一竿就會認識牠。</p></aside>`;
  const full=record.count>=3;
  const familiarity=getFamiliarity(record.count);
  const progress=familiarity.nextCount?`${record.count} / ${familiarity.nextCount}`:"已完成全部熟悉度階段";
  const ecologySource=full&&fish.ecologySource?`<div class="fact-box ecology-source">生態資料：<a href="${fish.ecologySource.url}" target="_blank" rel="noreferrer">${fish.ecologySource.label}</a></div>`:"";
  const encounterLine=state.journal?.fishEncounterLineById?.[fish.id];
  const rareEntry=state.journal?.permanentEntries?.find(entry=>entry.sourceId===`fish:${fish.id}`);
  const encounterNote=encounterLine?`<div class="fish-encounter-note"><span>初遇短句</span><p>${escapeText(encounterLine)}</p>${rareEntry?`<button class="soft-button" data-action="show-logbook" data-filter="fish" data-id="${fish.id}" data-entry="${rareEntry.id}">閱讀完整初遇頁</button>`:""}</div>`:"";
  return `<aside class="card fish-detail"><div class="fish-detail-hero ${record.caughtShimmer?"has-shimmer":""}">${fishArt(fish,false,record.caughtShimmer?"shimmer":"normal","journal")}</div><h3>${fish.name}</h3><span class="latin">${fish.english} · ${fish.scientific}</span><span class="rarity-pill" style="background:${RARITY[fish.rarity].color}">${RARITY[fish.rarity].name}</span>${record.caughtShimmer?`<span class="shimmer-record">✦ 閃光紀錄 ${record.shimmerCount} 次</span>`:""}${renderRegionStamps(fish)}${encounterNote}<div class="familiarity-summary"><span>${familiarity.name}</span><b>${progress}</b></div><p class="fish-detail-copy">${full?fish.detail:fish.short}</p><div class="detail-stats"><div><small>捕獲次數</small><b>${record.count}</b></div><div><small>最長紀錄</small><b>${record.bestLength} cm</b></div><div><small>最重紀錄</small><b>${record.bestWeight} kg</b></div></div><div class="catch-dates"><span>初次：${formatCatchDate(record.firstCaught)}</span><span>最近：${formatCatchDate(record.lastCaught)}</span></div>${full?`<div class="fact-box">✦ ${fish.fact}</div><div class="fact-box">推薦：${fish.baits.map(id=>baitById(id).name).join("、")} · ${fish.times.map(id=>TIMES.find(t=>t.id===id).name).join("／")}</div>${ecologySource}`:`<div class="fact-box">再捕獲 ${3-record.count} 次，解鎖偏好魚餌、活躍時間與有趣知識。</div>`}${record.count>=5?recordedConditionNames(record):`<div class="fact-box">再捕獲 ${5-record.count} 次，整理完整的相遇地點、時段與天氣紀錄。</div>`}</aside>`;
}

function fishArt(fish,silhouette=false,variant="normal",purpose="card") {
  const resolvedAsset=resolveFishAsset(fish,{purpose:silhouette?"silhouette":purpose,variant});
  if(resolvedAsset.source==="raster"){
    return `<div class="fish-art fish-raster ${silhouette?"is-silhouette":""} ${variant==="shimmer"?"is-shimmer":""}" data-body-plan="${resolvedAsset.bodyPlan}"><img class="fish-image" src="${resolvedAsset.derivatives[resolvedAsset.width]}" srcset="${fishAssetSrcSet(resolvedAsset)}" sizes="${resolvedAsset.width}px" width="1024" height="1024" loading="${resolvedAsset.loading}" decoding="${resolvedAsset.decoding}" alt=""></div>`;
  }
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
  content.innerHTML=`${panelHeading("今日漁獲","漁獲箱會好好保管每次相遇；可以販售，也能將喜歡的標本放進船屋水族箱。",actions)}<div class="catch-list">${state.catchInventory.length?state.catchInventory.map(caught=>{const fish=fishById(caught.fishId),isShimmer=caught.variant==="shimmer";const aquariumButton=!aquariumCapacity?`<button class="soft-button" disabled title="發現 5 種魚後解鎖">水族箱未解鎖</button>`:aquariumFull?`<button class="soft-button" data-action="show-aquarium-replace" data-id="${caught.uid}">替換展示</button>`:`<button class="soft-button" data-action="move-aquarium" data-id="${caught.uid}">放入水族箱</button>`;return `<article class="card catch-row ${isShimmer?"is-shimmer":""}">${fishArt(fish,false,caught.variant,"card")}<div><h3>${fish.name}${isShimmer?'<span class="inline-shimmer">✦ 閃光</span>':""}</h3><div class="catch-meta"><span>${RARITY[fish.rarity].name}</span><span>${caught.length} cm</span><span>${caught.weight} kg</span><span>${sizeName(caught.sizeTier)}</span></div></div><div class="sell-one"><b>${caught.price} 金幣</b><div class="catch-actions">${aquariumButton}<button class="soft-button" data-action="sell-one" data-id="${caught.uid}">販售</button></div></div></article>`}).join(""):`<div class="empty-state"><span>⌁</span><h3>漁獲箱還空著</h3><p>回到甲板，向海灣拋下今天的第一竿吧。</p></div>`}</div>`;
}
function sizeName(tier){return({small:"小型",standard:"標準",large:"大型",record:"紀錄級"})[tier]}

function renderShop() {
  const tabNames={rods:"魚竿",baits:"魚餌",furniture:"船屋家具",ships:"船隻"};
  let items=[];
  if(shopTab==="rods") items=RODS.map(item=>shopItem(item,"rod"));
  if(shopTab==="baits") items=BAITS.map(item=>shopItem(item,"bait"));
  if(shopTab==="furniture") items=activeShipFurnitureCatalog(state).map(item=>shopItem(item,"furniture"));
  if(shopTab==="ships") items=SHIPS.map(shipStoreItem);
  const actions=`<span class="price">● ${state.money.toLocaleString("zh-TW")}</span><span class="price tideglow-price">✦ ${state.tideglow.total.toLocaleString("zh-TW")}</span>`;
  const furnitureNote=shopTab==="furniture"?`<p class="ship-catalog-note">目前展示 <b>${activeShip(state).name}</b> 專屬家具；切換船隻後，商店也會換成對應設計。</p>`:"";
  content.innerHTML=`${panelHeading("海灣商店","老闆會替你收好需要的裝備；商品永遠不會限時消失。",actions)}<div class="shop-tabs">${Object.entries(tabNames).map(([id,name])=>`<button class="filter-chip ${shopTab===id?"is-active":""}" data-action="shop-tab" data-id="${id}">${name}</button>`).join("")}</div>${furnitureNote}<div class="shop-grid">${items.join("")}</div>`;
}

function shipStoreItem(ship) {
  const owned = state.ships.ownedShipIds.includes(ship.id);
  const active = state.ships.activeShipId === ship.id;
  const revealed = state.ships.revealedShipIds.includes(ship.id);
  const eligibility = getShipPurchaseState(state, ship.id);
  const future = ship.status === "preview";
  let action = `<button class="soft-button" disabled>${future ? "後續航圖開放" : "尚未符合條件"}</button>`;
  if (owned) action = `<button class="soft-button" data-action="switch-ship" data-id="${ship.id}" ${active ? "disabled" : ""}>${active ? "目前使用中" : "切換使用"}</button>`;
  else if (eligibility.ok) action = `<button class="primary-button" data-action="prepare-buy-ship" data-id="${ship.id}">購買並使用</button>`;
  const reason = eligibility.reason === "tideglow" ? `還需要 ${Math.max(0, ship.tideglowRequired - state.tideglow.total)} 潮光`
    : eligibility.reason === "money" ? `還需要 ${Math.max(0, ship.price - state.money)} 金幣`
      : eligibility.reason === "not-docked" ? "需先停泊已實作港口" : future ? "未來版本預告" : owned ? "永久擁有" : "可購買";
  const price = future ? "價格將於開放時定案" : ship.price ? `${ship.price.toLocaleString("zh-TW")} 金幣` : "初始擁有";
  const journalLink=filterJournalEntries(state.journal,"ship",ship.id).length?`<button class="ship-journal-link" data-action="show-logbook" data-filter="ship" data-id="${ship.id}">查看船隻日誌</button>`:"";
  return `<article class="card shop-item ship-store-item ${active ? "is-active-ship" : ""} ${revealed ? "is-revealed" : "is-misted"}" data-ship-card="${ship.id}"><div class="ship-store-silhouette is-${ship.silhouette}" aria-hidden="true"><i></i><b></b></div><span class="section-label">${future ? "未來船影" : owned ? "已收藏" : revealed ? "潮光已揭露" : "潮光中的輪廓"}</span><h3>${ship.name}</h3><p>${ship.description}</p><div class="ship-store-stats"><span>✦ ${ship.tideglowRequired} 潮光</span><span>航速 ${ship.speedMultiplier.toFixed(2)}×</span></div><div class="price-row"><span class="price">${price}</span><span class="item-state">${reason}</span></div>${action}${journalLink}</article>`;
}

function showShipPurchaseConfirmation(shipId) {
  const eligibility = getShipPurchaseState(state, shipId);
  if (!eligibility.ok) { toast("目前還不能購買這艘船，請確認潮光、金幣與停泊狀態"); return; }
  const ship = eligibility.ship;
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal ship-purchase-modal"><span class="section-label">永久船隻收藏</span><h2>讓${ship.name}靠岸？</h2><p class="modal-copy">將支付 ${ship.price.toLocaleString("zh-TW")} 金幣並立即切換使用；${ship.tideglowRequired} 潮光只是解鎖門檻，不會被消耗。</p><p class="quiet-note">新船保有可使用的固定床台、航圖桌、日誌入口與水族箱基座；可替換家具需依這艘船的樣式另外購買。</p><div class="modal-actions"><button class="soft-button" data-action="close-modal">再想一下</button><button class="primary-button" data-action="confirm-buy-ship" data-id="${ship.id}">購買並使用</button></div></div></div>`;
}

function shopItem(item,type) {
  const unlocked=isUnlocked(item,state)&&!item.milestone;
  const interior=shipInterior(state);
  const owned=type==="rod"?state.ownedRods.includes(item.id):type==="furniture"?interior?.ownedFurnitureIds.includes(item.id):false;
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
  return `<button class="aquarium-choice ${isShimmer?"is-shimmer":""}" data-action="${action}" data-id="${caught.uid}" ${extra}>${fishArt(fish,false,caught.variant,"aquarium")}<span><b>${fish.name}${isShimmer?" · 閃光":""}</b><small>${caught.length} cm · ${caught.weight} kg · ${sizeName(caught.sizeTier)}</small></span></button>`;
}

function renderAquariumPanel() {
  const capacity=getAquariumCapacity(state), found=discoveredCount(state);
  const interior=shipInterior(state), ship=activeShip(state), frameId=interior?.aquariumFrameId||"default";
  if(!capacity) return `<section class="card aquarium-panel aquarium-frame-${frameId} is-locked" data-ship="${ship.id}"><div class="aquarium-heading"><div><span class="section-label">${ship.name} · 海灣觀察箱</span><h3>船屋還在等待第一座水族箱</h3><p>發現 5 種魚後，會免費加入一座可展示 3 條魚的小型觀察箱。</p></div><b>${found} / 5</b></div><div class="aquarium-unlock-track"><i style="width:${Math.min(100,found/5*100)}%"></i></div></section>`;
  const displayed=state.aquarium.fish;
  const hasShimmerSpecks=state.unlockedAquariumDecor.includes("shimmer_specks");
  const shimmerSpecksActive=state.aquariumDecoration==="shimmer_specks";
  const decorToggle=hasShimmerSpecks?`<button class="aquarium-decor-toggle ${shimmerSpecksActive?"is-active":""}" data-action="toggle-aquarium-decor" title="切換成就裝飾">✦ 光點${shimmerSpecksActive?"開啟":"關閉"}</button>`:"";
  const slots=Array.from({length:capacity},(_,index)=>{
    const caught=displayed[index];
    if(!caught) return `<button class="aquarium-slot is-empty" data-action="open-aquarium-add"><span>＋</span><small>選擇標本</small></button>`;
    const fish=fishById(caught.fishId), isShimmer=caught.variant==="shimmer";
    return `<article class="aquarium-slot has-fish ${isShimmer?"is-shimmer":""}"><button class="aquarium-specimen" data-action="aquarium-view" data-id="${caught.uid}" aria-label="查看${fish.name}標本">${fishArt(fish,false,caught.variant,"aquarium")}<b>${fish.name}</b><small>${caught.length} cm${isShimmer?" · 閃光":""}</small></button><div class="aquarium-controls"><button data-action="aquarium-move" data-id="${index}" data-direction="-1" aria-label="向左移動" ${index===0?"disabled":""}>←</button><button data-action="aquarium-move" data-id="${index}" data-direction="1" aria-label="向右移動" ${index===displayed.length-1?"disabled":""}>→</button><button data-action="aquarium-remove" data-id="${caught.uid}">取回</button></div></article>`;
  }).join("");
  const next=AQUARIUM_CAPACITY_MILESTONES.find(item=>item.discoveries>found);
  return `<section class="card aquarium-panel aquarium-frame-${frameId}" data-ship="${ship.id}"><div class="aquarium-heading"><div><span class="section-label">${ship.name} · 全局標本</span><h3>把喜歡的相遇留在船屋</h3><p>外框會隨船改變；標本、順序與容量始終是同一份收藏。</p></div><div class="aquarium-heading-status"><b>${displayed.length} / ${capacity}</b>${decorToggle}</div></div><div class="aquarium-tank ${shimmerSpecksActive?"has-shimmer-specks":""}" style="--aquarium-columns:${Math.min(capacity,5)}">${slots}</div>${next?`<p class="quiet-note">發現 ${next.discoveries} 種魚後，水族箱將擴建到 ${next.capacity} 格。</p>`:`<p class="quiet-note">完成型展示箱已解鎖。</p>`}</section>`;
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
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal specimen-modal ${isShimmer?"is-shimmer":""}"><div class="specimen-hero">${fishArt(fish,false,caught.variant,"scene")}</div>${isShimmer?'<span class="new-ribbon is-shimmer">✦ 閃光標本</span>':""}<h2>${fish.name}</h2><p class="catch-subtitle">${fish.english}</p><div class="catch-stats"><div><small>體長</small><b>${caught.length} cm</b></div><div><small>重量</small><b>${caught.weight} kg</b></div><div><small>尺寸</small><b>${sizeName(caught.sizeTier)}</b></div></div>${specimenContext(caught)}<div class="modal-actions"><button class="soft-button" data-action="close-modal">關閉</button></div></div></div>`;
}

function renderHomeChartCard() {
  const status = getTravelStatus(state.world);
  if (status) {
    const destination = regionById(status.travel.toRegionId);
    return `<div class="card home-card chart-table-card is-traveling"><span class="section-label">船屋航圖桌 · 航行中</span><h3>前往${destination?.name || "目的地"}</h3><p>剩餘 <b data-travel-remaining>${formatTravelTime(status.remainingMs)}</b> · 第 <i data-travel-segment>${status.segment} / ${status.totalSegments}</i> 段。離開船屋或關閉遊戲都不會中斷航程。</p><div class="progress-track voyage-progress"><i data-travel-progress style="width:${status.progress * 100}%"></i></div><button class="soft-button" data-action="open-chart">查看移動中的船位</button></div>`;
  }
  if (state.world.docking?.status === "offshore") {
    const destination = regionById(state.world.docking.regionId);
    return `<div class="card home-card chart-table-card is-arrived"><span class="section-label">船屋航圖桌 · 已抵達</span><h3>${destination?.name || "目的地"}外海</h3><p>船已收帆等待，不會自行進港。準備好後可以在這裡停泊。</p><button class="primary-button" data-action="dock-arrival">停泊 · ${destination?.portName || "目的港"}</button></div>`;
  }
  const region = regionById(state.world.currentRegionId);
  return `<div class="card home-card chart-table-card"><span class="section-label">船屋航圖桌</span><h3>從${region?.name || "目前港口"}展開古海圖</h3><p>確認船位、相鄰洋流與預估航程。已完成的航線會成為約三分鐘的熟悉航線。</p><button class="soft-button" data-action="open-chart">查看古海圖</button></div>`;
}

function finishAquariumAction(result,message) {
  if(!result.ok){toast(({locked:"發現 5 種魚後才會解鎖水族箱",full:"水族箱已滿，請選擇替換標本",missing:"找不到這份漁獲","missing-catch":"找不到要放入的漁獲","missing-aquarium":"找不到要替換的標本","invalid-index":"無法移動這個展示位置"})[result.reason]||"水族箱操作未完成");return false;}
  modalRoot.innerHTML="";sound.play("coin");saveGame();toast(message);render();notifyCompletedAchievements(result.completedAchievements);return true;
}

function journalEntryDay(entry) {
  if(entry.type==="archive")return `第 ${entry.dayFrom}～${entry.dayTo} 日`;
  return `第 ${entry.sailingDay||1} 日`;
}

function journalEntryLinks(entry) {
  const links=[];
  const first=(key)=>entry.refs?.[key]?.[0];
  if(first("fishIds"))links.push(`<button class="soft-button" data-action="logbook-cross-link" data-kind="fish" data-id="${first("fishIds")}">前往魚類圖鑑</button>`);
  if(first("regionIds")||first("routeIds"))links.push(`<button class="soft-button" data-action="logbook-cross-link" data-kind="chart" data-id="${first("regionIds")||first("routeIds")}">前往古海圖</button>`);
  if(first("shipIds"))links.push(`<button class="soft-button" data-action="logbook-cross-link" data-kind="ship" data-id="${first("shipIds")}">前往船隻商店</button>`);
  if(first("residentIds"))links.push(`<button class="soft-button" data-action="logbook-cross-link" data-kind="resident" data-id="${first("residentIds")}">前往港口居民</button>`);
  if(first("researchIds")||first("observationIds")||first("wonderIds"))links.push(`<button class="soft-button" data-action="logbook-cross-link" data-kind="research" data-id="${first("researchIds")||first("observationIds")||first("wonderIds")}">前往研究海域</button>`);
  return links.join("");
}

function showLogbook({filter=logbookFilter.type,value=logbookFilter.value,entryId=selectedLogbookEntryId}={}) {
  logbookFilter={type:filter||"all",value:value||null};
  const entries=filterJournalEntries(state.journal,logbookFilter.type,logbookFilter.value);
  selectedLogbookEntryId=entries.some(entry=>entry.id===entryId)?entryId:entries[0]?.id||null;
  const selected=entries.find(entry=>entry.id===selectedLogbookEntryId)||null;
  const unreadBefore=new Set(state.journal.unreadEntryIds||[]);
  if(selected&&(unreadBefore.has(selected.id)||state.journal.pendingNoticeEntryIds.includes(selected.id))){
    state.journal=acknowledgeJournalNotices(markJournalEntriesRead(state.journal,[selected.id]),[selected.id]);
    saveGame();syncWorld();
  }
  const unreadNow=new Set(state.journal.unreadEntryIds||[]);
  const filterButtons=[
    ["all",null,"全部"],["unread",null,"未讀"],["day",String(state.day),`第 ${state.day} 日`],["permanent",null,"永久頁"],["daily",null,"今日潮記"]
  ].map(([type,filterValue,label])=>`<button class="filter-chip ${logbookFilter.type===type&&String(logbookFilter.value||"")===String(filterValue||"")?"is-active":""}" data-action="logbook-filter" data-filter="${type}" data-id="${filterValue||""}">${label}</button>`).join("");
  const contextFilter=logbookFilter.value?`<span class="logbook-context-filter">目前交叉篩選：${escapeText(logbookFilter.type)} · ${escapeText(logbookFilter.value)}</span>`:"";
  const list=entries.map(entry=>`<button class="logbook-entry-card ${entry.id===selectedLogbookEntryId?"is-active":""} ${unreadNow.has(entry.id)?"is-unread":""}" data-action="select-logbook-entry" data-id="${entry.id}"><span>${escapeText(JOURNAL_ENTRY_TYPE_LABELS[entry.type]||entry.type)}</span><b>${escapeText(entry.title)}</b><small>${journalEntryDay(entry)}${entry.sealed===false?" · 草稿":""}</small></button>`).join("");
  const detail=selected?`<article class="logbook-page"><div class="logbook-page-meta"><span>${escapeText(JOURNAL_ENTRY_TYPE_LABELS[selected.type]||selected.type)}</span><small>${journalEntryDay(selected)}${selected.sealed===false?" · 今日草稿":""}</small></div><h3>${escapeText(selected.title)}</h3><p>${escapeText(selected.body)}</p>${selected.poeticLine?`<blockquote>${escapeText(selected.poeticLine)}</blockquote>`:""}<div class="logbook-links">${journalEntryLinks(selected)}</div><p class="quiet-note">這一頁在事件發生時已保存完整文字；日後模板更新不會改寫它。</p></article>`:`<div class="modal-empty">這個篩選目前沒有日誌頁。真正相遇後，頁面才會出現。</div>`;
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal logbook-modal"><div class="logbook-heading"><div><span class="section-label">${activeShip(state).name} · 固定日誌架</span><h2>航海日誌</h2><p class="modal-copy">只讀、沒有期限，也不提供編輯或閱讀獎勵。</p></div><b>${state.journal.unreadEntryIds.length} 未讀</b></div><div class="filter-row">${filterButtons}</div>${contextFilter}<div class="logbook-layout"><aside class="logbook-entry-list">${list||'<div class="modal-empty">沒有符合的頁面。</div>'}</aside>${detail}</div><div class="modal-actions"><button class="soft-button" data-action="close-modal">闔上日誌</button></div></div></div>`;
}

function flushJournalNotices() {
  if(!gameIsActive()||modalRoot.innerHTML||!state.journal?.pendingNoticeEntryIds?.length)return;
  const ids=[...state.journal.pendingNoticeEntryIds],entries=filterJournalEntries(state.journal,"all").filter(entry=>ids.includes(entry.id));
  state.journal=acknowledgeJournalNotices(state.journal,ids);saveGame();syncWorld();
  if(entries.length)toast(entries.length===1?`航海日誌新增「${entries[0].title}」`:`航海日誌安靜收進 ${entries.length} 篇新頁`,"gold");
}

function renderHome() {
  const ship = activeShip(state);
  const interior = shipInterior(state);
  const scene = SHIP_INTERIOR_SCENES.find(item=>item.shipId===ship.id);
  const lighting = SHIP_LIGHTING.find(item=>item.id===interior?.lightingId)?.name||"隨潮日光";
  const slots = SHIP_SLOT_TYPES.map(slot=>{
    const position=scene?.slots?.[slot.id]||{},id=interior?.placedFurniture?.[slot.id],item=furnitureById(id);
    const style=`left:${position.x||0}%;top:${position.y||0}%;width:${position.width||10}%;height:${position.height||10}%`;
    return `<button class="home-slot slot-${slot.id} ${item?"":"is-empty"}" style="${style}" data-action="slot" data-id="${slot.id}" title="${item?item.name:`空的${slot.name}插槽`}">${item?`<span>${item.icon}</span><small>${item.name}</small>`:""}</button>`;
  }).join("");
  const ownedFurniture=(interior?.ownedFurnitureIds||[]).map(furnitureById).filter(Boolean);
  content.innerHTML=`${panelHeading(ship.name,`目前船屋 · 航速 ${activeShipSpeed(state).toFixed(2)}×。外面是未知的海，這裡是永遠為你亮著燈的家。`)}
    ${renderAquariumPanel()}<div class="home-layout"><div class="cabin-view theme-${scene?.theme||"default"} lighting-${interior?.lightingId||"default"}" data-ship="${ship.id}"><div class="cabin-fixed-structure fixed-bed-platform"><span>固定床台</span></div><div class="cabin-fixed-structure fixed-chart-desk"><span>航圖桌</span></div><div class="cabin-fixed-structure fixed-journal-shelf"><span>日誌架</span></div><div class="cabin-glow"></div><div class="cabin-window"><i class="window-rain"></i></div>${slots}<div class="cabin-identity"><b>${ship.name}</b><small>${lighting}</small></div></div>
    <aside class="home-side">${renderHomeChartCard()}<div class="card home-card logbook-home-card"><span class="section-label">固定日誌架 · ${state.journal.unreadEntryIds.length} 篇未讀</span><h3>${filterJournalEntries(state.journal,"all")[0]?.title||"把潮聲整理成冊"}</h3><p>永久相遇頁與今日潮記都收在同一本冊子裡；空船也能免費閱讀。</p><button class="soft-button" data-action="show-logbook">翻開航海日誌</button></div><div class="card home-card"><span class="section-label">休息一下</span><h3>${TIMES[state.timeIndex].name}的船屋</h3><p>${state.weather==="rain"?"細雨落在窗上，固定床台與室內暖光讓木牆顯得更加溫柔。":"光線從舷窗落進來，船身隨著海面緩緩呼吸。即使沒有添購寢具，也能安心休息。"}</p><button class="primary-button sleep-button" data-action="sleep">睡到下一個時段</button></div><div class="card home-card"><span class="section-label">${ship.name}的家具</span><div class="owned-list">${ownedFurniture.length?ownedFurniture.map(item=>`<button class="owned-chip ${interior.placedFurniture[item.slot]===item.id?"is-placed":""}" data-action="place-furniture" data-id="${item.id}">${item.icon} ${item.name}</button>`).join(""):'<p class="quiet-note">這艘船還沒有可替換家具；固定床台、航圖桌與水族箱仍可使用。</p>'}</div></div><div class="card home-card"><span class="section-label">圖鑑里程碑</span><div class="milestone-list">${MILESTONES.map(m=>`<div class="milestone-row ${state.completedMilestones.includes(m.count)?"is-done":""}"><i></i><span>${m.count} 種 · ${m.reward}</span></div>`).join("")}</div></div></aside></div>`;
}

function placeFurniture(id) {
  const result=placeShipFurniture(state,id); if(!result.ok)return;
  saveGame(); sound.play("coin"); toast(`${result.item.name}已放進${slotName(result.item.slot)}`); render();
}
function slotName(id){return({sleep:"睡眠區",wall:"牆面",table:"桌面",light:"照明區",corner:"角落"})[id]}
function showSlotModal(slot){
  const options=(shipInterior(state)?.ownedFurnitureIds||[]).map(furnitureById).filter(item=>item?.slot===slot);
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>${slotName(slot)}</h2><p class="modal-copy">選一件已擁有的家具放在這個固定插槽。</p><div class="owned-list">${options.length?options.map(item=>`<button class="owned-chip" data-action="modal-place" data-id="${item.id}">${item.icon} ${item.name}</button>`).join(""):"這個位置還沒有適合的家具，去商店看看吧。"}</div><div class="modal-actions"><button class="soft-button" data-action="close-modal">關閉</button></div></div></div>`;
}

function sleep() {
  const previousDay=state.day;
  const timeResult=advanceTime(state); sound.play("sleep"); saveGame(); syncWorld(); toast(`睡醒時已是${TIMES[state.timeIndex].name}${state.timeIndex===0?`，第 ${state.day} 日`:""}`);
  if(timeResult.autoClaims.length) setTimeout(()=>toast(`${timeResult.autoClaims.length} 項已完成的小目標獎勵已自動收好`,"gold"),240);
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

function notifyTideglow(events = []) {
  const points = events.reduce((sum, event) => {
    const result = event?.results?.tideglow;
    return sum + (result?.awarded ? Number(result.points) || 0 : 0);
  }, 0);
  if (points > 0) setTimeout(() => toast(`潮光悄悄亮起了 +${points}`, "gold"), 260);
  const revealed = events.flatMap(event => event?.results?.tideglow?.newlyRevealed || []);
  if (revealed.length) setTimeout(() => toast(`遠處船影漸漸清楚：${revealed.map(ship => ship.name).join("、")}`, "gold"), 620);
}

function notifyCompletedAchievements(achievements=[]) {
  achievements.forEach((achievement,index)=>setTimeout(()=>toast(`成就完成「${achievement.name}」：獎勵可在圖鑑領取`,"gold"),index*360));
}

function settingsChoices(options, selectedId, action) {
  return `<div class="settings-choices">${options.map(option => `<button class="settings-choice ${selectedId === option.id ? "is-selected" : ""}" data-action="${action}" data-id="${option.id}" aria-pressed="${selectedId === option.id}"><span>${selectedId === option.id ? "✓" : "○"}</span><b>${option.label}</b><small>${Math.round(option.scale * 100)}%</small></button>`).join("")}</div>`;
}

function showSettings() {
  const saveTools = gameIsActive() ? `<section class="settings-save-tools"><span class="section-label">本機存檔備份</span><p>匯出內容只會顯示在這台裝置上；匯入前，現有主要存檔會先保留到備份槽。</p><div class="developer-control-actions"><button class="soft-button" data-action="show-save-export">匯出目前航程</button><button class="soft-button" data-action="show-save-import">匯入同模式航程</button></div></section>` : "";
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal settings-modal"><span class="section-label">資訊無障礙</span><h2>聲音與顯示</h2><p class="modal-copy">文字與介面可分開調整。遊戲預設動態保持柔和，沒有高頻閃爍或快速鏡頭晃動。</p><div class="settings-row"><span><b>操作與捕獲音效</b><small>由瀏覽器即時合成</small></span><button class="toggle ${state.settings.sound?"is-on":""}" data-action="toggle-sound" role="switch" aria-checked="${state.settings.sound}" aria-label="操作與捕獲音效"><i></i></button></div><div class="settings-group"><span><b>文字大小</b><small>只放大標題、說明與按鈕文字</small></span>${settingsChoices(TEXT_SCALE_OPTIONS,state.settings.textScale,"set-text-scale")}</div><div class="settings-group"><span><b>介面縮放</b><small>調整卡片、按鈕與操作區域的整體尺寸</small></span>${settingsChoices(UI_SCALE_OPTIONS,state.settings.uiScale,"set-ui-scale")}</div>${saveTools}<div class="modal-actions"><button class="soft-button" data-action="close-modal">關閉</button></div></div></div>`;
}

function showPortableExport() {
  if (!gameIsActive()) return;
  const text = createPortableSave(state, { mode: activeSaveMode });
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal portable-save-modal"><span class="section-label">${activeSaveMode === "developer" ? "開發者" : "一般"}航程 · v${SAVE_VERSION}</span><h2>匯出航海紀錄</h2><p class="modal-copy">複製下方完整文字並妥善保存。它不包含密碼，也不會傳送到網路。</p><label for="save-export-text">航程備份文字</label><textarea id="save-export-text" class="portable-save-text" readonly spellcheck="false"></textarea><div class="modal-actions"><button class="soft-button" data-action="show-settings">返回設定</button><button class="primary-button" data-action="select-save-export">全選備份文字</button></div></div></div>`;
  const textarea = $("#save-export-text");
  textarea.value = text;
}

function portableImportError(reason) {
  return ({
    empty: "請先貼上完整的航程備份文字。",
    "invalid-json": "這段文字不是完整的 JSON 備份。",
    "invalid-format": "找不到 Atlas of Fins 的備份格式標記。",
    "mode-mismatch": activeSaveMode === "developer" ? "一般航程不能匯入開發者存檔。" : "開發者存檔不能匯入一般航程。",
    "invalid-version": "備份中的存檔版本無法辨識。",
    "unsupported-version": "這份備份來自較新的遊戲版本，請先更新遊戲再匯入。",
    "invalid-state": "備份內容不完整，現有航程沒有被改動。"
  })[reason] || "無法讀取這份備份，現有航程沒有被改動。";
}

function showPortableImport(error = "", draft = "") {
  if (!gameIsActive()) return;
  pendingPortableImport = null;
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal portable-save-modal"><span class="section-label">只接受${activeSaveMode === "developer" ? "開發者" : "一般"}航程</span><h2>匯入航海紀錄</h2><p class="modal-copy">貼上由遊戲匯出的完整文字。確認前不會覆寫任何內容。</p><label for="save-import-text">航程備份文字</label><textarea id="save-import-text" class="portable-save-text" spellcheck="false" aria-describedby="save-import-error"></textarea><p id="save-import-error" class="developer-error" aria-live="polite">${error}</p><div class="modal-actions"><button class="soft-button" data-action="show-settings">取消</button><button class="primary-button" data-action="preview-save-import">檢查備份</button></div></div></div>`;
  $("#save-import-text").value = draft;
}

function previewPortableImport() {
  const draft = $("#save-import-text")?.value || "";
  const result = parsePortableSave(draft, { expectedMode: activeSaveMode, maxSaveVersion: SAVE_VERSION, migrate: migrateState });
  if (!result.ok) { showPortableImport(portableImportError(result.reason), draft); return; }
  pendingPortableImport = { ...result, draft };
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal portable-save-modal"><span class="section-label">備份檢查完成</span><h2>替換目前航程？</h2><p class="modal-copy">將匯入第 ${result.state.day} 航海日、${discoveredCount(result.state)}／${FISH.length} 種世界魚誌的${activeSaveMode === "developer" ? "開發者" : "一般"}航程。現有主要存檔會先放入備份槽，可由備份回復。</p><div class="modal-actions"><button class="soft-button" data-action="show-save-import">返回</button><button class="danger-button" data-action="confirm-save-import">確認匯入</button></div></div></div>`;
}

function confirmPortableImport() {
  if (!pendingPortableImport?.ok) return;
  const previousState = state;
  state = pendingPortableImport.state;
  state.settings = normalizeDisplaySettings(state.settings);
  preserveBackupOnNextSave = false;
  if (!saveGame(true)) {
    state = previousState;
    showPortableImport("本機空間不足，原本的航程沒有被改動。", pendingPortableImport.draft);
    return;
  }
  pendingPortableImport = null;
  savePreferences();
  applyDisplaySettings();
  syncTravelClock();
  currentView = "fishing";
  modalRoot.innerHTML = "";
  render();
  updateTutorial();
  sound.startAmbient();
  toast("航海紀錄已匯入；原本的主要存檔仍保留在備份槽", "gold");
}

function developerTideglowRefs(eventType) {
  const source = TIDEGLOW_SOURCES.find(entry => entry.eventType === eventType);
  const valueBySourceId = {
    fish_discovery: FISH[0]?.id,
    region_arrival: LUMINOUS_ARCHIPELAGO_ID,
    formal_observation: OBSERVATION_SUBJECTS[0]?.id,
    research_node: RESEARCH_NODES[0]?.id,
    region_research: LUMINOUS_ARCHIPELAGO_ID,
    resident_story: getResidentStoryStatus(state, CHENGYE_ID).scenes[0]?.id
  };
  const refs = source ? { [source.refKey]: valueBySourceId[source.id] } : {};
  if (source?.id === "resident_story") refs.residentId = CHENGYE_ID;
  return refs;
}

function developerJournalRefs(eventType) {
  const rareFish=FISH.find(fish=>fish.rarity==="rare");
  const values={
    "fish.discovered":{fishId:rareFish?.id},
    "route.departed":{routeId:"sleeping_tide_to_luminous_archipelago",fromRegionId:SLEEPING_TIDE_BAY_ID,toRegionId:LUMINOUS_ARCHIPELAGO_ID,shipId:state.ships.activeShipId},
    "region.arrived":{regionId:LUMINOUS_ARCHIPELAGO_ID},
    "observation.recorded":{observationId:OBSERVATION_SUBJECTS[0]?.id,regionId:LUMINOUS_ARCHIPELAGO_ID},
    "wonder.recorded":{wonderId:WONDERS[0]?.id,regionId:LUMINOUS_ARCHIPELAGO_ID},
    "research.node.completed":{nodeId:RESEARCH_NODES[0]?.id,regionId:LUMINOUS_ARCHIPELAGO_ID},
    "research.region.completed":{regionId:LUMINOUS_ARCHIPELAGO_ID},
    "resident.story.completed":{residentId:CHENGYE_ID,milestoneId:getResidentStoryStatus(state,CHENGYE_ID).scenes[0]?.id},
    "ship.purchased":{shipId:state.ships.activeShipId},
    "region.completed":{regionId:state.world.currentRegionId},
    "world.completed":{}
  };
  return values[eventType]||{};
}

function showDeveloperTools() {
  if (!state.developerMode) return;
  const dailyOptions = DAILY_GOAL_TEMPLATES.map(template => `<option value="${template.id}">${template.id} · ${template.text}</option>`).join("");
  const commissionOptions = RESIDENTS.map(resident => `<optgroup label="${resident.name}">${getResidentCommissionTemplates(resident.id).map(template => `<option value="${template.id}">${template.id} · ${template.title}</option>`).join("")}</optgroup>`).join("");
  const residentOptions = RESIDENTS.map(resident => `<option value="${resident.id}">${resident.name}</option>`).join("");
  const active = state.residentCommissions.active;
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal developer-modal"><span class="section-label">資料驅動測試入口</span><h2>Slice D 開發者控制</h2><p class="modal-copy">每日模板與居民委託選項直接由正式內容資料產生；所有操作只寫入獨立開發者存檔。</p><div class="developer-control-grid"><section class="developer-control-card"><h3>每日小目標</h3><label>卡片位置<select id="developer-daily-slot"><option value="0">第 1 張</option><option value="1">第 2 張</option><option value="2">第 3 張</option></select></label><label>正式模板<select id="developer-daily-template">${dailyOptions}</select></label><div class="developer-control-actions"><button class="soft-button" data-action="developer-set-daily">指定模板</button><button class="soft-button" data-action="developer-complete-daily">全部完成</button><button class="soft-button" data-action="developer-claim-daily">領取完成</button><button class="soft-button" data-action="developer-next-day">推進航海日</button><button class="soft-button" data-action="developer-reset-daily">重置今日</button></div></section><section class="developer-control-card"><h3>居民委託</h3><label>居民<select id="developer-resident">${residentOptions}</select></label><label>正式模板<select id="developer-commission-template">${commissionOptions}</select></label><p class="quiet-note">${active ? `進行中：${active.title} · ${active.progress}/${active.goal}` : "目前沒有 active 委託"}</p><div class="developer-control-actions"><button class="soft-button" data-action="developer-set-offer">指定提案</button><button class="soft-button" data-action="developer-accept-offer">接受提案</button><button class="soft-button" data-action="developer-complete-commission">完成進度</button><button class="soft-button" data-action="developer-deliver-commission">交付</button><button class="soft-button" data-action="developer-drop-commission">放下</button><button class="soft-button" data-action="developer-clear-commission-history">清除歷史</button></div></section></div><div class="modal-actions"><button class="primary-button" data-action="close-modal">完成測試</button></div></div></div>`;
  const travelStatus = getTravelStatus(state.world);
  const scaleOptions = DEVELOPER_TRAVEL_SCALES.map(scale => `<option value="${scale}" ${state.travelSettings.developerDurationScale === scale ? "selected" : ""}>${scale === 1 ? "正式速度 100%" : `測試速度 ${Math.round(scale * 100)}%`}</option>`).join("");
  $(".developer-modal h2")?.replaceChildren("v0.5 Slice D 整合控制");
  $(".developer-modal .modal-copy")?.replaceChildren("既有旅程控制與 v5 事件、潮光帳本集中於此；全部操作只寫入獨立開發者存檔。");
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>正式航線</h3><label>航程時間比例<select id="developer-travel-scale">${scaleOptions}</select></label><p class="quiet-note">${travelStatus ? `航行中：${travelStatus.route.name} · ${travelStatus.segment}/${travelStatus.totalSegments}` : state.world.docking?.status === "offshore" ? `已抵達${regionById(state.world.docking.regionId)?.name || "目的地"}外海` : "目前安全停泊"}</p><div class="developer-control-actions"><button class="soft-button" data-action="developer-set-travel-scale">套用比例</button><button class="soft-button" data-action="developer-arrive-travel" ${travelStatus ? "" : "disabled"}>立即抵達外海</button><button class="soft-button" data-action="developer-reset-route">重置首條航線</button></div></section>`);
  const regionOptions = REGIONS.filter(region => region.status === "available").map(region => `<option value="${region.id}" ${state.world.currentRegionId === region.id ? "selected" : ""}>${region.name} · ${region.portName}</option>`).join("");
  const eventOptions = BAY_EVENTS.filter(event => event.regionId === state.world.currentRegionId).map(event => `<option value="${event.id}">${event.id} · ${event.name}</option>`).join("");
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>琉光群島內容</h3><label>直接停泊區域<select id="developer-region">${regionOptions}</select></label><label>目前區域事件<select id="developer-region-event">${eventOptions}</select></label><p class="quiet-note">三個釣點、正式觀察點、澄野與研究主路均可直接驗證。</p><div class="developer-control-actions"><button class="soft-button" data-action="developer-dock-region">直接停泊</button><button class="soft-button" data-action="developer-set-region-event" ${eventOptions ? "" : "disabled"}>指定事件</button></div></section>`);
  const observationOptions = OBSERVATION_SUBJECTS.map(subject => `<option value="${subject.id}">${subject.id} · ${subject.name}</option>`).join("");
  const luminousResearch = getRegionResearchStatus(state, LUMINOUS_ARCHIPELAGO_ID);
  const chengyeStory = getResidentStoryStatus(state, CHENGYE_ID);
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>觀察、研究與澄野</h3><label>正式觀察魚<select id="developer-observation-subject">${observationOptions}</select></label><p class="quiet-note">觀察 ${Object.keys(state.observations?.recordsById || {}).length}/${OBSERVATION_SUBJECTS.length} · 研究 ${luminousResearch?.speciesCount || 0}/${luminousResearch?.research.fullSpeciesGoal || 15} · 澄野 ${chengyeStory.completedSceneIds.length}/${chengyeStory.scenes.length}</p><div class="developer-control-actions"><button class="soft-button" data-action="developer-record-observation">直接記錄</button><button class="soft-button" data-action="developer-reset-observations">重置觀察</button><button class="soft-button" data-action="developer-complete-research">完成研究</button><button class="soft-button" data-action="developer-reset-chengye">重置澄野故事</button></div></section>`);
  const tideglowOptions = TIDEGLOW_SOURCES.map(source => `<option value="${source.eventType}">${source.label} · +${source.points}</option>`).join("");
  const ledger = Object.values(state.tideglow?.ledgerBySourceId || {}).slice(-5).reverse();
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>潮光與事件帳本</h3><label>合法來源<select id="developer-tideglow-source">${tideglowOptions}</select></label><p class="quiet-note">顯示 ${state.tideglow?.total || 0} · 帳本 ${Object.keys(state.tideglow?.ledgerBySourceId || {}).length} · pending ${state.gameEvents?.pending?.length || 0} · recent ${state.gameEvents?.recent?.length || 0}</p><div class="developer-ledger">${ledger.length ? ledger.map(entry => `<small>${entry.sourceId} · +${entry.points}</small>`).join("") : "<small>帳本尚未留下光點</small>"}</div><div class="developer-control-actions"><button class="soft-button" data-action="developer-tideglow-down">−10 顯示值</button><button class="soft-button" data-action="developer-tideglow-up">+10 顯示值</button><button class="soft-button" data-action="developer-emit-tideglow">發送來源</button><button class="soft-button" data-action="developer-emit-tideglow">重送驗證去重</button></div></section>`);
  const shipOptions = SHIPS.map(ship => `<option value="${ship.id}" ${state.ships.activeShipId === ship.id ? "selected" : ""}>${ship.name} · ${ship.status === "implemented" ? `${ship.speedMultiplier.toFixed(2)}×` : "預告"}</option>`).join("");
  const speedOptions = [...new Set([.5, 1, ...SHIPS.map(ship => ship.speedMultiplier), 1.5, 2])].sort((a,b)=>a-b).map(speed => `<option value="${speed}" ${activeShipSpeed(state) === speed ? "selected" : ""}>${speed.toFixed(2)}×</option>`).join("");
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>船隻、揭露與航速</h3><label>正式船隻<select id="developer-ship">${shipOptions}</select></label><label>航速測試覆寫<select id="developer-ship-speed">${speedOptions}</select></label><p class="quiet-note">目前 ${activeShip(state).name} · 擁有 ${state.ships.ownedShipIds.length}/${SHIPS.length} · 揭露 ${state.ships.revealedShipIds.length}/${SHIPS.length}</p><div class="developer-control-actions"><button class="soft-button" data-action="developer-own-ship">切換擁有</button><button class="soft-button" data-action="developer-activate-ship">設為目前船</button><button class="soft-button" data-action="developer-reveal-ships">揭露全部</button><button class="soft-button" data-action="developer-set-ship-speed">套用航速</button><button class="soft-button" data-action="developer-fill-money">補滿金幣</button></div></section>`);
  const activeInterior=shipInterior(state),lightingOptions=SHIP_LIGHTING.map(option=>`<option value="${option.id}" ${activeInterior?.lightingId===option.id?"selected":""}>${option.name}</option>`).join("");
  const invalidInteriorRefs=collectInvalidInteriorReferences(state);
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>船別家具與燈光</h3><label>${activeShip(state).name}燈光<select id="developer-ship-lighting">${lightingOptions}</select></label><p class="quiet-note">擁有 ${activeInterior?.ownedFurnitureIds.length||0}/${activeShipFurnitureCatalog(state).length} · 已配置 ${Object.values(activeInterior?.placedFurniture||{}).filter(Boolean).length}/${SHIP_SLOT_TYPES.length} · 失效引用 ${invalidInteriorRefs.length}</p><div class="developer-control-actions"><button class="soft-button" data-action="developer-fill-ship-furniture">購齊並填入</button><button class="soft-button" data-action="developer-clear-ship-furniture">清除船別家具</button><button class="soft-button" data-action="developer-reset-ship-slots">重置插槽</button><button class="soft-button" data-action="developer-set-ship-lighting">套用燈光</button><button class="soft-button" data-action="developer-inspect-interiors">檢查失效引用</button></div></section>`);
  const journalOptions=JOURNAL_EVENT_TEMPLATES.map(template=>`<option value="${template.eventType}">${template.entryType} · ${template.eventType}</option>`).join("");
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>初遇與航海日誌</h3><label>永久頁事件<select id="developer-journal-event">${journalOptions}</select></label><p class="quiet-note">永久 ${state.journal.permanentEntries.length} · 潮記 ${state.journal.dailyEntries.length} · 十日摘要 ${state.journal.dailyArchives.length} · 未讀 ${state.journal.unreadEntryIds.length}</p><div class="developer-control-actions"><button class="soft-button" data-action="developer-emit-journal">發送新事件</button><button class="soft-button" data-action="developer-resend-journal">重送驗證去重</button><button class="soft-button" data-action="developer-fill-journal">填滿 181 篇潮記</button><button class="soft-button" data-action="developer-check-journal">檢查頁面引用</button><button class="soft-button" data-action="show-logbook">開啟日誌</button></div></section>`);
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>整合與存檔</h3><p class="quiet-note">存檔 v${SAVE_VERSION} · ${regionById(state.world.currentRegionId)?.name || state.world.currentRegionId} · DOM ${document.querySelectorAll("*").length} 節點 · SVG ${document.querySelectorAll("svg").length} 個</p><div class="developer-control-actions"><button class="soft-button" data-action="show-settings">顯示與縮放</button><button class="soft-button" data-action="show-save-export">匯出開發者存檔</button><button class="soft-button" data-action="show-save-import">匯入開發者存檔</button></div></section>`);
}

function finishDeveloperAction(message) {
  saveGame(); render(); showDeveloperTools(); toast(message, "gold");
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
  const {action,id,direction,incoming,replace,x,y,filter,entry,kind}=target.dataset;
  if(action==="cast")castLine();
  if(action==="hook")startReeling();
  if(action==="reset-fishing")resetFishing();
  if(action==="spot"&&getRegionFishingSpots(state.world?.currentRegionId).some(spot=>spot.id===id)){state.selectedSpot=id;saveGame();renderFishing();syncWorld();}
  if(action==="preview-observation")showObservationPreview(id);
  if(action==="claim-quest"&&claimQuest(state,id)){sound.play("coin");saveGame();toast("今日目標完成，獎勵已收入錢袋");render();}
  if(action==="talk-resident")showResidentDialogue(id);
  if(action==="accept-commission"){
    const result=acceptResidentCommission(state,id);
    if(result.ok){saveGame();render();toast(`已接受「${result.commission.title}」，委託不會隨換日過期`);}
  }
  if(action==="drop-commission"){
    const result=dropResidentCommission(state);
    if(result.ok){saveGame();render();toast("委託已輕輕放下，沒有任何懲罰");}
  }
  if(action==="deliver-commission"){
    const result=deliverResidentCommission(state,id);
    if(result.ok){sound.play("coin");saveGame();render();showResidentDialogue(id,result.dialogue);toast(`委託完成：${rewardLabel(result.reward)}`,"gold");}
    else toast("需要回到正確居民所在的港口，才能當面交付");
  }
  if(action==="close-catch"){modalRoot.innerHTML="";render();setTimeout(flushJournalNotices,0);}
  if(action==="modal-journal"){modalRoot.innerHTML="";selectedJournalFish=id;setView("journal");}
  if(action==="journal-filter"){journalFilter=id;renderJournal();}
  if(action==="select-fish"){selectedJournalFish=id;renderJournal();}
  if(action==="show-logbook")showLogbook({filter:filter||"all",value:filter?id:null,entryId:entry||null});
  if(action==="logbook-filter")showLogbook({filter:filter||"all",value:id||null,entryId:null});
  if(action==="select-logbook-entry")showLogbook({filter:logbookFilter.type,value:logbookFilter.value,entryId:id});
  if(action==="logbook-cross-link"){
    modalRoot.innerHTML="";
    if(kind==="fish"){selectedJournalFish=id;journalFilter="all";setView("journal");}
    if(kind==="chart")setView("chart");
    if(kind==="ship"){shopTab="ships";setView("shop");}
    if(kind==="resident")setView("residents");
    if(kind==="research")setView("fishing");
  }
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
  if(action==="prepare-buy-ship")showShipPurchaseConfirmation(id);
  if(action==="confirm-buy-ship"){
    const result=buyShip(state,id);
    if(result.ok){modalRoot.innerHTML="";beginShipTransition(`${result.ship.name}已靠岸；潮光仍完整保留`);}
    else toast("購買未完成，原本的金幣與船隻都沒有改變");
  }
  if(action==="switch-ship"){
    const result=switchActiveShip(state,id);
    if(result.ok&&!result.unchanged){beginShipTransition(`現在使用${result.ship.name}`);}
    else if(!result.ok)toast("只有安全停泊時能切換已擁有的船隻");
  }
  if(action==="shop-equip-rod"){state.equippedRod=id;saveGame();toast(`已裝備${rodById(id).name}`);renderShop();syncWorld();}
  if(action==="buy-rod"&&buyRod(state,id)){sound.play("coin");saveGame();toast(`買下並裝備了${rodById(id).name}`);render();}
  if(action==="buy-bait"&&buyBait(state,id)){sound.play("coin");if(!state.completedTutorial&&state.tutorialStep===4)state.tutorialStep=5;saveGame();toast(`${baitById(id).name}已放入裝備箱`);render();updateTutorial();}
  if(action==="buy-furniture"){
    const result=buyShipFurniture(state,id);
    if(result.ok){sound.play("coin");saveGame();toast(`${result.item.name}已放進${activeShip(state).name}`);render();}
    else if(!["owned"].includes(result.reason))toast("家具購買未完成；請確認目前船隻、停泊狀態、解鎖條件與金幣");
  }
  if(action==="place-furniture")placeFurniture(id);
  if(action==="slot")showSlotModal(id);
  if(action==="modal-place"){modalRoot.innerHTML="";placeFurniture(id);}
  if(action==="sleep")sleep();
  if(action==="open-chart")setView("chart");
  if(action==="chart-zoom")updateChartView(zoomChartView(state.chartView,Number(direction)));
  if(action==="chart-pan")updateChartView(panChartView(state.chartView,Number(x),Number(y)));
  if(action==="chart-reset")updateChartView({zoom:1,x:0,y:0});
  if(action==="prepare-chart-route")showRouteConfirmation(id);
  if(action==="confirm-chart-route"){
    modalRoot.innerHTML="";
    clearFishing(); fishing.phase="idle";
    const result=beginRouteTravel(state,id,Date.now());
    if(result.ok){saveGame();syncTravelClock();render();toast(`已沿${result.route.name}出發。可以關閉遊戲，航程會照常前進。`,"gold");setTimeout(flushJournalNotices,0);}
    else toast("目前無法從這個位置出發，請先確認船已安全停泊");
  }
  if(action==="dock-arrival"){
    const result=dockAtDestination(state,Date.now());
    if(result.ok){saveGame();syncTravelClock();render();sound.startAmbient();showDockingScene(result);notifyTideglow(result.tideglowEvents);}
    else toast("船目前還沒有抵達可停泊的外海");
  }
  if(action==="dismiss-tutorial")tutorialEl.classList.add("is-hidden");
  if(action==="tutorial-go-fishing")setView("fishing");
  if(action==="show-developer-tools")showDeveloperTools();
  if(action==="developer-set-daily"){
    const slot=$("#developer-daily-slot")?.value,templateId=$("#developer-daily-template")?.value;
    if(developerSetDailyGoal(state,slot,templateId))finishDeveloperAction("已指定每日目標模板");
  }
  if(action==="developer-complete-daily"&&developerCompleteDailyGoals(state))finishDeveloperAction("每日目標進度已完成");
  if(action==="developer-claim-daily"){
    const claims=claimAllCompletedDailyGoals(state);
    finishDeveloperAction(`已領取 ${claims.length} 項每日獎勵`);
  }
  if(action==="developer-next-day"){
    const startDay=state.day;
    for(let index=0;index<TIMES.length&&state.day===startDay;index+=1)advanceTime(state,()=>1);
    finishDeveloperAction(`已推進至第 ${state.day} 日`);
  }
  if(action==="developer-reset-daily"&&developerResetDailyBoard(state))finishDeveloperAction("今日目標已重置");
  if(action==="developer-set-offer"){
    const template=COMMISSION_TEMPLATES.find(item=>item.id===$("#developer-commission-template")?.value);
    if(template&&developerSetResidentOffer(state,template.residentId,template.id))finishDeveloperAction(`已指定${residentById(template.residentId).name}提案`);
  }
  if(action==="developer-accept-offer"){
    const result=acceptResidentCommission(state,$("#developer-resident")?.value);
    if(result.ok)finishDeveloperAction(`已接受「${result.commission.title}」`);else toast("目前無法接受：請確認居民提案與 active 狀態");
  }
  if(action==="developer-complete-commission"&&developerCompleteResidentCommission(state))finishDeveloperAction("active 委託進度已完成");
  if(action==="developer-deliver-commission"){
    const residentId=state.residentCommissions.active?.residentId,result=residentId?deliverResidentCommission(state,residentId):{ok:false};
    if(result.ok)finishDeveloperAction(`已交付委託：${rewardLabel(result.reward)}`);else toast("沒有可在目前港口交付的委託");
  }
  if(action==="developer-drop-commission"){
    const result=dropResidentCommission(state);
    if(result.ok)finishDeveloperAction("active 委託已放下");else toast("目前沒有 active 委託");
  }
  if(action==="developer-clear-commission-history"&&developerClearResidentCommissionHistory(state))finishDeveloperAction("居民委託歷史已清除");
  if(action==="developer-set-travel-scale"){
    const scale=$("#developer-travel-scale")?.value;
    if(developerSetTravelScale(state,scale))finishDeveloperAction(`下一趟航程測試比例已設為 ${Math.round(state.travelSettings.developerDurationScale*100)}%`);
  }
  if(action==="developer-arrive-travel"){
    if(developerArriveTravel(state,Date.now())){saveGame();syncTravelClock();render();showDeveloperTools();toast("已抵達目的地外海，仍需手動停泊","gold");}
    else toast("目前沒有進行中的航程");
  }
  if(action==="developer-reset-route"&&developerResetRouteState(state)){
    saveGame();syncTravelClock();render();showDeveloperTools();toast("首條航線已重置至眠潮灣初次出發狀態","gold");
  }
  if(action==="developer-dock-region"){
    const regionId=$("#developer-region")?.value;
    if(developerDockRegion(state,regionId)){syncTravelClock();sound.startAmbient();finishDeveloperAction(`已直接停泊${regionById(regionId)?.portName||"指定港口"}`);}
  }
  if(action==="developer-set-region-event"){
    const eventId=$("#developer-region-event")?.value;
    if(developerSetRegionEvent(state,eventId))finishDeveloperAction(`已指定區域事件「${BAY_EVENTS.find(event=>event.id===eventId)?.name||eventId}」`);
  }
  if(action==="developer-record-observation"){
    const subjectId=$("#developer-observation-subject")?.value;
    if(developerRecordObservation(state,subjectId))finishDeveloperAction(`已直接記錄「${OBSERVATION_SUBJECTS.find(subject=>subject.id===subjectId)?.name||subjectId}」`);
  }
  if(action==="developer-reset-observations"&&developerResetObservations(state))finishDeveloperAction("正式觀察與奇景紀錄已重置");
  if(action==="developer-complete-research"&&developerCompleteRegionResearch(state,LUMINOUS_ARCHIPELAGO_ID))finishDeveloperAction("琉光研究節點與外觀獎勵已完成");
  if(action==="developer-reset-chengye"&&developerResetChengyeStory(state))finishDeveloperAction("澄野故事已回到初遇前");
  if(action==="developer-tideglow-down"&&developerAdjustTideglow(state,-10))finishDeveloperAction("潮光測試顯示值已減少 10");
  if(action==="developer-tideglow-up"&&developerAdjustTideglow(state,10))finishDeveloperAction("潮光測試顯示值已增加 10");
  if(action==="developer-emit-tideglow"){
    const eventType=$("#developer-tideglow-source")?.value;
    const result=developerEmitTideglowEvent(state,eventType,developerTideglowRefs(eventType));
    if(result)finishDeveloperAction(result.results?.tideglow?.awarded?"合法潮光來源已入帳":"來源已存在，帳本正確阻止重複入帳");
  }
  if(action==="developer-emit-journal"){
    const eventType=$("#developer-journal-event")?.value;
    const result=developerEmitJournalEvent(state,eventType,developerJournalRefs(eventType));
    if(result)finishDeveloperAction(result.results?.journal?.createdEntries?.length?"日誌事件已立即保存完整頁面":"事件已處理，沒有建立不符合條件的空頁");
  }
  if(action==="developer-resend-journal"){
    const eventType=$("#developer-journal-event")?.value;
    const result=developerEmitJournalEvent(state,eventType,developerJournalRefs(eventType),`developer:journal:dedupe:${eventType}`);
    if(result)finishDeveloperAction(result.duplicate?"同一事件 ID 已正確去重":"固定事件已發送；再次按下可驗證去重");
  }
  if(action==="developer-fill-journal"&&developerFillJournalArchive(state,181))finishDeveloperAction("已建立並封存 181 篇潮記，最舊十日已整理為區域摘要");
  if(action==="developer-check-journal"){
    const sourceIds=state.journal.permanentEntries.map(entry=>entry.sourceId),valid=sourceIds.length===new Set(sourceIds).size&&state.journal.dailyEntries.length<=180&&state.journal.permanentEntries.every(entry=>entry.body&&entry.title);
    toast(valid?"日誌來源、完整文字與 180 篇上限皆通過":"日誌檢查發現重複或缺漏",valid?"gold":"");
  }
  if(action==="developer-own-ship"){
    const shipId=$("#developer-ship")?.value,owned=state.ships.ownedShipIds.includes(shipId);
    if(developerSetShipOwned(state,shipId,!owned))finishDeveloperAction(owned?"已移除測試船隻擁有狀態":"已加入測試船隻擁有狀態");
  }
  if(action==="developer-activate-ship"){
    const shipId=$("#developer-ship")?.value,result=switchActiveShip(state,shipId);
    if(result.ok)finishDeveloperAction(`目前船隻已設為${result.ship.name}`);else toast("請先讓開發者存檔擁有這艘已實作船隻");
  }
  if(action==="developer-reveal-ships"&&developerRevealShips(state))finishDeveloperAction("六艘正式船影已全部揭露");
  if(action==="developer-set-ship-speed"&&developerSetShipSpeed(state,$("#developer-ship-speed")?.value))finishDeveloperAction(`航速測試值已設為 ${activeShipSpeed(state).toFixed(2)}×`);
  if(action==="developer-fill-ship-furniture"&&developerFillActiveShipFurniture(state))finishDeveloperAction(`${activeShip(state).name}家具已購齊並填入共通插槽`);
  if(action==="developer-clear-ship-furniture"&&developerClearActiveShipFurniture(state))finishDeveloperAction(`${activeShip(state).name}可替換家具已清除，固定結構仍保留`);
  if(action==="developer-reset-ship-slots"&&developerResetActiveShipSlots(state))finishDeveloperAction(`${activeShip(state).name}五個插槽已重置`);
  if(action==="developer-set-ship-lighting"&&developerSetActiveShipLighting(state,$("#developer-ship-lighting")?.value))finishDeveloperAction(`${activeShip(state).name}燈光已切換`);
  if(action==="developer-inspect-interiors"){
    const problems=collectInvalidInteriorReferences(state);
    toast(problems.length?`找到 ${problems.length} 個失效船屋引用`:`三艘船屋引用完整，沒有失效資料`,problems.length?"":"gold");
  }
  if(action==="developer-fill-money"){state.money=999999;finishDeveloperAction("測試金幣已補滿");}
  if(action==="show-settings")showSettings();
  if(action==="show-save-export")showPortableExport();
  if(action==="show-save-import")showPortableImport("",pendingPortableImport?.draft||"");
  if(action==="select-save-export"){const textarea=$("#save-export-text");textarea?.focus();textarea?.select();}
  if(action==="preview-save-import")previewPortableImport();
  if(action==="confirm-save-import")confirmPortableImport();
  if(action==="set-text-scale"){
    state.settings.textScale=id;persistDisplaySettings();showSettings();toast(`文字大小已調整為「${TEXT_SCALE_OPTIONS.find(option=>option.id===id)?.label||"標準"}」`);
  }
  if(action==="set-ui-scale"){
    state.settings.uiScale=id;persistDisplaySettings();showSettings();toast(`介面縮放已調整為「${UI_SCALE_OPTIONS.find(option=>option.id===id)?.label||"標準"}」`);
  }
  if(action==="toggle-sound"){state.settings.sound=!state.settings.sound;persistDisplaySettings();showSettings();syncWorld();if(state.settings.sound){sound.play("coin");sound.startAmbient();}else sound.stopAmbient();}
  if(action==="close-modal"){modalRoot.innerHTML="";setTimeout(flushJournalNotices,0);}
  if(action==="to-title"){if(state.world?.travel)travelClockTick({forceSave:true});clearInterval(travelClockTimer);travelClockTimer=null;clearFishing();sound.stopAmbient();modalRoot.innerHTML="";gameShell.classList.add("is-hidden");titleScreen.classList.remove("is-hidden");app.classList.remove("is-developer-mode");$("#developer-tools-button").hidden=true;$("#continue-button").disabled=!hasSave("normal");}
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
  const chartViewport=event.target.closest?.(".chart-viewport");
  if(chartViewport){
    const key=event.key;
    const panByKey={ArrowUp:[0,-CHART_VIEW_LIMITS.panStep],ArrowDown:[0,CHART_VIEW_LIMITS.panStep],ArrowLeft:[-CHART_VIEW_LIMITS.panStep,0],ArrowRight:[CHART_VIEW_LIMITS.panStep,0]}[key];
    if(panByKey){event.preventDefault();updateChartView(panChartView(state.chartView,...panByKey));return;}
    if(key==="+"||key==="="){event.preventDefault();updateChartView(zoomChartView(state.chartView,1));return;}
    if(key==="-"||key==="_"){event.preventDefault();updateChartView(zoomChartView(state.chartView,-1));return;}
    if(key==="0"){event.preventDefault();updateChartView({zoom:1,x:0,y:0});return;}
  }
  if(event.code==="Space"&&fishing.phase==="reeling"){event.preventDefault();fishing.held=true;$("#reel-button")?.classList.add("is-held");}
});
document.addEventListener("keyup",event=>{if(event.code==="Space"){fishing.held=false;$("#reel-button")?.classList.remove("is-held");}});
window.addEventListener("pointerup",()=>{fishing.held=false;$("#reel-button")?.classList.remove("is-held");});
document.addEventListener("visibilitychange",()=>{
  if(!state.world?.travel)return;
  if(document.visibilityState==="hidden")travelClockTick({forceSave:true});
  else {const result=travelClockTick();if(result.arrived||result.changed)render();syncTravelClock();}
});
window.addEventListener("pagehide",()=>{if(state.world?.travel)travelClockTick({forceSave:true});});

$$(".nav-button").forEach(button=>button.addEventListener("click",()=>setView(button.dataset.view)));
$("#continue-button").addEventListener("click",()=>startGame(false,"normal"));
$("#new-game-button").addEventListener("click",()=>{
  if(hasSave("normal")) modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>展開新旅程？</h2><p class="modal-copy">這會替換目前的航海紀錄與備份存檔。</p><div class="modal-actions"><button class="soft-button" data-action="close-modal">取消</button><button id="confirm-new" class="danger-button">開始新遊戲</button></div></div></div>`,$("#confirm-new").addEventListener("click",()=>{modalRoot.innerHTML="";startGame(true,"normal")}); else startGame(true,"normal");
});
$("#developer-mode-button").addEventListener("click",()=>CONTENT_VALIDATION.ok ? showDeveloperLogin() : renderContentValidationReport(CONTENT_VALIDATION, modalRoot));
$("#title-settings-button").addEventListener("click",showSettings);
$("#sound-button").addEventListener("click",showSettings);
$("#save-button").addEventListener("click",()=>saveGame(true));
$("#menu-button").addEventListener("click",showMainMenuConfirm);
$("#time-chip").addEventListener("click",()=>toast("回到船屋使用床鋪，就能切換到下一個時段"));

setInterval(()=>{ if(!gameShell.classList.contains("is-hidden"))saveGame(); },30000);
setInterval(()=>{
  if(gameShell.classList.contains("is-hidden"))return;
  const timeResult=advanceTime(state);saveGame();syncWorld();sound.startAmbient();
  toast(`潮水慢慢推進，現在是${TIMES[state.timeIndex].name}`);
  if(timeResult.autoClaims.length)setTimeout(()=>toast(`${timeResult.autoClaims.length} 項每日獎勵已自動收好`,"gold"),280);
  if(currentView==="home")renderHome();
},300000);
window.addEventListener("beforeunload",()=>saveGame());
state.settings=loadPreferences(state.settings);
applyDisplaySettings();
$("#continue-button").disabled=!CONTENT_VALIDATION.ok||!hasSave();
applyContentValidationGate(CONTENT_VALIDATION);

import { createFishingBitePlan } from './systems/fishing-bite-sequence.js';
import {
  ACHIEVEMENTS, AQUARIUM_CAPACITY_MILESTONES, AUTO_FISHING_EQUIPMENT, BAITS, BAY_EVENTS, CHART_REGION_POINTS, CHART_ROUTE_PATHS,
  CHENGYE_ID, COMMISSION_TEMPLATES, CONTENT_VALIDATION, DAILY_GOAL_TEMPLATES, FISH, FURNITURE,
  JOURNAL_ENTRY_TYPE_LABELS, MILESTONES,
  LUMINOUS_ARCHIPELAGO_ID, OBSERVATION_SUBJECTS, RARITY, REGIONS, RESEARCH_NODES, RESIDENTS, RODS,
  SHIPS, SHIP_INTERIOR_SCENES, SHIP_LIGHTING, SHIP_SLOT_TYPES, SLEEPING_TIDE_BAY_ID, SPOTS, TIDEGLOW_SOURCES, TIMES, WONDERS,
  fishAssetSrcSet, getFishHabitat, getResidentCommissionTemplates, getRegionFishingSpots, getRegionObservationSpots,
  getRoutesForRegion, regionById, resolveFishAsset, residentById, routeById, shipById
} from "./data.js";
import {
  BACKUP_KEY, CHART_VIEW_LIMITS, DEVELOPER_TRAVEL_SCALES, DEV_BACKUP_KEY, DEV_SAVE_KEY, DEV_TEMP_SAVE_KEY,
  SAVE_KEY, SAVE_VERSION, TEMP_SAVE_KEY,
  acceptResidentCommission, acceptResidentStory, acknowledgeAutoFishing, activeShip, activeShipSpeed, activeShipFurnitureCatalog,
  advanceTime, applyMilestones, autoFishingSummaryView, baitById, beginRouteTravel,
  buyAutoFishingEquipment, buyBait, buyRod, buyShip, buyShipFurniture, chooseFish, claimAchievement,
  claimAllCompletedDailyGoals, claimQuest, completeResidentStory, createDeveloperState, createInitialState, deliverResidentCommission,
  cancelAutoFishingClosed, configureAutoFishing, developerArriveTravel, developerClearResidentCommissionHistory, developerCompleteDailyGoals,
  developerCompleteRegionResearch, developerCompleteResidentCommission, developerRecordObservation,
  developerResetChengyeStory, developerResetDailyBoard, developerResetObservations, developerResetRouteState,
  developerDockRegion, developerResetAutoFishing, developerSetDailyGoal, developerSetRegionEvent, developerSetResidentOffer,
  developerSetTravelScale, developerAdjustTideglow, developerEmitTideglowEvent,
  developerClearActiveShipFurniture, developerFillActiveShipFurniture, developerResetActiveShipSlots,
  developerRevealShips, developerSetActiveShipLighting, developerSetShipOwned, developerSetShipSpeed,
  developerSimulateAutoFishing, discoveredCount,
  dockAtDestination, dropResidentCommission, equipTitle, fishById,
  furnitureById, generateCatch, getAchievementProgress, getActiveBayEvent, getActiveBayEventState,
  getAquariumCapacity, getAutoFishingFishPool, getBayEventHint, getEligibleAutoFishingBaits,
  getEligibleAutoFishingSpots, getFamiliarity, getObservationHint,
  getJournalCategories, getJournalEntries, getJournalEntry, getJournalUnreadCount,
  getRegionResearchStatus, getResidentStoryStatus, getShipPurchaseState,
  getRouteDurationForState, getTensionConfig, getTravelStatus, getUnclaimedAchievementCount, isRouteUnlockedForState, isUnlocked,
  markAutoFishingClosed, markJournalEntriesRead, acknowledgeJournalNotices, migrateState, moveCatchToAquarium,
  isBayEventConditionActive, isCurrentSaveSchema, observeAtSpot, recordCatch, removeFishFromAquarium, replaceAquariumFish, rodById, sellCatches,
  rollCaptureSuccess,
  normalizeChartView, panChartView, placeShipFurniture, progressTravel, setAquariumDecoration, settleAutoFishing,
  shipInterior, stopAutoFishing, swapAquariumFish, switchActiveShip, collectInvalidInteriorReferences,
  zoomChartView
} from "./core.js";
import { loadStoredState, writeStoredState } from "./persistence/migrations.js";
import { createPortableSave, parsePortableSave } from "./persistence/portable-save.js";
import {
  TEXT_SCALE_OPTIONS, UI_SCALE_OPTIONS, displayScaleValue, normalizeDisplaySettings, normalizeSoundVolume
} from "./systems/accessibility.js";
import {
  TUTORIAL_TOTAL_STEPS, TUTORIAL_VERSION, completeTutorial, tutorialIsActive
} from "./systems/tutorial.js?rev=20260722-main-menu-unlock";
import { applyContentValidationGate, renderContentValidationReport } from "./ui/content-error-view.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const app = $("#app");
const titleScreen = $("#title-screen");
const gameShell = $("#game-shell");
const worldScene = $("#world-scene");
const content = $("#content-panel");
const taskTracker = $("#task-tracker");
const modalRoot = $("#modal-root");
const tutorialEl = $("#tutorial");
const tutorialSpotlight = $("#tutorial-spotlight");
const escapeText = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

let state = createInitialState();
let currentView = "fishing";
let activeSaveMode = "normal";
let journalFilter = "all";
let selectedJournalFish = null;
let logbookCategoryId = "today";
let selectedLogbookEntryId = null;
let shopTab = "rods";
let chartPointer = null;
let chartSaveTimer = null;
let travelClockTimer = null;
let lastPersistedTravelElapsed = 0;
const protectedBackupModes = new Set();
let shouldRewriteLoadedSave = false;
let pendingPortableImport = null;
let shipTransitionTimer = null;
let fishing = {
  phase: "idle", fish: null, caught: null, context: null, timer: null, raf: null,
  held: false, tension: .38, progress: 0, danger: 0, last: 0,
  nibbleIndex: 0, falseNibbles: 0, bitePlan: null, cueIndex: 0, cue: null, fishSide: "left",
  failureReason: null, captureChance: null
};
let fishingRigFrame = null;
let tutorialFocusFrame = null;
let tutorialFocusedStep = null;

const TUTORIAL_COPY = [
  ["先看釣具", "點開甲板釣具台，確認這一竿所在的釣點、魚竿與魚餌。"],
  ["認識釣具台", "這就是實際使用的甲板釣具台：釣點決定下竿位置，魚竿影響張力與捕獲，魚餌只改變魚種出現機率。確認後按「回到海面」。"],
  ["拋下第一竿", "按下「拋竿」。教學期間魚餌不會消耗，可以安心練習。"],
  ["等候魚訊", "先不要起竿。觀察魚影、浮標與魚線，等待真正吞餌的驚嘆提示。"],
  ["現在起竿", "浮標下沉、魚線繃直且驚嘆號出現了。教學不會倒數，閱讀完再按「起竿」。"],
  ["控制張力", "按住收線讓距離縮短；張力過高時放開。失敗或逃脫都能再拋一竿。"],
  ["收好第一尾魚", "魚類紀錄已經寫入圖鑑，售出後也不會消失。先按「收進漁獲箱」，準備販售這尾魚。"],
  ["販售第一尾魚", "這裡是今日漁獲。找到剛才釣起的魚，按下「販售」換成金幣。"],
  ["前往魚類圖鑑", "販售完成，漁獲箱已經清空；魚類紀錄仍會永久保留。按下「魚類圖鑑」確認紀錄。"],
  ["魚類圖鑑", "這裡是永久收藏你相遇過每種魚的地方：仍保留剛才售出的魚，連同相遇的地點、時段、天氣與最長／最重的尺寸紀錄都記在卡片裡。看完後，從下方發亮的「海灣商店」繼續。"],
  ["海灣商店", "商店永久提供釣竿、魚餌、船隻與家具，不需要擔心限時商品。"],
  ["魚餌", "魚餌只調整魚種的出現機率，不改變張力或最後的捕獲成功率。"],
  ["補給完成", "購買的魚餌會直接加入庫存，船屋則是整理收藏與安排休息的地方。"],
  ["我的船屋", "船屋可以佈置收藏、翻閱日誌，並透過休息切換釣魚時段。"]
];

class Sound {
  constructor() { this.context = null; this.masterGain = null; this.ambientTimer = null; }
  outputLevel() {
    // The original synth mix was intentionally quiet. Full volume now reaches twice
    // that level, while the 80% default remains comfortably below clipping.
    return normalizeSoundVolume(state.settings.soundVolume) / 50;
  }
  syncVolume() {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(state.settings.sound ? this.outputLevel() : 0, now, .015);
  }
  ensure() {
    if (!state.settings.sound) return null;
    this.context ||= new (window.AudioContext || window.webkitAudioContext)();
    if (!this.masterGain) {
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.outputLevel();
      this.masterGain.connect(this.context.destination);
    }
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
    osc.connect(gain).connect(this.masterGain); osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + duration + .02);
  }
  play(name) {
    if (name === "cast") { this.tone(310,.12,"sine",.035); this.tone(520,.16,"sine",.025,.08); }
    if (name === "nibble") { this.tone(410,.07,"sine",.018); }
    if (name === "hook") { this.tone(640,.1,"square",.035); this.tone(880,.14,"sine",.03,.1); }
    if (name === "success") [523,659,784].forEach((n,i)=>this.tone(n,.34,"sine",.04,i*.1));
    if (name === "new") [659,784,1046].forEach((n,i)=>this.tone(n,.48,"triangle",.035,i*.13));
    if (name === "coin") { this.tone(740,.09,"sine",.035); this.tone(990,.15,"sine",.025,.07); }
    if (name === "fail") { this.tone(240,.28,"triangle",.03); }
    if (name === "escape") { this.tone(360,.09,"triangle",.025); this.tone(210,.3,"sine",.025,.08); }
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

function tutorialActive() {
  return gameIsActive() && tutorialIsActive(state);
}

function setTutorialStep(step, { persist = true } = {}) {
  if (!tutorialActive()) return false;
  const next = Math.min(TUTORIAL_TOTAL_STEPS, Math.max(0, Math.floor(Number(step) || 0)));
  if (state.tutorialStep === next) return false;
  state.tutorialStep = next;
  state.tutorialVersion = TUTORIAL_VERSION;
  if (next >= TUTORIAL_TOTAL_STEPS) {
    state.completedTutorial = true;
    state.tutorialCatchUid = null;
  }
  if (persist) saveGame();
  updateTutorial();
  return true;
}

function skipTutorial() {
  if (!tutorialActive()) return false;
  clearFishing();
  Object.assign(fishing, {
    phase: "idle", fish: null, caught: null, context: null,
    held: false, tension: .38, progress: 0, danger: 0, last: 0,
    nibbleIndex: 0, falseNibbles: 0, bitePlan: null, cueIndex: 0, cue: null, fishSide: "left",
    failureReason: null, captureChance: null
  });
  modalRoot.innerHTML = "";
  completeTutorial(state);
  saveGame();
  render();
  toast("已跳過航海教學，可以自由探索眠潮灣。", "gold");
  setTimeout(flushJournalNotices, 0);
  return true;
}

function advanceTutorial(expectedStep, nextStep, options) {
  return tutorialActive() && state.tutorialStep === expectedStep
    ? setTutorialStep(nextStep, options)
    : false;
}

function tutorialPresentation() {
  if (!tutorialActive()) return null;
  const step = state.tutorialStep;
  const [title, copy] = TUTORIAL_COPY[step] || TUTORIAL_COPY[0];
  const presentation = { step, title, copy, actionSelector: null, spotlightSelector: null, spotlightFromAction: null };
  if (step === 0) presentation.actionSelector = '[data-action="show-fishing-setup"]';
  if (step === 1) {
    presentation.actionSelector = '.fishing-setup-modal [data-action="close-modal"]';
    presentation.spotlightSelector = '.fishing-setup-modal';
  }
  if (step === 2) presentation.actionSelector = '[data-action="cast"]';
  if (step === 3) presentation.spotlightSelector = '.fishing-stage';
  if (step === 4) presentation.actionSelector = '[data-action="strike"]';
  if (step === 5) {
    if (["failed", "escaped"].includes(fishing.phase)) {
      presentation.title = "再試一次";
      presentation.copy = "這尾魚掙脫了。按下「再拋一竿」回到海面；教學魚餌仍不會消耗。";
      presentation.actionSelector = '[data-action="reset-fishing"]';
    } else {
      presentation.actionSelector = '#reel-button';
      presentation.spotlightSelector = '.reel-ui';
    }
  }
  if (step === 6) {
    presentation.actionSelector = '[data-action="close-catch"]';
    presentation.spotlightSelector = '.catch-modal';
  }
  if (step === 7) {
    presentation.actionSelector = '[data-action="sell-one"]';
    presentation.spotlightFromAction = '.catch-row';
  }
  if (step === 8) presentation.actionSelector = '[data-view="journal"]';
  if (step === 9) {
    // Teach the atlas: spotlight the caught fish's record card while the glowing 海灣商店 nav button
    // (the action target) shows where to head next.
    presentation.actionSelector = '[data-view="shop"]';
    presentation.spotlightSelector = '.fish-detail';
  }
  if (step === 10) presentation.actionSelector = '[data-action="shop-tab"][data-id="baits"]';
  if (step === 11) {
    presentation.actionSelector = '[data-action="buy-bait"][data-id="bread"]';
    presentation.spotlightSelector = '.shop-item[data-shop-type="bait"][data-shop-id="bread"]';
  }
  if (step === 12) presentation.actionSelector = '[data-view="home"]';
  if (step === 13) presentation.actionSelector = '[data-action="sleep"]';
  if (!presentation.spotlightFromAction) presentation.spotlightSelector ||= presentation.actionSelector;
  return presentation;
}

// Resolve which element the spotlight frames: a card derived from the action target (e.g. the whole
// catch row), an explicit selector (e.g. the full catch modal), or the action target itself.
function tutorialSpotlightTarget(presentation, actionTarget) {
  if (!presentation) return null;
  if (presentation.spotlightFromAction && actionTarget) {
    return actionTarget.closest(presentation.spotlightFromAction) || actionTarget;
  }
  if (presentation.spotlightSelector) return $(presentation.spotlightSelector);
  return actionTarget;
}

function tutorialActionTarget(presentation = tutorialPresentation()) {
  if (!presentation?.actionSelector) return null;
  if (presentation.step === 7 && state.tutorialCatchUid) {
    return $$('[data-action="sell-one"]').find(button => button.dataset.id === state.tutorialCatchUid)
      || $(presentation.actionSelector);
  }
  return $(presentation.actionSelector);
}

function clearTutorialFocus() {
  cancelAnimationFrame(tutorialFocusFrame);
  tutorialFocusFrame = null;
  $$(".is-tutorial-target").forEach(element => element.classList.remove("is-tutorial-target"));
  $$(".is-tutorial-locked").forEach(element => element.classList.remove("is-tutorial-locked"));
  app.classList.remove("is-tutorial-active");
  app.classList.remove("is-tutorial-nav-target");
  delete app.dataset.tutorialStep;
  tutorialSpotlight.classList.add("is-hidden");
  tutorialSpotlight.classList.remove("is-interactive");
  tutorialFocusedStep = null;
}

function focusTutorialTarget(actionTarget) {
  if (tutorialFocusedStep === state.tutorialStep) return;
  tutorialFocusedStep = state.tutorialStep;
  (actionTarget || tutorialEl).focus({ preventScroll: true });
}

function positionTutorialFocus() {
  tutorialFocusFrame = null;
  const presentation = tutorialPresentation();
  if (!presentation) return;
  const actionTarget = tutorialActionTarget(presentation);
  const spotlightTarget = tutorialSpotlightTarget(presentation, actionTarget);
  if (!spotlightTarget) {
    tutorialSpotlight.classList.add("is-hidden");
    tutorialSpotlight.classList.remove("is-interactive");
    return;
  }

  if (spotlightTarget.closest(".content-panel.is-feature-view")) {
    spotlightTarget.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
  }
  const rect = spotlightTarget.getBoundingClientRect();
  const gap = 9;
  const spotlightLeft = Math.max(4, rect.left - gap);
  const spotlightTop = Math.max(4, rect.top - gap);
  tutorialSpotlight.style.left = `${spotlightLeft}px`;
  tutorialSpotlight.style.top = `${spotlightTop}px`;
  tutorialSpotlight.style.width = `${Math.max(0, Math.min(window.innerWidth - spotlightLeft - 4, rect.width + gap * 2))}px`;
  tutorialSpotlight.style.height = `${Math.max(0, Math.min(window.innerHeight - spotlightTop - 4, rect.height + gap * 2))}px`;
  tutorialSpotlight.classList.toggle("is-interactive", Boolean(actionTarget && spotlightTarget === actionTarget));
  tutorialSpotlight.classList.remove("is-hidden");

  const tooltipWidth = tutorialEl.offsetWidth;
  const tooltipHeight = tutorialEl.offsetHeight;
  const edge = 10;
  const targetCenter = rect.left + rect.width / 2;
  const left = Math.min(window.innerWidth - tooltipWidth - edge, Math.max(edge, targetCenter - tooltipWidth / 2));
  let top = rect.top - tooltipHeight - 16;
  if (top < edge) top = rect.bottom + 16;
  if (top + tooltipHeight > window.innerHeight - edge) top = Math.max(edge, window.innerHeight - tooltipHeight - edge);
  tutorialEl.style.left = `${left}px`;
  tutorialEl.style.top = `${top}px`;
  tutorialEl.style.right = "auto";
  tutorialEl.style.bottom = "auto";

  focusTutorialTarget(actionTarget);
}

function scheduleTutorialFocus() {
  cancelAnimationFrame(tutorialFocusFrame);
  tutorialFocusFrame = requestAnimationFrame(positionTutorialFocus);
}

function applyTutorialFocus() {
  const presentation = tutorialPresentation();
  if (!presentation) { clearTutorialFocus(); return; }
  const actionTarget = tutorialActionTarget(presentation);
  const spotlightTarget = tutorialSpotlightTarget(presentation, actionTarget);
  $$(".is-tutorial-target").forEach(element => element.classList.remove("is-tutorial-target"));
  $$(".is-tutorial-locked").forEach(element => element.classList.remove("is-tutorial-locked"));
  actionTarget?.classList.add("is-tutorial-target");
  if (spotlightTarget !== actionTarget) spotlightTarget?.classList.add("is-tutorial-target");
  app.classList.toggle("is-tutorial-nav-target", Boolean(spotlightTarget?.closest(".main-nav")));
  $$("button, select, input, textarea, a[href]", app).forEach(element => {
    if (tutorialEl.contains(element) || element === actionTarget || actionTarget?.contains(element)) return;
    element.classList.add("is-tutorial-locked");
  });
  app.classList.add("is-tutorial-active");
  app.dataset.tutorialStep = String(state.tutorialStep);
  scheduleTutorialFocus();
}

function recoverTutorialSession() {
  if (!tutorialActive()) return false;
  let changed = false;
  if (state.tutorialStep === 1 && !$(".fishing-setup-modal")) { state.tutorialStep = 0; changed = true; }
  if ([3, 4, 5].includes(state.tutorialStep) && fishing.phase === "idle") { state.tutorialStep = 2; changed = true; }
  if (state.tutorialStep === 6 && !$(".catch-modal")) { state.tutorialStep = 7; currentView = "catch"; changed = true; }
  if (state.tutorialStep === 7) {
    currentView = "catch";
    const tutorialCatch = state.catchInventory.find(caught => caught.uid === state.tutorialCatchUid) || state.catchInventory[0];
    if (tutorialCatch) state.tutorialCatchUid = tutorialCatch.uid;
    else { state.tutorialStep = 8; state.tutorialCatchUid = null; changed = true; }
  }
  if (state.tutorialStep === 8) currentView = "catch";
  if (state.tutorialStep === 9) currentView = "journal";
  if ([10, 11, 12].includes(state.tutorialStep)) currentView = "shop";
  if (state.tutorialStep === 10) shopTab = "rods";
  if (state.tutorialStep === 11) shopTab = "baits";
  if (state.tutorialStep === 13) currentView = "home";
  if (changed) saveGame();
  return changed;
}
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
      preserveBackup: protectedBackupModes.has(activeSaveMode),
      validate: isCurrentSaveSchema
    });
    if (!result.ok) throw new Error(result.reason);
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
      if (loaded.preserveBackupOnWrite) protectedBackupModes.add(activeSaveMode);
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
  logbookCategoryId = "today";
  selectedLogbookEntryId = null;
  shouldRewriteLoadedSave = false;
  let autoFishingUpdate = { changed: false, summary: null };
  if (isNew) {
    state = mode === "developer" ? createDeveloperState() : createInitialState();
    protectedBackupModes.delete(mode);
    const [primaryKey, backupKey, temporaryKey] = saveKeys();
    localStorage.removeItem(primaryKey); localStorage.removeItem(backupKey); localStorage.removeItem(temporaryKey);
    saveGame();
  } else {
    state = loadGame();
    const travelUpdate = progressTravel(state, Date.now());
    autoFishingUpdate = settleAutoFishing(state, new Date().toISOString());
    if (!hasSave(mode) || shouldRewriteLoadedSave || travelUpdate.changed || autoFishingUpdate.changed) saveGame();
  }
  state.settings = normalizeDisplaySettings({ ...state.settings, ...loadPreferences(state.settings) });
  savePreferences();
  applyDisplaySettings();
  titleScreen.classList.add("is-hidden");
  gameShell.classList.remove("is-hidden");
  app.classList.toggle("is-developer-mode", mode === "developer");
  currentView = "fishing";
  recoverTutorialSession();
  syncTravelClock(); syncWorld(); render(); updateTutorial(); sound.startAmbient();
  setTimeout(()=>{
    const summary=autoFishingUpdate.summary||(!state.autoFishing?.lastSummary?.acknowledged?state.autoFishing.lastSummary:null);
    if(summary)showAutoFishingSummary(summary);else flushJournalNotices();
  },80);
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
  $(".tideglow-chip").hidden = !state.tideglow?.enabled;
  $("#tideglow-label").textContent = (state.tideglow?.total || 0).toLocaleString("zh-TW");
  const unclaimed=getUnclaimedAchievementCount(state);
  $("#journal-badge").textContent = `${discoveredCount(state)}/${FISH.length}${unclaimed?` · ${unclaimed}`:""}`;
  $("#journal-badge").title = unclaimed?`${unclaimed} 項成就獎勵待領取`:"圖鑑探索進度";
  $("#catch-badge").textContent = state.catchInventory.length;
  const journalUnread=getJournalUnreadCount(state);
  const logbookBadge=$("#logbook-badge");
  if(logbookBadge){logbookBadge.hidden=!journalUnread;logbookBadge.textContent=journalUnread>9?"9+":String(journalUnread);logbookBadge.title=`日誌有 ${journalUnread} 篇未讀`;}
  const activeCommission = state.residentCommissions?.active;
  const localStoryStatuses = RESIDENTS.filter(resident => resident.regionId === state.world?.currentRegionId)
    .map(resident => getResidentStoryStatus(state, resident.id));
  const storyCanComplete = localStoryStatuses.some(status => status.canComplete);
  const storyCanAccept = localStoryStatuses.some(status => status.canAccept);
  const storyInProgress = localStoryStatuses.some(status => status.activeScene);
  $("#resident-badge").hidden = !activeCommission && !storyCanComplete && !storyCanAccept && !storyInProgress;
  $("#resident-badge").textContent = storyCanComplete
    ? "主線完成"
    : activeCommission?.progress >= activeCommission?.goal
      ? "提案可交"
      : storyCanAccept
        ? "新主線"
        : storyInProgress
          ? "主線中"
          : "提案中";
  $("#developer-tools-button").hidden = activeSaveMode !== "developer";
  $("#sound-button").textContent = state.settings.sound ? "♪" : "×";
  const luminousSail = Object.values(state.world?.regionProgress || {})
    .some(progress => progress.researchRewardIds?.includes("luminous_sail_pattern"));
  $("#sail-emblem").textContent = luminousSail ? "✧" : state.completedMilestones.includes(30) ? "✺" : state.completedMilestones.includes(20) ? "✦" : "◌";
  $(".brand-mini small").textContent = activeSaveMode === "developer" ? `開發者模式 · ${state.equippedTitle}` : state.equippedTitle;
  const selectedSpot = SPOTS.find(item => item.id === state.selectedSpot && item.regionId === state.world?.currentRegionId);
  const spot = selectedSpot || (isDockedAt(state.world?.currentRegionId)
    ? getRegionFishingSpots(state.world.currentRegionId)[0]
    : null);
  const bayEvent = isDockedAt(state.world?.currentRegionId) ? getActiveBayEvent(state) : null;
  app.dataset.bayEvent = bayEvent?.id || "";
  const travelStatus = getTravelStatus(state.world);
  const offshoreRegion = state.world?.docking?.status === "offshore" ? regionById(state.world.docking.regionId) : null;
  const currentRegion = regionById(state.world?.currentRegionId);
  const sceneVariant = travelStatus ? "voyage" : offshoreRegion ? "offshore" : spot?.sceneVariant || "shore";
  app.dataset.fishingScene = sceneVariant;
  worldScene.dataset.sceneVariant = sceneVariant;
  worldScene.setAttribute("aria-label", spot && !travelStatus && !offshoreRegion
    ? `${currentRegion?.name || "海上"}・${spot.name}景色`
    : `${regionById(sceneRegionId)?.name || "海上"}景色`);
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
  const fishingView = currentView === "fishing";
  if (!fishingView) stopFishingRigTracking();
  gameShell.classList.toggle("is-fishing-view", fishingView);
  // Reeling only happens on the fishing view; clear the fighting lock when we leave it so the
  // catch modal or tutorial navigation can't strand `.is-fighting` (which disables the bottom nav).
  if (!fishingView) gameShell.classList.remove("is-fighting");
  gameShell.dataset.view = currentView;
  worldScene.setAttribute("aria-hidden", String(!fishingView));
  content.classList.toggle("is-feature-view", !fishingView);
  // The cabin is a fixed, full-screen stage (like the fishing scene) rather than a scrolling page.
  content.classList.toggle("is-home-view", currentView === "home");
  $$(".nav-button").forEach(button => button.classList.toggle("is-active", button.dataset.view === currentView));
  if (currentView === "fishing") renderFishing();
  if (currentView === "journal") renderJournal();
  if (currentView === "catch") renderCatch();
  if (currentView === "shop") renderShop();
  if (currentView === "residents") renderResidents();
  if (currentView === "chart") renderChart();
  if (currentView === "home") renderHome();
  renderTaskTracker();
  updateTutorial();
}

function trackerProgress(progress, goal) {
  const safeGoal = Math.max(1, Number(goal) || 1);
  const safeProgress = Math.min(safeGoal, Math.max(0, Number(progress) || 0));
  return `<div class="tracker-progress"><i style="width:${safeProgress / safeGoal * 100}%"></i></div><small>${Math.floor(safeProgress)} / ${safeGoal}</small>`;
}

function renderTaskTracker() {
  if (!taskTracker) return;
  const show = currentView === "fishing" && fishing.phase !== "reeling";
  taskTracker.hidden = !show;
  if (!show) return;

  const items = [];
  const travelStatus = getTravelStatus(state.world);
  if (travelStatus) {
    items.push(`<article class="tracker-item is-voyage"><span>航行中</span><b>${escapeText(travelStatus.route.name)}</b><p>第 ${travelStatus.segment} / ${travelStatus.totalSegments} 段 · ${formatTravelTime(travelStatus.remainingMs)}</p><div class="tracker-progress"><i style="width:${travelStatus.progress * 100}%"></i></div></article>`);
  } else if (isDockedAt(state.world?.currentRegionId)) {
    const event = getActiveBayEvent(state);
    const eventState = getActiveBayEventState(state);
    if (event && eventState) {
      const active = isBayEventConditionActive(state, event);
      items.push(`<article class="tracker-item is-event"><span>${event.icon} 特殊海況 · 選填 · ${active ? "生效中" : "等待條件"}</span><b>${escapeText(event.name)}</b><p>${escapeText(event.objective)} · 不影響主線</p>${trackerProgress(eventState.progress, event.goal)}</article>`);
    }
  }

  const localStory = RESIDENTS
    .filter(resident => resident.regionId === state.world?.currentRegionId)
    .map(resident => ({ resident, status: getResidentStoryStatus(state, resident.id) }))
    .find(entry => entry.status.activeScene);
  if (localStory) {
    const { status } = localStory;
    items.push(`<button class="tracker-item is-story" data-action="tracker-residents" type="button"><span>海域主線</span><b>${escapeText(status.activeScene.title)}</b><p>${escapeText(status.activeScene.objective.title)}</p>${trackerProgress(status.objectiveProgress, status.objectiveGoal)}</button>`);
  }

  const dailyEntries = Array.isArray(state.dailyBoard?.entries) ? state.dailyBoard.entries : [];
  for (const daily of dailyEntries) {
    const complete = daily.progress >= daily.goal;
    const status = daily.claimed ? "已領取" : complete ? "可領取" : "進行中";
    items.push(`<article class="tracker-item is-daily ${daily.claimed ? "is-claimed" : complete ? "is-claimable" : "is-active"}"><span>每日目標 · ${status}</span><b>${escapeText(daily.text)}</b>${trackerProgress(daily.progress, daily.goal)}${complete && !daily.claimed ? `<button class="tracker-claim" data-action="claim-quest" data-id="${daily.instanceId}" type="button">領取 ${escapeText(rewardLabel(daily.reward))}</button>` : ""}</article>`);
  }

  taskTracker.innerHTML = `<div class="tracker-heading"><span>航程追蹤</span><small>${regionById(state.world?.currentRegionId)?.name || "海上"}</small></div>${items.join("") || '<p class="tracker-empty">目前沒有需要追蹤的目標。</p>'}`;
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
  gameShell.dataset.fishingPhase = fishing.phase;
  gameShell.classList.toggle("is-fighting", fishing.phase === "reeling");
  if (!docked || !regionSpots.length) {
    if (fishing.phase !== "idle") { clearFishing(); fishing.phase = "idle"; }
    content.innerHTML = `<div class="fishing-scene-ui is-voyage">${renderVoyageStateCard()}</div>`;
    return;
  }
  if (!regionSpots.some(spot => spot.id === state.selectedSpot)) state.selectedSpot = regionSpots[0].id;
  const rod = rodById(state.equippedRod), bait = baitById(state.equippedBait);
  const spot = regionSpots.find(item => item.id === state.selectedSpot);
  const hasBait = tutorialActive() || Boolean(state.baitAmounts[state.equippedBait]);
  const tutorialRetry = tutorialActive() && state.tutorialStep === 5;
  const action = fishing.phase === "idle"
    ? { id: "cast", label: hasBait ? "拋竿" : "魚餌用完了", disabled: !hasBait }
    : ["approaching", "nibbling", "biting"].includes(fishing.phase)
      ? { id: "strike", label: "起竿", disabled: false }
      : fishing.phase === "escaped"
        ? { id: "reset-fishing", label: tutorialRetry ? "再拋一竿" : "返回海面", disabled: false }
        : ["failed", "departed"].includes(fishing.phase)
        ? { id: "reset-fishing", label: "再拋一竿", disabled: false }
        : null;
  const controls = action
    ? `<button class="fishing-context-action ${fishing.phase === "biting" ? "is-urgent" : ""}" data-action="${action.id}" type="button" ${action.disabled ? "disabled" : ""}><span>${fishing.phase === "biting" ? "!" : "⌁"}</span><b>${action.label}</b></button>`
    : "";
  content.innerHTML = `<div class="fishing-scene-ui is-${fishing.phase}">${renderFishingStage()}
    <div class="fishing-loadout-bar">
      <button data-action="show-fishing-setup" type="button" ${fishing.phase !== "idle" ? "disabled" : ""}><span>${spot?.icon || "⌁"}</span><b>${escapeText(spot?.name || "目前釣點")}</b><small>${escapeText(rod.name)} · ${escapeText(bait.name)} × ${state.baitAmounts[state.equippedBait] || 0}</small></button>
    </div>${controls}</div>`;
  trackFishingRig();
  if (fishing.phase === "reeling") bindReelButton();
  renderTaskTracker();
}

function showFishingSetup() {
  if (fishing.phase !== "idle" || !isDockedAt(state.world?.currentRegionId)) return;
  const regionSpots = getRegionFishingSpots(state.world.currentRegionId);
  const rod = rodById(state.equippedRod), bait = baitById(state.equippedBait);
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal fishing-setup-modal"><span class="section-label">甲板釣具台</span><h2>釣點與裝備</h2><p class="modal-copy">魚餌只改變魚影出現機率；釣竿也可能提高出現與捕獲成功率。真正吞餌後再起竿，才會進入張力拼搏。</p>
    <span class="section-label">選擇釣點</span><div class="spot-grid">${regionSpots.map(spot => {
      const locked = spot.requires && !state.ownedRods.includes(spot.requires);
      return `<button class="spot-card ${state.selectedSpot === spot.id ? "is-active" : ""}" data-action="spot" data-id="${spot.id}" ${locked ? "disabled" : ""}><span class="spot-icon">${locked ? "⌑" : spot.icon}</span><b>${escapeText(spot.name)}</b><small>${locked ? "需要強化遠投竿" : escapeText(spot.hint)}</small></button>`;
    }).join("")}</div>
    <div class="loadout"><label><span class="section-label">魚竿</span><span class="select-wrap"><select data-action="equip-rod">${state.ownedRods.map(id => { const item=rodById(id); return `<option value="${id}" ${id===state.equippedRod?"selected":""}>${escapeText(item.name)}</option>`}).join("")}</select></span><div class="bait-stock">安全區 ${Math.round(rod.tolerance*100)}% · 捕獲率 +${Math.round((rod.catchBonus || 0)*100)}%</div></label>
    <label><span class="section-label">魚餌</span><span class="select-wrap"><select data-action="equip-bait">${BAITS.filter(item=>isUnlocked(item,state)).map(item=>`<option value="${item.id}" ${item.id===state.equippedBait?"selected":""}>${escapeText(item.name)} × ${state.baitAmounts[item.id]||0}</option>`).join("")}</select></span><div class="bait-stock">${escapeText(bait.description)}</div></label></div>
    <aside class="habitat-rule-note"><span>棲地規則</span><p><b>常見、少見</b>魚會在同海域移動，原生釣點提高相遇傾向；<b>稀有以上</b>只會進入圖鑑標示的限定棲地。魚餌、時段與天氣不會取消棲地限制。</p></aside>
    <div class="fishing-setup-context">${renderObservationPreview()}${renderResearchPanel()}</div>
    <div class="modal-actions"><button class="primary-button" data-action="close-modal" type="button">回到海面</button></div></div></div>`;
}

function renderBayEvent() {
  const event = getActiveBayEvent(state);
  if (!event) return `<aside class="card bay-event-card is-quiet" data-bay-event="quiet"><span class="section-label">特殊海況 · 選填</span><h3>潮聲平穩</h3><p>今天沒有特殊海況目標。它不影響主線，照自己的步調選擇釣點即可。</p><span class="bay-event-status">平靜日 · 不影響主線</span></aside>`;
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
  return `<aside class="card bay-event-card ${complete ? "is-complete" : ""} ${!complete&&!activeNow ? "is-inactive" : ""}" data-bay-event="${event.id}"><div class="bay-event-heading"><span>${event.icon}</span><div><span class="section-label">特殊海況 · 選填 · ${regionById(event.regionId)?.name || "海域"}第 ${state.day} 日</span><h3>${event.name}</h3></div></div><p>${event.description}</p><div class="bay-event-effect"><small>魚群變化 · ${conditions}</small><b>${spots || "指定釣點"} · ${targets}較常靠近</b></div><div class="bay-event-objective"><div><span>${complete ? "✓ " : ""}${event.objective}</span><b>${progress} / ${event.goal}</b></div><div class="progress-track"><i style="width:${Math.min(100, progress / event.goal * 100)}%"></i></div><p>${getBayEventHint(state)}</p></div><span class="bay-event-status">${status} · 不影響主線</span></aside>`;
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
  let commission = `<section class="resident-commission-panel is-empty"><div class="resident-section-heading"><span class="section-label">今日提案 · 選填</span><small>不影響主線</small></div><p class="quiet-note">今天沒有新的提案。每日提案只是可選的港口小事，下一個航海日會自然更新。</p></section>`;
  if (offer) {
    commission = `<section class="resident-commission-panel"><div class="resident-section-heading"><span class="section-label">今日提案 · 選填</span><small>不影響主線</small></div><h4>${escapeText(offer.title)}</h4><p>${escapeText(offer.description)}</p><blockquote>「${escapeText(resident.dialogue.offer)}」</blockquote><div class="commission-meta"><span>一般獎勵 ${escapeText(rewardLabel(offer.reward))}</span><span>0 / ${offer.goal}</span></div><div class="resident-actions"><button class="soft-button" data-action="accept-commission" data-id="${resident.id}" ${anotherActive ? "disabled" : ""}>${anotherActive ? "已有進行中的今日提案" : "接受今日提案"}</button></div></section>`;
  }
  if (active) {
    const complete = active.progress >= active.goal;
    commission = `<section class="resident-commission-panel ${complete ? "is-ready" : "is-active"}"><div class="resident-section-heading"><span class="section-label">今日提案 · ${complete ? "可交付" : "進行中"}</span><small>選填 · 不影響主線</small></div><h4>${escapeText(active.title)}</h4><p>${escapeText(active.description)}</p><blockquote>「${escapeText(complete ? resident.dialogue.ready : resident.dialogue.active)}」</blockquote><div class="commission-meta"><span>一般獎勵 ${escapeText(rewardLabel(active.reward))}</span><span>${Math.floor(active.progress)} / ${active.goal}</span></div><div class="progress-track"><i style="width:${Math.min(100,active.progress/active.goal*100)}%"></i></div><div class="resident-actions">${complete ? `<button class="soft-button" data-action="deliver-commission" data-id="${resident.id}">交付今日提案</button>` : ""}<button class="soft-button" data-action="drop-commission">放下今日提案</button></div></section>`;
  }
  const story = getResidentStoryStatus(state, resident.id);
  let storyPanel = "";
  if (story.scenes.length) {
    const scene = story.activeScene || story.nextScene;
    const region = regionById(resident.regionId);
    const mainChapter = Math.max(1, REGIONS.findIndex(entry => entry.id === resident.regionId) + 1);
    const finalScene = story.scenes.at(-1);
    const finalReward = finalScene?.reward?.label;
    const progress = story.objectiveProgress;
    const goal = story.objectiveGoal;
    const objectiveDetails = story.objectiveDetails?.length
      ? `<div class="resident-story-checklist">${story.objectiveDetails.map(detail => `<span class="${detail.progress >= detail.goal ? "is-done" : ""}"><i>${detail.progress >= detail.goal ? "✓" : "◇"}</i><b>${escapeText(detail.label)}</b><small>${detail.progress} / ${detail.goal}</small></span>`).join("")}</div>`
      : "";
    const statusLabel = story.complete ? "全部完成" : story.canComplete ? "等待回報" : story.activeScene ? "任務進行中" : story.canAccept ? "新章節" : "尚未開啟";
    const action = story.canAccept
      ? `<button class="primary-button" data-action="accept-resident-story" data-id="${resident.id}">接受主線任務</button>`
      : story.canComplete
        ? `<button class="primary-button" data-action="complete-resident-story" data-id="${resident.id}">完成主線任務</button>`
        : "";
    storyPanel = `<section class="resident-main-story-panel ${story.complete ? "is-complete" : story.canComplete ? "is-ready" : story.activeScene ? "is-active" : ""}"><div class="resident-section-heading"><span class="section-label">海域主線 · ${statusLabel}</span><small>推進${escapeText(region?.name || "此海域")}故事</small></div><h4>${escapeText(story.complete ? `第 ${mainChapter} 章 · ${finalScene?.title || "主線完成"}` : `第 ${scene?.chapter || story.completedSceneIds.length + 1} 節 · ${scene?.title || "等待新的潮路"}`)}</h4>${story.complete ? `<p>${finalReward ? `${escapeText(finalReward)}已成為永久旅程紀念；` : ""}${story.scenes.length} 節故事與對應日誌均已完成。</p>` : story.activeScene ? `<div class="resident-story-objective"><b>${escapeText(scene.objective.title)}</b><p>${escapeText(scene.objective.description)}</p>${objectiveDetails}<div class="commission-meta"><span>主線目標</span><span>${progress} / ${goal}</span></div><div class="progress-track"><i style="width:${Math.min(100,progress/goal*100)}%"></i></div></div>` : `<p>${story.canAccept ? "閱讀完整開場後接受任務；完成指定的實際行動，再回來交付這一節故事。" : "先完成前一節主線或必要的航海教學，新的章節才會開啟。"}</p>`}<div class="resident-actions">${action}${story.activeScene&&!story.canComplete ? '<span class="resident-story-hint">請先親手完成上方主線目標</span>' : ""}</div></section>`;
  }
  return `<article class="card resident-card" data-resident="${resident.id}"><div class="resident-heading"><span class="resident-icon">${resident.icon}</span><div><h3>${escapeText(resident.name)}</h3><p>${escapeText(resident.role)} · ${escapeText(resident.portLocationName)}</p></div></div><p class="resident-dialogue">「${escapeText(resident.dialogue.greeting)}」</p>${storyPanel}${commission}<div class="resident-social-row"><button class="soft-button" data-action="talk-resident" data-id="${resident.id}">一般交談</button><span>今日提案完成紀錄 ${history?.completions || 0} 次</span></div></article>`;
}

function renderResidents() {
  const regionId = state.world?.currentRegionId;
  const residents = RESIDENTS.filter(resident => resident.regionId === regionId);
  const docked = isDockedAt(regionId);
  const body = docked && residents.length
    ? `<div class="resident-grid">${residents.map(residentCard).join("")}</div>`
    : docked
      ? `<div class="card resident-empty"><span class="resident-icon">⌂</span><h3>港口居民仍在準備故事</h3><p class="modal-copy">${regionById(regionId)?.name || "這座港口"}的主要居民、海域主線與今日提案仍在設計中；不會暫時借用其他海域的角色內容。</p></div>`
      : `<div class="card resident-empty"><span class="resident-icon">⌂</span><h3>先回港停泊</h3><p class="modal-copy">居民只在自己的港口生活，不會跨海追蹤旅程。回到有效港口後再來聊聊吧。</p></div>`;
  content.innerHTML = `${panelHeading("港口居民", "海域主線會推進固定故事章節；今日提案是可自由接受或放下的日常小事，兩者不共用進度與解鎖。")} ${body}`;
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
    ? `區域完整 · ${status.research.fullRewards.map(reward => reward.label).join("與")}已收好`
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

function chartRegionIsKnown(regionId) {
  if (state.world.visitedRegionIds.includes(regionId)) return true;
  return getRoutesForRegion(regionId).some(route => isRouteUnlockedForState(state, route.id));
}

function chartRegionNode(point) {
  const region = regionById(point.regionId);
  if (!region) return "";
  const current = state.world.docking?.status === "docked" && state.world.docking.regionId === region.id;
  const offshore = state.world.docking?.status === "offshore" && state.world.docking.regionId === region.id;
  const destination = state.world.travel?.toRegionId === region.id;
  const visited = state.world.visitedRegionIds.includes(region.id);
  const known = chartRegionIsKnown(region.id);
  const preview = !known || (region.contentStatus === "route-only" && !visited);
  const statusIcon = current ? "⚓" : offshore ? "◉" : destination ? "➜" : visited ? "✓" : "⌁";
  const statusText = current ? "船隻目前停泊" : offshore ? "船隻位於外海" : destination ? "目前航行目的地" : visited ? "已到訪" : known ? "航線已開放" : "等待取得灣外海圖";
  const regionLabel = known ? region.name : "霧後海域";
  return `<div class="chart-region-node ${current || offshore ? "is-current" : ""} ${preview ? "is-preview" : ""}" style="left:${point.x}%;top:${point.y}%" role="group" aria-label="${regionLabel}，${statusText}"><span class="chart-region-marker" aria-hidden="true">${point.marker === "harbor" ? "◉" : "◌"}</span><span class="chart-region-copy"><b>${regionLabel}</b><small>${statusIcon} ${statusText}</small></span>${preview ? '<i class="chart-mist" aria-hidden="true"></i>' : ""}</div>`;
}

function chartRouteMarkup() {
  const entries = CHART_ROUTE_PATHS.map(path => {
    const route = routeById(path.routeId);
    const from = CHART_REGION_POINTS.find(point => point.regionId === route?.fromRegionId);
    const to = CHART_REGION_POINTS.find(point => point.regionId === route?.toRegionId);
    if (!route || !from || !to) return null;
    const status = getTravelStatus(state.world);
    const traveling = status?.route.id === route.id;
    const available = isRouteUnlockedForState(state, route.id);
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
    const available = connected && isRouteUnlockedForState(state, route.id);
    const destinationName = available || state.world.visitedRegionIds.includes(destinationId) ? destination?.name : "霧後海域";
    const familiar = state.world.completedRouteIds.includes(route.id);
    const duration = getRouteDurationForState(state, route.id);
    return `<article class="card chart-route-card ${available ? "is-available" : "is-preview"}" data-route="${route.id}"><span class="section-label">相鄰航線</span><h3>${available ? route.name : "尚未取得灣外海圖"}</h3><p>${destinationName || "未知海域"} · ${available ? `${route.travelSegments} 段航程 · ${formatTravelMinutes(duration)}` : "完成眠潮灣主線與八成魚類探索後開放"}</p><div class="chart-route-state"><span aria-hidden="true">${available ? "✓" : "🔒"}</span><b>${available ? familiar ? "熟悉航線，可自由往返" : "首次短程航行已開放" : "等待燈塔守望者交付海圖"}</b></div><button class="${available ? "primary-button" : "soft-button"}" data-action="prepare-chart-route" data-id="${route.id}" ${available ? "" : "disabled"}>${available ? `準備前往${destination?.name || "目的地"}` : "尚未取得海圖"}</button></article>`;
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
  return `<div class="card chart-current-card"><span class="section-label">目前船位 · ${activeShip(state).name}</span><h3>⚓ ${region?.name || "眠潮灣"}</h3><p>${region?.portName || "眠潮泊地"} · 已安全停泊</p></div>`;
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
  if (!isRouteUnlockedForState(state, routeId)) {
    toast("完成第六節主線並取得《眠潮灣外海圖》後，才能沿這條航線出發");
    renderChart();
    return;
  }
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

function residentStoryBeats(beats) {
  return (beats || []).map(beat => `<div class="resident-story-beat ${beat.speaker === "旁白" ? "is-narration" : "is-dialogue"}"><b>${escapeText(beat.speaker)}</b><p>${escapeText(beat.text)}</p></div>`).join("");
}

function showResidentStoryScene(scene, phase, status) {
  const accepting = phase === "opening";
  const progress = accepting ? status.objectiveProgress : scene.objective.goal;
  const beats = accepting ? scene.opening : scene.completion;
  const resident = residentById(scene.residentId);
  const region = regionById(resident?.regionId);
  const mainChapter = Math.max(1, REGIONS.findIndex(entry => entry.id === resident?.regionId) + 1);
  const totalSections = status.scenes?.length || 6;
  const objectiveDetails = accepting && status.objectiveDetails?.length
    ? `<div class="resident-story-checklist">${status.objectiveDetails.map(detail => `<span class="${detail.progress >= detail.goal ? "is-done" : ""}"><i>${detail.progress >= detail.goal ? "✓" : "◇"}</i><b>${escapeText(detail.label)}</b><small>${detail.progress} / ${detail.goal}</small></span>`).join("")}</div>`
    : "";
  const routeRewardNote = scene.reward?.type === "route-chart" && !accepting
    ? "<small>船屋航圖桌已顯示新的可航行路線；不會自動出航。</small>"
    : "";
  modalRoot.innerHTML = `<div class="modal-backdrop resident-story-backdrop"><div class="modal resident-story-modal"><div class="resident-story-modal-heading"><span class="section-label">主線第 ${mainChapter} 章 · ${escapeText(region?.name || "海域")} · 第 ${scene.chapter} 節／${totalSections}</span><small>${accepting ? "主線任務已接受" : "主線任務已完成"}</small></div><h2>${escapeText(scene.title)}</h2><p class="resident-story-location">${escapeText(scene.locationName)}</p><div class="resident-story-lines">${residentStoryBeats(beats)}</div>${accepting ? `<aside class="resident-story-task"><span>本節主線目標</span><h3>${escapeText(scene.objective.title)}</h3><p>${escapeText(scene.objective.description)}</p>${objectiveDetails}<div class="commission-meta"><span>目前進度</span><span>${progress} / ${scene.objective.goal}</span></div></aside>` : ""}${scene.reward && !accepting ? `<div class="resident-story-reward"><span>永久旅程紀念</span><b>${escapeText(scene.reward.label)}</b>${routeRewardNote}</div>` : ""}<p class="quiet-note">主線只由上方指定的實際玩法推進；特殊海況、今日提案與每日目標都不會代替主線進度。</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">${accepting ? "開始執行主線任務" : "完成並返回港口"}</button></div></div></div>`;
}

function showResidentDialogue(residentId, deliveredDialogue = null) {
  const resident = residentById(residentId);
  if (!resident) return;
  const dialogue = deliveredDialogue || resident.dialogue.greeting;
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal"><span class="section-label">一般交談 · ${escapeText(resident.portLocationName)}</span><h2>${escapeText(resident.name)}</h2><p class="modal-copy">「${escapeText(dialogue)}」</p><p class="quiet-note">這是一般港口對話，不會接受、完成或推進主線，也不會改變今日提案。</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">結束交談</button></div></div></div>`;
}

function fishingFishSide(phase = fishing.phase) {
  return fishing.cue?.side || fishing.fishSide || (phase === "nibbling" ? "left" : "right");
}

function syncFishingFishMotion(stage, phase = fishing.phase) {
  if (!stage) return;
  stage.dataset.fishSide = fishingFishSide(phase);
  const cueType = fishing.cue?.type || (phase === "approaching" ? "initial" : phase);
  stage.dataset.fishCue = cueType;
  stage.dataset.fishMotion = cueType === "initial" ? "initial" : cueType;
  stage.style.setProperty("--cue-duration", `${Math.max(180, fishing.cue?.durationMs || 780)}ms`);
}

function renderFishingStage() {
  if (["approaching", "nibbling", "biting"].includes(fishing.phase)) {
    const fishSide = fishingFishSide();
    const cueType = fishing.cue?.type || (fishing.phase === "approaching" ? "initial" : fishing.phase);
    const cueDuration = Math.max(180, fishing.cue?.durationMs || 780);
    return `<div class="fishing-stage is-${fishing.phase}" data-fish-side="${fishSide}" data-fish-motion="${cueType === "initial" ? "initial" : cueType}" data-fish-cue="${cueType}" style="--cue-duration:${cueDuration}ms"><div class="fish-shadow" aria-hidden="true"><span class="fishing-fish-body fish-shadow-body"><i class="fishing-fish-fin"></i><b class="fishing-fish-mouth fish-mouth"></b></span></div><svg class="fishing-line-cue" aria-hidden="true"><path></path></svg><div class="waiting-bobber" aria-hidden="true"><div class="bobber"></div><span class="fishing-bait"><i></i></span><span class="probe-ripples"><i></i><b></b></span><i class="bite-splash"></i></div><div class="bite-alert" role="status" aria-live="assertive"><strong aria-hidden="true">!</strong><span class="visually-hidden">真正吞餌，現在起竿</span></div></div>`;
  }
  if (fishing.phase === "failed") {
    const early = fishing.failureReason === "early";
    return `<div class="fishing-stage is-failed"><div class="fishing-result-fail"><span>⌁</span><h3>${early ? "起竿太早了" : "魚線沒有穩住"}</h3><p>${early ? "剛才只是試探咬餌；等到浮標下沉、魚線繃直與驚嘆提示同時出現。" : "牠掙開魚線，游回海裡了。"}</p></div></div>`;
  }
  if (fishing.phase === "escaped") return `<div class="fishing-stage is-escaped"><div class="fishing-result-fail is-capture-escape"><span>≈</span><h3>最後一刻逃脫了</h3><p>你已完成拼搏，但這尾魚掙脫了魚鉤。本次只消耗已投入的魚餌，不會自動再拋一竿。</p></div></div>`;
  if (fishing.phase === "departed") return `<div class="fishing-stage is-departed"><div class="fishing-result-fail"><span>⌁</span><h3>魚影離開了</h3><p>牠只在魚餌旁試探，沒有真正吞餌。</p></div></div>`;
  if (fishing.phase === "reeling") {
    const rod = rodById(state.equippedRod), config = getTensionConfig(fishing.fish, rod);
    const remaining = Math.ceil((1 - fishing.progress) * 100);
    const tensionState = fishing.tension > config.safeMax ? "danger" : fishing.tension < config.safeMin ? "slack" : "safe";
    const fishSide = fishingFishSide();
    return `<div class="fishing-stage is-reeling" data-tension-state="${tensionState}" data-fish-side="${fishSide}"><svg class="struggle-line" aria-hidden="true"><path></path></svg><div class="struggle-fish-cue is-${fishing.fish.behavior}" aria-hidden="true"><span class="fishing-fish-body struggle-fish-body"><i class="fishing-fish-fin"></i><b class="fishing-fish-mouth struggle-fish-mouth"></b></span><span class="struggle-wake"><i></i><b></b></span></div><div class="fight-behavior-cue is-${fishing.fish.behavior}" role="status" aria-live="polite"><small>魚勢</small><strong>${behaviorName(fishing.fish.behavior)}</strong></div><div class="reel-ui" aria-label="釣魚拼搏"><div class="reel-meters"><div class="reel-meter tension-meter"><div class="reel-meter-label"><span>張力</span></div><div class="tension-bar"><i class="safe-zone" style="left:${config.safeMin*100}%;width:${(config.safeMax-config.safeMin)*100}%"></i><i id="tension-needle" class="tension-needle" style="left:${fishing.tension*100}%"></i></div></div><div class="reel-meter distance-meter"><div class="reel-meter-label"><span>距離</span><output id="distance-value">${remaining}%</output></div><div class="catch-progress"><i id="catch-progress-fill" style="width:${fishing.progress*100}%"></i></div></div></div><button id="reel-button" class="reel-button" type="button"><span aria-hidden="true">↟</span><b>收線</b></button><p id="danger-text" class="danger-text" aria-live="polite"></p></div></div>`;
  }
  return "";
}

function stopFishingRigTracking() {
  cancelAnimationFrame(fishingRigFrame);
  fishingRigFrame = null;
}

function trackFishingRig() {
  stopFishingRigTracking();
  if (!["approaching", "nibbling", "biting", "reeling"].includes(fishing.phase)) return;
  const update = () => {
    if (currentView !== "fishing" || !["approaching", "nibbling", "biting", "reeling"].includes(fishing.phase)) {
      fishingRigFrame = null;
      return;
    }
    const stage = $(".fishing-stage", content);
    const fighting = fishing.phase === "reeling";
    const line = $(fighting ? ".struggle-line" : ".fishing-line-cue", stage);
    const path = line?.querySelector("path");
    const rodTip = $(".rod-tip", worldScene);
    const target = $(fighting ? ".struggle-fish-mouth" : ".fishing-bait", stage);
    if (!stage?.isConnected || !line || !path || !rodTip || !target) {
      fishingRigFrame = null;
      return;
    }
    const stageRect = stage.getBoundingClientRect();
    const tipRect = rodTip.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const startX = tipRect.left + tipRect.width / 2 - stageRect.left;
    const startY = tipRect.top + tipRect.height / 2 - stageRect.top;
    const endX = targetRect.left + targetRect.width / 2 - stageRect.left;
    const endY = targetRect.top + targetRect.height / 2 - stageRect.top;
    const horizontal = endX - startX;
    const vertical = endY - startY;
    const slack = fighting
      ? 7 + (1 - fishing.tension) * 38
      : Math.max(12, Math.min(42, Math.abs(vertical) * .16));
    line.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
    path.setAttribute("d", fighting
      ? `M ${startX} ${startY} C ${startX + horizontal * .34} ${startY + slack}, ${endX - horizontal * .18} ${endY - slack * .22}, ${endX} ${endY}`
      : `M ${startX} ${startY} C ${startX + horizontal * .42} ${startY + slack}, ${endX - horizontal * .12} ${endY - slack * .32}, ${endX} ${endY}`);
    fishingRigFrame = requestAnimationFrame(update);
  };
  fishingRigFrame = requestAnimationFrame(update);
}

function behaviorName(id) {
  return ({ steady:"平穩型", sprint:"衝刺型", endurance:"耐力型", sway:"擺動型", rare:"稀有型" })[id] || "未知魚勢";
}

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
  const teaching = tutorialActive();
  if (!canFishHere || fishing.phase !== "idle" || (!teaching && !state.baitAmounts[state.equippedBait])) return;
  if (!teaching) state.baitAmounts[state.equippedBait]--;
  if (teaching) advanceTutorial(2, 3, { persist: false });
  fishing.phase = "approaching"; fishing.fish = chooseFish(state, teaching ? () => 0 : Math.random); fishing.context = currentCatchContext(); fishing.progress = 0; fishing.tension = .36; fishing.danger = 0;
  fishing.nibbleIndex = 0;
  const bait = baitById(state.equippedBait);
  fishing.bitePlan = createFishingBitePlan({ fish: fishing.fish, bait });
  fishing.cueIndex = 0;
  fishing.cue = {
    type: "initial",
    side: fishing.bitePlan.initialSide,
    durationMs: fishing.bitePlan.initialDelayMs
  };
  fishing.fishSide = fishing.bitePlan.initialSide;
  fishing.falseNibbles = fishing.bitePlan.probeCount;
  fishing.failureReason = null; fishing.captureChance = null;
  sound.play("cast"); saveGame(); renderFishing(); updateTutorial();
  fishing.timer = setTimeout(advanceBiteSequence, fishing.bitePlan.initialDelayMs);
}

function updateFishingCuePhase(phase) {
  fishing.phase = phase;
  gameShell.dataset.fishingPhase = phase;
  const scene = $(".fishing-scene-ui", content);
  const stage = $(".fishing-stage", content);
  const action = $(".fishing-context-action", content);
  for (const name of ["approaching", "nibbling", "biting"]) {
    scene?.classList.remove(`is-${name}`);
    stage?.classList.remove(`is-${name}`);
  }
  scene?.classList.add(`is-${phase}`);
  stage?.classList.add(`is-${phase}`);
  syncFishingFishMotion(stage, phase);
  action?.classList.toggle("is-urgent", phase === "biting");
  const icon = action?.querySelector("span");
  if (icon) icon.textContent = phase === "biting" ? "!" : "⌁";
  if (phase === "biting") advanceTutorial(3, 4);
}

function advanceBiteSequence() {
  if (!["approaching", "nibbling"].includes(fishing.phase)) return;
  const cue = fishing.bitePlan?.cues[fishing.cueIndex];
  if (cue) {
    fishing.cueIndex += 1;
    fishing.cue = cue;
    fishing.fishSide = cue.side;
    const isProbe = cue.type.startsWith("probe-");
    if (isProbe) fishing.nibbleIndex += 1;
    updateFishingCuePhase(isProbe ? "nibbling" : "approaching");
    if (isProbe) sound.play("nibble");
    fishing.timer = setTimeout(advanceBiteSequence, cue.durationMs);
    return;
  }
  if (!fishing.fish || fishing.bitePlan?.terminal === "departed") {
    fishing.failureReason = "departed";
    fishing.phase = "departed";
    sound.play("fail");
    saveGame();
    renderFishing();
    updateTutorial();
    return;
  }
  fishing.cue = { type: "bite", side: fishing.fishSide, durationMs: 320 };
  updateFishingCuePhase("biting");
  sound.play("hook");
  fishing.timer = tutorialActive() && state.tutorialStep === 4
    ? null
    : setTimeout(() => failCatch("late"), 2200);
}

function strikeLine() {
  if (fishing.phase === "biting") {
    clearTimeout(fishing.timer);
    startReeling();
    return;
  }
  if (["approaching", "nibbling"].includes(fishing.phase)) failCatch("early");
}

function startReeling() {
  if (fishing.phase !== "biting") return;
  advanceTutorial(4, 5);
  gameShell.style.setProperty("--reel-rod-angle",`${(-28+fishing.tension*13).toFixed(2)}deg`);
  fishing.phase="reeling"; fishing.last=performance.now(); renderFishing();
  updateTutorial();
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
  const needle=$("#tension-needle"), fill=$("#catch-progress-fill"), remaining=$("#distance-value"), danger=$("#danger-text");
  const stage=$(".fishing-stage.is-reeling",content);
  if(stage) {
    stage.dataset.tensionState=fishing.danger>.1||fishing.tension>config.safeMax?"danger":fishing.tension<config.safeMin?"slack":"safe";
    stage.style.setProperty("--fight-wake-opacity",Math.min(.94,.36+fishing.tension*.58).toFixed(2));
    stage.style.setProperty("--fight-line-width",`${(1.15+fishing.tension*1.2).toFixed(2)}px`);
  }
  gameShell.style.setProperty("--reel-rod-angle",`${(-28+fishing.tension*13).toFixed(2)}deg`);
  if(needle) needle.style.left=`${fishing.tension*100}%`; if(fill) fill.style.width=`${fishing.progress*100}%`;
  if(remaining) remaining.textContent=`${Math.ceil((1-fishing.progress)*100)}%`;
  if(danger) {
    const cue = fishing.danger>.1 || fishing.tension>config.safeMax ? "放線" : fishing.tension<config.safeMin ? "收線" : "";
    danger.textContent=cue;
    danger.dataset.state=cue==="放線"?"release":cue==="收線"?"reel":"safe";
  }
  if (fishing.danger>=config.breakDelay) return failCatch();
  if (fishing.progress>=1) return completeCatch();
  fishing.raf=requestAnimationFrame(reelLoop);
}

function failCatch(reason = "line") {
  clearTimeout(fishing.timer); cancelAnimationFrame(fishing.raf); fishing.held=false; fishing.failureReason=reason; fishing.phase="failed"; sound.play("fail");
  saveGame(); renderFishing(); updateTutorial();
}

function completeCatch() {
  cancelAnimationFrame(fishing.raf); fishing.held=false;
  const capture = rollCaptureSuccess(fishing.fish, rodById(state.equippedRod), Math.random);
  fishing.captureChance = capture.chance;
  if (!capture.success) {
    fishing.phase = "escaped";
    sound.play("escape");
    saveGame();
    renderFishing();
    updateTutorial();
    return;
  }
  const tutorialCatch=tutorialActive()&&state.tutorialStep===5;
  const caught=generateCatch(fishing.fish,fishing.context,state), result=recordCatch(state,caught,fishing.context?.baitId,{source:tutorialCatch?"tutorial":"manual"}), milestones=applyMilestones(state);
  fishing.caught=caught; fishing.phase="idle"; sound.play(caught.variant==="shimmer"||result.isNew?"new":"success");
  if (tutorialCatch) {
    state.tutorialCatchUid = caught.uid;
    selectedJournalFish = fishing.fish.id;
    setTutorialStep(6, { persist: false });
  }
  saveGame(); syncWorld(); showCatchModal(fishing.fish,caught,result,milestones); updateTutorial();
  notifyCompletedAchievements(result.completedAchievements);
  notifyTideglow(result.tideglowEvents);
  if(result.bayEventUpdate?.completed) setTimeout(()=>toast(`事件完成「${result.bayEventUpdate.event.name}」：${result.bayEventUpdate.reward.label}`,"gold"),420);
  if(result.researchUpdate?.completedNodes?.length) setTimeout(()=>toast(`研究冊亮起：${result.researchUpdate.completedNodes.map(node=>node.name).join("、")}`,"gold"),520);
  if(result.researchUpdate?.rewards?.length) setTimeout(()=>toast(`研究紀念已收好：${result.researchUpdate.rewards.map(reward=>reward.label).join("、")}`,"gold"),720);
}

function resetFishing() {
  clearFishing();
  Object.assign(fishing,{phase:"idle",fish:null,caught:null,context:null,tension:.38,progress:0,danger:0,last:0,nibbleIndex:0,falseNibbles:0,bitePlan:null,cueIndex:0,cue:null,fishSide:"left",failureReason:null,captureChance:null});
  if (tutorialActive() && state.tutorialStep === 5) setTutorialStep(2, { persist: false });
  saveGame();
  renderFishing();
  updateTutorial();
}
function clearFishing(){ clearTimeout(fishing.timer); cancelAnimationFrame(fishing.raf); stopFishingRigTracking(); fishing.timer=null; fishing.raf=null; fishing.held=false; }

function showCatchModal(fish,caught,result,milestones) {
  const isShimmer=caught.variant==="shimmer";
  const caughtRegion=regionById(caught.context?.regionId);
  const localStamp=result.isNewRegional&&caughtRegion;
  const tags=[result.isNew?"圖鑑新增":null,localStamp?`${caughtRegion.name}印章`:null].filter(Boolean).join(" · ");
  const highestLength=result.record?.bestLength||caught.length;
  const resultBadges=`<div class="catch-result-badges"><span class="is-${fish.rarity}">${RARITY[fish.rarity].name}</span>${isShimmer?'<span class="is-shimmer">✦ 閃光個體</span>':""}</div>`;
  const eventUpdate=result.bayEventUpdate;
  const eventFeedback=eventUpdate?.updated?`<div class="catch-event ${eventUpdate.completed?"is-complete":""}"><span>${eventUpdate.completed?"事件完成":"海灣事件進度"}</span><b>${eventUpdate.event.name} · ${eventUpdate.progress} / ${eventUpdate.event.goal}</b><small>${eventUpdate.completed?"事件獎勵已自動收入":getBayEventHint(state)}</small></div>`:"";
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal catch-modal ${isShimmer?"is-shimmer":""}"><div class="catch-hero">${fishArt(fish,false,caught.variant,"scene")}${result.isLengthRecord?'<span class="new-record-ribbon">新紀錄</span>':""}</div>${resultBadges}<h2>${fish.name}</h2><p class="catch-subtitle">${fish.english}</p><p class="modal-copy">${fish.short}</p><div class="catch-stats"><div><small>本次長度</small><b>${caught.length} cm</b></div><div><small>最高紀錄</small><b>${highestLength} cm</b></div></div>${tags?`<div class="record-tag">✦ ${tags}</div>`:""}${eventFeedback}<div class="modal-actions"><button class="soft-button" data-action="modal-journal" data-id="${fish.id}">查看圖鑑</button><button class="primary-button" data-action="close-catch">收進漁獲箱</button></div></div></div>`;
  for(const milestone of milestones) {
    const aquariumCapacity=AQUARIUM_CAPACITY_MILESTONES.find(item=>item.discoveries===milestone.count)?.capacity;
    const aquariumReward=aquariumCapacity?`${milestone.count===5?"海灣觀察箱":"水族箱擴建至"} ${aquariumCapacity} 格`:"";
    setTimeout(()=>toast(`里程碑「${milestone.name}」完成：${milestone.reward}${aquariumReward?` · ${aquariumReward}`:""}`,"gold"),500);
  }
}

function renderJournal() {
  const unclaimed=getUnclaimedAchievementCount(state);
  const actions=`<div class="journal-heading-actions"><button class="soft-button achievement-open" data-action="show-achievements">收藏成就${unclaimed?`<i>${unclaimed}</i>`:""}</button><div class="completion-ring"><div><small>探索進度</small><b>${discoveredCount(state)} / ${FISH.length}</b></div></div></div>`;
  const regionCategories=REGIONS.filter(region=>region.status==="available"&&FISH.some(fish=>Boolean(getFishHabitat(fish,region.id))));
  if(journalFilter!=="all"&&!regionCategories.some(region=>region.id===journalFilter))journalFilter="all";
  const activeRegion=regionCategories.find(region=>region.id===journalFilter)||null;
  const filtered=FISH.filter(f=>journalFilter==="all"||Boolean(getFishHabitat(f,journalFilter)));
  selectedJournalFish ||= (filtered.find(f=>state.discovered[f.id])||filtered[0])?.id;
  if (!filtered.some(f=>f.id===selectedJournalFish)) selectedJournalFish=filtered[0]?.id;
  const selected=fishById(selectedJournalFish), record=state.discovered[selected?.id];
  const regionTabs=`<button class="filter-chip ${journalFilter==="all"?"is-active":""}" role="tab" aria-selected="${journalFilter==="all"}" data-action="journal-filter" data-id="all">全部 <small>${FISH.length}</small></button>${regionCategories.map(region=>{const count=FISH.filter(fish=>Boolean(getFishHabitat(fish,region.id))).length;return `<button class="filter-chip ${journalFilter===region.id?"is-active":""}" role="tab" aria-selected="${journalFilter===region.id}" data-action="journal-filter" data-id="${region.id}">${region.name} <small>${count}</small></button>`;}).join("")}`;
  const title=activeRegion?`${activeRegion.name}魚類圖鑑`:"全部魚類圖鑑";
  const subtitle=activeRegion?`收錄只屬於${activeRegion.name}的魚；每種魚只會出現在一片海域。`:"依海域翻閱魚類；卡片以灰白、藍、紫色背景分別標示常見、少見與稀有。";
  content.innerHTML=`${panelHeading(title,subtitle,actions)}<div class="filter-row fish-region-filters" role="tablist" aria-label="魚類圖鑑海域分類">${regionTabs}</div><div class="journal-layout" style="margin-top:16px"><div class="fish-grid">${filtered.map(fish=>fishCard(fish)).join("")}</div>${selected?fishDetail(selected,record):""}</div>`;
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
  return `<button class="fish-card rarity-${fish.rarity} ${found?"":"is-unknown"} ${found?.caughtShimmer?"has-shimmer":""} ${selectedJournalFish===fish.id?"is-active":""}" data-rarity="${fish.rarity}" data-action="select-fish" data-id="${fish.id}">${found?.caughtShimmer?'<span class="shimmer-mark" title="曾捕獲閃光個體">✦</span>':""}${fishArt(fish,!found,"normal",found?"journal":"silhouette")}<b>${found?fish.name:"未發現"}</b><small><span class="fish-card-rarity">${RARITY[fish.rarity].name}</span> · ${found?`捕獲 ${found.count} 次`:unknownHint(fish)}</small>${found?`<span class="familiarity-chip is-${familiarity.id}">${familiarity.name}</span>`:""}</button>`;
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
function fishHabitatRule(fish, discovered = false) {
  const habitat = fish?.habitats?.[0];
  const region = regionById(habitat?.regionId);
  const strict = !["common", "uncommon"].includes(fish?.rarity);
  if (!discovered) {
    return `<div class="fact-box habitat-fact"><b>棲地規則</b><span>${strict ? "稀有以上魚類具有釣點綁定；相遇後會在此顯示限定棲地。" : "常見與少見魚會在同海域移動，原生釣點只提高相遇傾向。"}</span></div>`;
  }
  const spots = (habitat?.spotIds || []).map(id => SPOTS.find(spot => spot.id === id)?.name).filter(Boolean).join("、") || "尚未標記";
  return `<div class="fact-box habitat-fact"><b>${strict ? "限定棲地" : "原生棲地"} · ${escapeText(region?.name || "未知海域")}</b><span>${escapeText(spots)} · ${strict ? "只有上述釣點會進入魚池" : "同海域其他釣點仍可能相遇，原生釣點機率較高"}</span></div>`;
}
function fishDetail(fish,record) {
  if(!record) return `<aside class="card fish-detail"><div class="fish-detail-hero unknown-hero">${fishArt(fish,true,"normal","silhouette")}</div><h3>尚未相遇</h3><p class="fish-detail-copy">${unknownHint(fish)}。試著改變釣點或魚餌，也許下一竿就會認識牠。</p>${fishHabitatRule(fish,false)}</aside>`;
  const full=record.count>=3;
  const familiarity=getFamiliarity(record.count);
  const progress=familiarity.nextCount?`${record.count} / ${familiarity.nextCount}`:"已完成全部熟悉度階段";
  const ecologySource=full&&fish.ecologySource?`<div class="fact-box ecology-source">生態資料：<a href="${fish.ecologySource.url}" target="_blank" rel="noreferrer">${fish.ecologySource.label}</a></div>`:"";
  const encounterLine=state.journal?.fishEncounterLineById?.[fish.id];
  const encounterNote=encounterLine?`<div class="fish-encounter-note"><span>初遇短句</span><p>${escapeText(encounterLine)}</p></div>`:"";
  const preferenceTimes=fish.preferredTimeIds.map(id=>TIMES.find(item=>item.id===id)?.name).filter(Boolean).join("／")||"全天皆有機會";
  const preferenceWeather=fish.preferredWeatherIds.map(id=>({sunny:"晴朗",rain:"細雨"})[id]).filter(Boolean).join("／")||"不限天氣";
  return `<aside class="card fish-detail"><div class="fish-detail-hero ${record.caughtShimmer?"has-shimmer":""}">${fishArt(fish,false,record.caughtShimmer?"shimmer":"normal","journal")}</div><h3>${fish.name}</h3><span class="latin">${fish.english} · ${fish.scientific}</span><span class="rarity-pill" style="background:${RARITY[fish.rarity].color}">${RARITY[fish.rarity].name}</span>${record.caughtShimmer?`<span class="shimmer-record">✦ 閃光紀錄 ${record.shimmerCount} 次</span>`:""}${renderRegionStamps(fish)}${fishHabitatRule(fish,true)}${encounterNote}<div class="familiarity-summary"><span>${familiarity.name}</span><b>${progress}</b></div><p class="fish-detail-copy">${full?fish.detail:fish.short}</p><div class="detail-stats"><div><small>捕獲次數</small><b>${record.count}</b></div><div><small>最長紀錄</small><b>${record.bestLength} cm</b></div><div><small>最重紀錄</small><b>${record.bestWeight} kg</b></div></div><div class="catch-dates"><span>初次：${formatCatchDate(record.firstCaught)}</span><span>最近：${formatCatchDate(record.lastCaught)}</span></div>${full?`<div class="fact-box">✦ ${fish.fact}</div><div class="fact-box">推薦魚餌：${fish.baits.map(id=>baitById(id).name).join("、")} · 偏好：${preferenceTimes}／${preferenceWeather}</div>${ecologySource}`:`<div class="fact-box">再捕獲 ${3-record.count} 次，解鎖偏好魚餌、時段與天氣線索。</div>`}${record.count>=5?recordedConditionNames(record):`<div class="fact-box">再捕獲 ${5-record.count} 次，整理完整的相遇地點、時段與天氣紀錄。</div>`}</aside>`;
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
  const tideglowEnabled=state.tideglow?.enabled===true;
  if(!tideglowEnabled&&shopTab==="ships")shopTab="rods";
  const tabNames={rods:"魚竿",baits:"魚餌",furniture:"船屋家具",equipment:"船用設備"};
  if(tideglowEnabled)tabNames.ships="船隻";
  let items=[];
  if(shopTab==="rods") items=RODS.map(item=>shopItem(item,"rod"));
  if(shopTab==="baits") items=BAITS.map(item=>shopItem(item,"bait"));
  if(shopTab==="furniture") items=activeShipFurnitureCatalog(state).map(item=>shopItem(item,"furniture"));
  if(shopTab==="equipment") items=[autoFishingStoreItem()];
  if(shopTab==="ships") items=SHIPS.map(shipStoreItem);
  const actions=`<span class="price">● ${state.money.toLocaleString("zh-TW")}</span>${tideglowEnabled?`<span class="price tideglow-price">✦ ${state.tideglow.total.toLocaleString("zh-TW")}</span>`:""}`;
  const furnitureNote=shopTab==="furniture"?`<p class="ship-catalog-note">目前展示 <b>${activeShip(state).name}</b> 專屬家具；切換船隻後，商店也會換成對應設計。</p>`:"";
  content.innerHTML=`${panelHeading("海灣商店","老闆會替你收好需要的裝備；商品永遠不會限時消失。",actions)}<div class="shop-tabs">${Object.entries(tabNames).map(([id,name])=>`<button class="filter-chip ${shopTab===id?"is-active":""}" data-action="shop-tab" data-id="${id}">${name}</button>`).join("")}</div>${furnitureNote}<div class="shop-grid">${items.join("")}</div>`;
}

function autoFishingStoreItem() {
  const equipment=AUTO_FISHING_EQUIPMENT,owned=state.autoFishing?.owned;
  const unlockShip=shipById(equipment.unlockShipId),hasUnlockShip=state.ships.ownedShipIds.includes(equipment.unlockShipId);
  const active=Boolean(state.autoFishing?.activeSession);
  let action=`<button class="soft-button" disabled>需先擁有${unlockShip?.name||"指定船隻"}</button>`;
  let label=`解鎖條件：${unlockShip?.name||equipment.unlockShipId}`;
  if(hasUnlockShip&&!owned){
    const affordable=state.money>=equipment.price;
    action=`<button class="primary-button" data-action="buy-auto-fishing" ${affordable?"":"disabled"}>${affordable?"購買永久設備":"金幣不足"}</button>`;
    label="已符合船隻條件";
  }
  if(owned){
    action=`<button class="${active?"primary-button":"soft-button"}" data-action="show-auto-fishing">${active?"調整目前設定":"設定自動釣魚"}</button>`;
    label=active?"已在目前港口待命":"永久擁有 · 尚未設定";
  }
  return `<article class="card shop-item auto-fishing-store-item ${owned?"is-owned":""}"><div class="shop-item-icon">⌁</div><span class="section-label">永久船用設備 · 不占家具插槽</span><h3>${equipment.name}</h3><p>${equipment.description}</p><div class="price-row"><span class="price">${owned?"已擁有":`${equipment.price.toLocaleString("zh-TW")} 金幣`}</span><span class="item-state">${label}</span></div>${action}</article>`;
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
  return `<article class="card shop-item ship-store-item ${active ? "is-active-ship" : ""} ${revealed ? "is-revealed" : "is-misted"}" data-ship-card="${ship.id}"><div class="ship-store-silhouette is-${ship.silhouette}" aria-hidden="true"><i></i><b></b></div><span class="section-label">${future ? "未來船影" : owned ? "已收藏" : revealed ? "潮光已揭露" : "潮光中的輪廓"}</span><h3>${ship.name}</h3><p>${ship.description}</p><div class="ship-store-stats"><span>✦ ${ship.tideglowRequired} 潮光</span><span>航速 ${ship.speedMultiplier.toFixed(2)}×</span></div><div class="price-row"><span class="price">${price}</span><span class="item-state">${reason}</span></div>${action}</article>`;
}

function showShipPurchaseConfirmation(shipId) {
  const eligibility = getShipPurchaseState(state, shipId);
  if (!eligibility.ok) { toast("目前還不能購買這艘船，請確認潮光、金幣與停泊狀態"); return; }
  const ship = eligibility.ship;
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal ship-purchase-modal"><span class="section-label">永久船隻收藏</span><h2>讓${ship.name}靠岸？</h2><p class="modal-copy">將支付 ${ship.price.toLocaleString("zh-TW")} 金幣並立即切換使用；${ship.tideglowRequired} 潮光只是解鎖門檻，不會被消耗。</p><p class="quiet-note">新船保有可使用的固定床台、航圖桌、日誌入口與水族箱基座；可替換家具需依這艘船的樣式另外購買。</p><div class="modal-actions"><button class="soft-button" data-action="close-modal">再想一下</button><button class="primary-button" data-action="confirm-buy-ship" data-id="${ship.id}">購買並使用</button></div></div></div>`;
}

function formatAutoFishingDuration(milliseconds) {
  const minutes=Math.max(0,Math.floor((Number(milliseconds)||0)/60000));
  return minutes>=60?`${Math.floor(minutes/60)} 小時 ${minutes%60} 分鐘`:`${minutes} 分鐘`;
}

function showAutoFishingSetup() {
  if(!state.autoFishing?.owned){shopTab="equipment";setView("shop");return;}
  const spots=getEligibleAutoFishingSpots(state),baits=getEligibleAutoFishingBaits(state),session=state.autoFishing.activeSession;
  const selectedSpot=session?.spotId&&spots.some(spot=>spot.id===session.spotId)?session.spotId:spots[0]?.id;
  const selectedBait=session?.baitId&&baits.some(bait=>bait.id===session.baitId)?session.baitId:baits[0]?.id;
  const fishPool=selectedSpot&&selectedBait?getAutoFishingFishPool(state,{regionId:state.world.currentRegionId,spotId:selectedSpot,baitId:selectedBait}):[];
  const spotOptions=spots.map(spot=>`<option value="${spot.id}" ${spot.id===selectedSpot?"selected":""}>${spot.name}</option>`).join("");
  const baitOptions=baits.map(bait=>`<option value="${bait.id}" ${bait.id===selectedBait?"selected":""}>${bait.name} · ${state.baitAmounts[bait.id]} 份</option>`).join("");
  const region=regionById(state.world.currentRegionId),ready=spots.length&&baits.length&&fishPool.length;
  const activePanel=session?`<div class="auto-fishing-active"><span class="section-label">目前待命</span><b>${regionById(session.regionId)?.portName||session.regionId} · ${SPOTS.find(spot=>spot.id===session.spotId)?.name||session.spotId}</b><small>${baitById(session.baitId)?.name||session.baitId} · 關閉整個遊戲頁面後才開始計時</small></div>`:"";
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal auto-fishing-modal"><span class="section-label">固定船用設備 · ${activeShip(state).name}</span><h2>${AUTO_FISHING_EQUIPMENT.name}</h2><p class="modal-copy">只會在目前停泊的 <b>${region?.portName||"港口"}</b>，從你曾經實際釣過的釣點守候熟悉的普通與少見魚種。切到背景分頁不算離線。</p>${activePanel}<div class="auto-fishing-form"><label>目前港口已造訪的釣點<select id="auto-fishing-spot" ${spots.length?"":"disabled"}>${spotOptions||'<option>尚無可用釣點</option>'}</select></label><label>消耗魚餌<select id="auto-fishing-bait" ${baits.length?"":"disabled"}>${baitOptions||'<option>沒有可用魚餌</option>'}</select></label>${state.developerMode?`<label>固定測試種子<input id="auto-fishing-seed" value="slice-e-fixed-seed" maxlength="80"></label>`:""}</div><p class="quiet-note">每 4 分鐘最多帶回 1 尾，每次最多 3 小時；不會遇見新魚、稀有魚、閃光魚或紀錄級尺寸，也不會推進手動釣魚目標。${fishPool.length?`目前可遇見 ${fishPool.length} 種熟悉魚。`:"目前選擇沒有符合規則的熟悉魚種。"}</p><div class="modal-actions">${session?'<button class="soft-button" data-action="stop-auto-fishing">收起釣架</button>':'<button class="soft-button" data-action="close-modal">先不設定</button>'}<button class="primary-button" data-action="start-auto-fishing" ${ready?"":"disabled"}>${session?"套用新設定":"讓釣架待命"}</button></div></div></div>`;
}

function showAutoFishingSummary(summary) {
  const view=autoFishingSummaryView(summary);if(!view)return;
  const fishRows=view.fish.map(({fish,count})=>`<li><span>${fish.name}</span><b>${count} 尾</b></li>`).join("");
  const familiarity=Object.values(view.familiarityGainsByFishId||{}).reduce((sum,count)=>sum+count,0);
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal auto-fishing-summary"><span class="section-label">離線守候回報</span><h2>港灣替你收好了這段潮聲</h2><p class="modal-copy">${view.region?.portName||view.regionId} · ${view.spot?.name||view.spotId} · ${view.bait?.name||view.baitId} · ${formatAutoFishingDuration(view.countedMs)}</p><div class="auto-summary-stats"><div><small>帶回漁獲</small><b>${view.catchCount} 尾</b></div><div><small>魚餌消耗</small><b>${view.baitConsumed} 份</b></div><div><small>可售價值</small><b>${view.totalValue} 金幣</b></div></div>${fishRows?`<ul class="auto-summary-fish">${fishRows}</ul>`:'<div class="modal-empty">這次沒有帶回漁獲，也沒有消耗魚餌。</div>'}<p class="quiet-note">熟悉度筆記 +${familiarity} · ${escapeText(view.stopLabel)}</p><blockquote>${escapeText(view.poeticLine)}</blockquote><div class="modal-actions"><button class="primary-button" data-action="acknowledge-auto-fishing" data-id="${view.id}">收下這份回報</button></div></div></div>`;
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
  return `<article class="card shop-item" data-shop-type="${type}" data-shop-id="${item.id}"><div class="shop-item-icon">${icon}</div><h3>${item.name}</h3><p>${item.description}</p><div class="price-row"><span class="price">${priceText}</span><span class="item-state">${owned?equipped?"裝備中":"已擁有":type==="bait"?`庫存 ${state.baitAmounts[item.id]||0}`:"可購買"}</span></div>${button}${!unlocked&&!owned?`<div class="lock-cover"><div><span>⌑</span><b>${lockReason}</b></div></div>`:""}</article>`;
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
  sound.play("coin");saveGame();toast(message);render();
  // Keep the aquarium popup open on the船屋 stage; from the catch view just close the sub-modal.
  if(homeAquariumOpen)showAquariumModal();else modalRoot.innerHTML="";
  notifyCompletedAchievements(result.completedAchievements);return true;
}

function showLogbook({categoryId=logbookCategoryId,entryId=selectedLogbookEntryId}={}) {
  const categories=getJournalCategories(state);
  logbookCategoryId=categories.some(category=>category.id===categoryId)?categoryId:"today";
  const entries=getJournalEntries(state,logbookCategoryId);
  selectedLogbookEntryId=entries.some(entry=>entry.id===entryId)?entryId:entries[0]?.id||null;
  let selected=entries.find(entry=>entry.id===selectedLogbookEntryId)||null;
  if(selected&&selected.type!=="today"&&(state.journal.unreadEntryIds.includes(selected.id)||state.journal.pendingNoticeEntryIds.includes(selected.id))){
    state.journal=acknowledgeJournalNotices(markJournalEntriesRead(state.journal,[selected.id]),[selected.id]);
    saveGame();syncWorld();
  }
  const unreadNow=new Set(state.journal.unreadEntryIds||[]);
  const categoryOutline=categories.map(category=>{
    const expanded=category.id===logbookCategoryId;
    const count=category.id==="today"?"每日更新":category.totalCount?`${category.unlockedCount} / ${category.totalCount}`:"尚待設計";
    const childEntries=expanded?entries.map((entry,index)=>`<button type="button" class="logbook-entry-row ${entry.id===selectedLogbookEntryId?"is-active":""} ${unreadNow.has(entry.id)?"is-unread":""}" data-action="select-logbook-entry" data-id="${entry.id}"><span aria-hidden="true">${entry.id===selectedLogbookEntryId?"◆":"◇"}</span><span><b>${escapeText(entry.title)}</b><small>${entry.type==="today"?"今日唯一頁":`第 ${index+1} 頁 · ${escapeText(JOURNAL_ENTRY_TYPE_LABELS[entry.type]||entry.type)}`}</small></span></button>`).join(""):"";
    return `<section class="logbook-tree-group ${expanded?"is-expanded":""}"><button type="button" class="logbook-category-row ${expanded?"is-active":""}" data-action="logbook-category" data-id="${category.id}" aria-expanded="${expanded}"><span class="logbook-tree-arrow" aria-hidden="true">${expanded?"▾":"▸"}</span><span class="logbook-category-copy"><small>${category.kind==="story"?`主線第 ${category.chapter} 章`:category.kind==="events"?"選填海況紀錄":category.kind==="fish"?"相遇收藏":"每日閱讀"}</small><b>${escapeText(category.name)}</b></span><span class="logbook-category-count">${count}</span>${category.unreadCount?`<i>${category.unreadCount}</i>`:""}</button>${expanded?`<div class="logbook-tree-entries">${childEntries||'<p class="logbook-tree-empty">尚無可讀頁</p>'}</div>`:""}</section>`;
  }).join("");
  const paragraphs=selected?.body?.map(paragraph=>`<p>${escapeText(paragraph)}</p>`).join("")||"";
  const detail=selected?`<article class="logbook-page" aria-live="polite"><div class="logbook-page-meta"><span>${escapeText(JOURNAL_ENTRY_TYPE_LABELS[selected.type]||selected.type)}</span><small>${escapeText(selected.meta||"")}</small></div><h3>${escapeText(selected.title)}</h3><div class="logbook-page-copy">${paragraphs}</div><blockquote>${escapeText(selected.closing||"")}</blockquote><p class="quiet-note">純文字唯讀頁面，不影響進度，也不通往其他系統。</p></article>`:`<div class="modal-empty logbook-empty-page"><b>這一類目前還沒有可閱讀的頁面。</b><span>${logbookCategoryId==="rare_fish"?"第一次親手釣到稀有魚後，固定相遇頁會收進這裡。":logbookCategoryId==="sea_events"?"首次完成選填特殊海況後，獨立紀錄會收進這裡，不影響主線。":"完成這片海域的居民主線後，固定章節頁會依序出現。"}</span></div>`;
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal logbook-modal"><div class="logbook-heading"><div><span class="section-label">${activeShip(state).name} · 我的船屋</span><h2>潮聲日誌</h2><p class="modal-copy">今日短文、稀有魚相遇與六片海域主線，都只在這本冊子裡閱讀。</p></div><b>${getJournalUnreadCount(state)} 未讀</b></div><div class="logbook-layout"><aside class="logbook-sidebar"><div class="logbook-sidebar-heading"><b>日誌目錄</b><small>選擇分類與頁次</small></div><nav class="logbook-outline" aria-label="日誌分類與頁面">${categoryOutline}</nav></aside>${detail}</div><div class="modal-actions"><button class="soft-button" data-action="close-modal">闔上日誌</button></div></div></div>`;
}

function flushJournalNotices() {
  if(!gameIsActive()||tutorialActive()||modalRoot.innerHTML||!state.journal?.pendingNoticeEntryIds?.length)return;
  const ids=[...state.journal.pendingNoticeEntryIds],entries=ids.map(id=>getJournalEntry(state,id)).filter(Boolean);
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
  const autoOwned=state.autoFishing?.owned,autoSession=state.autoFishing?.activeSession;
  const journalUnread=getJournalUnreadCount(state);
  const autoRack=autoOwned?`<button class="cabin-auto-rack ${autoSession?"is-active":""}" data-action="show-auto-fishing" title="${AUTO_FISHING_EQUIPMENT.name}"><i></i><span>${autoSession?"釣架待命":"自動釣架"}</span></button>`:"";
  const capacity=getAquariumCapacity(state),found=discoveredCount(state);
  const aquariumBadge=capacity?`${state.aquarium.fish.length} / ${capacity}`:`${found} / 5`;
  const doneMilestones=MILESTONES.filter(m=>state.completedMilestones.includes(m.count)).length;
  const ownedFurnitureCount=(interior?.ownedFurnitureIds||[]).length;
  const cabin=`<div class="cabin-view theme-${scene?.theme||"default"} lighting-${interior?.lightingId||"default"}" data-ship="${ship.id}"><div class="cabin-fixed-structure fixed-bed-platform"><span>固定床台</span></div><div class="cabin-fixed-structure fixed-chart-desk"><span>航圖桌</span></div><div class="cabin-fixed-structure fixed-journal-shelf"><span>日誌架</span></div>${autoRack}<div class="cabin-glow"></div><div class="cabin-window"><i class="window-rain"></i></div>${slots}<div class="cabin-identity"><b>${ship.name}</b><small>${lighting}</small></div></div>`;
  const dock=`<aside class="home-dock">
    <div class="home-dock-head"><span class="section-label">${escapeText(ship.name)}</span><div class="home-dock-stats"><div><small>時刻</small><b>${TIMES[state.timeIndex].name}</b></div><div><small>航速</small><b>${activeShipSpeed(state).toFixed(2)}×</b></div><div><small>探索</small><b>${found} / ${FISH.length}</b></div></div></div>
    ${renderHomeChartCard()}
    <div class="home-dock-actions">
      <button class="home-dock-button" data-action="show-aquarium"><span aria-hidden="true">◫</span><b>水族箱</b><i>${aquariumBadge}</i></button>
      <button class="home-dock-button" data-action="show-logbook"><span aria-hidden="true">▤</span><b>潮聲日誌</b>${journalUnread?`<i>${journalUnread} 篇未讀</i>`:""}</button>
      ${autoOwned?`<button class="home-dock-button ${autoSession?"is-active":""}" data-action="show-auto-fishing"><span aria-hidden="true">⌁</span><b>自動釣魚</b>${autoSession?`<i>待命中</i>`:""}</button>`:""}
      <button class="home-dock-button" data-action="show-furniture"><span aria-hidden="true">◇</span><b>家具佈置</b>${ownedFurnitureCount?`<i>${ownedFurnitureCount}</i>`:""}</button>
      <button class="home-dock-button" data-action="show-milestones"><span aria-hidden="true">✦</span><b>圖鑑里程碑</b><i>${doneMilestones} / ${MILESTONES.length}</i></button>
    </div>
    <button class="primary-button home-sleep-button" data-action="sleep">睡到下一個時段</button>
  </aside>`;
  content.innerHTML=`<div class="home-stage" data-ship="${ship.id}">${cabin}${dock}</div>`;
}

let homeAquariumOpen=false,homeFurnitureOpen=false;
function closeHomePopups(){ if(homeAquariumOpen||homeFurnitureOpen)modalRoot.innerHTML=""; homeAquariumOpen=false; homeFurnitureOpen=false; }
function showAquariumModal(){
  homeAquariumOpen=true; homeFurnitureOpen=false;
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal home-popup-modal aquarium-popup-modal">${renderAquariumPanel()}<div class="modal-actions"><button class="soft-button" data-action="close-home-popup">關閉</button></div></div></div>`;
}
function showFurnitureModal(){
  homeFurnitureOpen=true; homeAquariumOpen=false;
  const interior=shipInterior(state),ship=activeShip(state);
  const ownedFurniture=(interior?.ownedFurnitureIds||[]).map(furnitureById).filter(Boolean);
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal home-popup-modal"><span class="section-label">${escapeText(ship.name)}的家具</span><h2>家具佈置</h2><p class="modal-copy">選一件已擁有的家具放進對應的固定插槽；也可以直接點船艙裡的插槽。</p><div class="owned-list">${ownedFurniture.length?ownedFurniture.map(item=>`<button class="owned-chip ${interior.placedFurniture[item.slot]===item.id?"is-placed":""}" data-action="place-furniture" data-id="${item.id}">${item.icon} ${item.name}</button>`).join(""):'<p class="quiet-note">這艘船還沒有可替換家具；固定床台、航圖桌與水族箱仍可使用。</p>'}</div><div class="modal-actions"><button class="soft-button" data-action="close-home-popup">關閉</button></div></div></div>`;
}
function showMilestonesModal(){
  const found=discoveredCount(state);
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal home-popup-modal"><span class="section-label">圖鑑進度 · ${found} / ${FISH.length}</span><h2>圖鑑里程碑</h2><p class="modal-copy">每累積一定的圖鑑發現數，就會解鎖新的獎勵與水族箱擴建。</p><div class="milestone-list">${MILESTONES.map(m=>`<div class="milestone-row ${state.completedMilestones.includes(m.count)?"is-done":""}"><i></i><span>${m.count} 種 · ${m.reward}</span></div>`).join("")}</div><div class="modal-actions"><button class="soft-button" data-action="close-modal">關閉</button></div></div></div>`;
}

function placeFurniture(id) {
  const result=placeShipFurniture(state,id); if(!result.ok)return;
  saveGame(); sound.play("coin"); toast(`${result.item.name}已放進${slotName(result.item.slot)}`); render();
  if(homeFurnitureOpen)showFurnitureModal();
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
  const completesTutorial=tutorialActive()&&state.tutorialStep===13;
  if(completesTutorial){
    setTutorialStep(TUTORIAL_TOTAL_STEPS,{persist:false});
    saveGame();
    toast("教學完成。接下來，照自己的步調探索海灣吧！","gold");
  }
  renderHome(); updateTutorial();
  if(completesTutorial)setTimeout(flushJournalNotices,0);
}

function updateTutorial() {
  const presentation=tutorialPresentation();
  if(!presentation){tutorialEl.classList.add("is-hidden");clearTutorialFocus();return;}
  const skipAction=presentation.step===0?'<button class="tutorial-skip" data-action="dismiss-tutorial" type="button" aria-label="跳過全部航海教學">跳過教學</button>':"";
  tutorialEl.innerHTML=`<small>航海教學 · ${presentation.step+1} / ${TUTORIAL_TOTAL_STEPS}</small>${skipAction}<b>${escapeText(presentation.title)}</b><p>${escapeText(presentation.copy)}</p>`;
  tutorialEl.classList.remove("is-hidden");
  applyTutorialFocus();
}

function setView(view) {
  if(view!=="fishing"&&fishing.phase!=="idle"){clearFishing(); fishing.phase="idle"; toast("已替你收好魚線");}
  closeHomePopups();
  currentView=view;
  let tutorialAdvanced=false;
  if(tutorialActive()){
    if(view==="journal"&&state.tutorialStep===8){state.tutorialStep=9;tutorialAdvanced=true;}
    if(view==="shop"&&state.tutorialStep===9){state.tutorialStep=10;shopTab="rods";tutorialAdvanced=true;}
    if(view==="home"&&state.tutorialStep===12){state.tutorialStep=13;tutorialAdvanced=true;}
  }
  if(tutorialAdvanced)saveGame();
  render();updateTutorial();window.scrollTo({top:0,behavior:"smooth"});
}

function sell(ids) {
  const tutorialSale=tutorialActive()&&state.tutorialStep===7;
  const result=sellCatches(state,ids,{source:tutorialSale?"tutorial":"manual"}); if(!result.sold)return;
  if(tutorialSale){state.tutorialStep=8;state.tutorialCatchUid=null;}
  sound.play("coin");saveGame();toast(`販售 ${result.sold} 份漁獲，獲得 ${result.total} 金幣`);
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
  if (points > 0) {
    if (!state.tideglow.seenIntro) {
      state.tideglow = { ...state.tideglow, seenIntro: true };
      saveGame();
      setTimeout(() => showTideglowIntro(points), 400);
    } else {
      setTimeout(() => toast(`潮光悄悄亮起了 +${points}`, "gold"), 260);
    }
  }
  const revealed = events.flatMap(event => event?.results?.tideglow?.newlyRevealed || []);
  if (revealed.length) setTimeout(() => toast(`遠處船影漸漸清楚：${revealed.map(ship => ship.name).join("、")}`, "gold"), 620);
}

function showTideglowIntro(points) {
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal"><span class="section-label">✦ 永久潮光</span><h2>潮光亮起了 +${points}</h2><p class="modal-copy">潮光是探索世界留下的光跡，會永久累積，不會因購買或任何動作消耗。<br><br>抵達新海域、發現新魚種、完成觀察與研究，都能讓潮光增加。累積到一定數量，可以在海灣商店解鎖新的船隻。</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">開始探索</button></div></div></div>`;
}

function notifyCompletedAchievements(achievements=[]) {
  achievements.forEach((achievement,index)=>setTimeout(()=>toast(`成就完成「${achievement.name}」：獎勵可在圖鑑領取`,"gold"),index*360));
}

function settingsChoices(options, selectedId, action) {
  return `<div class="settings-choices">${options.map(option => `<button class="settings-choice ${selectedId === option.id ? "is-selected" : ""}" data-action="${action}" data-id="${option.id}" aria-pressed="${selectedId === option.id}"><span>${selectedId === option.id ? "✓" : "○"}</span><b>${option.label}</b><small>${Math.round(option.scale * 100)}%</small></button>`).join("")}</div>`;
}

function showSettings() {
  const saveTools = gameIsActive() ? `<section class="settings-save-tools"><span class="section-label">本機存檔備份</span><p>匯出內容只會顯示在這台裝置上；匯入前，現有主要存檔會先保留到備份槽。</p><div class="developer-control-actions"><button class="soft-button" data-action="show-save-export">匯出目前航程</button><button class="soft-button" data-action="show-save-import">匯入同模式航程</button></div></section>` : "";
  const soundVolume = normalizeSoundVolume(state.settings.soundVolume);
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal settings-modal"><span class="section-label">資訊無障礙</span><h2>聲音與顯示</h2><p class="modal-copy">聲音、文字與介面可分開調整。遊戲預設動態保持柔和，沒有高頻閃爍或快速鏡頭晃動。</p><div class="settings-row"><span><b>遊戲聲音</b><small>操作、捕獲音效與環境旋律</small></span><button class="toggle ${state.settings.sound?"is-on":""}" data-action="toggle-sound" role="switch" aria-checked="${state.settings.sound}" aria-label="遊戲聲音"><i></i></button></div><div class="settings-group settings-volume-group"><div class="settings-volume-heading"><span><b>總音量</b><small id="sound-volume-description">拖曳時會立即調整所有遊戲聲音</small></span><output id="sound-volume-output" for="sound-volume">${soundVolume}%</output></div><div class="settings-volume-control"><span aria-hidden="true">0</span><input id="sound-volume" type="range" min="0" max="100" step="5" value="${soundVolume}" style="--range-progress:${soundVolume}%" data-action="set-sound-volume" aria-label="總音量" aria-describedby="sound-volume-description sound-volume-output" aria-valuetext="${soundVolume}%"><span aria-hidden="true">100</span></div></div><div class="settings-group"><span><b>文字大小</b><small>只放大標題、說明與按鈕文字</small></span>${settingsChoices(TEXT_SCALE_OPTIONS,state.settings.textScale,"set-text-scale")}</div><div class="settings-group"><span><b>介面縮放</b><small>調整卡片、按鈕與操作區域的整體尺寸</small></span>${settingsChoices(UI_SCALE_OPTIONS,state.settings.uiScale,"set-ui-scale")}</div>${saveTools}<div class="modal-actions"><button class="soft-button" data-action="close-modal">關閉</button></div></div></div>`;
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
  const wasBackupProtected = protectedBackupModes.has(activeSaveMode);
  state = pendingPortableImport.state;
  state.settings = normalizeDisplaySettings(state.settings);
  protectedBackupModes.delete(activeSaveMode);
  if (!saveGame(true)) {
    if (wasBackupProtected) protectedBackupModes.add(activeSaveMode);
    state = previousState;
    showPortableImport("本機空間不足，原本的航程沒有被改動。", pendingPortableImport.draft);
    return;
  }
  protectedBackupModes.add(activeSaveMode);
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

function showDeveloperTools() {
  if (!state.developerMode) return;
  const dailyOptions = DAILY_GOAL_TEMPLATES.map(template => `<option value="${template.id}">${template.id} · ${template.text}</option>`).join("");
  const commissionOptions = RESIDENTS.map(resident => `<optgroup label="${resident.name}">${getResidentCommissionTemplates(resident.id).map(template => `<option value="${template.id}">${template.id} · ${template.title}</option>`).join("")}</optgroup>`).join("");
  const residentOptions = RESIDENTS.map(resident => `<option value="${resident.id}">${resident.name}</option>`).join("");
  const active = state.residentCommissions.active;
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal developer-modal"><span class="section-label">資料驅動測試入口</span><h2>Slice D 開發者控制</h2><p class="modal-copy">每日模板與居民今日提案直接由正式內容資料產生；所有操作只寫入獨立開發者存檔。</p><div class="developer-control-grid"><section class="developer-control-card"><h3>每日小目標</h3><label>卡片位置<select id="developer-daily-slot"><option value="0">第 1 張</option><option value="1">第 2 張</option><option value="2">第 3 張</option></select></label><label>正式模板<select id="developer-daily-template">${dailyOptions}</select></label><div class="developer-control-actions"><button class="soft-button" data-action="developer-set-daily">指定模板</button><button class="soft-button" data-action="developer-complete-daily">全部完成</button><button class="soft-button" data-action="developer-claim-daily">領取完成</button><button class="soft-button" data-action="developer-next-day">推進航海日</button><button class="soft-button" data-action="developer-reset-daily">重置今日</button></div></section><section class="developer-control-card"><h3>居民今日提案</h3><label>居民<select id="developer-resident">${residentOptions}</select></label><label>正式模板<select id="developer-commission-template">${commissionOptions}</select></label><p class="quiet-note">${active ? `進行中：${active.title} · ${active.progress}/${active.goal}` : "目前沒有進行中的今日提案"}</p><div class="developer-control-actions"><button class="soft-button" data-action="developer-set-offer">指定提案</button><button class="soft-button" data-action="developer-accept-offer">接受提案</button><button class="soft-button" data-action="developer-complete-commission">完成進度</button><button class="soft-button" data-action="developer-deliver-commission">交付</button><button class="soft-button" data-action="developer-drop-commission">放下</button><button class="soft-button" data-action="developer-clear-commission-history">清除歷史</button></div></section></div><div class="modal-actions"><button class="primary-button" data-action="close-modal">完成測試</button></div></div></div>`;
  const travelStatus = getTravelStatus(state.world);
  const scaleOptions = DEVELOPER_TRAVEL_SCALES.map(scale => `<option value="${scale}" ${state.travelSettings.developerDurationScale === scale ? "selected" : ""}>${scale === 1 ? "正式速度 100%" : `測試速度 ${Math.round(scale * 100)}%`}</option>`).join("");
  $(".developer-modal h2")?.replaceChildren("v0.5 Slice E 整合控制");
  $(".developer-modal .modal-copy")?.replaceChildren("既有旅程控制與 v5 事件、潮光帳本集中於此；全部操作只寫入獨立開發者存檔。");
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>正式航線</h3><label>航程時間比例<select id="developer-travel-scale">${scaleOptions}</select></label><p class="quiet-note">${travelStatus ? `航行中：${travelStatus.route.name} · ${travelStatus.segment}/${travelStatus.totalSegments}` : state.world.docking?.status === "offshore" ? `已抵達${regionById(state.world.docking.regionId)?.name || "目的地"}外海` : "目前安全停泊"}</p><div class="developer-control-actions"><button class="soft-button" data-action="developer-set-travel-scale">套用比例</button><button class="soft-button" data-action="developer-arrive-travel" ${travelStatus ? "" : "disabled"}>立即抵達外海</button><button class="soft-button" data-action="developer-reset-route">重置首條航線</button></div></section>`);
  const regionOptions = REGIONS.filter(region => region.status === "available").map(region => `<option value="${region.id}" ${state.world.currentRegionId === region.id ? "selected" : ""}>${region.name} · ${region.portName}</option>`).join("");
  const eventOptions = BAY_EVENTS.filter(event => event.regionId === state.world.currentRegionId).map(event => `<option value="${event.id}">${event.id} · ${event.name}</option>`).join("");
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>琉光群島內容</h3><label>直接停泊區域<select id="developer-region">${regionOptions}</select></label><label>目前區域事件<select id="developer-region-event">${eventOptions}</select></label><p class="quiet-note">三個釣點、正式觀察點、澄野與研究主路均可直接驗證。</p><div class="developer-control-actions"><button class="soft-button" data-action="developer-dock-region">直接停泊</button><button class="soft-button" data-action="developer-set-region-event" ${eventOptions ? "" : "disabled"}>指定事件</button></div></section>`);
  const observationOptions = OBSERVATION_SUBJECTS.map(subject => `<option value="${subject.id}">${subject.id} · ${subject.name}</option>`).join("");
  const luminousResearch = getRegionResearchStatus(state, LUMINOUS_ARCHIPELAGO_ID);
  const chengyeStory = getResidentStoryStatus(state, CHENGYE_ID);
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>觀察、研究與澄野</h3><label>正式觀察魚<select id="developer-observation-subject">${observationOptions}</select></label><p class="quiet-note">觀察 ${Object.keys(state.observations?.recordsById || {}).length}/${OBSERVATION_SUBJECTS.length} · 研究 ${luminousResearch?.speciesCount || 0}/${luminousResearch?.research.fullSpeciesGoal || 33} · 澄野 ${chengyeStory.completedSceneIds.length}/${chengyeStory.scenes.length}</p><div class="developer-control-actions"><button class="soft-button" data-action="developer-record-observation">直接記錄</button><button class="soft-button" data-action="developer-reset-observations">重置觀察</button><button class="soft-button" data-action="developer-complete-research">完成研究</button><button class="soft-button" data-action="developer-reset-chengye">重置澄野故事</button></div></section>`);
  const tideglowOptions = TIDEGLOW_SOURCES.map(source => `<option value="${source.eventType}">${source.label} · +${source.points}</option>`).join("");
  const ledger = Object.values(state.tideglow?.ledgerBySourceId || {}).slice(-5).reverse();
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>潮光與事件帳本</h3><label>合法來源<select id="developer-tideglow-source">${tideglowOptions}</select></label><p class="quiet-note">顯示 ${state.tideglow?.total || 0} · 帳本 ${Object.keys(state.tideglow?.ledgerBySourceId || {}).length} · pending ${state.gameEvents?.pending?.length || 0} · recent ${state.gameEvents?.recent?.length || 0}</p><div class="developer-ledger">${ledger.length ? ledger.map(entry => `<small>${entry.sourceId} · +${entry.points}</small>`).join("") : "<small>帳本尚未留下光點</small>"}</div><div class="developer-control-actions"><button class="soft-button" data-action="developer-tideglow-down">−10 顯示值</button><button class="soft-button" data-action="developer-tideglow-up">+10 顯示值</button><button class="soft-button" data-action="developer-emit-tideglow">發送來源</button><button class="soft-button" data-action="developer-emit-tideglow">重送驗證去重</button></div></section>`);
  const shipOptions = SHIPS.map(ship => `<option value="${ship.id}" ${state.ships.activeShipId === ship.id ? "selected" : ""}>${ship.name} · ${ship.status === "implemented" ? `${ship.speedMultiplier.toFixed(2)}×` : "預告"}</option>`).join("");
  const speedOptions = [...new Set([.5, 1, ...SHIPS.map(ship => ship.speedMultiplier), 1.5, 2])].sort((a,b)=>a-b).map(speed => `<option value="${speed}" ${activeShipSpeed(state) === speed ? "selected" : ""}>${speed.toFixed(2)}×</option>`).join("");
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>船隻、揭露與航速</h3><label>正式船隻<select id="developer-ship">${shipOptions}</select></label><label>航速測試覆寫<select id="developer-ship-speed">${speedOptions}</select></label><p class="quiet-note">目前 ${activeShip(state).name} · 擁有 ${state.ships.ownedShipIds.length}/${SHIPS.length} · 揭露 ${state.ships.revealedShipIds.length}/${SHIPS.length}</p><div class="developer-control-actions"><button class="soft-button" data-action="developer-own-ship">切換擁有</button><button class="soft-button" data-action="developer-activate-ship">設為目前船</button><button class="soft-button" data-action="developer-reveal-ships">揭露全部</button><button class="soft-button" data-action="developer-set-ship-speed">套用航速</button><button class="soft-button" data-action="developer-fill-money">補滿金幣</button></div></section>`);
  const activeInterior=shipInterior(state),lightingOptions=SHIP_LIGHTING.map(option=>`<option value="${option.id}" ${activeInterior?.lightingId===option.id?"selected":""}>${option.name}</option>`).join("");
  const invalidInteriorRefs=collectInvalidInteriorReferences(state);
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>船別家具與燈光</h3><label>${activeShip(state).name}燈光<select id="developer-ship-lighting">${lightingOptions}</select></label><p class="quiet-note">擁有 ${activeInterior?.ownedFurnitureIds.length||0}/${activeShipFurnitureCatalog(state).length} · 已配置 ${Object.values(activeInterior?.placedFurniture||{}).filter(Boolean).length}/${SHIP_SLOT_TYPES.length} · 失效引用 ${invalidInteriorRefs.length}</p><div class="developer-control-actions"><button class="soft-button" data-action="developer-fill-ship-furniture">購齊並填入</button><button class="soft-button" data-action="developer-clear-ship-furniture">清除船別家具</button><button class="soft-button" data-action="developer-reset-ship-slots">重置插槽</button><button class="soft-button" data-action="developer-set-ship-lighting">套用燈光</button><button class="soft-button" data-action="developer-inspect-interiors">檢查失效引用</button></div></section>`);
  const journalCategories=getJournalCategories(state),journalUnlocked=journalCategories.reduce((sum,category)=>sum+category.unlockedCount,0);
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>潮聲日誌</h3><p class="quiet-note">分類 ${journalCategories.length} · 可讀 ${journalUnlocked} · 未讀 ${getJournalUnreadCount(state)} · 今日潮記不保存歷史</p><div class="developer-control-actions"><button class="soft-button" data-action="developer-check-journal">檢查固定內容</button></div></section>`);
  const autoSession=state.autoFishing?.activeSession,autoSummary=state.autoFishing?.lastSummary;
  const autoScenarios=[["returned","正常返回 · 20 分"],["returned-early","提早返回"],["bait-empty","魚餌耗盡"],["three-hour-limit","三小時上限"],["clock-rollback","時間倒退"],["no-eligible-fish","無合格魚種"],["region-changed","停泊海域改變"],["departed","直接出航停止"],["manual","手動收起"]].map(([value,label])=>`<option value="${value}">${label}</option>`).join("");
  $(".developer-control-grid")?.insertAdjacentHTML("beforeend", `<section class="developer-control-card"><h3>靜潮自動釣架</h3><label>停止情境<select id="developer-auto-scenario">${autoScenarios}</select></label><p class="quiet-note">${state.autoFishing?.owned?"已擁有":"未擁有"} · ${autoSession?`${autoSession.spotId} / ${autoSession.baitId} 待命`:"未設定"} · ${autoSummary?`最近 ${autoSummary.catchCount} 尾 / ${autoSummary.stopReason}`:"尚無回報"}</p><div class="developer-control-actions"><button class="soft-button" data-action="show-auto-fishing" ${state.autoFishing?.owned?"":"disabled"}>固定種子設定</button><button class="soft-button" data-action="developer-auto-owned">重置為已擁有</button><button class="soft-button" data-action="developer-auto-locked">重置為未擁有</button><button class="soft-button" data-action="developer-auto-simulate" ${autoSession?"":"disabled"}>模擬情境</button>${autoSummary&&!autoSummary.acknowledged?'<button class="soft-button" data-action="developer-auto-summary">顯示最近回報</button>':""}</div></section>`);
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

function tutorialEventIsAllowed(event) {
  if (!tutorialActive()) return true;
  if (tutorialEl.contains(event.target)) return true;
  if (event.target === tutorialSpotlight && tutorialSpotlight.classList.contains("is-interactive")) return true;
  const actionTarget = tutorialActionTarget();
  return Boolean(actionTarget && (event.target === actionTarget || actionTarget.contains(event.target)));
}

function guardTutorialInteraction(event) {
  if (tutorialEventIsAllowed(event)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

for (const eventName of ["click", "pointerdown", "change", "submit"]) {
  document.addEventListener(eventName, guardTutorialInteraction, true);
}

tutorialSpotlight.addEventListener("click", event => {
  if (!tutorialActive() || !tutorialSpotlight.classList.contains("is-interactive")) return;
  event.preventDefault();
  tutorialActionTarget()?.click();
});

document.addEventListener("focusin", event => {
  if (!tutorialActive() || tutorialEl.contains(event.target) || tutorialEventIsAllowed(event)) return;
  (tutorialActionTarget() || tutorialEl).focus({ preventScroll: true });
}, true);

document.addEventListener("keydown", event => {
  if (!tutorialActive()) return;
  if (event.key === "Tab") {
    event.preventDefault();
    const actionTarget = tutorialActionTarget();
    const skipTarget = tutorialEl.querySelector('[data-action="dismiss-tutorial"]');
    const focusTarget = event.shiftKey || document.activeElement === skipTarget
      ? (actionTarget || skipTarget || tutorialEl)
      : (skipTarget || actionTarget || tutorialEl);
    focusTarget.focus({ preventScroll: true });
    return;
  }
  if (event.code === "Space" && state.tutorialStep === 5 && fishing.phase === "reeling") return;
  if (["Escape", " "].includes(event.key) || event.code === "Space") {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

document.addEventListener("click", event => {
  const target=event.target.closest("[data-action]"); if(!target)return;
  const {action,id,direction,incoming,replace,x,y,filter,entry,kind}=target.dataset;
  if(action==="cast")castLine();
  if(action==="strike")strikeLine();
  if(action==="hook")startReeling();
  if(action==="reset-fishing")resetFishing();
  if(action==="dismiss-tutorial")skipTutorial();
  if(action==="show-fishing-setup"){advanceTutorial(0,1);showFishingSetup();updateTutorial();}
  if(action==="spot"&&getRegionFishingSpots(state.world?.currentRegionId).some(spot=>spot.id===id)){state.selectedSpot=id;saveGame();renderFishing();syncWorld();if($(".fishing-setup-modal"))showFishingSetup();}
  if(action==="tracker-residents")setView("residents");
  if(action==="preview-observation")showObservationPreview(id);
  if(action==="claim-quest"&&claimQuest(state,id)){sound.play("coin");saveGame();toast("今日目標完成，獎勵已收入錢袋");render();}
  if(action==="talk-resident")showResidentDialogue(id);
  if(action==="accept-resident-story"){
    const result=acceptResidentStory(state,id);
    if(result.ok){saveGame();render();showResidentStoryScene(result.scene,"opening",result.status);toast(`已接受主線任務「${result.scene.title}」`);}
    else toast("這一節主線目前還不能接受");
  }
  if(action==="complete-resident-story"){
    const result=completeResidentStory(state,id);
    if(result.ok){sound.play("new");saveGame();render();notifyTideglow([result.tideglowEvent]);showResidentStoryScene(result.scene,"completion",result.status);toast(`主線完成：${result.scene.title}`,"gold");}
    else toast(result.reason==="wrong-port"?"需要回到這位居民所在的港口完成主線":"請先親手完成主線目標");
  }
  if(action==="accept-commission"){
    const result=acceptResidentCommission(state,id);
    if(result.ok){saveGame();render();toast(`已接受今日提案「${result.commission.title}」，不會隨換日過期`);}
  }
  if(action==="drop-commission"){
    const result=dropResidentCommission(state);
    if(result.ok){saveGame();render();toast("今日提案已放下，沒有任何懲罰");}
  }
  if(action==="deliver-commission"){
    const result=deliverResidentCommission(state,id);
    if(result.ok){sound.play("coin");saveGame();render();showResidentDialogue(id,result.dialogue);toast(`今日提案完成：${rewardLabel(result.reward)}`,"gold");}
    else toast("需要回到正確居民所在的港口，才能交付今日提案");
  }
  if(action==="close-catch"){
    const beginTutorialSale=tutorialActive()&&state.tutorialStep===6;
    modalRoot.innerHTML="";
    if(beginTutorialSale){state.tutorialStep=7;currentView="catch";saveGame();}
    render();updateTutorial();setTimeout(flushJournalNotices,0);
  }
  if(action==="modal-journal"){modalRoot.innerHTML="";selectedJournalFish=id;setView("journal");}
  if(action==="journal-filter"){journalFilter=id;renderJournal();}
  if(action==="select-fish"){selectedJournalFish=id;renderJournal();}
  if(action==="show-logbook")showLogbook();
  if(action==="logbook-category"){logbookCategoryId=id;selectedLogbookEntryId=null;showLogbook({categoryId:id,entryId:null});}
  if(action==="select-logbook-entry")showLogbook({categoryId:logbookCategoryId,entryId:id});
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
    if(setAquariumDecoration(state,next)){saveGame();if(homeAquariumOpen)showAquariumModal();else renderHome();toast(next?"水族箱已亮起拾光微粒":"水族箱裝飾已關閉");}
  }
  if(action==="show-aquarium")showAquariumModal();
  if(action==="show-furniture")showFurnitureModal();
  if(action==="show-milestones")showMilestonesModal();
  if(action==="close-home-popup"){closeHomePopups();modalRoot.innerHTML="";}
  if(action==="shop-tab"){
    if(id!=="ships"||state.tideglow?.enabled){
      shopTab=id;
      if(id==="baits")advanceTutorial(10,11);
      renderShop();updateTutorial();
    }
  }
  if(action==="buy-auto-fishing"){
    const result=buyAutoFishingEquipment(state);
    if(result.ok){sound.play("coin");saveGame();renderShop();toast(`${AUTO_FISHING_EQUIPMENT.name}已永久固定在每艘船上`,"gold");}
    else toast("購買未完成；請確認潮聲居所、停泊狀態與金幣");
  }
  if(action==="show-auto-fishing")showAutoFishingSetup();
  if(action==="start-auto-fishing"){
    const result=configureAutoFishing(state,{spotId:$("#auto-fishing-spot")?.value,baitId:$("#auto-fishing-bait")?.value,seed:$("#auto-fishing-seed")?.value});
    if(result.ok){saveGame();modalRoot.innerHTML="";render();toast("釣架已安靜待命；只有完整關閉遊戲才會開始計時","gold");}
    else toast("設定未完成；請確認目前港口、已釣過的釣點、魚餌與熟悉魚種");
  }
  if(action==="stop-auto-fishing"){
    const result=stopAutoFishing(state);
    if(result.ok){saveGame();modalRoot.innerHTML="";render();toast("釣架已收線，沒有留下未結算的成果");}
  }
  if(action==="acknowledge-auto-fishing"&&acknowledgeAutoFishing(state,id)){
    saveGame();modalRoot.innerHTML="";render();toast("漁獲與熟悉度筆記已收進航程紀錄","gold");setTimeout(flushJournalNotices,0);
  }
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
  if(action==="buy-bait"&&buyBait(state,id)){
    if(id==="bread"&&tutorialActive()&&state.tutorialStep===11)state.tutorialStep=12;
    sound.play("coin");saveGame();toast(`${baitById(id).name}已放入裝備箱`);render();updateTutorial();
  }
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
  if(action==="developer-check-journal"){
    const categories=getJournalCategories(state),entries=categories.flatMap(category=>getJournalEntries(state,category.id));
    const valid=categories.length===8&&entries.every(entry=>entry.title&&Array.isArray(entry.body)&&entry.body.length&&entry.closing)&&!document.querySelector('[data-action="logbook-cross-link"]');
    toast(valid?"八個分類、固定文字與純閱讀規則皆通過":"日誌檢查發現分類、文字或入口異常",valid?"gold":"");
  }
  if(action==="developer-auto-owned"&&developerResetAutoFishing(state,true))finishDeveloperAction("自動釣架已重置為永久擁有");
  if(action==="developer-auto-locked"&&developerResetAutoFishing(state,false))finishDeveloperAction("自動釣架已重置為未擁有");
  if(action==="developer-auto-simulate"){
    const stopReason=$("#developer-auto-scenario")?.value;
    const result=developerSimulateAutoFishing(state,{durationMs:20*60*1000,stopReason});
    if(result.ok&&result.summary){saveGame();showAutoFishingSummary(result.summary);}
    else if(result.ok)finishDeveloperAction(`釣架已依 ${stopReason} 情境安全停止`);
    else toast("請先用固定種子完成一組自動釣魚設定");
  }
  if(action==="developer-auto-summary"&&state.autoFishing?.lastSummary)showAutoFishingSummary(state.autoFishing.lastSummary);
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
  if(action==="toggle-sound"){state.settings.sound=!state.settings.sound;persistDisplaySettings();sound.syncVolume();showSettings();syncWorld();if(state.settings.sound){sound.play("coin");sound.startAmbient();}else sound.stopAmbient();}
  if(action==="close-modal"){
    if(tutorialActive()&&state.tutorialStep===1){state.tutorialStep=2;saveGame();}
    modalRoot.innerHTML="";updateTutorial();setTimeout(flushJournalNotices,0);
    // Aquarium sub-modals (add/replace/specimen) return to the open aquarium popup on the船屋 stage.
    if(homeAquariumOpen)showAquariumModal();
  }
  if(action==="to-title"){if(state.world?.travel)travelClockTick({forceSave:true});clearInterval(travelClockTimer);travelClockTimer=null;clearFishing();closeHomePopups();clearTutorialFocus();tutorialEl.classList.add("is-hidden");sound.stopAmbient();modalRoot.innerHTML="";gameShell.classList.add("is-hidden");titleScreen.classList.remove("is-hidden");app.classList.remove("is-developer-mode");$("#developer-tools-button").hidden=true;$("#continue-button").disabled=!hasSave("normal");}
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

document.addEventListener("change",event=>{
  if(event.target.dataset.action==="equip-rod"){state.equippedRod=event.target.value;saveGame();renderFishing();if($(".fishing-setup-modal"))showFishingSetup();}
  if(event.target.dataset.action==="equip-bait"){state.equippedBait=event.target.value;saveGame();renderFishing();if($(".fishing-setup-modal"))showFishingSetup();}
  if(event.target.dataset.action==="set-sound-volume"){
    state.settings.soundVolume=normalizeSoundVolume(event.target.value);
    persistDisplaySettings();
    sound.syncVolume();
    if(state.settings.sound&&state.settings.soundVolume>0)sound.play("coin");
  }
});

document.addEventListener("input",event=>{
  if(event.target.dataset.action!=="set-sound-volume")return;
  const volume=normalizeSoundVolume(event.target.value);
  state.settings.soundVolume=volume;
  event.target.value=String(volume);
  event.target.setAttribute("aria-valuetext",`${volume}%`);
  event.target.style.setProperty("--range-progress",`${volume}%`);
  const output=$("#sound-volume-output");
  if(output)output.textContent=`${volume}%`;
  sound.syncVolume();
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
window.addEventListener("resize",()=>{if(tutorialActive())scheduleTutorialFocus();});
document.addEventListener("scroll",()=>{if(tutorialActive())scheduleTutorialFocus();},true);
document.addEventListener("visibilitychange",()=>{
  if(!state.world?.travel)return;
  if(document.visibilityState==="hidden")travelClockTick({forceSave:true});
  else {const result=travelClockTick();if(result.arrived||result.changed)render();syncTravelClock();}
});
function persistPageExit(event) {
  if(event?.persisted||!gameIsActive())return;
  if(state.world?.travel)travelClockTick();
  markAutoFishingClosed(state,new Date().toISOString());
  saveGame();
}
window.addEventListener("pagehide",persistPageExit);
window.addEventListener("pageshow",event=>{
  if(!event.persisted||!gameIsActive())return;
  if(cancelAutoFishingClosed(state))saveGame();
});

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
window.addEventListener("beforeunload",persistPageExit);
state.settings=loadPreferences(state.settings);
applyDisplaySettings();
$("#continue-button").disabled=!CONTENT_VALIDATION.ok||!hasSave();
applyContentValidationGate(CONTENT_VALIDATION);

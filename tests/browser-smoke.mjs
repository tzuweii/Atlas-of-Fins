import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { setTimeout as wait } from "node:timers/promises";

const endpoint = process.env.CDP_ENDPOINT || "http://127.0.0.1:9223";
const pages = await fetch(`${endpoint}/json/list`).then(response => response.json());
const page = pages.find(item => item.type === "page");
assert.ok(page, "Chrome remote debugging page is available");

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
const exceptions = [];
ws.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") {
    const details = message.params.exceptionDetails;
    exceptions.push(details.exception?.description || `${details.text} at ${details.url || "unknown"}:${details.lineNumber + 1}`);
  }
});

function command(method, params = {}) {
  const id = ++sequence;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeout = 7000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return true;
    await wait(80);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`);

await command("Runtime.enable");
await command("Page.enable");
await command("Page.navigate", { url: "http://127.0.0.1:4173/" });
await command("Page.bringToFront");
await command("Emulation.setFocusEmulationEnabled", { enabled: true });
await waitFor(`document.readyState === "complete"`);
await evaluate(`localStorage.clear()`);
await command("Page.reload");
await wait(350);
await waitFor(`document.readyState === "complete"`);
await evaluate(`localStorage.clear()`);
assert.equal(await evaluate("document.title"), "Atlas of Fins｜鰭之圖鑑");
assert.equal(await evaluate("document.querySelector('#app').dataset.uiRevision"), "20260719-rarity-palette");
assert.equal(await evaluate("document.querySelector('script[type=\"module\"]').src.endsWith('src/game.js?rev=20260719-rarity-palette')"), true);

await click("#title-settings-button");
assert.match(await evaluate("document.querySelector('.settings-modal').innerText"), /聲音與顯示[\s\S]*文字大小[\s\S]*介面縮放/);
assert.equal(await evaluate("document.querySelector('.settings-save-tools') === null"), true);
await click('[data-action="set-text-scale"][data-id="large"]');
assert.equal(await evaluate("document.querySelector('#app').dataset.textScale"), "large");
assert.equal(await evaluate("localStorage.getItem('atlas-of-fins.save')"), null);
assert.equal(await evaluate("document.querySelector('[data-action=\"set-text-scale\"][data-id=\"large\"]').getAttribute('aria-pressed')"), "true");
assert.match(await evaluate("document.querySelector('[data-action=\"set-text-scale\"][data-id=\"large\"]').innerText"), /✓[\s\S]*放大/);
await click('[data-action="set-text-scale"][data-id="standard"]');
await click('[data-action="close-modal"]');

await click("#developer-mode-button");
assert.match(await evaluate("document.querySelector('.developer-modal').innerText"), /開發者模式[\s\S]*獨立測試存檔/);
await evaluate(`document.querySelector('#developer-password').value = 'wrong-password'; document.querySelector('#developer-login-form').requestSubmit()`);
assert.match(await evaluate("document.querySelector('#developer-login-error').innerText"), /密碼不正確/);
await evaluate(`document.querySelector('#developer-password').value = 'atlas-dev'; document.querySelector('#developer-login-form').requestSubmit()`);
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
assert.equal(await evaluate("document.querySelector('#app').classList.contains('is-developer-mode')"), true);
assert.match(await evaluate("document.querySelector('.brand-mini small').innerText"), /開發者模式/);
assert.equal(await evaluate("document.querySelectorAll('[data-action=\"equip-rod\"] option').length"), 3);
assert.equal(await evaluate("document.querySelectorAll('[data-action=\"equip-bait\"] option').length"), 5);
assert.equal(await evaluate("document.querySelectorAll('.spot-card:disabled').length"), 0);
assert.equal(await evaluate("document.querySelector('#money-label').innerText.replaceAll(',', '')"), "999999");
assert.match(await evaluate("document.querySelector('#time-label').innerText"), /夜晚/);
assert.match(await evaluate("document.querySelector('.bay-event-card[data-bay-event=\"moonlit_tide\"]').innerText"), /月光潮汐[\s\S]*礁石邊緣／海灣深水區[\s\S]*0 \/ 2[\s\S]*目前生效/);
assert.equal(await evaluate("document.querySelector('#developer-tools-button').hidden"), false);
await click("#developer-tools-button");
assert.match(await evaluate("document.querySelector('.developer-modal').innerText"), /v0.5 Slice E 整合控制[\s\S]*每日小目標[\s\S]*居民今日提案[\s\S]*正式航線[\s\S]*琉光群島內容[\s\S]*觀察、研究與澄野[\s\S]*潮光與事件帳本[\s\S]*船別家具與燈光[\s\S]*潮聲日誌[\s\S]*靜潮自動釣架[\s\S]*整合與存檔/);
assert.equal(await evaluate("document.querySelectorAll('#developer-daily-template option').length"), 5);
assert.equal(await evaluate("document.querySelectorAll('#developer-commission-template option').length"), 13);
assert.equal(await evaluate("document.querySelectorAll('#developer-travel-scale option').length"), 3);
assert.equal(await evaluate("document.querySelectorAll('#developer-region option').length"), 2);
assert.equal(await evaluate("document.querySelectorAll('#developer-region-event option').length"), 3);
assert.equal(await evaluate("document.querySelectorAll('#developer-observation-subject option').length"), 2);
assert.equal(await evaluate("document.querySelectorAll('#developer-tideglow-source option').length"), 6);
assert.equal(await evaluate("document.querySelector('#developer-journal-event') === null"), true);
assert.equal(await evaluate("Boolean(document.querySelector('[data-action=\"developer-check-journal\"]'))"), true);
assert.equal(await evaluate("document.querySelectorAll('#developer-ship option').length"), 6);
assert.equal(await evaluate("document.querySelectorAll('#developer-ship-lighting option').length"), 3);
assert.match(await evaluate("document.querySelector('.developer-modal').innerText"), /遠航書房燈光[\s\S]*擁有 8\/8[\s\S]*失效引用 0/);
assert.equal(await evaluate("document.querySelector('#app').dataset.ship"), "voyager_study");
assert.equal(await evaluate("getComputedStyle(document.querySelector('.boat-scene'),'::before').content !== 'none'"), true);
await click('[data-action="show-auto-fishing"]');
assert.match(await evaluate("document.querySelector('.auto-fishing-modal').innerText"), /靜潮自動釣架[\s\S]*眠潮泊地[\s\S]*目前港口已造訪的釣點[\s\S]*每 4 分鐘[\s\S]*最多 3 小時/);
assert.ok(await evaluate("document.querySelectorAll('#auto-fishing-spot option').length >= 3"));
assert.ok(await evaluate("document.querySelectorAll('#auto-fishing-bait option').length >= 1"));
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
assert.equal(await evaluate("document.querySelector('.auto-fishing-modal').getBoundingClientRect().right <= window.innerWidth"), true);
await command("Emulation.clearDeviceMetricsOverride");
await click('[data-action="start-auto-fishing"]');
assert.equal(await evaluate("Boolean(JSON.parse(localStorage.getItem('atlas-of-fins.dev-save')).autoFishing.activeSession)"), true);
await click("#developer-tools-button");
assert.equal(await evaluate("document.querySelectorAll('#developer-auto-scenario option').length"), 9);
await click('[data-action="developer-auto-simulate"]');
assert.match(await evaluate("document.querySelector('.auto-fishing-summary').innerText"), /離線守候回報[\s\S]*20 分鐘[\s\S]*帶回漁獲[\s\S]*魚餌消耗[\s\S]*可售價值[\s\S]*收下這份回報/);
assert.equal(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.dev-save')).autoFishing.lastSummary.catchCount"), 5);
await click('[data-action="acknowledge-auto-fishing"]');
await click("#developer-tools-button");
await click('[data-action="developer-emit-tideglow"]');
assert.equal(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.dev-save')).tideglow.total"), 1);
await click('[data-action="developer-emit-tideglow"]');
assert.equal(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.dev-save')).tideglow.total"), 1);
await click('[data-action="developer-check-journal"]');
assert.deepEqual(await evaluate(`(() => { const journal=JSON.parse(localStorage.getItem("atlas-of-fins.dev-save")).journal; return {version:journal.version,hasDaily:"dailyEntries" in journal,hasPermanent:"permanentEntries" in journal}; })()`), { version:2, hasDaily:false, hasPermanent:false });
await click('[data-action="close-modal"]');
assert.equal(await evaluate("document.querySelectorAll('[data-action=\"show-logbook\"]').length"), 0);
await click('[data-view="home"]');
assert.equal(await evaluate("document.querySelectorAll('[data-action=\"show-logbook\"]').length"), 1);
await click('[data-action="show-logbook"]');
assert.match(await evaluate("document.querySelector('.logbook-modal').innerText"), /潮聲日誌[\s\S]*今日潮記[\s\S]*魚類圖鑑[\s\S]*眠潮灣[\s\S]*星冰南方海[\s\S]*純文字唯讀頁面/);
assert.equal(await evaluate("document.querySelectorAll('.logbook-layout > *').length"), 2);
assert.equal(await evaluate("document.querySelectorAll('[data-action=\"logbook-category\"]').length"), 8);
assert.equal(await evaluate("document.querySelectorAll('.logbook-tree-group').length"), 8);
assert.equal(await evaluate("document.querySelectorAll('.logbook-tree-group.is-expanded').length"), 1);
assert.equal(await evaluate("document.querySelector('.logbook-layout').firstElementChild.classList.contains('logbook-sidebar')"), true);
await click('[data-action="logbook-category"][data-id="rare_fish"]');
assert.equal(await evaluate("document.querySelectorAll('[data-action=\"select-logbook-entry\"]').length"), 7);
assert.equal(await evaluate("document.querySelector('.logbook-tree-group.is-expanded [data-action=\"logbook-category\"]').dataset.id"), "rare_fish");
assert.equal(exceptions.length, 0, `Journal category click has no browser exception: ${exceptions.join(", ")}`);
await click('[data-action="logbook-category"][data-id="mist_cape_cold_current"]');
await wait(100);
assert.equal(exceptions.length, 0, `Future journal category has no browser exception: ${exceptions.join(", ")}`);
assert.match(await evaluate("document.querySelector('.logbook-modal').innerText"), /尚無可讀頁[\s\S]*預先寫好的章節頁/);
assert.equal(await evaluate("Boolean(document.querySelector('.logbook-tree-group.is-expanded .logbook-tree-empty'))"), true);
await click('[data-action="logbook-category"][data-id="rare_fish"]');
await click('[data-action="select-logbook-entry"][data-id="journal:fish:mahi"]');
assert.match(await evaluate("document.querySelector('.logbook-page').innerText"), /金藍掠過深水[\s\S]*鬼頭刀[\s\S]*不通往其他系統/);
assert.equal(await evaluate("document.querySelector('[data-action=\"logbook-cross-link\"]') === null"), true);
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
assert.equal(await evaluate("document.querySelector('.logbook-modal').getBoundingClientRect().right <= window.innerWidth"), true);
assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true);
await command("Emulation.clearDeviceMetricsOverride");
await click('[data-action="close-modal"]');
await click('#developer-tools-button');
await click('[data-action="show-settings"]');
const standardHeadingSize = await evaluate("parseFloat(getComputedStyle(document.querySelector('.settings-modal h2')).fontSize)");
await click('[data-action="set-text-scale"][data-id="large"]');
const largeHeadingSize = await evaluate("parseFloat(getComputedStyle(document.querySelector('.settings-modal h2')).fontSize)");
assert.ok(largeHeadingSize > standardHeadingSize);
await click('[data-action="set-ui-scale"][data-id="large"]');
assert.equal(await evaluate("document.querySelector('#app').dataset.uiScale"), "large");
assert.equal(await evaluate("document.querySelector('#app').getBoundingClientRect().width <= window.innerWidth + 1"), true);
assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.preferences'))"), {
  sound: true, reducedMotion: false, textScale: "large", uiScale: "large"
});
await click('[data-action="show-save-export"]');
const developerExport = await evaluate("document.querySelector('#save-export-text').value");
const developerEnvelope = JSON.parse(developerExport);
assert.equal(developerEnvelope.format, "atlas-of-fins-portable-save");
assert.equal(developerEnvelope.mode, "developer");
assert.equal(developerEnvelope.state.developerMode, true);
await click('[data-action="show-settings"]');
await click('[data-action="show-save-import"]');
await evaluate(`document.querySelector('#save-import-text').value = '{broken'`);
await click('[data-action="preview-save-import"]');
assert.match(await evaluate("document.querySelector('#save-import-error').innerText"), /不是完整的 JSON 備份/);
await evaluate(`document.querySelector('#save-import-text').value = ${JSON.stringify(developerExport)}`);
await click('[data-action="preview-save-import"]');
assert.match(await evaluate("document.querySelector('.portable-save-modal').innerText"), /備份檢查完成[\s\S]*開發者航程/);
await click('[data-action="confirm-save-import"]');
assert.equal(await evaluate("Boolean(localStorage.getItem('atlas-of-fins.dev-backup'))"), true);
assert.equal(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.dev-save')).developerMode"), true);
await click("#sound-button");
await click('[data-action="set-text-scale"][data-id="standard"]');
await click('[data-action="set-ui-scale"][data-id="standard"]');
await click('[data-action="close-modal"]');
await click("#developer-tools-button");
await click('[data-action="developer-reset-observations"]');
assert.equal(await evaluate(`Object.keys(JSON.parse(localStorage.getItem("atlas-of-fins.dev-save")).observations.recordsById).length`), 0);
await click('[data-action="developer-next-day"]');
await evaluate(`document.querySelector('#developer-travel-scale').value = '0.01'`);
await click('[data-action="developer-set-travel-scale"]');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.dev-save")).travelSettings.developerDurationScale`), 0.01);
await click('[data-action="close-modal"]');
await click('[data-view="chart"]');
assert.match(await evaluate("document.querySelector('.chart-route-card').innerText"), /琉光暖流航線[\s\S]*少於 1 分鐘（測試）[\s\S]*準備前往琉光群島/);
await click('[data-action="prepare-chart-route"]');
assert.match(await evaluate("document.querySelector('.route-confirm-modal').innerText"), /第一次遠航[\s\S]*前往琉光群島[\s\S]*關閉遊戲/);
await click('[data-action="confirm-chart-route"]');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.dev-save")).world.docking.status`), "traveling");
assert.match(await evaluate("document.querySelector('.chart-route-card.is-traveling').innerText"), /航行中[\s\S]*第[\s\S]*1 \/ 3[\s\S]*段/);
await click("#developer-tools-button");
await click('[data-action="developer-arrive-travel"]');
assert.match(await evaluate("document.querySelector('.developer-modal').innerText"), /已抵達琉光群島外海/);
await click('[data-action="close-modal"]');
assert.match(await evaluate("document.querySelector('.chart-route-card.is-arrived').innerText"), /已抵達外海[\s\S]*停泊 · 風棲港/);
await click('[data-action="dock-arrival"]');
assert.match(await evaluate("document.querySelector('.docking-modal').innerText"), /風棲港[\s\S]*暖色海面/);
await click('[data-action="close-modal"]');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.dev-save")).world.currentRegionId`), "luminous_archipelago");
await click('[data-view="fishing"]');
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /琉光群島釣行[\s\S]*風棲淺灘[\s\S]*稜光珊瑚庭[\s\S]*暖流藍渠/);
assert.equal(await evaluate("document.querySelectorAll('.spot-card').length"), 3);
assert.equal(await evaluate("document.querySelectorAll('.observation-preview').length"), 1);
assert.match(await evaluate("document.querySelector('.observation-preview').innerText"), /特殊觀察點 · 0 \/ 2[\s\S]*不需快速點擊/);
assert.match(await evaluate("document.querySelector('.research-card').innerText"), /琉光群島研究主路[\s\S]*15 \/ 15[\s\S]*區域完整/);
assert.match(await evaluate("document.querySelector('.bay-event-card').innerText"), /潮聲平穩[\s\S]*平靜日/);
assert.equal(await evaluate("document.querySelector('#app').dataset.region"), "luminous_archipelago");
await evaluate(`Math.random = () => 1`);
await click('[data-action="preview-observation"]');
assert.match(await evaluate("document.querySelector('.observation-modal').innerText"), /今天，海只留下潮聲[\s\S]*不會永遠躲著/);
await click('[data-action="close-modal"]');
await click('[data-action="preview-observation"]');
assert.match(await evaluate("document.querySelector('.observation-modal').innerText"), /同一片光仍停在礁盤上[\s\S]*沒有漏掉/);
await click('[data-action="close-modal"]');
await click("#developer-tools-button");
await click('[data-action="developer-next-day"]');
await click('[data-action="close-modal"]');
await click('[data-action="preview-observation"]');
assert.match(await evaluate("document.querySelector('.observation-modal').innerText"), /自動記錄 · 正式觀察魚[\s\S]*克氏雙鋸魚[\s\S]*不需要在牠出現時快速點擊/);
assert.equal(await evaluate(`Boolean(JSON.parse(localStorage.getItem("atlas-of-fins.dev-save")).observations.recordsById.clarks_anemonefish)`), true);
await click('[data-action="close-modal"]');
await click("#developer-tools-button");
await evaluate(`document.querySelector('#developer-observation-subject').value = 'twospined_angelfish'`);
await click('[data-action="developer-record-observation"]');
assert.equal(await evaluate(`Boolean(JSON.parse(localStorage.getItem("atlas-of-fins.dev-save")).observations.recordsById.twospined_angelfish)`), true);
await click('[data-action="close-modal"]');
await click('[data-view="residents"]');
assert.equal(await evaluate("document.querySelectorAll('.resident-card').length"), 1);
assert.match(await evaluate("document.querySelector('[data-resident=\"chengye\"]').innerText"), /澄野[\s\S]*海域主線 · 新章節[\s\S]*繞了半片海的觀測器[\s\S]*接受主線任務[\s\S]*今日提案 · 選填[\s\S]*不影響主線/);
await click('[data-resident="chengye"] [data-action="accept-resident-story"]');
assert.match(await evaluate("document.querySelector('.resident-story-modal').innerText"), /琉光群島主線 · 第 1 節／6[\s\S]*繞了半片海的觀測器[\s\S]*不適合被帶走的相遇[\s\S]*本節主線目標[\s\S]*開始執行主線任務/);
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
assert.equal(await evaluate("document.querySelector('.resident-story-modal').getBoundingClientRect().right <= window.innerWidth"), true);
assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true);
await command("Emulation.clearDeviceMetricsOverride");
await click('[data-action="close-modal"]');
assert.match(await evaluate("document.querySelector('[data-resident=\"chengye\"]').innerText"), /海域主線 · 任務進行中[\s\S]*替漂流觀測器補上淺灘資料[\s\S]*0 \/ 2[\s\S]*今日提案 · 選填/);
await click('[data-view="journal"]');
assert.equal(await evaluate("document.querySelectorAll('.fish-region-filters .filter-chip').length"), 3);
assert.equal(await evaluate("Boolean(document.querySelector('[data-action=\"journal-filter\"][data-id=\"common\"], [data-action=\"journal-filter\"][data-id=\"uncommon\"], [data-action=\"journal-filter\"][data-id=\"rare\"]'))"), false);
await click('[data-action="journal-filter"][data-id="luminous_archipelago"]');
assert.equal(await evaluate("document.querySelectorAll('.fish-card').length"), 15);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /琉光群島魚類圖鑑[\s\S]*跨海域魚也會出現在這一頁/);
await click('[data-action="select-fish"][data-id="bluegreen_chromis"]');
assert.match(await evaluate("document.querySelector('.fish-detail').innerText"), /藍綠光鰓魚[\s\S]*琉光群島印章[\s\S]*FishBase 物種摘要/);
await click('[data-view="chart"]');
await click('[data-action="prepare-chart-route"]');
assert.match(await evaluate("document.querySelector('.route-confirm-modal').innerText"), /熟悉航線[\s\S]*前往眠潮灣/);
await click('[data-action="confirm-chart-route"]');
await click("#developer-tools-button");
await click('[data-action="developer-reset-route"]');
assert.match(await evaluate("document.querySelector('.developer-modal').innerText"), /目前安全停泊/);
assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.dev-save")).world.completedRouteIds`), []);
await click('[data-action="close-modal"]');
await click('[data-view="journal"]');
await click('[data-action="journal-filter"][data-id="all"]');
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /探索進度[\s\S]*41 \/ 41/);
assert.equal(await evaluate("document.querySelectorAll('.fish-card').length"), 41);
assert.equal(await evaluate("document.querySelectorAll('.fish-card.is-unknown').length"), 0);
const rarityPalette = await evaluate(`(() => ({
  common: getComputedStyle(document.querySelector('.fish-card.rarity-common')).backgroundImage,
  uncommon: getComputedStyle(document.querySelector('.fish-card.rarity-uncommon')).backgroundImage,
  rare: getComputedStyle(document.querySelector('.fish-card.rarity-rare')).backgroundImage,
  epic: getComputedStyle(document.documentElement).getPropertyValue('--rarity-epic-label').trim(),
  legendary: getComputedStyle(document.documentElement).getPropertyValue('--rarity-legendary-label').trim()
}))()`);
assert.match(rarityPalette.common, /rgb\(247, 247, 243\)/);
assert.match(rarityPalette.uncommon, /rgb\(237, 244, 251\)/);
assert.match(rarityPalette.rare, /rgb\(242, 234, 250\)/);
assert.deepEqual({ epic: rarityPalette.epic, legendary: rarityPalette.legendary }, { epic: "#ad622b", legendary: "#916018" });
assert.match(await evaluate("document.querySelector('.fish-card.rarity-common').innerText"), /常見/);
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true);
await command("Emulation.clearDeviceMetricsOverride");
if (process.env.FISH_ATLAS_SCREENSHOT) {
  const atlasShot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(process.env.FISH_ATLAS_SCREENSHOT, Buffer.from(atlasShot.data, "base64"));
}
assert.equal(await evaluate("Boolean(document.querySelector('[data-id=\"yellow_boxfish\"] .fish-svg'))"), true);
assert.equal(await evaluate("Boolean(document.querySelector('[data-id=\"needlefish\"] .fish-svg'))"), true);
assert.equal(await evaluate("localStorage.getItem('atlas-of-fins.save')"), null);
assert.equal(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.dev-save')).developerMode"), true);
await click("#menu-button");
await click('[data-action="to-title"]');
await waitFor(`!document.querySelector("#title-screen").classList.contains("is-hidden")`);
assert.equal(await evaluate("document.querySelector('#continue-button').disabled"), true);

const legacyDeveloperSpecies = await evaluate(`(() => {
  const addedFishIds = ["horse_mackerel", "threadfin_bream", "goatfish", "threeline_grunt", "yellow_boxfish", "needlefish", "red_seabream", "malabar_grouper", "mirror_butterflyfish", "greater_amberjack", "bluegreen_chromis", "pennant_coralfish", "orangespine_unicornfish", "moorish_idol", "yellowtail_fusilier", "bigeye_scad", "longface_emperor", "peacock_grouper", "yellowstripe_goatfish", "bluespotted_cornetfish", "giant_trevally"];
  const save = JSON.parse(localStorage.getItem("atlas-of-fins.dev-save"));
  for (const fishId of addedFishIds) delete save.discovered[fishId];
  save.catchInventory = save.catchInventory.filter(caught => !addedFishIds.includes(caught.fishId));
  save.aquarium.fish = save.aquarium.fish.filter(caught => !addedFishIds.includes(caught.fishId));
  save.completedMilestones = save.completedMilestones.filter(count => count <= 20);
  delete save.achievements.species_30;
  save.unlockedTitles = save.unlockedTitles.filter(title => title !== "海灣博物學家");
  save.totalCaught = 200;
  save.recordCatches = 20;
  localStorage.setItem("atlas-of-fins.dev-save", JSON.stringify(save));
  return Object.keys(save.discovered).length;
})()`);
assert.equal(legacyDeveloperSpecies, 20);
await click("#developer-mode-button");
await evaluate(`document.querySelector('#developer-password').value = 'atlas-dev'; document.querySelector('#developer-login-form').requestSubmit()`);
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
await click('[data-view="journal"]');
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /探索進度[\s\S]*41 \/ 41/);
assert.equal(await evaluate("document.querySelector('[data-id=\"greater_amberjack\"] b').innerText"), "紅甘");
await click("#menu-button");
await click('[data-action="to-title"]');
await waitFor(`!document.querySelector("#title-screen").classList.contains("is-hidden")`);
const upgradedDeveloperSave = await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.dev-save"))`);
assert.equal(Object.keys(upgradedDeveloperSave.discovered).length, 41);
assert.ok(upgradedDeveloperSave.catchInventory.some(caught => caught.fishId === "greater_amberjack"));
assert.ok(upgradedDeveloperSave.catchInventory.some(caught => caught.fishId === "giant_trevally"));
assert.ok(upgradedDeveloperSave.completedMilestones.includes(30));
assert.ok(upgradedDeveloperSave.achievements.species_30);
assert.ok(upgradedDeveloperSave.unlockedTitles.includes("海灣博物學家"));

await click("#new-game-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /去釣魚/);
assert.equal(await evaluate("document.querySelectorAll('.spot-card').length"), 3);
assert.match(await evaluate("document.querySelector('.bay-event-card[data-bay-event=\"silver_tide\"]').innerText"), /銀潮靠岸[\s\S]*沙丁魚、鯷魚[\s\S]*0 \/ 3/);
assert.match(await evaluate("document.querySelector('#scene-caption').innerText"), /銀潮靠岸/);
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 1 \/ 6[\s\S]*去釣魚/);
assert.equal(await evaluate("Boolean(document.querySelector('[data-action=\\\"tutorial-go-fishing\\\"]'))"), true);
assert.equal(await evaluate("document.querySelectorAll('.main-nav [data-view]').length"), 7);
await click('[data-view="chart"]');
const chartText = await evaluate("document.querySelector('#content-panel').innerText");
assert.match(chartText, /古海圖/);
assert.match(chartText, /眠潮灣[\s\S]*船隻目前停泊/);
assert.match(chartText, /琉光群島[\s\S]*航線已開放/);
assert.match(chartText, /可航行/);
assert.equal(await evaluate("document.querySelectorAll('.chart-region-node').length"), 2);
assert.equal(await evaluate("document.querySelectorAll('.chart-route-card').length"), 1);
assert.equal(await evaluate("document.querySelector('[data-action=\"prepare-chart-route\"]').disabled"), false);
assert.match(await evaluate("document.querySelector('[data-action=\"prepare-chart-route\"]').innerText"), /準備前往琉光群島/);
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).world.travel`), null);

await evaluate(`document.querySelector('#chart-viewport').dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -100 }))`);
await evaluate(`document.querySelector('#chart-viewport').focus(); document.querySelector('#chart-viewport').dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))`);
await wait(240);
assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).chartView`), { zoom: 1.2, x: 4, y: 0 });

const touchDragChartView = await evaluate(`(() => {
  const viewport = document.querySelector('#chart-viewport');
  viewport.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, pointerType: 'touch', button: 0, clientX: 100, clientY: 100 }));
  viewport.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 7, pointerType: 'touch', button: 0, clientX: 140, clientY: 120 }));
  viewport.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, pointerType: 'touch', button: 0, clientX: 140, clientY: 120 }));
  return JSON.parse(localStorage.getItem('atlas-of-fins.save')).chartView;
})()`);
assert.ok(touchDragChartView.x > 4);
assert.ok(touchDragChartView.y > 0);

await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
await wait(120);
const narrowChart = await evaluate(`(() => {
  const viewport = document.querySelector('#chart-viewport').getBoundingClientRect();
  const route = document.querySelector('.chart-route-card').getBoundingClientRect();
  return {
    documentFits: document.documentElement.scrollWidth <= window.innerWidth,
    topbarFits: document.querySelector('.topbar').getBoundingClientRect().right <= window.innerWidth,
    viewportFits: viewport.left >= 0 && viewport.right <= window.innerWidth,
    routeFits: route.left >= 0 && route.right <= window.innerWidth,
    viewportWidth: viewport.width
  };
})()`);
assert.equal(narrowChart.documentFits, true);
assert.equal(narrowChart.topbarFits, true);
assert.equal(narrowChart.viewportFits, true);
assert.equal(narrowChart.routeFits, true);
assert.ok(narrowChart.viewportWidth >= 300);
await command("Emulation.clearDeviceMetricsOverride");
await wait(120);
await click('[data-action="chart-reset"]');
await wait(240);
assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).chartView`), { zoom: 1, x: 0, y: 0 });

await click('[data-view="residents"]');
assert.equal(await evaluate("document.querySelectorAll('.resident-card').length"), 2);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /海域主線會推進固定故事章節[\s\S]*今日提案[\s\S]*不共用進度與解鎖[\s\S]*燈塔守望者[\s\S]*魚市場老闆/);
assert.match(await evaluate("document.querySelector('[data-resident=\lighthouse_keeper\]').innerText"), /今日提案 · 選填[\s\S]*淺灘的潮聲[\s\S]*接受今日提案/);
await click('[data-resident="lighthouse_keeper"] [data-action="accept-commission"]');
assert.match(await evaluate("document.querySelector('[data-resident=\lighthouse_keeper\]').innerText"), /今日提案 · 進行中[\s\S]*不影響主線[\s\S]*0 \/ 2[\s\S]*放下今日提案/);
await click('[data-view="fishing"]');
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 2 \/ 6[\s\S]*拋下魚線/);
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 1);

await evaluate(`Math.random = () => 0`);
await click('[data-action="cast"]');
await waitFor(`Boolean(document.querySelector('[data-action="hook"]'))`, 6000);
await click('[data-action="hook"]');
await waitFor(`Boolean(document.querySelector('#reel-button'))`);

let caught = false;
let lastReelState = null;
for (let i = 0; i < 180; i++) {
  if (await evaluate(`Boolean(document.querySelector('.catch-modal'))`)) { caught = true; break; }
  if (await evaluate(`Boolean(document.querySelector('.fishing-result-fail'))`)) break;
  const values = await evaluate(`(() => {
    const needle = document.querySelector('#tension-needle');
    const safe = document.querySelector('.safe-zone');
    const fill = document.querySelector('#catch-progress-fill');
    return needle && safe ? { tension: parseFloat(needle.style.left), min: parseFloat(safe.style.left), max: parseFloat(safe.style.left) + parseFloat(safe.style.width), progress: parseFloat(fill.style.width) } : null;
  })()`);
  lastReelState = values;
  if (!values) { await wait(80); continue; }
  if (values.tension < values.max - 8) {
    await evaluate(`document.querySelector('#reel-button').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1}))`);
    await wait(170);
  } else {
    await evaluate(`window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}))`);
    await wait(230);
  }
}
await evaluate(`window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}))`);
const finalStage = await evaluate(`({ modal: Boolean(document.querySelector('.catch-modal')), failed: Boolean(document.querySelector('.fishing-result-fail')), text: document.querySelector('#danger-text')?.innerText || '' })`);
assert.equal(caught, true, `tension minigame can be completed: ${JSON.stringify({ lastReelState, finalStage, exceptions })}`);
assert.match(await evaluate("document.querySelector('.catch-modal').innerText"), /新紀錄[\s\S]*本次長度[\s\S]*cm[\s\S]*最高紀錄[\s\S]*cm/);
assert.match(await evaluate("document.querySelector('.catch-modal').innerText"), /閃光個體/);
assert.doesNotMatch(await evaluate("document.querySelector('.catch-modal').innerText"), /重量|kg|售價|金幣|熟悉度/);
assert.equal(await evaluate("Boolean(document.querySelector('.catch-modal .new-record-ribbon'))"), true);
assert.match(await evaluate("document.querySelector('.catch-modal').innerText"), /海灣事件進度[\s\S]*銀潮靠岸 · 1 \/ 3/);
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
assert.equal(await evaluate("document.querySelector('.catch-modal').getBoundingClientRect().right <= window.innerWidth"), true);
assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true);
await command("Emulation.clearDeviceMetricsOverride");

await click('[data-action="close-catch"]');
assert.equal(await evaluate("document.querySelector('#resident-badge').innerText"), "提案中");
await click('[data-view="residents"]');
assert.match(await evaluate("document.querySelector('[data-resident=\lighthouse_keeper\]').innerText"), /淺灘的潮聲[\s\S]*1 \/ 2/);
await click('[data-resident="lighthouse_keeper"] [data-action="talk-resident"]');
assert.match(await evaluate("document.querySelector('.modal').innerText"), /燈塔守望者[\s\S]*記著回來的方向/);
await click('[data-action="close-modal"]');
await click('[data-view="journal"]');
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /探索進度[\s\S]*1 \/ 41/);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /初次相遇[\s\S]*初次：/);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /閃光紀錄 1 次/);
const firstCaughtFishId = await evaluate(`Object.keys(JSON.parse(localStorage.getItem("atlas-of-fins.save")).discovered)[0]`);
await evaluate(`document.querySelector('[data-action="select-fish"][data-id="${firstCaughtFishId}"]').click()`);
assert.match(await evaluate("document.querySelector('.fish-detail').innerText"), /初遇短句/);

await click("#menu-button");
await click('[data-action="to-title"]');
await waitFor(`!document.querySelector("#title-screen").classList.contains("is-hidden")`);
const unlockedSpecies = await evaluate(`(() => {
  const save = JSON.parse(localStorage.getItem("atlas-of-fins.save"));
  const caughtAt = new Date().toISOString();
  for (const fishId of ["mackerel", "anchovy", "mullet", "milkfish"]) {
    save.discovered[fishId] = {
      count: 1, firstCaught: caughtAt, lastCaught: caughtAt, bestLength: 1, bestWeight: 1,
      spots: [], times: [], weathers: [], caughtShimmer: false, shimmerCount: 0, shimmerPity: 0
    };
  }
  localStorage.setItem("atlas-of-fins.save", JSON.stringify(save));
  return Object.keys(save.discovered).length;
})()`);
assert.equal(unlockedSpecies, 5);
await click("#continue-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);

await click('[data-view="journal"]');
assert.equal(await evaluate("document.querySelector('.achievement-open i')?.innerText"), "3");
await click('[data-action="show-achievements"]');
assert.equal(await evaluate("document.querySelectorAll('.achievement-item').length"), 13);
assert.equal(await evaluate("document.querySelectorAll('.achievement-item.is-complete').length"), 3);
await click('[data-achievement="first_catch"] [data-action="claim-achievement"]');
assert.match(await evaluate("document.querySelector('[data-achievement=\"first_catch\"]').innerText"), /已領取/);
await click('[data-achievement="species_5"] [data-action="claim-achievement"]');
assert.equal(await evaluate("Boolean(document.querySelector('[data-action=\"equip-title\"][data-id=\"海灣訪客\"]'))"), true);
await click('[data-action="equip-title"][data-id="海灣訪客"]');
assert.equal(await evaluate("document.querySelector('.brand-mini small').innerText"), "海灣訪客");
await click('[data-achievement="shimmer_1"] [data-action="claim-achievement"]');
assert.equal(await evaluate("document.querySelectorAll('.achievement-claim').length"), 0);
await click('[data-action="close-modal"]');

await click('[data-view="catch"]');
assert.equal(await evaluate("document.querySelectorAll('.catch-row').length"), 1);
assert.equal(await evaluate("document.querySelectorAll('.catch-row.is-shimmer').length"), 1);
assert.equal(await evaluate("document.querySelectorAll('[data-action=\"move-aquarium\"]').length"), 1);
await click('[data-action="move-aquarium"]');
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /漁獲箱還空著/);

await click('[data-view="home"]');
assert.match(await evaluate("document.querySelector('.aquarium-heading').innerText"), /1 \/ 3/);
assert.equal(await evaluate("document.querySelectorAll('.aquarium-slot.has-fish').length"), 1);
assert.equal(await evaluate("document.querySelector('.aquarium-tank').classList.contains('has-shimmer-specks')"), true);
await click('[data-action="toggle-aquarium-decor"]');
assert.equal(await evaluate("document.querySelector('.aquarium-tank').classList.contains('has-shimmer-specks')"), false);
await click('[data-action="toggle-aquarium-decor"]');
assert.equal(await evaluate("document.querySelector('.aquarium-tank').classList.contains('has-shimmer-specks')"), true);
await click('[data-action="aquarium-view"]');
assert.match(await evaluate("document.querySelector('.specimen-modal').innerText"), /閃光標本[\s\S]*捕獲日期[\s\S]*魚餌/);
await click('[data-action="close-modal"]');
await click('[data-action="aquarium-remove"]');
assert.equal(await evaluate("document.querySelectorAll('.aquarium-slot.has-fish').length"), 0);

await click('[data-action="open-aquarium-add"]');
assert.equal(await evaluate("document.querySelectorAll('[data-action=\"modal-aquarium-add\"]').length"), 1);
await click('[data-action="modal-aquarium-add"]');
assert.equal(await evaluate("document.querySelectorAll('.aquarium-slot.has-fish').length"), 1);
await click('[data-action="aquarium-remove"]');
await click('[data-view="catch"]');
assert.equal(await evaluate("document.querySelectorAll('.catch-row').length"), 1);
await click('[data-action="sell-all"]');
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /漁獲箱還空著/);

await click('[data-view="shop"]');
await click('[data-action="shop-tab"][data-id="baits"]');
await click('[data-action="buy-bait"]');
await click('[data-view="home"]');
assert.equal(await evaluate("document.querySelectorAll('.home-slot').length"), 5);
assert.match(await evaluate("document.querySelector('.chart-table-card').innerText"), /船屋航圖桌[\s\S]*查看古海圖/);
await click('[data-action="open-chart"]');
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /古海圖[\s\S]*目前船位/);
await click('[data-view="home"]');
await click('[data-action="sleep"]');
assert.match(await evaluate("document.querySelector('#time-label').innerText"), /白天/);

const saved = await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save"))`);
const savedCatchRecord = Object.values(saved.discovered)[0];
assert.equal(saved.version, 5);
assert.ok(saved.tideglow.total >= 1);
assert.equal(Number(await evaluate("document.querySelector('#tideglow-label').innerText.replaceAll(',', '')")), saved.tideglow.total);
assert.equal(saved.gameEvents.pending.length, 0);
assert.equal(saved.world.currentRegionId, "sleeping_tide_bay");
assert.deepEqual(saved.world.visitedRegionIds, ["sleeping_tide_bay"]);
assert.deepEqual(saved.world.unlockedRouteIds, ["sleeping_tide_to_luminous_archipelago"]);
assert.deepEqual(saved.world.completedRouteIds, []);
assert.deepEqual(saved.world.docking, { status: "docked", regionId: "sleeping_tide_bay" });
assert.equal(saved.world.travel, null);
assert.deepEqual(saved.chartView, { zoom: 1, x: 0, y: 0 });
assert.deepEqual(saved.travelSettings, { developerDurationScale: 1 });
assert.ok(saved.world.regionProgress.sleeping_tide_bay.discoveredFishIds.includes(Object.keys(saved.discovered)[0]));
assert.ok(saved.totalCaught >= 1);
assert.ok(saved.totalSold > 0);
assert.equal(saved.completedTutorial, true);
assert.equal(savedCatchRecord.spots.length, 1);
assert.equal(savedCatchRecord.times.length, 1);
assert.equal(savedCatchRecord.weathers.length, 1);
assert.equal(savedCatchRecord.caughtShimmer, true);
assert.equal(savedCatchRecord.shimmerCount, 1);
assert.equal(savedCatchRecord.shimmerPity, 0);
assert.equal(saved.aquarium.fish.length, 0);
assert.equal(saved.achievements.first_catch.claimed, true);
assert.equal(saved.achievements.species_5.claimed, true);
assert.equal(saved.achievements.shimmer_1.claimed, true);
assert.equal(saved.equippedTitle, "海灣訪客");
assert.ok(saved.unlockedAquariumDecor.includes("shimmer_specks"));
assert.equal(saved.aquariumDecoration, "shimmer_specks");
assert.equal(saved.bayEvent.eventId, "silver_tide");
assert.equal(saved.bayEvent.progress, 1);
assert.equal(saved.dailyBoard.day, 1);
assert.equal(saved.dailyBoard.entries.length, 3);
assert.equal(saved.currentQuests, undefined);
assert.equal(saved.residentCommissions.active.residentId, "lighthouse_keeper");
assert.equal(saved.residentCommissions.active.progress, 1);

await click("#menu-button");
await click('[data-action="to-title"]');
await waitFor(`!document.querySelector("#title-screen").classList.contains("is-hidden")`);
await evaluate(`(() => {
  const save = JSON.parse(localStorage.getItem("atlas-of-fins.save"));
  const caughtAt = new Date().toISOString();
  save.discovered.parrotfish = {
    count: 1, firstCaught: caughtAt, lastCaught: caughtAt, bestLength: 30, bestWeight: 1,
    spots: ["reef"], times: ["day"], weathers: ["sunny"], caughtShimmer: false, shimmerCount: 0, shimmerPity: 0
  };
  save.world.regionProgress.sleeping_tide_bay.discoveredFishIds.push("parrotfish");
  save.totalCaught += 1;
  localStorage.setItem("atlas-of-fins.save", JSON.stringify(save));
})()`);
await click("#continue-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
await click('[data-view="chart"]');
await click('[data-action="prepare-chart-route"]');
assert.match(await evaluate("document.querySelector('.route-confirm-modal').innerText"), /第一次遠航[\s\S]*約 6 分鐘[\s\S]*不能瞬間略過/);
await click('[data-action="confirm-chart-route"]');
const firstTravel = await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).world`);
assert.equal(firstTravel.currentRegionId, "sleeping_tide_bay");
assert.deepEqual(firstTravel.visitedRegionIds, ["sleeping_tide_bay"]);
assert.equal(firstTravel.travel.durationMs, 360000);
assert.equal(firstTravel.docking.status, "traveling");
assert.match(await evaluate("document.querySelector('#scene-caption').innerText"), /航向琉光群島[\s\S]*第 1 \/ 3 段/);

await click("#menu-button");
await click('[data-action="to-title"]');
await waitFor(`!document.querySelector("#title-screen").classList.contains("is-hidden")`);
await evaluate(`(() => { const save = JSON.parse(localStorage.getItem("atlas-of-fins.save")); save.world.travel.lastCheckedAt = new Date(Date.now() - save.world.travel.durationMs - 1000).toISOString(); localStorage.setItem("atlas-of-fins.save", JSON.stringify(save)); })()`);
await click("#continue-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
assert.match(await evaluate("document.querySelector('.voyage-state-card.is-offshore').innerText"), /已抵達外海[\s\S]*琉光群島就在前方[\s\S]*停泊 · 風棲港/);
const luminousOffshore = await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).world`);
assert.equal(luminousOffshore.currentRegionId, "sleeping_tide_bay");
assert.deepEqual(luminousOffshore.visitedRegionIds, ["sleeping_tide_bay"]);
assert.deepEqual(luminousOffshore.completedRouteIds, ["sleeping_tide_to_luminous_archipelago"]);
assert.deepEqual(luminousOffshore.docking, { status: "offshore", regionId: "luminous_archipelago" });
await click('[data-view="chart"]');
await click('[data-action="dock-arrival"]');
assert.match(await evaluate("document.querySelector('.docking-modal').innerText"), /第一次停泊[\s\S]*風棲港[\s\S]*暖色海面/);
await click('[data-action="close-modal"]');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).world.currentRegionId`), "luminous_archipelago");
await click('[data-view="fishing"]');
assert.equal(await evaluate("document.querySelectorAll('.spot-card').length"), 3);
assert.equal(await evaluate("Boolean(document.querySelector('[data-action=\"cast\"]'))"), true);
assert.equal(await evaluate("document.querySelectorAll('.observation-preview').length"), 1);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /琉光群島釣行[\s\S]*風棲淺灘[\s\S]*稜光珊瑚庭[\s\S]*暖流藍渠/);
assert.match(await evaluate("document.querySelector('.observation-preview').innerText"), /特殊觀察點 · 0 \/ 2[\s\S]*不需快速點擊/);
assert.match(await evaluate("document.querySelector('.research-card').innerText"), /琉光群島研究主路[\s\S]*0 \/ 15[\s\S]*風在港口停了一會兒/);
assert.equal(await evaluate("document.querySelector('#app').dataset.region"), "luminous_archipelago");

await click('[data-view="residents"]');
assert.equal(await evaluate("document.querySelectorAll('.resident-card').length"), 1);
assert.match(await evaluate("document.querySelector('[data-resident=\"chengye\"]').innerText"), /澄野[\s\S]*海域主線 · 新章節[\s\S]*繞了半片海的觀測器[\s\S]*接受主線任務/);
await click('[data-resident="chengye"] [data-action="accept-resident-story"]');
assert.match(await evaluate("document.querySelector('.resident-story-modal').innerText"), /主線任務已接受[\s\S]*繞了半片海的觀測器[\s\S]*替漂流觀測器補上淺灘資料/);
await click('[data-action="close-modal"]');

await click('[data-view="journal"]');
await click('[data-action="journal-filter"][data-id="luminous_archipelago"]');
await click('[data-action="select-fish"][data-id="parrotfish"]');
assert.match(await evaluate("document.querySelector('.fish-detail').innerText"), /鸚哥魚[\s\S]*眠潮灣印章[\s\S]*琉光群島尚未記錄/);
assert.equal(await evaluate("document.querySelector('[data-region-stamp=\"luminous_archipelago\"]').classList.contains('is-earned')"), false);
await click('[data-view="fishing"]');
await click('[data-action="spot"][data-id="prism_coral_garden"]');
await click('[data-action="cast"]');
await waitFor(`Boolean(document.querySelector('[data-action="hook"]'))`, 6000);
await click('[data-action="hook"]');
await waitFor(`Boolean(document.querySelector('#reel-button'))`);
let luminousCaught = false;
for (let i = 0; i < 180; i++) {
  if (await evaluate(`Boolean(document.querySelector('.catch-modal'))`)) { luminousCaught = true; break; }
  if (await evaluate(`Boolean(document.querySelector('.fishing-result-fail'))`)) break;
  const values = await evaluate(`(() => {
    const needle = document.querySelector('#tension-needle');
    const safe = document.querySelector('.safe-zone');
    return needle && safe ? { tension: parseFloat(needle.style.left), max: parseFloat(safe.style.left) + parseFloat(safe.style.width) } : null;
  })()`);
  if (!values) { await wait(80); continue; }
  if (values.tension < values.max - 8) {
    await evaluate(`document.querySelector('#reel-button').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:2}))`);
    await wait(170);
  } else {
    await evaluate(`window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:2}))`);
    await wait(230);
  }
}
await evaluate(`window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:2}))`);
assert.equal(luminousCaught, true, `cross-region fish can be caught locally: ${exceptions.join(", ")}`);
assert.match(await evaluate("document.querySelector('.catch-modal').innerText"), /鸚哥魚[\s\S]*琉光群島印章/);
await click('[data-action="close-catch"]');
await click('[data-view="journal"]');
await click('[data-action="journal-filter"][data-id="luminous_archipelago"]');
await click('[data-action="select-fish"][data-id="parrotfish"]');
assert.equal(await evaluate("document.querySelector('[data-region-stamp=\"luminous_archipelago\"]').classList.contains('is-earned')"), true);

await click('[data-view="chart"]');
assert.match(await evaluate("document.querySelector('.chart-route-card').innerText"), /約 3 分鐘[\s\S]*熟悉航線[\s\S]*準備前往眠潮灣/);
await click('[data-action="prepare-chart-route"]');
await click('[data-action="confirm-chart-route"]');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).world.travel.durationMs`), 180000);
await click("#menu-button");
await click('[data-action="to-title"]');
await waitFor(`!document.querySelector("#title-screen").classList.contains("is-hidden")`);
await evaluate(`(() => { const save = JSON.parse(localStorage.getItem("atlas-of-fins.save")); save.world.travel.lastCheckedAt = new Date(Date.now() - save.world.travel.durationMs - 1000).toISOString(); localStorage.setItem("atlas-of-fins.save", JSON.stringify(save)); })()`);
await click("#continue-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
assert.match(await evaluate("document.querySelector('.voyage-state-card.is-offshore').innerText"), /眠潮灣就在前方[\s\S]*停泊 · 眠潮泊地/);
await click('[data-view="chart"]');
await click('[data-action="dock-arrival"]');
assert.match(await evaluate("document.querySelector('.docking-modal').innerText"), /眠潮泊地[\s\S]*熟悉的燈火/);
await click('[data-action="close-modal"]');
const returnedWorld = await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).world`);
assert.equal(returnedWorld.currentRegionId, "sleeping_tide_bay");
assert.deepEqual(returnedWorld.visitedRegionIds, ["sleeping_tide_bay", "luminous_archipelago"]);
assert.deepEqual(returnedWorld.docking, { status: "docked", regionId: "sleeping_tide_bay" });
assert.equal(returnedWorld.travel, null);
assert.ok(returnedWorld.regionProgress.luminous_archipelago.firstArrivedAt);

await click("#menu-button");
await click('[data-action="to-title"]');
await waitFor(`!document.querySelector("#title-screen").classList.contains("is-hidden")`);
await evaluate(`(() => { const save = JSON.parse(localStorage.getItem("atlas-of-fins.save")); save.day = 2; save.timeIndex = 0; save.bayEvent = null; save.regionEvents.sleeping_tide_bay = null; save.regionEvents.luminous_archipelago = null; localStorage.setItem("atlas-of-fins.save", JSON.stringify(save)); })()`);
await click("#continue-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
assert.match(await evaluate("document.querySelector('.bay-event-card[data-bay-event=\"quiet\"]').innerText"), /潮聲平穩[\s\S]*平靜日/);
await click("#save-button");
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).bayEvent`), null);

await click("#menu-button");
await click('[data-action="to-title"]');
await waitFor(`!document.querySelector("#title-screen").classList.contains("is-hidden")`);
await evaluate(`(() => { const save = JSON.parse(localStorage.getItem("atlas-of-fins.save")); save.day = 3; save.timeIndex = 0; save.bayEvent = null; localStorage.setItem("atlas-of-fins.save", JSON.stringify(save)); })()`);
await click("#continue-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
assert.match(await evaluate("document.querySelector('.bay-event-card[data-bay-event=\"moonlit_tide\"]').innerText"), /月光潮汐[\s\S]*月色尚未升起[\s\S]*夜晚生效/);
assert.equal(await evaluate("document.querySelector('.bay-event-card[data-bay-event=\"moonlit_tide\"]').classList.contains('is-inactive')"), true);
await click('[data-view="home"]');
await click('[data-action="sleep"]');
await click('[data-action="sleep"]');
await click('[data-action="sleep"]');
await click('[data-view="fishing"]');
assert.match(await evaluate("document.querySelector('.bay-event-card[data-bay-event=\"moonlit_tide\"]').innerText"), /月光潮汐[\s\S]*目前生效/);
assert.equal(await evaluate("document.querySelector('.bay-event-card[data-bay-event=\"moonlit_tide\"]').classList.contains('is-inactive')"), false);
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).timeIndex`), 3);

await click("#menu-button");
await click('[data-action="to-title"]');
await waitFor(`!document.querySelector("#title-screen").classList.contains("is-hidden")`);
await evaluate(`(() => { const save = JSON.parse(localStorage.getItem("atlas-of-fins.save")); save.day = 5; save.timeIndex = 0; save.weather = "sunny"; save.bayEvent = null; localStorage.setItem("atlas-of-fins.save", JSON.stringify(save)); })()`);
await click("#continue-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
assert.match(await evaluate("document.querySelector('#weather-label').innerText"), /細雨/);
assert.equal(await evaluate("document.querySelector('#app').dataset.weather"), "rain");
assert.match(await evaluate("document.querySelector('.bay-event-card[data-bay-event=\"rain_drift\"]').innerText"), /雨後漂流[\s\S]*全天 · 細雨[\s\S]*礁石邊緣[\s\S]*0 \/ 2[\s\S]*目前生效/);
await click("#save-button");
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).bayEvent.eventId`), "rain_drift");
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).weather`), "rain");

await click("#menu-button");
await click('[data-action="to-title"]');
await waitFor(`!document.querySelector("#title-screen").classList.contains("is-hidden")`);
const legacyV3Payload = await evaluate(`(() => {
  const save = JSON.parse(localStorage.getItem("atlas-of-fins.save"));
  save.version = 3;
  save.money = 2468;
  delete save.world;
  delete save.travelSettings;
  save.currentQuests = save.dailyBoard.entries.map(entry => ({
    id: entry.templateId,
    instanceId: entry.instanceId,
    text: entry.text,
    goal: entry.goal,
    reward: entry.reward.amount,
    progress: entry.progress,
    claimed: entry.claimed
  }));
  save.currentQuests[0].progress = Math.min(1, save.currentQuests[0].goal);
  delete save.dailyBoard;
  delete save.residentCommissions;
  const raw = JSON.stringify(save);
  localStorage.setItem("atlas-of-fins.save", raw);
  localStorage.setItem("atlas-of-fins.backup", "older-backup");
  return raw;
})()`);
await click("#continue-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
const migratedV4Save = await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save"))`);
assert.equal(migratedV4Save.version, 5);
assert.equal(migratedV4Save.money, 2468);
assert.equal(migratedV4Save.world.currentRegionId, "sleeping_tide_bay");
assert.equal(migratedV4Save.world.docking.status, "docked");
assert.deepEqual(migratedV4Save.world.unlockedRouteIds, ["sleeping_tide_to_luminous_archipelago"]);
assert.deepEqual(migratedV4Save.world.completedRouteIds, []);
assert.deepEqual(migratedV4Save.travelSettings, { developerDurationScale: 1 });
assert.equal(migratedV4Save.currentQuests, undefined);
assert.equal(migratedV4Save.dailyBoard.entries[0].progress, 1);
assert.equal(migratedV4Save.residentCommissions.offerDayByResident.lighthouse_keeper, migratedV4Save.day);
assert.deepEqual(migratedV4Save.observations.recordsById, {});
assert.deepEqual(migratedV4Save.residentStories.chengye.completedSceneIds, []);
assert.equal(migratedV4Save.residentStories.chengye.activeSceneId, "chengye_drifting_observer");
assert.equal(migratedV4Save.tideglow.total, 0);
assert.equal(migratedV4Save.journal.version, 2);
assert.equal("permanentEntries" in migratedV4Save.journal, false);
assert.ok(migratedV4Save.journal.unreadEntryIds.includes("journal:story:sleeping_tide_bay:opening"));
assert.equal(await evaluate(`localStorage.getItem("atlas-of-fins.backup")`), legacyV3Payload);

await click("#menu-button");
await click('[data-action="to-title"]');
await evaluate(`(() => {
  const save = JSON.parse(localStorage.getItem("atlas-of-fins.save"));
  const fishIds = ${JSON.stringify(Array.from({ length: 20 }, (_, index) => `browser-fish-${index}`))};
  save.money = 10000;
  save.tideglow.ledgerBySourceId = Object.fromEntries(fishIds.map((fishId, index) => ["fish:" + fishId, {
    sourceId: "fish:" + fishId,
    eventId: "browser-ship:" + index,
    eventType: "fish.discovered",
    label: "新魚初遇",
    points: 1,
    awardedAt: "2026-07-18T00:00:00.000Z",
    refs: { fishId }
  }]));
  save.tideglow.total = 20;
  save.ships.revealedShipIds = ["drifting_home", "tidewhisper_residence"];
  localStorage.setItem("atlas-of-fins.save", JSON.stringify(save));
})()`);
await click("#continue-button");
await click('[data-view="shop"]');
await click('[data-action="shop-tab"][data-id="ships"]');
assert.equal(await evaluate("document.querySelectorAll('[data-ship-card]').length"), 6);
assert.match(await evaluate("document.querySelector('[data-ship-card=\"tidewhisper_residence\"]').innerText"), /潮聲居所[\s\S]*20 潮光[\s\S]*1\.06×[\s\S]*1,800 金幣/);
await click('[data-action="prepare-buy-ship"][data-id="tidewhisper_residence"]');
assert.match(await evaluate("document.querySelector('.ship-purchase-modal').innerText"), /潮光只是解鎖門檻，不會被消耗[\s\S]*家具需依這艘船的樣式另外購買/);
await click('[data-action="confirm-buy-ship"][data-id="tidewhisper_residence"]');
assert.equal(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.save')).ships.activeShipId"), "tidewhisper_residence");
assert.equal(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.save')).money"), 8200);
assert.equal(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.save')).tideglow.total"), 20);
assert.equal(await evaluate("document.querySelector('#app').dataset.ship"), "tidewhisper_residence");
assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.save')).ships.interiorsByShipId.tidewhisper_residence.ownedFurnitureIds"), []);
assert.equal(await evaluate("document.querySelector('#app').classList.contains('is-switching-ship')"), true);
await click('[data-action="shop-tab"][data-id="furniture"]');
assert.equal(await evaluate("document.querySelectorAll('.shop-item').length"), 8);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /潮聲居所\s*專屬家具[\s\S]*潮紋織毯[\s\S]*圓窗軟床/);
await click('[data-action="buy-furniture"][data-id="tidewhisper_woven_quilt"]');
assert.equal(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.save')).money"), 8020);
assert.equal(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.save')).ships.interiorsByShipId.tidewhisper_residence.placedFurniture.sleep"), "tidewhisper_woven_quilt");
await click('[data-view="home"]');
assert.equal(await evaluate("document.querySelector('.cabin-view').dataset.ship"), "tidewhisper_residence");
assert.equal(await evaluate("document.querySelector('.cabin-view').classList.contains('theme-round-window-nest')"), true);
assert.equal(await evaluate("document.querySelector('.aquarium-panel').classList.contains('aquarium-frame-seafoam-ceramic')"), true);
assert.match(await evaluate("document.querySelector('.cabin-view').innerText"), /固定床台[\s\S]*航圖桌[\s\S]*潮聲居所/);
await click('[data-action="show-logbook"]');
assert.equal(await evaluate("document.querySelector('[data-id=\"journal:ship:tidewhisper_residence\"]') === null"), true);
assert.equal(await evaluate("document.querySelector('[data-action=\"logbook-cross-link\"]') === null"), true);
assert.match(await evaluate("document.querySelector('.logbook-page').innerText"), /純文字唯讀頁面[\s\S]*不通往其他系統/);
await click('[data-action="close-modal"]');
await click('[data-view="shop"]');
await click('[data-action="shop-tab"][data-id="ships"]');
assert.equal(await evaluate("document.querySelectorAll('[data-ship-card]').length"), 6);
await click('[data-action="switch-ship"][data-id="drifting_home"]');
assert.equal(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.save')).ships.activeShipId"), "drifting_home");
await click('[data-action="shop-tab"][data-id="furniture"]');
assert.equal(await evaluate("document.querySelectorAll('.shop-item').length"), 10);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /漂流小屋\s*專屬家具[\s\S]*基礎睡袋/);
assert.equal(exceptions.length, 0, `No uncaught browser exceptions: ${exceptions.join(", ")}`);

if (process.env.SCREENSHOT) {
  const shot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(process.env.SCREENSHOT, Buffer.from(shot.data, "base64"));
}

console.log(JSON.stringify({
  title: "ok",
  fishing: "caught",
  journal: `${Object.keys(saved.discovered).length}/41`,
  sold: saved.totalSold,
  time: saved.timeIndex,
  tutorial: saved.completedTutorial,
  exceptions
}, null, 2));
ws.close();

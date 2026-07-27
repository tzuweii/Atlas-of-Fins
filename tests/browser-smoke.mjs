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

async function clickCenter(selector) {
  const point = await evaluate(`(() => {
    const rect = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect();
    return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
  })()`);
  assert.ok(point, `Physical click target exists: ${selector}`);
  await command("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
  await command("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
  await command("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
}

async function playTutorialTension(pointerId) {
  for (let i = 0; i < 180; i++) {
    const terminal = await evaluate(`document.querySelector('.catch-modal') ? 'caught' : document.querySelector('.fishing-stage.is-escaped') ? 'escaped' : document.querySelector('.fishing-stage.is-failed') ? 'failed' : ''`);
    if (terminal) {
      await evaluate(`window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:${pointerId}}))`);
      return terminal;
    }
    const values = await evaluate(`(() => {
      const needle = document.querySelector('#tension-needle');
      const safe = document.querySelector('.safe-zone');
      return needle && safe ? { tension: parseFloat(needle.style.left), max: parseFloat(safe.style.left) + parseFloat(safe.style.width) } : null;
    })()`);
    if (!values) { await wait(80); continue; }
    if (values.tension < values.max - 8) {
      await evaluate(`document.querySelector('#reel-button').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:${pointerId}}))`);
      await wait(170);
    } else {
      await evaluate(`window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:${pointerId}}))`);
      await wait(230);
    }
  }
  await evaluate(`window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:${pointerId}}))`);
  return "timeout";
}

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
assert.equal(await evaluate("document.querySelector('#app').dataset.uiRevision"), "20260727-sound-volume");
assert.equal(await evaluate("document.querySelector('link[rel=\"stylesheet\"]').href.endsWith('styles.css?rev=20260727-sound-volume')"), true);
assert.equal(await evaluate("document.querySelector('script[type=\"module\"]').src.endsWith('src/game.js?rev=20260727-sound-volume')"), true);

await clickCenter("#title-settings-button");
assert.match(await evaluate("document.querySelector('.settings-modal').innerText"), /聲音與顯示[\s\S]*總音量[\s\S]*文字大小[\s\S]*介面縮放/);
assert.equal(await evaluate("document.querySelector('#sound-volume').value"), "80");
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
await click('[data-action="show-fishing-setup"]');
assert.equal(await evaluate("document.querySelectorAll('[data-action=\"equip-rod\"] option').length"), 3);
assert.equal(await evaluate("document.querySelectorAll('[data-action=\"equip-bait\"] option').length"), 5);
assert.equal(await evaluate("document.querySelectorAll('.spot-card:disabled').length"), 0);
await click('[data-action="close-modal"]');
assert.equal(await evaluate("document.querySelector('#money-label').innerText.replaceAll(',', '')"), "999999");
assert.match(await evaluate("document.querySelector('#time-label').innerText"), /夜晚/);
assert.match(await evaluate("document.querySelector('.tracker-item.is-event').innerText"), /月光潮汐[\s\S]*0 \/ 2/);
assert.equal(await evaluate("document.querySelectorAll('.tracker-item.is-daily').length"), 3);
assert.equal(await evaluate("document.querySelectorAll('.tracker-item.is-daily.is-active, .tracker-item.is-daily.is-claimable, .tracker-item.is-daily.is-claimed').length"), 3);
assert.match(await evaluate("document.querySelector('#task-tracker').innerText"), /每日目標 · (進行中|可領取|已領取)/);
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
await click('[data-action="developer-reset-daily"]');
await click('[data-action="developer-complete-daily"]');
await click('[data-action="close-modal"]');
assert.equal(await evaluate("document.querySelectorAll('.tracker-item.is-daily.is-claimable').length"), 3);
assert.equal(await evaluate("document.querySelector('.fishing-water-hitbox') === null"), true);
assert.equal(await evaluate("document.querySelectorAll('[data-action=\"cast\"]').length"), 1);
const trackerClaimBefore = await evaluate(`(() => {
  const save = JSON.parse(localStorage.getItem('atlas-of-fins.dev-save'));
  return { money: save.money, phase: document.querySelector('#game-shell').dataset.fishingPhase, bait: save.baitAmounts[save.equippedBait] };
})()`);
await evaluate(`document.querySelector('.fishing-scene-ui').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 120, clientY: 320 }))`);
assert.equal(await evaluate("document.querySelector('#game-shell').dataset.fishingPhase"), "idle");
await click('.tracker-claim');
const trackerClaimAfter = await evaluate(`(() => {
  const save = JSON.parse(localStorage.getItem('atlas-of-fins.dev-save'));
  return { money: save.money, phase: document.querySelector('#game-shell').dataset.fishingPhase, bait: save.baitAmounts[save.equippedBait] };
})()`);
assert.ok(trackerClaimAfter.money > trackerClaimBefore.money);
assert.equal(trackerClaimAfter.phase, "idle");
assert.equal(trackerClaimAfter.bait, trackerClaimBefore.bait);
await click('#developer-tools-button');
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
assert.equal(await evaluate("document.querySelectorAll('[data-action=\"logbook-category\"]').length"), 9);
assert.equal(await evaluate("document.querySelectorAll('.logbook-tree-group').length"), 9);
assert.equal(await evaluate("document.querySelectorAll('.logbook-tree-group.is-expanded').length"), 1);
assert.equal(await evaluate("document.querySelector('.logbook-layout').firstElementChild.classList.contains('logbook-sidebar')"), true);
await click('[data-action="logbook-category"][data-id="rare_fish"]');
assert.equal(await evaluate("document.querySelectorAll('[data-action=\"select-logbook-entry\"]').length"), 9);
assert.equal(await evaluate("document.querySelector('.logbook-tree-group.is-expanded [data-action=\"logbook-category\"]').dataset.id"), "rare_fish");
assert.equal(exceptions.length, 0, `Journal category click has no browser exception: ${exceptions.join(", ")}`);
await click('[data-action="logbook-category"][data-id="mist_cape_cold_current"]');
await wait(100);
assert.equal(exceptions.length, 0, `Future journal category has no browser exception: ${exceptions.join(", ")}`);
assert.match(await evaluate("document.querySelector('.logbook-modal').innerText"), /尚無可讀頁[\s\S]*完成這片海域的居民主線後，固定章節頁會依序出現/);
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
await evaluate(`(() => {
  const slider = document.querySelector('#sound-volume');
  slider.value = '65';
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  slider.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
assert.equal(await evaluate("document.querySelector('#sound-volume-output').textContent"), "65%");
assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.preferences'))"), {
  sound: true, soundVolume: 65, reducedMotion: false, textScale: "large", uiScale: "large"
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
assert.equal(await evaluate("Boolean(document.querySelector('.fishing-scene-ui'))"), true);
await click('[data-action="show-fishing-setup"]');
assert.match(await evaluate("document.querySelector('.fishing-setup-modal').innerText"), /釣點與裝備[\s\S]*風棲淺灘[\s\S]*稜光珊瑚庭[\s\S]*暖流藍渠/);
assert.equal(await evaluate("document.querySelectorAll('.spot-card').length"), 3);
assert.equal(await evaluate("document.querySelectorAll('.observation-preview').length"), 1);
assert.match(await evaluate("document.querySelector('.observation-preview').innerText"), /特殊觀察點 · 0 \/ 2[\s\S]*不需快速點擊/);
assert.match(await evaluate("document.querySelector('.research-card').innerText"), /琉光群島研究主路[\s\S]*33 \/ 33[\s\S]*區域完整/);
assert.equal(await evaluate("document.querySelector('.tracker-item.is-event') === null"), true);
assert.equal(await evaluate("document.querySelector('#app').dataset.region"), "luminous_archipelago");
await evaluate(`Math.random = () => 1`);
await click('[data-action="preview-observation"]');
assert.match(await evaluate("document.querySelector('.observation-modal').innerText"), /今天，海只留下潮聲[\s\S]*不會永遠躲著/);
await click('[data-action="close-modal"]');
await click('[data-action="show-fishing-setup"]');
await click('[data-action="preview-observation"]');
assert.match(await evaluate("document.querySelector('.observation-modal').innerText"), /同一片光仍停在礁盤上[\s\S]*沒有漏掉/);
await click('[data-action="close-modal"]');
await click("#developer-tools-button");
await click('[data-action="developer-next-day"]');
await click('[data-action="close-modal"]');
await click('[data-action="show-fishing-setup"]');
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
assert.match(await evaluate("document.querySelector('.resident-story-modal').innerText"), /主線第 2 章 · 琉光群島 · 第 1 節／6[\s\S]*繞了半片海的觀測器[\s\S]*不適合被帶走的相遇[\s\S]*本節主線目標[\s\S]*開始執行主線任務/);
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
assert.equal(await evaluate("document.querySelector('.resident-story-modal').getBoundingClientRect().right <= window.innerWidth"), true);
assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true);
await command("Emulation.clearDeviceMetricsOverride");
await click('[data-action="close-modal"]');
assert.match(await evaluate("document.querySelector('[data-resident=\"chengye\"]').innerText"), /海域主線 · 任務進行中[\s\S]*替漂流觀測器補上淺灘資料[\s\S]*0 \/ 2[\s\S]*今日提案 · 選填/);
await click('[data-view="fishing"]');
assert.equal(await evaluate("document.querySelectorAll('.tracker-item.is-story').length"), 1);
assert.equal(await evaluate("document.querySelectorAll('.tracker-item.is-daily').length"), 3);
await click('[data-view="journal"]');
assert.equal(await evaluate("document.querySelectorAll('.fish-region-filters .filter-chip').length"), 3);
assert.equal(await evaluate("Boolean(document.querySelector('[data-action=\"journal-filter\"][data-id=\"common\"], [data-action=\"journal-filter\"][data-id=\"uncommon\"], [data-action=\"journal-filter\"][data-id=\"rare\"]'))"), false);
await click('[data-action="journal-filter"][data-id="luminous_archipelago"]');
assert.equal(await evaluate("document.querySelectorAll('.fish-card').length"), 33);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /琉光群島魚類圖鑑[\s\S]*每種魚只會出現在一片海域/);
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
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /探索進度[\s\S]*63 \/ 63/);
assert.equal(await evaluate("document.querySelectorAll('.fish-card').length"), 63);
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
  const addedFishIds = ["horse_mackerel", "threadfin_bream", "goatfish", "threeline_grunt", "yellow_boxfish", "needlefish", "red_seabream", "malabar_grouper", "mirror_butterflyfish", "greater_amberjack", "bluegreen_chromis", "pennant_coralfish", "orangespine_unicornfish", "moorish_idol", "yellowtail_fusilier", "bigeye_scad", "longface_emperor", "peacock_grouper", "yellowstripe_goatfish", "bluespotted_cornetfish", "giant_trevally", "convict_surgeonfish", "blacktip_fusilier", "goldband_fusilier", "bluestripe_snapper", "thumbprint_emperor", "blackbarred_halfbeak", "threadfin_butterflyfish", "yellowfin_goatfish", "redtooth_triggerfish", "pinecone_soldierfish", "goldlined_rabbitfish", "palette_surgeonfish", "ornate_butterflyfish", "regal_angelfish", "clown_triggerfish", "longfin_batfish", "harlequin_sweetlips", "giant_moray", "bluespine_unicornfish", "chinese_trumpetfish", "dogtooth_tuna", "scrawled_filefish"];
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
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /探索進度[\s\S]*63 \/ 63/);
assert.equal(await evaluate("document.querySelector('[data-id=\"greater_amberjack\"] b').innerText"), "紅甘");
await click("#menu-button");
await click('[data-action="to-title"]');
await waitFor(`!document.querySelector("#title-screen").classList.contains("is-hidden")`);
const upgradedDeveloperSave = await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.dev-save"))`);
assert.equal(Object.keys(upgradedDeveloperSave.discovered).length, 63);
assert.ok(upgradedDeveloperSave.catchInventory.some(caught => caught.fishId === "greater_amberjack"));
assert.ok(upgradedDeveloperSave.catchInventory.some(caught => caught.fishId === "giant_trevally"));
assert.ok(upgradedDeveloperSave.completedMilestones.includes(30));
assert.ok(upgradedDeveloperSave.achievements.species_30);
assert.ok(upgradedDeveloperSave.unlockedTitles.includes("海灣博物學家"));

await click("#new-game-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /拋竿/);
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 1 \/ 14[\s\S]*先看釣具/);
assert.equal(await evaluate("document.querySelector('#app').classList.contains('is-tutorial-active')"), true);
await waitFor(`!document.querySelector('#tutorial-spotlight').classList.contains('is-hidden')`);
assert.equal(await evaluate("document.querySelector('#tutorial-spotlight').classList.contains('is-hidden')"), false);
assert.equal(await evaluate("document.querySelector('[data-action=\"show-fishing-setup\"]').classList.contains('is-tutorial-target')"), true);
assert.equal(await evaluate("document.querySelector('[data-action=\"dismiss-tutorial\"]').innerText"), "跳過教學");
assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-action=\"dismiss-tutorial\"]')).pointerEvents"), "auto");
await clickCenter('[data-action="dismiss-tutorial"]');
assert.deepEqual(await evaluate(`(() => {
  const save = JSON.parse(localStorage.getItem("atlas-of-fins.save"));
  return {
    completed: save.completedTutorial,
    step: save.tutorialStep,
    catchUid: save.tutorialCatchUid,
    overlayHidden: document.querySelector("#tutorial").classList.contains("is-hidden"),
    interactionUnlocked: !document.querySelector("#app").classList.contains("is-tutorial-active")
  };
})()`), { completed: true, step: 14, catchUid: null, overlayHidden: true, interactionUnlocked: true });
await click('[data-view="chart"]');
assert.equal(await evaluate("document.querySelector('.nav-button.is-active').dataset.view"), "chart");
await click("#menu-button");
await click('[data-action="to-title"]');
await clickCenter("#new-game-button");
await click("#confirm-new");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 1 \/ 14[\s\S]*先看釣具/);
await click('[data-view="chart"]');
assert.equal(await evaluate("document.querySelector('.nav-button.is-active').dataset.view"), "fishing");
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 0);
await click('[data-action="show-fishing-setup"]');
assert.equal(await evaluate("document.querySelectorAll('.spot-card').length"), 3);
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 2 \/ 14[\s\S]*認識釣具台[\s\S]*實際使用的甲板釣具台/);
assert.equal(await evaluate("document.querySelector('[data-action=\"dismiss-tutorial\"]') === null"), true);
assert.equal(await evaluate("document.querySelector('.tutorial-setup-guide') === null"), true);
assert.equal(await evaluate("document.querySelectorAll('.fishing-setup-modal .loadout select').length"), 2);
assert.equal(await evaluate("document.querySelector('.fishing-setup-modal [data-action=\"close-modal\"]').classList.contains('is-tutorial-target')"), true);
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
await wait(120);
assert.deepEqual(await evaluate(`(() => {
  const modal = document.querySelector('.fishing-setup-modal').getBoundingClientRect();
  return {
    documentFits: document.documentElement.scrollWidth <= window.innerWidth,
    modalFits: modal.left >= 0 && modal.right <= window.innerWidth,
    actualSetupVisible: getComputedStyle(document.querySelector('.fishing-setup-modal .spot-grid')).visibility === 'visible'
  };
})()`), { documentFits: true, modalFits: true, actualSetupVisible: true });
await command("Emulation.clearDeviceMetricsOverride");
const selectedSpotBeforeBlockedSetup = await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).selectedSpot`);
await click('[data-action="spot"][data-id="reef"]');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).selectedSpot`), selectedSpotBeforeBlockedSetup);
await click('[data-action="close-modal"]');
assert.equal(await evaluate("Boolean(document.querySelector('.fishing-setup-modal'))"), false);
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 2);
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 3 \/ 14[\s\S]*拋下第一竿/);
assert.match(await evaluate("document.querySelector('.tracker-item.is-event').innerText"), /銀潮靠岸[\s\S]*0 \/ 3/);
assert.equal(await evaluate("document.querySelectorAll('.tracker-item.is-daily').length"), 3);
assert.equal(await evaluate("document.querySelectorAll('.tracker-item.is-daily.is-active').length"), 3);
assert.equal(await evaluate("document.querySelectorAll('.tracker-item.is-daily .tracker-progress').length"), 3);
assert.match(await evaluate("document.querySelector('#task-tracker').innerText"), /每日目標 · 進行中/);
assert.match(await evaluate("document.querySelector('#scene-caption').innerText"), /銀潮靠岸/);
assert.equal(await evaluate("document.querySelectorAll('.main-nav [data-view]').length"), 7);
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
await wait(120);
const narrowFishingScene = await evaluate(`(() => {
  const shell = document.querySelector('#game-shell').getBoundingClientRect();
  const nav = document.querySelector('.main-nav');
  const tracker = document.querySelector('#task-tracker').getBoundingClientRect();
  const boat = document.querySelector('.boat-scene').getBoundingClientRect();
  return {
    documentWidthFits: document.documentElement.scrollWidth <= window.innerWidth,
    documentHeightFits: document.documentElement.scrollHeight <= window.innerHeight,
    shellFits: shell.left >= 0 && shell.right <= window.innerWidth && shell.top >= 0 && shell.bottom <= window.innerHeight,
    navFits: nav.getBoundingClientRect().left >= 0 && nav.getBoundingClientRect().right <= window.innerWidth && nav.scrollWidth <= nav.clientWidth,
    trackerFits: tracker.left >= 0 && tracker.right <= window.innerWidth && tracker.bottom <= window.innerHeight,
    boatIsCenterLeft: (boat.left + boat.width / 2) / window.innerWidth >= .32 && (boat.left + boat.width / 2) / window.innerWidth < .5,
    boatIsVerticallyCentered: (boat.top + boat.height / 2) / window.innerHeight >= .38 && (boat.top + boat.height / 2) / window.innerHeight <= .62,
    fishingTopSeamRemoved: getComputedStyle(document.querySelector('.topbar')).borderBottomWidth === '0px',
    tutorialFits: document.querySelector('#tutorial').getBoundingClientRect().left >= 0 && document.querySelector('#tutorial').getBoundingClientRect().right <= window.innerWidth
  };
})()`);
assert.deepEqual(narrowFishingScene, { documentWidthFits: true, documentHeightFits: true, shellFits: true, navFits: true, trackerFits: true, boatIsCenterLeft: true, boatIsVerticallyCentered: true, fishingTopSeamRemoved: true, tutorialFits: true });
await command("Emulation.clearDeviceMetricsOverride");

await evaluate(`Math.random = () => 0`);
const tutorialObjectiveProgressBefore = await evaluate(`(() => {
  const save = JSON.parse(localStorage.getItem('atlas-of-fins.save'));
  return {
    daily: save.dailyBoard.entries.map(entry => entry.progress),
    bayEvent: save.bayEvent?.progress ?? null,
    resident: save.residentCommissions.active?.progress ?? null,
    stories: Object.fromEntries(Object.entries(save.residentStories).map(([id, entry]) => [id, entry.objectiveProgress ?? null]))
  };
})()`);
const tutorialBaitBeforeCast = await evaluate(`(() => { const save=JSON.parse(localStorage.getItem('atlas-of-fins.save')); return save.baitAmounts[save.equippedBait]; })()`);
await click('[data-action="cast"]');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 3);
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 4 \/ 14[\s\S]*等候魚訊/);
assert.equal(await evaluate("document.querySelector('#tutorial').classList.contains('is-hidden')"), false);
assert.equal(await evaluate("document.querySelector('#tutorial-spotlight').classList.contains('is-hidden')"), false);
assert.equal(await evaluate(`(() => { const save=JSON.parse(localStorage.getItem('atlas-of-fins.save')); return save.baitAmounts[save.equippedBait]; })()`), tutorialBaitBeforeCast);
await waitFor(`Boolean(document.querySelector('.fishing-line-cue path')?.getAttribute('d'))`);
const fishingRigAlignment = await evaluate(`(() => {
  const stage = document.querySelector('.fishing-stage');
  const path = document.querySelector('.fishing-line-cue path');
  const tip = document.querySelector('.rod-tip').getBoundingClientRect();
  const bait = document.querySelector('.fishing-bait').getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const start = path.getPointAtLength(0);
  const end = path.getPointAtLength(path.getTotalLength());
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  return {
    rodToLineGap: distance({ x: start.x + stageRect.left, y: start.y + stageRect.top }, { x: tip.left + tip.width / 2, y: tip.top + tip.height / 2 }),
    lineToBaitGap: distance({ x: end.x + stageRect.left, y: end.y + stageRect.top }, { x: bait.left + bait.width / 2, y: bait.top + bait.height / 2 }),
    baitIsVisible: bait.left >= 0 && bait.right <= innerWidth && bait.top >= 0 && bait.bottom <= innerHeight,
    hasMouthAnchor: Boolean(document.querySelector('.fish-mouth')),
    hasProbeRipples: Boolean(document.querySelector('.probe-ripples'))
  };
})()`);
assert.ok(fishingRigAlignment.rodToLineGap < 3, `rod tip joins line (${fishingRigAlignment.rodToLineGap}px)`);
assert.ok(fishingRigAlignment.lineToBaitGap < 3, `line joins bait (${fishingRigAlignment.lineToBaitGap}px)`);
assert.equal(fishingRigAlignment.baitIsVisible, true);
assert.equal(fishingRigAlignment.hasMouthAnchor, true);
assert.equal(fishingRigAlignment.hasProbeRipples, true);
const probeFishBodyContract = await evaluate(`(() => {
  const body = document.querySelector('.fish-shadow-body');
  const bodyStyle = getComputedStyle(body);
  const tailStyle = getComputedStyle(body, '::before');
  const finStyle = getComputedStyle(body.querySelector('.fishing-fish-fin'));
  const mouthStyle = getComputedStyle(body.querySelector('.fishing-fish-mouth'));
  return {
    tagName: body.tagName,
    width: bodyStyle.width,
    height: bodyStyle.height,
    borderRadius: bodyStyle.borderRadius,
    tailWidth: tailStyle.width,
    tailHeight: tailStyle.height,
    tailRight: tailStyle.right,
    tailClipPath: tailStyle.clipPath,
    finWidth: finStyle.width,
    finHeight: finStyle.height,
    finLeft: finStyle.left,
    finTop: finStyle.top,
    mouthWidth: mouthStyle.width,
    mouthHeight: mouthStyle.height,
    mouthLeft: mouthStyle.left,
    mouthTop: mouthStyle.top
  };
})()`);
await waitFor(`(() => {
  const stage = document.querySelector('.fishing-stage');
  const ripple = document.querySelector('.probe-ripples > i');
  const rod = document.querySelector('.rod-line');
  const fish = document.querySelector('.fish-shadow');
  return stage?.classList.contains('is-nibbling')
    && stage.dataset.fishSide === 'left'
    && getComputedStyle(ripple).animationName.includes('probeRipple')
    && getComputedStyle(rod).animationName.includes('rodProbe')
    && getComputedStyle(fish).animationName.includes('fishProbeFromLeft');
})()`, 5000);
await waitFor(`(() => {
  const mouth = document.querySelector('.fish-mouth')?.getBoundingClientRect();
  const bait = document.querySelector('.fishing-bait')?.getBoundingClientRect();
  return document.querySelector('.fishing-stage')?.classList.contains('is-nibbling')
    && mouth && bait
    && Math.hypot(mouth.left + mouth.width / 2 - bait.left - bait.width / 2, mouth.top + mouth.height / 2 - bait.top - bait.height / 2) < 6;
})()`, 5000);
await waitFor(`(() => {
  const fish = document.querySelector('.fish-shadow');
  const probe = fish?.getAnimations().find(animation => /fish.*ProbeFromLeft/.test(animation.animationName));
  const duration = Number(probe?.effect?.getTiming().duration) || 0;
  return probe?.currentTime >= Math.max(250, duration * .7);
})()`, 1000);
const probeExitMouth = await evaluate(`(() => {
  const mouth = document.querySelector('.fish-mouth').getBoundingClientRect();
  return { x: mouth.left + mouth.width / 2, y: mouth.top + mouth.height / 2 };
})()`);
await waitFor(`document.querySelector('.fishing-stage')?.dataset.fishCue === 'retreat'`, 1500);
const retreatEntry = await evaluate(`(() => {
  const stage = document.querySelector('.fishing-stage');
  const mouth = document.querySelector('.fish-mouth').getBoundingClientRect();
  return {
    side: stage.dataset.fishSide,
    animation: getComputedStyle(document.querySelector('.fish-shadow')).animationName,
    mouth: { x: mouth.left + mouth.width / 2, y: mouth.top + mouth.height / 2 }
  };
})()`);
assert.equal(retreatEntry.side, 'left');
assert.match(retreatEntry.animation, /fishRetreatLeft/);
assert.ok(Math.hypot(retreatEntry.mouth.x - probeExitMouth.x, retreatEntry.mouth.y - probeExitMouth.y) < 8, 'probe hands off to the retreat without teleporting');
await waitFor(`(() => {
  const stage = document.querySelector('.fishing-stage');
  return stage?.dataset.fishCue === 'reapproach'
    && getComputedStyle(document.querySelector('.fish-shadow')).animationName.includes('fishReapproachLeft');
})()`, 1400);
const reapproachOffset = await evaluate(`(() => {
  const mouth = document.querySelector('.fish-mouth').getBoundingClientRect();
  const bait = document.querySelector('.fishing-bait').getBoundingClientRect();
  return mouth.left + mouth.width / 2 - bait.left - bait.width / 2;
})()`);
assert.ok(reapproachOffset < -18, `fish retreats and reapproaches from its original side (${reapproachOffset}px)`);
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
await wait(180);
const narrowRigAlignment = await evaluate(`(() => {
  const stage = document.querySelector('.fishing-stage');
  const path = document.querySelector('.fishing-line-cue path');
  const tip = document.querySelector('.rod-tip').getBoundingClientRect();
  const bait = document.querySelector('.fishing-bait').getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const start = path.getPointAtLength(0);
  const end = path.getPointAtLength(path.getTotalLength());
  return {
    rodGap: Math.hypot(start.x + stageRect.left - tip.left - tip.width / 2, start.y + stageRect.top - tip.top - tip.height / 2),
    baitGap: Math.hypot(end.x + stageRect.left - bait.left - bait.width / 2, end.y + stageRect.top - bait.top - bait.height / 2),
    baitIsForwardOfRod: bait.left + bait.width / 2 > tip.left + tip.width / 2,
    baitIsVisible: bait.left >= 0 && bait.right <= innerWidth && bait.top >= 0 && bait.bottom <= innerHeight
  };
})()`);
assert.ok(narrowRigAlignment.rodGap < 3, `narrow rod tip joins line (${narrowRigAlignment.rodGap}px)`);
assert.ok(narrowRigAlignment.baitGap < 3, `narrow line joins bait (${narrowRigAlignment.baitGap}px)`);
assert.equal(narrowRigAlignment.baitIsForwardOfRod, true);
assert.equal(narrowRigAlignment.baitIsVisible, true);
await command("Emulation.clearDeviceMetricsOverride");
await click('[data-view="chart"]');
assert.equal(await evaluate("document.querySelector('.nav-button.is-active').dataset.view"), "fishing");
await waitFor(`document.querySelector('#game-shell').dataset.fishingPhase === 'biting'`, 16000);
await waitFor(`(() => {
  const mouth = document.querySelector('.fish-mouth')?.getBoundingClientRect();
  const bait = document.querySelector('.fishing-bait')?.getBoundingClientRect();
  return mouth && bait
    && document.querySelector('.fishing-stage').dataset.fishSide === 'left'
    && getComputedStyle(document.querySelector('.fish-shadow')).animationName.includes('fishBiteFromLeft')
    && Math.hypot(mouth.left + mouth.width / 2 - bait.left - bait.width / 2, mouth.top + mouth.height / 2 - bait.top - bait.height / 2) < 6;
})()`, 1000);
const biteArtAlignment = await evaluate(`(() => {
  const alert = document.querySelector('.bite-alert').getBoundingClientRect();
  const bait = document.querySelector('.fishing-bait').getBoundingClientRect();
  const splash = document.querySelector('.bite-splash');
  return {
    alertCenterGap: Math.abs(alert.left + alert.width / 2 - bait.left - bait.width / 2),
    alertIsAboveBait: alert.top + alert.height / 2 < bait.top + bait.height / 2,
    alertIsNearBait: bait.top + bait.height / 2 - alert.top - alert.height / 2 < 130,
    splashIsExpanded: splash.offsetWidth >= 70,
    splashAnimation: getComputedStyle(splash).animationName,
    rodAnimation: getComputedStyle(document.querySelector('.rod-line')).animationName
  };
})()`);
assert.ok(biteArtAlignment.alertCenterGap < 4, `bite alert centers on bait (${biteArtAlignment.alertCenterGap}px)`);
assert.equal(biteArtAlignment.alertIsAboveBait, true);
assert.equal(biteArtAlignment.alertIsNearBait, true);
assert.equal(biteArtAlignment.splashIsExpanded, true);
assert.match(biteArtAlignment.splashAnimation, /biteSplash/);
assert.match(biteArtAlignment.rodAnimation, /rodBite/);
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 4);
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 5 \/ 14[\s\S]*教學不會倒數/);
await wait(3000);
assert.equal(await evaluate("document.querySelector('#game-shell').dataset.fishingPhase"), "biting");
assert.equal(await evaluate("document.querySelector('.fishing-stage.is-failed') === null"), true);
await click('[data-action="strike"]');
await waitFor(`Boolean(document.querySelector('#reel-button'))`);
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 5);
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 6 \/ 14[\s\S]*控制張力/);
assert.equal(await evaluate("document.querySelector('#reel-button').classList.contains('is-tutorial-target')"), true);
await evaluate(`document.querySelector('#reel-button').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:10}))`);
await waitFor(`Boolean(document.querySelector('.fishing-stage.is-failed'))`, 7000);
await evaluate(`window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:10}))`);
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 5);
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /再試一次[\s\S]*再拋一竿/);
assert.equal(await evaluate("document.querySelector('[data-action=\"reset-fishing\"]').classList.contains('is-tutorial-target')"), true);
assert.equal(await evaluate(`(() => { const save=JSON.parse(localStorage.getItem('atlas-of-fins.save')); return save.baitAmounts[save.equippedBait]; })()`), tutorialBaitBeforeCast);
await click('[data-action="reset-fishing"]');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 2);
await click('[data-action="cast"]');
assert.equal(await evaluate(`(() => { const save=JSON.parse(localStorage.getItem('atlas-of-fins.save')); return save.baitAmounts[save.equippedBait]; })()`), tutorialBaitBeforeCast);
await waitFor(`document.querySelector('#game-shell').dataset.fishingPhase === 'biting'`, 16000);
await click('[data-action="strike"]');
await waitFor(`Boolean(document.querySelector('#reel-button'))`);
await evaluate(`Math.random = () => 1`);
assert.equal(await playTutorialTension(12), "escaped", "capture escape stays inside the same tutorial lesson");
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 5);
assert.equal(await evaluate("document.querySelector('[data-action=\"reset-fishing\"]').classList.contains('is-tutorial-target')"), true);
assert.equal(await evaluate(`(() => { const save=JSON.parse(localStorage.getItem('atlas-of-fins.save')); return save.baitAmounts[save.equippedBait]; })()`), tutorialBaitBeforeCast);
await click('[data-action="reset-fishing"]');
await evaluate(`Math.random = () => 0`);
await click('[data-action="cast"]');
await waitFor(`document.querySelector('#game-shell').dataset.fishingPhase === 'biting'`, 16000);
await click('[data-action="strike"]');
await waitFor(`Boolean(document.querySelector('#reel-button'))`);
assert.equal(await playTutorialTension(13), "caught", "the forced tutorial can finish after repeated retries");
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 6);
assert.equal(await evaluate(`(() => { const save=JSON.parse(localStorage.getItem('atlas-of-fins.save')); return save.baitAmounts[save.equippedBait]; })()`), tutorialBaitBeforeCast);
assert.deepEqual(await evaluate(`(() => {
  const save = JSON.parse(localStorage.getItem('atlas-of-fins.save'));
  return {
    daily: save.dailyBoard.entries.map(entry => entry.progress),
    bayEvent: save.bayEvent?.progress ?? null,
    resident: save.residentCommissions.active?.progress ?? null,
    stories: Object.fromEntries(Object.entries(save.residentStories).map(([id, entry]) => [id, entry.objectiveProgress ?? null]))
  };
})()`), tutorialObjectiveProgressBefore);
const tutorialCaughtFishName = await evaluate("document.querySelector('.catch-modal h2').innerText");
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 7 \/ 14[\s\S]*收好第一尾魚[\s\S]*收進漁獲箱/);
assert.equal(await evaluate("document.querySelector('#tutorial').classList.contains('is-hidden')"), false);
assert.equal(await evaluate("document.querySelector('#tutorial-spotlight').classList.contains('is-hidden')"), false);
assert.equal(await evaluate("document.querySelector('.tutorial-page-intro') === null"), true);
assert.equal(await evaluate("getComputedStyle(document.querySelector('.catch-hero')).visibility"), "visible");
assert.equal(await evaluate("document.querySelector('[data-action=\"close-catch\"]').classList.contains('is-tutorial-target')"), true);
await click('[data-action="modal-journal"]');
assert.equal(await evaluate("Boolean(document.querySelector('.catch-modal'))"), true);
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 6);
await click('[data-action="close-catch"]');
assert.equal(await evaluate("Boolean(document.querySelector('.catch-modal'))"), false);
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 7);
assert.equal(await evaluate("document.querySelector('.nav-button.is-active').dataset.view"), "catch");
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 8 \/ 14[\s\S]*販售第一尾魚[\s\S]*販售/);
assert.equal(await evaluate("document.querySelector('[data-action=\"sell-one\"]').classList.contains('is-tutorial-target')"), true);
assert.equal(await evaluate("document.querySelector('#tutorial-spotlight').classList.contains('is-hidden')"), false);
assert.match(await evaluate("document.querySelector('.catch-row').innerText"), new RegExp(tutorialCaughtFishName));
await command("Page.reload");
await wait(200);
await waitFor(`document.readyState === "complete"`);
await click("#continue-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 7);
assert.equal(await evaluate("document.querySelector('.nav-button.is-active').dataset.view"), "catch");
assert.equal(await evaluate("document.querySelector('[data-action=\"sell-one\"]').classList.contains('is-tutorial-target')"), true);
await click('[data-action="sell-one"]');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 8);
assert.equal(await evaluate("document.querySelector('.catch-row') === null"), true);
assert.deepEqual(await evaluate(`(() => {
  const save = JSON.parse(localStorage.getItem('atlas-of-fins.save'));
  return {
    progress: {
      daily: save.dailyBoard.entries.map(entry => entry.progress),
      bayEvent: save.bayEvent?.progress ?? null,
      resident: save.residentCommissions.active?.progress ?? null,
      stories: Object.fromEntries(Object.entries(save.residentStories).map(([id, entry]) => [id, entry.objectiveProgress ?? null]))
    },
    keptCollection: Object.keys(save.discovered).length === 1 && save.totalCaught === 1,
    keptEconomy: save.totalSold > 0 && save.money > 120
  };
})()`), { progress: tutorialObjectiveProgressBefore, keptCollection: true, keptEconomy: true });
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 9 \/ 14[\s\S]*前往魚類圖鑑[\s\S]*永久保留/);
assert.equal(await evaluate("document.querySelector('[data-view=\"journal\"]').classList.contains('is-tutorial-target')"), true);
assert.equal(await evaluate("document.querySelector('#tutorial-spotlight').classList.contains('is-hidden')"), false);
await command("Page.reload");
await wait(200);
await waitFor(`document.readyState === "complete"`);
await click("#continue-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 8);
assert.equal(await evaluate("document.querySelector('.nav-button.is-active').dataset.view"), "catch");
assert.equal(await evaluate("document.querySelector('[data-view=\"journal\"]').classList.contains('is-tutorial-target')"), true);
await waitFor(`document.querySelector('#tutorial-spotlight').classList.contains('is-interactive')`);
assert.deepEqual(await evaluate(`(() => {
  const spotlight = document.querySelector('#tutorial-spotlight');
  const rect = spotlight.getBoundingClientRect();
  const topElement = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  return {
    interactive: spotlight.classList.contains('is-interactive'),
    pointerEvents: getComputedStyle(spotlight).pointerEvents,
    receivesPointer: topElement === spotlight
  };
})()`), { interactive: true, pointerEvents: "auto", receivesPointer: true });
await clickCenter('#tutorial-spotlight');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 9);
assert.equal(await evaluate("document.querySelector('.nav-button.is-active').dataset.view"), "journal");
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 10 \/ 14[\s\S]*魚類圖鑑[\s\S]*仍保留剛才售出的魚/);
assert.match(await evaluate("document.querySelector('.fish-detail').innerText"), new RegExp(`${tutorialCaughtFishName}[\\s\\S]*捕獲次數`));
assert.equal(await evaluate("document.querySelector('[data-view=\"shop\"]').classList.contains('is-tutorial-target')"), true);
assert.deepEqual(await evaluate(`(() => {
  const panel = document.querySelector('#content-panel').getBoundingClientRect();
  const nav = document.querySelector('.main-nav').getBoundingClientRect();
  const outsideNavX = Math.max(1, nav.left / 2);
  return {
    panelReachesViewportBottom: Math.abs(panel.bottom - window.innerHeight) <= 1,
    sceneHidden: getComputedStyle(document.querySelector('#world-scene')).visibility === 'hidden',
    sceneHiddenFromAccessibility: document.querySelector('#world-scene').getAttribute('aria-hidden') === 'true',
    bottomLeftCoveredByPage: document.querySelector('#content-panel').contains(document.elementFromPoint(outsideNavX, window.innerHeight - 20)),
    tutorialNavIsOpaque: getComputedStyle(document.querySelector('.main-nav')).backgroundColor === 'rgb(17, 50, 62)'
  };
})()`), { panelReachesViewportBottom: true, sceneHidden: true, sceneHiddenFromAccessibility: true, bottomLeftCoveredByPage: true, tutorialNavIsOpaque: true });
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
await wait(120);
assert.deepEqual(await evaluate(`(() => {
  const card = document.querySelector('#tutorial').getBoundingClientRect();
  return {
    documentFits: document.documentElement.scrollWidth <= window.innerWidth,
    tutorialFits: card.left >= 0 && card.right <= window.innerWidth && card.top >= 0 && card.bottom <= window.innerHeight,
    spotlightVisible: !document.querySelector('#tutorial-spotlight').classList.contains('is-hidden'),
    pageVisible: getComputedStyle(document.querySelector('.journal-layout')).visibility === 'visible'
  };
})()`), { documentFits: true, tutorialFits: true, spotlightVisible: true, pageVisible: true });
await command("Emulation.clearDeviceMetricsOverride");
await wait(120);
// The atlas step spotlights the fish record card, so advancing uses the glowing 海灣商店 nav button directly.
await click('[data-view="shop"]');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 10);
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 11 \/ 14[\s\S]*海灣商店[\s\S]*不需要擔心限時商品/);
assert.deepEqual(await evaluate(`(() => {
  const chip = document.querySelector(".tideglow-chip");
  return { hidden: chip.hidden, display: getComputedStyle(chip).display, clientRects: chip.getClientRects().length };
})()`), { hidden: true, display: "none", clientRects: 0 });
assert.equal(await evaluate("document.querySelector('.tideglow-price') === null"), true);
assert.equal(await evaluate("document.querySelector('[data-action=\"shop-tab\"][data-id=\"ships\"]') === null"), true);
assert.doesNotMatch(await evaluate("document.querySelector('#content-panel').innerText"), /潮光|潮聲居所|遠航書房/);
assert.equal(await evaluate("document.querySelector('[data-action=\"shop-tab\"][data-id=\"baits\"]').classList.contains('is-tutorial-target')"), true);
await click('[data-action="shop-tab"][data-id="baits"]');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 11);
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 12 \/ 14[\s\S]*魚餌[\s\S]*不改變張力或最後的捕獲成功率/);
assert.equal(await evaluate("document.querySelector('[data-action=\"buy-bait\"][data-id=\"bread\"]').classList.contains('is-tutorial-target')"), true);
await wait(240);
assert.deepEqual(await evaluate(`(() => {
  const card = document.querySelector('.shop-item[data-shop-type="bait"][data-shop-id="bread"]');
  const button = card.querySelector('[data-action="buy-bait"]');
  const spotlight = document.querySelector('#tutorial-spotlight');
  const cardRect = card.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const spotlightRect = spotlight.getBoundingClientRect();
  return {
    cardIsTarget: card.classList.contains('is-tutorial-target'),
    buttonIsTarget: button.classList.contains('is-tutorial-target'),
    spotlightCoversWholeCard: spotlightRect.left <= cardRect.left && spotlightRect.top <= cardRect.top
      && spotlightRect.right >= cardRect.right && spotlightRect.bottom >= cardRect.bottom,
    spotlightIsLargerThanButton: spotlightRect.width > buttonRect.width && spotlightRect.height > buttonRect.height,
    cardIsPresentationOnly: !spotlight.classList.contains('is-interactive')
  };
})()`), { cardIsTarget: true, buttonIsTarget: true, spotlightCoversWholeCard: true, spotlightIsLargerThanButton: true, cardIsPresentationOnly: true });
await click('[data-action="buy-bait"][data-id="bread"]');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 12);
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 13 \/ 14[\s\S]*補給完成[\s\S]*直接加入庫存/);
assert.equal(await evaluate("document.querySelector('[data-view=\"home\"]').classList.contains('is-tutorial-target')"), true);
await click('[data-view="home"]');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 13);
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 14 \/ 14[\s\S]*我的船屋[\s\S]*佈置收藏、翻閱日誌/);
assert.equal(await evaluate("document.querySelector('[data-action=\"sleep\"]').classList.contains('is-tutorial-target')"), true);
assert.equal(await evaluate("document.querySelector('#tutorial-spotlight').classList.contains('is-hidden')"), false);
await click('[data-action="sleep"]');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).completedTutorial`), true);
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 14);
assert.equal(await evaluate("document.querySelector('#tutorial').classList.contains('is-hidden')"), true);
assert.equal(await evaluate("document.querySelector('#app').classList.contains('is-tutorial-active')"), false);
assert.deepEqual(await evaluate(`(() => ({
  lockedTargets: document.querySelectorAll('.is-tutorial-locked').length,
  spotlightInteractive: document.querySelector('#tutorial-spotlight').classList.contains('is-interactive'),
  spotlightHidden: document.querySelector('#tutorial-spotlight').classList.contains('is-hidden'),
  chartPointerEvents: getComputedStyle(document.querySelector('[data-view="chart"]')).pointerEvents
}))()`), { lockedTargets: 0, spotlightInteractive: false, spotlightHidden: true, chartPointerEvents: "auto" });

await clickCenter('[data-view="chart"]');
assert.equal(await evaluate("document.querySelector('.nav-button.is-active').dataset.view"), "chart");
const chartText = await evaluate("document.querySelector('#content-panel').innerText");
assert.match(chartText, /古海圖/);
assert.match(chartText, /眠潮灣[\s\S]*船隻目前停泊/);
assert.match(chartText, /霧後海域[\s\S]*等待取得灣外海圖/);
assert.match(chartText, /完成眠潮灣主線與八成魚類探索後開放/);
assert.doesNotMatch(chartText, /琉光群島|航線已開放|可航行/);
assert.equal(await evaluate("document.querySelectorAll('.chart-region-node').length"), 2);
assert.equal(await evaluate("document.querySelectorAll('.chart-route-card').length"), 1);
assert.equal(await evaluate("document.querySelector('[data-action=\"prepare-chart-route\"]').disabled"), true);
assert.match(await evaluate("document.querySelector('[data-action=\"prepare-chart-route\"]').innerText"), /尚未取得海圖/);
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
assert.equal(await evaluate("document.querySelector('#tutorial').classList.contains('is-hidden')"), true);
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).tutorialStep`), 14);

await evaluate(`Math.random = () => 1`);
await click('[data-action="cast"]');
await waitFor(`Boolean(document.querySelector('.fishing-stage.is-departed'))`, 16000);
assert.match(await evaluate("document.querySelector('.fishing-result-fail').innerText"), /魚影離開了[\s\S]*沒有真正吞餌/);
assert.equal(await evaluate("document.querySelector('[data-action=\\\"reset-fishing\\\"]').innerText.includes('再拋一竿')"), true);
await click('[data-action="reset-fishing"]');

await evaluate(`Math.random = () => 0`);
assert.equal(await evaluate("document.querySelector('.fishing-water-hitbox') === null"), true);
assert.equal(await evaluate("document.querySelectorAll('[data-action=\"cast\"]').length"), 1);
const baitBeforeSeaClick = await evaluate(`(() => { const save=JSON.parse(localStorage.getItem('atlas-of-fins.save')); return save.baitAmounts[save.equippedBait]; })()`);
await evaluate(`document.querySelector('.fishing-scene-ui').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 150, clientY: 360 }))`);
assert.equal(await evaluate("document.querySelector('#game-shell').dataset.fishingPhase"), "idle");
assert.equal(await evaluate(`(() => { const save=JSON.parse(localStorage.getItem('atlas-of-fins.save')); return save.baitAmounts[save.equippedBait]; })()`), baitBeforeSeaClick);
await click('[data-action="cast"]');
assert.equal(await evaluate("document.querySelectorAll('[data-action=\"strike\"]').length"), 1);
const phaseBeforeFishClick = await evaluate("document.querySelector('#game-shell').dataset.fishingPhase");
await evaluate(`document.querySelector('.fish-shadow').dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
assert.equal(await evaluate("document.querySelector('#game-shell').dataset.fishingPhase"), phaseBeforeFishClick);
assert.equal(await evaluate("document.querySelector('.fishing-result-fail') === null"), true);
await click('[data-action="strike"]');
assert.match(await evaluate("document.querySelector('.fishing-result-fail').innerText"), /起竿太早了[\s\S]*只是試探咬餌/);
await click('[data-action="reset-fishing"]');
const baitBeforeNormalEscape = await evaluate(`(() => { const save=JSON.parse(localStorage.getItem('atlas-of-fins.save')); return save.baitAmounts[save.equippedBait]; })()`);
await evaluate(`Math.random = () => 0`);
await click('[data-action="cast"]');
await waitFor(`document.querySelector('#game-shell').dataset.fishingPhase === 'biting'`, 16000);
await click('[data-action="strike"]');
await waitFor(`Boolean(document.querySelector('#reel-button'))`);
await evaluate(`Math.random = () => 1`);
assert.equal(await playTutorialTension(14), "escaped", "normal capture escape ends this cast");
assert.match(await evaluate("document.querySelector('.fishing-result-fail').innerText"), /只消耗已投入的魚餌[\s\S]*不會自動再拋一竿/);
assert.equal(await evaluate("document.querySelector('[data-action=\\\"reset-fishing\\\"]').innerText.includes('返回海面')"), true);
assert.equal(await evaluate(`(() => { const save=JSON.parse(localStorage.getItem('atlas-of-fins.save')); return save.baitAmounts[save.equippedBait]; })()`), baitBeforeNormalEscape - 1);
await click('[data-action="reset-fishing"]');
assert.equal(await evaluate("document.querySelector('#game-shell').dataset.fishingPhase"), "idle");
assert.equal(await evaluate("document.querySelectorAll('[data-action=\\\"cast\\\"]').length"), 1);
await evaluate(`Math.random = () => 0`);
const deliberateWaitStarted = Date.now();
await click('[data-action="cast"]');
assert.equal(await evaluate("document.querySelector('.bite-callout') === null"), true);
assert.match(await evaluate("getComputedStyle(document.querySelector('.fish-shadow')).animationName"), /fishApproachFromLeft/);
await evaluate(`document.querySelector('.fish-shadow').dataset.continuity = 'kept'`);
await wait(3400);
assert.equal(await evaluate("document.querySelector('.fish-shadow')?.dataset.continuity"), "kept");
await waitFor(`Boolean(document.querySelector('.fishing-stage.is-biting'))`, 16000);
assert.ok(Date.now() - deliberateWaitStarted >= 4500, "the fish shadow lingers before the true bite");
assert.equal(await evaluate("getComputedStyle(document.querySelector('.bite-alert')).display"), "grid");
assert.equal(await evaluate("getComputedStyle(document.querySelector('.fishing-context-action')).animationName"), "none");
assert.match(await evaluate("document.querySelector('.bite-alert').textContent"), /真正吞餌/);
await click('[data-action="strike"]');
await waitFor(`Boolean(document.querySelector('#reel-button'))`);
await waitFor(`Boolean(document.querySelector('.struggle-line path')?.getAttribute('d'))`);
await evaluate(`window.__catchRolls = [0, .4, .4, 0, 0, 0]; Math.random = () => window.__catchRolls.length ? window.__catchRolls.shift() : 0`);
assert.match(await evaluate("document.querySelector('.reel-ui').innerText"), /張力[\s\S]*距離[\s\S]*100%[\s\S]*收線/);
assert.doesNotMatch(await evaluate("document.querySelector('.reel-ui').innerText"), /穩住魚線|按住收線|完成後進行捕獲判定|平穩型|衝刺型|耐力型|擺動型|稀有型/);
assert.match(await evaluate("document.querySelector('.fight-behavior-cue').innerText"), /魚勢[\s\S]*(平穩型|衝刺型|耐力型|擺動型|稀有型)/);
const fightRigAlignment = await evaluate(`(() => {
  const stage = document.querySelector('.fishing-stage.is-reeling');
  const stageRect = stage.getBoundingClientRect();
  const path = document.querySelector('.struggle-line path');
  const tip = document.querySelector('.rod-tip').getBoundingClientRect();
  const mouth = document.querySelector('.struggle-fish-mouth').getBoundingClientRect();
  const fish = document.querySelector('.struggle-fish-cue');
  const start = path.getPointAtLength(0);
  const end = path.getPointAtLength(path.getTotalLength());
  return {
    usesSvgLine: document.querySelector('.struggle-line').tagName === 'svg',
    rodGap: Math.hypot(start.x + stageRect.left - tip.left - tip.width / 2, start.y + stageRect.top - tip.top - tip.height / 2),
    mouthGap: Math.hypot(end.x + stageRect.left - mouth.left - mouth.width / 2, end.y + stageRect.top - mouth.top - mouth.height / 2),
    hasWake: Boolean(document.querySelector('.struggle-wake')),
    fishAnimation: getComputedStyle(fish).animationName,
    tensionState: stage.dataset.tensionState,
    rodAngle: parseFloat(getComputedStyle(document.querySelector('#game-shell')).getPropertyValue('--reel-rod-angle'))
  };
})()`);
assert.equal(fightRigAlignment.usesSvgLine, true);
assert.ok(fightRigAlignment.rodGap < 3, `fight line joins rod tip (${fightRigAlignment.rodGap}px)`);
assert.ok(fightRigAlignment.mouthGap < 3, `fight line joins fish mouth (${fightRigAlignment.mouthGap}px)`);
assert.equal(fightRigAlignment.hasWake, true);
assert.match(fightRigAlignment.fishAnimation, /fightFish(Steady|Sprint|Endurance|Sway|Rare)/);
assert.match(fightRigAlignment.tensionState, /^(slack|safe|danger)$/);
const fightFishBodyContract = await evaluate(`(() => {
  const body = document.querySelector('.struggle-fish-body');
  const bodyStyle = getComputedStyle(body);
  const tailStyle = getComputedStyle(body, '::before');
  const finStyle = getComputedStyle(body.querySelector('.fishing-fish-fin'));
  const mouthStyle = getComputedStyle(body.querySelector('.fishing-fish-mouth'));
  return {
    tagName: body.tagName,
    width: bodyStyle.width,
    height: bodyStyle.height,
    borderRadius: bodyStyle.borderRadius,
    tailWidth: tailStyle.width,
    tailHeight: tailStyle.height,
    tailRight: tailStyle.right,
    tailClipPath: tailStyle.clipPath,
    finWidth: finStyle.width,
    finHeight: finStyle.height,
    finLeft: finStyle.left,
    finTop: finStyle.top,
    mouthWidth: mouthStyle.width,
    mouthHeight: mouthStyle.height,
    mouthLeft: mouthStyle.left,
    mouthTop: mouthStyle.top
  };
})()`);
assert.deepEqual(fightFishBodyContract, probeFishBodyContract, 'probe and fight use the same fish body geometry');
const behaviorShapeContracts = await evaluate(`(() => {
  const cue = document.querySelector('.struggle-fish-cue');
  const body = document.querySelector('.struggle-fish-body');
  const originalClass = cue.className;
  const entries = ['steady','sprint','endurance','sway','rare'].map(behavior => {
    cue.className = 'struggle-fish-cue is-' + behavior;
    const bodyStyle = getComputedStyle(body);
    const animationName = getComputedStyle(cue).animationName;
    const animation = cue.getAnimations().find(item => item.animationName === animationName);
    return {
      behavior,
      width: bodyStyle.width,
      height: bodyStyle.height,
      borderRadius: bodyStyle.borderRadius,
      animationName,
      changesScale: animation?.effect.getKeyframes().some(frame => String(frame.transform).includes('scale')) || false
    };
  });
  cue.className = originalClass;
  return entries;
})()`);
assert.equal(new Set(behaviorShapeContracts.map(entry => `${entry.width}|${entry.height}|${entry.borderRadius}`)).size, 1);
assert.equal(new Set(behaviorShapeContracts.map(entry => entry.animationName)).size, 5);
assert.equal(behaviorShapeContracts.some(entry => entry.changesScale), false);
const fightSideContracts = await evaluate(`(() => {
  const stage = document.querySelector('.fishing-stage.is-reeling');
  const body = document.querySelector('.struggle-fish-body');
  const originalSide = stage.dataset.fishSide;
  const entries = ['left','right'].map(side => {
    stage.dataset.fishSide = side;
    const animationName = getComputedStyle(body).animationName;
    const animation = body.getAnimations().find(item => item.animationName === animationName);
    const finalTransform = animation?.effect.getKeyframes().at(-1)?.transform || '';
    return { side, animationName, finalTransform };
  });
  stage.dataset.fishSide = originalSide;
  return entries;
})()`);
assert.match(fightSideContracts.find(entry => entry.side === 'left').animationName, /fightBodySettleLeft/);
assert.match(fightSideContracts.find(entry => entry.side === 'left').finalTransform, /scaleX\(-1\)/);
assert.match(fightSideContracts.find(entry => entry.side === 'right').animationName, /fightBodySettleRight/);
assert.match(fightSideContracts.find(entry => entry.side === 'right').finalTransform, /scaleX\(1\)/);
await evaluate(`document.querySelector('#reel-button').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:15}))`);
await wait(360);
await evaluate(`window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:15}))`);
const tautRodAngle = await evaluate(`parseFloat(getComputedStyle(document.querySelector('#game-shell')).getPropertyValue('--reel-rod-angle'))`);
assert.ok(tautRodAngle > fightRigAlignment.rodAngle + .3, `rod responds to tension (${fightRigAlignment.rodAngle}deg → ${tautRodAngle}deg)`);
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
await wait(180);
const narrowFightRig = await evaluate(`(() => {
  const stage = document.querySelector('.fishing-stage.is-reeling');
  const stageRect = stage.getBoundingClientRect();
  const path = document.querySelector('.struggle-line path');
  const tip = document.querySelector('.rod-tip').getBoundingClientRect();
  const mouth = document.querySelector('.struggle-fish-mouth').getBoundingClientRect();
  const fish = document.querySelector('.struggle-fish-body').getBoundingClientRect();
  const hud = document.querySelector('.reel-ui').getBoundingClientRect();
  const start = path.getPointAtLength(0);
  const end = path.getPointAtLength(path.getTotalLength());
  return {
    rodGap: Math.hypot(start.x + stageRect.left - tip.left - tip.width / 2, start.y + stageRect.top - tip.top - tip.height / 2),
    mouthGap: Math.hypot(end.x + stageRect.left - mouth.left - mouth.width / 2, end.y + stageRect.top - mouth.top - mouth.height / 2),
    fishVisible: fish.left >= 0 && fish.right <= innerWidth && fish.top >= 0 && fish.bottom <= innerHeight,
    hudFits: hud.left >= 0 && hud.right <= innerWidth && hud.bottom <= innerHeight
  };
})()`);
assert.ok(narrowFightRig.rodGap < 3, `narrow fight line joins rod tip (${narrowFightRig.rodGap}px)`);
assert.ok(narrowFightRig.mouthGap < 3, `narrow fight line joins fish mouth (${narrowFightRig.mouthGap}px)`);
assert.equal(narrowFightRig.fishVisible, true);
assert.equal(narrowFightRig.hudFits, true);
await command("Emulation.clearDeviceMetricsOverride");
await wait(180);
await wait(1800);
const persistentBehaviorCue = await evaluate(`(() => {
  const cue = document.querySelector('.fight-behavior-cue');
  const style = getComputedStyle(cue);
  return { exists: Boolean(cue), opacity: Number(style.opacity), animationName: style.animationName };
})()`);
assert.equal(persistentBehaviorCue.exists, true);
assert.ok(persistentBehaviorCue.opacity >= .78 && persistentBehaviorCue.opacity <= .9);
assert.equal(persistentBehaviorCue.animationName, "none");
assert.equal(await evaluate("document.querySelector('#task-tracker').hidden"), true);
const compactFightLayout = await evaluate(`(() => {
  const stage = document.querySelector('.fishing-stage.is-reeling').getBoundingClientRect();
  const hud = document.querySelector('.reel-ui').getBoundingClientRect();
  const fish = document.querySelector('.struggle-fish-body').getBoundingClientRect();
  const behaviorCue = document.querySelector('.fight-behavior-cue').getBoundingClientRect();
  return {
    hudCompact: hud.width <= 400 && hud.height <= 110,
    hudAtBottom: hud.bottom > stage.top + stage.height * .75,
    seaRemainsVisible: hud.height < stage.height * .25,
    fishStaysByBait: fish.left + fish.width / 2 > stage.left + stage.width * .55,
    behaviorCueCompact: behaviorCue.width <= 160 && behaviorCue.height <= 70,
    behaviorCueClearsHud: behaviorCue.bottom < hud.top
  };
})()`);
assert.deepEqual(compactFightLayout, { hudCompact: true, hudAtBottom: true, seaRemainsVisible: true, fishStaysByBait: true, behaviorCueCompact: true, behaviorCueClearsHud: true });

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
assert.equal(await evaluate("document.querySelector('#resident-badge').innerText"), "新主線");
await click('[data-view="residents"]');
assert.match(await evaluate("document.querySelector('[data-resident=\lighthouse_keeper\]').innerText"), /淺灘的潮聲[\s\S]*1 \/ 2/);
await click('[data-resident="lighthouse_keeper"] [data-action="talk-resident"]');
assert.match(await evaluate("document.querySelector('.modal').innerText"), /燈塔守望者[\s\S]*記著回來的方向/);
await click('[data-action="close-modal"]');
await click('[data-view="journal"]');
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /探索進度[\s\S]*1 \/ 63/);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /初次相遇[\s\S]*初次：/);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /閃光紀錄 2 次/);
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
// The aquarium now lives in a popup opened from the船屋 dock rather than inline on the page.
await click('[data-action="show-aquarium"]');
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
assert.match(await evaluate("document.querySelector('#time-label').innerText"), /黃昏/);

const saved = await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save"))`);
const savedCatchRecord = Object.values(saved.discovered)[0];
assert.equal(saved.version, 5);
assert.equal(saved.tideglow.enabled, false);
assert.equal(saved.tideglow.total, 0);
assert.deepEqual(saved.tideglow.ledgerBySourceId, {});
assert.deepEqual(await evaluate(`(() => {
  const chip = document.querySelector(".tideglow-chip");
  return { hidden: chip.hidden, display: getComputedStyle(chip).display, clientRects: chip.getClientRects().length };
})()`), { hidden: true, display: "none", clientRects: 0 });
assert.equal(saved.gameEvents.pending.length, 0);
assert.equal(saved.world.currentRegionId, "sleeping_tide_bay");
assert.deepEqual(saved.world.visitedRegionIds, ["sleeping_tide_bay"]);
assert.deepEqual(saved.world.unlockedRouteIds, []);
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
assert.equal(savedCatchRecord.times.length, 2);
assert.equal(savedCatchRecord.weathers.length, 1);
assert.equal(savedCatchRecord.caughtShimmer, true);
assert.equal(savedCatchRecord.shimmerCount, 2);
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
  save.residentStories.lighthouse_keeper = {
    completedSceneIds: [
      "keeper_returning_light", "keeper_two_habitats", "keeper_catch_destinations",
      "keeper_four_lights", "keeper_weather_surface", "keeper_outer_current_chart"
    ],
    rewardIds: ["sleeping_tide_outer_chart"]
  };
  save.world.unlockedRouteIds = ["sleeping_tide_to_luminous_archipelago"];
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
assert.match(await evaluate("document.querySelector('#scene-caption').textContent"), /航向琉光群島[\s\S]*第 1 \/ 3 段/);

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
await click('[data-action="show-fishing-setup"]');
assert.equal(await evaluate("document.querySelectorAll('.spot-card').length"), 3);
assert.equal(await evaluate("Boolean(document.querySelector('[data-action=\"cast\"]'))"), true);
assert.equal(await evaluate("document.querySelectorAll('.observation-preview').length"), 1);
assert.match(await evaluate("document.querySelector('.fishing-setup-modal').innerText"), /釣點與裝備[\s\S]*風棲淺灘[\s\S]*稜光珊瑚庭[\s\S]*暖流藍渠/);
assert.match(await evaluate("document.querySelector('.observation-preview').innerText"), /特殊觀察點 · 0 \/ 2[\s\S]*不需快速點擊/);
assert.match(await evaluate("document.querySelector('.research-card').innerText"), /琉光群島研究主路[\s\S]*0 \/ 33[\s\S]*風在港口停了一會兒/);
assert.equal(await evaluate("document.querySelector('#app').dataset.region"), "luminous_archipelago");
await click('[data-action="close-modal"]');

await click('[data-view="residents"]');
assert.equal(await evaluate("document.querySelectorAll('.resident-card').length"), 1);
assert.match(await evaluate("document.querySelector('[data-resident=\"chengye\"]').innerText"), /澄野[\s\S]*海域主線 · 新章節[\s\S]*繞了半片海的觀測器[\s\S]*接受主線任務/);
await click('[data-resident="chengye"] [data-action="accept-resident-story"]');
assert.match(await evaluate("document.querySelector('.resident-story-modal').innerText"), /主線任務已接受[\s\S]*繞了半片海的觀測器[\s\S]*替漂流觀測器補上淺灘資料/);
await click('[data-action="close-modal"]');

await click('[data-view="journal"]');
await click('[data-action="journal-filter"][data-id="luminous_archipelago"]');
assert.equal(await evaluate("document.querySelectorAll('.fish-card').length"), 33);
assert.equal(await evaluate("document.querySelector('[data-action=\"select-fish\"][data-id=\"parrotfish\"]') === null"), true);
await click('[data-view="fishing"]');
await click('[data-action="show-fishing-setup"]');
await click('[data-action="spot"][data-id="prism_coral_garden"]');
await click('[data-action="close-modal"]');
await click('[data-action="cast"]');
await waitFor(`Boolean(document.querySelector('.fishing-stage.is-biting'))`, 16000);
await click('[data-action="strike"]');
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
assert.equal(luminousCaught, true, `exclusive Luminous fish can be caught locally: ${exceptions.join(", ")}`);
assert.match(await evaluate("document.querySelector('.catch-modal').innerText"), /藍綠光鰓魚[\s\S]*琉光群島印章/);
await click('[data-action="close-catch"]');
await click('[data-view="journal"]');
await click('[data-action="journal-filter"][data-id="luminous_archipelago"]');
await click('[data-action="select-fish"][data-id="bluegreen_chromis"]');
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
assert.equal(await evaluate("document.querySelector('.tracker-item.is-event') === null"), true);
await click("#save-button");
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).bayEvent`), null);

await click("#menu-button");
await click('[data-action="to-title"]');
await waitFor(`!document.querySelector("#title-screen").classList.contains("is-hidden")`);
await evaluate(`(() => { const save = JSON.parse(localStorage.getItem("atlas-of-fins.save")); save.day = 3; save.timeIndex = 0; save.bayEvent = null; localStorage.setItem("atlas-of-fins.save", JSON.stringify(save)); })()`);
await click("#continue-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
assert.match(await evaluate("document.querySelector('.tracker-item.is-event').innerText"), /等待條件[\s\S]*月光潮汐/);
await click('[data-view="home"]');
await click('[data-action="sleep"]');
await click('[data-action="sleep"]');
await click('[data-action="sleep"]');
await click('[data-view="fishing"]');
assert.match(await evaluate("document.querySelector('.tracker-item.is-event').innerText"), /生效中[\s\S]*月光潮汐/);
assert.equal(await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save")).timeIndex`), 3);

await click("#menu-button");
await click('[data-action="to-title"]');
await waitFor(`!document.querySelector("#title-screen").classList.contains("is-hidden")`);
await evaluate(`(() => { const save = JSON.parse(localStorage.getItem("atlas-of-fins.save")); save.day = 5; save.timeIndex = 0; save.weather = "sunny"; save.bayEvent = null; localStorage.setItem("atlas-of-fins.save", JSON.stringify(save)); })()`);
await click("#continue-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
assert.match(await evaluate("document.querySelector('#weather-label').innerText"), /細雨/);
assert.equal(await evaluate("document.querySelector('#app').dataset.weather"), "rain");
assert.match(await evaluate("document.querySelector('.tracker-item.is-event').innerText"), /生效中[\s\S]*雨後漂流[\s\S]*0 \/ 2/);
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
  delete save.residentStories.lighthouse_keeper;
  save.journal.readEntryIds = save.journal.readEntryIds.filter(id => !id.startsWith("journal:story:sleeping_tide_bay:"));
  save.journal.unreadEntryIds = save.journal.unreadEntryIds.filter(id => !id.startsWith("journal:story:sleeping_tide_bay:"));
  save.journal.pendingNoticeEntryIds = save.journal.pendingNoticeEntryIds.filter(id => !id.startsWith("journal:story:sleeping_tide_bay:"));
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
assert.deepEqual(migratedV4Save.world.unlockedRouteIds, []);
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
assert.equal(migratedV4Save.journal.unreadEntryIds.includes("journal:story:sleeping_tide_bay:opening"), false);
assert.equal(await evaluate(`localStorage.getItem("atlas-of-fins.backup")`), legacyV3Payload);

await click("#menu-button");
await click('[data-action="to-title"]');
await evaluate(`(() => {
  const save = JSON.parse(localStorage.getItem("atlas-of-fins.save"));
  const fishIds = ${JSON.stringify(Array.from({ length: 20 }, (_, index) => `browser-fish-${index}`))};
  save.money = 10000;
  save.tideglow.enabled = true;
  save.tideglow.seenIntro = true;
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
assert.deepEqual(await evaluate(`(() => {
  const chip = document.querySelector(".tideglow-chip");
  return { hidden: chip.hidden, display: getComputedStyle(chip).display, visible: chip.getClientRects().length > 0 };
})()`), { hidden: false, display: "flex", visible: true });
assert.equal(await evaluate("document.querySelector('.tideglow-price') !== null"), true);
assert.equal(await evaluate("document.querySelector('[data-action=\"shop-tab\"][data-id=\"ships\"]') !== null"), true);
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
await click('[data-action="show-aquarium"]');
assert.equal(await evaluate("document.querySelector('.aquarium-panel').classList.contains('aquarium-frame-seafoam-ceramic')"), true);
await click('[data-action="close-home-popup"]');
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
  journal: `${Object.keys(saved.discovered).length}/63`,
  sold: saved.totalSold,
  time: saved.timeIndex,
  tutorial: saved.completedTutorial,
  exceptions
}, null, 2));
ws.close();

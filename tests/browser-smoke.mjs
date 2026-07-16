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
await click('[data-view="journal"]');
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /探索進度[\s\S]*20 \/ 20/);
assert.equal(await evaluate("document.querySelectorAll('.fish-card').length"), 20);
assert.equal(await evaluate("document.querySelectorAll('.fish-card.is-unknown').length"), 0);
assert.equal(await evaluate("localStorage.getItem('atlas-of-fins.save')"), null);
assert.equal(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.dev-save')).developerMode"), true);
await click("#menu-button");
await click('[data-action="to-title"]');
await waitFor(`!document.querySelector("#title-screen").classList.contains("is-hidden")`);
assert.equal(await evaluate("document.querySelector('#continue-button').disabled"), true);

await click("#new-game-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /去釣魚/);
assert.equal(await evaluate("document.querySelectorAll('.spot-card').length"), 3);
assert.match(await evaluate("document.querySelector('.bay-event-card[data-bay-event=\"silver_tide\"]').innerText"), /銀潮靠岸[\s\S]*沙丁魚、鯷魚[\s\S]*0 \/ 3/);
assert.match(await evaluate("document.querySelector('#scene-caption').innerText"), /銀潮靠岸/);
assert.match(await evaluate("document.querySelector('#tutorial').innerText"), /航海教學 · 1 \/ 6[\s\S]*去釣魚/);
assert.equal(await evaluate("Boolean(document.querySelector('[data-action=\\\"tutorial-go-fishing\\\"]'))"), true);
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
assert.match(await evaluate("document.querySelector('.catch-modal').innerText"), /cm[\s\S]*kg[\s\S]*金幣/);
assert.match(await evaluate("document.querySelector('.catch-modal').innerText"), /閃光個體/);
assert.match(await evaluate("document.querySelector('.catch-modal').innerText"), /首次閃光研究獎勵 75 金幣/);
assert.match(await evaluate("document.querySelector('.catch-modal').innerText"), /熟悉度提升[\s\S]*初次相遇/);
assert.match(await evaluate("document.querySelector('.catch-modal').innerText"), /海灣事件進度[\s\S]*銀潮靠岸 · 1 \/ 3/);

await click('[data-action="close-catch"]');
await click('[data-view="journal"]');
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /探索進度[\s\S]*1 \/ 20/);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /初次相遇[\s\S]*初次：/);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /閃光紀錄 1 次/);

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
assert.equal(await evaluate("document.querySelectorAll('.achievement-item').length"), 12);
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
await click('[data-action="sleep"]');
assert.match(await evaluate("document.querySelector('#time-label').innerText"), /白天/);

const saved = await evaluate(`JSON.parse(localStorage.getItem("atlas-of-fins.save"))`);
const savedCatchRecord = Object.values(saved.discovered)[0];
assert.equal(saved.version, 3);
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

await click("#menu-button");
await click('[data-action="to-title"]');
await waitFor(`!document.querySelector("#title-screen").classList.contains("is-hidden")`);
await evaluate(`(() => { const save = JSON.parse(localStorage.getItem("atlas-of-fins.save")); save.day = 2; save.timeIndex = 0; localStorage.setItem("atlas-of-fins.save", JSON.stringify(save)); })()`);
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
assert.equal(exceptions.length, 0, `No uncaught browser exceptions: ${exceptions.join(", ")}`);

if (process.env.SCREENSHOT) {
  const shot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(process.env.SCREENSHOT, Buffer.from(shot.data, "base64"));
}

console.log(JSON.stringify({
  title: "ok",
  fishing: "caught",
  journal: `${Object.keys(saved.discovered).length}/20`,
  sold: saved.totalSold,
  time: saved.timeIndex,
  tutorial: saved.completedTutorial,
  exceptions
}, null, 2));
ws.close();

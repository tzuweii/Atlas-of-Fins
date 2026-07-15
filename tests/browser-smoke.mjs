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
  if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.text);
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

await click("#new-game-button");
await waitFor(`!document.querySelector("#game-shell").classList.contains("is-hidden")`);
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /去釣魚/);
assert.equal(await evaluate("document.querySelectorAll('.spot-card').length"), 3);

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

await click('[data-action="close-catch"]');
await click('[data-view="journal"]');
assert.match(await evaluate("document.querySelector('#content-panel').innerText"), /探索進度[\s\S]*1 \/ 20/);
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
assert.ok(saved.totalCaught >= 1);
assert.ok(saved.totalSold > 0);
assert.equal(saved.completedTutorial, true);
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

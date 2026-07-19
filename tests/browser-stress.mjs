import assert from "node:assert/strict";
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
    const request = pending.get(message.id);
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
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

async function waitFor(expression, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await wait(60);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`);
const metric = (metrics, name) => metrics.metrics.find(entry => entry.name === name)?.value || 0;

await command("Runtime.enable");
await command("Page.enable");
await command("Performance.enable");
await command("HeapProfiler.enable");
await command("Page.navigate", { url: "http://127.0.0.1:4173/" });
await waitFor(`document.readyState === "complete"`);
await evaluate(`localStorage.clear()`);
await command("Page.reload");
await waitFor(`document.readyState === "complete"`);

async function enterDeveloperMode() {
  await click("#developer-mode-button");
  await evaluate(`document.querySelector('#developer-password').value='atlas-dev';document.querySelector('#developer-login-form').requestSubmit()`);
  await waitFor(`!document.querySelector('#game-shell').classList.contains('is-hidden')`);
}

await enterDeveloperMode();
const views = ["fishing", "journal", "catch", "shop", "residents", "chart", "home"];
await evaluate(`(${JSON.stringify(views)}).forEach(view=>document.querySelector('[data-view="'+view+'"]').click())`);
await click('[data-view="journal"]');
await command("HeapProfiler.collectGarbage");
const baselineDom = await command("Memory.getDOMCounters");
const baselineMetrics = await command("Performance.getMetrics");
const baselineHeap = metric(baselineMetrics, "JSHeapUsedSize");

await evaluate(`(() => {
  const views=${JSON.stringify(views)};
  for(let cycle=0;cycle<80;cycle+=1){
    for(const view of views)document.querySelector('[data-view="'+view+'"]').click();
  }
})()`);

await click("#developer-tools-button");
await evaluate(`(() => {
  const shipIds=['drifting_home','tidewhisper_residence','voyager_study'];
  for(let cycle=0;cycle<300;cycle+=1){
    const select=document.querySelector('#developer-ship');
    select.value=shipIds[cycle%shipIds.length];
    document.querySelector('[data-action="developer-activate-ship"]').click();
  }
})()`);
await wait(3400);
assert.equal(await evaluate("JSON.parse(localStorage.getItem('atlas-of-fins.dev-save')).ships.activeShipId"), "voyager_study");
await evaluate(`(() => {
  for(let cycle=0;cycle<60;cycle+=1){
    const select=document.querySelector('#developer-region');
    select.value=cycle%2?'luminous_archipelago':'sleeping_tide_bay';
    document.querySelector('[data-action="developer-dock-region"]').click();
  }
  const select=document.querySelector('#developer-region');
  select.value='sleeping_tide_bay';
  document.querySelector('[data-action="developer-dock-region"]').click();
})()`);
await click('[data-action="close-modal"]');
await click('[data-view="journal"]');
await command("HeapProfiler.collectGarbage");
const stressedDom = await command("Memory.getDOMCounters");
const stressedMetrics = await command("Performance.getMetrics");
const stressedHeap = metric(stressedMetrics, "JSHeapUsedSize");
const heapGrowth = stressedHeap - baselineHeap;

assert.ok(stressedDom.documents <= baselineDom.documents + 1, `documents grew from ${baselineDom.documents} to ${stressedDom.documents}`);
assert.ok(stressedDom.nodes <= baselineDom.nodes + 300, `DOM nodes grew from ${baselineDom.nodes} to ${stressedDom.nodes}`);
assert.ok(stressedDom.jsEventListeners <= baselineDom.jsEventListeners + 8, `listeners grew from ${baselineDom.jsEventListeners} to ${stressedDom.jsEventListeners}`);
assert.ok(heapGrowth <= Math.max(16 * 1024 * 1024, baselineHeap * 0.75), `heap grew by ${heapGrowth} bytes`);
assert.equal(await evaluate("document.querySelectorAll('.fish-card').length"), 63);
const stressedSvgCount = await evaluate("document.querySelectorAll('svg').length");
assert.ok(stressedSvgCount <= 70, `SVG count grew beyond the 63-fish catalog budget: ${stressedSvgCount}`);
assert.ok(await evaluate("localStorage.getItem('atlas-of-fins.dev-save').length") < 1_000_000);

await click("#developer-tools-button");
await evaluate(`document.querySelector('#developer-travel-scale').value='0.01'`);
await click('[data-action="developer-set-travel-scale"]');
await click('[data-action="close-modal"]');

for (let voyage = 0; voyage < 12; voyage += 1) {
  await click('[data-view="chart"]');
  await click('[data-action="prepare-chart-route"]');
  await click('[data-action="confirm-chart-route"]');
  await click("#menu-button");
  await click('[data-action="to-title"]');
  await waitFor(`!document.querySelector('#title-screen').classList.contains('is-hidden')`);
  await evaluate(`(() => {
    const save=JSON.parse(localStorage.getItem('atlas-of-fins.dev-save'));
    save.world.travel.lastCheckedAt=new Date(Date.now()-save.world.travel.durationMs-1000).toISOString();
    localStorage.setItem('atlas-of-fins.dev-save',JSON.stringify(save));
  })()`);
  await enterDeveloperMode();
  assert.equal(await evaluate("document.querySelector('.voyage-state-card.is-offshore') !== null"), true);
  await click('[data-view="chart"]');
  await click('[data-action="dock-arrival"]');
  await click('[data-action="close-modal"]');
}

await click("#sound-button");
await click('[data-action="set-text-scale"][data-id="large"]');
await click('[data-action="set-ui-scale"][data-id="large"]');
await click('[data-action="close-modal"]');
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await click('[data-view="fishing"]');
assert.equal(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), true);
assert.equal(await evaluate("document.querySelector('#app').getBoundingClientRect().width <= window.innerWidth + 1"), true);
assert.equal(exceptions.length, 0, exceptions.join("\n"));

console.log(JSON.stringify({
  viewRenders: 80 * views.length,
  shipSwitches: 300,
  regionSwitches: 61,
  offlineVoyages: 12,
  baseline: { heap: baselineHeap, ...baselineDom },
  stressed: { heap: stressedHeap, ...stressedDom },
  heapGrowth,
  exceptions
}, null, 2));

ws.close();

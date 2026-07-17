import { spawn } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as wait } from "node:timers/promises";

const projectRoot = new URL("../", import.meta.url);
const gameUrl = "http://127.0.0.1:4173/";
const cdpEndpoint = "http://127.0.0.1:9223";
const browserTestFile = process.argv[2] || "tests/browser-smoke.mjs";
const chromeCandidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
].filter(Boolean);

async function firstExecutable(paths) {
  for (const path of paths) {
    try {
      await access(path, constants.X_OK);
      return path;
    } catch { /* try the next browser */ }
  }
  return null;
}

async function endpointAvailable(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForEndpoint(url, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await endpointAvailable(url)) return;
    await wait(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForEndpointRelease(url, attempts = 20) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (!await endpointAvailable(url)) return true;
    await wait(150);
  }
  return false;
}

function run(command, args, options = {}) {
  return spawn(command, args, { windowsHide: true, ...options });
}

async function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

async function stop(child) {
  if (!child || child.exitCode !== null || child.killed) return;
  child.kill("SIGTERM");
  await Promise.race([waitForExit(child), wait(1200)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

const reuseProjectServer = await endpointAvailable(gameUrl);
if (!await waitForEndpointRelease(`${cdpEndpoint}/json/version`)) {
  throw new Error("Browser smoke test port 9223 is already in use.");
}

const chromePath = await firstExecutable(chromeCandidates);
if (!chromePath) throw new Error("No supported Chromium browser was found. Set CHROME_PATH to continue.");

const profilePath = await mkdtemp(join(tmpdir(), "atlas-of-fins-chrome-"));
let server;
let chrome;
try {
  if (!reuseProjectServer) {
    server = run(process.platform === "win32" ? "python" : "python3", ["-m", "http.server", "4173", "--bind", "127.0.0.1"], {
      cwd: projectRoot,
      stdio: "ignore"
    });
  }
  chrome = run(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--remote-debugging-port=9223",
    `--user-data-dir=${profilePath}`,
    gameUrl
  ], { stdio: "ignore" });

  await waitForEndpoint(`${cdpEndpoint}/json/version`);
  const smoke = run(process.execPath, [browserTestFile], {
    cwd: projectRoot,
    env: { ...process.env, CDP_ENDPOINT: cdpEndpoint },
    stdio: "inherit"
  });
  const result = await waitForExit(smoke);
  if (result.code !== 0) process.exitCode = result.code || 1;
} finally {
  await stop(chrome);
  await stop(server);
  await rm(profilePath, { recursive: true, force: true });
}

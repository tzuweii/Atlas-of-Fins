import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const INDEX_URL = new URL("../index.html", import.meta.url);
const REVISION = "20260805-sailfish";
const CONTENT_MODULES = [
  "./src/data.js",
  "./src/data/content-validation.js",
  "./src/data/fish-assets.js",
  "./src/data/fish-probabilities.js",
  "./src/data/journal-templates.js",
  "./src/data/monsoon-fish.js",
  "./src/data/monsoon-story.js",
  "./src/data/research.js"
];

test("the browser entry invalidates the complete sailfish content module set together", async () => {
  const html = await readFile(INDEX_URL, "utf8");
  const importMapSource = html.match(/<script type="importmap">\s*([\s\S]*?)\s*<\/script>/)?.[1];
  assert.ok(importMapSource, "index.html needs a content import map");
  const importMap = JSON.parse(importMapSource);

  assert.match(html, new RegExp(`data-ui-revision="${REVISION}"`));
  assert.match(html, new RegExp(`styles\\.css\\?rev=${REVISION}`));
  assert.match(html, new RegExp(`fishing-scenes\\.css\\?rev=${REVISION}`));
  assert.match(html, new RegExp(`src/game\\.js\\?rev=${REVISION}`));
  assert.deepEqual(Object.keys(importMap.imports), CONTENT_MODULES);
  for (const modulePath of CONTENT_MODULES) {
    assert.equal(importMap.imports[modulePath], `${modulePath}?rev=${REVISION}`);
  }
});

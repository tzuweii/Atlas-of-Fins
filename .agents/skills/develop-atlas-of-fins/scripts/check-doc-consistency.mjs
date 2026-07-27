#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const root = path.resolve(argumentValue("--root") || process.cwd());
const allDocs = process.argv.includes("--all-docs");
const requiredPlan = argumentValue("--require-plan");
const errors = [];
const requiredFiles = [
  "package.json",
  "README.md",
  "docs/README.md",
  "docs/GAME_DESIGN.md",
  "docs/MAIN_STORY.md",
  "docs/DEVELOPMENT_GUIDE.md",
  "docs/CURRENT.md",
  "docs/ASSET_LICENSES.md"
];

for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(root, relative))) errors.push(`missing live file: ${relative}`);
}

function read(relative) {
  try {
    return fs.readFileSync(path.join(root, relative), "utf8");
  } catch {
    return "";
  }
}

let packageData = null;
try {
  packageData = JSON.parse(read("package.json"));
} catch (error) {
  errors.push(`cannot parse package.json: ${error.message}`);
}

if (packageData?.name !== "atlas-of-fins") {
  errors.push(`expected package name atlas-of-fins, received ${String(packageData?.name)}`);
}

const version = packageData?.version;
const versionMatch = typeof version === "string" ? /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(version) : null;
if (!versionMatch) errors.push(`unsupported package version: ${String(version)}`);

if (versionMatch) {
  const expected = `v${version}`;
  const checks = [
    ["README.md", /目前版本為\s*`?(v[^`。\s]+)`?/],
    ["docs/CURRENT.md", /^> 程式版本：\s*`?(v[^`\s]+)`?/m],
    ["docs/ASSET_LICENSES.md", /^> 對應版本：\s*(v\S+)/m]
  ];
  for (const [relative, pattern] of checks) {
    const actual = pattern.exec(read(relative))?.[1];
    if (actual !== expected) errors.push(`${relative} version is ${actual || "missing"}; expected ${expected}`);
  }
}

if (requiredPlan) {
  const planMatch = /^v(\d+)\.(\d+)$/.exec(requiredPlan);
  if (!planMatch) {
    errors.push(`--require-plan expects vX.Y, received ${requiredPlan}`);
  } else {
    const plan = path.join("docs", "versions", requiredPlan, `V${planMatch[1]}_${planMatch[2]}_IMPLEMENTATION_PLAN.md`);
    if (!fs.existsSync(path.join(root, plan))) errors.push(`missing explicitly requested version plan: ${plan}`);
  }
}

const markdownFiles = [path.join(root, "README.md")];
const docsRoot = path.join(root, "docs");

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.isFile() && entry.name.endsWith(".md")) markdownFiles.push(absolute);
  }
}

try {
  if (allDocs) walk(docsRoot);
  else {
    for (const entry of fs.readdirSync(docsRoot, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".md")) markdownFiles.push(path.join(docsRoot, entry.name));
    }
  }
} catch (error) {
  errors.push(`cannot scan Markdown files: ${error.message}`);
}

for (const file of markdownFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const link of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let target = link[1].trim();
    if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    target = target.split("#")[0];
    if (!target) continue;
    try {
      target = decodeURIComponent(target);
    } catch {
      errors.push(`${path.relative(root, file)} has invalid encoded link: ${link[1]}`);
      continue;
    }
    if (!fs.existsSync(path.resolve(path.dirname(file), target))) {
      errors.push(`${path.relative(root, file)} has missing link target: ${link[1]}`);
    }
  }
}

if (errors.length) {
  console.error(`Atlas of Fins document consistency failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Atlas of Fins live documents are consistent: v${version}, ${markdownFiles.length} Markdown files checked${allDocs ? " (including history)" : ""}.`);

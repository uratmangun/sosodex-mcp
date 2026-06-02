#!/usr/bin/env node
/**
 * Record with a visible Chrome window (preview while recording).
 * webreel's `record` uses headless shell; this patches the runner once to honor
 * WEBREEL_HEADED=1, then invokes `webreel record`.
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ensureChatSubmitPatch,
  removeChatSubmitPatch,
} from "./patch-runner-chat-submit.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

function resolveRunnerPath() {
  const candidates = [
    resolve(root, "node_modules/webreel/dist/lib/runner.js"),
    resolve(
      root,
      "node_modules/.pnpm/webreel@0.1.4/node_modules/webreel/dist/lib/runner.js",
    ),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      return path;
    }
  }
  throw new Error("webreel runner.js not found — run pnpm install");
}

const runnerPath = resolveRunnerPath();

const ORIGINAL =
  "const chrome = await launchChrome({ headless: shouldRecord });";
const PATCHED =
  'const chrome = await launchChrome({ headless: shouldRecord && process.env.WEBREEL_HEADED !== "1" });';

function ensureRunnerPatch() {
  if (!existsSync(runnerPath)) {
    throw new Error(
      `webreel runner not found at ${runnerPath}. Run pnpm install first.`,
    );
  }
  const source = readFileSync(runnerPath, "utf8");
  if (source.includes("WEBREEL_HEADED")) {
    return false;
  }
  if (!source.includes(ORIGINAL)) {
    throw new Error(
      "webreel runner changed; update scripts/webreel/record-with-preview.mjs",
    );
  }
  writeFileSync(runnerPath, source.replace(ORIGINAL, PATCHED));
  return true;
}

function removeRunnerPatch() {
  if (!existsSync(runnerPath)) {
    return;
  }
  const source = readFileSync(runnerPath, "utf8");
  if (source.includes(PATCHED)) {
    writeFileSync(runnerPath, source.replace(PATCHED, ORIGINAL));
  }
}

const patchedHeaded = ensureRunnerPatch();
const patchedSubmit = ensureChatSubmitPatch();
const videoArgs = process.argv.slice(2);
const child = spawn(
  "pnpm",
  ["exec", "webreel", "record", ...videoArgs],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, WEBREEL_HEADED: "1" },
  },
);

let exiting = false;
function cleanup(code) {
  if (exiting) {
    return;
  }
  exiting = true;
  if (patchedHeaded) {
    removeRunnerPatch();
  }
  removeChatSubmitPatch();
  process.exit(code ?? 1);
}

child.on("error", (err) => {
  console.error(err);
  cleanup(1);
});

child.on("close", (code) => {
  cleanup(code === 0 ? 0 : code ?? 1);
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
});
process.on("SIGTERM", () => {
  child.kill("SIGTERM");
});

console.log(
  "Recording with visible Chrome (WEBREEL_HEADED=1). Close the window or wait for steps to finish.\n",
);

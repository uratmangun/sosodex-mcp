#!/usr/bin/env node
/**
 * Record with a visible Chrome window (preview while recording).
 * Patches runner for WEBREEL_HEADED + chat bridge, then invokes `webreel record`.
 */
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ensureChatSubmitPatch,
  ensureHeadedChromePatch,
  removeChatSubmitPatch,
} from "./patch-runner-chat-submit.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

const videoArgs = process.argv.slice(2);
ensureHeadedChromePatch();
ensureChatSubmitPatch();

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
  removeChatSubmitPatch();
  process.exit(code ?? 1);
}

child.on("error", (err) => {
  console.error(err);
  cleanup(1);
});

child.on("close", (code) => {
  const exitCode = typeof code === "number" ? code : 1;
  cleanup(exitCode);
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

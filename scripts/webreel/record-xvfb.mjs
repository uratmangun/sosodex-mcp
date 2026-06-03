#!/usr/bin/env node
/**
 * Record under Xvfb with Chrome for Testing (WEBREEL_HEADED).
 * Retries once if the output MP4 is suspiciously short (< 5s).
 */
import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ensureChatSubmitPatch,
  ensureHeadedChromePatch,
  removeChatSubmitPatch,
  removeHeadedChromePatch,
  resolveRunnerPath,
} from "./patch-runner-chat-submit.mjs";

const SUBMIT_MARKER = "__SOSODEX_CHAT_SUBMIT_PATCH__";
const HEADED_MARKER = "__SOSODEX_WEBREEL_HEADED_PATCH__";
const MIN_DURATION_SEC = 5;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

const videoArgs = process.argv.slice(2);
const videoName = videoArgs.find((a) => !a.startsWith("-")) ?? "sosovalue-tools-guest-demo";
const outputPath = resolve(root, "videos", `${videoName}.mp4`);

function unpatchRunner() {
  removeChatSubmitPatch();
}

function assertRunnerPatches() {
  const source = readFileSync(resolveRunnerPath(), "utf8");
  if (!source.includes(HEADED_MARKER)) {
    throw new Error("webreel headed patch missing — WEBREEL_HEADED will not apply");
  }
  if (!source.includes(SUBMIT_MARKER)) {
    throw new Error("webreel chat submit patch missing");
  }
}

function probeDurationSec(path) {
  if (!existsSync(path)) {
    return 0;
  }
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 ${JSON.stringify(path)}`,
      { encoding: "utf8" },
    );
    return Number.parseFloat(out.trim()) || 0;
  } catch {
    return 0;
  }
}

function applyPatches() {
  removeHeadedChromePatch();
  ensureHeadedChromePatch();
  ensureChatSubmitPatch();
  assertRunnerPatches();
}

function stopStaleChrome() {
  try {
    execSync("pkill -f webreel-chrome 2>/dev/null || true", { stdio: "ignore" });
  } catch {
    // ignore
  }
}

function runOnce() {
  stopStaleChrome();
  applyPatches();
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      "xvfb-run",
      [
        "-a",
        "-s",
        "1280x800x24",
        "env",
        "WEBREEL_HEADED=1",
        "pnpm",
        "exec",
        "webreel",
        "record",
        ...videoArgs,
      ],
      { cwd: root, stdio: "inherit" },
    );

    child.on("error", reject);
    child.on("close", (code) => {
      resolvePromise(code ?? 1);
    });
  });
}

async function main() {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      console.warn(
        `\nRecording was shorter than ${MIN_DURATION_SEC}s — retrying (${attempt}/${maxAttempts})…\n`,
      );
    } else {
      console.log(
        "Recording under Xvfb (Chrome for Testing, WEBREEL_HEADED=1).\n",
      );
    }

    const code = await runOnce();
    const duration = probeDurationSec(outputPath);
    const ok = duration >= MIN_DURATION_SEC;

    if (ok) {
      if (code !== 0) {
        console.warn(
          `Recording completed (${duration.toFixed(2)}s) but webreel exited with code ${code}.`,
        );
      }
      unpatchRunner();
      process.exit(0);
    }

    if (attempt === maxAttempts) {
      console.error(
        `Recording failed or too short (${duration.toFixed(2)}s, exit ${code}).`,
      );
      unpatchRunner();
      process.exit(code === 0 ? 1 : code);
    }
  }
}

main().catch((err) => {
  console.error(err);
  unpatchRunner();
  process.exit(1);
});

process.on("SIGINT", () => {
  unpatchRunner();
  process.exit(130);
});

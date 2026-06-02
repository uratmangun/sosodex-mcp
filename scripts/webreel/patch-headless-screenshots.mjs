#!/usr/bin/env node
/**
 * Patch webreel so screenshot steps work during headless record (pause capture loop first).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

function resolveFirst(candidates) {
  for (const path of candidates) {
    if (existsSync(path)) {
      return path;
    }
  }
  throw new Error(`Not found:\n${candidates.join("\n")}`);
}

const requireFromWebreel = createRequire(
  resolve(root, "node_modules/webreel/package.json"),
);

const recorderPath = resolveFirst([
  (() => {
    try {
      return requireFromWebreel.resolve("@webreel/core/dist/recorder.js");
    } catch {
      return "";
    }
  })(),
  resolve(
    root,
    "node_modules/.pnpm/@webreel+core@0.1.4/node_modules/@webreel/core/dist/recorder.js",
  ),
]);

const runnerPath = resolveFirst([
  (() => {
    try {
      return requireFromWebreel.resolve("webreel/dist/lib/runner.js");
    } catch {
      return "";
    }
  })(),
  resolve(
    root,
    "node_modules/.pnpm/webreel@0.1.4/node_modules/webreel/dist/lib/runner.js",
  ),
]);

const RECORDER_MARKER = "pauseForExternalScreenshot";
const RUNNER_MARKER = "pauseForExternalScreenshot()";

function patchRecorder(source) {
  if (source.includes(RECORDER_MARKER)) {
    return source;
  }
  let next = source.replace(
    "stoppedPromise = null;",
    "stoppedPromise = null;\n    screenshotPause = false;",
  );
  next = next.replace(
    "while (this.running) {",
    `while (this.running) {
            if (this.screenshotPause) {
                await new Promise((r) => setTimeout(r, 20));
                continue;
            }`,
  );
  next = next.replace(
    "getTempVideoPath() {",
    `async pauseForExternalScreenshot() {
        this.screenshotPause = true;
        await new Promise((r) => setTimeout(r, 150));
    }
    resumeAfterExternalScreenshot() {
        this.screenshotPause = false;
    }
    getTempVideoPath() {`,
  );
  if (!next.includes(RECORDER_MARKER)) {
    throw new Error("Failed to patch @webreel/core recorder.js");
  }
  return next;
}

function patchRunner(source) {
  if (source.includes(RUNNER_MARKER)) {
    return source;
  }
  const oldBlock = `case "screenshot": {
                        await captureScreenshot(client, resolve(configDir, step.output));
                        break;
                    }`;
  const newBlock = `case "screenshot": {
                        if (recorder) {
                            await recorder.pauseForExternalScreenshot();
                        }
                        try {
                            await captureScreenshot(client, resolve(configDir, step.output));
                        }
                        finally {
                            if (recorder) {
                                recorder.resumeAfterExternalScreenshot();
                            }
                        }
                        break;
                    }`;
  if (!source.includes(oldBlock)) {
    throw new Error("Failed to patch webreel runner.js (screenshot case changed)");
  }
  return source.replace(oldBlock, newBlock);
}

writeFileSync(recorderPath, patchRecorder(readFileSync(recorderPath, "utf8")));
writeFileSync(runnerPath, patchRunner(readFileSync(runnerPath, "utf8")));
console.log("Patched webreel for headless screenshots.");
console.log(`  recorder: ${recorderPath}`);
console.log(`  runner:   ${runnerPath}`);

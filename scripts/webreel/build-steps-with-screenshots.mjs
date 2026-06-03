#!/usr/bin/env node
/**
 * Headed record: expand base steps with settle/scroll waits + PNG screenshots.
 */
import { mkdirSync } from "node:fs";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expandGuestSteps } from "./expand-guest-steps.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const basePath = resolve(__dirname, "sosovalue-guest-steps.base.json");
const outPath = resolve(__dirname, "sosovalue-guest-steps.json");
const screenshotDir = "screenshot";

const base = JSON.parse(readFileSync(basePath, "utf8"));
const { steps, captureIndex } = expandGuestSteps(base, {
  screenshots: true,
  screenshotDir,
});

mkdirSync(resolve(root, screenshotDir), { recursive: true });

writeFileSync(outPath, `${JSON.stringify({ steps }, null, 2)}\n`, "utf8");

console.log(
  `Wrote ${outPath} (${base.steps.length} base actions → ${steps.length} steps, ${captureIndex} screenshots → ${screenshotDir}/)`,
);

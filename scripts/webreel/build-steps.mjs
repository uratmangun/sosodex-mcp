#!/usr/bin/env node
/**
 * Headless prod record: same milestone timing as headed demo, no screenshot steps.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expandGuestSteps } from "./expand-guest-steps.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const basePath = resolve(__dirname, "sosovalue-guest-steps.base.json");
const outPath = resolve(__dirname, "sosovalue-guest-steps.json");

const base = JSON.parse(readFileSync(basePath, "utf8"));
const { steps } = expandGuestSteps(base, { screenshots: false });

writeFileSync(outPath, `${JSON.stringify({ steps }, null, 2)}\n`, "utf8");

console.log(
  `Wrote ${outPath} (${base.steps.length} base actions → ${steps.length} steps, no screenshots)`,
);

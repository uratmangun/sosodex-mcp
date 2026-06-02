#!/usr/bin/env node
/**
 * Writes sosovalue-guest-steps.json from base (no screenshot steps).
 * Screenshot steps deadlock headless webreel record — use build-steps-with-screenshots + preview only.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const basePath = resolve(__dirname, "sosovalue-guest-steps.base.json");
const outPath = resolve(__dirname, "sosovalue-guest-steps.json");

const base = readFileSync(basePath, "utf8");
writeFileSync(outPath, base.endsWith("\n") ? base : `${base}\n`, "utf8");

const { steps } = JSON.parse(base);
console.log(`Wrote ${outPath} (${steps.length} steps, no screenshots)`);

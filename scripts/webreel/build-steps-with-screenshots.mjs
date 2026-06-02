#!/usr/bin/env node
/**
 * Expands sosovalue-guest-steps.base.json with screenshot steps at milestones.
 * Use with patch-headless-screenshots.mjs before headless record.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const basePath = resolve(__dirname, "sosovalue-guest-steps.base.json");
const outPath = resolve(__dirname, "sosovalue-guest-steps.json");
const screenshotDir = "screenshot";

function slug(step, index) {
  const raw = step.description ?? step.label ?? step.action;
  const s = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || `step-${index}`;
}

function shouldCaptureAfter(step) {
  if (step.action === "screenshot") {
    return false;
  }
  if (step.action === "wait" && step.description?.includes("response done")) {
    return true;
  }
  if (
    step.description === "Chat ready for demo" ||
    step.description?.includes("Ready for search-crypto prompt")
  ) {
    return true;
  }
  if (step.description === "End") {
    return true;
  }
  return false;
}

function screenshotStep(index, step) {
  const name = `${String(index).padStart(2, "0")}-${slug(step, index)}.png`;
  return {
    action: "screenshot",
    output: `${screenshotDir}/${name}`,
    description: `Capture: ${step.description ?? step.label ?? step.action}`,
    delay: 600,
  };
}

/** After response done: stable layout + scroll to bottom, then capture. */
function stepsBeforeResponseScreenshot(step) {
  if (!step.description?.includes("response done")) {
    return [];
  }
  const steps = [
    {
      action: "pause",
      ms: 600,
      description: `Settle UI: ${step.description}`,
    },
  ];

  if (!step.description?.includes("show-crypto-chart")) {
    steps.push({
      action: "wait",
      selector: "[data-testid=chat-turn-has-summary]",
      timeout: 180000,
      description: "Assistant summary text visible",
    });
  } else {
    steps.push({
      action: "wait",
      selector: "[data-testid=tool-widget-ready-show-crypto-chart]",
      timeout: 180000,
      description: "Crypto chart widget painted",
    });
  }

  steps.push(
    {
      action: "wait",
      selector: "[data-testid=chat-turn-capture-ready]",
      timeout: 180000,
      description: "Scrolled to bottom, layout stable",
    },
    {
      action: "moveTo",
      selector: "[data-testid=chat-response-bottom]",
      description: "Scroll chat to bottom anchor",
    },
    {
      action: "scroll",
      selector: "[data-testid=chat-scroll-viewport]",
      y: 50_000,
      description: "Ensure chat viewport at bottom",
    },
    { action: "pause", ms: 600 },
  );

  return steps;
}

const base = JSON.parse(readFileSync(basePath, "utf8"));
const steps = [];
let captureIndex = 0;

for (const step of base.steps) {
  steps.push(step);
  if (shouldCaptureAfter(step)) {
    captureIndex += 1;
    steps.push(...stepsBeforeResponseScreenshot(step));
    steps.push(screenshotStep(captureIndex, step));
  }
}

writeFileSync(
  outPath,
  `${JSON.stringify({ steps }, null, 2)}\n`,
  "utf8",
);

console.log(
  `Wrote ${outPath} (${base.steps.length} actions + ${captureIndex} screenshots → ${screenshotDir}/)`,
);

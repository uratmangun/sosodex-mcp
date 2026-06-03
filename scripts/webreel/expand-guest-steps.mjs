/**
 * Expands sosovalue-guest-steps.base.json with milestone timing steps.
 * Headed: optional PNG screenshots. Headless: same waits/scroll, no screenshots.
 */

export function slug(step, index) {
  const raw = step.description ?? step.label ?? step.action;
  const s = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || `step-${index}`;
}

function shouldScreenshotAfter(step) {
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

function screenshotStep(index, step, screenshotDir) {
  const name = `${String(index).padStart(2, "0")}-${slug(step, index)}.png`;
  return {
    action: "screenshot",
    output: `${screenshotDir}/${name}`,
    description: `Capture: ${step.description ?? step.label ?? step.action}`,
    delay: 600,
  };
}

const HEADLESS_HOLD_AFTER_RESPONSE_MS = 10_000;
const CHAT_INPUT_SELECTOR = "[data-testid=chat-input]";

/** One type step per word (cumulative text) for visible typing in recordings. */
export function expandChatInputType(step) {
  if (step.action !== "type" || step.selector !== CHAT_INPUT_SELECTOR) {
    return [step];
  }

  const words = String(step.text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= 1) {
    return [step];
  }

  const baseLabel = step.label ?? step.description ?? "prompt";
  return words.map((_, index) => {
    const cumulative = words.slice(0, index + 1).join(" ");
    const isLast = index === words.length - 1;
    return {
      ...step,
      text: cumulative,
      label: isLast ? step.label : `${baseLabel} (word ${index + 1})`,
      description: isLast
        ? step.description
        : `${step.description ?? baseLabel}: word ${index + 1}/${words.length}`,
      delay: step.delay ?? 300,
    };
  });
}

/** After response done: settle UI, wait for content, scroll chat to bottom. */
export function stepsAfterResponseDone(step, { waitCaptureReady = true } = {}) {
  if (!step.description?.includes("response done")) {
    return [];
  }

  const steps = [];

  if (!waitCaptureReady) {
    steps.push({
      action: "pause",
      ms: HEADLESS_HOLD_AFTER_RESPONSE_MS,
      description: `Hold on ${step.description} before next prompt`,
    });
  }

  steps.push({
    action: "pause",
    ms: 600,
    description: `Settle UI: ${step.description}`,
  });

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

  if (waitCaptureReady) {
    steps.push({
      action: "wait",
      selector: "[data-testid=chat-turn-capture-ready]",
      timeout: 180000,
      description: "Scrolled to bottom, layout stable",
    });
  } else {
    steps.push({
      action: "pause",
      ms: 800,
      description: "Headless: layout settle after scroll (no capture-ready marker)",
    });
  }

  return steps;
}

/** @param {{ steps: object[] }} base */
export function expandGuestSteps(base, options = {}) {
  const { screenshots = false, screenshotDir = "screenshot" } = options;
  const steps = [];
  let captureIndex = 0;

  for (const step of base.steps) {
    if (step.action === "type" && step.selector === CHAT_INPUT_SELECTOR) {
      steps.push(...expandChatInputType(step));
      continue;
    }

    steps.push(step);

    if (step.action === "wait" && step.description?.includes("response done")) {
      steps.push(
        ...stepsAfterResponseDone(step, {
          waitCaptureReady: screenshots,
        }),
      );
      if (screenshots) {
        captureIndex += 1;
        steps.push(screenshotStep(captureIndex, step, screenshotDir));
      }
      continue;
    }

    if (screenshots && shouldScreenshotAfter(step)) {
      captureIndex += 1;
      steps.push(screenshotStep(captureIndex, step, screenshotDir));
    }
  }

  return { steps, captureIndex };
}

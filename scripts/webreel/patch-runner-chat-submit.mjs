#!/usr/bin/env node
/**
 * Patches webreel runner for React controlled chat input via window bridge
 * (__webreelSetChatInput / __webreelSendChat) defined when ?webreel=1.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

const SUBMIT_MARKER = "__SOSODEX_CHAT_SUBMIT_PATCH__";
const TYPE_MARKER = "__SOSODEX_CHAT_TYPE_PATCH__";
const SCROLL_MARKER = "__SOSODEX_CHAT_SCROLL_PATCH__";
const HEADED_MARKER = "__SOSODEX_WEBREEL_HEADED_PATCH__";

const HEADED_ORIGINAL =
  "const chrome = await launchChrome({ headless: shouldRecord });";
const HEADED_PATCHED = `const chrome = await launchChrome({ headless: shouldRecord && process.env.WEBREEL_HEADED !== "1" }); // ${HEADED_MARKER}`;

const SCROLL_CHAT_EVAL = `(() => {
  const scroll = window.__webreelScrollChatToBottom;
  if (typeof scroll === "function") {
    scroll();
    return;
  }
  const inner = document.querySelector("[data-testid=chat-scroll-viewport]");
  const parent = inner?.parentElement;
  const viewport =
    parent instanceof HTMLElement &&
    ["auto", "scroll"].includes(getComputedStyle(parent).overflowY)
      ? parent
      : inner;
  if (viewport instanceof HTMLElement) {
    viewport.scrollTop = viewport.scrollHeight;
  }
})()`;

const SEND_CHAT_EVAL = `(() => {
  const send = window.__webreelSendChat;
  if (typeof send !== "function") {
    throw new Error("__webreelSendChat is not available (use ?webreel=1)");
  }
  if (!send()) {
    throw new Error("__webreelSendChat rejected (empty input or chat busy)");
  }
  const setInput = window.__webreelSetChatInput;
  if (typeof setInput === "function") {
    setInput("");
  } else {
    const textarea = document.querySelector("[data-testid=chat-input]");
    if (textarea instanceof HTMLTextAreaElement) {
      textarea.value = "";
      textarea.dispatchEvent(
        new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }),
      );
    }
  }
})()`;

export function resolveRunnerPath() {
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

const CLICK_PATCH = `                    case "click": {
                        if (step.selector === "[data-testid=chat-submit]") { // ${SUBMIT_MARKER}
                            const box = await resolveTarget(client, step);
                            const { x: cx, y: cy } = randomPointInBox(box);
                            await moveCursorTo(ctx, client, cx, cy);
                            await pause(120);
                            await client.Runtime.evaluate({
                                expression: ${JSON.stringify(SEND_CHAT_EVAL)},
                            });
                            await pause(step.delay ?? 400);
                            break;
                        }`;

const TYPE_PATCH = `                    case "type": {
                        if (step.selector === "[data-testid=chat-input]") { // ${TYPE_MARKER}
                            await client.Runtime.evaluate({
                                expression: \`(() => {
  const value = \${JSON.stringify(step.text)};
  const setInput = window.__webreelSetChatInput;
  if (typeof setInput === "function") {
    setInput(value);
    return;
  }
  const textarea = document.querySelector("[data-testid=chat-input]");
  if (!textarea) throw new Error("chat-input type: not found");
  textarea.focus();
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  if (setter) {
    setter.call(textarea, value);
    textarea.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "insertFromPaste", data: value }),
    );
  } else {
    textarea.value = value;
  }
})()\`,
                            });
                            ctx.markEvent("key");
                            await pause(step.delay ?? 300);
                            break;
                        }`;

/** Headed Chrome for frame capture (chrome-headless-shell often records 0 frames). */
export function ensureHeadedChromePatch() {
  const runnerPath = resolveRunnerPath();
  let source = readFileSync(runnerPath, "utf8");
  if (source.includes(HEADED_MARKER)) {
    return false;
  }
  if (!source.includes(HEADED_ORIGINAL)) {
    throw new Error(
      "webreel runner launchChrome line changed; update patch-runner-chat-submit.mjs",
    );
  }
  writeFileSync(runnerPath, source.replace(HEADED_ORIGINAL, HEADED_PATCHED));
  return true;
}

export function removeHeadedChromePatch() {
  const runnerPath = resolveRunnerPath();
  let source = readFileSync(runnerPath, "utf8");
  if (source.includes(HEADED_PATCHED)) {
    writeFileSync(runnerPath, source.replace(HEADED_PATCHED, HEADED_ORIGINAL));
    return true;
  }
  return false;
}

export function ensureChatSubmitPatch() {
  const runnerPath = resolveRunnerPath();
  let source = readFileSync(runnerPath, "utf8");
  let changed = false;

  if (!source.includes(SUBMIT_MARKER)) {
    const clickAnchor = `                    case "click": {
                        const box = await resolveTarget(client, step);`;
    if (!source.includes(clickAnchor)) {
      throw new Error(
        "webreel runner click case changed; update patch-runner-chat-submit.mjs",
      );
    }
    source = source.replace(clickAnchor, `${CLICK_PATCH}
                        const box = await resolveTarget(client, step);`);
    changed = true;
  }

  if (!source.includes(TYPE_MARKER)) {
    const typeAnchor = `                    case "type": {
                        if (step.selector) {`;
    if (!source.includes(typeAnchor)) {
      throw new Error(
        "webreel runner type case changed; update patch-runner-chat-submit.mjs",
      );
    }
    source = source.replace(typeAnchor, `${TYPE_PATCH}
                        if (step.selector) {`);
    changed = true;
  }

  if (!source.includes(SCROLL_MARKER)) {
    const scrollAnchor = `                    case "scroll": {
                        const scrollX = step.x ?? 0;`;
    if (!source.includes(scrollAnchor)) {
      throw new Error(
        "webreel runner scroll case changed; update patch-runner-chat-submit.mjs",
      );
    }
    source = source.replace(
      scrollAnchor,
      `                    case "scroll": { // ${SCROLL_MARKER}
                        if (step.selector === "[data-testid=chat-scroll-viewport]") {
                            await client.Runtime.evaluate({
                                expression: ${JSON.stringify(SCROLL_CHAT_EVAL)},
                            });
                            await pause(step.delay ?? 500);
                            break;
                        }
                        const scrollX = step.x ?? 0;`,
    );
    changed = true;
  }

  if (changed) {
    writeFileSync(runnerPath, source);
  }
  return changed;
}

export function removeChatSubmitPatch() {
  const runnerPath = resolveRunnerPath();
  let source = readFileSync(runnerPath, "utf8");
  let changed = false;

  if (source.includes(SUBMIT_MARKER)) {
    source = source.replace(
      new RegExp(
        `                    case "click": \\{\\n                        if \\(step\\.selector === "\\[data-testid=chat-submit\\]"\\) \\{ // ${SUBMIT_MARKER}[\\s\\S]*?break;\\n                        \\}\\n`,
      ),
      `                    case "click": {
`,
    );
    changed = true;
  }

  if (source.includes(TYPE_MARKER)) {
    source = source.replace(
      new RegExp(
        `                    case "type": \\{\\n                        if \\(step\\.selector === "\\[data-testid=chat-input\\]"\\) \\{ // ${TYPE_MARKER}[\\s\\S]*?break;\\n                        \\}\\n`,
      ),
      `                    case "type": {
`,
    );
    changed = true;
  }

  if (source.includes(SCROLL_MARKER)) {
    source = source.replace(
      new RegExp(
        `                    case "scroll": \\{ // ${SCROLL_MARKER}[\\s\\S]*?const scrollX = step\\.x ?? 0;`,
      ),
      `                    case "scroll": {
                        const scrollX = step.x ?? 0;`,
    );
    changed = true;
  }

  if (changed) {
    writeFileSync(runnerPath, source);
  }
}

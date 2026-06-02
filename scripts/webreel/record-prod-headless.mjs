#!/usr/bin/env node
/**
 * Build production app, serve standalone on :3000, run webreel record.
 * Pass --headed for visible Chrome (recommended when using screenshot steps).
 */
import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  startStandaloneServer,
  waitForServer,
} from "./start-standalone-prod.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const cliArgs = process.argv.slice(2);
const videoName =
  cliArgs.find((a) => !a.startsWith("-")) ?? "sosovalue-tools-guest-demo";
const verbose = cliArgs.includes("--verbose");
const skipBuild = cliArgs.includes("--skip-build");
const headed = cliArgs.includes("--headed");
const port = process.env.PORT ?? "3000";

function run(command, args, opts = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: opts.stdio ?? "inherit",
      env: { ...process.env, PORT: port, ...opts.env },
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 || opts.allowNonZero) {
        resolvePromise(child);
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

let server = null;

async function cleanScreenshotDir() {
  await run("node", ["scripts/webreel/clean-screenshots.mjs"], { stdio: "inherit" });
}

async function main() {
  await cleanScreenshotDir();

  if (!skipBuild) {
    console.log("Building production app…\n");
    await run("pnpm", ["run", "build"]);
  } else {
    console.log("Skipping build (--skip-build).\n");
  }

  console.log(`Starting standalone production server on port ${port}…\n`);
  const started = startStandaloneServer();
  server = started.child;
  await waitForServer(started.baseUrl);

  if (headed) {
    console.log("\nGenerating steps with screenshots (headed)…\n");
    await run("node", ["scripts/webreel/build-steps-with-screenshots.mjs"]);
  } else {
    console.log("\nGenerating steps without screenshots (headless)…\n");
    await run("node", ["scripts/webreel/build-steps.mjs"]);
  }

  if (headed) {
    console.log(
      `\nRecording (visible Chrome) against ${started.baseUrl}…\n`,
    );
    await run("node", [
      "scripts/webreel/record-with-preview.mjs",
      videoName,
      ...(verbose ? ["--verbose"] : []),
    ]);
  } else {
    const recordArgs = [
      "exec",
      "webreel",
      "record",
      videoName,
      ...(verbose ? ["--verbose"] : []),
    ];
    console.log(`\nRecording (headless) against ${started.baseUrl}…\n`);
    await run("pnpm", recordArgs);
  }
}

function stopServer() {
  if (server && !server.killed) {
    server.kill("SIGTERM");
  }
}

process.on("SIGINT", () => {
  stopServer();
  process.exit(130);
});
process.on("SIGTERM", () => {
  stopServer();
  process.exit(143);
});

main()
  .then(() => {
    console.log("\nProduction recording finished.\n");
    stopServer();
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    stopServer();
    process.exit(1);
  });

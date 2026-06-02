/**
 * Dev entrypoint: run from sosodex-mcp with a clean NODE_PATH (fnm sets a global path
 * that breaks Tailwind resolution in multi-folder workspaces).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

process.chdir(projectRoot);

const env = { ...process.env };
delete env.NODE_PATH;
env.PWD = projectRoot;

function run(command, args) {
  return spawn(command, args, {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  });
}

const xmcp = run("pnpm", ["exec", "xmcp", "dev"]);
// Turbopack resolves `@import "tailwindcss"` from the parent workspace folder in Cursor multi-root setups.
const next = run("pnpm", ["exec", "next", "dev", "--webpack"]);

function shutdown() {
  xmcp.kill("SIGTERM");
  next.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

xmcp.on("exit", (code) => {
  if (code && code !== 0) shutdown();
});
next.on("exit", (code) => {
  if (code && code !== 0) shutdown();
});

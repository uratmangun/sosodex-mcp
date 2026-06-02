#!/usr/bin/env node
/**
 * Prepare and start Next.js standalone production server (local demo / record).
 */
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

function loadEnvFile(filePath) {
  const env = {};
  if (!existsSync(filePath)) {
    return env;
  }
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

export function loadProjectEnv(port) {
  const localEnv = loadEnvFile(resolve(root, ".env.local"));
  const localOrigin = `http://localhost:${port}`;
  const mcpChatUrl = `http://127.0.0.1:${port}/mcp`;
  return {
    ...localEnv,
    NODE_ENV: "production",
    PORT: port,
    HOSTNAME: "127.0.0.1",
    BETTER_AUTH_URL: localEnv.BETTER_AUTH_URL ?? localOrigin,
    NEXT_PUBLIC_APP_URL: localEnv.NEXT_PUBLIC_APP_URL ?? localOrigin,
    NEXT_PUBLIC_GPT_APP_ORIGIN:
      localEnv.NEXT_PUBLIC_GPT_APP_ORIGIN ?? localOrigin,
    NEXT_PUBLIC_MCP_APP_ORIGIN:
      localEnv.NEXT_PUBLIC_MCP_APP_ORIGIN ?? localOrigin,
    MCP_CHAT_URL: localEnv.MCP_CHAT_URL ?? mcpChatUrl,
  };
}
const standaloneDir = resolve(root, ".next/standalone");
const port = process.env.PORT ?? "3000";

function syncStandaloneAssets() {
  if (!existsSync(resolve(standaloneDir, "server.js"))) {
    throw new Error("Missing .next/standalone/server.js — run pnpm run build first.");
  }
  const staticSrc = resolve(root, ".next/static");
  const staticDest = resolve(standaloneDir, ".next/static");
  if (existsSync(staticSrc)) {
    mkdirSync(resolve(standaloneDir, ".next"), { recursive: true });
    cpSync(staticSrc, staticDest, { recursive: true });
  }
  const publicSrc = resolve(root, "public");
  const publicDest = resolve(standaloneDir, "public");
  if (existsSync(publicSrc)) {
    cpSync(publicSrc, publicDest, { recursive: true });
  }
  const clientSrc = resolve(root, "dist/client");
  const clientDest = resolve(standaloneDir, "dist/client");
  if (existsSync(clientSrc)) {
    mkdirSync(resolve(standaloneDir, "dist"), { recursive: true });
    cpSync(clientSrc, clientDest, { recursive: true });
  }
  const envLocal = resolve(root, ".env.local");
  if (existsSync(envLocal)) {
    cpSync(envLocal, resolve(standaloneDir, ".env.local"));
  }
}

export async function waitForServer(baseUrl, maxMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${baseUrl}/`);
      if (res.ok) {
        return;
      }
    } catch {
      // still booting
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server not ready at ${baseUrl} within ${maxMs}ms`);
}

export function startStandaloneServer() {
  syncStandaloneAssets();
  const baseUrl = `http://localhost:${port}`;
  const child = spawn("node", ["server.js"], {
    cwd: standaloneDir,
    stdio: "inherit",
    env: {
      ...process.env,
      ...loadProjectEnv(port),
    },
  });
  return { child, baseUrl };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { child, baseUrl } = startStandaloneServer();
  waitForServer(baseUrl)
    .then(() => {
      console.log(`Production server ready at ${baseUrl}`);
    })
    .catch((err) => {
      console.error(err);
      child.kill("SIGTERM");
      process.exit(1);
    });
  process.on("SIGINT", () => {
    child.kill("SIGTERM");
    process.exit(130);
  });
}

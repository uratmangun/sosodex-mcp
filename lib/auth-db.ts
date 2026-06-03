import "server-only";

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const DEFAULT_DEV_DATABASE_PATH = "./data/google-map-test.sqlite";
const BUILD_DATABASE_PATH = "./.next/cache/google-map-test-build.sqlite";

let db: Database.Database | null = null;

function isLocalAppUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

/** Auth base URL for OAuth callbacks. Honors BETTER_AUTH_URL for local production (`pnpm start`). */
export function getAppUrl(): string {
  const candidates = [
    process.env.BETTER_AUTH_URL,
    process.env.APP_URL,
    process.env.PRODUCTION_APP_URL,
    process.env.NEXT_PUBLIC_GPT_APP_ORIGIN,
    process.env.NEXT_PUBLIC_MCP_APP_ORIGIN,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  const explicitAuthUrl = process.env.BETTER_AUTH_URL?.trim();
  if (explicitAuthUrl) {
    return explicitAuthUrl.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    const publicUrl = candidates.find((url) => !isLocalAppUrl(url));
    if (publicUrl) return publicUrl.replace(/\/$/, "");
    return "https://sosodex.uratmangun.ovh";
  }

  const configured = candidates.find((url) => !isLocalAppUrl(url)) ?? candidates[0];
  return (configured ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Origins allowed for Better Auth (browser may use localhost or 127.0.0.1). */
export function getTrustedOrigins(): string[] {
  const origins = new Set<string>([getAppUrl()]);
  const mcpOrigin = process.env.NEXT_PUBLIC_MCP_APP_ORIGIN?.trim();
  if (mcpOrigin) origins.add(mcpOrigin.replace(/\/$/, ""));
  if (isLocalAppUrl(getAppUrl())) {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }
  return [...origins];
}

export function getAuthSecret(): string {
  const secret =
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Missing BETTER_AUTH_SECRET (or AUTH_SECRET). Add one to .env.local.",
    );
  }
  return secret;
}

export function getGoogleOAuthCredentials() {
  const clientId =
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.AUTH_GOOGLE_ID?.trim();
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.AUTH_GOOGLE_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (OAuth Web client).",
    );
  }
  return { clientId, clientSecret };
}

export function getDatabasePath(): string {
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    return resolve(BUILD_DATABASE_PATH);
  }
  const configured =
    process.env.DATABASE_PATH?.trim() || DEFAULT_DEV_DATABASE_PATH;
  if (configured === ":memory:") return configured;
  return resolve(configured);
}

export function getAuthDatabase(): Database.Database {
  if (db) return db;
  const path = getDatabasePath();
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  db = new Database(path);
  db.pragma("foreign_keys = ON");
  if (path !== ":memory:") {
    db.pragma("journal_mode = WAL");
  }
  return db;
}

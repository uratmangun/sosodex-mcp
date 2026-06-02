/**
 * After xmcp build, write dist/client bundle filenames into lib/mcp/ui-resources.ts.
 */
import fs from "node:fs";
import path from "node:path";

const clientDir = path.join(process.cwd(), "dist/client");
const uiResourcesPath = path.join(process.cwd(), "lib/mcp/ui-resources.ts");

const TOOL_PREFIXES = [
  "src_tools_show-crypto-chart_",
  "src_tools_show-etf-inflows_",
  "src_tools_show-index-snapshot_",
];

if (!fs.existsSync(clientDir)) {
  console.warn("[sync-ui-bundles] dist/client missing — run xmcp build first.");
  process.exit(0);
}

const bundles = fs
  .readdirSync(clientDir)
  .filter((f) => f.endsWith(".bundle.js"));

const byPrefix = new Map();
for (const prefix of TOOL_PREFIXES) {
  const match = bundles.find((f) => f.startsWith(prefix));
  if (match) byPrefix.set(prefix, match);
}

if (byPrefix.size !== TOOL_PREFIXES.length) {
  console.warn(
    "[sync-ui-bundles] Expected 3 widget bundles, found:",
    [...byPrefix.values()],
  );
}

let source = fs.readFileSync(uiResourcesPath, "utf8");
for (const [prefix, file] of byPrefix) {
  const re = new RegExp(`${prefix}[A-Za-z0-9_]+\\.bundle\\.js`, "g");
  source = source.replace(re, file);
}

fs.writeFileSync(uiResourcesPath, source);
console.log("[sync-ui-bundles] Updated lib/mcp/ui-resources.ts");

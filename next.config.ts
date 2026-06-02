import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

/** Next must resolve Tailwind/PostCSS from this app, not the parent CascadeProjects folder. */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      tailwindcss: path.join(projectRoot, "node_modules/tailwindcss"),
      "tw-animate-css": path.join(projectRoot, "node_modules/tw-animate-css"),
      shadcn: path.join(projectRoot, "node_modules/shadcn"),
    },
  },
  outputFileTracingRoot: projectRoot,
  output: "standalone",
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
  skipTrailingSlashRedirect: true,
};

export default nextConfig;

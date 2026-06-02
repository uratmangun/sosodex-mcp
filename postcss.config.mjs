import path from "node:path";
import { fileURLToPath } from "node:url";

/** App root — not the parent CascadeProjects folder (multi-root workspace cwd). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: projectRoot,
    },
  },
};

export default config;

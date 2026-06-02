import { type ToolMetadata } from "xmcp";

import { listIndices } from "@/lib/sosovalue/client";
import { toErrorToolResult, toToonToolResult } from "@/lib/sosovalue/tool-result";

export const schema = {};

export const metadata: ToolMetadata = {
  name: "list-indices",
  description:
    "List available SoSoValue Index tickers. Pair with show-index-snapshot for MAG7, DEFI, etc.",
  annotations: {
    title: "List indices",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export default async function listIndicesTool() {
  try {
    const indices = await listIndices();
    return toToonToolResult({
      count: indices.length,
      indices: indices.slice(0, 50),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "List indices request failed.";
    return toErrorToolResult(message);
  }
}

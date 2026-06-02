import { type ToolMetadata } from "xmcp";

import { getMarketOverview } from "@/lib/sosovalue/client";
import { toErrorToolResult, toToonToolResult } from "@/lib/sosovalue/tool-result";

export const schema = {};

export const metadata: ToolMetadata = {
  name: "get-market-overview",
  description:
    "Aggregate SoSoValue market overview (/market/overview). Sentinel / SoSoMon dashboard pattern.",
  annotations: {
    title: "Market overview",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export default async function getMarketOverviewTool() {
  try {
    const overview = await getMarketOverview();
    return toToonToolResult({ overview });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Market overview request failed.";
    return toErrorToolResult(message);
  }
}

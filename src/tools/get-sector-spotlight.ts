import { type InferSchema, type ToolMetadata } from "xmcp";
import { z } from "zod";

import { getSectorSpotlight } from "@/lib/sosovalue/client";
import { toErrorToolResult, toToonToolResult } from "@/lib/sosovalue/tool-result";

export const schema = {
  currencyId: z
    .string()
    .optional()
    .describe("Optional SoSoValue currency id to scope sector rows (ETF Pulse pattern)"),
};

export const metadata: ToolMetadata = {
  name: "get-sector-spotlight",
  description:
    "Sector performance spotlight (/currencies/sector-spotlight). ETF Pulse / MarketMind regime feeds.",
  annotations: {
    title: "Sector spotlight",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export default async function getSectorSpotlightTool({
  currencyId,
}: InferSchema<typeof schema>) {
  try {
    const data = await getSectorSpotlight({
      currencyId: currencyId?.trim() || undefined,
    });
    return toToonToolResult({ sectorSpotlight: data });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Sector spotlight request failed.";
    return toErrorToolResult(message);
  }
}

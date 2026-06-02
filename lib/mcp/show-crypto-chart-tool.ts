import { type ToolMetadata } from "xmcp";
import { z } from "zod";

import { publicOrigin } from "./widget-csp";

export const schema = {
  currencyId: z
    .string()
    .min(1)
    .describe("Currency id from search-crypto (currency.id)"),
  symbol: z
    .string()
    .min(1)
    .describe("Ticker symbol from search-crypto (currency.symbol)"),
  limit: z
    .number()
    .int()
    .min(5)
    .max(90)
    .optional()
    .describe("Number of daily klines (default 30, max 90)"),
};

export const outputSchema = {
  currencyId: z.string(),
  symbol: z.string(),
  profileUrl: z.string().url(),
  klines: z.array(
    z.object({
      timestamp: z.number(),
      close: z.number(),
    }),
  ),
};

export const metadata: ToolMetadata = {
  name: "show-crypto-chart",
  description:
    "Render a daily price chart for a cryptocurrency using SoSoValue klines. Returns chart data in structuredContent for the MCP App widget.",
  annotations: {
    title: "Show crypto chart",
    readOnlyHint: true,
    openWorldHint: true,
  },
  _meta: {
    openai: {
      widgetAccessible: true,
      resultCanProduceWidget: true,
      toolInvocation: {
        invoking: "Loading chart",
        invoked: "Chart ready",
      },
      widgetCSP: {
        connect_domains: [publicOrigin()],
        resource_domains: [
          publicOrigin(),
          "https://sosovalue.com",
          "https://www.sosovalue.com",
        ],
        redirect_domains: ["https://sosovalue.com", "https://www.sosovalue.com"],
      },
    },
  },
};

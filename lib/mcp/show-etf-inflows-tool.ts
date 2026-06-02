import { type ToolMetadata } from "xmcp";
import { z } from "zod";

import { publicOrigin } from "./widget-csp";

export const schema = {
  ticker: z
    .string()
    .min(1)
    .describe("US spot ETF ticker, e.g. IBIT, FBTC, ARKB"),
  symbol: z
    .string()
    .optional()
    .describe("Underlying asset label for display (default BTC)"),
  limit: z
    .number()
    .int()
    .min(5)
    .max(90)
    .optional()
    .describe("History rows to fetch (default 30)"),
};

export const outputSchema = {
  ticker: z.string(),
  symbol: z.string(),
  rows: z.array(
    z.object({
      date: z.union([z.string(), z.number()]),
      net_inflow: z.number(),
    }),
  ),
};

export const metadata: ToolMetadata = {
  name: "show-etf-inflows",
  description:
    "Render ETF net inflow history from SoSoValue. Returns time series in structuredContent for the MCP App widget.",
  annotations: {
    title: "Show ETF inflows",
    readOnlyHint: true,
    openWorldHint: true,
  },
  _meta: {
    openai: {
      widgetAccessible: true,
      resultCanProduceWidget: true,
      toolInvocation: {
        invoking: "Loading ETF flows",
        invoked: "ETF flows ready",
      },
      widgetCSP: {
        connect_domains: [publicOrigin()],
        resource_domains: [publicOrigin(), "https://sosovalue.com"],
        redirect_domains: ["https://sosovalue.com"],
      },
    },
  },
};

import { type InferSchema, type ToolMetadata } from "xmcp";
import { z } from "zod";

import {
  getEtfSummaryHistory,
  listEtfTickers,
} from "@/lib/sosovalue/client";
import { toErrorToolResult, toToonToolResult } from "@/lib/sosovalue/tool-result";

export const schema = {
  symbol: z
    .string()
    .min(1)
    .describe("Underlying asset for US spot ETF aggregate flows (BTC, ETH)"),
  countryCode: z
    .string()
    .optional()
    .describe("Country code filter (default US)"),
  limit: z
    .number()
    .int()
    .min(5)
    .max(90)
    .optional()
    .describe("Daily summary rows (default 30)"),
  includeTickers: z
    .boolean()
    .optional()
    .describe("Also list constituent ETF tickers (IBIT, FBTC, …)"),
};

export const metadata: ToolMetadata = {
  name: "get-etf-summary",
  description:
    "US spot ETF aggregate net inflow history (/etfs/summary-history). SignalFlow / ETF Pulse pattern (distinct from per-ticker show-etf-inflows).",
  annotations: {
    title: "ETF summary history",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export default async function getEtfSummaryTool({
  symbol,
  countryCode,
  limit,
  includeTickers,
}: InferSchema<typeof schema>) {
  try {
    const rows = await getEtfSummaryHistory(symbol, {
      countryCode: countryCode ?? "US",
      limit: limit ?? 30,
    });
    const slim = rows.map((row) => ({
      date: row.date,
      totalNetInflow: row.total_net_inflow,
      totalValueTraded: row.total_value_traded,
      totalNetAssets: row.total_net_assets,
      cumNetInflow: row.cum_net_inflow,
    }));

    const tickers =
      includeTickers === true
        ? await listEtfTickers(symbol, { countryCode: countryCode ?? "US" })
        : undefined;

    return toToonToolResult({
      symbol: symbol.toUpperCase(),
      countryCode: countryCode ?? "US",
      rows: slim,
      ...(tickers ? { tickers } : {}),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "ETF summary request failed.";
    return toErrorToolResult(message);
  }
}

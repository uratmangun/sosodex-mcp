import { getEtfHistory, type SosoEtfHistoryRow } from "@/lib/sosovalue/client";

export type EtfInflowsPayload = {
  ticker: string;
  symbol: string;
  rows: SosoEtfHistoryRow[];
};

export async function buildEtfInflowsPayload(input: {
  ticker: string;
  symbol?: string;
  limit?: number;
}): Promise<EtfInflowsPayload> {
  const rows = await getEtfHistory(input.ticker, { limit: input.limit ?? 30 });
  return {
    ticker: input.ticker,
    symbol: input.symbol ?? "BTC",
    rows,
  };
}

export function toEtfInflowsToolResult(payload: EtfInflowsPayload) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            ticker: payload.ticker,
            days: payload.rows.length,
          },
          null,
          2,
        ),
      },
    ],
    structuredContent: payload,
  };
}

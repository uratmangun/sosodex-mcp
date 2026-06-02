import {
  getCurrencyKlines,
  sosovalueProfileUrl,
  type SosoKline,
} from "@/lib/sosovalue/client";

export type CryptoChartPayload = {
  currencyId: string;
  symbol: string;
  profileUrl: string;
  klines: SosoKline[];
};

export async function buildCryptoChartPayload(input: {
  currencyId: string;
  symbol: string;
  limit?: number;
}): Promise<CryptoChartPayload> {
  const klines = await getCurrencyKlines(input.currencyId, {
    limit: input.limit ?? 30,
  });

  return {
    currencyId: input.currencyId,
    symbol: input.symbol,
    profileUrl: sosovalueProfileUrl(input.symbol),
    klines,
  };
}

export function toCryptoChartToolResult(payload: CryptoChartPayload) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            symbol: payload.symbol,
            points: payload.klines.length,
            profileUrl: payload.profileUrl,
          },
          null,
          2,
        ),
      },
    ],
    structuredContent: payload,
  };
}

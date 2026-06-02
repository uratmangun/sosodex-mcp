import { type InferSchema, type ToolMetadata } from "xmcp";
import { z } from "zod";

import {
  fetchCryptoDetailSlim,
  toCryptoDetailToolResult,
} from "@/lib/sosovalue/crypto-detail";

export const schema = {
  currencyId: z
    .string()
    .min(1)
    .describe("Currency id from search-crypto (currency.id)"),
};

export const outputSchema = {
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  changePct24h: z.number(),
  marketcap: z.number(),
  marketcapRank: z.number(),
  turnover24h: z.number(),
  profileUrl: z.string().url(),
};

export const metadata: ToolMetadata = {
  name: "get-crypto-detail",
  description:
    "Market snapshot for one SoSoValue currency id: price, 24h change, market cap, rank. Returns minimal fields in TOON.",
  annotations: {
    title: "Crypto details",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export default async function getCryptoDetail({
  currencyId,
}: InferSchema<typeof schema>) {
  try {
    const payload = await fetchCryptoDetailSlim(currencyId);
    return toCryptoDetailToolResult(payload);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Crypto detail request failed.";
    return {
      content: [
        {
          type: "text" as const,
          text: `error: ${message}`,
        },
      ],
      isError: true,
    };
  }
}

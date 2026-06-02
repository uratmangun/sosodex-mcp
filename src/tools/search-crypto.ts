import { type InferSchema, type ToolMetadata } from "xmcp";
import { z } from "zod";

import {
  runCryptoSearchSlim,
  toSearchCryptoToolResult,
} from "@/lib/sosovalue/search-crypto-result";

export const schema = {
  query: z
    .string()
    .min(1)
    .describe(
      "Symbol, name, or id fragment (e.g. BTC, bitcoin, ethereum)",
    ),
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "Page number for pagination (default 1). Use nextPage from a prior response.",
    ),
};

export const outputSchema = {
  query: z.string(),
  pagination: z.object({
    hasMore: z.boolean(),
    nextPage: z.number().optional(),
  }),
  currency: z.object({
    id: z.string(),
    symbol: z.string(),
    name: z.string(),
  }),
};

export const metadata: ToolMetadata = {
  name: "search-crypto",
  description:
    "Find one listed cryptocurrency per page on SoSoValue (symbol/name match). Returns id, symbol, name in TOON. Paginate with page. Call get-crypto-detail for market data.",
  annotations: {
    title: "Search crypto",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export default async function searchCrypto({
  query,
  page,
}: InferSchema<typeof schema>) {
  try {
    const payload = await runCryptoSearchSlim(query.trim(), { page });
    return toSearchCryptoToolResult(payload);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Crypto search failed.";
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

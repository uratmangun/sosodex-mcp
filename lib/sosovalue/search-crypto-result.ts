import { listCurrencies, type SosoCurrency } from "@/lib/sosovalue/client";
import {
  formatSearchCryptoToon,
  type CryptoSearchSlim,
} from "@/lib/sosovalue/toon";

const PAGE_SIZE = 1;

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchesCurrency(currency: SosoCurrency, query: string): boolean {
  const q = normalizeQuery(query);
  return (
    currency.symbol.toLowerCase().includes(q) ||
    currency.name.toLowerCase().includes(q) ||
    currency.currency_id.includes(q)
  );
}

export async function runCryptoSearchSlim(
  query: string,
  options: { page?: number } = {},
): Promise<CryptoSearchSlim> {
  const page = Math.max(1, options.page ?? 1);
  const all = await listCurrencies();
  const matches = all.filter((c) => matchesCurrency(c, query));
  const index = page - 1;
  const hit = matches[index];

  if (!hit) {
    throw new Error(
      matches.length === 0
        ? `No currency matched "${query.trim()}".`
        : `No more results for "${query.trim()}".`,
    );
  }

  return {
    query: query.trim(),
    pagination: {
      hasMore: index + 1 < matches.length,
      ...(index + 1 < matches.length ? { nextPage: page + 1 } : {}),
    },
    currency: {
      id: hit.currency_id,
      symbol: hit.symbol,
      name: hit.name,
    },
  };
}

export function toSearchCryptoToolResult(payload: CryptoSearchSlim) {
  return {
    content: [
      {
        type: "text" as const,
        text: formatSearchCryptoToon(payload),
      },
    ],
    structuredContent: payload,
  };
}

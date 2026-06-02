import {
  getMarketSnapshot,
  listCurrencies,
  sosovalueProfileUrl,
} from "@/lib/sosovalue/client";
import {
  formatCryptoDetailToon,
  type CryptoDetailSlim,
} from "@/lib/sosovalue/toon";

export async function fetchCryptoDetailSlim(
  currencyId: string,
): Promise<CryptoDetailSlim> {
  const currencies = await listCurrencies();
  const meta = currencies.find((c) => c.currency_id === currencyId);
  const market = await getMarketSnapshot(currencyId);
  const symbol = meta?.symbol ?? currencyId;

  return {
    id: currencyId,
    symbol,
    name: meta?.name ?? symbol,
    price: Number(market.price),
    changePct24h: Number(market.change_pct_24h),
    marketcap: Number(market.marketcap),
    marketcapRank: Number(market.marketcap_rank),
    turnover24h: Number(market.turnover_24h),
    profileUrl: sosovalueProfileUrl(symbol),
  };
}

export function toCryptoDetailToolResult(payload: CryptoDetailSlim) {
  return {
    content: [
      {
        type: "text" as const,
        text: formatCryptoDetailToon(payload),
      },
    ],
    structuredContent: payload,
  };
}

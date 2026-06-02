/** Prompts for webreel / demo toolbar — one per SoSoValue MCP tool. */
export const DEMO_TOOL_PROMPTS = [
  { id: "search-crypto", prompt: "Search Bitcoin and Ethereum on SoSoValue" },
  { id: "get-crypto-detail", prompt: "get-crypto-detail for BTC" },
  {
    id: "show-crypto-chart",
    prompt: "Show the daily price chart for ETH using show-crypto-chart",
  },
  {
    id: "show-etf-inflows",
    prompt: "What are the latest BTC ETF daily net inflows?",
  },
  {
    id: "show-index-snapshot",
    prompt: "Show a MAG7 index snapshot on SoSoValue",
  },
  { id: "search-news", prompt: "search-news ethereum ETF" },
  { id: "get-news-hot", prompt: "get-news-hot" },
  { id: "get-macro-events", prompt: "get-macro-events" },
  { id: "get-market-overview", prompt: "get-market-overview" },
  { id: "get-sector-spotlight", prompt: "get-sector-spotlight" },
  { id: "list-indices", prompt: "list-indices" },
  { id: "get-etf-summary", prompt: "get-etf-summary BTC ETH" },
] as const;

export function isWebreelDemoMode(search = ""): boolean {
  if (!search) return false;
  return new URLSearchParams(search).get("webreel") === "1";
}

const DEFAULT_BASE = "https://openapi.sosovalue.com/openapi/v1";

export type SosoCurrency = {
  currency_id: string;
  symbol: string;
  name: string;
};

export type SosoMarketSnapshot = {
  price: number;
  change_pct_24h: number;
  turnover_24h: number;
  marketcap: number;
  marketcap_rank: number;
  high_24h: number;
  low_24h: number;
};

export type SosoKline = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type SosoNewsItem = {
  id: string;
  title: string;
  release_time: number;
  source_link?: string;
  author?: string;
  tags?: string[];
};

export type SosoIndexSnapshot = {
  price: number;
  "24h_change_pct"?: number;
  "7day_roi"?: number;
  "1month_roi"?: number;
  "3month_roi"?: number;
  "1year_roi"?: number;
  ytd?: number;
};

export type SosoEtfHistoryRow = {
  date: string | number;
  ticker: string;
  net_inflow: number;
  cum_inflow: number;
  net_assets: number;
  value_traded: number;
};

export function getSosoValueApiKey(): string {
  const key = process.env.SOSOVALUE_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Missing SOSOVALUE_API_KEY. Add it to .env.local (https://openapi.sosovalue.com).",
    );
  }
  return key;
}

function baseUrl(): string {
  return (process.env.SOSOVALUE_API_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SoSoValue API ${res.status}: ${body.slice(0, 300)}`);
  }
  const payload: unknown = await res.json();
  if (payload && typeof payload === "object" && "code" in payload) {
    const wrapped = payload as { code: number; message?: string; data?: T };
    if (wrapped.code !== 0) {
      throw new Error(wrapped.message ?? "SoSoValue API error");
    }
    return wrapped.data as T;
  }
  return payload as T;
}

export async function sosoGet<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(`${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url, {
    headers: {
      "x-soso-api-key": getSosoValueApiKey(),
      Accept: "application/json",
    },
    cache: "no-store",
  });
  return parseEnvelope<T>(res);
}

export async function listCurrencies(): Promise<SosoCurrency[]> {
  const data = await sosoGet<SosoCurrency[] | { list?: SosoCurrency[] }>(
    "/currencies",
  );
  if (Array.isArray(data)) return data;
  return data.list ?? [];
}

export async function getMarketSnapshot(
  currencyId: string,
): Promise<SosoMarketSnapshot> {
  return sosoGet<SosoMarketSnapshot>(
    `/currencies/${encodeURIComponent(currencyId)}/market-snapshot`,
  );
}

export async function getCurrencyKlines(
  currencyId: string,
  options: { limit?: number } = {},
): Promise<SosoKline[]> {
  const data = await sosoGet<SosoKline[]>(
    `/currencies/${encodeURIComponent(currencyId)}/klines`,
    { interval: "1d", limit: options.limit ?? 30 },
  );
  return Array.isArray(data) ? data : [];
}

export async function searchNews(
  keyword: string,
  options: { page?: number; pageSize?: number } = {},
): Promise<{ list: SosoNewsItem[]; total: number; page: number }> {
  const data = await sosoGet<{
    list?: SosoNewsItem[];
    total?: number;
    page?: number;
  }>("/news/search", {
    keyword,
    page: options.page ?? 1,
    page_size: options.pageSize ?? 10,
  });
  return {
    list: data.list ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
  };
}

export async function listIndices(): Promise<string[]> {
  const data = await sosoGet<string[] | { list?: string[] }>("/indices");
  if (Array.isArray(data)) return data;
  return data.list ?? [];
}

export async function getIndexMarketSnapshot(
  indexTicker: string,
): Promise<SosoIndexSnapshot> {
  return sosoGet<SosoIndexSnapshot>(
    `/indices/${encodeURIComponent(indexTicker)}/market-snapshot`,
  );
}

export async function getEtfHistory(
  ticker: string,
  options: { limit?: number } = {},
): Promise<SosoEtfHistoryRow[]> {
  const data = await sosoGet<SosoEtfHistoryRow[]>(
    `/etfs/${encodeURIComponent(ticker)}/history`,
    { limit: options.limit ?? 30 },
  );
  return Array.isArray(data) ? data : [];
}

export function sosovalueProfileUrl(symbol: string): string {
  return `https://sosovalue.com/assets/coins/${encodeURIComponent(symbol.toLowerCase())}`;
}

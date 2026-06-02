import { encode } from "@toon-format/toon";

export function encodeToon(data: unknown): string {
  return encode(data);
}

export type CryptoSearchSlim = {
  query: string;
  pagination: { hasMore: boolean; nextPage?: number };
  currency: { id: string; symbol: string; name: string };
};

export type CryptoDetailSlim = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  changePct24h: number;
  marketcap: number;
  marketcapRank: number;
  turnover24h: number;
  profileUrl: string;
};

export function formatSearchCryptoToon(payload: CryptoSearchSlim): string {
  return encodeToon(payload);
}

export function formatCryptoDetailToon(payload: CryptoDetailSlim): string {
  return encodeToon(payload);
}

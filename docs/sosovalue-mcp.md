# SoSoValue MCP (Next.js + xmcp)

MCP server at `/mcp` with [MCP Apps](https://modelcontextprotocol.io/docs/extensions/apps) widgets (`text/html;profile=mcp-app`) and ChatGPT Apps SDK metadata (`_meta.openai`).

## Tools

| Tool | Purpose | Output |
| --- | --- | --- |
| `search-crypto` | Find listed currencies by symbol/name | TOON: `currency` + `pagination` |
| `get-crypto-detail` | Market snapshot for `currency.id` | TOON: price, cap, 24h change |
| `show-crypto-chart` | Daily kline chart widget | `structuredContent` + MCP App |
| `show-etf-inflows` | ETF net inflow bar chart widget | `structuredContent` + MCP App |
| `show-index-snapshot` | SoSoValue Index ROI card widget | `structuredContent` + MCP App |

Flow: `search-crypto` → `get-crypto-detail` → `show-crypto-chart` with `currencyId` and `symbol`.

## Setup

1. Request an API key at [openapi.sosovalue.com](https://openapi.sosovalue.com).
2. Copy `.env.example` → `.env.local` and set `SOSOVALUE_API_KEY`.
3. `pnpm install && pnpm build`
4. `pnpm dev` — MCP at `http://localhost:3000/mcp`

## MCP Inspector

```json
{
  "mcpServers": {
    "sosodex": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## API reference

[SoSoValue API documentation](https://sosovalue-1.gitbook.io/sosovalue-api-doc)

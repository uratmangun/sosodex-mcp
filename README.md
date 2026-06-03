# SoSoDex MCP

Next.js app with a **SoSoValue assistant** chat UI and an HTTP **MCP server** at `/mcp`. Tools in [`src/tools/`](src/tools/) call the [SoSoValue OpenAPI](https://openapi.sosovalue.com) and return compact **TOON** text for LLMs, plus **MCP App** widgets (charts and cards) where noted.

## Demo

Guest walkthrough of all 12 SoSoValue MCP tools:

<video controls src="videos/sosovalue-tools-guest-demo.mp4" style="max-width: 100%;"></video>

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

| URL | Purpose |
| --- | --- |
| `http://localhost:3000` | Web app (chat UI) |
| `http://localhost:3000/mcp` | MCP server (Streamable HTTP) |

`pnpm dev` runs **xmcp** (watches `src/tools/`) and **Next.js** together. Production: `pnpm build` then `pnpm start`.

### Environment

Copy [`.env.example`](.env.example) to `.env.local` and set at minimum:

| Variable | Purpose |
| --- | --- |
| `SOSOVALUE_API_KEY` | SoSoValue OpenAPI key — request at [openapi.sosovalue.com](https://openapi.sosovalue.com) |
| `BETTER_AUTH_URL` | Public app URL (e.g. `http://localhost:3000`) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |

Optional:

| Variable | Purpose |
| --- | --- |
| `AI_PROVIDER_BASE_URL` / `AI_PROVIDER_API_KEY` | Default chat LLM (OpenAI-compatible) |
| `AI_PROVIDER_DEFAULT_MODEL` | Default model id (e.g. `minimax-m3-free`) |
| `MCP_CHAT_URL` | Where `/api/chat` loads tools (default `http://127.0.0.1:3000/mcp`) |
| `NEXT_PUBLIC_MCP_APP_ORIGIN` | Origin for MCP App widget CSP |

API reference: [SoSoValue API documentation](https://sosovalue-1.gitbook.io/sosovalue-api-doc).

---

## Using the web app

1. Open the app and **Continue as guest**. Chats are stored in SQLite on the server.
2. Pick a model from the selector (when using the built-in provider).
3. Ask in natural language — the assistant calls SoSoValue MCP tools and shows results in the thread (text, tool cards, and embedded widgets for chart tools).
4. **API settings** (gear): optional custom OpenAI-compatible endpoint, API key, model, system prompt, and **MCP server URL** to copy into Cursor or other MCP clients.

Demo mode (`/?webreel=1`): extra UI hooks for automated screen recordings.

---

## MCP tools (`src/tools/`)

### Crypto

| Tool | File | What it does |
| --- | --- | --- |
| **`search-crypto`** | [`search-crypto.ts`](src/tools/search-crypto.ts) | Find a listed asset by symbol or name (e.g. `BTC`, `ethereum`). Returns `currency.id`, `symbol`, `name` in TOON. Supports `page` for pagination. |
| **`get-crypto-detail`** | [`get-crypto-detail.ts`](src/tools/get-crypto-detail.ts) | Market snapshot for one `currency.id` from search: price, 24h change %, market cap, rank, volume, profile URL. |
| **`show-crypto-chart`** | [`show-crypto-chart.tsx`](src/tools/show-crypto-chart.tsx) | **MCP App widget** — daily close price line chart. Needs `currencyId` + `symbol` from search. Optional `limit` (days, default 30). |

**Typical flow:** `search-crypto` → `get-crypto-detail` (optional) → `show-crypto-chart`.

### News

| Tool | File | What it does |
| --- | --- | --- |
| **`search-news`** | [`search-news.ts`](src/tools/search-news.ts) | Search headlines by keyword. `page`, `pageSize` (max 20). |
| **`get-news-hot`** | [`get-news-hot.ts`](src/tools/get-news-hot.ts) | Trending / hot news feed. Pagination via `page` and `pageSize`. |

### Macro & market

| Tool | File | What it does |
| --- | --- | --- |
| **`get-macro-events`** | [`get-macro-events.ts`](src/tools/get-macro-events.ts) | Upcoming macro calendar. Optional `eventName` + `historyLimit` for historical actual/forecast rows (e.g. CPI, FOMC). |
| **`get-market-overview`** | [`get-market-overview.ts`](src/tools/get-market-overview.ts) | Aggregate market overview (breadth, sentiment-style dashboard data). No inputs. |
| **`get-sector-spotlight`** | [`get-sector-spotlight.ts`](src/tools/get-sector-spotlight.ts) | Sector performance spotlight. Optional `currencyId` to scope rows. |

### Indices

| Tool | File | What it does |
| --- | --- | --- |
| **`list-indices`** | [`list-indices.ts`](src/tools/list-indices.ts) | Lists SoSoValue index tickers (e.g. MAG7, DeFi). No inputs. |
| **`show-index-snapshot`** | [`show-index-snapshot.tsx`](src/tools/show-index-snapshot.tsx) | **MCP App widget** — index price and ROI-style snapshot for one `indexTicker` (from `list-indices`). |

### ETF

| Tool | File | What it does |
| --- | --- | --- |
| **`get-etf-summary`** | [`get-etf-summary.ts`](src/tools/get-etf-summary.ts) | US spot ETF **aggregate** net inflow history by underlying (`BTC`, `ETH`). Optional `includeTickers` for constituent tickers (IBIT, FBTC, …). |
| **`show-etf-inflows`** | [`show-etf-inflows.tsx`](src/tools/show-etf-inflows.tsx) | **MCP App widget** — bar chart of daily net inflows for one ETF **ticker** (e.g. `IBIT`). Distinct from `get-etf-summary` (per-ticker vs aggregate). |

### Tool types

- **Regular tools** (`.ts`): server handler calls SoSoValue API, returns TOON text in MCP `content`.
- **MCP App tools** (`.tsx`): React iframe widgets; server returns `structuredContent` + widget bundle. Metadata lives in `lib/mcp/show-*-tool.ts`.

After changing tools:

```bash
pnpm exec xmcp build
node scripts/patch-xmcp-adapter.mjs
node scripts/sync-ui-bundles.mjs
```

Restart `pnpm dev` (or rely on xmcp watch).

---

## Connect MCP clients

### Cursor / Claude Desktop

```json
{
  "mcpServers": {
    "sosodex": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Use your deployed origin instead of `localhost` in production. The MCP URL is also shown under **API settings** in the app.

### MCP Inspector

```bash
pnpm dlx @modelcontextprotocol/inspector --transport http --server-url http://localhost:3000/mcp
```

---

## How chat uses MCP

`POST /api/chat` loads the same tool definitions from `MCP_CHAT_URL` ([`lib/mcp-chat-client.ts`](lib/mcp-chat-client.ts)). Tool output renders in [`components/maps-chat-panel.tsx`](components/maps-chat-panel.tsx) via [`components/maps-tool-result.tsx`](components/maps-tool-result.tsx) (text TOON, expandable tool UI, and widgets for `show-*` tools).

---

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | xmcp dev + Next.js dev server |
| `pnpm build` | xmcp build, patch adapter, sync UI bundles, Next.js build |
| `pnpm start` | Production server (standalone) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check |
| `pnpm run demo:record:prod` | Build + record guest demo video (webreel) |

---

## Project layout

```
src/tools/           # xmcp tool entrypoints (.ts = text, .tsx = MCP App widgets)
lib/sosovalue/       # SoSoValue API client and payloads
lib/mcp/             # MCP HTTP handler, widget CSP, show-* schemas
app/mcp/route.ts     # MCP endpoint
app/api/chat/        # Chat API (uses MCP tools)
components/          # Chat UI, tool previews, auth
```

More detail: [`docs/sosovalue-mcp.md`](docs/sosovalue-mcp.md).

## License

See repository license file if present; SoSoValue data is subject to their API terms.

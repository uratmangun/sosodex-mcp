import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { buildCryptoChartPayload, toCryptoChartToolResult } from "@/lib/sosovalue/chart-payload";
import {
  buildEtfInflowsPayload,
  toEtfInflowsToolResult,
} from "@/lib/sosovalue/etf-inflows-payload";
import {
  buildIndexSnapshotPayload,
  toIndexSnapshotToolResult,
} from "@/lib/sosovalue/index-snapshot-payload";
import {
  metadata as showCryptoChartMetadata,
  schema as showCryptoChartSchema,
} from "@/lib/mcp/show-crypto-chart-tool";
import {
  metadata as showEtfInflowsMetadata,
  schema as showEtfInflowsSchema,
} from "@/lib/mcp/show-etf-inflows-tool";
import {
  metadata as showIndexSnapshotMetadata,
  schema as showIndexSnapshotSchema,
} from "@/lib/mcp/show-index-snapshot-tool";
import { registerUiResources, toolUiMetaFor } from "@/lib/mcp/ui-resources";

type XmcpToolEntry = {
  description: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  _meta?: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

function asExecute(
  fn: (args: Record<string, unknown>) => Promise<unknown>,
): (args: Record<string, unknown>) => Promise<unknown> {
  return fn;
}

let toolsPromise: Promise<Record<string, XmcpToolEntry>> | null = null;

async function loadXmcpTools(): Promise<Record<string, XmcpToolEntry>> {
  if (!toolsPromise) {
    toolsPromise = (async () => {
      const searchCrypto = await import("@/src/tools/search-crypto");
      const getCryptoDetail = await import("@/src/tools/get-crypto-detail");
      const searchNews = await import("@/src/tools/search-news");
      const getNewsHot = await import("@/src/tools/get-news-hot");
      const getMacroEvents = await import("@/src/tools/get-macro-events");
      const getMarketOverview = await import("@/src/tools/get-market-overview");
      const getSectorSpotlight = await import("@/src/tools/get-sector-spotlight");
      const listIndices = await import("@/src/tools/list-indices");
      const getEtfSummary = await import("@/src/tools/get-etf-summary");

      return {
        "search-crypto": {
          description: searchCrypto.metadata.description,
          inputSchema: z.object(searchCrypto.schema),
          execute: asExecute(
            searchCrypto.default as (
              args: Record<string, unknown>,
            ) => Promise<unknown>,
          ),
        },
        "get-crypto-detail": {
          description: getCryptoDetail.metadata.description,
          inputSchema: z.object(getCryptoDetail.schema),
          execute: asExecute(
            getCryptoDetail.default as (
              args: Record<string, unknown>,
            ) => Promise<unknown>,
          ),
        },
        "show-crypto-chart": {
          description: showCryptoChartMetadata.description,
          inputSchema: z.object(showCryptoChartSchema),
          _meta: toolUiMetaFor("show-crypto-chart"),
          execute: async () => ({}),
        },
        "show-etf-inflows": {
          description: showEtfInflowsMetadata.description,
          inputSchema: z.object(showEtfInflowsSchema),
          _meta: toolUiMetaFor("show-etf-inflows"),
          execute: async () => ({}),
        },
        "show-index-snapshot": {
          description: showIndexSnapshotMetadata.description,
          inputSchema: z.object(showIndexSnapshotSchema),
          _meta: toolUiMetaFor("show-index-snapshot"),
          execute: async () => ({}),
        },
        "search-news": {
          description: searchNews.metadata.description,
          inputSchema: z.object(searchNews.schema),
          execute: asExecute(
            searchNews.default as (
              args: Record<string, unknown>,
            ) => Promise<unknown>,
          ),
        },
        "get-news-hot": {
          description: getNewsHot.metadata.description,
          inputSchema: z.object(getNewsHot.schema),
          execute: asExecute(
            getNewsHot.default as (
              args: Record<string, unknown>,
            ) => Promise<unknown>,
          ),
        },
        "get-macro-events": {
          description: getMacroEvents.metadata.description,
          inputSchema: z.object(getMacroEvents.schema),
          execute: asExecute(
            getMacroEvents.default as (
              args: Record<string, unknown>,
            ) => Promise<unknown>,
          ),
        },
        "get-market-overview": {
          description: getMarketOverview.metadata.description,
          inputSchema: z.object(getMarketOverview.schema),
          execute: asExecute(
            getMarketOverview.default as (
              args: Record<string, unknown>,
            ) => Promise<unknown>,
          ),
        },
        "get-sector-spotlight": {
          description: getSectorSpotlight.metadata.description,
          inputSchema: z.object(getSectorSpotlight.schema),
          execute: asExecute(
            getSectorSpotlight.default as (
              args: Record<string, unknown>,
            ) => Promise<unknown>,
          ),
        },
        "list-indices": {
          description: listIndices.metadata.description,
          inputSchema: z.object(listIndices.schema),
          execute: asExecute(
            listIndices.default as (
              args: Record<string, unknown>,
            ) => Promise<unknown>,
          ),
        },
        "get-etf-summary": {
          description: getEtfSummary.metadata.description,
          inputSchema: z.object(getEtfSummary.schema),
          execute: asExecute(
            getEtfSummary.default as (
              args: Record<string, unknown>,
            ) => Promise<unknown>,
          ),
        },
      };
    })();
  }
  return toolsPromise as Promise<Record<string, XmcpToolEntry>>;
}

function normalizeToolResult(result: unknown): CallToolResult {
  if (typeof result === "string") {
    return { content: [{ type: "text", text: result }] };
  }
  if (typeof result === "number") {
    return { content: [{ type: "text", text: String(result) }] };
  }
  if (result && typeof result === "object") {
    return result as CallToolResult;
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result ?? null, null, 2),
      },
    ],
  };
}

async function createMcpServer(): Promise<McpServer> {
  const server = new McpServer(
    {
      name: "sosodex-mcp",
      version: "0.1.0",
    },
    {
      instructions: [
        "Crypto: search-crypto → get-crypto-detail → show-crypto-chart.",
        "ETF: get-etf-summary (BTC/ETH aggregate) or show-etf-inflows (per ticker e.g. IBIT).",
        "Indices: list-indices → show-index-snapshot.",
        "News: search-news or get-news-hot.",
        "Macro/regime: get-macro-events, get-market-overview, get-sector-spotlight.",
      ].join(" "),
      capabilities: {
        tools: { listChanged: true },
        resources: { listChanged: true, subscribe: false },
      },
    },
  );

  registerUiResources(server);

  const tools = await loadXmcpTools();
  for (const [name, tool] of Object.entries(tools)) {
    server.registerTool(
      name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        _meta: tool._meta,
      },
      async (args) => {
        if (name === "show-crypto-chart") {
          const currencyId =
            typeof args.currencyId === "string" ? args.currencyId.trim() : "";
          const symbol =
            typeof args.symbol === "string" ? args.symbol.trim() : "";
          if (!currencyId || !symbol) {
            return normalizeToolResult({
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    { error: "currencyId and symbol are required." },
                    null,
                    2,
                  ),
                },
              ],
              isError: true,
            });
          }
          try {
            const payload = await buildCryptoChartPayload({
              currencyId,
              symbol,
              limit:
                args.limit !== undefined ? Number(args.limit) : undefined,
            });
            const result = toCryptoChartToolResult(payload);
            return normalizeToolResult({
              ...result,
              _meta: toolUiMetaFor("show-crypto-chart"),
            });
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Chart request failed.";
            return normalizeToolResult({
              content: [{ type: "text", text: JSON.stringify({ error: message }) }],
              isError: true,
            });
          }
        }

        if (name === "show-etf-inflows") {
          const ticker =
            typeof args.ticker === "string" ? args.ticker.trim() : "";
          if (!ticker) {
            return normalizeToolResult({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ error: "ticker is required." }),
                },
              ],
              isError: true,
            });
          }
          try {
            const payload = await buildEtfInflowsPayload({
              ticker,
              symbol:
                typeof args.symbol === "string" ? args.symbol : undefined,
              limit:
                args.limit !== undefined ? Number(args.limit) : undefined,
            });
            const result = toEtfInflowsToolResult(payload);
            return normalizeToolResult({
              ...result,
              _meta: toolUiMetaFor("show-etf-inflows"),
            });
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "ETF inflow request failed.";
            return normalizeToolResult({
              content: [{ type: "text", text: JSON.stringify({ error: message }) }],
              isError: true,
            });
          }
        }

        if (name === "show-index-snapshot") {
          const indexTicker =
            typeof args.indexTicker === "string"
              ? args.indexTicker.trim()
              : "";
          if (!indexTicker) {
            return normalizeToolResult({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ error: "indexTicker is required." }),
                },
              ],
              isError: true,
            });
          }
          try {
            const payload = await buildIndexSnapshotPayload({ indexTicker });
            const result = toIndexSnapshotToolResult(payload);
            return normalizeToolResult({
              ...result,
              _meta: toolUiMetaFor("show-index-snapshot"),
            });
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Index request failed.";
            return normalizeToolResult({
              content: [{ type: "text", text: JSON.stringify({ error: message }) }],
              isError: true,
            });
          }
        }

        return normalizeToolResult(await tool.execute(args));
      },
    );
  }

  return server;
}

async function bufferResponse(response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream") || !response.body) {
    return response;
  }
  const body = await response.arrayBuffer();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function statelessGetResponse(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message:
          "Stateless MCP: send JSON-RPC messages via POST. SSE GET is not enabled on this server.",
      },
      id: null,
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: "POST, OPTIONS",
      },
    },
  );
}

let requestChain: Promise<void> = Promise.resolve();

export async function xmcpHttpHandler(request: Request): Promise<Response> {
  if (request.method === "GET") {
    return statelessGetResponse();
  }

  const run = async (): Promise<Response> => {
    const server = await createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    try {
      await server.connect(transport);
      const response = await transport.handleRequest(request);
      return await bufferResponse(response);
    } finally {
      await server.close();
    }
  };

  const responsePromise = requestChain.then(run, run);
  requestChain = responsePromise.then(
    () => undefined,
    () => undefined,
  );
  return responsePromise;
}

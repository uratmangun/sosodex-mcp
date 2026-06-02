import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { metadata as showCryptoChartMetadata } from "@/lib/mcp/show-crypto-chart-tool";
import { metadata as showEtfInflowsMetadata } from "@/lib/mcp/show-etf-inflows-tool";
import { metadata as showIndexSnapshotMetadata } from "@/lib/mcp/show-index-snapshot-tool";

import { buildMcpAppWidgetHtml } from "./ui-widget-html";
import {
  MCP_APP_HTML,
  buildResourceUiMeta,
  buildToolUiMeta,
  widgetUri,
} from "./tool-ui-meta";

export type UiWidgetRegistration = {
  toolName: string;
  bundleFile: string;
  description: string;
  toolMetaSource?: typeof showCryptoChartMetadata._meta;
};

/** Placeholder hashes — updated after `pnpm build` (xmcp). */
const SHOW_CRYPTO_CHART_BUNDLE =
  "src_tools_show-crypto-chart_9c3af3.bundle.js";
const SHOW_ETF_INFLOWS_BUNDLE =
  "src_tools_show-etf-inflows_002e62.bundle.js";
const SHOW_INDEX_SNAPSHOT_BUNDLE =
  "src_tools_show-index-snapshot_f1113f.bundle.js";

export const UI_WIDGETS: UiWidgetRegistration[] = [
  {
    toolName: "show-crypto-chart",
    bundleFile: SHOW_CRYPTO_CHART_BUNDLE,
    description: "Daily price chart widget for show-crypto-chart",
    toolMetaSource: showCryptoChartMetadata._meta,
  },
  {
    toolName: "show-etf-inflows",
    bundleFile: SHOW_ETF_INFLOWS_BUNDLE,
    description: "ETF net inflow chart widget for show-etf-inflows",
    toolMetaSource: showEtfInflowsMetadata._meta,
  },
  {
    toolName: "show-index-snapshot",
    bundleFile: SHOW_INDEX_SNAPSHOT_BUNDLE,
    description: "SoSoValue Index snapshot widget for show-index-snapshot",
    toolMetaSource: showIndexSnapshotMetadata._meta,
  },
];

export function registerUiResources(server: McpServer): void {
  for (const widget of UI_WIDGETS) {
    const uri = widgetUri(widget.toolName);
    const resourceMeta = buildResourceUiMeta(
      widget.toolName,
      widget.toolMetaSource,
    );

    server.registerResource(
      widget.toolName,
      uri,
      {
        description: widget.description,
        mimeType: MCP_APP_HTML,
        _meta: resourceMeta,
      },
      async () => ({
        contents: [
          {
            uri,
            mimeType: MCP_APP_HTML,
            text: buildMcpAppWidgetHtml(widget.bundleFile),
          },
        ],
      }),
    );
  }
}

export function toolUiMetaFor(
  name: string,
): Record<string, unknown> | undefined {
  const widget = UI_WIDGETS.find((w) => w.toolName === name);
  if (!widget) return undefined;
  return buildToolUiMeta(widget.toolName, widget.toolMetaSource);
}

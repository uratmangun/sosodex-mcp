"use client";

import {
  CryptoChartPreview,
  EtfInflowsPreview,
  IndexSnapshotPreview,
  resolveSosovaluePreview,
  resolveStructuredContent,
} from "@/components/sosovalue-tool-preview";
import { ToolOutput } from "@/components/ai-elements/tool";
import type { MapsToolPart } from "@/lib/maps-chat-shared";
import { getToolName } from "@/lib/maps-chat-shared";

const SOSO_TEXT_TOOLS = new Set([
  "search-crypto",
  "get-crypto-detail",
  "search-place",
  "get-place-detail",
]);

const SOSO_WIDGET_TOOLS = new Set([
  "show-crypto-chart",
  "show-etf-inflows",
  "show-index-snapshot",
]);

export function MapsToolResult({ part }: { part: MapsToolPart }) {
  const toolName = getToolName(part);

  if (part.state === "output-error") {
    return <ToolOutput errorText={part.errorText} />;
  }

  if (part.state !== "output-available") {
    return null;
  }

  if (SOSO_WIDGET_TOOLS.has(toolName)) {
    const preview = resolveSosovaluePreview(part.output);
    if (preview?.type === "chart") {
      return <CryptoChartPreview payload={preview.payload} />;
    }
    if (preview?.type === "etf") {
      return <EtfInflowsPreview payload={preview.payload} />;
    }
    if (preview?.type === "index") {
      return <IndexSnapshotPreview payload={preview.payload} />;
    }
  }

  if (SOSO_TEXT_TOOLS.has(toolName)) {
    return <ToolOutput output={resolveStructuredContent(part.output)} />;
  }

  return <ToolOutput output={part.output} />;
}

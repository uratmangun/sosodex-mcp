"use client";

import { type InferSchema } from "xmcp";
import { useMemo } from "react";

import { useMcpToolOutput } from "../../hooks/use-mcp-tool-output";
import { MiniLineChart } from "../components/sosovalue/mini-line-chart";
import type { CryptoChartPayload } from "../../lib/sosovalue/chart-payload";

export {
  metadata,
  outputSchema,
  schema,
} from "../../lib/mcp/show-crypto-chart-tool";

import { schema as chartSchema } from "../../lib/mcp/show-crypto-chart-tool";

type ChartInput = InferSchema<typeof chartSchema>;

function isChartPayload(value: unknown): value is CryptoChartPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as CryptoChartPayload;
  return Array.isArray(v.klines) && typeof v.symbol === "string";
}

function resolvePayload(
  props: ChartInput & Partial<CryptoChartPayload>,
  toolOutput: unknown,
): CryptoChartPayload | { error: string } | null {
  if (isChartPayload(props)) return props;
  if (isChartPayload(toolOutput)) return toolOutput;
  if (toolOutput && typeof toolOutput === "object") {
    const wrapped = toolOutput as {
      structuredContent?: unknown;
      args?: unknown;
    };
    if (isChartPayload(wrapped.structuredContent)) return wrapped.structuredContent;
    if (isChartPayload(wrapped.args)) return wrapped.args;
  }
  if (
    toolOutput &&
    typeof toolOutput === "object" &&
    "error" in toolOutput &&
    typeof (toolOutput as { error: unknown }).error === "string"
  ) {
    return { error: (toolOutput as { error: string }).error };
  }
  return null;
}

export default function ShowCryptoChart(
  props: ChartInput & Partial<CryptoChartPayload>,
) {
  const toolOutput = useMcpToolOutput<unknown>();
  const resolved = useMemo(
    () => resolvePayload(props, toolOutput),
    [props, toolOutput],
  );

  if (!resolved) {
    return (
      <p style={{ margin: 0, fontSize: "13px", color: "#71717a" }}>
        Loading chart…
      </p>
    );
  }

  if ("error" in resolved) {
    return (
      <p style={{ margin: 0, fontSize: "13px", color: "#b91c1c" }}>
        {resolved.error}
      </p>
    );
  }

  const closes = resolved.klines.map((k) => Number(k.close));
  const symbol = resolved.symbol ?? props.symbol;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <MiniLineChart
        values={closes}
        label={`${symbol} · daily close (SoSoValue)`}
        stroke="#f87171"
        variant="dark"
      />
      <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#cbd5e1" }}>
        <a
          href={resolved.profileUrl}
          target="_blank"
          rel="noreferrer"
          style={{ color: "#93c5fd" }}
        >
          View on SoSoValue
        </a>
      </p>
    </div>
  );
}

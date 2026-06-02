"use client";

import { type InferSchema } from "xmcp";
import { useMemo } from "react";

import { useMcpToolOutput } from "../../hooks/use-mcp-tool-output";
import { MiniBarChart } from "../components/sosovalue/mini-line-chart";
import type { EtfInflowsPayload } from "../../lib/sosovalue/etf-inflows-payload";

export {
  metadata,
  outputSchema,
  schema,
} from "../../lib/mcp/show-etf-inflows-tool";

import { schema as etfSchema } from "../../lib/mcp/show-etf-inflows-tool";

type EtfInput = InferSchema<typeof etfSchema>;

function isEtfPayload(value: unknown): value is EtfInflowsPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as EtfInflowsPayload;
  return Array.isArray(v.rows) && typeof v.ticker === "string";
}

function resolvePayload(
  props: EtfInput & Partial<EtfInflowsPayload>,
  toolOutput: unknown,
): EtfInflowsPayload | { error: string } | null {
  if (isEtfPayload(props)) return props;
  if (isEtfPayload(toolOutput)) return toolOutput;
  if (toolOutput && typeof toolOutput === "object") {
    const wrapped = toolOutput as {
      structuredContent?: unknown;
      args?: unknown;
    };
    if (isEtfPayload(wrapped.structuredContent)) return wrapped.structuredContent;
    if (isEtfPayload(wrapped.args)) return wrapped.args;
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

export default function ShowEtfInflows(
  props: EtfInput & Partial<EtfInflowsPayload>,
) {
  const toolOutput = useMcpToolOutput<unknown>();
  const resolved = useMemo(
    () => resolvePayload(props, toolOutput),
    [props, toolOutput],
  );

  if (!resolved) {
    return (
      <p style={{ margin: 0, fontSize: "13px", color: "#71717a" }}>
        Loading ETF inflows…
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

  const values = resolved.rows.map((r) => Number(r.net_inflow));
  const labels = resolved.rows.map((r) => String(r.date).slice(0, 10));

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <MiniBarChart
        values={values}
        labels={labels}
        label={`${resolved.ticker} · daily net inflow (USD)`}
        fill="#f87171"
        variant="dark"
      />
    </div>
  );
}

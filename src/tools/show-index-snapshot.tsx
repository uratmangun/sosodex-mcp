"use client";

import { type InferSchema } from "xmcp";
import { useMemo } from "react";

import { useMcpToolOutput } from "../../hooks/use-mcp-tool-output";
import type { IndexSnapshotPayload } from "../../lib/sosovalue/index-snapshot-payload";

export {
  metadata,
  outputSchema,
  schema,
} from "../../lib/mcp/show-index-snapshot-tool";

import { schema as indexSchema } from "../../lib/mcp/show-index-snapshot-tool";

type IndexInput = InferSchema<typeof indexSchema>;

function isIndexPayload(value: unknown): value is IndexSnapshotPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as IndexSnapshotPayload;
  return typeof v.indexTicker === "string" && v.snapshot != null;
}

function resolvePayload(
  props: IndexInput & Partial<IndexSnapshotPayload>,
  toolOutput: unknown,
): IndexSnapshotPayload | { error: string } | null {
  if (isIndexPayload(props)) return props;
  if (isIndexPayload(toolOutput)) return toolOutput;
  if (toolOutput && typeof toolOutput === "object") {
    const wrapped = toolOutput as {
      structuredContent?: unknown;
      args?: unknown;
    };
    if (isIndexPayload(wrapped.structuredContent)) return wrapped.structuredContent;
    if (isIndexPayload(wrapped.args)) return wrapped.args;
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

function pct(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

export default function ShowIndexSnapshot(
  props: IndexInput & Partial<IndexSnapshotPayload>,
) {
  const toolOutput = useMcpToolOutput<unknown>();
  const resolved = useMemo(
    () => resolvePayload(props, toolOutput),
    [props, toolOutput],
  );

  if (!resolved) {
    return (
      <p style={{ margin: 0, fontSize: "13px", color: "#71717a" }}>
        Loading index…
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

  const s = resolved.snapshot;

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: 16,
        background: "#f8fafc",
      }}
    >
      <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#64748b" }}>
        SoSoValue Index
      </p>
      <p style={{ margin: "0 0 12px", fontSize: "20px", fontWeight: 700 }}>
        {resolved.indexTicker.toUpperCase()}
      </p>
      <p style={{ margin: "0 0 12px", fontSize: "28px", fontWeight: 600 }}>
        ${Number(s.price).toFixed(2)}
      </p>
      <dl
        style={{
          margin: 0,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px 16px",
          fontSize: "13px",
        }}
      >
        <div>
          <dt style={{ color: "#64748b" }}>24h</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>
            {pct(s["24h_change_pct"])}
          </dd>
        </div>
        <div>
          <dt style={{ color: "#64748b" }}>7d</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{pct(s["7day_roi"])}</dd>
        </div>
        <div>
          <dt style={{ color: "#64748b" }}>1m</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{pct(s["1month_roi"])}</dd>
        </div>
        <div>
          <dt style={{ color: "#64748b" }}>YTD</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{pct(s.ytd)}</dd>
        </div>
      </dl>
      <p style={{ margin: "12px 0 0", fontSize: "12px" }}>
        <a href={resolved.profileUrl} target="_blank" rel="noreferrer">
          SoSoValue Indices
        </a>
      </p>
    </div>
  );
}

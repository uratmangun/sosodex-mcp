"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  MiniBarChart,
  MiniLineChart,
} from "@/src/components/sosovalue/mini-line-chart";
import type { CryptoChartPayload } from "@/lib/sosovalue/chart-payload";
import type { EtfInflowsPayload } from "@/lib/sosovalue/etf-inflows-payload";
import type { IndexSnapshotPayload } from "@/lib/sosovalue/index-snapshot-payload";
import { cn } from "@/lib/utils";

const PANEL_CLASS =
  "overflow-hidden rounded-md bg-[#0f172a] p-4 text-white [&_a]:text-[#93c5fd] [&_a:hover]:underline";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export function resolveStructuredContent(output: unknown): unknown {
  const root = asRecord(output);
  if (!root) return output;

  if (root.structuredContent !== undefined) {
    return root.structuredContent;
  }
  if (root.structured_content !== undefined) {
    return root.structured_content;
  }
  if (root.args !== undefined) {
    return root.args;
  }

  const content = root.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      const block = asRecord(item);
      if (block?.type === "text" && typeof block.text === "string") {
        try {
          return JSON.parse(block.text);
        } catch {
          return block.text;
        }
      }
    }
  }

  return output;
}

function isChartPayload(value: unknown): value is CryptoChartPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as CryptoChartPayload;
  return Array.isArray(v.klines) && typeof v.symbol === "string";
}

function isEtfPayload(value: unknown): value is EtfInflowsPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as EtfInflowsPayload;
  return Array.isArray(v.rows) && typeof v.ticker === "string";
}

function isIndexPayload(value: unknown): value is IndexSnapshotPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as IndexSnapshotPayload;
  return typeof v.indexTicker === "string" && v.snapshot != null;
}

function pct(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

function WidgetPreviewReady({
  toolName,
  children,
}: {
  toolName: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    setReady(false);
    const markReady = () => {
      const height = ref.current?.offsetHeight ?? 0;
      if (height > 48) {
        setReady(true);
      }
    };
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(markReady);
    });
    const timers = [80, 200, 500, 1000].map((ms) =>
      window.setTimeout(markReady, ms),
    );
    const element = ref.current;
    const observer = new ResizeObserver(() => {
      markReady();
    });
    if (element) {
      observer.observe(element);
    }
    return () => {
      cancelAnimationFrame(raf);
      for (const id of timers) {
        clearTimeout(id);
      }
      observer.disconnect();
    };
  }, [children]);

  return (
    <div
      ref={ref}
      data-testid={ready ? `tool-widget-ready-${toolName}` : undefined}
    >
      {children}
    </div>
  );
}

export function CryptoChartPreview({ payload }: { payload: CryptoChartPayload }) {
  const closes = payload.klines.map((k) => Number(k.close));

  return (
    <WidgetPreviewReady toolName="show-crypto-chart">
      <div className={PANEL_CLASS}>
        <MiniLineChart
          values={closes}
          label={`${payload.symbol} · daily close (SoSoValue)`}
          stroke="#f87171"
          variant="dark"
        />
        <p className="mt-2 text-xs text-[#cbd5e1]">
          <a href={payload.profileUrl} target="_blank" rel="noreferrer">
            View on SoSoValue
          </a>
        </p>
      </div>
    </WidgetPreviewReady>
  );
}

export function EtfInflowsPreview({ payload }: { payload: EtfInflowsPayload }) {
  const values = payload.rows.map((r) => Number(r.net_inflow));
  const labels = payload.rows.map((r) => String(r.date).slice(0, 10));

  return (
    <WidgetPreviewReady toolName="show-etf-inflows">
      <div className={PANEL_CLASS}>
        <MiniBarChart
          values={values}
          labels={labels}
          label={`${payload.ticker} · daily net inflow (USD)`}
          fill="#f87171"
          variant="dark"
        />
      </div>
    </WidgetPreviewReady>
  );
}

export function IndexSnapshotPreview({
  payload,
}: {
  payload: IndexSnapshotPayload;
}) {
  const s = payload.snapshot;

  return (
    <WidgetPreviewReady toolName="show-index-snapshot">
    <div className={cn(PANEL_CLASS, "border border-[#1e293b]")}>
      <p className="mb-1 text-xs text-[#94a3b8]">SoSoValue Index</p>
      <p className="mb-3 text-xl font-bold">{payload.indexTicker.toUpperCase()}</p>
      <p className="mb-3 text-3xl font-semibold">
        ${Number(s.price).toFixed(2)}
      </p>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-[#94a3b8]">24h</dt>
          <dd className="m-0 font-semibold">{pct(s["24h_change_pct"])}</dd>
        </div>
        <div>
          <dt className="text-[#94a3b8]">7d</dt>
          <dd className="m-0 font-semibold">{pct(s["7day_roi"])}</dd>
        </div>
        <div>
          <dt className="text-[#94a3b8]">1m</dt>
          <dd className="m-0 font-semibold">{pct(s["1month_roi"])}</dd>
        </div>
        <div>
          <dt className="text-[#94a3b8]">YTD</dt>
          <dd className="m-0 font-semibold">{pct(s.ytd)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-[#cbd5e1]">
        <a href={payload.profileUrl} target="_blank" rel="noreferrer">
          SoSoValue Indices
        </a>
      </p>
    </div>
    </WidgetPreviewReady>
  );
}

export function resolveSosovaluePreview(output: unknown) {
  const structured = resolveStructuredContent(output);

  if (isChartPayload(structured)) {
    return { type: "chart" as const, payload: structured };
  }
  if (isEtfPayload(structured)) {
    return { type: "etf" as const, payload: structured };
  }
  if (isIndexPayload(structured)) {
    return { type: "index" as const, payload: structured };
  }

  return null;
}

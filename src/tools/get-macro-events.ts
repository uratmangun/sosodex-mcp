import { type InferSchema, type ToolMetadata } from "xmcp";
import { z } from "zod";

import { getMacroEvents, getMacroEventHistory } from "@/lib/sosovalue/client";
import { toErrorToolResult, toToonToolResult } from "@/lib/sosovalue/tool-result";

export const schema = {
  eventName: z
    .string()
    .optional()
    .describe(
      "Optional macro event name for historical actual/forecast rows (e.g. CPI, FOMC)",
    ),
  historyLimit: z
    .number()
    .int()
    .min(5)
    .max(60)
    .optional()
    .describe("History rows when eventName is set (default 30)"),
};

export const metadata: ToolMetadata = {
  name: "get-macro-events",
  description:
    "SoSoValue macro calendar (/macro/events) plus optional event history. SignalFlow / MarketMind pattern.",
  annotations: {
    title: "Macro events",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export default async function getMacroEventsTool({
  eventName,
  historyLimit,
}: InferSchema<typeof schema>) {
  try {
    const upcoming = await getMacroEvents();
    const trimmed = upcoming.slice(0, 14).map((row) => ({
      date: row.date,
      events: row.events?.slice(0, 8) ?? [],
    }));

    if (eventName?.trim()) {
      const history = await getMacroEventHistory(eventName.trim(), {
        limit: historyLimit ?? 30,
      });
      return toToonToolResult({
        upcoming: trimmed,
        eventName: eventName.trim(),
        history: history.slice(0, historyLimit ?? 30),
      });
    }

    return toToonToolResult({ upcoming: trimmed });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Macro events request failed.";
    return toErrorToolResult(message);
  }
}

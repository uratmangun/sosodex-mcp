import {
  lastAssistantMessageIsCompleteWithToolCalls,
  type DynamicToolUIPart,
  type ToolUIPart,
  type UIMessage,
} from "ai";

export type MapsToolPart = Extract<
  UIMessage["parts"][number],
  { type: `tool-${string}` } | { type: "dynamic-tool" }
>;

export function isToolPart(
  part: UIMessage["parts"][number],
): part is MapsToolPart {
  return (
    (typeof part.type === "string" && part.type.startsWith("tool-")) ||
    part.type === "dynamic-tool"
  );
}

export function getToolName(part: MapsToolPart): string {
  return part.type === "dynamic-tool" ? part.toolName : part.type.slice(5);
}

export const SOSO_WIDGET_TOOL_NAMES = new Set([
  "show-crypto-chart",
  "show-etf-inflows",
  "show-index-snapshot",
]);

const TOOL_TITLES: Record<string, string> = {
  "search-crypto": "Search crypto",
  "get-crypto-detail": "Crypto details",
  "show-crypto-chart": "Crypto price chart",
  "show-etf-inflows": "ETF net inflows",
  "show-index-snapshot": "Index snapshot",
  "search-news": "Search news",
  "get-news-hot": "Hot news",
  "get-macro-events": "Macro events",
  "get-market-overview": "Market overview",
  "get-sector-spotlight": "Sector spotlight",
  "list-indices": "List indices",
  "get-etf-summary": "ETF summary history",
};

export function formatToolTitle(part: MapsToolPart): string {
  const toolName = getToolName(part);
  return TOOL_TITLES[toolName] ?? toolName.replace(/-/g, " ");
}

export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export function findLastUserMessageIndex(messages: UIMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      return index;
    }
  }
  return -1;
}

/** Assistant turn with finished tool output and/or visible text (for webreel waits). */
export function isAssistantTurnSettled(message: UIMessage): boolean {
  if (message.role !== "assistant") {
    return false;
  }
  const toolParts = message.parts.filter(isToolPart);
  if (toolParts.length === 0) {
    return getMessageText(message).length > 0;
  }
  return toolParts.every((part) => part.state === "output-available");
}

export function isChatLastTurnReady(
  messages: UIMessage[],
  isSending: boolean,
): boolean {
  if (isSending) {
    return false;
  }
  // Avoid marking ready between tool-call rounds (auto-continue to assistant text).
  if (lastAssistantMessageIsCompleteWithToolCalls({ messages })) {
    return false;
  }
  const lastUserIndex = findLastUserMessageIndex(messages);
  if (lastUserIndex < 0) {
    return false;
  }
  const assistantTurns = messages
    .slice(lastUserIndex + 1)
    .filter((message) => message.role === "assistant");
  return (
    assistantTurns.length > 0 &&
    assistantTurns.every((message) => isAssistantTurnSettled(message))
  );
}

function assistantTurnsAfterLastUser(messages: UIMessage[]): UIMessage[] {
  const lastUserIndex = findLastUserMessageIndex(messages);
  if (lastUserIndex < 0) {
    return [];
  }
  return messages
    .slice(lastUserIndex + 1)
    .filter((message) => message.role === "assistant");
}

export function turnUsesWidgetTool(messages: UIMessage[]): boolean {
  return assistantTurnsAfterLastUser(messages).some((message) =>
    message.parts
      .filter(isToolPart)
      .some(
        (part) =>
          part.state === "output-available" &&
          SOSO_WIDGET_TOOL_NAMES.has(getToolName(part)),
      ),
  );
}

/** Text summary or widget-only turn — avoids screenshot after tool JSON only. */
export function isTurnSummaryReady(
  messages: UIMessage[],
  isSending: boolean,
): boolean {
  if (!isChatLastTurnReady(messages, isSending)) {
    return false;
  }
  if (turnUsesWidgetTool(messages)) {
    return true;
  }
  return assistantTurnsAfterLastUser(messages).some(
    (message) => getMessageText(message).length >= 40,
  );
}

import type { UIMessage } from "ai";
import { nanoid } from "nanoid";

import { isToolPart, type MapsToolPart } from "@/lib/maps-chat-shared";

export type ChatThread = {
  id: string;
  title: string;
  messages: UIMessage[];
  updatedAt: number;
};

const THREADS_KEY_PREFIX = "maps-assistant-chats-v1";
const ACTIVE_KEY_PREFIX = "maps-assistant-active-chat-v1";

/** Legacy keys (unscoped) — no longer read; cleared on scoped access. */
const LEGACY_THREADS_KEY = "maps-assistant-chats-v1";
const LEGACY_ACTIVE_KEY = "maps-assistant-active-chat-v1";

export function chatThreadsStorageKey(userId: string): string {
  const id = userId.trim();
  if (!id) {
    throw new Error("chatThreadsStorageKey requires a user id");
  }
  return `${THREADS_KEY_PREFIX}:${id}`;
}

export function chatActiveStorageKey(userId: string): string {
  const id = userId.trim();
  if (!id) {
    throw new Error("chatActiveStorageKey requires a user id");
  }
  return `${ACTIVE_KEY_PREFIX}:${id}`;
}

/** Drop pre-scoped localStorage so guest and Google sessions cannot bleed. */
export function clearLegacyChatStorage(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(LEGACY_THREADS_KEY);
  window.localStorage.removeItem(LEGACY_ACTIVE_KEY);
}

const TOOL_STATES = new Set<MapsToolPart["state"]>([
  "approval-requested",
  "approval-responded",
  "input-streaming",
  "input-available",
  "output-available",
  "output-error",
  "output-denied",
]);

function isBrowser() {
  return typeof window !== "undefined";
}

function isTextPart(part: unknown): part is { type: "text"; text: string } {
  return (
    typeof part === "object" &&
    part !== null &&
    (part as { type?: string }).type === "text" &&
    typeof (part as { text?: string }).text === "string"
  );
}

function isToolPartType(type: string): boolean {
  return type === "dynamic-tool" || type.startsWith("tool-");
}

function normalizeToolPart(part: Record<string, unknown>): MapsToolPart | null {
  const type = part.type;
  const toolCallId = part.toolCallId;
  const state = part.state;

  if (typeof type !== "string" || !isToolPartType(type)) {
    return null;
  }
  if (typeof toolCallId !== "string" || !toolCallId.trim()) {
    return null;
  }
  if (typeof state !== "string" || !state.trim()) {
    return null;
  }
  const normalizedState = TOOL_STATES.has(state as MapsToolPart["state"])
    ? (state as MapsToolPart["state"])
    : state === "partial-call" || state === "call"
      ? "input-available"
      : (state as MapsToolPart["state"]);

  const shared = {
    toolCallId,
    state: normalizedState,
    ...(part.input !== undefined ? { input: part.input } : {}),
    ...(part.output !== undefined ? { output: part.output } : {}),
    ...(typeof part.errorText === "string" ? { errorText: part.errorText } : {}),
    ...(part.approval !== undefined ? { approval: part.approval } : {}),
    ...(typeof part.providerExecuted === "boolean"
      ? { providerExecuted: part.providerExecuted }
      : {}),
  };

  if (type === "dynamic-tool") {
    if (typeof part.toolName !== "string" || !part.toolName.trim()) {
      return null;
    }
    return {
      type: "dynamic-tool",
      toolName: part.toolName,
      ...shared,
    } as MapsToolPart;
  }

  return {
    type,
    ...shared,
  } as MapsToolPart;
}

function normalizeStoredPart(part: unknown): UIMessage["parts"][number] | null {
  if (isTextPart(part)) {
    const text = part.text.trim();
    return text ? { type: "text", text } : null;
  }

  if (typeof part !== "object" || part === null) {
    return null;
  }

  return normalizeToolPart(part as Record<string, unknown>);
}

/** Restore UIMessage shape after JSON.parse (localStorage round-trip). */
export function normalizeStoredMessages(messages: unknown): UIMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  const normalized: UIMessage[] = [];

  for (const entry of messages) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }

    const raw = entry as Partial<UIMessage> & { content?: string };
    const role =
      raw.role === "user" || raw.role === "assistant" || raw.role === "system"
        ? raw.role
        : null;

    if (!role) {
      continue;
    }

    let parts = Array.isArray(raw.parts)
      ? raw.parts
          .map(normalizeStoredPart)
          .filter((part): part is UIMessage["parts"][number] => part !== null)
      : [];

    if (parts.length === 0 && typeof raw.content === "string" && raw.content.trim()) {
      parts = [{ type: "text", text: raw.content.trim() }];
    }

    if (parts.length === 0) {
      continue;
    }

    normalized.push({
      id: typeof raw.id === "string" && raw.id.trim() ? raw.id : nanoid(),
      role,
      parts,
      ...(raw.metadata !== undefined ? { metadata: raw.metadata } : {}),
    });
  }

  return normalized;
}

/** Persistable snapshot for localStorage (text + completed tool parts). */
export function sanitizeMessagesForStorage(messages: UIMessage[]): UIMessage[] {
  return normalizeStoredMessages(messages);
}

function normalizeThread(thread: unknown): ChatThread | null {
  if (typeof thread !== "object" || thread === null) {
    return null;
  }

  const raw = thread as Partial<ChatThread>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  if (!id) {
    return null;
  }

  return {
    id,
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : "New chat",
    messages: normalizeStoredMessages(raw.messages),
    updatedAt:
      typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt)
        ? raw.updatedAt
        : Date.now(),
  };
}

export function loadThreads(userId: string): ChatThread[] {
  if (!isBrowser()) return [];
  clearLegacyChatStorage();
  const raw = window.localStorage.getItem(chatThreadsStorageKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeThread)
      .filter((thread): thread is ChatThread => thread !== null);
  } catch {
    return [];
  }
}

export function saveThreads(userId: string, threads: ChatThread[]) {
  if (!isBrowser()) return;
  clearLegacyChatStorage();
  window.localStorage.setItem(
    chatThreadsStorageKey(userId),
    JSON.stringify(threads),
  );
}

export function loadActiveThreadId(userId: string): string | null {
  if (!isBrowser()) return null;
  clearLegacyChatStorage();
  return window.localStorage.getItem(chatActiveStorageKey(userId));
}

export function saveActiveThreadId(userId: string, id: string) {
  if (!isBrowser()) return;
  clearLegacyChatStorage();
  window.localStorage.setItem(chatActiveStorageKey(userId), id);
}

export function createThread(): ChatThread {
  const now = Date.now();
  return {
    id: `chat-${now}-${Math.random().toString(36).slice(2, 9)}`,
    title: "New chat",
    messages: [],
    updatedAt: now,
  };
}

export function deriveTitleFromMessages(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New chat";
  const text = firstUser.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .trim();
  if (!text) return "New chat";
  return text.length > 42 ? `${text.slice(0, 42)}…` : text;
}

function partSearchText(part: UIMessage["parts"][number]): string {
  if (part.type === "text") {
    return part.text;
  }
  if (isToolPart(part)) {
    const chunks = [getToolNameFromPart(part)];
    if (part.input !== undefined) {
      try {
        chunks.push(JSON.stringify(part.input));
      } catch {
        // ignore circular refs
      }
    }
    if (part.state === "output-available" && part.output !== undefined) {
      try {
        chunks.push(JSON.stringify(part.output));
      } catch {
        // ignore
      }
    }
    if (part.state === "output-error" && part.errorText) {
      chunks.push(part.errorText);
    }
    return chunks.join(" ");
  }
  return "";
}

function getToolNameFromPart(part: MapsToolPart): string {
  return part.type === "dynamic-tool" ? part.toolName : part.type.slice(5);
}

export function messageSearchText(messages: UIMessage[]): string {
  return messages
    .flatMap((m) => m.parts.map(partSearchText))
    .join(" ");
}

/** Drop duplicate ids and identical thread content (keeps newest). */
export function dedupeThreads(threads: ChatThread[]): ChatThread[] {
  const byId = new Map<string, ChatThread>();
  for (const thread of threads) {
    const existing = byId.get(thread.id);
    if (!existing || thread.updatedAt >= existing.updatedAt) {
      byId.set(thread.id, thread);
    }
  }

  const byContent = new Set<string>();
  const result: ChatThread[] = [];

  for (const thread of [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const contentKey = `${thread.title}\0${serializeMessagesKey(thread.messages)}`;
    if (byContent.has(contentKey)) {
      continue;
    }
    byContent.add(contentKey);
    result.push(thread);
  }

  return result;
}

export function filterThreads(threads: ChatThread[], query: string): ChatThread[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
  }
  return threads
    .filter((t) => {
      const haystack = `${t.title} ${messageSearchText(t.messages)}`.toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function serializePartForCompare(part: UIMessage["parts"][number]) {
  if (part.type === "text") {
    return { type: part.type, text: part.text };
  }
  if (isToolPart(part)) {
    return {
      type: part.type,
      toolCallId: part.toolCallId,
      state: part.state,
      ...(part.type === "dynamic-tool" ? { toolName: part.toolName } : {}),
      input: part.input ?? null,
      output: part.state === "output-available" ? (part.output ?? null) : null,
      errorText: part.state === "output-error" ? (part.errorText ?? null) : null,
    };
  }
  return { type: part.type };
}

function serializeMessagesForCompare(messages: UIMessage[]): string {
  return JSON.stringify(
    messages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: m.parts.map(serializePartForCompare),
    })),
  );
}

export function serializeMessagesKey(messages: UIMessage[]): string {
  return serializeMessagesForCompare(messages);
}

export function areMessagesEqual(a: UIMessage[], b: UIMessage[]): boolean {
  return serializeMessagesForCompare(a) === serializeMessagesForCompare(b);
}

export function formatThreadMeta(updatedAt: number, messageCount: number): string {
  const diff = Date.now() - updatedAt;
  const countLabel = `${messageCount} message${messageCount === 1 ? "" : "s"}`;
  if (diff < 60_000) return `Just now · ${countLabel}`;
  if (diff < 86_400_000) return `Today · ${countLabel}`;
  if (diff < 172_800_000) return `Yesterday · ${countLabel}`;
  const days = Math.floor(diff / 86_400_000);
  return `${days} days ago · ${countLabel}`;
}

"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import {
  AlertCircleIcon,
  CopyIcon,
  LineChartIcon,
  Settings2Icon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { areMessagesEqual } from "@/lib/maps-chat-store";
import { formatProviderError } from "@/lib/chat-errors";
import { MapsMessageDeleteDialog } from "@/components/maps-message-delete-dialog";
import {
  deleteChatMessage,
  describeMessageDeletion,
} from "@/lib/maps-chat-messages";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
} from "@/components/ai-elements/tool";
import { MapsToolResult } from "@/components/maps-tool-result";
import {
  formatToolTitle,
  isToolPart,
} from "@/lib/maps-chat-shared";
import { MapsModelSelector } from "@/components/maps-model-selector";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UiModel } from "@/lib/models";
import { buildChatRequestBody } from "@/lib/maps-chat-request";
import { DEFAULT_MODEL } from "@/lib/maps-system-prompt";

const MESSAGE_ACTION_CLASS =
  "size-7 rounded-lg text-[#64748b] hover:bg-[#dc2626] hover:text-white [&_svg]:text-current hover:[&_svg]:text-white";

const SUGGESTED_PROMPTS = [
  "Search Bitcoin and Ethereum on SoSoValue",
  "Show the daily price chart for ETH using show-crypto-chart",
  "What are the latest BTC ETF daily net inflows?",
  "Show a MAG7 index snapshot on SoSoValue",
];

type ProviderSettings = {
  baseURL: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
};

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function findLastUserMessageIndex(messages: UIMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      return index;
    }
  }
  return -1;
}

function MapsChatPrompt({
  chat,
  settings,
  models,
  modelsLoading,
  onModelChange,
}: {
  chat: ReturnType<typeof useChat>;
  settings: ProviderSettings;
  models: UiModel[];
  modelsLoading: boolean;
  onModelChange: (modelId: string) => void;
}) {
  const { textInput } = usePromptInputController();

  const handleDismissError = useCallback(() => {
    const lastUserIndex = findLastUserMessageIndex(chat.messages);
    const restoreText =
      lastUserIndex >= 0 ? getMessageText(chat.messages[lastUserIndex]!) : "";

    if (lastUserIndex >= 0) {
      chat.setMessages(chat.messages.slice(0, lastUserIndex));
    }

    chat.clearError();

    if (restoreText) {
      textInput.setInput(restoreText);
    }
  }, [chat, textInput]);

  const handleSubmitPrompt = useCallback(
    ({ text }: { text: string }) => {
      const content = text.trim();
      if (
        !content ||
        chat.status === "submitted" ||
        chat.status === "streaming"
      ) {
        return;
      }

      if (chat.status === "error") {
        handleDismissError();
      }

      void chat.sendMessage(
        {
          role: "user",
          parts: [{ type: "text", text: content }],
        },
        { body: buildChatRequestBody(settings) },
      );
    },
    [chat, handleDismissError, settings],
  );

  const isSending = chat.status === "submitted" || chat.status === "streaming";
  const errorMessage = chat.error ? formatProviderError(chat.error) : null;

  return (
    <div className="border-t border-[#f1f5f9] p-3 md:p-4">
      {errorMessage ? (
        <Alert className="mb-3 border-red-200 bg-red-50 py-2 text-[#0f172a]">
          <AlertCircleIcon className="size-4 text-red-600" />
          <AlertTitle className="text-sm text-[#0f172a]">
            Could not get a response
          </AlertTitle>
          <AlertDescription className="text-xs text-[#334155]">
            {errorMessage}
          </AlertDescription>
        </Alert>
      ) : null}

      <PromptInput className="w-full" onSubmit={handleSubmitPrompt}>
        <PromptInputBody>
          <PromptInputTextarea
            disabled={isSending}
            placeholder="Ask about crypto, ETF inflows, or SoSoValue indices…"
            className="text-[#0f172a] placeholder:text-[#94a3b8]"
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <MapsModelSelector
              disabled={isSending}
              models={models}
              modelsLoading={modelsLoading}
              onModelChange={onModelChange}
              selectedModelId={settings.model || DEFAULT_MODEL}
            />
          </PromptInputTools>
          <PromptInputSubmit
            onStop={() => void chat.stop()}
            onErrorDismiss={handleDismissError}
            status={chat.status}
            className={cn(
              "rounded-lg bg-[#dc2626] text-white hover:bg-[#b91c1c] hover:text-white [&_svg]:text-white",
              chat.status === "error" &&
                "bg-red-600 hover:bg-red-700 hover:text-white",
            )}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

export function MapsChatPanel({
  threadId,
  initialMessages,
  settings,
  models,
  modelsLoading,
  modelsMessage,
  showModelsAlert,
  onMessagesChange,
  onOpenSettings,
  onModelChange,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  settings: ProviderSettings;
  models: UiModel[];
  modelsLoading: boolean;
  modelsMessage: string | null;
  showModelsAlert: boolean;
  onMessagesChange: (messages: UIMessage[]) => void;
  onOpenSettings: () => void;
  onModelChange: (modelId: string) => void;
}) {
  // Transport body is fixed at first useChat render; pass dynamic settings per sendMessage.
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const chat = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    sendAutomaticallyWhen: ({ messages: nextMessages }) =>
      lastAssistantMessageIsCompleteWithToolCalls({ messages: nextMessages }),
  });

  useEffect(() => {
    if (chat.status === "error") {
      chat.clearError();
    }
    // Re-run only when provider settings change, not when chat identity updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.model, settings.baseURL, settings.apiKey, settings.systemPrompt]);

  const onMessagesChangeRef = useRef(onMessagesChange);
  onMessagesChangeRef.current = onMessagesChange;

  const lastPersistedRef = useRef(initialMessages);
  const restoredThreadRef = useRef<string | null>(null);

  // useChat only applies `messages` on first mount. Load persisted thread when switching
  // chats or when the hook started empty before localStorage hydrated — never overwrite
  // live messages after tool calls (stale initialMessages would erase tool output).
  useEffect(() => {
    if (restoredThreadRef.current !== threadId) {
      restoredThreadRef.current = threadId;
      lastPersistedRef.current = initialMessages;
      if (initialMessages.length > 0) {
        chat.setMessages(initialMessages);
      }
      return;
    }

    if (
      initialMessages.length > 0 &&
      chat.messages.length === 0 &&
      !areMessagesEqual(chat.messages, initialMessages)
    ) {
      chat.setMessages(initialMessages);
      lastPersistedRef.current = initialMessages;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- thread switch + empty-chat hydrate only
  }, [threadId, initialMessages]);

  // Persist when idle — avoids saving mid-stream assistant turns with incomplete tool parts.
  useEffect(() => {
    if (chat.status === "submitted" || chat.status === "streaming") {
      return;
    }
    if (areMessagesEqual(chat.messages, lastPersistedRef.current)) {
      return;
    }
    lastPersistedRef.current = chat.messages;
    onMessagesChangeRef.current(chat.messages);
  }, [chat.messages, chat.status]);

  useEffect(() => {
    const flushMessages = () => {
      if (chat.messages.length === 0) {
        return;
      }
      onMessagesChangeRef.current(chat.messages);
    };

    window.addEventListener("pagehide", flushMessages);
    return () => window.removeEventListener("pagehide", flushMessages);
  }, [chat.messages]);

  const handleSuggestedPrompt = useCallback(
    (prompt: string) => {
      if (chat.status === "submitted" || chat.status === "streaming") {
        return;
      }
      void chat.sendMessage(
        {
          role: "user",
          parts: [{ type: "text", text: prompt }],
        },
        { body: buildChatRequestBody(settings) },
      );
    },
    [chat, settings],
  );

  const copyMessageText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard may be unavailable outside a secure context.
    }
  }, []);

  const isSending = chat.status === "submitted" || chat.status === "streaming";

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingDeleteCopy = useMemo(() => {
    if (!pendingDeleteId) {
      return null;
    }
    return describeMessageDeletion(chat.messages, pendingDeleteId);
  }, [chat.messages, pendingDeleteId]);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteId || isSending) {
      return;
    }

    chat.setMessages(deleteChatMessage(chat.messages, pendingDeleteId));

    if (chat.status === "error") {
      chat.clearError();
    }

    setPendingDeleteId(null);
  }, [chat, isSending, pendingDeleteId]);

  return (
    <div className="flex min-h-[68vh] flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#f1f5f9] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#fef2f2] text-[#dc2626]">
            <LineChartIcon className="size-3.5" />
          </span>
          <span className="text-[15px] font-semibold text-[#0f172a]">
            SoSoValue assistant
          </span>
          <span className="rounded-full bg-[#fef2f2] px-2.5 py-0.5 text-[11px] font-medium text-[#b91c1c]">
            SoSoValue tools
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenSettings}
          className="h-8 rounded-lg border-[#e2e8f0] bg-white text-[12px] text-[#334155]"
        >
          <Settings2Icon className="size-3.5" />
          API settings
        </Button>
      </div>

      {showModelsAlert && modelsMessage ? (
        <div className="border-b border-[#f1f5f9] px-4 py-2">
          <Alert className="border-amber-200 bg-amber-50 py-2 text-[#0f172a]">
            <AlertCircleIcon className="size-4 text-[#92400e]" />
            <AlertTitle className="text-sm text-[#0f172a]">Model source</AlertTitle>
            <AlertDescription className="text-xs text-[#334155]">
              {modelsMessage}
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        <Conversation className="min-h-[420px] flex-1">
          <ConversationContent className="gap-6 px-4 py-6">
            {chat.messages.length === 0 ? (
              <ConversationEmptyState
                title="What can SoSoValue help you explore?"
                description="Search tokens, open price charts, ETF inflows, and index snapshots via the SoSoValue MCP tools."
                icon={<LineChartIcon className="size-5 text-[#dc2626]" />}
              >
                <div className="flex w-full max-w-lg flex-col gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="outline"
                      className="h-auto justify-start whitespace-normal rounded-lg border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-3 text-left text-[13px] font-normal text-[#334155] transition-colors hover:border-black hover:bg-white hover:text-black"
                      onClick={() => handleSuggestedPrompt(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </ConversationEmptyState>
            ) : null}

            {chat.messages.map((message) => {
              const textParts = message.parts.filter((part) => part.type === "text");
              const toolParts =
                message.role === "assistant"
                  ? message.parts.filter(isToolPart)
                  : [];
              const messageText = textParts.map((part) => part.text).join("\n");
              const hasText = messageText.trim().length > 0;

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex w-full max-w-[95%] flex-col gap-1",
                    message.role === "user" && "ml-auto items-end",
                  )}
                >
                  {toolParts.map((part) => (
                    <Tool
                      key={part.toolCallId}
                      open={part.state === "output-available"}
                    >
                      {part.type === "dynamic-tool" ? (
                        <ToolHeader
                          type={part.type}
                          state={part.state}
                          toolName={part.toolName}
                          title={formatToolTitle(part)}
                        />
                      ) : (
                        <ToolHeader
                          type={part.type}
                          state={part.state}
                          title={formatToolTitle(part)}
                        />
                      )}
                      <ToolContent>
                        <ToolInput input={part.input} />
                        <MapsToolResult part={part} />
                      </ToolContent>
                    </Tool>
                  ))}

                  {(message.role === "user" || hasText) && (
                  <Message
                    from={message.role}
                    className={cn(
                      "w-full max-w-full gap-0",
                      message.role === "user" && "w-fit",
                    )}
                  >
                    <MessageContent
                      className={cn(
                        message.role === "assistant" &&
                          "w-full text-[#0f172a] [&_p]:text-[#0f172a] [&_li]:text-[#0f172a] [&_ol]:text-[#0f172a] [&_ul]:text-[#0f172a] [&_strong]:text-[#0f172a] [&_em]:text-[#0f172a] [&_h1]:text-[#0f172a] [&_h2]:text-[#0f172a] [&_h3]:text-[#0f172a] [&_a]:text-[#dc2626] [&_[data-streamdown=code-block-body]]:bg-[#f1f5f9] [&_[data-streamdown=code-block-body]]:text-[#0f172a] [&_[data-streamdown=code-block-body]]:border [&_[data-streamdown=code-block-body]]:border-[#e2e8f0] [&_[data-streamdown=inline-code]]:border [&_[data-streamdown=inline-code]]:border-[#334155] [&_[data-streamdown=inline-code]]:bg-[#0f172a] [&_[data-streamdown=inline-code]]:text-white",
                      )}
                    >
                      {textParts.map((part, index) => (
                        <MessageResponse
                          key={`${message.id}-text-${index}`}
                          className={
                            message.role === "assistant"
                              ? "text-[#0f172a]"
                              : undefined
                          }
                        >
                          {part.text}
                        </MessageResponse>
                      ))}
                    </MessageContent>
                  </Message>
                  )}
                  <MessageActions className="h-7">
                    {hasText ? (
                      <MessageAction
                        label="Copy"
                        tooltip="Copy"
                        disabled={isSending}
                        onClick={() => void copyMessageText(messageText)}
                        className={MESSAGE_ACTION_CLASS}
                      >
                        <CopyIcon className="size-3.5" />
                      </MessageAction>
                    ) : null}
                    <MessageAction
                      label={
                        message.role === "user"
                          ? "Delete message and reply"
                          : "Delete message"
                      }
                      tooltip={
                        message.role === "user"
                          ? "Delete message and reply"
                          : "Delete message"
                      }
                      disabled={isSending}
                      onClick={() => setPendingDeleteId(message.id)}
                      className={cn(
                        MESSAGE_ACTION_CLASS,
                        "hover:bg-red-600 hover:[&_svg]:text-white",
                      )}
                    >
                      <Trash2Icon className="size-3.5" />
                    </MessageAction>
                  </MessageActions>
                </div>
              );
            })}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInputProvider>
          <MapsChatPrompt
            chat={chat}
            models={models}
            modelsLoading={modelsLoading}
            onModelChange={onModelChange}
            settings={settings}
          />
        </PromptInputProvider>
      </div>

      <MapsMessageDeleteDialog
        open={pendingDeleteId !== null && pendingDeleteCopy !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null);
          }
        }}
        title={pendingDeleteCopy?.title ?? "Delete this message?"}
        description={
          pendingDeleteCopy?.description ??
          "This message will be removed from the chat. This cannot be undone."
        }
        preview={pendingDeleteCopy?.preview ?? ""}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

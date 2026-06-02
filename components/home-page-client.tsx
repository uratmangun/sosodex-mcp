"use client";

import type { UIMessage } from "ai";
import { Loader2Icon, LogOutIcon, MenuIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isWebreelDemoMode } from "@/lib/maps-demo-tools";

import { MapsAuthSignIn } from "@/components/maps-auth-sign-in";
import { MapsChatPanel } from "@/components/maps-chat-panel";
import { MapsMcpEndpointCopy } from "@/components/maps-mcp-endpoint-copy";
import { MapsChatSidebar } from "@/components/maps-chat-sidebar";
import { authClient } from "@/lib/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  areMessagesEqual,
  sanitizeMessagesForStorage,
  createThread,
  dedupeThreads,
  deriveTitleFromMessages,
  filterThreads,
  loadActiveThreadId,
  loadThreads,
  saveActiveThreadId,
  saveThreads,
  type ChatThread,
} from "@/lib/maps-chat-store";
import {
  fetchRemoteChatState,
  saveRemoteChatState,
} from "@/lib/maps-chat-sync-client";
import {
  FREE_DEMO_MODEL,
  isLegacyFreeDemoModel,
  normalizeChatModel,
} from "@/lib/maps-model-defaults";
import { DEFAULT_MODEL } from "@/lib/maps-system-prompt";
import type { UiModel } from "@/lib/models";
import { cn } from "@/lib/utils";

type ModelApiResponse = {
  configured: boolean;
  message: string | null;
  data: UiModel[];
};

type DefaultProviderConfig = {
  defaultConfigured: boolean;
  defaultModel: string;
};

type ProviderSettings = {
  baseURL: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
};

const SETTINGS_KEY_PREFIX = "maps-assistant-settings-v1";
const LEGACY_SETTINGS_KEY = "maps-assistant-settings-v1";

function settingsStorageKey(userId: string): string {
  return `${SETTINGS_KEY_PREFIX}:${userId}`;
}

function clearLegacySettingsStorage(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_SETTINGS_KEY);
}

const FALLBACK_MODELS: UiModel[] = [
  {
    id: DEFAULT_MODEL,
    name: DEFAULT_MODEL,
    provider: "openai",
    providerLabel: "OpenAI-compatible",
  },
  {
    id: FREE_DEMO_MODEL,
    name: FREE_DEMO_MODEL,
    provider: "openai",
    providerLabel: "OpenAI-compatible",
  },
];

function defaultSettingsForUser(isGuest: boolean): ProviderSettings {
  return {
    baseURL: "",
    apiKey: "",
    model: isGuest ? FREE_DEMO_MODEL : DEFAULT_MODEL,
    systemPrompt: "",
  };
}

function loadSettings(userId: string, isGuest: boolean): ProviderSettings {
  if (typeof window === "undefined") {
    return defaultSettingsForUser(isGuest);
  }

  clearLegacySettingsStorage();
  const raw = window.localStorage.getItem(settingsStorageKey(userId));
  const fallback = defaultSettingsForUser(isGuest);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ProviderSettings>;
    const usesCustomProvider = Boolean(parsed.baseURL?.trim());
    const model = normalizeChatModel(parsed.model, {
      isGuest,
      usesCustomProvider,
    });

    const settings: ProviderSettings = {
      baseURL: parsed.baseURL ?? "",
      apiKey: parsed.apiKey ?? "",
      model,
      systemPrompt: parsed.systemPrompt ?? "",
    };

    if (
      parsed.model?.trim() !== model ||
      isLegacyFreeDemoModel(parsed.model ?? "")
    ) {
      saveSettings(userId, settings);
    }

    return settings;
  } catch {
    return fallback;
  }
}

function saveSettings(userId: string, settings: ProviderSettings): void {
  if (typeof window === "undefined") return;
  clearLegacySettingsStorage();
  window.localStorage.setItem(
    settingsStorageKey(userId),
    JSON.stringify(settings),
  );
}

function ensureInitialThreads(userId: string): { threads: ChatThread[]; activeId: string } {
  const stored = loadThreads(userId);
  const activeStored = loadActiveThreadId(userId);

  if (stored.length > 0) {
    const activeId =
      activeStored && stored.some((t) => t.id === activeStored)
        ? activeStored
        : stored[0].id;
    return { threads: stored, activeId };
  }

  const first = createThread();
  saveThreads(userId, [first]);
  saveActiveThreadId(userId, first.id);
  return { threads: [first], activeId: first.id };
}

export function HomePageClient() {
  const searchParams = useSearchParams();
  const webreelDemo = isWebreelDemoMode(searchParams.toString());
  const signInCallbackURL =
    searchParams.toString().length > 0
      ? `/?${searchParams.toString()}`
      : "/";
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [serverSynced, setServerSynced] = useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeThreadIdRef = useRef<string | null>(null);
  const threadsRef = useRef<ChatThread[]>([]);
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const signedIn = Boolean(session?.user);
  const userId = session?.user?.id ?? "";
  const isGuest = Boolean(
    session?.user &&
      "isAnonymous" in session.user &&
      session.user.isAnonymous,
  );

  const [settings, setSettings] = useState<ProviderSettings>(() =>
    defaultSettingsForUser(false),
  );
  const [draftSettings, setDraftSettings] = useState<ProviderSettings>(() =>
    defaultSettingsForUser(false),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [models, setModels] = useState<UiModel[]>(FALLBACK_MODELS);
  const [modelsMessage, setModelsMessage] = useState<string | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [defaultProvider, setDefaultProvider] = useState<DefaultProviderConfig>({
    defaultConfigured: false,
    defaultModel: DEFAULT_MODEL,
  });

  const usesCustomProvider = settings.baseURL.trim() !== "";
  const showModelsAlert = !defaultProvider.defaultConfigured && !usesCustomProvider;

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  const scheduleServerSync = useCallback(
    (next: ChatThread[], activeId: string) => {
      if (!serverSynced || !signedIn) return;
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = setTimeout(() => {
        void saveRemoteChatState(next, activeId).catch(() => {
          // Keep local cache; user can refresh to retry.
        });
      }, 500);
    },
    [serverSynced, signedIn],
  );

  useEffect(() => {
    if (!hydrated || !signedIn || !userId) return;

    const nextSettings = loadSettings(userId, isGuest);
    setSettings(nextSettings);
    setDraftSettings(nextSettings);
  }, [hydrated, signedIn, userId, isGuest]);

  useEffect(() => {
    if (!hydrated) return;

    if (!signedIn || !userId) {
      setServerSynced(false);
      setThreads([]);
      setActiveThreadId(null);
      return;
    }

    let cancelled = false;
    setServerSynced(false);

    void (async () => {
      try {
        const remote = await fetchRemoteChatState();
        const local = loadThreads(userId);
        let nextThreads = dedupeThreads(remote.threads);
        let activeId = remote.activeThreadId;

        if (nextThreads.length === 0 && local.length > 0) {
          nextThreads = dedupeThreads(local);
          const storedActive = loadActiveThreadId(userId);
          activeId =
            storedActive && nextThreads.some((t) => t.id === storedActive)
              ? storedActive
              : (nextThreads[0]?.id ?? null);
          if (activeId) {
            const saved = await saveRemoteChatState(nextThreads, activeId);
            nextThreads = saved.threads;
            activeId = saved.activeThreadId;
          }
        }

        if (nextThreads.length === 0) {
          const first = createThread();
          nextThreads = [first];
          activeId = first.id;
          await saveRemoteChatState(nextThreads, activeId);
        }

        if (!activeId || !nextThreads.some((t) => t.id === activeId)) {
          activeId = nextThreads[0]!.id;
        }

        if (cancelled) return;

        saveThreads(userId, nextThreads);
        saveActiveThreadId(userId, activeId);
        setThreads(nextThreads);
        setActiveThreadId(activeId);
        setServerSynced(true);
      } catch {
        if (cancelled) return;
        const { threads: initialThreads, activeId } = ensureInitialThreads(userId);
        const fallback = dedupeThreads(initialThreads);
        saveThreads(userId, fallback);
        saveActiveThreadId(userId, activeId);
        setThreads(fallback);
        setActiveThreadId(activeId);
        setServerSynced(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, signedIn, userId]);

  useEffect(() => {
    if (!hydrated || !signedIn) return;

    void (async () => {
      try {
        const response = await fetch("/api/ai/provider", { cache: "no-store" });
        if (!response.ok) return;
        const config = (await response.json()) as DefaultProviderConfig;
        setDefaultProvider(config);
      } catch {
        // Keep fallback; custom provider may still work.
      }
    })();
  }, [hydrated, signedIn]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    saveSettings(userId, settings);
  }, [hydrated, settings, userId]);

  const modelOptions = useMemo(() => {
    const map = new Map<string, UiModel>();

    for (const model of [...models, ...FALLBACK_MODELS]) {
      map.set(model.id, model);
    }

    if (!map.has(settings.model)) {
      map.set(settings.model, {
        id: settings.model,
        name: settings.model,
        provider: "openai",
        providerLabel: "Custom",
      });
    }

    return Array.from(map.values());
  }, [models, settings.model]);

  const loadModels = useCallback(
    async (
      nextSettings: ProviderSettings,
      providerConfig: DefaultProviderConfig = defaultProvider,
    ) => {
      const custom = nextSettings.baseURL.trim() !== "";

      if (!custom && !providerConfig.defaultConfigured) {
        setModels(FALLBACK_MODELS);
        setModelsMessage(
          "Configure AI_PROVIDER_* on the server or add a custom OpenAI-compatible URL in API settings.",
        );
        return;
      }

      setModelsLoading(true);

      try {
        const response = await fetch("/api/models", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            custom
              ? {
                  baseURL: nextSettings.baseURL,
                  apiKey: nextSettings.apiKey,
                }
              : {},
          ),
        });

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }

        const payload = (await response.json()) as ModelApiResponse;
        setModels(payload.data.length > 0 ? payload.data : FALLBACK_MODELS);
        setModelsMessage(payload.message ?? null);

        const preferredModel = nextSettings.model.trim();
        const hasPreferred =
          preferredModel.length > 0 &&
          payload.data.some((model) => model.id === preferredModel);

        if (payload.data.length > 0 && !hasPreferred) {
          const freeModel = payload.data.find((m) => m.id === FREE_DEMO_MODEL);
          setSettings((prev) => ({
            ...prev,
            model: freeModel?.id ?? payload.data[0]!.id,
          }));
        }

        setSettings((prev) => {
          const usesCustomProvider = prev.baseURL.trim() !== "";
          const normalized = normalizeChatModel(prev.model, {
            isGuest,
            usesCustomProvider,
          });
          if (normalized === prev.model) return prev;
          return { ...prev, model: normalized };
        });
      } catch {
        setModels(FALLBACK_MODELS);
        setModelsMessage("Could not load models from the configured API.");
      } finally {
      setModelsLoading(false);
    }
  },
    [defaultProvider, isGuest],
  );

  useEffect(() => {
    if (!hydrated || !signedIn) return;
    void loadModels(settings, defaultProvider);
    // Reload model list when provider config changes — not when only the selected model changes.
  }, [
    hydrated,
    signedIn,
    loadModels,
    defaultProvider,
    settings.baseURL,
    settings.apiKey,
  ]);

  useEffect(() => {
    if (!hydrated || settings.baseURL.trim()) return;

    setSettings((prev) => {
      const normalized = normalizeChatModel(prev.model, {
        isGuest,
        usesCustomProvider: false,
      });
      if (normalized === prev.model) return prev;
      const next = { ...prev, model: normalized };
      if (userId) saveSettings(userId, next);
      return next;
    });
  }, [hydrated, isGuest, settings.baseURL, userId]);

  const signOut = useCallback(async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  }, []);

  const visibleThreads = useMemo(
    () => filterThreads(threads, searchQuery),
    [threads, searchQuery],
  );

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );

  const persistThreads = useCallback(
    (next: ChatThread[], opts?: { activeId?: string }) => {
      if (!userId) return;
      const deduped = dedupeThreads(next);
      setThreads(deduped);
      saveThreads(userId, deduped);
      const activeId = opts?.activeId ?? activeThreadIdRef.current;
      if (activeId) {
        saveActiveThreadId(userId, activeId);
        scheduleServerSync(deduped, activeId);
      }
    },
    [scheduleServerSync, userId],
  );

  const handleSelectThread = useCallback(
    (id: string) => {
      if (!userId) return;
      setActiveThreadId(id);
      saveActiveThreadId(userId, id);
      setSidebarOpen(false);
      scheduleServerSync(threadsRef.current, id);
    },
    [scheduleServerSync, userId],
  );

  const handleDeleteThread = useCallback(
    (threadId: string) => {
      if (!userId) return;
      const current = threadsRef.current;
      const next = current.filter((t) => t.id !== threadId);
      let activeId = activeThreadIdRef.current;

      if (next.length === 0) {
        const fresh = createThread();
        next.push(fresh);
        activeId = fresh.id;
      } else if (activeId === threadId) {
        activeId = next[0]!.id;
      }

      setActiveThreadId(activeId);
      persistThreads(next, { activeId: activeId ?? undefined });
    },
    [persistThreads, userId],
  );

  useEffect(() => {
    if (!sidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sidebarOpen]);

  const handleNewChat = useCallback(() => {
    const thread = createThread();
    const next = [thread, ...threads];
    persistThreads(next);
    handleSelectThread(thread.id);
    setSearchQuery("");
  }, [handleSelectThread, persistThreads, threads]);

  const handleMessagesChange = useCallback((threadId: string, messages: UIMessage[]) => {
    setThreads((prev) => {
      const current = prev.find((t) => t.id === threadId);
      if (current && areMessagesEqual(current.messages, messages)) {
        return prev;
      }

      const persistedMessages = sanitizeMessagesForStorage(messages);

      const next = prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              messages: persistedMessages,
              title: deriveTitleFromMessages(persistedMessages),
              updatedAt: Date.now(),
            }
          : t,
      );
      if (userId) {
        saveThreads(userId, next);
      }
      const activeId = activeThreadIdRef.current;
      if (serverSynced && activeId) {
        scheduleServerSync(next, activeId);
      }
      return next;
    });
  }, [scheduleServerSync, serverSynced, userId]);

  const handleActiveMessagesChange = useCallback(
    (messages: UIMessage[]) => {
      if (!activeThreadId) return;
      handleMessagesChange(activeThreadId, messages);
    },
    [activeThreadId, handleMessagesChange],
  );

  const handleSaveSettings = useCallback(() => {
    const nextModel = draftSettings.model.trim() || settings.model || DEFAULT_MODEL;

    const nextSettings: ProviderSettings = {
      baseURL: draftSettings.baseURL.trim(),
      apiKey: draftSettings.apiKey.trim(),
      model: nextModel,
      systemPrompt: draftSettings.systemPrompt,
    };

    setSettings(nextSettings);
    setSettingsOpen(false);
    void loadModels(nextSettings, defaultProvider);
  }, [draftSettings, defaultProvider, loadModels, settings.model]);

  if (!hydrated || sessionPending) {
    return (
      <main className="maps-quota-light flex min-h-screen items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-[#64748b]" />
      </main>
    );
  }

  return (
    <main className="maps-quota-light flex min-h-dvh flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 py-5 md:px-6 md:py-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {signedIn ? (
              <Button
                type="button"
                data-testid="open-chats"
                variant="outline"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="size-9 shrink-0 rounded-xl border-[#e2e8f0] bg-white text-[#334155] hover:bg-[#f8fafc] hover:text-black [&_svg]:hover:text-black"
                aria-label="Open chats"
              >
                <MenuIcon className="size-4" />
              </Button>
            ) : null}
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#dc2626] text-sm font-bold text-white">
              S
            </span>
            <div>
              <h1 className="text-[17px] font-semibold tracking-tight text-[#0f172a]">
                SoSoValue assistant
              </h1>
              <p className="text-[12px] text-[#64748b]">
                {signedIn &&
                session?.user &&
                "isAnonymous" in session.user &&
                session.user.isAnonymous
                  ? "Guest · chats isolated per session in SQLite"
                  : signedIn && session?.user.email
                    ? session.user.email
                    : "Crypto, ETFs, and index data from SoSoValue"}
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
          
            {signedIn ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void signOut()}
                className="h-8 gap-1.5 rounded-lg border-[#e2e8f0] bg-white text-[12px] text-[#334155]"
              >
                <LogOutIcon className="size-3.5" />
                Sign out
              </Button>
            ) : null}
          </nav>
        </header>

        {!signedIn ? (
          <MapsAuthSignIn
            className="flex-1 justify-center"
            callbackURL={signInCallbackURL}
          />
        ) : !serverSynced || !activeThreadId || !activeThread ? (
          <main className="flex flex-1 items-center justify-center">
            <Loader2Icon className="size-6 animate-spin text-[#64748b]" />
          </main>
        ) : (
          <>
            <MapsChatSidebar
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              visibleThreads={visibleThreads}
              activeThreadId={activeThreadId}
              onNewChat={handleNewChat}
              onSelectThread={handleSelectThread}
              onDeleteThread={handleDeleteThread}
            />

            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <MapsMcpEndpointCopy className="max-w-none shrink-0" />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <MapsChatPanel
                  key={activeThreadId}
                  threadId={activeThreadId}
                  initialMessages={activeThread.messages}
                  settings={settings}
                  models={modelOptions}
                  modelsLoading={modelsLoading}
                  modelsMessage={modelsMessage}
                  showModelsAlert={showModelsAlert}
                  webreelDemo={webreelDemo}
                  onMessagesChange={handleActiveMessagesChange}
                  onOpenSettings={() => {
                    setDraftSettings(settings);
                    setSettingsOpen(true);
                  }}
                  onModelChange={(modelId) => {
                    setSettings((prev) => {
                      const next = { ...prev, model: modelId };
                      if (userId) {
                        saveSettings(userId, next);
                      }
                      return next;
                    });
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog onOpenChange={setSettingsOpen} open={settingsOpen}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 space-y-3 bg-popover px-4 pt-4">
            <DialogHeader>
              <DialogTitle>API settings</DialogTitle>
              <DialogDescription>
                The SoSoValue assistant uses the app&apos;s built-in provider by default.
                Optionally connect your own OpenAI-compatible endpoint — stored locally in your
                browser.
              </DialogDescription>
            </DialogHeader>

            {defaultProvider.defaultConfigured && !draftSettings.baseURL.trim() ? (
              <p className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-[12px] text-[#334155]">
                Using the app provider. Leave the URL empty to keep the built-in provider.
              </p>
            ) : null}
          </div>

          <div className="max-h-[calc(90dvh-12rem)] overflow-y-auto overscroll-contain bg-popover px-4 pt-2 pb-3">
            <FieldGroup className="gap-5 pb-0">
            <Field>
              <FieldLabel htmlFor="base-url">Custom provider URL (optional)</FieldLabel>
              <FieldContent>
                <Input
                  id="base-url"
                  onChange={(event) => {
                    setDraftSettings((prev) => ({
                      ...prev,
                      baseURL: event.target.value,
                    }));
                  }}
                  placeholder="https://api.openai.com/v1"
                  value={draftSettings.baseURL}
                />
                <FieldDescription>
                  Public HTTPS endpoint including the API version path (e.g. /v1). Clear to use
                  the built-in provider.
                </FieldDescription>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="api-key">Custom API key (optional)</FieldLabel>
              <FieldContent>
                <Input
                  id="api-key"
                  onChange={(event) => {
                    setDraftSettings((prev) => ({
                      ...prev,
                      apiKey: event.target.value,
                    }));
                  }}
                  placeholder="sk-..."
                  type="password"
                  value={draftSettings.apiKey}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="model-id">Default model</FieldLabel>
              <FieldContent>
                <Input
                  id="model-id"
                  onChange={(event) => {
                    setDraftSettings((prev) => ({
                      ...prev,
                      model: event.target.value,
                    }));
                  }}
                  placeholder={DEFAULT_MODEL}
                  value={draftSettings.model}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="system-prompt">System prompt override</FieldLabel>
              <FieldContent>
                <Textarea
                  className="mb-0 min-h-36 font-mono text-sm"
                  id="system-prompt"
                  onChange={(event) => {
                    setDraftSettings((prev) => ({
                      ...prev,
                      systemPrompt: event.target.value,
                    }));
                  }}
                  placeholder="Leave blank to use the SoSoValue assistant default system prompt."
                  value={draftSettings.systemPrompt}
                />
              </FieldContent>
            </Field>
          </FieldGroup>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 gap-0 rounded-b-xl border-t border-border bg-popover !p-0">
            <Button
              onClick={() => {
                setSettingsOpen(false);
              }}
              variant="outline"
              className="my-3 mr-2 mb-3 ml-3 sm:ml-0"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              className="my-3 mr-4 mb-3 bg-[#dc2626] text-white hover:bg-[#b91c1c] hover:text-white"
            >
              Save settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

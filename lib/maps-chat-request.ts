import { FREE_DEMO_MODEL, normalizeChatModel } from "@/lib/maps-model-defaults";
import { DEFAULT_MODEL } from "@/lib/maps-system-prompt";

export type MapsChatRequestSettings = {
  baseURL: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
};

/** Per-request body for /api/chat — avoids stale values from useChat transport. */
export function buildChatRequestBody(settings: MapsChatRequestSettings) {
  const usesCustomProvider = settings.baseURL.trim() !== "";
  const model = normalizeChatModel(settings.model, { usesCustomProvider });

  return {
    baseURL: settings.baseURL,
    apiKey: settings.apiKey,
    model: model || (usesCustomProvider ? DEFAULT_MODEL : FREE_DEMO_MODEL),
    systemPrompt: settings.systemPrompt,
  };
}

import { FREE_DEMO_MODEL, normalizeChatModel } from "@/lib/maps-model-defaults";
import { DEFAULT_MODEL } from "@/lib/maps-system-prompt";
import {
  validateProviderBaseUrl,
  type ProviderBaseUrlValidationResult,
} from "@/lib/provider-url";

export type AiProviderSource = "default" | "custom";

export type ResolvedAiProvider =
  | {
      ok: true;
      baseURL: string;
      apiKey: string | undefined;
      source: AiProviderSource;
      defaultModel: string;
    }
  | {
      ok: false;
      error: string;
    };

function isAllowedLocalhost(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

export function normalizeServerProviderBaseUrl(
  rawValue: string,
): ProviderBaseUrlValidationResult {
  const value = rawValue.trim();

  if (!value) {
    return {
      ok: false,
      error: "AI_PROVIDER_BASE_URL is not configured.",
    };
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return {
      ok: false,
      error: "AI_PROVIDER_BASE_URL must be a valid URL.",
    };
  }

  if (!url.hostname) {
    return {
      ok: false,
      error: "AI_PROVIDER_BASE_URL must include a hostname.",
    };
  }

  if (url.username || url.password) {
    return {
      ok: false,
      error: "AI_PROVIDER_BASE_URL must not include embedded credentials.",
    };
  }

  if (url.search || url.hash) {
    return {
      ok: false,
      error: "AI_PROVIDER_BASE_URL must not include query strings or hash fragments.",
    };
  }

  const hostname = url.hostname;

  if (url.protocol === "http:" && isAllowedLocalhost(hostname)) {
    return {
      ok: true,
      normalizedUrl: url.toString().replace(/\/$/, ""),
    };
  }

  if (url.protocol === "https:") {
    return validateProviderBaseUrl(value);
  }

  return {
    ok: false,
    error:
      "AI_PROVIDER_BASE_URL must use https:// for public hosts, or http://localhost / http://127.0.0.1 for local development.",
  };
}

export function getServerDefaultProvider() {
  const baseURL = process.env.AI_PROVIDER_BASE_URL?.trim() ?? "";
  const apiKey = process.env.AI_PROVIDER_API_KEY?.trim() || undefined;
  const defaultModel =
    process.env.AI_PROVIDER_DEFAULT_MODEL?.trim() || FREE_DEMO_MODEL;

  return { baseURL, apiKey, defaultModel };
}

export function isDefaultProviderConfigured() {
  const { baseURL } = getServerDefaultProvider();
  if (!baseURL) return false;
  return normalizeServerProviderBaseUrl(baseURL).ok;
}

export function getDefaultProviderPublicConfig() {
  const { defaultModel } = getServerDefaultProvider();
  return {
    defaultConfigured: isDefaultProviderConfigured(),
    defaultModel,
  };
}

export function resolveAiProvider({
  clientBaseURL,
  clientApiKey,
}: {
  clientBaseURL: string;
  clientApiKey?: string;
}): ResolvedAiProvider {
  const { defaultModel } = getServerDefaultProvider();
  const clientBase = clientBaseURL.trim();

  if (clientBase) {
    const validated = validateProviderBaseUrl(clientBase);

    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }

    return {
      ok: true,
      baseURL: validated.normalizedUrl,
      apiKey: clientApiKey?.trim() || undefined,
      source: "custom",
      defaultModel,
    };
  }

  const server = getServerDefaultProvider();

  if (!server.baseURL) {
    return {
      ok: false,
      error:
        "Configure AI_PROVIDER_BASE_URL and AI_PROVIDER_API_KEY on the server, or add a custom provider in API settings.",
    };
  }

  const validated = normalizeServerProviderBaseUrl(server.baseURL);

  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  return {
    ok: true,
    baseURL: validated.normalizedUrl,
    apiKey: server.apiKey,
    source: "default",
    defaultModel,
  };
}

export function resolveChatModel(
  clientModel: string | undefined,
  resolved: Extract<ResolvedAiProvider, { ok: true }>,
) {
  const usesCustomProvider = resolved.source === "custom";
  const trimmed = clientModel?.trim();

  if (trimmed) {
    return normalizeChatModel(trimmed, { usesCustomProvider });
  }

  return normalizeChatModel(resolved.defaultModel, { usesCustomProvider });
}

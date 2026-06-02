/** Free model for guest sessions, webreel demos, and local provider defaults. */
export const FREE_DEMO_MODEL = "minimax-m3-free";

/** Previously used free models — migrate away on load. */
export const LEGACY_FREE_DEMO_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-super-120b-a12b",
] as const;

export function isFreeDemoModel(modelId: string): boolean {
  return modelId.trim() === FREE_DEMO_MODEL;
}

export function isLegacyFreeDemoModel(modelId: string): boolean {
  const normalized = modelId.trim().toLowerCase();
  return LEGACY_FREE_DEMO_MODELS.some(
    (legacy) => legacy.toLowerCase() === normalized,
  );
}

/**
 * Normalize a stored or requested model id.
 * Guests always use the current free demo model when on the built-in provider.
 */
export function normalizeChatModel(
  modelId: string | undefined,
  options?: { isGuest?: boolean; usesCustomProvider?: boolean },
): string {
  const trimmed = modelId?.trim() ?? "";
  const { isGuest = false, usesCustomProvider = false } = options ?? {};

  if (isLegacyFreeDemoModel(trimmed)) {
    return usesCustomProvider ? trimmed : FREE_DEMO_MODEL;
  }

  if (isGuest && !usesCustomProvider) {
    return FREE_DEMO_MODEL;
  }

  return trimmed || FREE_DEMO_MODEL;
}

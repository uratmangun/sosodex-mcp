"use client";

import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";

function getClientAuthBaseUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.origin;
}

export const authClient = createAuthClient({
  baseURL: getClientAuthBaseUrl(),
  plugins: [anonymousClient()],
});

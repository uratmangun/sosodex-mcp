"use client";

import { MapsMcpEndpointCopy } from "@/components/maps-mcp-endpoint-copy";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MapsAuthSignIn({
  title = "Use the SoSoValue assistant",
  description =
    "Continue as guest — no password required. Guest chats are saved to SQLite on the server.",
  callbackURL = "/",
  className,
}: {
  title?: string;
  description?: string;
  callbackURL?: string;
  className?: string;
}) {
  const signInAsGuest = async () => {
    await authClient.signIn.anonymous();
    const returnTo =
      callbackURL && callbackURL !== "/"
        ? callbackURL
        : `${window.location.pathname}${window.location.search}`;
    window.location.assign(returnTo);
  };

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-md flex-col items-center gap-4",
        className,
      )}
    >
      <MapsMcpEndpointCopy className="w-full" />
      <div className="flex w-full min-h-[min(68vh,520px)] flex-col items-center justify-center gap-6 rounded-2xl border border-[#e2e8f0] bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)]">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-[#0f172a]">{title}</h2>
          <p className="max-w-md text-[13px] text-[#64748b]">{description}</p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2">
          <Button
            type="button"
            data-testid="guest-sign-in"
            onClick={() => void signInAsGuest()}
            className="w-full rounded-lg bg-[#0f172a] px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-[#1e293b] hover:text-white"
          >
            Continue as guest
          </Button>
        </div>
        <p className="max-w-sm text-[11px] text-[#94a3b8]">
          Guest mode saves your chats locally and in SQLite — no account required.
        </p>
      </div>
    </div>
  );
}

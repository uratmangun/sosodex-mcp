"use client";

import { MapsMcpEndpointCopy } from "@/components/maps-mcp-endpoint-copy";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4", className)} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function MapsAuthSignIn({
  title = "Use the SoSoValue assistant",
  description =
    "Continue as guest (no password) or sign in with Google. Guest chats are saved to SQLite like signed-in sessions.",
  callbackURL = "/",
  className,
}: {
  title?: string;
  description?: string;
  callbackURL?: string;
  className?: string;
}) {
  const signInWithGoogle = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL,
    });
  };

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
        <Button
          type="button"
          variant="outline"
          onClick={() => void signInWithGoogle()}
          className="w-full rounded-lg border-[#e2e8f0] bg-white px-6 py-2.5 text-[13px] font-semibold text-[#334155] hover:bg-[#f8fafc]"
        >
          <GoogleIcon className="mr-2" />
          Sign in with Google
        </Button>
      </div>
      <p className="max-w-sm text-[11px] text-[#94a3b8]">
        Guest mode saves your chats locally and in SQLite — no password or Google account
        required.
      </p>
      </div>
    </div>
  );
}

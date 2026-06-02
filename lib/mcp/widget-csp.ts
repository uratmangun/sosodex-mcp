export function publicOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_GPT_APP_ORIGIN ??
    process.env.NEXT_PUBLIC_MCP_APP_ORIGIN ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

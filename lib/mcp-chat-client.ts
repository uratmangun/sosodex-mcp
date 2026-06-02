import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";

function isLoopbackUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

/** Server-side MCP URL for /api/chat (same Next process). */
function resolveInternalMcpUrl(): string {
  const port = process.env.PORT?.trim() || "3000";
  const host = process.env.MCP_INTERNAL_HOST?.trim() || "127.0.0.1";
  return `http://${host}:${port}/mcp`;
}

export function getMcpChatUrl(): string {
  const raw = process.env.MCP_CHAT_URL?.trim();

  if (raw) {
    const base = raw.replace(/\/$/, "");
    const url = base.endsWith("/mcp") ? base : `${base}/mcp`;
    const internalHost = process.env.MCP_INTERNAL_HOST?.trim();
    // Podman: when MCP_INTERNAL_HOST is set, loopback often cannot reach the bound pod IP.
    if (internalHost && process.env.NODE_ENV === "production" && isLoopbackUrl(url)) {
      return resolveInternalMcpUrl();
    }
    return url;
  }

  return resolveInternalMcpUrl();
}

export async function createMapsMcpClient(): Promise<MCPClient> {
  return createMCPClient({
    transport: {
      type: "http",
      url: getMcpChatUrl(),
    },
    clientName: "google-map-test-chat",
  });
}

export async function getMcpToolsForChat(): Promise<{
  client: MCPClient;
  tools: Awaited<ReturnType<MCPClient["tools"]>>;
}> {
  const client = await createMapsMcpClient();
  const tools = await client.tools();
  return { client, tools };
}

"use client";

import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useEffect, useState } from "react";

import { useToolOutput } from "./use-tool-output";

function structuredFromCallToolResult(result: CallToolResult): unknown {
  const withStructured = result as CallToolResult & {
    structuredContent?: unknown;
  };
  if (withStructured.structuredContent !== undefined) {
    return withStructured.structuredContent;
  }
  const text = result.content?.find((c) => c.type === "text")?.text;
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function unwrapToolOutput<T>(value: unknown): T | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "object") {
    const wrapped = value as {
      structuredContent?: unknown;
      args?: unknown;
    };
    if (wrapped.structuredContent !== undefined) {
      return wrapped.structuredContent as T;
    }
    if (wrapped.args && typeof wrapped.args === "object") {
      return wrapped.args as T;
    }
  }
  return value as T;
}

/**
 * Tool output for MCP App hosts (ext-apps) and ChatGPT Apps SDK (window.openai).
 */
export function useMcpToolOutput<T>(): T | null {
  const chatGptOutput = useToolOutput<T>();
  const [mcpOutput, setMcpOutput] = useState<T | null>(null);

  const { app } = useApp({
    appInfo: { name: "SoSoValue MCP Widget", version: "0.1.0" },
    capabilities: {},
    onAppCreated: (instance) => {
      instance.ontoolresult = async (result) => {
        const structured = structuredFromCallToolResult(result);
        const unwrapped = unwrapToolOutput<T>(structured);
        if (unwrapped !== null) setMcpOutput(unwrapped);
      };
    },
  });

  useEffect(() => {
    if (app) {
      const initial = unwrapToolOutput<T>(readHostGlobals());
      if (initial !== null) setMcpOutput(initial);
    }
  }, [app]);

  useEffect(() => {
    const unwrapped = unwrapToolOutput<T>(chatGptOutput);
    if (unwrapped !== null) setMcpOutput(unwrapped);
  }, [chatGptOutput]);

  return mcpOutput ?? unwrapToolOutput<T>(chatGptOutput);
}

function readHostGlobals(): unknown {
  if (typeof window === "undefined") return null;
  return window.openai?.toolOutput ?? null;
}

import { encodeToon } from "@/lib/sosovalue/toon";

export function toToonToolResult(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: encodeToon(payload),
      },
    ],
  };
}

export function toErrorToolResult(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: `error: ${message}`,
      },
    ],
    isError: true as const,
  };
}

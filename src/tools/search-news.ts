import { type InferSchema, type ToolMetadata } from "xmcp";
import { z } from "zod";

import { searchNews } from "@/lib/sosovalue/client";
import { toErrorToolResult, toToonToolResult } from "@/lib/sosovalue/tool-result";

export const schema = {
  keyword: z.string().min(1).describe("News search keyword (e.g. bitcoin, etf)"),
  page: z.number().int().min(1).optional().describe("Page number (default 1)"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Results per page (default 10, max 20)"),
};

export const metadata: ToolMetadata = {
  name: "search-news",
  description:
    "Search SoSoValue crypto news by keyword. Returns headlines with release time and links in TOON.",
  annotations: {
    title: "Search news",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export default async function searchNewsTool({
  keyword,
  page,
  pageSize,
}: InferSchema<typeof schema>) {
  try {
    const result = await searchNews(keyword, {
      page: page ?? 1,
      pageSize: pageSize ?? 10,
    });
    const items = result.list.slice(0, pageSize ?? 10).map((item) => ({
      id: item.id,
      title: item.title,
      releaseTime: item.release_time,
      sourceLink: item.source_link,
      author: item.author,
      tags: item.tags,
    }));
    return toToonToolResult({
      keyword: keyword.trim(),
      page: result.page,
      total: result.total,
      items,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "News search failed.";
    return toErrorToolResult(message);
  }
}

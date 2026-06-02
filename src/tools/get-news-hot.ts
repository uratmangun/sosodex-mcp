import { type InferSchema, type ToolMetadata } from "xmcp";
import { z } from "zod";

import { getNewsHot } from "@/lib/sosovalue/client";
import { toErrorToolResult, toToonToolResult } from "@/lib/sosovalue/tool-result";

export const schema = {
  page: z.number().int().min(1).optional().describe("Page number (default 1)"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Results per page (default 10)"),
};

export const metadata: ToolMetadata = {
  name: "get-news-hot",
  description:
    "Fetch trending SoSoValue news (/news/hot). Used by SentiTrade-style sentiment pipelines.",
  annotations: {
    title: "Hot news",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export default async function getNewsHotTool({
  page,
  pageSize,
}: InferSchema<typeof schema>) {
  try {
    const result = await getNewsHot({ page: page ?? 1, pageSize: pageSize ?? 10 });
    const items = result.list.map((item) => ({
      id: item.id,
      title: item.title,
      releaseTime: item.release_time,
      sourceLink: item.source_link,
      tags: item.tags,
    }));
    return toToonToolResult({
      page: result.page,
      total: result.total,
      items,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hot news request failed.";
    return toErrorToolResult(message);
  }
}

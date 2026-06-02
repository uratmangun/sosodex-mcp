import { type ToolMetadata } from "xmcp";
import { z } from "zod";

import { publicOrigin } from "./widget-csp";

export const schema = {
  indexTicker: z
    .string()
    .min(1)
    .describe("SoSoValue index ticker, e.g. ssimag7 or ssilayer1"),
};

export const outputSchema = {
  indexTicker: z.string(),
  snapshot: z.object({
    price: z.number(),
  }),
  profileUrl: z.string().url(),
};

export const metadata: ToolMetadata = {
  name: "show-index-snapshot",
  description:
    "Render a SoSoValue Index market snapshot (price and ROI metrics) in the MCP App widget.",
  annotations: {
    title: "Show index snapshot",
    readOnlyHint: true,
    openWorldHint: true,
  },
  _meta: {
    openai: {
      widgetAccessible: true,
      resultCanProduceWidget: true,
      toolInvocation: {
        invoking: "Loading index",
        invoked: "Index ready",
      },
      widgetCSP: {
        connect_domains: [publicOrigin()],
        resource_domains: [
          publicOrigin(),
          "https://ssi.sosovalue.com",
          "https://sosovalue.com",
        ],
        redirect_domains: [
          "https://ssi.sosovalue.com",
          "https://sosovalue.com",
        ],
      },
    },
  },
};

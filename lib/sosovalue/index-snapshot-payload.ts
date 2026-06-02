import {
  getIndexMarketSnapshot,
  type SosoIndexSnapshot,
} from "@/lib/sosovalue/client";

export type IndexSnapshotPayload = {
  indexTicker: string;
  snapshot: SosoIndexSnapshot;
  profileUrl: string;
};

export async function buildIndexSnapshotPayload(input: {
  indexTicker: string;
}): Promise<IndexSnapshotPayload> {
  const snapshot = await getIndexMarketSnapshot(input.indexTicker);
  return {
    indexTicker: input.indexTicker,
    snapshot,
    profileUrl: `https://ssi.sosovalue.com/`,
  };
}

export function toIndexSnapshotToolResult(payload: IndexSnapshotPayload) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            indexTicker: payload.indexTicker,
            price: payload.snapshot.price,
          },
          null,
          2,
        ),
      },
    ],
    structuredContent: payload,
  };
}

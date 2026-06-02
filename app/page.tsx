import { Suspense } from "react";

import { HomePageClient } from "@/components/home-page-client";
import { Loader2Icon } from "lucide-react";

export const metadata = {
  title: "SoSoValue assistant · sosodex-mcp",
  description:
    "Chat with SoSoValue MCP tools for crypto search, charts, ETF inflows, and index data",
};

function HomePageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Loader2Icon className="size-6 animate-spin text-[#64748b]" />
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageFallback />}>
      <HomePageClient />
    </Suspense>
  );
}

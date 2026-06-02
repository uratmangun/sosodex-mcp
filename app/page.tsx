import { HomePageClient } from "@/components/home-page-client";

export const metadata = {
  title: "SoSoValue assistant · sosodex-mcp",
  description:
    "Chat with SoSoValue MCP tools for crypto search, charts, ETF inflows, and index data",
};

export default function HomePage() {
  return <HomePageClient />;
}

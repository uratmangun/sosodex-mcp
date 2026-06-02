"use client";

import { PlusIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatThreadMeta, type ChatThread } from "@/lib/maps-chat-store";
import { cn } from "@/lib/utils";

export function MapsChatSidebar({
  open,
  onClose,
  searchQuery,
  onSearchQueryChange,
  visibleThreads,
  activeThreadId,
  onNewChat,
  onSelectThread,
  onDeleteThread,
}: {
  open: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  visibleThreads: ChatThread[];
  activeThreadId: string;
  onNewChat: () => void;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
}) {
  return (
    <>
      <div
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-40 bg-[#0f172a]/30 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col border-r border-[#e2e8f0] bg-white shadow-[4px_0_24px_rgba(15,23,42,0.12)] transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-[#f1f5f9] px-3 py-3">
          <span className="text-[14px] font-semibold text-[#0f172a]">Chats</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-[#64748b] hover:bg-[#0f172a] hover:text-white [&_svg]:hover:text-white"
            aria-label="Close chat sidebar"
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="border-b border-[#f1f5f9] p-3">
          <Button
            type="button"
            data-testid="new-chat"
            onClick={onNewChat}
            className="h-9 w-full justify-start gap-2 rounded-lg bg-[#1a73e8] text-[13px] text-white hover:bg-[#1557b0] hover:text-white [&_svg]:text-white"
          >
            <PlusIcon className="size-4 text-white" />
            New chat
          </Button>
        </div>

        <div className="border-b border-[#f1f5f9] p-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#94a3b8]" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search chats…"
              className="h-8 rounded-lg border-[#e2e8f0] bg-[#f8fafc] pl-8 text-[12px] text-[#334155] placeholder:text-[#94a3b8]"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <p className="px-2 py-1.5 text-[10px] font-semibold tracking-wider text-[#94a3b8] uppercase">
            Recent
          </p>
          {visibleThreads.length === 0 ? (
            <p className="px-2 py-4 text-center text-[12px] text-[#94a3b8]">No chats match your search.</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {visibleThreads.map((thread) => {
                const isActive = thread.id === activeThreadId;
                const messageCount = thread.messages.length;
                return (
                  <li key={thread.id} className="group/thread relative">
                    <button
                      type="button"
                      onClick={() => onSelectThread(thread.id)}
                      className={cn(
                        "w-full rounded-lg py-2 pr-9 pl-2.5 text-left transition-colors",
                        isActive
                          ? "bg-[#e8f0fe] text-[#1a73e8]"
                          : "text-[#334155] hover:bg-[#f8fafc]",
                      )}
                    >
                      <span className="block truncate text-[13px] font-medium">{thread.title}</span>
                      <span
                        className={cn(
                          "mt-0.5 block truncate text-[11px]",
                          isActive ? "text-[#5b8def]" : "text-[#94a3b8]",
                        )}
                      >
                        {formatThreadMeta(thread.updatedAt, messageCount)}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      data-testid="delete-chat"
                      aria-label={`Delete chat ${thread.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteThread(thread.id);
                      }}
                      className={cn(
                        "absolute top-1/2 right-1 size-7 -translate-y-1/2 rounded-md text-[#94a3b8] opacity-0 transition-opacity group-hover/thread:opacity-100 focus-visible:opacity-100",
                        isActive && "text-[#1a73e8] hover:bg-[#dbeafe] hover:text-[#1d4ed8]",
                      )}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="border-t border-[#f1f5f9] px-3 py-2 text-[10px] leading-relaxed text-[#94a3b8]">
          Chat search filters title and message text locally. Full-text search (SQLite FTS) planned.
        </p>
      </aside>
    </>
  );
}

"use client";

import { Search } from "lucide-react";

/** Looks like a search field; opens the existing ⌘K command palette. */
export function SearchTrigger() {
  function open() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, metaKey: true }));
  }

  return (
    <button
      type="button"
      onClick={open}
      className="flex-1 basis-[240px] min-w-0 h-10 flex items-center gap-2.5 px-1 text-left text-[13.5px] text-muted-foreground hover:text-foreground transition-colors"
    >
      <Search className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
      <span className="truncate">Search contacts, deals, campaigns…</span>
      <kbd className="ml-auto hidden sm:inline-flex items-center h-6 px-1.5 rounded-md border border-foreground/15 text-[10.5px] font-mono">
        Ctrl K
      </kbd>
    </button>
  );
}

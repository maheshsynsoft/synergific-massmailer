"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronsUpDown, ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Client-side paging over an array. The page is clamped, so no effect is needed when data shrinks. */
export function usePagination<T>(items: T[], initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount);
  const pageItems = items.slice((current - 1) * pageSize, current * pageSize);

  function setPageSize(size: number) {
    setPageSizeState(size);
    setPage(1);
  }

  return { page: current, setPage, pageSize, setPageSize, pageCount, pageItems, total: items.length };
}

/** "Showing: [10 ▾] rows per page out of 2,320" */
export function RowsPerPage({
  pageSize,
  onPageSizeChange,
  total,
  options = [10, 25, 50, 100],
  noun = "rows",
}: {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  total: number;
  options?: number[];
  noun?: string;
}) {
  return (
    <label className="inline-flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
      Showing:
      <span className="relative inline-flex">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="appearance-none h-7 pl-2.5 pr-6 rounded-full border border-border bg-card text-foreground text-[12px] font-medium"
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-foreground" />
      </span>
      {noun} per page out of {total.toLocaleString()}
    </label>
  );
}

function pageWindow(page: number, count: number): (number | "gap")[] {
  if (count <= 5) return Array.from({ length: count }, (_, i) => i + 1);
  const out: (number | "gap")[] = [];
  const start = Math.max(1, Math.min(page - 1, count - 3));
  const end = Math.min(count, start + 2);
  for (let p = start; p <= end; p++) out.push(p);
  if (end < count - 1) out.push("gap");
  if (end < count) out.push(count);
  return out;
}

const btn =
  "min-w-8 h-8 px-2 rounded-lg border border-border bg-card inline-flex items-center justify-center text-[12.5px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none nums-tabular";

/** ‹ « [1] 2 3 … 24 › » */
export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1.5">
      <button type="button" className={btn} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <button type="button" className={btn} onClick={() => onPageChange(1)} disabled={page <= 1} aria-label="First page">
        <ChevronsLeft className="w-3.5 h-3.5" />
      </button>
      {pageWindow(page, pageCount).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className={cn(btn, "pointer-events-none")} aria-hidden="true">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(btn, p === page && "bg-primary border-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")}
          >
            {p}
          </button>
        )
      )}
      <button type="button" className={btn} onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} aria-label="Next page">
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
      <button type="button" className={btn} onClick={() => onPageChange(pageCount)} disabled={page >= pageCount} aria-label="Last page">
        <ChevronsRight className="w-3.5 h-3.5" />
      </button>
    </nav>
  );
}

/** Header cell content with a sort toggle. */
export function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  const Icon = !active ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 font-medium hover:text-[var(--primary-text)] transition-colors">
      {label}
      <Icon className={cn("w-3.5 h-3.5", active ? "text-foreground" : "text-muted-foreground")} />
    </button>
  );
}

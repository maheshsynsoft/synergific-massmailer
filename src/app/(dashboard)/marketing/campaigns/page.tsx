"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Plus, Mail, Search, Sparkles } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  TableCard,
  IdCell,
  StatusPill,
  RowAction,
  EmptyRow,
  firstColumn,
  rowDelay,
  type StatusTone,
} from "@/components/data-table/records";
import { Pagination, RowsPerPage, SortButton, usePagination } from "@/components/data-table/pagination";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  subject: string | null;
  subjectB: string | null;
  abTestEnabled: boolean;
  scheduledFor: string | null;
  sentAt: string | null;
  sentCount: number;
  openCount: number;
  clickCount: number;
  openRate: number;
  clickRate: number;
  createdAt: string;
}

const statusMeta: Record<string, { tone: StatusTone; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  scheduled: { tone: "info", label: "Scheduled" },
  active: { tone: "success", label: "Active" },
  paused: { tone: "warning", label: "Paused" },
  completed: { tone: "primary", label: "Completed" },
};

const FILTERS = ["all", "active", "scheduled", "draft", "paused", "completed"] as const;

type SortKey = "createdAt" | "name" | "sentCount" | "openRate" | "clickRate";

function ymd(d: string | null) {
  return d ? new Date(d).toLocaleDateString("en-CA") : null;
}

function Rate({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center justify-end gap-2.5">
      <span className="w-14 h-1.5 rounded-full bg-foreground/10 overflow-hidden hidden sm:block" aria-hidden="true">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
      <span className="nums-tabular w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetch("/api/campaigns").then((r) => r.json()).then(setCampaigns);
  }, []);

  const filtered = campaigns
    .filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return c.name.toLowerCase().includes(s) || (c.subject && c.subject.toLowerCase().includes(s));
      }
      return true;
    })
    .sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const { pageItems, page, setPage, pageCount, pageSize, setPageSize, total } = usePagination(filtered, 10);

  function sortBy(key: SortKey) {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const counts = campaigns.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});
  const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);

  return (
    <>
      <Header
        title="Campaigns"
        subtitle={`${campaigns.length} total · ${counts.active || 0} active · ${counts.scheduled || 0} scheduled · ${totalSent.toLocaleString()} emails sent`}
        actions={
          <Link
            href="/marketing/campaigns/new"
            className="h-9 px-3.5 rounded-lg flex items-center gap-1.5 text-[13px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> New campaign
          </Link>
        }
      />

      <div className="p-3 sm:p-4 lg:p-6 max-w-[1440px]">
        <TableCard
          id="campaign-records"
          title="Campaign records"
          toolbar={
            <label className="relative flex items-center">
              <span className="sr-only">Search campaigns</span>
              <Search className="absolute left-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                placeholder="Search name or subject"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-[220px] max-w-full h-9 pl-8 pr-3 text-[13px] rounded-lg border border-border bg-card focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
              />
            </label>
          }
          actions={
            <div role="group" aria-label="Filter by status" className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-muted">
              {FILTERS.map((f) => {
                const n = f === "all" ? campaigns.length : counts[f] || 0;
                if (f !== "all" && n === 0) return null;
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={statusFilter === f}
                    onClick={() => {
                      setStatusFilter(f);
                      setPage(1);
                    }}
                    className={cn(
                      "h-7 px-2.5 rounded-lg text-[12.5px] font-medium capitalize transition-colors",
                      statusFilter === f ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f} <span className="nums-tabular text-muted-foreground">{n}</span>
                  </button>
                );
              })}
            </div>
          }
          footer={
            <>
              <RowsPerPage pageSize={pageSize} onPageSizeChange={setPageSize} total={total} />
              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
            </>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={firstColumn}>
                  <SortButton label="Campaign" active={sortKey === "name"} direction={sortDir} onClick={() => sortBy("name")} />
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <SortButton label="Date" active={sortKey === "createdAt"} direction={sortDir} onClick={() => sortBy("createdAt")} />
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">
                  <SortButton label="Sent" active={sortKey === "sentCount"} direction={sortDir} onClick={() => sortBy("sentCount")} />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton label="Open rate" active={sortKey === "openRate"} direction={sortDir} onClick={() => sortBy("openRate")} />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton label="Click rate" active={sortKey === "clickRate"} direction={sortDir} onClick={() => sortBy("clickRate")} />
                </TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 && (
                <EmptyRow colSpan={8}>
                  {campaigns.length === 0 ? (
                    <>
                      No campaigns yet.{" "}
                      <Link href="/marketing/campaigns/new" className="font-semibold text-primary hover:underline inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Create your first AI-powered campaign
                      </Link>
                    </>
                  ) : (
                    "No campaigns match these filters."
                  )}
                </EmptyRow>
              )}
              {pageItems.map((c, i) => {
                const status = statusMeta[c.status] || { tone: "neutral" as StatusTone, label: c.status };
                const dateLabel = c.status === "scheduled" ? "Scheduled" : c.sentAt ? "Sent" : "Created";
                const date = c.status === "scheduled" ? c.scheduledFor : c.sentAt || c.createdAt;
                return (
                  <TableRow key={c.id} className="animate-row-in" style={rowDelay(i)}>
                    <TableCell className={cn(firstColumn, "max-w-[340px]")}>
                      <Link href={`/marketing/campaigns/${c.id}`} className="flex items-center gap-3 min-w-0 group">
                        <span className="w-8 h-8 rounded-full bg-secondary text-[var(--primary-text)] flex items-center justify-center flex-shrink-0" aria-hidden="true">
                          <Mail className="w-4 h-4" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 leading-tight">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="truncate group-hover:underline underline-offset-2">{c.name}</span>
                            {c.abTestEnabled && <StatusPill tone="primary" icon={null} className="h-5 px-1.5 text-[10.5px]">A/B</StatusPill>}
                          </span>
                          <span className="block text-[12px] text-muted-foreground truncate mt-0.5">{c.subject || "No subject yet"}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    </TableCell>
                    <TableCell>
                      <IdCell id={dateLabel} date={ymd(date) || "—"} />
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">{c.type}</TableCell>
                    <TableCell className="text-right nums-tabular text-muted-foreground">{c.sentCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-muted-foreground"><Rate value={c.openRate} /></TableCell>
                    <TableCell className="text-right text-muted-foreground"><Rate value={c.clickRate} /></TableCell>
                    <TableCell className="text-right">
                      <RowAction href={`/marketing/campaigns/${c.id}`} label={`Open ${c.name}`} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableCard>
        <p className="sr-only" aria-live="polite">
          {filtered.length} campaigns shown
        </p>
      </div>
    </>
  );
}

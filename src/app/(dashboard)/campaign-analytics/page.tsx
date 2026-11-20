"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Download, Printer, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableCard, EmptyRow, firstColumn, rowDelay, toolbarButton } from "@/components/data-table/records";

interface Grp { key: string; sent: number; delivered: number; opened: number; clicked: number; }
interface Data { byCountry: Grp[]; byCompany: Grp[]; byDomain: Grp[]; }
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

function Rate({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <span className="inline-flex items-center justify-end gap-2.5">
      <span className="w-14 h-1.5 rounded-full bg-foreground/10 overflow-hidden hidden sm:block" aria-hidden="true">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
      </span>
      <span className="nums-tabular w-12 text-right">{v}%</span>
    </span>
  );
}

function GroupTable({ id, title, column, rows }: { id: string; title: string; column: string; rows: Grp[] }) {
  return (
    <TableCard
      id={id}
      title={title}
      footer={<span>{rows.length > 25 ? `Top 25 of ${rows.length}` : `${rows.length} rows`}</span>}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={firstColumn}>{column}</TableHead>
            <TableHead className="text-right">Sent</TableHead>
            <TableHead className="text-right">Delivered</TableHead>
            <TableHead className="text-right">Open rate</TableHead>
            <TableHead className="text-right">Click rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <EmptyRow colSpan={5}>No data yet</EmptyRow>}
          {rows.slice(0, 25).map((r, i) => (
            <TableRow key={r.key + i} className="animate-row-in" style={rowDelay(i)}>
              <TableCell className={cn(firstColumn, "font-medium max-w-[280px] truncate")}>{r.key}</TableCell>
              <TableCell className="text-right nums-tabular text-muted-foreground">{r.sent.toLocaleString()}</TableCell>
              <TableCell className="text-right nums-tabular text-muted-foreground">{r.delivered.toLocaleString()}</TableCell>
              <TableCell className="text-right text-muted-foreground"><Rate value={pct(r.opened, r.delivered)} /></TableCell>
              <TableCell className="text-right text-muted-foreground"><Rate value={pct(r.clicked, r.delivered)} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  );
}

export default function CampaignAnalyticsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try { setData(await fetch("/api/email/analytics").then((r) => r.json())); } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  return (
    <>
      <Header
        title="Campaign Analytics"
        subtitle="Performance by country, client and email domain"
        actions={
          <>
            <a href="/api/email/analytics/export" className={toolbarButton}><Download className="w-3.5 h-3.5" /> Export CSV</a>
            <button type="button" onClick={() => window.print()} className={toolbarButton}><Printer className="w-3.5 h-3.5" /> PDF</button>
            <button type="button" onClick={load} className={toolbarButton} aria-label="Refresh">
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </button>
          </>
        }
      />
      <div className="p-3 sm:p-4 lg:p-6 space-y-5 max-w-[1440px]">
        {!data ? (
          <p className="text-[13px] text-muted-foreground">{loading ? "Loading…" : "No data"}</p>
        ) : (
          <>
            <GroupTable id="by-country" title="By country" column="Country" rows={data.byCountry} />
            <GroupTable id="by-company" title="By company / client" column="Company" rows={data.byCompany} />
            <GroupTable id="by-domain" title="By email domain" column="Domain" rows={data.byDomain} />
          </>
        )}
      </div>
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Download, Printer, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Grp { key: string; sent: number; delivered: number; opened: number; clicked: number; }
interface Data { byCountry: Grp[]; byCompany: Grp[]; byDomain: Grp[]; }
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

function Table({ title, rows }: { title: string; rows: Grp[] }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 text-[13px] font-bold">{title}</div>
      <table className="w-full text-[12px]">
        <thead className="text-muted-foreground"><tr>
          <th className="text-left px-3 py-2 font-semibold">{title}</th>
          <th className="text-right px-3 py-2 font-semibold">Sent</th>
          <th className="text-right px-3 py-2 font-semibold">Delivered</th>
          <th className="text-right px-3 py-2 font-semibold">Open %</th>
          <th className="text-right px-3 py-2 font-semibold">Click %</th>
        </tr></thead>
        <tbody>
          {rows.length === 0 ? (<tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No data</td></tr>) :
            rows.slice(0, 25).map((r, i) => (
              <tr key={i} className="border-t border-border/60">
                <td className="px-3 py-1.5 font-medium">{r.key}</td>
                <td className="px-3 py-1.5 text-right nums-tabular">{r.sent}</td>
                <td className="px-3 py-1.5 text-right nums-tabular text-emerald-400">{r.delivered}</td>
                <td className="px-3 py-1.5 text-right nums-tabular text-violet-400">{pct(r.opened, r.delivered)}%</td>
                <td className="px-3 py-1.5 text-right nums-tabular text-cyan-400">{pct(r.clicked, r.delivered)}%</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
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
      <Header title="Campaign Analytics" subtitle="Performance by country, client & email domain"
        actions={<div className="flex gap-2">
          <a href="/api/email/analytics/export" className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent"><Download className="w-3.5 h-3.5" /> Export CSV</a>
          <button onClick={() => window.print()} className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent"><Printer className="w-3.5 h-3.5" /> PDF</button>
          <button onClick={load} className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent"><RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /></button>
        </div>} />
      <div className="p-8 space-y-5 max-w-4xl">
        {!data ? <p className="text-[13px] text-muted-foreground">{loading ? "Loading…" : "No data"}</p> : (
          <>
            <Table title="Country" rows={data.byCountry} />
            <Table title="Company / Client" rows={data.byCompany} />
            <Table title="Email Domain" rows={data.byDomain} />
          </>
        )}
      </div>
    </>
  );
}

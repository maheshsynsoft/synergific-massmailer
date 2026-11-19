"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface Row { email: string; company: string | null; subject: string | null; status: string; when: string; category: string; side: string; action: string; }
interface Data { total: number; byCategory: Record<string, number>; rows: Row[]; }

export default function DeliveryTrackingPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try { setData(await fetch("/api/email/failures").then((r) => r.json())); } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  return (
    <>
      <Header title="Delivery Tracking" subtitle="Failed, bounced & rejected emails — with reasons & fixes"
        actions={<button onClick={load} className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent"><RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh</button>} />
      <div className="p-8 space-y-5">
        {data && Object.keys(data.byCategory).length > 0 && (
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.byCategory).map(([cat, n]) => (
              <div key={cat} className="rounded-lg border border-border bg-card px-4 py-2.5">
                <p className="text-[18px] font-bold text-rose-400">{n}</p>
                <p className="text-[11px] text-muted-foreground">{cat}</p>
              </div>
            ))}
          </div>
        )}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Email</th>
                <th className="text-left px-3 py-2 font-semibold">Company</th>
                <th className="text-left px-3 py-2 font-semibold">Category</th>
                <th className="text-left px-3 py-2 font-semibold">Side</th>
                <th className="text-left px-3 py-2 font-semibold">Recommended action</th>
              </tr>
            </thead>
            <tbody>
              {!data || data.rows.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">{loading ? "Loading…" : "No delivery failures found."}</td></tr>
              ) : data.rows.map((r, i) => (
                <tr key={i} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{r.email}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.company || "—"}</td>
                  <td className="px-3 py-2"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 whitespace-nowrap">{r.category}</span></td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.side}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <p className="text-[11px] text-muted-foreground">Showing {data.rows.length} of {data.total}. Bounced / complained addresses are auto-suppressed and skipped on future sends.</p>}
      </div>
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";
import { Shield, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

interface Check { key: string; ok: boolean; warn?: boolean; value: string; detail: string; fix: string; }
interface Health { domain: string; score: number; checks: Check[]; }

export default function DomainHealthPage() {
  const [data, setData] = useState<Health | null>(null);
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [h, m] = await Promise.all([
        fetch("/api/domain-health").then((r) => r.json()),
        fetch("/api/email/metrics").then((r) => r.json()).catch(() => null),
      ]);
      setData(h);
      setMetrics(m);
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const scoreColor = (s: number) => (s >= 90 ? "text-emerald-400" : s >= 60 ? "text-amber-400" : "text-rose-400");

  return (
    <>
      <Header title="Domain Health" subtitle="Sending authentication & deliverability"
        actions={<button onClick={load} className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent"><RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh</button>} />
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-3xl">
        {!data ? (
          <p className="text-[13px] text-muted-foreground">{loading ? "Checking DNS…" : "No data"}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-7 h-7 text-primary" /></div>
              <div className="flex-1 min-w-[170px]">
                <p className="text-[13px] text-muted-foreground">Sending domain</p>
                <p className="text-[16px] sm:text-[18px] font-bold break-words">{data.domain}</p>
              </div>
              <div className="text-right ml-auto">
                <p className={cn("text-[28px] sm:text-[34px] font-bold leading-none", scoreColor(data.score))}>{data.score}%</p>
                <p className="text-[10px] text-muted-foreground uppercase">Auth score</p>
              </div>
            </div>

            {metrics && (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-lg border border-border bg-card p-3"><p className="text-[18px] font-bold text-rose-400">{metrics.bounceRate ?? 0}%</p><p className="text-[10px] text-muted-foreground uppercase">Bounce rate</p></div>
                <div className="rounded-lg border border-border bg-card p-3"><p className="text-[18px] font-bold text-amber-400">{metrics.bounced ?? 0}</p><p className="text-[10px] text-muted-foreground uppercase">Bounced (suppressed)</p></div>
                <div className="rounded-lg border border-border bg-card p-3"><p className="text-[18px] font-bold text-slate-400">{metrics.complained ?? 0}</p><p className="text-[10px] text-muted-foreground uppercase">Spam complaints</p></div>
              </div>
            )}

            <div className="space-y-2.5">
              {data.checks.map((c) => {
                const Icon = c.ok && !c.warn ? CheckCircle2 : c.warn ? AlertTriangle : XCircle;
                const color = c.ok && !c.warn ? "text-emerald-400" : c.warn ? "text-amber-400" : "text-rose-400";
                return (
                  <div key={c.key} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn("w-4 h-4", color)} />
                      <span className="text-[14px] font-bold">{c.key}</span>
                      <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", c.ok && !c.warn ? "bg-emerald-500/10 text-emerald-400" : c.warn ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400")}>{c.ok && !c.warn ? "Pass" : c.warn ? "Warning" : "Fail"}</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-2">{c.detail}</p>
                    <p className="text-[11px] font-mono text-foreground/70 mt-1.5 break-all bg-muted/40 rounded px-2 py-1">{c.value}</p>
                    {c.fix && <p className="text-[11px] text-amber-400 mt-1.5">&rarr; Fix: <span className="font-mono">{c.fix}</span></p>}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">Emails send via Microsoft 365 (Graph), so sending-IP reputation &amp; blocklist status are managed by Microsoft. SPF / DKIM / DMARC above are your domain&rsquo;s responsibility.</p>
          </>
        )}
      </div>
    </>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";
import { CountUp } from "./count-up";
import styles from "./dashboard.module.css";

export interface StageSlice {
  stage: string;
  count: number;
  value: number;
}

const ORDER = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];

/* Theme tokens only: purple family first, then the chart status tokens. */
const STAGE_COLOR: Record<string, string> = {
  lead: "var(--chart-hatch)",
  qualified: "var(--primary)",
  proposal: "var(--chart-5)",
  negotiation: "var(--chart-4)",
  won: "var(--chart-3)",
  lost: "var(--destructive)",
};

/** Donut of deals by stage. Segments sweep in one after another. */
export function PipelineDonut({ slices }: { slices: StageSlice[] }) {
  const sorted = [...slices].sort((a, b) => ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage));
  const total = sorted.reduce((s, x) => s + x.count, 0);
  const pipelineValue = sorted.filter((s) => s.stage !== "won" && s.stage !== "lost").reduce((s, x) => s + x.value, 0);

  const segs = sorted.reduce<(StageSlice & { pct: number; offset: number; i: number })[]>((acc, s, i) => {
    const prev = acc[acc.length - 1];
    const offset = prev ? prev.offset + prev.pct : 0;
    const pct = total ? (s.count / total) * 100 : 0;
    return [...acc, { ...s, pct, offset, i }];
  }, []);

  return (
    <figure className="m-0 flex flex-col gap-4 min-w-0">
      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold">Deal pipeline</span>
        <Link href="/sales/pipeline" className="text-[12px] font-semibold text-primary hover:underline">
          Open pipeline
        </Link>
      </figcaption>

      <div className="flex flex-wrap items-center gap-6">
        <div className="relative w-[168px] h-[168px] flex-shrink-0 mx-auto sm:mx-0">
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full -rotate-90"
            role="img"
            aria-label={`Deals by stage: ${sorted.map((s) => `${s.stage} ${s.count}`).join(", ") || "none"}.`}
          >
            <circle cx="60" cy="60" r="46" fill="none" className="stroke-[var(--chart-track)]" strokeWidth="18" />
            {segs.map((s) =>
              s.pct > 0 ? (
                <circle
                  key={s.stage}
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  pathLength={100}
                  stroke={STAGE_COLOR[s.stage] || "var(--muted-foreground)"}
                  strokeWidth="18"
                  strokeDasharray={`${Math.max(0, s.pct - 0.6)} 100`}
                  strokeDashoffset={-s.offset}
                  className={styles.segment}
                  style={{ ["--seg" as string]: Math.max(0, s.pct - 0.6), animationDelay: `${200 + s.i * 120}ms` } as React.CSSProperties}
                >
                  <title>{`${s.stage}: ${s.count} deals`}</title>
                </circle>
              ) : null
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <CountUp value={total} className="text-[26px] font-semibold leading-none nums-tabular" />
            <span className="text-[11px] text-muted-foreground mt-1">deals</span>
          </div>
        </div>

        <ul className="flex-1 min-w-[180px] space-y-1.5">
          {sorted.length === 0 && <li className="text-[13px] text-muted-foreground">No deals yet</li>}
          {segs.map((s) => (
            <li
              key={s.stage}
              className={cn("flex items-center gap-2.5 text-[12.5px] px-2 py-1.5 -mx-2 rounded-lg hover:bg-accent transition-colors", styles.rise)}
              style={{ animationDelay: `${300 + s.i * 80}ms` }}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STAGE_COLOR[s.stage] || "var(--muted-foreground)" }} aria-hidden="true" />
              <span className="capitalize flex-1 truncate">{s.stage}</span>
              <span className="text-muted-foreground nums-tabular">₹{s.value >= 1000 ? `${(s.value / 1000).toFixed(1)}k` : s.value.toLocaleString()}</span>
              <span className="font-semibold nums-tabular w-8 text-right">{s.count}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[12px] text-muted-foreground">
        Open pipeline value <span className="font-semibold text-foreground nums-tabular">₹{pipelineValue.toLocaleString()}</span>
      </p>
    </figure>
  );
}

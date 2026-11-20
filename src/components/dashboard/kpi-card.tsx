import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "./count-up";
import styles from "./dashboard.module.css";

/* ──────────────────────────────────────────────────────────────
 * Animated mini graphics for summary cards. Each one still looks
 * complete when the data is all zeros (track / stubs are drawn).
 * ────────────────────────────────────────────────────────────── */

/** 14 mini bars that grow in one after another; the last (today) is solid. */
export function MiniBars({ series }: { series: number[] }) {
  const W = 200;
  const H = 48;
  const gap = 4;
  const n = Math.max(1, series.length);
  const bw = (W - gap * (n - 1)) / n;
  const max = Math.max(1, ...series);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-12 block" aria-hidden="true">
      {series.map((v, i) => {
        const h = Math.max(4, (v / max) * H);
        const today = i === series.length - 1;
        return (
          <rect
            key={i}
            x={i * (bw + gap)}
            y={H - h}
            width={bw}
            height={h}
            rx={2.5}
            className={cn(
              styles.bar,
              v === 0 ? "fill-[var(--chart-track)]" : today ? "fill-primary" : "fill-[var(--chart-hatch)]"
            )}
            style={{ animationDelay: `${150 + i * 45}ms` }}
          />
        );
      })}
    </svg>
  );
}

/** Line + area that draws itself in, ending in a pulsing dot. */
export function Sparkline({ series }: { series: number[] }) {
  const W = 200;
  const H = 48;
  const max = Math.max(1, ...series);
  const step = series.length > 1 ? W / (series.length - 1) : W;
  const pts = series.map((v, i) => [i * step, H - 5 - (v / max) * (H - 10)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const last = pts[pts.length - 1];
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-12 block" aria-hidden="true">
        <path d={area} className={cn("fill-primary/10", styles.areaIn)} />
        <path
          d={line}
          pathLength={1}
          className={cn("stroke-primary", styles.draw)}
          fill="none"
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {last && (
        <span
          aria-hidden="true"
          className="absolute w-2.5 h-2.5 -ml-[5px] -mt-[5px]"
          style={{ left: `${(last[0] / W) * 100}%`, top: `${(last[1] / H) * 100}%` }}
        >
          <span
            className={cn("block w-2.5 h-2.5 rounded-full bg-primary text-primary", styles.liveDot, styles.dotIn)}
            style={{ animationDelay: "1.1s" }}
          />
        </span>
      )}
    </div>
  );
}

/** Ring that sweeps to `pct` (0–100) with a caption beside it. */
export function RingMeter({ pct, caption }: { pct: number; caption: React.ReactNode }) {
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex items-center gap-3 h-12">
      <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90 flex-shrink-0" aria-hidden="true">
        <circle cx="24" cy="24" r="19" fill="none" className="stroke-[var(--chart-track)]" strokeWidth="6" />
        {v > 0 && (
          <circle
            cx="24"
            cy="24"
            r="19"
            fill="none"
            pathLength={100}
            className={cn("stroke-primary", styles.segment)}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${v} 100`}
            style={{ ["--seg" as string]: v, animationDelay: "250ms" } as React.CSSProperties}
          />
        )}
      </svg>
      <div className="min-w-0 leading-tight">
        <span className="block text-[15px] font-semibold nums-tabular">{v.toFixed(0)}%</span>
        <span className="block text-[11.5px] text-muted-foreground truncate">{caption}</span>
      </div>
    </div>
  );
}

/** Horizontal meter that fills to `value / total`, with labels underneath. */
export function MeterBar({ value, total, label, rest }: { value: number; total: number; label: string; rest: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="h-12 flex flex-col justify-center gap-2">
      <div className="h-2.5 rounded-full bg-[var(--chart-track)] overflow-hidden" aria-hidden="true">
        <div className={cn("h-full rounded-full bg-primary", styles.fill)} style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%` }} />
      </div>
      <div className="flex justify-between text-[11.5px] text-muted-foreground nums-tabular">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
          {value.toLocaleString()} {label}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--chart-track)]" aria-hidden="true" />
          {Math.max(0, total - value).toLocaleString()} {rest}
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */

interface KpiCardProps {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Daily values for the period, oldest first (used for the trend). */
  series: number[];
  /** Total for the previous period, to compute the trend. */
  previous: number;
  caption: string;
  /** Animated graphic shown in the card. */
  graphic: React.ReactNode;
  /** When true, going up is bad (e.g. tickets). */
  invert?: boolean;
  delay?: number;
}

/** Summary card: icon, label, counting number, trend pill and an animated graphic. */
export function KpiCard({
  label,
  href,
  icon: Icon,
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  series,
  previous,
  caption,
  graphic,
  invert,
  delay = 0,
}: KpiCardProps) {
  const cur = series.reduce((s, v) => s + v, 0);
  const change = previous === 0 ? (cur > 0 ? 100 : 0) : ((cur - previous) / previous) * 100;
  const up = change > 0.5;
  const down = change < -0.5;
  const good = invert ? down : up;
  const bad = invert ? up : down;
  const TrendIcon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;

  return (
    <Link
      href={href}
      className={cn("hover-lift group bg-card rounded-2xl border border-border p-4 flex flex-col gap-3 min-w-0", styles.rise)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-full bg-secondary text-[var(--primary-text)] flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
          <Icon className="w-[17px] h-[17px]" strokeWidth={1.9} />
        </span>
        <span className="text-[13px] font-medium text-muted-foreground truncate">{label}</span>
        <ArrowUpRight className="w-4 h-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="flex items-end justify-between gap-2">
        <CountUp
          value={value}
          decimals={decimals}
          prefix={prefix}
          suffix={suffix}
          className="text-[26px] font-semibold tracking-tight leading-none nums-tabular"
        />
        <span
          className={cn(
            "inline-flex items-center gap-0.5 h-6 px-1.5 rounded-md text-[11.5px] font-semibold nums-tabular",
            good && "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
            bad && "bg-rose-500/15 text-rose-800 dark:text-rose-300",
            !good && !bad && "bg-foreground/[0.07] text-muted-foreground"
          )}
          title="Compared with the previous 14 days"
        >
          <TrendIcon className="w-3.5 h-3.5" strokeWidth={2.4} />
          {Math.abs(change).toFixed(0)}%
        </span>
      </div>

      {graphic}
      <p className="text-[11.5px] text-muted-foreground -mt-1">{caption}</p>
    </Link>
  );
}

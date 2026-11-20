import { cn } from "@/lib/utils";
import styles from "./dashboard.module.css";

export interface ActivityDay {
  label: string;
  sent: number;
  opened: number;
}

function niceMax(n: number) {
  if (n <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  for (const s of [1, 2, 2.5, 5, 10]) if (s * pow >= n) return s * pow;
  return 10 * pow;
}

/** 30-day line chart: emails sent (purple line + area) vs opened (light purple line). Lines draw in. */
export function ActivityChart({ days }: { days: ActivityDay[] }) {
  const W = 640;
  const H = 220;
  const left = 34;
  const right = 8;
  const top = 12;
  const bottom = 186;
  const max = niceMax(Math.max(1, ...days.flatMap((d) => [d.sent, d.opened])));
  const step = (W - left - right) / Math.max(1, days.length - 1);
  const x = (i: number) => left + i * step;
  const y = (v: number) => bottom - (v / max) * (bottom - top);

  const path = (key: "sent" | "opened") =>
    days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(" ");
  const sentLine = path("sent");
  const openedLine = path("opened");
  const area = `${sentLine} L${x(days.length - 1).toFixed(1)} ${bottom} L${left} ${bottom} Z`;

  const totalSent = days.reduce((s, d) => s + d.sent, 0);
  const totalOpened = days.reduce((s, d) => s + d.opened, 0);
  const peak = days.reduce((best, d) => (d.sent > best.sent ? d : best), days[0] ?? { label: "", sent: 0, opened: 0 });
  const labelEvery = Math.max(1, Math.ceil(days.length / 6));

  return (
    <figure className="m-0 flex flex-col gap-3 min-w-0">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <span className="text-[15px] font-semibold">Email activity · 30 days</span>
        <span className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-primary" aria-hidden="true" />
            Sent · {totalSent.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-[var(--chart-hatch)]" aria-hidden="true" />
            Opened · {totalOpened.toLocaleString()}
          </span>
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        role="img"
        aria-label={`Emails sent and opened per day over 30 days. ${totalSent} sent, ${totalOpened} opened. Busiest day ${peak.label} with ${peak.sent} sent.`}
      >
        {[0, max / 2, max].map((v) => (
          <g key={v}>
            <line x1={left} x2={W - right} y1={y(v)} y2={y(v)} className="stroke-foreground/10" strokeDasharray="2 5" />
            <text x={0} y={y(v) + 3} className="fill-muted-foreground" fontSize="10">
              {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
            </text>
          </g>
        ))}

        <path d={area} className={cn("fill-primary/10", styles.areaIn)} />
        <path
          d={openedLine}
          pathLength={1}
          fill="none"
          className={cn("stroke-[var(--chart-hatch)]", styles.draw)}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ animationDelay: "250ms" }}
        />
        <path
          d={sentLine}
          pathLength={1}
          fill="none"
          className={cn("stroke-primary", styles.draw)}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {days.map((d, i) => (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(d.sent)}
              r={3}
              className={cn("fill-card stroke-primary", styles.dotIn)}
              strokeWidth={2}
              style={{ animationDelay: `${900 + i * 15}ms` }}
            >
              <title>{`${d.label}: ${d.sent} sent, ${d.opened} opened`}</title>
            </circle>
            {i % labelEvery === 0 && (
              <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
                {d.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </figure>
  );
}

import styles from "./dashboard.module.css";

export interface DayVolume {
  label: string;
  current: number;
  previous: number;
}

function niceMax(n: number) {
  if (n <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const s of steps) {
    if (s * pow >= n) return s * pow;
  }
  return 10 * pow;
}

function short(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

/** Paired bar chart: solid orange = this week, hatched = same day last week. */
export function EmailsChart({ days }: { days: DayVolume[] }) {
  const W = 340;
  const H = 168;
  const left = 30;
  const top = 10;
  const baseline = 134;
  const plotH = baseline - top;
  const max = niceMax(Math.max(1, ...days.flatMap((d) => [d.current, d.previous])));
  const groupW = (W - left) / days.length;
  const barW = Math.min(14, groupW / 2 - 4);
  const y = (v: number) => baseline - (v / max) * plotH;

  const totalNow = days.reduce((s, d) => s + d.current, 0);
  const totalPrev = days.reduce((s, d) => s + d.previous, 0);
  const summary = days.map((d) => `${d.label} ${d.current} vs ${d.previous}`).join(", ");

  return (
    <figure className="m-0 flex flex-col gap-2 min-w-0">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[15px] font-semibold">Emails sent</span>
        <span className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-[var(--chart-bar)]" aria-hidden="true" />
            This week · {totalNow.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[3px] border-[1.5px] border-[var(--chart-hatch)]" aria-hidden="true" />
            Last week · {totalPrev.toLocaleString()}
          </span>
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        role="img"
        aria-label={`Emails sent per day, this week versus the same day last week: ${summary}.`}
      >
        <defs>
          <pattern id="emails-hatch" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" className="stroke-[var(--chart-hatch)]" strokeWidth="2" />
          </pattern>
        </defs>

        {[0, max / 2, max].map((v) => (
          <g key={v}>
            <line x1={left} x2={W} y1={y(v)} y2={y(v)} className="stroke-foreground/10" strokeDasharray="2 4" />
            <text x={0} y={y(v) + 3} className="fill-muted-foreground" fontSize="9.5">
              {short(v)}
            </text>
          </g>
        ))}

        {days.map((d, i) => {
          const gx = left + i * groupW + groupW / 2;
          const prevH = Math.max(baseline - y(d.previous), d.previous > 0 ? 2 : 0);
          const curH = Math.max(baseline - y(d.current), d.current > 0 ? 2 : 0);
          return (
            <g key={d.label + i}>
              <rect
                className={styles.bar}
                style={{ animationDelay: `${i * 70}ms` }}
                x={gx - barW - 2}
                y={baseline - prevH}
                width={barW}
                height={prevH}
                rx={3}
                fill="url(#emails-hatch)"
              >
                <title>{`${d.label} last week: ${d.previous}`}</title>
              </rect>
              <rect
                className={`${styles.bar} fill-[var(--chart-bar)]`}
                style={{ animationDelay: `${i * 70 + 120}ms` }}
                x={gx + 2}
                y={baseline - curH}
                width={barW}
                height={curH}
                rx={3}
              >
                <title>{`${d.label} this week: ${d.current}`}</title>
              </rect>
              <text x={gx} y={H - 12} textAnchor="middle" className="fill-foreground" fontSize="10.5" fontWeight={500}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

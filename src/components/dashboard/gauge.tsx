import styles from "./dashboard.module.css";

const TICKS = 37;

/** Semicircle tick gauge (0–100). Lit ticks animate in one after another. */
export function Gauge({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const lit = Math.round((pct / 100) * (TICKS - 1)) + (pct > 0 ? 1 : 0);

  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const a = Math.PI - (Math.PI * i) / (TICKS - 1);
    return {
      x1: 100 + 70 * Math.cos(a),
      y1: 100 - 70 * Math.sin(a),
      x2: 100 + 92 * Math.cos(a),
      y2: 100 - 92 * Math.sin(a),
      on: i < lit,
      i,
    };
  });

  return (
    <figure
      className="m-0 relative w-full max-w-[240px] [--gauge-track:var(--chart-track)]"
      role="img"
      aria-label={`${label}: ${pct.toFixed(0)} percent`}
    >
      <svg viewBox="0 0 200 106" className="w-full h-auto block" aria-hidden="true">
        {ticks.map((t) => (
          <line
            key={t.i}
            x1={t.x1.toFixed(1)}
            y1={t.y1.toFixed(1)}
            x2={t.x2.toFixed(1)}
            y2={t.y2.toFixed(1)}
            strokeWidth={2.6}
            strokeLinecap="round"
            className={t.on ? `stroke-[var(--chart-bar)] ${styles.tickOn}` : "stroke-[var(--gauge-track)]"}
            style={t.on ? { animationDelay: `${300 + t.i * 28}ms` } : undefined}
          />
        ))}
      </svg>
      <figcaption className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center">
        <span className="text-[30px] font-semibold tracking-tight leading-none nums-tabular">{pct.toFixed(0)}%</span>
        <span className="text-[11.5px] text-muted-foreground mt-1">{label}</span>
      </figcaption>
    </figure>
  );
}

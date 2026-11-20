import { cn } from "@/lib/utils";
import styles from "./dashboard.module.css";

/** Looping illustration: a paper plane flying a dashed route between envelopes. */
export function SendIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 120" className={cn("block", className)} aria-hidden="true" fill="none">
      {/* route */}
      <path
        d="M20 96 C 60 96, 70 40, 112 46 S 170 86, 204 30"
        className={cn("stroke-foreground/35", styles.flightPath)}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* envelope, bottom left */}
      <g className={styles.envelope}>
        <rect x="6" y="80" width="34" height="24" rx="5" className="fill-card stroke-foreground" strokeWidth="2" />
        <path d="M8 83 L23 94 L38 83" className="stroke-foreground" strokeWidth="2" strokeLinejoin="round" />
      </g>

      {/* envelope, top right (orange) */}
      <g className={styles.envelopeLate}>
        <rect x="176" y="12" width="36" height="26" rx="5" className="fill-primary stroke-foreground" strokeWidth="2" />
        <path d="M178 15 L194 27 L210 15" className="stroke-foreground" strokeWidth="2" strokeLinejoin="round" />
      </g>

      {/* paper plane */}
      <g className={styles.plane} style={{ transformOrigin: "112px 46px" }}>
        <path d="M92 52 L134 34 L118 64 L110 54 Z" className="fill-card stroke-foreground" strokeWidth="2" strokeLinejoin="round" />
        <path d="M110 54 L134 34" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" />
        <path d="M110 54 L108 64 L118 64" className="fill-secondary stroke-foreground" strokeWidth="2" strokeLinejoin="round" />
      </g>

      {/* sparkles */}
      <path d="M160 92 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 Z" className={cn("fill-primary", styles.spark)} />
      <path d="M62 22 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 Z" className={cn("fill-foreground/70", styles.sparkLate)} />
    </svg>
  );
}

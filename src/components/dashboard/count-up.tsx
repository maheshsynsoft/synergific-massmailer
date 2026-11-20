"use client";

import { useEffect, useRef } from "react";

interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}

function format(n: number, decimals: number, prefix: string, suffix: string) {
  return `${prefix}${n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

/**
 * Renders the final value on the server, then counts up from 0 on mount.
 * Writes to the DOM through a ref (no state), and skips the animation when
 * the user prefers reduced motion.
 */
export function CountUp({ value, decimals = 0, prefix = "", suffix = "", durationMs = 1100, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(value * eased, decimals, prefix, suffix);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = format(value, decimals, prefix, suffix);
    };
  }, [value, decimals, prefix, suffix, durationMs]);

  return (
    <span ref={ref} className={className}>
      {format(value, decimals, prefix, suffix)}
    </span>
  );
}

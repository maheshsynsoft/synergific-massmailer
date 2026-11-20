import Link from "next/link";
import { Check, CircleDashed, Clock, Minus, MoreHorizontal, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Records-table kit. Server-safe (no hooks), so it works in server and
 * client pages. Use with the shadcn Table in `@/components/ui/table`.
 * Pagination lives in `./pagination.tsx` (client).
 */

/** Toolbar button, e.g. "Filter  k". */
export const toolbarButton =
  "h-9 px-3 rounded-lg border border-border bg-card inline-flex items-center gap-2 text-[13px] font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50";

/** Put on the first <TableHead>/<TableCell> of each row to get the divider after the name column. */
export const firstColumn = "border-r border-border";

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center h-5 px-1.5 rounded-md border border-border bg-background text-[10.5px] font-sans text-muted-foreground">
      {children}
    </kbd>
  );
}

export function TableCard({
  title,
  toolbar,
  actions,
  footer,
  children,
  className,
  id,
}: {
  title: React.ReactNode;
  toolbar?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("bg-card rounded-2xl border border-border shadow-xs overflow-hidden animate-fade-in", className)}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 sm:px-5 py-3.5">
        <h2 id={id} className="text-[16px] font-semibold tracking-tight">{title}</h2>
        {toolbar && (
          <>
            <span aria-hidden="true" className="hidden sm:block w-px h-6 bg-border" />
            <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
          </>
        )}
        {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
      {footer && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-border text-[12.5px] text-muted-foreground">
          {footer}
        </div>
      )}
    </section>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/** Avatar + name + email, like the "Name" column. */
export function PersonCell({ name, email, href }: { name: string; email?: string | null; href?: string }) {
  const nameEl = <span className="block font-medium text-foreground truncate">{name}</span>;
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span
        aria-hidden="true"
        className="w-8 h-8 rounded-full bg-secondary text-[var(--primary-text)] flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
      >
        {initials(name)}
      </span>
      <div className="min-w-0 leading-tight">
        {href ? (
          <Link href={href} className="hover:underline underline-offset-2">
            {nameEl}
          </Link>
        ) : (
          nameEl
        )}
        {email && <span className="block text-[12px] text-muted-foreground truncate mt-0.5">{email}</span>}
      </div>
    </div>
  );
}

/** Underlined secondary link with an optional icon box (the "Company" column). */
export function LinkCell({
  href,
  icon,
  children,
}: {
  href?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const inner = (
    <>
      {icon && (
        <span className="w-7 h-7 rounded-lg border border-border bg-card flex items-center justify-center flex-shrink-0 text-foreground">
          {icon}
        </span>
      )}
      <span className="truncate underline decoration-foreground/25 underline-offset-[3px] group-hover:decoration-foreground">
        {children}
      </span>
    </>
  );
  if (!href) return <span className="group inline-flex items-center gap-2.5 min-w-0 text-muted-foreground">{inner}</span>;
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5 min-w-0 text-muted-foreground hover:text-foreground">
      {inner}
    </Link>
  );
}

/** Reference/ID with a small date chip underneath (the "Order ID" column). */
export function IdCell({ id, date }: { id: React.ReactNode; date?: React.ReactNode }) {
  return (
    <div className="leading-tight">
      <span className="block text-muted-foreground font-medium tracking-wide">{id}</span>
      {date && (
        <span className="inline-block mt-1 px-1.5 py-px rounded-full bg-foreground/[0.06] text-[10.5px] text-muted-foreground nums-tabular">
          {date}
        </span>
      )}
    </div>
  );
}

/** Two-line text: main + muted secondary line (the "Shipment type" column). */
export function StackCell({ primary, secondary }: { primary: React.ReactNode; secondary?: React.ReactNode }) {
  return (
    <div className="leading-tight min-w-0">
      <span className="block text-muted-foreground truncate">{primary}</span>
      {secondary && <span className="block text-[11.5px] text-muted-foreground/90 mt-0.5 truncate">{secondary}</span>}
    </div>
  );
}

export type StatusTone = "success" | "warning" | "danger" | "info" | "primary" | "neutral";

const toneClass: Record<StatusTone, string> = {
  success: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  warning: "bg-amber-500/20 text-amber-900 dark:text-amber-300",
  danger: "bg-rose-500/15 text-rose-800 dark:text-rose-300",
  info: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  primary: "bg-primary/15 text-[var(--primary-text)]",
  neutral: "bg-foreground/[0.07] text-muted-foreground",
};

const toneIcon: Record<StatusTone, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  success: Check,
  warning: Clock,
  danger: X,
  info: CircleDashed,
  primary: Send,
  neutral: Minus,
};

/** Tinted status pill with icon (the "Status" column). */
export function StatusPill({
  tone,
  children,
  icon,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }> | null;
  className?: string;
}) {
  const Icon = icon === null ? null : icon || toneIcon[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 h-6 px-2 rounded-md text-[12px] font-medium whitespace-nowrap capitalize",
        toneClass[tone],
        className
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2.4} />}
      {children}
    </span>
  );
}

/** "⋯" row action. */
export function RowAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      <MoreHorizontal className="w-4 h-4" />
    </Link>
  );
}

/** Full-width message row for empty tables. */
export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-[13px] text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}

/** Row entrance delay helper: `style={rowDelay(i)}` together with `className="animate-row-in"`. */
export function rowDelay(index: number): React.CSSProperties {
  return { animationDelay: `${Math.min(index, 12) * 35}ms` };
}

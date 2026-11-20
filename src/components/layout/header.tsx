"use client";

import { NotificationsBell } from "./notifications-bell";
import { ThemeToggle } from "./theme-toggle";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/*
 * Responsive page header.
 * Phone:     [title ............ theme bell]
 *            [actions, wrapping onto more lines if needed]
 * md and up: [title ...... actions  theme bell] on one row.
 * Theme and bell stay pinned to the title row so they never end up
 * on a line of their own.
 */
export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="border-b border-border bg-background lg:sticky lg:top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8 min-h-[64px] py-3 grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2.5">
        <div className="min-w-0 col-start-1 row-start-1">
          <h1 className="text-[18px] font-semibold tracking-tight text-foreground truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[12.5px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
        </div>

        {actions && (
          <div className="col-span-2 row-start-2 md:col-span-1 md:col-start-2 md:row-start-1 flex flex-wrap items-center gap-1.5 md:justify-end min-w-0">
            {actions}
          </div>
        )}

        <div className="col-start-2 row-start-1 md:col-start-3 flex items-center gap-1">
          <ThemeToggle />
          <NotificationsBell />
        </div>
      </div>
    </header>
  );
}

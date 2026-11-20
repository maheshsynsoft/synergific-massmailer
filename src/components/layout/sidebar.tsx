"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  Inbox,
  Send,
  FileText,
  Repeat,
  Megaphone,
  Mail,
  Target,
  DollarSign,
  TrendingUp,
  ClipboardList,
  Headphones,
  Ticket,
  BookOpen,
  Bot,
  Shield,
  ScrollText,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Trophy,
  Activity,
  CheckSquare,
  Zap,
  Filter,
  Globe,
  MailCheck,
  Calendar,
  Menu,
} from "lucide-react";

type CountKey = "leads" | "inbox" | "tasks" | "tickets" | "deals" | "handoffs";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  adminOnly?: boolean;
  countKey?: CountKey;
}

interface NavSection {
  id: string;
  title?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  collapsible?: boolean;
  adminOnly?: boolean;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    id: "main",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Contacts", href: "/contacts", icon: Users },
      { title: "Tasks", href: "/tasks", icon: CheckSquare, countKey: "tasks" },
      { title: "Activity", href: "/activity", icon: Activity },
    ],
  },
  {
    id: "communications",
    title: "Communications",
    icon: Inbox,
    collapsible: true,
    items: [
      { title: "Inbox", href: "/communications", icon: Inbox, countKey: "inbox" },
      { title: "Mass Email", href: "/mass-email", icon: Send },
      { title: "Delivery Tracking", href: "/delivery-tracking", icon: Activity },
      { title: "Domain Health", href: "/domain-health", icon: Shield },
      { title: "Campaign Analytics", href: "/campaign-analytics", icon: Activity },
      { title: "Scheduled", href: "/scheduled-emails", icon: Calendar },
      { title: "Templates", href: "/templates", icon: FileText },
    ],
  },
  {
    id: "automation",
    title: "Automation",
    icon: Zap,
    collapsible: true,
    adminOnly: true,
    items: [
      { title: "Follow-ups", href: "/follow-ups", icon: Repeat },
      { title: "Workflows", href: "/workflows", icon: Zap, adminOnly: true },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    icon: Megaphone,
    collapsible: true,
    items: [
      { title: "Overview", href: "/marketing", icon: Megaphone, adminOnly: true },
      { title: "Campaigns", href: "/marketing/campaigns", icon: Mail, adminOnly: true },
      { title: "Leads", href: "/marketing/leads", icon: Target, countKey: "leads" },
    ],
  },
  {
    id: "sales",
    title: "Sales",
    icon: DollarSign,
    collapsible: true,
    items: [
      { title: "Overview", href: "/sales", icon: DollarSign },
      { title: "Pipeline", href: "/sales/pipeline", icon: TrendingUp, countKey: "deals" },
      { title: "Leaderboard", href: "/sales/leaderboard", icon: Trophy },
      { title: "Targets", href: "/sales/targets", icon: Target },
      { title: "Activities", href: "/sales/activities", icon: ClipboardList },
    ],
  },
  {
    id: "support",
    title: "Support",
    icon: Headphones,
    collapsible: true,
    items: [
      { title: "Overview", href: "/support", icon: Headphones },
      { title: "Tickets", href: "/support/tickets", icon: Ticket, countKey: "tickets" },
      { title: "Knowledge Base", href: "/support/knowledge-base", icon: BookOpen },
      { title: "Chatbot", href: "/support/chatbot", icon: Bot },
    ],
  },
  {
    id: "enterprise",
    title: "Enterprise",
    icon: Shield,
    collapsible: true,
    adminOnly: true,
    items: [
      { title: "Team", href: "/enterprise/team", icon: Shield, adminOnly: true },
      { title: "Handoffs", href: "/enterprise/handoffs", icon: Repeat, adminOnly: true, countKey: "handoffs" },
      { title: "Routing Rules", href: "/enterprise/routing-rules", icon: Filter, adminOnly: true },
      { title: "Public Form", href: "/enterprise/public-form", icon: Globe, adminOnly: true },
      { title: "Digest Preview", href: "/enterprise/digest-preview", icon: MailCheck, adminOnly: true },
      { title: "Audit Log", href: "/enterprise/audit-log", icon: ScrollText, adminOnly: true },
      { title: "Analytics", href: "/enterprise/analytics", icon: BarChart3, adminOnly: true },
    ],
  },
];

type Counts = Record<CountKey, number>;
const ZERO_COUNTS: Counts = { leads: 0, inbox: 0, tasks: 0, tickets: 0, deals: 0, handoffs: 0 };

interface CurrentUser {
  name: string;
  email: string;
  role: string;
}

/** The collapsible section that holds this page, if any. */
function sectionForPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = navSections.find(
    (section) =>
      section.collapsible &&
      section.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
  );
  return match?.id ?? null;
}

function Brand() {
  return (
    <Link href="/dashboard" className="block px-2.5 group" aria-label="Synergific dashboard">
      {/* Dark-text logo on light surfaces, white-text logo in dark mode */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-1.jpeg"
        alt="Synergific"
        className="h-8 w-auto object-contain dark:hidden group-hover:opacity-90 transition-opacity"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Synergific"
        className="h-8 w-auto object-contain hidden dark:block group-hover:opacity-90 transition-opacity"
      />
    </Link>
  );
}

function CountBadge({ count, active }: { count: number; active?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "ml-auto min-w-[22px] h-[20px] px-1.5 rounded-full inline-flex items-center justify-center text-[11px] font-semibold nums-tabular",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

interface NavContentProps {
  pathname: string | null;
  sections: NavSection[];
  expanded: Record<string, boolean>;
  counts: Counts;
  currentUser: CurrentUser | null;
  isAdminUser: boolean;
  userRole: string;
  onToggleSection: (id: string) => void;
  onNavigate?: () => void;
}

function NavContent({
  pathname,
  sections,
  expanded,
  counts,
  currentUser,
  isAdminUser,
  userRole,
  onToggleSection,
  onNavigate,
}: NavContentProps) {
  const linkBase =
    "group flex items-center gap-2.5 rounded-xl transition-colors relative";


  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 pt-5 pb-4">
        <Brand />
      </div>

      {/* ── Navigation ───────────────────── */}
      <nav
        aria-label="Main"
        // Sections only slide after the user clicks in the nav. On page load
        // they render straight into place.
        onClickCapture={(e) => {
          e.currentTarget.dataset.ready = "true";
        }}
        className="group/nav flex-1 overflow-y-auto scrollbar-thin px-3 pb-3">
        {sections.map((section) => {
          const SectionIcon = section.icon;
          const isExpanded = expanded[section.id] ?? false;
          const hasActiveChild = section.items.some(
            (item) => pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
          );

          if (!section.collapsible) {
            return (
              <div key={section.id} className="space-y-0.5 mb-4">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const badgeCount = item.countKey ? counts[item.countKey] : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        linkBase,
                        "px-3 py-2 text-[13.5px]",
                        isActive
                          ? "bg-sidebar-accent text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 font-medium"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-[17px] h-[17px] flex-shrink-0 transition-colors",
                          isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                        )}
                        strokeWidth={1.8}
                      />
                      <span className="flex-1 truncate">{item.title}</span>
                      <CountBadge count={badgeCount} active={isActive} />
                    </Link>
                  );
                })}
              </div>
            );
          }

          const open = isExpanded;
          return (
            <div key={section.id} className="mb-1">
              <button
                type="button"
                onClick={() => onToggleSection(section.id)}
                aria-expanded={open}
                className={cn(
                  "w-full group flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold transition-colors",
                  hasActiveChild ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                )}
              >
                {SectionIcon && (
                  <SectionIcon
                    className={cn(
                      "w-[17px] h-[17px] flex-shrink-0",
                      hasActiveChild ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                    strokeWidth={1.8}
                  />
                )}
                <span className="flex-1 text-left">{section.title}</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-muted-foreground group-data-[ready=true]/nav:transition-transform duration-200 motion-reduce:transition-none",
                    open ? "rotate-0" : "-rotate-90"
                  )}
                  strokeWidth={2.2}
                />
              </button>

              <div
                className={cn(
                  "grid group-data-[ready=true]/nav:transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                  open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <div className="ml-[21px] pl-3 border-l border-sidebar-border space-y-0.5 py-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      const badgeCount = item.countKey ? counts[item.countKey] : 0;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onNavigate}
                          tabIndex={open ? undefined : -1}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            linkBase,
                            "px-2.5 py-1.5 text-[13px]",
                            isActive
                              ? "bg-sidebar-accent text-foreground font-semibold"
                              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 font-medium"
                          )}
                        >
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="absolute -left-[13.5px] top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-primary"
                            />
                          )}
                          <Icon
                            className={cn(
                              "w-[15px] h-[15px] flex-shrink-0",
                              isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                            )}
                            strokeWidth={1.8}
                          />
                          <span className="flex-1 truncate">{item.title}</span>
                          <CountBadge count={badgeCount} active={isActive} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Footer: Settings + User ──────── */}
      <div className="border-t border-sidebar-border px-3 py-3 space-y-2">
        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            onClick={onNavigate}
            aria-current={pathname === "/settings" ? "page" : undefined}
            className={cn(
              linkBase,
              "flex-1 px-3 py-2 text-[13.5px]",
              pathname === "/settings"
                ? "bg-sidebar-accent text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 font-medium"
            )}
          >
            <Settings className="w-[17px] h-[17px]" strokeWidth={1.8} />
            Settings
          </Link>
          <ThemeToggle />
        </div>

        {currentUser && (
          <div className="flex items-center gap-2.5 px-2 pt-1">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[12px] font-bold">
                {currentUser.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span
                aria-hidden="true"
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-sidebar"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-semibold truncate leading-tight">{currentUser.name}</p>
                <span
                  className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0",
                    isAdminUser ? "bg-primary/15 text-primary" : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {userRole}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">{currentUser.email}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              aria-label="Sign out"
              title="Sign out"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </div>
        )}
        {!currentUser && (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12.5px] font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

interface SidebarProps {
  /** User resolved on the server, so admin-only sections render on first paint. */
  initialUser: CurrentUser | null;
}

export function Sidebar({ initialUser }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sessionUser: CurrentUser | null = session?.user
    ? { name: session.user.name || "", email: session.user.email || "", role: (session.user as { role?: string }).role || "agent" }
    : null;
  const currentUser = initialUser ?? sessionUser;
  const userRole = currentUser?.role || "agent";
  const isAdminUser = userRole === "admin";

  // Live counts for badges — refreshed on focus + every 60s
  const [counts, setCounts] = useState<Counts>(ZERO_COUNTS);
  useEffect(() => {
    let cancelled = false;
    const fetchCounts = async () => {
      try {
        const res = await fetch("/api/sidebar/counts");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCounts(data);
      } catch {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 60_000);
    const onFocus = () => fetchCounts();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [currentUser?.email, currentUser?.role, pathname]);

  // Filter sections + items by role
  const visibleSections = navSections
    .filter((section) => !section.adminOnly || isAdminUser)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.adminOnly || isAdminUser),
    }))
    .filter((section) => section.items.length > 0);

  // Accordion: one section open at a time. It follows the route, so going
  // to a page outside the open section closes it and opens the page's own.
  const routeSection = sectionForPath(pathname);
  const [openSection, setOpenSection] = useState<string | null>(routeSection);
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpenSection(routeSection);
  }
  const expanded: Record<string, boolean> = openSection ? { [openSection]: true } : {};

  function toggleSection(id: string) {
    setOpenSection((current) => (current === id ? null : id));
  }

  const navProps: NavContentProps = {
    pathname,
    sections: visibleSections,
    expanded,
    counts,
    currentUser,
    isAdminUser,
    userRole,
    onToggleSection: toggleSection,
  };

  return (
    <>
      {/* ── Mobile top bar (below lg) ─────── */}
      <div className="lg:hidden flex items-center justify-between gap-3 h-14 px-4 border-b border-sidebar-border bg-sidebar">
        <Brand />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Menu className="w-5 h-5" strokeWidth={1.8} />
        </button>
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 gap-0 w-[280px] max-w-[85vw] bg-sidebar border-sidebar-border">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <NavContent {...navProps} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* ── Desktop sidebar (lg and up) ───── */}
      <aside className="hidden lg:flex w-[256px] flex-shrink-0 border-r border-sidebar-border bg-sidebar flex-col h-screen sticky top-0">
        <NavContent {...navProps} />
      </aside>
    </>
  );
}

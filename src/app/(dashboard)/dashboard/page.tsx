import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { SearchTrigger } from "@/components/dashboard/search-trigger";
import { EmailsChart, type DayVolume } from "@/components/dashboard/emails-chart";
import { Gauge } from "@/components/dashboard/gauge";
import { CountUp } from "@/components/dashboard/count-up";
import { SendIllustration } from "@/components/dashboard/send-illustration";
import { KpiCard, MiniBars, Sparkline, RingMeter, MeterBar } from "@/components/dashboard/kpi-card";
import { ActivityChart, type ActivityDay } from "@/components/dashboard/activity-chart";
import { PipelineDonut, type StageSlice } from "@/components/dashboard/pipeline-donut";
import styles from "@/components/dashboard/dashboard.module.css";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  TableCard,
  PersonCell,
  LinkCell,
  IdCell,
  StatusPill,
  RowAction,
  EmptyRow,
  firstColumn,
  rowDelay,
  toolbarButton,
  type StatusTone,
} from "@/components/data-table/records";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckSquare,
  Inbox,
  Mail,
  Plus,
  Briefcase,
  Send,
  Users,
  IndianRupee,
  Ticket,
} from "lucide-react";

const DAY = 24 * 60 * 60 * 1000;

type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

function ymd(d: Date | string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-CA");
}

/** All dashboard queries. Kept outside the component so time-based maths stays out of render. */
async function getDashboardData(user: CurrentUser, isAdminUser: boolean) {
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * DAY);
  const thirtyDaysAgo = new Date(now - 30 * DAY);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  // 30 whole days ending today; KPI trends compare the last 14 days with the 14 before.
  const windowStart = new Date(todayStart.getTime() - 29 * DAY);

  const dealScope = isAdminUser ? {} : { ownerId: user?.id };
  const ticketScope = isAdminUser ? {} : { OR: [{ assignedToId: user?.id }, { assignedToId: null }] };
  const ownerScope = isAdminUser ? {} : { ownerId: user?.id };
  const emailScope = isAdminUser ? {} : { userId: user?.id };

  const [staleLeadsRaw, overdueTasks, unrepliedInbound] = user
    ? await Promise.all([
        prisma.contact.findMany({
          where: {
            ...ownerScope,
            status: "lead",
            OR: [{ lastContactedAt: null }, { lastContactedAt: { lt: sevenDaysAgo } }],
          },
          orderBy: [{ leadScore: "desc" }, { lastContactedAt: "asc" }],
          take: 3,
          select: { id: true, name: true, email: true, company: true, lastContactedAt: true },
        }),
        prisma.task.findMany({
          where: { done: false, ...(isAdminUser ? {} : { userId: user.id }), dueDate: { lt: new Date(now) } },
          orderBy: { dueDate: "asc" },
          take: 3,
          select: { id: true, title: true, dueDate: true, priority: true },
        }),
        prisma.emailMessage.findMany({
          where: {
            direction: "inbound",
            aiReplied: false,
            ...(isAdminUser ? {} : { OR: [{ userId: user.id }, { userId: null }] }),
          },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { contact: { select: { id: true, name: true } } },
        }),
      ])
    : [[], [], []];

  const staleLeads = staleLeadsRaw.map((l) => ({
    ...l,
    daysAgo: l.lastContactedAt ? Math.floor((now - new Date(l.lastContactedAt).getTime()) / DAY) : null,
  }));

  const [
    recentDeals,
    recentTickets,
    emailsWindow,
    sent30,
    opened30,
    openTasks,
    wonDealsAgg,
    openTickets,
    campaigns,
    campaignTotal,
    contactsWindow,
    contactTotal,
    wonWindow,
    ticketsWindow,
    stageGroups,
    ticketTotal,
  ] = await Promise.all([
    prisma.deal.findMany({ where: dealScope, take: 6, orderBy: { createdAt: "desc" }, include: { contact: true } }),
    prisma.ticket.findMany({ where: ticketScope, take: 6, orderBy: { createdAt: "desc" }, include: { contact: true } }),
    prisma.emailMessage.findMany({
      where: { direction: "outbound", ...emailScope, sentAt: { gte: windowStart } },
      select: { sentAt: true, openedAt: true },
    }),
    prisma.emailMessage.count({ where: { direction: "outbound", ...emailScope, sentAt: { gte: thirtyDaysAgo } } }),
    prisma.emailMessage.count({
      where: { direction: "outbound", ...emailScope, sentAt: { gte: thirtyDaysAgo }, openedAt: { not: null } },
    }),
    prisma.task.count({ where: { done: false, ...(isAdminUser ? {} : { userId: user?.id }) } }),
    prisma.deal.aggregate({ where: { ...dealScope, stage: "won" }, _sum: { value: true }, _count: true }),
    prisma.ticket.count({ where: { ...ticketScope, status: { in: ["open", "in_progress"] } } }),
    isAdminUser
      ? prisma.campaign.findMany({
          orderBy: { updatedAt: "desc" },
          take: 8,
          select: {
            id: true,
            name: true,
            subject: true,
            status: true,
            scheduledFor: true,
            sentAt: true,
            createdAt: true,
            sentCount: true,
            openRate: true,
            clickRate: true,
          },
        })
      : Promise.resolve([]),
    isAdminUser ? prisma.campaign.count() : Promise.resolve(0),
    prisma.contact.findMany({ where: { createdAt: { gte: windowStart } }, select: { createdAt: true } }),
    prisma.contact.count(),
    prisma.deal.findMany({
      where: { ...dealScope, stage: "won", wonAt: { gte: windowStart } },
      select: { wonAt: true, value: true },
    }),
    prisma.ticket.findMany({ where: { ...ticketScope, createdAt: { gte: windowStart } }, select: { createdAt: true } }),
    prisma.deal.groupBy({ by: ["stage"], where: dealScope, _count: { _all: true }, _sum: { value: true } }),
    prisma.ticket.count({ where: ticketScope }),
  ]);

  /** 30 daily buckets (oldest first) for dates inside the window. */
  function bucket<T>(rows: T[], date: (r: T) => Date | null, weight: (r: T) => number = () => 1) {
    const out = new Array(30).fill(0) as number[];
    for (const r of rows) {
      const d = date(r);
      if (!d) continue;
      const idx = Math.floor((new Date(d).getTime() - windowStart.getTime()) / DAY);
      if (idx >= 0 && idx < 30) out[idx] += weight(r);
    }
    return out;
  }
  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

  const sentDaily = bucket(emailsWindow, (m) => m.sentAt);
  const openedDaily = bucket(emailsWindow, (m) => m.openedAt);
  const contactsDaily = bucket(contactsWindow, (c) => c.createdAt);
  const wonDaily = bucket(wonWindow, (d) => d.wonAt, (d) => d.value);
  const ticketsDaily = bucket(ticketsWindow, (t) => t.createdAt);

  const dayLabel = (i: number) => new Date(windowStart.getTime() + i * DAY);

  // Bar chart: last 7 days vs the 7 days before.
  const days: DayVolume[] = Array.from({ length: 7 }, (_, i) => ({
    label: dayLabel(23 + i).toLocaleDateString("en-GB", { weekday: "short" }),
    previous: sentDaily[16 + i],
    current: sentDaily[23 + i],
  }));

  // Line chart: all 30 days.
  const activity: ActivityDay[] = sentDaily.map((sent, i) => ({
    label: dayLabel(i).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    sent,
    opened: openedDaily[i],
  }));

  // KPI cards: last 14 days (series) vs the 14 before (previous).
  const kpi = (daily: number[]) => ({ series: daily.slice(16), previous: sum(daily.slice(2, 16)) });

  const pipeline: StageSlice[] = stageGroups.map((g) => ({
    stage: g.stage,
    count: g._count._all,
    value: g._sum.value || 0,
  }));

  return {
    staleLeads,
    overdueTasks,
    unrepliedInbound,
    recentDeals,
    recentTickets,
    days,
    openRate: sent30 > 0 ? (opened30 / sent30) * 100 : 0,
    openTasks,
    revenue: wonDealsAgg._sum.value || 0,
    wonCount: wonDealsAgg._count,
    openTickets,
    campaigns,
    campaignTotal,
    activity,
    pipeline,
    contactTotal,
    ticketTotal,
    kpis: {
      emails: kpi(sentDaily),
      contacts: kpi(contactsDaily),
      revenue: kpi(wonDaily),
      tickets: kpi(ticketsDaily),
    },
  };
}

const campaignTone: Record<string, StatusTone> = {
  draft: "neutral",
  scheduled: "info",
  active: "success",
  sending: "primary",
  paused: "warning",
  failed: "danger",
};

const stageTone: Record<string, StatusTone> = {
  lead: "neutral",
  qualified: "primary",
  proposal: "info",
  negotiation: "warning",
  won: "success",
  lost: "danger",
};

const ticketStatusTone: Record<string, StatusTone> = {
  open: "info",
  in_progress: "warning",
  resolved: "success",
  closed: "neutral",
};

const priorityTone: Record<string, StatusTone> = {
  urgent: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
};

function StatLink({ href, value, children, delay }: { href: string; value: React.ReactNode; children: React.ReactNode; delay: number }) {
  return (
    <div className={cn("flex-[1_1_150px] flex flex-col gap-6 pb-1", styles.rise)} style={{ animationDelay: `${delay}ms` }}>
      <span className="text-[30px] font-semibold tracking-tight leading-none nums-tabular">{value}</span>
      <Link
        href={href}
        className="group inline-flex items-center justify-between gap-4 text-[12.5px] leading-snug text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{children}</span>
        <ArrowRight className="w-4 h-4 text-foreground transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
      </Link>
    </div>
  );
}

function RateCell({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center justify-end gap-2.5">
      <span className="w-14 h-1.5 rounded-full bg-foreground/10 overflow-hidden hidden sm:block" aria-hidden="true">
        <span className={cn("block h-full rounded-full bg-primary", styles.fill)} style={{ width: `${pct}%` }} />
      </span>
      <span className="nums-tabular w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

function ViewAll({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-primary hover:underline inline-flex items-center gap-0.5">
      {children} <ArrowUpRight className="w-3 h-3" />
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const isAdminUser = isAdmin(user);
  const data = await getDashboardData(user, isAdminUser);
  const firstName = user?.name?.split(" ")[0] || "there";

  const statusCounts = data.campaigns.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const attention = [
    ...data.staleLeads.map((l) => ({
      key: `lead-${l.id}`,
      kind: "lead" as const,
      name: l.name,
      sub: l.email,
      detail: l.company || "—",
      when: l.daysAgo === null ? "Never contacted" : `${l.daysAgo} days ago`,
      href: `/contacts/${l.id}`,
    })),
    ...data.overdueTasks.map((t) => ({
      key: `task-${t.id}`,
      kind: "task" as const,
      name: t.title,
      sub: null,
      detail: t.priority ? `${t.priority} priority` : "—",
      when: t.dueDate ? `Due ${ymd(t.dueDate)}` : "—",
      href: "/tasks",
    })),
    ...data.unrepliedInbound.map((e) => ({
      key: `mail-${e.id}`,
      kind: "email" as const,
      name: e.contact?.name || e.fromAddr,
      sub: e.fromAddr,
      detail: e.subject,
      when: ymd(e.createdAt) || "—",
      href: "/communications",
    })),
  ];

  const attentionPill: Record<"lead" | "task" | "email", { tone: StatusTone; label: string }> = {
    lead: { tone: "danger", label: "Stale lead" },
    task: { tone: "warning", label: "Overdue task" },
    email: { tone: "info", label: "Unreplied" },
  };

  const sumOf = (a: number[]) => a.reduce((t, v) => t + v, 0);
  const cumulative = (a: number[]) => a.reduce<number[]>((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], []);
  const dealValue = data.pipeline.filter((p) => p.stage !== "lost").reduce((t, p) => t + p.value, 0);
  const wonValue = data.pipeline.find((p) => p.stage === "won")?.value ?? 0;
  const winShare = dealValue > 0 ? (wonValue / dealValue) * 100 : 0;

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6 max-w-[1440px] mx-auto">
      {/* ── Greeting ─────────────────────────── */}
      <div className={cn("flex flex-wrap items-center justify-between gap-3 px-1", styles.rise)}>
        <div className="min-w-0">
          <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight leading-tight">Welcome back, {firstName}</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {data.openTickets} open tickets · {data.wonCount} deals won
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <Link
            href={isAdminUser ? "/marketing/campaigns/new" : "/mass-email"}
            className="h-10 px-4 rounded-xl inline-flex items-center gap-1.5 text-[13.5px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            {isAdminUser ? "New campaign" : "Send email"}
          </Link>
        </div>
      </div>

      {/* ── Overview panel ─────────────────────── */}
      <section aria-label="Overview" className={cn("bg-secondary rounded-[20px] p-4 sm:p-6 space-y-7", styles.rise)}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <SearchTrigger />
          <div className="flex flex-wrap items-center gap-1">
            <Link href="/communications" className="h-9 px-2.5 rounded-xl inline-flex items-center gap-1.5 text-[13px] hover:bg-card transition-colors">
              <Inbox className="w-[15px] h-[15px]" strokeWidth={1.8} /> Inbox
            </Link>
            <Link href="/tasks" className="h-9 px-2.5 rounded-xl inline-flex items-center gap-1.5 text-[13px] hover:bg-card transition-colors">
              <CheckSquare className="w-[15px] h-[15px]" strokeWidth={1.8} /> Tasks
            </Link>
            <Link href="/campaign-analytics" className="h-9 px-2.5 rounded-xl inline-flex items-center gap-1.5 text-[13px] hover:bg-card transition-colors">
              <BarChart3 className="w-[15px] h-[15px]" strokeWidth={1.8} /> Analytics
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-10 gap-y-8">
          <div className="flex-[1_1_300px] max-w-[440px] min-w-0">
            <EmailsChart days={data.days} />
          </div>
          <div className={cn("flex-[0_1_240px] flex justify-center", styles.rise)} style={{ animationDelay: "120ms" }}>
            <Gauge value={data.openRate} label="Open rate · 30 days" />
          </div>
          <StatLink href="/tasks" value={<CountUp value={data.openTasks} />} delay={200}>
            Tasks<br />in progress
          </StatLink>
          <StatLink href="/sales" value={<CountUp value={data.wonCount} />} delay={260}>
            Deals<br />won so far
          </StatLink>
        </div>
      </section>

      {/* ── Summary cards (animated graphics) ─── */}
      <div className="grid grid-cols-1 min-[440px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Emails sent"
          href="/campaign-analytics"
          icon={Send}
          value={sumOf(data.kpis.emails.series)}
          series={data.kpis.emails.series}
          previous={data.kpis.emails.previous}
          graphic={<MiniBars series={data.kpis.emails.series} />}
          caption="Per day, last 14 days"
          delay={60}
        />
        <KpiCard
          label="Contacts"
          href="/contacts"
          icon={Users}
          value={data.contactTotal}
          series={data.kpis.contacts.series}
          previous={data.kpis.contacts.previous}
          graphic={<Sparkline series={cumulative(data.kpis.contacts.series)} />}
          caption={`${sumOf(data.kpis.contacts.series).toLocaleString()} added in 14 days`}
          delay={120}
        />
        <KpiCard
          label="Revenue won"
          href="/sales"
          icon={IndianRupee}
          value={data.revenue / 1000}
          decimals={1}
          prefix="₹"
          suffix="k"
          series={data.kpis.revenue.series}
          previous={data.kpis.revenue.previous}
          graphic={<RingMeter pct={winShare} caption="of deal value won" />}
          caption={`₹${(sumOf(data.kpis.revenue.series) / 1000).toFixed(1)}k in the last 14 days`}
          delay={180}
        />
        <KpiCard
          label="Tickets"
          href="/support/tickets"
          icon={Ticket}
          value={data.openTickets}
          series={data.kpis.tickets.series}
          previous={data.kpis.tickets.previous}
          graphic={<MeterBar value={data.openTickets} total={data.ticketTotal} label="open" rest="closed" />}
          caption={`${sumOf(data.kpis.tickets.series)} opened in 14 days`}
          invert
          delay={240}
        />
      </div>

      {/* ── Graphs ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-4">
        <section
          aria-label="Email activity"
          className={cn("bg-card rounded-2xl border border-border p-4 sm:p-5 min-w-0", styles.rise)}
          style={{ animationDelay: "120ms" }}
        >
          <ActivityChart days={data.activity} />
        </section>
        <section
          aria-label="Deal pipeline"
          className={cn("bg-card rounded-2xl border border-border p-4 sm:p-5 min-w-0", styles.rise)}
          style={{ animationDelay: "200ms" }}
        >
          <PipelineDonut slices={data.pipeline} />
        </section>
      </div>

      {/* ── Campaigns ─────────────────────────── */}
      {isAdminUser && (
        <TableCard
          id="campaigns-heading"
          title="Campaigns"
          toolbar={
            <>
              {(["active", "scheduled", "draft"] as const).map((s) =>
                statusCounts[s] ? (
                  <StatusPill key={s} tone={campaignTone[s]} icon={null}>
                    {statusCounts[s]} {s}
                  </StatusPill>
                ) : null
              )}
            </>
          }
          actions={
            <Link
              href="/marketing/campaigns/new"
              className="h-9 px-3.5 rounded-lg inline-flex items-center gap-1.5 text-[13px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" strokeWidth={2.2} /> New campaign
            </Link>
          }
          footer={
            <>
              <span>Showing {data.campaigns.length} of {data.campaignTotal.toLocaleString()} campaigns</span>
              <ViewAll href="/marketing/campaigns">All campaigns</ViewAll>
            </>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={firstColumn}>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Open rate</TableHead>
                <TableHead className="text-right">Click rate</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.campaigns.length === 0 && (
                <EmptyRow colSpan={7}>
                  <SendIllustration className="w-[160px] mx-auto mb-2" />
                  No campaigns yet.{" "}
                  <Link href="/marketing/campaigns/new" className="font-semibold text-primary hover:underline">Create your first one</Link>
                </EmptyRow>
              )}
              {data.campaigns.map((c, i) => {
                const label = c.status === "scheduled" ? "Scheduled for" : c.sentAt ? "Sent" : "Created";
                const date = c.status === "scheduled" ? c.scheduledFor : c.sentAt || c.createdAt;
                return (
                  <TableRow key={c.id} className="animate-row-in" style={rowDelay(i)}>
                    <TableCell className={cn(firstColumn, "max-w-[320px]")}>
                      <Link href={`/marketing/campaigns/${c.id}`} className="flex items-center gap-3 min-w-0 group">
                        <span className="w-8 h-8 rounded-full bg-secondary text-[var(--primary-text)] flex items-center justify-center flex-shrink-0" aria-hidden="true">
                          <Mail className="w-4 h-4" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 leading-tight">
                          <span className="block font-medium truncate group-hover:underline underline-offset-2">{c.name}</span>
                          <span className="block text-[12px] text-muted-foreground truncate mt-0.5">{c.subject || "No subject yet"}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={campaignTone[c.status] || "neutral"}>{c.status}</StatusPill>
                    </TableCell>
                    <TableCell>
                      <IdCell id={label} date={ymd(date) || "—"} />
                    </TableCell>
                    <TableCell className="text-right nums-tabular text-muted-foreground">{c.sentCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-muted-foreground"><RateCell value={c.openRate} /></TableCell>
                    <TableCell className="text-right text-muted-foreground"><RateCell value={c.clickRate} /></TableCell>
                    <TableCell className="text-right">
                      <RowAction href={`/marketing/campaigns/${c.id}`} label={`Open ${c.name}`} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableCard>
      )}

      {/* ── Needs attention ───────────────────── */}
      {attention.length > 0 && (
        <TableCard
          id="attention-heading"
          title="Needs attention"
          toolbar={<span className="text-[12.5px] text-muted-foreground">Stale leads, overdue tasks and unreplied emails</span>}
          footer={
            <>
              <span>{attention.length} items</span>
              <span className="flex flex-wrap gap-4">
                <ViewAll href="/marketing/leads">Leads</ViewAll>
                <ViewAll href="/tasks">Tasks</ViewAll>
                <ViewAll href="/communications">Inbox</ViewAll>
              </span>
            </>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={firstColumn}>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attention.map((row, i) => (
                <TableRow key={row.key} className="animate-row-in" style={rowDelay(i)}>
                  <TableCell className={cn(firstColumn, "max-w-[300px]")}>
                    {row.kind === "task" ? (
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-secondary text-[var(--primary-text)] flex items-center justify-center flex-shrink-0" aria-hidden="true">
                          <CheckSquare className="w-4 h-4" strokeWidth={1.8} />
                        </span>
                        <span className="font-medium truncate">{row.name}</span>
                      </div>
                    ) : (
                      <PersonCell name={row.name} email={row.sub} />
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={attentionPill[row.kind].tone}>{attentionPill[row.kind].label}</StatusPill>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[320px] truncate">{row.detail}</TableCell>
                  <TableCell className="text-muted-foreground nums-tabular">{row.when}</TableCell>
                  <TableCell className="text-right">
                    <RowAction href={row.href} label={`Open ${row.name}`} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}

      {/* ── Recent deals ──────────────────────── */}
      <TableCard
        id="deals-heading"
        title="Recent deals"
        actions={<Link href="/sales/pipeline" className={toolbarButton}>Pipeline</Link>}
        footer={
          <>
            <span>Latest {data.recentDeals.length} deals</span>
            <ViewAll href="/sales/pipeline">View all deals</ViewAll>
          </>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={firstColumn}>Contact</TableHead>
              <TableHead>Deal</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.recentDeals.length === 0 && (
              <EmptyRow colSpan={6}>
                No deals yet.{" "}
                <Link href="/sales/pipeline" className="font-semibold text-primary hover:underline">Create your first deal</Link>
              </EmptyRow>
            )}
            {data.recentDeals.map((deal, i) => (
              <TableRow key={deal.id} className="animate-row-in" style={rowDelay(i)}>
                <TableCell className={firstColumn}>
                  <PersonCell name={deal.contact.name} email={deal.contact.email} href={`/contacts/${deal.contact.id}`} />
                </TableCell>
                <TableCell className="max-w-[260px]">
                  <LinkCell href={`/sales/deals/${deal.id}`} icon={<Briefcase className="w-3.5 h-3.5" strokeWidth={1.8} />}>
                    {deal.title}
                  </LinkCell>
                </TableCell>
                <TableCell><IdCell id={ymd(deal.createdAt)} /></TableCell>
                <TableCell><StatusPill tone={stageTone[deal.stage] || "neutral"}>{deal.stage}</StatusPill></TableCell>
                <TableCell className="text-right font-semibold nums-tabular">₹{deal.value.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <RowAction href={`/sales/deals/${deal.id}`} label={`Open ${deal.title}`} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      {/* ── Recent tickets ────────────────────── */}
      <TableCard
        id="tickets-heading"
        title="Recent tickets"
        actions={<Link href="/support/tickets" className={toolbarButton}>Support queue</Link>}
        footer={
          <>
            <span>{data.openTickets} open · latest {data.recentTickets.length} shown</span>
            <ViewAll href="/support/tickets">View all tickets</ViewAll>
          </>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={firstColumn}>Contact</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.recentTickets.length === 0 && <EmptyRow colSpan={6}>No tickets yet.</EmptyRow>}
            {data.recentTickets.map((ticket, i) => (
              <TableRow key={ticket.id} className="animate-row-in" style={rowDelay(i)}>
                <TableCell className={firstColumn}>
                  <PersonCell name={ticket.contact.name} email={ticket.contact.email} href={`/contacts/${ticket.contact.id}`} />
                </TableCell>
                <TableCell className="max-w-[320px] truncate text-muted-foreground">{ticket.subject}</TableCell>
                <TableCell><IdCell id={ymd(ticket.createdAt)} /></TableCell>
                <TableCell><StatusPill tone={priorityTone[ticket.priority] || "neutral"} icon={null}>{ticket.priority}</StatusPill></TableCell>
                <TableCell>
                  <StatusPill tone={ticketStatusTone[ticket.status] || "neutral"}>{ticket.status.replace("_", " ")}</StatusPill>
                </TableCell>
                <TableCell className="text-right">
                  <RowAction href={`/support/tickets/${ticket.id}`} label={`Open ticket ${ticket.subject}`} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
}

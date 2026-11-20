"use client";

import { usePathname } from "next/navigation";

const BRAND = "Synergific";

// Longest matching prefix wins, so "/sales/pipeline" beats "/sales".
const TITLES: Record<string, string> = {
  "/login": "Sign in",
  "/register": "Create account",
  "/dashboard": "Dashboard",
  "/contacts": "Contacts",
  "/tasks": "Tasks",
  "/activity": "Activity",
  "/communications": "Inbox",
  "/mass-email": "Mass Email",
  "/delivery-tracking": "Delivery Tracking",
  "/domain-health": "Domain Health",
  "/campaign-analytics": "Campaign Analytics",
  "/scheduled-emails": "Scheduled Emails",
  "/templates": "Templates",
  "/follow-ups": "Follow-ups",
  "/follow-ups/new": "New Follow-up",
  "/workflows": "Workflows",
  "/marketing": "Marketing",
  "/marketing/campaigns": "Campaigns",
  "/marketing/campaigns/new": "New Campaign",
  "/marketing/leads": "Leads",
  "/sales": "Sales",
  "/sales/pipeline": "Pipeline",
  "/sales/deals": "Deal",
  "/sales/leaderboard": "Leaderboard",
  "/sales/targets": "Targets",
  "/sales/activities": "Sales Activities",
  "/support": "Support",
  "/support/tickets": "Tickets",
  "/support/knowledge-base": "Knowledge Base",
  "/support/chatbot": "Chatbot",
  "/enterprise/team": "Team",
  "/enterprise/handoffs": "Handoffs",
  "/enterprise/routing-rules": "Routing Rules",
  "/enterprise/public-form": "Public Form",
  "/enterprise/digest-preview": "Digest Preview",
  "/enterprise/audit-log": "Audit Log",
  "/enterprise/analytics": "Analytics",
  "/settings": "Settings",
  "/kb": "Help Center",
  "/portal": "Customer Portal",
  "/unsubscribe": "Unsubscribe",
};

export function routeTitle(pathname: string | null): string {
  if (!pathname) return BRAND;
  let best = "";
  for (const prefix of Object.keys(TITLES)) {
    const matches = pathname === prefix || pathname.startsWith(prefix + "/");
    if (matches && prefix.length > best.length) best = prefix;
  }
  return best ? `${TITLES[best]} | ${BRAND}` : BRAND;
}

/** Sets the browser tab title to "<Page> | Synergific" for the current route. */
export function RouteTitle() {
  const pathname = usePathname();
  return <title>{routeTitle(pathname)}</title>;
}

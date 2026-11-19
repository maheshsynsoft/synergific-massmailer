import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function categorize(status: string, reason?: string): { category: string; side: string; action: string } {
  const r = (reason || "").toLowerCase();
  if (status === "failed") return { category: "Send failure", side: "Synergific-side", action: "Check mailbox auth, sending limits or SMTP config, then retry." };
  if (r === "bounced") return { category: "Hard bounce", side: "Recipient-side", action: "Mailbox likely doesn't exist / domain rejected. Already suppressed; remove from source list." };
  if (r === "complained") return { category: "Spam complaint", side: "Recipient-side", action: "Recipient marked as spam. Keep suppressed; review content & frequency." };
  if (r === "unsubscribed") return { category: "Unsubscribed", side: "Recipient-side", action: "Honour preference — do not re-add." };
  return { category: "Unknown", side: "-", action: "Review manually." };
}

interface FailRow { id: string; toAddr: string; subject: string | null; status: string; createdAt: string; company: string | null; }
interface SuppRow { email: string; reason: string; createdAt: string; source: string | null; }

export async function GET() {
  try {
    const failed = await prisma.$queryRawUnsafe<FailRow[]>(
      `SELECT em.id, em.toAddr, em.subject, em.status, em.createdAt, c.company
       FROM "EmailMessage" em LEFT JOIN "Contact" c ON c.id = em.contactId
       WHERE em.status = 'failed' ORDER BY em.createdAt DESC LIMIT 200`
    );
    const supp = await prisma.$queryRawUnsafe<SuppRow[]>(
      `SELECT email, reason, createdAt, source FROM "Suppression"
       WHERE reason IN ('bounced','complained') ORDER BY createdAt DESC LIMIT 300`
    );
    const rows = [
      ...failed.map((f) => ({ email: f.toAddr, company: f.company, subject: f.subject, status: f.status, when: f.createdAt, ...categorize("failed") })),
      ...supp.map((s) => ({ email: s.email, company: null, subject: null, status: s.reason, when: s.createdAt, ...categorize("", s.reason) })),
    ].sort((a, b) => (a.when < b.when ? 1 : -1));
    const byCategory: Record<string, number> = {};
    for (const r of rows) byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    return NextResponse.json({ total: rows.length, byCategory, rows: rows.slice(0, 300) });
  } catch (e) {
    return NextResponse.json({ error: String(e), total: 0, byCategory: {}, rows: [] }, { status: 500 });
  }
}

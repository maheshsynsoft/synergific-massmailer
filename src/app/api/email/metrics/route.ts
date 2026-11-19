import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/email/metrics — campaign delivery overview (counts + rates).
export async function GET() {
  try {
    const q = async (sql: string) =>
      Number(
        (await prisma.$queryRawUnsafe<Array<{ cnt: number | bigint }>>(sql))[0]?.cnt ?? 0
      );
    const totalContacts = await q(`SELECT COUNT(*) cnt FROM "Contact"`);
    const sent = await q(
      `SELECT COUNT(*) cnt FROM "EmailMessage" WHERE direction='outbound' AND status IN ('sent','delivered','opened','clicked')`
    );
    const delivered = await q(
      `SELECT COUNT(*) cnt FROM "EmailMessage" WHERE status IN ('delivered','opened','clicked')`
    );
    const opened = await q(
      `SELECT COUNT(*) cnt FROM "EmailMessage" WHERE status IN ('opened','clicked') OR openedAt IS NOT NULL`
    );
    const clicked = await q(`SELECT COUNT(*) cnt FROM "EmailMessage" WHERE status='clicked'`);
    const pending = await q(
      `SELECT COUNT(*) cnt FROM "EmailMessage" WHERE direction='outbound' AND status IN ('draft','queued','pending')`
    );
    const failed = await q(`SELECT COUNT(*) cnt FROM "EmailMessage" WHERE status='failed'`);
    const bounced = await q(`SELECT COUNT(*) cnt FROM "Suppression" WHERE reason='bounced'`);
    const unsubscribed = await q(`SELECT COUNT(*) cnt FROM "Suppression" WHERE reason='unsubscribed'`);
    const complained = await q(`SELECT COUNT(*) cnt FROM "Suppression" WHERE reason='complained'`);
    const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
    return NextResponse.json({
      totalContacts, sent, delivered, opened, clicked, pending, failed,
      bounced, unsubscribed, complained,
      deliveredRate: pct(delivered, sent),
      openRate: pct(opened, delivered),
      clickRate: pct(clicked, delivered),
      bounceRate: pct(bounced, sent),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

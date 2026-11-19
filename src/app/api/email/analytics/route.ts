import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

interface Grp { key: string; sent: number; delivered: number; opened: number; clicked: number; }

async function group(expr: string, camp: string): Promise<Grp[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{ k: string; sent: bigint; delivered: bigint; opened: bigint; clicked: bigint }>>(
    `SELECT ${expr} as k,
       COUNT(*) as sent,
       SUM(CASE WHEN em.status IN ('delivered','opened','clicked') THEN 1 ELSE 0 END) as delivered,
       SUM(CASE WHEN em.status IN ('opened','clicked') OR em.openedAt IS NOT NULL THEN 1 ELSE 0 END) as opened,
       SUM(CASE WHEN em.status='clicked' THEN 1 ELSE 0 END) as clicked
     FROM "EmailMessage" em LEFT JOIN "Contact" c ON c.id = em.contactId
     WHERE em.direction='outbound' AND em.status IN ('sent','delivered','opened','clicked')${camp}
     GROUP BY k ORDER BY sent DESC LIMIT 100`
  );
  return rows.map((r) => ({ key: r.k || "Unknown", sent: Number(r.sent), delivered: Number(r.delivered), opened: Number(r.opened), clicked: Number(r.clicked) }));
}

async function analytics(req: Request) {
  const { searchParams } = new URL(req.url);
  const cid = (searchParams.get("campaign") || "").replace(/[^a-z0-9-]/gi, "");
  const camp = cid ? ` AND em.campaignId = '${cid}'` : "";
  const [byCountry, byCompany, byDomain] = await Promise.all([
    group("COALESCE(NULLIF(c.country,''),'Unknown')", camp),
    group("COALESCE(NULLIF(c.company,''),'Unknown')", camp),
    group("substr(em.toAddr, instr(em.toAddr,'@')+1)", camp),
  ]);
  return { byCountry, byCompany, byDomain };
}

export async function GET(req: Request) {
  try {
    return NextResponse.json(await analytics(req));
  } catch (e) {
    return NextResponse.json({ error: String(e), byCountry: [], byCompany: [], byDomain: [] }, { status: 500 });
  }
}

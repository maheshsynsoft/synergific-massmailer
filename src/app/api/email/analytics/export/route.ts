import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

interface Grp { key: string; sent: number; delivered: number; opened: number; clicked: number; }
async function group(expr: string): Promise<Grp[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{ k: string; sent: bigint; delivered: bigint; opened: bigint; clicked: bigint }>>(
    `SELECT ${expr} as k, COUNT(*) as sent,
       SUM(CASE WHEN em.status IN ('delivered','opened','clicked') THEN 1 ELSE 0 END) as delivered,
       SUM(CASE WHEN em.status IN ('opened','clicked') OR em.openedAt IS NOT NULL THEN 1 ELSE 0 END) as opened,
       SUM(CASE WHEN em.status='clicked' THEN 1 ELSE 0 END) as clicked
     FROM "EmailMessage" em LEFT JOIN "Contact" c ON c.id = em.contactId
     WHERE em.direction='outbound' AND em.status IN ('sent','delivered','opened','clicked')
     GROUP BY k ORDER BY sent DESC LIMIT 200`
  );
  return rows.map((r) => ({ key: r.k || "Unknown", sent: Number(r.sent), delivered: Number(r.delivered), opened: Number(r.opened), clicked: Number(r.clicked) }));
}
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
function section(title: string, rows: Grp[]): string {
  const head = `\n${title},Sent,Delivered,Delivered %,Opened,Open %,Clicked,Click %\n`;
  return head + rows.map((r) => `"${String(r.key).replace(/"/g, '""')}",${r.sent},${r.delivered},${pct(r.delivered, r.sent)},${r.opened},${pct(r.opened, r.delivered)},${r.clicked},${pct(r.clicked, r.delivered)}`).join("\n") + "\n";
}

export async function GET() {
  try {
    const [byCountry, byCompany, byDomain] = await Promise.all([
      group("COALESCE(NULLIF(c.country,''),'Unknown')"),
      group("COALESCE(NULLIF(c.company,''),'Unknown')"),
      group("substr(em.toAddr, instr(em.toAddr,'@')+1)"),
    ]);
    const csv =
      "Synergific Mass Email — Campaign Analytics\n" +
      section("Country", byCountry) +
      section("Company / Client", byCompany) +
      section("Email Domain", byDomain);
    return new Response(csv, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=campaign-analytics.csv" },
    });
  } catch (e) {
    return new Response("error," + String(e), { status: 500 });
  }
}

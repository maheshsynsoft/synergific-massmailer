import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/email/presend — pre-send safety breakdown for a set of contacts.
export async function POST(req: Request) {
  try {
    const { contactIds } = await req.json();
    if (!Array.isArray(contactIds) || contactIds.length === 0)
      return NextResponse.json({ error: "No contacts selected" }, { status: 400 });
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds } },
      select: { email: true, country: true, company: true, name: true },
    });
    const byCountry: Record<string, number> = {};
    const invalid: string[] = [];
    for (const c of contacts) {
      const country = (c.country || "").trim() || "Unknown";
      byCountry[country] = (byCountry[country] || 0) + 1;
      if (!EMAIL_RE.test(c.email)) invalid.push(c.email);
    }
    const emails = contacts.map((c) => c.email.toLowerCase());
    const placeholders = emails.map(() => "?").join(",");
    const suppRows = emails.length
      ? await prisma.$queryRawUnsafe<Array<{ email: string; reason: string }>>(
          `SELECT email, reason FROM "Suppression" WHERE email IN (${placeholders})`,
          ...emails
        )
      : [];
    const badSet = new Set([
      ...invalid.map((e) => e.toLowerCase()),
      ...suppRows.map((r) => r.email.toLowerCase()),
    ]);
    return NextResponse.json({
      total: contacts.length,
      sendable: contacts.length - badSet.size,
      byCountry,
      invalid,
      suppressed: suppRows,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

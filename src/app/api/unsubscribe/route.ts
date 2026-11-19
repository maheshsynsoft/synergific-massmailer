import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addSuppression, verifyUnsubscribeToken } from "@/lib/suppression";

/**
 * One-click unsubscribe endpoint (RFC 8058).
 * Gmail/Outlook POST here from their native "Unsubscribe" button, and our
 * own unsubscribe page POSTs here too. The signed token (?t=) ensures a
 * person can only unsubscribe their own address.
 */
async function unsubscribe(email: string, token: string, source: string) {
  if (!email || !verifyUnsubscribeToken(email, token)) {
    return { ok: false, error: "Invalid or expired unsubscribe link" };
  }

  await addSuppression({ email, reason: "unsubscribed", source });

  // Best-effort: note it on the matching contact for visibility.
  try {
    const contact = await prisma.contact.findFirst({
      where: { email: { equals: email.toLowerCase() } },
      select: { id: true },
    });
    if (contact) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Contact" SET "preferredChannel" = ? WHERE id = ?`,
        "none",
        contact.id
      );
    }
  } catch {
    // non-fatal
  }

  return { ok: true };
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  let email = (searchParams.get("e") || "").trim();
  let token = (searchParams.get("t") || "").trim();

  // Also accept form-encoded / JSON body (some clients post params in the body)
  if (!email || !token) {
    try {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const b = await req.json();
        email = email || b.e || b.email || "";
        token = token || b.t || b.token || "";
      } else {
        const text = await req.text();
        const p = new URLSearchParams(text);
        email = email || p.get("e") || "";
        token = token || p.get("t") || "";
      }
    } catch {
      // ignore body parse errors
    }
  }

  const result = await unsubscribe(email, token, "one-click");
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

// A human clicking the raw API link lands here — send them to the friendly page.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const e = searchParams.get("e") || "";
  const t = searchParams.get("t") || "";
  const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
  return NextResponse.redirect(
    `${base}/unsubscribe?e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}`
  );
}

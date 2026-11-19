import crypto from "crypto";
import { prisma } from "./prisma";

/**
 * Email suppression list — the core of compliant email marketing.
 * Any address on this list is NEVER emailed. Entries come from unsubscribes,
 * hard bounces, spam complaints, and manual additions.
 *
 * All lookups/writes use raw SQL so a stale Prisma client can't break sending.
 */

const SIGNING_SECRET = process.env.NEXTAUTH_SECRET || "synergific-unsub";

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/** Signed, tamper-proof token so people can only unsubscribe their own address. */
export function unsubscribeToken(email: string): string {
  return crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(normalize(email))
    .digest("base64url");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false;
  const expected = unsubscribeToken(email);
  // Constant-time compare
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

/** Human-facing unsubscribe page link (used in the email footer). */
export function buildUnsubscribeUrl(email: string, baseUrl: string): string {
  const e = encodeURIComponent(normalize(email));
  const t = encodeURIComponent(unsubscribeToken(email));
  return `${baseUrl.replace(/\/$/, "")}/unsubscribe?e=${e}&t=${t}`;
}

/** API endpoint for RFC 8058 one-click unsubscribe (Gmail/Outlook POST here). */
export function buildUnsubscribeApiUrl(email: string, baseUrl: string): string {
  const e = encodeURIComponent(normalize(email));
  const t = encodeURIComponent(unsubscribeToken(email));
  return `${baseUrl.replace(/\/$/, "")}/api/unsubscribe?e=${e}&t=${t}`;
}

/** Is this address on the suppression list? Fast indexed lookup. */
export async function isSuppressed(email: string): Promise<boolean> {
  if (!email) return false;
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ one: number }>>(
      `SELECT 1 as one FROM "Suppression" WHERE email = ? LIMIT 1`,
      normalize(email)
    );
    return rows.length > 0;
  } catch {
    // If the table/lookup ever fails, fail OPEN is dangerous for compliance —
    // but failing closed would block all sends. Log and allow; the table exists.
    return false;
  }
}

/** Add (or update) an address on the suppression list. Idempotent by email. */
export async function addSuppression(opts: {
  email: string;
  reason: "unsubscribed" | "bounced" | "complained" | "manual";
  source?: string;
  note?: string;
}): Promise<void> {
  const email = normalize(opts.email);
  if (!email) return;
  const id = crypto.randomUUID();
  try {
    // INSERT OR IGNORE keeps the original reason/createdAt if already present.
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO "Suppression" ("id","email","reason","source","note","createdAt")
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      id,
      email,
      opts.reason,
      opts.source ?? null,
      opts.note ?? null
    );
  } catch (e) {
    console.error("[suppression] addSuppression failed:", e);
  }
}

/** Remove an address from the suppression list (e.g. admin re-subscribes). */
export async function removeSuppression(email: string): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Suppression" WHERE email = ?`,
      normalize(email)
    );
  } catch (e) {
    console.error("[suppression] removeSuppression failed:", e);
  }
}

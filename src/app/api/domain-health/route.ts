import { NextResponse } from "next/server";
import dns, { MxRecord } from "dns/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_DOMAIN = process.env.SENDING_DOMAIN || "synergificsoftware.com";

interface Check { key: string; ok: boolean; warn?: boolean; value: string; detail: string; fix: string; }

async function txt(name: string): Promise<string[]> {
  try { return (await dns.resolveTxt(name)).map((r) => r.join("")); } catch { return []; }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = (searchParams.get("domain") || DEFAULT_DOMAIN).trim().toLowerCase();
  const checks: Check[] = [];

  const root = await txt(domain);
  const spf = root.find((r) => r.toLowerCase().startsWith("v=spf1"));
  checks.push({ key: "SPF", ok: !!spf, value: spf || "Not found",
    detail: spf ? "SPF record present — authorizes your sending servers." : "No v=spf1 TXT record. Receivers can't verify your sending servers.",
    fix: spf ? "" : `Add TXT @  "v=spf1 include:spf.protection.outlook.com -all"` });

  const dmarcTxt = await txt("_dmarc." + domain);
  const dmarc = dmarcTxt.find((r) => r.toLowerCase().startsWith("v=dmarc1"));
  const policy = dmarc ? (dmarc.match(/p=([a-z]+)/i)?.[1] || "none").toLowerCase() : null;
  checks.push({ key: "DMARC", ok: !!dmarc, warn: !!dmarc && policy === "none", value: dmarc || "Not found",
    detail: dmarc ? `Policy p=${policy}${policy === "none" ? " (monitor-only — spoofers not blocked)" : ""}` : "No DMARC record — spoofing protection missing.",
    fix: dmarc ? (policy === "none" ? "Strengthen to p=quarantine (then p=reject) once SPF/DKIM align." : "") : `Add TXT _dmarc  "v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}"` });

  let dkimOk = false, dkimVal = "Not found";
  for (const sel of ["selector1", "selector2"]) {
    try { const c = await dns.resolveCname(`${sel}._domainkey.${domain}`); if (c.length) { dkimOk = true; dkimVal = `${sel} → ${c[0]}`; break; } } catch {}
    const t = await txt(`${sel}._domainkey.${domain}`); if (t.length) { dkimOk = true; dkimVal = `${sel}: ${t[0].slice(0, 44)}…`; break; }
  }
  checks.push({ key: "DKIM", ok: dkimOk, value: dkimVal,
    detail: dkimOk ? "DKIM selector published — messages are cryptographically signed." : "No DKIM selector (selector1/2._domainkey) found.",
    fix: dkimOk ? "" : "Enable DKIM in Microsoft 365 Defender and publish the 2 CNAME selectors." });

  let mx: MxRecord[] = [];
  try { mx = await dns.resolveMx(domain); } catch {}
  checks.push({ key: "MX", ok: mx.length > 0, value: mx.map((m) => `${m.exchange} (${m.priority})`).join(", ") || "Not found",
    detail: mx.length ? "Mail exchangers configured (inbound ready)." : "No MX records.", fix: "" });

  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return NextResponse.json({ domain, score, checks });
}

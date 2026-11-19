import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai";

const BRAND =
  "Synergific Software Pvt Ltd — an ISO 9001 certified IT training & services company in Bangalore offering corporate training (Cloud, AWS, Azure, AI/GenAI, DevOps, Cybersecurity, SAP), CloudLabs hands-on sandboxes, OEM exam vouchers and an enterprise LMS.";

export async function POST(req: Request) {
  try {
    const { action, topic, body, company, industry } = await req.json();
    const ctx = [
      company && `Target company: ${company}`,
      industry && `Industry: ${industry}`,
      topic && `Goal of this email: ${topic}`,
    ].filter(Boolean).join("\n");

    if (action === "subjects") {
      const txt = await generateText(
        `You write high-converting B2B cold-email subject lines for ${BRAND}. Return ONLY a JSON array of exactly 5 concise subject-line strings. No prose, no code fences.`,
        `${ctx}\n\nEmail body (optional context):\n${(body || "").slice(0, 1500)}`
      );
      let subjects: string[] = [];
      try { subjects = JSON.parse(txt.replace(/```json|```/g, "").trim()); }
      catch { subjects = txt.split("\n").map((s) => s.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean).slice(0, 5); }
      return NextResponse.json({ subjects });
    }
    if (action === "improve") {
      const txt = await generateText(
        `You improve B2B marketing emails for ${BRAND}. Keep any {{name}}, {{company}}, {{email}} personalization variables intact. Return ONLY the improved email body, no commentary or fences.`,
        `Improve this email${company ? ` targeted at ${company}` : ""}${industry ? ` in the ${industry} industry` : ""}:\n\n${body || ""}`
      );
      return NextResponse.json({ body: txt.replace(/```/g, "").trim() });
    }
    if (action === "explain") {
      const txt = await generateText(
        `You are an email deliverability expert. Be concise and practical.`,
        topic || "Explain the most common hard-bounce and send-failure causes for B2B campaigns, and give 3 concrete corrective actions."
      );
      return NextResponse.json({ text: txt.trim() });
    }
    // default: generate full email
    const txt = await generateText(
      `You write professional, concise B2B outreach emails for ${BRAND}. Use {{name}} and {{company}} personalization variables. Return ONLY valid JSON {"subject":"...","body":"..."} — subject crisp, body 120-180 words with one clear CTA. No markdown fences.`,
      ctx || "Write a professional outreach email introducing our enterprise IT training & CloudLabs solutions."
    );
    let out: { subject?: string; body?: string } = {};
    try { out = JSON.parse(txt.replace(/```json|```/g, "").trim()); }
    catch { out = { body: txt.replace(/```/g, "").trim() }; }
    return NextResponse.json({ subject: out.subject, body: out.body });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

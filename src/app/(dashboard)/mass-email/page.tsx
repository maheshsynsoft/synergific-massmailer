"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Send,
  Search,
  Users,
  FileText,
  Mail,
  Repeat,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
} from "lucide-react";

interface Contact { id: string; name: string; email: string; company: string | null; status: string; country?: string | null; city?: string | null; industry?: string | null; category?: string | null; }
interface Template { id: string; name: string; type: string; subject: string | null; body: string; category: string | null; isActive: boolean; }
type Metrics = Record<string, number>;
interface Presend { total: number; sendable: number; byCountry: Record<string, number>; invalid: string[]; suppressed: { email: string; reason: string }[]; }

export default function MassEmailPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ total: number; sent: number; failed: number } | null>(null);
  const [seedingTemplates, setSeedingTemplates] = useState(false);
  const [autoFollowUp, setAutoFollowUp] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [presend, setPresend] = useState<Presend | null>(null);
  const [aiTopic, setAiTopic] = useState("");
  const [aiLoading, setAiLoading] = useState("");
  const [aiSubjects, setAiSubjects] = useState<string[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [batchSize, setBatchSize] = useState(500);
  const [startAt, setStartAt] = useState("");
  const [intervalVal, setIntervalVal] = useState(4);
  const [intervalUnit, setIntervalUnit] = useState("hours");
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    fetchContacts();
    fetchTemplates();
    fetchMetrics();
  }, []);

  async function safeJson<T>(url: string, fallback: T): Promise<T> {
    try {
      const res = await fetch(url);
      if (!res.ok) return fallback;
      const text = await res.text();
      if (!text) return fallback;
      return JSON.parse(text) as T;
    } catch {
      return fallback;
    }
  }

  async function fetchContacts() {
    setContacts(await safeJson<typeof contacts>("/api/contacts", []));
  }

  async function fetchTemplates() {
    setTemplates(await safeJson<typeof templates>("/api/templates", []));
  }

  async function fetchMetrics() {
    setMetrics(await safeJson<Metrics | null>("/api/email/metrics", null));
  }

  async function loadSynergificTemplates() {
    setSeedingTemplates(true);
    const res = await fetch("/api/seed-templates", { method: "POST" });
    const data = await res.json();
    setSeedingTemplates(false);
    if (data.success) {
      alert(`Loaded ${data.count} Synergific templates`);
      fetchTemplates();
    }
  }

  function selectTemplate(t: Template) {
    setActiveTemplate(t);
    setSubject(t.subject || "");
    setBody(t.body);
  }

  function toggleContact(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function toggleAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((c) => c.id)));
  }

  async function handleSend() {
    if (!subject || !body || selectedIds.size === 0) {
      alert("Please select contacts and provide subject + body");
      return;
    }
    const fallback: Presend = { total: selectedIds.size, sendable: selectedIds.size, byCountry: {}, invalid: [], suppressed: [] };
    try {
      const res = await fetch("/api/email/presend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: Array.from(selectedIds) }),
      });
      setPresend(res.ok ? await res.json() : fallback);
    } catch {
      setPresend(fallback);
    }
  }

  async function doSend() {
    setPresend(null);
    setSending(true);
    setResult(null);
    const res = await fetch("/api/email/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactIds: Array.from(selectedIds),
        subject,
        body,
        templateId: activeTemplate?.id,
        autoFollowUp,
      }),
    });
    const data = await res.json();
    setResult(data);
    setSending(false);
    fetchMetrics();
  }

  async function aiAssist(action: string) {
    setAiLoading(action);
    setAiSubjects([]);
    try {
      const res = await fetch("/api/ai/email-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action, topic: aiTopic, subject, body,
          company: companyFilter !== "all" ? companyFilter : undefined,
          industry: industryFilter !== "all" ? industryFilter : undefined,
        }),
      });
      const d = await res.json();
      if (d.subject) setSubject(d.subject);
      if (d.body) setBody(d.body);
      if (d.subjects) setAiSubjects(d.subjects);
    } catch { alert("AI request failed"); }
    setAiLoading("");
  }

  const filtered = contacts.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (countryFilter !== "all" && (c.country || "") !== countryFilter) return false;
    if (companyFilter !== "all" && (c.company || "") !== companyFilter) return false;
    if (industryFilter !== "all" && (c.industry || "") !== industryFilter) return false;
    const isIndia = (c.country || "").trim().toLowerCase() === "india";
    if (regionFilter === "india" && !isIndia) return false;
    if (regionFilter === "international" && (isIndia || !(c.country || "").trim())) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || (c.company && c.company.toLowerCase().includes(s)) || (c.country && c.country.toLowerCase().includes(s)) || (c.city && c.city.toLowerCase().includes(s));
    }
    return true;
  });

  const emailTemplates = templates.filter((t) => t.type === "email" || t.type === "both");
  const categories = [...new Set(emailTemplates.map((t) => t.category).filter(Boolean))];
  const countryOptions = [...new Set(contacts.map((c) => c.country).filter(Boolean))].sort() as string[];
  const companyOptions = [...new Set(contacts.map((c) => c.company).filter(Boolean))].sort() as string[];
  const industryOptions = [...new Set(contacts.map((c) => c.industry).filter(Boolean))].sort() as string[];
  const canSend = selectedIds.size > 0 && subject && body && !sending;
  const intervalMs = intervalVal * (intervalUnit === "hours" ? 3600000 : 86400000);
  const selectedArr = Array.from(selectedIds);
  const batchCount = Math.max(1, Math.ceil(selectedArr.length / Math.max(1, batchSize)));
  const batches = Array.from({ length: batchCount }, (_, i) => ({
    idx: i + 1,
    ids: selectedArr.slice(i * batchSize, (i + 1) * batchSize),
    at: startAt ? new Date(new Date(startAt).getTime() + i * intervalMs) : null,
  }));
  async function scheduleBatches() {
    if (!startAt) { alert("Pick a start date & time"); return; }
    if (new Date(startAt).getTime() <= Date.now()) { alert("Start time must be in the future"); return; }
    setScheduling(true);
    let ok = 0;
    for (const b of batches) {
      if (b.ids.length === 0) continue;
      const at = new Date(new Date(startAt).getTime() + (b.idx - 1) * intervalMs);
      const res = await fetch("/api/scheduled-emails", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${subject} — Batch ${b.idx}/${batchCount}`, subject, body, contactIds: b.ids, scheduledAt: at.toISOString(), templateId: activeTemplate?.id, autoFollowUp }),
      });
      if (res.ok) ok++;
    }
    setScheduling(false);
    setShowSchedule(false);
    alert(`Scheduled ${ok} batch(es) — ${selectedArr.length} emails total. Track them under Scheduled.`);
  }

  return (
    <>
      <Header
        title="Mass Email"
        subtitle="Personalized bulk campaigns"
        actions={
          <>
            <label className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent text-foreground transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={autoFollowUp}
                onChange={(e) => setAutoFollowUp(e.target.checked)}
                className="w-3.5 h-3.5 accent-primary"
              />
              <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
              Auto follow-up
            </label>
            <button onClick={() => setShowSchedule(true)} disabled={!canSend} className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent text-foreground transition-colors disabled:opacity-50">
              <Repeat className="w-3.5 h-3.5 text-muted-foreground" /> Schedule
            </button>
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold transition-all",
                canSend
                  ? "bg-primary text-primary-foreground shadow-glow hover:shadow-glow-strong"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? `Sending to ${selectedIds.size}...` : `Send to ${selectedIds.size}`}
            </button>
          </>
        }
      />

      {/* Delivery metrics strip */}
      {metrics && (
        <div className="mx-8 mt-4 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {[
            { k: "totalContacts", label: "Contacts", color: "text-foreground" },
            { k: "sent", label: "Sent", color: "text-blue-400" },
            { k: "delivered", label: "Delivered", color: "text-emerald-400", rate: "deliveredRate" },
            { k: "opened", label: "Opened", color: "text-violet-400", rate: "openRate" },
            { k: "clicked", label: "Clicked", color: "text-cyan-400", rate: "clickRate" },
            { k: "pending", label: "Pending", color: "text-amber-400" },
            { k: "bounced", label: "Bounced", color: "text-rose-400", rate: "bounceRate" },
            { k: "failed", label: "Failed", color: "text-rose-400" },
            { k: "unsubscribed", label: "Unsub", color: "text-slate-400" },
          ].map((m) => (
            <div key={m.k} className="rounded-lg border border-border bg-card px-2.5 py-2" title={m.rate ? `${metrics[m.rate] ?? 0}%` : undefined}>
              <p className={cn("text-[17px] font-bold nums-tabular leading-none", m.color)}>{metrics[m.k] ?? 0}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide mt-1">
                {m.label}{m.rate ? <span className="ml-1 normal-case text-muted-foreground/70">{metrics[m.rate] ?? 0}%</span> : null}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Result toast */}
      {result && (
        <div
          className={cn(
            "mx-8 mt-4 border rounded-xl px-4 py-3 flex items-start gap-3 shadow-xs animate-fade-in",
            result.failed === 0
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          )}
        >
          {result.failed === 0 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-[13px] flex-1">
            <strong className="font-semibold">Campaign complete</strong>
            <span className="ml-2">
              {result.sent} sent · {result.failed} failed · {result.total} total
            </span>
          </div>
          <button
            onClick={() => setResult(null)}
            className="text-current/60 hover:text-current"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-4 animate-fade-in max-w-[1500px]">
        {/* ── LEFT: Templates ─────────── */}
        <div className="lg:col-span-3 bg-card rounded-xl border border-border/60 shadow-xs h-[calc(100vh-160px)] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-500/10 ring-1 ring-blue-500/20 text-blue-400 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold">Templates</p>
              <p className="text-[10px] text-muted-foreground">{emailTemplates.length} available</p>
            </div>
          </div>

          {emailTemplates.length === 0 && (
            <div className="p-3 border-b border-border/60">
              <button
                onClick={loadSynergificTemplates}
                disabled={seedingTemplates}
                className="w-full h-8 px-3 rounded-md flex items-center justify-center gap-1.5 text-[12px] font-semibold bg-primary text-primary-foreground shadow-glow hover:shadow-glow-strong transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {seedingTemplates ? "Loading..." : "Load templates"}
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
            <div className="p-2 space-y-3">
              {categories.map((cat) => (
                <div key={cat}>
                  <p className="text-[10px] font-bold text-muted-foreground/70 tracking-wider uppercase mb-1.5 px-2">
                    {cat}
                  </p>
                  <div className="space-y-px">
                    {emailTemplates.filter((t) => t.category === cat).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => selectTemplate(t)}
                        className={cn(
                          "group w-full text-left px-2 py-2 rounded-md text-[12px] transition-all relative",
                          activeTemplate?.id === t.id
                            ? "bg-primary/10 text-foreground"
                            : "hover:bg-muted/60 text-muted-foreground"
                        )}
                      >
                        {activeTemplate?.id === t.id && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                        )}
                        <p className={cn(
                          "font-semibold truncate",
                          activeTemplate?.id === t.id ? "text-foreground" : ""
                        )}>
                          {t.name}
                        </p>
                        {t.subject && (
                          <p className="truncate mt-0.5 text-[11px] text-muted-foreground/80">
                            {t.subject}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {emailTemplates.filter((t) => !t.category).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground/70 tracking-wider uppercase mb-1.5 px-2">Other</p>
                  <div className="space-y-px">
                    {emailTemplates.filter((t) => !t.category).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => selectTemplate(t)}
                        className={cn(
                          "w-full text-left px-2 py-2 rounded-md text-[12px] transition-all",
                          activeTemplate?.id === t.id ? "bg-primary/10 text-foreground" : "hover:bg-muted/60 text-muted-foreground"
                        )}
                      >
                        <p className="font-semibold truncate">{t.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── CENTER: Compose ───────── */}
        <div className="lg:col-span-5 bg-card rounded-xl border border-border/60 shadow-xs h-[calc(100vh-160px)] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-violet-500/10 ring-1 ring-violet-500/20 text-violet-400 flex items-center justify-center">
              <Mail className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[13px] font-semibold">Compose</p>
              <p className="text-[10px] text-muted-foreground">HTML supported · variables enabled</p>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-2.5 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-300"><Sparkles className="w-3.5 h-3.5" /> AI Assistant</div>
              <input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="What's this email about? e.g. enterprise AWS training for Accenture" className="w-full h-8 px-2.5 text-[12px] rounded-md border border-border bg-background focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground" />
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => aiAssist("generate")} disabled={!!aiLoading} className="h-7 px-2.5 rounded-md text-[11px] font-semibold bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 disabled:opacity-50">{aiLoading === "generate" ? "Writing…" : "Generate email"}</button>
                <button onClick={() => aiAssist("subjects")} disabled={!!aiLoading} className="h-7 px-2.5 rounded-md text-[11px] font-semibold border border-border hover:bg-accent disabled:opacity-50">{aiLoading === "subjects" ? "…" : "Suggest subjects"}</button>
                <button onClick={() => aiAssist("improve")} disabled={!!aiLoading || !body} className="h-7 px-2.5 rounded-md text-[11px] font-semibold border border-border hover:bg-accent disabled:opacity-50">{aiLoading === "improve" ? "…" : "Improve draft"}</button>
              </div>
              {aiSubjects.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase">Pick a subject:</p>
                  {aiSubjects.map((sj, i) => (
                    <button key={i} onClick={() => { setSubject(sj); setAiSubjects([]); }} className="block w-full text-left text-[11px] px-2 py-1 rounded bg-card border border-border hover:border-primary transition-colors">{sj}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                className="h-9 bg-muted/30 focus:bg-card border-border focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">Body</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={20}
                className="font-mono text-[11px] bg-muted/30 focus:bg-card border-border focus:border-primary resize-none"
                placeholder="Email body... use {{name}}, {{email}}, {{company}} for personalization"
              />
            </div>
            <div className="text-[11px] text-muted-foreground bg-violet-500/10 border border-violet-500/30 rounded-md px-3 py-2 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
              <span>
                Variables:{" "}
                <code className="bg-card px-1.5 py-0.5 rounded text-foreground font-mono text-[10px] font-semibold border">{"{{name}}"}</code>{" "}
                <code className="bg-card px-1.5 py-0.5 rounded text-foreground font-mono text-[10px] font-semibold border">{"{{email}}"}</code>{" "}
                <code className="bg-card px-1.5 py-0.5 rounded text-foreground font-mono text-[10px] font-semibold border">{"{{company}}"}</code>
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Recipients ─────── */}
        <div className="lg:col-span-4 bg-card rounded-xl border border-border/60 shadow-xs h-[calc(100vh-160px)] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold">Recipients</p>
              <p className="text-[10px] text-muted-foreground nums-tabular">
                <strong className="text-foreground">{selectedIds.size}</strong> of {filtered.length} selected
              </p>
            </div>
            <button
              onClick={toggleAll}
              className="h-7 px-2 rounded-md text-[11px] font-semibold border border-border hover:bg-accent transition-colors"
            >
              {selectedIds.size === filtered.length && filtered.length > 0 ? "Clear" : "All"}
            </button>
          </div>

          <div className="px-3 py-3 border-b border-border/60 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-[12px] rounded-md border border-border bg-background focus:bg-card focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-[12px] bg-muted/30 border-border focus:border-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All contacts</SelectItem>
                <SelectItem value="lead">Leads only</SelectItem>
                <SelectItem value="customer">Customers only</SelectItem>
                <SelectItem value="training">Training only</SelectItem>
                <SelectItem value="churned">Churned only</SelectItem>
                <SelectItem value="client">Clients only</SelectItem>
                <SelectItem value="college_university">College &amp; University only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="h-8 text-[12px] bg-muted/30 border-border focus:border-primary"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">India + International</SelectItem>
                <SelectItem value="india">Within India only</SelectItem>
                <SelectItem value="international">International only</SelectItem>
              </SelectContent>
            </Select>
            {countryOptions.length > 0 && (
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="h-8 text-[12px] bg-muted/30 border-border focus:border-primary"><SelectValue placeholder="Country" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All countries</SelectItem>
                  {countryOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {companyOptions.length > 0 && (
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="h-8 text-[12px] bg-muted/30 border-border focus:border-primary"><SelectValue placeholder="Company" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All companies</SelectItem>
                  {companyOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {industryOptions.length > 0 && (
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="h-8 text-[12px] bg-muted/30 border-border focus:border-primary"><SelectValue placeholder="Industry" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All industries</SelectItem>
                  {industryOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
            <div className="p-1.5 space-y-px">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-[12px] text-muted-foreground">
                  No contacts match your filters
                </div>
              ) : (
                filtered.map((c) => {
                  const isSelected = selectedIds.has(c.id);
                  const statusColors: Record<string, string> = {
                    customer: "bg-emerald-500/10 text-emerald-300",
                    lead: "bg-blue-500/10 text-blue-300",
                    training: "bg-amber-500/10 text-amber-300",
                    churned: "bg-rose-500/10 text-rose-300",
                    client: "bg-violet-500/10 text-violet-300",
                    college_university: "bg-cyan-500/10 text-cyan-300",
                  };
                  const statusLabels: Record<string, string> = {
                    college_university: "College & University",
                  };
                  return (
                    <label
                      key={c.id}
                      className={cn(
                        "flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-all",
                        isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleContact(c.id)}
                        className="mt-1 w-3.5 h-3.5 accent-primary"
                      />
                      <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>
                        {c.company && <p className="text-[10px] text-muted-foreground truncate">{c.company}</p>}
                      </div>
                      <span
                        className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0",
                          statusColors[c.status] || "bg-slate-500/10 text-slate-300"
                        )}
                      >
                        {statusLabels[c.status] || c.status}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Pre-send confirmation */}
      {presend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPresend(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4 text-primary" />
              <h3 className="text-[15px] font-bold">Confirm campaign</h3>
            </div>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between"><span className="text-muted-foreground">Recipients selected</span><strong>{presend.total}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Will be sent</span><strong className="text-emerald-400">{presend.sendable}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Invalid emails (skipped)</span><strong className={presend.invalid?.length ? "text-rose-400" : ""}>{presend.invalid?.length || 0}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Suppressed / unsub (skipped)</span><strong className={presend.suppressed?.length ? "text-amber-400" : ""}>{presend.suppressed?.length || 0}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground flex-shrink-0">Subject</span><strong className="truncate text-right">{subject}</strong></div>
            </div>
            {presend.byCountry && Object.keys(presend.byCountry).length > 0 && (
              <div className="mt-3 border-t border-border pt-2">
                <p className="text-[10px] uppercase text-muted-foreground mb-1.5">By country</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(presend.byCountry).map(([c, n]) => (
                    <span key={c} className="text-[10px] px-2 py-0.5 rounded bg-muted">{c}: <strong>{n}</strong></span>
                  ))}
                </div>
              </div>
            )}
            {((presend.invalid?.length || 0) + (presend.suppressed?.length || 0)) > 0 && (
              <p className="mt-3 text-[10px] text-amber-400">&#9888; {(presend.invalid?.length || 0) + (presend.suppressed?.length || 0)} contacts auto-skipped (invalid or suppressed/unsubscribed).</p>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setPresend(null)} className="flex-1 h-9 rounded-md border border-border text-[12px] font-semibold hover:bg-accent">Cancel</button>
              <button onClick={doSend} disabled={presend.sendable === 0} className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-[12px] font-semibold shadow-glow disabled:opacity-50">Confirm &amp; Send {presend.sendable}</button>
            </div>
          </div>
        </div>
      )}
      {/* Batch schedule */}
      {showSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSchedule(false)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-bold mb-3">Schedule in batches</h3>
            <div className="space-y-3 text-[12px]">
              <div>
                <label className="text-[11px] text-muted-foreground">Start date &amp; time</label>
                <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="w-full h-9 px-2.5 mt-1 rounded-md border border-border bg-background text-[12px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground">Emails per batch</label>
                  <input type="number" min={1} value={batchSize} onChange={(e) => setBatchSize(Math.max(1, +e.target.value))} className="w-full h-9 px-2.5 mt-1 rounded-md border border-border bg-background text-[12px]" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Gap between batches</label>
                  <div className="flex gap-1 mt-1">
                    <input type="number" min={0} value={intervalVal} onChange={(e) => setIntervalVal(Math.max(0, +e.target.value))} className="w-16 h-9 px-2.5 rounded-md border border-border bg-background text-[12px]" />
                    <select value={intervalUnit} onChange={(e) => setIntervalUnit(e.target.value)} className="flex-1 h-9 px-2 rounded-md border border-border bg-background text-[12px]">
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2.5 max-h-40 overflow-auto">
              <p className="text-[10px] uppercase text-muted-foreground mb-1.5">{batchCount} batch(es) &middot; {selectedArr.length} emails</p>
              {batches.map((b) => (
                <div key={b.idx} className="flex justify-between text-[11px] py-0.5">
                  <span>Batch {b.idx} &middot; {b.ids.length} emails</span>
                  <strong className="text-foreground">{b.at ? b.at.toLocaleString() : "—"}</strong>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowSchedule(false)} className="flex-1 h-9 rounded-md border border-border text-[12px] font-semibold hover:bg-accent">Cancel</button>
              <button onClick={scheduleBatches} disabled={scheduling || !startAt} className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-[12px] font-semibold shadow-glow disabled:opacity-50">{scheduling ? "Scheduling…" : `Schedule ${batchCount} batch(es)`}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

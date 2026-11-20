"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  TableCard,
  PersonCell,
  LinkCell,
  IdCell,
  StatusPill,
  RowAction,
  EmptyRow,
  firstColumn,
  rowDelay,
  type StatusTone,
} from "@/components/data-table/records";
import { Pagination } from "@/components/data-table/pagination";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Upload,
  FileSpreadsheet,
  Users as UsersIcon,
  CheckCircle2,
  AlertCircle,
  Download,
  UserCheck,
  Building2,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  country?: string | null;
  city?: string | null;
  designation?: string | null;
  department?: string | null;
  industry?: string | null;
  category?: string | null;
  status: string;
  leadScore: number | null;
  source: string | null;
  createdAt: string;
  lastContactedAt: string | null;
  ownerId: string | null;
  owner: { id: string; name: string; email: string } | null;
}

// All values for the Status dropdown — the original ones plus the new categories.
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "customer", label: "Customer" },
  { value: "training", label: "Training" },
  { value: "churned", label: "Churned" },
  { value: "client", label: "Client" },
  { value: "college_university", label: "College & University" },
];
const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label])
);

const contactTone: Record<string, StatusTone> = {
  customer: "success",
  lead: "info",
  training: "warning",
  churned: "danger",
  client: "primary",
  college_university: "neutral",
};

const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
function isStale(c: Contact): boolean {
  if (c.status !== "lead") return false; // only flag leads
  if (!c.lastContactedAt) return true;
  return Date.now() - new Date(c.lastContactedAt).getTime() > STALE_THRESHOLD_MS;
}

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  invalid: number;
  errors: { row: number; reason: string }[];
  distribution?: { userId: string; name: string; count: number }[];
}

export default function ContactsPage() {
  const { data: session } = useSession();
  const currentUser = session?.user as { id?: string; role?: string } | undefined;
  const isAdminUser = currentUser?.role === "admin";

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState(""); // debounced search sent to the server
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all"); // "all" | "mine" | "unassigned" | <userId>
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Server-side pagination state
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number> }>({
    total: 0,
    byStatus: {},
  });

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function toggleSelectAll(visible: Contact[]) {
    if (selectedIds.size === visible.length && visible.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map((c) => c.id)));
    }
  }

  async function bulkAction(action: string, status?: string, ownerId?: string | null) {
    if (selectedIds.size === 0) return;
    if (action === "delete" && !confirm(`Delete ${selectedIds.size} contacts?`)) return;

    await fetch("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids: Array.from(selectedIds), status, ownerId }),
    });
    setSelectedIds(new Set());
    refresh();
  }

  function exportCsv() {
    window.location.href = "/api/contacts/export";
  }

  const PAGE_SIZE = 50;

  // Load the team list once (admins only) for the owner filter / bulk-assign.
  useEffect(() => {
    if (isAdminUser) {
      fetch("/api/enterprise/team")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setTeam(Array.isArray(data) ? data : []))
        .catch(() => setTeam([]));
    }
  }, [isAdminUser]);

  // Debounce the search box → only hit the server 350ms after typing stops.
  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch one page of contacts with server-side search + filters.
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        paginate: "1",
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (appliedSearch) params.set("search", appliedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (ownerFilter !== "all") params.set("owner", ownerFilter);

      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (!res.ok) {
        setContacts([]);
        return;
      }
      const data = await res.json();
      setContacts(Array.isArray(data.contacts) ? data.contacts : []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch, statusFilter, ownerFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts/stats");
      if (res.ok) setStats(await res.json());
    } catch {}
  }, []);

  // Refetch the current page whenever paging/search/filters change.
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Load tile counts once, and refresh them after mutations via refresh().
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reload current page + tile counts (after create/import/bulk actions).
  const refresh = useCallback(() => {
    fetchContacts();
    fetchStats();
  }, [fetchContacts, fetchStats]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone") || null,
          whatsappPhone: formData.get("whatsappPhone") || null,
          company: formData.get("company") || null,
          country: formData.get("country") || null,
          city: formData.get("city") || null,
          designation: formData.get("designation") || null,
          department: formData.get("department") || null,
          industry: formData.get("industry") || null,
          category: formData.get("category") || null,
          status: formData.get("status") || "lead",
          source: formData.get("source") || null,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = `Failed to create contact (${res.status})`;
        try {
          const parsed = errText ? JSON.parse(errText) : null;
          if (parsed?.error) errMsg = parsed.error;
        } catch {}
        alert(errMsg);
        return;
      }

      setCreateOpen(false);
      refresh();
    } catch (err) {
      alert(`Network error: ${String(err)}`);
    }
  }

  async function handleImportFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please upload a CSV file");
      return;
    }

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/contacts/import", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setImportResult(data);
    setImporting(false);
    if (data.imported > 0) refresh();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImportFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImportFile(file);
  }

  function downloadSample() {
    const sample =
      "name,email,phone,company,designation,department,industry,country,city,category,status,source\n" +
      "John Doe,john@example.com,+91 9876543210,Acme Inc,lead,Website\n" +
      "Jane Smith,jane@example.com,+91 9876543211,TechCorp,customer,Referral\n";
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // The server already returns exactly the rows to render (filtered + paginated).
  const visible = contacts;

  // Jump to a status tile / change a filter → always reset to page 1.
  function applyStatusFilter(next: string) {
    setStatusFilter(next);
    setPage(1);
  }
  function applyOwnerFilter(next: string) {
    setOwnerFilter(next);
    setPage(1);
  }

  // Tile counts come from the lightweight /api/contacts/stats endpoint.
  const statTiles = {
    total: stats.total,
    leads: stats.byStatus.lead ?? 0,
    customers: stats.byStatus.customer ?? 0,
    training: stats.byStatus.training ?? 0,
    churned: stats.byStatus.churned ?? 0,
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = (page - 1) * PAGE_SIZE + visible.length;

  return (
    <>
      <Header
        title="Contacts"
        subtitle={`${statTiles.total} total · ${statTiles.leads} leads · ${statTiles.customers} customers · ${statTiles.training} training`}
        actions={
          <>
            <button
              onClick={exportCsv}
              className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent text-foreground transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger
                render={
                  <button className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent text-foreground transition-colors" />
                }
              >
                <Upload className="w-3.5 h-3.5" /> Import CSV
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Import contacts from CSV</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-xl bg-primary/10 ring-1 ring-primary/20 mx-auto mb-3 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-[14px] font-semibold">
                      {importing ? "Importing..." : "Drop your CSV here"}
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-1">
                      or <span className="text-primary font-semibold">click to browse</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-3">
                      Required column: <code className="bg-muted px-1 rounded">email</code>
                      {" · "}Optional: name, phone, company, status, source, notes
                    </p>
                  </div>

                  {/* Sample download */}
                  <button
                    onClick={downloadSample}
                    className="w-full text-[12px] text-primary hover:underline font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download sample CSV template
                  </button>

                  {/* Result */}
                  {importResult && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-emerald-300 nums-tabular">
                            {importResult.imported}
                          </p>
                          <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mt-0.5">
                            Imported
                          </p>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-amber-300 nums-tabular">
                            {importResult.skipped}
                          </p>
                          <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mt-0.5">
                            Duplicates
                          </p>
                        </div>
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-rose-300 nums-tabular">
                            {importResult.invalid}
                          </p>
                          <p className="text-[10px] font-bold text-rose-300 uppercase tracking-wider mt-0.5">
                            Invalid
                          </p>
                        </div>
                      </div>

                      {importResult.imported > 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg px-3 py-2 flex items-start gap-2 text-[12px]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>{importResult.imported}</strong> new contacts added.{" "}
                            {importResult.skipped > 0 && (
                              <>
                                <strong>{importResult.skipped}</strong> duplicates skipped.
                              </>
                            )}
                          </span>
                        </div>
                      )}

                      {importResult.distribution && importResult.distribution.length > 0 && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2.5 text-[11px]">
                          <div className="flex items-center gap-1.5 font-bold text-blue-300 uppercase tracking-wider mb-2">
                            <UserCheck className="w-3.5 h-3.5" />
                            Distributed across {importResult.distribution.length}{" "}
                            user{importResult.distribution.length !== 1 ? "s" : ""}
                          </div>
                          <div className="space-y-1">
                            {importResult.distribution.map((d) => (
                              <div key={d.userId} className="flex items-center justify-between">
                                <span className="text-foreground">{d.name}</span>
                                <span className="font-bold nums-tabular text-blue-300">
                                  {d.count}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {importResult.errors.length > 0 && (
                        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg px-3 py-2 text-[11px]">
                          <div className="flex items-center gap-2 font-semibold mb-1.5">
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                            First {importResult.errors.length} errors:
                          </div>
                          <ul className="space-y-0.5 ml-6 list-disc">
                            {importResult.errors.map((err, i) => (
                              <li key={i}>
                                Row {err.row}: {err.reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => {
                          setImportResult(null);
                          setImportOpen(false);
                        }}
                        className="w-full"
                      >
                        Close
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger
                render={
                  <button className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold bg-foreground text-background hover:opacity-90 transition-opacity" />
                }
              >
                <Plus className="w-3.5 h-3.5" /> Add Contact
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add new contact</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" name="name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" name="email" type="email" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" name="phone" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsappPhone">WhatsApp</Label>
                      <Input id="whatsappPhone" name="whatsappPhone" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" name="company" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="designation">Designation</Label>
                      <Input id="designation" name="designation" placeholder="e.g. L&D Manager" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input id="department" name="department" placeholder="e.g. HR / L&D" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Input id="industry" name="industry" placeholder="e.g. IT Services" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" name="country" placeholder="e.g. India" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" name="city" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Contact Category</Label>
                      <Input id="category" name="category" placeholder="e.g. Enterprise / SMB" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue="lead">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="source">Source</Label>
                      <Input id="source" name="source" placeholder="e.g. Website, Referral, LinkedIn" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Create contact
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4 max-w-[1440px]">
        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in flex-wrap">
            <p className="text-[13px] font-bold text-foreground">
              {selectedIds.size} contact{selectedIds.size !== 1 ? "s" : ""} selected
            </p>
            <div className="flex-1" />
            <button
              onClick={() => bulkAction("update_status", "lead")}
              className="h-7 px-2.5 rounded-md text-[11px] font-semibold border border-border bg-card hover:bg-accent"
            >
              Mark as Lead
            </button>
            <button
              onClick={() => bulkAction("update_status", "customer")}
              className="h-7 px-2.5 rounded-md text-[11px] font-semibold border border-border bg-card hover:bg-accent"
            >
              Mark as Customer
            </button>
            <button
              onClick={() => bulkAction("update_status", "training")}
              className="h-7 px-2.5 rounded-md text-[11px] font-semibold border border-border bg-card hover:bg-accent"
            >
              Mark as Training
            </button>
            {isAdminUser && team.length > 0 && (
              <Select
                onValueChange={(value: string | null) => {
                  if (value === "__unassign__") bulkAction("assign", undefined, null);
                  else if (value) bulkAction("assign", undefined, value);
                }}
              >
                <SelectTrigger className="h-7 w-[150px] text-[11px] bg-card border-border">
                  <UserCheck className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassign__">Unassigned</SelectItem>
                  {team.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <button
              onClick={() => bulkAction("delete")}
              className="h-7 px-2.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="h-7 px-2.5 rounded-md text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── Contact records table ─────────── */}
        <TableCard
          id="contact-records"
          title="Contact records"
          toolbar={
            <>
              <label className="relative flex items-center">
                <span className="sr-only">Search contacts</span>
                <Search className="absolute left-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search name, email, company"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-[240px] max-w-full h-9 pl-8 pr-3 text-[13px] rounded-lg border border-border bg-card focus:border-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
                />
              </label>
              {isAdminUser && (
                <Select value={ownerFilter} onValueChange={(v: string | null) => v && applyOwnerFilter(v)}>
                  <SelectTrigger className="h-9 w-[160px] text-[13px] bg-card border-border rounded-lg">
                    <UserCheck className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All owners</SelectItem>
                    <SelectItem value="mine">Owned by me</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {team.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          }
          actions={
            <div role="group" aria-label="Filter by status" className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-muted">
              {[{ value: "all", label: "All" }, ...STATUS_OPTIONS].map((s) => {
                const n = s.value === "all" ? stats.total : stats.byStatus[s.value] ?? 0;
                if (s.value !== "all" && n === 0 && statusFilter !== s.value) return null;
                return (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={statusFilter === s.value}
                    onClick={() => applyStatusFilter(s.value)}
                    className={cn(
                      "h-7 px-2.5 rounded-lg text-[12.5px] font-medium transition-colors",
                      statusFilter === s.value ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s.label} <span className="nums-tabular text-muted-foreground">{n.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          }
          footer={
            <>
              <span>
                {loading
                  ? "Loading…"
                  : total > 0
                    ? `Showing ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${total.toLocaleString()} contacts`
                    : "0 contacts"}
              </span>
              {totalPages > 1 && <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />}
            </>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={firstColumn}>
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      aria-label="Select all contacts on this page"
                      checked={selectedIds.size === visible.length && visible.length > 0}
                      onChange={() => toggleSelectAll(visible)}
                      className="w-4 h-4 accent-primary"
                    />
                    Name
                  </span>
                </TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 && (
                <EmptyRow colSpan={8}>
                  <UsersIcon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <span className="block font-semibold">{loading ? "Loading…" : "No contacts found"}</span>
                  {!loading && (
                    <span className="block mt-1">
                      {appliedSearch || statusFilter !== "all" || ownerFilter !== "all"
                        ? "Try adjusting your search or filters"
                        : "Add a contact or import a CSV to get started"}
                    </span>
                  )}
                </EmptyRow>
              )}
              {visible.map((contact, i) => {
                const isSelected = selectedIds.has(contact.id);
                return (
                  <TableRow
                    key={contact.id}
                    data-state={isSelected ? "selected" : undefined}
                    className="animate-row-in"
                    style={rowDelay(i)}
                  >
                    <TableCell className={cn(firstColumn, "max-w-[300px]")}>
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          aria-label={`Select ${contact.name}`}
                          checked={isSelected}
                          onChange={() => toggleSelect(contact.id)}
                          className="w-4 h-4 accent-primary flex-shrink-0"
                        />
                        <div className="relative min-w-0">
                          <PersonCell name={contact.name} email={contact.email} href={`/contacts/${contact.id}`} />
                          {isStale(contact) && (
                            <span
                              className="absolute top-0 left-6 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-card"
                              title="Stale lead — not contacted in 7+ days"
                            />
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      {contact.company ? (
                        <LinkCell icon={<Building2 className="w-3.5 h-3.5" strokeWidth={1.8} />}>{contact.company}</LinkCell>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground nums-tabular">{contact.phone || "N/A"}</TableCell>
                    <TableCell>
                      {contact.owner ? (
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <span className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold">
                            {contact.owner.name[0]?.toUpperCase()}
                          </span>
                          {contact.owner.id === currentUser?.id ? "You" : contact.owner.name}
                        </span>
                      ) : (
                        <StatusPill tone="neutral" icon={null}>Unassigned</StatusPill>
                      )}
                    </TableCell>
                    <TableCell>
                      <IdCell
                        id={contact.source ? `via ${contact.source}` : "Manual"}
                        date={new Date(contact.createdAt).toLocaleDateString("en-CA")}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={contactTone[contact.status] || "neutral"}>
                        {STATUS_LABELS[contact.status] || contact.status}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="text-right font-semibold nums-tabular">{contact.leadScore ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <RowAction href={`/contacts/${contact.id}`} label={`Open ${contact.name}`} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableCard>
      </div>
    </>
  );
}

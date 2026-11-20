"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";
import { Building2, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  TableCard,
  PersonCell,
  LinkCell,
  StatusPill,
  EmptyRow,
  firstColumn,
  rowDelay,
  toolbarButton,
} from "@/components/data-table/records";
import { Pagination, RowsPerPage, usePagination } from "@/components/data-table/pagination";

interface Row { email: string; company: string | null; subject: string | null; status: string; when: string; category: string; side: string; action: string; }
interface Data { total: number; byCategory: Record<string, number>; rows: Row[]; }

export default function DeliveryTrackingPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try { setData(await fetch("/api/email/failures").then((r) => r.json())); } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const rows = data?.rows ?? [];
  const { pageItems, page, setPage, pageCount, pageSize, setPageSize, total } = usePagination(rows, 10);

  return (
    <>
      <Header
        title="Delivery Tracking"
        subtitle="Failed, bounced & rejected emails, with reasons and fixes"
        actions={
          <button type="button" onClick={load} className={toolbarButton}>
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
          </button>
        }
      />
      <div className="p-3 sm:p-4 lg:p-6 space-y-3 max-w-[1440px]">
        <TableCard
          id="failure-records"
          title="Delivery failures"
          toolbar={
            data && Object.keys(data.byCategory).length > 0 ? (
              Object.entries(data.byCategory).map(([cat, n]) => (
                <StatusPill key={cat} tone="danger" icon={null}>
                  {n} {cat}
                </StatusPill>
              ))
            ) : undefined
          }
          footer={
            <>
              <RowsPerPage pageSize={pageSize} onPageSizeChange={setPageSize} total={data?.total ?? total} />
              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
            </>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={firstColumn}>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Recommended action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 && (
                <EmptyRow colSpan={5}>{loading ? "Loading…" : "No delivery failures found."}</EmptyRow>
              )}
              {pageItems.map((r, i) => (
                <TableRow key={`${r.email}-${i}`} className="animate-row-in" style={rowDelay(i)}>
                  <TableCell className={cn(firstColumn, "max-w-[280px]")}>
                    <PersonCell name={r.email} email={r.subject} />
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {r.company ? (
                      <LinkCell icon={<Building2 className="w-3.5 h-3.5" strokeWidth={1.8} />}>{r.company}</LinkCell>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell><StatusPill tone="danger">{r.category}</StatusPill></TableCell>
                  <TableCell className="text-muted-foreground capitalize">{r.side}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-normal min-w-[260px]">{r.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
        {data && (
          <p className="text-[12px] text-muted-foreground px-1">
            Bounced and complained addresses are suppressed automatically and skipped on future sends.
          </p>
        )}
      </div>
    </>
  );
}

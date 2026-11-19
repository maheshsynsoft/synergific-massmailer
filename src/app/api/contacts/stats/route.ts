import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";

// GET /api/contacts/stats — total + per-status counts for the contacts tiles.
// Respects the same owner scoping as the list (non-admins see owned/unassigned).
// Uses indexed COUNT/GROUP BY so it stays fast without loading any rows.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");
    const user = await getCurrentUser();
    const restrict = user && (!isAdmin(user) || scope === "mine");

    const whereSql = restrict ? `WHERE ownerId = ? OR ownerId IS NULL` : "";
    const params: unknown[] = restrict ? [user!.id] : [];

    let total = 0;
    const byStatus: Record<string, number> = {};
    try {
      const totalRow = await prisma.$queryRawUnsafe<Array<{ cnt: number | bigint }>>(
        `SELECT COUNT(*) as cnt FROM "Contact" ${whereSql}`,
        ...params
      );
      total = Number(totalRow[0]?.cnt ?? 0);

      const rows = await prisma.$queryRawUnsafe<Array<{ status: string; cnt: number | bigint }>>(
        `SELECT status, COUNT(*) as cnt FROM "Contact" ${whereSql} GROUP BY status`,
        ...params
      );
      for (const r of rows) byStatus[r.status] = Number(r.cnt);
    } catch (e) {
      console.error("[/api/contacts/stats]", e);
    }

    return NextResponse.json({ total, byStatus });
  } catch (e) {
    console.error("[/api/contacts/stats]", e);
    return NextResponse.json({ total: 0, byStatus: {} }, { status: 200 });
  }
}

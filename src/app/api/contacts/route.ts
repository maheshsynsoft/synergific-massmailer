import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { pickAndResolveOwner, resolveEffectiveOwner } from "@/lib/routing";
import { logAction } from "@/lib/audit";

// GET /api/contacts — admins see all; non-admins see only their owned contacts
//                    (plus unassigned ones, so the team can pick them up).
// ?scope=mine to force the "owned only" view even for admins.
//
// Uses raw SQL so a stale Prisma client (which may not know about
// Contact.ownerId or lastContactedAt) can't break the route.
interface ContactRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsappPhone: string | null;
  company: string | null;
  status: string;
  preferredChannel: string;
  leadScore: number | null;
  source: string | null;
  tags: string | null;
  notes: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string | null;
}

const LIST_COLUMNS = `id, name, email, phone, whatsappPhone, company, country, city, designation, department, industry, category, lastDeliveryStatus, status, preferredChannel,
                leadScore, source, tags, notes, lastContactedAt, createdAt, updatedAt, ownerId`;

/** Attach each contact's owner (id/name/email) via a single batched User lookup. */
async function attachOwners(contacts: ContactRow[]) {
  const ownerIds = Array.from(
    new Set(contacts.map((c) => c.ownerId).filter(Boolean) as string[])
  );
  let ownerById = new Map<string, { id: string; name: string; email: string }>();
  if (ownerIds.length > 0) {
    try {
      const placeholders = ownerIds.map(() => "?").join(",");
      const users = await prisma.$queryRawUnsafe<
        Array<{ id: string; name: string; email: string }>
      >(
        `SELECT id, name, email FROM "User" WHERE id IN (${placeholders})`,
        ...ownerIds
      );
      ownerById = new Map(users.map((u) => [u.id, u]));
    } catch {}
  }
  return contacts.map((c) => ({
    ...c,
    owner: c.ownerId ? ownerById.get(c.ownerId) ?? null : null,
  }));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");
    const user = await getCurrentUser();
    const restrict = user && (!isAdmin(user) || scope === "mine");

    // ── Pagination is opt-in via ?paginate=1 or ?page=… The Contacts list uses it.
    //    Without those params the route returns the full array (legacy behavior) so
    //    every other consumer (pickers, lookups, etc.) keeps working unchanged. ──
    const paginate = searchParams.get("paginate") === "1" || searchParams.has("page");

    if (!paginate) {
      const sql = restrict
        ? `SELECT ${LIST_COLUMNS} FROM "Contact" WHERE ownerId = ? OR ownerId IS NULL ORDER BY createdAt DESC`
        : `SELECT ${LIST_COLUMNS} FROM "Contact" ORDER BY createdAt DESC`;
      let contacts: ContactRow[];
      try {
        contacts = restrict
          ? await prisma.$queryRawUnsafe<ContactRow[]>(sql, user!.id)
          : await prisma.$queryRawUnsafe<ContactRow[]>(sql);
      } catch (rawErr) {
        console.error("[/api/contacts GET] raw query failed, falling back:", rawErr);
        const fallback = await prisma.contact.findMany({ orderBy: { createdAt: "desc" } });
        contacts = fallback as unknown as ContactRow[];
      }
      return NextResponse.json(await attachOwners(contacts));
    }

    // ── Paginated + server-side search/filter path ──
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const search = (searchParams.get("search") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const owner = (searchParams.get("owner") || "").trim();

    const where: string[] = [];
    const params: unknown[] = [];

    // Owner scoping: non-admins are locked to owned/unassigned; admins can pick.
    if (restrict) {
      where.push(`(ownerId = ? OR ownerId IS NULL)`);
      params.push(user!.id);
    } else if (owner && owner !== "all") {
      if (owner === "mine" && user) {
        where.push(`ownerId = ?`);
        params.push(user.id);
      } else if (owner === "unassigned") {
        where.push(`ownerId IS NULL`);
      } else {
        where.push(`ownerId = ?`);
        params.push(owner);
      }
    }
    if (status && status !== "all") {
      where.push(`status = ?`);
      params.push(status);
    }
    if (search) {
      where.push(`(name LIKE ? OR email LIKE ? OR company LIKE ?)`);
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    let total = 0;
    try {
      const cnt = await prisma.$queryRawUnsafe<Array<{ cnt: number | bigint }>>(
        `SELECT COUNT(*) as cnt FROM "Contact" ${whereSql}`,
        ...params
      );
      total = Number(cnt[0]?.cnt ?? 0);
    } catch (e) {
      console.error("[/api/contacts GET] count failed:", e);
    }

    const offset = (page - 1) * limit;
    let rows: ContactRow[] = [];
    try {
      rows = await prisma.$queryRawUnsafe<ContactRow[]>(
        `SELECT ${LIST_COLUMNS} FROM "Contact" ${whereSql}
          ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
        ...params,
        limit,
        offset
      );
    } catch (e) {
      console.error("[/api/contacts GET] page query failed:", e);
    }

    const contacts = await attachOwners(rows);
    return NextResponse.json({
      contacts,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (e) {
    console.error("[/api/contacts GET]", e);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/contacts — auto-assigns ownerId to the current user unless an admin
// explicitly sets one in the payload.
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const user = await getCurrentUser();

    // Required field validation
    if (!data?.name || !data?.email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }

    let ownerId: string | null = null;
    if (user) {
      try {
        if (isAdmin(user)) {
          if (data.ownerId) {
            ownerId = await resolveEffectiveOwner(data.ownerId);
          } else {
            ownerId = await pickAndResolveOwner(
              { source: data.source, email: data.email, tags: data.tags },
              user.id
            );
          }
        } else {
          ownerId = await resolveEffectiveOwner(user.id);
        }
      } catch (e) {
        // If the routing/OOO resolution somehow fails, fall back to the user
        // themselves so we never block contact creation
        console.error("[/api/contacts POST] owner resolution failed:", e);
        ownerId = user.id;
      }
    }

    // Whitelist fields so unknown form fields don't crash Prisma.
    // Note: we deliberately DO NOT include `ownerId` in the typed create —
    // a stale Prisma client may not know about the field even though the column
    // exists in the DB. We patch ownerId via raw SQL right after.
    const contactData = {
      name: String(data.name).trim(),
      email: String(data.email).trim().toLowerCase(),
      phone: data.phone || null,
      whatsappPhone: data.whatsappPhone || null,
      company: data.company || null,
      country: data.country || null,
      city: data.city || null,
      designation: data.designation || null,
      department: data.department || null,
      industry: data.industry || null,
      category: data.category || null,
      status: data.status || "lead",
      preferredChannel: data.preferredChannel || "email",
      leadScore: typeof data.leadScore === "number" ? data.leadScore : null,
      source: data.source || null,
      tags: data.tags || null,
      notes: data.notes || null,
    };

    let contact;
    try {
      contact = await prisma.contact.create({ data: contactData });
    } catch (e) {
      console.error("[/api/contacts POST] prisma create failed:", e);
      throw e;
    }

    // Patch ownerId via raw SQL so a stale Prisma client (which may not know
    // about Contact.ownerId yet) doesn't break the create.
    if (ownerId) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "Contact" SET "ownerId" = ? WHERE id = ?`,
          ownerId,
          contact.id
        );
        (contact as { ownerId?: string | null }).ownerId = ownerId;
      } catch (e) {
        console.error("[/api/contacts POST] raw ownerId patch failed:", e);
      }
    }

    let owner = null;
    if (ownerId) {
      owner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, name: true, email: true },
      });
    }

    // Audit log
    if (user) {
      logAction({
        userId: user.id,
        action: "contact.create",
        entity: "contact",
        entityId: contact.id,
        details: { name: contactData.name, email: contactData.email, source: contactData.source, ownerId },
      }).catch(() => {});
    }

    return NextResponse.json({ ...contact, owner });
  } catch (e) {
    console.error("[/api/contacts POST]", e);
    const message = String(e);
    // Friendly error for the most common cause: duplicate email
    if (message.includes("Unique constraint") || message.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "A contact with this email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

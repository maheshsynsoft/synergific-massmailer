# Synergific Mass Mailer / AI Business Suite

Mass email campaigns, follow-ups, contacts, sales, support and a unified inbox. Built with Next.js 16, React 19, Prisma (SQLite), Tailwind v4 and shadcn/ui.

## Design system

### Colours

All colours are theme tokens in `src/app/globals.css`. Use the Tailwind token classes (`bg-card`, `bg-secondary`, `text-muted-foreground`, `bg-primary`…), never hard-coded hex values. No gradients anywhere.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `background` / `card` | `#FFFFFF` | `#0F0E14` / `#17161F` | page, cards, tables |
| `secondary` | `#F2F0FD` | `#1B1930` | lavender top panel on the dashboard, icon circles |
| `muted` | `#F5F5F8` | `#1D1C26` | table header row, zebra rows, filter tabs |
| `accent` | `#F1F0F6` | `#22212C` | row hover, active nav item |
| `primary` | `#6C5CE7` | `#6C5CE7` | buttons, chart bars, active page button |
| `foreground` | `#16151C` | `#F2F1F7` | text |
| `muted-foreground` | `#5E5B6B` | `#A6A3B5` | secondary text |
| `border` | `#E6E4EC` | `#2B2938` | borders |

Buttons are solid purple with white text (`bg-primary text-primary-foreground`). Font is Geist. Icons are `lucide-react`.

### Tables (records style)

Every list of records (contacts, campaigns, deals, tickets, deliveries…) is shown as a **table**, not a stack of cards. The shared pieces are:

- `src/components/ui/table.tsx`: the shadcn table, restyled with a grey header row, zebra body rows, no row borders and roomy cells.
- `src/components/data-table/records.tsx`: server-safe helpers.
  - `TableCard`: the white rounded container. It has a toolbar (title, divider, search and filters on the left, actions on the right) and a footer.
  - `PersonCell`: round avatar + name + email, for the first column.
  - `LinkCell`: icon box + underlined link, like a company column.
  - `IdCell`: reference text with a small date chip under it.
  - `StatusPill`: tinted pill with an icon. Tones are `success`, `warning`, `danger`, `info`, `primary` and `neutral`.
  - `RowAction`: the `⋯` button at the end of each row.
  - `EmptyRow`: the message row shown when a table is empty.
  - `firstColumn`: the divider after the first column.
  - `rowDelay`: staggers the row fade-in.
- `src/components/data-table/pagination.tsx`: client helpers.
  - `usePagination`: pages through an array on the client.
  - `RowsPerPage`: "Showing: 10 ▾ rows per page out of N".
  - `Pagination`: ‹ « 1 2 3 … 24 › », with the current page in solid purple.
  - `SortButton`: a sortable column header.

Layout of a table page:

```
┌ TableCard ─────────────────────────────────────────────────────────┐
│ Title │ [search] [filters]                  [status tabs] [actions] │
├────────────────────────────────────────────────────────────────────┤
│ ☐ Name            │ Company   Phone    Date      Status        ⋯   │  ← bg-muted header
│ (●) Jane Doe      │ ▢ Acme    +1 …     REF-01    ✓ Delivered   ⋯   │
│     jane@acme.com │                    2024-06-01                   │  ← zebra rows
├────────────────────────────────────────────────────────────────────┤
│ Showing: 10 ▾ rows per page out of 2,320        ‹ « [1] 2 3 … 24 › » │
└────────────────────────────────────────────────────────────────────┘
```

Rules:
- The first column is the record's identity (`PersonCell` or name + subtitle), followed by the `firstColumn` divider.
- Statuses are always `StatusPill`s. Dates are `YYYY-MM-DD`, shown in an `IdCell` chip.
- Numbers are right-aligned with `nums-tabular`. Rates get a small purple bar.
- Filters live in the table toolbar as segmented tabs, not as stat cards above the table.
- Tables scroll sideways inside their card on phones. The page itself never scrolls horizontally.

### Dashboard

The dashboard (`src/app/(dashboard)/dashboard/page.tsx`) has a greeting row, a lavender top panel (search, chart, gauge, numbers) and then tables:

- **Top panel:** search, toolbar links and the primary button, then an animated paired bar chart, an open-rate tick gauge and count-up numbers.
- **Tables:** Campaigns, Needs attention, Recent deals and Recent tickets.

### Animation

Use animated graphics wherever they fit: bars grow in, gauge ticks light up in sequence, numbers count up, table rows fade in, and empty states and hero areas get a looping SVG illustration.

- **Where the pieces live:** `src/components/dashboard/dashboard.module.css`, `animate-row-in` / `animate-fade-in` / `hover-lift` in `globals.css`, and `count-up.tsx`.
- **Rules:** no animation libraries; respect `prefers-reduced-motion`; never hide content behind an animation.

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# CLAUDE.md

Synergific Mass Mailer / AI Business Suite: mass email campaigns, follow-ups, contacts, sales, support and a unified inbox.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui (`src/components/ui`), icons from `lucide-react`
- Prisma 6 + SQLite (`prisma/schema.prisma`)
- next-auth v5 (credentials login), config in `src/lib/auth.ts`
- Email sending via Microsoft Graph / nodemailer (`src/lib/email.ts`, `src/lib/email-accounts.ts`)
- AI features via `@anthropic-ai/sdk` (`src/lib/ai.ts`)
- Charts via `recharts`

## Commands

```bash
npm run dev      # dev server on http://localhost:3000
npm run build    # production build
npm run lint     # eslint
npm run seed     # seed the database
npx tsc --noEmit # type check
npx prisma migrate dev --name <name>   # after editing schema.prisma
```

Run `npm run lint` and `npx tsc --noEmit` after every change. Both must pass.

## Project layout

- `src/app/(auth)/`: login and register pages
- `src/app/(dashboard)/`: all app pages (mass-email, contacts, campaigns, sales, support, etc.)
- `src/app/api/`: API routes
- `src/lib/`: server logic (auth, email, scheduler, follow-ups, rbac, suppression, etc.)
- `src/components/ui/`: shadcn components. Reuse these before making new ones.
- `src/components/layout/`: sidebar and shell
- `src/components/auth/`: login illustration (animated SVG) and `auth.module.css`
- `public/logo-1.jpeg`: logo with dark text, for light backgrounds
- `public/logo.png`: logo with white text, for dark backgrounds only

## Design rules (strict)

### Colours
- **NEVER use gradient colours.** No `linear-gradient`, `radial-gradient` or `conic-gradient`, and no Tailwind `bg-gradient-*`, `from-*`, `via-*` or `to-*`.
  This covers backgrounds, buttons, text (no gradient text), borders and overlays.
- The old `gradient-brand`, `gradient-mesh` and `bg-grid` utilities have been removed. Don't bring them back.
- **Backgrounds must be solid colours.** No blurred colour blobs, glowing orbs, mesh backgrounds or dot/grid pattern overlays. (Hatched chart bars drawn with an SVG `<pattern>` are fine; they are data marks, not backgrounds.)
- Use the theme tokens from `src/app/globals.css` (`bg-background`, `bg-card`, `bg-secondary`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary`, etc.) instead of hard-coded colours.
- The app defaults to **light mode** (`.light` on `<html>`). Dark mode must keep working, so test both when using colours.

### Palette (light / dark)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--background`, `--card` | `#FFFFFF` | `#0F0E14` / `#17161F` | page and cards |
| `--secondary` | `#F2F0FD` | `#1B1930` | lavender top panel, icon circles |
| `--muted` | `#F5F5F8` | `#1D1C26` | table header, zebra rows, filter tabs |
| `--accent`, `--sidebar-accent` | `#F1F0F6` | `#22212C` | hover and active nav |
| `--primary` | `#6C5CE7` | `#6C5CE7` | buttons, active page, rate bars |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` | text on purple |
| `--primary-text` | `#5646D6` | `#B3A9FF` | `text-primary` is remapped to this so purple text passes contrast |
| `--foreground` | `#16151C` | `#F2F1F7` | text |
| `--muted-foreground` | `#5E5B6B` | `#A6A3B5` | secondary text |
| `--border` | `#E6E4EC` | `#2B2938` | borders |
| `--chart-bar` | `#6C5CE7` | `#6C5CE7` | chart bars, lit gauge ticks |
| `--chart-track` / `--chart-hatch` | `#D9D5EE` / `#A99EF0` | `#3A3754` / `#7E72E0` | gauge track, hatched "previous period" bars |

- Buttons are solid `bg-primary text-primary-foreground` (purple, white text).
- Never put `text-primary` on a `bg-primary` element. Icons inside purple circles or cards use `text-primary-foreground` or `text-white`.

### Layout & style (BizLink-style dashboard)
The look is based on the "CRM Dashboard App Design" Dribbble shot (BizLink). The reference implementation is `src/app/(dashboard)/dashboard/page.tsx` and `src/components/dashboard/`.
- **Sidebar:** white (`bg-sidebar`), logo at top, rounded-xl nav items, active item `bg-sidebar-accent font-semibold`, pill count badges, user avatar plus sign-out icon at the bottom. Below `lg` it becomes a top bar with a menu button that opens a left `Sheet`.
- **Top panel:** a lavender `bg-secondary rounded-[20px]` block holding the search field and toolbar links, then the stats row. The greeting and the primary button sit above it: paired bar chart (solid purple = this period, hatched = last period), tick gauge, and big numbers with an arrow link under each.
- **Lists of records are ALWAYS tables, never stacks of cards or stat-tile grids.** Use `TableCard` + the shadcn `Table` + helpers from `src/components/data-table/records.tsx` (`PersonCell`, `LinkCell`, `IdCell`, `StatusPill`, `RowAction`, `EmptyRow`, `firstColumn`, `rowDelay`) and `pagination.tsx` (`usePagination`, `RowsPerPage`, `Pagination`, `SortButton`). See README "Tables" for the layout. Reference pages: dashboard, `marketing/campaigns`, `contacts`, `delivery-tracking`, `campaign-analytics`.
  - Toolbar: title, divider, search/filters left; status filter tabs (`bg-muted` segmented) and actions right. Don't put filter stat cards above a table.
  - First column = identity (avatar + name + email), then the `firstColumn` divider. Statuses = `StatusPill`. Dates = `YYYY-MM-DD` in an `IdCell` chip. Numbers right-aligned `nums-tabular`; rates get a small purple bar.
  - Footer: "Showing: N rows per page out of total" on the left, `Pagination` on the right (active page solid purple).
  - Rows use `className="animate-row-in" style={rowDelay(i)}`. Tables scroll sideways inside the card on phones.
- Cards (for non-list content only, e.g. forms, charts): `rounded-2xl border border-border bg-card`, no heavy shadows. Avatars are round.
- Clean and minimal: white cards, light borders, soft shadows, generous spacing.
- Auth pages: animation on the left, login form on the right. On mobile they stack, with the animation on top and the form below. Animation must stay visible on mobile.
- Every page and component must be responsive. See **Responsive (required)** below.
- Font is Geist. Don't introduce other fonts.
- Icons: `lucide-react` only.

### Responsive (required)
**Always build responsive components.** Every new or edited page, component, dialog and form must work at 390px (phone), 768px (tablet) and 1280px (desktop) before it counts as done. Write mobile-first: the base classes are the phone layout, then add `sm:`, `md:` and `lg:` for larger screens.
- **No horizontal page scroll at 390px.** Only tables, kanban boards and code blocks may scroll sideways, and only inside their own box (`overflow-x-auto`).
- **Page padding:** page body containers use `p-4 sm:p-6 lg:p-8` (or `p-3 sm:p-4 lg:p-6` for dense pages). Never a bare `p-6` or `p-8`. Cards use `p-4 sm:p-5`.
- **Grids:** never a bare `grid-cols-2`, `grid-cols-3` or more for forms or content. Use `grid-cols-1 sm:grid-cols-2`, `sm:grid-cols-2 lg:grid-cols-4`, etc. Small stat tiles (a number and a label) may stay 2 or 3 across on phones.
- **Rows of buttons, filters or pills:** always `flex flex-wrap gap-2`. A `justify-between` row with a title on one side and actions on the other must also be `flex-wrap gap-3`, or stack with `flex-col sm:flex-row`.
- **Card headers with actions** (Edit/Delete etc.): `flex flex-col sm:flex-row items-start justify-between gap-2`; the title block gets `min-w-0`, the action group `flex flex-wrap`.
- **Flex children that hold text** need `min-w-0` (plus `truncate` or `break-words`), otherwise long names, emails and domains push the layout wider than the screen. Icons and avatars next to text get `shrink-0`.
- **Tables:** use the shared `Table` (it already scrolls sideways). Grid-based pseudo-tables (`grid-cols-12` rows) must be wrapped in `overflow-x-auto` with `min-w-[720px]` or so on the inner rows, so columns never get crushed.
- **Kanban boards:** `grid grid-flow-col auto-cols-[minmax(240px,1fr)] overflow-x-auto`. Never `grid-cols-6`, which crushes columns on small screens.
- **Fixed widths:** no `w-[500px]`-style widths on layout boxes. Use `w-full max-w-[500px]`. Big display numbers scale down: e.g. `text-[28px] sm:text-[34px]`.
- **Segmented tabs:** `max-w-full overflow-x-auto` on the list, `whitespace-nowrap shrink-0` on each tab.
- **Page header:** always use `Header` from `src/components/layout/header.tsx` with the `actions` prop. On phones it puts the title, theme and bell icons on the first row and the actions below; don't build custom page headers.
- **Dialogs:** `DialogContent` already caps its height and scrolls. Form grids inside dialogs follow the grid rule above.
- **Tap targets** on phones are at least 36px tall (`h-9`) for buttons and icon buttons.
- **Check it:** resize to 390px (browser devtools) and confirm nothing is cut off and the page doesn't scroll sideways. Then check 768px and 1280px.

### Animation
- **Use animated graphics wherever they fit.** Charts animate in (bars grow, gauge ticks light up in sequence, numbers count up), cards fade up in a stagger, live items get a pulsing dot, and empty states and hero areas get a looping SVG illustration (see `send-illustration.tsx`).
- Reuse what exists before writing new motion: `src/components/dashboard/dashboard.module.css` (`rise`, `bar`, `tickOn`, `liveDot`, `fill`, `draw`, `areaIn`, `dotIn`, `segment`, illustration loops), `count-up.tsx`, and the global `animate-fade-in`, `animate-row-in` and `hover-lift` classes.
- Ready-made dashboard graphics: `kpi-card.tsx` (summary card with count-up, trend pill and self-drawing sparkline), `emails-chart.tsx` (paired bars), `gauge.tsx` (tick gauge), `activity-chart.tsx` (30-day line + area chart), `pipeline-donut.tsx` (donut with sweeping segments). All are plain SVG with CSS animation. Don't add a chart library for new dashboard graphics.
- Done with CSS keyframes or CSS modules. Number count-ups write to the DOM through a ref, not state. No new animation libraries without asking.
- Always respect `prefers-reduced-motion` (turn animations off).
- Never hide content with a base `opacity: 0` that only an animation reveals. Use `animation-fill-mode: both` with a `from` keyframe so content is visible when motion is off.

## Code rules

- Don't add new npm dependencies without asking first.
- Don't call `setState` synchronously inside `useEffect`. The `react-hooks/set-state-in-effect` lint rule fails on it. Use refs, lazy initial state or event handlers instead.
- Don't change auth or sign-in logic when only asked for UI changes.
- Schema changes go through a Prisma migration, never by editing the SQLite DB by hand.
- Keep secrets in `.env`. Never commit them or print them.
- Don't commit or push unless asked.

## Known issues

- `register` page still uses the old split layout (gradients removed) and should be brought in line with the login page.
- Pages other than the dashboard use the new colours via tokens, but still have their older layouts (small `rounded-md` cards, uppercase labels). Bring them in line with the dashboard style when you touch them.
- `npm run lint` and `npx tsc --noEmit` already fail on `main` with older errors (e.g. `src/lib/email.ts`, `src/lib/auth.ts`, `theme-provider.tsx`, `notifications-bell.tsx`). Don't add new ones.

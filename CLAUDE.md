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
- **Do not add new uses of `gradient-brand`, `gradient-mesh` or `--gradient-*`.** These exist in `globals.css` from older code. Don't spread them. When touching a component that uses them, replace them with a solid colour.
- **Backgrounds must be solid colours.** No blurred colour blobs, glowing orbs, mesh backgrounds or dot/grid pattern overlays.
- Use the theme tokens from `src/app/globals.css` (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary`, etc.) instead of hard-coded colours.
- Primary brand colour is Synergific purple `#6C5CE7` (`--primary`). Buttons are solid `bg-primary text-primary-foreground`.
- The app defaults to **light mode** (`.light` on `<html>`). Dark mode must keep working, so test both when using colours.

### Layout & style
- Clean and minimal: white cards, light borders, soft shadows, generous spacing.
- Auth pages: animation on the left, login form on the right. On mobile they stack, with the animation on top and the form below. Animation must stay visible on mobile.
- Every page must be fully responsive (check at 390px phone width). No horizontal scroll.
- Font is Geist. Don't introduce other fonts.
- Icons: `lucide-react` only.

### Animation
- Animations are welcome (entrance fades, SVG illustration loops, hover lifts), done with CSS keyframes or CSS modules. No new animation libraries without asking.
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

- `globals.css` line 10 has `--font-sans: var(--font-sans);`, which references itself, so Geist doesn't load app-wide and text falls back to serif. The fix is `--font-sans: var(--font-geist-sans);`. The login page works around it in `auth.module.css`.
- `register` page still uses the old design and should be brought in line with the login page.

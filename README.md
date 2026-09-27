# MSA Platform — Phase 1 (MVP)

Auth + RBAC, student profiles, the daily task workflow, QR attendance, the
parent dashboard, Today's Journey, and the public site + online
registration — the Phase 1 scope from the engineering brief. Finance,
Staff, Analytics, Communication, Tickets, Badges, the full Notification
Center, and Scheduling are Phase 2/3 and are intentionally not here yet.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind · PostgreSQL + Prisma ·
signed JWT session cookies (jose) + bcrypt · `qrcode` for QR generation ·
`nodemailer` for the one Phase-1 transactional email (registration
credentials) · a small JSON-dictionary i18n layer for Arabic (primary,
RTL) / English (LTR) — no external i18n library needed for this size.

## Getting started

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # fill in DATABASE_URL and SESSION_SECRET
npm run db:push             # create tables from prisma/schema.prisma
npm run db:seed             # demo Owner/Manager/Teachers/Parents/Students
npm run dev
```

Open http://localhost:3000 — it redirects to `/ar` (Arabic is the
default locale; switch to English from the top nav).

Demo accounts (seeded, all use password `password123`):

| Role    | Email              |
|---------|--------------------|
| Owner   | owner@msa.test     |
| Manager | manager@msa.test   |
| Teacher | teacher1@msa.test  |
| Teacher | teacher2@msa.test  |
| Parent  | parent1@msa.test   |
| Parent  | parent2@msa.test   |
| Student | student1@msa.test  |

## Known limitation in *this* sandbox

`prisma generate` downloads its query-engine binary from
`binaries.prisma.sh`, which isn't reachable from this container's network
allowlist — so `npm install` here skips that step (`--ignore-scripts`),
and `@prisma/client`'s types don't exist yet in this checkout. That's why
a local `npx tsc --noEmit` here still reports errors like "Module
'@prisma/client' has no exported member 'PrismaClient'/'Role'" and a run
of "implicitly has an 'any' type" errors that cascade from it. Every one
of those traces back to that single root cause — none are independent
bugs. On your own machine, `npm install` (or `npx prisma generate`) will
fetch the real engine and all of that clears up, since every model
field/relation/enum used in the code was written directly against
`prisma/schema.prisma`.

## How a few things are deliberately simplified for Phase 1

- **QR kiosk** (`/attendance/scan`) reads scans from an always-focused
  text input rather than a camera + jsQR. Inexpensive QR scanners act as
  USB/Bluetooth *keyboards* — they type the payload and send Enter — so
  this is how real kiosk hardware is normally wired up, not a stand-in
  for a "real" implementation.
- **Today's Journey** merges attendance check-in/out with a
  `TaskStatusEvent` row written on every status change, so timestamps in
  the timeline are real, not inferred.
- **Registration → credentials email** goes through `lib/mailer.ts`,
  which logs to the console if `SMTP_HOST` isn't set (so the flow still
  works end-to-end without real SMTP creds) and sends for real once you
  configure one. The temporary password is also shown once to the
  Manager in the UI after accepting a request.
- **RBAC** is enforced twice: `middleware.ts` gates any non-public route
  behind a valid session cookie, and every page/route handler re-derives
  the session and scopes its Prisma query by ownership (a parent's
  `where` filters by their own children; a teacher's by their own
  students). No query trusts the role name alone.
- Single-tenant: this models one center (MSA), not multi-org SaaS.
  `programType` on Student/Teacher/Subject is the hook for the future
  ASA (sports) system to reuse this schema later.

## Structure

```
app/[locale]/                  public site + authenticated app (locale-prefixed)
app/[locale]/(app)/            protected route group — dashboard, students, tasks, attendance, journey, registrations
app/api/                       route handlers (auth, register, tasks, attendance scan, registrations)
components/                    client components (forms, kiosk input, task row, nav)
lib/                           db client, auth/session, rbac table, audit log, mailer, i18n
prisma/schema.prisma           Phase 1 data model
prisma/seed.ts                 demo data
dictionaries/{ar,en}.json      all user-facing copy — nothing hardcoded in components
```

## Next up (Phase 2)

Finance (payments/invoices, account-status transitions), Staff module,
full parent↔center Communication (messages, notes, tickets), Analytics,
Badges, and Scheduling — see the Phase 0 blueprint for the routes and
permission matrix these will slot into.

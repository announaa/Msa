# MSA Platform

Auth + RBAC, student profiles, the daily task workflow, QR attendance,
the parent dashboard, Today's Journey, public site + online registration
(**Phase 1**) — plus, from **Phase 2**: payments/invoicing/receipts with
account-status automation (**Finance**), grade tracking with trend
analytics and decline alerts (**Academics**), and downloadable monthly
PDF reports. Staff, Communication/Tickets, Badges, the full Notification
Center, and Scheduling are still ahead.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind · PostgreSQL + Prisma ·
signed JWT session cookies (jose) + bcrypt · `qrcode` for QR generation ·
`pdf-lib` for payment receipts · `nodemailer` for the one transactional
email (registration credentials) · a small JSON-dictionary i18n layer
for Arabic (primary, RTL) / English (LTR).

## Getting started

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # fill in DATABASE_URL and SESSION_SECRET
npm run db:push             # create tables from prisma/schema.prisma
npm run db:seed             # demo Owner/Manager/Teachers/Parents/Students + sample invoices
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

The seed gives student1 a paid-up September invoice (account: Active)
and student2 an unpaid, past-due one (account: Overdue) — open
**Finance** as the Owner or Manager demo account to see both states.
It also gives student1 four improving Math assessments and student2
three declining English ones (with the resulting open AcademicAlert
pre-created) — open **Academics** to see both.

## What's in Academics

- **Assessment**: Exam → Subject → Topic → Score, recorded by
  Owner/Manager (any student) or Teacher (their own students only).
  `topic` is a plain string rather than a modeled hierarchy — enough to
  say *where* a student needs help without a full curriculum tree.
- `lib/analytics.ts`: per-subject average + trend (latest vs. previous
  assessment) + a Strongest/Needs-Support topic breakdown, and a
  "before vs after MSA" comparison (each subject's first assessment vs.
  the average of its most recent 3 — a simplification; there's no
  separate "baseline" field).
- **Smart alert**: `checkAcademicDecline` runs after every assessment
  write; if a student's last 3 assessments in a subject strictly
  declined, it opens an `AcademicAlert` (one at a time per
  student+subject, so it doesn't spam). Shown as a banner on the
  student's Academics page and rolled into the Owner dashboard's
  "Declining-grades alerts" count. Owner/Manager can resolve it.
- Not built yet: the other two Owner-dashboard alert types from section
  4.9 (students absent 3+ times, unresolved parent complaints) — the
  first needs an absence-vs-schedule concept we don't have yet, the
  second needs the Tickets module.

## What's in Finance

- `Student.monthlyFeeCents` — set per student from their Finance page.
- **Invoice**: one billing period's charge (e.g. "October 2026"). Status
  (Unpaid/Partial/Paid) is always *derived* from its payments — never
  hand-set — via `recomputeStudentFinance` in `lib/finance.ts`.
- **Payment**: a manually recorded payment (cash/e-transfer/card/other),
  optionally applied to an invoice, or recorded as a general credit.
  Manual entry only, per the brief: "record manual payments; add a
  payment-gateway interface for later" — there's no card processor
  integration here, and `PaymentMethod` is where that provider interface
  would slot in later.
- **Account status** (`Student.accountStatus`): Active while every
  invoice is paid, Payment Due as soon as a balance exists, Overdue once
  the oldest unpaid invoice's due date is more than `GRACE_PERIOD_DAYS`
  (7, set in `lib/finance.ts`) in the past. Recomputed after every
  invoice or payment write — this constant is the one place to change
  the grace window.
- **Receipts**: `GET /api/finance/payments/[id]/receipt` streams a PDF
  (via `pdf-lib`, no headless browser needed — works fine on Vercel).
  Owner/Manager can fetch any receipt; a Parent only their own child's.
- Not built yet: automatic monthly invoice generation (no cron wired up
  — Owner/Manager create each invoice manually for now) and feature
  restriction for Overdue accounts (the brief's "restrict non-essential
  features" is a policy layer on top of this, not yet applied anywhere).

## Monthly reports

Open a student's **Academics** page → *Monthly reports* → download any of
the last 6 months as a PDF (Owner/Manager any student; Parent their own
child; Teacher their own students; Student themself). Generated on demand
from live data — nothing is stored — via `GET /api/reports/[studentId]/[month]`.

- Attendance % = days the student attended ÷ "center days" (days on which
  *any* student checked in). There's no class-schedule model yet, so this
  is the honest proxy for "days they could have attended".
- Subject averages come from that month's assessments, with a delta vs.
  the previous month when both have grades in that subject.
- The *Teacher assessment* (strengths / areas to improve /
  recommendations) is written by Owner/Manager/Teacher on the same page
  (`MonthlyReportNote`). Until someone writes it, the PDF fills strengths
  and weak topics from the month's grades and says it's auto-generated.
- **Arabic in PDFs**: pdf-lib's built-in fonts can't encode Arabic (a
  student named "يوسف" used to crash receipt downloads). PDFs now embed
  Noto Sans Arabic (`assets/fonts`, SIL OFL) via fontkit. Names and
  teacher notes render correctly; the PDF *labels* are English-only, and
  a sentence mixing Arabic and Latin words isn't bidi-reordered.
  `next.config.mjs` lists the font under `outputFileTracingIncludes` so it
  ships with the serverless bundle.

## Known limitation in *this* sandbox

`prisma generate` downloads its query-engine binary from
`binaries.prisma.sh`, which isn't reachable from this container's network
allowlist — so `npm install` here skips that step, and `@prisma/client`'s
types don't exist in this checkout. A local `npx tsc --noEmit` here
reports "Module '@prisma/client' has no exported member ..." and a
cascade of "implicitly has an 'any' type" from it — every one of those
traces back to that single root cause. On your own machine, `npm install`
(or `npx prisma generate`) fetches the real engine and all of it clears
up, since every field/relation/enum used was written directly against
`prisma/schema.prisma`.

## How a few things are deliberately simplified

- **QR kiosk** (`/attendance/scan`) reads scans from an always-focused
  text input rather than a camera + jsQR — inexpensive QR scanners act
  as USB/Bluetooth keyboards (type the payload, send Enter), so this
  matches real kiosk hardware rather than standing in for it.
- **Today's Journey** merges attendance check-in/out with a
  `TaskStatusEvent` row written on every status change, so timeline
  timestamps are real, not inferred.
- **Registration → credentials email** goes through `lib/mailer.ts`,
  which logs to the console if `SMTP_HOST` isn't set (flow still works
  end-to-end without real SMTP creds) and sends for real once configured.
- **RBAC** is enforced twice: `middleware.ts` gates any non-public route
  behind a valid session cookie, and every page/route handler re-derives
  the session and scopes its Prisma query by ownership. No query trusts
  the role name alone.
- Single-tenant: this models one center (MSA), not multi-org SaaS.
  `programType` on Student/Teacher/Subject is the hook for the future
  ASA (sports) system to reuse this schema later.
- `app/[locale]/layout.tsx` is `force-dynamic` — every page under it
  reads live data, so none of it should be statically generated at
  build time.

## Structure

```
app/[locale]/                  public site + authenticated app (locale-prefixed)
app/[locale]/(app)/            protected route group — dashboard, students, tasks, attendance, journey, registrations, finance, academics
app/api/                       route handlers (auth, register, tasks, attendance scan, registrations, finance, assessments, academic-alerts)
components/                    client components (forms, kiosk input, task/payment rows, assessment form, alert banner, nav)
lib/                           db client, auth/session, rbac table, audit log, mailer, finance, receipt, analytics, i18n
prisma/schema.prisma           data model
prisma/seed.ts                 demo data (incl. sample invoices/payments)
dictionaries/{ar,en}.json      all user-facing copy — nothing hardcoded in components
```

## Next up

Tickets/messaging round out Phase 2 (owner dashboard, grades/alerts and
monthly reports are now in place); see the Phase 0 blueprint
for the routes and permission matrix these slot into.

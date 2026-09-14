# CLAUDE.md

Reference for any developer (or AI agent) touching this repo. Keeps multiple people working in parallel from drifting out of sync or stepping on each other's files.

Read this alongside:
- [Decisions.md](Decisions.md) — the *why* behind schema/architecture choices
- [README.md](README.md) — the *how* to run each piece locally

## Project scope (POC)

This is a POC being built to win back a client (beauty-retail promotional monitoring, replacing their manual Excel workflow). The client's own spec is phased (Phase 1 → 2 → 3), but the decision was made to build past Phase 1 now — scraping and an AI assistant (both later-phase in the client's spec) are included in this POC deliberately, to differentiate the pitch.

**Team split:**
- **Gajendra** — backend: schema/persistence, auth, scraping
- **Himanshu** — frontend: all existing pages/components, plus wiring them to real data
- **Divyanshu** — AI chat assistant

**Status of the finalized scope** (see the full bucket breakdown in conversation history / ask Gajendra for the original table if needed):

| Area | Status |
|---|---|
| Backend (DB, auth, roles, persistence) | Done |
| Scraper (4/7 retailer sites) | Done |
| Data entry form, Dashboard, Calendar, Brand Analytics, Store Comparison | Existing, not yet wired to real DB |
| OCR on manual upload (Gemini + Tesseract) | Existing, works, but API key is client-exposed — needs to move server-side |
| Review queue (approve/edit/reject `pending_review` rows) | **In PR #3, awaiting Himanshu's review.** Verified end-to-end against local + cloud DB |
| Auth login/session UI | Not built — `src/lib/supabaseClient.ts` has a dev-only `window.supabase` stopgap for testing until this exists |
| AI chat assistant | **Merged.** Works well, live-tested (grounded Q&A + working navigation links) — but reads static `AppContext` data only, zero references to Supabase. Needs reconciling once real data lands (see below) |
| PDF export, alerts/digests, CRM/social monitoring | Explicitly deprioritized for the POC |

## Repository structure

### Built and merged (this PR)

```
supabase/                   Gajendra — DB schema, source of truth
  migrations/*.sql            Edit these, never the DB directly (npx supabase db reset to reapply)
  seed.sql                     Generated — don't hand-edit (see scripts/generate-seed.js)
  config.toml

scraper/                    Gajendra — standalone Node/Playwright project, NOT part of the frontend build
  src/retailers.ts             Target URLs per retailer
  src/extract.ts                Gemini vision extraction (server-side)
  src/scrape.ts                  Main entry point
  src/supabaseAdmin.ts        Service-role client — bypasses RLS, server-side only, never import from src/

.github/workflows/scrape.yml   Daily cron running the scraper

src/lib/supabaseClient.ts    Frontend Supabase client (anon key, RLS-scoped)
src/types/supabase.ts        Generated DB types — regenerate with `npm run db:types`, don't hand-edit

scripts/generate-seed.js     Regenerates supabase/seed.sql from src/data/*
```

### Existing frontend (Himanshu, pre-dates this backend work)

```
src/
  App.tsx                    Routes + layout shell
  context/AppContext.tsx     Currently all in-memory state — this is what gets replaced with real Supabase calls
  pages/                     Dashboard, Promotions, PromotionalCalendar, BrandAnalytics, StoreComparison, ProductDetail
  components/                PromotionFormModal (manual entry + OCR upload), PromotionFilterModal, etc.
  data/                      Static seed arrays (retailers.ts, brands.ts, catalog.ts, products.json, productTypes.ts) —
                              source of truth for supabase/seed.sql, but will stop being the app's live data source
                              once AppContext is wired to Supabase
  utils/geminiOcr.ts          Manual-upload OCR — client-side Gemini call, key currently exposed (needs server-side move)
```

### AI chat assistant (Divyanshu, merged)

```
src/components/Assistant/AssistantWidget.tsx        Chat UI
src/components/Assistant/AssistantResultView.tsx    Renders assistant results (product/promo cards, nav links)
src/services/geminiAssistant.ts                     Gemini call + prompt handling — client-side key,
                                                       same exposed-key pattern as geminiOcr.ts (tracked, not new)
src/services/assistantTools.ts                       Deterministic "tools" the assistant calls — reads
                                                       AppContext + static data (catalog.ts). Zero references
                                                       to Supabase anywhere in this branch.
src/types/assistant.ts
src/data/navigation.ts                                Route registry the assistant navigates against — real
                                                       react-router <Link>s, confirmed working live
App.tsx (+2 lines)                                    Mounts the widget
```

**Verified before merge:** clean merge against main (no conflicts — the App.tsx overlap flagged earlier turned out to be a non-issue since it's only 2 additive lines), typecheck/build/existing tests all pass, and live-tested both a data query (correct, grounded answer + product cards) and navigation ("take me to brand analytics" → real clickable card → actually navigated).

**Real follow-up, not yet started:** `assistantTools.ts` reads only the static frontend data. Once Himanshu wires `AppContext` to Supabase, this needs updating too, or the assistant will silently answer from stale/fake data instead of the real DB (including anything the scraper wrote).

### Review queue (Gajendra, PR #3, awaiting Himanshu's review — not yet merged)

```
src/pages/ReviewQueue/ReviewQueue.tsx        List + screenshot preview + approve/edit/reject actions
src/pages/ReviewQueue/ReviewEditModal.tsx    Dedicated edit form — NOT PromotionFormModal, see PR description for why
src/lib/reviewQueue.ts                       Supabase queries: fetch pending, approve, reject, edit-and-approve
supabase/migrations/0003_review_audit.sql    Adds reviewed_by/reviewed_at/rejection_reason; tightens promotions_select RLS
```

**Behavior change from this migration, relevant to whatever you build next:** `promotions_select` now only returns `approved` rows to non-editors. Editors still see everything from any query — add `.eq('status', 'approved')` explicitly on any page that isn't the review queue, or pending/rejected rows will leak into normal views for editor sessions.

### Planned, not yet built

```
src/pages/Auth/                 Login/session UI (Himanshu) — uses supabase.auth, profiles table already exists
api/  (proposed, Vercel serverless, framework-agnostic)
  ocr-proxy.ts                   Moves Gemini OCR call server-side (fixes the exposed-key issue)
  assistant-query.ts             If Divyanshu's assistant needs server-side DB queries beyond client-side
                                  AppContext reads (decide once his branch is reviewed against real schema)
```

## Ownership map

| Path | Owner | Notes |
|---|---|---|
| `supabase/` | Gajendra | Schema changes go through migrations, not manual edits |
| `scraper/` | Gajendra | Standalone project, own `package.json`/lockfile |
| `.github/workflows/` | Gajendra | |
| `src/lib/`, `src/types/supabase.ts` | Gajendra (additive) | Himanshu consumes, doesn't need to edit |
| `src/pages/`, `src/components/` (existing), `src/context/` | Himanshu | |
| `src/components/Assistant/`, `src/services/*assistant*` | Divyanshu | |
| `src/data/*` | Shared source of truth — changes here should regenerate `supabase/seed.sql` (`node scripts/generate-seed.js`) |

## Mandatory workflow before touching any code

**This must be followed every time — no exceptions, for bug fixes and features alike:**

1. **Understand the requirement** — what's actually being asked, and why.
2. **Check alignment** against [Decisions.md](Decisions.md) and this file's scope section — is this in POC scope? Does it match a decision already made? If it contradicts something decided, flag that explicitly before proceeding, don't silently override it.
3. **Create an implementation plan with minimal file touches** — scope the change as tightly as possible. Prefer additive changes over edits to files outside your ownership area (see the ownership map above). If a change must cross into someone else's area, flag it before touching it.
4. **Then execute.**

Skipping straight to code without steps 1–3 is how two people end up editing the same file with conflicting assumptions — flagging `App.tsx` and `assistantTools.ts` above ahead of time is what kept that from actually happening this round.

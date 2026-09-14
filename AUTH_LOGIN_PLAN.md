# Auth login/session UI — scope plan

Status: **finalized, ready to build.** All open decisions below are resolved except the two still marked open. This crosses fully into Himanshu's ownership area (`src/pages/`, `src/components/`, `src/context/` per CLAUDE.md's ownership map) — handing off this plan to him rather than building it myself, per the mandatory workflow.

## Why this is blocking things

- The deployed app runs as Supabase's unauthenticated `anon` role. Every real RLS policy is scoped `to authenticated`, so without login the app either shows nothing (pre-`0005`) or needs an anon-read carve-out (`0005_anon_public_read.sql`) that itself is only a stopgap, tracked as a follow-up in CLAUDE.md.
- The header's "Admin / Data Analytics / Viewer" role selector ([App.tsx:368](src/App.tsx:368)) is **pure local `AppContext` state** — confirmed by checking the code, it's not wired to Supabase auth or `profiles.role` at all. It's cosmetic. Nothing in the UI actually reflects or enforces who's really signed in.
- The Review Queue (merged, PR #3) has 78 scraper-sourced `pending_review` rows sitting untouched right now — nobody can act on them through the real UI without a session, only via the dev-console `window.supabase.auth.signInWithPassword(...)` stopgap.
- Editor-only write actions (Add promotion, Bulk upload, approve/reject) are currently shown to everyone regardless of real permissions — RLS will reject the write server-side, but the UI gives no indication why, or hides nothing in advance.

## In scope

1. **Login page** — email + password via `supabase.auth.signInWithPassword`. Matches the existing dev-only stopgap pattern already in `src/lib/supabaseClient.ts`, just as a real page instead of a console trick.
2. **Session state** — restore session on load (`supabase.auth.getSession()`), subscribe to changes (`supabase.auth.onAuthStateChange`), expose the current user + their real `profiles.role` app-wide.
3. **Route protection** — unauthenticated visitors redirected to `/login`; everything currently under `AppLayout` requires a session.
4. **Sign out.**
5. **Replace the fake role selector** with the real signed-in state: show the actual authenticated user's real role (editor/analyst) read-only, plus sign-out. Remove the illusion that switching the dropdown changes anything.
6. **Role-gate editor-only UI affordances** — Add promotion, Bulk upload, Review Queue's approve/edit/reject — hidden or disabled for `analyst` sessions. This is a UX nicety; RLS is already the real enforcement boundary (migrations 0001–0003), so this isn't a new security mechanism, just not leaving analysts clicking into a silent 403.

## Explicitly out of scope for this POC

- **Public self-service sign-up.** Per `Decisions.md` ("new signups default to Analyst; promoting to Editor is manual for now, no admin UI"), the accepted model is manual provisioning (Supabase Studio / SQL), not an open registration form. A public sign-up page would let anyone create an analyst account with read access to all PL+CZ data — flagging this explicitly as a decision to confirm, not assuming it's fine.
- **Password reset / forgot-password flow.**
- **Admin UI to promote analyst → editor** — stays a manual `update profiles set role = 'editor' ...` for now, per the existing accepted decision in `Decisions.md`.
- **SSO / magic link / social login** — email+password only.
- **Removing the `0005_anon_public_read.sql` policy — decided: no.** Anon read-only access stays as-is regardless of this shipping (2026-09-14 decision). Login adds real editor/analyst capability on top; it does not replace or require removing public anon access. Don't conflate "build login" with "force login for everyone."

## What already exists — no new backend/schema work needed

- `profiles` table, `role` check constraint (`editor`/`analyst`), `handle_new_user()` trigger auto-creating a profile row on signup, `is_editor()` RLS helper — all since migration `0001`/`0002`.
- Every RLS policy already keys off `auth.uid()` / `is_editor()`. Once real sessions exist, they just start working correctly — this is purely a frontend session/UI task on top of a backend that's already built.
- One thing to confirm, not build: that email/password sign-in is enabled in Supabase Auth settings on the **cloud** project (local Docker already has it, since the dev stopgap works there).

## File-level breakdown

| File | Change | Owner |
|---|---|---|
| `src/pages/Auth/Login.tsx` (new) | Email/password form → `signInWithPassword`, redirect on success | Himanshu |
| `src/context/AuthContext.tsx` (new) or extend `AppContext.tsx` | Session state: `getSession()` + `onAuthStateChange`; expose `{ user, role, loading, signOut }` | Himanshu |
| `src/components/RequireAuth.tsx` (new) | Route guard around the existing `<Outlet/>` in `App.tsx`; redirect to `/login` with no session | Himanshu |
| `App.tsx` | Add public `/login` route; wrap existing routes in `RequireAuth`; replace the fake role `Select` with real signed-in role + sign-out | Himanshu |
| `PromotionFormModal.tsx`, `Dashboard.tsx` (Add promotion / Bulk upload), `ReviewQueue.tsx` | Hide/disable editor-only actions when role isn't `editor` (UI hint — RLS remains the real boundary) | Himanshu |
| `src/lib/supabaseClient.ts` | No functional change — keep the dev-only `window.supabase` console stopgap for local testing, real login supersedes it for normal use | Gajendra (already owns this file) |
| Supabase Auth settings, cloud project | Confirm email/password provider enabled; decide whether email confirmation is required (likely disable, for POC speed) | Gajendra |

## Sequencing

1. Gajendra: confirm email/password auth is enabled on the cloud project.
2. Himanshu: session/auth context + Login page + route guard — the core unblock.
3. Himanshu: role-gated UI affordances — fast follow, doesn't block #2.
4. ~~Team: revisit `0005_anon_public_read.sql` now that login exists~~ — **resolved, no action**: anon read-only access stays permanently, independent of login (see below).

## Open decisions — need your/team's call, not mine

- Public sign-up allowed at all, or invite-only provisioning? **(still open)**
- Who reviews the 78 pending scraper rows already sitting in the queue, and when — does that wait for this to ship, or happen via the console stopgap in the meantime? **(still open)**
- ~~Should the deployed link require login once this ships, or should read-only anon access stay for pitch demos regardless?~~ **Resolved 2026-09-14: anon read-only access stays as-is, regardless of login status.** `0005_anon_public_read.sql` is not being revisited or removed once this ships — it's a standing decision, not a temporary stopgap tied to this plan.

## Rough sizing

- Core (login + session + route guard): small — roughly a day for someone already familiar with this codebase.
- Role-gated UI polish: a few hours, can trail behind.
- Excluded from sizing: self-serve signup, password reset, promote-to-editor admin UI — all explicitly deferred above.

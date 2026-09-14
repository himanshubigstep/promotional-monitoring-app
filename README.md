# PromoPulse — Sephora Promotional & Competitor Monitor

Competitive intelligence tool for beauty retail: tracks competitor promotions (manual entry, OCR upload, and automated scraping), with a dashboard, calendar/Gantt view, brand analytics, and store comparison. Built as a POC to replace a client's manual Excel-based tracking process.

- **New to this repo?** Read [CLAUDE.md](CLAUDE.md) first — project structure, ownership boundaries, and the required workflow before making changes.
- **Curious why something is built a certain way?** Check [Decisions.md](Decisions.md).
- Frontend is a Create React App (below); backend setup (Supabase) and the scraper are documented in this file too.

## Backend setup (Supabase)

The backend is Postgres + Auth + Storage via Supabase, run locally through Docker — no cloud account needed for local development.

1. Install Docker Desktop and make sure it's running.
2. Start the local stack: `npx supabase start` (first run pulls images, takes a few minutes).
3. Apply the schema and seed data: `npx supabase db reset`.
4. Get your local keys: `npx supabase status`.
5. Copy `.env.local.example` to `.env.local` and fill in `REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_ANON_KEY` from that output.
6. `npm start` as usual.

Schema lives in `supabase/migrations/` (edit these, not the DB directly — run `npx supabase db reset` to reapply). Seed data in `supabase/seed.sql` is generated from `src/data/retailers.ts`, `src/data/brands.ts`, and `src/data/products.json` — regenerate it with `node scripts/generate-seed.js` if those files change, don't hand-edit it.

Local Supabase Studio (DB browser/table editor) runs at the URL printed by `supabase status` (default `http://localhost:54323`).

To point at a real hosted Supabase project later instead of local Docker: create the project at supabase.com, run `npx supabase link`, `npx supabase db push`, and swap the URL/keys in `.env.local` for the cloud project's values — no code changes needed.

## Scraper

Standalone project in `scraper/` — daily automated scan of competitor promo pages, runs via GitHub Actions (`.github/workflows/scrape.yml`), not part of the frontend build.

- Covers Notino, Super-Pharm, Drogerie Natura, and Flaconi. Hebe, Douglas, and Sephora are excluded (bot protection) — see `Decisions.md`.
- Screenshots each retailer's promo page, extracts fields via Gemini vision, writes to `promotions` with `status='pending_review'` for later review.
- Needs three GitHub Actions secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (already set), and `GEMINI_API_KEY` (**not yet set** — add it with `gh secret set GEMINI_API_KEY`).
- Run locally: `cd scraper && npm install && npm run build`, then `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... GEMINI_API_KEY=... npm run scrape`.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

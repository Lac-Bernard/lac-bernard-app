# Lac Bernard Association Website

A bilingual (French/English) website built with Astro and TinaCMS for the Lac Bernard Association.

## 🚀 Tech Stack

- **[Astro](https://astro.build)** - Static site generator with server-side rendering
- **[TinaCMS](https://tina.io)** - Git-based headless CMS for content management
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[MDX](https://mdxjs.com/)** - Markdown with JSX components
- **[Vercel](https://vercel.com)** - Deployment platform
- **[Supabase](https://supabase.com)** - Auth and Postgres for the member account area (optional locally)
- **[Stripe](https://stripe.com)** - Membership checkout and webhooks (production server routes)
- **[Google APIs](https://developers.google.com/workspace)** - Drive (embedded archive browsers) and optional Sheets sync via a service account

## ✨ Features

- ✅ **Bilingual Support** - Full French and English versions of all pages
- ✅ **Content Management** - Edit content directly in the browser with TinaCMS
- ✅ **News/Blog System** - Full-featured news section with Markdown and MDX support
- ✅ **SEO Optimized** - Canonical URLs, OpenGraph data, and sitemap support
- ✅ **RSS Feed** - Automatic RSS feed generation for news posts
- ✅ **Performance** - Optimized for 100/100 Lighthouse scores
- ✅ **Type Safety** - Type-checked content collections with Zod schemas
- ✅ **Server-Side Rendering** - Dynamic content with Astro's SSR capabilities
- ✅ **Member area** - Magic-link sign-in; account and admin routes under `/en/membership/...` and `/fr/membership/...` (backed by Supabase)
- ✅ **Archive folder browsers** - Selected About, Environment, and History pages embed a Drive-backed file list (`/api/drive/list`; needs `GOOGLE_SERVICE_ACCOUNT_JSON` and folder sharing—see [Google service account](#google-service-account-drive-and-sheets))

## 📋 Prerequisites

- Node.js 18+ and npm
- A TinaCMS account (for content editing)
- Git repository (for TinaCMS content versioning)
- [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker (only if you want a **local** Supabase stack for the member area)

## 🛠️ Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lac-bernard-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env` and fill in values. At minimum you need **TinaCMS** credentials for `npm run dev`. For the **member** pages (sign-in, account), set `SUPABASE_URL` and `SUPABASE_ANON_KEY` from your Supabase project (or from `supabase status` when using local Supabase—see below). For **Drive folder embeds** or **Google Sheets sync**, set `GOOGLE_SERVICE_ACCOUNT_JSON` (and related vars)—see [Google service account](#google-service-account-drive-and-sheets).

4. **Start the development server**
   ```bash
   npm run dev
   ```

   This will start both the Astro dev server and TinaCMS admin interface.
   - Astro site: `http://localhost:4321`
   - TinaCMS admin: `http://localhost:4321/admin`

## 📜 Available Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server with TinaCMS at `localhost:4321` |
| `npm run build`           | Builds production site to `./dist/` with TinaCMS |
| `npm run preview`         | Preview production build locally                  |
| `npm run astro ...`       | Run Astro CLI commands (e.g., `astro check`)     |
| `npm run db:seed`         | Regenerate `supabase/seed.sql` with dummy member data (run before `supabase db reset` if you change the script) |
| `npm run db:seed:local`   | `db:seed` then `supabase db reset` (full local DB wipe + migrations + seed) |
| `npm run db:seed:apply`   | Insert dummy rows via Supabase API (needs `ALLOW_DUMMY_SEED_APPLY=1` and `.env` credentials) |
| `npm run db:seed:apply:reset` | Same as `db:seed:apply`, but remove prior dummy seed rows first (`ALLOW_DUMMY_SEED_RESET=1` as well). Not the same as CSV `--reset` — see `node scripts/generate-dummy-seeds.mjs --help` |
| `npm run db:import-members-csv` | Import the association master membership CSV into Supabase (Python deps in a **venv** — see below; needs `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `.env`) |
| `npm run db:import-members-csv:local` | Same, but targets the **local** Docker stack (`supabase start`); credentials come from `supabase status` |

If `npm run build` fails because Tina’s dev port is in use, run `npx astro build` to verify the Astro output only.

## 🗄️ Supabase (optional, local)

For local member auth and data without touching production:

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker.
2. From the repo root: `supabase link` (to your hosted project) if you use remote config, or just `supabase start` for a fully local stack.
3. `supabase db reset` — applies `supabase/migrations/` and then `supabase/seed.sql`.
4. Regenerate dummy seed data when needed: `npm run db:seed`, then `supabase db reset` again.

Use `supabase status` for the local **API URL** and **anon key** to put in `.env`. Magic-link emails in dev are captured by the local mail UI (Inbucket), usually at `http://127.0.0.1:54324`—open the message there and click the link. Redirect URLs for the app are configured in `supabase/config.toml` under `[auth]` (defaults include `http://localhost:4321` for Astro).

**Master membership list (CSV import):** Homebrew / system Python often raises `externally-managed-environment` if you `pip install` globally. Create a **project venv** once, then install deps there:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements-membership-import.txt
```

The npm scripts `db:import-members-csv` / `db:import-members-csv:local` use `scripts/run-membership-import.sh`, which runs **`.venv/bin/python3`** when that file exists, so you do not need to activate the venv for `npm run`. You can still call `.venv/bin/python3 scripts/generate_supabase_csvs.py` directly if you prefer.

After `supabase db reset`, run `npm run db:import-members-csv:local -- /path/to/Master_Membership_List.csv`. To wipe first, **put `--reset` after the `--`** (e.g. `npm run db:import-members-csv -- --reset ./sheet.csv`). If you write `npm run db:import-members-csv --reset ./sheet.csv`, npm never passes `--reset` to the script and old rows remain. The import uses the **service role** key; with `:local`, URL and key come from `supabase status`. For production, use `npm run db:import-members-csv` with credentials in `.env` (or a CI secret).

To match a real sign-in email to a seeded member row, update `primary_email` (or `secondary_email`) in the `members` table in your local DB (Table Editor in local Studio, or SQL).

## Google service account (Drive and Sheets)

The site uses one **Google Cloud service account** (JSON key in `GOOGLE_SERVICE_ACCOUNT_JSON`) for:

- **Embedded Drive folder browsers** on public pages (API route `GET /api/drive/list`)
- **Optional membership → Google Sheets sync** (`GOOGLE_SHEET_ID`, cron, etc.)

**Website access service account (share Drive folders and Sheets with this address):**

`lac-bernard-website-access@lac-bernard-app.iam.gserviceaccount.com`

**In Google Cloud**

- Enable the **Google Drive API** on the project that owns this service account (required for the folder browser API).

**In Google Drive**

- **Link sharing (“anyone with the link”) does not grant the API access.** Each folder whose files should appear in the embedded browser must be shared explicitly with the service account email above, with **Viewer** (or broader if you intentionally need it).
- New top-level folders used on the site must also be added to the allowlist in `src/lib/googleDrive/allowedFolderRoots.ts`.

**Google Sheets**

- If you use the membership sync, share the target spreadsheet with the same service account so it can edit the sheet.

## Membership admin (operator guide)

For volunteers and staff using the **membership dashboard**, **daily summary email**, or **Google Sheets** export (non-technical), see **[docs/admin-membership-guide.md](docs/admin-membership-guide.md)**.

## 📁 Project Structure

```
├── public/                 # Static assets (images, fonts, etc.)
│   └── fonts/             # Custom fonts
├── content/
│   └── pages/             # Site page Markdown (`en/`, `fr/` — loaded by Astro routes)
├── src/
│   ├── assets/           # Image assets
│   ├── components/       # Astro components (BaseHead, Header, Footer, etc.)
│   ├── content/          # Astro content collections
│   │   └── blog/        # News: `en/*.md` and `fr/*.md` (paired slugs)
│   ├── layouts/          # Page layouts
│   ├── lib/              # Server helpers (Supabase, Google Drive allowlist/client, etc.)
│   ├── pages/            # Astro routes (`/en/*`, `/fr/*`; root redirects to `/fr/`)
│   │   ├── en/          # English pages (same path slugs as `fr/`)
│   │   │   ├── about/
│   │   │   ├── community/
│   │   │   ├── environment/
│   │   │   ├── history/
│   │   │   ├── membership/
│   │   │   └── news/
│   │   ├── fr/          # French pages (same English slugs as `en/`)
│   │   └── api/         # API routes (auth, admin, Stripe webhook, Drive list, crons, …)
│   ├── styles/           # Global styles
│   └── utils/            # Shared utilities (e.g. `loadContentPage.ts`)
├── tina/                 # TinaCMS configuration
│   └── config.ts         # CMS schema and settings
├── supabase/             # Supabase CLI: migrations, seed.sql, local config
├── astro.config.mjs       # Astro configuration
├── src/content.config.ts # Content collection schemas
├── vercel.json           # Vercel redirects and cron schedules
└── package.json
```

## 📝 Content Management

### Editing Content with TinaCMS

1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:4321/admin`
3. Log in with your TinaCMS credentials
4. Edit pages and news posts directly in the browser
5. Changes are saved to your Git repository

### Content Collections

- **News Posts** (`src/content/blog/en/` and `src/content/blog/fr/`) - Same filename in each folder for a bilingual pair (e.g. `en/winter-2026-newsletter.md` and `fr/winter-2026-newsletter.md`). Collection entry ids are `en/<slug>` and `fr/<slug>`.

### Adding New News Posts

News posts can be added either:
- Through the TinaCMS admin interface
- Manually by creating `.md` or `.mdx` files in `src/content/blog/en/` and/or `src/content/blog/fr/`

Required frontmatter:
```yaml
---
title: Post Title
description: Post description
pubDate: 2024-01-01
updatedDate: 2024-01-02  # optional
heroImage: ./path/to/image.jpg  # optional
---
```

### Bilingual Content

- **Site page copy (Markdown)** lives in `content/pages/en/` and `content/pages/fr/` (mirrored filenames, e.g. `about.md` in each folder). Astro pages load them via `loadContentPage` in `src/utils/loadContentPage.ts`.
- Both locales use the same English URL slugs; pages live under `/fr/...` and `/en/...` (for example `/fr/about`, `/en/about`)
- The site root `/` redirects to `/fr/`; `vercel.json` lists permanent redirects from legacy French slugs (for example `/a-propos` → `/fr/about`)
- News posts are stored per locale under `src/content/blog/en/` and `src/content/blog/fr/`; public URLs are `/en/news/<slug>` and `/fr/news/<slug>` with the same `<slug>` in both languages when both exist

## 🚢 Deployment

This project is configured for deployment on Vercel with server-side rendering enabled.

### Deploy to Vercel

1. Push your code to GitHub/GitLab/Bitbucket
2. Import the project in Vercel
3. Add environment variables (full list and comments in `.env.example`). Commonly needed:

   - **TinaCMS:** `TINA_CLIENT_ID`, `TINA_TOKEN`
   - **Supabase:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` (you can also set `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` for client bundles); `SUPABASE_SERVICE_ROLE_KEY` for server routes, CSV import, and crons
   - **Stripe (checkout / webhooks):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - **Google (Drive embeds + optional Sheets sync):** `GOOGLE_SERVICE_ACCOUNT_JSON`; `GOOGLE_SHEET_ID` and sharing for sheet sync — see [Google service account](#google-service-account-drive-and-sheets)
   - **Crons:** `CRON_SECRET` must match the `Authorization: Bearer …` header Vercel sends to cron routes. Schedules are in `vercel.json`: `/api/cron/sync-google-sheets` and `/api/cron/membership-admin-daily-summary`
   - **Membership summary email:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MEMBERSHIP_ADMIN_SUMMARY_FROM`, `MEMBERSHIP_ADMIN_SUMMARY_TO` (see `.env.example`)

4. Deploy!

The build process will:
- Generate the TinaCMS admin interface
- Build the Astro site
- Deploy with server-side rendering support

## 🔧 Configuration

### Astro Configuration

Edit `astro.config.mjs` to configure:
- Site URL
- Integrations (MDX, sitemap)
- Output mode and adapter

### TinaCMS Configuration

Edit `tina/config.ts` to:
- Configure content collections
- Set up media management
- Customize the CMS schema

### Content Schemas

Edit `src/content.config.ts` to:
- Define content collection schemas
- Add validation rules
- Configure content loaders

## 📚 Learn More

- [Astro Documentation](https://docs.astro.build)
- [TinaCMS Documentation](https://tina.io/docs)
- [MDX Documentation](https://mdxjs.com)

## 🌐 Site Sections

The site includes the following main sections (available in both French and English):

- **About** - Association information, bylaws, executive committee, committees, archives
- **Membership** - Enrollment and renewal information; member **account** and sign-in at `/en/membership/account` and `/fr/membership/account` (Supabase)
- **Environment** - Water quality, shoreline protection, wildlife, boating, milfoil management
- **History** - Lake history, maps, photos, fishing club, First Nations history
- **Community** - Security information, emergency contacts, regatta
- **News** - Association news and updates
- **Contact** - Contact information

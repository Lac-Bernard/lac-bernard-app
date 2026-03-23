# Lac Bernard Association Website

A bilingual (French/English) website built with Astro and TinaCMS for the Lac Bernard Association.

## 🚀 Tech Stack

- **[Astro](https://astro.build)** - Static site generator with server-side rendering
- **[TinaCMS](https://tina.io)** - Git-based headless CMS for content management
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[MDX](https://mdxjs.com/)** - Markdown with JSX components
- **[Vercel](https://vercel.com)** - Deployment platform

## ✨ Features

- ✅ **Bilingual Support** - Full French and English versions of all pages
- ✅ **Content Management** - Edit content directly in the browser with TinaCMS
- ✅ **News/Blog System** - Full-featured news section with Markdown and MDX support
- ✅ **SEO Optimized** - Canonical URLs, OpenGraph data, and sitemap support
- ✅ **RSS Feed** - Automatic RSS feed generation for news posts
- ✅ **Performance** - Optimized for 100/100 Lighthouse scores
- ✅ **Type Safety** - Type-checked content collections with Zod schemas
- ✅ **Server-Side Rendering** - Dynamic content with Astro's SSR capabilities

## 📋 Prerequisites

- Node.js 18+ and npm
- A TinaCMS account (for content editing)
- Git repository (for TinaCMS content versioning)

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
   
   Create a `.env` file in the root directory with your TinaCMS credentials:
   ```env
   TINA_CLIENT_ID=your_client_id
   TINA_TOKEN=your_token
   ```

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

## 📁 Project Structure

```
├── public/                 # Static assets (images, fonts, etc.)
│   └── fonts/             # Custom fonts
├── src/
│   ├── assets/           # Image assets
│   ├── components/       # Astro components (BaseHead, Header, Footer, etc.)
│   ├── content/          # Astro content collections
│   │   └── blog/        # News: `en/*.md` and `fr/*.md` (paired slugs)
│   ├── layouts/          # Page layouts
│   ├── pages/            # Astro routes (`/en/*`, `/fr/*`; root redirects to `/fr/`)
│   │   ├── en/          # English pages (same path slugs as `fr/`)
│   │   │   ├── about/
│   │   │   ├── community/
│   │   │   ├── environment/
│   │   │   ├── history/
│   │   │   ├── membership/
│   │   │   └── news/
│   │   ├── fr/          # French pages (same English slugs as `en/`)
│   │   └── api/         # API routes
│   └── styles/           # Global styles
├── tina/                 # TinaCMS configuration
│   └── config.ts         # CMS schema and settings
├── astro.config.mjs       # Astro configuration
├── src/content.config.ts # Content collection schemas
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

- **Site page copy (Markdown)** lives in `content/pages/en/` and `content/pages/fr/` (mirrored filenames, e.g. `about.md` in each folder). Astro pages load them via `Astro.glob(...)`.
- Both locales use the same English URL slugs; pages live under `/fr/...` and `/en/...` (for example `/fr/about`, `/en/about`)
- The site root `/` redirects to `/fr/`; `vercel.json` lists permanent redirects from legacy French slugs (for example `/a-propos` → `/fr/about`)
- News posts are stored per locale under `src/content/blog/en/` and `src/content/blog/fr/`; public URLs are `/en/news/<slug>` and `/fr/news/<slug>` with the same `<slug>` in both languages when both exist

## 🚢 Deployment

This project is configured for deployment on Vercel with server-side rendering enabled.

### Deploy to Vercel

1. Push your code to GitHub/GitLab/Bitbucket
2. Import the project in Vercel
3. Add environment variables:
   - `TINA_CLIENT_ID`
   - `TINA_TOKEN`
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
- **Membership** - Enrollment and renewal information
- **Environment** - Water quality, shoreline protection, wildlife, boating, milfoil management
- **History** - Lake history, maps, photos, fishing club, First Nations history
- **Community** - Security information, emergency contacts, regatta
- **News** - Association news and updates
- **Contact** - Contact information

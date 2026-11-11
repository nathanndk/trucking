# PT Genesis Trans Indonesia — website & admin CMS

A single Astro SSR application for PT Genesis Trans Indonesia, a container trucking and logistics company in Jakarta. Six public pages plus article pages, each in Indonesian and English, a protected CMS, local image storage, and a private quotation inbox. The public pages are server-rendered; React is hydrated only for interactive admin forms and controls.

## Local setup

Requires Node.js 22.12+ (tested with 22.23.2), pnpm 12.5.1, and a C/C++ toolchain/Python if a native SQLite binary must be built. On Debian/Ubuntu the build prerequisites are `build-essential python3`. Use the committed pnpm lockfile. All runtime services are self-hosted.

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
openssl rand -base64 48
```

Put the generated value in `BETTER_AUTH_SECRET` in `.env`. Keep `BETTER_AUTH_URL=http://localhost:4321` and use that exact browser origin (not 127.0.0.1). Set an absolute `DATA_DIR` outside the checkout in production. The database defaults to `DATA_DIR/app.db`; `DATABASE_PATH` can override it. Uploads always live in `DATA_DIR/uploads`.

```sh
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Visit **http://localhost:4321**. Seeding is repeatable and never overwrites existing records. The seed holds the company profile, vision, mission and five services from the client brief, in both languages. Details the company has not confirmed yet (address, phone, WhatsApp, year established, clients, projects) are left blank; the public website marks them "Segera diperbarui" / "To be updated" until they are filled in under **Settings**. Photography was supplied by the client; sources are in `assets-src/genesis` and `pnpm images:optimize` regenerates the bundled WebP files.

## First admin

Set `ADMIN_EMAIL`, `ADMIN_NAME`, and a unique `ADMIN_PASSWORD` of at least 12 characters in the local `.env`, then run:

```sh
pnpm admin:bootstrap
```

Sign in at `/admin/login`. Run the command once per administrator, with a different `ADMIN_EMAIL` each time, to create more than one account. Remove `ADMIN_PASSWORD` from `.env` immediately afterward. There are no default credentials and no public signup. Bootstrap refuses to overwrite an existing user. All created accounts have the simple admin role. For recovery, run the separate local `admin:reset` command described below; there is no email/reset service dependency.

## Routes

| Public             | Purpose                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| `/`                | Hero, shipping route, profile, services, container sizes, projects, articles |
| `/about`           | Profile, vision, mission, strengths, company details                         |
| `/services`        | Published services, container sizes, how to order                            |
| `/projects`        | Published projects and client logos                                          |
| `/articles`        | Published articles, newest first                                             |
| `/articles/[slug]` | One article                                                                  |
| `/contact`         | Validated quotation form and contact details                                 |

Every public page also exists in English under `/en` (`/en/about`, `/en/articles/[slug]`, …).

| Admin              | Purpose                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `/admin/login`     | Better Auth email/password login                                     |
| `/admin`           | Overview and recent inquiries                                        |
| `/admin/services`  | Service CRUD, publication, ordering, images                          |
| `/admin/projects`  | Project CRUD, publication, ordering, images                          |
| `/admin/clients`   | Client CRUD, publication, ordering, logos                            |
| `/admin/articles`  | Article CRUD, publication, ordering, images                          |
| `/admin/inquiries` | Private inquiry detail and new/contacted/quoted/closed status        |
| `/admin/settings`  | Company information, contacts, social URLs, logo/favicon, statistics |

Supporting routes: `/api/auth/[...all]`, `/_actions/*`, `/media/[...path]`, `/robots.txt`, `/sitemap.xml`, and a custom 404 page. CMS collection routes share one Astro route template. Slugs are unique per collection and shared by both languages; `id` and `en` are reserved.

## Interface components

Every control on the public website and in the admin comes from [shadcn/ui](https://ui.shadcn.com) (style `new-york`, Radix primitives), added with the shadcn CLI into `src/components/ui`. `components.json` holds the configuration; theme tokens (brand colours, radius, the `dark` scope used by navy sections) live in `src/styles/global.css`. Add or update a component with `pnpm dlx shadcn@latest add <name>`, using `--diff` first when the file has local changes.

- Public pages are Astro files that render shadcn components on the server (`Card`, `Item`, `Empty`, `Badge`, `Breadcrumb`, `AspectRatio`, `buttonVariants` for link buttons). Three parts hydrate React in the browser: the header (the `NavigationMenu` panel that lists the services, and the `Sheet` menu on small screens), the common questions on the home page (`Accordion`), and the quotation form (Kibo UI `choicebox` for the container size). Without JavaScript the pages still read and navigate: the Services link opens the Services page, the quick quote in the hero is a plain GET form, and the first common question is open. The mobile menu does not open, the other answers stay closed, and a container size cannot be chosen on the quote form itself.
- The home page strengths are a [Magic UI](https://magicui.design) `bento-grid` of shadcn `Card`s, and the inner page headers carry a Magic UI `grid-pattern`. Both are static SVG and CSS, added with `pnpm dlx shadcn@latest add @magicui/<name>` into `src/components/ui`. Magic UI components that need the `motion` library are deliberately not used.
- The admin frame is the shadcn `Sidebar` in brand navy, with grouped navigation, item counts and an account menu. The overview leads with what needs attention: quote requests by status (drawn as a route line), a weekly `chart`, and a checklist of details the public website is still missing (`src/lib/dashboard.ts`). Inquiries are a Kibo UI `kanban` board whose cards are dragged between statuses, with a table as the second view. Forms use `Field`, `NativeSelect`, `Checkbox`, `Alert`, `AlertDialog` and `Empty`; lists use Kibo UI `pill` for language and status markers. Kibo UI components live in `src/components/kibo-ui` and are added with `pnpm dlx shadcn@latest add @kibo-ui/<name>`.
- Layout that is specific to this brand (hero, shipping route line, to-scale container boxes, section grids) is plain CSS in the `components` layer of `global.css`, so Tailwind utilities on shadcn components always take precedence.

## Page text

Every heading, button, label and message on the public website can be changed under **Page text** (`/admin/text`), with Indonesian and English side by side. Fields are grouped by page and section; a search box finds wording on any page, and Reset (or clearing a field) returns a text to its default.

The defaults are the dictionaries in `src/i18n/id.ts` and `src/i18n/en.ts`. Only wording an administrator changed is stored, in the `site_copy` table, keyed by dictionary path (`home.h1`, `route.stops.0.title`). `ui()` in `src/lib/copy.ts` lays those edits over the defaults and is what pages call. `src/lib/copy-fields.ts` describes the screen (page → section → field); a unit test fails if a dictionary text is missing from it, so new wording added to the dictionaries must be listed there too. Lists keep their length: the four route steps, five strengths and three ordering steps can be reworded but not added to or removed. Company profile, vision, mission, tagline and button text are company data and stay under Settings → Company text.

## Languages

Indonesian is the default and has no URL prefix; English lives under `/en` (Astro `i18n` in `astro.config.mjs`). Each page body is a component in `src/views/`; the files in `src/pages/` and `src/pages/en/` are thin route wrappers. Interface text is in `src/i18n/id.ts` and `src/i18n/en.ts` (same shape, type-checked). CMS content has paired English fields: the content editor has an Indonesian / English switch above its text fields, and Settings shows the two languages side by side. `getPublicContent` and `getPublicSettings` in `src/lib/repository.ts` return the English value when one was entered and fall back to Indonesian otherwise. The admin interface is English only.

The first page a visitor opens follows their location (`src/lib/geo.ts`, applied in `src/middleware.ts`): arriving on an Indonesian URL from outside the site, a visitor whose address is not allocated to Indonesia is redirected (302) to the English version. Addresses are matched locally against `src/lib/geo/indonesia.json`, built from APNIC's public delegation statistics; refresh it with `pnpm geo:update` a few times a year. No visitor data is sent to a third party. When the address carries no location (local development, or a proxy that does not pass `X-Real-IP` with `TRUST_PROXY=true`), the browser's `Accept-Language` decides instead. Links followed inside the site, including the language switch, are always respected, and the last language is remembered for a year in an HTTP-only `lang` cookie. Search engines and link previews are never redirected. Pages also carry `translate="no"` and `<meta name="google" content="notranslate">`, so browsers do not offer machine translation over the hand-written versions.

The CMS only manages content that the public website shows. The Fleet and Coverage collections from the original template were removed (migration `0002` drops their empty tables); the legacy `vehicle` column on old inquiries is kept.

## CMS workflow

Create a record with the Add button. Use Edit to update copy, upload/replace images, set publication, and change **Sort order** (smaller numbers come first; ID breaks ties). Row menus also provide publish/unpublish and confirmed deletion. Drafts never appear in public queries. Articles are plain text: a blank line starts a new paragraph, and HTML is displayed as text rather than rendered. Articles with the same sort order are listed newest first. Clients support publication as an additional convenience. Coverage uses the shared `title` column for the city name.

Uploads accept JPEG, PNG and WebP up to 5 MB and 40 million decoded pixels. The server checks the decoded type, strips metadata by re-encoding, downsizes to 1920 pixels, and writes randomized WebP filenames. SVG upload is deliberately unsupported. Bundled client SVG illustrations are trusted source assets. Public media can only be served through a validated path with a corresponding database record. Treat any uploaded image as publicly accessible; do not upload confidential material.

Replaced/deleted images are retained briefly to protect open editors. Run `pnpm media:prune` during a maintenance window (stop the app first) to delete images unreferenced for at least 24 hours. Schedule a daily/weekly maintenance job according to your upload volume. Do not run pruning during backups.

## Architecture & database

```text
Browser → Nginx (HTTPS) → Astro Node standalone
                          ├─ Astro public pages
                          ├─ React admin islands / shadcn UI
                          ├─ Astro Actions (mutations)
                          ├─ Better Auth + Drizzle adapter
                          └─ Drizzle + better-sqlite3
                              ├─ persistent app.db (WAL)
                              └─ persistent uploads/
```

Schema: `src/db/schema.ts`. SQL migrations and snapshots: `drizzle/`. Tables: `user`, `session`, `account`, `verification`, `site_settings`, `services`, `projects`, `clients`, `articles`, `inquiries`, `media`, and `rate_limit`. Auth has foreign keys and relevant indexes; content has unique slugs and publication/order indexes; inquiries have a status/date index. SQLite enables foreign keys, WAL and a 5-second busy timeout. Dates use millisecond timestamps.

```sh
pnpm db:generate   # after an intentional schema change; review generated SQL
pnpm db:migrate    # apply tracked migrations; back up production first
```

There is no schema synchronization on server startup and no destructive production push. Deploy code and migrations together. Never place `DATA_DIR` or `DATABASE_PATH` in `dist`, `public`, or a release folder.

## Security & privacy

Better Auth validates sessions server-side. Middleware redirects unauthenticated admin requests, and each protected action independently validates the admin session. All mutations use Zod validation and same-origin checks. URLs and media references are constrained; database queries are parameterized. User text is rendered as text, not raw HTML. Session cookies become Secure on the configured HTTPS origin. Admin/auth responses are private and unindexed. The public website does not link to or name the admin area: there is no footer link, `robots.txt` lists no private paths (the `X-Robots-Tag: noindex` header keeps them out of search results instead), and administrators open `/admin/login` directly. Every action except the public quotation is refused in middleware with a bare 401 for anyone who is not a signed-in administrator, before input validation runs, so error replies do not describe the CMS data model. Basic security headers and a CSP are set in middleware; inline script/style allowances support Astro's hydration and structured metadata, with no eval or external script sources.

Quotation spam protection combines a hidden honeypot, signed minimum-age form token (2 seconds to 2 hours), single-use tokens, and a persistent SQLite rate limit (5 per IP/hour). Login also has a persistent 10-attempt/10-minute limit in addition to Better Auth's limiter. In direct local use, the adapter's client address is used. Set `TRUST_PROXY=true` only with a trusted proxy that **overwrites** `X-Real-IP`, and keep Node bound to loopback. Public quotation responses never return other customers' data. No email is sent automatically; administrators review the inbox. Define a lead-retention policy appropriate to the business and periodically remove expired records through a controlled database maintenance process.

## Checks

```sh
pnpm check
pnpm format:check
pnpm test:unit
pnpm build
pnpm exec playwright install chromium
pnpm test
```

Playwright starts the **production build** on port 4322 with a new temporary database, random secret, and random admin password. It migrates, seeds and bootstraps the test environment, then removes test data. It does not touch the development database. Screenshots, traces and HTML reports are local ignored artifacts. Do not expose reports from a real production database. Unit tests cover database constraints, input validation, signed anti-spam tokens, rate limiting and image validation. There is no separately configured lint tool; `pnpm check` runs Astro diagnostics and strict TypeScript checks.

## Production build & VPS deployment

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm start
```

`pnpm start` reads `.env`. For systemd use the Node entrypoint directly with an external `EnvironmentFile`, as in `deploy/lintas.service`. The server needs runtime `node_modules`, `dist/server`, `dist/client`, and environment configuration. Retain migration/scripts sources and development tooling in the release if you intend to run maintenance commands from it. Do not build with private secrets copied into public variables. Server runtime reads its configuration from `process.env`.

1. Create an unprivileged `lintas` user. Install a supported Node version and pnpm. Build in a release directory such as `/srv/lintas/releases/<release>`; point `/srv/lintas/current` at it.
2. Create `/var/lib/lintas/uploads`, owned by `lintas:lintas`, with directory mode 0700. Use `/var/lib/lintas/app.db`. Parent directories must be writable for SQLite WAL/SHM files. Prefer local SSD storage, not a network filesystem.
3. Copy `deploy/production.env.example` to `/etc/lintas.env`; replace the hostname and secret. Make it readable only by root and the service user (0640 root:lintas). Set `BETTER_AUTH_URL` to the exact canonical HTTPS origin.
4. Run migrations as the service user with that environment. For first installation only, explicitly set `ALLOW_DEMO_SEED=true` to seed, then replace the sample content while access is restricted. Bootstrap the admin with temporary environment credentials. Do not keep the bootstrap password in the service environment.
5. Install `deploy/lintas.service`, adjust the Node executable path if needed, reload systemd and enable/start the service. The service only has write access to `/var/lib/lintas`; builds and dependencies should be read-only to it. The application uses Better Auth sessions, not Astro's optional file-session API.
6. Configure Nginx using `deploy/nginx.conf`. Issue a TLS certificate with your preferred ACME client, then enable the HTTPS block. Validate with `nginx -t` before reloading. Only expose ports 80/443 publicly; port 4321 remains loopback-only. Use one Node process for this SQLite deployment.
7. Fill in the contact details and any remaining placeholders in Settings, test an actual quote and admin login over HTTPS, verify secure cookies, and set up backups before launch.

The proxy applies a 6 MB request-body limit (covering 5 MB images plus multipart overhead), buffers uploads, and overwrites forwarding headers. Do not configure CDN/public caching for admin, actions, auth, or contact pages. The quote token is generated on every page request. Immutable uploaded files may be cached. A domain/TLS certificate and real company data are deployment inputs; no hosting vendor or paid backend is required.

For production maintenance, load `/etc/lintas.env` into the command environment and use `node --import tsx scripts/migrate.ts` (or seed/bootstrap/prune/backup) from the current release. The pnpm helper scripts intentionally read local `.env` for development. Back up before migrations, stop the service for coordinated data changes, and start it again after a successful migration. Keep the previous release for rollback; restore the matching database snapshot if a migration is incompatible with that release.

## Backup & restore

Back up the database **and** uploads together to a directory outside both the application and persistent data tree, for example `/var/backups/lintas`. Never copy only a live `app.db` file while WAL is active.

The included backup command uses SQLite's online backup API and copies uploads, writing a timestamped folder and manifest:

```sh
BACKUP_DIR=/absolute/external/backup-folder pnpm backup
```

For a strictly matched snapshot, stop the application and any pruning job first, run the backup as a user with read access to the data and write access to the backup destination, then restart the service. The backup script refuses destinations inside the application or `DATA_DIR`. Backup directories are created private (0700). Automate daily backups using a systemd timer or your existing backup tooling, retain e.g. 7 daily and 4 weekly snapshots, and copy encrypted snapshots to a second machine/location. Monitor backup failures and test restoration periodically.

Restore procedure:

1. Stop the Node service and all maintenance jobs. Preserve the current data directory elsewhere as an emergency rollback.
2. Restore `app.db` from a chosen snapshot to the configured `DATABASE_PATH`. Restore that same snapshot's `uploads/` to `DATA_DIR/uploads/`. Do not combine dates.
3. Remove stale `app.db-wal` and `app.db-shm` only while the server is stopped and after the old database has been moved aside. The online-backup output is a complete standalone database.
4. Restore ownership to `lintas:lintas`, directories to 0700 and data files to 0600. Keep the external environment secret available; it is backed up separately in a secure secrets store, not in the repository.
5. Check SQLite with `PRAGMA integrity_check`, deploy the matching application release, and apply any newer reviewed migrations if required.
6. Start the service, test login, view a restored image, and submit/read a test inquiry. A secret change invalidates old sessions and requires signing in again.

## Scope & extension points

This is a profile/CMS, not an ERP. No customer accounts, dispatch, GPS, billing, or payment services. Content uses plain text rather than a rich-text editor. Recovery is an operator command; automated email notifications, MFA, and advanced roles are not configured. Public font and photo assets are local. Third-party UI adaptations and photo sources are recorded in `docs/credits.md`.

### Operator password recovery

With shell access to the VPS, set `ADMIN_EMAIL` and a new `ADMIN_PASSWORD` in a temporary protected environment, then run `pnpm admin:reset` locally or `node --import tsx scripts/reset-admin.ts` with the production environment. The command resets the existing credential account and revokes all of that admin's sessions. It does not create an account or expose a public recovery endpoint. Remove the temporary password immediately.

See [the verification report](docs/verification.md) for acceptance results and [screenshots](docs/screenshots/) for the finished public and admin layouts.

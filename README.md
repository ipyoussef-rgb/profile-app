# profile-app

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fipyoussef-rgb%2Fprofile-app&env=KOBIL_IDP_ISSUER,KOBIL_MINIAPP_CLIENT_ID,KOBIL_MINIAPP_CLIENT_SECRET,AUTH_SECRET,APP_BASE_URL,PRIVACY_NOTICE_VERSION&envDescription=See%20README%20%23%23%20KOBIL%20Identity%20section%20for%20what%20each%20variable%20is.&envLink=https%3A%2F%2Fgithub.com%2Fipyoussef-rgb%2Fprofile-app%23environment-variables&project-name=profile-app&repository-name=profile-app)

A GDPR-aware User Profile miniapp for the KOBIL superapp.

KOBIL Identity is the source of truth for authentication and identity data.
This service owns user-editable product profile data, privacy/consent ledger,
GDPR export, deletion workflow, and an immutable audit log. eID and age
verification are explicitly **out of scope** for this build.

## Stack

- Next.js 15 (App Router) · React 19 · Tailwind v4
- KOBIL Identity OIDC (Authorization Code + PKCE) via `openid-client` v6
- `jose`-signed HTTP-only session cookies (terbuch pattern)
- Prisma 6 · PostgreSQL (Neon)
- `zod` validation · `isomorphic-dompurify` text sanitization
- Deploy: Vercel (single Next.js app)

## Endpoints

| Method | Path                          | Purpose |
|--------|-------------------------------|---|
| GET    | `/api/me/profile`             | Current user's profile (token identity fields read-only) |
| PATCH  | `/api/me/profile`             | Update editable profile fields (strict allowlist) |
| DELETE | `/api/me/profile`             | Request deletion; anonymizes profile data |
| GET    | `/api/me/profile/export`      | GDPR JSON export (download) |
| GET    | `/api/me/privacy/consents`    | Latest consent state per purpose |
| PATCH  | `/api/me/privacy/consents`    | Append immutable consent events |
| GET    | `/api/me/privacy/requests`    | List user's privacy/GDPR requests |
| GET    | `/api/auth/login`             | Start OIDC PKCE flow |
| GET    | `/api/auth/callback`          | OIDC callback (set session cookie) |
| GET    | `/api/auth/logout`            | Clear session + KOBIL end-session |

## Screens

User-facing (require `profile_session` cookie via KOBIL login):

1. **`/profile`** — overview with read-only KOBIL Identity fields
2. **`/profile/edit`** — edit profile (whitelisted fields only)
3. **`/profile/attributes`** — pick from admin-managed catalogs (e.g. personal interests)
4. **`/profile/verified`** — identity + age verification status, "Verify with AusweisApp" button
5. **`/profile/privacy`** — manage consent toggles
6. **`/profile/data-and-account`** — export, request deletion, request history

Admin (require `profile_admin_session` cookie + `profile_admin` realm role):

1. **`/admin`** — dashboard tiles
2. **`/admin/audit/users`** — paged user-activity log
3. **`/admin/audit/admin`** — paged admin-activity log (auto-logs every admin view)
4. **`/admin/catalogs`** + **`/admin/catalogs/[slug]`** — create catalogs, add/edit/deactivate values

## KOBIL Identity — what an admin needs to configure

### Realm

A single Keycloak realm. Provide:

- `KOBIL_IDP_ISSUER` — e.g. `https://idp.<tenant>.kobil.com/auth/realms/<realm>`

### Three OIDC clients (same realm)

1. **`profile-miniapp`** (end users)
   - Confidential, Standard Flow ON, Service Accounts OFF, PKCE S256
   - Valid Redirect URIs:
     `https://<vercel-domain>/api/auth/callback`,
     `http://localhost:3000/api/auth/callback`
   - Post-Logout Redirect URIs: `https://<vercel-domain>/`, `http://localhost:3000/`
   - Login Theme: **leave empty** (avoids `displayWide` macro 500)
   - Access-token claims: only `sub`, `preferred_username`, `email`, `email_verified`

2. **`profile-admin`** (staff — for `/admin/*`)
   - Confidential, Standard Flow ON, Service Accounts OFF, PKCE S256
   - Valid Redirect URIs:
     `https://<vercel-domain>/api/admin/auth/callback`,
     `http://localhost:3000/api/admin/auth/callback`
   - Required realm role: **`profile_admin`** — assign to admin users
   - Mapper: include `realm_access.roles` in the access token (default in Keycloak)

3. **`profile-service`** (server-to-server)
   - Confidential, Service Accounts ON, Standard Flow OFF, `client_credentials`
   - Required for: IDP prefill (`getUserInfo`) and sync-back (`updateProfileUser`)
   - Service-account roles: read + write user attributes per
     [KOBIL IDP Users API](https://developer.kobil.com/api/idp#tag/Users)

### Recommended but optional

- Realm role `profile_admin` for future privileged read access.
  Default-deny applies until explicitly allowed by the backend.

### KOBIL branding assets

Drop the following into `src/components/layout/KobilLogo.tsx` and
`src/app/globals.css`:

- KOBIL primary / secondary brand color (hex)
- KOBIL logo SVG (light + dark)
- KOBIL font (file or Google Fonts name)

## Environment variables

Copy `.env.example` to `.env` and fill in:

```
KOBIL_IDP_ISSUER=
KOBIL_MINIAPP_CLIENT_ID=
KOBIL_MINIAPP_CLIENT_SECRET=
KOBIL_ADMIN_CLIENT_ID=                # optional — admin UI disabled if unset
KOBIL_ADMIN_CLIENT_SECRET=
KOBIL_ADMIN_ROLE=profile_admin
KOBIL_SERVICE_CLIENT_ID=              # optional — IDP prefill/sync disabled if unset
KOBIL_SERVICE_CLIENT_SECRET=
KOBIL_IDP_USERS_API=                  # optional override (default: <issuer>/users)
EID_PROVIDER=mock                     # mock | kobil | ausweisident
AUTH_SECRET=                          # openssl rand -base64 48
APP_BASE_URL=http://localhost:3000    # or https://<your-vercel-domain>
DATABASE_URL=                         # Neon pooled URL (host contains "-pooler")
DATABASE_URL_UNPOOLED=                # Neon direct URL (no "-pooler") — for migrations
PRIVACY_NOTICE_VERSION=2026-05-14
```

## Local development

```bash
npm install
npx prisma migrate dev     # creates the DB schema
npm run dev
```

Open <http://localhost:3000>.

## Vercel deployment

The repo includes a `vercel.json` that runs `prisma migrate deploy` as part of
the Vercel build, so the database schema is created/updated automatically on
every deploy. If `DATABASE_URL` is missing or unreachable, the build prints a
warning and continues (the site boots; DB-backed routes 500 until you fix
`DATABASE_URL`).

1. **Push** this repo to GitHub.
2. **Import** the project at <https://vercel.com/new> (or use the *Deploy with
   Vercel* button above).
3. **Provision Neon Postgres**: in the Vercel project → *Storage* → *Create
   Database* → *Neon*. The integration auto-injects `DATABASE_URL` (pooled)
   and `DATABASE_URL_UNPOOLED` (direct) — Prisma uses both directly, no manual
   copy needed.
4. **Set environment variables** in the Vercel project settings:
   - `KOBIL_IDP_ISSUER`
   - `KOBIL_MINIAPP_CLIENT_ID` + `KOBIL_MINIAPP_CLIENT_SECRET`
   - `KOBIL_ADMIN_CLIENT_ID` + `KOBIL_ADMIN_CLIENT_SECRET` *(optional, for `/admin/*`)*
   - `KOBIL_SERVICE_CLIENT_ID` + `KOBIL_SERVICE_CLIENT_SECRET` *(optional, for IDP prefill/sync)*
   - `KOBIL_ADMIN_ROLE=profile_admin`
   - `EID_PROVIDER=mock` *(switch to `kobil` / `ausweisident` when a real eID-Service is wired)*
   - `AUTH_SECRET` (generate with `openssl rand -base64 48`)
   - `APP_BASE_URL` = your production domain (e.g.
     `https://profile-app.vercel.app`)
   - `PRIVACY_NOTICE_VERSION=2026-05-14`
5. **Register the redirect URIs** in KOBIL Identity (per client — see "Three OIDC clients" above):
   `https://<your-vercel-domain>/api/auth/callback`.
6. **Redeploy**. The build runs `prisma migrate deploy`, creating the schema on
   the first deploy. Visit your domain → it redirects to `/api/auth/login` →
   KOBIL Identity → back to `/profile`.

## Security & GDPR posture

- KOBIL Identity-owned fields (`email`, `username`, `email_verified`, `password`,
  `roles`, `groups`, MFA) are **never** persisted; reads come from the token.
- `PATCH /me/profile` uses a strict zod allowlist; unknown keys → 422.
- Free-text fields (`display_name`, `bio`) are sanitized server-side
  (DOMPurify) before storage.
- Consent records are **append-only** — `PATCH /me/privacy/consents` only
  inserts new rows.
- Deletion anonymizes the profile row and inserts a `privacy_requests` record;
  audit logs are preserved.
- Default-deny: every `/me/*` route uses `request.user.sub` as the implicit
  identifier — no path takes a `user_id` parameter.
- Rate limits: profile PATCH 30/h, export 3/h, delete 1/day, consent PATCH 60/h
  per user (in-memory; consider Redis/Vercel KV for multi-instance).
- Logs redact tokens, `Authorization`, free-text profile fields, phone, address.

## Out of scope

- eID and age verification, verification webhooks, verified-claim storage
  (all explicitly removed from scope at the user's request).
- Admin console.
- Embedded-mode bootstrap. `lib/session.ts` is the seam for it; flip
  `PROFILE_EMBED_MODE=1` and replace `getSession()` with a host-injected
  token reader.

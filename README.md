# profile-app

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

1. **`/profile`** — overview with read-only KOBIL Identity fields
2. **`/profile/edit`** — edit profile (whitelisted fields only)
3. **`/profile/privacy`** — manage consent toggles
4. **`/profile/data-and-account`** — export, request deletion, request history

## KOBIL Identity — what an admin needs to configure

### Realm

A single Keycloak realm. Provide:

- `KOBIL_IDP_ISSUER` — e.g. `https://idp.<tenant>.kobil.com/auth/realms/<realm>`

### Two OIDC clients (same realm)

1. **`profile-miniapp`** (browser-facing, standalone OIDC)
   - Access type: **Confidential**
   - Standard Flow Enabled: **ON** (Authorization Code)
   - Service Accounts: **OFF**
   - PKCE Code Challenge Method: **S256**
   - Valid Redirect URIs (exact match — register both):
     - `https://<your-vercel-domain>/api/auth/callback`
     - `http://localhost:3000/api/auth/callback`
   - Valid Post Logout Redirect URIs:
     - `https://<your-vercel-domain>/`
     - `http://localhost:3000/`
   - Web Origins: same as above
   - Login Theme: **leave empty** (avoids the `displayWide` macro 500)
   - Access-token claims: include only `sub`, `preferred_username`, `email`,
     `email_verified`. **Do not** add rich profile attributes to the access token.

2. **`profile-service`** (server-to-server, reserved for future calls — optional now)
   - Access type: **Confidential**
   - Service Accounts Enabled: **ON** (`client_credentials`)
   - Standard Flow Enabled: **OFF**

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
AUTH_SECRET=                          # openssl rand -base64 48
APP_BASE_URL=http://localhost:3000    # or https://<your-vercel-domain>
DATABASE_URL=                         # Neon pooled URL
DIRECT_DATABASE_URL=                  # Neon direct URL (for migrations)
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

1. **Push** this repo to GitHub.
2. **Import** the project at <https://vercel.com/new>.
3. **Provision Neon Postgres**: in the Vercel project → *Storage* → *Create
   Database* → *Neon*. Vercel auto-injects `DATABASE_URL` (pooled) and a
   `*_URL_NON_POOLING` (use this for `DIRECT_DATABASE_URL`).
4. **Set environment variables** in the Vercel project settings:
   - `KOBIL_IDP_ISSUER`
   - `KOBIL_MINIAPP_CLIENT_ID`
   - `KOBIL_MINIAPP_CLIENT_SECRET`
   - `AUTH_SECRET` (generate with `openssl rand -base64 48`)
   - `APP_BASE_URL` = your production domain (e.g.
     `https://profile-app.vercel.app`)
   - `DIRECT_DATABASE_URL` (paste the `*_URL_NON_POOLING` value)
   - `PRIVACY_NOTICE_VERSION=2026-05-14`
5. **Register the redirect URI** in KOBIL Identity:
   `https://<your-vercel-domain>/api/auth/callback`.
6. **Run migrations** once after the first deploy:
   ```bash
   npx vercel env pull .env.production.local
   npx prisma migrate deploy
   ```
7. **Redeploy**. Visit your domain → it redirects to `/api/auth/login` →
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

# ChatCoat Admin

Standalone admin dashboard for the ChatCoat SaaS. Separate repo, separate
Vercel deployment, separate domain — it talks to the main ChatCoat API
(same backend, same database).

## What it does

- **Overview** — live counts: organizations, users, subscriptions, trials, suspensions, staff.
- **Plans** — create/edit/deactivate plans. Limits and prices are read by the
  API at request time, so changes take effect immediately with no deploy.
- **Organizations** — search, plan assignment (overrides Paddle), per-metric
  limit overrides, suspend/unsuspend, per-org usage.
- **Staff** — invite team members by e-mail with roles
  (super_admin → billing → support → readonly). Invites bind on first sign-in.
- **Audit log** — every admin write, with actor, action, and changes.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — from the **same** Clerk application
     as the main ChatCoat web app (Clerk Dashboard → API Keys). Staff sign in
     with their existing ChatCoat identity.
   - `NEXT_PUBLIC_API_URL` — the ChatCoat API base URL
     (defaults to the production Render API).
3. `npm run dev`

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Import it in Vercel as a new project.
3. Set the two env vars above.
4. Attach your domain (e.g. `admin.chatcoat.com`).

## First admin access

Set `ADMIN_EMAILS` on the **API** (Render → Environment) to your e-mail
address, e.g. `ADMIN_EMAILS=you@example.com`. On your first visit you become
`super_admin` automatically. Afterwards, manage staff from the Staff page
(the env var is only a bootstrap).

## Auth model

Pages call `GET /api/admin/me` on the ChatCoat API with the Clerk session
token as `Bearer`. The backend verifies the token and checks the
`staff_users` table. Non-staff see "Admin access required". Suspended
workspaces are blocked API-wide and cannot reach this dashboard's data.

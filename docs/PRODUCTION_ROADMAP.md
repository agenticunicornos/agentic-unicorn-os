# Production Roadmap

Agentic Unicorn OS is moving from founder MVP to a globally usable product. This roadmap keeps the order strict: data foundation first, then collaboration, operations, compliance and global readiness. Billing and Stripe are intentionally out of scope.

## 1. Data Foundation

Status: in progress.

- Supabase Auth is live.
- The app now supports Postgres/RLS as the primary scalable workspace backend when `supabase/schema.sql` is applied.
- Auth metadata remains as a no-downtime fallback while the Postgres migration is not applied.
- The product now includes a Team surface for workspace identity, staged invitations, members and audit events.
- Next: execute `supabase/schema.sql` in production and verify the app runs in Postgres mode.

## 2. Multi-Tenant Product

Required before broad public launch:

- Organizations and workspaces.
- Roles: owner, admin, member, viewer.
- Invitations by email.
- Audit log for every create, update and delete.
- Workspace export and delete.

## 3. Reliability

Required before broad public usage:

- End-to-end tests for signup, login, action CRUD, pipeline CRUD and notes.
- Error reporting.
- Uptime monitoring.
- Database backups and restore drill.
- Rate limits around auth and write-heavy actions.

## 4. Public Access Layer

Required before broad no-billing launch:

- Clear public onboarding.
- Account creation flow hardened against abuse.
- Workspace limits enforced without payment logic or Stripe.
- Invite-only or waitlist option for controlled rollout.
- Admin-controlled access states: active, suspended, deleted.

## 5. Global Readiness

Required before international distribution:

- English-first UI, then French localization.
- Timezone-safe dates.
- Accessibility pass.
- Mobile workflow review.
- Legal pages: Terms, Privacy, Security.

## 6. Enterprise Readiness

Required for larger customers:

- Postgres-only workspace persistence.
- Row Level Security tests.
- Admin console.
- SSO/SAML path.
- Data Processing Agreement.
- Incident response process.

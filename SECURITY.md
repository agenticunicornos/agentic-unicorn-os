# Security

## Current production posture

- Authentication is handled by Supabase Auth.
- User workspaces are scoped to the signed-in Supabase user.
- The application supports Postgres/RLS workspace persistence as the scalable primary backend when `supabase/schema.sql` is applied.
- The schema includes organizations, members, invitations and audit events for multi-tenant control without a billing layer.
- Supabase Auth metadata is kept only as a no-downtime fallback while the Postgres migration is not active.
- The frontend only uses Supabase publishable keys.
- LLM provider keys are server-side only through Netlify Functions and are never exposed in the browser bundle.
- No service-role key, private token, OAuth secret, or SSH private key is committed to the repository.
- Local environment files are ignored through `.gitignore`.
- Dependency audit currently reports zero known moderate-or-higher vulnerabilities.

## Deployment secrets

Production configuration lives in Netlify environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `LLM_PROVIDER`
- `LLM_MODEL`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`

Do not commit `.env.local`, `.env.production.local`, Netlify tokens, Supabase service-role keys, LLM API keys, or SSH keys.

## Next hardening step

For enterprise-grade multi-user data governance, run production in Postgres-only mode, add organization roles, audit logs, RLS tests and workspace export/delete controls.

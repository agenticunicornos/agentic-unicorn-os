# Security

## Current production posture

- Authentication is handled by Supabase Auth.
- User workspaces are scoped to the signed-in Supabase user.
- The frontend only uses Supabase publishable keys.
- No service-role key, private token, OAuth secret, or SSH private key is committed to the repository.
- Local environment files are ignored through `.gitignore`.
- Dependency audit currently reports zero known moderate-or-higher vulnerabilities.

## Deployment secrets

Production configuration lives in Netlify environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Do not commit `.env.local`, `.env.production.local`, Netlify tokens, Supabase service-role keys, or SSH keys.

## Next hardening step

For enterprise-grade multi-user data governance, move workspace records from Supabase Auth metadata into the Postgres tables described in `supabase/schema.sql`, with Row Level Security enabled per `auth.uid()`.

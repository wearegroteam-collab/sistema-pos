Supabase setup for Sistema POS

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for server-side invitation email sending
- `SUPABASE_DB_URL` if applying migrations with `psql`

Apply migrations:

1. Link the project with Supabase CLI, or set `SUPABASE_DB_URL`.
2. Run migrations in order from `supabase/migrations`.

Email auth:

- Enable Email provider in Supabase Auth.
- Configure Authentication > URL Configuration:
  - Site URL: `https://TU-DOMINIO.vercel.app`
  - Redirect URL: `https://TU-DOMINIO.vercel.app/auth/callback`
  - Redirect URL: `https://TU-DOMINIO.vercel.app/set-password`
- The `invite-user` Edge Function sends invitations and recovery links to `${SITE_URL}/auth/callback`.
- `/auth/callback` creates the Supabase session from the invite/recovery link.
- `/set-password` lets the user create a password, then redirects by role from `business_users`.

Security:

- All operational tables include `business_id`.
- RLS uses `business_users` to separate tenants.
- `super_admin` can see all businesses.
- `admin` and `cashier` are restricted to their assigned business.
- Reports should filter `test_mode = false` by default.

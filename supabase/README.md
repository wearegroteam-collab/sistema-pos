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
- For admin/cashier invitations, create a row in `invitations`, then call Supabase Auth Admin API `inviteUserByEmail` or `generateLink`.
- After the invited user signs in, call `accept_invitation(token)` to attach the user to `business_users`.

Security:

- All operational tables include `business_id`.
- RLS uses `business_users` to separate tenants.
- `super_admin` can see all businesses.
- `admin` and `cashier` are restricted to their assigned business.
- Reports should filter `test_mode = false` by default.

# Sistema POS

## Supabase Authentication URL Configuration

En Supabase, entra a **Authentication > URL Configuration** y configura:

- **Site URL:** `https://TU-DOMINIO.vercel.app`
- **Redirect URL:** `https://TU-DOMINIO.vercel.app/auth/callback`
- **Redirect URL:** `https://TU-DOMINIO.vercel.app/set-password`

La Edge Function `invite-user` lee el secret `SITE_URL` y envia invitaciones/restablecimientos a:

```text
${SITE_URL}/auth/callback
```

Ejemplo para Vercel:

```text
SITE_URL=https://TU-DOMINIO.vercel.app
```

El flujo esperado es:

1. El usuario abre el enlace del correo.
2. Supabase redirige a `/auth/callback`.
3. La app crea la sesion con los tokens del enlace.
4. La app redirige a `/set-password`.
5. El usuario crea contrasena.
6. La app detecta el rol en `business_users` y redirige a `/super-admin`, `/pos` o `/pos/mesas`.

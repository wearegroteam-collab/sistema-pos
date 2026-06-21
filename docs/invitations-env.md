# Variables para invitaciones

El cliente nunca debe usar `SUPABASE_SERVICE_ROLE_KEY`. Las invitaciones se envian desde la Edge Function `invite-user`.

## Vercel

Configura estas variables para la app:

```text
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
```

## Supabase Edge Function

Configura estos secrets para la funcion `invite-user`:

```text
SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
SITE_URL=https://TU-DOMINIO.vercel.app
```

Comando recomendado:

```bash
supabase secrets set SUPABASE_URL=https://TU_PROYECTO.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
supabase secrets set SITE_URL=https://TU-DOMINIO.vercel.app
```

Luego despliega:

```bash
supabase functions deploy invite-user
```

La funcion maneja:

- Crear negocio real o demo.
- Crear invitacion admin.
- Enviar email real con Supabase Auth.
- Si el usuario ya existe, vincularlo al negocio y enviar correo de recuperacion/restablecimiento.
- Reenviar invitacion admin.

## URLs de autenticacion en Supabase

En **Authentication > URL Configuration** agrega:

```text
Site URL: https://TU-DOMINIO.vercel.app
Redirect URL: https://TU-DOMINIO.vercel.app/auth/callback
Redirect URL: https://TU-DOMINIO.vercel.app/set-password
```

La funcion `invite-user` siempre envia el enlace a `${SITE_URL}/auth/callback`. Esa ruta crea la sesion y luego envia al usuario a `/set-password` para definir su contrasena.

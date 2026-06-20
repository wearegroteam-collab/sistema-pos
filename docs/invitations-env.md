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
SITE_URL=https://TU_DOMINIO.com
```

Comando recomendado:

```bash
supabase secrets set SUPABASE_URL=https://TU_PROYECTO.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
supabase secrets set SITE_URL=https://TU_DOMINIO.com
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

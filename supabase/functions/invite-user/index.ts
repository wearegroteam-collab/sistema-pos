import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type InviteBody = {
  business_id: string;
  email: string;
  role: "admin" | "cashier";
  permissions?: Record<string, unknown>;
  redirect_to?: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const callerJwt = req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!supabaseUrl || !serviceRoleKey || !callerJwt) {
    return new Response("Missing environment or authorization", { status: 401 });
  }

  const body = (await req.json()) as InviteBody;
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const caller = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${callerJwt}` } }
  });

  const { data: allowed, error: allowedError } = await caller.rpc("is_business_admin", {
    target_business_id: body.business_id
  });

  if (allowedError || !allowed) {
    return new Response("Not allowed", { status: 403 });
  }

  const { data: invite, error: inviteError } = await admin
    .from("invitations")
    .insert({
      business_id: body.business_id,
      email: body.email.toLowerCase(),
      role: body.role,
      permissions: body.permissions ?? {},
      status: "pending"
    })
    .select("id")
    .single();

  if (inviteError) {
    return new Response(inviteError.message, { status: 400 });
  }

  const { error: authError } = await admin.auth.admin.inviteUserByEmail(body.email, {
    redirectTo: body.redirect_to
  });

  if (authError) {
    return new Response(authError.message, { status: 400 });
  }

  return Response.json({ invitation_id: invite.id, sent: true });
});

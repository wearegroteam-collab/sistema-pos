import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AppRole = "admin" | "cashier";
type InviteStatus = "sent" | "reset_sent" | "linked" | "error";

type CreateBusinessBody = {
  action: "create_business";
  business_name: string;
  admin_email: string;
  phone?: string | null;
  is_demo?: boolean;
  redirect_to?: string;
};

type InviteUserBody = {
  action?: "invite_user";
  business_id: string;
  email: string;
  role: AppRole;
  permissions?: Record<string, unknown>;
  redirect_to?: string;
};

type ResendAdminBody = {
  action: "resend_admin_invitation";
  business_id: string;
  redirect_to?: string;
};

type InviteBody = CreateBusinessBody | InviteUserBody | ResendAdminBody;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const fullPermissions = {
  viewTables: true,
  createOrders: true,
  confirmKitchen: true,
  chargeOrders: true,
  openShift: true,
  closeShift: true,
  viewOrders: true,
  applyDiscounts: true,
  cancelOrders: true,
  removeOrderItems: true,
  editAfterKitchen: true,
  viewReports: true,
  modifyMenu: true,
  modifySettings: true
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}

function redirectTo(bodyRedirect?: string) {
  const siteUrl = Deno.env.get("SITE_URL");
  return bodyRedirect ?? (siteUrl ? `${siteUrl.replace(/\/$/, "")}/pos` : undefined);
}

async function findAuthUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  const normalized = email.toLowerCase();
  let page = 1;
  while (page < 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === normalized);
    if (user) return user;
    if (data.users.length < 100) return null;
    page += 1;
  }
  return null;
}

async function sendInviteOrReset(admin: ReturnType<typeof createClient>, email: string, redirect?: string): Promise<{ userId: string | null; status: InviteStatus; message?: string }> {
  const existingUser = await findAuthUserByEmail(admin, email);
  if (existingUser) {
    const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo: redirect });
    if (error) return { userId: existingUser.id, status: "error", message: error.message };
    return { userId: existingUser.id, status: "reset_sent" };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: redirect });
  if (error) return { userId: null, status: "error", message: error.message };
  return { userId: data.user?.id ?? null, status: "sent" };
}

async function assertSuperAdmin(caller: ReturnType<typeof createClient>) {
  const { data, error } = await caller.rpc("is_super_admin");
  if (error || !data) throw new Error("Not allowed");
}

async function assertBusinessAdmin(caller: ReturnType<typeof createClient>, businessId: string) {
  const { data, error } = await caller.rpc("is_business_admin", { target_business_id: businessId });
  if (error || !data) throw new Error("Not allowed");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const siteUrl = Deno.env.get("SITE_URL");
  const callerJwt = req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!supabaseUrl || !serviceRoleKey || !siteUrl) {
    return json({ error: "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SITE_URL" }, 500);
  }
  if (!callerJwt) return json({ error: "Missing authorization" }, 401);

  const body = (await req.json()) as InviteBody;
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const caller = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${callerJwt}` } }
  });

  try {
    if (body.action === "create_business") {
      await assertSuperAdmin(caller);
      const adminEmail = body.admin_email.toLowerCase().trim();

      const { data: business, error: businessError } = await admin
        .from("businesses")
        .insert({
          name: body.business_name.trim(),
          email: adminEmail,
          phone: body.phone ?? null,
          status: "active",
          demo: Boolean(body.is_demo),
          test_mode: true,
          onboarding_completed: Boolean(body.is_demo)
        })
        .select("id,name,email,phone,status,demo,test_mode,onboarding_completed,onboarding_skipped,created_at")
        .single();

      if (businessError) return json({ error: businessError.message }, 400);

      await admin.from("settings").insert({ business_id: business.id });

      const authResult = await sendInviteOrReset(admin, adminEmail, redirectTo(body.redirect_to));
      if (authResult.status === "error") return json({ error: authResult.message, business_id: business.id }, 400);

      const { data: invitation, error: invitationError } = await admin
        .from("invitations")
        .insert({
          business_id: business.id,
          email: adminEmail,
          role: "admin",
          permissions: fullPermissions,
          status: "pending"
        })
        .select("id,status")
        .single();

      if (invitationError) return json({ error: invitationError.message, business_id: business.id }, 400);

      if (authResult.userId) {
        await admin.from("business_users").upsert({
          business_id: business.id,
          user_id: authResult.userId,
          email: adminEmail,
          full_name: adminEmail,
          role: "admin",
          status: "active",
          permissions: fullPermissions
        }, { onConflict: "business_id,user_id" });
      }

      return json({ business, invitation_id: invitation.id, invite_status: authResult.status });
    }

    if (body.action === "resend_admin_invitation") {
      await assertSuperAdmin(caller);
      const { data: invite, error: inviteError } = await admin
        .from("invitations")
        .select("id,business_id,email,role")
        .eq("business_id", body.business_id)
        .eq("role", "admin")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (inviteError || !invite) return json({ error: "No admin invitation found" }, 404);
      const authResult = await sendInviteOrReset(admin, invite.email, redirectTo(body.redirect_to));
      if (authResult.status === "error") return json({ error: authResult.message }, 400);

      await admin.from("invitations").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", invite.id);
      if (authResult.userId) {
        await admin.from("business_users").upsert({
          business_id: invite.business_id,
          user_id: authResult.userId,
          email: invite.email,
          full_name: invite.email,
          role: "admin",
          status: "active",
          permissions: fullPermissions
        }, { onConflict: "business_id,user_id" });
      }
      return json({ invitation_id: invite.id, invite_status: authResult.status });
    }

    await assertBusinessAdmin(caller, body.business_id);
    const email = body.email.toLowerCase().trim();
    const role = body.role;
    const permissions = body.permissions ?? {};
    const authResult = await sendInviteOrReset(admin, email, redirectTo(body.redirect_to));
    if (authResult.status === "error") return json({ error: authResult.message }, 400);

    const { data: invite, error: inviteError } = await admin
      .from("invitations")
      .insert({ business_id: body.business_id, email, role, permissions, status: "pending" })
      .select("id")
      .single();

    if (inviteError) return json({ error: inviteError.message }, 400);

    if (authResult.userId) {
      await admin.from("business_users").upsert({
        business_id: body.business_id,
        user_id: authResult.userId,
        email,
        full_name: email,
        role,
        status: "active",
        permissions
      }, { onConflict: "business_id,user_id" });
    }

    return json({ invitation_id: invite.id, invite_status: authResult.status });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 403);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AppRole = "admin" | "cashier";
type InviteStatus = "sent" | "reset_sent" | "error";

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

function log(requestId: string, stage: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ request_id: requestId, stage, ...data }));
}

function logError(requestId: string, stage: string, data: Record<string, unknown> = {}) {
  console.error(JSON.stringify({ request_id: requestId, stage, ...data }));
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}

function errorResponse(requestId: string, status: number, code: string, message: string, details?: unknown) {
  logError(requestId, code, { status, message, details });
  return json({ ok: false, code, error: message, details, request_id: requestId }, status);
}

function successResponse(requestId: string, data: Record<string, unknown>) {
  log(requestId, "response_final", data);
  return json({ ok: true, request_id: requestId, ...data });
}

function safeMessage(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) return String((error as { message?: unknown }).message);
  return String(error);
}

function redirectTo(siteUrl: string, bodyRedirect?: string) {
  return bodyRedirect ?? `${siteUrl.replace(/\/$/, "")}/pos`;
}

function validateEmail(email?: string) {
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

async function findAuthUserByEmail(admin: ReturnType<typeof createClient>, email: string, requestId: string) {
  const normalized = email.toLowerCase();
  log(requestId, "auth_user_lookup_started", { email: normalized });
  let page = 1;
  while (page < 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) {
      logError(requestId, "auth_user_lookup_failed", { page, error: error.message });
      throw new Error(`Failed searching existing auth user: ${error.message}`);
    }
    const user = data.users.find((item) => item.email?.toLowerCase() === normalized);
    if (user) {
      log(requestId, "auth_user_lookup_found", { user_id: user.id, email: normalized });
      return user;
    }
    if (data.users.length < 100) {
      log(requestId, "auth_user_lookup_not_found", { email: normalized });
      return null;
    }
    page += 1;
  }
  log(requestId, "auth_user_lookup_limit_reached", { email: normalized });
  return null;
}

async function sendInviteOrReset(admin: ReturnType<typeof createClient>, email: string, redirect: string, requestId: string): Promise<{ userId: string | null; status: InviteStatus; message?: string }> {
  const existingUser = await findAuthUserByEmail(admin, email, requestId);
  if (existingUser) {
    log(requestId, "auth_user_already_exists", { email, user_id: existingUser.id });
    const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo: redirect });
    if (error) {
      logError(requestId, "failed_sending_reset_password", { email, error: error.message });
      return { userId: existingUser.id, status: "error", message: `Failed sending reset password: ${error.message}` };
    }
    log(requestId, "reset_password_sent", { email, user_id: existingUser.id });
    return { userId: existingUser.id, status: "reset_sent" };
  }

  log(requestId, "auth_invite_started", { email, redirect_to: redirect });
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: redirect });
  if (error) {
    logError(requestId, "failed_sending_auth_invite", { email, error: error.message });
    return { userId: null, status: "error", message: `Failed sending auth invite: ${error.message}` };
  }
  log(requestId, "auth_invite_sent", { email, user_id: data.user?.id ?? null });
  return { userId: data.user?.id ?? null, status: "sent" };
}

async function assertSuperAdmin(caller: ReturnType<typeof createClient>, requestId: string) {
  log(requestId, "super_admin_check_started");
  const { data, error } = await caller.rpc("is_super_admin");
  if (error) {
    logError(requestId, "super_admin_check_rpc_failed", { error: error.message });
    throw new Error(`Permission RPC failed: ${error.message}`);
  }
  if (!data) {
    logError(requestId, "super_admin_check_denied");
    throw new Error("Not allowed: user is not super_admin");
  }
  log(requestId, "super_admin_check_passed");
}

async function assertBusinessAdmin(caller: ReturnType<typeof createClient>, businessId: string, requestId: string) {
  log(requestId, "business_admin_check_started", { business_id: businessId });
  const { data, error } = await caller.rpc("is_business_admin", { target_business_id: businessId });
  if (error) {
    logError(requestId, "business_admin_check_rpc_failed", { business_id: businessId, error: error.message });
    throw new Error(`Permission RPC failed: ${error.message}`);
  }
  if (!data) {
    logError(requestId, "business_admin_check_denied", { business_id: businessId });
    throw new Error("Not allowed: user is not business admin");
  }
  log(requestId, "business_admin_check_passed", { business_id: businessId });
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  log(requestId, "execution_started", { method: req.method });

  if (req.method === "OPTIONS") {
    log(requestId, "cors_preflight");
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(requestId, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const siteUrl = Deno.env.get("SITE_URL");
  const callerJwt = req.headers.get("Authorization")?.replace("Bearer ", "");

  log(requestId, "env_validation_started", {
    has_supabase_url: Boolean(supabaseUrl),
    has_service_role_key: Boolean(serviceRoleKey),
    has_site_url: Boolean(siteUrl),
    has_authorization: Boolean(callerJwt)
  });

  if (!supabaseUrl) return errorResponse(requestId, 500, "MISSING_SUPABASE_URL", "Missing SUPABASE_URL");
  if (!serviceRoleKey) return errorResponse(requestId, 500, "MISSING_SERVICE_ROLE_KEY", "Missing SUPABASE_SERVICE_ROLE_KEY");
  if (!siteUrl) return errorResponse(requestId, 500, "MISSING_SITE_URL", "Missing SITE_URL");
  if (!callerJwt) return errorResponse(requestId, 401, "MISSING_AUTHORIZATION", "Missing Authorization bearer token");

  let body: InviteBody;
  try {
    body = (await req.json()) as InviteBody;
  } catch (error) {
    return errorResponse(requestId, 400, "INVALID_JSON", "Invalid JSON body", safeMessage(error));
  }

  log(requestId, "parameters_received", {
    action: body.action ?? "invite_user",
    business_id: "business_id" in body ? body.business_id : undefined,
    email: "email" in body ? body.email : "admin_email" in body ? body.admin_email : undefined,
    role: "role" in body ? body.role : undefined,
    is_demo: "is_demo" in body ? body.is_demo : undefined
  });

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const caller = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${callerJwt}` } }
  });

  try {
    if (body.action === "create_business") {
      log(requestId, "create_business_validation_started");
      if (!body.business_name?.trim()) return errorResponse(requestId, 400, "MISSING_BUSINESS_NAME", "Missing business_name");
      if (!validateEmail(body.admin_email)) return errorResponse(requestId, 400, "INVALID_ADMIN_EMAIL", "Missing or invalid admin_email");

      await assertSuperAdmin(caller, requestId);
      const adminEmail = body.admin_email.toLowerCase().trim();
      const redirect = redirectTo(siteUrl, body.redirect_to);

      log(requestId, "business_creation_started", { business_name: body.business_name.trim(), admin_email: adminEmail });
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

      if (businessError || !business) {
        return errorResponse(requestId, 400, "FAILED_CREATING_BUSINESS", "Failed creating business", businessError?.message);
      }
      log(requestId, "business_created", { business_id: business.id });

      log(requestId, "settings_creation_started", { business_id: business.id });
      const { error: settingsError } = await admin.from("settings").insert({ business_id: business.id });
      if (settingsError) {
        return errorResponse(requestId, 400, "FAILED_CREATING_SETTINGS", "Failed creating settings", settingsError.message);
      }
      log(requestId, "settings_created", { business_id: business.id });

      const authResult = await sendInviteOrReset(admin, adminEmail, redirect, requestId);
      if (authResult.status === "error") {
        return errorResponse(requestId, 400, "FAILED_SENDING_AUTH_INVITE", "Failed sending auth invite", { business_id: business.id, message: authResult.message });
      }

      log(requestId, "invitation_creation_started", { business_id: business.id, email: adminEmail });
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

      if (invitationError || !invitation) {
        return errorResponse(requestId, 400, "FAILED_CREATING_INVITATION", "Failed creating invitation", { business_id: business.id, message: invitationError?.message });
      }
      log(requestId, "invitation_created", { invitation_id: invitation.id, business_id: business.id });

      if (authResult.userId) {
        log(requestId, "business_user_upsert_started", { business_id: business.id, user_id: authResult.userId });
        const { error: businessUserError } = await admin.from("business_users").upsert({
          business_id: business.id,
          user_id: authResult.userId,
          email: adminEmail,
          full_name: adminEmail,
          role: "admin",
          status: "active",
          permissions: fullPermissions
        }, { onConflict: "business_id,user_id" });
        if (businessUserError) {
          return errorResponse(requestId, 400, "FAILED_LINKING_BUSINESS_USER", "Failed linking auth user to business", businessUserError.message);
        }
        log(requestId, "business_user_upserted", { business_id: business.id, user_id: authResult.userId });
      }

      return successResponse(requestId, { business, invitation_id: invitation.id, invite_status: authResult.status });
    }

    if (body.action === "resend_admin_invitation") {
      if (!body.business_id) return errorResponse(requestId, 400, "MISSING_BUSINESS_ID", "Missing business_id");
      await assertSuperAdmin(caller, requestId);

      log(requestId, "admin_invitation_lookup_started", { business_id: body.business_id });
      const { data: invite, error: inviteError } = await admin
        .from("invitations")
        .select("id,business_id,email,role")
        .eq("business_id", body.business_id)
        .eq("role", "admin")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (inviteError || !invite) {
        return errorResponse(requestId, 404, "ADMIN_INVITATION_NOT_FOUND", "No admin invitation found", inviteError?.message);
      }
      log(requestId, "admin_invitation_found", { invitation_id: invite.id, business_id: invite.business_id, email: invite.email });

      const authResult = await sendInviteOrReset(admin, invite.email, redirectTo(siteUrl, body.redirect_to), requestId);
      if (authResult.status === "error") {
        return errorResponse(requestId, 400, "FAILED_SENDING_AUTH_INVITE", "Failed sending auth invite", authResult.message);
      }

      log(requestId, "invitation_update_started", { invitation_id: invite.id });
      const { error: updateInvitationError } = await admin
        .from("invitations")
        .update({ status: "pending", updated_at: new Date().toISOString() })
        .eq("id", invite.id);
      if (updateInvitationError) {
        return errorResponse(requestId, 400, "FAILED_UPDATING_INVITATION", "Failed updating invitation", updateInvitationError.message);
      }

      if (authResult.userId) {
        log(requestId, "business_user_upsert_started", { business_id: invite.business_id, user_id: authResult.userId });
        const { error: businessUserError } = await admin.from("business_users").upsert({
          business_id: invite.business_id,
          user_id: authResult.userId,
          email: invite.email,
          full_name: invite.email,
          role: "admin",
          status: "active",
          permissions: fullPermissions
        }, { onConflict: "business_id,user_id" });
        if (businessUserError) {
          return errorResponse(requestId, 400, "FAILED_LINKING_BUSINESS_USER", "Failed linking auth user to business", businessUserError.message);
        }
      }
      return successResponse(requestId, { invitation_id: invite.id, invite_status: authResult.status });
    }

    if (!("business_id" in body) || !body.business_id) return errorResponse(requestId, 400, "MISSING_BUSINESS_ID", "Missing business_id");
    if (!("email" in body) || !validateEmail(body.email)) return errorResponse(requestId, 400, "INVALID_EMAIL", "Missing or invalid email");
    if (!("role" in body) || !["admin", "cashier"].includes(body.role)) return errorResponse(requestId, 400, "INVALID_ROLE", "Invalid role");

    await assertBusinessAdmin(caller, body.business_id, requestId);
    const email = body.email.toLowerCase().trim();
    const role = body.role;
    const permissions = body.permissions ?? {};
    const authResult = await sendInviteOrReset(admin, email, redirectTo(siteUrl, body.redirect_to), requestId);
    if (authResult.status === "error") {
      return errorResponse(requestId, 400, "FAILED_SENDING_AUTH_INVITE", "Failed sending auth invite", authResult.message);
    }

    log(requestId, "invitation_creation_started", { business_id: body.business_id, email, role });
    const { data: invite, error: inviteError } = await admin
      .from("invitations")
      .insert({ business_id: body.business_id, email, role, permissions, status: "pending" })
      .select("id")
      .single();

    if (inviteError || !invite) {
      return errorResponse(requestId, 400, "FAILED_CREATING_INVITATION", "Failed creating invitation", inviteError?.message);
    }
    log(requestId, "invitation_created", { invitation_id: invite.id });

    if (authResult.userId) {
      log(requestId, "business_user_upsert_started", { business_id: body.business_id, user_id: authResult.userId });
      const { error: businessUserError } = await admin.from("business_users").upsert({
        business_id: body.business_id,
        user_id: authResult.userId,
        email,
        full_name: email,
        role,
        status: "active",
        permissions
      }, { onConflict: "business_id,user_id" });
      if (businessUserError) {
        return errorResponse(requestId, 400, "FAILED_LINKING_BUSINESS_USER", "Failed linking auth user to business", businessUserError.message);
      }
    }

    return successResponse(requestId, { invitation_id: invite.id, invite_status: authResult.status });
  } catch (error) {
    return errorResponse(requestId, 403, "UNHANDLED_FUNCTION_ERROR", safeMessage(error) ?? "Unexpected error");
  }
});

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

type AppRole = "admin" | "supervisor" | "cajero";

const adminPermissions = {
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

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase admin environment variables");
  return createClient(url, key, { auth: { persistSession: false } });
}

function dbRole(role: AppRole) {
  return role === "cajero" ? "cashier" : role;
}

function appRole(role: string): AppRole {
  return role === "cashier" ? "cajero" : role === "supervisor" ? "supervisor" : "admin";
}

function tempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("") + "9a";
}

async function callerContext(req: NextRequest, admin: SupabaseClient) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) throw new Error("Missing session");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid session");
  const { data: rows, error: rowsError } = await admin
    .from("business_users")
    .select("business_id,role,status")
    .eq("user_id", data.user.id)
    .eq("status", "active");
  if (rowsError || !rows?.length) throw new Error("No tienes permiso");
  return { user: data.user, rows };
}

function canManageBusiness(rows: { business_id: string | null; role: string }[], businessId: string) {
  return rows.some((row) => row.role === "super_admin") || rows.some((row) => row.business_id === businessId && row.role === "admin");
}

async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  let page = 1;
  while (page < 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 100) return null;
    page += 1;
  }
  return null;
}

function mapUser(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    userId: String(row.user_id),
    email: String(row.email),
    name: String(row.full_name ?? row.email),
    role: appRole(String(row.role)),
    status: String(row.status),
    permissions: row.permissions,
    forcePasswordChange: Boolean(row.force_password_change),
    createdAt: String(row.created_at)
  };
}

export async function POST(req: NextRequest) {
  try {
    const admin = adminClient();
    const context = await callerContext(req, admin);
    const body = await req.json();
    const action = String(body.action ?? "create_user");
    const businessId = String(body.business_id ?? "");
    if (!businessId) return NextResponse.json({ error: "business_id es obligatorio." }, { status: 400 });
    if (!canManageBusiness(context.rows, businessId)) return NextResponse.json({ error: "No tienes permiso." }, { status: 403 });

    if (action === "create_user") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const fullName = String(body.full_name ?? email).trim();
      const role = (String(body.role ?? "cajero") as AppRole);
      if (!email) return NextResponse.json({ error: "Correo obligatorio." }, { status: 400 });
      const password = tempPassword();
      const existing = await findAuthUserByEmail(admin, email);
      const authResult = existing
        ? await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
        : await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
      if (authResult.error || !authResult.data.user) throw new Error(authResult.error?.message ?? "No se pudo crear usuario Auth.");
      const permissions = role === "admin" || role === "supervisor" ? adminPermissions : (body.permissions ?? {});
      const { data, error } = await admin
        .from("business_users")
        .upsert({
          business_id: businessId,
          user_id: authResult.data.user.id,
          email,
          full_name: fullName,
          role: dbRole(role),
          status: "active",
          permissions,
          force_password_change: true
        }, { onConflict: "business_id,user_id" })
        .select("id,business_id,user_id,email,full_name,role,status,permissions,force_password_change,created_at")
        .single();
      if (error || !data) throw new Error(error?.message ?? "No se pudo guardar usuario.");
      return NextResponse.json({ user: mapUser(data as Record<string, unknown>), temporary_password: password });
    }

    if (action === "reset_password") {
      const businessUserId = String(body.business_user_id ?? "");
      const { data: row, error: rowError } = await admin.from("business_users").select("id,user_id,email").eq("id", businessUserId).eq("business_id", businessId).single();
      if (rowError || !row) throw new Error("Usuario no encontrado.");
      const password = tempPassword();
      const { error } = await admin.auth.admin.updateUserById(String(row.user_id), { password });
      if (error) throw error;
      await admin.from("business_users").update({ force_password_change: true }).eq("id", businessUserId);
      return NextResponse.json({ email: row.email, temporary_password: password });
    }

    if (action === "update_user") {
      const businessUserId = String(body.business_user_id ?? "");
      const patch: Record<string, unknown> = {};
      if (body.full_name !== undefined) patch.full_name = String(body.full_name);
      if (body.status !== undefined) patch.status = String(body.status);
      if (body.role !== undefined) patch.role = dbRole(String(body.role) as AppRole);
      if (body.permissions !== undefined) patch.permissions = body.permissions;
      const { data, error } = await admin.from("business_users").update(patch).eq("id", businessUserId).eq("business_id", businessId).select("id,business_id,user_id,email,full_name,role,status,permissions,force_password_change,created_at").single();
      if (error || !data) throw new Error(error?.message ?? "No se pudo actualizar usuario.");
      return NextResponse.json({ user: mapUser(data as Record<string, unknown>) });
    }

    if (action === "delete_user") {
      const businessUserId = String(body.business_user_id ?? "");
      const { data: row, error: rowError } = await admin.from("business_users").select("id,user_id").eq("id", businessUserId).eq("business_id", businessId).single();
      if (rowError || !row) throw new Error("Usuario no encontrado.");
      await admin.from("business_users").delete().eq("id", businessUserId);
      const { data: remaining } = await admin.from("business_users").select("id").eq("user_id", row.user_id);
      if (!remaining?.length) await admin.auth.admin.deleteUser(String(row.user_id));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Accion no soportada." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error administrando usuarios." }, { status: 400 });
  }
}

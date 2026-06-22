import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

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

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase admin environment variables");
  return createClient(url, key, { auth: { persistSession: false } });
}

function tempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("") + "9a";
}

async function requireSuperAdmin(req: NextRequest, admin: SupabaseClient) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) throw new Error("Missing session");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid session");
  const { data: row } = await admin
    .from("business_users")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "super_admin")
    .eq("status", "active")
    .maybeSingle();
  if (!row) throw new Error("No tienes permiso");
  return data.user;
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

export async function POST(req: NextRequest) {
  try {
    const admin = adminClient();
    await requireSuperAdmin(req, admin);
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.admin_email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const demo = Boolean(body.demo);
    if (!name || !email) return NextResponse.json({ error: "Nombre y correo admin son obligatorios." }, { status: 400 });

    const password = tempPassword();
    const { data: business, error: businessError } = await admin
      .from("businesses")
      .insert({
        name,
        email,
        phone: phone || null,
        status: "active",
        demo,
        test_mode: demo,
        onboarding_completed: demo
      })
      .select("id,name,commercial_name,logo_url,address,phone,email,nit,status,test_mode,demo,onboarding_completed,onboarding_skipped,currency,timezone,created_at")
      .single();
    if (businessError || !business) throw new Error(businessError?.message ?? "No se pudo crear el negocio.");

    await admin.from("settings").insert({ business_id: business.id });

    const existing = await findAuthUserByEmail(admin, email);
    const authResult = existing
      ? await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
      : await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: email } });
    if (authResult.error || !authResult.data.user) throw new Error(authResult.error?.message ?? "No se pudo crear usuario Auth.");

    const { data: businessUser, error: userError } = await admin
      .from("business_users")
      .upsert({
        business_id: business.id,
        user_id: authResult.data.user.id,
        email,
        full_name: email,
        role: "admin",
        status: "active",
        permissions: fullPermissions,
        force_password_change: true
      }, { onConflict: "business_id,user_id" })
      .select("id,business_id,user_id,email,full_name,role,status,permissions,force_password_change,created_at")
      .single();
    if (userError || !businessUser) throw new Error(userError?.message ?? "No se pudo vincular el admin.");

    return NextResponse.json({ business, user: businessUser, temporary_password: password });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error creando negocio." }, { status: 400 });
  }
}

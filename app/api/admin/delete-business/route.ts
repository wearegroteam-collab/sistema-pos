import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase admin environment variables");
  return createClient(url, key, { auth: { persistSession: false } });
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
}

export async function POST(req: NextRequest) {
  try {
    const admin = adminClient();
    await requireSuperAdmin(req, admin);
    const body = await req.json();
    const businessId = String(body.business_id ?? "");
    const confirmation = String(body.confirmation ?? "");
    if (!businessId) return NextResponse.json({ error: "business_id es obligatorio." }, { status: 400 });
    if (confirmation !== "ELIMINAR DEFINITIVAMENTE") return NextResponse.json({ error: "Confirmacion invalida." }, { status: 400 });

    const { data: businessUsers } = await admin.from("business_users").select("user_id").eq("business_id", businessId);
    const userIds = Array.from(new Set((businessUsers ?? []).map((row) => String(row.user_id)).filter(Boolean)));

    const { error } = await admin.from("businesses").delete().eq("id", businessId);
    if (error) throw error;

    for (const userId of userIds) {
      const { data: remaining } = await admin.from("business_users").select("id").eq("user_id", userId);
      if (!remaining?.length) await admin.auth.admin.deleteUser(userId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error eliminando negocio." }, { status: 400 });
  }
}

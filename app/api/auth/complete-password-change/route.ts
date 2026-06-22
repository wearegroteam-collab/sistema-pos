import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase admin environment variables");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const admin = adminClient();
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Missing session" }, { status: 401 });
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    const { error: updateError } = await admin
      .from("business_users")
      .update({ force_password_change: false })
      .eq("user_id", data.user.id);
    if (updateError) throw updateError;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo completar cambio de contrasena." }, { status: 400 });
  }
}

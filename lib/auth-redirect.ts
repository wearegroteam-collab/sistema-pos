import { supabase } from "@/lib/supabase";

type BusinessUserRole = "super_admin" | "admin" | "supervisor" | "cajero" | "cashier";

export async function getRedirectPathForCurrentUser() {
  if (!supabase) return { path: "/", error: "Supabase no esta configurado." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { path: "/", error: "Link expirado o token invalido." };

  const { data: rows, error } = await supabase
    .from("business_users")
    .select("role,status,force_password_change")
    .eq("user_id", userData.user.id)
    .eq("status", "active");

  if (error) return { path: "/", error: "No se pudo validar el usuario." };
  if (!rows?.length) return { path: "/", error: "Usuario sin negocio asignado." };

  const roles = rows.map((row) => row.role as BusinessUserRole);
  if (roles.includes("super_admin")) return { path: "/super-admin" };
  if (rows.some((row) => Boolean(row.force_password_change))) return { path: "/change-password" };
  if (roles.includes("admin") || roles.includes("supervisor")) return { path: "/pos" };
  if (roles.includes("cashier") || roles.includes("cajero")) return { path: "/pos/mesas" };
  return { path: "/", error: "Rol no configurado." };
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { getRedirectPathForCurrentUser } from "@/lib/auth-redirect";
import { supabase } from "@/lib/supabase";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkSession() {
      if (!supabase) {
        setError("Supabase no esta configurado.");
        setChecking(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) setError("Sesion expirada. Inicia sesion nuevamente.");
      setChecking(false);
    }
    checkSession();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!supabase) return setError("Supabase no esta configurado.");
    if (password.length < 8) return setError("La contrasena debe tener minimo 8 caracteres.");
    if (password !== confirmPassword) return setError("Las contrasenas no coinciden.");
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLoading(false);
      return setError("Sesion expirada. Inicia sesion nuevamente.");
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      return setError("No se pudo cambiar la contrasena.");
    }
    const response = await fetch("/api/auth/complete-password-change", {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
    });
    if (!response.ok) {
      setLoading(false);
      return setError("La contrasena cambio, pero no se pudo finalizar la activacion.");
    }
    window.sessionStorage.removeItem("force_password_change");
    const redirect = await getRedirectPathForCurrentUser();
    window.location.replace(redirect.error ? "/" : redirect.path);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-brand">Sistema POS</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">Cambia tu contrasena</h1>
        <p className="mt-2 text-sm text-slate-600">Por seguridad debes reemplazar la contrasena temporal antes de entrar.</p>
        {checking ? <div className="mt-5 rounded-md bg-slate-50 p-4 text-sm">Validando sesion...</div> : (
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-bold text-slate-700">Nueva contrasena<input className="mt-2 min-h-12 w-full rounded-md border border-slate-300 px-3" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label>
            <label className="block text-sm font-bold text-slate-700">Confirmar contrasena<input className="mt-2 min-h-12 w-full rounded-md border border-slate-300 px-3" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /></label>
            {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
            <button disabled={loading || Boolean(error && error.includes("Sesion expirada"))} className="min-h-12 w-full rounded-md bg-brand px-4 font-bold text-white disabled:opacity-50">{loading ? "Guardando..." : "Cambiar contrasena"}</button>
          </form>
        )}
      </section>
    </main>
  );
}

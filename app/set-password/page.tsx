"use client";

import { FormEvent, useEffect, useState } from "react";
import { getRedirectPathForCurrentUser } from "@/lib/auth-redirect";
import { supabase } from "@/lib/supabase";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Crea una contrasena segura para entrar al POS.");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      if (!supabase) {
        if (mounted) {
          setError("Supabase no esta configurado.");
          setCheckingSession(false);
        }
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (mounted) {
        if (sessionError || !data.session) setError("Link expirado o token invalido.");
        setCheckingSession(false);
      }
    }

    checkSession();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!supabase) {
      setError("Supabase no esta configurado.");
      return;
    }
    if (password.length < 8) {
      setError("La contrasena debe tener minimo 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setLoading(true);
    setMessage("Guardando contrasena...");

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setMessage("Crea una contrasena segura para entrar al POS.");
      setError("No se pudo crear contrasena. Solicita un nuevo enlace e intenta otra vez.");
      return;
    }

    const redirect = await getRedirectPathForCurrentUser();
    if (redirect.error) {
      setLoading(false);
      setMessage("Contrasena creada, pero falta asignar el usuario.");
      setError(redirect.error);
      return;
    }

    window.location.replace(redirect.path);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-brand">Sistema POS</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">Crear contrasena</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>

        {checkingSession ? (
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Validando sesion...
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-bold text-slate-700">
              Nueva contrasena
              <input
                className="mt-2 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none focus:border-brand"
                minLength={8}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={Boolean(error && error.includes("Link expirado")) || loading}
                autoComplete="new-password"
              />
            </label>

            <label className="block text-sm font-bold text-slate-700">
              Confirmar contrasena
              <input
                className="mt-2 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none focus:border-brand"
                minLength={8}
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={Boolean(error && error.includes("Link expirado")) || loading}
                autoComplete="new-password"
              />
            </label>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                {error}
              </div>
            )}

            <button
              className="flex min-h-12 w-full items-center justify-center rounded-md bg-brand px-4 font-bold text-white disabled:opacity-50"
              disabled={loading || Boolean(error && error.includes("Link expirado"))}
              type="submit"
            >
              {loading ? "Guardando..." : "Guardar contrasena"}
            </button>

            {error && error.includes("Link expirado") && (
              <a className="flex min-h-11 w-full items-center justify-center rounded-md bg-slate-950 px-4 font-bold text-white" href="/">
                Volver al login
              </a>
            )}
          </form>
        )}
      </section>
    </main>
  );
}

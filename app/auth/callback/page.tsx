"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function getLinkType(hashParams: URLSearchParams, queryParams: URLSearchParams) {
  return hashParams.get("type") ?? queryParams.get("type") ?? queryParams.get("flow_type") ?? "invite";
}

function passwordUrl(type: string) {
  return `/set-password?type=${encodeURIComponent(type)}`;
}

function requirePasswordSetup(type: string) {
  if (type === "invite" || type === "recovery") {
    window.sessionStorage.setItem("require_password_setup", "true");
  }
}

function readableAuthError(error?: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  if (message.includes("expired") || message.includes("invalid") || message.includes("otp")) {
    return "Link expirado o token invalido.";
  }
  return "Token invalido. Solicita una nueva invitacion.";
}

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Validando invitacion...");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function handleCallback() {
      if (!supabase) {
        if (mounted) setError("Supabase no esta configurado.");
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const queryParams = new URLSearchParams(window.location.search);
      const type = getLinkType(hashParams, queryParams);
      const urlError = hashParams.get("error") ?? queryParams.get("error");
      const urlErrorDescription = hashParams.get("error_description") ?? queryParams.get("error_description");

      try {
        if (mounted) setStatus(type === "recovery" ? "Validando recuperacion..." : "Validando invitacion...");

        if (urlError || urlErrorDescription) {
          throw new Error(urlErrorDescription ?? urlError ?? "Invalid token");
        }

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (sessionError) throw sessionError;
          requirePasswordSetup(type);
          window.location.replace(passwordUrl(type));
          return;
        }

        const code = queryParams.get("code");
        if (code) {
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
          if (codeError) throw codeError;
          requirePasswordSetup(type);
          window.location.replace(passwordUrl(type));
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (data.session) {
          requirePasswordSetup(type);
          window.location.replace(passwordUrl(type));
          return;
        }

        if (mounted) setError("Link expirado o token invalido.");
      } catch (callbackError) {
        if (mounted) setError(readableAuthError(callbackError as { message?: string }));
      }
    }

    handleCallback();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-brand">Sistema POS</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">Activando acceso</h1>
        {error ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-bold">{error}</p>
            <p className="mt-2">Pide al administrador que reenvie la invitacion o el enlace para crear contrasena.</p>
            <a className="mt-4 inline-flex min-h-11 items-center rounded-md bg-slate-950 px-4 font-bold text-white" href="/">
              Volver al login
            </a>
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>{status}</p>
            <p className="mt-2">En unos segundos podras crear tu contrasena.</p>
          </div>
        )}
      </section>
    </main>
  );
}

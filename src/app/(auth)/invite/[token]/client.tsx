"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { acceptInvite } from "@/lib/actions/admin";
import { useSession } from "next-auth/react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  CONTROLLER: "Controller",
  ANALYST: "Analista",
  VIEWER: "Visualizador",
};

interface Props {
  token: string;
  tenantName: string;
  role: string;
  invitedBy: string;
  invitedEmail: string;
  isLoggedIn: boolean;
  loggedInEmail: string | null;
}

export function AcceptInviteClient({
  token,
  tenantName,
  role,
  invitedBy,
  invitedEmail,
  isLoggedIn,
  loggedInEmail,
}: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // If the logged-in user is the correct email → show "Accept" button
  // If logged-in as different email → warn them
  // If not logged in → send to /register?token=... or /login?token=...

  async function handleAccept() {
    setError("");
    startTransition(async () => {
      const result = await acceptInvite(token);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(`Você agora é membro de ${result.tenantName}!`);
      // Refresh JWT so new membership appears in session
      await update();
      setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
    });
  }

  const registerUrl = `/register?token=${encodeURIComponent(token)}&email=${encodeURIComponent(invitedEmail)}`;
  const loginUrl = `/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-lg space-y-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="text-center">
          <img src="/logo.svg" alt="JSA" className="mx-auto h-10 mb-4" />
          <h1 className="text-xl font-bold text-foreground">Convite recebido</h1>
        </div>

        {/* Invite card */}
        <div className="rounded-md border border-border bg-muted/40 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Empresa</span>
            <span className="font-medium">{tenantName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Permissão</span>
            <span className="font-medium">{ROLE_LABELS[role] ?? role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Convidado por</span>
            <span className="font-medium">{invitedBy}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{invitedEmail}</span>
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 border border-green-200">
            {success}
          </div>
        )}

        {/* Actions */}
        {isLoggedIn ? (
          <div className="space-y-3">
            {loggedInEmail && loggedInEmail !== invitedEmail && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                Você está logado como <strong>{loggedInEmail}</strong>, mas o convite é para{" "}
                <strong>{invitedEmail}</strong>. Aceite assim mesmo ou faça login com o email correto.
              </p>
            )}
            <button
              onClick={handleAccept}
              disabled={isPending}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Aceitando..." : `Aceitar e entrar em ${tenantName}`}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Para aceitar o convite, crie uma conta ou faça login:
            </p>
            <Link
              href={registerUrl}
              className="block w-full text-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Criar conta e aceitar convite
            </Link>
            <Link
              href={loginUrl}
              className="block w-full text-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Já tenho conta — fazer login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

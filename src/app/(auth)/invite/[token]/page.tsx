import { auth } from "@/lib/auth";
import { getInviteDetails } from "@/lib/actions/admin";
import { AcceptInviteClient } from "./client";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const session = await auth();

  const invite = await getInviteDetails(token);

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-lg text-center space-y-4">
          <h1 className="text-xl font-bold text-foreground">Convite inválido</h1>
          <p className="text-sm text-muted-foreground">
            Este link de convite não existe ou foi removido.
          </p>
          <a
            href="/login"
            className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ir para o Login
          </a>
        </div>
      </div>
    );
  }

  if (invite.expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-lg text-center space-y-4">
          <h1 className="text-xl font-bold text-foreground">Convite expirado</h1>
          <p className="text-sm text-muted-foreground">
            Este convite não é mais válido. Peça ao administrador que envie um novo convite.
          </p>
          <a
            href="/login"
            className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ir para o Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <AcceptInviteClient
      token={token}
      tenantName={invite.tenantName}
      role={invite.role}
      invitedBy={invite.invitedBy}
      invitedEmail={invite.email}
      isLoggedIn={!!session}
      loggedInEmail={session?.user?.email ?? null}
    />
  );
}

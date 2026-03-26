"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  UserPlus,
  Trash2,
  Mail,
  Shield,
  XCircle,
} from "lucide-react";
import {
  inviteUserToTenant,
  updateMemberRole,
  removeMember,
  cancelInvite,
} from "@/lib/actions/admin";

type MemberInfo = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  isDefault: boolean;
  createdAt: string;
};

type InviteInfo = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdByName: string;
  createdAt: string;
};

const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "CONTROLLER", label: "Controller" },
  { value: "ANALYST", label: "Analista" },
  { value: "VIEWER", label: "Visualizador" },
];

const INVITE_STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Pendente", variant: "outline" },
  ACCEPTED: { label: "Aceito", variant: "default" },
  EXPIRED: { label: "Expirado", variant: "destructive" },
  CANCELLED: { label: "Cancelado", variant: "secondary" },
};

interface UsersClientProps {
  members: MemberInfo[];
  invites: InviteInfo[];
  currentUserId: string;
  tenantName: string;
}

export function UsersClient({
  members,
  invites,
  currentUserId,
  tenantName,
}: UsersClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("ANALYST");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  }

  async function handleRoleChange(membershipId: string, newRole: string) {
    startTransition(async () => {
      try {
        await updateMemberRole(membershipId, newRole);
        showFeedback("success", "Permissao atualizada com sucesso!");
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao atualizar permissao");
      }
    });
  }

  async function handleRemoveMember(membershipId: string) {
    startTransition(async () => {
      try {
        await removeMember(membershipId);
        showFeedback("success", "Membro removido com sucesso!");
        setConfirmRemoveId(null);
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao remover membro");
      }
    });
  }

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const result = await inviteUserToTenant({
          email: inviteEmail,
          role: inviteRole,
        });
        const message =
          result?.addedDirectly
            ? "Usuario adicionado diretamente"
            : "Convite enviado";
        showFeedback("success", message);
        setInviteOpen(false);
        setInviteEmail("");
        setInviteRole("ANALYST");
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao enviar convite");
      }
    });
  }

  async function handleCancelInvite(inviteId: string) {
    startTransition(async () => {
      try {
        await cancelInvite(inviteId);
        showFeedback("success", "Convite cancelado");
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao cancelar convite");
      }
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <>
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`rounded-md p-3 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.message}
          <button
            onClick={() => setFeedback(null)}
            className="ml-3 font-bold hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}

      {/* Members section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Membros
            </CardTitle>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Convidar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="rounded-md border border-border min-w-[600px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">
                      Nome
                    </th>
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">
                      Email
                    </th>
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">
                      Permissao
                    </th>
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const isCurrentUser = member.userId === currentUserId;
                    return (
                      <tr key={member.id} className="border-b">
                        <td className="px-3 py-2 sm:px-4 sm:py-3">
                          {member.userName}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (voce)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-muted-foreground">
                          {member.userEmail}
                        </td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3">
                          {isCurrentUser ? (
                            <Badge variant="secondary">{member.role}</Badge>
                          ) : (
                            <Select
                              value={member.role}
                              onChange={(e) =>
                                handleRoleChange(member.id, e.target.value)
                              }
                              disabled={isPending}
                              className="w-36"
                            >
                              {ROLES.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </Select>
                          )}
                        </td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3">
                          {!isCurrentUser && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setConfirmRemoveId(member.id)}
                              disabled={isPending}
                              title="Remover membro"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {members.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        Nenhum membro encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending invites section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Convites Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum convite pendente.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="rounded-md border border-border min-w-[700px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">
                        Email
                      </th>
                      <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">
                        Permissao
                      </th>
                      <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">
                        Expira em
                      </th>
                      <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">
                        Status
                      </th>
                      <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium">
                        Acoes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((invite) => {
                      const statusConfig =
                        INVITE_STATUS_CONFIG[invite.status] ?? {
                          label: invite.status,
                          variant: "secondary" as const,
                        };
                      return (
                        <tr key={invite.id} className="border-b">
                          <td className="px-3 py-2 sm:px-4 sm:py-3">
                            {invite.email}
                          </td>
                          <td className="px-3 py-2 sm:px-4 sm:py-3">
                            <Badge variant="outline">
                              {ROLES.find((r) => r.value === invite.role)
                                ?.label ?? invite.role}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 sm:px-4 sm:py-3 text-muted-foreground">
                            {formatDate(invite.expiresAt)}
                          </td>
                          <td className="px-3 py-2 sm:px-4 sm:py-3">
                            <Badge variant={statusConfig.variant}>
                              {statusConfig.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 sm:px-4 sm:py-3">
                            {invite.status === "PENDING" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancelInvite(invite.id)}
                                disabled={isPending}
                                title="Cancelar convite"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Permissao *</label>
              <Select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Enviando..." : "Enviar Convite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm remove dialog */}
      <Dialog
        open={confirmRemoveId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmRemoveId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Remocao</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover este membro? Ele perdera acesso a
            esta empresa.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRemoveId(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmRemoveId) handleRemoveMember(confirmRemoveId);
              }}
              disabled={isPending}
            >
              {isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { type Role } from "@/generated/prisma";
import { Card, CardContent } from "@/components/ui/card";
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
  XCircle,
  Copy,
  Check,
  Link as LinkIcon,
  Building2,
  ChevronDown,
  Users,
  Mail,
} from "lucide-react";
import {
  inviteUserToMultipleTenants,
  updateMemberRoleById,
  removeMemberById,
  cancelInviteById,
} from "@/lib/actions/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  token: string;
  expiresAt: string;
  createdByName: string;
  createdAt: string;
};

type TenantAccessData = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantActive: boolean;
  isCurrentTenant: boolean;
  members: MemberInfo[];
  invites: InviteInfo[];
};

type CompanySelection = {
  tenantId: string;
  tenantName: string;
  selected: boolean;
  role: string;
};

type GeneratedLinkItem = {
  tenantName: string;
  link: string;
};

interface AccessClientProps {
  tenants: TenantAccessData[];
  currentUserId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "CONTROLLER", label: "Controller" },
  { value: "ANALYST", label: "Analista" },
  { value: "VIEWER", label: "Visualizador" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function AccessClient({ tenants, currentUserId }: AccessClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // All companies expanded by default
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(
    () => new Set(tenants.map((t) => t.tenantId))
  );

  // ── Multi-company invite dialog state ──────────────────────────────────────
  const [multiInviteOpen, setMultiInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [companySelections, setCompanySelections] = useState<CompanySelection[]>([]);

  // ── Other dialog states ────────────────────────────────────────────────────
  const [removeDialog, setRemoveDialog] = useState<{
    tenantId: string;
    membershipId: string;
    memberName: string;
  } | null>(null);

  // Generated links dialog — supports multiple companies at once
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLinkItem[] | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Toast feedback
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  }

  function toggleTenant(tenantId: string) {
    setExpandedTenants((prev) => {
      const next = new Set(prev);
      if (next.has(tenantId)) {
        next.delete(tenantId);
      } else {
        next.add(tenantId);
      }
      return next;
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  async function copyToClipboard(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  function getInviteLink(token: string) {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/invite/${token}`;
  }

  // ─── Open multi-invite dialog ──────────────────────────────────────────────

  function openInviteDialog(preSelectedTenantId: string) {
    setCompanySelections(
      tenants.map((t) => ({
        tenantId: t.tenantId,
        tenantName: t.tenantName,
        selected: t.tenantId === preSelectedTenantId,
        role: "ANALYST",
      }))
    );
    setInviteEmail("");
    setMultiInviteOpen(true);
  }

  function toggleCompanySelection(tenantId: string) {
    setCompanySelections((prev) =>
      prev.map((c) =>
        c.tenantId === tenantId ? { ...c, selected: !c.selected } : c
      )
    );
  }

  function setCompanyRole(tenantId: string, role: string) {
    setCompanySelections((prev) =>
      prev.map((c) => (c.tenantId === tenantId ? { ...c, role } : c))
    );
  }

  function toggleSelectAll() {
    const shouldSelectAll = !companySelections.every((c) => c.selected);
    setCompanySelections((prev) =>
      prev.map((c) => ({ ...c, selected: shouldSelectAll }))
    );
  }

  // ─── Action Handlers ───────────────────────────────────────────────────────

  async function handleMultiInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const selected = companySelections.filter((c) => c.selected);
    if (!selected.length) return;

    startTransition(async () => {
      try {
        const results = await inviteUserToMultipleTenants(
          inviteEmail,
          selected.map((c) => ({ tenantId: c.tenantId, role: c.role as Role }))
        );

        setMultiInviteOpen(false);
        setInviteEmail("");

        const succeeded = results.filter((r) => r.ok);
        const failed = results.filter((r) => !r.ok);

        // Collect generated invite links
        const links: GeneratedLinkItem[] = results
          .filter((r) => r.ok && r.type === "invite" && r.token)
          .map((r) => ({
            tenantName:
              tenants.find((t) => t.tenantId === r.tenantId)?.tenantName ?? r.tenantId,
            link: getInviteLink(r.token!),
          }));

        if (links.length > 0) {
          setGeneratedLinks(links);
        }

        if (failed.length === 0) {
          const n = succeeded.length;
          showFeedback(
            "success",
            `Convite${n !== 1 ? "s" : ""} enviado${n !== 1 ? "s" : ""} para ${n} empresa${n !== 1 ? "s" : ""}!`
          );
        } else {
          showFeedback(
            "error",
            `${succeeded.length} convite${succeeded.length !== 1 ? "s" : ""} enviado${succeeded.length !== 1 ? "s" : ""}, ${failed.length} erro${failed.length !== 1 ? "s" : ""}: ${failed.map((f) => f.error).join("; ")}`
          );
        }

        router.refresh();
      } catch (err: unknown) {
        showFeedback(
          "error",
          err instanceof Error ? err.message : "Erro ao enviar convites"
        );
      }
    });
  }

  async function handleRoleChange(
    membershipId: string,
    newRole: string,
    tenantId: string
  ) {
    startTransition(async () => {
      try {
        await updateMemberRoleById(membershipId, newRole as Role, tenantId);
        showFeedback("success", "Permissão atualizada com sucesso!");
        router.refresh();
      } catch (err: unknown) {
        showFeedback(
          "error",
          err instanceof Error ? err.message : "Erro ao atualizar permissão"
        );
      }
    });
  }

  async function handleRemoveMember() {
    if (!removeDialog) return;
    startTransition(async () => {
      try {
        await removeMemberById(removeDialog.membershipId, removeDialog.tenantId);
        showFeedback("success", "Membro removido com sucesso!");
        setRemoveDialog(null);
        router.refresh();
      } catch (err: unknown) {
        showFeedback(
          "error",
          err instanceof Error ? err.message : "Erro ao remover membro"
        );
      }
    });
  }

  async function handleCancelInvite(inviteId: string, tenantId: string) {
    startTransition(async () => {
      try {
        await cancelInviteById(inviteId, tenantId);
        showFeedback("success", "Convite cancelado!");
        router.refresh();
      } catch (err: unknown) {
        showFeedback(
          "error",
          err instanceof Error ? err.message : "Erro ao cancelar convite"
        );
      }
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  // Derived totals — computed once, used in summary chips
  const totalMembers = tenants.reduce((sum, t) => sum + t.members.length, 0);
  const totalPendingInvites = tenants.reduce((sum, t) => sum + t.invites.length, 0);

  // Count of selected companies in the open invite dialog
  const selectedCount = companySelections.filter((c) => c.selected).length;
  const allSelected = companySelections.length > 0 && selectedCount === companySelections.length;
  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <>
      {/* Feedback toast */}
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

      {/* Summary chips */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          {tenants.length} empresa{tenants.length !== 1 && "s"} administrada{tenants.length !== 1 && "s"}
        </span>
        <span>·</span>
        <span>
          {totalMembers} membro{totalMembers !== 1 && "s"} no total
        </span>
        {totalPendingInvites > 0 && (
          <>
            <span>·</span>
            <span className="text-amber-600">
              {totalPendingInvites} convite{totalPendingInvites !== 1 && "s"} pendente{totalPendingInvites !== 1 && "s"}
            </span>
          </>
        )}
      </div>

      {/* Company accordion cards */}
      <div className="space-y-3">
        {tenants.map((tenant) => {
          const isExpanded = expandedTenants.has(tenant.tenantId);
          const pendingInviteCount = tenant.invites.length;

          return (
            <Card key={tenant.tenantId} className="overflow-hidden">
              {/* Accordion header */}
              <div
                className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors select-none"
                onClick={() => toggleTenant(tenant.tenantId)}
              >
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{tenant.tenantName}</span>
                    {tenant.isCurrentTenant && (
                      <Badge className="bg-blue-600 text-white text-xs px-1.5 py-0">
                        Atual
                      </Badge>
                    )}
                    {!tenant.tenantActive && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        Inativa
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground font-mono">
                      {tenant.tenantSlug}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      <Users className="h-3 w-3 inline mr-1" />
                      {tenant.members.length} membro{tenant.members.length !== 1 && "s"}
                    </span>
                    {pendingInviteCount > 0 && (
                      <span className="text-xs text-amber-600">
                        <Mail className="h-3 w-3 inline mr-1" />
                        {pendingInviteCount} convite{pendingInviteCount !== 1 && "s"} pendente{pendingInviteCount !== 1 && "s"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Invite button — stopPropagation to avoid toggling accordion */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    openInviteDialog(tenant.tenantId);
                  }}
                  disabled={isPending}
                  className="shrink-0"
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  Convidar
                </Button>

                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </div>

              {/* Collapsible body */}
              {isExpanded && (
                <CardContent className="border-t border-border px-5 pb-5 pt-4 space-y-5">
                  {/* Members table */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                      Membros
                    </h3>
                    <div className="overflow-x-auto -mx-1">
                      <div className="rounded-md border border-border min-w-[560px]">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="px-4 py-2 text-left font-medium">Nome</th>
                              <th className="px-4 py-2 text-left font-medium">Email</th>
                              <th className="px-4 py-2 text-left font-medium">Permissão</th>
                              <th className="px-4 py-2 text-left font-medium">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tenant.members.map((member) => {
                              const isCurrentUser = member.userId === currentUserId;
                              return (
                                <tr key={member.id} className="border-b last:border-0">
                                  <td className="px-4 py-2.5">
                                    <span className="font-medium">{member.userName || member.userEmail}</span>
                                    {isCurrentUser && (
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        (você)
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                                    {member.userEmail}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {isCurrentUser ? (
                                      <Badge variant="secondary">{member.role}</Badge>
                                    ) : (
                                      <Select
                                        value={member.role}
                                        onChange={(e) =>
                                          handleRoleChange(
                                            member.id,
                                            e.target.value,
                                            tenant.tenantId
                                          )
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
                                  <td className="px-4 py-2.5">
                                    {!isCurrentUser && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          setRemoveDialog({
                                            tenantId: tenant.tenantId,
                                            membershipId: member.id,
                                            memberName: member.userName || member.userEmail,
                                          })
                                        }
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
                            {tenant.members.length === 0 && (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-5 text-center text-muted-foreground text-sm"
                                >
                                  Nenhum membro encontrado.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Pending invites — only shown if there are any */}
                  {tenant.invites.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Convites Pendentes
                      </h3>
                      <div className="overflow-x-auto -mx-1">
                        <div className="rounded-md border border-border min-w-[560px]">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="px-4 py-2 text-left font-medium">Email</th>
                                <th className="px-4 py-2 text-left font-medium">Permissão</th>
                                <th className="px-4 py-2 text-left font-medium">Expira em</th>
                                <th className="px-4 py-2 text-left font-medium">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tenant.invites.map((invite) => (
                                <tr key={invite.id} className="border-b last:border-0">
                                  <td className="px-4 py-2.5">{invite.email}</td>
                                  <td className="px-4 py-2.5">
                                    <Badge variant="outline">
                                      {ROLES.find((r) => r.value === invite.role)?.label ??
                                        invite.role}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                                    {formatDate(invite.expiresAt)}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          copyToClipboard(getInviteLink(invite.token), 0)
                                        }
                                        title="Copiar link de convite"
                                      >
                                        <LinkIcon className="h-4 w-4 text-blue-600" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          handleCancelInvite(invite.id, tenant.tenantId)
                                        }
                                        disabled={isPending}
                                        title="Cancelar convite"
                                      >
                                        <XCircle className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── Shared Dialogs ──────────────────────────────────────────────────── */}

      {/* ── Multi-company invite dialog ─────────────────────────────────────── */}
      <Dialog
        open={multiInviteOpen}
        onOpenChange={(open) => {
          if (!open) setMultiInviteOpen(false);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Convidar usuário para empresa{selectedCount !== 1 && "s"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleMultiInvite} className="space-y-5">
            {/* Email */}
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
                required
                className="mt-1"
              />
            </div>

            {/* Company list */}
            <div>
              <label className="text-sm font-medium">Empresas e permissões *</label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Selecione as empresas e defina o cargo em cada uma.
              </p>
              <div className="rounded-md border border-border divide-y max-h-64 overflow-y-auto">
                {/* Select-all row */}
                <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/20">
                  <input
                    type="checkbox"
                    id="select-all-companies"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer shrink-0"
                  />
                  <label
                    htmlFor="select-all-companies"
                    className="flex-1 text-sm font-medium cursor-pointer text-muted-foreground"
                  >
                    Selecionar todas
                  </label>
                  <span className="text-xs text-muted-foreground w-32 text-right">
                    {selectedCount} de {companySelections.length}
                  </span>
                </div>

                {companySelections.map((company) => (
                  <div
                    key={company.tenantId}
                    className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                      company.selected ? "bg-muted/40" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      id={`company-${company.tenantId}`}
                      checked={company.selected}
                      onChange={() => toggleCompanySelection(company.tenantId)}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer shrink-0"
                    />

                    {/* Company name */}
                    <label
                      htmlFor={`company-${company.tenantId}`}
                      className="flex-1 min-w-0 text-sm cursor-pointer truncate"
                    >
                      {company.tenantName}
                    </label>

                    {/* Role selector — always visible, disabled when unchecked */}
                    <Select
                      value={company.role}
                      onChange={(e) => setCompanyRole(company.tenantId, e.target.value)}
                      disabled={!company.selected || isPending}
                      className="w-32 text-xs"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
              {selectedCount === 0 && (
                <p className="text-xs text-destructive mt-1">
                  Selecione ao menos uma empresa.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMultiInviteOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || selectedCount === 0}>
                {isPending
                  ? "Enviando..."
                  : `Convidar para ${selectedCount} empresa${selectedCount !== 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Confirm remove dialog ───────────────────────────────────────────── */}
      <Dialog
        open={!!removeDialog}
        onOpenChange={(open) => {
          if (!open) setRemoveDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Remoção</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover{" "}
            <strong>{removeDialog?.memberName}</strong>? Ele perderá acesso a
            esta empresa.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialog(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={isPending}
            >
              {isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Generated invite links dialog ──────────────────────────────────── */}
      <Dialog
        open={!!generatedLinks}
        onOpenChange={(open) => {
          if (!open) setGeneratedLinks(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              {generatedLinks && generatedLinks.length === 1
                ? "Link de convite gerado"
                : `${generatedLinks?.length ?? 0} links de convite gerados`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copie e envie cada link para o usuário convidado. Os links expiram em{" "}
              <strong>7 dias</strong>.
            </p>

            <div className="space-y-3">
              {generatedLinks?.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {item.tenantName}
                  </p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={item.link}
                      className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-xs font-mono truncate"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(item.link, idx)}
                      title="Copiar link"
                    >
                      {copiedIdx === idx ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Se o usuário ainda não tem conta, o link também criará a conta automaticamente.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setGeneratedLinks(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2,
  Plus,
  Pencil,
  Users,
  Clock,
  AlertTriangle,
  LogIn,
  ShieldAlert,
  Tag,
  Layers,
  Trash2,
} from "lucide-react";
import { createTenant, updateTenant, deleteTenant } from "@/lib/actions/admin";
import { switchTenant } from "@/lib/actions/tenant";

type ExceptionInfo = {
  unclassified: number;
  staleStaging: number;
  noCostCenter: number;
  total: number;
};

type TenantInfo = {
  tenantId: string;
  tenantName: string;
  tenantCnpj: string;
  tenantSlug: string;
  active: boolean;
  role: string;
  isDefault: boolean;
  memberCount: number;
  pendingStaging: number;
  overdueCount: number;
  exceptions: ExceptionInfo;
};

interface CompaniesClientProps {
  tenants: TenantInfo[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function CompaniesClient({ tenants }: CompaniesClientProps) {
  const router = useRouter();
  const { update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<TenantInfo | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newCnpj, setNewCnpj] = useState("");
  const [newSlug, setNewSlug] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editCnpj, setEditCnpj] = useState("");
  const [editActive, setEditActive] = useState(true);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  }

  function handleNameChange(name: string) {
    setNewName(name);
    setNewSlug(slugify(name));
  }

  function openEdit(tenant: TenantInfo) {
    setEditingId(tenant.tenantId);
    setEditName(tenant.tenantName);
    setEditCnpj(tenant.tenantCnpj || "");
    setEditActive(tenant.active);
  }

  function closeEdit() {
    setEditingId(null);
    setEditName("");
    setEditCnpj("");
    setEditActive(true);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createTenant({
          name: newName,
          cnpj: newCnpj.replace(/\D/g, ""),
          slug: newSlug,
        });
        setCreateOpen(false);
        setNewName("");
        setNewCnpj("");
        setNewSlug("");
        // router.push forces a real navigation so the server component re-renders
        // with fresh DB data (router.refresh() is unreliable inside startTransition)
        router.push("/settings/companies");
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao criar empresa");
      }
    });
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingId) return;
    startTransition(async () => {
      try {
        await updateTenant(editingId, {
          name: editName,
          cnpj: editCnpj.replace(/\D/g, ""),
          active: editActive,
        });
        closeEdit();
        router.push("/settings/companies");
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao atualizar empresa");
      }
    });
  }

  async function handleSwitch(tenantId: string) {
    startTransition(async () => {
      try {
        await switchTenant(tenantId);
        // CRITICAL: update the JWT so the new tenantId is reflected in the session cookie
        await update();
        // Full page reload so all server components render with the new tenant context
        window.location.href = "/dashboard";
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao trocar de empresa");
      }
    });
  }

  async function handleDelete() {
    if (!deletingTenant) return;
    startTransition(async () => {
      const response = await deleteTenant(deletingTenant.tenantId);
      if (!response.ok) {
        showFeedback("error", response.error);
        setDeletingTenant(null);
        return;
      }
      setDeletingTenant(null);
      // Hard navigation so the server component re-fetches tenant list from DB
      // (router.refresh() is unreliable inside startTransition in React 19)
      router.push("/settings/companies");
    });
  }

  function canDelete(tenant: TenantInfo): boolean {
    return (
      !tenant.active &&
      !tenant.isDefault &&
      tenant.role === "ADMIN" &&
      tenants.length > 1
    );
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

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Nova Empresa
        </Button>
      </div>

      {/* Tenant cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tenants.map((tenant) => {
          const isEditing = editingId === tenant.tenantId;

          if (isEditing) {
            return (
              <Card key={tenant.tenantId} className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    Editar Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdate} className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Nome</label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">CNPJ</label>
                      <Input
                        value={editCnpj}
                        onChange={(e) =>
                          setEditCnpj(formatCnpj(e.target.value))
                        }
                        placeholder="XX.XXX.XXX/XXXX-XX"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="edit-active"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="edit-active" className="text-sm font-medium">
                        Ativa
                      </label>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={closeEdit}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm" disabled={isPending}>
                        {isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={tenant.tenantId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {tenant.tenantName}
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    {tenant.isDefault && (
                      <Badge variant="default" className="bg-blue-600">Atual</Badge>
                    )}
                    <Badge variant={tenant.active ? "default" : "outline"}>
                      {tenant.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">CNPJ</span>
                    <p className="font-mono text-xs">
                      {tenant.tenantCnpj
                        ? formatCnpj(tenant.tenantCnpj)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Slug</span>
                    <p className="font-mono text-xs">{tenant.tenantSlug}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {tenant.memberCount} membro{tenant.memberCount !== 1 && "s"}
                  </span>
                  {tenant.pendingStaging > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-yellow-600" />
                      {tenant.pendingStaging} pendente
                      {tenant.pendingStaging !== 1 && "s"}
                    </span>
                  )}
                  {tenant.overdueCount > 0 && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      {tenant.overdueCount} vencido
                      {tenant.overdueCount !== 1 && "s"}
                    </span>
                  )}
                </div>

                {/* Exceptions panel */}
                {tenant.exceptions.total > 0 && (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                        {tenant.exceptions.total} excecao{tenant.exceptions.total !== 1 && "es"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-amber-700 dark:text-amber-300">
                      {tenant.exceptions.unclassified > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {tenant.exceptions.unclassified} sem classificacao
                        </span>
                      )}
                      {tenant.exceptions.staleStaging > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {tenant.exceptions.staleStaging} staging parado
                        </span>
                      )}
                      {tenant.exceptions.noCostCenter > 0 && (
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {tenant.exceptions.noCostCenter} sem centro de custo
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Role badge */}
                <div>
                  <Badge variant="secondary" className="text-xs">
                    {tenant.role}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleSwitch(tenant.tenantId)}
                    disabled={isPending || tenant.isDefault}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Acessar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(tenant)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  {canDelete(tenant) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingTenant(tenant)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingTenant} onOpenChange={(open) => !open && setDeletingTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Excluir Empresa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir permanentemente a empresa{" "}
              <strong className="text-foreground">{deletingTenant?.tenantName}</strong>?
            </p>
            <p className="text-sm font-medium text-red-600">
              Esta ação é irreversível. Todos os dados da empresa (membros, configurações, lançamentos de staging, etc.) serão removidos permanentemente.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingTenant(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Excluindo..." : "Excluir Empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Nome da empresa"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">CNPJ</label>
              <Input
                value={newCnpj}
                onChange={(e) => setNewCnpj(formatCnpj(e.target.value))}
                placeholder="XX.XXX.XXX/XXXX-XX"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Slug</label>
              <Input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="slug-da-empresa"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Gerado automaticamente a partir do nome
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Criando..." : "Criar Empresa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

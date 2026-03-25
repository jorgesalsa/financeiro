"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { importTaxInvoices } from "@/lib/actions/import";
import { Upload, FileCheck, AlertTriangle } from "lucide-react";
import { formatDateTime } from "@/lib/utils/format";

type ImportBatch = {
  id: string;
  fileName: string;
  status: string;
  totalRecords: number;
  processedRecords: number;
  errorRecords: number;
  createdAt: string;
  importedBy: { name: string } | null;
};

export function TaxInvoiceImportClient({ batches }: { batches: ImportBatch[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ total: number } | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await importTaxInvoices(formData);
      setResult(res);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" }
    > = {
      PENDING: { label: "Pendente", variant: "secondary" },
      PROCESSING: { label: "Processando", variant: "default" },
      COMPLETED: { label: "Concluído", variant: "default" },
      FAILED: { label: "Falhou", variant: "destructive" },
    };
    const item = map[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={item.variant}>{item.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova Importação</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Arquivo (CSV, TXT, XLSX) *</label>
              <input
                type="file"
                name="file"
                accept=".csv,.txt,.xlsx,.xls"
                required
                className="block w-full text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Colunas esperadas: Número NF, Série, Data Emissão, CNPJ Emitente, Nome Emitente,
                CFOP, Descrição, Valor Total, ICMS, IPI, PIS, COFINS, Chave Acesso
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" /> {error}
              </div>
            )}

            {result && (
              <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                <FileCheck className="h-4 w-4" />
                Importados {result.total} registros com sucesso.
              </div>
            )}

            <Button type="submit" disabled={loading}>
              <Upload className="mr-2 h-4 w-4" />
              {loading ? "Importando..." : "Importar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Importações</CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma importação realizada.</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium">Arquivo</th>
                    <th className="p-2 text-left font-medium">Status</th>
                    <th className="p-2 text-left font-medium">Registros</th>
                    <th className="p-2 text-left font-medium">Importado por</th>
                    <th className="p-2 text-left font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-b">
                      <td className="p-2">{b.fileName}</td>
                      <td className="p-2">{statusBadge(b.status)}</td>
                      <td className="p-2">
                        {b.processedRecords}/{b.totalRecords}
                      </td>
                      <td className="p-2">{b.importedBy?.name || "-"}</td>
                      <td className="p-2">{formatDateTime(b.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

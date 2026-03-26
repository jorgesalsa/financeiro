"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { importTaxInvoices, importTaxInvoicesXML } from "@/lib/actions/import";
import { Upload, FileCheck, AlertTriangle, FileText, FileCode } from "lucide-react";
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

type Tab = "csv" | "xml";

export function TaxInvoiceImportClient({ batches }: { batches: ImportBatch[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("csv");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ total: number; errors?: number; errorMessages?: string[] } | null>(null);
  const [error, setError] = useState("");

  async function handleCSVSubmit(e: React.FormEvent<HTMLFormElement>) {
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

  async function handleXMLSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await importTaxInvoicesXML(formData);
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
          {/* Tab buttons */}
          <div className="flex gap-1 mt-2 rounded-lg bg-muted p-1 w-fit">
            <button
              type="button"
              onClick={() => { setActiveTab("csv"); setError(""); setResult(null); }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "csv"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              CSV / XLSX
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("xml"); setError(""); setResult(null); }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "xml"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              XML (NFe)
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "csv" ? (
            <form onSubmit={handleCSVSubmit} className="space-y-4">
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
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              {result && (
                <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                  <FileCheck className="h-4 w-4 shrink-0" />
                  Importados {result.total} registros com sucesso.
                </div>
              )}

              <Button type="submit" disabled={loading}>
                <Upload className="mr-2 h-4 w-4" />
                {loading ? "Importando..." : "Importar"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleXMLSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Arquivos XML de NFe *</label>
                <input
                  type="file"
                  name="files"
                  accept=".xml"
                  required
                  multiple
                  className="block w-full text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Selecione um ou mais arquivos XML de NFe. Os dados serão extraídos automaticamente
                  do XML (emitente, destinatário, valores, impostos, chave de acesso).
                  Notas duplicadas (mesma chave de acesso) serão ignoradas.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              {result && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                    <FileCheck className="h-4 w-4 shrink-0" />
                    <span>
                      Importados {result.total} nota{result.total !== 1 ? "s" : ""} com sucesso.
                      {result.errors ? ` ${result.errors} erro${result.errors !== 1 ? "s" : ""}.` : ""}
                    </span>
                  </div>
                  {result.errorMessages && result.errorMessages.length > 0 && (
                    <div className="rounded-md bg-yellow-50 p-3 text-xs text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
                      <p className="font-medium mb-1">Detalhes dos erros:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {result.errorMessages.map((msg, i) => (
                          <li key={i}>{msg}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <Button type="submit" disabled={loading}>
                <Upload className="mr-2 h-4 w-4" />
                {loading ? "Importando..." : "Importar XML"}
              </Button>
            </form>
          )}
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
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm min-w-[500px]">
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
                        {b.errorRecords > 0 && (
                          <span className="text-destructive ml-1">({b.errorRecords} erros)</span>
                        )}
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

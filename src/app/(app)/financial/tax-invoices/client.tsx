"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Search, FileText, Download } from "lucide-react";

type TaxInvoice = {
  id: string;
  invoiceNumber: string;
  series: string | null;
  issueDate: string;
  cnpjIssuer: string;
  issuerName: string;
  cnpjRecipient: string;
  cfop: string;
  productDescription: string | null;
  totalValue: number;
  icmsValue: number;
  ipiValue: number;
  pisValue: number;
  cofinsValue: number;
  accessKey: string | null;
};

function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length === 14) {
    return digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );
  }
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  return cnpj;
}

export function TaxInvoicesListClient({
  invoices,
}: {
  invoices: TaxInvoice[];
}) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices;
    const term = search.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(term) ||
        inv.issuerName.toLowerCase().includes(term) ||
        inv.cnpjIssuer.includes(term) ||
        inv.cfop.includes(term) ||
        (inv.productDescription || "").toLowerCase().includes(term) ||
        (inv.accessKey || "").includes(term)
    );
  }, [invoices, search]);

  const totalSum = useMemo(
    () => filtered.reduce((sum, inv) => sum + inv.totalValue, 0),
    [filtered]
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total de Notas</p>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-bold">{formatCurrency(totalSum)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">ICMS Total</p>
            <p className="text-2xl font-bold">
              {formatCurrency(
                filtered.reduce((sum, inv) => sum + inv.icmsValue, 0)
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">PIS + COFINS</p>
            <p className="text-2xl font-bold">
              {formatCurrency(
                filtered.reduce(
                  (sum, inv) => sum + inv.pisValue + inv.cofinsValue,
                  0
                )
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por número, emitente, CNPJ, CFOP, chave de acesso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notas Fiscais ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {invoices.length === 0
                ? "Nenhuma nota fiscal importada. Importe via CSV, XML ou QIVE."
                : "Nenhuma nota encontrada com esse filtro."}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium">Nº NF</th>
                    <th className="p-2 text-left font-medium">Data</th>
                    <th className="p-2 text-left font-medium">Emitente</th>
                    <th className="p-2 text-left font-medium">CNPJ Emitente</th>
                    <th className="p-2 text-left font-medium">CFOP</th>
                    <th className="p-2 text-right font-medium">Valor Total</th>
                    <th className="p-2 text-right font-medium">ICMS</th>
                    <th className="p-2 text-right font-medium">PIS</th>
                    <th className="p-2 text-right font-medium">COFINS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <>
                      <tr
                        key={inv.id}
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() =>
                          setExpandedId(
                            expandedId === inv.id ? null : inv.id
                          )
                        }
                      >
                        <td className="p-2 font-mono">
                          {inv.invoiceNumber}
                          {inv.series ? (
                            <span className="text-muted-foreground">
                              /{inv.series}
                            </span>
                          ) : null}
                        </td>
                        <td className="p-2">{formatDate(inv.issueDate)}</td>
                        <td className="p-2 max-w-[200px] truncate">
                          {inv.issuerName || "-"}
                        </td>
                        <td className="p-2 font-mono text-xs">
                          {formatCNPJ(inv.cnpjIssuer)}
                        </td>
                        <td className="p-2">{inv.cfop || "-"}</td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(inv.totalValue)}
                        </td>
                        <td className="p-2 text-right">
                          {formatCurrency(inv.icmsValue)}
                        </td>
                        <td className="p-2 text-right">
                          {formatCurrency(inv.pisValue)}
                        </td>
                        <td className="p-2 text-right">
                          {formatCurrency(inv.cofinsValue)}
                        </td>
                      </tr>
                      {expandedId === inv.id && (
                        <tr key={`${inv.id}-detail`} className="border-b bg-muted/30">
                          <td colSpan={9} className="p-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">Descrição:</span>{" "}
                                {inv.productDescription || "-"}
                              </div>
                              <div>
                                <span className="text-muted-foreground">CNPJ Destinatário:</span>{" "}
                                {inv.cnpjRecipient
                                  ? formatCNPJ(inv.cnpjRecipient)
                                  : "-"}
                              </div>
                              <div>
                                <span className="text-muted-foreground">IPI:</span>{" "}
                                {formatCurrency(inv.ipiValue)}
                              </div>
                              {inv.accessKey && (
                                <div className="sm:col-span-2 lg:col-span-3">
                                  <span className="text-muted-foreground">Chave de Acesso:</span>{" "}
                                  <span className="font-mono text-xs break-all">
                                    {inv.accessKey}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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

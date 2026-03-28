"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  createMigrationBatch,
  uploadMigrationFile,
} from "@/lib/actions/migration";
import { MIGRATION_BATCH_TYPE_LABELS } from "@/lib/constants/statuses";
import type { Role } from "@/generated/prisma";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

const WIZARD_STEPS = [
  { key: "type", label: "1. Tipo do Lote" },
  { key: "upload", label: "2. Upload do Arquivo" },
  { key: "done", label: "3. Proximo Passo" },
];

interface NewMigrationClientProps {
  userRole: Role;
}

export function NewMigrationClient({ userRole }: NewMigrationClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Step 1 state
  const [batchName, setBatchName] = useState("");
  const [batchType, setBatchType] = useState("FULL_INITIAL_LOAD");
  const [description, setDescription] = useState("");
  const [sourceErpName, setSourceErpName] = useState("");

  // Step 2 state
  const [batchId, setBatchId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    totalRows: number;
    entityCounts: Record<string, number>;
    sheets: string[];
  } | null>(null);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  }

  // Step 1: Create batch
  async function handleCreateBatch() {
    if (!batchName.trim()) {
      showFeedback("error", "Informe o nome do lote");
      return;
    }

    startTransition(async () => {
      try {
        const batch = await createMigrationBatch({
          name: batchName.trim(),
          type: batchType,
          description: description.trim() || undefined,
          sourceErpName: sourceErpName.trim() || undefined,
        });
        setBatchId(batch.id);
        setStep(1);
        showFeedback("success", "Lote criado com sucesso!");
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao criar lote");
      }
    });
  }

  // Step 2: Parse file client-side and upload
  async function handleFileUpload() {
    if (!file || !batchId) return;

    startTransition(async () => {
      try {
        // Parse XLSX client-side
        const arrayBuffer = await file.arrayBuffer();
        const { parseExcelFile } = await import("@/lib/utils/excel-parser");
        const sheetsData = await parseExcelFile(arrayBuffer);

        if (sheetsData.length === 0) {
          showFeedback("error", "Nenhuma aba encontrada no arquivo");
          return;
        }

        // Calculate file hash
        const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const fileHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        const result = await uploadMigrationFile(
          batchId,
          sheetsData.map((s) => ({
            sheetName: s.sheetName,
            headers: s.headers,
            rows: s.rows,
          })),
          {
            fileName: file.name,
            fileSize: file.size,
            fileHash,
          }
        );

        setUploadResult(result);
        setStep(2);
        showFeedback("success", `Arquivo processado: ${result.totalRows} linhas em ${result.sheets.length} aba(s)`);
      } catch (err: any) {
        showFeedback("error", err.message || "Erro ao processar arquivo");
      }
    });
  }

  // Download template XLSX
  async function handleDownloadTemplate() {
    const XLSX = await import("xlsx");

    const sheets: { name: string; headers: string[]; example: Record<string, string> }[] = [
      {
        name: "plano_de_contas",
        headers: ["code", "name", "type", "parent_code", "description"],
        example: { code: "1.1.01", name: "Caixa Geral", type: "ASSET", parent_code: "1.1", description: "Conta de caixa principal" },
      },
      {
        name: "centros_de_custo",
        headers: ["code", "name", "description", "active"],
        example: { code: "CC001", name: "Administrativo", description: "Centro de custo administrativo", active: "true" },
      },
      {
        name: "fornecedores",
        headers: ["name", "cnpj_cpf", "email", "phone", "address", "city", "state", "zip_code"],
        example: { name: "Fornecedor ABC Ltda", cnpj_cpf: "12.345.678/0001-90", email: "contato@abc.com", phone: "(11) 99999-0000", address: "Rua Exemplo, 100", city: "Sao Paulo", state: "SP", zip_code: "01000-000" },
      },
      {
        name: "clientes",
        headers: ["name", "cnpj_cpf", "email", "phone", "address", "city", "state", "zip_code"],
        example: { name: "Cliente XYZ S.A.", cnpj_cpf: "98.765.432/0001-10", email: "financeiro@xyz.com", phone: "(21) 98888-0000", address: "Av. Brasil, 500", city: "Rio de Janeiro", state: "RJ", zip_code: "20000-000" },
      },
      {
        name: "bancos_contas",
        headers: ["bank_name", "bank_code", "agency", "account_number", "account_type", "initial_balance"],
        example: { bank_name: "Banco do Brasil", bank_code: "001", agency: "1234-5", account_number: "12345-6", account_type: "CHECKING", initial_balance: "10000.00" },
      },
      {
        name: "formas_pagamento",
        headers: ["name", "type", "description"],
        example: { name: "PIX", type: "PIX", description: "Pagamento via PIX" },
      },
      {
        name: "lancamentos",
        headers: [
          "date",
          "competence_date",
          "due_date",
          "description",
          "amount",
          "type",
          "category",
          "movement_type",
          "financial_nature",
          "chart_of_account_code",
          "cost_center_code",
          "supplier_cnpj_cpf",
          "customer_cnpj_cpf",
          "bank_code",
          "agency",
          "account_number",
          "payment_method",
          "document_number",
          "notes",
        ],
        example: {
          date: "2025-01-15",
          competence_date: "2025-01-01",
          due_date: "2025-02-15",
          description: "Pagamento fornecedor ABC - NF 1234",
          amount: "1500.00",
          type: "DEBIT",
          category: "PAYABLE",
          movement_type: "EXIT",
          financial_nature: "OPERATIONAL",
          chart_of_account_code: "3.1.01",
          cost_center_code: "CC001",
          supplier_cnpj_cpf: "12.345.678/0001-90",
          customer_cnpj_cpf: "",
          bank_code: "001",
          agency: "1234-5",
          account_number: "12345-6",
          payment_method: "PIX",
          document_number: "NF-1234",
          notes: "Ref. contrato 456",
        },
      },
    ];

    const wb = XLSX.utils.book_new();

    for (const sheet of sheets) {
      const data = [sheet.headers, sheet.headers.map((h) => sheet.example[h] ?? "")];
      const ws = XLSX.utils.aoa_to_sheet(data);
      // Auto column widths
      ws["!cols"] = sheet.headers.map((h) => ({
        wch: Math.max(h.length, (sheet.example[h] ?? "").length, 12) + 2,
      }));
      XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    }

    XLSX.writeFile(wb, "modelo_migracao.xlsx");
  }

  return (
    <>
      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-md p-3 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.message}
          <button onClick={() => setFeedback(null)} className="ml-3 font-bold hover:opacity-70">
            ✕
          </button>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                  ? "bg-green-100 text-green-800"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <CheckCircle className="h-4 w-4" /> : null}
              {s.label}
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Batch Info */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informacoes do Lote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nome do Lote *</label>
                  <Input
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="Ex: Carga Inicial - Empresa ABC"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo *</label>
                  <Select
                    value={batchType}
                    onChange={(e) => setBatchType(e.target.value)}
                  >
                    {Object.entries(MIGRATION_BATCH_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Descricao</label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descricao opcional do lote..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">ERP de Origem</label>
                  <Select
                    value={sourceErpName}
                    onChange={(e) => setSourceErpName(e.target.value)}
                  >
                    <option value="">Nenhum / Manual</option>
                    <option value="SAP">SAP</option>
                    <option value="TOTVS">TOTVS / Protheus</option>
                    <option value="OMIE">Omie</option>
                    <option value="BLING">Bling</option>
                    <option value="CONTA_AZUL">Conta Azul</option>
                    <option value="SENIOR">Senior</option>
                    <option value="DOMINIO">Dominio</option>
                    <option value="OUTROS">Outros</option>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => router.push("/migration")}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar
                </Button>
                <Button onClick={handleCreateBatch} disabled={isPending}>
                  {isPending ? "Criando..." : "Criar Lote e Continuar"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: File Upload */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload do Arquivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => document.getElementById("migration-file-input")?.click()}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-12 w-12 text-green-600" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                    >
                      Trocar arquivo
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <p className="font-medium">Clique ou arraste o arquivo aqui</p>
                    <p className="text-sm text-muted-foreground">
                      Aceita: XLSX, CSV (max 50MB)
                    </p>
                  </div>
                )}
                <input
                  id="migration-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFile(f);
                  }}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-blue-900 flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Planilha Modelo
                  </h4>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Baixar Modelo (.xlsx)
                  </Button>
                </div>
                <p className="text-sm text-blue-800 mb-2">
                  Baixe o modelo, preencha com seus dados e faca o upload. A planilha contem:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "plano_de_contas",
                    "centros_de_custo",
                    "fornecedores",
                    "clientes",
                    "bancos_contas",
                    "formas_pagamento",
                    "lancamentos",
                  ].map((name) => (
                    <Badge key={name} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Dicas
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Cada aba representa uma entidade - inclua apenas as que precisar</li>
                  <li>A primeira linha deve conter os cabecalhos (ja preenchidos no modelo)</li>
                  <li>A segunda linha do modelo tem um exemplo - apague antes de enviar</li>
                  <li>Campos obrigatorios estao indicados nos cabecalhos de cada aba</li>
                </ul>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(0)} disabled={isPending}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={handleFileUpload} disabled={isPending || !file}>
                  {isPending ? "Processando..." : "Enviar e Processar"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Done / Next */}
      {step === 2 && uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Arquivo Processado com Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{uploadResult.totalRows}</p>
                  <p className="text-xs text-muted-foreground">Linhas Totais</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{uploadResult.sheets.length}</p>
                  <p className="text-xs text-muted-foreground">Entidades Detectadas</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Entidades encontradas:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(uploadResult.entityCounts).map(([entity, count]) => (
                    <Badge key={entity} variant="outline">
                      {entity}: {count} linhas
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium">Proximo passo:</p>
                <p>Acesse o detalhe do lote para configurar o mapeamento de colunas, validar os dados e aprovar a importacao.</p>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => router.push("/migration")}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Overview
                </Button>
                <Button onClick={() => router.push(`/migration/batches/${batchId}`)}>
                  Ir para o Lote
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

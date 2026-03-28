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
  const [expectedTotal, setExpectedTotal] = useState("");

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
          expectedTotalAmount: expectedTotal ? parseFloat(expectedTotal) : undefined,
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
                <div>
                  <label className="text-sm font-medium">Valor Total Esperado (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={expectedTotal}
                    onChange={(e) => setExpectedTotal(e.target.value)}
                    placeholder="Para conferencia..."
                  />
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

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Dicas para o arquivo
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Cada aba deve representar uma entidade (ex: plano_de_contas, fornecedores)</li>
                  <li>A primeira linha deve conter os cabecalhos das colunas</li>
                  <li>Nomes de aba aceitos: plano_de_contas, centros_de_custo, fornecedores, clientes, bancos_contas, formas_pagamento</li>
                  <li>Use o template padrao para melhor compatibilidade</li>
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

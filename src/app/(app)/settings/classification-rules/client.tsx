"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { deleteClassificationRule, deleteValidationRule } from "@/lib/actions/rules";
import { RULE_ACTION_TYPE_LABELS } from "@/lib/constants/statuses";
import { useRouter } from "next/navigation";

interface ClassificationRule {
  id: string;
  priority: number;
  field: string;
  pattern: string;
  conditionType: string;
  actionType: string;
  confidence: number;
  description: string | null;
  minAmount: string | null;
  maxAmount: string | null;
  active: boolean;
  chartOfAccount: { code: string; name: string } | null;
  costCenter: { code: string; name: string } | null;
  supplier: { name: string } | null;
  customer: { name: string } | null;
}

interface ValidationRule {
  id: string;
  name: string;
  description: string | null;
  ruleType: string;
  actionType: string;
  active: boolean;
  createdAt: string;
}

const FIELD_LABELS: Record<string, string> = {
  CNPJ: "CNPJ",
  DESCRIPTION: "Descricao",
  VALUE_RANGE: "Faixa de Valor",
};

export default function ClassificationRulesClient({
  classificationRules,
  validationRules,
  chartOfAccounts,
  costCenters,
  suppliers,
  customers,
}: {
  classificationRules: ClassificationRule[];
  validationRules: ValidationRule[];
  chartOfAccounts: { id: string; code: string; name: string }[];
  costCenters: { id: string; code: string; name: string }[];
  suppliers: { id: string; name: string }[];
  customers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"classification" | "validation">("classification");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  }

  function handleDeleteClassification(id: string) {
    startTransition(async () => {
      try {
        await deleteClassificationRule(id);
        showFeedback("success", "Regra removida");
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message);
      }
    });
  }

  function handleDeleteValidation(id: string) {
    startTransition(async () => {
      try {
        await deleteValidationRule(id);
        showFeedback("success", "Regra de validacao removida");
        router.refresh();
      } catch (err: any) {
        showFeedback("error", err.message);
      }
    });
  }

  return (
    <div className="space-y-4">
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

      {/* Tab buttons */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "classification" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("classification")}
        >
          Classificacao ({classificationRules.length})
        </Button>
        <Button
          variant={activeTab === "validation" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("validation")}
        >
          Validacao ({validationRules.length})
        </Button>
      </div>

      {activeTab === "classification" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Regras de Classificacao Automatica</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Prior.</TableHead>
                  <TableHead>Campo</TableHead>
                  <TableHead>Padrao</TableHead>
                  <TableHead>Condicao</TableHead>
                  <TableHead>Acao</TableHead>
                  <TableHead className="w-20">Confianca</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classificationRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Nenhuma regra cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  classificationRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-mono">{rule.priority}</TableCell>
                      <TableCell>{FIELD_LABELS[rule.field] || rule.field}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        {rule.pattern}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.conditionType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={rule.actionType === "BLOCK" ? "destructive" : "secondary"}
                        >
                          {RULE_ACTION_TYPE_LABELS[rule.actionType as keyof typeof RULE_ACTION_TYPE_LABELS] || rule.actionType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={rule.confidence >= 80 ? "text-green-600" : "text-amber-600"}>
                          {rule.confidence}%
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {rule.chartOfAccount
                          ? `${rule.chartOfAccount.code} - ${rule.chartOfAccount.name}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.active ? "default" : "secondary"}>
                          {rule.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClassification(rule.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Regras de Validacao</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Acao</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validationRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma regra de validacao cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  validationRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.ruleType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {RULE_ACTION_TYPE_LABELS[rule.actionType as keyof typeof RULE_ACTION_TYPE_LABELS] || rule.actionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[250px] truncate">
                        {rule.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.active ? "default" : "secondary"}>
                          {rule.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteValidation(rule.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

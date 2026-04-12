"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { UpcomingPayment } from "@/lib/actions/dashboard";

interface UpcomingPaymentsProps {
  data: UpcomingPayment[];
}

export function UpcomingPayments({ data }: UpcomingPaymentsProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            Proximos Vencimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] sm:h-[300px] items-center justify-center text-sm text-muted-foreground">
            Nenhum vencimento nos proximos 7 dias
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          Proximos Vencimentos
          <Badge variant="secondary" className="ml-auto text-xs">
            {data.length} {data.length === 1 ? "titulo" : "titulos"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[300px] overflow-y-auto">
          <div className="divide-y divide-border">
            {data.map((item) => {
              const remaining = item.amount - item.paidAmount;
              const daysLeft = item.dueDate
                ? Math.ceil(
                    (new Date(item.dueDate).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24)
                  )
                : 0;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {item.description}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.supplierName ?? "Sem fornecedor"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-red-600">
                      {formatCurrency(remaining)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.dueDate ? formatDate(item.dueDate) : "—"}
                      {daysLeft <= 1 && (
                        <span className="ml-1 text-amber-600 font-medium">
                          {daysLeft <= 0 ? "Hoje" : "Amanha"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

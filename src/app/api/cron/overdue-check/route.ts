import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// POST /api/cron/overdue-check
// Detects past-due entries and updates their status to OVERDUE.
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  // 1. Verify cron secret from Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  try {
    // 2. Find all OfficialEntry where:
    //    - status is OPEN or PARTIAL (not already OVERDUE)
    //    - dueDate < today (past due)
    //    - category is PAYABLE or RECEIVABLE
    //    - tenantId IS NOT NULL (data integrity)
    const overdueEntries = await db.officialEntry.findMany({
      where: {
        tenantId: { not: "" },
        status: { in: ["OPEN", "PARTIAL"] },
        category: { in: ["PAYABLE", "RECEIVABLE"] },
        dueDate: {
          not: null,
          lt: today,
        },
      },
      select: {
        id: true,
        tenantId: true,
        sequentialNumber: true,
        status: true,
        category: true,
        dueDate: true,
        amount: true,
        description: true,
        incorporatedById: true,
      },
    });

    let overduePayables = 0;
    let overdueReceivables = 0;
    const errors: string[] = [];

    // 3. Process each overdue entry:
    //    - Update status to OVERDUE
    //    - Create AuditLog for traceability
    for (const entry of overdueEntries) {
      try {
        await db.$transaction(async (tx) => {
          // Update the entry status to OVERDUE
          await tx.officialEntry.update({
            where: { id: entry.id },
            data: { status: "OVERDUE" },
          });

          // Create audit log
          await tx.auditLog.create({
            data: {
              tenantId: entry.tenantId,
              tableName: "OfficialEntry",
              recordId: entry.id,
              action: "UPDATE",
              oldValues: {
                status: entry.status,
              },
              newValues: {
                status: "OVERDUE",
                overdueDetectedAt: today.toISOString(),
                dueDate: entry.dueDate?.toISOString() ?? null,
              },
              userId: entry.incorporatedById,
              userEmail: "system@cron",
            },
          });
        });

        if (entry.category === "PAYABLE") {
          overduePayables++;
        } else if (entry.category === "RECEIVABLE") {
          overdueReceivables++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Entry #${entry.sequentialNumber} (${entry.id}): ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        checked: overdueEntries.length,
        overduePayables,
        overdueReceivables,
        errors,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 },
    );
  }
}

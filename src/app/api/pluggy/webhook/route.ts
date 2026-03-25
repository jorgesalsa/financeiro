import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { syncTransactionsFromPluggy } from "@/lib/services/pluggy-sync";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Pluggy webhook payload: { event: string, data: { item: { id: string, ... } } }
    const event = body?.event as string | undefined;
    const itemId = body?.data?.item?.id as string | undefined;

    if (!event || !itemId) {
      return NextResponse.json(
        { error: "Payload invalido" },
        { status: 400 }
      );
    }

    // Find the connection by pluggyItemId
    const connection = await prisma.pluggyConnection.findUnique({
      where: { pluggyItemId: itemId },
      include: {
        createdBy: { select: { id: true, email: true } },
      },
    });

    if (!connection) {
      // Connection not found — might have been deleted
      return NextResponse.json({ ok: true, message: "Connection not found, skipped" });
    }

    switch (event) {
      case "item/updated": {
        // Update connection status
        await prisma.pluggyConnection.update({
          where: { id: connection.id },
          data: { status: "UPDATED", executionError: null },
        });

        // Auto-sync if bank account is linked
        if (connection.bankAccountId && connection.pluggyAccountId) {
          try {
            await syncTransactionsFromPluggy({
              tenantId: connection.tenantId,
              userId: connection.createdById,
              userEmail: connection.createdBy.email,
              connectionId: connection.id,
              pluggyAccountId: connection.pluggyAccountId,
              bankAccountId: connection.bankAccountId,
              connectorName: connection.connectorName,
            });
          } catch (syncError) {
            console.error("[Pluggy Webhook] Auto-sync error:", syncError);
          }
        }
        break;
      }

      case "item/error": {
        const errorMessage =
          body?.data?.item?.error?.message || "Erro na conexao";
        await prisma.pluggyConnection.update({
          where: { id: connection.id },
          data: { status: "ERROR", executionError: errorMessage },
        });
        break;
      }

      case "item/deleted": {
        await prisma.pluggyConnection.delete({
          where: { id: connection.id },
        });
        break;
      }

      case "transactions/updated": {
        // Trigger sync for updated transactions
        if (connection.bankAccountId && connection.pluggyAccountId) {
          try {
            await syncTransactionsFromPluggy({
              tenantId: connection.tenantId,
              userId: connection.createdById,
              userEmail: connection.createdBy.email,
              connectionId: connection.id,
              pluggyAccountId: connection.pluggyAccountId,
              bankAccountId: connection.bankAccountId,
              connectorName: connection.connectorName,
            });
          } catch (syncError) {
            console.error("[Pluggy Webhook] Sync error:", syncError);
          }
        }
        break;
      }

      default:
        // Unknown event — just acknowledge
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Pluggy Webhook] Error:", error);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}

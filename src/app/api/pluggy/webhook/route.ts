import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import { syncTransactionsFromPluggy } from "@/lib/services/pluggy-sync";

export async function POST(request: Request) {
  try {
    // SECURITY: Require webhook secret — reject if not configured
    const webhookSecret = process.env.PLUGGY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[Pluggy Webhook] PLUGGY_WEBHOOK_SECRET not configured");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // SECURITY: Constant-time comparison to prevent timing attacks
    const authHeader = request.headers.get("x-pluggy-signature") || request.headers.get("authorization");
    const providedToken = authHeader?.replace(/^Bearer\s+/i, "") ?? "";

    const secretBuf = Buffer.from(webhookSecret, "utf-8");
    const providedBuf = Buffer.from(providedToken, "utf-8");

    if (secretBuf.length !== providedBuf.length || !crypto.timingSafeEqual(secretBuf, providedBuf)) {
      console.warn("[Pluggy Webhook] Unauthorized: invalid signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const batch = await prisma.migrationBatch.findFirst({
    where: { status: "VALIDATED" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, _count: { select: { errors: true, items: true } } },
  });

  if (batch === null) {
    console.log("No validated batch found");
    return;
  }

  console.log("=== LOTE:", batch.name, "===");
  console.log("Itens:", batch._count.items, "| Erros:", batch._count.errors);
  console.log("");

  const errors = await prisma.migrationError.groupBy({
    by: ["code", "field", "severity"],
    where: { batchId: batch.id },
    _count: true,
    orderBy: { _count: { id: "desc" } },
  });

  console.log("=== ERROS AGRUPADOS (codigo + campo) ===");
  console.log("");
  for (const e of errors) {
    console.log(`[${e.severity}] ${e.code} | campo: ${e.field ?? "—"} | qty: ${e._count}`);
  }

  // Count by entity type
  console.log("");
  console.log("=== ERROS POR ENTIDADE ===");
  const byEntity: any[] = await prisma.$queryRaw`
    SELECT mi."entityType", me.code, me.field, COUNT(*)::int as qty
    FROM "MigrationError" me
    JOIN "MigrationItem" mi ON me."itemId" = mi.id
    WHERE me."batchId" = ${batch.id}
    GROUP BY mi."entityType", me.code, me.field
    ORDER BY qty DESC
  `;
  for (const r of byEntity) {
    console.log(`${r.entityType} | ${r.code} | ${r.field ?? "—"} | qty: ${r.qty}`);
  }

  await prisma.$disconnect();
}

main();

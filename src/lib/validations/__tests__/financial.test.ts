import { describe, it, expect } from "vitest";
import {
  officialEntrySchema,
  settlementSchema,
  installmentSchema,
  recurringRuleSchema,
} from "../financial";

describe("Financial Validations", () => {
  describe("officialEntrySchema", () => {
    const validEntry = {
      date: "2024-03-15",
      competenceDate: "2024-03-01",
      description: "Pagamento fornecedor",
      amount: 1500.5,
      type: "DEBIT",
      category: "PAYABLE",
      chartOfAccountId: "chart-1",
      bankAccountId: "bank-1",
    };

    it("should accept a valid entry", () => {
      const result = officialEntrySchema.safeParse(validEntry);
      expect(result.success).toBe(true);
    });

    it("should require date", () => {
      const result = officialEntrySchema.safeParse({
        ...validEntry,
        date: undefined,
      });
      expect(result.success).toBe(false);
    });

    it("should require competenceDate (RA01)", () => {
      const result = officialEntrySchema.safeParse({
        ...validEntry,
        competenceDate: undefined,
      });
      expect(result.success).toBe(false);
    });

    it("should require description", () => {
      const result = officialEntrySchema.safeParse({
        ...validEntry,
        description: "",
      });
      expect(result.success).toBe(false);
    });

    it("should require positive amount", () => {
      const result = officialEntrySchema.safeParse({
        ...validEntry,
        amount: -100,
      });
      expect(result.success).toBe(false);
    });

    it("should reject zero amount", () => {
      const result = officialEntrySchema.safeParse({
        ...validEntry,
        amount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should only accept CREDIT or DEBIT type", () => {
      const result = officialEntrySchema.safeParse({
        ...validEntry,
        type: "INVALID",
      });
      expect(result.success).toBe(false);
    });

    it("should accept all valid categories", () => {
      for (const category of [
        "PAYABLE",
        "RECEIVABLE",
        "TRANSFER",
        "ADJUSTMENT",
      ]) {
        const result = officialEntrySchema.safeParse({
          ...validEntry,
          category,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should require chartOfAccountId", () => {
      const result = officialEntrySchema.safeParse({
        ...validEntry,
        chartOfAccountId: "",
      });
      expect(result.success).toBe(false);
    });

    it("should require bankAccountId", () => {
      const result = officialEntrySchema.safeParse({
        ...validEntry,
        bankAccountId: "",
      });
      expect(result.success).toBe(false);
    });

    it("should accept optional taxonomy fields (RA05)", () => {
      const result = officialEntrySchema.safeParse({
        ...validEntry,
        movementType: "ENTRY",
        financialNature: "OPERATIONAL",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null taxonomy fields", () => {
      const result = officialEntrySchema.safeParse({
        ...validEntry,
        movementType: null,
        financialNature: null,
      });
      expect(result.success).toBe(true);
    });

    it("should coerce string date to Date object", () => {
      const result = officialEntrySchema.safeParse(validEntry);
      if (result.success) {
        expect(result.data.date).toBeInstanceOf(Date);
        expect(result.data.competenceDate).toBeInstanceOf(Date);
      }
    });

    it("should coerce string amount to number", () => {
      const result = officialEntrySchema.safeParse({
        ...validEntry,
        amount: "1500.50",
      });
      if (result.success) {
        expect(typeof result.data.amount).toBe("number");
        expect(result.data.amount).toBe(1500.5);
      }
    });
  });

  describe("settlementSchema", () => {
    const validSettlement = {
      officialEntryId: "entry-1",
      date: "2024-03-20",
      amount: 500,
      bankAccountId: "bank-1",
    };

    it("should accept a valid settlement", () => {
      const result = settlementSchema.safeParse(validSettlement);
      expect(result.success).toBe(true);
    });

    it("should require officialEntryId", () => {
      const result = settlementSchema.safeParse({
        ...validSettlement,
        officialEntryId: "",
      });
      expect(result.success).toBe(false);
    });

    it("should accept optional settlementDate (RA01)", () => {
      const result = settlementSchema.safeParse({
        ...validSettlement,
        settlementDate: "2024-03-22",
      });
      expect(result.success).toBe(true);
    });

    it("should default financial amounts to 0", () => {
      const result = settlementSchema.safeParse(validSettlement);
      if (result.success) {
        expect(result.data.interestAmount).toBe(0);
        expect(result.data.fineAmount).toBe(0);
        expect(result.data.discountAmount).toBe(0);
      }
    });

    it("should reject negative interest", () => {
      const result = settlementSchema.safeParse({
        ...validSettlement,
        interestAmount: -10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("installmentSchema", () => {
    it("should require at least 2 installments", () => {
      const result = installmentSchema.safeParse({
        officialEntryId: "entry-1",
        numberOfInstallments: 1,
        firstDueDate: "2024-04-01",
      });
      expect(result.success).toBe(false);
    });

    it("should accept max 360 installments", () => {
      const result = installmentSchema.safeParse({
        officialEntryId: "entry-1",
        numberOfInstallments: 361,
        firstDueDate: "2024-04-01",
      });
      expect(result.success).toBe(false);
    });

    it("should default intervalDays to 30", () => {
      const result = installmentSchema.safeParse({
        officialEntryId: "entry-1",
        numberOfInstallments: 3,
        firstDueDate: "2024-04-01",
      });
      if (result.success) {
        expect(result.data.intervalDays).toBe(30);
      }
    });
  });

  describe("recurringRuleSchema", () => {
    it("should accept all valid frequencies", () => {
      const frequencies = [
        "DAILY",
        "WEEKLY",
        "BIWEEKLY",
        "MONTHLY",
        "BIMONTHLY",
        "QUARTERLY",
        "SEMIANNUAL",
        "ANNUAL",
      ];
      for (const frequency of frequencies) {
        const result = recurringRuleSchema.safeParse({
          name: "Test Rule",
          amount: 100,
          type: "DEBIT",
          category: "PAYABLE",
          chartOfAccountId: "chart-1",
          bankAccountId: "bank-1",
          frequency,
          startDate: "2024-01-01",
        });
        expect(result.success).toBe(true);
      }
    });
  });
});

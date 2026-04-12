import { describe, it, expect } from "vitest";
import { stagingEntrySchema } from "../staging";

describe("Staging Validations", () => {
  describe("stagingEntrySchema", () => {
    const validEntry = {
      date: "2024-03-15",
      description: "Import bank statement",
      amount: 250.0,
      type: "CREDIT",
    };

    it("should accept a valid minimal entry", () => {
      const result = stagingEntrySchema.safeParse(validEntry);
      expect(result.success).toBe(true);
    });

    it("should require date", () => {
      const { date, ...rest } = validEntry;
      const result = stagingEntrySchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("should require description", () => {
      const result = stagingEntrySchema.safeParse({
        ...validEntry,
        description: "",
      });
      expect(result.success).toBe(false);
    });

    it("should require positive amount", () => {
      const result = stagingEntrySchema.safeParse({
        ...validEntry,
        amount: -100,
      });
      expect(result.success).toBe(false);
    });

    it("should require type", () => {
      const { type, ...rest } = validEntry;
      const result = stagingEntrySchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("should allow optional fields as null", () => {
      const result = stagingEntrySchema.safeParse({
        ...validEntry,
        dueDate: null,
        competenceDate: null,
        chartOfAccountId: null,
        costCenterId: null,
        supplierId: null,
        customerId: null,
        bankAccountId: null,
        paymentMethodId: null,
        notes: null,
        movementType: null,
        financialNature: null,
      });
      expect(result.success).toBe(true);
    });

    it("should accept taxonomy fields (RA05)", () => {
      const result = stagingEntrySchema.safeParse({
        ...validEntry,
        movementType: "ENTRY",
        financialNature: "OPERATIONAL",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid movementType", () => {
      const result = stagingEntrySchema.safeParse({
        ...validEntry,
        movementType: "INVALID",
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid pendingSettlement", () => {
      const result = stagingEntrySchema.safeParse({
        ...validEntry,
        pendingSettlement: {
          amount: 250,
          date: "2024-03-15",
          bankAccountId: "bank-1",
        },
      });
      expect(result.success).toBe(true);
    });

    it("should reject pendingSettlement with negative amount", () => {
      const result = stagingEntrySchema.safeParse({
        ...validEntry,
        pendingSettlement: {
          amount: -10,
          date: "2024-03-15",
          bankAccountId: "bank-1",
        },
      });
      expect(result.success).toBe(false);
    });

    it("should require bankAccountId in pendingSettlement", () => {
      const result = stagingEntrySchema.safeParse({
        ...validEntry,
        pendingSettlement: {
          amount: 250,
          date: "2024-03-15",
          bankAccountId: "",
        },
      });
      expect(result.success).toBe(false);
    });

    it("should default settlement financial amounts to 0", () => {
      const result = stagingEntrySchema.safeParse({
        ...validEntry,
        pendingSettlement: {
          amount: 250,
          date: "2024-03-15",
          bankAccountId: "bank-1",
        },
      });
      if (result.success && result.data.pendingSettlement) {
        expect(result.data.pendingSettlement.interestAmount).toBe(0);
        expect(result.data.pendingSettlement.fineAmount).toBe(0);
        expect(result.data.pendingSettlement.discountAmount).toBe(0);
      }
    });
  });
});

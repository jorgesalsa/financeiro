import { describe, it, expect } from "vitest";
import { assertFieldsNotMutated } from "../immutability";

describe("Immutability Service", () => {
  describe("assertFieldsNotMutated", () => {
    const currentRecord = {
      date: new Date("2024-01-15"),
      competenceDate: new Date("2024-01-15"),
      amount: 1000,
      type: "DEBIT",
      category: "PAYABLE",
      chartOfAccountId: "chart-1",
      incorporatedById: "user-1",
      incorporatedAt: new Date("2024-01-20"),
      stagingEntryId: "staging-1",
      sequentialNumber: 42,
      // Mutable fields
      description: "Original description",
      costCenterId: "cc-1",
      notes: "Some notes",
    };

    it("should allow updating mutable fields", () => {
      expect(() =>
        assertFieldsNotMutated(currentRecord, {
          description: "Updated description",
          costCenterId: "cc-2",
          notes: "Updated notes",
        })
      ).not.toThrow();
    });

    it("should allow passing immutable fields with same value", () => {
      expect(() =>
        assertFieldsNotMutated(currentRecord, {
          amount: 1000,
          type: "DEBIT",
        })
      ).not.toThrow();
    });

    it("should throw when changing amount", () => {
      expect(() =>
        assertFieldsNotMutated(currentRecord, { amount: 2000 })
      ).toThrow(/Campos imutáveis/);
    });

    it("should throw when changing type", () => {
      expect(() =>
        assertFieldsNotMutated(currentRecord, { type: "CREDIT" })
      ).toThrow(/Campos imutáveis/);
    });

    it("should throw when changing category", () => {
      expect(() =>
        assertFieldsNotMutated(currentRecord, { category: "RECEIVABLE" })
      ).toThrow(/Campos imutáveis/);
    });

    it("should throw when changing chartOfAccountId", () => {
      expect(() =>
        assertFieldsNotMutated(currentRecord, {
          chartOfAccountId: "chart-999",
        })
      ).toThrow(/Campos imutáveis/);
    });

    it("should throw when changing sequentialNumber", () => {
      expect(() =>
        assertFieldsNotMutated(currentRecord, { sequentialNumber: 99 })
      ).toThrow(/Campos imutáveis/);
    });

    it("should list all violated fields in error message", () => {
      try {
        assertFieldsNotMutated(currentRecord, {
          amount: 2000,
          type: "CREDIT",
          category: "RECEIVABLE",
        });
      } catch (err: unknown) {
        const message = (err as Error).message;
        expect(message).toContain("amount");
        expect(message).toContain("type");
        expect(message).toContain("category");
      }
    });

    it("should handle Date comparison correctly", () => {
      // Same date, different object — should not throw
      expect(() =>
        assertFieldsNotMutated(currentRecord, {
          date: new Date("2024-01-15"),
        })
      ).not.toThrow();

      // Different date — should throw
      expect(() =>
        assertFieldsNotMutated(currentRecord, {
          date: new Date("2024-02-01"),
        })
      ).toThrow(/Campos imutáveis/);
    });

    it("should handle null values", () => {
      const recordWithNull = { ...currentRecord, stagingEntryId: null };
      expect(() =>
        assertFieldsNotMutated(recordWithNull, { stagingEntryId: "new-id" })
      ).toThrow(/Campos imutáveis/);
    });
  });
});

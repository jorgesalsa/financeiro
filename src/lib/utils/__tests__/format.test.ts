import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDecimal,
  formatPercentage,
} from "../format";

describe("Format Utilities", () => {
  describe("formatCurrency", () => {
    it("should format number as BRL currency", () => {
      const result = formatCurrency(1500.5);
      expect(result).toContain("1.500,50");
      expect(result).toContain("R$");
    });

    it("should format string number as currency", () => {
      const result = formatCurrency("2500.75");
      expect(result).toContain("2.500,75");
    });

    it("should handle zero", () => {
      const result = formatCurrency(0);
      expect(result).toContain("0,00");
    });

    it("should handle negative values", () => {
      const result = formatCurrency(-100);
      expect(result).toContain("100,00");
    });

    it("should handle large numbers", () => {
      const result = formatCurrency(1000000);
      expect(result).toContain("1.000.000,00");
    });
  });

  describe("formatDate", () => {
    it("should format Date object to pt-BR format", () => {
      const result = formatDate(new Date("2024-03-15T12:00:00Z"));
      expect(result).toMatch(/15\/03\/2024/);
    });

    it("should format date string", () => {
      // Use ISO string with explicit time to avoid timezone shift
      const result = formatDate("2024-12-25T12:00:00");
      expect(result).toMatch(/25\/12\/2024/);
    });
  });

  describe("formatDateTime", () => {
    it("should include both date and time", () => {
      const result = formatDateTime(new Date("2024-03-15T14:30:00Z"));
      expect(result).toMatch(/15\/03/);
      // Time will vary by timezone, just check it has some time format
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe("formatDecimal", () => {
    it("should format with default 2 decimal places", () => {
      const result = formatDecimal(1234.5);
      expect(result).toBe("1.234,50");
    });

    it("should format with custom decimal places", () => {
      const result = formatDecimal(1234.5678, 3);
      expect(result).toBe("1.234,568");
    });

    it("should format string input", () => {
      const result = formatDecimal("999.99");
      expect(result).toBe("999,99");
    });
  });

  describe("formatPercentage", () => {
    it("should format number as percentage", () => {
      const result = formatPercentage(85);
      expect(result).toMatch(/85,0%/);
    });

    it("should handle decimal percentages", () => {
      const result = formatPercentage(33.3);
      expect(result).toMatch(/33,3%/);
    });

    it("should handle zero", () => {
      const result = formatPercentage(0);
      expect(result).toMatch(/0,0%/);
    });

    it("should handle 100%", () => {
      const result = formatPercentage(100);
      expect(result).toMatch(/100,0%/);
    });
  });
});

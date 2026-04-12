import { describe, it, expect } from "vitest";
import {
  formatCnpj,
  formatCpf,
  formatCnpjCpf,
  validateCnpj,
  validateCpf,
} from "../cnpj-cpf";

describe("CNPJ/CPF Utilities", () => {
  describe("formatCnpj", () => {
    it("should format 14 digits as CNPJ", () => {
      expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
    });

    it("should strip non-digits before formatting", () => {
      expect(formatCnpj("11.222.333/0001-81")).toBe("11.222.333/0001-81");
    });
  });

  describe("formatCpf", () => {
    it("should format 11 digits as CPF", () => {
      expect(formatCpf("12345678909")).toBe("123.456.789-09");
    });

    it("should strip non-digits before formatting", () => {
      expect(formatCpf("123.456.789-09")).toBe("123.456.789-09");
    });
  });

  describe("formatCnpjCpf", () => {
    it("should auto-detect and format CNPJ (14 digits)", () => {
      expect(formatCnpjCpf("11222333000181")).toBe("11.222.333/0001-81");
    });

    it("should auto-detect and format CPF (11 digits)", () => {
      expect(formatCnpjCpf("12345678909")).toBe("123.456.789-09");
    });

    it("should return original value for other lengths", () => {
      expect(formatCnpjCpf("12345")).toBe("12345");
    });
  });

  describe("validateCnpj", () => {
    it("should validate a valid CNPJ", () => {
      // CNPJ known to pass validation: 11.222.333/0001-81
      expect(validateCnpj("11222333000181")).toBe(true);
    });

    it("should reject CNPJ with wrong length", () => {
      expect(validateCnpj("1234567890")).toBe(false);
    });

    it("should reject CNPJ with all same digits", () => {
      expect(validateCnpj("11111111111111")).toBe(false);
      expect(validateCnpj("00000000000000")).toBe(false);
    });

    it("should reject CNPJ with invalid check digits", () => {
      expect(validateCnpj("11222333000182")).toBe(false);
    });

    it("should handle formatted CNPJ", () => {
      expect(validateCnpj("11.222.333/0001-81")).toBe(true);
    });
  });

  describe("validateCpf", () => {
    it("should validate a valid CPF", () => {
      // CPF 529.982.247-25 is a commonly used test CPF
      expect(validateCpf("52998224725")).toBe(true);
    });

    it("should reject CPF with wrong length", () => {
      expect(validateCpf("12345")).toBe(false);
    });

    it("should reject CPF with all same digits", () => {
      expect(validateCpf("11111111111")).toBe(false);
      expect(validateCpf("00000000000")).toBe(false);
    });

    it("should reject CPF with invalid check digits", () => {
      expect(validateCpf("52998224726")).toBe(false);
    });

    it("should handle formatted CPF", () => {
      expect(validateCpf("529.982.247-25")).toBe(true);
    });
  });
});

import { describe, it, expect } from "vitest";
import { assertValidTransition } from "../staging";
import type { StagingStatus } from "@/generated/prisma";

describe("Staging State Machine", () => {
  describe("assertValidTransition", () => {
    const validTransitions: [StagingStatus, StagingStatus][] = [
      ["PENDING", "PARSED"],
      ["PENDING", "REJECTED"],
      ["PARSED", "NORMALIZED"],
      ["PARSED", "REJECTED"],
      ["NORMALIZED", "AUTO_CLASSIFIED"],
      ["NORMALIZED", "CONFLICT"],
      ["NORMALIZED", "VALIDATED"],
      ["NORMALIZED", "REJECTED"],
      ["AUTO_CLASSIFIED", "VALIDATED"],
      ["AUTO_CLASSIFIED", "CONFLICT"],
      ["AUTO_CLASSIFIED", "REJECTED"],
      ["CONFLICT", "AUTO_CLASSIFIED"],
      ["CONFLICT", "VALIDATED"],
      ["CONFLICT", "REJECTED"],
      ["VALIDATED", "INCORPORATED"],
      ["VALIDATED", "REJECTED"],
      ["REJECTED", "PENDING"],
    ];

    it.each(validTransitions)(
      "should allow transition from %s to %s",
      (from, to) => {
        expect(() => assertValidTransition(from, to)).not.toThrow();
      }
    );

    const invalidTransitions: [StagingStatus, StagingStatus][] = [
      ["PENDING", "VALIDATED"],
      ["PENDING", "INCORPORATED"],
      ["PENDING", "AUTO_CLASSIFIED"],
      ["PARSED", "INCORPORATED"],
      ["PARSED", "VALIDATED"],
      ["VALIDATED", "PENDING"],
      ["VALIDATED", "PARSED"],
      ["INCORPORATED", "PENDING"],
      ["INCORPORATED", "REJECTED"],
      ["INCORPORATED", "VALIDATED"],
      ["REJECTED", "VALIDATED"],
      ["REJECTED", "INCORPORATED"],
    ];

    it.each(invalidTransitions)(
      "should reject transition from %s to %s",
      (from, to) => {
        expect(() => assertValidTransition(from, to)).toThrow(
          /Transição inválida/
        );
      }
    );

    it("should include allowed transitions in error message", () => {
      try {
        assertValidTransition("PENDING", "INCORPORATED");
      } catch (err: unknown) {
        const message = (err as Error).message;
        expect(message).toContain("PENDING");
        expect(message).toContain("INCORPORATED");
        expect(message).toContain("PARSED");
      }
    });

    it("should report no allowed transitions for INCORPORATED", () => {
      try {
        assertValidTransition("INCORPORATED", "PENDING");
      } catch (err: unknown) {
        const message = (err as Error).message;
        expect(message).toContain("nenhuma");
      }
    });
  });
});

/**
 * Tests for useHXStream restore logic.
 *
 * Phase 1: isBlockingEntry — the pure helper that decides whether a restored
 * step entry is an active pipeline blocker or an already-resolved warning.
 */
import { describe, it, expect } from "vitest";
import { isBlockingEntry } from "../hooks/useHXStream";

// ── isBlockingEntry ───────────────────────────────────────────────────────────

describe("isBlockingEntry", () => {
  describe("WARNING steps", () => {
    it("is not blocking when a later step exists (auto-resolved warning)", () => {
      // Arrange: step 7 WARNING, step 8 APPROVED — pipeline moved past it
      const entries = [
        { step: 7, state: "WARNING", data: { options: ["opt1"] } },
        { step: 8, state: "APPROVED", data: {} },
      ];

      // Act
      const blockingEntries = entries.filter((e) => isBlockingEntry(e, entries));

      // Assert
      expect(blockingEntries).toHaveLength(0);
    });

    it("is blocking when it is the last step (pipeline stopped here)", () => {
      // Arrange: step 8 APPROVED, step 9 WARNING — nothing ran after step 9
      const entries = [
        { step: 8, state: "APPROVED", data: {} },
        { step: 9, state: "WARNING", data: { options: ["opt1"] } },
      ];

      // Act
      const blockingEntries = entries.filter((e) => isBlockingEntry(e, entries));

      // Assert
      expect(blockingEntries).toHaveLength(1);
      expect(blockingEntries[0].step).toBe(9);
    });

    it("treats only the last WARNING as blocking when multiple WARNINGs exist", () => {
      // Arrange: primary bug scenario — steps 7, 9, 11 all WARNING with later
      // steps after 7 and 9, but step 11 is the last entry
      const entries = [
        { step: 7,  state: "WARNING",  data: { options: ["opt"] } },
        { step: 8,  state: "APPROVED", data: {} },
        { step: 9,  state: "WARNING",  data: { options: ["opt"] } },
        { step: 10, state: "APPROVED", data: {} },
        { step: 11, state: "WARNING",  data: { options: ["opt"] } },
      ];

      // Act
      const blockingEntries = entries.filter((e) => isBlockingEntry(e, entries));

      // Assert — only step 11 is blocking; 7 and 9 are auto-resolved
      expect(blockingEntries).toHaveLength(1);
      expect(blockingEntries[0].step).toBe(11);
    });

    it("is not blocking when WARNING has no options but a later step exists", () => {
      // Arrange: informational WARNING (no options) followed by a later step
      const entries = [
        { step: 5, state: "WARNING", data: {} },
        { step: 6, state: "APPROVED", data: {} },
      ];

      // Act
      const blockingEntries = entries.filter((e) => isBlockingEntry(e, entries));

      // Assert
      expect(blockingEntries).toHaveLength(0);
    });
  });

  describe("ESCALATED steps", () => {
    it("is always blocking regardless of later steps", () => {
      // Arrange: ESCALATED at step 5, with step 6 APPROVED after it
      // (edge case: pipeline resumed after a resolved escalation)
      const entries = [
        { step: 5, state: "ESCALATED", data: {} },
        { step: 6, state: "APPROVED",  data: {} },
      ];

      // Act
      const blockingEntries = entries.filter((e) => isBlockingEntry(e, entries));

      // Assert — ESCALATED is always treated as blocking
      expect(blockingEntries).toHaveLength(1);
      expect(blockingEntries[0].step).toBe(5);
    });

    it("is blocking when it is the last step", () => {
      // Arrange: pipeline stopped at an ESCALATED step
      const entries = [
        { step: 4, state: "CORRECTED", data: {} },
        { step: 5, state: "APPROVED",  data: {} },
        { step: 6, state: "ESCALATED", data: {} },
      ];

      // Act
      const blockingEntries = entries.filter((e) => isBlockingEntry(e, entries));

      // Assert
      expect(blockingEntries).toHaveLength(1);
      expect(blockingEntries[0].step).toBe(6);
    });
  });

  describe("non-blocking states", () => {
    it("returns false for APPROVED, CORRECTED, ERROR, PENDING, RUNNING", () => {
      // Arrange
      const nonBlockingStates = ["APPROVED", "CORRECTED", "ERROR", "PENDING", "RUNNING"];
      const entries = nonBlockingStates.map((state, i) => ({
        step: i + 1,
        state,
        data: {},
      }));

      // Act + Assert
      entries.forEach((e) => {
        expect(isBlockingEntry(e, entries)).toBe(false);
      });
    });
  });
});

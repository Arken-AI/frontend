/**
 * Tests for useEquipmentStore — compound mapping features
 */
import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useEquipmentStore from "../stores/useEquipmentStore";

describe("useEquipmentStore — compound mapping", () => {
  beforeEach(() => {
    // Reset store between tests
    act(() => {
      useEquipmentStore.getState().resetAll();
    });
  });

  describe("initial state", () => {
    it("starts with empty compound mapping", () => {
      const state = useEquipmentStore.getState();
      expect(state.compoundMapping).toEqual({});
    });

    it("starts with empty compound mapping errors", () => {
      const state = useEquipmentStore.getState();
      expect(state.compoundMappingErrors).toEqual({});
    });
  });

  describe("updateCompoundMapping", () => {
    it("sets a compound mapping entry", () => {
      act(() => {
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_1", "ethanol");
      });

      const state = useEquipmentStore.getState();
      expect(state.compoundMapping).toEqual({ compound_1: "ethanol" });
    });

    it("can set multiple mappings", () => {
      act(() => {
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_1", "ethanol");
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_2", "water");
      });

      const state = useEquipmentStore.getState();
      expect(state.compoundMapping).toEqual({
        compound_1: "ethanol",
        compound_2: "water",
      });
    });

    it("marks hasUnsavedChanges when mapping is non-empty", () => {
      act(() => {
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_1", "ethanol");
      });

      expect(useEquipmentStore.getState().hasUnsavedChanges).toBe(true);
    });

    it("detects duplicate compound names and sets errors", () => {
      act(() => {
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_1", "ethanol");
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_2", "ethanol");
      });

      const state = useEquipmentStore.getState();
      expect(state.compoundMappingErrors.compound_1).toContain("Duplicate");
      expect(state.compoundMappingErrors.compound_2).toContain("Duplicate");
    });

    it("clears duplicate error when conflict is resolved", () => {
      act(() => {
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_1", "ethanol");
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_2", "ethanol");
      });

      // Now fix compound_2
      act(() => {
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_2", "water");
      });

      const state = useEquipmentStore.getState();
      expect(state.compoundMappingErrors).toEqual({});
    });

    it("handles empty string values (clearing a mapping)", () => {
      act(() => {
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_1", "ethanol");
        useEquipmentStore.getState().updateCompoundMapping("compound_1", "");
      });

      const state = useEquipmentStore.getState();
      expect(state.compoundMapping.compound_1).toBe("");
    });

    it("does not flag empty values as duplicates", () => {
      act(() => {
        useEquipmentStore.getState().updateCompoundMapping("compound_1", "");
        useEquipmentStore.getState().updateCompoundMapping("compound_2", "");
      });

      const state = useEquipmentStore.getState();
      expect(state.compoundMappingErrors).toEqual({});
    });
  });

  describe("setCompoundMapping", () => {
    it("sets the full mapping at once", () => {
      act(() => {
        useEquipmentStore.getState().setCompoundMapping({
          compound_1: "benzene",
          compound_2: "toluene",
        });
      });

      const state = useEquipmentStore.getState();
      expect(state.compoundMapping).toEqual({
        compound_1: "benzene",
        compound_2: "toluene",
      });
    });

    it("clears mapping errors on set", () => {
      act(() => {
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_1", "ethanol");
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_2", "ethanol");
      });
      // Errors should exist now
      expect(
        Object.keys(useEquipmentStore.getState().compoundMappingErrors).length,
      ).toBeGreaterThan(0);

      // Set full mapping — errors should clear
      act(() => {
        useEquipmentStore.getState().setCompoundMapping({
          compound_1: "benzene",
          compound_2: "toluene",
        });
      });

      expect(useEquipmentStore.getState().compoundMappingErrors).toEqual({});
    });

    it("handles null input", () => {
      act(() => {
        useEquipmentStore.getState().setCompoundMapping(null);
      });

      expect(useEquipmentStore.getState().compoundMapping).toEqual({});
    });
  });

  describe("getCompoundMappingForPayload", () => {
    it("returns null when no mappings exist", () => {
      const result = useEquipmentStore
        .getState()
        .getCompoundMappingForPayload();
      expect(result).toBeNull();
    });

    it("returns mapping object when all entries are filled", () => {
      act(() => {
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_1", "ethanol");
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_2", "water");
      });

      const result = useEquipmentStore
        .getState()
        .getCompoundMappingForPayload();
      expect(result).toEqual({ compound_1: "ethanol", compound_2: "water" });
    });

    it("returns null when there are validation errors", () => {
      act(() => {
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_1", "ethanol");
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_2", "ethanol");
      });

      const result = useEquipmentStore
        .getState()
        .getCompoundMappingForPayload();
      expect(result).toBeNull();
    });

    it("excludes empty-value entries from payload", () => {
      act(() => {
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_1", "ethanol");
        useEquipmentStore.getState().updateCompoundMapping("compound_2", "");
      });

      const result = useEquipmentStore
        .getState()
        .getCompoundMappingForPayload();
      expect(result).toEqual({ compound_1: "ethanol" });
    });
  });

  describe("hasGenericCompounds", () => {
    it("returns false for empty array", () => {
      expect(useEquipmentStore.getState().hasGenericCompounds([])).toBe(false);
    });

    it("returns false for null", () => {
      expect(useEquipmentStore.getState().hasGenericCompounds(null)).toBe(
        false,
      );
    });

    it("returns false when no generic compounds present", () => {
      expect(
        useEquipmentStore.getState().hasGenericCompounds(["ethanol", "water"]),
      ).toBe(false);
    });

    it("returns true when compound_1 is present", () => {
      expect(
        useEquipmentStore
          .getState()
          .hasGenericCompounds(["compound_1", "ethanol"]),
      ).toBe(true);
    });

    it("returns true for various generic formats", () => {
      expect(
        useEquipmentStore.getState().hasGenericCompounds(["compound_2"]),
      ).toBe(true);
      expect(
        useEquipmentStore.getState().hasGenericCompounds(["compound_10"]),
      ).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(
        useEquipmentStore.getState().hasGenericCompounds(["Compound_1"]),
      ).toBe(true);
      expect(
        useEquipmentStore.getState().hasGenericCompounds(["COMPOUND_1"]),
      ).toBe(true);
    });
  });

  describe("getGenericCompounds", () => {
    it("returns empty array for null", () => {
      expect(useEquipmentStore.getState().getGenericCompounds(null)).toEqual(
        [],
      );
    });

    it("returns empty array for non-generic compounds", () => {
      expect(
        useEquipmentStore.getState().getGenericCompounds(["ethanol", "water"]),
      ).toEqual([]);
    });

    it("filters to only generic compounds", () => {
      const result = useEquipmentStore
        .getState()
        .getGenericCompounds(["compound_1", "ethanol", "compound_2", "water"]);
      expect(result).toEqual(["compound_1", "compound_2"]);
    });

    it("returns empty for empty array", () => {
      expect(useEquipmentStore.getState().getGenericCompounds([])).toEqual([]);
    });
  });

  describe("resetAll clears compound state", () => {
    it("clears compound mapping and errors on reset", () => {
      act(() => {
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_1", "ethanol");
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_2", "ethanol");
      });

      act(() => {
        useEquipmentStore.getState().resetAll();
      });

      const state = useEquipmentStore.getState();
      expect(state.compoundMapping).toEqual({});
      expect(state.compoundMappingErrors).toEqual({});
      expect(state.hasUnsavedChanges).toBe(false);
    });
  });

  describe("setOriginalParams resets compound state", () => {
    it("resets compound mapping when new simulation loads", () => {
      act(() => {
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_1", "ethanol");
      });

      act(() => {
        useEquipmentStore
          .getState()
          .setOriginalParams({ heater: { temperature_K: 350 } });
      });

      const state = useEquipmentStore.getState();
      expect(state.compoundMapping).toEqual({});
      expect(state.compoundMappingErrors).toEqual({});
    });
  });

  describe("interaction with parameter edits", () => {
    it("hasUnsavedChanges is true if either params or mapping changed", () => {
      act(() => {
        useEquipmentStore.getState().updateParameter("heater", "temp", 400);
      });
      expect(useEquipmentStore.getState().hasUnsavedChanges).toBe(true);

      act(() => {
        useEquipmentStore.getState().resetAll();
      });
      expect(useEquipmentStore.getState().hasUnsavedChanges).toBe(false);

      act(() => {
        useEquipmentStore
          .getState()
          .updateCompoundMapping("compound_1", "ethanol");
      });
      expect(useEquipmentStore.getState().hasUnsavedChanges).toBe(true);
    });
  });
});

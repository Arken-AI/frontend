/**
 * Tests for CompoundSelector Component
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompoundSelector from "../components/CompoundSelector";
import {
  COMMON_COMPOUNDS,
  formatPlaceholder,
} from "../components/CompoundSelector/constants";

describe("CompoundSelector", () => {
  let onMappingChange;

  beforeEach(() => {
    onMappingChange = vi.fn();
  });

  describe("rendering", () => {
    it("renders nothing when genericCompounds is empty", () => {
      const { container } = render(
        <CompoundSelector
          genericCompounds={[]}
          compoundMapping={{}}
          onMappingChange={onMappingChange}
        />,
      );
      expect(container.innerHTML).toBe("");
    });

    it("renders nothing when genericCompounds is not provided", () => {
      const { container } = render(
        <CompoundSelector
          compoundMapping={{}}
          onMappingChange={onMappingChange}
        />,
      );
      expect(container.innerHTML).toBe("");
    });

    it("renders the compound selector container", () => {
      render(
        <CompoundSelector
          genericCompounds={["compound_1", "compound_2"]}
          compoundMapping={{}}
          onMappingChange={onMappingChange}
        />,
      );
      expect(screen.getByTestId("compound-selector")).toBeInTheDocument();
    });

    it("renders header text", () => {
      render(
        <CompoundSelector
          genericCompounds={["compound_1"]}
          compoundMapping={{}}
          onMappingChange={onMappingChange}
        />,
      );
      expect(screen.getByText("Compound Mapping")).toBeInTheDocument();
    });

    it("renders one row per generic compound", () => {
      render(
        <CompoundSelector
          genericCompounds={["compound_1", "compound_2", "compound_3"]}
          compoundMapping={{}}
          onMappingChange={onMappingChange}
        />,
      );
      expect(
        screen.getByTestId("compound-input-compound_1"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("compound-input-compound_2"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("compound-input-compound_3"),
      ).toBeInTheDocument();
    });

    it("renders placeholder labels formatted nicely", () => {
      render(
        <CompoundSelector
          genericCompounds={["compound_1"]}
          compoundMapping={{}}
          onMappingChange={onMappingChange}
        />,
      );
      expect(screen.getByText("Compound 1")).toBeInTheDocument();
    });

    it("shows arrow between label and input", () => {
      render(
        <CompoundSelector
          genericCompounds={["compound_1"]}
          compoundMapping={{}}
          onMappingChange={onMappingChange}
        />,
      );
      expect(screen.getByText("→")).toBeInTheDocument();
    });
  });

  describe("mapping display", () => {
    it("shows current mapping values in inputs", () => {
      render(
        <CompoundSelector
          genericCompounds={["compound_1", "compound_2"]}
          compoundMapping={{ compound_1: "ethanol", compound_2: "water" }}
          onMappingChange={onMappingChange}
        />,
      );
      expect(screen.getByTestId("compound-input-compound_1")).toHaveValue(
        "ethanol",
      );
      expect(screen.getByTestId("compound-input-compound_2")).toHaveValue(
        "water",
      );
    });

    it("shows mapping progress counter", () => {
      render(
        <CompoundSelector
          genericCompounds={["compound_1", "compound_2"]}
          compoundMapping={{ compound_1: "ethanol" }}
          onMappingChange={onMappingChange}
        />,
      );
      expect(screen.getByText("1 / 2 mapped")).toBeInTheDocument();
    });

    it("shows full mapping counter when all mapped", () => {
      render(
        <CompoundSelector
          genericCompounds={["compound_1", "compound_2"]}
          compoundMapping={{ compound_1: "ethanol", compound_2: "water" }}
          onMappingChange={onMappingChange}
        />,
      );
      expect(screen.getByText("2 / 2 mapped")).toBeInTheDocument();
    });
  });

  describe("user interaction", () => {
    it("calls onMappingChange when user types in input", async () => {
      const user = userEvent.setup();
      render(
        <CompoundSelector
          genericCompounds={["compound_1"]}
          compoundMapping={{}}
          onMappingChange={onMappingChange}
        />,
      );

      const input = screen.getByTestId("compound-input-compound_1");
      await user.type(input, "eth");

      // Should call with each character typed
      expect(onMappingChange).toHaveBeenCalled();
      // Last call should have the trimmed value
      const lastCall =
        onMappingChange.mock.calls[onMappingChange.mock.calls.length - 1];
      expect(lastCall[0]).toBe("compound_1");
      expect(lastCall[1]).toBe("eth");
    });

    it("shows dropdown on focus", async () => {
      const user = userEvent.setup();
      render(
        <CompoundSelector
          genericCompounds={["compound_1"]}
          compoundMapping={{}}
          onMappingChange={onMappingChange}
        />,
      );

      const input = screen.getByTestId("compound-input-compound_1");
      await user.click(input);

      expect(
        screen.getByTestId("compound-dropdown-compound_1"),
      ).toBeInTheDocument();
    });

    it("filters dropdown options based on search text", async () => {
      const user = userEvent.setup();
      render(
        <CompoundSelector
          genericCompounds={["compound_1"]}
          compoundMapping={{}}
          onMappingChange={onMappingChange}
        />,
      );

      const input = screen.getByTestId("compound-input-compound_1");
      await user.type(input, "ethan");

      const dropdown = screen.getByTestId("compound-dropdown-compound_1");
      const options = within(dropdown).getAllByRole("button");
      // Should filter to matching compounds
      options.forEach((option) => {
        expect(option.textContent.toLowerCase()).toContain("ethan");
      });
    });

    it("selects compound from dropdown", async () => {
      const user = userEvent.setup();
      render(
        <CompoundSelector
          genericCompounds={["compound_1"]}
          compoundMapping={{}}
          onMappingChange={onMappingChange}
        />,
      );

      const input = screen.getByTestId("compound-input-compound_1");
      await user.click(input);

      // Click the first compound in the dropdown
      const dropdown = screen.getByTestId("compound-dropdown-compound_1");
      const firstOption = within(dropdown).getAllByRole("button")[0];
      await user.click(firstOption);

      expect(onMappingChange).toHaveBeenCalledWith(
        "compound_1",
        firstOption.textContent,
      );
    });

    it("excludes already-used compounds from other rows", async () => {
      const user = userEvent.setup();
      render(
        <CompoundSelector
          genericCompounds={["compound_1", "compound_2"]}
          compoundMapping={{ compound_1: "ethanol" }}
          onMappingChange={onMappingChange}
        />,
      );

      // Click on compound_2 input
      const input2 = screen.getByTestId("compound-input-compound_2");
      await user.click(input2);

      const dropdown = screen.getByTestId("compound-dropdown-compound_2");
      const options = within(dropdown).getAllByRole("button");
      const optionTexts = options.map((o) => o.textContent);

      // ethanol should not appear in compound_2's dropdown
      expect(optionTexts).not.toContain("ethanol");
    });
  });

  describe("errors", () => {
    it("displays error count when there are errors", () => {
      render(
        <CompoundSelector
          genericCompounds={["compound_1", "compound_2"]}
          compoundMapping={{ compound_1: "ethanol", compound_2: "ethanol" }}
          onMappingChange={onMappingChange}
          errors={{ compound_1: "Duplicate", compound_2: "Duplicate" }}
        />,
      );
      expect(screen.getByText("2 errors")).toBeInTheDocument();
    });

    it("displays singular error text for 1 error", () => {
      render(
        <CompoundSelector
          genericCompounds={["compound_1"]}
          compoundMapping={{}}
          onMappingChange={onMappingChange}
          errors={{ compound_1: "Required" }}
        />,
      );
      expect(screen.getByText("1 error")).toBeInTheDocument();
    });

    it("adds error styling to input with errors", () => {
      render(
        <CompoundSelector
          genericCompounds={["compound_1"]}
          compoundMapping={{}}
          onMappingChange={onMappingChange}
          errors={{ compound_1: "Duplicate compound" }}
        />,
      );
      const input = screen.getByTestId("compound-input-compound_1");
      expect(input.className).toContain("border-red-300");
    });

    it("shows warning icon for rows with errors", () => {
      render(
        <CompoundSelector
          genericCompounds={["compound_1"]}
          compoundMapping={{}}
          onMappingChange={onMappingChange}
          errors={{ compound_1: "Duplicate compound" }}
        />,
      );
      // Warning emoji indicator
      expect(screen.getByText("⚠")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles empty string input gracefully", async () => {
      const user = userEvent.setup();
      render(
        <CompoundSelector
          genericCompounds={["compound_1"]}
          compoundMapping={{ compound_1: "ethanol" }}
          onMappingChange={onMappingChange}
        />,
      );

      const input = screen.getByTestId("compound-input-compound_1");
      await user.clear(input);

      // Should be called with empty string when cleared
      expect(onMappingChange).toHaveBeenCalledWith("compound_1", "");
    });

    it("handles many generic compounds", () => {
      const many = Array.from({ length: 5 }, (_, i) => `compound_${i + 1}`);
      render(
        <CompoundSelector
          genericCompounds={many}
          compoundMapping={{}}
          onMappingChange={onMappingChange}
        />,
      );
      expect(screen.getByText("0 / 5 mapped")).toBeInTheDocument();
    });
  });
});

describe("formatPlaceholder", () => {
  it("formats compound_1 to Compound 1", () => {
    expect(formatPlaceholder("compound_1")).toBe("Compound 1");
  });

  it("formats compound_10 to Compound 10", () => {
    expect(formatPlaceholder("compound_10")).toBe("Compound 10");
  });
});

describe("COMMON_COMPOUNDS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(COMMON_COMPOUNDS)).toBe(true);
    expect(COMMON_COMPOUNDS.length).toBeGreaterThan(0);
  });

  it("contains common compounds", () => {
    expect(COMMON_COMPOUNDS).toContain("water");
    expect(COMMON_COMPOUNDS).toContain("ethanol");
    expect(COMMON_COMPOUNDS).toContain("methanol");
    expect(COMMON_COMPOUNDS).toContain("benzene");
  });

  it("has no duplicates", () => {
    const unique = new Set(COMMON_COMPOUNDS);
    expect(unique.size).toBe(COMMON_COMPOUNDS.length);
  });
});

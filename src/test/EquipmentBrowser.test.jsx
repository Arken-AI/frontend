/**
 * Tests for EquipmentBrowser — single-equipment and compound selector integration
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import EquipmentBrowser from "../components/EquipmentBrowser";

// Mock child components to isolate EquipmentBrowser logic
vi.mock("../store/useSelectionStore", () => ({
  default: vi.fn(() => ({
    selectedEquipmentId: null,
    selectEquipment: vi.fn(),
  })),
}));

vi.mock("../stores/useEquipmentStore", () => ({
  default: vi.fn(() => ({
    editedParams: {},
    validationErrors: {},
    updateParameter: vi.fn(),
    validateParameter: vi.fn(),
    compoundMapping: {},
    compoundMappingErrors: {},
    updateCompoundMapping: vi.fn(),
    hasGenericCompounds: (compounds) => {
      if (!compounds || !Array.isArray(compounds)) return false;
      return compounds.some((c) => /^compound_\d+$/i.test(c));
    },
    getGenericCompounds: (compounds) => {
      if (!compounds || !Array.isArray(compounds)) return [];
      return compounds.filter((c) => /^compound_\d+$/i.test(c));
    },
  })),
}));

vi.mock("../components/CompoundSelector", () => ({
  default: ({ genericCompounds }) => (
    <div data-testid="compound-selector-mock">
      {genericCompounds.map((c) => (
        <span key={c} data-testid={`mock-compound-${c}`}>
          {c}
        </span>
      ))}
    </div>
  ),
}));

vi.mock("../components/common/SkeletonLoader", () => ({
  SkeletonEquipmentCard: () => <div>Loading...</div>,
}));

vi.mock("../components/common/EmptyState", () => ({
  NoEquipmentFound: () => (
    <div data-testid="no-equipment">No equipment found</div>
  ),
}));

// Mock EquipmentCard to avoid complex rendering
vi.mock("../components/EquipmentBrowser/EquipmentCard", () => ({
  default: vi.fn().mockImplementation(
    // eslint-disable-next-line react/display-name
    ({ equipment }) => (
      <div data-testid={`equipment-card-${equipment.id}`}>{equipment.name}</div>
    ),
  ),
}));

const mockEquipment = [
  {
    id: "column",
    name: "Distillation Column",
    type: "distillation_column",
    converged: true,
    constraints: [],
    inputs: [],
    outputs: [],
  },
];

const mockEquipmentMultiple = [
  ...mockEquipment,
  {
    id: "heater",
    name: "Heater",
    type: "heater",
    converged: true,
    constraints: [],
    inputs: [],
    outputs: [],
  },
];

describe("EquipmentBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normal process mode", () => {
    it("renders equipment cards without compound selector", () => {
      render(
        <EquipmentBrowser
          equipmentData={mockEquipmentMultiple}
          templateType="process"
          compounds={["ethanol", "water"]}
        />,
      );

      expect(screen.getByTestId("equipment-card-column")).toBeInTheDocument();
      expect(screen.getByTestId("equipment-card-heater")).toBeInTheDocument();
      // No compound selector because compounds are not generic
      expect(
        screen.queryByTestId("compound-selector-mock"),
      ).not.toBeInTheDocument();
    });

    it("does not show single-equipment badge", () => {
      render(
        <EquipmentBrowser
          equipmentData={mockEquipmentMultiple}
          templateType="process"
          compounds={["ethanol", "water"]}
        />,
      );

      expect(
        screen.queryByTestId("single-equipment-badge"),
      ).not.toBeInTheDocument();
    });

    it("shows empty state when no equipment", () => {
      render(<EquipmentBrowser equipmentData={[]} />);

      expect(screen.getByTestId("no-equipment")).toBeInTheDocument();
    });
  });

  describe("single-equipment mode", () => {
    it("shows single-equipment badge", () => {
      render(
        <EquipmentBrowser
          equipmentData={mockEquipment}
          templateType="single_equipment"
          compounds={["compound_1", "compound_2"]}
        />,
      );

      expect(screen.getByTestId("single-equipment-badge")).toBeInTheDocument();
      expect(screen.getByText("Single Equipment")).toBeInTheDocument();
    });

    it("renders compound selector when generic compounds present", () => {
      render(
        <EquipmentBrowser
          equipmentData={mockEquipment}
          templateType="single_equipment"
          compounds={["compound_1", "compound_2"]}
        />,
      );

      expect(screen.getByTestId("compound-selector-mock")).toBeInTheDocument();
      expect(
        screen.getByTestId("mock-compound-compound_1"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("mock-compound-compound_2"),
      ).toBeInTheDocument();
    });

    it("does not render compound selector for real compounds", () => {
      render(
        <EquipmentBrowser
          equipmentData={mockEquipment}
          templateType="single_equipment"
          compounds={["ethanol", "water"]}
        />,
      );

      // No compound selector because compounds are real, not generic
      expect(
        screen.queryByTestId("compound-selector-mock"),
      ).not.toBeInTheDocument();
    });

    it("renders equipment card in single-equipment mode", () => {
      render(
        <EquipmentBrowser
          equipmentData={mockEquipment}
          templateType="single_equipment"
          compounds={["compound_1", "compound_2"]}
        />,
      );

      expect(screen.getByTestId("equipment-card-column")).toBeInTheDocument();
    });
  });

  describe("default props", () => {
    it("handles missing templateType gracefully", () => {
      render(<EquipmentBrowser equipmentData={mockEquipment} />);

      // Should render normally without compound selector or badge
      expect(screen.getByTestId("equipment-card-column")).toBeInTheDocument();
      expect(
        screen.queryByTestId("single-equipment-badge"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("compound-selector-mock"),
      ).not.toBeInTheDocument();
    });

    it("handles empty compounds array", () => {
      render(
        <EquipmentBrowser
          equipmentData={mockEquipment}
          templateType="single_equipment"
          compounds={[]}
        />,
      );

      // No compound selector for empty array
      expect(
        screen.queryByTestId("compound-selector-mock"),
      ).not.toBeInTheDocument();
    });
  });
});

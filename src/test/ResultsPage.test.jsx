/**
 * Tests for ResultsPage — Phase 8 changes
 *
 * Tests chain provenance banner, template type detection,
 * and compound mapping integration.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ---- Mocks ----

// Mock API client
const mockGetRunResults = vi.fn();
vi.mock("../api/client", () => ({
  getRunResults: (...args) => mockGetRunResults(...args),
  sendMessage: vi.fn(),
  getConversations: vi.fn(),
  getContext: vi.fn(),
  getStreamUrl: vi.fn(),
  deleteConversation: vi.fn(),
}));

// Mock ChatContext
vi.mock("../context/ChatContext", () => ({
  useChatContext: () => ({
    loadConversation: vi.fn(),
    conversationId: null,
    messages: [],
    sendMessage: vi.fn(),
    isLoading: false,
  }),
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock FlowCanvas
vi.mock("../components/FlowCanvas", () => ({
  default: vi.fn().mockImplementation(
    // eslint-disable-next-line react/display-name
    () => <div data-testid="flow-canvas">Flow Canvas</div>,
  ),
}));

// Track EquipmentBrowser props
const capturedBrowserProps = {};
vi.mock("../components/EquipmentBrowser", () => ({
  default: vi.fn().mockImplementation((props) => {
    Object.assign(capturedBrowserProps, props);
    return (
      <div data-testid="equipment-browser">
        {props.templateType && (
          <span data-testid="browser-template-type">{props.templateType}</span>
        )}
        {props.compounds && (
          <span data-testid="browser-compounds">
            {JSON.stringify(props.compounds)}
          </span>
        )}
      </div>
    );
  }),
}));

// Mock WarningsPanel
vi.mock("../components/WarningsPanel", () => ({
  default: () => <div>Warnings</div>,
}));

// Mock DetailsPanel
vi.mock("../components/DetailsPanel", () => ({
  DetailsPanel: () => <div>Details</div>,
}));

// Mock PFDReport
vi.mock("../components/PFDReport", () => ({
  PFDReportModal: () => null,
}));

// Mock DetailedReport
vi.mock("../components/DetailedReport", () => ({
  DetailedReportButton: () => null,
}));

// Mock layout
vi.mock("../components/layout", () => ({
  ActivityBar: () => <div data-testid="activity-bar">Activity</div>,
}));

// Mock ChatPanel
vi.mock("../components/chat/ChatPanel", () => ({
  default: () => <div>Chat</div>,
}));

// Mock ErrorBoundary
vi.mock("../components/common/ErrorBoundary", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

// Mock data transformer
vi.mock("../data/mockSimulationData", () => ({
  transformEquipmentData: vi.fn(() => [
    {
      id: "heater",
      name: "Heater",
      type: "heater",
      converged: true,
      warnings: [],
      constraints: [],
      inputs: [],
      outputs: [],
    },
  ]),
  getWarningsData: vi.fn(() => ({
    equipmentWarnings: [],
    globalWarnings: [],
    totalCount: 0,
  })),
}));

// Import after mocks
import ResultsPage from "../pages/ResultsPage";

// ---- Helpers ----

function renderResultsPage(runId = "test-run-123") {
  return render(
    <MemoryRouter initialEntries={[`/results/${runId}`]}>
      <Routes>
        <Route path="/results/:runId" element={<ResultsPage />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// Base API response for a process run
function makeProcessResponse(overrides = {}) {
  return {
    run_id: "test-run-123",
    source: "calc_engine",
    template_type: "process",
    chain_metadata: null,
    status: "completed",
    data: {
      status: "success",
      input: {
        compounds: ["ethanol", "water"],
        feed_streams: [],
        equipment: [{ id: "heater", type: "heater" }],
        edges: [],
      },
      result: {
        execution_order: ["heater"],
        node_results: {
          heater: { converged: true, outlets: {}, warnings: [] },
        },
        equipment_inputs: {
          heater: {
            equipment_type: "heater",
            inlet_ports: [],
            applied_parameters: {},
            parameter_constraints: {},
          },
        },
        stream_results: {},
      },
    },
    ...overrides,
  };
}

// Single-equipment response with generic compounds
function makeSingleEquipmentResponse(overrides = {}) {
  return makeProcessResponse({
    template_type: "single_equipment",
    data: {
      ...makeProcessResponse().data,
      input: {
        ...makeProcessResponse().data.input,
        compounds: ["compound_1", "compound_2"],
      },
    },
    ...overrides,
  });
}

// Chained run response
function makeChainedResponse(overrides = {}) {
  return makeProcessResponse({
    template_type: "single_equipment",
    chain_metadata: {
      source_run_id: "upstream-run-001",
      source_equipment_id: "heater",
      source_port: "outlet",
      extracted_stream: {
        flow_rate: 100.0,
        temperature_K: 380.0,
        pressure_Pa: 101325.0,
        composition: { ethanol: 0.3, water: 0.7 },
      },
    },
    ...overrides,
  });
}

// ---- Tests ----

describe("ResultsPage — Phase 8", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(capturedBrowserProps).forEach(
      (k) => delete capturedBrowserProps[k],
    );
  });

  describe("template type detection", () => {
    it("passes template_type to EquipmentBrowser for process template", async () => {
      mockGetRunResults.mockResolvedValue(makeProcessResponse());
      renderResultsPage();

      await waitFor(() => {
        expect(screen.getByTestId("equipment-browser")).toBeInTheDocument();
      });

      expect(capturedBrowserProps.templateType).toBe("process");
    });

    it("passes template_type to EquipmentBrowser for single_equipment template", async () => {
      mockGetRunResults.mockResolvedValue(makeSingleEquipmentResponse());
      renderResultsPage();

      await waitFor(() => {
        expect(screen.getByTestId("equipment-browser")).toBeInTheDocument();
      });

      expect(capturedBrowserProps.templateType).toBe("single_equipment");
    });

    it("passes compounds array to EquipmentBrowser", async () => {
      mockGetRunResults.mockResolvedValue(makeSingleEquipmentResponse());
      renderResultsPage();

      await waitFor(() => {
        expect(screen.getByTestId("equipment-browser")).toBeInTheDocument();
      });

      expect(capturedBrowserProps.compounds).toEqual([
        "compound_1",
        "compound_2",
      ]);
    });

    it("handles missing template_type gracefully", async () => {
      mockGetRunResults.mockResolvedValue(
        makeProcessResponse({ template_type: undefined }),
      );
      renderResultsPage();

      await waitFor(() => {
        expect(screen.getByTestId("equipment-browser")).toBeInTheDocument();
      });

      expect(capturedBrowserProps.templateType).toBeNull();
    });
  });

  describe("chain provenance banner", () => {
    it("does not show banner for non-chained runs", async () => {
      mockGetRunResults.mockResolvedValue(makeProcessResponse());
      renderResultsPage();

      await waitFor(() => {
        expect(screen.getByTestId("equipment-browser")).toBeInTheDocument();
      });

      expect(
        screen.queryByTestId("chain-provenance-banner"),
      ).not.toBeInTheDocument();
    });

    it("shows chain provenance banner for chained runs", async () => {
      mockGetRunResults.mockResolvedValue(makeChainedResponse());
      renderResultsPage();

      await waitFor(() => {
        expect(
          screen.getByTestId("chain-provenance-banner"),
        ).toBeInTheDocument();
      });
    });

    it("shows source equipment name in banner", async () => {
      mockGetRunResults.mockResolvedValue(makeChainedResponse());
      renderResultsPage();

      await waitFor(() => {
        expect(
          screen.getByTestId("chain-provenance-banner"),
        ).toBeInTheDocument();
      });

      expect(screen.getByText("heater")).toBeInTheDocument();
    });

    it("shows source port in banner", async () => {
      mockGetRunResults.mockResolvedValue(makeChainedResponse());
      renderResultsPage();

      await waitFor(() => {
        expect(
          screen.getByTestId("chain-provenance-banner"),
        ).toBeInTheDocument();
      });

      expect(screen.getByText("outlet")).toBeInTheDocument();
    });

    it("links to upstream run", async () => {
      mockGetRunResults.mockResolvedValue(makeChainedResponse());
      renderResultsPage();

      await waitFor(() => {
        expect(
          screen.getByTestId("chain-provenance-banner"),
        ).toBeInTheDocument();
      });

      const link = screen.getByText("upstream-run-001");
      expect(link.closest("a")).toHaveAttribute(
        "href",
        "/results/upstream-run-001",
      );
    });

    it("shows extracted stream info when available", async () => {
      mockGetRunResults.mockResolvedValue(makeChainedResponse());
      renderResultsPage();

      await waitFor(() => {
        expect(
          screen.getByTestId("chain-provenance-banner"),
        ).toBeInTheDocument();
      });

      // Check for flow rate and temperature display
      expect(screen.getByText(/100\.0 mol\/s/)).toBeInTheDocument();
      expect(screen.getByText(/380\.0 K/)).toBeInTheDocument();
    });

    it("handles chain metadata without extracted_stream gracefully", async () => {
      const response = makeChainedResponse();
      response.chain_metadata.extracted_stream = null;
      mockGetRunResults.mockResolvedValue(response);
      renderResultsPage();

      await waitFor(() => {
        expect(
          screen.getByTestId("chain-provenance-banner"),
        ).toBeInTheDocument();
      });

      // Should still show the banner without stream info
      expect(screen.getByText("upstream-run-001")).toBeInTheDocument();
    });
  });
});

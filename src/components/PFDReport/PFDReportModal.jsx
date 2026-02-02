/**
 * PFD Report Modal Component
 *
 * A full-screen modal that displays the complete PFD report including:
 * - Process Flow Diagram (using FlowCanvas in read-only mode for viewing)
 * - Material Balance Table
 * - Export options (PNG, PDF) - uses SVG BlockDiagram for export
 *
 * Features:
 * - Responsive layout with scroll for large content
 * - Print-optimized rendering
 * - Export wrapper for clean image/PDF generation
 */

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import FlowCanvas from "../FlowCanvas";
import BlockDiagram, { PrintableBlockDiagram } from "./BlockDiagram";
import StreamDataTable, { PrintableStreamDataTable } from "./StreamDataTable";
import { collectAllStreams } from "../../utils/streamDataCollector";
import { generateTableData } from "../../utils/tableDataGenerator";
import { transformEquipmentData } from "../../data/mockSimulationData";
import { exportToPNG } from "../../utils/exportPNG";
import { exportToPDFSinglePage } from "../../utils/exportPDF";
import toast from "react-hot-toast";

// =============================================================================
// ICONS
// =============================================================================

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const ImageIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const DocumentIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
);

const FullscreenIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
    />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    className="animate-spin h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Section header with title
 */
function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

/**
 * Export button component
 */
function ExportButton({ onClick, icon, label, loading, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
        transition-all duration-200
        ${
          loading || disabled
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
        }
      `}
    >
      {loading ? <SpinnerIcon /> : icon}
      <span>{loading ? "Generating..." : label}</span>
    </button>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * PFD Report Modal
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} props.apiResponse - The API response data from simulation
 * @param {string} props.simulationName - Optional name for the simulation
 * @param {Function} props.onExportPNG - Callback to export as PNG
 * @param {Function} props.onExportPDF - Callback to export as PDF
 */
export default function PFDReportModal({
  isOpen,
  onClose,
  apiResponse,
  simulationName = "Simulation",
  onExportPNG,
  onExportPDF,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exportingPNG, setExportingPNG] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [selectedStream, setSelectedStream] = useState(null);

  // Ref for the exportable content area (uses SVG BlockDiagram for clean export)
  const exportRef = useRef(null);

  // Process the API response to get streams and table data
  const { compounds, streams, metadata } = useMemo(() => {
    if (!apiResponse) {
      return { compounds: [], streams: [], metadata: {} };
    }
    return collectAllStreams(apiResponse);
  }, [apiResponse]);

  // Transform API response to equipment data for FlowCanvas
  // Note: apiResponse is already the .data portion passed from ResultsPage
  const equipmentData = useMemo(() => {
    if (!apiResponse) {
      return [];
    }
    return transformEquipmentData(apiResponse);
  }, [apiResponse]);

  // Generate table data from streams
  const tableData = useMemo(() => {
    if (compounds.length === 0 || streams.length === 0) {
      return { rows: [], columns: [], data: {}, metadata: {} };
    }
    return generateTableData(compounds, streams, {
      includeTemperature: true,
      includePressure: true,
      includeFlowRate: true,
      temperatureUnit: "K",
      pressureUnit: "kPa",
    });
  }, [compounds, streams]);

  // Keyboard handler for Escape to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle PNG export - uses SVG-based export container for clean rendering
  const handleExportPNG = useCallback(async () => {
    if (!exportRef.current) return;

    setExportingPNG(true);
    try {
      if (onExportPNG) {
        // Use custom callback if provided
        await onExportPNG(exportRef.current, simulationName);
      } else {
        // Use built-in export utility
        await exportToPNG(exportRef.current, `${simulationName}_PFD_Report`);
      }
      toast.success("PNG exported successfully!");
    } catch (error) {
      console.error("PNG export failed:", error);
      toast.error("Failed to export PNG. Please try again.");
    } finally {
      setExportingPNG(false);
    }
  }, [onExportPNG, simulationName]);

  // Handle PDF export - uses SVG-based export container for clean rendering
  const handleExportPDF = useCallback(async () => {
    if (!exportRef.current) return;

    setExportingPDF(true);
    try {
      if (onExportPDF) {
        // Use custom callback if provided
        await onExportPDF(exportRef.current, simulationName);
      } else {
        // Use built-in export utility
        await exportToPDFSinglePage(exportRef.current, `${simulationName}_PFD_Report`, {
          orientation: "landscape",
          pageSize: "a4",
          headerText: `PFD Report: ${simulationName}`,
          showHeader: true,
          showFooter: true,
        });
      }
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("Failed to export PDF. Please try again.");
    } finally {
      setExportingPDF(false);
    }
  }, [onExportPDF, simulationName]);

  // Handle stream click (highlight in both diagram and table)
  const handleStreamClick = useCallback((streamNumber) => {
    setSelectedStream((prev) => (prev === streamNumber ? null : streamNumber));
  }, []);

  // Early return if not open
  if (!isOpen) return null;

  // Get current timestamp
  const timestamp = new Date().toLocaleString();

  // Check if we have valid data
  const hasData = streams.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pfd-report-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`
          relative flex flex-col bg-white shadow-2xl
          transition-all duration-300 ease-out
          ${
            isFullscreen
              ? "w-full h-full"
              : "w-[95vw] h-[95vh] max-w-7xl mx-auto my-[2.5vh] rounded-xl"
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div>
            <h2
              id="pfd-report-title"
              className="text-xl font-bold text-gray-900"
            >
              PFD Report: {simulationName}
            </h2>
            <p className="text-sm text-gray-500">Generated on {timestamp}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <FullscreenIcon />
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              title="Close"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 bg-gray-100">
          {!hasData ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <p className="text-gray-500 text-lg">
                  No simulation data available
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Run a simulation to generate a PFD report
                </p>
              </div>
            </div>
          ) : (
            <div className="pfd-report-content bg-white rounded-lg shadow-sm">
              {/* Report Header (for export) */}
              <div className="p-6 border-b border-gray-200 print:block">
                <h1 className="text-2xl font-bold text-gray-900 text-center">
                  Process Flow Diagram Report
                </h1>
                <p className="text-center text-gray-600 mt-1">
                  {simulationName}
                </p>
                <p className="text-center text-gray-400 text-sm mt-1">
                  {timestamp}
                </p>
              </div>

              {/* Flow Diagram Section - using FlowCanvas in read-only mode */}
              <div className="p-6 border-b border-gray-200">
                <SectionHeader
                  title="Process Flow Diagram"
                  subtitle={`${streams.length} streams, ${equipmentData.length} equipment units`}
                />
                <div className="bg-gray-50 rounded-lg overflow-hidden" style={{ height: '400px' }}>
                  <FlowCanvas
                    equipmentData={equipmentData}
                    apiData={apiResponse}
                    readOnly={true}
                  />
                </div>
              </div>

              {/* Material Balance Table Section */}
              <div className="p-6">
                <SectionHeader
                  title="Material Balance Table"
                  subtitle={`${compounds.length} components across ${streams.length} streams`}
                />
                <div className="overflow-auto">
                  <PrintableStreamDataTable
                    tableData={tableData}
                    title=""
                    highlightStream={selectedStream}
                  />
                </div>
              </div>

              {/* Footer (for export) */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
                <p>Generated by ARKEN AI Process Simulation Platform</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Export Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="text-sm text-gray-500">
            {hasData && (
              <span>
                {streams.length} streams • {compounds.length} components
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ExportButton
              onClick={handleExportPNG}
              icon={<ImageIcon />}
              label="Download PNG"
              loading={exportingPNG}
              disabled={!hasData}
            />
            <ExportButton
              onClick={handleExportPDF}
              icon={<DocumentIcon />}
              label="Download PDF"
              loading={exportingPDF}
              disabled={!hasData}
            />
          </div>
        </div>
      </div>

      {/* Hidden Export Container - Uses SVG BlockDiagram for clean PNG/PDF export */}
      {hasData && (
        <div
          ref={exportRef}
          className="fixed -left-[9999px] top-0 bg-white"
          style={{ width: '1200px' }}
          aria-hidden="true"
        >
          {/* Report Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 text-center">
              Process Flow Diagram Report
            </h1>
            <p className="text-center text-gray-600 mt-1">{simulationName}</p>
            <p className="text-center text-gray-400 text-sm mt-1">{timestamp}</p>
          </div>

          {/* SVG Block Diagram - for clean export */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Process Flow Diagram</h3>
            <p className="text-sm text-gray-500 mb-4">{streams.length} streams, {equipmentData.length} equipment units</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <PrintableBlockDiagram
                apiResponse={apiResponse}
                streams={streams}
                title={simulationName}
                showTitle={false}
                showLegend={true}
              />
            </div>
          </div>

          {/* Material Balance Table */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Material Balance Table</h3>
            <p className="text-sm text-gray-500 mb-4">{compounds.length} components across {streams.length} streams</p>
            <PrintableStreamDataTable
              tableData={tableData}
              title=""
              highlightStream={selectedStream}
            />
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
            <p>Generated by ARKEN AI Process Simulation Platform</p>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MINIMAL VERSION (for embedding without modal)
// =============================================================================

/**
 * PFD Report Embed - No modal wrapper, just the content
 */
export function PFDReportEmbed({
  apiResponse,
  simulationName = "Simulation",
  showHeader = true,
  className = "",
}) {
  // Process the API response
  const { compounds, streams, metadata } = useMemo(() => {
    if (!apiResponse) {
      return { compounds: [], streams: [], metadata: {} };
    }
    return collectAllStreams(apiResponse);
  }, [apiResponse]);

  // Generate table data
  const tableData = useMemo(() => {
    if (compounds.length === 0 || streams.length === 0) {
      return { rows: [], columns: [], data: {}, metadata: {} };
    }
    return generateTableData(compounds, streams);
  }, [compounds, streams]);

  const timestamp = new Date().toLocaleString();
  const hasData = streams.length > 0;

  if (!hasData) {
    return (
      <div className={`p-8 text-center text-gray-500 ${className}`}>
        No simulation data available
      </div>
    );
  }

  return (
    <div className={`pfd-report-embed bg-white ${className}`}>
      {showHeader && (
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{simulationName}</h2>
          <p className="text-sm text-gray-500">{timestamp}</p>
        </div>
      )}

      {/* Block Diagram */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Process Flow Diagram
        </h3>
        <BlockDiagram
          apiResponse={apiResponse}
          streams={streams}
          showTitle={false}
        />
      </div>

      {/* Material Balance Table */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Material Balance Table
        </h3>
        <StreamDataTable tableData={tableData} />
      </div>
    </div>
  );
}

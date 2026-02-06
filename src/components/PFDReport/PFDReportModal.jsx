/**
 * PFD Report Modal Component
 *
 * A full-screen modal that displays the complete PFD report including:
 * - Process Flow Diagram (using FlowCanvas - same as Results Page)
 * - Material Balance Table (paginated for many streams)
 * - Export options (PNG, PDF) - captures full flowsheet at optimal zoom
 *
 * Features:
 * - Interactive FlowCanvas with pan/zoom for viewing
 * - Export always captures full flowsheet regardless of current view
 * - Paginated tables prevent horizontal overflow in exports
 */

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import FlowCanvas from "../FlowCanvas";
import { PrintableStreamDataTable } from "./StreamDataTable";
import { collectAllStreams } from "../../utils/streamDataCollector";
import { generateTableData } from "../../utils/tableDataGenerator";
import { transformEquipmentData } from "../../data/mockSimulationData";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum number of stream columns per table before splitting */
const MAX_STREAMS_PER_TABLE = 6;

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
 */
export default function PFDReportModal({
  isOpen,
  onClose,
  apiResponse,
  simulationName = "Simulation",
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exportingPNG, setExportingPNG] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [selectedStream, setSelectedStream] = useState(null);
  const [diagramPngCache, setDiagramPngCache] = useState(null);

  // Ref for FlowCanvas to access export functions
  const flowCanvasRef = useRef(null);
  // Ref for the exportable content area (tables only - diagram captured separately)
  const contentRef = useRef(null);

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

  /**
   * Capture the full flowsheet diagram as PNG using FlowCanvas's export function.
   * This ensures the entire diagram is captured at optimal zoom regardless of
   * the user's current view.
   */
  const captureFlowsheetPng = useCallback(async () => {
    if (!flowCanvasRef.current?.getFullFlowsheetPng) {
      throw new Error("FlowCanvas not ready");
    }
    return await flowCanvasRef.current.getFullFlowsheetPng();
  }, []);

  // Handle PNG export - captures full diagram + tables as composite image
  const handleExportPNG = useCallback(async () => {
    if (!contentRef.current || !flowCanvasRef.current) {
      toast.error("Content not ready for export");
      return;
    }
    
    setExportingPNG(true);
    try {
      // Step 1: Capture the full flowsheet diagram
      const { dataUrl: diagramDataUrl, width: diagramWidth, height: diagramHeight } = 
        await captureFlowsheetPng();
      
      // Step 2: Capture the tables section
      const tablesDataUrl = await toPng(contentRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      
      // Load tables image to get dimensions
      const tablesImg = new Image();
      tablesImg.src = tablesDataUrl;
      await new Promise(resolve => { tablesImg.onload = resolve; });
      
      // Load diagram image
      const diagramImg = new Image();
      diagramImg.src = diagramDataUrl;
      await new Promise(resolve => { diagramImg.onload = resolve; });
      
      // Step 3: Combine into single image
      const combinedWidth = Math.max(diagramWidth, tablesImg.width / 2);
      const headerHeight = 80;
      const diagramSectionHeight = diagramHeight + 40;
      const tablesSectionHeight = tablesImg.height / 2;
      const footerHeight = 40;
      const combinedHeight = headerHeight + diagramSectionHeight + tablesSectionHeight + footerHeight;
      
      const canvas = document.createElement('canvas');
      canvas.width = combinedWidth;
      canvas.height = combinedHeight;
      const ctx = canvas.getContext('2d');
      const exportTimestamp = new Date().toLocaleString();
      
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, combinedWidth, combinedHeight);
      
      // Header
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Process Flow Diagram Report', combinedWidth / 2, 35);
      ctx.font = '14px Arial';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(simulationName, combinedWidth / 2, 55);
      ctx.fillText(exportTimestamp, combinedWidth / 2, 72);
      
      // Diagram (centered)
      const diagramX = (combinedWidth - diagramWidth) / 2;
      ctx.drawImage(diagramImg, diagramX, headerHeight + 10, diagramWidth, diagramHeight);
      
      // Tables (scaled to fit width)
      const tablesScale = combinedWidth / (tablesImg.width / 2);
      const scaledTablesWidth = tablesImg.width / 2;
      const scaledTablesHeight = tablesImg.height / 2;
      ctx.drawImage(tablesImg, 0, headerHeight + diagramSectionHeight, scaledTablesWidth, scaledTablesHeight);
      
      // Footer
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Generated by ARKEN AI Process Simulation Platform', combinedWidth / 2, combinedHeight - 15);
      
      // Download
      const link = document.createElement('a');
      link.download = `${simulationName}_PFD_Report.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success("PNG exported successfully!");
    } catch (error) {
      console.error("PNG export failed:", error);
      toast.error("Failed to export PNG. Please try again.");
    } finally {
      setExportingPNG(false);
    }
  }, [simulationName, captureFlowsheetPng]);

  // Handle PDF export - creates a cohesive flowing document
  const handleExportPDF = useCallback(async () => {
    if (!contentRef.current || !flowCanvasRef.current) {
      toast.error("Content not ready for export");
      return;
    }
    
    setExportingPDF(true);
    try {
      // Step 1: Capture the full flowsheet diagram
      const { dataUrl: diagramDataUrl, width: diagramWidth, height: diagramHeight } = 
        await captureFlowsheetPng();
      
      // Step 2: Capture the tables section
      const tablesDataUrl = await toPng(contentRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      
      // Load images
      const diagramImg = new Image();
      diagramImg.src = diagramDataUrl;
      await new Promise(resolve => { diagramImg.onload = resolve; });
      
      const tablesImg = new Image();
      tablesImg.src = tablesDataUrl;
      await new Promise(resolve => { tablesImg.onload = resolve; });
      
      // Create portrait PDF for a proper report layout
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4',
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const usableWidth = pageWidth - margin * 2;
      const footerHeight = 30;
      const usableHeight = pageHeight - margin - footerHeight;
      
      const exportTimestamp = new Date().toLocaleString();
      let currentY = margin;
      
      // Helper to add footer to current page
      const addFooter = () => {
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text('Generated by ARKEN AI Process Simulation Platform', pageWidth / 2, pageHeight - 15, { align: 'center' });
      };
      
      // Helper to check if we need a new page
      const checkNewPage = (neededHeight) => {
        if (currentY + neededHeight > usableHeight) {
          addFooter();
          pdf.addPage();
          currentY = margin;
          return true;
        }
        return false;
      };
      
      // === HEADER SECTION ===
      pdf.setFontSize(22);
      pdf.setTextColor(31, 41, 55);
      pdf.text('Process Flow Diagram Report', pageWidth / 2, currentY + 20, { align: 'center' });
      currentY += 30;
      
      pdf.setFontSize(11);
      pdf.setTextColor(107, 114, 128);
      pdf.text(simulationName, pageWidth / 2, currentY + 10, { align: 'center' });
      currentY += 18;
      
      pdf.text(exportTimestamp, pageWidth / 2, currentY + 8, { align: 'center' });
      currentY += 25;
      
      // Divider line
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(1);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 20;
      
      // === DIAGRAM SECTION ===
      // Calculate diagram size - make it prominent but fit well
      const maxDiagramHeight = 280; // Good size for portrait A4
      const diagramScale = Math.min(
        usableWidth / diagramWidth,
        maxDiagramHeight / diagramHeight
      );
      const scaledDiagramWidth = diagramWidth * diagramScale;
      const scaledDiagramHeight = diagramHeight * diagramScale;
      const diagramX = margin + (usableWidth - scaledDiagramWidth) / 2; // Center horizontally
      
      // Section title
      pdf.setFontSize(14);
      pdf.setTextColor(31, 41, 55);
      pdf.text('Process Flow Diagram', margin, currentY);
      currentY += 15;
      
      // Add diagram centered
      pdf.addImage(diagramDataUrl, 'PNG', diagramX, currentY, scaledDiagramWidth, scaledDiagramHeight);
      currentY += scaledDiagramHeight + 25;
      
      // === MATERIAL BALANCE TABLE SECTION ===
      // Check if we have enough space, otherwise start new page
      const tablesTitleHeight = 30;
      checkNewPage(tablesTitleHeight + 100); // At least some table content should fit
      
      // Section title
      pdf.setFontSize(14);
      pdf.setTextColor(31, 41, 55);
      pdf.text('Material Balance Table', margin, currentY);
      currentY += 20;
      
      // Scale tables to fit page width while maintaining aspect ratio
      const tablesAspectRatio = tablesImg.height / tablesImg.width;
      const scaledTablesWidth = usableWidth;
      const scaledTablesHeight = scaledTablesWidth * tablesAspectRatio * 0.5; // 0.5 for pixelRatio compensation
      
      // Center the table horizontally
      const tablesX = margin;
      
      // Check if table fits on current page
      const remainingSpace = usableHeight - currentY;
      
      if (scaledTablesHeight <= remainingSpace) {
        // Table fits on current page
        pdf.addImage(tablesDataUrl, 'PNG', tablesX, currentY, scaledTablesWidth, scaledTablesHeight);
        currentY += scaledTablesHeight + 10;
      } else {
        // Table needs to span multiple pages - split it
        const totalTableHeight = tablesImg.height;
        let sourceY = 0;
        
        while (sourceY < totalTableHeight) {
          const availableHeight = (currentY === margin) ? (usableHeight - margin) : (usableHeight - currentY);
          const targetHeight = availableHeight;
          const sourceHeight = targetHeight / (scaledTablesWidth / tablesImg.width) * 2; // Account for pixelRatio
          
          // Create a canvas to slice the table image
          const sliceCanvas = document.createElement('canvas');
          const sliceHeight = Math.min(sourceHeight, totalTableHeight - sourceY);
          sliceCanvas.width = tablesImg.width;
          sliceCanvas.height = sliceHeight;
          const sliceCtx = sliceCanvas.getContext('2d');
          sliceCtx.drawImage(
            tablesImg,
            0, sourceY, tablesImg.width, sliceHeight,
            0, 0, tablesImg.width, sliceHeight
          );
          
          const sliceDataUrl = sliceCanvas.toDataURL('image/png');
          const scaledSliceHeight = sliceHeight * (scaledTablesWidth / tablesImg.width) * 0.5;
          
          pdf.addImage(sliceDataUrl, 'PNG', tablesX, currentY, scaledTablesWidth, scaledSliceHeight);
          
          sourceY += sliceHeight;
          
          if (sourceY < totalTableHeight) {
            addFooter();
            pdf.addPage();
            currentY = margin;
          } else {
            currentY += scaledSliceHeight + 10;
          }
        }
      }
      
      // Add footer to last page
      addFooter();
      
      pdf.save(`${simulationName}_PFD_Report.pdf`);
      
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("Failed to export PDF. Please try again.");
    } finally {
      setExportingPDF(false);
    }
  }, [simulationName, captureFlowsheetPng]);

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
            <div className="pfd-report-content space-y-6">
              {/* Flow Diagram Section - FlowCanvas (same as Results Page) */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <SectionHeader
                    title="Process Flow Diagram"
                    subtitle={`${streams.length} streams, ${equipmentData.length} equipment units • Pan and zoom to explore`}
                  />
                </div>
                <div className="bg-gray-50" style={{ height: '500px' }}>
                  <FlowCanvas
                    ref={flowCanvasRef}
                    equipmentData={equipmentData}
                    apiData={apiResponse}
                    readOnly={true}
                    allowPanZoom={true}
                    showLegend={false}
                    exportFilename={simulationName}
                  />
                </div>
              </div>

              {/* Material Balance Table Section - paginated for many streams */}
              <div ref={contentRef} className="bg-white rounded-lg shadow-sm p-6 mx-auto" style={{ maxWidth: '1200px' }}>
                <div className="text-center">
                  <SectionHeader
                    title="Material Balance Table"
                    subtitle={`${compounds.length} components across ${streams.length} streams`}
                  />
                </div>
                <PaginatedStreamTable
                  tableData={tableData}
                  maxStreamsPerTable={MAX_STREAMS_PER_TABLE}
                  highlightStream={selectedStream}
                />
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
    </div>
  );
}

// =============================================================================
// PAGINATED STREAM TABLE
// =============================================================================

/**
 * Splits the material balance table into multiple sub-tables when there
 * are more streams than maxStreamsPerTable. Each sub-table shares the
 * same row labels (Component column) but shows a different subset of
 * stream columns. This prevents horizontal overflow and ensures the
 * full table is visible in both the modal and PNG/PDF exports.
 */
function PaginatedStreamTable({ tableData, maxStreamsPerTable = MAX_STREAMS_PER_TABLE, highlightStream }) {
  const { rows, columns, data, metadata } = tableData;

  // Split columns into chunks
  const columnChunks = useMemo(() => {
    if (!columns || columns.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < columns.length; i += maxStreamsPerTable) {
      chunks.push(columns.slice(i, i + maxStreamsPerTable));
    }
    return chunks;
  }, [columns, maxStreamsPerTable]);

  if (columnChunks.length <= 1) {
    // No need to paginate — single table fits
    return (
      <PrintableStreamDataTable
        tableData={tableData}
        title=""
        highlightStream={highlightStream}
      />
    );
  }

  return (
    <div className="paginated-stream-tables space-y-6">
      {columnChunks.map((chunk, index) => {
        // Create a sub-tableData with the same rows/data but only this chunk of columns
        const subTableData = {
          rows,
          columns: chunk,
          data,
          metadata,
        };
        return (
          <div key={index}>
            <p className="text-xs text-gray-400 mb-1 font-medium">
              Streams {chunk[0].displayNumber} – {chunk[chunk.length - 1].displayNumber}
              {" "}({index + 1} of {columnChunks.length})
            </p>
            <PrintableStreamDataTable
              tableData={subTableData}
              title=""
              highlightStream={highlightStream}
            />
          </div>
        );
      })}
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

      {/* Material Balance Table - paginated */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Material Balance Table
        </h3>
        <PaginatedStreamTable
          tableData={tableData}
          maxStreamsPerTable={MAX_STREAMS_PER_TABLE}
        />
      </div>
    </div>
  );
}
